import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/produtos/mais-baratos
 * Retorna produtos de encartes VIGENTES (não expirados), ordenados por preço.
 * Query params:
 *   limit=50     — número máximo de produtos
 *   order=asc    — asc (mais baratos) ou desc (mais caros)
 *   busca=       — busca textual por nome de produto (case-insensitive)
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)
    const order = url.searchParams.get('order') === 'desc' ? 'desc' : 'asc'
    const busca = (url.searchParams.get('busca') || '').trim().toLowerCase()

    const produtos = await db.produto.findAll()
    const agora = new Date()

    // Precisamos filtrar por encartes vigentes
    // Busca os encartes para saber quais estão expirados
    const todosEncartes = await (db.encarte as any).findMany?.() || []
    const encartesExpirados = new Set<string>()
    for (const e of todosEncartes as any[]) {
      if (e.dataFim && new Date(e.dataFim) < agora) {
        encartesExpirados.add(e.id)
      }
    }

    const vigentes = produtos
      .filter((p: any) => !encartesExpirados.has(p.encarteId))
      .map((p: any) => ({
        id: p.id,
        nome: p.nome,
        marca: p.marca,
        preco: p.preco,
        precoNum: parseFloat(String(p.preco).replace(/[^\d,]/g, '').replace(',', '.')) || 0,
        unidade: p.unidade,
        mercado: p.mercado,
        mercadoId: p.mercadoId,
        encarteId: p.encarteId,
      }))

    // Filtro de busca
    const filtrados = busca
      ? vigentes.filter((p: any) =>
          p.nome.toLowerCase().includes(busca) ||
          (p.marca && p.marca.toLowerCase().includes(busca)),
        )
      : vigentes

    // Ordena por preço
    filtrados.sort((a: any, b: any) =>
      order === 'asc' ? a.precoNum - b.precoNum : b.precoNum - a.precoNum,
    )

    return NextResponse.json({
      produtos: filtrados.slice(0, limit),
      total: filtrados.length,
    })
  } catch (e) {
    console.error('[mais-baratos] erro:', e)
    return NextResponse.json({ erro: 'Erro ao buscar produtos' }, { status: 500 })
  }
}