#!/bin/sh
# Downloads the Salamander Grand Piano V3 SoundFont (SF2) at Docker build time.
# Source: FreePats (https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html)
# License: CC-BY 3.0, original samples by Alexander Holm (see docs/LICENSES.md).
#
# Not committed to git: the file is ~296MB, well over GitHub's 100MB hard
# limit, and this repo does not use Git LFS.
set -eu

SOUNDFONT_URL="https://freepats.zenvoid.org/Piano/SalamanderGrandPiano/SalamanderGrandPiano-SF2-V3+20200602.tar.xz"
SOUNDFONT_SHA256="15edb061d7ba60d58332f72dba8f8ce40988048cc703f935e6320f37d650e213"
DEST_DIR="$(dirname "$0")/../soundfonts"
ARCHIVE_PATH="$DEST_DIR/salamander.tar.xz"
SF2_FILENAME="SalamanderGrandPiano-SF2-V3+20200602/SalamanderGrandPiano-V3+20200602.sf2"

mkdir -p "$DEST_DIR"

if [ -f "$DEST_DIR/SalamanderGrandPiano.sf2" ]; then
  echo "SoundFont already present, skipping download."
  exit 0
fi

if [ -f "$ARCHIVE_PATH" ] && echo "$SOUNDFONT_SHA256  $ARCHIVE_PATH" | sha256sum -c - >/dev/null 2>&1; then
  echo "Archive already downloaded and verified, skipping fetch."
else
  echo "Downloading Salamander Grand Piano SF2 from FreePats..."
  curl -fSL -o "$ARCHIVE_PATH" "$SOUNDFONT_URL"
  echo "$SOUNDFONT_SHA256  $ARCHIVE_PATH" | sha256sum -c -
fi

tar -xJf "$ARCHIVE_PATH" -C "$DEST_DIR"
mv "$DEST_DIR/$SF2_FILENAME" "$DEST_DIR/SalamanderGrandPiano.sf2"

rm -f "$ARCHIVE_PATH"
rm -rf "${DEST_DIR:?}/SalamanderGrandPiano-SF2-V3+20200602"

echo "SoundFont ready at $DEST_DIR/SalamanderGrandPiano.sf2"
