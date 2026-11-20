import * as Tone from "tone";

type ScheduledNote = {
    start: number;
    duration: number;
    note: string;
};

// Use the same instrument IDs for the selector and the corresponding synth presets.
export const instruments = {
    piano: "Piano",
    guitar: "Guitar",
    bass: "Bass",
    synthKeys: "Synth keys",
    electricPiano: "Electric piano",
    organ: "Organ",
    strings: "Strings",
    flute: "Flute",
    brass: "Brass",
    synthLead: "Synth lead",
    electricGuitar: "Electric guitar",
    kick: "Kick drum",
    snare: "Snare drum",
    hiHat: "Hi-hat",
    tom: "Tom",
} as const;

export type Instrument = keyof typeof instruments;

// These synth presets approximate instrument timbres. The oscillator sets the waveform,
// while the envelope shapes how quickly the note starts, decays, sustains, and fades out.
const presets = {
    piano: { oscillator: { type: "triangle8" }, envelope: { attack: 0.005, decay: 0.35, sustain: 0.22, release: 0.12 } },
    guitar: { oscillator: { type: "sawtooth5" }, envelope: { attack: 0.003, decay: 0.18, sustain: 0.08, release: 0.075 } },
    bass: { oscillator: { type: "triangle" }, envelope: { attack: 0.018, decay: 0.2, sustain: 0.7, release: 0.06 } },
    synthKeys: { oscillator: { type: "square4" }, envelope: { attack: 0.045, decay: 0.25, sustain: 0.5, release: 0.16 } },
    electricPiano: { oscillator: { type: "fmtriangle", modulationType: "sine", modulationIndex: 0.8, harmonicity: 3 }, envelope: { attack: 0.008, decay: 0.35, sustain: 0.18, release: 0.19 } },
    organ: { oscillator: { type: "custom", partials: [1, 0.5, 0.3, 0.15] }, envelope: { attack: 0.015, decay: 0.1, sustain: 0.85, release: 0.075 } },
    strings: { oscillator: { type: "fatsawtooth4", count: 3, spread: 25 }, envelope: { attack: 0.23, decay: 0.4, sustain: 0.5, release: 0.3 } },
    flute: { oscillator: { type: "custom", partials: [1, 0.14, 0.07] }, envelope: { attack: 0.055, decay: 0.15, sustain: 0.78, release: 0.11 } },
    brass: { oscillator: { type: "sawtooth6" }, envelope: { attack: 0.035, decay: 0.15, sustain: 0.54, release: 0.09 } },
    synthLead: { oscillator: { type: "pulse", width: 0.35 }, envelope: { attack: 0.012, decay: 0.17, sustain: 0.59, release: 0.14 } },
    electricGuitar: { oscillator: { type: "fatsawtooth9", count: 3, spread: 18 }, envelope: { attack: 0.007, decay: 0.24, sustain: 0.36, release: 0.08 } },
} satisfies Record<Exclude<Instrument, "kick" | "snare" | "hiHat" | "tom">, NonNullable<ConstructorParameters<typeof Tone.Synth>[0]>>;

function createVoice(instrument: Instrument) {
    switch (instrument) {
        case "kick":
        case "tom":
            return new Tone.MembraneSynth({
                pitchDecay: instrument === "kick" ? 0.04 : 0.025,
                octaves: instrument === "kick" ? 5 : 2,
                envelope: { attack: 0.001, decay: 0.23, sustain: 0.02, release: 0.15 },
            });
        case "snare":
            return new Tone.NoiseSynth({
                noise: { type: "pink" },
                envelope: { attack: 0.001, decay: 0.13, sustain: 0, release: 0.035 },
            });
        case "hiHat":
            return new Tone.NoiseSynth({
                volume: -9,
                noise: { type: "white" },
                envelope: { attack: 0.001, decay: 0.095, sustain: 0.08, release: 0.018 },
            });
        default:
            return new Tone.Synth(presets[instrument]);
    }
}

type AudioTrack = {
    instrument: Instrument;
    notes: readonly ScheduledNote[];
    laneCount: number;
};

// Own the audio resources for a single Play request and schedule every track on one clock.
export function createTimelineAudio(tracks: readonly AudioTrack[], loopSeconds: number) {
    let clock: Tone.Clock | undefined;
    let limiter: Tone.Limiter | undefined;
    const trackGains: Tone.Gain[] = [];
    let startedAt = 0;
    let stopped = false;
    // A voice pairs one block with its pitch and synth. The same voice is reused each loop.
    const voices: { note: ScheduledNote; frequency: number; synth: ReturnType<typeof createVoice> }[] = [];

    return {
        async start() {
            // The Play click unlocks browser audio. Cleanup can run while it is unlocking.
            await Tone.start();
            if (stopped) return;

            // Empty tracks have no voices and do not count toward mix attenuation.
            const audibleTracks = tracks.filter(({ notes }) => notes.length > 0);
            // Sum the track gains into one limiter before sending the mix to the audio output.
            limiter = new Tone.Limiter(-1).toDestination();

            for (const { instrument, notes, laneCount } of audibleTracks) {
                // Leave headroom for chords on each track and for the summed mix.
                const gain = new Tone.Gain(0.5 / (laneCount * Math.sqrt(audibleTracks.length))).connect(limiter);
                trackGains.push(gain);

                for (const note of notes) {
                    // Resolve the pitch before starting the clock so invalid notes fail during startup.
                    const frequency = Tone.Frequency(note.note).toFrequency();
                    if (!Number.isFinite(frequency) || frequency <= 0) {
                        throw new Error(`Invalid note: ${note.note}`);
                    }

                    const synth = createVoice(instrument).connect(gain);
                    voices.push({ note, frequency, synth });
                }
            }

            // Tone supplies the audio timestamp for each loop boundary.
            clock = new Tone.Clock((time) => {
                for (const { note, frequency, synth } of voices) {
                    // Use the exact audio timestamp plus the block offset. Tone schedules the release
                    // from that same start time using the block's duration.
                    const noteStart = time + note.start;
                    if (synth instanceof Tone.NoiseSynth) {
                        synth.triggerAttackRelease(note.duration, noteStart);
                    } else {
                        synth.triggerAttackRelease(frequency, note.duration, noteStart);
                    }
                }
            // Use one tick per loop. For example, a four-second loop ticks at 0.25 Hz.
            }, 1 / loopSeconds);

            // Share one start timestamp between the scheduler and the playhead's elapsed time.
            startedAt = Tone.now();
            clock.start(startedAt);
        },

        elapsedSeconds() {
            // Use the current audio time without scheduling lookahead for the playhead.
            return Math.max(0, Tone.immediate() - startedAt);
        },

        // Prevent pending startup from creating resources and release the audio graph.
        // Disposing the synths also silences notes that were already scheduled.
        stop() {
            stopped = true;
            clock?.dispose();
            clock = undefined;
            for (const { synth } of voices) synth.dispose();
            voices.length = 0;
            for (const gain of trackGains) gain.dispose();
            trackGains.length = 0;
            limiter?.dispose();
            limiter = undefined;
        },
    };
}
