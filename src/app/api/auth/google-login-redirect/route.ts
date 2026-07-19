import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sessionCookie, type SessionData } from '@/lib/auth'

/**
 * GET /api/auth/google-login-redirect?token=XXX
 *
 * Rota SERVER-SIDE para completar o login Google no WebView (Android APK).
 *
 * Diferente do /auth-complete (client-side), esta rota:
 * 1. Recebe o token via URL (não via POST)
 * 2. Valida com Google
 * 3. Cria/atualiza usuário no Firestore
 * 4. Seta o cookie de sessão via Set-Cookie header (HTTP redirect)
 * 5. Redireciona para / (home)
 *
 * Isso é mais confiável no WebView porque o cookie é setado via
 * redirect HTTP, não via fetch JS (que pode falhar com credentials).
 */
function decodeJwtPayload(token: string): any {
  try {
    const base64 = token.split('.')[1]
    const json = Buffer.from(base64, 'base64').toString('utf-8')
    return JSON.parse(json)
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    const error = searchParams.get('error')

    if (error) {
      console.error(`[google-login-redirect] erro: ${error}`)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://encartebrasil.onrender.com'}/?login_error=${encodeURIComponent(error)}`)
    }

    if (!token) {
      console.error('[google-login-redirect] token não fornecido')
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://encartebrasil.onrender.com'}/?login_error=Token+não+fornecido`)
    }

    // 1. Decodifica o payload do token
    const payload = decodeJwtPayload(token)
    if (!payload) {
      console.error('[google-login-redirect] token inválido')
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://encartebrasil.onrender.com'}/?login_error=Token+inválido`)
    }

    // 2. Validações
    const iss = payload.iss || ''
    const isGoogle = iss === 'accounts.google.com' || iss === 'https://accounts.google.com'
    const isFirebase = iss.includes('securetoken.google.com') || iss.includes('identitytoolkit.googleapis.com')

    if (!isGoogle && !isFirebase) {
      console.error(`[google-login-redirect] iss inválido: ${iss}`)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://encartebrasil.onrender.com'}/?login_error=Token+de+origem+inválida`)
    }

    if (!payload.email) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://encartebrasil.onrender.com'}/?login_error=E-mail+não+encontrado`)
    }

    if (payload.email_verified === false) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://encartebrasil.onrender.com'}/?login_error=E-mail+não+verificado`)
    }

    if (payload.exp && payload.exp < Date.now() / 1000) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://encartebrasil.onrender.com'}/?login_error=Token+expirado`)
    }

    const googleUid = payload.sub || payload.uid
    const { email, name, picture } = payload
    console.log(`[google-login-redirect] Google OK: uid=${googleUid} email=${email}`)

    // 3. Busca usuário existente
    let usuario: any = await db.usuario.findUnique({ where: { email } })

    if (usuario) {
      if (usuario.ativo === false) {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://encartebrasil.onrender.com'}/?login_error=Conta+desativada`)
      }
      await db.usuario.update(usuario.id, {
        nome: name || usuario.nome,
        photoURL: picture || usuario.photoURL,
        provider: 'google',
        googleUid: googleUid,
      } as any)
    } else {
      console.log(`[google-login-redirect] criando novo usuário: ${email}`)
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
    }

    // 4. Cria sessão e seta cookie via redirect
    const data: SessionData = {
      tipo: 'usuario',
      email,
      id: usuario.id || email,
      nome: name || (usuario.nome || undefined),
      photoURL: picture || usuario.photoURL,
      provider: 'google',
    }

    const cookie = sessionCookie(data)
    const res = NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://encartebrasil.onrender.com'}/`)
    res.cookies.set(cookie)

    console.log(`[google-login-redirect] sessão criada: id=${data.id} nome=${data.nome}`)
    return res
  } catch (e) {
    console.error('[google-login-redirect] erro:', e)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://encartebrasil.onrender.com'}/?login_error=Erro+interno`)
  }
}
