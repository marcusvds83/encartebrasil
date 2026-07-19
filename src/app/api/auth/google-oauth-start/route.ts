import { NextRequest, NextResponse } from 'next/server'
import {
  getGoogleClientId,
  getGoogleClientSecret,
  buildGoogleAuthUrl,
  generateCodeVerifier,
  generateCodeChallenge,
  storePkceState,
} from '@/lib/google-oauth'

/**
 * GET /api/auth/google-oauth-start
 *
 * Inicia o fluxo Google OAuth para o WebView (Android APK).
 * Stateless: state codifica { verifier, clientId, clientSecret } nele mesmo.
 */
export async function GET(req: NextRequest) {
  const clientId = await getGoogleClientId()
  if (!clientId) {
    return NextResponse.json(
      { erro: 'Google OAuth não configurado. Defina GOOGLE_OAUTH_CLIENT_ID no Render.' },
      { status: 500 }
    )
  }

  // Obtém client_secret (de env var ou Firebase config)
  const clientSecret = await getGoogleClientSecret()

  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://encartebrasil.onrender.com'}/api/auth/google-oauth-callback`

  // Gerar PKCE
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)

  // Armazenar state (stateless — codifica verifier + clientId + clientSecret)
  const state = storePkceState(codeVerifier, clientId, clientSecret)

  // Construir URL do Google
  const authUrl = await buildGoogleAuthUrl(redirectUri, state, codeChallenge)
  if (!authUrl) {
    return NextResponse.json(
      { erro: 'Erro ao construir URL do Google OAuth' },
      { status: 500 }
    )
  }

  console.log(`[google-oauth-start] client_id=${clientId.substring(0, 10)}... state=${state.substring(0, 8)}... hasSecret=${!!clientSecret} redirect_uri=${redirectUri}`)

  return NextResponse.redirect(authUrl)
}