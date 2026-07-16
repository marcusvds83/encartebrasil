import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { createOrUpdateCustomer, createSubscription, getSubscriptionPayments } from '@/lib/asaas'

/**
 * POST /api/asaas/checkout
 * Cria uma assinatura recorrente no Asaas e retorna os dados da primeira fatura.
 * Usado quando o piloto expira ou admin ativa o mercado.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'mercado') {
      return NextResponse.json({ erro: 'Acesso negado' }, { status: 401 })
    }

    const body = await req.json()
    const { billingType } = body as { billingType?: 'PIX' | 'BOLETO' }
    const tipo = (billingType || 'PIX').toUpperCase() as 'PIX' | 'BOLETO'

    // Busca dados do mercado
    const mercado = await db.mercado.findUnique({ where: { id: session.id } })
    if (!mercado) {
      return NextResponse.json({ erro: 'Mercado não encontrado' }, { status: 404 })
    }

    const m = mercado as any
    const mensalidade = m.mensalidade || 399

    // Se já tem assinatura ativa no Asaas, retorna info da assinatura existente
    if (m.asaasSubscriptionId) {
      try {
        const existingPayments = await getSubscriptionPayments(m.asaasSubscriptionId)
        if (existingPayments.length > 0) {
          const latestPayment = existingPayments[0]
          return NextResponse.json({
            ok: true,
            subscriptionId: m.asaasSubscriptionId,
            alreadyExists: true,
            paymentId: latestPayment.id,
            value: latestPayment.value,
            billingType: latestPayment.billingType,
            status: latestPayment.status,
            invoiceUrl: latestPayment.invoiceUrl,
            pixQrCode: latestPayment.pixQrCode || null,
            pixEncodedImage: latestPayment.pixEncodedImage || null,
            bankSlipUrl: latestPayment.bankSlipUrl || null,
            dueDate: latestPayment.dueDate,
          })
        }
      } catch (err: any) {
        console.log(`[asaas checkout] assinatura existente não encontrada, criando nova: ${err?.message}`)
      }
    }

    // Cria ou atualiza customer no Asaas
    const customer = await createOrUpdateCustomer({
      name: m.nome || 'Mercado',
      email: m.emailLogin || session.email,
      cpfCnpj: m.cnpj || '',
      phone: m.telefone || '',
      externalReference: mercado.id,
    })

    // Cria assinatura recorrente mensal
    const subscription = await createSubscription({
      customerId: customer.id,
      value: mensalidade,
      billingType: tipo,
      description: `Panfletos Brasil — Mensalidade (${tipo}) — ${m.nome}`,
      externalReference: mercado.id,
    })

    // Busca a primeira fatura gerada pela assinatura
    let paymentData: any = null
    try {
      const payments = await getSubscriptionPayments(subscription.id)
      if (payments.length > 0) {
        paymentData = payments[0]
      }
    } catch (err: any) {
      console.log(`[asaas checkout] aviso: não conseguiu buscar faturas: ${err?.message}`)
    }

    // Salva os IDs no mercado
    await db.mercado.update(mercado.id, {
      asaasCustomerId: customer.id,
      asaasSubscriptionId: subscription.id,
      asaasPaymentId: paymentData?.id || null,
    } as any)

    console.log(`[asaas checkout] assinatura criada: sub=${subscription.id} customer=${customer.id} tipo=${tipo} valor=${mensalidade} mercado=${mercado.id}`)

    return NextResponse.json({
      ok: true,
      subscriptionId: subscription.id,
      alreadyExists: false,
      paymentId: paymentData?.id || null,
      value: paymentData?.value || mensalidade,
      billingType: tipo,
      status: subscription.status,
      invoiceUrl: paymentData?.invoiceUrl || '',
      pixQrCode: paymentData?.pixQrCode || null,
      pixEncodedImage: paymentData?.pixEncodedImage || null,
      bankSlipUrl: paymentData?.bankSlipUrl || null,
      dueDate: paymentData?.dueDate || subscription.nextDueDate,
    })
  } catch (err: any) {
    console.error(`[asaas checkout] erro: ${err?.message || err}`)
    return NextResponse.json({ erro: err?.message || 'Erro ao criar assinatura' }, { status: 500 })
  }
}