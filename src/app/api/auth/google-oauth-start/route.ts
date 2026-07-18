import { NextRequest, NextResponse } from 'next/server'
import {
  getGoogleClientId,
  buildGoogleAuthUrl,
  generateCodeVerifier,
  generateCodeChallenge,
  storePkceState,
} from '@/lib/google-oauth'

/**
 * GET /api/auth/google-oauth-start
 *
 * Inicia o fluxo Google OAuth para o WebView (Android APK).
 *
 * 1. Obtém o Google Client ID (do env ou da config do Firebase)
 * 2. Gera PKCE code_verifier + challenge + state
 * 3. Armazena verifier e state no SERVIDOR (in-memory Map)
 *    — NÃO usa cookies porque o Chrome tem cookie jar separado do WebView
 * 4. Redireciona para Google OAuth
 *
 * O APK intercepta a URL do Google e abre no Chrome.
 * Após autenticação, Google redireciona para /api/auth/google-oauth-callback.
 * O callback é server-side, lê o state do Map, troca code por tokens,
 * e redireciona para panfletosbrasil://auth-callback?idToken=XXX.
 */
export async function GET(req: NextRequest) {
  const clientId = await getGoogleClientId()
  if (!clientId) {
    return NextResponse.json(
      { erro: 'Google OAuth não configurado. Defina GOOGLE_OAUTH_CLIENT_ID no Render.' },
      { status: 500 }
    )
  }

  // Redirect URI aponta para o SERVER-SIDE callback (não a page)
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://encartebrasil.onrender.com'}/api/auth/google-oauth-callback`

  // Gerar PKCE
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)

  // Armazenar state + verifier no servidor (in-memory, sem cookies)
  const state = storePkceState(codeVerifier, clientId)

  // Construir URL do Google
  const authUrl = await buildGoogleAuthUrl(redirectUri, state, codeChallenge)
  if (!authUrl) {
    return NextResponse.json(
      { erro: 'Erro ao construir URL do Google OAuth' },
      { status: 500 }
    )
  }

  console.log(`[google-oauth-start] client_id=${clientId.substring(0, 10)}... state=${state.substring(0, 8)}... redirect_uri=${redirectUri}`)

  // Redirecionar para o Google (sem cookies PKCE!)
  return NextResponse.redirect(authUrl)
}