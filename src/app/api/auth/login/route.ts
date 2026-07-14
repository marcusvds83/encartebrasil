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
    // 1) LOGIN SOCIAL (Firebase) — apenas PF (usuário consumidor)
    // ════════════════════════════════════════════════════════════════════
    if (uid && provider) {
      // Primeiro tenta admin (admin pode logar via Google também)
      const admin = await db.admin.findUnique({ where: { email } })
      if (admin) {
        const cookie = sessionCookie({ tipo: 'admin', email: (admin as any).email, id: (admin as any).id })
        const res = NextResponse.json({ tipo: 'admin', email: (admin as any).email, id: (admin as any).id })
        res.cookies.set(cookie)
        return res
      }

      // PF (usuário consumidor) — auto-cadastra se não existir
      let usuario: any = await db.usuario.findUnique({ where: { email } })
      if (!usuario) {
        // Tenta via firebaseUid caso email tenha mudado
        usuario = await db.usuario.findUnique({ where: { firebaseUid: uid } })
        if (!usuario) {
          usuario = await db.usuario.create({
            data: {
              email,
              firebaseUid: uid,
              nome: displayName || null,
              photoURL: photoURL || null,
              provider,
              criadoEm: new Date().toISOString(),
            },
          })
        } else {
          usuario = await db.usuario.update((usuario as any).id, {
            email,
            nome: displayName || (usuario as any).nome,
            photoURL: photoURL || (usuario as any).photoURL,
            provider,
          })
        }
      } else if (!(usuario as any).firebaseUid) {
        usuario = await db.usuario.update((usuario as any).id, {
          firebaseUid: uid,
          provider,
          photoURL: photoURL || (usuario as any).photoURL,
          nome: displayName || (usuario as any).nome,
        })
      }

      const data: SessionData = {
        tipo: 'usuario',
        email: (usuario as any).email,
        id: (usuario as any).id,
        nome: (usuario as any).nome || undefined,
        photoURL: (usuario as any).photoURL,
        provider,
      }
      const cookie = sessionCookie(data)
      const res = NextResponse.json({ tipo: 'usuario', ...data })
      res.cookies.set(cookie)
      return res
    }

    // ════════════════════════════════════════════════════════════════════
    // 2) LOGIN POR SENHA
    // ════════════════════════════════════════════════════════════════════
    if (!email || !senha) {
      return NextResponse.json({ erro: 'Preencha todos os campos' }, { status: 400 })
    }

    // ── Tenta ADMIN primeiro ──
    const admin = await db.admin.findUnique({ where: { email } })
    if (admin && (admin as any).senhaHash === hashSenha(senha)) {
      const cookie = sessionCookie({ tipo: 'admin', email: (admin as any).email, id: (admin as any).id })
      const res = NextResponse.json({ tipo: 'admin', email: (admin as any).email, id: (admin as any).id })
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
          { erro: 'CNPJ não encontrado. Peça ao admin para cadastrar seu mercado.' },
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
        tipo: 'mercado', email: m.emailLogin, id: m.id,
        nome: m.nome, status: m.status,
      }
      const cookie = sessionCookie(data)
      const res = NextResponse.json({ tipo: 'mercado', ...data })
      res.cookies.set(cookie)
      return res
    }

    // ── Fallback antigo: e-mail/senha direto no mercado (sem CNPJ) ──
    // Mantido por compatibilidade temporária.
    const mFallback: any = await db.mercado.findUnique({ where: { emailLogin: email } })
    if (mFallback && mFallback.senhaHash === hashSenha(senha)) {
      const data: SessionData = {
        tipo: 'mercado', email: mFallback.emailLogin, id: mFallback.id,
        nome: mFallback.nome, status: mFallback.status,
      }
      const cookie = sessionCookie(data)
      const res = NextResponse.json({ tipo: 'mercado', ...data })
      res.cookies.set(cookie)
      return res
    }

    return NextResponse.json({ erro: 'E-mail ou senha inválidos' }, { status: 401 })
  } catch (e) {
    console.error('[login] erro:', e)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
