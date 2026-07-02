import fs from 'node:fs/promises'
import { resolveWithinBase } from '../utils/safePath.js'
import { jobDir } from './fileService.js'

function metadataPath(jobId) {
  return resolveWithinBase(jobDir(jobId), 'metadata.json')
}

export async function createJob(jobId, { originalFilename, inputFilename }) {
  const now = new Date().toISOString()

  const metadata = {
    jobId,
    status: 'queued',
    progress: 0,
    originalFilename,
    createdAt: now,
    startedAt: null,
    completedAt: null,
    durationMs: null,
    files: {
      input: inputFilename
    },
    qa: null,
    warnings: [],
    errors: []
  }

  await writeMetadata(jobId, metadata)
  return metadata
}

export async function getJob(jobId) {
  try {
    const raw = await fs.readFile(metadataPath(jobId), 'utf-8')
    return JSON.parse(raw)
  } catch (err) {
    if (err.code === 'ENOENT') return null
    throw err
  }
}

export async function writeMetadata(jobId, metadata) {
  await fs.writeFile(metadataPath(jobId), JSON.stringify(metadata, null, 2))
  return metadata
}

export function isValidJobId(jobId) {
  return /^job_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
    jobId
  )
}
