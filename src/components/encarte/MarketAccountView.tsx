'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { UserCircle, Save, Loader2, LogOut, MapPin, Building2, FileText, Clock, AlertTriangle, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api, useSession } from './AppShell'
import { toast } from 'sonner'

interface PerfilData {
  id: string
  nome: string
  emailLogin: string
  cidade: string
  estado: string
  endereco: string
  telefone: string
  cnpj: string
  status: string
  pilotoInicio: string | null
  pilotoFim: string | null
  mensalidade: number
}

function formatCNPJ(v: string) {
  const d = v.replace(/\D/g, '')
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function diasRestantes(pilotoFim: string | null): number | null {
  if (!pilotoFim) return null
  const fim = new Date(pilotoFim)
  const agora = new Date()
  const diff = fim.getTime() - agora.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function MarketAccountView({ onLogout }: { onLogout: () => void }) {
  const session = useSession()
  const [perfil, setPerfil] = useState<PerfilData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [endereco, setEndereco] = useState('')
  const [telefone, setTelefone] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    api<PerfilData>('/api/mercado/perfil')
      .then((d) => {
        if (!cancelled) {
          setPerfil(d)
          setNome(d.nome || '')
          setEmail(d.emailLogin || '')
          setEndereco(d.endereco || '')
          setTelefone(d.telefone || '')
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await api('/api/mercado/perfil', {
        method: 'PUT',
        body: JSON.stringify({ nome, email, endereco, telefone }),
      })
      setPerfil((prev) => prev ? { ...prev, nome, emailLogin: email, endereco, telefone } : prev)
      toast.success('Perfil atualizado!')
      setEditing(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }, [nome, email, endereco, telefone])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="h-64 bg-gray-50 rounded-xl animate-pulse" />
      </div>
    )
  }

  const statusLabel: Record<string, { text: string; cls: string }> = {
    piloto: { text: 'Período Piloto', cls: 'bg-blue-100 text-blue-700' },
    ativo: { text: 'Ativo', cls: 'bg-red-50 text-red-700' },
    inativo: { text: 'Inativo', cls: 'bg-gray-100 text-gray-500' },
  }
  const st = statusLabel[perfil?.status || ''] || { text: perfil?.status || '', cls: 'bg-gray-100 text-gray-500' }

  // Lógica do contrato
  const dias = diasRestantes(perfil?.pilotoFim || null)
  const pilotoExpirado = dias !== null && dias <= 0
  const pilotoUrgente = dias !== null && dias > 0 && dias <= 7
  const mostrarContrato = pilotoExpirado || pilotoUrgente || perfil?.status === 'ativo'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
            {(perfil?.nome || 'M')[0].toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">{perfil?.nome || 'Mercado'}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge className={cn('text-[10px]', st.cls)}>{st.text}</Badge>
              <span className="text-xs text-gray-500">{perfil?.cidade}/{perfil?.estado}</span>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onLogout} className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs">
          <LogOut className="h-3.5 w-3.5 mr-1" /> Sair
        </Button>
      </div>

      {/* Dados da Conta */}
      <Card className="border-gray-100">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-red-600" /> Dados da Conta
            </CardTitle>
            {!editing && (
              <Button variant="ghost" size="sm" className="text-xs text-gray-500 h-7" onClick={() => setEditing(true)}>
                Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {editing ? (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome do Mercado</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Endereço</Label>
                <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} className="h-9 text-sm" placeholder="Rua, número, bairro..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Telefone</Label>
                <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} className="h-9 text-sm" placeholder="(00) 00000-0000" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleSave} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white h-8 text-xs">
                  {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />} Salvar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)} className="h-8 text-xs">Cancelar</Button>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><span className="text-gray-500 text-xs block">Nome</span><p className="font-medium">{perfil?.nome || '—'}</p></div>
                <div><span className="text-gray-500 text-xs block">E-mail</span><p className="font-medium">{perfil?.emailLogin || '—'}</p></div>
                <div><span className="text-gray-500 text-xs block">Endereço</span><p className="font-medium">{perfil?.endereco || '—'}</p></div>
                <div><span className="text-gray-500 text-xs block">Telefone</span><p className="font-medium">{perfil?.telefone || '—'}</p></div>
              </div>
              <div className="pt-2 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-gray-400" />
                  <div>
                    <span className="text-gray-500 text-xs block">CNPJ</span>
                    <p className="font-medium text-xs">{perfil?.cnpj ? formatCNPJ(perfil.cnpj) : '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-gray-400" />
                  <div>
                    <span className="text-gray-500 text-xs block">Região</span>
                    <p className="font-medium text-xs">{perfil?.cidade}/{perfil?.estado}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seção: Período Piloto / Contrato */}
      {perfil?.status === 'piloto' && (
        <Card className={cn('border', pilotoUrgente ? 'border-orange-300 bg-orange-50/30' : pilotoExpirado ? 'border-red-300 bg-red-50/30' : 'border-blue-100')}>
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" /> Período Piloto
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {pilotoExpirado ? (
              <>
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                  <p className="text-xs text-red-800 font-medium">
                    Seu período piloto de 60 dias expirou. Para continuar usando a plataforma, visualize e assine o contrato abaixo.
                  </p>
                </div>
                <Button className="w-full bg-red-600 hover:bg-red-700 text-white h-10 text-sm font-semibold" onClick={() => toast.info('Contrato será disponibilizado em breve pela administração.')}>
                  <FileText className="h-4 w-4 mr-2" /> Ver Contrato para Assinatura
                </Button>
              </>
            ) : pilotoUrgente ? (
              <>
                <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0" />
                  <p className="text-xs text-orange-800 font-medium">
                    Restam apenas <strong>{dias} dia{dias !== 1 ? 's' : ''}</strong> de piloto. Assine o contrato para não perder acesso.
                  </p>
                </div>
                <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white h-10 text-sm font-semibold" onClick={() => toast.info('Contrato será disponibilizado em breve pela administração.')}>
                  <FileText className="h-4 w-4 mr-2" /> Ver Contrato para Assinatura
                </Button>
              </>
            ) : (
              <div className="text-sm">
                <p className="text-gray-600">
                  Você está no <strong>período piloto gratuito de 60 dias</strong>. Aproveite para testar todas as funcionalidades da plataforma.
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  {dias !== null && (
                    <>Restam <strong className="text-blue-600">{dias} dia{dias !== 1 ? 's' : ''}</strong> de piloto.</>
                  )}
                </p>
                {perfil?.pilotoInicio && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    Início: {new Date(perfil.pilotoInicio).toLocaleDateString('pt-BR')} · Fim: {perfil.pilotoFim ? new Date(perfil.pilotoFim).toLocaleDateString('pt-BR') : '—'}
                  </p>
                )}
              </div>
            )}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Mensalidade após piloto: <strong className="text-red-600">R$ {(perfil?.mensalidade || 599).toFixed(2).replace('.', ',')}</strong>/mês
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contrato para ativos */}
      {perfil?.status === 'ativo' && (
        <Card className="border-gray-100">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-600" /> Contrato
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xs text-gray-600 mb-3">
              Sua conta está <strong>ativa</strong>. Abaixo está o seu contrato de prestação de serviços com a EncarteBrasil.
            </p>
            <Button variant="outline" className="w-full h-9 text-xs" onClick={() => toast.info('Contrato será disponibilizado em breve.')}>
              <Download className="h-3.5 w-3.5 mr-1.5" /> Baixar Contrato Assinado
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}