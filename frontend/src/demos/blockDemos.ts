import type { SoundTrack } from "../SoundTimeline";
import type { Song } from "../song";

const originalTracks: SoundTrack[] = [
    {
        id: "melody",
        name: "Melody",
        instrument: "program:0",
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
        instrument: "program:24",
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
        instrument: "program:33",
        blocks: [
            { id: "c2", start: 0, duration: 1.2, note: "C2" },
            { id: "g2", start: 1.5, duration: 0.45, note: "G2" },
            { id: "a2", start: 2, duration: 0.75, note: "A2" },
            { id: "g2-return", start: 3, duration: 0.8, note: "G2" },
            { id: "c2-outro", start: 4.25, duration: 1.75, note: "C2" },
        ],
    },
];

export const original: Song = {
    name: "Original",
    loopSeconds: 6.5,
    tracks: originalTracks,
};
