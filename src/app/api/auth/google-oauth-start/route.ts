import { NextRequest, NextResponse } from 'next/server'
import {
  getGoogleClientId,
  buildGoogleAuthUrl,
  generateCodeVerifier,
  generateCodeChallenge,
  randomString,
} from '@/lib/google-oauth'

/**
 * GET /api/auth/google-oauth-start
 *
 * Inicia o fluxo Google OAuth para o WebView (Android APK).
 *
 * 1. Obtém o Google Client ID (do env ou da config do Firebase)
 * 2. Gera PKCE code_verifier + challenge + state
 * 3. Guarda verifier e state em cookies (HttpOnly, SameSite=Lax)
 * 4. Redireciona para Google OAuth
 *
 * O APK vai interceptar a URL do Google e abrir no Chrome.
 * Após autenticação, Google redireciona para /google-oauth-callback?code=XXX&state=YYY.
 */
export async function GET(req: NextRequest) {
  const clientId = await getGoogleClientId()
  if (!clientId) {
    return NextResponse.json(
      { erro: 'Google OAuth não configurado. Defina GOOGLE_OAUTH_CLIENT_ID no Render.' },
      { status: 500 }
    )
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://encartebrasil.onrender.com'}/google-oauth-callback`

  // Gerar state e PKCE
  const state = randomString(32)
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)

  // Construir URL do Google
  const authUrl = await buildGoogleAuthUrl(redirectUri, state, codeChallenge)
  if (!authUrl) {
    return NextResponse.json(
      { erro: 'Erro ao construir URL do Google OAuth' },
      { status: 500 }
    )
  }

  console.log(`[google-oauth-start] client_id=${clientId.substring(0, 10)}... state=${state.substring(0, 8)}...`)

  // Redirecionar para o Google, guardando state e verifier em cookies
  const res = NextResponse.redirect(authUrl)

  // Cookie com state (para validar o callback)
  res.cookies.set('google_oauth_state', state, {
    path: '/google-oauth-callback',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600, // 10 minutos
  })

  // Cookie com o PKCE code_verifier (para trocar o code por tokens)
  res.cookies.set('google_oauth_verifier', codeVerifier, {
    path: '/google-oauth-callback',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
  })

  // Cookie com o client_id (para a troca de tokens no callback)
  res.cookies.set('google_oauth_cid', clientId, {
    path: '/google-oauth-callback',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
  })

  return res
}