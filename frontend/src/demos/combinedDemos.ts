import type { Demo } from "./demoData";
import { drumBreak, pop } from "./patternDemos";
import { jazz } from "./phraseDemos";

export const jazzDrumBreak: Demo = {
    name: "Jazz Drum Break",
    loopSeconds: jazz.loopSeconds,
    tracks: [...jazz.tracks, ...drumBreak.tracks],
};

export const popDrumBreak: Demo = {
    name: "Pop Drum Break",
    loopSeconds: pop.loopSeconds,
    // The break supplies the kick for this arrangement.
    tracks: [...pop.tracks.filter(({ id }) => id !== "kick"), ...drumBreak.tracks],
};
