'use client'

import {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  GitCompareArrows,
  ShoppingCart,
  Store,
  ShieldCheck,
  LogOut,
  UserCircle,
} from 'lucide-react'
import { HomeLoading } from './LoadingAnimation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import HomeView from './HomeView'
import CompareView from './CompareView'
import MyListView from './MyListView'
import MarketPanel from './MarketPanel'
import AdminPanel from './AdminPanel'
import UserProfile from './UserProfile'
import MarketAccountView from './MarketAccountView'

// ── Types ───────────────────────────────────────────────────────────────────

export type TabId = 'home' | 'comparar' | 'lista' | 'mercado' | 'admin' | 'conta' | 'conta_mercado'

export interface AuthUser {
  tipo: 'mercado' | 'admin' | 'usuario'
  id: string
  email: string
  nome?: string
  status?: string
  photoURL?: string | null
}

export type MarketUserProps = AuthUser & { tipo: 'mercado' }
export type AdminUserProps = AuthUser & { tipo: 'admin' }

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Get or create a session UUID from localStorage */
export function getSessionId(): string {
  if (typeof window === 'undefined') return 'server'
  let sid = localStorage.getItem('eb_sid')
  if (!sid) {
    sid =
      'sess_' +
      Date.now().toString(36) +
      '_' +
      Math.random().toString(36).slice(2, 10)
    localStorage.setItem('eb_sid', sid)
  }
  return sid
}

/** Typed fetch wrapper – throws on non-ok responses */
export async function api<T = Record<string, unknown>>(
  path: string,
  opts?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {}
  if (!(opts?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  if (opts?.headers) {
    Object.assign(headers, opts.headers)
  }

  // Se NEXT_PUBLIC_API_BASE está definido (deploy estático), redireciona API pra origem
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || ''
  const url = apiBase ? `${apiBase}${path}` : path

  const res = await fetch(url, {
    credentials: 'include', // cookie sameSite:none funciona cross-origin
    headers,
    ...opts,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({ erro: 'Erro na requisição' }))
    throw new Error((data as { erro?: string }).erro || `Erro ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ── Session Context ─────────────────────────────────────────────────────────

const SessionCtx = createContext<AuthUser | null>(null)
export function useSession(): AuthUser | null {
  return useContext(SessionCtx)
}

// ── Tab Config ──────────────────────────────────────────────────────────────

interface TabDef {
  key: TabId
  label: string
  icon: ReactNode
  showWhen: (s: AuthUser | null) => boolean
}

const TABS: TabDef[] = [
  {
    key: 'home',
    label: 'Início',
    icon: <Home className="h-5 w-5" />,
    showWhen: (s) => !s || s.tipo === 'usuario', // só consumidor
  },
  {
    key: 'comparar',
    label: 'Comparar',
    icon: <GitCompareArrows className="h-5 w-5" />,
    showWhen: (s) => !s || s.tipo === 'usuario', // só consumidor
  },
  {
    key: 'lista',
    label: 'Minha Lista',
    icon: <ShoppingCart className="h-5 w-5" />,
    showWhen: (s) => !s || s.tipo === 'usuario', // só consumidor
  },
  {
    key: 'mercado',
    label: 'Painel',
    icon: <Store className="h-5 w-5" />,
    showWhen: (s) => s?.tipo === 'mercado', // só mercado vê o painel
  },
  {
    key: 'conta_mercado',
    label: 'Conta',
    icon: <UserCircle className="h-5 w-5" />,
    showWhen: (s) => s?.tipo === 'mercado',
  },
  {
    key: 'conta',
    label: 'Conta',
    icon: <Store className="h-5 w-5" />,
    showWhen: (s) => s?.tipo === 'usuario',
  },
  // Admin NÃO aparece no app — só via /admin
]

// ── EB Logo ─────────────────────────────────────────────────────────────────

function EbLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9',
    lg: 'h-16 w-16',
  }
  return (
    <img
      src="/icon-192.png"
      alt="Panfletos Brasil"
      className={cn('rounded-lg object-cover shrink-0 shadow-sm', sizes[size])}
    />
  )
}

// ── Component ───────────────────────────────────────────────────────────────

export default function AppShell() {
  const [tab, setTab] = useState<TabId>('home')
  const [session, setSession] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sessionId] = useState<string>(() => getSessionId())

  // ── Auth check ──────────────────────────────────────────────────────────
  const checkAuth = useCallback(async () => {
    try {
      const data = await api<{ logado: boolean } & AuthUser>('/api/auth/me')
      if (data.logado && data.tipo) {
        setSession({
          tipo: data.tipo,
          id: data.id,
          email: data.email,
          nome: data.nome,
          status: data.status,
          photoURL: data.photoURL,
        })
        // After login, navigate to appropriate tab
        if (data.tipo === 'mercado') {
          setTab('mercado') // mercado vai direto pro painel
        } else if (data.tipo === 'usuario') {
          setTab('home') // consumidor vai pra home
        } else if (data.tipo === 'admin') {
          // admin não usa o app, redireciona para /admin
          window.location.href = '/admin'
          return
        }
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

  // ── Logout ─────────────────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' })
    } catch {
      /* ignore */
    }
    setSession(null)
    setTab('mercado')
    toast.success('Sessão encerrada')
  }, [])

  // ── Add to list handler ────────────────────────────────────────────────
  const handleAddToList = useCallback(
    async (item: {
      produtoId: string
      mercadoId: string
      nome: string
      marca?: string | null
      preco?: string | null
      unidade?: string | null
      mercadoNome?: string | null
      mercadoCidade?: string | null
    }) => {
      try {
        await api('/api/lista', {
          method: 'POST',
          body: JSON.stringify({ sessionId, ...item }),
        })
        toast.success(`"${item.nome}" adicionado à lista`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao adicionar')
      }
    },
    [sessionId],
  )

  // ── Visible tabs ───────────────────────────────────────────────────────
  const visibleTabs = TABS.filter((t) => t.showWhen(session))

  // ── View renderer ──────────────────────────────────────────────────────
  const renderView = (t: TabId) => {
    switch (t) {
      case 'home':
        return (
          <HomeView
            sessionId={sessionId}
            onAddToList={handleAddToList}
            onPainelMercado={() => setTab('mercado')}
          />
        )
      case 'comparar':
        return <CompareView sessionId={sessionId} onAddToList={handleAddToList} />
      case 'lista':
        return <MyListView sessionId={sessionId} />
      case 'mercado':
        return <MarketPanel onLogout={handleLogout} onLogin={checkAuth} />
      case 'conta':
        return <UserProfile onLogout={handleLogout} />
      default:
        return (
          <HomeView
            sessionId={sessionId}
            onAddToList={handleAddToList}
            onPainelMercado={() => setTab('mercado')}
          />
        )
    }
  }

  // ── Loading splash ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <motion.img
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          src="/icon-192.png"
          alt="Panfletos Brasil"
          className="h-16 w-16 rounded-2xl mb-2"
        />
        <div className="mt-2">
          <HomeLoading />
        </div>
      </div>
    )
  }

  // ── Login obrigatório — sem sessão, mostra apenas o LoginForm ─────────
  // Ninguém entra no app sem se logar como Mercado ou Consumidor.
  // Admin só acessa via URL direta /admin (rota separada, desktop).
  if (!session) {
    return (
      <SessionCtx.Provider value={null}>
        <div className="min-h-screen flex flex-col bg-gradient-to-b from-orange-50 to-white">
          <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-4 flex items-center justify-center">
            <MarketPanel onLogout={handleLogout} onLogin={checkAuth} />
          </main>
        </div>
      </SessionCtx.Provider>
    )
  }

  // Mercado: layout com bottom nav (Painel + Conta)
  if (session.tipo === 'mercado') {
    const mercadoTabs = TABS.filter((t) => t.showWhen(session))
    return (
      <SessionCtx.Provider value={session}>
        <div className="min-h-screen flex flex-col bg-gray-50">
          {/* Header */}
          <header className="bg-gradient-to-r from-red-600 to-orange-500 text-white sticky top-0 z-50 shadow-md">
            <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <EbLogo size="sm" />
                <div>
                  <h1 className="text-lg font-bold leading-tight">Panfletos Brasil</h1>
                  <p className="text-[10px] opacity-90 leading-tight">
                    {tab === 'conta_mercado' ? 'Minha Conta' : 'Painel do Mercado'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs opacity-90 truncate max-w-[140px]">
                  {session.nome || session.email}
                </span>
                <Button variant="ghost" size="sm" onClick={handleLogout}
                  className="text-white hover:bg-white/20 h-8 px-2">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </header>

          {/* Desktop tabs */}
          <nav className="hidden lg:block bg-white border-b border-gray-200">
            <div className="max-w-6xl mx-auto px-4 flex gap-1">
              {mercadoTabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'px-4 py-2.5 text-sm font-medium transition-colors rounded-t-md',
                    tab === t.key
                      ? 'bg-red-50 text-red-600 border-b-2 border-red-600'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {t.icon} {t.label}
                  </span>
                </button>
              ))}
            </div>
          </nav>

          {/* Main content */}
          <main className={cn('flex-1 max-w-6xl mx-auto w-full px-4 py-4 pb-20 lg:pb-6')}>
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
              >
                {tab === 'conta_mercado' ? (
                  <MarketAccountView onLogout={handleLogout} />
                ) : (
                  <MarketPanel onLogout={handleLogout} onLogin={checkAuth} />
                )}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Bottom Nav (Mobile) */}
          <nav
            className={cn(
              'lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-50',
              'pb-[env(safe-area-inset-bottom,0px)]',
            )}
          >
            <div className="flex justify-around items-center h-14">
              {mercadoTabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'flex flex-col items-center justify-center py-1.5 px-3 text-xs transition-colors min-w-[56px]',
                    tab === t.key
                      ? 'text-red-600'
                      : 'text-gray-400 hover:text-gray-600',
                  )}
                >
                  {t.icon}
                  <span className="mt-0.5 font-medium leading-tight">
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
          </nav>
        </div>
      </SessionCtx.Provider>
    )
  }

  return (
    <SessionCtx.Provider value={session}>
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* ── Header (desktop only — mobile uses bottom nav) ──────────── */}
        <header className="hidden lg:block bg-gradient-to-r from-red-600 to-orange-500 text-white sticky top-0 z-50 shadow-md">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <EbLogo size="sm" />
              <h1 className="text-lg font-bold tracking-tight">
                Panfletos Brasil
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {session ? (
                <>
                  <span className="text-xs opacity-90 truncate max-w-[160px]">
                    {session.tipo === 'admin'
                      ? 'Administrador'
                      : session.tipo === 'mercado'
                        ? session.nome || session.email
                        : session.nome || session.email}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-white hover:bg-white/20 h-8 px-2"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          {/* Desktop horizontal tabs */}
          <nav className="border-t border-white/20">
            <div className="max-w-6xl mx-auto px-4 flex gap-1">
              {visibleTabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'px-4 py-2.5 text-sm font-medium transition-colors rounded-t-md',
                    tab === t.key
                      ? 'bg-white/20 text-white'
                      : 'text-white/80 hover:bg-white/10 hover:text-white',
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {t.icon} {t.label}
                  </span>
                </button>
              ))}
            </div>
          </nav>
        </header>

        {/* ── Main Content ────────────────────────────────────────────── */}
        <main className={cn(
          'flex-1 max-w-6xl mx-auto w-full px-4 py-4',
          session ? 'pb-28 lg:pb-6' : 'pb-6',
        )}>
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              {renderView(tab)}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* ── Bottom Nav (Mobile) — hidden when not logged in ───────── */}
        {session && (
          <nav
            className={cn(
              'lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-50',
              'pb-[env(safe-area-inset-bottom,0px)]',
            )}
          >
            <div className="flex justify-around items-center h-14">
              {visibleTabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'flex flex-col items-center justify-center py-1.5 px-3 text-xs transition-colors min-w-[56px]',
                    tab === t.key
                      ? 'text-red-600'
                      : 'text-gray-400 hover:text-gray-600',
                  )}
                >
                  {t.icon}
                  <span className="mt-0.5 font-medium leading-tight">
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
          </nav>
        )}
      </div>
    </SessionCtx.Provider>
  )
}