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
        formaPagamento: true, dataEscolhaPagamento: true,
        ultimoPagamento: true, ultimoPagamentoValor: true,
        dataProximoPagamento: true,
      },
    })
    if (!mercado) return NextResponse.json({ erro: 'Empresa não encontrada' }, { status: 404 })

    const m = mercado as any
    const agora = new Date()

    // ── Computa statusEfetivo ──
    let statusEfetivo = m.status

    // 1. Piloto expirado
    if (m.status === 'piloto' && m.pilotoFim && agora > new Date(m.pilotoFim)) {
      statusEfetivo = 'piloto_expirado'
    }

    // 2. Aguardando pagamento (admin ativou mas não pagou)
    if (m.status === 'ativo_aguardando_pagamento') {
      statusEfetivo = 'ativo_aguardando_pagamento'
    }

    // 3. Assinatura cancelada com carência (30 dias após último pagamento)
    if (m.status === 'ativo' && m.formaPagamento && m.ultimoPagamento && !m.dataProximoPagamento) {
      const diasDesdePagamento = (agora.getTime() - new Date(m.ultimoPagamento).getTime()) / (1000 * 60 * 60 * 24)
      if (diasDesdePagamento > 30) {
        statusEfetivo = 'assinatura_cancelada'
      } else {
        statusEfetivo = 'ativo_carencia'
      }
    }

    // 4. Próximo pagamento vencido (sem pagar no mês seguinte)
    if (m.status === 'ativo' && m.dataProximoPagamento && new Date(m.dataProximoPagamento) < agora) {
      statusEfetivo = 'pagamento_vencido'
    }

    // Encartes ativos (concluídos e não expirados)
    const todosEncartes = await db.encarte.findMany({ where: { mercadoId: mercado.id } })
    const agoraISO = agora.toISOString()
    const encartesAtivos = todosEncartes.filter(
      (e: any) => e.statusExtracao === 'concluido' && (!e.dataFim || e.dataFim >= agoraISO),
    )
    const activeEncarteIds = encartesAtivos.map((e: any) => e.id)

    const totalProdutos = await (db.produto as any).countByEncarteIds?.(mercado.id, activeEncarteIds) ?? 0
    const totalEncartes = encartesAtivos.length
    const totalCliques = await db.cliqueProduto.count({ where: { mercadoId: mercado.id } })

    // Data fim do acesso (para carência)
    let dataFimAcesso: string | null = null
    if (m.ultimoPagamento && statusEfetivo === 'ativo_carencia') {
      dataFimAcesso = new Date(new Date(m.ultimoPagamento).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }

    return NextResponse.json({
      ...mercado,
      statusEfetivo,
      totalProdutos,
      totalEncartes,
      totalCliques,
      dataFimAcesso,
    })
  } catch (e) {
    console.error('[conta] erro:', e)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}