import { demoTrack } from "./demoData";
import type { Demo, NoteEvent } from "./demoData";

export const drumBreak: Demo = {
    name: "Drum Break",
    loopSeconds: 8,
    tracks: [
        demoTrack("kick", "Syncopated kick", "drum:36", [
            [0, 0.15, "C1"], [0.75, 0.15, "C1"], [1, 0.15, "C1"], [1.625, 0.15, "C1"],
            [2, 0.15, "C1"], [2.75, 0.15, "C1"], [3.125, 0.15, "C1"],
            [4, 0.15, "C1"], [4.75, 0.15, "C1"], [5, 0.15, "C1"], [5.625, 0.15, "C1"],
            [6, 0.15, "C1"], [6.75, 0.15, "C1"], [7, 0.15, "C1"], [7.75, 0.15, "C1"],
        ]),
        demoTrack("snare", "Snare backbeat", "drum:38", [
            [0.5, 0.11, "D2"], [1.5, 0.11, "D2"], [1.875, 0.045, "D2"],
            [2.5, 0.11, "D2"], [3.375, 0.045, "D2"], [3.5, 0.11, "D2"],
            [4.5, 0.11, "D2"], [5.5, 0.11, "D2"], [5.875, 0.045, "D2"],
            [6.5, 0.11, "D2"], [7.25, 0.045, "D2"], [7.375, 0.045, "D2"], [7.5, 0.11, "D2"],
        ]),
        demoTrack("hat", "Hi-hat pattern", "drum:42", [
            // Short taps alternate with longer offbeat accents.
            ...Array.from({ length: 32 }, (_, step): NoteEvent =>
                [step * 0.25, step % 4 === 3 ? 0.12 : 0.035, "F#2"]),
            [1.875, 0.045, "F#2"], [3.875, 0.045, "F#2"],
            [5.875, 0.045, "F#2"], [7.875, 0.045, "F#2"],
        ]),
        demoTrack("tom", "Descending tom fills", "drum-kit", [
            [3.25, 0.12, "D3"], [3.625, 0.12, "A2"], [3.875, 0.1, "F2"],
            [7, 0.12, "D3"], [7.25, 0.12, "C3"], [7.5, 0.12, "A2"],
            [7.625, 0.12, "G2"], [7.875, 0.1, "F2"],
        ]),
    ],
};

export const pop: Demo = {
    name: "Pop",
    loopSeconds: 8,
    tracks: [
        demoTrack("lead", "Synth hook", "program:80", [
            [0.25, 0.23, "E5"], [0.5, 0.38, "G5"], [1, 0.7, "C6"],
            [2.25, 0.23, "D5"], [2.5, 0.38, "G5"], [3, 0.7, "B5"],
            [4.25, 0.23, "E5"], [4.5, 0.38, "A5"], [5, 0.7, "C6"],
            [6.25, 0.23, "C6"], [6.5, 0.38, "A5"], [7, 0.7, "G5"],
        ]),
        demoTrack("keys", "Electric piano chords", "program:4", [
            [0, 1.7, "C4", "E4", "G4"], [2, 1.7, "B3", "D4", "G4"],
            [4, 1.7, "A3", "C4", "E4"], [6, 1.7, "A3", "C4", "F4"],
        ]),
        demoTrack("bass", "Bass pulse", "program:33", [
            [0, 0.8, "C2"], [1, 0.6, "C3"], [2, 0.8, "G2"], [3, 0.6, "G3"],
            [4, 0.8, "A2"], [5, 0.6, "A3"], [6, 0.8, "F2"], [7, 0.6, "F3"],
        ]),
        demoTrack("kick", "Four-on-the-floor kick", "drum:36",
            Array.from({ length: 16 }, (_, beat) => [beat * 0.5, 0.13, "C1"])),
    ],
};

export const creativity: Demo = {
    name: "Creativity",
    loopSeconds: 16,
    tracks: [
        // Four phrases move through C, A minor, F, and G before returning to C.
        demoTrack("piano", "Opening piano motif", "program:0", [
            [0, 0.45, "C5"], [0.5, 0.22, "E5"], [0.75, 0.45, "G5"], [1.5, 0.75, "D5"],
            [2.5, 0.35, "E5"], [3, 0.6, "G5"], [15.5, 0.4, "B4", "D5"],
        ]),
        demoTrack("guitar", "Acoustic arpeggios", "program:24", [
            [0.25, 0.42, "C4"], [0.75, 0.42, "G4"], [1.25, 0.42, "E4"], [1.75, 0.42, "B4"],
            [2.25, 0.42, "C4"], [2.75, 0.42, "G4"], [3.25, 0.42, "D4"], [3.75, 0.2, "E4"],
        ]),
        demoTrack("flute", "Flute answers", "program:73", [
            [2, 0.42, "G5"], [2.5, 0.42, "E5"], [3.25, 0.55, "D5"],
            [8.5, 0.65, "A5"], [9.5, 0.42, "G5"], [10, 0.7, "F5"],
        ]),
        demoTrack("strings", "String swells", "program:48", [
            [0, 3.5, "C4", "E4", "G4"], [7.75, 3.85, "F4", "A4", "C5"],
            [12, 3.5, "G4", "B4", "D5"],
        ]),
        demoTrack("electric-piano", "Syncopated electric piano", "program:4", [
            [4.25, 0.23, "G3", "C4", "E4"], [5.25, 0.23, "G3", "C4", "E4"],
            [6.25, 0.23, "G3", "B3", "E4"], [7.25, 0.3, "G3", "C4", "E4"],
            [12.25, 0.23, "F3", "B3", "D4"], [14.25, 0.23, "F3", "B3", "D4"],
        ]),
        demoTrack("bass", "Bass groove", "program:33", [
            [4, 0.52, "A2"], [4.75, 0.19, "E3"], [5, 0.4, "A2"], [5.75, 0.18, "G2"],
            [6, 0.52, "A2"], [6.75, 0.19, "C3"], [7, 0.4, "E3"], [7.75, 0.18, "E2"],
            [8, 1.15, "F2"], [9.5, 0.4, "C3"], [10, 1.15, "F2"], [11.5, 0.4, "F#2"],
            [12, 0.52, "G2"], [12.75, 0.19, "D3"], [13, 0.4, "G2"],
            [14, 0.52, "G2"], [14.75, 0.19, "B2"], [15, 0.7, "G2"],
        ]),
        demoTrack("brass", "Brass stabs", "program:61", [
            [4.5, 0.18, "E5", "A5"], [5.5, 0.18, "C5", "G5"], [7.5, 0.24, "E5", "G5"],
            [12.5, 0.18, "D5", "G5"], [13.5, 0.18, "B4", "F5"], [15, 0.35, "D5", "G5"],
        ]),
        demoTrack("synth-keys", "Synth keys shimmer", "program:90", [
            [8.25, 0.3, "C5"], [8.75, 0.25, "E5"], [9.25, 0.4, "F5"],
            [10.25, 0.3, "C5"], [10.75, 0.25, "G5"], [11.25, 0.4, "A5"],
        ]),
        demoTrack("organ", "Organ responses", "program:16", [
            [8, 0.6, "F3", "C4"], [9, 0.6, "A3", "E4"], [10, 0.6, "F3", "C4"],
            [11, 0.6, "A3", "C4"], [13, 0.5, "G3", "B3"], [15, 0.45, "G3", "F4"],
        ]),
        demoTrack("electric-guitar", "Electric guitar finale", "program:29", [
            [11.75, 0.22, "F3", "C4"], [12, 0.42, "G3", "D4"], [12.75, 0.22, "G3", "D4"],
            [13.5, 0.38, "G3", "D4"], [14, 0.42, "G3", "D4"], [14.75, 0.22, "G3", "D4"],
            [15.5, 0.25, "B3", "F4"],
        ]),
        demoTrack("synth-lead", "Final synth hook", "program:80", [
            [12, 0.45, "G5"], [12.5, 0.22, "B5"], [12.75, 0.45, "D6"], [13.5, 0.45, "A5"],
            [14.25, 0.35, "G5"], [14.75, 0.4, "D6"], [15.25, 0.45, "B5"],
        ]),
        demoTrack("kick", "Kick groove", "drum:36", [
            [4, 0.14, "C1"], [4.75, 0.14, "C1"], [5.5, 0.14, "C1"],
            [6, 0.14, "C1"], [6.75, 0.14, "C1"], [7.5, 0.14, "C1"],
            [8, 0.14, "C1"], [10, 0.14, "C1"], [12, 0.14, "C1"], [12.75, 0.14, "C1"],
            [13.5, 0.14, "C1"], [14, 0.14, "C1"], [14.75, 0.14, "C1"], [15.5, 0.14, "C1"],
        ]),
        demoTrack("snare", "Snare backbeat", "drum:38", [
            [4.5, 0.11, "D2"], [5.5, 0.11, "D2"], [6.5, 0.11, "D2"], [7.5, 0.11, "D2"],
            [9.5, 0.1, "D2"], [11.5, 0.1, "D2"],
            [12.5, 0.11, "D2"], [13.5, 0.11, "D2"], [14.5, 0.11, "D2"], [15.5, 0.11, "D2"],
        ]),
        demoTrack("hi-hat", "Hi-hat accents", "drum:42", [
            ...[4, 12].flatMap((start) =>
                Array.from({ length: 16 }, (_, step): NoteEvent =>
                    [start + step * 0.25, step % 4 === 3 ? 0.11 : 0.035, "F#2"])),
        ]),
        demoTrack("tom", "Tom transitions", "drum-kit", [
            [7.625, 0.11, "D3"], [7.75, 0.11, "A2"], [7.875, 0.11, "F2"],
            [11.5, 0.11, "D3"], [11.75, 0.11, "A2"], [11.875, 0.11, "F2"],
            [15.625, 0.11, "D3"], [15.75, 0.11, "A2"], [15.875, 0.11, "F2"],
        ]),
    ],
};

export const sunshineParade: Demo = {
    name: "Sunshine Parade",
    loopSeconds: 16,
    tracks: [
        // A short G-major hook repeats with a new ending for the second phrase.
        demoTrack("bells", "Glockenspiel sing-along", "program:9", [
            [0, 0.36, "G4"], [0.5, 0.36, "B4"], [1, 0.18, "D5"], [1.25, 0.18, "D5"], [1.5, 0.4, "B4"],
            [2, 0.36, "A4"], [2.5, 0.36, "C5"], [3, 0.65, "D5"],
            [4, 0.36, "E5"], [4.5, 0.36, "D5"], [5, 0.18, "C5"], [5.25, 0.18, "C5"], [5.5, 0.4, "B4"],
            [6, 0.36, "A4"], [6.5, 0.36, "B4"], [7, 0.75, "G4"],
            [8, 0.36, "G4"], [8.5, 0.36, "B4"], [9, 0.18, "D5"], [9.25, 0.18, "D5"], [9.5, 0.4, "B4"],
            [10, 0.36, "A4"], [10.5, 0.36, "C5"], [11, 0.65, "D5"],
            [12, 0.36, "E5"], [12.5, 0.36, "G5"], [13, 0.18, "F#5"], [13.25, 0.18, "E5"], [13.5, 0.4, "D5"],
            [14, 0.36, "B4"], [14.5, 0.36, "A4"], [15, 0.82, "G4"],
        ]),
        demoTrack("guitar", "Bouncy acoustic guitar", "program:24", [
            [0.5, 0.26, "G3", "B3", "D4"], [1.5, 0.26, "G3", "B3", "D4"],
            [2.5, 0.26, "A3", "C4", "E4"], [3.5, 0.26, "A3", "D4", "F#4"],
            [4.5, 0.26, "G3", "C4", "E4"], [5.5, 0.26, "G3", "B3", "D4"],
            [6.5, 0.26, "A3", "D4", "F#4"], [7.5, 0.26, "G3", "B3", "D4"],
            [8.5, 0.26, "G3", "B3", "D4"], [9.5, 0.26, "G3", "B3", "D4"],
            [10.5, 0.26, "A3", "C4", "E4"], [11.5, 0.26, "A3", "D4", "F#4"],
            [12.5, 0.26, "G3", "C4", "E4"], [13.5, 0.26, "A3", "D4", "F#4"],
            [14.5, 0.26, "A3", "D4", "F#4"], [15, 0.65, "G3", "B3", "D4"],
        ]),
        demoTrack("bass", "Walking parade bass", "program:32", [
            [0, 0.38, "G2"], [1, 0.38, "D3"], [2, 0.38, "A2"], [3, 0.38, "D3"],
            [4, 0.38, "C3"], [5, 0.38, "G2"], [6, 0.38, "D3"], [7, 0.38, "G2"],
            [8, 0.38, "G2"], [9, 0.38, "D3"], [10, 0.38, "A2"], [11, 0.38, "D3"],
            [12, 0.38, "C3"], [13, 0.38, "D3"], [14, 0.38, "D3"], [15, 0.7, "G2"],
        ]),
        demoTrack("claps", "Clap-along beat", "drum:39",
            Array.from({ length: 15 }, (_, beat): NoteEvent => [beat + 0.5, 0.12, "D#2"])),
        demoTrack("tambourine", "Tambourine skips", "drum:54", [
            [1.25, 0.12, "F#3"], [1.75, 0.12, "F#3"], [3.25, 0.12, "F#3"], [3.75, 0.12, "F#3"],
            [5.25, 0.12, "F#3"], [5.75, 0.12, "F#3"], [7, 0.12, "F#3"],
            [9.25, 0.12, "F#3"], [9.75, 0.12, "F#3"], [11.25, 0.12, "F#3"], [11.75, 0.12, "F#3"],
            [13.25, 0.12, "F#3"], [13.75, 0.12, "F#3"], [14.75, 0.12, "F#3"], [15, 0.25, "F#3"],
        ]),
    ],
};

export const windowSeatOnTheSteamTrain: Demo = {
    name: "Window Seat on the Steam Train",
    loopSeconds: 12,
    tracks: [
        // Alternating woodblocks and short gaps suggest paired wheels crossing rail joints.
        demoTrack("wheels", "Rail joints", "drum-kit", [
            ...Array.from({ length: 12 }, (_, second): NoteEvent[] => [
                [second, 0.08, "F5"], [second + 0.16, 0.06, "E5"],
                [second + 0.5, 0.08, "F5"], [second + 0.66, 0.06, "E5"],
            ]).flat(),
        ]),
        demoTrack("steam", "Steam exhaust", "program:121", [
            ...Array.from({ length: 24 }, (_, pulse): NoteEvent => [
                pulse * 0.5 + 0.06, pulse % 2 === 0 ? 0.27 : 0.17, pulse % 2 === 0 ? "G3" : "D4",
            ]),
        ]),
        demoTrack("whistle", "Distant steam whistle", "program:78", [
            [0.65, 0.72, "D5", "G5"], [1.53, 0.19, "G5"],
            [8.65, 0.38, "D5"], [9.18, 0.85, "D5", "G5"],
        ]),
        demoTrack("harmonica", "Passing scenery", "program:22", [
            [2, 0.55, "B4"], [2.75, 0.22, "A4"], [3, 0.7, "G4"],
            [4, 0.55, "E4"], [4.75, 0.22, "G4"], [5, 0.72, "A4"],
            [6, 0.55, "B4"], [6.75, 0.22, "D5"], [7, 0.7, "B4"],
            [8, 0.45, "A4"], [10.25, 0.45, "A4"], [10.75, 0.32, "F#4"], [11.15, 0.65, "G4"],
        ]),
        demoTrack("guitar", "Carriage sway", "program:24", [
            [0.25, 0.38, "G3"], [1.25, 0.38, "D4"],
            [2.25, 0.38, "B3", "D4"], [3.25, 0.38, "G3", "D4"],
            [4.25, 0.38, "C4", "E4"], [5.25, 0.38, "G3", "C4"],
            [6.25, 0.38, "B3", "D4"], [7.25, 0.38, "G3", "D4"],
            [8.25, 0.38, "A3", "D4"], [9.25, 0.38, "A3", "F#4"],
            [10.25, 0.38, "A3", "D4"], [11.25, 0.52, "G3", "B3", "D4"],
        ]),
    ],
};

// Each bar lasts two seconds at 120 BPM. The bridge drops to half-time before the final chorus.
const christmasRockChords = {
    G: { bass: "G2", fifth: "D3", guitar: ["G3", "D4", "G4"] },
    C: { bass: "C2", fifth: "G2", guitar: ["C3", "G3", "C4"] },
    D: { bass: "D2", fifth: "A2", guitar: ["D3", "A3", "D4"] },
    Em: { bass: "E2", fifth: "B2", guitar: ["E3", "B3", "E4"] },
};

const christmasRockBars = [
    "G", "C", "Em", "D",
    "G", "D", "Em", "C",
    "Em", "C", "G", "D",
    "G", "D", "C", "G",
] as const;

export const christmasRock: Demo = {
    name: "Christmas Lights Turned Up",
    loopSeconds: christmasRockBars.length * 2,
    tracks: [
        demoTrack("rhythm-guitar", "Rock power chords", "program:29",
            christmasRockBars.flatMap((chord, bar): NoteEvent[] => {
                const start = bar * 2;
                const pitches = christmasRockChords[chord].guitar;
                if (bar === 15) return [[start, 1.65, ...pitches]];
                if (bar >= 8 && bar < 12) return [[start, 0.68, ...pitches], [start + 1, 0.62, ...pitches]];
                return [
                    [start, 0.34, ...pitches], [start + 0.5, 0.22, ...pitches],
                    [start + 1, 0.34, ...pitches], [start + 1.5, 0.16, ...pitches],
                    [start + 1.75, 0.15, ...pitches],
                ];
            })),
        demoTrack("bass", "Driving bass", "program:34",
            christmasRockBars.flatMap((chord, bar): NoteEvent[] => {
                const start = bar * 2;
                const { bass, fifth } = christmasRockChords[chord];
                if (bar === 15) return [[start, 1.65, bass]];
                return [
                    [start, 0.4, bass], [start + 0.5, 0.35, fifth],
                    [start + 1, 0.4, bass], [start + 1.5, 0.35, bass],
                ];
            })),
        demoTrack("lead-guitar", "Lead guitar hook", "program:30", [
            [4.25, 0.22, "B4"], [4.5, 0.35, "E5"], [5.25, 0.45, "G5"], [6, 0.65, "F#5"], [7, 0.6, "A4"],
            [8, 0.38, "D5"], [8.5, 0.38, "G5"], [9, 0.78, "B5"],
            [10, 0.38, "A5"], [10.5, 0.38, "F#5"], [11, 0.7, "D5"],
            [12, 0.38, "E5"], [12.5, 0.38, "G5"], [13, 0.78, "B5"],
            [14, 0.38, "G5"], [14.5, 0.38, "E5"], [15, 0.78, "C5"],
            [20, 0.8, "B4"], [21, 0.8, "D5"], [22, 0.8, "F#5"], [23, 0.38, "A5"], [23.5, 0.38, "F#5"],
            [24, 0.38, "D5"], [24.5, 0.38, "G5"], [25, 0.78, "B5"],
            [26, 0.38, "A5"], [26.5, 0.38, "F#5"], [27, 0.7, "D5"],
            [28, 0.38, "E5"], [28.5, 0.38, "G5"], [29, 0.38, "C6"], [29.5, 0.38, "A5"],
            [30, 1.65, "G5"],
        ]),
        demoTrack("bells", "Christmas glockenspiel", "program:9", [
            [0, 0.34, "B5"], [0.5, 0.34, "D6"], [1, 0.18, "G6"], [1.25, 0.18, "G6"], [1.5, 0.38, "D6"],
            [2, 0.34, "E6"], [2.5, 0.34, "G6"], [3, 0.75, "C6"],
            [4, 0.34, "B5"], [4.5, 0.34, "E6"], [5, 0.75, "G6"],
            [6, 0.34, "A6"], [6.5, 0.34, "F#6"], [7, 0.75, "D6"],
            [9.5, 0.32, "G6"], [11.5, 0.32, "F#6"], [13.5, 0.32, "E6"], [15.5, 0.32, "G6"],
            [16, 0.6, "B5"], [17, 0.6, "E6"], [18, 0.6, "C6"], [19, 0.6, "G6"],
            [21.5, 0.32, "D6"], [23.5, 0.32, "A6"],
            [25.5, 0.32, "G6"], [27.5, 0.32, "F#6"], [28.75, 0.18, "G6"],
            [29, 0.34, "E6"], [30, 1.1, "G6"],
        ]),
        demoTrack("drums", "Rock kit", "drum-kit",
            christmasRockBars.flatMap((_, bar): NoteEvent[] => {
                const start = bar * 2;
                if (bar === 15) return [[start, 0.14, "C2", "C#3"]];
                if (bar >= 8 && bar < 12) return [[start, 0.14, "C2", "F#2"], [start + 1, 0.14, "D2"]];
                return [
                    [start, 0.14, "C2", "F#2"], [start + 0.25, 0.09, "F#2"],
                    [start + 0.5, 0.14, "D2", "F#2"], [start + 0.75, 0.09, "F#2"],
                    [start + 1, 0.14, "C2", "F#2"], [start + 1.25, 0.09, "F#2"],
                    [start + 1.5, 0.14, "D2", "F#2"], [start + 1.75, 0.12, "F#2"],
                ];
            })),
        demoTrack("jingles", "Tambourine jingles", "drum:54",
            [4, 5, 6, 7, 12, 13, 14].flatMap((bar): NoteEvent[] => [
                [bar * 2 + 0.5, 0.12, "F#3"], [bar * 2 + 1.25, 0.1, "F#3"], [bar * 2 + 1.5, 0.12, "F#3"],
            ])),
    ],
};
