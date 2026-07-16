import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { getPayment, getSubscription, getSubscriptionPayments } from '@/lib/asaas'

/**
 * GET /api/asaas/status
 * Verifica o status da assinatura/pagamento do mercado no Asaas.
 * Também computa statusEfetivo com lógica de carência (30 dias).
 */
export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'mercado') {
      return NextResponse.json({ erro: 'Acesso negado' }, { status: 401 })
    }

    const mercado = await db.mercado.findUnique({ where: { id: session.id } })
    if (!mercado) {
      return NextResponse.json({ erro: 'Mercado não encontrado' }, { status: 404 })
    }

    const m = mercado as any
    const agora = new Date()

    // ── Computa statusEfetivo com todas as regras ──
    let statusEfetivo = m.status

    // 1. Piloto expirado
    if (m.status === 'piloto' && m.pilotoFim && new Date(m.pilotoFim) < agora) {
      statusEfetivo = 'piloto_expirado'
    }

    // 2. Aguardando pagamento (admin ativou ou piloto expirou)
    if (m.status === 'ativo_aguardando_pagamento') {
      statusEfetivo = 'ativo_aguardando_pagamento'
    }

    // 3. Ativo com assinatura cancelada → verificar carência de 30 dias
    if (m.status === 'ativo' && m.asaasAssinaturaCancelada && m.ultimoPagamento) {
      const diasDesdePagamento = (agora.getTime() - new Date(m.ultimoPagamento).getTime()) / (1000 * 60 * 60 * 24)
      if (diasDesdePagamento > 30) {
        statusEfetivo = 'assinatura_cancelada'
      } else {
        statusEfetivo = 'ativo_carencia' // ainda dentro dos 30 dias
      }
    }

    // 4. Verifica se tem assinatura no Asaas e puxa dados
    let subscriptionData: any = null
    let paymentStatus: any = null

    if (m.asaasSubscriptionId) {
      try {
        subscriptionData = await getSubscription(m.asaasSubscriptionId)

        // Se a assinatura foi cancelada no Asaas mas não sabemos aqui, marca
        if (subscriptionData.status === 'CANCELED' || subscriptionData.status === 'INACTIVE') {
          if (!m.asaasAssinaturaCancelada) {
            await db.mercado.update(session.id, { asaasAssinaturaCancelada: true } as any)
          }
        }

        // Busca última fatura
        const payments = await getSubscriptionPayments(m.asaasSubscriptionId)
        if (payments.length > 0) {
          const latest = payments[0]
          paymentStatus = {
            id: latest.id,
            status: latest.status,
            value: latest.value,
            billingType: latest.billingType,
            invoiceUrl: latest.invoiceUrl,
            pixQrCode: latest.pixQrCode || null,
            pixEncodedImage: latest.pixEncodedImage || null,
            bankSlipUrl: latest.bankSlipUrl || null,
            dueDate: latest.dueDate,
          }

          // Se último pagamento foi confirmado, garante que o mercado está ativo
          if ((latest.status === 'RECEIVED' || latest.status === 'CONFIRMED') && m.status !== 'ativo') {
            await db.mercado.update(session.id, {
              status: 'ativo',
              ultimoPagamento: new Date().toISOString(),
              ultimoPagamentoValor: latest.value,
            } as any)
            return NextResponse.json({
              statusEfetivo: 'ativo',
              payment: paymentStatus,
              subscription: { id: subscriptionData.id, status: subscriptionData.status },
              ativado: true,
            })
          }
        }
      } catch (err: any) {
        console.error(`[asaas status] erro ao verificar assinatura: ${err?.message}`)
      }
    } else if (m.asaasPaymentId) {
      // Compatibilidade: se tem pagamento mas não assinatura (pagamentos antigos)
      try {
        const payment = await getPayment(m.asaasPaymentId)
        paymentStatus = {
          id: payment.id,
          status: payment.status,
          value: payment.value,
          billingType: payment.billingType,
          invoiceUrl: payment.invoiceUrl,
          pixQrCode: payment.pixQrCode || null,
          pixEncodedImage: payment.pixEncodedImage || null,
          bankSlipUrl: payment.bankSlipUrl || null,
        }
        if ((payment.status === 'RECEIVED' || payment.status === 'CONFIRMED') && m.status !== 'ativo') {
          await db.mercado.update(session.id, { status: 'ativo', ultimoPagamento: new Date().toISOString() } as any)
          return NextResponse.json({
            statusEfetivo: 'ativo',
            payment: paymentStatus,
            ativado: true,
          })
        }
      } catch (err: any) {
        console.error(`[asaas status] erro ao verificar pagamento: ${err?.message}`)
      }
    }

    return NextResponse.json({
      statusEfetivo,
      status: m.status,
      pilotoInicio: m.pilotoInicio,
      pilotoFim: m.pilotoFim,
      mensalidade: m.mensalidade || 399,
      segmento: m.segmento || 'mercados',
      asaasAssinaturaCancelada: m.asaasAssinaturaCancelada || false,
      ultimoPagamento: m.ultimoPagamento || null,
      payment: paymentStatus,
      subscription: subscriptionData ? {
        id: subscriptionData.id,
        status: subscriptionData.status,
        cycle: subscriptionData.cycle,
        nextDueDate: subscriptionData.nextDueDate,
        billingType: subscriptionData.billingType,
      } : null,
    })
  } catch (err: any) {
    console.error(`[asaas status] erro: ${err?.message || err}`)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}