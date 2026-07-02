import fs from 'node:fs/promises'
import createVerovioModule from 'verovio/wasm'
import { VerovioToolkit } from 'verovio/esm'

let toolkitPromise = null

function getToolkit() {
  if (!toolkitPromise) {
    toolkitPromise = createVerovioModule().then(
      (module) => new VerovioToolkit(module)
    )
  }
  return toolkitPromise
}

export async function convertMusicXmlToMidi(inputPath, outputPath, extension) {
  const toolkit = await getToolkit()

  let loaded
  if (extension === '.mxl') {
    const buffer = await fs.readFile(inputPath)
    loaded = toolkit.loadZipDataBase64(buffer.toString('base64'))
  } else {
    const text = await fs.readFile(inputPath, 'utf-8')
    loaded = toolkit.loadData(text)
  }

  if (!loaded) {
    throw new Error(
      'Verovio could not parse this MusicXML file. It may be invalid or use an unsupported feature.'
    )
  }

  const base64Midi = toolkit.renderToMIDI()
  if (!base64Midi) {
    throw new Error('Verovio failed to render MIDI from this score.')
  }

  await fs.writeFile(outputPath, Buffer.from(base64Midi, 'base64'))
  return outputPath
}
