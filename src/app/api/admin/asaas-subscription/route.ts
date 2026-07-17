import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET /api/admin/asaas-subscription?id=<mercadoId>
 * Retorna informações de pagamento de um mercado (sem integração Asaas).
 * Dados vêm diretamente do Firestore.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'admin') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }

    const mercadoId = req.nextUrl.searchParams.get('id')
    if (!mercadoId) {
      return NextResponse.json({ erro: 'ID da empresa obrigatório' }, { status: 400 })
    }

    const mercado = await db.mercado.findUnique({ where: { id: mercadoId } })
    if (!mercado) {
      return NextResponse.json({ erro: 'Empresa não encontrada' }, { status: 404 })
    }

    const m = mercado as any
    return NextResponse.json({
      mercadoId: m.id,
      nome: m.nome,
      status: m.status,
      formaPagamento: m.formaPagamento || null,
      ultimoPagamento: m.ultimoPagamento || null,
      ultimoPagamentoValor: m.ultimoPagamentoValor || null,
      dataProximoPagamento: m.dataProximoPagamento || null,
      dataEscolhaPagamento: m.dataEscolhaPagamento || null,
      asaasAssinaturaCancelada: false,
      subscription: null,
    })
  } catch (err: any) {
    console.error(`[admin subscription] erro: ${err?.message || err}`)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

/**
 * POST /api/admin/asaas-subscription
 * Ações admin sobre a assinatura de um mercado.
 * Sem Asaas — o controle é feito via Odoo CRM + envio manual de contrato/link.
 * Body: { id: mercadoId, acao: string }
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
      // Cancela assinatura localmente — o admin trata via Odoo
      await db.mercado.update(id, {
        asaasAssinaturaCancelada: true,
        asaasSubscriptionId: null,
        asaasPaymentId: null,
        asaasCustomerId: null,
      } as any)
      return NextResponse.json({ ok: true, mensagem: `Assinatura de "${m.nome}" cancelada.` })

    } else if (acao === 'reativar_assinatura') {
      // Reativa localmente — a empresa precisará escolher pagamento novamente
      await db.mercado.update(id, {
        asaasAssinaturaCancelada: false,
        asaasSubscriptionId: null,
        asaasPaymentId: null,
        asaasCustomerId: null,
        status: 'ativo_aguardando_pagamento',
      } as any)
      return NextResponse.json({ ok: true, mensagem: `"${m.nome}" precisará escolher forma de pagamento no próximo login.` })

    } else if (acao === 'desativar_pagamento') {
      // Cancela e bloqueia imediatamente
      await db.mercado.update(id, {
        asaasAssinaturaCancelada: true,
        asaasSubscriptionId: null,
        asaasPaymentId: null,
        asaasCustomerId: null,
        status: 'inativo',
      } as any)
      return NextResponse.json({ ok: true, mensagem: `"${m.nome}" desativado.` })

    }

    return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 })
  } catch (err: any) {
    console.error(`[admin subscription] erro: ${err?.message || err}`)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}