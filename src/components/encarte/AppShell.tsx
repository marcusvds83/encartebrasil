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
  LogIn,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import HomeView from './HomeView'
import CompareView from './CompareView'
import MyListView from './MyListView'
import MarketPanel from './MarketPanel'
import AdminPanel from './AdminPanel'

// ── Types ───────────────────────────────────────────────────────────────────

export type TabId = 'home' | 'comparar' | 'lista' | 'conta'

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

  const res = await fetch(path, {
    credentials: 'include',
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
    showWhen: () => true,
  },
  {
    key: 'comparar',
    label: 'Comparar',
    icon: <GitCompareArrows className="h-5 w-5" />,
    showWhen: () => true,
  },
  {
    key: 'lista',
    label: 'Minha Lista',
    icon: <ShoppingCart className="h-5 w-5" />,
    showWhen: () => true,
  },
  {
    key: 'conta',
    label: 'Contas',
    icon: <Store className="h-5 w-5" />,
    showWhen: () => true,
  },
]

// ── EB Logo ─────────────────────────────────────────────────────────────────

function EbLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'h-7 w-7 text-xs',
    md: 'h-9 w-9 text-sm',
    lg: 'h-16 w-16 text-2xl',
  }
  return (
    <div
      className={cn(
        'rounded-full bg-white/20 flex items-center justify-center font-extrabold text-white shrink-0',
        sizes[size],
      )}
    >
      EB
    </div>
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
        // Auto-navigate to conta after login
        if (data.tipo === 'admin' || data.tipo === 'mercado') {
          setTab('conta')
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
    setTab('home')
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
        return <HomeView sessionId={sessionId} onAddToList={handleAddToList} />
      case 'comparar':
        return <CompareView />
      case 'lista':
        return <MyListView sessionId={sessionId} />
      case 'conta':
        if (session?.tipo === 'admin')
          return <AdminPanel onLogout={handleLogout} onLogin={checkAuth} />
        if (session?.tipo === 'mercado')
          return <MarketPanel onLogout={handleLogout} onLogin={checkAuth} />
        // Not logged in or usuario -> show login form
        return <MarketPanel onLogout={handleLogout} onLogin={checkAuth} />
      default:
        return <HomeView sessionId={sessionId} onAddToList={handleAddToList} />
    }
  }

  // ── Loading splash ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
        <motion.img
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          src="/icon-192.png"
          alt="EncarteBrasil"
          className="h-20 w-20 rounded-2xl"
        />
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-gray-500 font-medium"
        >
          Carregando...
        </motion.p>
      </div>
    )
  }

  return (
    <SessionCtx.Provider value={session}>
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className="bg-gradient-to-r from-red-600 to-orange-500 text-white sticky top-0 z-50 shadow-md">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <EbLogo size="sm" />
              <h1 className="text-lg font-bold tracking-tight">
                EncarteBrasil
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {session ? (
                <>
                  <span className="text-xs hidden sm:inline opacity-90 truncate max-w-[160px]">
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
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTab('conta')}
                  className="text-white hover:bg-white/20 h-8 px-3 gap-1.5"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline text-sm">Entrar</span>
                </Button>
              )}
            </div>
          </div>

          {/* Desktop horizontal tabs */}
          <nav className="hidden lg:block border-t border-white/20">
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

          {/* Mobile dropdown menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.nav
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="lg:hidden overflow-hidden border-t border-white/20"
              >
                <div className="px-4 py-2 flex flex-col gap-1">
                  {visibleTabs.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => {
                        setTab(t.key)
                        setMobileMenuOpen(false)
                      }}
                      className={cn(
                        'px-4 py-2.5 text-sm font-medium text-left rounded-md transition-colors',
                        tab === t.key
                          ? 'bg-white/20 text-white'
                          : 'text-white/80 hover:bg-white/10 hover:text-white',
                      )}
                    >
                      <span className="inline-flex items-center gap-2">
                        {t.icon} {t.label}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.nav>
            )}
          </AnimatePresence>
        </header>

        {/* ── Main Content ────────────────────────────────────────────── */}
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-4 pb-28 lg:pb-6">
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

        {/* ── Bottom Nav (Mobile) ─────────────────────────────────────── */}
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
      </div>
    </SessionCtx.Provider>
  )
}