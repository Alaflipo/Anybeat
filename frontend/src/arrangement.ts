import type { SoundTrack } from "./SoundTimeline";

export type Arrangement = {
    name: string;
    loopSeconds: number;
    tracks: readonly SoundTrack[];
};
