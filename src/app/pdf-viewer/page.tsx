'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, FileText, RotateCcw, Library } from 'lucide-react'

interface EncarteInfo {
  id: string
  titulo: string
}

/**
 * /pdf-viewer?id=ENCARTE_ID&ids=ID1,ID2,ID3
 *
 * Visualizador de PDF dentro do app usando pdf.js + canvas.
 * - Canvas renderizado 1x em alta resolução (sem flicker)
 * - Zoom via CSS transform (instantâneo)
 * - Pinch-to-zoom + drag-to-pan (mobile)
 * - Navegação entre múltiplos encartes
 * - Botão voltar usa history.back() (volta à página anterior)
 */
export default function PdfViewerPage() {
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [zoom, setZoom] = useState(1.0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderTaskRef = useRef<any>(null)

  // Pan
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const pinchStart = useRef({ dist: 0, zoom: 1 })

  // Múltiplos encartes
  const [encarteList, setEncarteList] = useState<EncarteInfo[]>([])
  const [currentEncarteIdx, setCurrentEncarteIdx] = useState(0)
  const [showEncarteSelector, setShowEncarteSelector] = useState(false)

  // Parse URL params
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const encarteId = params?.get('id')
  const allIds = params?.get('ids')?.split(',').filter(Boolean) || (encarteId ? [encarteId] : [])

  // Carrega lista de encartes (busca títulos via API)
  useEffect(() => {
    if (allIds.length > 0) {
      // Se só tem 1, não precisa buscar títulos
      if (allIds.length === 1) {
        setEncarteList([{ id: allIds[0], titulo: 'Catálogo' }])
        setCurrentEncarteIdx(0)
      } else {
        // Busca títulos de cada encarte
        Promise.all(allIds.map(async (id) => {
          try {
            const res = await fetch(`/api/mercados`)
            const data = await res.json()
            // Procura o encarte em todos os mercados
            for (const m of data.mercados || []) {
              const detail = await fetch(`/api/mercados/${m.id}`).then(r => r.json()).catch(() => null)
              const enc = detail?.encartes?.find((e: any) => e.id === id)
              if (enc) return { id, titulo: enc.titulo || 'Catálogo' }
            }
            return { id, titulo: 'Catálogo' }
          } catch {
            return { id, titulo: 'Catálogo' }
          }
        })).then((list) => {
          setEncarteList(list)
          const idx = list.findIndex(e => e.id === encarteId)
          setCurrentEncarteIdx(idx >= 0 ? idx : 0)
        })
      }
    }
  }, [])

  const currentEncarteId = encarteList[currentEncarteIdx]?.id || encarteId
  const pdfUrl = currentEncarteId ? `/api/encarte/${currentEncarteId}/pdf` : null

  // Carrega o PDF quando muda de encarte
  useEffect(() => {
    if (!pdfUrl) {
      setError('ID do encarte não fornecido')
      setLoading(true)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)

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
        setZoom(1.0)
        setPanX(0)
        setPanY(0)
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

  // Renderiza a página no canvas UMA VEZ em alta resolução (fixa em 2x)
  // Zoom é feito via CSS transform (instantâneo, sem flicker)
  const RENDER_SCALE = 2.0 // resolução fixa do canvas

  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current) return
    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel() } catch {}
    }
    const page = await pdfDoc.getPage(pageNum)
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    if (!context) return
    const viewport = page.getViewport({ scale: RENDER_SCALE })
    canvas.width = viewport.width
    canvas.height = viewport.height
    canvas.style.width = '100%'
    canvas.style.height = 'auto'
    const renderTask = page.render({ canvasContext: context, viewport })
    renderTaskRef.current = renderTask
    await renderTask.promise
  }, [pdfDoc])

  useEffect(() => {
    if (pdfDoc && !loading) {
      renderPage(currentPage)
    }
  }, [pdfDoc, currentPage, loading, renderPage])

  // ── Touch handlers (mobile) ──
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true)
      dragStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        panX, panY,
      }
    } else if (e.touches.length === 2) {
      setIsDragging(false)
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchStart.current = { dist: Math.sqrt(dx * dx + dy * dy), zoom }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      e.preventDefault()
      const dx = e.touches[0].clientX - dragStart.current.x
      const dy = e.touches[0].clientY - dragStart.current.y
      setPanX(dragStart.current.panX + dx)
      setPanY(dragStart.current.panY + dy)
    } else if (e.touches.length === 2) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (pinchStart.current.dist > 0) {
        const ratio = dist / pinchStart.current.dist
        const newZoom = Math.max(0.5, Math.min(6, pinchStart.current.zoom * ratio))
        setZoom(newZoom)
      }
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) setIsDragging(false)
  }

  // ── Mouse handlers (desktop) ──
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1.0) return
    setIsDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, panX, panY }
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1.0) return
    e.preventDefault()
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    setPanX(dragStart.current.panX + dx)
    setPanY(dragStart.current.panY + dy)
  }
  const handleMouseUp = () => setIsDragging(false)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    setZoom(z => Math.max(0.5, Math.min(6, z + (e.deltaY > 0 ? -0.3 : 0.3))))
  }

  // ── Navegação ──
  const goPrev = () => { if (currentPage > 1) { setCurrentPage(currentPage - 1); setPanX(0); setPanY(0) } }
  const goNext = () => { if (currentPage < totalPages) { setCurrentPage(currentPage + 1); setPanX(0); setPanY(0) } }
  const zoomIn = () => setZoom(z => Math.min(z + 0.5, 6))
  const zoomOut = () => setZoom(z => Math.max(z - 0.5, 0.5))
  const resetView = () => { setZoom(1.0); setPanX(0); setPanY(0) }

  const switchEncarte = (idx: number) => {
    setCurrentEncarteIdx(idx)
    setShowEncarteSelector(false)
  }

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back()
    } else {
      window.location.href = '/'
    }
  }

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
        <button onClick={goBack} className="text-xs text-red-600 hover:underline">Voltar</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Toolbar */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-md">
        <div className="px-3 h-12 flex items-center justify-between gap-2">
          {/* Voltar (history.back) */}
          <button onClick={goBack} className="flex items-center gap-1 text-sm font-medium hover:bg-white/20 px-2 py-1 rounded transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Seletor de encarte (se múltiplos) */}
          {encarteList.length > 1 && (
            <button
              onClick={() => setShowEncarteSelector(!showEncarteSelector)}
              className="flex items-center gap-1 text-xs font-medium hover:bg-white/20 px-2 py-1 rounded transition-colors truncate max-w-[120px]"
            >
              <Library className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{encarteList[currentEncarteIdx]?.titulo}</span>
            </button>
          )}

          {/* Páginas */}
          <div className="flex items-center gap-1.5">
            <button onClick={goPrev} disabled={currentPage <= 1}
              className="p-1.5 rounded hover:bg-white/20 disabled:opacity-30 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-medium min-w-[45px] text-center">
              {currentPage}/{totalPages}
            </span>
            <button onClick={goNext} disabled={currentPage >= totalPages}
              className="p-1.5 rounded hover:bg-white/20 disabled:opacity-30 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-1">
            <button onClick={zoomOut} className="p-1.5 rounded hover:bg-white/20 transition-colors">
              <ZoomOut className="h-4 w-4" />
            </button>
            <button onClick={resetView} className="text-xs px-1 min-w-[30px] text-center hover:bg-white/20 rounded py-1.5">
              {Math.round(zoom * 100)}%
            </button>
            <button onClick={zoomIn} className="p-1.5 rounded hover:bg-white/20 transition-colors">
              <ZoomIn className="h-4 w-4" />
            </button>
            {(zoom !== 1.0 || panX !== 0 || panY !== 0) && (
              <button onClick={resetView} className="p-1.5 rounded hover:bg-white/20 transition-colors">
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Dropdown de encartes */}
        {showEncarteSelector && encarteList.length > 1 && (
          <div className="absolute top-12 left-0 right-0 bg-white shadow-lg max-h-60 overflow-y-auto z-50">
            {encarteList.map((enc, idx) => (
              <button
                key={enc.id}
                onClick={() => switchEncarte(idx)}
                className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 transition-colors ${
                  idx === currentEncarteIdx ? 'bg-red-50 text-red-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                  <span className="truncate">{enc.titulo}</span>
                  {idx === currentEncarteIdx && (
                    <span className="ml-auto text-xs text-red-600">✓</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* PDF Canvas — container com pan/zoom */}
      <div
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
          touchAction: 'none',
          cursor: zoom > 1.0 ? (isDragging ? 'grabbing' : 'grab') : 'default',
        }}
      >
        <canvas
          ref={canvasRef}
          className="shadow-lg rounded-lg bg-white"
          style={{
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
            transformOrigin: 'center center',
            maxWidth: '100%',
            height: 'auto',
            // Sem transition durante drag (mais responsivo)
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
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
