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

  // Profile editing state
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileNome, setProfileNome] = useState(conta.nome)
  const [profileEmail, setProfileEmail] = useState(conta.emailLogin)
  const [profileEndereco, setProfileEndereco] = useState('')
  const [profileTelefone, setProfileTelefone] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

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

  // Save profile
  const handleSaveProfile = async () => {
    setSavingProfile(true)
    try {
      await api('/api/mercado/perfil', {
        method: 'PUT',
        body: JSON.stringify({ nome: profileNome, email: profileEmail, endereco: profileEndereco, telefone: profileTelefone }),
      })
      toast.success('Perfil atualizado!')
      setEditingProfile(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar perfil')
    } finally {
      setSavingProfile(false)
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

      {/* Profile Card */}
      <Card className="border-gray-100">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-red-600" /> Meu Perfil
            </CardTitle>
            {!editingProfile && (
              <Button variant="ghost" size="sm" className="text-xs text-gray-500 h-7" onClick={() => { setProfileNome(conta.nome); setProfileEmail(conta.emailLogin); setEditingProfile(true) }}>
                Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {editingProfile ? (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome</Label>
                <Input value={profileNome} onChange={(e) => setProfileNome(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">E-mail</Label>
                <Input type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Endereço</Label>
                <Input value={profileEndereco} onChange={(e) => setProfileEndereco(e.target.value)} className="h-9 text-sm" placeholder="Rua, número, bairro..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Telefone</Label>
                <Input value={profileTelefone} onChange={(e) => setProfileTelefone(e.target.value)} className="h-9 text-sm" placeholder="(00) 00000-0000" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleSaveProfile} disabled={savingProfile} className="bg-red-600 hover:bg-red-700 text-white h-8 text-xs">
                  {savingProfile ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />} Salvar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditingProfile(false)} className="h-8 text-xs">Cancelar</Button>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div><span className="text-gray-500 text-xs block">Nome</span><p className="font-medium">{conta.nome}</p></div>
                <div><span className="text-gray-500 text-xs block">E-mail</span><p className="font-medium">{conta.emailLogin}</p></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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