import {
    Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
    List, ListItem, ListItemButton, ListItemText, MenuItem, Stack, TextField, Typography,
} from "@mui/material";
import { useRef, useState } from "react";
import SoundTimeline from "./SoundTimeline";
import type { SoundBlock, SoundTrack } from "./SoundTimeline";
import { demos } from "./demoTracks";
import type { Song } from "./song";
import { importMidi } from "./importMidi";
import { listSongs, loadSong, saveSong } from "./songApi";
import type { SongSummary } from "./songApi";

type SaveStatus = { kind: "pending" | "success" | "error"; message: string };
type SavedSnapshot = { id: string; tracks: Song["tracks"] };
type SongCatalog = {
    songs: readonly Song[];
    selectedIndex: number;
    saved: Partial<Record<number, SavedSnapshot>>;
};

const savedAtFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" });

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
    const [{ songs, selectedIndex, saved }, setCatalog] = useState<SongCatalog>({
        songs: demos,
        selectedIndex: 0,
        saved: {},
    });
    const [editedTracks, setEditedTracks] = useState<Partial<Record<number, readonly SoundTrack[]>>>({});
    const [importError, setImportError] = useState("");
    const [saveStatus, setSaveStatus] = useState<SaveStatus | null>(null);
    const [libraryOpen, setLibraryOpen] = useState(false);
    const [librarySongs, setLibrarySongs] = useState<SongSummary[] | null>(null);
    const [libraryPending, setLibraryPending] = useState("");
    const [libraryError, setLibraryError] = useState("");
    const fileInput = useRef<HTMLInputElement>(null);
    const nextUntitled = useRef(1);
    const song = songs[selectedIndex];
    const tracks = editedTracks[selectedIndex] ?? song.tracks;
    const savedSnapshot = saved[selectedIndex];
    const isSaving = saveStatus?.kind === "pending";
    const isUnsaved = savedSnapshot
        ? tracks !== savedSnapshot.tracks
        : selectedIndex >= demos.length || tracks !== song.tracks;

    function appendSong(song: Song, savedId?: string) {
        setCatalog((current) => ({
            songs: [...current.songs, song],
            selectedIndex: current.songs.length,
            saved: savedId === undefined ? current.saved : {
                ...current.saved,
                [current.songs.length]: { id: savedId, tracks: song.tracks },
            },
        }));
    }

    function newSong() {
        appendSong({
            name: `Untitled song ${nextUntitled.current++}`,
            loopSeconds: 8,
            tracks: [createPianoTrack([])],
        });
    }

    async function loadMidi(file: File) {
        setImportError("");
        try {
            appendSong(importMidi(await file.arrayBuffer(), file.name));
        } catch (cause) {
            setImportError(cause instanceof Error ? cause.message : "Could not read this MIDI file.");
        }
    }

    async function saveCurrentSong() {
        if (isSaving) return;
        const { name, loopSeconds } = song;
        setSaveStatus({ kind: "pending", message: `Saving “${name}”…` });
        try {
            const { id } = await saveSong({ name, loopSeconds, tracks }, savedSnapshot?.id);
            // Store the submitted tracks against the initiating editor entry.
            setCatalog((current) => ({
                ...current,
                saved: { ...current.saved, [selectedIndex]: { id, tracks } },
            }));
            setSaveStatus({ kind: "success", message: `Song saved: ${name}.` });
        } catch {
            setSaveStatus({ kind: "error", message: `Could not save “${name}”. Select Save song to try again.` });
        }
    }

    async function refreshLibrary() {
        setLibrarySongs(null);
        setLibraryError("");
        setLibraryPending("Loading saved songs…");
        try {
            setLibrarySongs(await listSongs());
        } catch {
            setLibraryError("Could not load saved songs.");
        } finally {
            setLibraryPending("");
        }
    }

    async function openSavedSong(summary: SongSummary) {
        const existingIndex = songs.findIndex((_, index) => saved[index]?.id === summary.id);
        if (existingIndex !== -1) {
            setCatalog((current) => ({ ...current, selectedIndex: existingIndex }));
            setLibraryOpen(false);
            return;
        }

        setLibraryError("");
        setLibraryPending(`Opening “${summary.name}”…`);
        try {
            appendSong(await loadSong(summary.id), summary.id);
            setLibraryOpen(false);
        } catch {
            setLibraryError(`Could not open “${summary.name}”. Select it again to retry.`);
        } finally {
            setLibraryPending("");
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
        editTrackBlocks(trackId, (blocks) => {
            const ids = new Set(blocks.map(({ id }) => id));
            let index = blocks.length;
            while (ids.has(`added-note-${index}`)) index++;
            // Start new notes at zero so they can be dragged into place immediately.
            return [...blocks, {
                id: `added-note-${index}`,
                note,
                start: 0,
                duration: Math.min(0.5, song.loopSeconds),
            }];
        });
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
                        {songs.map(({ name }, index) => (
                            <MenuItem key={index} value={index}>{name}</MenuItem>
                        ))}
                    </TextField>
                    <Button onClick={newSong}>New song</Button>
                    <Button disabled={isSaving} onClick={() => void saveCurrentSong()}>
                        Save song
                    </Button>
                    <Button disabled={isSaving} onClick={() => {
                        setLibraryOpen(true);
                        void refreshLibrary();
                    }}>
                        Open song
                    </Button>
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
                {isUnsaved && <Typography role="status" sx={{ mb: 2 }}>Unsaved changes</Typography>}
                {saveStatus && (
                    <Alert severity={saveStatus.kind === "pending" ? "info" : saveStatus.kind} sx={{ mb: 2 }}>
                        {saveStatus.message}
                    </Alert>
                )}
                {importError && <Alert severity="error" sx={{ mb: 2 }}>{importError}</Alert>}
                <SoundTimeline
                    key={selectedIndex}
                    tracks={tracks}
                    loopSeconds={song.loopSeconds}
                    onTrackAdd={addTrack}
                    onInstrumentChange={changeInstrument}
                    onBlockAdd={addBlock}
                    onBlockNoteChange={changeBlockNote}
                    onBlockTimingChange={changeBlockTiming}
                />
            </Box>
            <Dialog
                open={libraryOpen}
                onClose={() => { if (!libraryPending) setLibraryOpen(false); }}
                aria-labelledby="open-song-title"
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle id="open-song-title">Open song</DialogTitle>
                <DialogContent>
                    {libraryPending && <Typography role="status">{libraryPending}</Typography>}
                    {libraryError && <Alert severity="error">{libraryError}</Alert>}
                    {librarySongs?.length === 0 && <Typography>No saved songs yet.</Typography>}
                    {librarySongs && librarySongs.length > 0 && (
                        <List disablePadding>
                            {librarySongs.map((saved) => (
                                <ListItem disablePadding key={saved.id}>
                                    <ListItemButton
                                        component="button"
                                        disabled={Boolean(libraryPending)}
                                        onClick={() => void openSavedSong(saved)}
                                    >
                                        <ListItemText
                                            primary={saved.name}
                                            secondary={savedAtFormat.format(new Date(saved.updatedAt))}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </DialogContent>
                <DialogActions>
                    {libraryError && librarySongs === null && (
                        <Button onClick={() => void refreshLibrary()}>Retry</Button>
                    )}
                    <Button disabled={Boolean(libraryPending)} onClick={() => setLibraryOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </main>
    );
}
