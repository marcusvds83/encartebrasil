'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { LogOut, Store, Users, BarChart3, FileText, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import AdminPanel from './AdminPanel'

interface AdminUser {
  tipo: 'admin'
  id: string
  email: string
  nome?: string
}

async function api<T = Record<string, unknown>>(
  path: string,
  opts?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {}
  if (!(opts?.body instanceof FormData)) headers['Content-Type'] = 'application/json'
  if (opts?.headers) Object.assign(headers, opts.headers as Record<string, string>)
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || ''
  const url = apiBase ? `${apiBase}${path}` : path
  const res = await fetch(url, { credentials: 'include', headers, ...opts })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ erro: 'Erro na requisição' }))
    throw new Error((data as { erro?: string }).erro || `Erro ${res.status}`)
  }
  return res.json() as Promise<T>
}

/**
 * Rota /admin — painel admin isolado do app principal.
 * Fluxo: verifica sessão -> se admin, mostra painel -> se não, mostra login único.
 */
export default function AdminRoute() {
  const [session, setSession] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    try {
      const data = await api<{ logado: boolean; tipo?: string; id?: string; email?: string }>('/api/auth/me')
      if (data.logado && data.tipo === 'admin') {
        setSession({ tipo: 'admin', id: data.id!, email: data.email! })
      } else {
        setSession(null)
      }
    } catch {
      setSession(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const handleLogout = useCallback(async () => {
    try { await api('/api/auth/logout', { method: 'POST' }) } catch {}
    setSession(null)
    toast.success('Sessão encerrada')
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 gap-4">
        <img src="/icon-192.png" alt="EncarteBrasil" className="h-20 w-20 rounded-2xl" />
        <p className="text-sm text-gray-300">Carregando painel admin...</p>
      </div>
    )
  }

  // Se já é admin, mostra painel direto
  if (session) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <header className="bg-gray-900 text-white sticky top-0 z-50 shadow-md">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/icon-192.png" alt="EncarteBrasil" className="h-8 w-8 rounded-lg" />
              <h1 className="text-lg font-bold">Painel Admin</h1>
              <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">
                {session.email}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a href="/" className="text-xs text-gray-300 hover:text-white mr-2">← App</a>
              <Button variant="ghost" size="sm" onClick={handleLogout}
                className="text-white hover:bg-white/20 h-8 px-2">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
          <AdminPanel onLogout={handleLogout} onLogin={checkAuth} sessionOverride={session} />
        </main>
      </div>
    )
  }

  // Não logado — mostra login ÚNICO (sem redirecionar para outro login)
  return <AdminLogin onLogin={checkAuth} />
}

// ── Login admin único (sem abas, sem duplicação) ─────────────────────────
function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !senha) {
      toast.error('Preencha e-mail e senha')
      return
    }
    setLoading(true)
    try {
      const data = await api<{ tipo: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, senha }),
      })
      if (data.tipo === 'admin') {
        toast.success('Login admin realizado!')
        onLogin() // chama checkAuth que vai setSession e re-renderizar
      } else {
        toast.error('Esta conta não é admin. Use o app principal.')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      <header className="bg-gray-950 text-white border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/icon-192.png" alt="EncarteBrasil" className="h-8 w-8 rounded-lg" />
            <h1 className="text-lg font-bold">EncarteBrasil — Admin</h1>
          </div>
          <a href="/" className="text-xs text-gray-400 hover:text-white">← Voltar para o app</a>
        </div>
      </header>
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-8 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6">
            <div className="text-center mb-6">
              <img src="/icon-192.png" alt="EncarteBrasil" className="h-16 w-16 rounded-2xl mx-auto mb-3 shadow-md" />
              <h2 className="text-lg font-bold text-gray-900">Painel Administrativo</h2>
              <p className="text-xs text-gray-500 mt-1">Acesso restrito.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">E-mail</label>
                <input
                  type="email"
                  placeholder="admin@encartebrasil.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Senha</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="current-password"
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Entrando...' : 'Entrar como Admin'}
              </button>
            </form>
            <p className="text-[11px] text-gray-400 text-center mt-4">
              🔒 Área restrita. Não compartilhe suas credenciais.
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
