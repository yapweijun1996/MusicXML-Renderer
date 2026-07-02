# MusicXML Renderer

Render MusicXML scores into WAV and MP3 using the Salamander Grand Piano sound.

> Full product spec: [SPEC.md](SPEC.md) · Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · Roadmap: [docs/ROADMAP.md](docs/ROADMAP.md) · Pipeline details: [docs/RENDER_PIPELINE.md](docs/RENDER_PIPELINE.md) · Licenses: [docs/LICENSES.md](docs/LICENSES.md)

## What it does

Upload a `.musicxml` / `.xml` / `.mxl` score, and the app converts it to MIDI, renders it to WAV with a real sampled piano (not a generic synth patch), converts that to MP3, and lets you preview and download all three.

```
MusicXML → MIDI (Verovio) → WAV (FluidSynth + Salamander Grand Piano) → MP3 (FFmpeg)
```

## Status

🚧 Pre-implementation — spec and docs are done, code has not been written yet. See [docs/ROADMAP.md](docs/ROADMAP.md) for what's built and what's next.

## Quick start (once implemented)

```bash
# Production-style single-image run
docker build -t musicxml-renderer .
docker run -p 3000:3000 musicxml-renderer
# open http://localhost:3000
```

```bash
# Local development (hot reload, 3 services)
docker compose up
```

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Vite + Vanilla JS | Simple, fast, no framework overhead for V1 |
| Backend | Node.js + Fastify | Lightweight API + job/process management |
| MusicXML → MIDI | Verovio (npm/WASM) | No GUI/Xvfb dependency, keeps the container pure Node.js |
| MIDI → WAV | FluidSynth | Standard, scriptable softsynth |
| Piano sound | Salamander Grand Piano | CC-BY 3.0, free for commercial use, real sampled piano (not GM synth) |
| WAV → MP3 | FFmpeg (libmp3lame) | Standard, LGPL-compatible build |
| Deploy target | Single Docker image → Render.com Web Service | Fits Render's free-tier one-container-per-service model |

## Why Verovio instead of MuseScore CLI

MuseScore is a Qt GUI application — running it "headless" in Docker still usually needs a virtual display (Xvfb), which is a common source of flaky container builds. Verovio ships an official Node/WASM build with no GUI dependency, so the whole backend stays pure Node.js and the image stays smaller and more reliable to deploy.

## License & attribution

- App code: see repo license (TBD — recommend MIT for V1).
- **Salamander Grand Piano V3** by Alexander Holm — CC-BY 3.0, free for commercial/business use, **attribution required**. See [docs/LICENSES.md](docs/LICENSES.md) for the exact credit line and source.
- Other tools (Verovio, FluidSynth, FFmpeg) are used as external processes/libraries under their own licenses — see [docs/LICENSES.md](docs/LICENSES.md).

## Non-goals for V1

No AI composition, no score editor, no accounts, no payments, no cloud storage, no real-time collab, no mobile app. V1 answers exactly one question: *can a user upload a MusicXML score and get a clean MP3/WAV back?* See [SPEC.md §3](SPEC.md#3-non-goals-for-v1).
