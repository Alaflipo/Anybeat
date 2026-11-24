import type { WorkletSynthesizer } from "spessasynth_lib";
import processorUrl from "spessasynth_lib/dist/spessasynth_processor.min.js?url";
import { midiNoteNumber } from "./generalMidi";
import type { Instrument } from "./generalMidi";

type AudioTrack = {
    instrument: Instrument;
    notes: readonly { start: number; duration: number; note: string; velocity?: number }[];
};

type NoteEvent = {
    seconds: number;
    noteStart: number;
    channel: number;
    key: number;
    velocity: number;
};

let context: AudioContext | undefined;
let processor: Promise<void> | undefined;
let soundBank: Promise<ArrayBuffer> | undefined;

function loadSoundBank() {
    // Keep the original bytes for later sessions. The worklet takes ownership of each copy.
    soundBank ??= fetch(`${import.meta.env.BASE_URL}soundfonts/GeneralUser-GS.sf2`)
        .then((response) => {
            if (!response.ok) throw new Error("Could not load the General MIDI sound bank.");
            return response.arrayBuffer();
        })
        .catch((error: unknown) => {
            soundBank = undefined;
            throw error;
        });
    return soundBank;
}

export function createTimelineAudio(tracks: readonly AudioTrack[], loopSeconds: number, offsetSeconds = 0) {
    let synth: WorkletSynthesizer | undefined;
    let mixBus: DynamicsCompressorNode | undefined;
    let timer: number | undefined;
    let scheduleNotes: (() => void) | undefined;
    let startedAt = 0;
    let stopped = false;

    function stopScheduling() {
        window.clearInterval(timer);
        timer = undefined;
    }

    function startScheduling() {
        if (stopped || !scheduleNotes) return;
        scheduleNotes();
        timer = window.setInterval(scheduleNotes, 30);
    }

    return {
        async start() {
            // Resume immediately from the Play gesture while the engine and samples load.
            const audio = context ??= new AudioContext();
            const worklet = audio.audioWorklet;
            if (!worklet) throw new Error("SoundFont playback needs localhost or HTTPS.");

            processor ??= worklet.addModule(processorUrl).catch((error: unknown) => {
                processor = undefined;
                throw error;
            });
            const [{ WorkletSynthesizer }, bank] = await Promise.all([
                import("spessasynth_lib"), loadSoundBank(), processor, audio.resume(),
            ]);
            if (stopped) return;

            const player = new WorkletSynthesizer(audio);
            synth = player;
            await player.isReady;
            if (stopped) return;
            await player.soundBankManager.addSoundBank(bank.slice(0), "general-midi");
            if (stopped) return;

            const audibleTracks = tracks.filter(({ notes }) => notes.length > 0);
            const events: NoteEvent[] = [];
            let nextMelodicChannel = 0;
            for (const { instrument, notes } of audibleTracks) {
                const isDrum = !instrument.startsWith("program:");
                // Reserve GM channel 10 (zero-based channel 9) for the shared drum kit.
                if (nextMelodicChannel === 9) nextMelodicChannel++;
                const channel = isDrum ? 9 : nextMelodicChannel++;
                if (!isDrum) {
                    // The worklet processes channel creation and program changes in message order.
                    if (channel >= player.midiChannels.length) player.addNewChannel();
                    player.programChange(channel, Number(instrument.slice("program:".length)));
                }

                for (const note of notes) {
                    const key = instrument.startsWith("drum:")
                        ? Number(instrument.slice("drum:".length)) : midiNoteNumber(note.note);
                    events.push({ seconds: note.start, noteStart: note.start, channel, key, velocity: note.velocity ?? 88 });
                    events.push({ seconds: note.start + note.duration, noteStart: note.start, channel, key, velocity: 0 });
                }
            }

            // Release a note before attacking a new one at the same time.
            events.sort((a, b) => a.seconds - b.seconds || a.velocity - b.velocity);
            if (events.length === 0) return;

            const bus = mixBus = audio.createDynamicsCompressor();
            bus.threshold.value = -8;
            bus.ratio.value = 8;
            bus.connect(audio.destination);
            player.connect(bus);
            // Leave headroom as more parts are mixed together.
            player.setSystemParameter("gain", Math.min(0.8, 1.5 / Math.sqrt(audibleTracks.length)));

            let index = 0;
            let cycle = 0;
            startedAt = audio.currentTime + 0.15 - offsetSeconds;

            function schedule() {
                const horizon = audio.currentTime + 0.2;
                // Send a short lookahead window to the audio thread, including across the loop boundary.
                while (true) {
                    const event = events[index];
                    const time = startedAt + cycle * loopSeconds + event.seconds;
                    if (time > horizon) break;

                    // Skip both events for notes already in progress at an edited resume.
                    if (cycle !== 0 || event.noteStart >= offsetSeconds) {
                        if (event.velocity === 0) {
                            player.noteOff(event.channel, event.key, { time });
                        } else {
                            player.noteOn(event.channel, event.key, event.velocity, { time });
                        }
                    }
                    if (++index === events.length) {
                        index = 0;
                        cycle++;
                    }
                }
            }
            scheduleNotes = schedule;
            startScheduling();
        },

        elapsedSeconds() {
            return Math.max(offsetSeconds, (context?.currentTime ?? 0) - startedAt);
        },

        async pause() {
            await context?.suspend();
            stopScheduling();
        },

        async resume() {
            await context?.resume();
            startScheduling();
        },

        stop() {
            stopped = true;
            stopScheduling();
            scheduleNotes = undefined;
            synth?.destroy();
            synth = undefined;
            mixBus?.disconnect();
            mixBus = undefined;
        },
    };
}
