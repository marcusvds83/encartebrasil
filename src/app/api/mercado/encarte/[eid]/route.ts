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
    if (!eid) {
      return NextResponse.json({ erro: 'ID do encarte obrigatório' }, { status: 400 })
    }

    // Busca encartes do mercado para verificar propriedade
    const todosEncartes = await db.encarte.findMany({ where: { mercadoId: session.id } })
    const encarte = todosEncartes.find((e: any) => e.id === eid)
    if (!encarte) {
      console.log('[encarte delete] encarte não encontrado para eid=', eid, 'mercadoId=', session.id, 'total encartes=', todosEncartes.length)
      return NextResponse.json({ erro: 'Encarte não encontrado ou não pertence ao seu mercado' }, { status: 404 })
    }

    // Deleta o encarte e todos os produtos associados
    await db.encarte.delete(eid)
    console.log('[encarte delete] excluído com sucesso eid=', eid)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[encarte delete] erro detalhado:', e?.message || e)
    return NextResponse.json({ erro: 'Erro ao excluir encarte: ' + (e?.message || String(e)) }, { status: 500 })
  }
}