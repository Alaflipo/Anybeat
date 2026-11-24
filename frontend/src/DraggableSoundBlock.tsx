import { Box } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

type DraggableSoundBlockProps = {
    note: string;
    label?: string;
    start: number;
    duration: number;
    lane: number;
    loopSeconds: number;
    disabled: boolean;
    onEdit?: () => void;
    onTimingChange: (start: number, duration: number) => void;
};

const minimumResizeSeconds = 0.05;
type DragMode = "move" | "left" | "right";

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

export default function DraggableSoundBlock({
    note, label = note, start, duration, lane, loopSeconds, disabled, onEdit, onTimingChange,
}: DraggableSoundBlockProps) {
    const [preview, setPreview] = useState<{ mode: DragMode; start: number; duration: number } | null>(null);
    const block = useRef<HTMLDivElement>(null);
    const drag = useRef<{
        mode: DragMode;
        pointerId: number;
        x: number;
        y: number;
        trackWidth: number;
        moved: boolean;
    } | null>(null);
    const maxStart = Math.max(0, loopSeconds - duration);
    const canMove = !disabled && maxStart > 0;
    const visibleStart = disabled ? start : preview?.start ?? start;
    const visibleDuration = disabled ? duration : preview?.duration ?? duration;

    useEffect(() => {
        const pointerId = drag.current?.pointerId;
        const target = block.current;
        if (!disabled || pointerId === undefined) return;

        drag.current = null;
        setPreview(null);
        if (target?.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId);
    }, [disabled]);

    function clampStart(time: number) {
        return Math.min(maxStart, Math.max(0, time));
    }

    function pointerStart(event: PointerEvent<HTMLDivElement>) {
        if (disabled || event.button !== 0 || drag.current) return;

        const edge = event.target instanceof HTMLElement ? event.target.dataset.resizeEdge : undefined;
        const mode = edge === "left" || edge === "right" ? edge : "move";
        if (mode === "move" && !canMove && !onEdit) return;

        const trackWidth = event.currentTarget.parentElement?.clientWidth ?? 0;
        if (trackWidth === 0) return;

        // Capture keeps the drag active when the pointer leaves the block or track.
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = {
            mode,
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            trackWidth,
            moved: false,
        };
    }

    function updateGesture(event: PointerEvent<HTMLDivElement>) {
        const gesture = drag.current;
        if (!gesture || gesture.pointerId !== event.pointerId) return null;

        const deltaX = event.clientX - gesture.x;
        const deltaY = event.clientY - gesture.y;
        // Allow small pointer jitter on click. Once it becomes a drag, moving back
        // to the starting point still counts as a drag.
        gesture.moved ||= Math.hypot(deltaX, deltaY) >= 5;
        const offset = deltaX / gesture.trackWidth * loopSeconds;
        if (gesture.mode !== "move") {
            const fromLeft = gesture.mode === "left";
            const end = start + duration;
            const minimum = Math.min(minimumResizeSeconds, duration);
            const maximum = fromLeft ? end : loopSeconds - start;
            const requestedDuration = fromLeft ? duration - offset : duration + offset;
            const nextDuration = Math.min(maximum, Math.max(minimum, requestedDuration));
            if (fromLeft && nextDuration !== duration) {
                const nextStart = end - nextDuration;
                // Keep adjacent notes in the same lane by reconstructing duration from the fixed end.
                return { mode: gesture.mode, moved: gesture.moved, timing: { start: nextStart, duration: end - nextStart } };
            }
            return { mode: gesture.mode, moved: gesture.moved, timing: { start, duration: nextDuration } };
        }
        const nextStart = canMove ? clampStart(start + offset) : start;
        return { mode: gesture.mode, moved: gesture.moved, timing: { start: nextStart, duration } };
    }

    function clearDrag(event: PointerEvent<HTMLDivElement>) {
        if (drag.current?.pointerId !== event.pointerId) return;
        drag.current = null;
        setPreview(null);
    }

    function pointerEnd(event: PointerEvent<HTMLDivElement>) {
        const gesture = updateGesture(event);
        clearDrag(event);
        if (disabled || !gesture) return;

        // Decide on release so dragging never opens the editor.
        if (!gesture.moved) {
            onEdit?.();
        } else if (gesture.timing.start !== start || gesture.timing.duration !== duration) {
            onTimingChange(gesture.timing.start, gesture.timing.duration);
        }
    }

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (disabled || drag.current) return;
        if (onEdit && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            if (!event.repeat) onEdit();
            return;
        }
        if (!canMove) return;

        // Arrow keys nudge the start by an eighth of a second. Home and End go to the boundaries.
        const keyTimes: Record<string, number> = {
            ArrowLeft: start - 0.125,
            ArrowRight: start + 0.125,
            ArrowDown: start - 0.125,
            ArrowUp: start + 0.125,
            Home: 0,
            End: maxStart,
        };
        if (!Object.hasOwn(keyTimes, event.key)) return;

        event.preventDefault();
        const nextStart = clampStart(keyTimes[event.key]);
        if (nextStart !== start) onTimingChange(nextStart, duration);
    }

    return (
        <Box
            ref={block}
            tabIndex={canMove || (!disabled && onEdit) ? 0 : -1}
            title={`${label} · ${Number(visibleStart.toFixed(3))} s start · ${Number(visibleDuration.toPrecision(6))} s duration`}
            onPointerDown={pointerStart}
            onPointerMove={(event) => {
                const gesture = updateGesture(event);
                if (!disabled && gesture?.moved && (canMove || gesture.mode !== "move")) {
                    setPreview({ mode: gesture.mode, ...gesture.timing });
                }
            }}
            onPointerUp={pointerEnd}
            onPointerCancel={clearDrag}
            onLostPointerCapture={clearDrag}
            onKeyDown={handleKeyDown}
            sx={{
                position: "absolute",
                left: `${visibleStart / loopSeconds * 100}%`,
                width: `${visibleDuration / loopSeconds * 100}%`,
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
                cursor: !disabled && preview && preview.mode !== "move"
                    ? "ew-resize"
                    : canMove ? (preview === null ? "grab" : "grabbing") : !disabled && onEdit ? "pointer" : "default",
                touchAction: disabled ? "auto" : "none",
                userSelect: "none",
                zIndex: !disabled && preview !== null ? 1 : undefined,
            }}
        >
            {label}
            {!disabled && (["left", "right"] as const).map((edge) => (
                <Box
                    key={edge}
                    data-resize-edge={edge}
                    aria-hidden="true"
                    sx={{
                        position: "absolute",
                        insetBlock: 0,
                        [edge]: 0,
                        width: "min(8px, 25%)",
                        bgcolor: "currentColor",
                        opacity: 0.35,
                        cursor: "ew-resize",
                    }}
                />
            ))}
        </Box>
    );
}
