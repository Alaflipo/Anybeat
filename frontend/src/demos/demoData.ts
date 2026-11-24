// A NoteEvent is a compact tuple for writing demo music: [start, duration, ...notes].
// Start and duration are in seconds. A tuple can describe a single note or a chord.
// A SoundBlock list stores one object per pitch, with an ID so that the timeline can
// move or edit each note independently. eventsToBlocks() expands the tuples into
// that list. For example, [0.5, 0.25, "C4", "E4", "G4"] produces three blocks.

import type { SoundBlock, SoundTrack } from "../SoundTimeline";

export type Demo = {
    name: string;
    loopSeconds: number;
    tracks: readonly SoundTrack[];
};

export type NoteEvent = [start: number, duration: number, ...notes: string[]];

// Pitches listed at the same time form a chord, with one block per pitch.
export function eventsToBlocks(events: NoteEvent[]): SoundBlock[] {
    return events.flatMap(([start, duration, ...notes], eventIndex) =>
        notes.map((note, noteIndex) => ({
            id: `${eventIndex}-${noteIndex}`,
            start,
            duration,
            note,
        })),
    );
}

export function demoTrack(id: string, name: string, instrument: SoundTrack["instrument"], events: NoteEvent[]): SoundTrack {
    return { id, name, instrument, blocks: eventsToBlocks(events) };
}
