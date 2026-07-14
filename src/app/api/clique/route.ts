import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { produtoId, mercadoId, sessionId } = await req.json()
    if (!produtoId || !mercadoId) {
      return NextResponse.json({ erro: 'Dados obrigatórios' }, { status: 400 })
    }
    await db.cliqueProduto.create({
      produtoId, mercadoId,
      sessionId: sessionId || 'anon',
      criadoEm: new Date().toISOString(),
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ erro: 'Erro ao registrar clique' }, { status: 500 })
  }
}
