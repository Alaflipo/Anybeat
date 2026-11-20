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

function demoTrack(id: string, name: string, instrument: SoundTrack["instrument"], events: PhraseEvent[]): SoundTrack {
    return { id, name, instrument, blocks: phrase(events) };
}

const jazz: Demo = {
    name: "Jazz",
    loopSeconds: 8,
    tracks: [
        demoTrack("keys", "Seventh-chord comping", "electricPiano", [
            [0.34, 0.52, "F4", "A4", "C5", "E5"], [1.34, 0.35, "F4", "A4", "C5"],
            [2.34, 0.52, "F4", "B4", "D5", "E5"], [3.34, 0.35, "F4", "B4", "D5"],
            [4.34, 0.52, "E4", "G4", "B4", "D5"], [5.34, 0.35, "E4", "G4", "B4"],
            [6.34, 0.52, "G4", "B4", "E5"], [7.34, 0.4, "G4", "C#5", "E5"],
        ]),
        demoTrack("bass", "Walking bass", "bass", [
            [0, 0.44, "D2"], [0.5, 0.44, "F2"], [1, 0.44, "A2"], [1.5, 0.44, "Ab2"],
            [2, 0.44, "G2"], [2.5, 0.44, "B2"], [3, 0.44, "D3"], [3.5, 0.44, "Db3"],
            [4, 0.44, "C3"], [4.5, 0.44, "G2"], [5, 0.44, "E2"], [5.5, 0.44, "G#2"],
            [6, 0.44, "A2"], [6.5, 0.44, "E3"], [7, 0.44, "G2"], [7.5, 0.44, "C#3"],
        ]),
        demoTrack("flute", "Swung flute line", "flute", [
            [0.34, 0.15, "A5"], [0.5, 0.28, "F5"], [0.84, 0.12, "E5"], [1, 0.54, "D5"],
            [2.34, 0.15, "B5"], [2.5, 0.28, "G5"], [2.84, 0.12, "F5"], [3, 0.54, "D5"],
            [4.34, 0.15, "G5"], [4.5, 0.28, "E5"], [4.84, 0.12, "D5"], [5, 0.54, "C5"],
            [6.34, 0.15, "E5"], [6.5, 0.28, "G5"], [6.84, 0.12, "A5"], [7, 0.67, "C#6"],
        ]),
    ],
};

const drumBreak: Demo = {
    name: "Drum Break",
    loopSeconds: 8,
    tracks: [
        demoTrack("kick", "Syncopated kick", "kick", [
            [0, 0.15, "C1"], [0.75, 0.15, "C1"], [1, 0.15, "C1"], [1.625, 0.15, "C1"],
            [2, 0.15, "C1"], [2.75, 0.15, "C1"], [3.125, 0.15, "C1"],
            [4, 0.15, "C1"], [4.75, 0.15, "C1"], [5, 0.15, "C1"], [5.625, 0.15, "C1"],
            [6, 0.15, "C1"], [6.75, 0.15, "C1"], [7, 0.15, "C1"], [7.75, 0.15, "C1"],
        ]),
        demoTrack("snare", "Snare backbeat", "snare", [
            [0.5, 0.11, "D2"], [1.5, 0.11, "D2"], [1.875, 0.045, "D2"],
            [2.5, 0.11, "D2"], [3.375, 0.045, "D2"], [3.5, 0.11, "D2"],
            [4.5, 0.11, "D2"], [5.5, 0.11, "D2"], [5.875, 0.045, "D2"],
            [6.5, 0.11, "D2"], [7.25, 0.045, "D2"], [7.375, 0.045, "D2"], [7.5, 0.11, "D2"],
        ]),
        demoTrack("hat", "Hi-hat pattern", "hiHat", [
            // Short taps alternate with longer offbeat accents.
            ...Array.from({ length: 32 }, (_, step): PhraseEvent =>
                [step * 0.25, step % 4 === 3 ? 0.12 : 0.035, "F#2"]),
            [1.875, 0.045, "F#2"], [3.875, 0.045, "F#2"],
            [5.875, 0.045, "F#2"], [7.875, 0.045, "F#2"],
        ]),
        demoTrack("tom", "Descending tom fills", "tom", [
            [3.25, 0.12, "A2"], [3.625, 0.12, "F2"], [3.875, 0.1, "D2"],
            [7, 0.12, "A2"], [7.25, 0.12, "G2"], [7.5, 0.12, "F2"],
            [7.625, 0.12, "E2"], [7.875, 0.1, "D2"],
        ]),
    ],
};

const pop: Demo = {
    name: "Pop",
    loopSeconds: 8,
    tracks: [
        demoTrack("lead", "Synth hook", "synthLead", [
            [0.25, 0.23, "E5"], [0.5, 0.38, "G5"], [1, 0.7, "C6"],
            [2.25, 0.23, "D5"], [2.5, 0.38, "G5"], [3, 0.7, "B5"],
            [4.25, 0.23, "E5"], [4.5, 0.38, "A5"], [5, 0.7, "C6"],
            [6.25, 0.23, "C6"], [6.5, 0.38, "A5"], [7, 0.7, "G5"],
        ]),
        demoTrack("keys", "Electric piano chords", "electricPiano", [
            [0, 1.7, "C4", "E4", "G4"], [2, 1.7, "B3", "D4", "G4"],
            [4, 1.7, "A3", "C4", "E4"], [6, 1.7, "A3", "C4", "F4"],
        ]),
        demoTrack("bass", "Bass pulse", "bass", [
            [0, 0.8, "C2"], [1, 0.6, "C3"], [2, 0.8, "G2"], [3, 0.6, "G3"],
            [4, 0.8, "A2"], [5, 0.6, "A3"], [6, 0.8, "F2"], [7, 0.6, "F3"],
        ]),
        demoTrack("kick", "Four-on-the-floor kick", "kick",
            Array.from({ length: 16 }, (_, beat) => [beat * 0.5, 0.13, "C1"])),
    ],
};

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
    {
        name: "Funk",
        loopSeconds: 8,
        tracks: [
            demoTrack("bass", "Syncopated bass", "bass", [
                [0, 0.32, "E2"], [0.75, 0.18, "E3"], [1.05, 0.22, "G2"], [1.5, 0.35, "A2"],
                [2, 0.32, "E2"], [2.65, 0.14, "B2"], [3, 0.24, "D3"], [3.55, 0.25, "B2"],
                [4, 0.32, "A2"], [4.75, 0.18, "A3"], [5.05, 0.22, "C3"], [5.5, 0.35, "D3"],
                [6, 0.32, "E2"], [6.65, 0.14, "B2"], [7, 0.24, "D3"], [7.55, 0.25, "D#3"],
            ]),
            demoTrack("keys", "Offbeat electric piano", "electricPiano", [
                [0.48, 0.15, "G#3", "D4", "F#4"], [1.26, 0.16, "G#3", "D4", "F#4"],
                [2.48, 0.15, "G#3", "D4", "F#4"], [3.26, 0.16, "G#3", "D4", "F#4"],
                [4.48, 0.15, "G3", "C#4", "E4"], [5.26, 0.16, "G3", "C#4", "E4"],
                [6.48, 0.15, "G#3", "D4", "F#4"], [7.26, 0.16, "G#3", "D4", "F#4"],
            ]),
            demoTrack("brass", "Brass accents", "brass", [
                [1.75, 0.18, "B4"], [2.03, 0.25, "D5"], [3.5, 0.3, "E5"],
                [5.75, 0.18, "C#5"], [6.03, 0.25, "B4"], [7.5, 0.3, "G#4"],
            ]),
        ],
    },
    pop,
    {
        name: "Classical",
        loopSeconds: 12,
        tracks: [
            demoTrack("flute", "Flute melody", "flute", [
                [0, 0.9, "D5"], [1, 0.45, "F5"], [1.5, 0.45, "A5"], [2, 0.85, "G5"],
                [3, 0.9, "E5"], [4, 0.45, "G5"], [4.5, 0.45, "Bb5"], [5, 0.85, "A5"],
                [6, 0.9, "F5"], [7, 0.45, "D5"], [7.5, 0.45, "G5"], [8, 0.85, "Bb5"],
                [9, 0.9, "A5"], [10, 0.45, "G5"], [10.5, 0.45, "E5"], [11, 0.85, "C#5"],
            ]),
            demoTrack("piano", "Broken chords", "piano", [
                [0, 0.65, "D3"], [0.75, 0.55, "A3"], [1.5, 0.55, "F4"], [2.25, 0.65, "A3"],
                [3, 0.65, "C3"], [3.75, 0.55, "G3"], [4.5, 0.55, "E4"], [5.25, 0.65, "G3"],
                [6, 0.65, "Bb2"], [6.75, 0.55, "F3"], [7.5, 0.55, "D4"], [8.25, 0.65, "G3"],
                [9, 0.65, "A2"], [9.75, 0.55, "E3"], [10.5, 0.55, "G4"], [11.25, 0.55, "C#4"],
            ]),
            demoTrack("strings", "String harmony", "strings", [
                [0, 2.65, "D4", "F4", "A4"], [3, 2.65, "C4", "E4", "G4"],
                [6, 2.65, "Bb3", "D4", "G4"], [9, 2.65, "A3", "C#4", "G4"],
            ]),
        ],
    },
    {
        name: "Rock",
        loopSeconds: 8,
        tracks: [
            demoTrack("guitar", "Power chords", "electricGuitar", [
                [0, 0.43, "E3", "B3"], [0.5, 0.3, "E3", "B3"], [1, 0.75, "G3", "D4"],
                [2, 0.43, "A3", "E4"], [2.5, 0.3, "A3", "E4"], [3, 0.75, "G3", "D4"],
                [4, 0.43, "E3", "B3"], [4.5, 0.3, "E3", "B3"], [5, 0.75, "G3", "D4"],
                [6, 0.43, "C4", "G4"], [6.5, 0.3, "C4", "G4"], [7, 0.75, "B3", "F#4"],
            ]),
            demoTrack("bass", "Root and octave bass", "bass", [
                [0, 0.4, "E2"], [0.5, 0.4, "E3"], [1, 0.8, "G2"],
                [2, 0.4, "A2"], [2.5, 0.4, "A3"], [3, 0.8, "G2"],
                [4, 0.4, "E2"], [4.5, 0.4, "E3"], [5, 0.8, "G2"],
                [6, 0.4, "C3"], [6.5, 0.4, "C2"], [7, 0.8, "B2"],
            ]),
            demoTrack("organ", "Organ countermelody", "organ", [
                [0.75, 0.18, "E4"], [1, 0.65, "B4"], [2.75, 0.18, "A4"], [3, 0.65, "G4"],
                [4.75, 0.18, "E4"], [5, 0.65, "B4"], [6.75, 0.18, "G4"], [7, 0.65, "F#4"],
            ]),
            demoTrack("kick", "Kick accents", "kick", [
                [0, 0.15, "C1"], [1, 0.15, "C1"], [1.75, 0.15, "C1"], [2, 0.15, "C1"],
                [3, 0.15, "C1"], [4, 0.15, "C1"], [5, 0.15, "C1"], [5.75, 0.15, "C1"],
                [6, 0.15, "C1"], [7, 0.15, "C1"], [7.5, 0.15, "C1"],
            ]),
        ],
    },
    jazz,
    drumBreak,
    {
        name: "Jazz Drum Break",
        loopSeconds: jazz.loopSeconds,
        tracks: [...jazz.tracks, ...drumBreak.tracks],
    },
    {
        name: "Pop Drum Break",
        loopSeconds: pop.loopSeconds,
        // The break supplies the kick for this arrangement.
        tracks: [...pop.tracks.filter(({ id }) => id !== "kick"), ...drumBreak.tracks],
    },
    {
        name: "Creativity",
        loopSeconds: 16,
        tracks: [
            // Four phrases move through C, A minor, F, and G before returning to C.
            demoTrack("piano", "Opening piano motif", "piano", [
                [0, 0.45, "C5"], [0.5, 0.22, "E5"], [0.75, 0.45, "G5"], [1.5, 0.75, "D5"],
                [2.5, 0.35, "E5"], [3, 0.6, "G5"], [15.5, 0.4, "B4", "D5"],
            ]),
            demoTrack("guitar", "Acoustic arpeggios", "guitar", [
                [0.25, 0.42, "C4"], [0.75, 0.42, "G4"], [1.25, 0.42, "E4"], [1.75, 0.42, "B4"],
                [2.25, 0.42, "C4"], [2.75, 0.42, "G4"], [3.25, 0.42, "D4"], [3.75, 0.2, "E4"],
            ]),
            demoTrack("flute", "Flute answers", "flute", [
                [2, 0.42, "G5"], [2.5, 0.42, "E5"], [3.25, 0.55, "D5"],
                [8.5, 0.65, "A5"], [9.5, 0.42, "G5"], [10, 0.7, "F5"],
            ]),
            demoTrack("strings", "String swells", "strings", [
                [0, 3.5, "C4", "E4", "G4"], [7.75, 3.85, "F4", "A4", "C5"],
                [12, 3.5, "G4", "B4", "D5"],
            ]),
            demoTrack("electric-piano", "Syncopated electric piano", "electricPiano", [
                [4.25, 0.23, "G3", "C4", "E4"], [5.25, 0.23, "G3", "C4", "E4"],
                [6.25, 0.23, "G3", "B3", "E4"], [7.25, 0.3, "G3", "C4", "E4"],
                [12.25, 0.23, "F3", "B3", "D4"], [14.25, 0.23, "F3", "B3", "D4"],
            ]),
            demoTrack("bass", "Bass groove", "bass", [
                [4, 0.52, "A2"], [4.75, 0.19, "E3"], [5, 0.4, "A2"], [5.75, 0.18, "G2"],
                [6, 0.52, "A2"], [6.75, 0.19, "C3"], [7, 0.4, "E3"], [7.75, 0.18, "E2"],
                [8, 1.15, "F2"], [9.5, 0.4, "C3"], [10, 1.15, "F2"], [11.5, 0.4, "F#2"],
                [12, 0.52, "G2"], [12.75, 0.19, "D3"], [13, 0.4, "G2"],
                [14, 0.52, "G2"], [14.75, 0.19, "B2"], [15, 0.7, "G2"],
            ]),
            demoTrack("brass", "Brass stabs", "brass", [
                [4.5, 0.18, "E5", "A5"], [5.5, 0.18, "C5", "G5"], [7.5, 0.24, "E5", "G5"],
                [12.5, 0.18, "D5", "G5"], [13.5, 0.18, "B4", "F5"], [15, 0.35, "D5", "G5"],
            ]),
            demoTrack("synth-keys", "Synth keys shimmer", "synthKeys", [
                [8.25, 0.3, "C5"], [8.75, 0.25, "E5"], [9.25, 0.4, "F5"],
                [10.25, 0.3, "C5"], [10.75, 0.25, "G5"], [11.25, 0.4, "A5"],
            ]),
            demoTrack("organ", "Organ responses", "organ", [
                [8, 0.6, "F3", "C4"], [9, 0.6, "A3", "E4"], [10, 0.6, "F3", "C4"],
                [11, 0.6, "A3", "C4"], [13, 0.5, "G3", "B3"], [15, 0.45, "G3", "F4"],
            ]),
            demoTrack("electric-guitar", "Electric guitar finale", "electricGuitar", [
                [11.75, 0.22, "F3", "C4"], [12, 0.42, "G3", "D4"], [12.75, 0.22, "G3", "D4"],
                [13.5, 0.38, "G3", "D4"], [14, 0.42, "G3", "D4"], [14.75, 0.22, "G3", "D4"],
                [15.5, 0.25, "B3", "F4"],
            ]),
            demoTrack("synth-lead", "Final synth hook", "synthLead", [
                [12, 0.45, "G5"], [12.5, 0.22, "B5"], [12.75, 0.45, "D6"], [13.5, 0.45, "A5"],
                [14.25, 0.35, "G5"], [14.75, 0.4, "D6"], [15.25, 0.45, "B5"],
            ]),
            demoTrack("kick", "Kick groove", "kick", [
                [4, 0.14, "C1"], [4.75, 0.14, "C1"], [5.5, 0.14, "C1"],
                [6, 0.14, "C1"], [6.75, 0.14, "C1"], [7.5, 0.14, "C1"],
                [8, 0.14, "C1"], [10, 0.14, "C1"], [12, 0.14, "C1"], [12.75, 0.14, "C1"],
                [13.5, 0.14, "C1"], [14, 0.14, "C1"], [14.75, 0.14, "C1"], [15.5, 0.14, "C1"],
            ]),
            demoTrack("snare", "Snare backbeat", "snare", [
                [4.5, 0.11, "D2"], [5.5, 0.11, "D2"], [6.5, 0.11, "D2"], [7.5, 0.11, "D2"],
                [9.5, 0.1, "D2"], [11.5, 0.1, "D2"],
                [12.5, 0.11, "D2"], [13.5, 0.11, "D2"], [14.5, 0.11, "D2"], [15.5, 0.11, "D2"],
            ]),
            demoTrack("hi-hat", "Hi-hat accents", "hiHat", [
                ...[4, 12].flatMap((start) =>
                    Array.from({ length: 16 }, (_, step): PhraseEvent =>
                        [start + step * 0.25, step % 4 === 3 ? 0.11 : 0.035, "F#2"])),
            ]),
            demoTrack("tom", "Tom transitions", "tom", [
                [7.625, 0.11, "A2"], [7.75, 0.11, "F2"], [7.875, 0.11, "D2"],
                [11.5, 0.11, "A2"], [11.75, 0.11, "F2"], [11.875, 0.11, "D2"],
                [15.625, 0.11, "A2"], [15.75, 0.11, "F2"], [15.875, 0.11, "D2"],
            ]),
        ],
    },
];
