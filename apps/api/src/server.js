import path from 'node:path'
import fs from 'node:fs/promises'
import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import fastifyMultipart from '@fastify/multipart'
import { appConfig } from './config/appConfig.js'
import { healthRoutes } from './routes/health.routes.js'
import { renderRoutes } from './routes/render.routes.js'
import { filesRoutes } from './routes/files.routes.js'

for (const sub of ['uploads', 'outputs', 'logs']) {
  await fs.mkdir(path.resolve(appConfig.storageDir, sub), { recursive: true })
}

const fastify = Fastify({ logger: true })

await fastify.register(fastifyMultipart, {
  limits: { fileSize: appConfig.uploadMaxMb * 1024 * 1024 }
})

await fastify.register(healthRoutes)
await fastify.register(renderRoutes)
await fastify.register(filesRoutes)

if (appConfig.staticDir) {
  await fastify.register(fastifyStatic, {
    root: path.resolve(appConfig.staticDir)
  })

  fastify.setNotFoundHandler((request, reply) => {
    if (request.raw.url?.startsWith('/api')) {
      reply.code(404).send({ error: 'Not found' })
      return
    }
    reply.sendFile('index.html')
  })
}

try {
  await fastify.listen({ port: appConfig.port, host: '0.0.0.0' })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
