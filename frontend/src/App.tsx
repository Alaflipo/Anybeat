import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useRef, useState } from "react";
import SoundTimeline from "./SoundTimeline";
import type { SoundBlock, SoundTrack } from "./SoundTimeline";
import { demos } from "./demoTracks";
import { importMidi } from "./importMidi";

export default function App() {
    const [selectedDemo, setSelectedDemo] = useState(0);
    const [editedDemos, setEditedDemos] = useState<Partial<Record<number, readonly SoundTrack[]>>>({});
    const [imported, setImported] = useState<ReturnType<typeof importMidi>[]>([]);
    const [importError, setImportError] = useState("");
    const fileInput = useRef<HTMLInputElement>(null);
    const nextImport = useRef(0);
    const nextBlockId = useRef(0);
    const arrangements = [...demos, ...imported];
    const demo = arrangements[selectedDemo];

    async function loadMidi(file: File) {
        setImportError("");
        try {
            const arrangement = importMidi(await file.arrayBuffer(), file.name);
            const index = demos.length + nextImport.current++;
            setImported((current) => [...current, arrangement]);
            setSelectedDemo(index);
        } catch (cause) {
            setImportError(cause instanceof Error ? cause.message : "Could not read this MIDI file.");
        }
    }

    function editTrackBlocks(trackId: string, edit: (blocks: readonly SoundBlock[]) => readonly SoundBlock[]) {
        // Use the latest edited arrangement so adding a note preserves earlier moves.
        setEditedDemos((current) => ({
            ...current,
            [selectedDemo]: (current[selectedDemo] ?? demo.tracks).map((track) =>
                track.id === trackId ? { ...track, blocks: edit(track.blocks) } : track),
        }));
    }

    function addBlock(trackId: string, note: string) {
        // Start new notes at zero so they can be dragged into place immediately.
        const block: SoundBlock = {
            id: `added-note-${nextBlockId.current++}`,
            note,
            start: 0,
            duration: Math.min(0.5, demo.loopSeconds),
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
                <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 2 }}>
                    <TextField
                        select
                        size="small"
                        label="Arrangement"
                        value={selectedDemo}
                        onChange={(event) => setSelectedDemo(Number(event.target.value))}
                        sx={{ minWidth: 190 }}
                    >
                        {arrangements.map(({ name }, index) => (
                            <MenuItem key={index} value={index}>{name}</MenuItem>
                        ))}
                    </TextField>
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
                    key={selectedDemo}
                    tracks={editedDemos[selectedDemo] ?? demo.tracks}
                    loopSeconds={demo.loopSeconds}
                    onBlockAdd={addBlock}
                    onBlockNoteChange={changeBlockNote}
                    onBlockTimingChange={changeBlockTiming}
                />
            </Box>
        </main>
    );
}
