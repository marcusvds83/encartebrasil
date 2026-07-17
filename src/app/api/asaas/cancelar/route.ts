import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { cancelSubscription } from '@/lib/asaas'

/**
 * POST /api/asaas/cancelar
 * Cancela a assinatura recorrente do mercado logado.
 * O mercado continua com acesso por 30 dias (carência) após o último pagamento.
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

    const m = mercado as any
    if (!m.asaasSubscriptionId) {
      return NextResponse.json({ erro: 'Nenhuma assinatura ativa encontrada' }, { status: 400 })
    }

    // Cancela no Asaas
    try {
      await cancelSubscription(m.asaasSubscriptionId)
    } catch (err: any) {
      console.error(`[asaas cancelar] erro ao cancelar no Asaas: ${err?.message}`)
      // Mesmo se falhar no Asaas, marca como cancelado localmente
    }

    // Marca como cancelado localmente (mas mantém status 'ativo' — carência de 30 dias)
    await db.mercado.update(session.id, {
      asaasAssinaturaCancelada: true,
    } as any)

    console.log(`[asaas cancelar] assinatura cancelada para mercado ${session.id}, carência de 30 dias`)

    return NextResponse.json({
      ok: true,
      mensagem: 'Assinatura cancelada. Você ainda tem acesso por 30 dias após o último pagamento.',
      dataFimAcesso: m.ultimoPagamento
        ? new Date(new Date(m.ultimoPagamento).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null,
    })
  } catch (err: any) {
    console.error(`[asaas cancelar] erro: ${err?.message || err}`)
    return NextResponse.json({ erro: err?.message || 'Erro ao cancelar assinatura' }, { status: 500 })
  }
}