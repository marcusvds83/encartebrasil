import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ pid: string }> },
) {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'mercado') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }
    const { pid } = await params

    const produto = await db.produto.findUnique(pid)
    if (!produto || produto.mercadoId !== session.id) {
      return NextResponse.json({ erro: 'Produto não encontrado' }, { status: 404 })
    }

    await db.produto.deleteMany({ where: { id: pid } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[produto delete] erro:', e)
    return NextResponse.json({ erro: 'Erro ao excluir produto' }, { status: 500 })
  }
}