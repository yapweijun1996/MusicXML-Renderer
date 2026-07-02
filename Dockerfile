# ---- build frontend ----
FROM node:20-alpine AS web-build
WORKDIR /app
COPY apps/web/package*.json ./
RUN npm install
COPY apps/web/ ./
RUN npm run build

# ---- install api dependencies ----
FROM node:20-alpine AS api-deps
WORKDIR /app
COPY apps/api/package*.json ./
RUN npm install --omit=dev

# ---- final runtime image ----
FROM node:20-alpine
RUN apk add --no-cache fluidsynth ffmpeg curl xz

WORKDIR /app/apps/api
COPY --from=api-deps /app/node_modules ./node_modules
COPY apps/api/ ./
COPY --from=web-build /app/dist ../web/dist
COPY renderer/ /app/renderer/
RUN /app/renderer/scripts/download-soundfont.sh

ENV PORT=3000
ENV STATIC_DIR=/app/apps/web/dist
ENV STORAGE_DIR=/app/storage
ENV SOUNDFONT_PATH=/app/renderer/soundfonts/SalamanderGrandPiano.sf2

EXPOSE 3000
CMD ["node", "src/server.js"]
