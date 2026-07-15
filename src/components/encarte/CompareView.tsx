'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { TrendingDown, Store, Tag, Loader2, Plus, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { api } from './AppShell'
import { toast } from 'sonner'
import { CompareLoading } from './LoadingAnimation'

// ── Types ───────────────────────────────────────────────────────────────────

interface CompararProduto {
  id: string
  nome: string
  marca?: string | null
  preco: string
  precoNum: number
  unidade?: string | null
  mercado: { id: string; nome: string; cidade: string; estado: string }
}

interface Comparacao {
  normalizado: string
  nome: string
  produtos: CompararProduto[]
}

// ── Component ───────────────────────────────────────────────────────────────

interface CompareViewProps {
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
}

export default function CompareView({ sessionId, onAddToList }: CompareViewProps) {
  const [addingId, setAddingId] = useState<string | null>(null)
  const [comparacoes, setComparacoes] = useState<Comparacao[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api<{ comparacoes: Comparacao[] }>('/api/comparar')
      .then((d) => {
        if (!cancelled) setComparacoes(d.comparacoes)
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
  }, [])

  const handleAdd = useCallback(async (p: CompararProduto) => {
    setAddingId(p.id)
    try {
      await api('/api/clique', {
        method: 'POST',
        body: JSON.stringify({ produtoId: p.id, mercadoId: p.mercado.id, sessionId }),
      })
    } catch { /* ignore */ }
    onAddToList({
      produtoId: p.id,
      mercadoId: p.mercado.id,
      nome: p.nome,
      marca: p.marca,
      preco: p.preco,
      unidade: p.unidade,
      mercadoNome: p.mercado.nome,
      mercadoCidade: p.mercado.cidade ? `${p.mercado.cidade}/${p.mercado.estado}` : undefined,
    })
    toast.success(`"${p.nome}" adicionado à lista`)
    setTimeout(() => setAddingId(null), 1200)
  }, [sessionId, onAddToList])

  // ── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return <CompareLoading />
  }

  // ── Error ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="text-center py-16 text-gray-400">
        <TrendingDown className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm text-red-500">{error}</p>
      </div>
    )
  }

  // ── Empty ────────────────────────────────────────────────────────────
  if (comparacoes.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-20"
      >
        <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <TrendingDown className="h-8 w-8 text-gray-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-700 mb-1">
          Nenhuma comparação disponível
        </h2>
        <p className="text-sm text-gray-400 max-w-sm mx-auto">
          Para comparar preços, são necessários produtos com o mesmo nome em
          diferentes mercados. Cadastre encartes e produtos nos painéis dos
          mercados.
        </p>
      </motion.div>
    )
  }

  // ── List ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-800">Comparar Preços</h2>
        <p className="text-sm text-gray-500">
          {comparacoes.length} produto{comparacoes.length !== 1 ? 's' : ''}{' '}
          encontrado{comparacoes.length !== 1 ? 's' : ''} em mais de um
          mercado
        </p>
      </div>

      <div className="space-y-4">
        {comparacoes.map((comp, idx) => (
          <motion.div
            key={comp.normalizado}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className="overflow-hidden border-gray-100">
              {/* Card header */}
              <CardHeader className="pb-3 pt-4 px-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Tag className="h-4 w-4 text-red-600 shrink-0" />
                    <CardTitle className="text-sm font-semibold truncate">
                      {comp.nome}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Store className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {new Set(comp.produtos.map((p) => p.mercado.id)).size}{' '}
                      mercado
                      {comp.produtos.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                {comp.produtos[0]?.unidade && (
                  <p className="text-xs text-gray-400 mt-0.5 ml-6">
                    Unidade: {comp.produtos[0].unidade}
                  </p>
                )}
              </CardHeader>

              <CardContent className="px-4 pb-4">
                <div className="space-y-2">
                  {comp.produtos.map((p, pidx) => {
                    const isCheapest = pidx === 0 // Already sorted by precoNum
                    return (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 + pidx * 0.03 }}
                        className={cn(
                          'flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-colors',
                          isCheapest
                            ? 'bg-orange-50 border border-red-200'
                            : 'bg-gray-50 border border-gray-100',
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={cn(
                              'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                              isCheapest
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-200 text-gray-600',
                            )}
                          >
                            {p.mercado.nome
                              .split(/\s+/)
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((w) => w[0])
                              .join('')
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {p.mercado.nome}
                              {p.marca && (
                                <span className="text-gray-400 font-normal text-xs ml-1.5">
                                  {p.marca}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-400">
                              {p.mercado.cidade}/{p.mercado.estado}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={cn(
                              'text-sm font-bold',
                              isCheapest
                                ? 'text-red-700'
                                : 'text-gray-700',
                            )}
                          >
                            {p.preco}
                          </span>
                          {isCheapest && (
                            <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0 border-0">
                              Menor
                            </Badge>
                          )}
                          <button
                            onClick={() => handleAdd(p)}
                            className={cn(
                              'h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-colors',
                              addingId === p.id
                                ? 'bg-green-500 text-white'
                                : 'bg-red-50 text-red-600 hover:bg-red-100',
                            )}
                          >
                            {addingId === p.id ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Plus className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}