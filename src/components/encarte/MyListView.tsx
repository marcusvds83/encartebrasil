'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  MapPin,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { api } from './AppShell'
import { toast } from 'sonner'

// ── Types ───────────────────────────────────────────────────────────────────

interface ListaItem {
  id: string
  sessionId: string
  produtoId?: string | null
  mercadoId?: string | null
  nome: string
  marca?: string | null
  preco?: string | null
  unidade?: string | null
  checked: boolean
  mercadoNome?: string | null
  mercadoCidade?: string | null
  criadoEm: string
}

// ── Helpers (todas defensivos — nunca lançam) ──────────────────────────────

function parsePreco(preco: unknown): number {
  try {
    if (!preco || typeof preco !== 'string') return 0
    const cleaned = preco.replace(/[^\d,]/g, '').replace(',', '.')
    const n = parseFloat(cleaned)
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

function formatBRL(val: number): string {
  try {
    if (!Number.isFinite(val)) val = 0
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  } catch {
    return 'R$ 0,00'
  }
}

/** Remove "/UF" do final de uma string de cidade — defensivo */
function limparCidade(cidade: unknown): string {
  try {
    if (typeof cidade !== 'string' || !cidade) return ''
    return cidade.replace(/\/[A-Z]{2}$/, '')
  } catch {
    return ''
  }
}

/** Garante que qualquer valor vira string segura para render */
function safeStr(v: unknown, fallback = ''): string {
  if (v === null || v === undefined) return fallback
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  try {
    return JSON.stringify(v)
  } catch {
    return fallback
  }
}

// ── Component ───────────────────────────────────────────────────────────────

interface MyListViewProps {
  sessionId: string
  refreshKey?: number // quando muda, recarrega a lista
}

export default function MyListView({ sessionId, refreshKey = 0 }: MyListViewProps) {
  const [items, setItems] = useState<ListaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [qty, setQty] = useState<Record<string, number>>({})

  // Fetch list
  const fetchList = useCallback(async () => {
    try {
      if (!sessionId || sessionId === 'server') {
        setError('Sessão não encontrada. Faça login novamente.')
        setLoading(false)
        return
      }
      const data = await api<ListaItem[]>(
        `/api/lista?sessionId=${encodeURIComponent(sessionId)}`,
      )
      // Garante que data é um array (pode vir como { erro: '...' } se API falhar)
      const safeItems = Array.isArray(data) ? data.filter((it) => it && it.id) : []
      setItems(safeItems)
      // Initialize quantities
      const q: Record<string, number> = {}
      for (const item of safeItems) {
        if (item && item.id) q[item.id] = 1
      }
      setQty(q)
      setError(null)
    } catch (e) {
      console.error('[MyListView] erro ao carregar:', e)
      setError(e instanceof Error ? e.message : 'Erro ao carregar lista')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    fetchList()
  }, [fetchList, refreshKey])

  // Group by mercadoNome, coleta cidades únicas por grupo
  const grouped = useMemo(() => {
    if (!items || !Array.isArray(items)) return {}
    const groups: Record<string, { items: ListaItem[]; cidades: Set<string> }> = {}
    for (const item of items) {
      if (!item || !item.id) continue
      const key = safeStr(item.mercadoNome, 'Outros') || 'Outros'
      if (!groups[key]) groups[key] = { items: [], cidades: new Set() }
      groups[key].items.push(item)
      const cidade = item.mercadoCidade
      if (typeof cidade === 'string' && cidade) groups[key].cidades.add(cidade)
    }
    return groups
  }, [items])

  // Estimated total (only unchecked items)
  const estimatedTotal = useMemo(() => {
    if (!items || !Array.isArray(items)) return 0
    let total = 0
    for (const item of items) {
      if (!item || item.checked) continue
      total += parsePreco(item.preco) * (qty[item.id] || 1)
    }
    return Number.isFinite(total) ? total : 0
  }, [items, qty])

  // Toggle check
  const toggleCheck = useCallback(
    async (id: string) => {
      if (!id) return
      const prev = [...items]
      setItems((list) =>
        (list || []).map((i) => (i && i.id === id ? { ...i, checked: !i.checked } : i)),
      )
      try {
        await api(`/api/lista?id=${encodeURIComponent(id)}`, { method: 'PUT' })
      } catch {
        setItems(prev)
        toast.error('Erro ao atualizar item')
      }
    },
    [items],
  )

  // Delete item
  const deleteItem = useCallback(
    async (id: string) => {
      if (!id) return
      const prev = [...items]
      setItems((list) => (list || []).filter((i) => i && i.id !== id))
      setQty((q) => {
        const next = { ...q }
        delete next[id]
        return next
      })
      try {
        await api(`/api/lista?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
        toast.success('Item removido')
      } catch {
        setItems(prev)
        toast.error('Erro ao remover item')
      }
    },
    [items],
  )

  // Clear all
  const clearAll = useCallback(async () => {
    if (!items || items.length === 0) return
    try {
      await Promise.all(
        items.map((i) =>
          api(`/api/lista?id=${encodeURIComponent(i.id)}`, { method: 'DELETE' }),
        ),
      )
      setItems([])
      setQty({})
      toast.success('Lista limpa')
    } catch {
      toast.error('Erro ao limpar lista')
    }
  }, [items])

  // Quantity change
  const changeQty = useCallback((id: string, delta: number) => {
    setQty((prev) => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta),
    }))
  }, [])

  // ── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="h-10 w-10 mx-auto mb-3 text-red-400" />
        <p className="text-sm text-red-500">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchList}
          className="mt-3"
        >
          Tentar novamente
        </Button>
      </div>
    )
  }

  // ── Empty ────────────────────────────────────────────────────────────
  if (!items || items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-20"
      >
        <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <ShoppingCart className="h-8 w-8 text-gray-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-700 mb-1">
          Sua lista está vazia
        </h2>
        <p className="text-sm text-gray-400 max-w-sm mx-auto">
          Adicione produtos dos encartes para montar sua lista de compras e
          comparar preços.
        </p>
      </motion.div>
    )
  }

  // ── List — render envolto em try/catch para capturar QUALQUER crash ───
  try {
    const groupedEntries = Object.entries(grouped)
    const uncheckedCount = (items || []).filter((i) => i && !i.checked).length

    // Monta waypoints (defensivo — nunca lança)
    const waypoints = groupedEntries.map(([nome, g]) => {
      const cidadeRaw = g?.cidades ? [...g.cidades][0] : ''
      const cidadeLimpa = limparCidade(cidadeRaw)
      const nomeSeguro = safeStr(nome)
      return cidadeLimpa ? `${nomeSeguro}, ${cidadeLimpa}` : nomeSeguro
    })

    const mapsUrl = waypoints.length === 1
      ? `https://www.google.com/maps/search/${encodeURIComponent(waypoints[0])}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(waypoints[waypoints.length - 1])}&waypoints=${encodeURIComponent(waypoints.slice(0, -1).join('|'))}&travelmode=driving`

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Minha Lista</h2>
            <p className="text-sm text-gray-500">
              {items.length} item{items.length !== 1 ? 's' : ''} ·{' '}
              {groupedEntries.length} mercado
              {groupedEntries.length !== 1 ? 's' : ''}
            </p>
          </div>
          {items.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Limpar tudo
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Limpar lista inteira?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação removerá todos os {items.length} itens da sua lista
                    de compras. Não é possível desfazer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={clearAll}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    Limpar tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Botão: Rota dos mercados no Google Maps */}
        {groupedEntries.length > 0 && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-red-600 to-orange-500 text-white text-sm font-semibold py-3 px-4 rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <MapPin className="h-4 w-4" />
            Ver rota dos mercados ({groupedEntries.length} {groupedEntries.length === 1 ? 'mercado' : 'mercados'})
          </a>
        )}

        {/* Grouped items */}
        <div className="space-y-4 pb-20">
          {groupedEntries.map(([market, group]) => {
            // Defensivo: garante que group é um objeto válido
            if (!group || !group.items || !Array.isArray(group.items)) return null
            const cidadesArr = group.cidades instanceof Set ? [...group.cidades] : []
            const primeiraCidade = cidadesArr[0]
            const cidadeLimpa = limparCidade(primeiraCidade)
            return (
              <motion.div
                key={safeStr(market, 'outros')}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {/* Group header */}
                <div className="flex items-center gap-2 mb-2 px-1">
                  <MapPin className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">
                    {safeStr(market, 'Outros')}
                  </span>
                  {primeiraCidade && (
                    <span className="text-[10px] text-gray-400">{safeStr(primeiraCidade)}</span>
                  )}
                  <Badge variant="secondary" className="text-[10px] px-1.5">
                    {group.items.length}
                  </Badge>
                  {/* Link individual para este mercado no Maps */}
                  {cidadeLimpa && (
                    <a
                      href={`https://www.google.com/maps/search/${encodeURIComponent(
                        `${safeStr(market)}, ${cidadeLimpa}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-[10px] text-orange-500 hover:text-orange-700 underline underline-offset-2"
                    >
                      Maps
                    </a>
                  )}
                </div>

                <Card className="border-gray-100 divide-y divide-gray-50">
                  {group.items.map((item) => {
                    if (!item || !item.id) return null
                    const itemQty = qty[item.id] || 1
                    const subtotal = parsePreco(item.preco) * itemQty
                    return (
                      <AnimatePresence key={item.id} mode="popLayout">
                        <motion.div
                          layout
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              {/* Checkbox */}
                              <Checkbox
                                checked={!!item.checked}
                                onCheckedChange={() => toggleCheck(item.id)}
                                className="shrink-0 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                              />

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <p
                                  className={cn(
                                    'text-sm font-medium truncate',
                                    item.checked && 'line-through text-gray-400',
                                  )}
                                >
                                  {safeStr(item.nome, 'Item')}
                                  {item.marca && (
                                    <span className="text-gray-400 font-normal text-xs ml-1.5">
                                      {safeStr(item.marca)}
                                    </span>
                                  )}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {item.preco && (
                                    <span
                                      className={cn(
                                        'text-xs',
                                        item.checked
                                          ? 'text-gray-300'
                                          : 'text-red-600 font-semibold',
                                      )}
                                    >
                                      {safeStr(item.preco)}
                                    </span>
                                  )}
                                  {item.unidade && (
                                    <span className="text-[10px] text-gray-400">
                                      {safeStr(item.unidade)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Quantity */}
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 text-gray-500"
                                  onClick={() => changeQty(item.id, -1)}
                                  disabled={itemQty <= 1}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-6 text-center text-sm font-semibold">
                                  {itemQty}
                                </span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 text-gray-500"
                                  onClick={() => changeQty(item.id, 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>

                              {/* Subtotal */}
                              {item.preco && (
                                <span
                                  className={cn(
                                    'text-xs font-bold w-16 text-right shrink-0',
                                    item.checked
                                      ? 'text-gray-300'
                                      : 'text-gray-700',
                                  )}
                                >
                                  {formatBRL(subtotal)}
                                </span>
                              )}

                              {/* Delete */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-gray-300 hover:text-red-500 hover:bg-red-50 shrink-0"
                                onClick={() => deleteItem(item.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </CardContent>
                        </motion.div>
                      </AnimatePresence>
                    )
                  })}
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* Sticky total bar */}
        <div className="fixed bottom-16 lg:bottom-4 left-0 right-0 z-40 pointer-events-none">
          <div className="max-w-[calc(100%-2rem)] mx-auto">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="pointer-events-auto bg-white border border-red-200 rounded-xl shadow-lg px-4 py-3 flex items-center justify-between"
            >
              <div>
                <p className="text-xs text-gray-500">Total estimado</p>
                <p className="text-lg font-bold text-red-700">
                  {formatBRL(estimatedTotal)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">
                  {uncheckedCount} item
                  {uncheckedCount !== 1 ? 's' : ''}{' '}
                  pendente
                  {uncheckedCount !== 1 ? 's' : ''}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    )
  } catch (err) {
    // Captura QUALQUER erro de renderização que não foi pego pelas proteções acima
    console.error('[MyListView] erro durante render:', err)
    return (
      <div className="text-center py-16">
        <AlertCircle className="h-10 w-10 mx-auto mb-3 text-red-400" />
        <p className="text-sm text-red-500">
          {err instanceof Error ? err.message : 'Erro ao exibir lista'}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchList}
          className="mt-3"
        >
          Tentar novamente
        </Button>
      </div>
    )
  }
}
