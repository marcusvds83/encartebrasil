import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET /api/mercado/perfil — Retorna dados completos do mercado logado.
 */
export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'mercado') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }

    const mercado: any = await db.mercado.findUnique({
      where: { id: session.id },
    })

    if (!mercado) {
      return NextResponse.json({ erro: 'Mercado não encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      id: mercado.id,
      nome: mercado.nome,
      emailLogin: mercado.emailLogin,
      cidade: mercado.cidade,
      estado: mercado.estado,
      endereco: mercado.endereco || '',
      telefone: mercado.telefone || '',
      cnpj: mercado.cnpj,
      status: mercado.status,
      pilotoInicio: mercado.pilotoInicio || null,
      pilotoFim: mercado.pilotoFim || null,
      mensalidade: mercado.mensalidade || 599,
    })
  } catch (e) {
    console.error('[mercado/perfil GET] erro:', e)
    return NextResponse.json({ erro: 'Erro ao buscar perfil' }, { status: 500 })
  }
}

/**
 * PUT /api/mercado/perfil — Atualiza dados editáveis do mercado.
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'mercado') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }

    const { nome, email, endereco, telefone } = await req.json()

    const updates: Record<string, any> = {}
    if (nome !== undefined) updates.nome = nome
    if (email !== undefined) updates.emailLogin = email
    if (endereco !== undefined) updates.endereco = endereco
    if (telefone !== undefined) updates.telefone = telefone

    const mercado: any = await db.mercado.update(session.id, updates)

    return NextResponse.json({ ok: true, ...mercado })
  } catch (e) {
    console.error('[mercado/perfil PUT] erro:', e)
    return NextResponse.json({ erro: 'Erro ao atualizar perfil' }, { status: 500 })
  }
}