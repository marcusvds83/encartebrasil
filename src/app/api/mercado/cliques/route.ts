import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'mercado') return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    const { produtoId, mercadoId, sessionId } = await req.json()
    if (!produtoId || !mercadoId) return NextResponse.json({ erro: 'Dados obrigatórios' }, { status: 400 })
    await db.cliqueProduto.create({
      produtoId, mercadoId,
      sessionId: sessionId || session.id,
      criadoEm: new Date().toISOString(),
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ erro: 'Erro ao registrar clique' }, { status: 500 })
  }
}
