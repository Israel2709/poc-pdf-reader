import { Navigate, Route, Routes } from 'react-router-dom'
import logo from './assets/VSM-Horizontal-Blanco copia.PNG'
import PdfsPage from './pages/PdfsPage.jsx'
import UploadPdfPage from './pages/UploadPdfPage.jsx'

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="border-b border-[#0094aa]/30 bg-gradient-to-r from-[#0094aa] via-[#1a7f95] to-[#5a2766]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="VenturesSoft"
              className="h-8 w-auto"
            />
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
