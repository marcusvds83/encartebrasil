import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sessionCookie, type SessionData } from '@/lib/auth'
import { createHash } from 'crypto'
import { emailBoasVindasMercado } from '@/lib/email'

const ODOO_WEBHOOK_URL = 'https://www.panfletosbrasil.3codenexus.com.br/web/hook/b402d845-2a4f-4ad3-a6d7-de646f34285c'

/** Normaliza segmento para o formato exato que o Odoo espera */
function normalizarSegmento(seg: string): string {
  const s = (seg || '').toLowerCase().trim()
  if (s === 'mercados' || s === 'mercado') return 'Mercados'
  if (s === 'petshops' || s === 'petshop' || s === 'pet shops') return 'PetShops'
  if (s === 'farmácias' || s === 'farmacias' || s === 'farmácia' || s === 'farmacia') return 'Farmácias'
  return seg || ''
}

function soDigitos(s: string) {
  return (s || '').replace(/\D/g, '')
}

function hashSenha(s: string) {
  return createHash('sha256').update(s).digest('hex')
}

/**
 * Cadastro de Mercado (PJ) — o mercado se cadastra sozinho.
 *
 * Body: {
 *   nome: string         — Nome do mercado
 *   cnpj: string         — 14 dígitos
 *   email: string        — e-mail de login
 *   senha: string        — mín. 6 caracteres
 *   cidade: string
 *   estado: string       — UF (2 letras)
 *   responsavel: string  — Nome do responsável
 *   cpf: string          — 11 dígitos
 *   endereco?: string
 *   telefone?: string
 *   segmento?: string   — 'mercados' | 'farmacias' | 'petshops'
 * }
 *
 * O mercado é criado com status='piloto' (60 dias grátis).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nome, cnpj, email, senha, cidade, estado, responsavel, cpf, endereco, telefone, segmento } = body

    if (!nome || !cnpj || !email || !senha || !cidade || !estado || !responsavel || !cpf || !segmento) {
      return NextResponse.json(
        { erro: 'Campos obrigatórios: nome, cnpj, email, senha, cidade, estado, responsavel, cpf, segmento' },
        { status: 400 },
      )
    }

    const cnpjLimpo = soDigitos(cnpj)
    const cpfLimpo = soDigitos(cpf)
    if (cnpjLimpo.length !== 14) {
      return NextResponse.json({ erro: 'CNPJ inválido. Deve ter 14 dígitos.' }, { status: 400 })
    }
    if (cpfLimpo.length !== 11) {
      return NextResponse.json({ erro: 'CPF inválido. Deve ter 11 dígitos.' }, { status: 400 })
    }
    if (senha.length < 6) {
      return NextResponse.json({ erro: 'Senha deve ter no mínimo 6 caracteres' }, { status: 400 })
    }

    const existenteCnpj = await db.mercado.findUnique({ where: { cnpj: cnpjLimpo } })
    if (existenteCnpj) {
      return NextResponse.json({ erro: 'Já existe empresa cadastrada com este CNPJ.' }, { status: 409 })
    }
    const existenteEmail = await db.mercado.findUnique({ where: { emailLogin: email } })
    if (existenteEmail) {
      return NextResponse.json({ erro: 'Já existe empresa cadastrada com este e-mail.' }, { status: 409 })
    }

    const agora = new Date()
    const pilotoFim = new Date(agora.getTime() + 60 * 24 * 60 * 60 * 1000)

    const mercado = await db.mercado.create({
      nome,
      cnpj: cnpjLimpo,
      cidade,
      estado: estado.toUpperCase(),
      endereco: endereco || null,
      telefone: telefone || null,
      emailLogin: email,
      senhaHash: hashSenha(senha),
      mensalidade: segmento === 'farmacias' ? 299 : segmento === 'petshops' ? 199 : 399,
      status: 'piloto',
      pilotoInicio: agora.toISOString(),
      pilotoFim: pilotoFim.toISOString(),
      criadoEm: agora.toISOString(),
      destaque: false,
      latitude: null,
      longitude: null,
      logoPath: null,
      destaqueInicio: null,
      destaqueFim: null,
      responsavel,
      cpf: cpfLimpo,
      segmento,
    } as any)

    const data: SessionData = {
      tipo: 'mercado',
      email: email,
      id: (mercado as any).id,
      nome,
      status: 'piloto',
    }
    const cookie = sessionCookie(data)
    const res = NextResponse.json({ ok: true, tipo: 'mercado', ...data })
    res.cookies.set(cookie)

    // Envia e-mail de boas-vindas (fire-and-forget, loga resultado)
    emailBoasVindasMercado(nome, email).then((ok) => {
      console.log(`[cadastro-mercado] email boas-vindas: ${ok ? 'ENVIADO' : 'FALHOU'}`)
    })

    // Envia dados do cadastro para o webhook Odoo CRM (fire-and-forget)
    // Cria uma nova oportunidade no estágio 1 com todos os dados da empresa e contato
    const segmentoNormalizado = normalizarSegmento(segmento)
    const odooPayload = {
      nome_empresa: nome,
      cnpj: cnpjLimpo,
      email_empresa: email,
      telefone_empresa: telefone || '',
      segmento: segmentoNormalizado,
      nome_contato: responsavel,
      cpf: cpfLimpo,
      telefone_contato: telefone || '',
      email_contato: email,
      titulo: `Novo Cadastro — ${nome}`,
      descricao: `Empresa: ${nome}\nCNPJ: ${cnpjLimpo}\nCidade/UF: ${cidade}/${estado.toUpperCase()}\nSegmento: ${segmentoNormalizado}\nResponsável: ${responsavel}\nCPF do Responsável: ${cpfLimpo}\nE-mail: ${email}\nTelefone: ${telefone || 'Não informado'}\nEndereço: ${endereco || 'Não informado'}\n\nCadastro realizado em: ${agora.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\nStatus: Piloto (60 dias grátis)`,
    }
    fetch(ODOO_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(odooPayload),
    }).then((r) => {
      console.log(`[cadastro-mercado] webhook Odoo status: ${r.status}`)
    }).catch((err) => {
      console.error('[cadastro-mercado] erro webhook Odoo:', err)
    })

    return res
  } catch (e) {
    console.error('[cadastro-mercado] erro:', e)
    return NextResponse.json({ erro: 'Erro interno: ' + String(e) }, { status: 500 })
  }
}
