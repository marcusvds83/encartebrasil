import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { getPayment, getPaymentByExternalRef } from '@/lib/asaas'

/**
 * GET /api/asaas/status
 * Verifica o status do último pagamento do mercado no Asaas.
 * Usado para atualizar a UI sem recarregar a página.
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
    const statusEfetivo = m.status === 'piloto' && m.pilotoFim && new Date(m.pilotoFim) < new Date()
      ? 'piloto_expirado'
      : m.status === 'ativo_aguardando_pagamento'
        ? 'ativo_aguardando_pagamento'
        : m.status

    // Se tem pagamento pendente, verifica status no Asaas
    let paymentStatus = null
    if (m.asaasPaymentId) {
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
        // Se foi pago, atualiza o mercado automaticamente
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
      payment: paymentStatus,
    })
  } catch (err: any) {
    console.error(`[asaas status] erro: ${err?.message || err}`)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}