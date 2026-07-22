'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, FileText, RotateCcw } from 'lucide-react'

/**
 * /pdf-viewer?id=ENCARTE_ID
 *
 * Visualizador de PDF dentro do app (WebView) usando pdf.js + canvas.
 * Suporta: pinch-to-zoom (mobile), drag-to-pan, botões de zoom, navegação.
 */
export default function PdfViewerPage() {
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1.0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const renderTaskRef = useRef<any>(null)

  // Pan state
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  // Pinch state
  const pinchStart = useRef({ dist: 0, scale: 1 })

  const encarteId = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('id')
    : null
  const pdfUrl = encarteId ? `/api/encarte/${encarteId}/pdf` : null

  // Carrega o PDF
  useEffect(() => {
    if (!pdfUrl) {
      setError('ID do encarte não fornecido')
      setLoading(false)
      return
    }
    let cancelled = false
    const loadPdf = async () => {
      try {
        if (!(window as any).pdfjsLib) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script')
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
            script.onload = () => resolve()
            script.onerror = () => reject(new Error('Falha ao carregar pdf.js'))
            document.head.appendChild(script)
          })
        }
        const lib = (window as any).pdfjsLib
        lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        const loadingTask = lib.getDocument(pdfUrl)
        const doc = await loadingTask.promise
        if (cancelled) return
        setPdfDoc(doc)
        setTotalPages(doc.numPages)
        setCurrentPage(1)
        setLoading(false)
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Erro ao carregar PDF')
          setLoading(false)
        }
      }
    }
    loadPdf()
    return () => { cancelled = true }
  }, [pdfUrl])

  // Renderiza página
  const renderPage = useCallback(async (pageNum: number, renderScale: number) => {
    if (!pdfDoc || !canvasRef.current) return
    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel() } catch {}
    }
    const page = await pdfDoc.getPage(pageNum)
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    if (!context) return
    const viewport = page.getViewport({ scale: renderScale })
    canvas.width = viewport.width
    canvas.height = viewport.height
    const renderTask = page.render({ canvasContext: context, viewport })
    renderTaskRef.current = renderTask
    await renderTask.promise
  }, [pdfDoc])

  useEffect(() => {
    if (pdfDoc && !loading) {
      renderPage(currentPage, scale)
      // Reset pan quando muda de página ou zoom
      setPanX(0)
      setPanY(0)
    }
  }, [pdfDoc, currentPage, scale, loading, renderPage])

  // ── Touch handlers (mobile) ──
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Início de drag (pan)
      setIsDragging(true)
      dragStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        panX,
        panY,
      }
    } else if (e.touches.length === 2) {
      // Início de pinch (zoom)
      setIsDragging(false)
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchStart.current = {
        dist: Math.sqrt(dx * dx + dy * dy),
        scale,
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      // Pan (mover com 1 dedo)
      e.preventDefault()
      const dx = e.touches[0].clientX - dragStart.current.x
      const dy = e.touches[0].clientY - dragStart.current.y
      setPanX(dragStart.current.panX + dx)
      setPanY(dragStart.current.panY + dy)
    } else if (e.touches.length === 2) {
      // Pinch (zoom com 2 dedos)
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (pinchStart.current.dist > 0) {
        const ratio = dist / pinchStart.current.dist
        const newScale = Math.max(0.5, Math.min(5, pinchStart.current.scale * ratio))
        setScale(newScale)
      }
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsDragging(false)
    }
  }

  // ── Mouse handlers (desktop) ──
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1.0) return
    setIsDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, panX, panY }
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1.0) return
    e.preventDefault()
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    setPanX(dragStart.current.panX + dx)
    setPanY(dragStart.current.panY + dy)
  }
  const handleMouseUp = () => setIsDragging(false)

  // ── Wheel zoom (desktop) ──
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.2 : 0.2
    setScale(s => Math.max(0.5, Math.min(5, s + delta)))
  }

  const goPrev = () => { if (currentPage > 1) setCurrentPage(currentPage - 1) }
  const goNext = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1) }
  const zoomIn = () => setScale(s => Math.min(s + 0.5, 5))
  const zoomOut = () => setScale(s => Math.max(s - 0.5, 0.5))
  const resetZoom = () => { setScale(1.0); setPanX(0); setPanY(0) }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
        <Loader2 className="h-10 w-10 text-red-600 animate-spin" />
        <p className="text-sm text-gray-500">Carregando catálogo...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4 p-6">
        <FileText className="h-12 w-12 text-red-600" />
        <p className="text-sm text-red-500 text-center">{error}</p>
        <a href="/" className="text-xs text-red-600 hover:underline">Voltar ao início</a>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Toolbar */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-3 h-12 flex items-center justify-between gap-2">
          <a href="/" className="flex items-center gap-1 text-sm font-medium hover:bg-white/20 px-2 py-1 rounded transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </a>

          <div className="flex items-center gap-1.5">
            <button onClick={goPrev} disabled={currentPage <= 1}
              className="p-1.5 rounded hover:bg-white/20 disabled:opacity-30 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-medium min-w-[50px] text-center">
              {currentPage}/{totalPages}
            </span>
            <button onClick={goNext} disabled={currentPage >= totalPages}
              className="p-1.5 rounded hover:bg-white/20 disabled:opacity-30 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={zoomOut} className="p-1.5 rounded hover:bg-white/20 transition-colors">
              <ZoomOut className="h-4 w-4" />
            </button>
            <button onClick={resetZoom} className="text-xs px-1 min-w-[35px] text-center hover:bg-white/20 rounded py-1.5">
              {Math.round(scale * 100)}%
            </button>
            <button onClick={zoomIn} className="p-1.5 rounded hover:bg-white/20 transition-colors">
              <ZoomIn className="h-4 w-4" />
            </button>
            {(scale !== 1.0 || panX !== 0 || panY !== 0) && (
              <button onClick={resetZoom} className="p-1.5 rounded hover:bg-white/20 transition-colors">
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PDF Canvas — container com scroll/pan */}
      <div
        ref={containerRef}
        className="flex-1 flex justify-center items-start py-4 px-2 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          touchAction: 'none', // CRÍTICO: permite touch custom sem scroll nativo
          cursor: scale > 1.0 ? (isDragging ? 'grabbing' : 'grab') : 'default',
        }}
      >
        <canvas
          ref={canvasRef}
          className="shadow-lg rounded-lg bg-white"
          style={{
            transform: `translate(${panX}px, ${panY}px)`,
            transformOrigin: 'center center',
            maxWidth: '100%',
            height: 'auto',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
        />
      </div>

      {/* Navegação inferior (mobile) */}
      <div className="sticky bottom-0 z-50 bg-white border-t border-gray-200 lg:hidden">
        <div className="flex items-center justify-between px-4 h-12">
          <button onClick={goPrev} disabled={currentPage <= 1}
            className="flex items-center gap-1 text-sm font-medium text-red-600 disabled:opacity-30">
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>
          <span className="text-xs text-gray-500">{currentPage} de {totalPages}</span>
          <button onClick={goNext} disabled={currentPage >= totalPages}
            className="flex items-center gap-1 text-sm font-medium text-red-600 disabled:opacity-30">
            Próxima
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
