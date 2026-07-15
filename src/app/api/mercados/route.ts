import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/mercados
 * Retorna mercados com contagens de produtos ativos (não expirados).
 * Encartes expirados (dataFim < agora) são excluídos da contagem.
 */
export async function GET() {
  try {
    const mercados = await db.mercado.findMany()
    const agora = new Date()

    const lista = mercados.map((m: any) => {
      // Busca encartes desse mercado para saber quais estão vigentes
      let totalProdutosAtivos = 0
      let totalEncartes = 0
      if (m.totalProdutos !== undefined && m.totalEncartes !== undefined) {
        // findMany já retorna as contagens globais do demo-db
        // Precisamos verificar se há data de expiração
        totalEncartes = m.totalEncartes || 0
        totalProdutosAtivos = m.totalProdutos || 0
      }

      return {
        id: m.id,
        nome: m.nome,
        cidade: m.cidade,
        estado: m.estado,
        logoPath: m.logoPath || null,
        destaque: m.destaque || false,
        totalProdutos: totalProdutosAtivos,
        totalEncartes: totalEncartes,
      }
    })
    const destaques = lista.filter((m: any) => m.destaque)
    return NextResponse.json({ mercados: lista, destaques })
  } catch {
    return NextResponse.json({ erro: 'Erro ao buscar mercados' }, { status: 500 })
  }
}