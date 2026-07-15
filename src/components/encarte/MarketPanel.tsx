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
  Headphones,
  Send,
  CheckCircle,
  BarChart3,
  Loader2,
  UserCircle,
  Save,
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

  // PJ (Mercado) — CNPJ + e-mail + senha + cadastro
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
      toast.success('Login de mercado realizado!')
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
    if (!nomeMercado || !cnpjLimpo || !email || !senha || !cidade || !estado || !responsavel || !cpfLimpo) {
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
        }),
      })
      toast.success('Mercado cadastrado! 60 dias de piloto grátis.')
      onLogin()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao cadastrar mercado')
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
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'pf' | 'pj')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pf">Consumidor</TabsTrigger>
              <TabsTrigger value="pj">Mercado (CNPJ)</TabsTrigger>
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

            {/* ── PJ: Login + Cadastro de Mercado ── */}
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
                    Não tem conta?{' '}
                    <button
                      type="button"
                      onClick={() => setModoCadastroPj(true)}
                      className="text-red-600 font-semibold hover:underline"
                    >
                      Cadastre seu mercado grátis
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
                    Cadastre seu mercado — 60 dias de piloto grátis
                  </p>
                  <form onSubmit={handlePjCadastro} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Nome do mercado *</Label>
                      <Input
                        type="text"
                        placeholder="Supermercado Exemplo"
                        value={nomeMercado}
                        onChange={(e) => setNomeMercado(e.target.value)}
                      />
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
                        placeholder="contato@mercado.com"
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
                      Cadastrar Mercado
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

  // Suporte state
  const [suporteOpen, setSuporteOpen] = useState(false)
  const [suporteCat, setSuporteCat] = useState('')
  const [suporteAssunto, setSuporteAssunto] = useState('')
  const [suporteMsg, setSuporteMsg] = useState('')
  const [suporteSending, setSuporteSending] = useState(false)
  const [suporteEnviado, setSuporteEnviado] = useState(false)

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

  // Fetch BI
  useEffect(() => {
    api<BIData>('/api/mercado/bi')
      .then(setBi)
      .catch(() => {})
  }, [])

  // Fetch encartes com produtos do mercado logado
  useEffect(() => {
    api<{ encartes: any[] }>('/api/mercado/meus-encartes')
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
      const result = await api<{ ok: boolean; produtosExtraidos: number; log?: string; erro?: string }>('/api/mercado/encarte', {
        method: 'POST',
        body: fd,
      })
      if ((result as any).erro) {
        toast.error((result as any).erro, { duration: 5000 })
        return
      }
      const n = (result as any).produtosExtraidos || 0
      if (n > 0) {
        toast.success(`Encarte enviado! ${n} produtos extraídos do PDF.`, { duration: 5000 })
      } else {
        toast.success('Encarte enviado! Nenhum produto foi extraído automaticamente (PDF pode ser imagem ou sem preços visíveis).', { duration: 6000 })
      }
      setTitulo('')
      setDataInicio('')
      setDataFim('')
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
                    <p className="text-xs text-blue-700/70">Sua mensagem será identificada com o mercado <strong>{conta.nome}</strong>.</p>
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