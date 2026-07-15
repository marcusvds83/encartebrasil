import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/mercados/:id
 * Retorna detalhes do mercado com encartes VIGENTES e seus produtos.
 * Encartes expirados (dataFim < agora) não aparecem para o consumidor.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const mercado = await db.mercado.findUniqueWithRelations(id)
    if (!mercado) return NextResponse.json({ erro: 'Mercado não encontrado' }, { status: 404 })

    const agora = new Date()

    // Filtra encartes expirados — só mostra vigentes para o consumidor
    const encartesVigentes = ((mercado as any).encartes || [])
      .filter((e: any) => {
        if (!e.dataFim) return true // sem data fim = não expira
        return new Date(e.dataFim) >= agora
      })
      .map((e: any) => ({
        ...e,
        _count: { produtos: ((mercado as any).produtos || []).filter((p: any) => p.encarteId === e.id).length },
      }))

    // Produtos de encartes vigentes
    const vigentesIds = new Set(encartesVigentes.map((e: any) => e.id))
    const produtosAtivos = ((mercado as any).produtos || [])
      .filter((p: any) => vigentesIds.has(p.encarteId))

    return NextResponse.json({
      ...(mercado as any),
      encartes: encartesVigentes,
      produtos: produtosAtivos,
    })
  } catch {
    return NextResponse.json({ erro: 'Erro ao buscar mercado' }, { status: 500 })
  }
}