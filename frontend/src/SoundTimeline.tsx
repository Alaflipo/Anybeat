import AddIcon from "@mui/icons-material/Add";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import ReplayIcon from "@mui/icons-material/Replay";
import { Alert, Autocomplete, Box, Button, IconButton, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import NoteDialog from "./NoteDialog";
import DraggableSoundBlock from "./DraggableSoundBlock";
import { createTimelineAudio } from "./timelineAudio";
import { instruments, midiNoteName, midiNoteNumber } from "./generalMidi";
import type { Instrument } from "./generalMidi";

const instrumentOptions = [...instruments.keys()];
const playheadPosition = "var(--seek-preview, var(--seek-position, var(--playhead-position, 0%)))";

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

type PlaybackStatus = "starting" | "playing" | "pausing" | "paused";

type PlaybackSession = {
    trackId: string | null;
    status: PlaybackStatus;
    tracks: readonly SoundTrack[];
    audio: ReturnType<typeof createTimelineAudio>;
    frame: number;
    pausedAt: number;
    dispose: () => void;
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
    const playback = useRef<PlaybackSession | null>(null);
    const [active, setActive] = useState<Pick<PlaybackSession, "trackId" | "status" | "pausedAt"> | null>(null);
    const [seekPosition, setSeekPosition] = useState<number | null>(null);
    const seekDrag = useRef<{ pointerId: number; ruler: HTMLDivElement } | null>(null);
    // Keep each dropdown choice by track ID and fall back to the track's configured instrument.
    const [selectedInstruments, setSelectedInstruments] = useState<Partial<Record<string, Instrument>>>({});
    const [noteTarget, setNoteTarget] = useState<{ trackId: string; blockId?: string } | null>(null);
    const noteTrack = tracks.find(({ id }) => id === noteTarget?.trackId);
    const isEditingDrumKit = noteTrack !== undefined &&
        (selectedInstruments[noteTrack.id] ?? noteTrack.instrument) === "drum-kit";
    const editedBlock = noteTrack?.blocks.find(({ id }) => id === noteTarget?.blockId);
    const [error, setError] = useState("");
    const mixStatus = active?.trackId === null ? active.status : "stopped";
    const editingLocked = active !== null && active.status !== "paused";

    const validLoop = Number.isFinite(loopSeconds) && loopSeconds > 0;
    const canSeek = validLoop && !editingLocked;
    const visibleSeek = canSeek ? seekPosition : null;
    const rulerPosition = visibleSeek ?? active?.pausedAt ?? 0;
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

    // App remounts the timeline when the selected arrangement changes.
    useEffect(() => () => {
        playback.current?.dispose();
        playback.current = null;
    }, []);

    function setPlaybackStatus(session: PlaybackSession, status: PlaybackStatus) {
        session.status = status;
        setActive({ trackId: session.trackId, status, pausedAt: session.pausedAt });
    }

    function reset() {
        clearSeekDrag();
        setSeekPosition(null);
        endPlayback();
    }

    function endPlayback() {
        playback.current?.dispose();
        playback.current = null;
        setActive(null);
    }

    function reportPlaybackError(session: PlaybackSession, cause: unknown) {
        if (playback.current !== session) return;
        endPlayback();
        setError(cause instanceof Error ? cause.message : "Could not change playback.");
    }

    function drawPlayhead(element: HTMLDivElement, position: number) {
        element.style.setProperty("--playhead-position", `${position / loopSeconds * 100}%`);
    }

    function clearSeekDrag() {
        const drag = seekDrag.current;
        if (!drag) return;

        seekDrag.current = null;
        timeline.current?.style.removeProperty("--seek-preview");
        updateRulerValue(drag.ruler, rulerPosition);
        if (drag.ruler.hasPointerCapture(drag.pointerId)) {
            drag.ruler.releasePointerCapture(drag.pointerId);
        }
    }

    function updateRulerValue(ruler: HTMLDivElement, position: number) {
        ruler.setAttribute("aria-valuenow", String(position));
        ruler.setAttribute("aria-valuetext", formatRulerValue(position));
    }

    function formatRulerValue(position: number) {
        return `${Number(position.toFixed(3))} seconds`;
    }

    function previewSeek(event: PointerEvent<HTMLDivElement>) {
        const position = positionAtPointer(event);
        timeline.current?.style.setProperty("--seek-preview", `${position / loopSeconds * 100}%`);
        updateRulerValue(event.currentTarget, position);
    }

    function cancelSeek(event: PointerEvent<HTMLDivElement>) {
        if (seekDrag.current?.pointerId === event.pointerId) clearSeekDrag();
    }

    function positionAtPointer(event: PointerEvent<HTMLDivElement>) {
        const { left, width } = event.currentTarget.getBoundingClientRect();
        return clampSeek((event.clientX - left) / width * loopSeconds);
    }

    function clampSeek(position: number) {
        return Math.min(loopSeconds, Math.max(0, position));
    }

    function seekWithKeyboard(event: KeyboardEvent<HTMLDivElement>) {
        if (!canSeek || seekDrag.current) return;
        const positions: Record<string, number> = {
            ArrowLeft: rulerPosition - 0.125,
            ArrowDown: rulerPosition - 0.125,
            ArrowRight: rulerPosition + 0.125,
            ArrowUp: rulerPosition + 0.125,
            Home: 0,
            End: loopSeconds,
        };
        if (!Object.hasOwn(positions, event.key)) return;
        event.preventDefault();
        setSeekPosition(clampSeek(positions[event.key]));
    }

    function animatePlayhead(session: PlaybackSession, element: HTMLDivElement) {
        function draw() {
            drawPlayhead(element, session.audio.elapsedSeconds() % loopSeconds);
            session.frame = requestAnimationFrame(draw);
        }
        draw();
    }

    async function beginPlayback(session: PlaybackSession, element: HTMLDivElement, startAudio: () => Promise<void>) {
        setPlaybackStatus(session, "starting");
        try {
            await startAudio();
            if (playback.current !== session) return;
            setSeekPosition(null);
            animatePlayhead(session, element);
            setPlaybackStatus(session, "playing");
        } catch (cause) {
            reportPlaybackError(session, cause);
        }
    }

    async function togglePlayback(trackId: string | null) {
        const element = timeline.current;
        if (!element || !validLoop) return;

        const selectedTracks = trackId === null
            ? arrangedTracks
            : arrangedTracks.filter(({ id }) => id === trackId);
        const previous = playback.current;
        if (previous && previous.trackId === trackId) {
            if (previous.status === "starting" || previous.status === "pausing") return;

            if (previous.status === "playing") {
                setPlaybackStatus(previous, "pausing");
                try {
                    await previous.audio.pause();
                    if (playback.current !== previous) return;
                    cancelAnimationFrame(previous.frame);
                    previous.pausedAt = previous.audio.elapsedSeconds() % loopSeconds;
                    drawPlayhead(element, previous.pausedAt);
                    setPlaybackStatus(previous, "paused");
                } catch (cause) {
                    reportPlaybackError(previous, cause);
                }
                return;
            }

            const sameTracks = previous.tracks.length === selectedTracks.length &&
                previous.tracks.every(({ id, blocks, instrument }, index) => {
                    const track = selectedTracks[index];
                    return id === track.id && blocks === track.blocks && instrument === track.instrument;
                });
            if (sameTracks && seekPosition === null) {
                clearSeekDrag();
                await beginPlayback(previous, element, previous.audio.resume);
                return;
            }
        }

        if (!selectedTracks.some(({ notes }) => notes.length > 0)) return;

        clearSeekDrag();
        const position = seekPosition ?? (previous?.trackId === trackId ? previous.pausedAt : 0);
        const offset = position === loopSeconds ? 0 : position;
        previous?.dispose();
        const audio = createTimelineAudio(selectedTracks, loopSeconds, offset);
        const session: PlaybackSession = {
            trackId,
            status: "starting",
            tracks: selectedTracks,
            audio,
            frame: 0,
            pausedAt: offset,
            dispose() {
                cancelAnimationFrame(session.frame);
                audio.stop();
                element.style.removeProperty("--playhead-position");
            },
        };
        playback.current = session;
        setError("");
        drawPlayhead(element, offset);
        await beginPlayback(session, element, audio.start);
    }

    function canEdit() {
        return playback.current === null || playback.current.status === "paused";
    }

    return (
        <Stack spacing={2}>
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                <Button
                    variant="contained"
                    startIcon={mixStatus === "playing" || mixStatus === "pausing" ? <PauseIcon /> : <PlayArrowIcon />}
                    disabled={!canPlay || mixStatus === "starting" || mixStatus === "pausing"}
                    onClick={() => void togglePlayback(null)}
                >
                    {mixStatus === "playing" || mixStatus === "pausing" ? "Pause all tracks" : mixStatus === "starting" ? "Starting…" : "Play all tracks"}
                </Button>
                {mixStatus !== "stopped" && <Button startIcon={<ReplayIcon />} onClick={reset}>Reset</Button>}
                <Typography variant="body2" color="text.secondary">
                    {loopSeconds} s loop
                </Typography>
            </Stack>

            {error && <Alert severity="error">{error}</Alert>}

            <Stack ref={timeline} spacing={2} sx={visibleSeek === null ? undefined : {
                "--seek-position": `${visibleSeek / loopSeconds * 100}%`,
            }}>
                {/* The ruler uses the same one-pixel inset as the bordered tracks. */}
                <Box
                    role={canSeek ? "slider" : undefined}
                    aria-label={canSeek ? "Playhead" : undefined}
                    aria-valuemin={canSeek ? 0 : undefined}
                    aria-valuemax={canSeek ? loopSeconds : undefined}
                    aria-valuenow={canSeek ? rulerPosition : undefined}
                    aria-valuetext={canSeek ? formatRulerValue(rulerPosition) : undefined}
                    tabIndex={canSeek ? 0 : -1}
                    onKeyDown={seekWithKeyboard}
                    onPointerDown={(event) => {
                        if (!canSeek || event.button !== 0 || seekDrag.current ||
                            event.currentTarget.getBoundingClientRect().width === 0) return;
                        event.currentTarget.setPointerCapture(event.pointerId);
                        seekDrag.current = { pointerId: event.pointerId, ruler: event.currentTarget };
                        previewSeek(event);
                    }}
                    onPointerMove={(event) => {
                        if (canSeek && seekDrag.current?.pointerId === event.pointerId) {
                            previewSeek(event);
                        }
                    }}
                    onPointerUp={(event) => {
                        if (seekDrag.current?.pointerId !== event.pointerId) return;
                        if (canSeek) setSeekPosition(positionAtPointer(event));
                        clearSeekDrag();
                    }}
                    onPointerCancel={cancelSeek}
                    onLostPointerCapture={cancelSeek}
                    sx={{
                        position: "relative",
                        height: 32,
                        mx: "1px",
                        cursor: canSeek ? "ew-resize" : "default",
                        touchAction: canSeek ? "none" : "auto",
                        userSelect: "none",
                    }}
                >
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
                    {validLoop && <Box sx={{
                        position: "absolute",
                        left: playheadPosition,
                        bottom: 0,
                        width: 12,
                        height: 12,
                        transform: "translateX(-50%)",
                        clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                        bgcolor: "error.main",
                        pointerEvents: canSeek ? "auto" : "none",
                    }} />}
                </Box>

                {arrangedTracks.map(({ id, name, instrument, notes, laneCount }) => {
                    const drumKey = instrument.startsWith("drum:") ? Number(instrument.slice("drum:".length)) : null;
                    const soloStatus = active?.trackId === id ? active.status : "stopped";
                    const soloPlaying = soloStatus === "playing" || soloStatus === "pausing";
                    const followsPlayhead = active !== null && (active.trackId === null || active.trackId === id);

                    return (
                        <Stack component="section" key={id} spacing={1}>
                            <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                                <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                                    <IconButton
                                        size="small"
                                        title={soloPlaying ? `Pause ${name}` : `Play ${name}`}
                                        disabled={!notes.length || soloStatus === "starting" || soloStatus === "pausing"}
                                        onClick={() => void togglePlayback(id)}
                                    >
                                        {soloPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                                    </IconButton>
                                    {soloStatus !== "stopped" && (
                                        <IconButton size="small" title={`Reset ${name}`} onClick={reset}>
                                            <ReplayIcon />
                                        </IconButton>
                                    )}
                                    <Typography component="h3" variant="subtitle1">{name}</Typography>
                                </Stack>
                                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                                    <Button
                                        size="small"
                                        startIcon={<AddIcon />}
                                        disabled={!validLoop || editingLocked}
                                        onClick={() => {
                                            if (!canEdit()) return;
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
                                        disabled={editingLocked}
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
                                        showLabel={drumKey === null}
                                        start={start}
                                        duration={duration}
                                        lane={lane}
                                        loopSeconds={loopSeconds}
                                        disabled={editingLocked}
                                        onEdit={drumKey === null ? () => {
                                            if (canEdit()) setNoteTarget({ trackId: id, blockId });
                                        } : undefined}
                                        onTimingChange={(nextStart, nextDuration) => {
                                            if (canEdit()) onBlockTimingChange(id, blockId, nextStart, nextDuration);
                                        }}
                                    />
                                ))}
                                <Box
                                    sx={{
                                        position: "absolute",
                                        insetBlock: -5,
                                        // During solo playback, the other tracks stay at the start.
                                        left: followsPlayhead || visibleSeek !== null
                                            ? playheadPosition : "var(--seek-preview, 0%)",
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
                        if (canEdit() && validLoop) {
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
