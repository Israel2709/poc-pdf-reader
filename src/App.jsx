import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import PdfsPage from './pages/PdfsPage.jsx'
import UploadPdfPage from './pages/UploadPdfPage.jsx'

const navLinkBase =
  'rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-400/40'

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="border-b border-blue-500/20 bg-gradient-to-r from-blue-950 via-indigo-950 to-purple-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="text-lg font-semibold tracking-wide text-blue-100">
            poc-pdf-read
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 px-2 py-1">
            <NavLink
              to="/pdfs"
              className={({ isActive }) =>
                `${navLinkBase} ${
                  isActive
                    ? 'bg-blue-500/30 text-blue-50'
                    : 'text-blue-100 hover:bg-blue-500/20'
                }`
              }
            >
              PDF&apos;s
            </NavLink>
            <NavLink
              to="/upload"
              className={({ isActive }) =>
                `${navLinkBase} ${
                  isActive
                    ? 'bg-purple-500/30 text-purple-50'
                    : 'text-purple-100 hover:bg-purple-500/20'
                }`
              }
            >
              Subir PDF
            </NavLink>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Routes>
          <Route path="/" element={<Navigate to="/pdfs" replace />} />
          <Route path="/pdfs" element={<PdfsPage />} />
          <Route path="/upload" element={<UploadPdfPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
