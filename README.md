# Anybeat

Anybeat is a browser-based music timeline built for DBM180, a course project exploring AI music generation. Open a saved song from the Song dropdown, create a new song, or import a MIDI file. Edit note blocks, choose instruments, and play individual tracks or the full mix. Click the ruler or drag the playhead while stopped or paused to choose where playback starts.

## Run locally

With Docker Compose installed, run this from the project root.

```sh
docker compose up --build
```

Open [Anybeat](http://localhost:5173). The FastAPI backend runs on port 8000.

To add the 19 demo songs to the database, run this from the project root and reload the editor.

```sh
docker compose exec backend python -m import_demo_songs
```

The import can be rerun safely. It skips demo IDs already in the database, preserving any edits. For a backend running outside Docker, run `python -m import_demo_songs` from `backend` using the same Python environment and `ANYBEAT_DB_PATH` as the backend.

To run just the frontend, use Node.js 24.

```sh
cd frontend
npm ci
npm run dev
```

The frontend uses React, TypeScript, Vite, and SpessaSynth for MIDI playback. Run `npm run build` and `npm run lint` from `frontend` to check changes.

## Generate a song with Ollama

Install and start [Ollama](https://ollama.com/), then download the model:

```sh
ollama pull qwen3.5:2b
```

Choose Ollama in the Provider dropdown beside the generation prompt, or call the backend's `POST /api/songs/generate/ollama` endpoint directly with the same `{"prompt": "..."}` body as the OpenAI endpoint. The endpoint uses the `OLLAMA_MODEL` setting, which defaults to `qwen3.5:2b`, validates the result as a Song, saves it, and returns the saved song with its original prompt. Ollama must be reachable from the backend container. On macOS, the Ollama app binds to localhost by default; to let Docker reach it, run `launchctl setenv OLLAMA_HOST "0.0.0.0:11434"` and restart the Ollama app. This exposes Ollama on your local network, so use it only on a trusted network. The Docker backend uses `http://host.docker.internal:11434` by default. Set `OLLAMA_BASE_URL` or `OLLAMA_MODEL` in `.env` to use a different address or model, and recreate the backend container after changing them. Ollama errors appear in the app, with no automatic fallback to OpenAI.

```sh
curl -X POST http://localhost:8000/api/songs/generate/ollama \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Create a cheerful piano and drum loop"}'
```

The Provider dropdown defaults to Ollama. OpenAI remains available in the dropdown.

## Populate the database with some demo songs: 

`docker compose exec backend python -m import_demo_songs`

## delete the current databse: 
 `docker compose exec backend python -c "import sqlite3; db = sqlite3.connect('/data/songs.sqlite3'); db.execute('DELETE FROM songs'); db.commit(); db.close()"`
