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
  onClick,
}: {
  m: MercadoSummary
  onClick: () => void
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <Card
        className="cursor-pointer hover:shadow-lg transition-all border-gray-100 bg-white h-full"
        onClick={onClick}
      >
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
          <Button
            size="sm"
            variant="outline"
            className="w-full text-red-600 border-red-200 hover:bg-orange-50 hover:text-red-700 text-xs h-8"
          >
            Ver encarte
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
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
  }) => void
}) {
  const [detail, setDetail] = useState<MercadoDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedEncarte, setExpandedEncarte] = useState<string | null>(null)
  const [encarteProducts, setEncarteProducts] = useState<
    Record<string, ProdutoDetail[]>
  >({})

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

  const handleAdd = useCallback(
    (p: ProdutoDetail) => {
      api('/api/clique', {
        method: 'POST',
        body: JSON.stringify({
          produtoId: p.id,
          mercadoId: mercadoId,
          sessionId,
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
      })
    },
    [sessionId, mercadoId, detail?.nome, onAddToList],
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-60 w-full rounded-xl" />
      </div>
    )
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
          <div>
            <h2 className="text-lg font-bold">{detail.nome}</h2>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {detail.cidade}/{detail.estado}
              {detail.endereco && ` · ${detail.endereco}`}
            </p>
            {detail.telefone && (
              <p className="text-xs text-gray-400 mt-0.5">{detail.telefone}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Products */}
      {detail.produtos.length > 0 && (
        <section>
          <h3 className="font-semibold text-sm mb-3 text-gray-700">
            Produtos ({detail.produtos.length})
          </h3>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
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

      {/* Encartes */}
      {detail.encartes.length > 0 && (
        <section>
          <h3 className="font-semibold text-sm mb-3 text-gray-700">
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
                      <p className="text-xs text-gray-400">
                        {e._count.produtos} produto
                        {e._count.produtos !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
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
          <p className="text-sm">Nenhum encarte ou produto disponível</p>
        </div>
      )}
    </div>
  )
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
  }) => void
  onPainelMercado?: () => void
}

export default function HomeView({ sessionId, onAddToList, onPainelMercado }: HomeViewProps) {
  const [mercados, setMercados] = useState<MercadoSummary[]>([])
  const [destaques, setDestaques] = useState<MercadoSummary[]>([])
  const [search, setSearch] = useState('')
  const [cityFilter, setCityFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [selectedMercado, setSelectedMercado] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

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

  // Unique cities
  const cities = useMemo(() => {
    const set = new Set(mercados.map((m) => `${m.cidade}/${m.estado}`))
    return Array.from(set).sort()
  }, [mercados])

  // Filtered markets
  const filtered = useMemo(() => {
    let list = mercados
    if (cityFilter !== 'all') {
      list = list.filter(
        (m) => `${m.cidade}/${m.estado}` === cityFilter,
      )
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter(
        (m) =>
          m.nome.toLowerCase().includes(q) ||
          m.cidade.toLowerCase().includes(q) ||
          m.estado.toLowerCase().includes(q),
      )
    }
    return list
  }, [mercados, cityFilter, search])

  // ── Detail mode ─────────────────────────────────────────────────────
  if (selectedMercado) {
    return (
      <MarketDetailView
        key={selectedMercado}
        mercadoId={selectedMercado}
        onBack={() => setSelectedMercado(null)}
        sessionId={sessionId}
        onAddToList={onAddToList}
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

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar mercado por nome ou cidade..."
            className="pl-9 h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-full sm:w-[200px] h-10">
            <MapPin className="h-4 w-4 mr-2 text-gray-400" />
            <SelectValue placeholder="Todas as cidades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as cidades</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Destaques */}
      {destaques.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
            <Star className="h-4 w-4 text-amber-500" /> Destaques
          </h2>
          <ScrollArea className="w-full" ref={scrollRef}>
            <div className="flex gap-4 pb-2">
              {destaques.map((m) => (
                <DestaqueCard
                  key={m.id}
                  m={m}
                  onClick={() => setSelectedMercado(m.id)}
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>
      )}

      {/* Market Grid */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Mercados ({filtered.length})
        </h2>

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
            <p className="text-xs mt-1">Tente ajustar os filtros</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((m) => (
              <MarketCard
                key={m.id}
                m={m}
                onClick={() => setSelectedMercado(m.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}