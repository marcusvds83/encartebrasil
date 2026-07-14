import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eid: string }> },
) {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'mercado') return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    const { eid } = await params
    const produtos = await db.produto.findMany({ where: { encarteId: eid, mercadoId: session.id }, orderBy: { criadoEm: 'desc' } })
    return NextResponse.json(produtos)
  } catch {
    return NextResponse.json({ erro: 'Erro ao buscar produtos' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eid: string }> },
) {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'mercado') return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    const { eid } = await params
    const { nome, marca, preco, unidade, normalizado } = await req.json()
    if (!nome || !preco) return NextResponse.json({ erro: 'Nome e preço obrigatórios' }, { status: 400 })

    const produto = await db.produto.create({
      encarteId: eid, mercadoId: session.id,
      nome, marca: marca || null, preco,
      unidade: unidade || null, normalizado: normalizado || null,
      criadoEm: new Date().toISOString(),
    })
    return NextResponse.json({ ok: true, produto })
  } catch {
    return NextResponse.json({ erro: 'Erro ao criar produto' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ eid: string }> },
) {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'mercado') return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    const { eid } = await params
    const { produtoId } = await req.json()
    if (!produtoId) return NextResponse.json({ erro: 'produtoId obrigatório' }, { status: 400 })

    await db.produto.deleteMany({ where: { id: produtoId, encarteId: eid, mercadoId: session.id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ erro: 'Erro ao excluir produto' }, { status: 500 })
  }
}
