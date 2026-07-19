import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// ── Webhook CRM Odoo — cria oportunidade no estágio 1 ──
const ODOO_CRM_WEBHOOK_URL = 'https://www.panfletosbrasil.3codenexus.com.br/web/hook/4c25f535-5267-437f-92a8-fdf0e164fff2'

const METODOS_VALIDOS = ['pix', 'cartao_mensal', 'cartao_recorrente', 'boleto'] as const
type MetodoPagamento = (typeof METODOS_VALIDOS)[number]

const METODO_LABEL: Record<string, string> = {
  pix: 'Pix',
  cartao_mensal: 'Cartão de Crédito (Mensal)',
  cartao_recorrente: 'Cartão de Crédito (Recorrente)',
  boleto: 'Boleto Bancário',
}

/** Normaliza o segmento para o formato exato que o Odoo CRM espera */
function normalizarSegmento(seg: string | null | undefined): string {
  if (!seg) return ''
  const s = seg.toLowerCase().trim()
  if (s === 'mercados' || s === 'mercado') return 'Mercados'
  if (s === 'petshops' || s === 'petshop' || s === 'pet shops') return 'PetShops'
  if (s === 'farmácias' || s === 'farmacia' || s === 'farmacias') return 'Farmácias'
  return ''
}

/**
 * POST /api/pagamento/metodo
 * Empresa escolhe a forma de pagamento → salva no DB + envia webhook para Odoo CRM.
 * O webhook cria uma oportunidade no estágio 1 do CRM.
 * Formulários (contato) criam chamados no Helpdesk — este endpoint cria cards no CRM.
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

    // Busca dados completos da empresa
    const empresa: any = await db.mercado.findUnique({
      where: { id: session.id },
    })
    if (!empresa) {
      return NextResponse.json({ erro: 'Empresa não encontrada' }, { status: 404 })
    }

    // Salva a escolha no DB
    await db.mercado.update(session.id, {
      formaPagamento: metodo,
      dataEscolhaPagamento: new Date().toISOString(),
    })

    // Monta o payload com os campos exatos que o Odoo CRM espera
    const segmentoNorm = normalizarSegmento(empresa.segmento)
    const metodoLabel = METODO_LABEL[metodo] || metodo
    const valorMensalidade = empresa.mensalidade || 399

    const crmPayload = {
      // ── Empresa ──
      nome_empresa: empresa.nome || '',
      cnpj: empresa.cnpj || '',
      email_empresa: empresa.emailLogin || session.email || '',
      telefone_empresa: empresa.telefone || '',
      segmento: segmentoNorm,

      // ── Contato da empresa (responsável) ──
      nome_contato: empresa.responsavel || empresa.nome || '',
      cpf: empresa.cpf || '',
      telefone_contato: empresa.telefoneResponsavel || empresa.telefone || '',
      email_contato: empresa.emailLogin || session.email || '',

      // ── Dados da oportunidade ──
      name: `Pagamento — ${empresa.nome} (${metodoLabel})`,
      description: [
        `FORMA DE PAGAMENTO ESCOLHIDA: ${metodoLabel}`,
        `Valor: R$ ${valorMensalidade},00/mês`,
        metodo === 'cartao_recorrente' ? 'Modalidade: Recorrente (cobrança automática mensal)' : 'Modalidade: Mensal (escolhe todo mês)',
        '',
        `Cidade/Estado: ${empresa.cidade || ''}/${empresa.estado || ''}`,
        `Data da escolha: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
        `ID interno: ${session.id}`,
      ].join('\n'),
    }

    // Webhook para Odoo CRM com await + retry (não é mais fire-and-forget)
    console.log(`[pagamento/metodo] Enviando para CRM Odoo: ${JSON.stringify(crmPayload)}`)

    let crmOk = false
    let crmErro = ''
    const maxRetries = 2
    for (let tentativa = 1; tentativa <= maxRetries; tentativa++) {
      try {
        const crmRes = await fetch(ODOO_CRM_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Adiciona api-key se disponível (mesmo padrão do Helpdesk)
            ...(process.env.ODOO_CRM_API_KEY ? { 'api-key': process.env.ODOO_CRM_API_KEY } : {}),
          },
          body: JSON.stringify(crmPayload),
        })

        const crmBody = await crmRes.text().catch(() => '')

        if (crmRes.ok) {
          console.log(`[pagamento/metodo] CRM OK (tentativa ${tentativa}) — status ${crmRes.status} body: ${crmBody.substring(0, 200)}`)
          crmOk = true
          break
        } else {
          crmErro = `status ${crmRes.status}: ${crmBody.substring(0, 200)}`
          console.error(`[pagamento/metodo] CRM erro (tentativa ${tentativa}) — ${crmErro}`)
        }
      } catch (err: any) {
        crmErro = err?.message || String(err)
        console.error(`[pagamento/metodo] CRM falha de rede (tentativa ${tentativa}):`, crmErro)
      }

      // Backoff antes da próxima tentativa
      if (tentativa < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * tentativa))
      }
    }

    if (!crmOk) {
      console.error(`[pagamento/metodo] CRM falhou após ${maxRetries} tentativas: ${crmErro}`)
      // Não bloqueia o usuário — o pagamento foi salvo no DB
      // Mas retorna aviso para o admin verificar
    }

    return NextResponse.json({
      ok: true,
      metodo,
      metodoLabel: METODO_LABEL[metodo],
      mensagem: 'Solicitação enviada! O administrador enviará o contrato e link de pagamento por e-mail.',
      crmEnviado: crmOk,
    })
  } catch (e) {
    console.error('[pagamento/metodo] erro:', e)
    return NextResponse.json({ erro: 'Erro ao processar pagamento' }, { status: 500 })
  }
}