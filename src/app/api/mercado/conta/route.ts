import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'mercado') return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const mercado = await db.mercado.findUnique({
      where: { id: session.id },
      select: {
        id: true, nome: true, cidade: true, estado: true,
        emailLogin: true, status: true, destaque: true,
        pilotoInicio: true, pilotoFim: true, mensalidade: true,
        criadoEm: true, logoPath: true, endereco: true, telefone: true,
      },
    })
    if (!mercado) return NextResponse.json({ erro: 'Mercado não encontrado' }, { status: 404 })

    let statusEfetivo = mercado.status
    const agora = new Date().toISOString()
    if (mercado.status === 'piloto' && mercado.pilotoFim && agora > mercado.pilotoFim) {
      statusEfetivo = 'piloto_expirado'
    }

    const totalProdutos = await db.produto.count({ where: { mercadoId: mercado.id } })
    const totalEncartes = await db.encarte?.count?.({ where: { mercadoId: mercado.id } }) || 0
    const totalCliques = await db.cliqueProduto.count({ where: { mercadoId: mercado.id } })

    return NextResponse.json({ ...mercado, statusEfetivo, totalProdutos, totalEncartes, totalCliques })
  } catch {
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
