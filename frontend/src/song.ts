import type { SoundTrack } from "./SoundTimeline";

export type Song = {
    name: string;
    loopSeconds: number;
    tracks: readonly SoundTrack[];
};
