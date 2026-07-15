import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

/** GET /api/admin/usuarios — lista todos os usuários PF */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'admin') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }
    const usuarios = await (db.usuario as any).findMany()
    return NextResponse.json({ usuarios })
  } catch (e) {
    return NextResponse.json({ erro: 'Erro ao listar usuários: ' + String(e) }, { status: 500 })
  }
}
