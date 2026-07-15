import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ eid: string }> },
) {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'mercado') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }
    const { eid } = await params

    // Verifica se o encarte pertence ao mercado logado
    const encartes = await db.encarte.findMany({ where: { mercadoId: session.id } })
    const encarte = encartes.find(e => e.id === eid)
    if (!encarte) {
      return NextResponse.json({ erro: 'Encarte não encontrado' }, { status: 404 })
    }

    // Deleta o encarte e todos os produtos associados
    await db.encarte.delete(eid)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[encarte delete] erro:', e)
    return NextResponse.json({ erro: 'Erro ao excluir encarte' }, { status: 500 })
  }
}