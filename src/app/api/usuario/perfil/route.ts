import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET /api/usuario/perfil — Retorna dados do usuário logado (consumidor PF).
 */
export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'usuario') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }

    const usuario: any = await db.usuario.findUnique({
      where: { id: session.id },
    })

    if (!usuario) {
      return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome || null,
      photoURL: usuario.photoURL || null,
      provider: usuario.provider || 'email',
    })
  } catch (e) {
    console.error('[usuario/perfil GET] erro:', e)
    return NextResponse.json({ erro: 'Erro ao buscar perfil' }, { status: 500 })
  }
}

/**
 * PUT /api/usuario/perfil — Atualiza nome e email do consumidor.
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'usuario') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }

    const { nome, email } = await req.json()

    const usuario: any = await db.usuario.update(session.id, {
      nome: nome || undefined,
      email: email || undefined,
    })

    return NextResponse.json({ ok: true, ...usuario })
  } catch (e) {
    console.error('[usuario/perfil PUT] erro:', e)
    return NextResponse.json({ erro: 'Erro ao atualizar perfil' }, { status: 500 })
  }
}