'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserCircle, Save, Loader2, LogOut, Headphones, Send, CheckCircle, Clock, X, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api, useSession } from './AppShell'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface PerfilData {
  id: string
  email: string
  nome: string | null
  photoURL: string | null
  provider: string
}

interface UserProfileProps {
  onLogout: () => void
}

// ── Search History (compartilhado com HomeView) ────────────────────────
const SEARCH_HISTORY_KEY = 'eb_search_history'
const SEARCH_MAX_AGE = 30 * 24 * 60 * 60 * 1000
const SEARCH_MAX_ITEMS = 20

interface SearchEntry { text: string; ts: number }

function loadSearchHistory(): SearchEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY)
    if (!raw) return []
    const entries: SearchEntry[] = JSON.parse(raw)
    const now = Date.now()
    const valid = entries.filter((e) => now - e.ts < SEARCH_MAX_AGE)
    const seen = new Set<string>()
    const deduped: SearchEntry[] = []
    for (const e of valid.sort((a, b) => b.ts - a.ts)) {
      const key = e.text.toLowerCase().trim()
      if (key && !seen.has(key)) {
        seen.add(key)
        deduped.push(e)
      }
    }
    return deduped.slice(0, SEARCH_MAX_ITEMS)
  } catch { return [] }
}

function removeSearchTerm(text: string) {
  if (typeof window === 'undefined') return
  try {
    const entries = loadSearchHistory().filter((e) => e.text !== text)
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(entries))
  } catch { /* ignore */ }
}

function SearchHistoryList() {
  const [history, setHistory] = useState<SearchEntry[]>([])
  useEffect(() => { setHistory(loadSearchHistory()) }, [])

  const handleRemove = (text: string) => {
    removeSearchTerm(text)
    setHistory(loadSearchHistory())
  }

  const handleClearAll = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SEARCH_HISTORY_KEY)
      setHistory([])
    }
  }

  function formatDate(ts: number): string {
    const d = new Date(ts)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' +
           d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-6">
        <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm text-gray-400">Nenhuma busca recente</p>
        <p className="text-xs text-gray-300 mt-1">Suas buscas por produto aparecerao aqui (salvas por 30 dias)</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Salvas por ate 30 dias</p>
        <button
          type="button"
          onClick={handleClearAll}
          className="text-[10px] text-red-400 hover:text-red-600 transition-colors"
        >
          Limpar tudo
        </button>
      </div>
      <div className="space-y-1">
        {history.map((entry) => (
          <div
            key={entry.text}
            className="group flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Clock className="h-3 w-3 text-gray-300 shrink-0" />
            <span className="flex-1 text-sm text-gray-700 truncate">{entry.text}</span>
            <span className="text-[10px] text-gray-300 shrink-0 hidden sm:inline">{formatDate(entry.ts)}</span>
            <button
              type="button"
              onClick={() => handleRemove(entry.text)}
              className="h-5 w-5 flex items-center justify-center rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shrink-0"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function UserProfile({ onLogout }: UserProfileProps) {
  const session = useSession()
  const [perfil, setPerfil] = useState<PerfilData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [faleOpen, setFaleOpen] = useState(false)
  const [faleCat, setFaleCat] = useState('')
  const [faleAssunto, setFaleAssunto] = useState('')
  const [faleMsg, setFaleMsg] = useState('')
  const [faleSending, setFaleSending] = useState(false)
  const [faleEnviado, setFaleEnviado] = useState(false)

  const handleFaleConosco = async (e: React.FormEvent) => {
    e.preventDefault()
    setFaleSending(true)
    try {
      await api('/api/contato', {
        method: 'POST',
        body: JSON.stringify({ categoria: faleCat, assunto: faleAssunto.trim(), mensagem: faleMsg.trim() }),
      })
      toast.success('Mensagem enviada com sucesso!')
      setFaleEnviado(true)
      setFaleAssunto('')
      setFaleMsg('')
      setFaleCat('')
      setTimeout(() => setFaleEnviado(false), 5000)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar')
    } finally {
      setFaleSending(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    api<PerfilData>('/api/usuario/perfil')
      .then((d) => {
        if (!cancelled) {
          setPerfil(d)
          setNome(d.nome || '')
          setEmail(d.email || '')
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await api('/api/usuario/perfil', {
        method: 'PUT',
        body: JSON.stringify({ nome, email }),
      })
      setPerfil((prev) => prev ? { ...prev, nome, email } : prev)
      toast.success('Perfil atualizado!')
      setEditing(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }, [nome, email])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="h-48 bg-gray-50 rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {session?.photoURL ? (
            <img src={session.photoURL} alt={session.nome || ''} className="h-12 w-12 rounded-full object-cover border-2 border-red-100" />
          ) : (
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
              {(session?.nome || session?.email || 'U')[0].toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-gray-800">{session?.nome || 'Consumidor'}</h2>
            <p className="text-sm text-gray-500">{session?.email}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onLogout} className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs">
          <LogOut className="h-3.5 w-3.5 mr-1" /> Sair
        </Button>
      </div>

      <Card className="border-gray-100">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-red-600" /> Meus Dados
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
                <Label className="text-xs">Nome</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} className="h-9 text-sm" placeholder="Seu nome" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 text-sm" />
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
                <div><span className="text-gray-500 text-xs block">E-mail</span><p className="font-medium">{perfil?.email || '—'}</p></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Minhas ultimas buscas */}
      <Card className="border-gray-100">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-red-600" /> Minhas ultimas buscas
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <SearchHistoryList />
        </CardContent>
      </Card>

      {/* Fale Conosco */}
      <Card className="border-orange-100">
        <CardHeader className="pb-3 pt-4 px-4 cursor-pointer select-none" onClick={() => setFaleOpen(!faleOpen)}>
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Headphones className="h-4 w-4 text-orange-600" />
              Fale Conosco
            </span>
            {faleOpen ? <span className="text-gray-400 text-xs">▲</span> : <span className="text-gray-400 text-xs">▼</span>}
          </CardTitle>
        </CardHeader>
        <AnimatePresence>
          {faleOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <CardContent className="px-4 pb-4 space-y-3 border-t border-orange-50">
                {faleEnviado ? (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                    <p className="text-sm text-green-800">Mensagem enviada! Responderemos em breve.</p>
                  </div>
                ) : (
                  <form onSubmit={handleFaleConosco} className="space-y-3">
                    <p className="text-xs text-orange-700/70">Tem alguma dúvida, sugestão ou reclamação? Envie uma mensagem para nossa equipe.</p>
                    <Select value={faleCat} onValueChange={setFaleCat}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Categoria" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sugestão">Sugestão</SelectItem>
                        <SelectItem value="Problemas Técnicos">Problemas Técnicos</SelectItem>
                        <SelectItem value="Dúvida">Dúvida</SelectItem>
                        <SelectItem value="Reclamação">Reclamação</SelectItem>
                        <SelectItem value="Outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="Assunto" value={faleAssunto} onChange={e => setFaleAssunto(e.target.value)} className="h-10" />
                    <textarea placeholder="Descreva detalhadamente..." value={faleMsg} onChange={e => setFaleMsg(e.target.value)} rows={4} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-300" />
                    <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white h-10 text-sm" disabled={faleSending || !faleCat || !faleAssunto.trim() || !faleMsg.trim()}>
                      {faleSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
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