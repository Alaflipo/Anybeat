import {
    Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
    MenuItem, Stack, TextField, Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import SoundTimeline from "./SoundTimeline";
import type { SoundBlock, SoundTrack } from "./SoundTimeline";
import type { Song } from "./song";
import { importMidi } from "./importMidi";
import { generateSong, listSongs, loadSong, saveSong } from "./songApi";
import type { SavedSong, SongSummary } from "./songApi";

type OperationStatus = { kind: "pending" | "success" | "error"; message: string };
type Editor = { song: Song; saved?: { id: string; tracks: Song["tracks"] } };
type OpenEditor = () => Promise<Editor> | Editor;
type ProtectedAction = { run: (save: boolean) => Promise<void> };

function createPianoTrack(tracks: readonly SoundTrack[]): SoundTrack {
    const names = new Set(tracks.map(({ name }) => name));
    const ids = new Set(tracks.map(({ id }) => id));
    let nameNumber = 1;
    while (names.has(`Track ${nameNumber}`)) nameNumber++;
    let idNumber = nameNumber;
    while (ids.has(`track-${idNumber}`)) idNumber++;
    return { id: `track-${idNumber}`, name: `Track ${nameNumber}`, instrument: "program:0", blocks: [] };
}

async function loadSavedEditor(id: string): Promise<Editor> {
    try {
        const song = await loadSong(id);
        return { song, saved: { id, tracks: song.tracks } };
    } catch {
        throw new Error("Could not open this song. Select it again to retry.");
    }
}

export default function App() {
    const [editor, setEditor] = useState<Editor | null>(null);
    const [editorVersion, setEditorVersion] = useState(0);
    const [librarySongs, setLibrarySongs] = useState<SongSummary[]>([]);
    const [libraryLoading, setLibraryLoading] = useState(true);
    const [libraryError, setLibraryError] = useState("");
    const [libraryRequest, setLibraryRequest] = useState({ openFirst: true });
    const [openStatus, setOpenStatus] = useState<OperationStatus | null>(null);
    const [saveStatus, setSaveStatus] = useState<OperationStatus | null>(null);
    const [generationPrompt, setGenerationPrompt] = useState("");
    const [generationStatus, setGenerationStatus] = useState<OperationStatus | null>(null);
    const [generatedToOpen, setGeneratedToOpen] = useState<{
        song: SavedSong;
        discardedTracks?: Song["tracks"];
    } | null>(null);
    const [replacement, setReplacement] = useState<ProtectedAction | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const nextUntitled = useRef(1);
    const song = editor?.song;
    const savedId = editor?.saved?.id;
    const isUnsaved = Boolean(editor && song?.tracks !== editor.saved?.tracks);
    const isOpening = libraryLoading || openStatus?.kind === "pending";
    const busy = isOpening || saveStatus?.kind === "pending";
    const isGenerating = generationStatus?.kind === "pending";
    const replacementBusy = busy || isGenerating;

    useEffect(() => {
        let cancelled = false;

        async function initialize() {
            try {
                const songs = await listSongs();
                if (cancelled) return;
                setLibrarySongs(songs);
                if (libraryRequest.openFirst && songs.length > 0) {
                    try {
                        const first = await loadSavedEditor(songs[0].id);
                        if (!cancelled) setEditor(first);
                    } catch (cause) {
                        if (!cancelled) setOpenStatus({
                            kind: "error",
                            message: cause instanceof Error ? cause.message : "Could not open song.",
                        });
                    }
                }
            } catch {
                if (!cancelled) setLibraryError("Could not load saved songs.");
            } finally {
                if (!cancelled) setLibraryLoading(false);
            }
        }

        void initialize();
        return () => { cancelled = true; };
    }, [libraryRequest]);

    async function replaceEditor(open: OpenEditor) {
        setOpenStatus({ kind: "pending", message: "Opening song…" });
        try {
            const next = await open();
            setEditor(next);
            setEditorVersion((version) => version + 1);
            setSaveStatus(null);
            setOpenStatus(null);
        } catch (cause) {
            setOpenStatus({
                kind: "error",
                message: cause instanceof Error ? cause.message : "Could not open song.",
            });
        }
    }

    function requestReplacement(open: OpenEditor) {
        if (replacementBusy) return;
        if (isUnsaved) {
            setSaveStatus(null);
            setReplacement({ run: () => replaceEditor(open) });
        } else {
            void replaceEditor(open);
        }
    }

    function addSongToLibrary(saved: SongSummary) {
        setLibrarySongs((current) => [
            saved,
            ...current.filter(({ id }) => id !== saved.id),
        ]);
    }

    async function startGeneration(prompt: string, discardedTracks?: Song["tracks"]) {
        setGenerationPrompt("");
        setGenerationStatus({ kind: "pending", message: "Generating and saving your Song…" });
        try {
            const generated = await generateSong(prompt);
            addSongToLibrary({ id: generated.id, name: generated.name });
            setGenerationStatus({ kind: "success", message: `Song ready and saved: “${generated.name}”.` });
            setGeneratedToOpen({ song: generated, discardedTracks });
        } catch {
            setGenerationStatus({ kind: "error", message: "Could not generate a Song. Try again." });
        }
    }

    function requestGeneration() {
        if (replacementBusy || !generationPrompt.trim()) return;
        const prompt = generationPrompt;
        if (isUnsaved) {
            setSaveStatus(null);
            setReplacement({ run: (save) => startGeneration(prompt, save ? undefined : song?.tracks) });
        } else {
            void startGeneration(prompt);
        }
    }

    async function saveCurrentSong(): Promise<boolean> {
        if (!song || busy) return false;
        const { name } = song;
        setSaveStatus({ kind: "pending", message: `Saving “${name}”…` });
        try {
            const saved = await saveSong(song, savedId);
            setEditor((current) => current && {
                ...current,
                saved: { id: saved.id, tracks: song.tracks },
            });
            addSongToLibrary(saved);
            setSaveStatus({ kind: "success", message: `Song saved: ${name}.` });
            return true;
        } catch {
            setSaveStatus({ kind: "error", message: `Could not save “${name}”. Try again.` });
            return false;
        }
    }

    async function confirmReplacement(save: boolean) {
        if (!replacement || busy) return;
        if (save && !await saveCurrentSong()) return;
        const action = replacement;
        setReplacement(null);
        await action.run(save);
    }

    useEffect(() => {
        if (!generatedToOpen || busy) return;
        // Wait for the current editor state to commit before deciding whether to protect new edits.
        const timer = window.setTimeout(() => {
            const open = () => ({
                song: generatedToOpen.song,
                saved: { id: generatedToOpen.song.id, tracks: generatedToOpen.song.tracks },
            });
            if (isUnsaved && editor?.song.tracks !== generatedToOpen.discardedTracks) {
                setSaveStatus(null);
                setReplacement({ run: () => replaceEditor(open) });
            } else {
                void replaceEditor(open);
            }
            setGeneratedToOpen(null);
        }, 0);
        return () => window.clearTimeout(timer);
    }, [generatedToOpen, busy, isUnsaved, editor]);

    function editTracks(edit: (tracks: readonly SoundTrack[]) => readonly SoundTrack[]) {
        setEditor((current) => current && {
            ...current,
            song: { ...current.song, tracks: edit(current.song.tracks) },
        });
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
        const loopSeconds = song?.loopSeconds;
        if (loopSeconds === undefined) return;
        editTrackBlocks(trackId, (blocks) => {
            const ids = new Set(blocks.map(({ id }) => id));
            let index = blocks.length;
            while (ids.has(`added-note-${index}`)) index++;
            // Start new notes at zero so they can be dragged into place immediately.
            return [...blocks, {
                id: `added-note-${index}`,
                note,
                start: 0,
                duration: Math.min(0.5, loopSeconds),
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
                        value={savedId ?? ""}
                        disabled={replacementBusy || librarySongs.length === 0}
                        onChange={(event) => {
                            const id = event.target.value;
                            if (id !== savedId) requestReplacement(() => loadSavedEditor(id));
                        }}
                        sx={{ width: "min(100%, 250px)" }}
                    >
                        {librarySongs.map(({ id, name }) => (
                            <MenuItem key={id} value={id}>{name}</MenuItem>
                        ))}
                    </TextField>
                    <Button disabled={replacementBusy} onClick={() => requestReplacement(() => ({
                        song: {
                            name: `Untitled song ${nextUntitled.current++}`,
                            loopSeconds: 8,
                            tracks: [createPianoTrack([])],
                        },
                    }))}>New song</Button>
                    <Button disabled={!song || busy} onClick={() => void saveCurrentSong()}>
                        Save song
                    </Button>
                    <Button disabled={replacementBusy} onClick={() => fileInput.current?.click()}>Upload MIDI</Button>
                    <input
                        ref={fileInput}
                        type="file"
                        accept=".mid,.midi,audio/midi,audio/x-midi"
                        hidden
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            if (file) requestReplacement(async () => ({
                                song: importMidi(await file.arrayBuffer(), file.name),
                            }));
                        }}
                    />
                </Stack>
                <Stack direction="row" useFlexGap spacing={2} sx={{ alignItems: "flex-start", flexWrap: "wrap", mb: 2 }}>
                    <TextField
                        multiline
                        minRows={2}
                        size="small"
                        label="Generation prompt"
                        placeholder="Create a happy song"
                        value={generationPrompt}
                        onChange={(event) => setGenerationPrompt(event.target.value)}
                        sx={{ width: "min(100%, 450px)" }}
                    />
                    <Button
                        variant="contained"
                        disabled={replacementBusy || !generationPrompt.trim()}
                        onClick={requestGeneration}
                    >Generate</Button>
                </Stack>
                {generationStatus && (
                    <Alert severity={generationStatus.kind === "pending" ? "info" : generationStatus.kind} sx={{ mb: 2 }}>
                        {generationStatus.message}
                    </Alert>
                )}
                {libraryLoading && <Typography role="status" sx={{ mb: 2 }}>Loading saved songs…</Typography>}
                {libraryError && (
                    <Alert severity="error" sx={{ mb: 2 }} action={
                        <Button color="inherit" disabled={replacementBusy} onClick={() => {
                            setLibraryError("");
                            setLibraryLoading(true);
                            setLibraryRequest({ openFirst: !editor });
                        }}>Retry</Button>
                    }>{libraryError}</Alert>
                )}
                {!libraryLoading && !libraryError && librarySongs.length === 0 && (
                    <Typography sx={{ mb: 2 }}>No saved songs yet.</Typography>
                )}
                {openStatus && (
                    <Alert severity={openStatus.kind === "pending" ? "info" : openStatus.kind} sx={{ mb: 2 }}>
                        {openStatus.message}
                    </Alert>
                )}
                {isUnsaved && <Typography role="status" sx={{ mb: 2 }}>
                    {savedId ? "Unsaved changes" : `${song?.name} · Unsaved changes`}
                </Typography>}
                {saveStatus && !replacement && (
                    <Alert severity={saveStatus.kind === "pending" ? "info" : saveStatus.kind} sx={{ mb: 2 }}>
                        {saveStatus.message}
                    </Alert>
                )}
                {song && (
                    <Box inert={isOpening}>
                        <SoundTimeline
                            key={editorVersion}
                            tracks={song.tracks}
                            loopSeconds={song.loopSeconds}
                            onTrackAdd={addTrack}
                            onInstrumentChange={changeInstrument}
                            onBlockAdd={addBlock}
                            onBlockNoteChange={changeBlockNote}
                            onBlockTimingChange={changeBlockTiming}
                        />
                    </Box>
                )}
            </Box>
            <Dialog
                open={Boolean(replacement)}
                onClose={() => { if (!busy) setReplacement(null); }}
                aria-labelledby="unsaved-song-title"
            >
                <DialogTitle id="unsaved-song-title">Unsaved changes</DialogTitle>
                <DialogContent>
                    <Typography>Save changes to “{song?.name}” before continuing?</Typography>
                    {saveStatus && (
                        <Alert severity={saveStatus.kind === "pending" ? "info" : saveStatus.kind} sx={{ mt: 2 }}>
                            {saveStatus.message}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button disabled={busy} onClick={() => setReplacement(null)}>Cancel</Button>
                    <Button disabled={busy} onClick={() => void confirmReplacement(false)}>Discard</Button>
                    <Button disabled={busy} onClick={() => void confirmReplacement(true)}>Save</Button>
                </DialogActions>
            </Dialog>
        </main>
    );
}
