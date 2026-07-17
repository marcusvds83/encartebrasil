import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sessionCookie, type SessionData } from '@/lib/auth'

/**
 * POST /api/auth/google-login-webview
 *
 * Login via Google para o WebView (Android APK).
 * Aceita um Google ID token (não-Firebase) e cria a sessão.
 *
 * Diferente do /api/auth/google-login que aceita Firebase ID tokens,
 * este endpoint aceita Google ID tokens diretamente (issuer = accounts.google.com).
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

    // 2. Validações — aceita tanto Google direto quanto Firebase
    const iss = payload.iss || ''
    const isGoogle = iss === 'accounts.google.com' || iss === 'https://accounts.google.com'
    const isFirebase = iss.includes('securetoken.google.com') || iss.includes('identitytoolkit.googleapis.com')

    if (!isGoogle && !isFirebase) {
      console.error(`[google-login-webview] iss inválido: ${iss}`)
      return NextResponse.json({ erro: 'Token de origem inválida' }, { status: 401 })
    }

    if (!payload.email) {
      return NextResponse.json({ erro: 'E-mail não encontrado no token' }, { status: 400 })
    }

    // Verifica se o email foi verificado (para tokens Google diretos)
    if (payload.email_verified === false) {
      return NextResponse.json({ erro: 'E-mail não verificado pelo Google' }, { status: 400 })
    }

    // Verifica expiração
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return NextResponse.json({ erro: 'Token expirado. Tente novamente.' }, { status: 401 })
    }

    // Identifica o Google UID
    const googleUid = payload.sub || payload.uid
    const { email, name, picture } = payload
    console.log(`[google-login-webview] Google OK: uid=${googleUid} email=${email} name=${name} iss=${iss}`)

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
        googleUid: googleUid,
      } as any)
    } else {
      // 4. Cria novo usuário automaticamente
      console.log(`[google-login-webview] criando novo usuário: ${email}`)
      usuario = await db.usuario.create({
        email,
        senhaHash: null,
        nome: name || null,
        photoURL: picture || null,
        provider: 'google',
        googleUid: googleUid,
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

    console.log(`[google-login-webview] sessão criada: id=${data.id} nome=${data.nome}`)
    return res
  } catch (e) {
    console.error('[google-login-webview] erro:', e)
    return NextResponse.json({ erro: 'Erro interno: ' + String(e) }, { status: 500 })
  }
}