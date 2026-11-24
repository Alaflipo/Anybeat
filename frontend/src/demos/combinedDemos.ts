import type { Arrangement } from "../arrangement";
import { drumBreak, pop } from "./patternDemos";
import { jazz } from "./phraseDemos";

export const jazzDrumBreak: Arrangement = {
    name: "Jazz Drum Break",
    loopSeconds: jazz.loopSeconds,
    tracks: [...jazz.tracks, ...drumBreak.tracks],
};

export const popDrumBreak: Arrangement = {
    name: "Pop Drum Break",
    loopSeconds: pop.loopSeconds,
    // The break supplies the kick for this arrangement.
    tracks: [...pop.tracks.filter(({ id }) => id !== "kick"), ...drumBreak.tracks],
};
