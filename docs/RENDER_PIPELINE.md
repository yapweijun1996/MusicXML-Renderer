# Render Pipeline

Detailed reference for the three conversion steps plus QA. See [SPEC.md §9](../SPEC.md#9-rendering-pipeline) for the spec-level summary.

## Step 1 — MusicXML → MIDI (Verovio)

```js
// renderer/scripts/musicxml-to-midi.js (sketch)
const verovio = require('verovio');
const toolkit = new verovio.toolkit();

toolkit.loadFile(inputPath);          // accepts .musicxml / .xml / .mxl
const base64Midi = toolkit.renderToMIDI();
fs.writeFileSync(outputPath, Buffer.from(base64Midi, 'base64'));
```

- No GUI/Xvfb dependency — runs anywhere Node.js runs.
- Validate before rendering: `toolkit.loadFile()` returning false / throwing means the file is not parseable MusicXML → surface as a user-friendly "invalid MusicXML" error, not a generic 500.
- Verovio also exposes `renderToSVG()` — not used in V1 (audio-only), but worth knowing for the "score preview" future feature ([SPEC.md §22](../SPEC.md#22-future-features)).

## Step 2 — MIDI → WAV (FluidSynth + Salamander Grand Piano)

```bash
fluidsynth -ni -F output.wav -r 44100 renderer/soundfonts/SalamanderGrandPiano.sf2 output.mid
```

**Gotcha (verified from prior project experience):** on FluidSynth 2.x, CLI options (`-F`, `-r`, etc.) must come **before** the positional soundfont/MIDI arguments. If they're placed after, FluidSynth fails with `illegal option at this place` and — worse — writes no WAV file and may still exit in a way that looks like success in a naive process wrapper. Always assert the output WAV file exists and is non-zero bytes after this step; don't trust the exit code alone.

## Step 3 — WAV → MP3 (FFmpeg)

```bash
ffmpeg -y -i output.wav -codec:a libmp3lame -b:a 192k output.mp3
```

Requires an FFmpeg build with `libmp3lame` support. This is LGPL-compatible (no `--enable-gpl`/`--enable-nonfree` needed) — see [LICENSES.md](LICENSES.md).

## QA checks (run after Step 3, before marking a job `completed`)

| Check | How | On failure |
|---|---|---|
| File existence | `output.mid`, `output.wav`, `output.mp3` all exist | `failed` |
| Non-zero size | `stat().size > 0` on each output file | `failed` |
| Minimum duration | decoded audio duration > 1s | `failed` |
| Near-silence | RMS level below threshold across the whole file | `warning` (or `failed` if fully silent) |
| Clipping | sample peaks at/above full scale for a sustained run | `warning` |
| Render log fatal errors | grep `render.log` for tool error/exit-code markers | `failed` |

**Rule: never report `completed` if any required check fails.** See [SPEC.md §14.3](../SPEC.md#143-failure-rules) and [SPEC.md §23](../SPEC.md#23-important-product-rule) — this is a named product rule, not just an implementation detail.

## Concurrency & timeouts

- `RENDER_TIMEOUT_SECONDS` (default 120) bounds each job's total pipeline time — kill the child process tree and mark `failed` with a clear "render timed out" message if exceeded.
- `RENDER_CONCURRENCY` (default 2) bounds how many jobs run their pipeline simultaneously — MuseScore-class/FluidSynth/FFmpeg processes are CPU-heavy, and Render's free tier is shared-CPU, so unbounded concurrency degrades every in-flight job rather than failing cleanly.

## Logging

Every job writes `storage/logs/{jobId}.log` containing: job ID, input filename, start/end timestamps, the exact command run for each step (with arguments, for debuggability), tool stdout/stderr, and exit codes. This is what a `failed` job's UI error links to.
