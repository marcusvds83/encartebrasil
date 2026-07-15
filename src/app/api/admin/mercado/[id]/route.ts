import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'admin') return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    const { id } = await params
    await db.mercado.delete(id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ erro: 'Erro ao excluir mercado' }, { status: 500 })
  }
}
