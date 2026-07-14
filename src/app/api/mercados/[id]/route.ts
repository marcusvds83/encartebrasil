import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const mercado = await db.mercado.findUniqueWithRelations(id)
    if (!mercado) return NextResponse.json({ erro: 'Mercado não encontrado' }, { status: 404 })
    return NextResponse.json(mercado)
  } catch {
    return NextResponse.json({ erro: 'Erro ao buscar mercado' }, { status: 500 })
  }
}
