'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  Headphones,
  Send,
  CheckCircle,
  BarChart3,
  Loader2,
  UserCircle,
  Save,
  Trash2,
  X,
  Eye,
  Pencil,
  CreditCard,
  Calendar,
  Lock,
  QrCode,
  AlertTriangle,
  ChevronRight,
  Banknote,
  Clock,
} from 'lucide-react'

// ── Google Icon SVG ──
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}
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
import { UploadLoading } from './LoadingAnimation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  pilotoInicio?: string | null
  pilotoFim?: string | null
  endereco?: string | null
  telefone?: string | null
  segmento?: string | null
  formaPagamento?: string | null
  dataProximoPagamento?: string | null
  ultimoPagamento?: string | null
  ultimoPagamentoValor?: number | null
  dataFimAcesso?: string | null
  diasParaVencer?: number | null
  dentroJanelaAviso?: boolean
  dentroCarencia72h?: boolean
  horasRestantesCarencia?: number | null
  bloqueado?: boolean
  emailSuporte?: string
  dataEscolhaPagamento?: string | null
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
  totalVisualizacoes: number
  totalCliquesProdutos: number
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
  pdfPath?: string | null
  dataInicio?: string | null
  dataFim?: string | null
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

function formatCPF(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [tab, setTab] = useState<'pf' | 'pj'>('pf')

  // PF (Consumidor) — Email/Senha + Cadastro
  const [modoCadastro, setModoCadastro] = useState(false)
  const [nomeCadastro, setNomeCadastro] = useState('')

  // Esqueci a senha
  const [modoEsqueci, setModoEsqueci] = useState(false)
  const [esqueciEmail, setEsqueciEmail] = useState('')
  const [esqueciCnpj, setEsqueciCnpj] = useState('')
  const [esqueciNovaSenha, setEsqueciNovaSenha] = useState('')
  const [esqueciLoading, setEsqueciLoading] = useState(false)

  // PJ (Empresa) — CNPJ + e-mail + senha + cadastro
  const [cnpj, setCnpj] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [modoCadastroPj, setModoCadastroPj] = useState(false)
  const [nomeMercado, setNomeMercado] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [cpf, setCpf] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [telefone, setTelefone] = useState('')
  const [segmento, setSegmento] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)

  // ── Detecta se está rodando dentro de um WebView (Android APK) ──
  const isWebView = typeof navigator !== 'undefined' && /PanfletosBrasilApp/i.test(navigator.userAgent)

  // ── Google Redirect Result (apenas para navegador normal, NÃO WebView) ──
  // No WebView usamos fluxo OAuth server-side (/api/auth/google-oauth-start)
  useEffect(() => {
    if (isWebView) return // WebView usa fluxo próprio, não signInWithRedirect

    const checkRedirectResult = async () => {
      try {
        const { getRedirectResult } = await import('firebase/auth')
        const { getFirebaseAuth } = await import('@/lib/firebase')
        const auth = getFirebaseAuth()
        if (!auth) return

        const result = await getRedirectResult(auth)
        if (result?.user) {
          const idToken = await result.user.getIdToken()
          await api('/api/auth/google-login', {
            method: 'POST',
            body: JSON.stringify({ idToken }),
          })
          toast.success('Login com Google realizado!')
          onLogin()
        }
      } catch (err) {
        console.error('[Google Redirect] erro:', err)
      } finally {
        setGoogleLoading(false)
      }
    }
    checkRedirectResult()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Google Login (Consumidor) ──
  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    try {
      const { getFirebaseAuth } = await import('@/lib/firebase')
      const auth = getFirebaseAuth()
      if (!auth) {
        toast.error('Firebase não configurado. Use e-mail e senha.')
        setGoogleLoading(false)
        return
      }

      const { GoogleAuthProvider } = await import('firebase/auth')
      const provider = new GoogleAuthProvider()

      if (isWebView) {
        // WebView: fluxo OAuth server-side (sem signInWithRedirect do Firebase)
        // O Firebase signInWithRedirect falha no WebView porque guarda estado
        // em sessionStorage que se perde quando o Chrome abre.
        // Nosso fluxo: /api/auth/google-oauth-start → Google (Chrome) →
        // /google-oauth-callback → panfletosbrasil://auth-callback → APK recarrega
        window.location.href = '/api/auth/google-oauth-start'
        return // Nao faz mais nada — o fluxo continua no Chrome e volta ao app
      } else {
        // Navegador normal: usa popup
        const { signInWithPopup } = await import('firebase/auth')
        const result = await signInWithPopup(auth, provider)
        const idToken = await result.user.getIdToken()

        await api('/api/auth/google-login', {
          method: 'POST',
          body: JSON.stringify({ idToken }),
        })

        toast.success('Login com Google realizado!')
        onLogin()
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        setGoogleLoading(false)
        return
      }
      console.error('[Google Login] erro:', err)
      toast.error(err instanceof Error ? err.message : 'Erro ao fazer login com Google')
    } finally {
      setGoogleLoading(false)
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

  const handlePfCadastro = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomeCadastro || !email || !senha) {
      toast.error('Preencha nome, e-mail e senha')
      return
    }
    if (senha.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres')
      return
    }
    setLoading(true)
    try {
      await api('/api/auth/cadastro', {
        method: 'POST',
        body: JSON.stringify({ email, senha, nome: nomeCadastro }),
      })
      toast.success('Conta criada com sucesso!')
      onLogin()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao cadastrar')
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
        body: JSON.stringify({ email, senha, tipo: 'mercado', cnpj: cnpjLimpo, tipoLogin: 'pj' }),
      })
      toast.success('Login de empresa realizado!')
      onLogin()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  const handlePjCadastro = async (e: React.FormEvent) => {
    e.preventDefault()
    const cnpjLimpo = cnpj.replace(/\D/g, '')
    const cpfLimpo = cpf.replace(/\D/g, '')
    if (!nomeMercado || !cnpjLimpo || !email || !senha || !cidade || !estado || !responsavel || !cpfLimpo || !segmento) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }
    if (cnpjLimpo.length !== 14) {
      toast.error('CNPJ inválido. Digite 14 dígitos.')
      return
    }
    if (cpfLimpo.length !== 11) {
      toast.error('CPF inválido. Digite 11 dígitos.')
      return
    }
    if (senha.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres')
      return
    }
    setLoading(true)
    try {
      await api('/api/auth/cadastro-mercado', {
        method: 'POST',
        body: JSON.stringify({
          nome: nomeMercado,
          cnpj: cnpjLimpo,
          email,
          senha,
          cidade,
          estado,
          responsavel,
          cpf: cpfLimpo,
          telefone,
          segmento,
        }),
      })
      const segmentoLabel = segmento === 'farmacias' ? 'Farmácia' : segmento === 'petshops' ? 'PetShop' : 'Empresa'
      toast.success(`${segmentoLabel} cadastrado! 60 dias de piloto grátis.`)
      onLogin()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao cadastrar empresa')
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
            alt="Panfletos Brasil"
            className="h-20 w-20 rounded-2xl object-cover mx-auto mb-3 shadow-md"
          />
          <CardTitle className="text-lg">Panfletos Brasil</CardTitle>
          <p className="text-xs text-gray-500 mt-1">
            Acesse para gerenciar e comparar encartes
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'pf' | 'pj')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pf">Consumidor</TabsTrigger>
              <TabsTrigger value="pj">Empresa (CNPJ)</TabsTrigger>
            </TabsList>

            {/* ── PF: Email/Senha + Cadastro (sem Google) ── */}
            <TabsContent value="pf" className="space-y-3 mt-4">
              {!modoCadastro ? (
                <>
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

                  {/* Separador */}
                  <div className="relative flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">ou</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  {/* Aviso conexão Google */}
                  <p className="text-red-600 text-[13px] font-semibold text-center leading-snug">
                    Ao se conectar com sua Conta Google, aguarde. Após retornar ao app você será redirecionado à tela Inicial.
                  </p>

                  {/* Botão Google */}
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={googleLoading || loading}
                    className="w-full flex items-center justify-center gap-3 h-11 px-4 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50"
                  >
                    {googleLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                    ) : (
                      <GoogleIcon className="h-5 w-5" />
                    )}
                    <span className="text-sm font-medium text-gray-700">Entrar com Google</span>
                  </button>

                  <p className="text-[11px] text-gray-400 text-center pt-1">
                    Não tem conta?{' '}
                    <button
                      type="button"
                      onClick={() => setModoCadastro(true)}
                      className="text-red-600 font-semibold hover:underline"
                    >
                      Cadastre-se grátis
                    </button>
                  </p>
                  <p className="text-center">
                    <button
                      type="button"
                      onClick={() => { setModoEsqueci(true); setEsqueciCnpj('') }}
                      className="text-[11px] text-gray-500 hover:text-red-600 hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-500 text-center mb-2">
                    Crie sua conta de consumidor
                  </p>

                  {/* Aviso conexão Google (cadastro) */}
                  <p className="text-red-600 text-[13px] font-semibold text-center leading-snug">
                    Ao se conectar com sua Conta Google, aguarde. Após retornar ao app você será redirecionado à tela Inicial.
                  </p>

                  {/* Botão Google (também no cadastro) */}
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={googleLoading || loading}
                    className="w-full flex items-center justify-center gap-3 h-11 px-4 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50"
                  >
                    {googleLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                    ) : (
                      <GoogleIcon className="h-5 w-5" />
                    )}
                    <span className="text-sm font-medium text-gray-700">Cadastrar com Google</span>
                  </button>

                  <div className="relative flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">ou com e-mail</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  <form onSubmit={handlePfCadastro} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Nome completo</Label>
                      <Input
                        type="text"
                        placeholder="Seu nome"
                        value={nomeCadastro}
                        onChange={(e) => setNomeCadastro(e.target.value)}
                        autoComplete="name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">E-mail</Label>
                      <Input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Senha (mín. 6 caracteres)</Label>
                      <Input type="password" placeholder="••••••••" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" />
                    </div>
                    <Button type="submit" className="w-full bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white h-11" disabled={loading}>
                      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Criar conta
                    </Button>
                  </form>
                  <p className="text-[11px] text-gray-400 text-center pt-1">
                    Já tem conta?{' '}
                    <button
                      type="button"
                      onClick={() => setModoCadastro(false)}
                      className="text-red-600 font-semibold hover:underline"
                    >
                      Fazer login
                    </button>
                  </p>
                </>
              )}
            </TabsContent>

            {/* ── PJ: Login + Cadastro de Empresa ── */}
            <TabsContent value="pj" className="space-y-3 mt-4">
              {!modoCadastroPj ? (
                <>
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
                        placeholder="sua@empresa.com"
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
                      Entrar como Empresa
                    </Button>
                  </form>
                  <p className="text-[11px] text-gray-400 text-center pt-1">
                    Não tem conta?{' '}
                    <button
                      type="button"
                      onClick={() => setModoCadastroPj(true)}
                      className="text-red-600 font-semibold hover:underline"
                    >
                      Cadastre sua empresa grátis
                    </button>
                  </p>
                  <p className="text-center">
                    <button
                      type="button"
                      onClick={() => { setModoEsqueci(true); setEsqueciEmail(email) }}
                      className="text-[11px] text-gray-500 hover:text-red-600 hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-500 text-center mb-2">
                    Cadastre sua empresa — 60 dias de piloto grátis
                  </p>
                  <form onSubmit={handlePjCadastro} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Nome da empresa *</Label>
                      <Input
                        type="text"
                        placeholder="Supermercado Exemplo"
                        value={nomeMercado}
                        onChange={(e) => setNomeMercado(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Segmento *</Label>
                      <select
                        value={segmento}
                        onChange={(e) => setSegmento(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Selecione...</option>
                        <option value="mercados">Supermercados</option>
                        <option value="farmacias">Farmácias</option>
                        <option value="petshops">PetShops</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-sm">CNPJ *</Label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="00.000.000/0000-00"
                          value={cnpj}
                          onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Telefone</Label>
                        <Input
                          type="text"
                          placeholder="(11) 99999-9999"
                          value={telefone}
                          onChange={(e) => setTelefone(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-sm">Responsável *</Label>
                        <Input
                          type="text"
                          placeholder="Nome do responsável"
                          value={responsavel}
                          onChange={(e) => setResponsavel(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">CPF *</Label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="000.000.000-00"
                          value={cpf}
                          onChange={(e) => setCpf(formatCPF(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">E-mail *</Label>
                      <Input
                        type="email"
                        placeholder="contato@empresa.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-sm">Cidade *</Label>
                        <Input
                          type="text"
                          placeholder="São Paulo"
                          value={cidade}
                          onChange={(e) => setCidade(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">UF *</Label>
                        <Input
                          type="text"
                          maxLength={2}
                          placeholder="SP"
                          value={estado}
                          onChange={(e) => setEstado(e.target.value.toUpperCase())}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Senha (mín. 6 caracteres) *</Label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        autoComplete="new-password"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white h-11"
                      disabled={loading}
                    >
                      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Cadastrar Empresa
                    </Button>
                  </form>
                  <p className="text-[11px] text-gray-400 text-center pt-1">
                    Já tem conta?{' '}
                    <button
                      type="button"
                      onClick={() => setModoCadastroPj(false)}
                      className="text-red-600 font-semibold hover:underline"
                    >
                      Fazer login
                    </button>
                  </p>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ── Esqueci a Senha Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {modoEsqueci && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4"
            onClick={() => setModoEsqueci(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-bold text-gray-800 mb-1">Redefinir senha</h3>
              <p className="text-xs text-gray-500 mb-4">
                {tab === 'pj'
                  ? 'Informe o CNPJ, e-mail cadastrado e a nova senha.'
                  : 'Informe o e-mail cadastrado e a nova senha.'}
              </p>
              <form
                className="space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!esqueciEmail || !esqueciNovaSenha) {
                    toast.error('Preencha todos os campos')
                    return
                  }
                  if (esqueciNovaSenha.length < 6) {
                    toast.error('Nova senha deve ter no mínimo 6 caracteres')
                    return
                  }
                  setEsqueciLoading(true)
                  try {
                    await api('/api/auth/esqueci-senha', {
                      method: 'POST',
                      body: JSON.stringify({
                        email: esqueciEmail,
                        novaSenha: esqueciNovaSenha,
                        tipo: tab === 'pj' ? 'mercado' : 'usuario',
                        cnpj: tab === 'pj' ? esqueciCnpj.replace(/\D/g, '') : undefined,
                      }),
                    })
                    toast.success('Senha atualizada com sucesso!')
                    setModoEsqueci(false)
                    setEsqueciNovaSenha('')
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Erro ao redefinir')
                  } finally {
                    setEsqueciLoading(false)
                  }
                }}
              >
                {tab === 'pj' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">CNPJ *</Label>
                    <Input
                      value={esqueciCnpj}
                      onChange={(e) => setEsqueciCnpj(formatCNPJ(e.target.value))}
                      placeholder="00.000.000/0001-00"
                      className="h-9 text-sm"
                      maxLength={18}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs">E-mail *</Label>
                  <Input
                    type="email"
                    value={esqueciEmail}
                    onChange={(e) => setEsqueciEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nova Senha (mín. 6 caracteres) *</Label>
                  <Input
                    type="password"
                    value={esqueciNovaSenha}
                    onChange={(e) => setEsqueciNovaSenha(e.target.value)}
                    placeholder="•••••••"
                    className="h-9 text-sm"
                    autoComplete="new-password"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={esqueciLoading}
                    className="bg-red-600 hover:bg-red-700 text-white h-9 text-xs flex-1"
                  >
                    {esqueciLoading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                    Redefinir
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setModoEsqueci(false)}
                    className="h-9 text-xs"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [uploading, setUploading] = useState(false)

  // Review state (pós-upload)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewEncarteId, setReviewEncarteId] = useState('')
  const [reviewProdutos, setReviewProdutos] = useState<Array<{ nome: string; marca: string | null; preco: string; unidade: string | null }>>([])
  const [reviewPublishing, setReviewPublishing] = useState(false)
  // Manual item add within review modal
  const [reviewAddMode, setReviewAddMode] = useState(false)
  const [reviewNewItem, setReviewNewItem] = useState({ nome: '', marca: '', preco: '', unidade: 'un' })

  // Delete encarte
  const [deletingEncarte, setDeletingEncarte] = useState<string | null>(null)

  // Manual entry state
  const [manualEntryOpen, setManualEntryOpen] = useState(false)
  const [manualItens, setManualItens] = useState<Array<{nome: string; marca: string; preco: string; unidade: string}>>([])
  const [manualItem, setManualItem] = useState({nome: '', marca: '', preco: '', unidade: 'un'})
  const lastEncarteIdRef = useRef<string>('')

  // Delete produto individual
  const [deletingProduto, setDeletingProduto] = useState<string | null>(null)

  // Suporte state
  const [suporteOpen, setSuporteOpen] = useState(false)
  const [suporteCat, setSuporteCat] = useState('')
  const [suporteAssunto, setSuporteAssunto] = useState('')
  const [suporteMsg, setSuporteMsg] = useState('')
  const [suporteSending, setSuporteSending] = useState(false)
  const [suporteEnviado, setSuporteEnviado] = useState(false)

  // Perfil state
  const [perfilEndereco, setPerfilEndereco] = useState(conta.endereco || '')
  const [perfilTelefone, setPerfilTelefone] = useState(conta.telefone || '')
  const [savingPerfil, setSavingPerfil] = useState(false)

  const handleSavePerfil = async () => {
    setSavingPerfil(true)
    try {
      await api('/api/mercado/perfil', {
        method: 'PUT',
        body: JSON.stringify({ endereco: perfilEndereco, telefone: perfilTelefone }),
      })
      toast.success('Perfil atualizado com sucesso!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar perfil')
    } finally {
      setSavingPerfil(false)
    }
  }

  const handleSuporte = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuporteSending(true)
    try {
      await api('/api/contato', {
        method: 'POST',
        body: JSON.stringify({ categoria: suporteCat, assunto: suporteAssunto.trim(), mensagem: suporteMsg.trim() }),
      })
      toast.success('Mensagem enviada com sucesso!')
      setSuporteEnviado(true)
      setSuporteAssunto('')
      setSuporteMsg('')
      setSuporteCat('')
      setTimeout(() => setSuporteEnviado(false), 5000)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar')
    } finally {
      setSuporteSending(false)
    }
  }

  // Refresh encartes
  const refreshEncartes = useCallback(() => {
    api<{ encartes: any[] }>('/api/mercado/meus-encartes')
      .then((d) => setEncartes(d.encartes || []))
      .catch(() => {})
  }, [])

  // Fetch BI
  useEffect(() => {
    api<BIData>('/api/mercado/bi')
      .then(setBi)
      .catch(() => {})
  }, [])

  // Fetch encartes com produtos do mercado logado
  useEffect(() => {
    refreshEncartes()
  }, [conta.id, refreshEncartes])

  // Upload PDF → abre revisão
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim()) {
      toast.error('Informe o título do encarte')
      return
    }
    if (!dataInicio) {
      toast.error('Informe a data de início da promoção')
      return
    }
    if (!dataFim) {
      toast.error('Informe a data de fim da promoção')
      return
    }
    if (new Date(dataFim) < new Date(dataInicio)) {
      toast.error('Data fim deve ser igual ou posterior à data início')
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
      fd.append('dataInicio', dataInicio)
      fd.append('dataFim', dataFim)
      fd.append('pdf', file)
      const result = await api<{ ok: boolean; encarte: any; produtos?: any[]; log?: string; erro?: string }>('/api/mercado/encarte', {
        method: 'POST',
        body: fd,
      })
      if ((result as any).erro) {
        toast.error((result as any).erro, { duration: 5000 })
        return
      }
      const encarteId = result.encarte?.id
      const produtos = result.produtos || []
      if (produtos.length > 0) {
        toast.success(`${produtos.length} produto(s) extraído(s) e salvo(s) com sucesso!`)
        // Abre tela de revisão para edição opcional
        setReviewEncarteId(encarteId)
        setReviewProdutos(produtos)
        setReviewOpen(true)
      } else {
        lastEncarteIdRef.current = result.encarte?.id || ''
        toast.error('Nenhum produto extraído do PDF. Você pode adicionar os itens manualmente.', { duration: 6000 })
        setManualEntryOpen(true)
      }
      setTitulo('')
      setDataInicio('')
      setDataFim('')
      if (input) input.value = ''
      // Refresh
      refreshEncartes()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar')
    } finally {
      setUploading(false)
    }
  }

  // Publicar produtos após revisão
  const handlePublish = async () => {
    if (reviewProdutos.length === 0) {
      toast.error('Nenhum produto para publicar')
      return
    }
    setReviewPublishing(true)
    try {
      const res = await api<{ ok: boolean; totalSalvos: number }>(`/api/mercado/encarte/${reviewEncarteId}/publicar`, {
        method: 'POST',
        body: JSON.stringify({ produtos: reviewProdutos }),
      })
      toast.success(`${res.totalSalvos} produto(s) publicado(s) com sucesso!`)
      setReviewOpen(false)
      setReviewProdutos([])
      setReviewEncarteId('')
      refreshEncartes()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao publicar')
    } finally {
      setReviewPublishing(false)
    }
  }

  // Excluir produto da revisão
  const removeReviewProduto = (index: number) => {
    setReviewProdutos((prev) => prev.filter((_, i) => i !== index))
  }

  // Manual entry handlers
  const [manualPublishing, setManualPublishing] = useState(false)

  const handleAddManualItem = () => {
    if (!manualItem.nome.trim() || !manualItem.preco.trim()) {
      toast.error('Nome e preço são obrigatórios')
      return
    }
    const precoNum = parseFloat(manualItem.preco.replace(',', '.'))
    if (isNaN(precoNum) || precoNum <= 0) {
      toast.error('Preço inválido')
      return
    }
    setManualItens((prev) => [...prev, { ...manualItem }])
    setManualItem({ nome: '', marca: '', preco: '', unidade: 'un' })
  }

  const handleRemoveManualItem = (index: number) => {
    setManualItens((prev) => prev.filter((_, i) => i !== index))
  }

  const handlePublishManual = async () => {
    if (manualItens.length === 0) {
      toast.error('Adicione pelo menos um produto')
      return
    }
    if (!lastEncarteIdRef.current) {
      toast.error('Encarte não encontrado. Tente enviar o PDF novamente.')
      return
    }
    setManualPublishing(true)
    try {
      await api<{ ok: boolean; totalItens: number }>('/api/mercado/encarte/manual', {
        method: 'POST',
        body: JSON.stringify({ encarteId: lastEncarteIdRef.current, itens: manualItens }),
      })
      toast.success(`${manualItens.length} produto(s) publicado(s) com sucesso!`)
      setManualEntryOpen(false)
      setManualItens([])
      setManualItem({ nome: '', marca: '', preco: '', unidade: 'un' })
      lastEncarteIdRef.current = ''
      refreshEncartes()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao publicar encarte')
    } finally {
      setManualPublishing(false)
    }
  }

  // Excluir encarte
  const handleDeleteEncarte = async (eid: string) => {
    setDeletingEncarte(eid)
    try {
      await api<{ ok: boolean }>(`/api/mercado/encarte/${eid}`, { method: 'DELETE' })
      toast.success('Encarte excluído!')
      if (expandedEncarte === eid) setExpandedEncarte(null)
      refreshEncartes()
    } catch (err: any) {
      const msg = err?.message || 'Erro ao excluir'
      console.error('[deleteEncarte]', msg)
      toast.error(msg, { duration: 5000 })
    } finally {
      setDeletingEncarte(null)
    }
  }

  // Excluir produto individual de encarte já publicado
  const handleDeleteProduto = async (produtoId: string, encarteId: string) => {
    setDeletingProduto(produtoId)
    try {
      await api(`/api/mercado/produto/${produtoId}`, { method: 'DELETE' })
      toast.success('Produto removido!')
      // Refresh produtos do encarte
      const prods = await api<any[]>(`/api/mercado/encarte/${encarteId}/produtos`)
      setEncarteProducts((prev) => ({ ...prev, [encarteId]: prods }))
      refreshEncartes()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover')
    } finally {
      setDeletingProduto(null)
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

  // Pilot countdown helper
  const pilotoDaysLeft = conta.pilotoFim
    ? Math.max(0, Math.ceil((new Date(conta.pilotoFim).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  const isPilotoActive = conta.status === 'piloto' && pilotoDaysLeft !== null && pilotoDaysLeft > 0
  const isPilotoExpirado = conta.statusEfetivo === 'piloto_expirado' || conta.statusEfetivo === 'teste_gratis_expirado'
  const isAguardandoPagamento = conta.statusEfetivo === 'ativo_aguardando_pagamento'
  const isAssinaturaCancelada = conta.statusEfetivo === 'assinatura_cancelada'
  const isPagamentoVencido = conta.statusEfetivo === 'pagamento_vencido'
  const isAguardando72h = conta.statusEfetivo === 'aguardando_confirmacao_72h'
  const isAtivo = conta.status === 'ativo'

  // ── Tela de bloqueio: APENAS quando piloto/teste grátis expira SEM carência,
  // pagamento vencido SEM carência, assinatura cancelada, ou conta inativa ──
  const isInativo = conta.status === 'inativo' || conta.statusEfetivo === 'inativo'

  if (isPilotoExpirado || isAssinaturaCancelada || isPagamentoVencido || isInativo) {
    return <PaymentBlockScreen conta={conta} />
  }

  // ── Empresa em piloto ativo (mais de 3 dias restantes) — SEM popup de pagamento ──
  const isPilotoComDiasRestantes = (conta.status === 'piloto' || conta.status === 'teste_gratis')
    && pilotoDaysLeft !== null && pilotoDaysLeft > 3

  return (
    <div className="space-y-6">
      {/* ── Popup de aviso fechável ── */}
      {/* NÃO aparece para empresa em piloto com mais de 3 dias restantes */}
      {!isPilotoComDiasRestantes && (conta.dentroJanelaAviso || isAguardandoPagamento || isAguardando72h) && (
        <PreVencimentoPopup conta={conta} />
      )}

      {/* ── Aviso de renovação de assinatura (mantido para compatibilidade) ── */}
      {isAtivo && conta.formaPagamento && conta.formaPagamento !== 'cartao_recorrente' && conta.dataProximoPagamento && !conta.dentroJanelaAviso && (
        <RenewalWarningBanner conta={conta} />
      )}

      <Tabs defaultValue="painel">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="painel" className="text-xs gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Painel
          </TabsTrigger>
          <TabsTrigger value="conta" className="text-xs gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            Conta
          </TabsTrigger>
          <TabsTrigger value="perfil" className="text-xs gap-1.5">
            <UserCircle className="h-3.5 w-3.5" />
            Perfil
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Painel ── */}
        <TabsContent value="painel" className="space-y-6 mt-4">
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
            badge: (conta.statusEfetivo === 'piloto' || conta.status === 'piloto')
              ? 'Piloto — isento' : undefined,
          },
        ].map((s) => (
          <motion.div
            key={s.label}
            whileHover={{ y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <Card className="border-gray-100 relative overflow-visible">
              <CardContent className="p-4">
                {(s as any).badge && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="bg-blue-500 text-white text-[9px] px-2 py-0.5 shadow-sm whitespace-nowrap">
                      {(s as any).badge}
                    </Badge>
                  </div>
                )}
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
          {/* Aviso sobre formato do PDF */}
          <div className="mb-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800 leading-relaxed">
            <span className="text-amber-500 text-base mt-0.5 shrink-0">⚠</span>
            <span>
              <strong>Formato do PDF:</strong> envie encartes em PDF com <strong>texto</strong> (nome + preço). Encartes feitos no Canva, Designer ou outras ferramentas de design que exportam os produtos como <strong>imagens</strong> (textos transformados em figura) não serão lidos pelo sistema. Se o PDF não for lido total ou parcialmente pelo app, você poderá incluir os itens manualmente.
            </span>
          </div>
          {uploading ? (
            <UploadLoading />
          ) : (
            <form onSubmit={handleUpload} className="flex flex-col gap-3">
            <Input
              placeholder="Título do encarte"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="h-10"
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Início da promoção *</Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="h-10 text-sm"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Fim da promoção *</Label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="h-10 text-sm"
                  required
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                className="text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-orange-50 file:text-red-700 hover:file:bg-red-50 flex-1"
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
            </div>
          </form>
          )}
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
            {/* KPIs: interações semanais + visualizações + cliques de produto */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-gray-500">Interações semana</p>
                <p className="text-2xl font-bold text-gray-800">
                  {bi.cliquesSemana.length > 0
                    ? bi.cliquesSemana[bi.cliquesSemana.length - 1].total
                    : 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Visualizações</p>
                <p className="text-2xl font-bold text-orange-600">
                  {bi.totalVisualizacoes || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Cliques produtos</p>
                <p className="text-2xl font-bold text-red-600">
                  {bi.totalCliquesProdutos || 0}
                </p>
              </div>
            </div>

            {/* Trend + Região */}
            <div className="flex items-center gap-4">
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
                <span className="text-xs text-gray-400 ml-1">vs semana anterior</span>
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
              {encartes.map((e) => {
                const prods = (e as any).produtos || []
                const numProdutos = prods.length || (e as any)._count?.produtos || 0
                return (
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
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">
                            {e.titulo}
                          </p>
                          {(e as any).expirado && (
                            <Badge variant="outline" className="text-[9px] text-gray-400 border-gray-300 shrink-0">
                              Expirado
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">
                          {numProdutos} produto{numProdutos !== 1 ? 's' : ''} ·{' '}
                          {extracaoLabel(e.statusExtracao)}
                          {(e as any).dataInicio && (
                            <> · {(e as any).dataInicio.split('T')[0].split('-').reverse().join('/')} — {(e as any).dataFim ? (e as any).dataFim.split('T')[0].split('-').reverse().join('/') : '—'}</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(e as any).pdfPath && (
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
                      <button
                        onClick={(ev) => { ev.stopPropagation(); if (confirm('Excluir este encarte e todos os produtos?')) handleDeleteEncarte(e.id) }}
                        disabled={deletingEncarte === e.id}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        title="Excluir encarte"
                      >
                        {deletingEncarte === e.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
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
                    {expandedEncarte === e.id && prods.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-gray-50 max-h-60 overflow-y-auto">
                            {prods.map((p: any) => (
                                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-50 last:border-0">
                                <div className="min-w-0 flex-1">
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
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  <span className="text-xs font-bold text-red-600">
                                    {p.preco}
                                  </span>
                                  <button
                                    onClick={(ev) => { ev.stopPropagation(); if (confirm('Excluir este produto?')) handleDeleteProduto(p.id, e.id) }}
                                    disabled={deletingProduto === p.id}
                                    className="text-gray-300 hover:text-red-500 transition-colors"
                                    title="Excluir produto"
                                  >
                                    {deletingProduto === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                  </AnimatePresence>
                </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suporte ── */}
      <Card className="border-blue-100">
        <CardHeader className="pb-3 pt-4 px-4 cursor-pointer select-none" onClick={() => setSuporteOpen(!suporteOpen)}>
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Headphones className="h-4 w-4 text-blue-600" />
              Suporte
            </span>
            {suporteOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </CardTitle>
        </CardHeader>
        <AnimatePresence>
          {suporteOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <CardContent className="px-4 pb-4 space-y-3 border-t border-blue-50">
                {suporteEnviado ? (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                    <p className="text-sm text-green-800">Mensagem enviada! Responderemos em breve.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSuporte} className="space-y-3">
                    <p className="text-xs text-blue-700/70">Sua mensagem será identificada com a empresa <strong>{conta.nome}</strong>.</p>
                    <Select value={suporteCat} onValueChange={setSuporteCat}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Categoria" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sugestão">Sugestão</SelectItem>
                        <SelectItem value="Problemas Técnicos">Problemas Técnicos</SelectItem>
                        <SelectItem value="Encarte com falha no upload">Encarte com falha no upload</SelectItem>
                        <SelectItem value="Outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="Assunto" value={suporteAssunto} onChange={e => setSuporteAssunto(e.target.value)} className="h-10" />
                    <textarea placeholder="Descreva sua solicitação..." value={suporteMsg} onChange={e => setSuporteMsg(e.target.value)} rows={4} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10 text-sm" disabled={suporteSending || !suporteCat || !suporteAssunto.trim() || !suporteMsg.trim()}>
                      {suporteSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                      Enviar Mensagem
                    </Button>
                  </form>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
        </TabsContent>

        {/* ── Tab: Conta ── */}
        <TabsContent value="conta" className="space-y-4 mt-4">
          {/* Market info */}
          <Card className="border-gray-100">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-red-600" />
                Informações da Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2.5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{conta.nome}</p>
                  <p className="text-xs text-gray-400">CNPJ: XX.XXX.XXX/XXXX-XX</p>
                </div>
                {statusBadge(conta.statusEfetivo)}
              </div>
              <Separator />
              <div className="grid gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span className="text-gray-600">{conta.cidade}/{conta.estado}</span>
                </div>
                {conta.endereco && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span className="text-gray-600">{conta.endereco}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-3.5 shrink-0">✉</span>
                  <span className="text-gray-600">{conta.emailLogin}</span>
                </div>
                {conta.telefone && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-3.5 shrink-0">☎</span>
                    <span className="text-gray-600">{conta.telefone}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pilot period */}
          {isPilotoActive && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <p className="text-sm font-semibold text-blue-800">Período Piloto</p>
                </div>
                <p className="text-xs text-blue-700">
                  Seu período piloto termina em <strong className="text-blue-900">{pilotoDaysLeft} dia{pilotoDaysLeft !== 1 ? 's' : ''}</strong>
                  {conta.pilotoFim && (
                    <> ({new Date(conta.pilotoFim).toLocaleDateString('pt-BR')})</>
                  )}
                </p>
                {conta.pilotoInicio && (
                  <p className="text-[10px] text-blue-500 mt-1">
                    Início: {new Date(conta.pilotoInicio).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {isPilotoExpirado && (
            <Card className="border-orange-300 bg-orange-50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <p className="text-sm font-semibold text-orange-800">Período Piloto Expirado</p>
                </div>
                <p className="text-xs text-orange-700">
                  Seu período piloto expirou! Para continuar usando a plataforma, você precisa assinar o contrato PJ e efetuar o pagamento mensal.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-orange-300 text-orange-700 hover:bg-orange-100 text-xs"
                  onClick={() => toast.info('Contrato PJ será disponibilizado em breve.')}
                >
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  Ver Contrato PJ
                </Button>
              </CardContent>
            </Card>
          )}

          {isAtivo && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <p className="text-sm font-semibold text-green-800">Conta Ativa — contrato PJ assinado.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-green-300 text-green-700 hover:bg-green-100 text-xs"
                  onClick={() => toast.info('Contrato PJ será disponibilizado em breve.')}
                >
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  Ver Contrato PJ
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Monthly fee */}
          <Card className="border-gray-100">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-red-600" />
                Assinatura
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className={cn(
                  'text-xl font-bold',
                  (conta.statusEfetivo === 'piloto' || conta.status === 'piloto') && 'line-through text-gray-400'
                )}>
                  R$ {conta.mensalidade},00/mês
                </span>
                {(conta.statusEfetivo === 'piloto' || conta.status === 'piloto') && (
                  <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">
                    Isento durante o piloto
                  </Badge>
                )}
                {conta.status === 'ativo' && conta.formaPagamento === 'cartao_recorrente' && (
                  <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">
                    Recorrente ativo
                  </Badge>
                )}
              </div>

              {/* Forma de pagamento atual */}
              {conta.status === 'ativo' && conta.formaPagamento && (
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Forma de pagamento: <span className="font-medium text-gray-700">{METODO_LABELS[conta.formaPagamento as MetodoPagamento] || conta.formaPagamento}</span></p>
                  {conta.ultimoPagamento && (
                    <p>Último pagamento: {new Date(conta.ultimoPagamento).toLocaleDateString('pt-BR')}</p>
                  )}
                  {conta.dataProximoPagamento && (
                    <p>Próximo vencimento: {new Date(conta.dataProximoPagamento).toLocaleDateString('pt-BR')}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Seção de Pagamento (visível após piloto vencido OU empresa ativa OU janela D-3 OU pendente) ── */}
          {/* NÃO aparece para empresa em piloto com mais de 3 dias restantes */}
          {(!isPilotoComDiasRestantes && (isPilotoExpirado || isAtivo || conta.dentroJanelaAviso || conta.dentroCarencia72h || isAguardandoPagamento)) && (
            <Card className="border-orange-200">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-orange-600" />
                  Pagamento da Assinatura
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                {/* Aviso contextual */}
                {conta.dentroCarencia72h && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-xs text-orange-800 font-medium">
                      ⏰ Aguardando confirmação de pagamento — {conta.horasRestantesCarencia ?? 72}h restantes
                    </p>
                    <p className="text-[11px] text-orange-600 mt-1">
                      Você escolheu: <strong>{conta.formaPagamento ? METODO_LABELS[conta.formaPagamento as MetodoPagamento] : '—'}</strong>. Aguarde a confirmação.
                    </p>
                  </div>
                )}

                {conta.dentroJanelaAviso && !conta.dentroCarencia72h && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-xs text-orange-800 font-medium">
                      ⚠️ Faltam {conta.diasParaVencer ?? 0} dia(s) para o vencimento
                    </p>
                    <p className="text-[11px] text-orange-600 mt-1">
                      Escolha sua forma de pagamento para evitar interrupção.
                    </p>
                  </div>
                )}

                {isPilotoExpirado && !conta.dentroCarencia72h && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-xs text-red-800 font-medium">
                      🔒 Período encerrado — escolha o pagamento para reativar
                    </p>
                  </div>
                )}

                {/* Mensalidade */}
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Mensalidade</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    R$ {conta.mensalidade || 399},00
                  </p>
                  <p className="text-[10px] text-gray-400">/mês</p>
                </div>

                {/* Seletor de método de pagamento (envia webhook CRM Odoo) */}
                <MetodoPagamentoSelector
                  formaPagamentoAtual={conta.formaPagamento}
                  onSuccess={() => {
                    // Recarrega dados da conta para atualizar status
                    if (typeof window !== 'undefined') {
                      setTimeout(() => window.location.reload(), 1500)
                    }
                  }}
                />

                {/* Info sobre carência 72h */}
                {!conta.formaPagamento && (
                  <p className="text-[11px] text-gray-500 text-center">
                    Após escolher, você terá <strong>3 dias (72h)</strong> para confirmar o pagamento.
                  </p>
                )}

                {/* E-mail de suporte */}
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-[11px] text-gray-600 text-center">
                    Dúvidas? Contate:<br />
                    <a
                      href={`mailto:${conta.emailSuporte || 'notifications@panfletosbrasil.odoo.com'}`}
                      className="text-red-600 font-semibold hover:underline"
                    >
                      {conta.emailSuporte || 'notifications@panfletosbrasil.odoo.com'}
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab: Perfil ── */}
        <TabsContent value="perfil" className="space-y-4 mt-4">
          <Card className="border-gray-100">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <UserCircle className="h-4 w-4 text-red-600" />
                Editar Perfil
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Endereço</Label>
                <Input
                  placeholder="Rua, número, bairro..."
                  value={perfilEndereco}
                  onChange={(e) => setPerfilEndereco(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Telefone</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={perfilTelefone}
                  onChange={(e) => setPerfilTelefone(e.target.value)}
                  className="h-10"
                />
              </div>
              <Button
                className="w-full bg-red-600 hover:bg-red-700 text-white h-10 text-sm"
                onClick={handleSavePerfil}
                disabled={savingPerfil}
              >
                {savingPerfil ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" /> Salvar</>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Modal de Revisão Pós-Upload ── */}
      <AnimatePresence>
        {reviewOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4"
            onClick={() => { if (!reviewPublishing) setReviewOpen(false) }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-orange-500" />
                  <h3 className="text-base font-bold text-gray-800">Revisar Produtos</h3>
                </div>
                <button onClick={() => !reviewPublishing && setReviewOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Info */}
              <div className="px-5 py-3 bg-orange-50 border-b border-orange-100">
                <p className="text-xs text-orange-800">
                  Revise os produtos extraídos do PDF. Remova itens incorretos, inclua novos manualmente e clique em <strong>Publicar</strong> quando estiver pronto.
                </p>
                <p className="text-xs text-orange-600 mt-1 font-medium">
                  {reviewProdutos.length} produto{reviewProdutos.length !== 1 ? 's' : ''} encontrado{reviewProdutos.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Lista de produtos */}
              <div className="flex-1 overflow-y-auto px-5 py-3">
                {reviewProdutos.length === 0 && !reviewAddMode ? (
                  <div className="text-center py-10">
                    <Package className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Nenhum produto extraído do PDF.</p>
                    <p className="text-xs text-gray-400 mt-1">Adicione os itens manualmente abaixo.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {reviewProdutos.map((p, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100 hover:border-red-200 transition-colors group"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate text-gray-800">
                            {p.nome}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {p.marca && <span className="text-[10px] text-gray-400">{p.marca}</span>}
                            {p.unidade && <span className="text-[10px] text-blue-500">{p.unidade}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-sm font-bold text-red-600">{p.preco}</span>
                          <button
                            onClick={() => removeReviewProduto(idx)}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1"
                            title="Remover item"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Adicionar item manual na revisão */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  {!reviewAddMode ? (
                    <button
                      type="button"
                      onClick={() => setReviewAddMode(true)}
                      className="w-full flex items-center justify-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-medium py-2 rounded-lg border border-dashed border-orange-300 hover:border-orange-400 hover:bg-orange-50 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Incluir produto manualmente
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-5 gap-1.5 items-end">
                        <div className="col-span-2">
                          <Input
                            placeholder="Nome do produto"
                            value={reviewNewItem.nome}
                            onChange={(e) => setReviewNewItem((p: any) => ({ ...p, nome: e.target.value }))}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <Input
                            placeholder="Marca"
                            value={reviewNewItem.marca}
                            onChange={(e) => setReviewNewItem((p: any) => ({ ...p, marca: e.target.value }))}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <Input
                            placeholder="R$ 0,00"
                            value={reviewNewItem.preco}
                            onChange={(e) => setReviewNewItem((p: any) => ({ ...p, preco: e.target.value }))}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="flex gap-1">
                          <Select value={reviewNewItem.unidade} onValueChange={(v: string) => setReviewNewItem((p: any) => ({ ...p, unidade: v }))}>
                            <SelectTrigger className="h-8 text-[10px] px-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="un">un</SelectItem>
                              <SelectItem value="kg">kg</SelectItem>
                              <SelectItem value="g">g</SelectItem>
                              <SelectItem value="L">L</SelectItem>
                              <SelectItem value="ml">ml</SelectItem>
                              <SelectItem value="cx">cx</SelectItem>
                              <SelectItem value="pç">pç</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            className="bg-red-600 hover:bg-red-700 text-white h-8 w-8 shrink-0 p-0"
                            onClick={() => {
                              if (!reviewNewItem.nome.trim() || !reviewNewItem.preco.trim()) {
                                toast.error('Nome e preço são obrigatórios')
                                return
                              }
                              setReviewProdutos((prev: any) => [...prev, { nome: reviewNewItem.nome, marca: reviewNewItem.marca || null, preco: reviewNewItem.preco, unidade: reviewNewItem.unidade }])
                              setReviewNewItem({ nome: '', marca: '', preco: '', unidade: 'un' })
                            }}
                          >
                            <span className="text-base leading-none">+</span>
                          </Button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReviewAddMode(false)}
                        className="text-[10px] text-gray-400 hover:text-gray-600"
                      >
                        Cancelar inclusão
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-10 text-sm"
                  onClick={() => setReviewOpen(false)}
                  disabled={reviewPublishing}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white h-10 text-sm font-semibold"
                  onClick={handlePublish}
                  disabled={reviewPublishing || reviewProdutos.length === 0}
                >
                  {reviewPublishing ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Publicando...</>
                  ) : (
                    <><CheckCircle className="h-4 w-4 mr-2" /> Publicar {reviewProdutos.length} produto{reviewProdutos.length !== 1 ? 's' : ''}</>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal de Entrada Manual ── */}
      <AnimatePresence>
        {manualEntryOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4"
            onClick={() => { if (!manualPublishing) setManualEntryOpen(false) }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-orange-500" />
                  <h3 className="text-base font-bold text-gray-800">Adicionar Itens Manualmente</h3>
                </div>
                <button onClick={() => !manualPublishing && setManualEntryOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form row */}
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="grid grid-cols-5 gap-2 items-end">
                  <div className="col-span-2">
                    <Label className="text-[10px] text-gray-500 mb-1 block">Nome do produto</Label>
                    <Input
                      placeholder="Ex: Arroz"
                      value={manualItem.nome}
                      onChange={(e) => setManualItem((p) => ({ ...p, nome: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-500 mb-1 block">Marca</Label>
                    <Input
                      placeholder="Marca"
                      value={manualItem.marca}
                      onChange={(e) => setManualItem((p) => ({ ...p, marca: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-500 mb-1 block">Preço (R$)</Label>
                    <Input
                      placeholder="0,00"
                      value={manualItem.preco}
                      onChange={(e) => setManualItem((p) => ({ ...p, preco: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="flex gap-1">
                    <div className="flex-1">
                      <Label className="text-[10px] text-gray-500 mb-1 block">Un.</Label>
                      <Select value={manualItem.unidade} onValueChange={(v) => setManualItem((p) => ({ ...p, unidade: v }))}>
                        <SelectTrigger className="h-9 text-xs px-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="un">un</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="L">L</SelectItem>
                          <SelectItem value="ml">ml</SelectItem>
                          <SelectItem value="cx">cx</SelectItem>
                          <SelectItem value="pç">pç</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      className="bg-red-600 hover:bg-red-700 text-white h-9 w-9 shrink-0 p-0"
                      onClick={handleAddManualItem}
                    >
                      <span className="text-lg leading-none">+</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Lista de itens adicionados */}
              <div className="flex-1 overflow-y-auto px-5 py-3">
                {manualItens.length === 0 ? (
                  <div className="text-center py-10">
                    <Package className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Nenhum item adicionado ainda.</p>
                    <p className="text-xs text-gray-400 mt-1">Preencha os campos acima e clique em <strong>+</strong>.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-xs text-gray-500 font-medium mb-2">
                      {manualItens.length} item{manualItens.length !== 1 ? 's' : ''} adicionado{manualItens.length !== 1 ? 's' : ''}
                    </p>
                    {manualItens.map((item, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100 hover:border-red-200 transition-colors group"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate text-gray-800">{item.nome}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {item.marca && <span className="text-[10px] text-gray-400">{item.marca}</span>}
                            <span className="text-[10px] text-blue-500">{item.unidade}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-sm font-bold text-red-600">R$ {item.preco}</span>
                          <button
                            onClick={() => handleRemoveManualItem(idx)}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1"
                            title="Remover item"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-10 text-sm"
                  onClick={() => setManualEntryOpen(false)}
                  disabled={manualPublishing}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white h-10 text-sm font-semibold"
                  onClick={handlePublishManual}
                  disabled={manualPublishing || manualItens.length === 0}
                >
                  {manualPublishing ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Publicando...</>
                  ) : (
                    <><CheckCircle className="h-4 w-4 mr-2" /> Publicar Encarte</>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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

// ── Tipo de método de pagamento ────────────────────────────────────────────

type MetodoPagamento = 'pix' | 'cartao_mensal' | 'cartao_recorrente' | 'boleto'

const METODO_LABELS: Record<MetodoPagamento, string> = {
  pix: 'Pix',
  cartao_mensal: 'Cartão de Crédito (Mensal)',
  cartao_recorrente: 'Cartão de Crédito (Recorrente)',
  boleto: 'Boleto Bancário',
}

// ── Seletor de método de pagamento (reutilizável) ──────────────────────────

function MetodoPagamentoSelector({
  formaPagamentoAtual,
  onSuccess,
  compact = false,
}: {
  formaPagamentoAtual?: string | null
  onSuccess?: () => void
  compact?: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [cartaoExpandido, setCartaoExpandido] = useState(false)

  const handleSelect = async (metodo: MetodoPagamento) => {
    setLoading(true)
    try {
      await api('/api/pagamento/metodo', {
        method: 'POST',
        body: JSON.stringify({ metodo }),
      })
      setSucesso(true)
      toast.success('Solicitação enviada com sucesso!')
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar solicitação')
    } finally {
      setLoading(false)
    }
  }

  const btnBase = 'flex items-center gap-3 p-4 rounded-xl transition-all font-medium disabled:opacity-50'
  const cartaoBtnBase = 'flex items-center justify-between gap-3 p-4 rounded-xl transition-all font-medium disabled:opacity-50'

  return (
    <div className={cn('space-y-3', compact && 'space-y-2')}>
      {sucesso ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center space-y-2">
          <CheckCircle className="h-8 w-8 text-green-600 mx-auto" />
          <p className="text-sm font-semibold text-green-800">Solicitação enviada!</p>
          <p className="text-xs text-green-700">
            O administrador enviará o contrato e link de pagamento por e-mail.
          </p>
        </div>
      ) : (
        <>
          {/* Se já tem método selecionado, mostra */}
          {formaPagamentoAtual && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-blue-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-blue-500 uppercase tracking-wide">Forma de pagamento atual</p>
                <p className="text-sm font-semibold text-blue-800">
                  {METODO_LABELS[formaPagamentoAtual as MetodoPagamento] || formaPagamentoAtual}
                </p>
              </div>
            </div>
          )}

          {/* Botão Pix */}
          <button
            onClick={() => handleSelect('pix')}
            disabled={loading}
            className={cn(btnBase, 'bg-emerald-600 hover:bg-emerald-700 text-white')}
          >
            <QrCode className="h-6 w-6 shrink-0" />
            <div className="text-left">
              <span className={compact ? 'text-xs' : 'text-sm'}>Pix</span>
              <p className={cn('text-white/70', compact ? 'text-[10px]' : 'text-xs')}>
                Pagamento instantâneo via QR Code
              </p>
            </div>
          </button>

          {/* Botão Cartão de Crédito (com sub-opções) */}
          <div>
            <button
              onClick={() => !loading && setCartaoExpandido(!cartaoExpandido)}
              disabled={loading}
              className={cn(cartaoBtnBase, 'bg-indigo-600 hover:bg-indigo-700 text-white w-full')}
            >
              <div className="flex items-center gap-3">
                <CreditCard className="h-6 w-6 shrink-0" />
                <div className="text-left">
                  <span className={compact ? 'text-xs' : 'text-sm'}>Cartão de Crédito</span>
                  <p className={cn('text-white/70', compact ? 'text-[10px]' : 'text-xs')}>
                    Escolha a modalidade
                  </p>
                </div>
              </div>
              <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', cartaoExpandido && 'rotate-90')} />
            </button>
            <AnimatePresence>
              {cartaoExpandido && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-2 mt-2 pl-2">
                    <button
                      onClick={() => handleSelect('cartao_mensal')}
                      disabled={loading}
                      className="flex flex-col items-center gap-1.5 p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition-colors text-xs font-medium"
                    >
                      <Calendar className="h-4 w-4" />
                      Mensal
                      <span className="text-[10px] text-indigo-500 font-normal">Escolhe todo mês</span>
                    </button>
                    <button
                      onClick={() => handleSelect('cartao_recorrente')}
                      disabled={loading}
                      className="flex flex-col items-center gap-1.5 p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition-colors text-xs font-medium"
                    >
                      <TrendingUp className="h-4 w-4" />
                      Recorrente
                      <span className="text-[10px] text-indigo-500 font-normal">Cobrança automática</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Botão Boleto */}
          <button
            onClick={() => handleSelect('boleto')}
            disabled={loading}
            className={cn(btnBase, 'bg-amber-600 hover:bg-amber-700 text-white')}
          >
            <Banknote className="h-6 w-6 shrink-0" />
            <div className="text-left">
              <span className={compact ? 'text-xs' : 'text-sm'}>Boleto Bancário</span>
              <p className={cn('text-white/70', compact ? 'text-[10px]' : 'text-xs')}>
                Pagamento por boleto
              </p>
            </div>
          </button>

          {loading && (
            <div className="flex items-center justify-center gap-2 py-1">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              <span className="text-xs text-gray-400">Enviando...</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Popup D-3: Aviso fechável 3 dias antes do vencimento ──────────────────

// Seletor de pagamento inline para o popup de pendente
function PagamentoPendenteSelector({ conta, onDismiss }: { conta: ContaData; onDismiss: () => void }) {
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  const handleSelect = async (metodo: MetodoPagamento) => {
    setLoading(true)
    try {
      await api('/api/pagamento/metodo', {
        method: 'POST',
        body: JSON.stringify({ metodo }),
      })
      setSucesso(true)
      toast.success('Forma de pagamento atualizada! Aguarde a confirmação.')
      setTimeout(() => onDismiss(), 1500)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar')
    } finally {
      setLoading(false)
    }
  }

  if (sucesso) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
        <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
        <p className="text-xs font-semibold text-green-800">Solicitação enviada!</p>
        <p className="text-[11px] text-green-700">Aguarde a confirmação do administrador.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {conta.formaPagamento && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-2">
          <p className="text-[11px] text-blue-700">
            Forma atual: <strong>{METODO_LABELS[conta.formaPagamento as MetodoPagamento] || conta.formaPagamento}</strong>
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleSelect('pix')}
          disabled={loading}
          className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium disabled:opacity-50"
        >
          <QrCode className="h-4 w-4" /> Pix
        </button>
        <button
          onClick={() => handleSelect('boleto')}
          disabled={loading}
          className="flex items-center gap-1.5 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium disabled:opacity-50"
        >
          <Banknote className="h-4 w-4" /> Boleto
        </button>
        <button
          onClick={() => handleSelect('cartao_mensal')}
          disabled={loading}
          className="flex items-center gap-1.5 p-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium disabled:opacity-50"
        >
          <CreditCard className="h-4 w-4" /> Cartão Mensal
        </button>
        <button
          onClick={() => handleSelect('cartao_recorrente')}
          disabled={loading}
          className="flex items-center gap-1.5 p-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-medium disabled:opacity-50"
        >
          <CreditCard className="h-4 w-4" /> Cartão Recorrente
        </button>
      </div>
      {loading && (
        <p className="text-[11px] text-gray-500 text-center">
          <Loader2 className="h-3 w-3 inline animate-spin mr-1" />
          Enviando...
        </p>
      )}
    </div>
  )
}

function PreVencimentoPopup({ conta }: { conta: ContaData }) {
  // SEM localStorage — popup SEMPRE aparece ao montar (login/page load)
  // Usuário pode fechar, mas reaparece no próximo login ou refresh
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const dias = conta.diasParaVencer ?? 0
  const isPiloto = conta.status === 'piloto' || conta.status === 'teste_gratis'
  const tipoLabel = conta.status === 'teste_gratis' ? 'teste grátis' : isPiloto ? 'piloto' : 'assinatura'
  const isCarencia72h = conta.dentroCarencia72h
  const isPendente = conta.statusEfetivo === 'ativo_aguardando_pagamento'
  const horas = conta.horasRestantesCarencia ?? 72

  const handleDismiss = () => {
    setDismissed(true)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl leading-none"
          aria-label="Fechar"
        >
          ✕
        </button>

        <div className="text-center">
          <div className="h-14 w-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="h-7 w-7 text-orange-600" />
          </div>

          {isCarencia72h ? (
            <>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Pagamento em análise — {horas}h restantes
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Você escolheu sua forma de pagamento. Aguarde a confirmação.
                Você tem <strong>{horas} horas</strong> para o pagamento ser confirmado.
              </p>
              {conta.formaPagamento && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-green-800 font-medium">
                    ✓ Forma escolhida: {conta.formaPagamento === 'pix' ? 'Pix' : conta.formaPagamento === 'cartao_mensal' ? 'Cartão (Mensal)' : conta.formaPagamento === 'cartao_recorrente' ? 'Cartão (Recorrente)' : 'Boleto'}
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Continue usando o sistema normalmente. O pagamento está sendo processado.
                  </p>
                </div>
              )}
              <p className="text-[11px] text-gray-500 mb-4">
                Após as {horas}h, se o pagamento não for confirmado, o sistema será suspenso.
              </p>
            </>
          ) : isPendente ? (
            <>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Pagamento Pendente — Escolha sua forma de pagamento
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Sua conta está aguardando confirmação de pagamento.
                Escolha ou troque sua forma de pagamento abaixo para regularizar.
              </p>

              {/* Mensalidade */}
              <div className="bg-gray-50 rounded-lg p-3 text-center mb-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Mensalidade</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  R$ {conta.mensalidade || 399},00
                </p>
                <p className="text-[10px] text-gray-400">/mês</p>
              </div>

              {/* Seletor de pagamento inline */}
              <PagamentoPendenteSelector conta={conta} onDismiss={handleDismiss} />

              <p className="text-[11px] text-gray-500 mt-3 text-center">
                Em caso de dúvidas, contate: notifications@panfletosbrasil.odoo.com
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {dias <= 0 ? 'Seu ' + tipoLabel + ' vence hoje!' : `Faltam ${dias} dia${dias !== 1 ? 's' : ''} para o vencimento`}
              </h3>

              <p className="text-sm text-gray-600 mb-4">
                {isPiloto
                  ? `Seu período de ${tipoLabel} termina em ${dias <= 0 ? 'hoje' : `${dias} dia${dias !== 1 ? 's' : ''}`}. `
                  : `Sua assinatura mensal vence em ${dias <= 0 ? 'hoje' : `${dias} dia${dias !== 1 ? 's' : ''}`}. `}
                Escolha sua forma de pagamento para continuar usando o app sem interrupção.
              </p>

              {conta.formaPagamento ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-green-800 font-medium">
                    ✓ Você já escolheu: {conta.formaPagamento === 'pix' ? 'Pix' : conta.formaPagamento === 'cartao_mensal' ? 'Cartão (Mensal)' : conta.formaPagamento === 'cartao_recorrente' ? 'Cartão (Recorrente)' : 'Boleto'}
                  </p>
                  <p className="text-xs text-green-700 mt-1">Aguarde a confirmação do pagamento.</p>
                </div>
              ) : (
                <p className="text-xs text-gray-500 mb-4">
                  Após o vencimento, você terá 3 dias (72h) de carência após escolher o pagamento.
                </p>
              )}
            </>
          )}

          <button
            onClick={handleDismiss}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-lg text-sm transition-colors"
          >
            Continuar usando
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tela de Bloqueio / Seleção de Pagamento ────────────────────────────────

function PaymentBlockScreen({ conta }: { conta: ContaData }) {
  const segmentoLabel = conta.segmento === 'farmacias' ? 'Farmácia' : conta.segmento === 'petshops' ? 'PetShop' : 'Empresa'
  const isAguardando = conta.status === 'ativo_aguardando_pagamento' || conta.statusEfetivo === 'ativo_aguardando_pagamento'
  const isCancelado = conta.statusEfetivo === 'assinatura_cancelada'
  const isAguardando72h = conta.statusEfetivo === 'aguardando_confirmacao_72h'
  const isPagamentoVencido = conta.statusEfetivo === 'pagamento_vencido'
  const isTesteGratisExpirado = conta.statusEfetivo === 'teste_gratis_expirado'
  const isInativo = conta.status === 'inativo' || conta.statusEfetivo === 'inativo'
  const emailSuporte = (conta as any).emailSuporte || 'notifications@panfletosbrasil.odoo.com'

  const titulo = isInativo
    ? 'Conta Desativada'
    : isAguardando72h
      ? 'Aguardando Confirmação de Pagamento'
      : isCancelado
        ? 'Assinatura Encerrada'
        : isAguardando
          ? 'Ative Sua Assinatura'
          : isPagamentoVencido
            ? 'Pagamento Vencido'
            : isTesteGratisExpirado
              ? 'Teste Grátis Encerrado'
              : 'Período de Piloto Encerrado'

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-orange-500 p-6 text-center">
          <div className="h-16 w-16 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">{titulo}</h2>
          <p className="text-white/80 text-sm mt-1">
            {conta.nome}
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {isAguardando72h ? (
            <div className="text-center space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-sm text-orange-800 font-medium">
                  Você escolheu sua forma de pagamento. Aguarde a confirmação.
                </p>
                <p className="text-2xl font-bold text-orange-700 mt-2">
                  {conta.horasRestantesCarencia != null ? `${conta.horasRestantesCarencia}h restantes` : '72h restantes'}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  Você pode usar o sistema por mais 3 dias (72h) enquanto aguarda confirmação.
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Mensalidade — {segmentoLabel}</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">
                  R$ {conta.mensalidade || 399},00
                </p>
                <p className="text-xs text-gray-400 mt-1">/mês</p>
              </div>

              {/* Payment method selector (pode trocar) */}
              <MetodoPagamentoSelector formaPagamentoAtual={conta.formaPagamento} />

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-500 text-center">
                  Caso o pagamento não seja confirmado em 72h, o sistema será suspenso.
                </p>
                <p className="text-xs text-gray-600 text-center mt-2">
                  Para reativar o app via pagamento, entre em contato:<br />
                  <a href={`mailto:${emailSuporte}`} className="text-red-600 font-semibold hover:underline">
                    {emailSuporte}
                  </a>
                </p>
              </div>
            </div>
          ) : isInativo ? (
            <div className="text-center space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-800 font-medium">
                  Sua conta foi desativada pelo administrador.
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Isso pode ocorrer por falta de pagamento ou problema técnico.
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Mensalidade — {segmentoLabel}</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">
                  R$ {conta.mensalidade || 399},00
                </p>
                <p className="text-xs text-gray-400 mt-1">/mês</p>
              </div>
              <MetodoPagamentoSelector formaPagamentoAtual={conta.formaPagamento} />
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-600 text-center">
                  Para reativar sua conta, escolha uma forma de pagamento acima ou contate:<br />
                  <a href={`mailto:${emailSuporte}`} className="text-red-600 font-semibold hover:underline">
                    {emailSuporte}
                  </a>
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center">
                <p className="text-gray-600 text-sm">
                  {isCancelado
                    ? 'Sua assinatura foi cancelada. Para voltar a utilizar o Panfletos Brasil, escolha sua forma de pagamento abaixo.'
                    : isAguardando
                      ? 'Sua empresa foi ativada pelo administrador! Para começar a utilizar o Panfletos Brasil, escolha sua forma de pagamento.'
                      : isPagamentoVencido
                        ? 'Seu pagamento mensal venceu. Escolha sua forma de pagamento para continuar.'
                        : isTesteGratisExpirado
                          ? 'Seu período de teste grátis terminou. Para continuar, escolha sua forma de pagamento.'
                          : 'Seu período de piloto terminou. Para continuar utilizando o Panfletos Brasil, escolha sua forma de pagamento.'}
                </p>
              </div>

              {/* Valor */}
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Mensalidade — {segmentoLabel}</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">
                  R$ {conta.mensalidade || 399},00
                </p>
                <p className="text-xs text-gray-400 mt-1">/mês</p>
              </div>

              {/* Payment method selector */}
              <MetodoPagamentoSelector formaPagamentoAtual={conta.formaPagamento} />

              <div className="border-t border-gray-100 pt-3">
                <p className="text-[10px] text-gray-400 text-center">
                  Após escolher, você terá 3 dias (72h) para confirmar o pagamento.
                </p>
                <p className="text-xs text-gray-600 text-center mt-2">
                  Em caso de não confirmação, contate:<br />
                  <a href={`mailto:${emailSuporte}`} className="text-red-600 font-semibold hover:underline">
                    {emailSuporte}
                  </a>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Banner de aviso de renovação (5 dias antes do vencimento) ───────────────

function RenewalWarningBanner({ conta }: { conta: ContaData }) {
  const [dismissed, setDismissed] = useState(false)

  const diasRestantes = conta.dataProximoPagamento
    ? Math.max(0, Math.ceil((new Date(conta.dataProximoPagamento).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  // Só mostra se faltam 5 dias ou menos
  if (dismissed || !diasRestantes || diasRestantes > 5) return null

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Sua assinatura vence em {diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'}.
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Escolha a forma de pagamento para o próximo mês.
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-400 hover:text-amber-600 shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <MetodoPagamentoSelector
        formaPagamentoAtual={conta.formaPagamento}
        compact
        onSuccess={() => setDismissed(true)}
      />
    </div>
  )
}