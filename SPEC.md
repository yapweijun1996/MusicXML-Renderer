# musicxml-renderer SPEC.md

> **Revision note (v2):** fixes 4 issues found in review of the v1 draft:
> 1. FluidSynth command had options *after* positional args (fails on FluidSynth 2.x) — fixed order.
> 2. MuseScore CLI replaced with **Verovio** (npm/WASM) for MusicXML→MIDI — avoids Qt/Xvfb in Docker, keeps the whole backend pure Node.js.
> 3. Salamander SoundFont is no longer committed to git — downloaded at Docker build time (it's 300MB+, over GitHub's 100MB hard limit without LFS).
> 4. Deployment story clarified: single combined container (web + api + renderer) so it maps cleanly onto a single Render Web Service on the free tier. `docker-compose` with 3 services is kept for local dev only.

## 1. Project Overview
Project name: `musicxml-renderer`
Display name: MusicXML Renderer
Tagline: Render MusicXML scores into WAV and MP3 using Salamander Grand Piano.

`musicxml-renderer` is a web-based tool for converting MusicXML scores into playable audio files. Users upload a MusicXML file, the backend renders it using a stable Docker-based audio pipeline, and the frontend provides preview and download options.

中文解释： 这个项目是一个"乐谱转音频工具"。用户上传 MusicXML，系统生成 WAV / MP3，让用户可以直接试听和下载。

## 2. Project Goals

### 2.1 Main Goal
Build a reliable MusicXML-to-audio renderer. The system should support:

* Upload MusicXML file
* Convert MusicXML to MIDI
* Render MIDI to WAV using Salamander Grand Piano
* Convert WAV to MP3
* Preview generated audio in browser
* Download WAV, MP3, and MIDI files
* Show render status and render logs

### 2.2 V1 Goal
V1 should focus on stable rendering only. V1 must answer this core question:
**Can the user upload a MusicXML score and get a clean MP3/WAV output?**

## 3. Non-Goals for V1
The following features are not included in V1:

* AI music composition
* AI melody generation
* Online score editor
* Multi-user account system
* Payment system
* Cloud storage integration
* Real-time collaborative editing
* Advanced mixing/mastering
* Full DAW-style controls
* Mobile app

中文解释： V1 不要做太大。先做好转换和渲染，不要一开始加太多 AI 功能。

## 4. Target Users

### 4.1 Primary Users
* Developers testing MusicXML rendering
* Composers who want quick audio preview
* Music students who want to hear a score
* AI music experimenters generating MusicXML
* Users who want piano-style rendering from notation files

### 4.2 User Problems
Users may have MusicXML files but no easy way to:
* Convert them to audio
* Hear the score quickly
* Export MP3
* Render with better piano sound
* Debug bad MusicXML output

## 5. Core User Flow

```text
User opens web app
  ↓
Uploads .musicxml / .xml / .mxl file
  ↓
System validates file
  ↓
System creates render job
  ↓
Backend converts MusicXML to MIDI (Verovio)
  ↓
Renderer converts MIDI to WAV using Salamander Grand Piano (FluidSynth)
  ↓
System converts WAV to MP3 (FFmpeg)
  ↓
User previews audio
  ↓
User downloads MP3 / WAV / MIDI
```

## 6. Tech Stack

### 6.1 Frontend
Recommended V1 choice:
```text
Vite + Vanilla JavaScript
```
Reason: simple, fast to build, easy to debug, no heavy framework needed.

### 6.2 Backend
Recommended V1 choice:
```text
Node.js + Fastify
```
Responsibilities: file upload handling, job status tracking, child process execution for render commands.

### 6.3 Renderer
Use:
* **Verovio** (npm package, WASM) for MusicXML → MIDI — pure JS/WASM, no GUI, no Xvfb, keeps the container single-language.
* **FluidSynth** for MIDI → WAV
* **Salamander Grand Piano** SoundFont (downloaded at build time, not committed to git)
* **FFmpeg** for WAV → MP3

> Why not MuseScore CLI: MuseScore is a Qt GUI application. Running it "headless" in Docker still typically requires a virtual display (Xvfb), which is a well-known source of flaky, hard-to-debug container failures and bloats the image. Verovio has no such requirement and ships an official Node/WASM build.

### 6.4 Deployment
Use:
* Docker (single combined image for production/Render)
* Docker Compose (local dev convenience only — see §17)
* Local filesystem storage for V1 (ephemeral is fine — jobs are stateless render-on-request)

## 7. System Architecture

```text
apps/web
  Vite frontend
  Upload UI
  Render status UI
  Audio preview
  Download buttons

apps/api
  Node.js API
  Upload endpoint
  Render job endpoint
  File download endpoint
  Render process manager
  (in production, also serves the built apps/web static files)

renderer
  SoundFont files (downloaded, not committed)
  Render scripts
  MusicXML/MIDI/WAV/MP3 conversion tools

storage
  Uploaded files
  Output files
  Render logs
```

## 8. Recommended Folder Structure

```text
musicxml-renderer/
  SPEC.md
  README.md
  docker-compose.yml
  Dockerfile
  .gitignore
  .gitattributes
  .env.example

  apps/
    web/
      package.json
      vite.config.js
      index.html
      src/
        main.js
        styles/
          app.css
        components/
          UploadPanel.js
          RenderStatus.js
          AudioPreview.js
          DownloadPanel.js
          RenderLogPanel.js
        services/
          apiClient.js

    api/
      package.json
      src/
        server.js
        config/
          appConfig.js
        routes/
          health.routes.js
          render.routes.js
          files.routes.js
        services/
          fileService.js
          renderJobService.js
          musicxmlService.js
          audioRenderService.js
        workers/
          renderWorker.js
        utils/
          safePath.js
          logger.js

  renderer/
    soundfonts/
      .gitkeep            # SalamanderGrandPiano.sf2 downloaded at build time, not committed
      README.md
    scripts/
      download-soundfont.sh
      musicxml-to-midi.js
      midi-to-wav.sh
      wav-to-mp3.sh
      render-full.sh

  storage/
    uploads/
    outputs/
    logs/

  docs/
    ARCHITECTURE.md
    ROADMAP.md
    RENDER_PIPELINE.md
    LICENSES.md

  tests/
    fixtures/
      simple-piano.musicxml
      broken-file.musicxml
    api/
    renderer/
```

## 9. Rendering Pipeline

### 9.1 Standard Pipeline
```text
MusicXML
  ↓
MIDI
  ↓
WAV
  ↓
MP3
```

### 9.2 Example Commands

```bash
# Step 1: MusicXML to MIDI (Node.js, using the verovio npm package)
node renderer/scripts/musicxml-to-midi.js input.musicxml output.mid

# Step 2: MIDI to WAV using Salamander Grand Piano
# NOTE: on FluidSynth 2.x, options MUST come before the positional
# soundfont/midi args, or it fails with "illegal option at this place"
# and silently writes no WAV.
fluidsynth -ni -F output.wav -r 44100 renderer/soundfonts/SalamanderGrandPiano.sf2 output.mid

# Step 3: WAV to MP3
ffmpeg -y -i output.wav -codec:a libmp3lame -b:a 192k output.mp3
```

### 9.3 Render Output Files
For each render job, generate:
```text
job-id/
  input.musicxml
  output.mid
  output.wav
  output.mp3
  render.log
  metadata.json
```

## 10. API Specification

### 10.1 Health Check
```http
GET /api/health
```
Response:
```json
{
  "ok": true,
  "service": "musicxml-renderer-api"
}
```

### 10.2 Upload and Start Render
```http
POST /api/render
```
Request:
```text
multipart/form-data
file: MusicXML file
```
Allowed file extensions:
```text
.musicxml
.xml
.mxl
```
Response:
```json
{
  "jobId": "job_abc123",
  "status": "queued",
  "message": "Render job created."
}
```

### 10.3 Get Render Status
```http
GET /api/render/:jobId
```
Response:
```json
{
  "jobId": "job_abc123",
  "status": "completed",
  "progress": 100,
  "files": {
    "midi": "/api/files/job_abc123/output.mid",
    "wav": "/api/files/job_abc123/output.wav",
    "mp3": "/api/files/job_abc123/output.mp3"
  },
  "warnings": [],
  "errors": []
}
```
Status values:
```text
queued
processing
completed
failed
expired
```

### 10.4 Download / Stream File
```http
GET /api/files/:jobId/:filename
```
Allowed filenames:
```text
input.musicxml
output.mid
output.wav
output.mp3
render.log
metadata.json
```
**Must support HTTP Range requests (206 Partial Content)** for `output.wav` and `output.mp3` — the browser `<audio>` element needs range support for seeking/scrubbing during preview. Use a static-file plugin that handles `Range` headers (e.g. `@fastify/static`) rather than piping the whole file manually.

## 11. Frontend Requirements

### 11.1 Main Page
* Project title
* Short description
* File upload area
* Render button
* Render status display
* Audio player
* Download buttons
* Render log panel
* Soundfont attribution footer (see §16.4)

### 11.2 UI Layout
```text
Topbar
  Project name
  GitHub link

Main Area
  Left Panel:
    Upload
    File info
    Render settings

  Right Panel:
    Status
    Audio preview
    Downloads
    Render log
```

### 11.3 Required UI States
* No file selected
* Invalid file type
* File selected
* Uploading
* Render queued
* Render processing
* Render completed
* Render failed
* Download ready

## 12. Render Settings for V1
```text
Output format:
- MP3
- WAV
- Both

Piano sound:
- Salamander Grand Piano

Sample rate:
- 44100 Hz

MP3 bitrate:
- 192 kbps
```
Do not add too many settings in V1.

中文解释： V1 设置越少越好。先保证生成出来的声音是稳定的。

## 13. File Validation

### 13.1 Upload Validation
* File exists
* File extension is allowed
* File size is within limit
* File is not empty
* Filename is safe
* File path does not escape storage folder

Recommended V1 upload limit:
```text
20 MB
```

### 13.2 MusicXML Validation
* XML is readable
* MusicXML root exists
* At least one part exists
* At least one measure exists
* Conversion tool (Verovio) can parse it

## 14. Render QA Checks

### 14.1 Required Checks
* Output MIDI exists
* Output WAV exists
* Output MP3 exists
* Output files are not zero bytes
* Audio duration is greater than 1 second
* Render log has no fatal errors

### 14.2 Audio Quality Checks
* Near-silent output
* Too-short output
* Clipping
* Failed MP3 conversion
* Missing WAV file
* Broken MIDI file

### 14.3 Failure Rules
```text
Do not show fake success.
Do not allow broken download as completed.
Show clear error message.
Keep render log for debugging.
```

## 15. Error Handling

### 15.1 User-Friendly Errors
```text
Invalid file type. Please upload a .musicxml, .xml, or .mxl file.

Render failed. The MusicXML file may be invalid or unsupported.

MP3 conversion failed. WAV output may still be available.

Generated audio is too short. Please check the input score.
```

### 15.2 Developer Logs
```text
storage/logs/{jobId}.log
```
Log should include: Job ID, input filename, start time, end time, render commands, tool output, errors, exit codes.

## 16. Security & Licensing Requirements

### 16.1 Backend Security
The backend must:
* Sanitize filenames
* Use generated job IDs
* Never trust uploaded filename as path
* Restrict download paths to job output folder
* Reject unsupported file extensions
* Limit upload size
* Set render timeout
* Avoid shell injection
* Run render commands with safe argument arrays where possible (no raw shell string concatenation)

Recommended render timeout:
```text
120 seconds per job
```

### 16.2 Concurrency Limit
Cap concurrent render jobs (e.g. 2 on a free-tier instance) — MuseScore/FluidSynth/FFmpeg child processes are CPU-heavy; on a shared-CPU free host, unbounded concurrency will cause every in-flight job to slow down or time out.

### 16.3 SoundFont Provenance
The Salamander Grand Piano `.sf2` (300MB+) must **not** be committed to git — GitHub hard-blocks single files over 100MB without Git LFS, and this repo does not use LFS. Instead:
* Download it in `renderer/scripts/download-soundfont.sh`, run at Docker build time
* Pin the exact source URL and checksum in `docs/LICENSES.md`

### 16.4 License Attribution
Salamander Grand Piano is licensed **CC-BY 3.0** by Alexander Holm — free for commercial/business use, but **attribution is required**. Show a credit line (e.g. "Piano samples: Salamander Grand Piano V3 by Alexander Holm, CC-BY 3.0") in the app footer and in `docs/LICENSES.md`.

## 17. Docker Requirements

### 17.1 Production: Single Combined Image
For deployment (e.g. Render.com Web Service, which runs one container per service and has no `docker-compose` orchestration on the free tier), build **one** image that:
* Serves the built `apps/web` static files
* Runs the `apps/api` Fastify server
* Contains the renderer toolchain (Node/Verovio, FluidSynth, FFmpeg)
* Downloads the SoundFont at build time

### 17.2 Local Dev: docker-compose (optional, 3 services)
```text
web       (Vite dev server, hot reload)
api       (Fastify, watches src/)
renderer  (shared toolchain, mounted into api)
```
This is a developer convenience only — it is not how the app is deployed.

### 17.3 Docker Volumes
```text
./storage/uploads:/app/storage/uploads
./storage/outputs:/app/storage/outputs
./storage/logs:/app/storage/logs
```
(SoundFont is baked into the image at build time — no host volume needed for it.)

### 17.4 Environment Variables
```env
PORT=3000
UPLOAD_MAX_MB=20
RENDER_TIMEOUT_SECONDS=120
RENDER_CONCURRENCY=2
STORAGE_DIR=/app/storage
SOUNDFONT_PATH=/app/renderer/soundfonts/SalamanderGrandPiano.sf2
OUTPUT_SAMPLE_RATE=44100
MP3_BITRATE=192k
```

## 18. Data Model

### 18.1 Render Job
```json
{
  "jobId": "job_abc123",
  "status": "completed",
  "originalFilename": "score.musicxml",
  "createdAt": "2026-07-02T00:00:00.000Z",
  "startedAt": "2026-07-02T00:00:01.000Z",
  "completedAt": "2026-07-02T00:00:10.000Z",
  "durationMs": 9000,
  "files": {
    "input": "input.musicxml",
    "midi": "output.mid",
    "wav": "output.wav",
    "mp3": "output.mp3",
    "log": "render.log"
  },
  "qa": {
    "audioDurationSeconds": 92.5,
    "isSilent": false,
    "isClipping": false,
    "isTooShort": false
  },
  "warnings": [],
  "errors": []
}
```

## 19. Testing Requirements

### 19.1 Renderer Tests
* Simple piano MusicXML
* Long MusicXML
* Empty file
* Broken XML
* Unsupported file
* File with spaces in filename
* File with special characters in filename

### 19.2 API Tests
* Health endpoint
* Upload valid MusicXML
* Reject invalid extension
* Reject empty file
* Get job status
* Download output files (verify Range support)
* Prevent path traversal

### 19.3 Browser Tests
* Upload area works
* Render status updates
* Audio preview works (including seek/scrub)
* Download buttons work
* Error message displays properly
* Mobile layout does not break

## 20. Acceptance Criteria for V1
V1 is considered complete when:
* User can open the web app
* User can upload a valid MusicXML file
* Backend creates a render job
* System generates MIDI via Verovio
* System generates WAV using Salamander Grand Piano
* System generates MP3
* User can preview MP3 in browser (with working seek)
* User can download MP3, WAV, and MIDI
* Failed render shows clear error
* Render log is available
* A single `docker build` + `docker run` can serve the whole app locally
* Same image deploys successfully as one Render Web Service
* README explains setup clearly, including SoundFont license attribution

## 21. Suggested Roadmap

**Phase 1: Project Foundation**
* Create repo structure
* Add Vite frontend
* Add Node.js API
* Add Dockerfile (single combined image) + docker-compose for local dev
* Add health check

**Phase 2: Upload and Job System**
* Add upload endpoint
* Add file validation
* Add job ID generation
* Add job metadata JSON

**Phase 3: Render Pipeline**
* Add MusicXML to MIDI conversion (Verovio)
* Add MIDI to WAV rendering (FluidSynth) — verify command arg order
* Add WAV to MP3 conversion (FFmpeg)
* Add SoundFont download script + build-time fetch
* Save render logs

**Phase 4: Frontend Integration**
* Add upload UI
* Add render status polling
* Add audio player (verify Range/seek works)
* Add download buttons
* Add error display
* Add SoundFont attribution footer

**Phase 5: QA and Hardening**
* Add silence detection
* Add clipping detection
* Add timeout handling
* Add render concurrency cap
* Add path safety checks
* Add tests

**Phase 6: Production Polish**
* Add cleanup job for old files
* Add better mobile UI
* Add render history
* Add shareable preview link
* Add optional queue system

## 22. Future Features
After V1 is stable, consider:
* AI MusicXML generation
* Score preview (visual engraving)
* Batch rendering
* Multiple SoundFonts
* Piano-only optimization
* Cello/string rendering
* Render comparison mode
* Public share links
* User accounts
* Cloud deployment (beyond the V1 Render demo)
* API key access
* Webhook after render completion

## 23. Important Product Rule
Do not fake render success. If the audio is broken, silent, too short, or missing, the system must mark the job as failed or warning.

中文解释： 如果生成出来没有声音，不可以显示成功。要直接告诉用户失败原因。

## 24. Simple Definition
```text
A Docker-based web tool that renders MusicXML scores into WAV and MP3 audio using Salamander Grand Piano.
```

中文：
```text
一个用 Docker 跑的网页工具，可以把 MusicXML 乐谱转换成 WAV / MP3 音频，并使用 Salamander Grand Piano 音色。
```
