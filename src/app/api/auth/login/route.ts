import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sessionCookie, type SessionData } from '@/lib/auth'
import { createHash } from 'crypto'

function hashSenha(s: string) {
  return createHash('sha256').update(s).digest('hex')
}

function soDigitos(s: string) {
  return (s || '').replace(/\D/g, '')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, senha, uid, displayName, photoURL, provider, tipo, cnpj } = body

    // ════════════════════════════════════════════════════════════════════
    // 1) LOGIN SOCIAL (Firebase) — DESATIVADO
    // Removido Google login. Apenas e-mail/senha.
    // ════════════════════════════════════════════════════════════════════
    if (uid && provider) {
      return NextResponse.json(
        { erro: 'Login social desativado. Use e-mail e senha.' },
        { status: 400 },
      )
    }

    // ════════════════════════════════════════════════════════════════════
    // 2) LOGIN POR SENHA (e-mail/senha)
    // ════════════════════════════════════════════════════════════════════
    if (!email || !senha) {
      return NextResponse.json({ erro: 'Preencha todos os campos' }, { status: 400 })
    }

    // ── Tenta ADMIN primeiro ──
    const admin: any = await db.admin.findUnique({ where: { email } })
    if (admin && admin.senhaHash === hashSenha(senha)) {
      const data: SessionData = {
        tipo: 'admin',
        email: admin.email,
        id: admin.id,
      }
      const cookie = sessionCookie(data)
      const res = NextResponse.json({ tipo: 'admin', ...data })
      res.cookies.set(cookie)
      return res
    }

    // ── Se tipo=mercado, valida CNPJ + e-mail + senha ──
    if (tipo === 'mercado') {
      const cnpjLimpo = soDigitos(cnpj)
      if (cnpjLimpo.length !== 14) {
        return NextResponse.json({ erro: 'CNPJ inválido. Digite 14 dígitos.' }, { status: 400 })
      }
      const m: any = await db.mercado.findUnique({ where: { cnpj: cnpjLimpo } })
      if (!m) {
        return NextResponse.json(
          { erro: 'CNPJ não encontrado. Cadastre seu mercado.' },
          { status: 404 },
        )
      }
      if (m.emailLogin !== email) {
        return NextResponse.json({ erro: 'E-mail não corresponde ao CNPJ informado.' }, { status: 401 })
      }
      if (m.senhaHash !== hashSenha(senha)) {
        return NextResponse.json({ erro: 'Senha incorreta.' }, { status: 401 })
      }
      const data: SessionData = {
        tipo: 'mercado',
        email: m.emailLogin,
        id: m.id,
        nome: m.nome,
        status: m.status,
      }
      const cookie = sessionCookie(data)
      const res = NextResponse.json({ tipo: 'mercado', ...data })
      res.cookies.set(cookie)
      return res
    }

    // ── PF (Consumidor) por e-mail/senha — valida contra Firestore ──
    const tipoLogin = body.tipoLogin
    if (tipoLogin === 'pf') {
      const usuario: any = await db.usuario.findUnique({ where: { email } })
      if (!usuario) {
        return NextResponse.json(
          { erro: 'E-mail não cadastrado. Crie sua conta primeiro.' },
          { status: 404 },
        )
      }
      if (usuario.senhaHash !== hashSenha(senha)) {
        return NextResponse.json({ erro: 'Senha incorreta.' }, { status: 401 })
      }
      if (usuario.ativo === false) {
        return NextResponse.json({ erro: 'Conta desativada. Contate o admin.' }, { status: 403 })
      }
      const data: SessionData = {
        tipo: 'usuario',
        email: usuario.email || email,
        id: usuario.id,
        nome: usuario.nome || undefined,
        photoURL: usuario.photoURL,
        provider: 'email',
      }
      const cookie = sessionCookie(data)
      const res = NextResponse.json({ tipo: 'usuario', ...data })
      res.cookies.set(cookie)
      return res
    }

    // ── Fallback: e-mail/senha direto no mercado (sem CNPJ) ──
    const mFallback: any = await db.mercado.findUnique({ where: { emailLogin: email } })
    if (mFallback && mFallback.senhaHash === hashSenha(senha)) {
      const data: SessionData = {
        tipo: 'mercado',
        email: mFallback.emailLogin,
        id: mFallback.id,
        nome: mFallback.nome,
        status: mFallback.status,
      }
      const cookie = sessionCookie(data)
      const res = NextResponse.json({ tipo: 'mercado', ...data })
      res.cookies.set(cookie)
      return res
    }

    return NextResponse.json({ erro: 'E-mail ou senha inválidos' }, { status: 401 })
  } catch (e) {
    console.error('[login] erro:', e)
    return NextResponse.json({ erro: 'Erro interno: ' + String(e) }, { status: 500 })
  }
}
