import type { Song } from "./song";

export type SongSummary = {
    id: string;
    name: string;
    updatedAt: string;
};

async function request(path: string, options?: RequestInit) {
    const response = await fetch(`/api/songs${path}`, {
        ...options,
        signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Request failed (HTTP ${response.status}).`);
    return response;
}

export async function saveSong(song: Song) {
    await request("", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(song),
    });
}

export async function listSongs(): Promise<SongSummary[]> {
    return (await request("")).json();
}

export async function loadSong(id: string): Promise<Song> {
    return (await request(`/${encodeURIComponent(id)}`)).json();
}
