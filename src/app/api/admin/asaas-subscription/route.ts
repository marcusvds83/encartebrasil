import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { getSubscription, getSubscriptionPayments, cancelSubscription } from '@/lib/asaas'

/**
 * GET /api/admin/asaas-subscription?id=<mercadoId>
 * Busca status da assinatura Asaas de um mercado específico.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'admin') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }

    const mercadoId = req.nextUrl.searchParams.get('id')
    if (!mercadoId) {
      return NextResponse.json({ erro: 'ID do mercado obrigatório' }, { status: 400 })
    }

    const mercado = await db.mercado.findUnique({ where: { id: mercadoId } })
    if (!mercado) {
      return NextResponse.json({ erro: 'Empresa não encontrada' }, { status: 404 })
    }

    const m = mercado as any
    const result: any = {
      mercadoId: m.id,
      nome: m.nome,
      status: m.status,
      asaasCustomerId: m.asaasCustomerId || null,
      asaasSubscriptionId: m.asaasSubscriptionId || null,
      asaasAssinaturaCancelada: m.asaasAssinaturaCancelada || false,
      ultimoPagamento: m.ultimoPagamento || null,
      ultimoPagamentoValor: m.ultimoPagamentoValor || null,
    }

    // Busca dados da assinatura no Asaas
    if (m.asaasSubscriptionId) {
      try {
        const sub = await getSubscription(m.asaasSubscriptionId)
        result.subscription = {
          id: sub.id,
          status: sub.status,
          cycle: sub.cycle,
          nextDueDate: sub.nextDueDate,
          billingType: sub.billingType,
          value: sub.value,
        }

        // Últimas faturas
        const payments = await getSubscriptionPayments(m.asaasSubscriptionId)
        result.ultimasFaturas = payments.slice(0, 5).map((p: any) => ({
          id: p.id,
          status: p.status,
          value: p.value,
          billingType: p.billingType,
          dueDate: p.dueDate,
          paymentDate: p.paymentDate || null,
        }))
      } catch (err: any) {
        result.subscriptionError = err?.message || 'Erro ao buscar assinatura no Asaas'
      }
    } else {
      result.subscription = null
      result.ultimasFaturas = []
    }

    return NextResponse.json(result)
  } catch (err: any) {
    console.error(`[admin asaas-subscription] erro: ${err?.message || err}`)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

/**
 * POST /api/admin/asaas-subscription
 * Cancela a assinatura de um mercado (ação admin).
 * Body: { id: mercadoId }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'admin') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }

    const { id, acao } = await req.json()
    if (!id || !acao) {
      return NextResponse.json({ erro: 'ID e ação obrigatórios' }, { status: 400 })
    }

    const mercado = await db.mercado.findUnique({ where: { id } })
    if (!mercado) {
      return NextResponse.json({ erro: 'Empresa não encontrada' }, { status: 404 })
    }

    const m = mercado as any

    if (acao === 'cancelar_assinatura') {
      // Cancela a assinatura recorrente no Asaas
      if (m.asaasSubscriptionId) {
        try {
          await cancelSubscription(m.asaasSubscriptionId)
        } catch (err: any) {
          console.error(`[admin asaas] erro ao cancelar: ${err?.message}`)
        }
      }
      await db.mercado.update(id, { asaasAssinaturaCancelada: true } as any)
      return NextResponse.json({ ok: true, mensagem: `Assinatura de "${m.nome}" cancelada. Carência de 30 dias.` })

    } else if (acao === 'reativar_assinatura') {
      // Reativa localmente — o mercado precisará criar nova assinatura
      await db.mercado.update(id, {
        asaasAssinaturaCancelada: false,
        asaasSubscriptionId: null,
        asaasPaymentId: null,
        status: 'ativo_aguardando_pagamento',
      } as any)
      return NextResponse.json({ ok: true, mensagem: `"${m.nome}" precisará gerar nova assinatura no próximo login.` })

    } else if (acao === 'desativar_pagamento') {
      // Cancela assinatura e bloqueia imediatamente
      if (m.asaasSubscriptionId) {
        try { await cancelSubscription(m.asaasSubscriptionId) } catch {}
      }
      await db.mercado.update(id, {
        asaasAssinaturaCancelada: true,
        status: 'inativo',
      } as any)
      return NextResponse.json({ ok: true, mensagem: `"${m.nome}" desativado.` })

    }

    return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 })
  } catch (err: any) {
    console.error(`[admin asaas-subscription] erro: ${err?.message || err}`)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}