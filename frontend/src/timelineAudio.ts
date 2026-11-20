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
} as const;

export type Instrument = keyof typeof instruments;

// These synth presets approximate instrument timbres. The oscillator sets the waveform,
// while the envelope shapes how quickly the note starts, decays, sustains, and fades out.
const presets = {
    piano: { oscillator: { type: "triangle8" }, envelope: { attack: 0.005, decay: 0.35, sustain: 0.22, release: 0.12 } },
    guitar: { oscillator: { type: "sawtooth5" }, envelope: { attack: 0.003, decay: 0.18, sustain: 0.08, release: 0.075 } },
    bass: { oscillator: { type: "triangle" }, envelope: { attack: 0.018, decay: 0.2, sustain: 0.7, release: 0.06 } },
    synthKeys: { oscillator: { type: "square4" }, envelope: { attack: 0.045, decay: 0.25, sustain: 0.5, release: 0.16 } },
} as const;

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
    const voices: { note: ScheduledNote; frequency: number; synth: Tone.Synth }[] = [];

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

                    const synth = new Tone.Synth(presets[instrument]).connect(gain);
                    voices.push({ note, frequency, synth });
                }
            }

            // Tone supplies the audio timestamp for each loop boundary.
            clock = new Tone.Clock((time) => {
                for (const { note, frequency, synth } of voices) {
                    // Use the exact audio timestamp plus the block offset. Tone schedules the release
                    // from that same start time using the block's duration.
                    synth.triggerAttackRelease(frequency, note.duration, time + note.start);
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
