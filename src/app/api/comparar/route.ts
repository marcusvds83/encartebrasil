import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const produtos = await db.produto.findAll()

    const grouped: Record<string, any> = {}
    for (const p of produtos) {
      const key = (p.normalizado || p.nome.toLowerCase().trim()) as string
      if (!grouped[key]) grouped[key] = { nome: key, produtos: [] }
      const precoNum = parseFloat(p.preco.replace(/[^\d,]/g, '').replace(',', '.')) || 0
      grouped[key].produtos.push({
        id: p.id, nome: p.nome, marca: p.marca,
        preco: p.preco, precoNum, unidade: p.unidade, mercado: p.mercado,
      })
    }

    const comparacoes = Object.values(grouped)
      .filter((group: any) => {
        const marketIds = new Set((group.produtos as any[]).map((p: any) => p.mercado.id))
        return marketIds.size >= 2
      })
      .map((group: any) => ({
        normalizado: group.nome,
        nome: group.produtos[0]?.nome || group.nome,
        produtos: group.produtos.sort((a: any, b: any) => a.precoNum - b.precoNum),
      }))
      .sort((a: any, b: any) => a.normalizado.localeCompare(b.normalizado))

    return NextResponse.json({ comparacoes })
  } catch {
    return NextResponse.json({ erro: 'Erro ao comparar' }, { status: 500 })
  }
}
