import type { Song } from "../song";
import { drumBreak, pop } from "./patternDemos";
import { jazz } from "./phraseDemos";

export const jazzDrumBreak: Song = {
    name: "Jazz Drum Break",
    loopSeconds: jazz.loopSeconds,
    tracks: [...jazz.tracks, ...drumBreak.tracks],
};

export const popDrumBreak: Song = {
    name: "Pop Drum Break",
    loopSeconds: pop.loopSeconds,
    // The break supplies the kick for this song.
    tracks: [...pop.tracks.filter(({ id }) => id !== "kick"), ...drumBreak.tracks],
};
