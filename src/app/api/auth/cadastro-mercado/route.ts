import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sessionCookie, type SessionData } from '@/lib/auth'
import { createHash } from 'crypto'
import { emailBoasVindasMercado } from '@/lib/email'
import { calcularDadosAcessoNovoMercado } from '@/lib/piloto'

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
    const { status, pilotoInicio, pilotoFim } = calcularDadosAcessoNovoMercado(agora)

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
      status,
      pilotoInicio,
      pilotoFim,
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

    return res
  } catch (e) {
    console.error('[cadastro-mercado] erro:', e)
    return NextResponse.json({ erro: 'Erro interno: ' + String(e) }, { status: 500 })
  }
}
