import fs from 'node:fs/promises'

const MUSICXML_ROOT_PATTERN = /<score-(partwise|timewise)\b/

export async function validateMusicXmlContent(filePath, extension) {
  if (extension === '.mxl') {
    const header = await readFirstBytes(filePath, 2)
    const isZip = header[0] === 0x50 && header[1] === 0x4b // "PK"
    if (!isZip) {
      throw new Error(
        'File does not look like a valid .mxl (compressed MusicXML) archive.'
      )
    }
    return
  }

  const content = await fs.readFile(filePath, 'utf-8')
  const trimmed = content.trim()

  if (!trimmed.startsWith('<')) {
    throw new Error('File does not look like valid XML.')
  }

  if (!MUSICXML_ROOT_PATTERN.test(content)) {
    throw new Error(
      'File does not contain a recognizable MusicXML root element (score-partwise/score-timewise).'
    )
  }
}

async function readFirstBytes(filePath, length) {
  const handle = await fs.open(filePath, 'r')
  try {
    const buffer = Buffer.alloc(length)
    await handle.read(buffer, 0, length, 0)
    return buffer
  } finally {
    await handle.close()
  }
}
