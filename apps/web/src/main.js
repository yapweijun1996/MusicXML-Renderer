import './styles/app.css'

const app = document.getElementById('app')

app.innerHTML = `
  <main class="page">
    <h1>MusicXML Renderer</h1>
    <p class="tagline">Render MusicXML scores into WAV and MP3 using Salamander Grand Piano.</p>
    <p id="api-status" class="status">Checking API…</p>
  </main>
`

const statusEl = document.getElementById('api-status')

fetch('/api/health')
  .then((res) => res.json())
  .then((data) => {
    statusEl.textContent = data.ok
      ? `API online (${data.service})`
      : 'API responded but reported not ok.'
    statusEl.classList.add(data.ok ? 'status--ok' : 'status--error')
  })
  .catch(() => {
    statusEl.textContent = 'API unreachable.'
    statusEl.classList.add('status--error')
  })
