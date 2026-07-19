import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { createHash } from 'crypto'
import { calcularDadosAcessoNovoMercado } from '@/lib/piloto'

function soDigitos(s: string) {
  return (s || '').replace(/\D/g, '')
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'admin') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }

    const { nome, cnpj, email, senha, cidade, estado, endereco, telefone, mensalidade } = await req.json()

    if (!nome || !cnpj || !email || !cidade || !estado) {
      return NextResponse.json(
        { erro: 'Campos obrigatórios: nome, cnpj, email, cidade, estado' },
        { status: 400 },
      )
    }

    const cnpjLimpo = soDigitos(cnpj)
    if (cnpjLimpo.length !== 14) {
      return NextResponse.json({ erro: 'CNPJ inválido. Deve ter 14 dígitos.' }, { status: 400 })
    }

    // Verifica duplicidade de CNPJ
    const existenteCnpj = await db.mercado.findUnique({ where: { cnpj: cnpjLimpo } })
    if (existenteCnpj) {
      return NextResponse.json({ erro: 'Já existe empresa cadastrada com este CNPJ.' }, { status: 409 })
    }
    // Verifica duplicidade de e-mail
    const existenteEmail = await db.mercado.findUnique({ where: { emailLogin: email } })
    if (existenteEmail) {
      return NextResponse.json({ erro: 'Já existe empresa cadastrada com este e-mail.' }, { status: 409 })
    }

    const hash = senha ? createHash('sha256').update(senha).digest('hex') : ''
    const agora = new Date()
    const { status, pilotoInicio, pilotoFim } = calcularDadosAcessoNovoMercado(agora)

    const mercado = await db.mercado.create({
      nome,
      cnpj: cnpjLimpo,
      cidade,
      estado,
      endereco: endereco || null,
      telefone: telefone || null,
      emailLogin: email,
      senhaHash: hash,
      mensalidade: mensalidade || 399,
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
    })

    return NextResponse.json({ ok: true, mercado })
  } catch (e) {
    return NextResponse.json({ erro: 'Erro ao criar mercado: ' + String(e) }, { status: 500 })
  }
}
