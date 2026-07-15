'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  MapPin,
  FileText,
  Package,
  ArrowLeft,
  Plus,
  ChevronRight,
  Star,
  Store,
  Calendar,
  Tag,
  Clock,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { api, getSessionId } from './AppShell'
import { HomeLoading } from './LoadingAnimation'

// ── Types ───────────────────────────────────────────────────────────────────

interface MercadoSummary {
  id: string
  nome: string
  cidade: string
  estado: string
  logoPath?: string | null
  destaque: boolean
  totalProdutos: number
  totalEncartes: number
}

interface EncarteDetail {
  id: string
  titulo: string
  pdfPath?: string | null
  dataInicio?: string | null
  dataFim?: string | null
  statusExtracao: string
  criadoEm: string
  _count: { produtos: number }
}

interface ProdutoDetail {
  id: string
  nome: string
  marca?: string | null
  preco: string
  unidade?: string | null
  encarteId: string
  mercadoId: string
}

interface MercadoDetail {
  id: string
  nome: string
  cidade: string
  estado: string
  endereco?: string | null
  telefone?: string | null
  status: string
  destaque: boolean
  encartes: EncarteDetail[]
  produtos: ProdutoDetail[]
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(/[\s]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pendente: 'Pendente',
    processando: 'Processando',
    concluido: 'Concluído',
    erro: 'Erro',
  }
  return map[status] || status
}

function statusVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'concluido') return 'default'
  if (status === 'erro') return 'destructive'
  if (status === 'processando') return 'secondary'
  return 'outline'
}

// ── Destaque Card ───────────────────────────────────────────────────────────

function DestaqueCard({
  m,
  onClick,
}: {
  m: MercadoSummary
  onClick: () => void
}) {
  return (
    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
      <Card
        className="min-w-[220px] max-w-[220px] cursor-pointer hover:shadow-lg transition-shadow border-red-50 bg-white"
        onClick={onClick}
      >
        <CardContent className="p-4 flex flex-col items-center gap-3 text-center">
          <div className="relative">
            <div className="h-14 w-14 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-lg">
              {getInitials(m.nome)}
            </div>
            <Badge className="absolute -top-2 -right-2 bg-amber-400 text-amber-900 text-[10px] px-1.5 py-0 border-0">
              <Star className="h-2.5 w-2.5 mr-0.5" />
              Patrocinado
            </Badge>
          </div>
          <div>
            <p className="font-semibold text-sm line-clamp-1">{m.nome}</p>
            <p className="text-xs text-gray-500 flex items-center justify-center gap-1 mt-1">
              <MapPin className="h-3 w-3" />
              {m.cidade}/{m.estado}
            </p>
          </div>
          <div className="flex gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" /> {m.totalEncartes}
            </span>
            <span className="flex items-center gap-1">
              <Package className="h-3 w-3" /> {m.totalProdutos}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ── Market Card (Grid) ──────────────────────────────────────────────────────

function MarketCard({
  m,
  onCatalogo,
  onProdutos,
}: {
  m: MercadoSummary
  onCatalogo: () => void
  onProdutos: () => void
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <Card className="hover:shadow-lg transition-all border-gray-100 bg-white h-full">
        <CardContent className="p-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {getInitials(m.nome)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{m.nome}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {m.cidade}/{m.estado}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-auto">
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {m.totalEncartes} encarte{m.totalEncartes !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              {m.totalProdutos} produto{m.totalProdutos !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs h-9"
              onClick={(e) => { e.stopPropagation(); onCatalogo() }}
            >
              <FileText className="h-3.5 w-3.5 mr-1" />
              Catálogo
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-red-600 border-red-200 hover:bg-orange-50 hover:text-red-700 text-xs h-9"
              onClick={(e) => { e.stopPropagation(); onProdutos() }}
            >
              <Package className="h-3.5 w-3.5 mr-1" />
              Lista de Itens
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ── Market Detail View ──────────────────────────────────────────────────────

function MarketDetailView({
  mercadoId,
  onBack,
  sessionId,
  onAddToList,
  initialMode = 'produtos',
}: {
  mercadoId: string
  onBack: () => void
  sessionId: string
  onAddToList: (item: {
    produtoId: string
    mercadoId: string
    nome: string
    marca?: string | null
    preco?: string | null
    unidade?: string | null
    mercadoNome?: string | null
    mercadoCidade?: string | null
  }) => void
  initialMode?: 'produtos' | 'catalogo'
}) {
  const [detail, setDetail] = useState<MercadoDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedEncarte, setExpandedEncarte] = useState<string | null>(null)
  const [encarteProducts, setEncarteProducts] = useState<
    Record<string, ProdutoDetail[]>
  >({})
  const [viewMode, setViewMode] = useState<'produtos' | 'catalogo'>(initialMode)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api<MercadoDetail>(`/api/mercados/${mercadoId}`)
      .then((d) => {
        if (!cancelled) setDetail(d)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [mercadoId])

  const loadEncarteProducts = useCallback(
    async (eid: string) => {
      if (encarteProducts[eid]) {
        setExpandedEncarte(expandedEncarte === eid ? null : eid)
        return
      }
      try {
        const prods = await api<ProdutoDetail[]>(
          `/api/mercado/encarte/${eid}/produtos`,
        )
        setEncarteProducts((prev) => ({ ...prev, [eid]: prods }))
        setExpandedEncarte(eid)
      } catch {
        /* ignore */
      }
    },
    [encarteProducts, expandedEncarte],
  )

  // Auto-load first PDF when catalogo mode
  useEffect(() => {
    if (viewMode === 'catalogo' && detail && !pdfUrl) {
      const firstPdf = detail.encartes.find((e) => e.pdfPath)
      if (firstPdf) {
        setPdfUrl(`/api/encarte/${firstPdf.id}/pdf`)
      }
    }
  }, [viewMode, detail, pdfUrl])

  const handleSwitchMode = useCallback((mode: 'produtos' | 'catalogo') => {
    setViewMode(mode)
    if (mode === 'catalogo' && detail) {
      const firstPdf = detail.encartes.find((e) => e.pdfPath)
      setPdfUrl(firstPdf ? `/api/encarte/${firstPdf.id}/pdf` : null)
    }
  }, [detail])

  const handleAdd = useCallback(
    (p: ProdutoDetail) => {
      api('/api/clique', {
        method: 'POST',
        body: JSON.stringify({
          produtoId: p.id,
          mercadoId: mercadoId,
          sessionId,
          tipo: 'produto',
        }),
      }).catch(() => {})
      onAddToList({
        produtoId: p.id,
        mercadoId: mercadoId,
        nome: p.nome,
        marca: p.marca,
        preco: p.preco,
        unidade: p.unidade,
        mercadoNome: detail?.nome,
        mercadoCidade: detail ? `${detail.cidade}/${detail.estado}` : undefined,
      })
    },
    [sessionId, mercadoId, detail, onAddToList],
  )

  if (loading) {
    return <HomeLoading />
  }

  if (error || !detail) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error || 'Mercado não encontrado'}</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
            {getInitials(detail.nome)}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate">{detail.nome}</h2>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {detail.cidade}/{detail.estado}
              {detail.endereco && ` · ${detail.endereco}`}
            </p>
            {detail.telefone && (
              <p className="text-xs text-gray-400 mt-0.5">{detail.telefone}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mode toggle: Lista de Itens / Catálogo PDF */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={viewMode === 'produtos' ? 'default' : 'outline'}
          className={cn(
            'flex-1 h-9 text-xs',
            viewMode === 'produtos'
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'text-gray-500 border-gray-200',
          )}
          onClick={() => handleSwitchMode('produtos')}
        >
          <Package className="h-3.5 w-3.5 mr-1" />
          Lista de Itens
        </Button>
        <Button
          size="sm"
          variant={viewMode === 'catalogo' ? 'default' : 'outline'}
          className={cn(
            'flex-1 h-9 text-xs',
            viewMode === 'catalogo'
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'text-gray-500 border-gray-200',
          )}
          onClick={() => handleSwitchMode('catalogo')}
        >
          <FileText className="h-3.5 w-3.5 mr-1" />
          Catálogo PDF
        </Button>
      </div>

      {/* PDF Catalog Viewer */}
      {viewMode === 'catalogo' && (
        <section>
          {pdfUrl ? (
            <>
              {/* Encarte selector if multiple */}
              {detail.encartes.filter((e) => e.pdfPath).length > 1 && (
                <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                  {detail.encartes.filter((e) => e.pdfPath).map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setPdfUrl(`/api/encarte/${e.id}/pdf`)}
                      className={cn(
                        'shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap',
                        pdfUrl === `/api/encarte/${e.id}/pdf`
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-red-300',
                      )}
                    >
                      {e.titulo}
                    </button>
                  ))}
                </div>
              )}
              <div className="bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                <iframe
                  src={pdfUrl}
                  className="w-full h-[70vh] min-h-[500px]"
                  title={`Catálogo ${detail.nome}`}
                />
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-gray-100">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum catálogo PDF disponível</p>
            </div>
          )}
        </section>
      )}

      {/* Products list (shown in produtos mode) */}
      {viewMode === 'produtos' && detail.produtos.length > 0 && (
        <section>
          <h3 className="font-semibold text-sm mb-3 text-gray-700 flex items-center gap-1.5">
            <Package className="h-4 w-4 text-red-600" />
            Produtos em promoção ({detail.produtos.length})
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {detail.produtos.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ backgroundColor: 'rgba(5,150,105,0.04)' }}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white border border-gray-100"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {p.nome}
                    {p.marca && (
                      <span className="text-gray-400 font-normal">
                        {' '}
                        · {p.marca}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    {p.unidade || 'un.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-red-600">
                    {p.preco}
                  </span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 text-red-600 border-red-200 hover:bg-orange-50"
                    onClick={() => handleAdd(p)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Encartes (only in produtos mode) */}
      {viewMode === 'produtos' && detail.encartes.length > 0 && (
        <section>
          <h3 className="font-semibold text-sm mb-3 text-gray-700 flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-red-600" />
            Encartes ({detail.encartes.length})
          </h3>
          <div className="space-y-2">
            {detail.encartes.map((e) => (
              <Card key={e.id} className="border-gray-100">
                <button
                  className="w-full text-left p-3 flex items-center justify-between"
                  onClick={() => loadEncarteProducts(e.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-red-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{e.titulo}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-400">
                          {e._count.produtos} produto
                          {e._count.produtos !== 1 ? 's' : ''}
                        </p>
                        {(e.dataInicio || e.dataFim) && (
                          <p className="text-[10px] text-gray-400 flex items-center gap-0.5">
                            <Calendar className="h-2.5 w-2.5" />
                            {formatDate(e.dataInicio)}
                            {(e.dataInicio || e.dataFim) && ' — '}
                            {formatDate(e.dataFim)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {e.pdfPath && (
                      <a
                        href={`/api/encarte/${e.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(ev) => ev.stopPropagation()}
                        className="text-[10px] bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-md font-medium"
                      >
                        Ver PDF
                      </a>
                    )}
                    <Badge
                      variant={statusVariant(e.statusExtracao)}
                      className="text-[10px]"
                    >
                      {statusLabel(e.statusExtracao)}
                    </Badge>
                    <motion.div
                      animate={{
                        rotate: expandedEncarte === e.id ? 90 : 0,
                      }}
                      transition={{ duration: 0.15 }}
                    >
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </motion.div>
                  </div>
                </button>
                <AnimatePresence>
                  {expandedEncarte === e.id &&
                    encarteProducts[e.id] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 space-y-1.5 border-t border-gray-50 pt-2">
                          {encarteProducts[e.id].map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between gap-2 py-1.5"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate">
                                  {p.nome}
                                  {p.marca && (
                                    <span className="text-gray-400 font-normal">
                                      {' '}
                                      · {p.marca}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-semibold text-red-600">
                                  {p.preco}
                                </span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-red-600"
                                  onClick={() => handleAdd(p)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                </AnimatePresence>
              </Card>
            ))}
          </div>
        </section>
      )}

      {detail.produtos.length === 0 && detail.encartes.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhuma promoção vigente no momento</p>
          <p className="text-xs mt-1">Volte em breve para conferir novas ofertas</p>
        </div>
      )}
    </div>
  )
}

// ── Search History (localStorage, 30 dias) ──────────────────────────────────

const SEARCH_HISTORY_KEY = 'eb_search_history'
const SEARCH_MAX_AGE = 30 * 24 * 60 * 60 * 1000 // 30 dias
const SEARCH_MAX_ITEMS = 8

interface SearchEntry { text: string; ts: number }

function loadSearchHistory(): SearchEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY)
    if (!raw) return []
    const entries: SearchEntry[] = JSON.parse(raw)
    const now = Date.now()
    // Remove entradas antigas (> 30 dias)
    const valid = entries.filter((e) => now - e.ts < SEARCH_MAX_AGE)
    // Dedup mantendo a mais recente
    const seen = new Set<string>()
    const deduped: SearchEntry[] = []
    for (const e of valid.sort((a, b) => b.ts - a.ts)) {
      const key = e.text.toLowerCase().trim()
      if (key && !seen.has(key)) {
        seen.add(key)
        deduped.push(e)
      }
    }
    return deduped.slice(0, SEARCH_MAX_ITEMS)
  } catch { return [] }
}

function saveSearchHistory(entries: SearchEntry[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(entries.slice(0, SEARCH_MAX_ITEMS)))
  } catch { /* ignore quota */ }
}

function addSearchTerm(text: string) {
  const trimmed = text.trim()
  if (!trimmed || trimmed.length < 2) return
  const entries = loadSearchHistory()
  const key = trimmed.toLowerCase()
  // Remove duplicata existente
  const filtered = entries.filter((e) => e.text.toLowerCase() !== key)
  filtered.unshift({ text: trimmed, ts: Date.now() })
  saveSearchHistory(filtered)
}

function removeSearchTerm(text: string) {
  const entries = loadSearchHistory().filter((e) => e.text !== text)
  saveSearchHistory(entries)
}

// ── HomeView ────────────────────────────────────────────────────────────────

interface HomeViewProps {
  sessionId: string
  onAddToList: (item: {
    produtoId: string
    mercadoId: string
    nome: string
    marca?: string | null
    preco?: string | null
    unidade?: string | null
    mercadoNome?: string | null
    mercadoCidade?: string | null
  }) => void
  onPainelMercado?: () => void
}

export default function HomeView({ sessionId, onAddToList, onPainelMercado }: HomeViewProps) {
  const [mercados, setMercados] = useState<MercadoSummary[]>([])
  const [destaques, setDestaques] = useState<MercadoSummary[]>([])
  const [maisBaratos, setMaisBaratos] = useState<any[]>([])
  const [searchProduto, setSearchProduto] = useState('')
  const [searchHistory, setSearchHistory] = useState<SearchEntry[]>([])
  const [searchMercado, setSearchMercado] = useState('')
  const [cityFilter, setCityFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [loadingProdutos, setLoadingProdutos] = useState(true)
  const [selectedMercado, setSelectedMercado] = useState<string | null>(null)
  const [detailMode, setDetailMode] = useState<'produtos' | 'catalogo'>('produtos')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load search history on mount
  useEffect(() => { setSearchHistory(loadSearchHistory()) }, [])

  // Fetch markets
  useEffect(() => {
    let cancelled = false
    api<{ mercados: MercadoSummary[]; destaques: MercadoSummary[] }>(
      '/api/mercados',
    )
      .then((d) => {
        if (!cancelled) {
          setMercados(d.mercados)
          setDestaques(d.destaques)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Fetch mais baratos (with optional search) + salva histórico
  useEffect(() => {
    let cancelled = false
    setLoadingProdutos(true)
    const q = searchProduto.trim() ? `&busca=${encodeURIComponent(searchProduto.trim())}` : ''
    api<{ produtos: any[] }>(`/api/produtos/mais-baratos?limit=30${q}`)
      .then((d) => {
        if (!cancelled) {
          setMaisBaratos(d.produtos || [])
          // Salva no histórico se a busca teve resultados e tem texto suficiente
          if (searchProduto.trim().length >= 2 && (d.produtos || []).length > 0) {
            addSearchTerm(searchProduto.trim())
            setSearchHistory(loadSearchHistory())
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingProdutos(false)
      })
    return () => {
      cancelled = true
    }
  }, [searchProduto])

  // Unique cities
  const cities = useMemo(() => {
    const set = new Set(mercados.map((m) => `${m.cidade}/${m.estado}`))
    return Array.from(set).sort()
  }, [mercados])

  // Filtered markets by name/city
  const filtered = useMemo(() => {
    let list = mercados
    if (cityFilter !== 'all') {
      list = list.filter(
        (m) => `${m.cidade}/${m.estado}` === cityFilter,
      )
    }
    if (searchMercado.trim()) {
      const q = searchMercado.toLowerCase().trim()
      list = list.filter(
        (m) =>
          m.nome.toLowerCase().includes(q) ||
          m.cidade.toLowerCase().includes(q) ||
          m.estado.toLowerCase().includes(q),
      )
    }
    return list
  }, [mercados, cityFilter, searchMercado])

  // Destaques that are NOT in the filtered list (to avoid duplicates)
  const destaquesUnicos = useMemo(() => {
    const ids = new Set(filtered.map((m) => m.id))
    return destaques.filter((d) => ids.has(d.id))
  }, [destaques, filtered])

  // ── Initial loading — show "buscando melhores produtos" animation ──
  // Only on first load while both mercados and produtos are being fetched
  if (loading && loadingProdutos) {
    return <HomeLoading />
  }

  // Registra visualização de mercado (fire-and-forget)
  const registrarVisualizacaoMercado = useCallback((mid: string) => {
    api('/api/clique', {
      method: 'POST',
      body: JSON.stringify({ mercadoId: mid, sessionId, tipo: 'mercado' }),
    }).catch(() => {})
  }, [sessionId])

  // Abre mercado + registra visualização
  const openMercado = useCallback((mid: string, mode: 'produtos' | 'catalogo' = 'produtos') => {
    setDetailMode(mode)
    setSelectedMercado(mid)
    registrarVisualizacaoMercado(mid)
  }, [registrarVisualizacaoMercado])

  // ── Detail mode ─────────────────────────────────────────────────────
  if (selectedMercado) {
    return (
      <MarketDetailView
        key={selectedMercado + detailMode}
        mercadoId={selectedMercado}
        onBack={() => setSelectedMercado(null)}
        sessionId={sessionId}
        onAddToList={onAddToList}
        initialMode={detailMode}
      />
    )
  }

  return (
    <div className="space-y-5">
      {/* Botão Painel do Mercado — visível para todos */}
      {onPainelMercado && (
        <button
          type="button"
          onClick={() => onPainelMercado()}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-orange-500 text-white text-sm font-semibold py-2.5 px-4 rounded-xl shadow-sm hover:shadow-md transition-shadow"
        >
          <Store className="h-4 w-4" />
          Painel do Mercado (CNPJ)
        </button>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SEÇÃO 1: Itens mais baratos em promoção (com busca por produto)
          ═══════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
          <Tag className="h-4 w-4 text-red-600" /> Itens mais baratos em promoção
        </h2>

        {/* Busca por produto */}
        <div className="relative mb-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar produto (ex: arroz, leite, feijão...)"
            className="pl-9 h-10"
            value={searchProduto}
            onChange={(e) => setSearchProduto(e.target.value)}
          />
        </div>

        {/* Últimas buscas */}
        {!searchProduto.trim() && searchHistory.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-3">
            <Clock className="h-3 w-3 text-gray-400 shrink-0" />
            <span className="text-[10px] text-gray-400 uppercase tracking-wide shrink-0">Últimas buscas</span>
            {searchHistory.slice(0, 6).map((entry) => (
              <motion.button
                key={entry.text}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSearchProduto(entry.text)}
                className="group flex items-center gap-1 bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-700 text-xs px-2.5 py-1 rounded-full transition-colors"
              >
                <span className="truncate max-w-[120px]">{entry.text}</span>
                <X
                  className="h-2.5 w-2.5 text-gray-300 group-hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={(e) => { e.stopPropagation(); removeSearchTerm(entry.text); setSearchHistory(loadSearchHistory()) }}
                />
              </motion.button>
            ))}
          </div>
        )}

        {loadingProdutos ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
        ) : maisBaratos.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {searchProduto
                ? 'Nenhum produto encontrado para esta busca'
                : 'Nenhum produto em promoção no momento'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {maisBaratos.slice(0, 12).map((p) => {
              const mId = p.mercado?.id || p.mercadoId || ''
              return (
              <motion.button
                key={p.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  // Registra clique do produto no BI
                  api('/api/clique', {
                    method: 'POST',
                    body: JSON.stringify({ produtoId: p.id, mercadoId: mId, sessionId, tipo: 'produto' }),
                  }).catch(() => {})
                  onAddToList({
                    produtoId: p.id,
                    mercadoId: mId,
                    nome: p.nome,
                    marca: p.marca,
                    preco: p.preco,
                    unidade: p.unidade,
                    mercadoNome: p.mercado?.nome,
                    mercadoCidade: p.mercado?.cidade ? `${p.mercado.cidade}/${p.mercado.estado}` : undefined,
                  })
                }}
                className="text-left bg-white border border-gray-200 rounded-lg p-2.5 hover:border-red-300 hover:shadow-sm transition-all relative group"
              >
                {/* Badget do mercado */}
                <p className="text-[10px] text-gray-400 truncate flex items-center gap-0.5">
                  <Store className="h-2.5 w-2.5" />
                  {p.mercado?.nome || '—'}
                </p>
                <p className="text-xs font-medium text-gray-800 leading-tight mt-0.5 line-clamp-2">
                  {p.nome}
                </p>
                {p.marca && (
                  <p className="text-[10px] text-gray-500 truncate">{p.marca}</p>
                )}
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-sm font-bold text-red-600">{p.preco}</p>
                  <Plus className="h-4 w-4 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {p.unidade && (
                  <p className="text-[10px] text-gray-400">{p.unidade}</p>
                )}
              </motion.button>
              )
            })}
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SEÇÃO 2: Mercados em destaque (patrocinados)
          ═══════════════════════════════════════════════════════════════ */}
      {destaquesUnicos.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
            <Star className="h-4 w-4 text-amber-500" /> Mercados em destaque
          </h2>
          <ScrollArea className="w-full" ref={scrollRef}>
            <div className="flex gap-4 pb-2">
              {destaquesUnicos.map((m) => (
                <DestaqueCard
                  key={m.id}
                  m={m}
                  onClick={() => openMercado(m.id)}
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SEÇÃO 3: Todos os mercados cadastrados (com busca e filtro por região)
          ═══════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
          <Store className="h-4 w-4 text-red-600" /> Mercados
        </h2>

        {/* Search + Region Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar mercado por nome..."
              className="pl-9 h-10"
              value={searchMercado}
              onChange={(e) => setSearchMercado(e.target.value)}
            />
          </div>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-full sm:w-[200px] h-10">
              <MapPin className="h-4 w-4 mr-2 text-gray-400" />
              <SelectValue placeholder="Todas as regiões" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as regiões</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Search className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nenhum mercado encontrado</p>
            <p className="text-xs mt-1">Tente ajustar os filtros de busca ou região</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((m) => (
              <MarketCard
                key={m.id}
                m={m}
                onCatalogo={() => openMercado(m.id, 'catalogo')}
                onProdutos={() => openMercado(m.id, 'produtos')}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}