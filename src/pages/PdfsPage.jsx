import { useEffect, useMemo, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { getDownloadURL, getMetadata, listAll, ref } from 'firebase/storage'
import { storage } from '../firebase'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker

function PdfsPage() {
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [selectedPdf, setSelectedPdf] = useState(null)
  const [numPages, setNumPages] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const viewerRef = useRef(null)

  useEffect(() => {
    let isActive = true

    const loadPdfs = async () => {
      try {
        const folderRef = ref(storage, 'pdfs')
        const result = await listAll(folderRef)
        const mapped = await Promise.all(
          result.items.map(async (itemRef) => {
            const [url, metadata] = await Promise.all([
              getDownloadURL(itemRef),
              getMetadata(itemRef),
            ])
            const custom = metadata.customMetadata || {}
            return {
              name: metadata.name,
              size: metadata.size,
              updatedAt: metadata.updated,
              title: custom.title || metadata.name,
              description: custom.description || '',
              url,
            }
          })
        )
        if (isActive) {
          setItems(mapped)
        }
      } catch (err) {
        if (isActive) {
          setError(
            err?.message ||
              'No se pudieron cargar los PDFs. Intenta más tarde.'
          )
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadPdfs()

    return () => {
      isActive = false
    }
  }, [])

  const selectedItem = useMemo(
    () => items.find((item) => item.url === selectedPdf) || null,
    [items, selectedPdf]
  )

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return items
    return items.filter((item) =>
      item.title.toLowerCase().includes(normalized)
    )
  }, [items, query])

  const openViewer = (url) => {
    setSelectedPdf(url)
    setPageNumber(1)
    setIsViewerOpen(true)
  }

  const closeViewer = () => {
    setIsViewerOpen(false)
  }

  const toggleFullscreen = async () => {
    if (!viewerRef.current) return
    try {
      if (!document.fullscreenElement) {
        await viewerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch {
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  return (
    <section>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg font-semibold text-blue-100">
          Lista de PDFs disponibles
        </h2>
        <div className="w-full md:max-w-xs">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por título..."
            className="w-full rounded-lg border border-blue-500/30 bg-slate-950/60 px-3 py-2 text-sm text-blue-50 placeholder:text-blue-200/50 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
      </div>
      <div className="mt-6">
        {isLoading ? (
          <p className="text-sm text-blue-200/70">Cargando PDFs...</p>
        ) : null}
        {error ? (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}
        {!isLoading && !error && filteredItems.length === 0 ? (
          <p className="text-sm text-blue-200/70">
            {query
              ? 'No hay resultados para esta búsqueda.'
              : 'Aún no hay PDFs subidos.'}
          </p>
        ) : null}
        {!isLoading && !error && filteredItems.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredItems.map((item) => (
              <article
                key={item.url}
                className="flex h-full flex-col rounded-lg border border-blue-500/20 bg-slate-950/60 p-4 transition hover:border-blue-400/60 hover:bg-slate-900/90"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-blue-50">
                      {item.title}
                    </h3>
                    {item.description ? (
                      <p className="mt-1 text-xs text-blue-200/70">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                  <span className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[11px] font-semibold text-blue-100">
                    PDF
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-blue-200/70">
                  <span>{Math.round(item.size / 1024)} KB</span>
                  {item.updatedAt ? (
                    <span>
                      {new Date(item.updatedAt).toLocaleDateString('es-MX')}
                    </span>
                  ) : null}
                </div>
                <div className="mt-auto flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => openViewer(item.url)}
                    className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:from-blue-400 hover:to-purple-400"
                  >
                    Ver PDF
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
      {isViewerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-6"
          onClick={closeViewer}
        >
          <div
            ref={viewerRef}
            className={`relative w-full overflow-hidden border border-blue-500/20 bg-slate-900 ${
              isFullscreen
                ? 'h-screen max-w-none rounded-none'
                : 'max-h-[90vh] max-w-4xl rounded-lg'
            }`}
            onClick={(event) => event.stopPropagation()}
            onContextMenu={(event) => event.preventDefault()}
          >
            <div className="flex items-center justify-between border-b border-blue-500/20 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-blue-100">
                  {selectedItem?.title || 'PDF'}
                </p>
                {selectedItem?.description ? (
                  <p className="text-xs text-blue-200/70">
                    {selectedItem.description}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-100 transition hover:bg-blue-500/20"
                >
                  {isFullscreen ? 'Salir pantalla completa' : 'Pantalla completa'}
                </button>
                <button
                  type="button"
                  onClick={closeViewer}
                  className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-100 transition hover:bg-blue-500/20"
                >
                  Cerrar
                </button>
              </div>
            </div>
            <div
              className={`overflow-auto bg-slate-950 px-4 py-6 ${
                isFullscreen ? 'h-[calc(100vh-120px)]' : 'max-h-[70vh]'
              }`}
            >
              {selectedPdf ? (
                <Document
                  file={selectedPdf}
                  onLoadSuccess={(doc) => {
                    setNumPages(doc.numPages)
                    setPageNumber(1)
                  }}
                  onLoadError={() =>
                    setError('No se pudo cargar el PDF seleccionado.')
                  }
                  loading={
                    <p className="text-sm text-blue-200/70">Cargando PDF...</p>
                  }
                >
                  <Page
                    pageNumber={pageNumber}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                    className="flex justify-center"
                  />
                </Document>
              ) : null}
            </div>
            <div className="flex items-center justify-between border-t border-blue-500/20 px-4 py-3 text-xs text-blue-200/70">
              <span>
                Página {pageNumber} de {numPages || 1}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pageNumber <= 1}
                  onClick={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
                  className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 font-semibold text-blue-100 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={pageNumber >= numPages}
                  onClick={() =>
                    setPageNumber((prev) => Math.min(prev + 1, numPages))
                  }
                  className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 font-semibold text-blue-100 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default PdfsPage
