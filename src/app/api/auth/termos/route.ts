import { NextRequest, NextResponse } from 'next/server'
import { getSession, sessionCookie, type SessionData } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * POST /api/auth/termos — Salva aceite dos termos de uso no DB e atualiza cookie.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }

    const { aceito } = await req.json()
    if (aceito !== true) {
      return NextResponse.json({ erro: 'Aceite é obrigatório' }, { status: 400 })
    }

    const now = new Date().toISOString()

    // Salva no DB
    if (session.tipo === 'usuario') {
      await db.usuario.update(session.id, { termosAceitos: now })
    } else if (session.tipo === 'mercado') {
      await db.mercado.update(session.id, { termosAceitos: now })
    }

    // Atualiza o cookie da sessão com termosAceitos
    const data: SessionData = {
      ...session,
      termosAceitos: now,
    }
    const cookie = sessionCookie(data)
    const res = NextResponse.json({ ok: true })
    res.cookies.set(cookie)
    return res
  } catch (e) {
    console.error('[auth/termos] erro:', e)
    return NextResponse.json({ erro: 'Erro ao salvar termos' }, { status: 500 })
  }
}