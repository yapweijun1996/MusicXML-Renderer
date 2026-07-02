import path from 'node:path'
import fastifyStatic from '@fastify/static'
import { appConfig } from '../config/appConfig.js'
import { isValidJobId } from '../services/renderJobService.js'

const ALLOWED_FILENAMES = new Set([
  'input.musicxml',
  'input.xml',
  'input.mxl',
  'output.mid',
  'output.wav',
  'output.mp3',
  'render.log',
  'metadata.json'
])

const FILES_URL_PATTERN = /^\/api\/files\/([^/]+)\/([^/]+)$/

export async function filesRoutes(fastify) {
  fastify.register(async (scoped) => {
    scoped.addHook('onRequest', async (request, reply) => {
      const match = request.url.split('?')[0].match(FILES_URL_PATTERN)

      if (!match) {
        return reply.code(404).send({ error: 'Not found' })
      }

      const [, jobId, filename] = match
      if (!isValidJobId(jobId) || !ALLOWED_FILENAMES.has(filename)) {
        return reply.code(404).send({ error: 'Not found' })
      }
    })

    await scoped.register(fastifyStatic, {
      root: path.resolve(appConfig.storageDir, 'outputs'),
      prefix: '/api/files/',
      decorateReply: false
    })
  })
}
