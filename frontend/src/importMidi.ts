import type { Arrangement } from "./arrangement";
import { parseMidi } from "midi-file";
import { instruments, midiNoteName } from "./generalMidi";
import type { Instrument } from "./generalMidi";
import type { SoundTrack } from "./SoundTimeline";

export function importMidi(buffer: ArrayBuffer, filename: string): Arrangement {
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 14 || String.fromCharCode(...bytes.subarray(0, 4)) !== "MThd") {
        throw new Error("Select a valid Standard MIDI file.");
    }

    const { header, tracks } = parseMidi(bytes);
    if (header.format !== 0 && header.format !== 1) {
        throw new Error("This player supports Standard MIDI File formats 0 and 1.");
    }

    const ticksPerBeat = header.ticksPerBeat ?? 0;
    const fps = header.framesPerSecond === 29 ? 30_000 / 1_001 : header.framesPerSecond ?? 0;
    const ticksPerSecond = fps * (header.ticksPerFrame ?? 0);
    if (!ticksPerBeat && !ticksPerSecond) throw new Error("The MIDI file has an invalid time division.");

    const trackNames = tracks.map((track) =>
        track.find((event) => event.type === "trackName")?.text.trim());
    const events = tracks.flatMap((track, trackIndex) => {
        let tick = 0;
        return track.map((event) => ({
            tick: tick += event.deltaTime,
            event,
            trackIndex,
        }));
    }).sort((a, b) => a.tick - b.tick);

    const programs = Array<number>(16).fill(0);
    const output = new Map<string, SoundTrack & { blocks: SoundTrack["blocks"][number][] }>();
    type PendingNote = { start: number; velocity: number; track: NonNullable<ReturnType<typeof output.get>> };
    const active = new Map<number, PendingNote[]>();
    let seconds = 0;
    let previousTick = 0;
    let secondsPerBeat = 0.5;
    let blockId = 0;

    // Merge the file's tracks in time order so tempo and program changes affect subsequent notes.
    for (const { tick, event, trackIndex } of events) {
        seconds += (tick - previousTick) * (ticksPerBeat ? secondsPerBeat / ticksPerBeat : 1 / ticksPerSecond);
        previousTick = tick;

        if (event.type === "setTempo") {
            secondsPerBeat = event.microsecondsPerBeat / 1_000_000;
        } else if (event.type === "programChange") {
            programs[event.channel] = event.programNumber;
        } else if (event.type === "noteOn" || event.type === "noteOff") {
            const key = event.channel * 128 + event.noteNumber;
            if (event.type === "noteOn" && event.velocity > 0) {
                const instrument: Instrument = event.channel === 9 ? "drum-kit" : `program:${programs[event.channel]}`;
                const id = `${trackIndex}-${event.channel}-${instrument}`;
                let track = output.get(id);
                if (!track) {
                    const sound = instruments.get(instrument) ?? "MIDI";
                    const name = trackNames[trackIndex] ? `${trackNames[trackIndex]} · ${sound}` : sound;
                    track = { id, name, instrument, blocks: [] };
                    output.set(id, track);
                }
                const pending = active.get(key) ?? [];
                pending.push({ start: seconds, velocity: event.velocity, track });
                active.set(key, pending);
            } else {
                const pending = active.get(key);
                const note = pending?.shift();
                if (pending?.length === 0) active.delete(key);
                if (note && seconds > note.start) {
                    note.track.blocks.push({
                        id: `midi-note-${blockId++}`,
                        note: midiNoteName(event.noteNumber),
                        start: note.start,
                        duration: seconds - note.start,
                        velocity: note.velocity,
                    });
                }
            }
        }
    }

    const arrangedTracks = [...output.values()].filter(({ blocks }) => blocks.length > 0);
    if (!arrangedTracks.length || !Number.isFinite(seconds) || seconds <= 0) {
        throw new Error("The MIDI file contains no playable notes.");
    }

    return { name: filename.replace(/\.midi?$/i, ""), tracks: arrangedTracks, loopSeconds: seconds };
}
