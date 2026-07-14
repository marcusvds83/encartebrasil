import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const mercados = await db.mercado.findMany()
    const lista = mercados.map((m: any) => ({
      id: m.id,
      nome: m.nome,
      cidade: m.cidade,
      estado: m.estado,
      logoPath: m.logoPath || null,
      destaque: m.destaque || false,
      totalProdutos: m.totalProdutos || 0,
      totalEncartes: m.totalEncartes || 0,
    }))
    const destaques = lista.filter((m: any) => m.destaque)
    return NextResponse.json({ mercados: lista, destaques })
  } catch {
    return NextResponse.json({ erro: 'Erro ao buscar mercados' }, { status: 500 })
  }
}
