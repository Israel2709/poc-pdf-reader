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
    <section className="rounded-lg border border-[#0094aa]/20 bg-white p-6 shadow-sm dark:border-[#0094aa]/40 dark:bg-slate-900">
      <h2 className="text-xl font-semibold text-[#5a2766] dark:text-[#d7b3e2]">Subir PDF</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Completa la información del PDF antes de subirlo.
      </p>
      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label
            htmlFor="pdf-file"
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Archivo PDF
          </label>
          <label
            htmlFor="pdf-file"
            className={`${dropBase} ${
              isDragging
                ? 'border-[#0094aa] bg-[#0094aa]/10 text-[#0094aa]'
                : 'border-[#0094aa]/40 bg-[#0094aa]/5 text-slate-700 hover:bg-[#0094aa]/10 dark:text-slate-200'
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
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
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
                className="rounded-lg border border-[#5a2766]/30 bg-[#5a2766]/10 px-3 py-1 text-xs font-semibold text-[#5a2766] transition hover:bg-[#5a2766]/20 dark:border-[#5a2766]/40 dark:text-[#d7b3e2]"
              >
                Quitar archivo
              </button>
            </div>
          ) : null}
        </div>
        <div className="space-y-2">
          <label
            htmlFor="pdf-title"
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
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
            className="w-full rounded-lg border border-[#0094aa]/30 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0094aa] focus:outline-none focus:ring-2 focus:ring-[#0094aa]/30 dark:border-[#0094aa]/50 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="pdf-description"
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
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
            className="w-full rounded-lg border border-[#0094aa]/30 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0094aa] focus:outline-none focus:ring-2 focus:ring-[#0094aa]/30 dark:border-[#0094aa]/50 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400"
          />
        </div>
        {error ? (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}
        {status ? (
          <div className="space-y-2 rounded-lg border border-[#0094aa]/30 bg-[#0094aa]/10 px-4 py-3 text-sm text-[#0094aa] dark:border-[#0094aa]/40 dark:text-[#7ed4e1]">
            <p>{status}</p>
            {isUploading ? (
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#0094aa]/20">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#0094aa] to-[#5a2766] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            ) : null}
            {!isUploading && downloadUrl ? (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-[#0094aa] underline underline-offset-4 dark:text-[#7ed4e1]"
              >
                Ver PDF subido
              </a>
            ) : null}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={isUploading}
          className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-[#0094aa] to-[#5a2766] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#0094aa]/25 transition hover:from-[#00a8c2] hover:to-[#6b2c7a] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isUploading ? 'Subiendo...' : 'Subir PDF'}
        </button>
      </form>
    </section>
  )
}

export default UploadPdfPage
