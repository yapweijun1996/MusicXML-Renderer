import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { appConfig } from '../config/appConfig.js'

const execFileAsync = promisify(execFile)

// FluidSynth 2.x requires options BEFORE the positional soundfont/midi
// args, or it fails with "illegal option at this place" and writes no WAV.
export async function renderMidiToWav(midiPath, wavPath) {
  const args = [
    '-ni',
    '-F',
    wavPath,
    '-r',
    String(appConfig.outputSampleRate),
    appConfig.soundfontPath,
    midiPath
  ]

  const { stdout, stderr } = await execFileAsync('fluidsynth', args, {
    timeout: appConfig.renderTimeoutSeconds * 1000
  })

  return { command: `fluidsynth ${args.join(' ')}`, stdout, stderr }
}

export async function renderWavToMp3(wavPath, mp3Path) {
  const args = [
    '-y',
    '-i',
    wavPath,
    '-codec:a',
    'libmp3lame',
    '-b:a',
    appConfig.mp3Bitrate,
    mp3Path
  ]

  const { stdout, stderr } = await execFileAsync('ffmpeg', args, {
    timeout: appConfig.renderTimeoutSeconds * 1000
  })

  return { command: `ffmpeg ${args.join(' ')}`, stdout, stderr }
}
