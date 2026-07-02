import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { appConfig } from '../config/appConfig.js'
import { resolveWithinBase } from '../utils/safePath.js'
import { validateMusicXmlContent } from './musicxmlService.js'

export const ALLOWED_EXTENSIONS = ['.musicxml', '.xml', '.mxl']

export function jobDir(jobId) {
  return resolveWithinBase(appConfig.storageDir, 'outputs', jobId)
}

export async function saveUploadedFile(jobId, upload) {
  const ext = path.extname(upload.filename || '').toLowerCase()

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    upload.file.resume()
    throw new Error(
      `Invalid file type. Please upload a ${ALLOWED_EXTENSIONS.join(', ')} file.`
    )
  }

  const dir = jobDir(jobId)
  await fsp.mkdir(dir, { recursive: true })

  const filename = `input${ext}`
  const targetPath = resolveWithinBase(dir, filename)

  await pipeline(upload.file, fs.createWriteStream(targetPath))

  if (upload.file.truncated) {
    await fsp.rm(targetPath, { force: true })
    throw new Error(
      `File exceeds maximum size of ${appConfig.uploadMaxMb}MB.`
    )
  }

  const stats = await fsp.stat(targetPath)
  if (stats.size === 0) {
    await fsp.rm(targetPath, { force: true })
    throw new Error('Uploaded file is empty.')
  }

  try {
    await validateMusicXmlContent(targetPath, ext)
  } catch (err) {
    await fsp.rm(targetPath, { force: true })
    throw err
  }

  return { filename, path: targetPath, size: stats.size }
}
