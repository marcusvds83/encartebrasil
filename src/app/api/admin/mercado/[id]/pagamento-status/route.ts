import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * PATCH /api/admin/mercado/[id]/pagamento-status
 *
 * Marca o status de pagamento de uma empresa:
 * - 'pago'      → empresa liberada (status='ativo', atualiza ultimoPagamento + dataProximoPagamento +30 dias)
 * - 'pendente'  → aguardando confirmação (status='ativo_aguardando_pagamento')
 * - 'cancelado' → assinatura cancelada (status='inativo', limpa formaPagamento)
 *
 * Body: { statusPagamento: 'pago' | 'pendente' | 'cancelado' }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'admin') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }
    const { id } = await params
    const { statusPagamento } = await req.json()

    const statusValidos = ['pago', 'pendente', 'cancelado']
    if (!statusValidos.includes(statusPagamento)) {
      return NextResponse.json(
        { erro: 'Status inválido. Use: ' + statusValidos.join(', ') },
        { status: 400 },
      )
    }

    const agora = new Date()
    let updateData: Record<string, any> = {
      statusPagamento,
      dataAtualizacaoStatusPagamento: agora.toISOString(),
    }

    if (statusPagamento === 'pago') {
      // Libera a empresa: status='ativo', registra pagamento, agenda próximo
      const proximoPagamento = new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000)
      updateData = {
        ...updateData,
        status: 'ativo',
        ultimoPagamento: agora.toISOString(),
        ultimoPagamentoValor: undefined, // será preenchido pelo mercado.mensalidade no update
        dataProximoPagamento: proximoPagamento.toISOString(),
      }
    } else if (statusPagamento === 'pendente') {
      // Aguardando pagamento
      updateData = {
        ...updateData,
        status: 'ativo_aguardando_pagamento',
      }
    } else if (statusPagamento === 'cancelado') {
      // Cancela assinatura
      updateData = {
        ...updateData,
        status: 'inativo',
        dataProximoPagamento: null,
      }
    }

    // Busca mensalidade atual para preencher ultimoPagamentoValor
    if (statusPagamento === 'pago') {
      const mercado: any = await db.mercado.findUnique({ where: { id } })
      if (mercado) {
        updateData.ultimoPagamentoValor = (mercado as any).mensalidade || 399
      }
    }

    await db.mercado.update(id, updateData)

    console.log(`[admin/pagamento-status] Mercado ${id} → ${statusPagamento}`)

    return NextResponse.json({ ok: true, statusPagamento, updateData })
  } catch (e: any) {
    console.error('[admin/pagamento-status] erro:', e)
    return NextResponse.json({ erro: 'Erro ao alterar status de pagamento: ' + String(e) }, { status: 500 })
  }
}
