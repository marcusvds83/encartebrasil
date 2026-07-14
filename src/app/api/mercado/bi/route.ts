import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'mercado') return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    // Top 10 produtos mais clicados
    const topProdutosGrouped = await db.cliqueProduto.groupByProduto(session.id)
    const topComNomes = await Promise.all(
      topProdutosGrouped.map(async (tp: any) => {
        const produto = await db.produto.findUnique(tp.produtoId)
        return {
          nome: produto?.nome || 'Desconhecido',
          marca: produto?.marca || '',
          cliques: tp._count.id,
        }
      })
    )

    // Market info
    const mercado = await db.mercado.findUnique({
      where: { id: session.id },
      select: { cidade: true, estado: true },
    })
    const regiao = mercado ? `${mercado.cidade}/${mercado.estado}` : ''

    // Cliques por semana
    const cliques = await db.cliqueProduto.findByMarket(session.id)
    const semanas: Record<string, number> = {}
    for (const c of cliques) {
      const d = new Date(c.criadoEm)
      const weekStart = new Date(d)
      weekStart.setDate(d.getDate() - d.getDay())
      const key = weekStart.toISOString().slice(0, 10)
      semanas[key] = (semanas[key] || 0) + 1
    }

    const cliquesSemana = Object.entries(semanas)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 8)
      .reverse()
      .map(([semana, total]) => ({ semana, total }))

    const thisWeek = cliquesSemana.length >= 1 ? cliquesSemana[cliquesSemana.length - 1]?.total || 0 : 0
    const lastWeek = cliquesSemana.length >= 2 ? cliquesSemana[cliquesSemana.length - 2]?.total || 0 : 0
    const trend = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0

    return NextResponse.json({
      topProdutos: topComNomes,
      cliquesPorRegiao: [{ regiao, total: cliques.length }],
      cliquesSemana,
      trend,
      regiao,
    })
  } catch {
    return NextResponse.json({ erro: 'Erro ao buscar BI' }, { status: 500 })
  }
}
