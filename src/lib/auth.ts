import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { createHash } from 'crypto'

export interface SessionData {
  tipo: 'admin' | 'mercado' | 'usuario'
  id: string
  email: string
  nome?: string
  status?: string
  photoURL?: string | null
  provider?: string
}

export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies()
    const raw = cookieStore.get('eb_session')?.value
    if (!raw) return null
    const data: SessionData = JSON.parse(raw)

    if (data.tipo === 'admin') {
      const a = await db.admin.findUnique({ where: { email: data.email } })
      if (a) return data
    } else if (data.tipo === 'mercado') {
      const m = await db.mercado.findUnique({
        where: { id: data.id },
        select: { nome: true, status: true, emailLogin: true },
      })
      if (m) return { ...data, nome: m.nome, status: m.status }
    } else if (data.tipo === 'usuario') {
      const u = await db.usuario.findUnique({
        where: { id: data.id },
        select: { nome: true, email: true, photoURL: true, provider: true },
      })
      if (u) return { ...data, nome: (u as any).nome || undefined, photoURL: (u as any).photoURL }
    }
    return null
  } catch {
    return null
  }
}

export function sessionCookie(data: SessionData) {
  return {
    name: 'eb_session' as const,
    value: JSON.stringify(data),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  }
}
