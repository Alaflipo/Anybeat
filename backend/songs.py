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

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator

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
    generationPrompt: str | None = None


class GenerationRequest(SongData):
    prompt: Annotated[str, Field(min_length=1, max_length=500)]

    @field_validator("prompt")
    @classmethod
    def nonblank_prompt(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Generation prompt cannot be blank")
        return value


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
                updated_at TEXT NOT NULL,
                generation_prompt TEXT
            )
            """
        )
        columns = {row["name"] for row in connection.execute("PRAGMA table_info(songs)")}
        if "generation_prompt" not in columns:
            connection.execute("ALTER TABLE songs ADD COLUMN generation_prompt TEXT")


def timestamp() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="microseconds")


# OpenAI's strict JSON Schema subset needs a required nullable velocity; Song remains the validation authority.
NOTE_BLOCK_SCHEMA = {
    "type": "object",
    "properties": {
        "id": {"type": "string"},
        "start": {"type": "number"},
        "duration": {"type": "number"},
        "note": {"type": "string"},
        "velocity": {"type": ["integer", "null"]},
    },
    "required": ["id", "start", "duration", "note", "velocity"],
    "additionalProperties": False,
}

SONG_SCHEMA = {
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "loopSeconds": {"type": "number"},
        "tracks": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "name": {"type": "string"},
                    "instrument": {"type": "string"},
                    "blocks": {"type": "array", "items": NOTE_BLOCK_SCHEMA},
                },
                "required": ["id", "name", "instrument", "blocks"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["name", "loopSeconds", "tracks"],
    "additionalProperties": False,
}


def generate_song(prompt: str) -> Song:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="Song generation is not configured")
    model = os.environ.get("OPENAI_SONG_MODEL", "gpt-5.4-mini")
    try:
        response = httpx.post(
            "https://api.openai.com/v1/responses",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "instructions": (
                    "Compose a playable Anybeat Song matching the user's musical idea. "
                    "Return only a short looping arrangement, 4 to 16 seconds long, with 1 to 4 tracks "
                    "and at least one note block. Interpret longer requests within these limits. "
                    "Use instruments drum-kit, program:0 through program:127, or drum:35 through drum:81. "
                    "Use MIDI note names such as C4 and F#3. Give tracks unique IDs and blocks unique IDs "
                    "within each track. Starts and durations are seconds; every block must fit in the loop. "
                    "Use null velocity when no velocity is needed."
                ),
                "input": prompt,
                "max_output_tokens": 6000,
                "text": {"format": {"type": "json_schema", "name": "song", "strict": True, "schema": SONG_SCHEMA}},
            },
            timeout=30,
        )
        response.raise_for_status()
        result = response.json()
        if not isinstance(result, dict):
            raise ValueError("Unexpected OpenAI response")
        if result.get("status") != "completed":
            raise ValueError("Response did not complete")
        text = next(
            content["text"]
            for item in result["output"]
            if item["type"] == "message"
            for content in item["content"]
            if content["type"] == "output_text"
        )
        song = Song.model_validate_json(text)
        if not 4 <= song.loopSeconds <= 16 or len(song.tracks) > 4 or not any(track.blocks for track in song.tracks):
            raise ValueError("Generated song exceeds arrangement limits")
        return song
    except (httpx.HTTPError, ValueError, ValidationError, KeyError, StopIteration, TypeError, IndexError):
        raise HTTPException(status_code=502, detail="Song generation failed") from None


@router.post("/generate", status_code=201, response_model_exclude_none=True)
def generate_and_save_song(data: GenerationRequest, request: Request) -> SavedSong:
    song = generate_song(data.prompt)
    return save_song(song, request.app.state.song_db_path, data.prompt)


def save_song(song: Song, path: Path, generation_prompt: str | None = None) -> SavedSong:
    song_id = str(uuid4())
    now = timestamp()
    with connect(path) as connection:
        connection.execute(
            "INSERT INTO songs (id, name, payload, created_at, updated_at, generation_prompt) VALUES (?, ?, ?, ?, ?, ?)",
            (song_id, song.name, song.storage_payload(), now, now, generation_prompt),
        )
    return SavedSong(id=song_id, generationPrompt=generation_prompt, **song.model_dump())


@router.post("", status_code=201, response_model_exclude_none=True)
def create_song(song: Song, request: Request) -> SavedSong:
    return save_song(song, request.app.state.song_db_path)


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
            "SELECT name, payload, generation_prompt FROM songs WHERE id = ?", (song_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Song not found")
    return SavedSong(id=song_id, name=row["name"], generationPrompt=row["generation_prompt"], **json.loads(row["payload"]))


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
        row = connection.execute("SELECT generation_prompt FROM songs WHERE id = ?", (song_id,)).fetchone()
    return SavedSong(id=song_id, generationPrompt=row["generation_prompt"], **song.model_dump())
