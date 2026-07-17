import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

const ODOO_WEBHOOK_URL = 'https://panfletosbrasil.odoo.com/web/hook/a1968b1c-2885-46f2-b77b-88cd76337459'
const ODOO_API_KEY = 'dfb4bca4b7563ed7fa4f7664d1d61ef2fdf9a4ee'

const METODOS_VALIDOS = ['pix', 'cartao_mensal', 'cartao_recorrente', 'boleto'] as const
type MetodoPagamento = (typeof METODOS_VALIDOS)[number]

const METODO_LABEL: Record<string, string> = {
  pix: 'Pix',
  cartao_mensal: 'Cartão de Crédito (Mensal)',
  cartao_recorrente: 'Cartão de Crédito (Recorrente)',
  boleto: 'Boleto Bancário',
}

/**
 * POST /api/pagamento/metodo
 * Empresa escolhe a forma de pagamento → salva no DB + envia webhook para Odoo.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'mercado') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }

    const { metodo } = await req.json()
    if (!metodo || !METODOS_VALIDOS.includes(metodo)) {
      return NextResponse.json(
        { erro: 'Método inválido. Escolha: pix, cartao_mensal, cartao_recorrente ou boleto.' },
        { status: 400 },
      )
    }

    // Busca dados da empresa
    const empresa: any = await db.mercado.findUnique({
      where: { id: session.id },
      select: { nome: true, emailLogin: true, cnpj: true, cidade: true, estado: true, mensalidade: true },
    })
    if (!empresa) {
      return NextResponse.json({ erro: 'Empresa não encontrada' }, { status: 404 })
    }

    // Salva a escolha no DB
    await db.mercado.update(session.id, {
      formaPagamento: metodo,
      dataEscolhaPagamento: new Date().toISOString(),
    })

    // Envia webhook para Odoo — contrato + link de pagamento
    const webhookPayload = {
      evento: 'escolha_pagamento',
      tipo: 'panfletos_brasil',
      api_key: ODOO_API_KEY,
      dados: {
        empresa_id: session.id,
        empresa_nome: empresa.nome,
        empresa_email: empresa.emailLogin,
        empresa_cnpj: empresa.cnpj,
        empresa_cidade: empresa.cidade,
        empresa_estado: empresa.estado,
        forma_pagamento: METODO_LABEL[metodo] || metodo,
        metodo_key: metodo,
        valor_mensalidade: empresa.mensalidade || 399,
        recorrente: metodo === 'cartao_recorrente',
        data_escolha: new Date().toISOString(),
      },
    }

    // Fire-and-forget webhook para Odoo
    fetch(ODOO_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    }).catch((err) => {
      console.error('[pagamento/metodo] erro ao enviar webhook Odoo:', err)
    })

    return NextResponse.json({
      ok: true,
      metodo,
      metodoLabel: METODO_LABEL[metodo],
      mensagem: 'Solicitação enviada! O administrador enviará o contrato e link de pagamento por e-mail.',
    })
  } catch (e) {
    console.error('[pagamento/metodo] erro:', e)
    return NextResponse.json({ erro: 'Erro ao processar pagamento' }, { status: 500 })
  }
}