import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * POST /api/mercado/reativar-assinatura
 * Reativa a assinatura de um mercado (após cancelamento ou carência).
 * Limpa a flag de cancelamento e muda status para aguardando pagamento.
 */
export async function POST() {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'mercado') {
      return NextResponse.json({ erro: 'Acesso negado' }, { status: 401 })
    }

    const mercado = await db.mercado.findUnique({ where: { id: session.id } })
    if (!mercado) {
      return NextResponse.json({ erro: 'Empresa não encontrada' }, { status: 404 })
    }

    // Limpa dados da assinatura antiga e marca como aguardando pagamento
    await db.mercado.update(session.id, {
      asaasAssinaturaCancelada: false,
      asaasSubscriptionId: null,
      asaasPaymentId: null,
      status: 'ativo_aguardando_pagamento',
    } as any)

    console.log(`[reativar] mercado ${session.id} reativado, aguardando nova assinatura`)
    return NextResponse.json({ ok: true, mensagem: 'Assinatura reativada. Faça o pagamento para continuar.' })
  } catch (err: any) {
    console.error(`[reativar] erro: ${err?.message || err}`)
    return NextResponse.json({ erro: 'Erro ao reativar' }, { status: 500 })
  }
}