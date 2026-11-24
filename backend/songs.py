import json
import os
import re
import sqlite3
from contextlib import closing, contextmanager
from datetime import datetime, timezone
from math import isclose
from pathlib import Path
from typing import Annotated, Iterator, Self
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

router = APIRouter(prefix="/api/songs", tags=["songs"])


class SongData(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, allow_inf_nan=False)


class NoteBlock(SongData):
    id: Annotated[str, Field(min_length=1)]
    start: Annotated[float, Field(ge=0)]
    duration: Annotated[float, Field(gt=0)]
    note: str
    velocity: Annotated[int, Field(ge=1, le=127)] | None = None

    @field_validator("note")
    @classmethod
    def valid_note(cls, value: str) -> str:
        match = re.fullmatch(r"([A-G])([#b]?)(-?[0-9]{1,2})", value)
        if match:
            pitch, accidental, octave = match.groups()
            key = 12 * (int(octave) + 1) + {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}[pitch]
            key += {"#": 1, "b": -1, "": 0}[accidental]
            if 0 <= key <= 127:
                return value
        raise ValueError("Expected a note name in the MIDI pitch range")


class Track(SongData):
    id: Annotated[str, Field(min_length=1)]
    name: str
    instrument: str
    blocks: list[NoteBlock]

    @field_validator("instrument")
    @classmethod
    def valid_instrument(cls, value: str) -> str:
        if value == "drum-kit":
            return value
        match = re.fullmatch(r"(program|drum):(0|[1-9][0-9]{0,2})", value)
        if match:
            kind, number = match.groups()
            if (kind == "program" and 0 <= int(number) <= 127) or (kind == "drum" and 35 <= int(number) <= 81):
                return value
        raise ValueError("Expected a supported General MIDI instrument")


class Song(SongData):
    name: str
    loopSeconds: Annotated[float, Field(gt=0)]
    tracks: Annotated[list[Track], Field(min_length=1)]

    @model_validator(mode="after")
    def validate_timeline(self) -> Self:
        if len({track.id for track in self.tracks}) != len(self.tracks):
            raise ValueError("Track IDs must be unique within a Song")
        for track in self.tracks:
            if len({block.id for block in track.blocks}) != len(track.blocks):
                raise ValueError("Note block IDs must be unique within a track")
            for block in track.blocks:
                end = block.start + block.duration
                # MIDI imports and timeline edits use floating-point seconds.
                if block.start >= self.loopSeconds or (
                    end > self.loopSeconds and not isclose(end, self.loopSeconds, rel_tol=0, abs_tol=1e-9)
                ):
                    raise ValueError("Note blocks must fit within the Song loop")
        return self

    def storage_payload(self) -> str:
        return self.model_dump_json(exclude={"name", "id"}, exclude_none=True)


class SavedSong(Song):
    id: str


class SongSummary(BaseModel):
    id: str
    name: str
    updatedAt: str


@contextmanager
def connect(path: Path) -> Iterator[sqlite3.Connection]:
    with closing(sqlite3.connect(path)) as connection, connection:
        connection.row_factory = sqlite3.Row
        yield connection


def database_path() -> Path:
    return Path(os.environ.get("ANYBEAT_DB_PATH", Path(__file__).parent / "data" / "songs.sqlite3"))


def initialize_library(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with connect(path) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS songs (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                payload TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )


def timestamp() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="microseconds")


@router.post("", status_code=201, response_model_exclude_none=True)
def create_song(song: Song, request: Request) -> SavedSong:
    song_id = str(uuid4())
    now = timestamp()
    payload = song.storage_payload()
    with connect(request.app.state.song_db_path) as connection:
        connection.execute(
            "INSERT INTO songs (id, name, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (song_id, song.name, payload, now, now),
        )
    return SavedSong(id=song_id, **song.model_dump())


@router.get("")
def list_songs(request: Request) -> list[SongSummary]:
    with connect(request.app.state.song_db_path) as connection:
        rows = connection.execute(
            "SELECT id, name, updated_at FROM songs ORDER BY updated_at DESC, rowid DESC"
        ).fetchall()
    return [SongSummary(id=row["id"], name=row["name"], updatedAt=row["updated_at"]) for row in rows]


@router.get("/{song_id}", response_model_exclude_none=True)
def load_song(song_id: str, request: Request) -> SavedSong:
    with connect(request.app.state.song_db_path) as connection:
        row = connection.execute(
            "SELECT name, payload FROM songs WHERE id = ?", (song_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Song not found")
    return SavedSong(id=song_id, name=row["name"], **json.loads(row["payload"]))


@router.put("/{song_id}", response_model_exclude_none=True)
def update_song(song_id: str, song: Song, request: Request) -> SavedSong:
    payload = song.storage_payload()
    with connect(request.app.state.song_db_path) as connection:
        result = connection.execute(
            "UPDATE songs SET name = ?, payload = ?, updated_at = ? WHERE id = ?",
            (song.name, payload, timestamp(), song_id),
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Song not found")
    return SavedSong(id=song_id, **song.model_dump())
