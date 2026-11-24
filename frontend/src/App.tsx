import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useRef, useState } from "react";
import SoundTimeline from "./SoundTimeline";
import type { SoundBlock, SoundTrack } from "./SoundTimeline";
import { demos } from "./demoTracks";
import type { Song } from "./song";
import { importMidi } from "./importMidi";

type CatalogEntry = {
    song: Song;
    source: "demo" | "blank" | "import";
};

const demoEntries: readonly CatalogEntry[] = demos.map((song) => ({ song, source: "demo" }));

function createPianoTrack(tracks: readonly SoundTrack[]): SoundTrack {
    const names = new Set(tracks.map(({ name }) => name));
    const ids = new Set(tracks.map(({ id }) => id));
    let nameNumber = 1;
    while (names.has(`Track ${nameNumber}`)) nameNumber++;
    let idNumber = nameNumber;
    while (ids.has(`track-${idNumber}`)) idNumber++;
    return { id: `track-${idNumber}`, name: `Track ${nameNumber}`, instrument: "program:0", blocks: [] };
}

export default function App() {
    const [{ songs, selectedIndex }, setCatalog] = useState({ songs: demoEntries, selectedIndex: 0 });
    const [editedTracks, setEditedTracks] = useState<Partial<Record<number, readonly SoundTrack[]>>>({});
    const [importError, setImportError] = useState("");
    const fileInput = useRef<HTMLInputElement>(null);
    const nextUntitled = useRef(1);
    const nextBlockId = useRef(0);
    const { song } = songs[selectedIndex];
    const blankNames = new Set(songs.filter(({ source }) => source === "blank")
        .map(({ song }) => song.name));

    function appendSong(song: Song, source: CatalogEntry["source"]) {
        setCatalog((current) => ({
            songs: [...current.songs, { song, source }],
            selectedIndex: current.songs.length,
        }));
    }

    function newSong() {
        appendSong({
            name: `Untitled song ${nextUntitled.current++}`,
            loopSeconds: 8,
            tracks: [createPianoTrack([])],
        }, "blank");
    }

    async function loadMidi(file: File) {
        setImportError("");
        try {
            appendSong(importMidi(await file.arrayBuffer(), file.name), "import");
        } catch (cause) {
            setImportError(cause instanceof Error ? cause.message : "Could not read this MIDI file.");
        }
    }

    function editTracks(edit: (tracks: readonly SoundTrack[]) => readonly SoundTrack[]) {
        setEditedTracks((current) => ({
            ...current,
            [selectedIndex]: edit(current[selectedIndex] ?? song.tracks),
        }));
    }

    function addTrack() {
        editTracks((tracks) => [...tracks, createPianoTrack(tracks)]);
    }

    function editTrack(trackId: string, edit: (track: SoundTrack) => SoundTrack) {
        editTracks((tracks) => tracks.map((track) => track.id === trackId ? edit(track) : track));
    }

    function editTrackBlocks(trackId: string, edit: (blocks: readonly SoundBlock[]) => readonly SoundBlock[]) {
        editTrack(trackId, (track) => ({ ...track, blocks: edit(track.blocks) }));
    }

    function changeInstrument(trackId: string, instrument: SoundTrack["instrument"]) {
        editTrack(trackId, (track) => ({ ...track, instrument }));
    }

    function addBlock(trackId: string, note: string) {
        // Start new notes at zero so they can be dragged into place immediately.
        const block: SoundBlock = {
            id: `added-note-${nextBlockId.current++}`,
            note,
            start: 0,
            duration: Math.min(0.5, song.loopSeconds),
        };
        editTrackBlocks(trackId, (blocks) => [...blocks, block]);
    }

    function changeBlockNote(trackId: string, blockId: string, note: string) {
        editTrackBlocks(trackId, (blocks) => blocks.map((block) =>
            block.id === blockId ? { ...block, note } : block));
    }

    function changeBlockTiming(trackId: string, blockId: string, start: number, duration: number) {
        editTrackBlocks(trackId, (blocks) => blocks.map((block) =>
            block.id === blockId ? { ...block, start, duration } : block));
    }

    return (
        <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>

            <Box component="section" sx={{ mt: 4}}>
                <Typography variant="h4" component="h2" sx={{ mb: 2 }}>
                    Music timeline experiment
                </Typography>
                <Stack direction="row" useFlexGap spacing={2} sx={{ flexWrap: "wrap", alignItems: "center", mb: 2 }}>
                    <TextField
                        select
                        size="small"
                        label="Song"
                        value={selectedIndex}
                        onChange={(event) => {
                            const selectedIndex = Number(event.target.value);
                            setCatalog((current) => ({ ...current, selectedIndex }));
                        }}
                        sx={{ width: "min(100%, 250px)" }}
                    >
                        {songs.map(({ song: { name }, source }, index) => (
                            <MenuItem key={index} value={index}>
                                {source === "import" && blankNames.has(name) ? `${name} (MIDI import)` : name}
                            </MenuItem>
                        ))}
                    </TextField>
                    <Button onClick={newSong}>New song</Button>
                    <Button onClick={() => fileInput.current?.click()}>Upload MIDI</Button>
                    <input
                        ref={fileInput}
                        type="file"
                        accept=".mid,.midi,audio/midi,audio/x-midi"
                        hidden
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            if (file) void loadMidi(file);
                        }}
                    />
                </Stack>
                {importError && <Alert severity="error" sx={{ mb: 2 }}>{importError}</Alert>}
                <SoundTimeline
                    key={selectedIndex}
                    tracks={editedTracks[selectedIndex] ?? song.tracks}
                    loopSeconds={song.loopSeconds}
                    onTrackAdd={addTrack}
                    onInstrumentChange={changeInstrument}
                    onBlockAdd={addBlock}
                    onBlockNoteChange={changeBlockNote}
                    onBlockTimingChange={changeBlockTiming}
                />
            </Box>
        </main>
    );
}
