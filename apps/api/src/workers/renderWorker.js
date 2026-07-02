import fs from 'node:fs/promises'
import path from 'node:path'
import { jobDir } from '../services/fileService.js'
import { getJob, writeMetadata } from '../services/renderJobService.js'
import { convertMusicXmlToMidi } from '../services/musicxmlToMidiService.js'
import {
  renderMidiToWav,
  renderWavToMp3
} from '../services/audioRenderService.js'
import { resolveWithinBase } from '../utils/safePath.js'

function logPath(jobId) {
  return resolveWithinBase(jobDir(jobId), 'render.log')
}

async function appendLog(jobId, text) {
  await fs.appendFile(logPath(jobId), `${text}\n`)
}

async function assertNonEmpty(filePath, label) {
  const stats = await fs.stat(filePath).catch(() => null)
  if (!stats || stats.size === 0) {
    throw new Error(`${label} output is missing or empty.`)
  }
}

export async function runRenderJob(jobId) {
  const dir = jobDir(jobId)
  const job = await getJob(jobId)
  if (!job) throw new Error(`Job ${jobId} not found.`)

  const inputExt = path.extname(job.files.input)
  const inputPath = resolveWithinBase(dir, job.files.input)
  const midiPath = resolveWithinBase(dir, 'output.mid')
  const wavPath = resolveWithinBase(dir, 'output.wav')
  const mp3Path = resolveWithinBase(dir, 'output.mp3')

  const startedAt = new Date().toISOString()
  job.status = 'processing'
  job.startedAt = startedAt
  await writeMetadata(jobId, job)
  await appendLog(
    jobId,
    `[${startedAt}] job ${jobId} started, input=${job.files.input}`
  )

  try {
    await appendLog(jobId, 'Step 1: MusicXML -> MIDI (Verovio)')
    await convertMusicXmlToMidi(inputPath, midiPath, inputExt)
    await assertNonEmpty(midiPath, 'MIDI')
    job.files.midi = 'output.mid'

    await appendLog(jobId, 'Step 2: MIDI -> WAV (FluidSynth)')
    const wavResult = await renderMidiToWav(midiPath, wavPath)
    await appendLog(jobId, wavResult.command)
    if (wavResult.stderr) await appendLog(jobId, wavResult.stderr)
    await assertNonEmpty(wavPath, 'WAV')
    job.files.wav = 'output.wav'

    await appendLog(jobId, 'Step 3: WAV -> MP3 (FFmpeg)')
    const mp3Result = await renderWavToMp3(wavPath, mp3Path)
    await appendLog(jobId, mp3Result.command)
    if (mp3Result.stderr) await appendLog(jobId, mp3Result.stderr)
    await assertNonEmpty(mp3Path, 'MP3')
    job.files.mp3 = 'output.mp3'

    job.files.log = 'render.log'
    job.status = 'completed'
    job.progress = 100
  } catch (err) {
    job.status = 'failed'
    job.errors = [...(job.errors || []), err.message]
    await appendLog(jobId, `ERROR: ${err.message}`)
  }

  const completedAt = new Date().toISOString()
  job.completedAt = completedAt
  job.durationMs =
    new Date(completedAt).getTime() - new Date(startedAt).getTime()
  await writeMetadata(jobId, job)
  await appendLog(
    jobId,
    `[${completedAt}] job ${jobId} finished with status=${job.status}`
  )

  return job
}
