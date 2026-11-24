import AddIcon from "@mui/icons-material/Add";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import { Alert, Autocomplete, Box, Button, IconButton, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import NoteDialog from "./NoteDialog";
import DraggableSoundBlock from "./DraggableSoundBlock";
import { createTimelineAudio } from "./timelineAudio";
import { instruments, midiNoteName, midiNoteNumber } from "./generalMidi";
import type { Instrument } from "./generalMidi";

const instrumentOptions = [...instruments.keys()];

// One note block. Start and duration are measured in seconds relative to the shared loop.
// The note is written as a pitch such as C4.
export type SoundBlock = {
    id: string;
    start: number;
    duration: number;
    note: string;
    velocity?: number;
};

// A track groups blocks that share one instrument. The ID also identifies its instrument selection.
export type SoundTrack = {
    id: string;
    name: string;
    instrument: Instrument;
    blocks: readonly SoundBlock[];
};

type SoundTimelineProps = {
    tracks: readonly SoundTrack[];
    loopSeconds: number;
    onBlockAdd: (trackId: string, note: string) => void;
    onBlockNoteChange: (trackId: string, blockId: string, note: string) => void;
    onBlockTimingChange: (trackId: string, blockId: string, start: number, duration: number) => void;
};

// Prepare the same note timings for the track display and the audio scheduler.
function layoutBlocks(blocks: readonly SoundBlock[], loopSeconds: number) {
    // Each entry is the time when a lane becomes available again.
    const laneEnds: number[] = [];
    const notes = blocks
        // Ignore blocks that cannot start or sound within the loop.
        .filter(({ start, duration }) =>
            Number.isFinite(start) && start >= 0 && start < loopSeconds &&
            Number.isFinite(duration) && duration > 0
        )
        // Place blocks in chronological order so each can reuse the first available lane.
        .sort((a, b) => a.start - b.start)
        .map((block) => {
            // Clip the block at the loop boundary so its held note fits within the loop.
            const duration = Math.min(block.duration, loopSeconds - block.start);
            // Find a lane whose previous block has already ended. If none is free, add a lane.
            const freeLane = laneEnds.findIndex((end) => end <= block.start);
            const lane = freeLane === -1 ? laneEnds.length : freeLane;
            laneEnds[lane] = block.start + duration;
            return { ...block, duration, lane };
        });

    // Keep one visible lane even when a track has no notes.
    return { notes, laneCount: Math.max(1, laneEnds.length) };
}

export default function SoundTimeline({ tracks, loopSeconds, onBlockAdd, onBlockNoteChange, onBlockTimingChange }: SoundTimelineProps) {
    // The timeline element holds one CSS position inherited by all the playheads.
    const timeline = useRef<HTMLDivElement>(null);
    // The ref holds the current session's cleanup function, including during async startup.
    // Its identity lets us tell whether a Play request still owns the session.
    const playback = useRef<(() => void) | null>(null);
    // React state drives the button and instrument controls during startup and playback.
    const [active, setActive] = useState<(Pick<SoundTimelineProps, "tracks" | "loopSeconds"> & {
        status: "starting" | "playing";
        trackId: string | null;
    }) | null>(null);
    // Keep each dropdown choice by track ID and fall back to the track's configured instrument.
    const [selectedInstruments, setSelectedInstruments] = useState<Partial<Record<string, Instrument>>>({});
    const [noteTarget, setNoteTarget] = useState<{ trackId: string; blockId?: string } | null>(null);
    const noteTrack = tracks.find(({ id }) => id === noteTarget?.trackId);
    const isEditingDrumKit = noteTrack !== undefined &&
        (selectedInstruments[noteTrack.id] ?? noteTrack.instrument) === "drum-kit";
    const editedBlock = noteTrack?.blocks.find(({ id }) => id === noteTarget?.blockId);
    const [error, setError] = useState("");
    // Show the playback status only for the inputs that started that session.
    const currentSession = active?.tracks === tracks && active.loopSeconds === loopSeconds ? active : null;
    const status = currentSession?.status ?? "stopped";
    const mixStatus = currentSession?.trackId === null ? currentSession.status : "stopped";

    const validLoop = Number.isFinite(loopSeconds) && loopSeconds > 0;
    // Resolve each track's effective instrument and lay out its blocks before playback.
    const arrangedTracks = tracks.map((track) => ({
        ...track,
        ...layoutBlocks(track.blocks, validLoop ? loopSeconds : 0),
        instrument: selectedInstruments[track.id] ?? track.instrument,
    }));
    // One second is this percentage of the track width. The ruler and grid share that scale.
    const secondWidth = validLoop && loopSeconds >= 1 ? 100 / loopSeconds : 0;
    // Space the grid farther apart for longer imported songs so the labels stay readable.
    const tickStep = validLoop ? Math.max(1, Math.ceil(loopSeconds / 16)) : 1;
    const ticks = validLoop
        ? Array.from({ length: Math.floor(loopSeconds / tickStep) + 1 }, (_, index) => index * tickStep)
        : [];
    const canPlay = validLoop && arrangedTracks.some(({ notes }) => notes.length > 0);

    // Dispose of playback when the track list or loop length changes, or when the timeline unmounts.
    useEffect(() => () => {
        playback.current?.();
        playback.current = null;
    }, [tracks, loopSeconds]);

    async function play(trackId: string | null) {
        const element = timeline.current;
        const selectedTracks = trackId === null
            ? arrangedTracks
            : arrangedTracks.filter(({ id }) => id === trackId);
        if (!element || !validLoop || !selectedTracks.some(({ notes }) => notes.length > 0)) return;

        // Replace the current session so a solo track never plays over the mix.
        playback.current?.();
        const audio = createTimelineAudio(selectedTracks, loopSeconds);
        let frame = 0;
        const dispose = () => {
            cancelAnimationFrame(frame);
            audio.stop();
            element.style.removeProperty("--playhead-position");
        };
        // Register cleanup before awaiting startup so an input change can cancel this attempt.
        playback.current = dispose;
        setError("");
        setActive({ tracks, loopSeconds, trackId, status: "starting" });

        try {
            // Start audio from the Play gesture and check that this session is still current afterward.
            await audio.start();
            if (playback.current !== dispose) return;

            // The tracks in this session share one animation frame.
            const drawPlayhead = () => {
                // Use audio time as the source of truth. Modulo wraps the position back to zero each loop.
                const progress = (audio.elapsedSeconds() % loopSeconds) / loopSeconds;
                element.style.setProperty("--playhead-position", `${progress * 100}%`);
                frame = requestAnimationFrame(drawPlayhead);
            };

            frame = requestAnimationFrame(drawPlayhead);
            setActive({ tracks, loopSeconds, trackId, status: "playing" });
        } catch (cause) {
            // A cancelled startup can also reject. Leave any replacement session alone.
            if (playback.current !== dispose) return;
            stop();
            setError(cause instanceof Error ? cause.message : "Could not start audio.");
        }
    }

    // Reset the active session and controls so the next Play starts from the beginning.
    function stop() {
        playback.current?.();
        playback.current = null;
        setActive(null);
    }

    return (
        <Stack spacing={2}>
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                <Button
                    variant="contained"
                    startIcon={mixStatus === "playing" ? <StopIcon /> : <PlayArrowIcon />}
                    disabled={!canPlay || mixStatus === "starting"}
                    onClick={mixStatus === "playing" ? stop : () => void play(null)}
                >
                    {mixStatus === "playing" ? "Stop" : mixStatus === "starting" ? "Starting…" : "Play all tracks"}
                </Button>
                <Typography variant="body2" color="text.secondary">
                    {loopSeconds} s loop
                </Typography>
            </Stack>

            {error && <Alert severity="error">{error}</Alert>}

            <Stack ref={timeline} spacing={2}>
                {/* The ruler uses the same one-pixel inset as the bordered tracks. */}
                <Box sx={{ position: "relative", height: 20, mx: "1px" }}>
                    {ticks.map((second) => (
                        <Typography
                            key={second}
                            variant="caption"
                            color="text.secondary"
                            sx={{
                                position: "absolute",
                                left: `${second * secondWidth}%`,
                                transform: second === 0 ? undefined
                                    : loopSeconds - second < 0.5 ? "translateX(-100%)" : "translateX(-50%)",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {second} s
                        </Typography>
                    ))}
                </Box>

                {arrangedTracks.map(({ id, name, instrument, notes, laneCount }) => {
                    const drumKey = instrument.startsWith("drum:") ? Number(instrument.slice("drum:".length)) : null;
                    const soloStatus = currentSession?.trackId === id ? currentSession.status : "stopped";
                    const followsPlayhead = currentSession !== null &&
                        (currentSession.trackId === null || currentSession.trackId === id);

                    return (
                        <Stack component="section" key={id} spacing={1}>
                            <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                                <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                                    <IconButton
                                        size="small"
                                        title={soloStatus === "playing" ? `Stop ${name}` : `Play ${name}`}
                                        disabled={!notes.length || soloStatus === "starting"}
                                        onClick={soloStatus === "playing" ? stop : () => void play(id)}
                                    >
                                        {soloStatus === "playing" ? <StopIcon /> : <PlayArrowIcon />}
                                    </IconButton>
                                    <Typography component="h3" variant="subtitle1">{name}</Typography>
                                </Stack>
                                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                                    <Button
                                        size="small"
                                        startIcon={<AddIcon />}
                                        disabled={!validLoop || status !== "stopped"}
                                        onClick={() => {
                                            if (playback.current) return;
                                            if (drumKey === null) setNoteTarget({ trackId: id });
                                            else onBlockAdd(id, midiNoteName(drumKey));
                                        }}
                                    >
                                        {drumKey === null ? "Add note" : "Add hit"}
                                    </Button>
                                    <Autocomplete
                                        size="small"
                                        options={instrumentOptions}
                                        getOptionLabel={(option) => instruments.get(option) ?? option}
                                        renderInput={(params) => <TextField {...params} label="Instrument" />}
                                        value={instrument}
                                        disableClearable
                                        disabled={status !== "stopped"}
                                        onChange={(_, value) => {
                                            setSelectedInstruments((current) => ({ ...current, [id]: value }));
                                        }}
                                        sx={{ width: { xs: 170, sm: 245 } }}
                                    />
                                </Stack>
                            </Stack>

                            <Box
                                sx={{
                                    position: "relative",
                                    height: laneCount * 50,
                                    bgcolor: "action.hover",
                                    border: 1,
                                    borderColor: "divider",
                                    borderRadius: 1,
                                    // Repeat a thin line at each labeled interval.
                                    backgroundImage: secondWidth
                                        ? "linear-gradient(to left, rgba(127,127,127,0.2) 1px, transparent 1px)"
                                        : undefined,
                                    backgroundSize: secondWidth ? `${secondWidth * tickStep}% 100%` : undefined,
                                }}
                            >
                                {notes.map(({ id: blockId, note, start, duration, lane }) => (
                                    <DraggableSoundBlock
                                        key={blockId}
                                        note={note}
                                        label={instrument === "drum-kit"
                                            ? instruments.get(`drum:${midiNoteNumber(note)}`)
                                            : drumKey === null ? undefined : instruments.get(instrument)}
                                        start={start}
                                        duration={duration}
                                        lane={lane}
                                        loopSeconds={loopSeconds}
                                        disabled={status !== "stopped"}
                                        onEdit={drumKey === null ? () => {
                                            if (!playback.current) setNoteTarget({ trackId: id, blockId });
                                        } : undefined}
                                        onTimingChange={(nextStart, nextDuration) => {
                                            if (!playback.current) onBlockTimingChange(id, blockId, nextStart, nextDuration);
                                        }}
                                    />
                                ))}
                                <Box
                                    sx={{
                                        position: "absolute",
                                        insetBlock: -5,
                                        // During solo playback, the other tracks stay at the start.
                                        left: followsPlayhead ? "var(--playhead-position, 0%)" : 0,
                                        width: 2,
                                        bgcolor: "error.main",
                                        pointerEvents: "none",
                                    }}
                                />
                            </Box>
                        </Stack>
                    );
                })}
            </Stack>
            {noteTarget && noteTrack && (
                <NoteDialog
                    key={noteTarget.blockId ?? noteTarget.trackId}
                    trackName={noteTrack.name}
                    initialNote={editedBlock?.note}
                    isDrumKit={isEditingDrumKit}
                    onClose={() => setNoteTarget(null)}
                    onSave={(note) => {
                        if (!playback.current && validLoop) {
                            if (editedBlock && editedBlock.note !== note) {
                                onBlockNoteChange(noteTrack.id, editedBlock.id, note);
                            } else if (noteTarget.blockId === undefined) {
                                onBlockAdd(noteTrack.id, note);
                            }
                        }
                        setNoteTarget(null);
                    }}
                />
            )}
        </Stack>
    );
}
