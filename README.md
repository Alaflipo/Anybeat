# Anybeat

Anybeat is a browser-based music timeline built for DBM180, a course project exploring AI music generation. Start with a demo arrangement or import a MIDI file. Edit note blocks, choose instruments, and play individual tracks or the full mix. Click the ruler or drag the playhead while stopped or paused to choose where playback starts.

## Run locally

With Docker Compose installed, run this from the project root.

```sh
docker compose up --build
```

Open [Anybeat](http://localhost:5173). The FastAPI backend runs on port 8000.

To run just the frontend, use Node.js 24.

```sh
cd frontend
npm ci
npm run dev
```

The frontend uses React, TypeScript, Vite, and SpessaSynth for MIDI playback. Run `npm run build` and `npm run lint` from `frontend` to check changes.
