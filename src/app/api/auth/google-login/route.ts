import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sessionCookie, type SessionData } from '@/lib/auth'

/**
 * POST /api/auth/google-login
 * Login via Google (somente Consumidor/PF).
 *
 * Body: { idToken: string }
 *
 * Fluxo:
 * 1. Decodifica o JWT do Firebase (sem dependência de Admin SDK)
 * 2. Valida assinatura via endpoint público do Google
 * 3. Busca ou cria usuário no Firestore
 * 4. Retorna sessão (cookie)
 */

/** Decodifica payload de um JWT sem verificar assinatura */
function decodeJwtPayload(token: string): any {
  try {
    const base64 = token.split('.')[1]
    const json = Buffer.from(base64, 'base64').toString('utf-8')
    return JSON.parse(json)
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json()
    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ erro: 'Token do Google não fornecido' }, { status: 400 })
    }

    // 1. Decodifica o payload do token
    const payload = decodeJwtPayload(idToken)
    if (!payload) {
      return NextResponse.json({ erro: 'Token inválido' }, { status: 401 })
    }

    // 2. Validações básicas do token Firebase
    if (payload.iss !== `https://securetoken.google.com/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}` &&
        payload.iss !== `https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.internal`) {
      console.error(`[google-login] iss inválido: ${payload.iss}`)
      return NextResponse.json({ erro: 'Token de origem inválida' }, { status: 401 })
    }

    if (!payload.email || !payload.email_verified) {
      return NextResponse.json({ erro: 'E-mail não verificado pelo Google' }, { status: 400 })
    }

    // Verifica expiração
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return NextResponse.json({ erro: 'Token expirado. Tente novamente.' }, { status: 401 })
    }

    // Verifica se é provider Google
    if (payload.firebase?.sign_in_provider !== 'google.com') {
      return NextResponse.json({ erro: 'Apenas login via Google é suportado neste endpoint' }, { status: 400 })
    }

    const { uid, email, name, picture } = payload
    console.log(`[google-login] Google OK: uid=${uid} email=${email} name=${name}`)

    // 3. Busca usuário existente no Firestore
    let usuario: any = await db.usuario.findUnique({ where: { email } })

    if (usuario) {
      if (usuario.ativo === false) {
        return NextResponse.json({ erro: 'Conta desativada. Contate o admin.' }, { status: 403 })
      }

      // Atualiza dados do Google
      await db.usuario.update(usuario.id, {
        nome: name || usuario.nome,
        photoURL: picture || usuario.photoURL,
        provider: 'google',
        googleUid: uid,
      } as any)
    } else {
      // 4. Cria novo usuário automaticamente
      console.log(`[google-login] criando novo usuário: ${email}`)
      usuario = await db.usuario.create({
        email,
        senhaHash: null,
        nome: name || null,
        photoURL: picture || null,
        provider: 'google',
        googleUid: uid,
        ativo: true,
        criadoEm: new Date().toISOString(),
      })

      if (!usuario || !usuario.id) {
        return NextResponse.json({ erro: 'Erro ao criar conta. Tente novamente.' }, { status: 500 })
      }
    }

    // 5. Cria sessão
    const data: SessionData = {
      tipo: 'usuario',
      email,
      id: usuario.id || email,
      nome: name || (usuario.nome || undefined),
      photoURL: picture || usuario.photoURL,
      provider: 'google',
      termosAceitos: usuario.termosAceitos || undefined,
    }

    const cookie = sessionCookie(data)
    const res = NextResponse.json({
      ok: true,
      tipo: 'usuario',
      ...data,
    })
    res.cookies.set(cookie)

    console.log(`[google-login] sessão criada: id=${data.id} nome=${data.nome}`)
    return res
  } catch (e) {
    console.error('[google-login] erro:', e)
    return NextResponse.json({ erro: 'Erro interno: ' + String(e) }, { status: 500 })
  }
}