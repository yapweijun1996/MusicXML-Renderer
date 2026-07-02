# Architecture

## Components

```
apps/web        Vite frontend — upload UI, status polling, audio preview, downloads
apps/api        Fastify server — upload/job/file endpoints, render orchestration
renderer        Conversion toolchain — Verovio, FluidSynth, FFmpeg, SoundFont
storage          Per-job working files: uploads/, outputs/, logs/
```

`apps/api` is the only component that talks to the renderer toolchain and the filesystem. `apps/web` only talks to `apps/api` over HTTP.

## Request flow

```
Browser
  │  POST /api/render (multipart file)
  ▼
apps/api  ── validate upload (extension, size, non-empty, safe filename)
  │
  ├─ create jobId, write storage/uploads/{jobId}/input.musicxml
  ├─ write storage/outputs/{jobId}/metadata.json (status: queued)
  └─ enqueue render task
        │
        ▼
  renderWorker (child process pipeline, bounded by RENDER_CONCURRENCY)
    1. Verovio:     input.musicxml → output.mid
    2. FluidSynth:  output.mid + SalamanderGrandPiano.sf2 → output.wav
    3. FFmpeg:      output.wav → output.mp3
    4. QA checks:   file existence, non-zero size, duration, silence, clipping
        │
        ▼
  metadata.json updated (status: completed | failed, qa: {...}, warnings/errors)

Browser
  │  GET /api/render/:jobId   (poll until status is completed/failed)
  │  GET /api/files/:jobId/:filename  (stream with Range support for audio preview)
  ▼
```

## Job lifecycle (state machine)

```
queued ──► processing ──► completed
                │
                └──► failed

completed/failed ──(after retention window)──► expired
```

A job never silently reports `completed` if any QA check fails — see [SPEC.md §14.3](../SPEC.md#143-failure-rules). `failed` always carries a human-readable error and a link to `render.log`.

## Deployment topologies

**Local development** — `docker-compose.yml` runs three services (`web` with Vite hot reload, `api` with watch mode, shared `renderer` toolchain mounted into `api`). This is a dev convenience only.

**Production (Render.com)** — a single Docker image bundles the built `apps/web` static assets, the `apps/api` Fastify server (which also serves those static assets), and the renderer toolchain. This maps to exactly one Render Web Service on the free tier, which does not orchestrate multi-container `docker-compose` stacks. See [SPEC.md §17](../SPEC.md#17-docker-requirements).

## Storage

V1 uses local filesystem storage (`storage/uploads`, `storage/outputs`, `storage/logs`) and is intentionally stateless/ephemeral — a render is a self-contained request/response cycle, so losing files on redeploy or container restart is acceptable for a demo. Persistent/cloud storage is explicitly a non-goal for V1 (see [SPEC.md §3](../SPEC.md#3-non-goals-for-v1)).

## Security boundaries

- Uploaded filenames are never used as filesystem paths — only generated `jobId`s are (see `apps/api/src/utils/safePath.js`).
- Downloads are restricted to an allow-list of filenames within a job's output folder (see [SPEC.md §10.4](../SPEC.md#104-download--stream-file)).
- Render child processes run with argument arrays (never shell string concatenation) to avoid injection.
- Render concurrency and per-job timeout are capped to protect the shared-CPU free-tier host.
