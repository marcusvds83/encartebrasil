import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * PATCH /api/admin/usuario/[id] — ativa/desativa um usuário PF
 * Body: { ativo: boolean }
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
    const { ativo } = await req.json()

    await (db.usuario as any).update(id, { ativo: !!ativo })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ erro: 'Erro ao atualizar usuário: ' + String(e) }, { status: 500 })
  }
}

/** DELETE /api/admin/usuario/[id] — remove usuário PF */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'admin') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }
    const { id } = await params
    // Soft delete: marca como removido
    await (db.usuario as any).update(id, { ativo: false, removidoEm: new Date().toISOString() })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ erro: 'Erro ao remover usuário: ' + String(e) }, { status: 500 })
  }
}
