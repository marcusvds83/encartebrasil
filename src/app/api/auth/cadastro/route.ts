import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sessionCookie, type SessionData } from '@/lib/auth'
import { createHash } from 'crypto'
import { emailBoasVindasConsumidor } from '@/lib/email'

function hashSenha(s: string) {
  return createHash('sha256').update(s).digest('hex')
}

/**
 * Cadastro de Consumidor (PF) por e-mail/senha.
 * Sem Firebase Auth — senha hasheada com SHA-256 e armazenada no Firestore.
 *
 * Body: { email, senha, nome? }
 */
export async function POST(req: NextRequest) {
  try {
    const { email, senha, nome } = await req.json()
    if (!email || !senha) {
      return NextResponse.json({ erro: 'Preencha e-mail e senha' }, { status: 400 })
    }
    if (senha.length < 6) {
      return NextResponse.json({ erro: 'Senha deve ter no mínimo 6 caracteres' }, { status: 400 })
    }

    // Verifica se já existe
    const existente = await db.usuario.findUnique({ where: { email } })
    if (existente) {
      return NextResponse.json({ erro: 'E-mail já cadastrado. Faça login.' }, { status: 409 })
    }

    // Cria usuário no Firestore (sem Firebase Auth, senha hash direto)
    // db.usuario.create recebe o objeto DIRETO (não { data: {...} } como Prisma)
    const usuario: any = await db.usuario.create({
      email,
      senhaHash: hashSenha(senha),
      nome: nome || null,
      photoURL: null,
      provider: 'email',
      ativo: true,
      criadoEm: new Date().toISOString(),
    })

    if (!usuario || !usuario.id) {
      return NextResponse.json({ erro: 'Erro ao criar conta. Tente novamente.' }, { status: 500 })
    }

    const data: SessionData = {
      tipo: 'usuario',
      email,
      id: usuario?.id || email,
      nome: nome || undefined,
      photoURL: null,
      provider: 'email',
    }
    const cookie = sessionCookie(data)
    const res = NextResponse.json({ ok: true, tipo: 'usuario', ...data })
    res.cookies.set(cookie)

    // Envia e-mail de boas-vindas (fire-and-forget)
    emailBoasVindasConsumidor(nome || '', email).catch(() => {})

    return res
  } catch (e) {
    console.error('[cadastro] erro:', e)
    return NextResponse.json({ erro: 'Erro interno: ' + String(e) }, { status: 500 })
  }
}
