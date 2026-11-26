import type { Song } from "./song";

export type SongSummary = {
    id: string;
    name: string;
};

export type SavedSong = Song & { id: string };

async function request(path: string, options?: RequestInit, timeoutMs = 15_000) {
    const response = await fetch(`/api/songs${path}`, {
        ...options,
        signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`Request failed (HTTP ${response.status}).`);
    return response;
}

export async function saveSong({ name, loopSeconds, tracks }: Song, id?: string): Promise<SongSummary> {
    const response = await request(id === undefined ? "" : `/${encodeURIComponent(id)}`, {
        method: id === undefined ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, loopSeconds, tracks }),
    });
    return response.json();
}

export async function listSongs(): Promise<SongSummary[]> {
    return (await request("")).json();
}

export async function loadSong(id: string): Promise<Song> {
    return (await request(`/${encodeURIComponent(id)}`)).json();
}

export async function generateSong(prompt: string): Promise<SavedSong> {
    const response = await request("/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
    }, 60_000);
    return response.json();
}
