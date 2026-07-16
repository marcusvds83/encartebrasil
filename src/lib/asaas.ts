/**
 * Panfletos Brasil — Integração Asaas (Gateway de Pagamento)
 *
 * API Docs: https://docs.asaas.com/docs/api
 * Produção: https://api.asaas.com
 *
 * Fluxo:
 * 1. Mercado termina piloto → status = "ativo_aguardando_pagamento"
 * 2. App mostra tela de bloqueio com opção de pagamento
 * 3. Cria customer no Asaas (se não existir)
 * 4. Cria assinatura recorrente mensal (Subscription)
 * 5. Asaas gera faturas automaticamente todo mês
 * 6. Webhook confirma pagamento → status muda para "ativo"
 * 7. Mercado pode cancelar → 30 dias de carência após último pagamento
 */

const ASAAS_BASE = 'https://api.asaas.com/v3'
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || 'aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmIxOTEwZDlkLTIzZWQtNDJiOS04MDVlLTI4ODM3ZDA4OTM2ZTo6JGFhY2hfYzFjYWZmYjktOTFmZi00MDU5LWIzNjEtYWZlNzY0NGJhMGJk'

async function asaasFetch(path: string, options: RequestInit = {}) {
  const url = `${ASAAS_BASE}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'access_token': ASAAS_API_KEY,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.errors?.[0]?.description || `Asaas erro ${res.status}`)
  }
  return data
}

// ── Customer ──────────────────────────────────────────────────────────────────

export interface AsaasCustomer {
  id: string
  name: string
  email: string
  cpfCnpj: string
  phone?: string
  externalReference?: string
}

export async function createOrUpdateCustomer(data: {
  name: string
  email: string
  cpfCnpj: string
  phone?: string
  externalReference: string
}): Promise<AsaasCustomer> {
  try {
    const existing = await asaasFetch(`/customers?externalReference=${data.externalReference}&limit=1`)
    if (existing.data?.length > 0) {
      const updated = await asaasFetch(`/customers/${existing.data[0].id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
        }),
      })
      console.log(`[asaas] customer atualizado: ${existing.data[0].id}`)
      return updated
    }
  } catch {
    // Se não encontrar, cria novo
  }

  const customer = await asaasFetch('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: data.name,
      email: data.email,
      cpfCnpj: data.cpfCnpj,
      phone: data.phone,
      externalReference: data.externalReference,
    }),
  })
  console.log(`[asaas] customer criado: ${customer.id}`)
  return customer
}

// ── Assinatura (Subscription) Recorrente ──────────────────────────────────────

export interface AsaasSubscription {
  id: string
  customer: string
  billingType: 'PIX' | 'BOLETO'
  value: number
  nextDueDate: string
  cycle: string
  status: string // 'ACTIVE', 'INACTIVE', 'CANCELED', 'OVERDUE'
  description: string
  externalReference?: string
  endDate?: string
}

export async function createSubscription(params: {
  customerId: string
  value: number
  billingType: 'PIX' | 'BOLETO'
  description: string
  externalReference: string
  nextDueDate?: string
}): Promise<AsaasSubscription> {
  const nextDueDate = params.nextDueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const subscription = await asaasFetch('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      customer: params.customerId,
      billingType: params.billingType,
      value: params.value,
      cycle: 'MONTHLY',
      nextDueDate,
      description: params.description,
      externalReference: params.externalReference,
      // Não envia endDate → recorrente infinito até cancelar
    }),
  })

  console.log(`[asaas] assinatura criada: ${subscription.id} — ${params.billingType} — R$ ${params.value}/mês`)
  return subscription
}

export async function getSubscription(subscriptionId: string): Promise<AsaasSubscription> {
  return asaasFetch(`/subscriptions/${subscriptionId}`)
}

export async function cancelSubscription(subscriptionId: string): Promise<AsaasSubscription> {
  const result = await asaasFetch(`/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
  })
  console.log(`[asaas] assinatura cancelada: ${subscriptionId}`)
  return result
}

export async function deleteSubscription(subscriptionId: string): Promise<void> {
  await asaasFetch(`/subscriptions/${subscriptionId}`, { method: 'DELETE' })
  console.log(`[asaas] assinatura deletada: ${subscriptionId}`)
}

/** Busca a última fatura (payment) de uma assinatura */
export async function getSubscriptionPayments(subscriptionId: string): Promise<any[]> {
  const result = await asaasFetch(`/subscriptions/${subscriptionId}/payments?limit=10&order=desc`)
  return result.data || []
}

// ── Pagamento único (mantido para compatibilidade) ───────────────────────────

export interface AsaasPayment {
  id: string
  customer: string
  value: number
  billingType: 'PIX' | 'BOLETO'
  status: string
  invoiceUrl: string
  pixQrCode?: string
  pixEncodedImage?: string
  bankSlipUrl?: string
  dueDate: string
  subscription?: string
  externalReference?: string
  description: string
}

export async function getPayment(paymentId: string): Promise<AsaasPayment> {
  return asaasFetch(`/payments/${paymentId}`)
}

export async function getPaymentByExternalRef(externalRef: string): Promise<AsaasPayment[]> {
  const result = await asaasFetch(`/payments?externalReference=${externalRef}&limit=5&order=desc`)
  return result.data || []
}

// ── Webhook helpers ──────────────────────────────────────────────────────────

export function parseWebhookEvent(body: any): { event: string; payment: AsaasPayment } | null {
  if (!body?.event || !body?.payment?.id) return null
  return {
    event: body.event,
    payment: body.payment,
  }
}

/** Verifica e processa confirmação de pagamento via webhook */
export async function handlePaymentConfirmation(body: any): Promise<{ ok: boolean; message: string }> {
  const parsed = parseWebhookEvent(body)
  if (!parsed) {
    return { ok: false, message: 'Evento inválido' }
  }

  const { event, payment } = parsed

  // Log todos os eventos para debug
  console.log(`[asaas webhook] evento: ${event} | payment: ${payment.id} | status: ${payment.status}`)

  // Só processa pagamentos confirmados/recebidos
  if (event !== 'PAYMENT_RECEIVED' && event !== 'PAYMENT_CONFIRMED') {
    console.log(`[asaas webhook] evento ignorado: ${event}`)
    return { ok: true, message: `Evento ${event} ignorado` }
  }

  if (payment.status !== 'RECEIVED' && payment.status !== 'CONFIRMED') {
    console.log(`[asaas webhook] status não confirmado: ${payment.status}`)
    return { ok: true, message: `Status ${payment.status} — aguardando confirmação` }
  }

  // External reference = mercado ID
  const mercadoId = payment.externalReference
  if (!mercadoId) {
    return { ok: false, message: 'externalReference ausente' }
  }

  console.log(`[asaas webhook] pagamento confirmado: ${payment.id} para mercado ${mercadoId}`)

  // Atualiza o mercado para ativo com data do último pagamento
  const { db } = await import('@/lib/db')
  await db.mercado.update(mercadoId, {
    status: 'ativo',
    asaasCustomerId: payment.customer,
    asaasPaymentId: payment.id,
    ultimoPagamento: new Date().toISOString(),
    ultimoPagamentoValor: payment.value,
    // Se tiver subscription, salva o ID
    ...(payment.subscription ? { asaasSubscriptionId: payment.subscription } : {}),
  })

  console.log(`[asaas webhook] mercado ${mercadoId} ativado com sucesso`)
  return { ok: true, message: `Mercado ${mercadoId} ativado` }
}