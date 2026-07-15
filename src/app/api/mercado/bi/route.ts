import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'mercado') return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    // Todos os registros de interação deste mercado
    const todos = await db.cliqueProduto.findByMarket(session.id)

    // Separar visualizações de mercado vs cliques em produto
    const visualizacoes = todos.filter((c: any) => c.tipo === 'mercado')
    const cliquesProduto = todos.filter((c: any) => c.tipo !== 'mercado' && c.produtoId)

    // Top 10 produtos mais clicados (somente cliques de produto)
    const counts: Record<string, number> = {}
    for (const c of cliquesProduto) {
      counts[c.produtoId] = (counts[c.produtoId] || 0) + 1
    }
    const topProdutosGrouped = Object.entries(counts)
      .map(([produtoId, cnt]) => ({ produtoId, _count: { id: cnt } }))
      .sort((a, b) => b._count.id - a._count.id)
      .slice(0, 10)

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

    // Interações por semana (TODAS: visualizações + cliques de produto)
    const semanas: Record<string, number> = {}
    for (const c of todos) {
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
      totalVisualizacoes: visualizacoes.length,
      totalCliquesProdutos: cliquesProduto.length,
      cliquesPorRegiao: [{ regiao, total: todos.length }],
      cliquesSemana,
      trend,
      regiao,
    })
  } catch (err) {
    console.error('[bi] erro:', err)
    return NextResponse.json({ erro: 'Erro ao buscar BI' }, { status: 500 })
  }
}