import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'admin') return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const mercados = await db.mercado.findMany()
    const withCounts = await Promise.all(mercados.map(async (m: any) => {
      const totalProdutos = await db.produto.count({ where: { mercadoId: m.id } })
      const totalCliques = await db.cliqueProduto.count({ where: { mercadoId: m.id } })
      return {
        ...m,
        totalProdutos,
        totalEncartes: m.totalEncartes || 0,
        totalCliques,
        asaasSubscriptionId: m.asaasSubscriptionId || null,
        asaasAssinaturaCancelada: m.asaasAssinaturaCancelada || false,
        ultimoPagamento: m.ultimoPagamento || null,
        _count: { produtos: totalProdutos, encartes: m.totalEncartes || 0, cliques: totalCliques },
      }
    }))

    return NextResponse.json(withCounts)
  } catch {
    return NextResponse.json({ erro: 'Erro ao buscar mercados' }, { status: 500 })
  }
}
