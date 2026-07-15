import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { createHash } from 'crypto'

function hashSenha(s: string) {
  return createHash('sha256').update(s).digest('hex')
}

/**
 * POST /api/admin/senha — troca a senha de um mercado (PF não tem senha, usa Firebase)
 * Body: { mercadoId, novaSenha }
 * Apenas admin pode trocar.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'admin') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }

    const { mercadoId, novaSenha } = await req.json()
    if (!mercadoId || !novaSenha) {
      return NextResponse.json({ erro: 'mercadoId e novaSenha obrigatórios' }, { status: 400 })
    }
    if (novaSenha.length < 6) {
      return NextResponse.json({ erro: 'Senha deve ter no mínimo 6 caracteres' }, { status: 400 })
    }

    await db.mercado.update(mercadoId, { senhaHash: hashSenha(novaSenha) })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ erro: 'Erro ao trocar senha: ' + String(e) }, { status: 500 })
  }
}
