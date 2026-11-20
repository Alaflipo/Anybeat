import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { createTimelineAudio, instruments } from "./timelineAudio";
import type { Instrument } from "./timelineAudio";

// One note block. Start and duration are measured in seconds relative to the shared loop.
// The note is written as a pitch such as C4.
export type SoundBlock = {
    id: string;
    start: number;
    duration: number;
    note: string;
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
};

// Color follows the note letter across octaves and accidentals.
const noteColors: Partial<Record<string, { bgcolor: string; color: string }>> = {
    C: { bgcolor: "#A7E3B8", color: "#17482A" },
    D: { bgcolor: "#A1D7F5", color: "#153F5A" },
    E: { bgcolor: "#B9BDF5", color: "#2E316C" },
    F: { bgcolor: "#DBB4F3", color: "#4E2563" },
    G: { bgcolor: "#F4A8AD", color: "#682630" },
    A: { bgcolor: "#F7BD91", color: "#633616" },
    B: { bgcolor: "#F5DB86", color: "#5A430F" },
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

export default function SoundTimeline({ tracks, loopSeconds }: SoundTimelineProps) {
    // The timeline element holds one CSS position inherited by all the playheads.
    const timeline = useRef<HTMLDivElement>(null);
    // The ref holds the current session's cleanup function, including during async startup.
    // Its identity lets us tell whether a Play request still owns the session.
    const playback = useRef<(() => void) | null>(null);
    // React state drives the button and instrument controls during startup and playback.
    const [active, setActive] = useState<(SoundTimelineProps & {
        status: "starting" | "playing";
        trackId: string | null;
    }) | null>(null);
    // Keep each dropdown choice by track ID and fall back to the track's configured instrument.
    const [selectedInstruments, setSelectedInstruments] = useState<Partial<Record<string, Instrument>>>({});
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
    // Label zero and each whole second. A fractional end has a shorter final grid interval.
    const ticks = validLoop ? Array.from({ length: Math.floor(loopSeconds) + 1 }, (_, second) => second) : [];
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

            <Stack ref={timeline} spacing={2} aria-label="Sound tracks">
                {/* The ruler uses the same one-pixel inset as the bordered tracks. */}
                <Box aria-hidden="true" sx={{ position: "relative", height: 20, mx: "1px" }}>
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
                    const soloStatus = currentSession?.trackId === id ? currentSession.status : "stopped";
                    const followsPlayhead = currentSession !== null &&
                        (currentSession.trackId === null || currentSession.trackId === id);

                    return (
                        <Stack component="section" aria-label={name} key={id} spacing={1}>
                            <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                                    <Button
                                        size="small"
                                        aria-label={soloStatus === "playing" ? `Stop ${name}` : `Play ${name}`}
                                        startIcon={soloStatus === "playing" ? <StopIcon /> : <PlayArrowIcon />}
                                        disabled={!notes.length || soloStatus === "starting"}
                                        onClick={soloStatus === "playing" ? stop : () => void play(id)}
                                    >
                                        {soloStatus === "playing" ? "Stop" : soloStatus === "starting" ? "Starting…" : "Play"}
                                    </Button>
                                    <Typography component="h3" variant="subtitle1">{name}</Typography>
                                </Stack>
                                <TextField
                                    select
                                    size="small"
                                    label={`Instrument`}
                                    value={instrument}
                                    disabled={status !== "stopped"}
                                    onChange={(event) => {
                                        const value = event.target.value as Instrument;
                                        setSelectedInstruments((current) => ({ ...current, [id]: value }));
                                    }}
                                    sx={{ minWidth: 170 }}
                                >
                                    {Object.entries(instruments).map(([value, label]) => (
                                        <MenuItem key={value} value={value}>{label}</MenuItem>
                                    ))}
                                </TextField>
                            </Stack>

                            <Box
                                sx={{
                                    position: "relative",
                                    height: laneCount * 50,
                                    bgcolor: "action.hover",
                                    border: 1,
                                    borderColor: "divider",
                                    borderRadius: 1,
                                    // Repeat a thin line at the end of each one-second tile.
                                    backgroundImage: secondWidth
                                        ? "linear-gradient(to left, rgba(127,127,127,0.2) 1px, transparent 1px)"
                                        : undefined,
                                    backgroundSize: secondWidth ? `${secondWidth}% 100%` : undefined,
                                }}
                            >
                                {notes.map(({ id, note, start, duration, lane }) => (
                                    <Box
                                        key={id}
                                        title={`${note} · ${start} s start · ${duration} s duration`}
                                        sx={{
                                            position: "absolute",
                                            // The horizontal position and width represent the note's time range.
                                            left: `${start / loopSeconds * 100}%`,
                                            width: `${duration / loopSeconds * 100}%`,
                                            top: lane * 50 + 5,
                                            height: 40,
                                            borderRadius: 1,
                                            bgcolor: "action.selected",
                                            color: "text.primary",
                                            ...noteColors[note.charAt(0).toUpperCase()],
                                            boxShadow: "inset 0 0 0 1px rgba(0, 0, 0, 0.1)",
                                            display: "grid",
                                            placeItems: "center",
                                            overflow: "hidden",
                                            typography: "caption",
                                            fontWeight: 600,
                                        }}
                                    >
                                        {note}
                                    </Box>
                                ))}
                                <Box
                                    aria-hidden="true"
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
        </Stack>
    );
}
