import { useRef, useState } from 'react'
import { pdfjs } from 'react-pdf'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage'
import { storage } from '../firebase'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker

const dropBase =
  'flex min-h-[140px] cursor-pointer items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm transition'

function UploadPdfPage() {
  const [title, setTitle] = useState('')
  const [isTitleEdited, setIsTitleEdited] = useState(false)
  const [description, setDescription] = useState('')
  const [file, setFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')
  const fileInputRef = useRef(null)
  const titleInputRef = useRef(null)

  const extractPdfTitle = async (nextFile) => {
    try {
      const buffer = await nextFile.arrayBuffer()
      const loadingTask = pdfjs.getDocument({ data: buffer })
      const pdf = await loadingTask.promise
      const metadata = await pdf.getMetadata()
      const infoTitle = metadata?.info?.Title?.trim()
      const metaTitle = metadata?.metadata?.get?.('dc:title')?.trim()
      return infoTitle || metaTitle || ''
    } catch {
      return ''
    }
  }

  const validateFile = (nextFile) => {
    if (!nextFile) {
      return 'Selecciona un PDF para continuar.'
    }
    const isPdf =
      nextFile.type === 'application/pdf' ||
      nextFile.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      return 'El archivo debe ser un PDF.'
    }
    return ''
  }

  const handleFileSelect = async (event) => {
    const nextFile = event.target.files?.[0] || null
    const validationError = validateFile(nextFile)
    setError(validationError)
    setFile(validationError ? null : nextFile)
    if (!validationError && nextFile && (!title.trim() || !isTitleEdited)) {
      const extractedTitle = await extractPdfTitle(nextFile)
      if (extractedTitle) {
        setTitle(extractedTitle)
      } else {
        setTitle(nextFile.name.replace(/\.[^/.]+$/, ''))
        if (titleInputRef.current) {
          titleInputRef.current.focus()
        }
      }
    }
  }

  const handleDrop = async (event) => {
    event.preventDefault()
    setIsDragging(false)
    const nextFile = event.dataTransfer.files?.[0] || null
    const validationError = validateFile(nextFile)
    setError(validationError)
    setFile(validationError ? null : nextFile)
    if (!validationError && nextFile && (!title.trim() || !isTitleEdited)) {
      const extractedTitle = await extractPdfTitle(nextFile)
      if (extractedTitle) {
        setTitle(extractedTitle)
      } else {
        setTitle(nextFile.name.replace(/\.[^/.]+$/, ''))
        if (titleInputRef.current) {
          titleInputRef.current.focus()
        }
      }
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setError('')
    setStatus('')
    setDownloadUrl('')

    if (!title.trim()) {
      setError('Ingresa un título para el PDF.')
      return
    }
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    const safeName = file.name.replace(/\s+/g, '_')
    const storageRef = ref(
      storage,
      `pdfs/${Date.now()}-${safeName}`
    )
    const metadata = {
      contentType: 'application/pdf',
      customMetadata: {
        title: title.trim(),
        description: description.trim(),
      },
    }

    setIsUploading(true)
    setProgress(0)
    setStatus('Subiendo PDF...')

    const uploadTask = uploadBytesResumable(storageRef, file, metadata)
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const nextProgress = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        )
        setProgress(nextProgress)
      },
      (uploadError) => {
        setIsUploading(false)
        setStatus('')
        setError(
          uploadError?.message || 'No se pudo subir el PDF. Intenta de nuevo.'
        )
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref)
        setIsUploading(false)
        setStatus('PDF subido correctamente.')
        setDownloadUrl(url)
        setTitle('')
        setIsTitleEdited(false)
        setDescription('')
        setFile(null)
        setProgress(0)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    )
  }

  const handleClearFile = () => {
    setFile(null)
    setError('')
    if (!isTitleEdited) {
      setTitle('')
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <section className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-6">
      <h2 className="text-xl font-semibold text-purple-100">Subir PDF</h2>
      <p className="mt-2 text-sm text-purple-200/80">
        Completa la información del PDF antes de subirlo.
      </p>
      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label
            htmlFor="pdf-file"
            className="text-sm font-medium text-purple-100"
          >
            Archivo PDF
          </label>
          <label
            htmlFor="pdf-file"
            className={`${dropBase} ${
              isDragging
                ? 'border-purple-300 bg-purple-500/20 text-purple-50'
                : 'border-purple-400/40 bg-purple-500/10 text-purple-100 hover:bg-purple-500/20'
            }`}
            onDragEnter={(event) => {
              event.preventDefault()
              setIsDragging(true)
            }}
            onDragOver={(event) => {
              event.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={(event) => {
              event.preventDefault()
              setIsDragging(false)
            }}
            onDrop={handleDrop}
          >
            <div>
              <p className="font-medium">Arrastra y suelta tu PDF aquí</p>
              <p className="mt-1 text-xs text-purple-200/70">
                {file ? file.name : 'o haz clic para seleccionar un archivo'}
              </p>
            </div>
          </label>
          <input
            id="pdf-file"
            name="file"
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            ref={fileInputRef}
            className="hidden"
          />
          {file ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleClearFile}
                className="rounded-lg border border-purple-400/40 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-100 transition hover:bg-purple-500/20"
              >
                Quitar archivo
              </button>
            </div>
          ) : null}
        </div>
        <div className="space-y-2">
          <label
            htmlFor="pdf-title"
            className="text-sm font-medium text-purple-100"
          >
            Título del PDF
          </label>
          <input
            id="pdf-title"
            name="title"
            type="text"
            placeholder="Ej. Manual de usuario"
            value={title}
            ref={titleInputRef}
            onChange={(event) => {
              setTitle(event.target.value)
              setIsTitleEdited(true)
            }}
            className="w-full rounded-lg border border-purple-500/30 bg-slate-950/50 px-4 py-2.5 text-sm text-purple-50 placeholder:text-purple-200/50 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="pdf-description"
            className="text-sm font-medium text-purple-100"
          >
            Descripción del PDF
          </label>
          <textarea
            id="pdf-description"
            name="description"
            rows="4"
            placeholder="Resumen o notas sobre el contenido del PDF"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded-lg border border-purple-500/30 bg-slate-950/50 px-4 py-2.5 text-sm text-purple-50 placeholder:text-purple-200/50 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
        </div>
        {error ? (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}
        {status ? (
          <div className="space-y-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
            <p>{status}</p>
            {isUploading ? (
              <div className="h-2 w-full overflow-hidden rounded-full bg-blue-900/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-purple-400 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            ) : null}
            {!isUploading && downloadUrl ? (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-blue-200 underline underline-offset-4"
              >
                Ver PDF subido
              </a>
            ) : null}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={isUploading}
          className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:from-blue-400 hover:to-purple-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isUploading ? 'Subiendo...' : 'Subir PDF'}
        </button>
      </form>
    </section>
  )
}

export default UploadPdfPage
