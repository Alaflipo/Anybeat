import { Box } from "@mui/material";
import { useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

type DraggableSoundBlockProps = {
    note: string;
    start: number;
    duration: number;
    lane: number;
    loopSeconds: number;
    disabled: boolean;
    onEdit: () => void;
    onMove: (start: number) => void;
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

export default function DraggableSoundBlock({
    note, start, duration, lane, loopSeconds, disabled, onEdit, onMove,
}: DraggableSoundBlockProps) {
    const [preview, setPreview] = useState<number | null>(null);
    const drag = useRef<{
        pointerId: number;
        x: number;
        y: number;
        trackWidth: number;
        moved: boolean;
    } | null>(null);
    const maxStart = Math.max(0, loopSeconds - duration);
    const canMove = !disabled && maxStart > 0;
    const visibleStart = canMove ? preview ?? start : start;

    function clampStart(time: number) {
        return Math.min(maxStart, Math.max(0, time));
    }

    function pointerStart(event: PointerEvent<HTMLDivElement>) {
        if (disabled || event.button !== 0 || drag.current) return;

        const trackWidth = event.currentTarget.parentElement?.clientWidth ?? 0;
        if (trackWidth === 0) return;

        // Capture keeps the drag active when the pointer leaves the block or track.
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = {
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
        return { moved: gesture.moved, nextStart: clampStart(start + offset) };
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
            onEdit();
        } else if (canMove && gesture.nextStart !== start) {
            onMove(gesture.nextStart);
        }
    }

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (disabled || drag.current) return;
        if (event.key === "Enter" || event.key === " ") {
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
        if (nextStart !== start) onMove(nextStart);
    }

    return (
        <Box
            tabIndex={disabled ? -1 : 0}
            title={`${note} · ${Number(visibleStart.toFixed(3))} s start · ${duration} s duration`}
            onPointerDown={pointerStart}
            onPointerMove={(event) => {
                const gesture = updateGesture(event);
                if (canMove && gesture?.moved) setPreview(gesture.nextStart);
            }}
            onPointerUp={pointerEnd}
            onPointerCancel={clearDrag}
            onLostPointerCapture={clearDrag}
            onKeyDown={handleKeyDown}
            sx={{
                position: "absolute",
                left: `${visibleStart / loopSeconds * 100}%`,
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
                cursor: canMove ? (preview === null ? "grab" : "grabbing") : disabled ? "default" : "pointer",
                touchAction: disabled ? "auto" : "none",
                userSelect: "none",
                zIndex: canMove && preview !== null ? 1 : undefined,
            }}
        >
            {note}
        </Box>
    );
}
