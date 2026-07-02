export async function healthRoutes(fastify) {
  fastify.get('/api/health', async () => ({
    ok: true,
    service: 'musicxml-renderer-api'
  }))
}
