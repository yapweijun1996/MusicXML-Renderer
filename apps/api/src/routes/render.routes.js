import { randomUUID } from 'node:crypto'
import { saveUploadedFile } from '../services/fileService.js'
import {
  createJob,
  getJob,
  isValidJobId
} from '../services/renderJobService.js'
import { runRenderJob } from '../workers/renderWorker.js'

export async function renderRoutes(fastify) {
  fastify.post('/api/render', async (request, reply) => {
    let upload
    try {
      upload = await request.file()
    } catch (err) {
      return reply.code(400).send({ error: err.message })
    }

    if (!upload) {
      return reply.code(400).send({ error: 'No file uploaded.' })
    }

    const jobId = `job_${randomUUID()}`

    let savedFile
    try {
      savedFile = await saveUploadedFile(jobId, upload)
    } catch (err) {
      return reply.code(400).send({ error: err.message })
    }

    const job = await createJob(jobId, {
      originalFilename: upload.filename,
      inputFilename: savedFile.filename
    })

    runRenderJob(jobId).catch((err) => {
      fastify.log.error({ jobId, err }, 'render job crashed unexpectedly')
    })

    return {
      jobId: job.jobId,
      status: job.status,
      message: 'Render job created.'
    }
  })

  fastify.get('/api/render/:jobId', async (request, reply) => {
    const { jobId } = request.params

    if (!isValidJobId(jobId)) {
      return reply.code(400).send({ error: 'Invalid job id.' })
    }

    const job = await getJob(jobId)
    if (!job) {
      return reply.code(404).send({ error: 'Job not found.' })
    }

    return job
  })
}
