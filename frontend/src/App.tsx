import { Box, MenuItem, TextField, Typography } from "@mui/material";
import { useRef, useState } from "react";
import SoundTimeline from "./SoundTimeline";
import type { SoundBlock, SoundTrack } from "./SoundTimeline";
import { demos } from "./demoTracks";

export default function App() {
    const [selectedDemo, setSelectedDemo] = useState(0);
    const [editedDemos, setEditedDemos] = useState<Partial<Record<number, readonly SoundTrack[]>>>({});
    const nextBlockId = useRef(0);
    const demo = demos[selectedDemo];

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

    function moveBlock(trackId: string, blockId: string, start: number, duration: number) {
        editTrackBlocks(trackId, (blocks) => blocks.map((block) =>
            block.id === blockId ? { ...block, start, duration } : block));
    }

    return (
        <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>

            <Box component="section" sx={{ mt: 4}}>
                <Typography variant="h4" component="h2" sx={{ mb: 2 }}>
                    Music timeline experiment
                </Typography>
                <TextField
                    select
                    size="small"
                    label="Demo"
                    value={selectedDemo}
                    onChange={(event) => setSelectedDemo(Number(event.target.value))}
                    sx={{ mb: 2, minWidth: 160 }}
                >
                    {demos.map(({ name }, index) => (
                        <MenuItem key={name} value={index}>{name}</MenuItem>
                    ))}
                </TextField>
                <SoundTimeline
                    key={demo.name}
                    tracks={editedDemos[selectedDemo] ?? demo.tracks}
                    loopSeconds={demo.loopSeconds}
                    onBlockAdd={addBlock}
                    onBlockNoteChange={changeBlockNote}
                    onBlockMove={moveBlock}
                />
            </Box>
        </main>
    );
}
