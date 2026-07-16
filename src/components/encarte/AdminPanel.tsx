'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck,
  LogIn,
  Loader2,
  RefreshCw,
  Star,
  Store,
  FileText,
  Package,
  MousePointerClick,
  Trash2,
  Plus,
  DollarSign,
  UserCheck,
  UserX,
  Clock,
  AlertTriangle,
  Mail,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { api, useSession } from './AppShell'
import { toast } from 'sonner'

// ── Types ───────────────────────────────────────────────────────────────────

interface AdminMercado {
  id: string
  nome: string
  cidade: string
  estado: string
  endereco?: string | null
  telefone?: string | null
  cnpj?: string | null
  emailLogin: string
  status: string
  destaque: boolean
  mensalidade: number
  criadoEm: string
  asaasSubscriptionId?: string | null
  asaasAssinaturaCancelada?: boolean
  ultimoPagamento?: string | null
  _count: {
    produtos: number
    encartes: number
    cliques: number
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    piloto: {
      label: 'Piloto',
      cls: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    ativo: {
      label: 'Ativo',
      cls: 'bg-red-50 text-red-700 border-red-200',
    },
    ativo_aguardando_pagamento: {
      label: 'Aguarda Pgto',
      cls: 'bg-orange-100 text-orange-700 border-orange-200',
    },
    ativo_carencia: {
      label: 'Carência',
      cls: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    },
    assinatura_cancelada: {
      label: 'Cancelado',
      cls: 'bg-red-100 text-red-700 border-red-200',
    },
    inativo: {
      label: 'Inativo',
      cls: 'bg-gray-100 text-gray-500 border-gray-200',
    },
    suspenso: {
      label: 'Suspenso',
      cls: 'bg-red-100 text-red-700 border-red-200',
    },
  }
  const s = map[status] || { label: status, cls: 'bg-gray-100 text-gray-500' }
  return <Badge className={cn('text-[10px]', s.cls)}>{s.label}</Badge>
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    piloto: 'Piloto',
    ativo: 'Ativar',
    inativo: 'Desativar',
    suspenso: 'Suspender',
  }
  return map[status] || status
}

function nextStatusAction(current: string): string {
  if (current === 'piloto') return 'ativo'
  if (current === 'ativo' || current === 'ativo_aguardando_pagamento') return 'inativo'
  return 'piloto'
}

function nextStatusLabel(current: string): string {
  if (current === 'piloto') return 'Ativar'
  if (current === 'ativo' || current === 'ativo_aguardando_pagamento') return 'Desativar'
  return 'Piloto'
}

function formatBRL(val: number): string {
  return val.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

// ── Login Form ──────────────────────────────────────────────────────────────

function AdminLoginForm({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !senha) {
      toast.error('Preencha todos os campos')
      return
    }
    setLoading(true)
    try {
      await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, senha }),
      })
      toast.success('Login administrativo realizado!')
      onLogin()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center min-h-[60vh]"
    >
      <Card className="w-full max-w-sm border-gray-100">
        <CardHeader className="text-center pb-2">
          <div className="h-16 w-16 rounded-full bg-red-600 flex items-center justify-center text-white font-extrabold text-xl mx-auto mb-3">
            EB
          </div>
          <CardTitle className="text-lg">Painel Administrativo</CardTitle>
          <p className="text-xs text-gray-500 mt-1">
            Acesso restrito a administradores
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="a-email" className="text-sm">
                E-mail
              </Label>
              <Input
                id="a-email"
                type="email"
                placeholder="admin@panfletosbrasil.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-senha" className="text-sm">
                Senha
              </Label>
              <Input
                id="a-senha"
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <ShieldCheck className="h-4 w-4 mr-2" />
              Entrar como Admin
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ── New Market Form ─────────────────────────────────────────────────────────

function NewMarketForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    cnpj: '',
    email: '',
    senha: '',
    cidade: '',
    estado: '',
    endereco: '',
    telefone: '',
    mensalidade: '399',
  })

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { nome, cnpj, email, senha, cidade, estado } = form
    const cnpjLimpo = (cnpj || '').replace(/\D/g, '')
    if (!nome || !cnpj || !email || !senha || !cidade || !estado) {
      toast.error('Preencha os campos obrigatórios')
      return
    }
    if (cnpjLimpo.length !== 14) {
      toast.error('CNPJ inválido. Digite 14 dígitos.')
      return
    }
    setLoading(true)
    try {
      await api('/api/admin/mercado', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          mensalidade: parseInt(form.mensalidade) || 399,
        }),
      })
      toast.success(`Mercado "${nome}" cadastrado com sucesso!`)
      setOpen(false)
      setForm({
        nome: '',
        cnpj: '',
        email: '',
        senha: '',
        cidade: '',
        estado: '',
        endereco: '',
        telefone: '',
        mensalidade: '399',
      })
      onCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao cadastrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-red-600 hover:bg-red-700 text-white text-sm h-9">
          <Plus className="h-4 w-4 mr-1.5" />
          Cadastrar Novo Mercado
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Mercado</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome *</Label>
            <Input
              value={form.nome}
              onChange={(e) => handleChange('nome', e.target.value)}
              placeholder="Supermercado Exemplo"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">CNPJ *</Label>
            <Input
              value={form.cnpj}
              onChange={(e) => handleChange('cnpj', e.target.value)}
              placeholder="00.000.000/0000-00"
              inputMode="numeric"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">E-mail *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="contato@mercado.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Senha *</Label>
              <Input
                type="password"
                value={form.senha}
                onChange={(e) => handleChange('senha', e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Cidade *</Label>
              <Input
                value={form.cidade}
                onChange={(e) => handleChange('cidade', e.target.value)}
                placeholder="São Paulo"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Estado *</Label>
              <Select
                value={form.estado}
                onValueChange={(v) => handleChange('estado', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
                    'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
                    'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
                  ].map((uf) => (
                    <SelectItem key={uf} value={uf}>
                      {uf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Endereço</Label>
            <Input
              value={form.endereco}
              onChange={(e) => handleChange('endereco', e.target.value)}
              placeholder="Rua Exemplo, 123"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Telefone</Label>
              <Input
                value={form.telefone}
                onChange={(e) => handleChange('telefone', e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mensalidade (R$)</Label>
              <Input
                type="number"
                value={form.mensalidade}
                onChange={(e) => handleChange('mensalidade', e.target.value)}
              />
            </div>
          </div>
          <Button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Cadastrar Mercado
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Asaas Manage Button ──────────────────────────────────────────────────

function AsaasManageButton({ mercadoId, mercadoNome, onRefresh }: { mercadoId: string; mercadoNome: string; onRefresh: () => void }) {
  const [loading, setLoading] = useState<string | null>(null)
  const [asaasData, setAsaasData] = useState<any>(null)
  const [open, setOpen] = useState(false)

  const fetchAsaas = async () => {
    setLoading('fetch')
    try {
      const data = await api(`/api/admin/asaas-subscription?id=${mercadoId}`)
      setAsaasData(data)
      setOpen(true)
    } catch (err) {
      toast.error('Erro ao buscar dados do Asaas')
    } finally {
      setLoading(null)
    }
  }

  const handleAction = async (acao: string) => {
    setLoading(acao)
    try {
      await api('/api/admin/asaas-subscription', {
        method: 'POST',
        body: JSON.stringify({ id: mercadoId, acao }),
      })
      toast.success(`Ação "${acao}" executada com sucesso`)
      setOpen(false)
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao executar ação')
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-xs h-7 border-purple-200 text-purple-600 hover:bg-purple-50"
        disabled={!!loading}
        onClick={fetchAsaas}
      >
        {loading === 'fetch' ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <DollarSign className="h-3 w-3 mr-1" />}
        Asaas
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assinatura Asaas — {mercadoNome}</DialogTitle>
          </DialogHeader>
          {asaasData && (
            <div className="space-y-4 mt-2">
              {/* Status geral */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-gray-50 p-3">
                  <p className="text-[10px] text-gray-500 uppercase">Status Local</p>
                  <p className="text-sm font-semibold">{statusBadge(asaasData.status)}</p>
                </div>
                <div className="rounded-lg border bg-gray-50 p-3">
                  <p className="text-[10px] text-gray-500 uppercase">Assinatura</p>
                  <p className="text-sm font-semibold">
                    {asaasData.subscription ? (
                      <span className={cn(
                        asaasData.subscription.status === 'ACTIVE' ? 'text-green-600' :
                        asaasData.subscription.status === 'CANCELED' || asaasData.subscription.status === 'INACTIVE' ? 'text-red-600' : 'text-orange-600'
                      )}>
                        {asaasData.subscription.status}
                      </span>
                    ) : (
                      <span className="text-gray-400">Nenhuma</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Detalhes */}
              {asaasData.subscription && (
                <div className="rounded-lg border p-3 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ciclo</span>
                    <span className="font-medium">{asaasData.subscription.cycle || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tipo Cobrança</span>
                    <span className="font-medium">{asaasData.subscription.billingType || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Valor</span>
                    <span className="font-medium">R$ {asaasData.subscription.value || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Próx. Vencimento</span>
                    <span className="font-medium">{asaasData.subscription.nextDueDate || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Último Pagamento</span>
                    <span className="font-medium">{asaasData.ultimoPagamento ? new Date(asaasData.ultimoPagamento).toLocaleDateString('pt-BR') : '—'}</span>
                  </div>
                  {asaasData.asaasAssinaturaCancelada && (
                    <div className="flex justify-between text-red-600">
                      <span>Assinatura</span>
                      <span className="font-semibold">CANCELADA</span>
                    </div>
                  )}
                </div>
              )}

              {/* Últimas faturas */}
              {asaasData.ultimasFaturas && asaasData.ultimasFaturas.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-700">Últimas Faturas</p>
                  <div className="border rounded-lg overflow-hidden">
                    {asaasData.ultimasFaturas.map((f: any, i: number) => (
                      <div key={f.id} className={cn('flex items-center justify-between px-3 py-2 text-xs', i > 0 && 'border-t')}>
                        <div>
                          <span className="text-gray-500">{f.dueDate}</span>
                          {f.paymentDate && <span className="ml-2 text-green-600">Pago {f.paymentDate.split('T')[0]}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">R$ {f.value}</span>
                          <Badge className={cn('text-[9px]',
                            f.status === 'RECEIVED' || f.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                            f.status === 'PENDING' || f.status === 'WAITING' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          )}>
                            {f.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Erro */}
              {asaasData.subscriptionError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
                  Erro ao buscar assinatura: {asaasData.subscriptionError}
                </div>
              )}

              {/* Ações do admin */}
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {asaasData.subscription?.status === 'ACTIVE' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 border-orange-200 text-orange-600 hover:bg-orange-50"
                    disabled={!!loading}
                    onClick={() => handleAction('cancelar_assinatura')}
                  >
                    {loading === 'cancelar_assinatura' ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                    Cancelar Recorrência
                  </Button>
                )}
                {asaasData.asaasAssinaturaCancelada && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 border-green-200 text-green-600 hover:bg-green-50"
                    disabled={!!loading}
                    onClick={() => handleAction('reativar_assinatura')}
                  >
                    {loading === 'reativar_assinatura' ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                    Reativar Assinatura
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 border-red-200 text-red-600 hover:bg-red-50"
                  disabled={!!loading}
                  onClick={() => { if (confirm(`Desativar "${mercadoNome}" e cancelar a assinatura?`)) handleAction('desativar_pagamento') }}
                >
                  {loading === 'desativar_pagamento' ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                  Desativar e Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── Market Row ──────────────────────────────────────────────────────────────

function MarketRow({
  m,
  onRefresh,
}: {
  m: AdminMercado
  onRefresh: () => void
}) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [contractOpen, setContractOpen] = useState(false)

  const changeStatus = async (newStatus: string) => {
    setActionLoading(`status-${m.id}`)
    try {
      await api(`/api/admin/status/${m.id}`, {
        method: 'POST',
        body: JSON.stringify({ status: newStatus }),
      })
      toast.success(`Status alterado para "${statusLabel(newStatus).replace(/ar$/, '')}"`)
      // After activating (Piloto → Ativo), show prominent contract reminder
      if (newStatus === 'ativo' && m.status !== 'ativo') {
        toast.warning(
          'Contrato PJ — O mercado precisa assinar o contrato PJ em até 3 dias úteis.',
          { description: 'Clique no botão "Contrato" para gerenciar.', duration: 8000 },
        )
      }
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar status')
    } finally {
      setActionLoading(null)
    }
  }

  const toggleDestaque = async () => {
    setActionLoading(`destaque-${m.id}`)
    try {
      await api(`/api/admin/destaque/${m.id}`, { method: 'POST' })
      toast.success(
        m.destaque ? 'Destaque removido' : 'Mercado destacado!',
      )
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar destaque')
    } finally {
      setActionLoading(null)
    }
  }

  const deleteMercado = async () => {
    setActionLoading(`delete-${m.id}`)
    try {
      await api(`/api/admin/mercado/${m.id}`, { method: 'DELETE' })
      toast.success(`"${m.nome}" excluído`)
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir')
    } finally {
      setActionLoading(null)
    }
  }

  const nextStatus = nextStatusAction(m.status)
  const nextLabel = nextStatusLabel(m.status)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
    >
      <Card className="border-gray-100 overflow-hidden">
        <CardContent className="p-0">
          {/* Main info */}
          <div className="p-3 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {m.nome
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate">{m.nome}</p>
                    {statusBadge(m.status)}
                    {m.destaque && (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">
                        <Star className="h-2.5 w-2.5 mr-0.5" />
                        Destaque
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    CNPJ: {m.cnpj ? m.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : '—'} · {m.cidade}/{m.estado}
                  </p>
                  <p className="text-[11px] text-gray-400">{m.emailLogin}</p>
                </div>
              </div>
            </div>

            {/* Counts */}
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {m._count.encartes} encarte{m._count.encartes !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {m._count.produtos} produto{m._count.produtos !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1">
                <MousePointerClick className="h-3 w-3" />
                {m._count.cliques} cliques
              </span>
              <span className="flex items-center gap-1 ml-auto text-red-600 font-semibold">
                <DollarSign className="h-3 w-3" />
                R${m.mensalidade}
              </span>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="px-3 py-2 bg-gray-50/50 flex flex-wrap gap-2">
            {/* Status cycle: Piloto → Ativar → Desativar */}
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'text-xs h-7',
                nextStatus === 'ativo' &&
                  'border-red-200 text-red-600 hover:bg-orange-50',
                nextStatus === 'inativo' &&
                  'border-gray-300 text-gray-600 hover:bg-gray-100',
                nextStatus === 'piloto' &&
                  'border-blue-200 text-blue-600 hover:bg-blue-50',
              )}
              disabled={!!actionLoading}
              onClick={() => changeStatus(nextStatus)}
            >
              {actionLoading === `status-${m.id}` ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : nextStatus === 'piloto' ? (
                <Clock className="h-3 w-3 mr-1" />
              ) : nextStatus === 'ativo' ? (
                <UserCheck className="h-3 w-3 mr-1" />
              ) : (
                <UserX className="h-3 w-3 mr-1" />
              )}
              {nextLabel}
            </Button>

            {/* Asaas - Ver status/Cancelar assinatura */}
            {m.asaasSubscriptionId && (
              <AsaasManageButton mercadoId={m.id} mercadoNome={m.nome} onRefresh={onRefresh} />
            )}

            {/* Contrato button - aparece quando ativo ou piloto */}
            {(m.status === 'ativo' || m.status === 'piloto') && (
              <Dialog open={contractOpen} onOpenChange={setContractOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 border-green-200 text-green-600 hover:bg-green-50"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Contrato
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Contrato PJ — {m.nome}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    {/* Market info */}
                    <div className="rounded-lg border bg-gray-50 p-3 space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Nome</span>
                        <span className="font-medium">{m.nome}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">CNPJ</span>
                        <span className="font-medium font-mono">
                          {m.cnpj ? m.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Cidade/Estado</span>
                        <span className="font-medium">{m.cidade}/{m.estado}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">E-mail</span>
                        <span className="font-medium">{m.emailLogin}</span>
                      </div>
                    </div>
                    {/* Placeholder notice */}
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      <p className="font-medium mb-1">Contrato não disponível ainda</p>
                      <p className="text-xs text-amber-700">
                        O contrato PJ será exibido aqui após a integração com a API Asaas.
                        Por enquanto, o contrato é gerenciado manualmente.
                      </p>
                    </div>
                    {/* Send email button */}
                    <Button
                      variant="outline"
                      className="w-full border-green-200 text-green-700 hover:bg-green-50"
                      onClick={() => {
                        toast.info('Funcionalidade em desenvolvimento — integração Asaas em andamento')
                        setContractOpen(false)
                      }}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Enviar link de contrato por e-mail
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Destaque toggle */}
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'text-xs h-7',
                m.destaque
                  ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-100',
              )}
              disabled={!!actionLoading}
              onClick={toggleDestaque}
            >
              {actionLoading === `destaque-${m.id}` ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Star className={cn('h-3 w-3 mr-1', m.destaque && 'fill-amber-400 text-amber-400')} />
              )}
              {m.destaque ? 'Remover' : 'Destacar'}
            </Button>

            {/* Delete */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                  disabled={!!actionLoading}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir &quot;{m.nome}&quot;?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação é permanente e removerá todos os encartes,
                    produtos e estatísticas associados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={deleteMercado}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    Excluir permanentemente
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ── AdminPanel ──────────────────────────────────────────────────────────────

interface AdminPanelProps {
  onLogout: () => void
  onLogin: () => void
  sessionOverride?: { tipo: 'admin'; id: string; email: string } | null
}

export default function AdminPanel({ onLogout, onLogin, sessionOverride }: AdminPanelProps) {
  const ctxSession = useSession()
  // Se recebeu sessionOverride (do AdminRoute), usa ele; senão usa o do contexto
  const session = sessionOverride || ctxSession
  const [mercados, setMercados] = useState<AdminMercado[]>([])
  const [dataFetched, setDataFetched] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const loading = session?.tipo === 'admin' ? !dataFetched : false

  const fetchMercados = useCallback(async () => {
    try {
      const data = await api<AdminMercado[]>('/api/admin/mercados')
      setMercados(data)
    } catch {
      toast.error('Erro ao carregar mercados')
    }
  }, [])

  useEffect(() => {
    if (session?.tipo !== 'admin') return
    let cancelled = false

    const load = async () => {
      try {
        const data = await api<AdminMercado[]>('/api/admin/mercados')
        if (!cancelled) setMercados(data)
      } catch {
        if (!cancelled) toast.error('Erro ao carregar mercados')
      } finally {
        if (!cancelled) setDataFetched(true)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [session])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchMercados()
    setRefreshing(false)
    toast.success('Lista atualizada')
  }

  // ── Not logged in — só mostra se NÃO tem sessionOverride (AppShell) ──
  // AdminRoute já trata login separadamente, então não mostra AdminLoginForm aqui
  if (!sessionOverride && !loading && session?.tipo !== 'admin') {
    return <AdminLoginForm onLogin={onLogin} />
  }

  // ── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    )
  }

  // ── Stats ────────────────────────────────────────────────────────────
  const totalMercados = mercados.length
  const pilotos = mercados.filter((m) => m.status === 'piloto').length
  const ativos = mercados.filter((m) => m.status === 'ativo').length
  const inativos = mercados.filter((m) => m.status === 'inativo').length
  const destaques = mercados.filter((m) => m.destaque).length
  const receitaMensal = mercados.reduce(
    (acc, m) => acc + (m.status === 'ativo' || m.status === 'piloto' ? m.mensalidade : 0),
    0,
  )

  const stats = [
    {
      label: 'Total',
      value: totalMercados,
      icon: <Store className="h-5 w-5" />,
      color: 'text-gray-700 bg-gray-100',
    },
    {
      label: 'Pilotos',
      value: pilotos,
      icon: <Clock className="h-5 w-5" />,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Ativos',
      value: ativos,
      icon: <UserCheck className="h-5 w-5" />,
      color: 'text-red-600 bg-orange-50',
    },
    {
      label: 'Inativos',
      value: inativos,
      icon: <UserX className="h-5 w-5" />,
      color: 'text-gray-500 bg-gray-50',
    },
    {
      label: 'Destaques',
      value: destaques,
      icon: <Star className="h-5 w-5" />,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'Receita Mensal',
      value: formatBRL(receitaMensal),
      icon: <DollarSign className="h-5 w-5" />,
      color: 'text-red-600 bg-orange-50',
    },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-red-600" />
            Painel Administrativo
          </h2>
          <p className="text-sm text-gray-500">
            {totalMercados} mercado{totalMercados !== 1 ? 's' : ''} cadastrado
            {totalMercados !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-xs"
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5 mr-1', refreshing && 'animate-spin')}
            />
            Atualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onLogout}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs"
          >
            Sair
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="border-gray-100">
              <CardContent className="p-3">
                <div
                  className={cn('p-1.5 rounded-lg w-fit mb-2', s.color)}
                >
                  {s.icon}
                </div>
                <p className="text-xl font-bold text-gray-800">{s.value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* New market */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          Mercados Cadastrados
        </h3>
        <NewMarketForm onCreated={fetchMercados} />
      </div>

      {/* Markets list */}
      <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto pr-1">
        <AnimatePresence>
          {mercados.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-gray-400"
            >
              <Store className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Nenhum mercado cadastrado</p>
            </motion.div>
          ) : (
            mercados.map((m) => (
              <MarketRow
                key={m.id}
                m={m}
                onRefresh={fetchMercados}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}