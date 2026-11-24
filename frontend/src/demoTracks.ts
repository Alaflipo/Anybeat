// Demos can list SoundBlocks directly or describe them with NoteEvents.
// A SoundBlock is one editable note with an ID, pitch, start time, and duration.
// A NoteEvent groups one or more pitches that start together and share a duration.
// For example, [0.5, 0.25, "C4", "E4", "G4"] becomes three blocks, one per pitch.
// Every track in this catalog ultimately provides a list of SoundBlocks.

import type { Demo } from "./demos/demoData";
import { original } from "./demos/blockDemos";
import { angry, happy, sad, nature, funk, classical, rock, jazz, theLastStand, snowAtTheEmptyStation } from "./demos/phraseDemos";
import { drumBreak, pop, creativity, sunshineParade, windowSeatOnTheSteamTrain, christmasRock } from "./demos/patternDemos";
import { jazzDrumBreak, popDrumBreak } from "./demos/combinedDemos";

export const demos: readonly Demo[] = [
    original,
    angry,
    happy,
    sad,
    nature,
    funk,
    pop,
    classical,
    rock,
    jazz,
    drumBreak,
    jazzDrumBreak,
    popDrumBreak,
    creativity,
    theLastStand,
    sunshineParade,
    windowSeatOnTheSteamTrain,
    snowAtTheEmptyStation,
    christmasRock,
];
