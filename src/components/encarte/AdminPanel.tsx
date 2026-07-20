'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
  Mail,
  AlertCircle,
  Download,
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
  formaPagamento?: string | null
  ultimoPagamento?: string | null
  segmento?: string | null
  pilotoFim?: string | null
  dataProximoPagamento?: string | null
  statusPagamento?: string | null
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
      toast.success(`Empresa "${nome}" cadastrada com sucesso!`)
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
          Cadastrar Nova Empresa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Nova Empresa</DialogTitle>
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
                placeholder="contato@empresa.com"
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
            Cadastrar Empresa
          </Button>
        </form>
      </DialogContent>
    </Dialog>
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
        m.destaque ? 'Destaque removido' : 'Empresa destacada!',
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

  // ── Status de pagamento (Pago/Pendente/Cancelado) ──
  const statusPagamentoAtual = m.statusPagamento || (
    m.status === 'ativo' ? 'pago' :
    m.status === 'ativo_aguardando_pagamento' ? 'pendente' :
    m.status === 'inativo' ? 'cancelado' : 'pendente'
  )

  const changePagamentoStatus = async (novoStatus: 'pago' | 'pendente' | 'cancelado') => {
    setActionLoading(`pgto-${m.id}-${novoStatus}`)
    try {
      await api(`/api/admin/mercado/${m.id}/pagamento-status`, {
        method: 'PATCH',
        body: JSON.stringify({ statusPagamento: novoStatus }),
      })
      toast.success(`Pagamento marcado como "${novoStatus}"`)
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar status de pagamento')
    } finally {
      setActionLoading(null)
    }
  }

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

            {/* Forma de pagamento */}
            {m.formaPagamento && (
              <Badge variant="outline" className="text-[10px] h-6 border-purple-200 text-purple-700 bg-purple-50 font-normal">
                {{
                  pix: 'Pix',
                  cartao_mensal: 'Cartão Mensal',
                  cartao_recorrente: 'Cartão Recorrente',
                  boleto: 'Boleto',
                }[m.formaPagamento] ?? m.formaPagamento}
              </Badge>
            )}

            {/* Status de pagamento (badge) + botões Pago/Pendente/Cancelado */}
            <div className="flex items-center gap-1 ml-auto">
              {/* Badge atual */}
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] h-6 font-normal',
                  statusPagamentoAtual === 'pago' && 'border-green-200 text-green-700 bg-green-50',
                  statusPagamentoAtual === 'pendente' && 'border-orange-200 text-orange-700 bg-orange-50',
                  statusPagamentoAtual === 'cancelado' && 'border-red-200 text-red-700 bg-red-50',
                )}
              >
                {statusPagamentoAtual === 'pago' ? '✓ Pago' : statusPagamentoAtual === 'pendente' ? '⏳ Pendente' : '✗ Cancelado'}
              </Badge>

              {/* Botão Pago */}
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'text-[10px] h-6 px-2',
                  statusPagamentoAtual === 'pago'
                    ? 'border-green-300 bg-green-100 text-green-700'
                    : 'border-green-200 text-green-600 hover:bg-green-50',
                )}
                disabled={!!actionLoading || statusPagamentoAtual === 'pago'}
                onClick={() => changePagamentoStatus('pago')}
                title="Marcar como Pago"
              >
                {actionLoading === `pgto-${m.id}-pago` ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  '✓'
                )}
              </Button>

              {/* Botão Pendente */}
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'text-[10px] h-6 px-2',
                  statusPagamentoAtual === 'pendente'
                    ? 'border-orange-300 bg-orange-100 text-orange-700'
                    : 'border-orange-200 text-orange-600 hover:bg-orange-50',
                )}
                disabled={!!actionLoading || statusPagamentoAtual === 'pendente'}
                onClick={() => changePagamentoStatus('pendente')}
                title="Marcar como Pendente"
              >
                {actionLoading === `pgto-${m.id}-pendente` ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  '⏳'
                )}
              </Button>

              {/* Botão Cancelado */}
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'text-[10px] h-6 px-2',
                  statusPagamentoAtual === 'cancelado'
                    ? 'border-red-300 bg-red-100 text-red-700'
                    : 'border-red-200 text-red-600 hover:bg-red-50',
                )}
                disabled={!!actionLoading || statusPagamentoAtual === 'cancelado'}
                onClick={() => changePagamentoStatus('cancelado')}
                title="Marcar como Cancelado"
              >
                {actionLoading === `pgto-${m.id}-cancelado` ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  '✗'
                )}
              </Button>
            </div>

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
                        O contrato PJ será exibido aqui após a integração com o sistema de pagamentos.
                        Por enquanto, o contrato é gerenciado manualmente.
                      </p>
                    </div>
                    {/* Send email button */}
                    <Button
                      variant="outline"
                      className="w-full border-green-200 text-green-700 hover:bg-green-50"
                      onClick={() => {
                        toast.info('Funcionalidade em desenvolvimento')
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
  const session = sessionOverride || ctxSession
  const [mercados, setMercados] = useState<AdminMercado[]>([])
  const [dataFetched, setDataFetched] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const loading = session?.tipo === 'admin' ? !dataFetched : false

  // ── Filtros ──
  const [filtroSegmento, setFiltroSegmento] = useState<string>('todos')
  const [filtroStatusPagamento, setFiltroStatusPagamento] = useState<string>('todos')

  // ── Mercados filtrados (por segmento + status de pagamento) ──
  const mercadosFiltrados = useMemo(() => {
    let list = mercados
    if (filtroSegmento !== 'todos') {
      list = list.filter((m) => (m.segmento || 'mercados') === filtroSegmento)
    }
    if (filtroStatusPagamento !== 'todos') {
      list = list.filter((m) => {
        const sp = m.statusPagamento || (m.status === 'ativo' ? 'pago' : m.status === 'ativo_aguardando_pagamento' ? 'pendente' : 'cancelado')
        return sp === filtroStatusPagamento
      })
    }
    return list
  }, [mercados, filtroSegmento, filtroStatusPagamento])

  // ── KPIs dinâmicos (baseados nos filtros) ──
  const kpis = useMemo(() => {
    const list = mercadosFiltrados
    const total = list.length
    const pagos = list.filter((m) => (m.statusPagamento || (m.status === 'ativo' ? 'pago' : '')) === 'pago').length
    const pendentes = list.filter((m) => {
      const sp = m.statusPagamento || (m.status === 'ativo_aguardando_pagamento' ? 'pendente' : '')
      return sp === 'pendente'
    }).length
    const cancelados = list.filter((m) => (m.statusPagamento || (m.status === 'inativo' ? 'cancelado' : '')) === 'cancelado').length
    const emPiloto = list.filter((m) => m.status === 'piloto' || m.status === 'teste_gratis').length
    const ativos = list.filter((m) => m.status === 'ativo').length
    const receitaPotencial = list
      .filter((m) => m.status === 'ativo' || m.status === 'piloto' || m.status === 'teste_gratis')
      .reduce((sum, m) => sum + (m.mensalidade || 0), 0)

    return { total, pagos, pendentes, cancelados, emPiloto, ativos, receitaPotencial }
  }, [mercadosFiltrados])

  // ── Segmentos disponíveis (para o filtro) ──
  const segmentosDisponiveis = useMemo(() => {
    const set = new Set<string>()
    mercados.forEach((m) => set.add(m.segmento || 'mercados'))
    return Array.from(set).sort()
  }, [mercados])

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
            {totalMercados} empresa{totalMercados !== 1 ? 's' : ''} cadastrada
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

      {/* Exportar CSV */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-600">Exportar:</span>
        <a
          href="/api/admin/mercados/exportar-csv?filtro=sem_pagamento"
          className="inline-flex items-center gap-1.5 text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Sem Pagamento
        </a>
        <a
          href="/api/admin/mercados/exportar-csv?filtro=vencidos"
          className="inline-flex items-center gap-1.5 text-xs bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Vencidos
        </a>
        <a
          href="/api/admin/mercados/exportar-csv?filtro=pendentes"
          className="inline-flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Pendentes
        </a>
        <a
          href="/api/admin/mercados/exportar-csv?filtro=todos"
          className="inline-flex items-center gap-1.5 text-xs bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Todos
        </a>
      </div>

      {/* Stats row — KPIs dinâmicos baseados nos filtros */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: kpis.total, icon: <Store className="h-5 w-5" />, color: 'text-gray-700 bg-gray-100' },
          { label: 'Em Piloto', value: kpis.emPiloto, icon: <Clock className="h-5 w-5" />, color: 'text-blue-600 bg-blue-50' },
          { label: 'Ativos', value: kpis.ativos, icon: <UserCheck className="h-5 w-5" />, color: 'text-red-600 bg-orange-50' },
          { label: 'Pagos', value: kpis.pagos, icon: <DollarSign className="h-5 w-5" />, color: 'text-green-600 bg-green-50' },
          { label: 'Pendentes', value: kpis.pendentes, icon: <AlertCircle className="h-5 w-5" />, color: 'text-orange-600 bg-orange-50' },
          { label: 'Receita Potencial', value: formatBRL(kpis.receitaPotencial), icon: <DollarSign className="h-5 w-5" />, color: 'text-red-600 bg-orange-50' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="border-gray-100">
              <CardContent className="p-3">
                <div className={cn('p-1.5 rounded-lg w-fit mb-2', s.color)}>
                  {s.icon}
                </div>
                <p className="text-xl font-bold text-gray-800">{s.value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <span className="text-xs font-semibold text-gray-600">Filtros:</span>

        {/* Filtro por segmento */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-gray-500">Segmento:</span>
          <select
            value={filtroSegmento}
            onChange={(e) => setFiltroSegmento(e.target.value)}
            className="text-xs h-8 px-2 rounded border border-gray-200 bg-white outline-none focus:border-red-400"
          >
            <option value="todos">Todos</option>
            {segmentosDisponiveis.map((s) => (
              <option key={s} value={s}>
                {s === 'mercados' ? 'Mercados' : s === 'petshops' ? 'PetShops' : s === 'farmacias' ? 'Farmácias' : s}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por status de pagamento */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-gray-500">Pagamento:</span>
          <select
            value={filtroStatusPagamento}
            onChange={(e) => setFiltroStatusPagamento(e.target.value)}
            className="text-xs h-8 px-2 rounded border border-gray-200 bg-white outline-none focus:border-red-400"
          >
            <option value="todos">Todos</option>
            <option value="pago">Pagos</option>
            <option value="pendente">Pendentes</option>
            <option value="cancelado">Cancelados</option>
          </select>
        </div>

        <span className="text-[11px] text-gray-500 ml-auto">
          {mercadosFiltrados.length} de {mercados.length} empresas
        </span>
      </div>

      {/* New market */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          Empresas ({mercadosFiltrados.length})
        </h3>
        <NewMarketForm onCreated={fetchMercados} />
      </div>

      {/* Markets list (filtrada) */}
      <div className="space-y-3 max-h-[calc(100vh-520px)] overflow-y-auto pr-1">
        <AnimatePresence>
          {mercadosFiltrados.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-gray-400"
            >
              <Store className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Nenhuma empresa encontrada com os filtros selecionados</p>
            </motion.div>
          ) : (
            mercadosFiltrados.map((m) => (
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