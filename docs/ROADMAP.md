# Roadmap

Status legend: 🔲 Not started · 🔶 In progress · ✅ Done

V1 is everything through **Epic 6 (Deploy)** — that's what makes the core question in [SPEC.md §2.2](../SPEC.md#22-v1-goal) true: *"Can the user upload a MusicXML score and get a clean MP3/WAV output?"*, deployed somewhere a real person can click a link and try it. Everything after Epic 6 is post-V1 ([SPEC.md §22](../SPEC.md#22-future-features)).

Recommended order: **0 → (1 and 2 in parallel) → 3 → 4 → 5 woven throughout → 6.** Epic 5 (security/hardening) is listed as its own epic for tracking, but individual items should land alongside the epic that introduces the risk (e.g. path safety lands with Epic 1's upload endpoint, not bolted on at the end).

---

## Epic 0 — Project Foundation
✅ Done

Get an empty-but-runnable skeleton in place so every later epic has somewhere to land.

- [x] Scaffold `apps/web` (Vite) and `apps/api` (Fastify) per [SPEC.md §8](../SPEC.md#8-recommended-folder-structure)
- [x] `Dockerfile` — single combined image (web build + api + renderer toolchain: FluidSynth 2.5.1 + FFmpeg 8.0.1 on Alpine)
- [x] `docker-compose.yml` — local dev setup (web + api, `renderer/` mounted into api)
- [x] `GET /api/health` endpoint
- [x] `.env.example` with all vars from [SPEC.md §17.4](../SPEC.md#174-environment-variables)

Verified: `npm run build` (web) succeeds; `node src/server.js` serves `/api/health` and the built frontend with correct API/SPA 404 split; `docker build` succeeds; container serves `/api/health` and confirms `fluidsynth`/`ffmpeg` binaries are present.

**Exit criteria:** `docker build .` succeeds; `docker run` serves `/api/health` returning `{"ok": true}`.

---

## Epic 1 — Upload & Job System
✅ Done

- [x] `POST /api/render` — multipart upload, extension/size/empty/filename validation ([SPEC.md §13.1](../SPEC.md#131-upload-validation))
- [x] Generated `jobId`, never trust the uploaded filename as a path (`utils/safePath.js`)
- [x] `storage/outputs/{jobId}/metadata.json` written with `status: queued`
- [x] `GET /api/render/:jobId` — status polling endpoint
- [x] `GET /api/files/:jobId/:filename` — allow-listed downloads, with HTTP Range support
- [x] Lightweight MusicXML content sanity check (`musicxmlService.js`) — well-formed XML + recognizable root element for `.xml`/`.musicxml`, ZIP-magic-byte check for `.mxl`. Deep validation (parts/measures) is Epic 2's job via Verovio.

**Verified end-to-end (curl):** upload → `jobId` → poll `queued` status → download via `/api/files` with working `Range` (206 Partial Content). Rejection cases all confirmed: invalid extension (400), non-XML content (400), empty file (400), oversized file over `UPLOAD_MAX_MB` (400), unknown `jobId` (404), disallowed filename on `/api/files` (404).

Note: had to bump `fastify` 4→5 (with `@fastify/static` 9.x, `@fastify/multipart` 10.x) during install — `npm audit` flagged fastify <=5.8.2 for a real DoS/spoofing advisory with no patched 4.x release available.

---

## Epic 2 — Render Pipeline
✅ Done

- [x] `renderer/scripts/download-soundfont.sh` — build-time SoundFont fetch from FreePats, checksum-pinned (see [docs/LICENSES.md](LICENSES.md))
- [x] MusicXML → MIDI via Verovio ([docs/RENDER_PIPELINE.md](RENDER_PIPELINE.md#step-1--musicxml--midi-verovio))
- [x] MIDI → WAV via FluidSynth — arg order verified correct (options before positional args)
- [x] WAV → MP3 via FFmpeg
- [x] `render.log` written per job with commands, output, exit codes
- [x] Wired into `renderWorker` — job goes `queued → processing → completed/failed`, fired from `POST /api/render` without blocking the response

**Verified end-to-end in the real Docker image:** uploaded `tests/fixtures/simple-piano.musicxml` → job went `queued → processing → completed` in ~5.7s → downloaded `output.wav`/`output.mp3` → confirmed with `ffmpeg volumedetect` that the audio is real (mean -48.1dB, max -26.3dB — not silence), using the actual Salamander Grand Piano soundfont, not a stub.

**Correction to the plan:** the FreePats `.sf2` (compressed download 296MB) extracts to a **1.27GB** file, not the ~300-400MB originally estimated in [docs/LICENSES.md](LICENSES.md) — it's the full 16-velocity-layer set. This makes the production Docker image ~1.4GB total. Accepted for now (full piano fidelity for the demo); if Render's free tier struggles with image size/pull time, revisit with a reduced-velocity-layer soundfont.

**Exit criteria:** a real MusicXML fixture produces a playable MP3 end-to-end via CLI/script, before the frontend exists.

---

## Epic 3 — QA & Failure Rules
🔲 Not started · depends on Epic 2

- [ ] File existence + non-zero size checks
- [ ] Duration check (> 1s)
- [ ] Silence detection
- [ ] Clipping detection
- [ ] Wire QA results into `metadata.json` (`qa`, `warnings`, `errors`)
- [ ] Enforce: never mark `completed` if a required check fails ([SPEC.md §23](../SPEC.md#23-important-product-rule))

**Exit criteria:** a deliberately broken/empty MusicXML input produces a `failed` job with a clear error, not a fake `completed`.

---

## Epic 4 — Frontend
🔲 Not started · depends on Epic 1 + Epic 2 (needs a working API)

- [ ] Upload UI + all required states ([SPEC.md §11.3](../SPEC.md#113-required-ui-states))
- [ ] Render status polling UI
- [ ] Audio preview player (verify seek/scrub works against Range-enabled downloads)
- [ ] Download buttons (MP3/WAV/MIDI)
- [ ] Render log panel
- [ ] Error message display
- [ ] SoundFont attribution footer ([docs/LICENSES.md](LICENSES.md))

**Exit criteria:** a person with no CLI access can do the whole flow in a browser.

---

## Epic 5 — Security & Hardening
🔲 Not started · cross-cutting, land pieces alongside Epics 1–4; finalize before Epic 6

- [ ] Path traversal prevention on both upload and download paths
- [ ] Render commands use argument arrays, never shell string concatenation
- [ ] `RENDER_TIMEOUT_SECONDS` enforced (kill process tree on timeout)
- [ ] `RENDER_CONCURRENCY` cap enforced
- [ ] Upload size limit enforced (20MB default)

**Exit criteria:** the test cases in [SPEC.md §19](../SPEC.md#19-testing-requirements) covering path traversal, oversized uploads, and malformed filenames all pass.

---

## Epic 6 — Deploy (Render.com + GitHub)
🔲 Not started · depends on Epics 0–5

- [ ] Single combined Docker image builds and runs the full app in one container
- [ ] Push to GitHub, connect repo to a Render Web Service (Docker deploy)
- [ ] Confirm free-tier resource limits (512MB RAM, shared CPU, no persistent disk) are sufficient for a demo render
- [ ] README setup instructions verified by following them from a clean checkout
- [ ] Smoke test: upload → render → preview → download, against the live Render URL

**Exit criteria:** all of [SPEC.md §20 Acceptance Criteria for V1](../SPEC.md#20-acceptance-criteria-for-v1) are met on the deployed demo, not just locally.

---

## Post-V1 (backlog, unscheduled)

From [SPEC.md §22](../SPEC.md#22-future-features) — do not start these before V1 (Epic 6) ships:

- Score preview (visual engraving via Verovio's `renderToSVG`)
- Cleanup job for old files / render history
- Multiple SoundFonts, cello/string rendering, render comparison mode
- Shareable preview links, optional queue system
- AI MusicXML generation
- User accounts, API key access, webhooks
- Cloud storage / persistent deployment beyond the free-tier demo
