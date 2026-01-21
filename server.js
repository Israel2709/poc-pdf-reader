const express = require('express')
const path = require('path')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 3000
const PDF_DIR = process.env.PDF_DIR || 'C:/PDFS-RED'

const normalizeBase = (dir) => path.resolve(dir)

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
    const baseDir = normalizeBase(PDF_DIR)
    const files = []
    walkPdfs(baseDir, baseDir, files)
    res.json(files)
  } catch (error) {
    res.status(500).json({
      message: error?.message || 'No se pudieron cargar los PDFs.',
    })
  }
})

app.get('/files/*', (req, res) => {
  try {
    const baseDir = normalizeBase(PDF_DIR)
    const relPath = decodeURIComponent(req.params[0] || '')
    const fullPath = path.resolve(baseDir, relPath)
    if (!fullPath.startsWith(baseDir)) {
      return res.status(400).send('Ruta inválida')
    }
    return res.sendFile(fullPath)
  } catch {
    return res.status(404).send('Archivo no encontrado')
  }
})

app.use(express.static(path.join(__dirname, 'dist')))
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Servidor listo en http://localhost:${PORT}`)
})
