import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * PATCH /api/admin/mercado/[id]/status — altera status de um mercado
 * Body: { status: 'piloto' | 'ativo' | 'inativo' | 'suspenso' }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'admin') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }
    const { id } = await params
    const { status } = await req.json()

    const statusValidos = ['piloto', 'ativo', 'inativo', 'suspenso']
    if (!statusValidos.includes(status)) {
      return NextResponse.json({ erro: 'Status inválido. Use: ' + statusValidos.join(', ') }, { status: 400 })
    }

    await db.mercado.update(id, { status })
    return NextResponse.json({ ok: true, status })
  } catch (e) {
    return NextResponse.json({ erro: 'Erro ao alterar status: ' + String(e) }, { status: 500 })
  }
}
