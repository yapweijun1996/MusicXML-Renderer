export const appConfig = {
  port: Number(process.env.PORT) || 3000,
  uploadMaxMb: Number(process.env.UPLOAD_MAX_MB) || 20,
  renderTimeoutSeconds: Number(process.env.RENDER_TIMEOUT_SECONDS) || 120,
  renderConcurrency: Number(process.env.RENDER_CONCURRENCY) || 2,
  storageDir: process.env.STORAGE_DIR || './storage',
  soundfontPath:
    process.env.SOUNDFONT_PATH ||
    './renderer/soundfonts/SalamanderGrandPiano.sf2',
  outputSampleRate: Number(process.env.OUTPUT_SAMPLE_RATE) || 44100,
  mp3Bitrate: process.env.MP3_BITRATE || '192k',
  staticDir: process.env.STATIC_DIR || null
}
