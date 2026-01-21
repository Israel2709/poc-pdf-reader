const express = require('express')
const path = require('path')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 3000
const PDF_DIR = process.env.PDF_DIR || 'C:/PDFS-RED'

const normalizeBase = (dir) => path.resolve(dir)
const sseClients = new Set()
let broadcastTimer = null

const scheduleBroadcast = () => {
  if (broadcastTimer) return
  broadcastTimer = setTimeout(() => {
    broadcastTimer = null
    sseClients.forEach((res) => {
      res.write(`event: update\ndata: ${Date.now()}\n\n`)
    })
  }, 300)
}

const startWatcher = () => {
  const baseDir = normalizeBase(PDF_DIR)
  try {
    fs.watch(baseDir, { recursive: true }, () => {
      scheduleBroadcast()
    })
  } catch (error) {
    console.warn(
      'No se pudo iniciar el watcher de PDFs. Usa el polling del cliente.',
      error?.message || error
    )
  }
}

const walkPdfs = (dir, baseDir, acc) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  entries.forEach((entry) => {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkPdfs(fullPath, baseDir, acc)
      return
    }
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.pdf')) {
      return
    }
    const stat = fs.statSync(fullPath)
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/')
    const title = entry.name.replace(/\.[^/.]+$/, '')
    acc.push({
      name: entry.name,
      title,
      description: '',
      size: stat.size,
      updatedAt: stat.mtime,
      relPath,
      url: `/files/${encodeURIComponent(relPath)}`,
    })
  })
}

app.get('/api/pdfs', (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store')
    const baseDir = normalizeBase(PDF_DIR)
    const files = []
    walkPdfs(baseDir, baseDir, files)
    console.log(`[api] /api/pdfs -> ${files.length} archivos`)
    res.json(files)
  } catch (error) {
    res.status(500).json({
      message: error?.message || 'No se pudieron cargar los PDFs.',
    })
  }
})

app.get('/api/pdfs/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.write('event: ready\ndata: ok\n\n')
  sseClients.add(res)

  req.on('close', () => {
    sseClients.delete(res)
  })
})

app.use('/files', express.static(PDF_DIR))

app.use(express.static(path.join(__dirname, 'dist')))
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  startWatcher()
  console.log(`Servidor listo en http://localhost:${PORT}`)
})
