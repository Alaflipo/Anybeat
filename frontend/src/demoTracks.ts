import type { SoundBlock, SoundTrack } from "./SoundTimeline";

const originalTracks: SoundTrack[] = [
    {
        id: "melody",
        name: "Melody",
        instrument: "piano",
        blocks: [
            { id: "c4", start: 0, duration: 0.55, note: "C4" },
            { id: "e4", start: 0.75, duration: 0.55, note: "E4" },
            { id: "g4", start: 1.5, duration: 0.8, note: "G4" },
            { id: "c5", start: 2, duration: 0.6, note: "C5" },
            { id: "e4-return", start: 3, duration: 0.8, note: "E4" },
            { id: "g4-return", start: 4.25, duration: 0.6, note: "G4" },
            { id: "c4-outro", start: 5.25, duration: 0.9, note: "C4" },
        ],
    },
    {
        id: "rhythm",
        name: "Rhythm",
        instrument: "guitar",
        blocks: [
            { id: "g3", start: 0.5, duration: 0.4, note: "G3" },
            { id: "c4", start: 0.55, duration: 0.4, note: "C4" },
            { id: "a3", start: 2.5, duration: 0.4, note: "A3" },
            { id: "c4-outro", start: 2.55, duration: 0.4, note: "C4" },
        ],
    },
    {
        id: "bass",
        name: "Bass",
        instrument: "bass",
        blocks: [
            { id: "c2", start: 0, duration: 1.2, note: "C2" },
            { id: "g2", start: 1.5, duration: 0.45, note: "G2" },
            { id: "a2", start: 2, duration: 0.75, note: "A2" },
            { id: "g2-return", start: 3, duration: 0.8, note: "G2" },
            { id: "c2-outro", start: 4.25, duration: 1.75, note: "C2" },
        ],
    },
];

type Demo = {
    name: string;
    loopSeconds: number;
    tracks: readonly SoundTrack[];
};

type PhraseEvent = [start: number, duration: number, ...notes: string[]];

// Pitches listed at the same time form a chord, with one block per pitch.
function phrase(events: PhraseEvent[]): SoundBlock[] {
    return events.flatMap(([start, duration, ...notes], eventIndex) =>
        notes.map((note, noteIndex) => ({
            id: `${eventIndex}-${noteIndex}`,
            start,
            duration,
            note,
        })),
    );
}

export const demos: readonly Demo[] = [
    { name: "Original", loopSeconds: 6.5, tracks: originalTracks },
    {
        name: "Angry",
        loopSeconds: 4,
        tracks: [
            {
                id: "guitar",
                name: "Guitar riff",
                instrument: "guitar",
                blocks: phrase([
                    [0, 0.2, "E3", "B3"], [0.375, 0.12, "E3"],
                    [0.5, 0.2, "F3", "C4"], [0.875, 0.12, "E3"],
                    [1, 0.28, "Bb3", "E4"], [1.5, 0.16, "F3", "C4"],
                    [2, 0.2, "E3", "B3"], [2.375, 0.12, "E3"],
                    [2.5, 0.2, "F3", "C4"], [2.875, 0.12, "E3"],
                    [3, 0.3, "Bb3", "E4"], [3.5, 0.36, "F3", "C4"],
                ]),
            },
            {
                id: "bass",
                name: "Driving bass",
                instrument: "bass",
                blocks: phrase([
                    [0, 0.22, "E2"], [0.25, 0.18, "E2"], [0.5, 0.22, "F2"], [0.75, 0.18, "E2"],
                    [1, 0.35, "Bb1"], [1.5, 0.22, "F2"], [1.75, 0.18, "E2"],
                    [2, 0.22, "E2"], [2.25, 0.18, "E2"], [2.5, 0.22, "F2"], [2.75, 0.18, "E2"],
                    [3, 0.35, "Bb1"], [3.5, 0.35, "F2"],
                ]),
            },
            {
                id: "lead",
                name: "Synth accents",
                instrument: "synthKeys",
                blocks: phrase([
                    [0.75, 0.18, "E5"], [1, 0.32, "Bb4"], [1.5, 0.25, "F5"],
                    [2.75, 0.18, "E5"], [3, 0.32, "Bb4"], [3.5, 0.34, "F5"],
                ]),
            },
        ],
    },
    {
        name: "Happy",
        loopSeconds: 8,
        tracks: [
            {
                id: "melody",
                name: "Piano melody",
                instrument: "piano",
                blocks: phrase([
                    [0, 0.4, "E5"], [0.5, 0.22, "G5"], [0.75, 0.55, "C6"], [1.5, 0.4, "G5"],
                    [2, 0.4, "D5"], [2.5, 0.22, "G5"], [2.75, 0.55, "B5"], [3.5, 0.4, "G5"],
                    [4, 0.4, "E5"], [4.5, 0.22, "A5"], [4.75, 0.55, "C6"], [5.5, 0.4, "A5"],
                    [6, 0.4, "A5"], [6.5, 0.22, "G5"], [6.75, 0.55, "F5"], [7.5, 0.4, "D5"],
                ]),
            },
            {
                id: "chords",
                name: "Offbeat guitar",
                instrument: "guitar",
                blocks: phrase([
                    [0.5, 0.25, "C4", "E4", "G4"], [1.5, 0.25, "C4", "E4", "G4"],
                    [2.5, 0.25, "B3", "D4", "G4"], [3.5, 0.25, "B3", "D4", "G4"],
                    [4.5, 0.25, "C4", "E4", "A4"], [5.5, 0.25, "C4", "E4", "A4"],
                    [6.5, 0.25, "C4", "F4", "A4"], [7.5, 0.25, "F4", "G4", "B4"],
                ]),
            },
            {
                id: "bass",
                name: "Bouncing bass",
                instrument: "bass",
                blocks: phrase([
                    [0, 0.65, "C2"], [1, 0.65, "G2"], [2, 0.65, "G2"], [3, 0.65, "D3"],
                    [4, 0.65, "A2"], [5, 0.65, "E3"], [6, 0.65, "F2"], [7, 0.65, "G2"],
                ]),
            },
        ],
    },
    {
        name: "Sad",
        loopSeconds: 12,
        tracks: [
            {
                id: "melody",
                name: "Piano melody",
                instrument: "piano",
                blocks: phrase([
                    [0.75, 1.3, "E5"], [2.25, 0.65, "C5"],
                    [3.75, 1.3, "D5"], [5.25, 0.65, "B4"],
                    [6.75, 1.3, "C5"], [8.25, 0.65, "A4"],
                    [9.75, 0.9, "B4"], [10.75, 0.9, "G#4"],
                ]),
            },
            {
                id: "harmony",
                name: "Sustained synth keys",
                instrument: "synthKeys",
                blocks: phrase([
                    [0, 2.75, "A3", "C4", "E4"], [3, 2.75, "G3", "B3", "D4"],
                    [6, 2.75, "F3", "A3", "C4"], [9, 2.75, "E3", "G#3", "B3"],
                ]),
            },
            {
                id: "bass",
                name: "Low bass",
                instrument: "bass",
                blocks: phrase([
                    [0, 2.4, "A2"], [3, 2.4, "G2"], [6, 2.4, "F2"], [9, 2.4, "E2"],
                ]),
            },
        ],
    },
    {
        name: "Nature",
        loopSeconds: 12,
        tracks: [
            {
                id: "birds",
                name: "Bird calls",
                instrument: "piano",
                // Short, irregular phrases alternate between two registers.
                blocks: phrase([
                    [0.65, 0.07, "G6"], [0.76, 0.08, "B6"], [0.91, 0.13, "A6"],
                    [2.4, 0.08, "D6"], [2.56, 0.10, "G6"],
                    [4.15, 0.06, "A6"], [4.24, 0.07, "B6"], [4.34, 0.12, "D7"],
                    [6.8, 0.10, "E6"], [6.97, 0.12, "G6"],
                    [8.1, 0.07, "G6"], [8.21, 0.08, "B6"], [8.36, 0.14, "A6"],
                    [10.65, 0.08, "D6"], [10.82, 0.10, "G6"], [11.02, 0.15, "E6"],
                ]),
            },
            {
                id: "stream",
                name: "Stream ripples",
                instrument: "guitar",
                // Staggered plucks leave space between the bird calls.
                blocks: phrase([
                    [0.18, 0.18, "D4"], [0.45, 0.15, "G4"], [1.34, 0.20, "B4"],
                    [1.93, 0.16, "A4"], [2.14, 0.18, "G4"], [3.08, 0.22, "D5"],
                    [3.56, 0.16, "B4"], [4.75, 0.20, "E4"], [5.02, 0.17, "G4"],
                    [5.45, 0.22, "A4"], [6.20, 0.20, "B4"], [6.48, 0.16, "D5"],
                    [7.48, 0.18, "G4"], [7.73, 0.20, "E4"], [8.87, 0.19, "D4"],
                    [9.17, 0.16, "G4"], [9.64, 0.19, "A4"], [10.03, 0.16, "B4"],
                    [11.43, 0.20, "G4"], [11.74, 0.16, "D4"],
                ]),
            },
            {
                id: "wind",
                name: "Wind drone",
                instrument: "bass",
                blocks: phrase([
                    [0, 3.25, "G2"], [2.9, 2.40, "D3"], [5.1, 3.10, "G2"],
                    [7.95, 2.05, "E3"], [9.8, 2.04, "D3"],
                ]),
            },
        ],
    },
];
