import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const sid = req.nextUrl.searchParams.get('sessionId')
    if (!sid) return NextResponse.json({ erro: 'sessionId obrigatório' }, { status: 400 })
    const itens = await db.listaCompras.findMany({ where: { sessionId: sid }, orderBy: { criadoEm: 'desc' } })
    return NextResponse.json(itens)
  } catch {
    return NextResponse.json({ erro: 'Erro ao buscar lista' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId, produtoId, mercadoId, nome, marca, preco, unidade, mercadoNome } = await req.json()
    if (!sessionId || !nome) return NextResponse.json({ erro: 'Dados obrigatórios' }, { status: 400 })
    const item = await db.listaCompras.create({
      sessionId,
      produtoId: produtoId || null,
      mercadoId: mercadoId || null,
      nome, marca: marca || null, preco: preco || null,
      unidade: unidade || null, mercadoNome: mercadoNome || null,
      criadoEm: new Date().toISOString(),
      checked: false,
    })
    return NextResponse.json({ ok: true, item })
  } catch {
    return NextResponse.json({ erro: 'Erro ao adicionar item' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })
    const existing = await db.listaCompras.findUnique(id)
    if (!existing) return NextResponse.json({ erro: 'Item não encontrado' }, { status: 404 })
    await db.listaCompras.update(id, { checked: !existing.checked })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ erro: 'Erro ao atualizar item' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })
    await db.listaCompras.delete(id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ erro: 'Erro ao remover item' }, { status: 500 })
  }
}
