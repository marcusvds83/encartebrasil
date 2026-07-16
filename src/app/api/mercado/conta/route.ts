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
        criadoEm: true, logoPath: true, endereco: true, telefone: true, segmento: true,
      },
    })
    if (!mercado) return NextResponse.json({ erro: 'Mercado não encontrado' }, { status: 404 })

    let statusEfetivo = mercado.status
    const agora = new Date().toISOString()
    if (mercado.status === 'piloto' && mercado.pilotoFim && agora > mercado.pilotoFim) {
      statusEfetivo = 'piloto_expirado'
    }
    // "ativo_aguardando_pagamento" também bloqueia as funcionalidades
    if (mercado.status === 'ativo_aguardando_pagamento') {
      statusEfetivo = 'ativo_aguardando_pagamento'
    }

    // Encartes ativos (concluídos e não expirados)
    const todosEncartes = await db.encarte.findMany({ where: { mercadoId: mercado.id } })
    const encartesAtivos = todosEncartes.filter(
      (e: any) => e.statusExtracao === 'concluido' && (!e.dataFim || e.dataFim >= agora),
    )
    const activeEncarteIds = encartesAtivos.map((e: any) => e.id)

    // Conta produtos efficiently (sem findAll N+1)
    const totalProdutos = await (db.produto as any).countByEncarteIds?.(mercado.id, activeEncarteIds) ?? 0
    const totalEncartes = encartesAtivos.length
    const totalCliques = await db.cliqueProduto.count({ where: { mercadoId: mercado.id } })

    return NextResponse.json({ ...mercado, statusEfetivo, totalProdutos, totalEncartes, totalCliques })
  } catch (e) {
    console.error('[conta] erro:', e)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}