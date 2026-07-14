'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LogIn,
  FileText,
  Package,
  MousePointerClick,
  Upload,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  MapPin,
  BarChart3,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { api, useSession } from './AppShell'
import { toast } from 'sonner'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

// ── Types ───────────────────────────────────────────────────────────────────

interface ContaData {
  id: string
  nome: string
  cidade: string
  estado: string
  emailLogin: string
  status: string
  statusEfetivo: string
  destaque: boolean
  mensalidade: number
  totalProdutos: number
  totalEncartes: number
  totalCliques: number
}

interface BITopProduto {
  nome: string
  marca: string
  cliques: number
}

interface BIWeek {
  semana: string
  total: number
}

interface BIData {
  topProdutos: BITopProduto[]
  cliquesPorRegiao: { regiao: string; total: number }[]
  cliquesSemana: BIWeek[]
  trend: number
  regiao: string
}

interface EncarteItem {
  id: string
  titulo: string
  statusExtracao: string
  criadoEm: string
  _count: { produtos: number }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    piloto: {
      label: 'Piloto',
      cls: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    piloto_expirado: {
      label: 'Piloto Expirado',
      cls: 'bg-orange-100 text-orange-700 border-orange-200',
    },
    ativo: {
      label: 'Ativo',
      cls: 'bg-red-50 text-red-700 border-red-200',
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
  return <Badge className={cn('text-xs', s.cls)}>{s.label}</Badge>
}

function extracaoLabel(s: string) {
  const map: Record<string, string> = {
    pendente: 'Pendente',
    processando: 'Processando',
    concluido: 'Concluído',
    erro: 'Erro',
  }
  return map[s] || s
}

// ── Login Form ──────────────────────────────────────────────────────────────

function formatCNPJ(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [tab, setTab] = useState<'pf' | 'pj' | 'admin'>('pf')

  // PF (Consumidor) — só Google
  const [socialLoading, setSocialLoading] = useState<string | null>(null)

  // PJ (Mercado) — CNPJ + e-mail + senha
  const [cnpj, setCnpj] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSocialLogin = async (provider: 'google') => {
    setSocialLoading(provider)
    try {
      const { getAuth, signInWithRedirect, getRedirectResult, GoogleAuthProvider } = await import('firebase/auth')
      const auth = getAuth()

      // Check if we're returning from a redirect
      const result = await getRedirectResult(auth)
      if (result) {
        const user = result.user
        await api('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            provider,
            tipoLogin: 'pf',
          }),
        })
        toast.success('Login com Google realizado!')
        onLogin()
        return
      }

      // No redirect result — initiate redirect flow
      const prov = new GoogleAuthProvider()
      await signInWithRedirect(auth, prov)
      // Page will redirect — on return, getRedirectResult will handle it
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') return
      toast.error(err?.message || 'Erro ao logar com Google')
    } finally {
      setSocialLoading(null)
    }
  }

  const handlePfEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !senha) {
      toast.error('Preencha e-mail e senha')
      return
    }
    setLoading(true)
    try {
      await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, senha, tipoLogin: 'pf' }),
      })
      toast.success('Login de consumidor realizado!')
      onLogin()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  const handlePjLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const cnpjLimpo = cnpj.replace(/\D/g, '')
    if (cnpjLimpo.length !== 14) {
      toast.error('CNPJ inválido. Digite os 14 dígitos.')
      return
    }
    if (!senha) {
      toast.error('Preencha a senha')
      return
    }
    setLoading(true)
    try {
      await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, senha, cnpj: cnpjLimpo, tipoLogin: 'pj' }),
      })
      toast.success('Login de mercado realizado!')
      onLogin()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !senha) {
      toast.error('Preencha e-mail e senha')
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
      className="flex items-center justify-center min-h-[60vh] px-4"
    >
      <Card className="w-full max-w-sm border-orange-100">
        <CardHeader className="text-center pb-2">
          <img
            src="/icon-192.png"
            alt="EncarteBrasil"
            className="h-20 w-20 rounded-2xl object-cover mx-auto mb-3 shadow-md"
          />
          <CardTitle className="text-lg">EncarteBrasil</CardTitle>
          <p className="text-xs text-gray-500 mt-1">
            Acesse para gerenciar e comparar encartes
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'pf' | 'pj' | 'admin')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pf">Consumidor</TabsTrigger>
              <TabsTrigger value="pj">Mercado</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>

            {/* ── PF: Google + Email/Senha ── */}
            <TabsContent value="pf" className="space-y-3 mt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 gap-2 text-sm font-medium"
                disabled={socialLoading !== null}
                onClick={() => handleSocialLogin('google')}
              >
                {socialLoading === 'google' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                )}
                Continuar com Google
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><Separator /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">ou e-mail</span></div>
              </div>
              <form onSubmit={handlePfEmailLogin} className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">E-mail</Label>
                  <Input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Senha</Label>
                  <Input type="password" placeholder="••••••••" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white h-11" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Entrar como Consumidor
                </Button>
              </form>
              <p className="text-[11px] text-gray-400 text-center pt-1">
                Primeiro acesso? Sua conta é criada automaticamente.
              </p>
            </TabsContent>

            {/* ── PJ: CNPJ + e-mail + senha ── */}
            <TabsContent value="pj" className="space-y-3 mt-4">
              <form onSubmit={handlePjLogin} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="m-cnpj" className="text-sm">CNPJ</Label>
                  <Input
                    id="m-cnpj"
                    type="text"
                    inputMode="numeric"
                    placeholder="00.000.000/0000-00"
                    value={cnpj}
                    onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                    autoComplete="organization-id"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-email" className="text-sm">E-mail</Label>
                  <Input
                    id="m-email"
                    type="email"
                    placeholder="seu@mercado.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-senha" className="text-sm">Senha</Label>
                  <Input
                    id="m-senha"
                    type="password"
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white h-11"
                  disabled={loading}
                >
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Entrar como Mercado
                </Button>
              </form>
              <p className="text-[11px] text-gray-400 text-center pt-1">
                Precisa de cadastro? Solicite ao admin.
              </p>
            </TabsContent>

            {/* ── Admin ── */}
            <TabsContent value="admin" className="space-y-3 mt-4">
              <p className="text-xs text-gray-500 text-center">
                Acesso restrito a administradores do sistema.
              </p>
              <form onSubmit={handleAdminLogin} className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">E-mail</Label>
                  <Input type="email" placeholder="admin@encartebrasil.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Senha</Label>
                  <Input type="password" placeholder="••••••••" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white h-11"
                  disabled={loading}
                >
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Entrar como Admin
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ── Dashboard ───────────────────────────────────────────────────────────────

function Dashboard({ conta, onLogout }: { conta: ContaData; onLogout: () => void }) {
  const [bi, setBi] = useState<BIData | null>(null)
  const [encartes, setEncartes] = useState<EncarteItem[]>([])
  const [expandedEncarte, setExpandedEncarte] = useState<string | null>(null)
  const [encarteProducts, setEncarteProducts] = useState<
    Record<string, { id: string; nome: string; marca?: string | null; preco: string; unidade?: string | null }[]>
  >({})

  // Upload state
  const [titulo, setTitulo] = useState('')
  const [uploading, setUploading] = useState(false)

  // Fetch BI
  useEffect(() => {
    api<BIData>('/api/mercado/bi')
      .then(setBi)
      .catch(() => {})
  }, [])

  // Fetch encartes from conta
  useEffect(() => {
    // We already have the counts from conta; load encarte list via mercado detail
    api<{ encartes: EncarteItem[] }>(`/api/mercados/${conta.id}`)
      .then((d) => setEncartes(d.encartes || []))
      .catch(() => {})
  }, [conta.id])

  // Upload PDF
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim()) {
      toast.error('Informe o título do encarte')
      return
    }
    const input = document.getElementById('pdf-upload') as HTMLInputElement
    const file = input?.files?.[0]
    if (!file) {
      toast.error('Selecione um arquivo PDF')
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('titulo', titulo.trim())
      fd.append('pdf', file)
      await api('/api/mercado/encarte', {
        method: 'POST',
        body: fd,
      })
      toast.success('Encarte enviado com sucesso!')
      setTitulo('')
      if (input) input.value = ''
      // Refresh
      api<{ encartes: EncarteItem[] }>(`/api/mercados/${conta.id}`)
        .then((d) => setEncartes(d.encartes || []))
        .catch(() => {})
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar')
    } finally {
      setUploading(false)
    }
  }

  // Toggle encarte
  const toggleEncarte = async (eid: string) => {
    if (expandedEncarte === eid) {
      setExpandedEncarte(null)
      return
    }
    try {
      const prods = await api<
        { id: string; nome: string; marca?: string | null; preco: string; unidade?: string | null }[]
      >(`/api/mercado/encarte/${eid}/produtos`)
      setEncarteProducts((prev) => ({ ...prev, [eid]: prods }))
      setExpandedEncarte(eid)
    } catch {
      toast.error('Erro ao carregar produtos')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">{conta.nome}</h2>
          <div className="flex items-center gap-2 mt-1">
            <MapPin className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-sm text-gray-500">
              {conta.cidade}/{conta.estado}
            </span>
            {statusBadge(conta.statusEfetivo)}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onLogout}
          className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs"
        >
          Sair
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Encartes',
            value: conta.totalEncartes,
            icon: <FileText className="h-5 w-5" />,
            color: 'text-blue-600 bg-blue-50',
          },
          {
            label: 'Produtos',
            value: conta.totalProdutos,
            icon: <Package className="h-5 w-5" />,
            color: 'text-purple-600 bg-purple-50',
          },
          {
            label: 'Cliques',
            value: conta.totalCliques,
            icon: <MousePointerClick className="h-5 w-5" />,
            color: 'text-amber-600 bg-amber-50',
          },
          {
            label: 'Mensalidade',
            value: `R$${conta.mensalidade}`,
            icon: <BarChart3 className="h-5 w-5" />,
            color: 'text-red-600 bg-orange-50',
          },
        ].map((s) => (
          <motion.div
            key={s.label}
            whileHover={{ y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <Card className="border-gray-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={cn('p-2 rounded-lg', s.color)}>{s.icon}</div>
                </div>
                <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* PDF Upload */}
      <Card className="border-gray-100">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Upload className="h-4 w-4 text-red-600" />
            Enviar Encarte
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <form onSubmit={handleUpload} className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Título do encarte"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="flex-1 h-10"
            />
            <input
              id="pdf-upload"
              type="file"
              accept=".pdf"
              className="text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-orange-50 file:text-red-700 hover:file:bg-red-50"
            />
            <Button
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white h-10 shrink-0"
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Enviar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* BI Dashboard */}
      {bi && (
        <Card className="border-gray-100">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-red-600" />
              Dashboard BI
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            {/* Weekly clicks + trend */}
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-gray-500">Cliques semanais</p>
                <p className="text-2xl font-bold text-gray-800">
                  {bi.cliquesSemana.length > 0
                    ? bi.cliquesSemana[bi.cliquesSemana.length - 1].total
                    : 0}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {bi.trend >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-red-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span
                  className={cn(
                    'text-sm font-semibold',
                    bi.trend >= 0 ? 'text-red-600' : 'text-red-600',
                  )}
                >
                  {bi.trend >= 0 ? '+' : ''}
                  {bi.trend}%
                </span>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-gray-500">Região</p>
                <p className="text-sm font-medium text-gray-700">
                  {bi.regiao || '—'}
                </p>
              </div>
            </div>

            {/* Top product */}
            {bi.topProdutos.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Produto mais clicado</p>
                <p className="text-sm font-semibold text-gray-800">
                  {bi.topProdutos[0].nome}
                  {bi.topProdutos[0].marca &&
                    ` · ${bi.topProdutos[0].marca}`}
                </p>
                <p className="text-xs text-gray-400">
                  {bi.topProdutos[0].cliques} cliques
                </p>
              </div>
            )}

            <Separator />

            {/* Bar Chart - Top 10 produtos */}
            {bi.topProdutos.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-3">
                  Top 10 produtos por cliques
                </p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={bi.topProdutos.slice(0, 10)}
                      margin={{ top: 0, right: 0, left: 0, bottom: 40 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f0f0f0"
                      />
                      <XAxis
                        dataKey="nome"
                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                        height={60}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                        width={30}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: '1px solid #e5e7eb',
                          fontSize: 12,
                        }}
                        formatter={(value: number) => [
                          `${value} cliques`,
                          'Cliques',
                        ]}
                      />
                      <Bar dataKey="cliques" radius={[4, 4, 0, 0]}>
                        {bi.topProdutos.slice(0, 10).map((_, i) => (
                          <Cell
                            key={i}
                            fill={i === 0 ? '#dc2626' : '#fb923c'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {bi.topProdutos.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">
                Nenhum clique registrado ainda
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Encartes list */}
      <Card className="border-gray-100">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-red-600" />
            Meus Encartes ({encartes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {encartes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              Nenhum encarte enviado ainda
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {encartes.map((e) => (
                <div
                  key={e.id}
                  className="border border-gray-100 rounded-lg overflow-hidden"
                >
                  <button
                    className="w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    onClick={() => toggleEncarte(e.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-red-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {e.titulo}
                        </p>
                        <p className="text-xs text-gray-400">
                          {e._count.produtos} produto
                          {e._count.produtos !== 1 ? 's' : ''} ·{' '}
                          {extracaoLabel(e.statusExtracao)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={
                          e.statusExtracao === 'concluido'
                            ? 'default'
                            : e.statusExtracao === 'erro'
                              ? 'destructive'
                              : 'secondary'
                        }
                        className="text-[10px]"
                      >
                        {extracaoLabel(e.statusExtracao)}
                      </Badge>
                      {expandedEncarte === e.id ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
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
                          <div className="border-t border-gray-50 max-h-60 overflow-y-auto">
                            {encarteProducts[e.id].map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between px-3 py-2 border-b border-gray-50 last:border-0"
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-medium truncate">
                                    {p.nome}
                                    {p.marca && (
                                      <span className="text-gray-400 font-normal ml-1">
                                        · {p.marca}
                                      </span>
                                    )}
                                  </p>
                                  {p.unidade && (
                                    <p className="text-[10px] text-gray-400">
                                      {p.unidade}
                                    </p>
                                  )}
                                </div>
                                <span className="text-xs font-bold text-red-600 shrink-0 ml-2">
                                  {p.preco}
                                </span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── MarketPanel ─────────────────────────────────────────────────────────────

interface MarketPanelProps {
  onLogout: () => void
  onLogin: () => void
}

export default function MarketPanel({ onLogout, onLogin }: MarketPanelProps) {
  const session = useSession()
  const [conta, setConta] = useState<ContaData | null>(null)
  const [dataFetched, setDataFetched] = useState(false)
  const loading = session?.tipo === 'mercado' ? !dataFetched : false

  useEffect(() => {
    if (session?.tipo !== 'mercado') return
    let cancelled = false
    api<ContaData>('/api/mercado/conta')
      .then((d) => {
        if (!cancelled) setConta(d)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setDataFetched(true)
      })
    return () => {
      cancelled = true
    }
  }, [session])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  if (session?.tipo !== 'mercado' || !conta) {
    return <LoginForm onLogin={onLogin} />
  }

  return <Dashboard conta={conta} onLogout={onLogout} />
}