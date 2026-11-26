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
    if (!response.ok) {
        let message = `Request failed (HTTP ${response.status}).`;
        try {
            const body: unknown = await response.json();
            if (typeof body === "object" && body !== null && "detail" in body && typeof body.detail === "string") {
                message = body.detail;
            }
        } catch {
            // Keep the status-based message when the server doesn't return JSON.
        }
        throw new Error(message);
    }
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

export type GenerationProvider = "openai" | "ollama";

export async function generateSong(prompt: string, provider: GenerationProvider): Promise<SavedSong> {
    const path = provider === "ollama" ? "/generate/ollama" : "/generate";
    const timeoutMs = provider === "ollama" ? 120_000 : 60_000;
    const response = await request(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
    }, timeoutMs);
    return response.json();
}
