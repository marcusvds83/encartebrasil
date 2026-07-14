import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'admin') return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    const { id } = await params
    const { status } = await req.json()
    if (!status) return NextResponse.json({ erro: 'Status obrigatório' }, { status: 400 })

    const validStatuses = ['piloto', 'ativo', 'inativo', 'suspenso']
    if (!validStatuses.includes(status)) return NextResponse.json({ erro: 'Status inválido' }, { status: 400 })

    const updated = await db.mercado.update(id, { status })
    return NextResponse.json({ ok: true, status: (updated as any)?.status || status })
  } catch {
    return NextResponse.json({ erro: 'Erro ao alterar status' }, { status: 500 })
  }
}
