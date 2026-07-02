# Licenses & Attribution

## Salamander Grand Piano (audio samples)

- **Author:** Alexander Holm (axeldenstore [at] gmail.com)
- **License:** CC-BY 3.0 (https://creativecommons.org/licenses/by/3.0/) — free for commercial/business use, **attribution required**.
- **Canonical source (verified):** https://archive.org/details/SalamanderGrandPianoV3 — SFZ format, 16 velocity layers, recorded at 48kHz/24-bit, ~1.9GB total as raw multisamples.
- **Required credit line** (show in app footer and here):
  > Piano samples: Salamander Grand Piano V3 by Alexander Holm — CC-BY 3.0

### `.sf2` build artifact — resolved

The archive.org source above ships raw SFZ multisamples (~1.9GB), too large/slow to convert on every Docker build. Instead, `renderer/scripts/download-soundfont.sh` pulls a pre-converted `.sf2` from **FreePats** (https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html), which repackages the same CC-BY 3.0 Salamander Grand Piano V3 samples:

- **URL:** `https://freepats.zenvoid.org/Piano/SalamanderGrandPiano/SalamanderGrandPiano-SF2-V3+20200602.tar.xz`
- **Compressed download size (verified via HTTP HEAD):** 310,397,984 bytes (~296 MiB) — **extracts to a 1.27GB `.sf2`** (full 16-velocity-layer set). This is bigger than originally estimated; the production Docker image ends up ~1.4GB total. Accepted for V1 for full piano fidelity — see the note in [docs/ROADMAP.md](ROADMAP.md) Epic 2.
- **License:** CC-BY 3.0, same chain of attribution back to Alexander Holm — FreePats is a long-running, well-known redistribution point for CC-licensed instrument samples, not a random mirror.
- Chosen over `musical-artifacts.com` (also hosts a Salamander `.sf2`) because that host sits behind a Cloudflare bot challenge that blocks non-browser requests (`curl`/`wget` get an HTTP 403 with a JS challenge page) — unusable from an unattended Docker build step. FreePats has no such blocking.
- **SHA-256 (verified, pinned in `download-soundfont.sh`):** `15edb061d7ba60d58332f72dba8f8ce40988048cc703f935e6320f37d650e213` — computed from a fully-verified local download; not published by FreePats itself, so this project's own hash is the source of truth for tamper/corruption detection on future downloads.

## Verovio

- **License:** GNU Lesser General Public License v3 (LGPL-3.0)
- Used as an npm dependency (WASM build) for MusicXML → MIDI conversion. LGPL permits commercial/business use as a dynamically-linked dependency; app code does not need to be LGPL.
- Project: https://www.verovio.org/

## FluidSynth

- **License:** GNU Lesser General Public License v2.1 (LGPL-2.1)
- Invoked as an external CLI process (not statically linked into app code), which is the simplest way to stay compliant.

## FFmpeg (with libmp3lame)

- **License:** LGPL 2.1+ for a default FFmpeg build. `libmp3lame` (LAME) is itself LGPL and does **not** require building FFmpeg with `--enable-gpl`/`--enable-nonfree`.
- Make sure the Docker base image's FFmpeg package (or the build flags, if compiling from source) includes `--enable-libmp3lame` without pulling in GPL-only components, to keep the whole toolchain LGPL-clean for commercial use.

## App code

- Recommended: MIT license for the `musicxml-renderer` codebase itself (frontend + backend + scripts). Not yet added — add a `LICENSE` file at repo root when this is decided.

## Node dependency audit (do before first release)

Run a license scan (e.g. `npx license-checker --summary`) once `package.json` dependencies are in place, and record any copyleft (GPL/AGPL) dependency here explicitly before shipping a public demo.
