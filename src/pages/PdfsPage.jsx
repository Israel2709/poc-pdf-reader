import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

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
  const pageContainerRef = useRef(null)
  const [pageWidth, setPageWidth] = useState(0)

  const fetchPdfs = useCallback(async () => {
    try {
      console.debug('[pdfs] fetching list')
      const response = await fetch('/api/pdfs')
      if (!response.ok) {
        throw new Error('No se pudieron cargar los PDFs.')
      }
      const data = await response.json()
      console.debug('[pdfs] received', data.length)
      setItems(data)
      setError('')
    } catch (err) {
      console.warn('[pdfs] fetch error', err)
      setError(
        err?.message || 'No se pudieron cargar los PDFs. Intenta más tarde.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPdfs()
  }, [fetchPdfs])

  useEffect(() => {
    let source
    const pollId = setInterval(fetchPdfs, 10000)

    try {
      source = new EventSource('/api/pdfs/stream')
      source.addEventListener('update', fetchPdfs)
      source.addEventListener('ready', fetchPdfs)
      source.onerror = () => {
        source.close()
      }
    } catch {
      // polling keeps the list updated when SSE is unavailable
    }

    return () => {
      if (source) source.close()
      clearInterval(pollId)
    }
  }, [fetchPdfs])

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

  useEffect(() => {
    if (!pageContainerRef.current) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setPageWidth(Math.floor(entry.contentRect.width))
      }
    })
    observer.observe(pageContainerRef.current)
    return () => observer.disconnect()
  }, [isViewerOpen, isFullscreen])

  return (
    <section>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg font-semibold text-[#0094aa] dark:text-[#7ed4e1]">
          Lista de PDFs disponibles ({filteredItems.length})
        </h2>
        <div className="w-full md:max-w-xs">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por título..."
            className="w-full rounded-lg border border-[#0094aa]/30 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0094aa] focus:outline-none focus:ring-2 focus:ring-[#0094aa]/30 dark:border-[#0094aa]/50 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400"
          />
        </div>
      </div>
      <div className="mt-6">
        {isLoading ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">Cargando PDFs...</p>
        ) : null}
        {error ? (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}
        {!isLoading && !error && filteredItems.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
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
                className="flex h-full flex-col rounded-lg border border-[#0094aa]/20 bg-white p-4 shadow-sm transition hover:border-[#0094aa]/60 hover:bg-[#f4fbfd] dark:border-[#0094aa]/40 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {item.title}
                    </h3>
                    {item.description ? (
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                  <span className="rounded-lg border border-[#0094aa]/30 bg-[#0094aa]/10 px-2 py-1 text-[11px] font-semibold text-[#0094aa] dark:border-[#0094aa]/40 dark:text-[#7ed4e1]">
                    PDF
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
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
                    className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-gradient-to-r from-[#0094aa] to-[#5a2766] px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-[#0094aa]/20 transition hover:from-[#00a8c2] hover:to-[#6b2c7a]"
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
          className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden bg-slate-900/70 p-4 dark:bg-black/70 sm:p-6"
          onClick={closeViewer}
        >
          <div
            ref={viewerRef}
            className={`relative flex w-full flex-col overflow-hidden border border-[#0094aa]/30 bg-white dark:border-[#0094aa]/40 dark:bg-slate-900 ${
              isFullscreen
                ? 'h-screen max-w-none rounded-none'
                : 'h-[calc(100vh-2rem)] max-w-4xl rounded-lg sm:h-[calc(100vh-3rem)]'
            }`}
            onClick={(event) => event.stopPropagation()}
            onContextMenu={(event) => event.preventDefault()}
          >
            <div className="flex flex-col gap-3 border-b border-[#0094aa]/20 px-4 py-3 md:flex-row md:items-center md:justify-between dark:border-[#0094aa]/30">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {selectedItem?.title || 'PDF'}
                </p>
                {selectedItem?.description ? (
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {selectedItem.description}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="rounded-lg border border-[#0094aa]/30 bg-[#0094aa]/10 px-3 py-1.5 text-xs font-semibold text-[#0094aa] transition hover:bg-[#0094aa]/20 dark:border-[#0094aa]/40 dark:text-[#7ed4e1]"
                >
                  {isFullscreen ? 'Salir pantalla completa' : 'Pantalla completa'}
                </button>
                <button
                  type="button"
                  onClick={closeViewer}
                  className="rounded-lg border border-[#5a2766]/30 bg-[#5a2766]/10 px-3 py-1.5 text-xs font-semibold text-[#5a2766] transition hover:bg-[#5a2766]/20 dark:border-[#5a2766]/40 dark:text-[#d7b3e2]"
                >
                  Cerrar
                </button>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              <div
                ref={pageContainerRef}
                className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 px-4 py-6 dark:bg-slate-950"
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
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        Cargando PDF...
                      </p>
                    }
                  >
                    <Page
                      pageNumber={pageNumber}
                      width={pageWidth || undefined}
                      renderAnnotationLayer={false}
                      renderTextLayer={false}
                      className="flex justify-center"
                    />
                  </Document>
                ) : null}
              </div>
              <div className="flex items-center justify-between border-t border-[#0094aa]/20 px-4 py-3 text-xs text-slate-600 dark:border-[#0094aa]/30 dark:text-slate-300">
              <span>
                Página {pageNumber} de {numPages || 1}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pageNumber <= 1}
                  onClick={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
                  className="rounded-lg border border-[#0094aa]/30 bg-[#0094aa]/10 px-3 py-1.5 font-semibold text-[#0094aa] transition hover:bg-[#0094aa]/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#0094aa]/40 dark:text-[#7ed4e1]"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={pageNumber >= numPages}
                  onClick={() =>
                    setPageNumber((prev) => Math.min(prev + 1, numPages))
                  }
                  className="rounded-lg border border-[#0094aa]/30 bg-[#0094aa]/10 px-3 py-1.5 font-semibold text-[#0094aa] transition hover:bg-[#0094aa]/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#0094aa]/40 dark:text-[#7ed4e1]"
                >
                  Siguiente
                </button>
              </div>
            </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default PdfsPage
