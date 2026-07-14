import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ mid: string }> },
) {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'admin') return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    const { mid } = await params

    const m: any = await db.mercado.findUnique({ where: { id: mid } })
    if (!m) return NextResponse.json({ erro: 'Mercado não encontrado' }, { status: 404 })

    const currentDestaque = m.destaque || false
    await db.mercado.update(mid, { destaque: !currentDestaque })
    return NextResponse.json({ ok: true, destaque: !currentDestaque })
  } catch {
    return NextResponse.json({ erro: 'Erro ao alterar destaque' }, { status: 500 })
  }
}
