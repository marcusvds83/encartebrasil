import { NextRequest, NextResponse } from 'next/server'
import { consumePkceState } from '@/lib/google-oauth'

/**
 * GET /api/auth/google-oauth-callback?code=XXX&state=YYY
 *
 * Server-side OAuth callback para o WebView (Android APK).
 * Esta rota roda no SERVIDOR (não no navegador do cliente).
 *
 * Fluxo:
 * 1. Google redireciona para cá com ?code=XXX&state=YYY
 * 2. Recupera o PKCE state do servidor (in-memory Map)
 * 3. Valida o state
 * 4. Troca o code por tokens via PKCE (sem client secret)
 * 5. Redireciona (302) para panfletosbrasil://auth-callback?idToken=XXX
 *    → O APK recebe esse intent e carrega /auth-complete?token=XXX no WebView
 *
 * Por que server-side e não client-side (page.tsx)?
 * Porque o Chrome tem cookie jar separado do WebView. Os cookies
 * PKCE (state, verifier) setados pelo google-oauth-start ficam no
 * WebView e não estão disponíveis quando o Chrome carrega o callback.
 * Com server-side storage, o callback busca o state diretamente
 * do Map do servidor, sem depender de cookies.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Erro do Google (ex: usuário negou acesso)
    if (error) {
      const errorDescription = searchParams.get('error_description') || error
      console.error(`[google-oauth-callback] erro do Google: ${error} — ${errorDescription}`)
      return redirectToAppWithError(errorDescription)
    }

    if (!code || !state) {
      console.error(`[google-oauth-callback] parâmetros ausentes: code=${!!code} state=${!!state}`)
      return redirectToAppWithError('Parâmetros de autenticação ausentes.')
    }

    // 1. Recuperar PKCE state do servidor (in-memory)
    const pkceData = consumePkceState(state)
    if (!pkceData) {
      console.error(`[google-oauth-callback] state não encontrado ou expirado: ${state.substring(0, 8)}...`)
      return redirectToAppWithError('Sessão OAuth expirada. Tente novamente.')
    }

    const { verifier, clientId } = pkceData

    // 2. Determinar redirect_uri (deve ser o mesmo usado no google-oauth-start)
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://encartebrasil.onrender.com'}/api/auth/google-oauth-callback`

    // 3. Trocar code por tokens via PKCE (com client_secret se disponível)
    console.log(`[google-oauth-callback] trocando code por tokens... clientId=${clientId.substring(0, 10)}...`)

    const tokenParams: Record<string, string> = {
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }

    // Adiciona client_secret se configurado (necessário para Web Application clients)
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
    if (clientSecret) {
      tokenParams.client_secret = clientSecret
      console.log('[google-oauth-callback] usando client_secret')
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(tokenParams).toString(),
    })

    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      console.error(`[google-oauth-callback] erro do Google ao trocar code: ${errText}`)
      return redirectToAppWithError('Erro ao trocar código de autenticação.')
    }

    const tokenData = await tokenRes.json()
    const idToken = tokenData.id_token

    if (!idToken) {
      console.error(`[google-oauth-callback] Google não retornou id_token. Resposta: ${JSON.stringify(tokenData).substring(0, 200)}`)
      return redirectToAppWithError('Google não retornou o token de identidade.')
    }

    // 4. Redirecionar para o APK via custom scheme
    // O APK vai receber este intent e carregar /auth-complete?token=XXX no WebView
    const appRedirectUrl = `panfletosbrasil://auth-callback?idToken=${encodeURIComponent(idToken)}`
    console.log(`[google-oauth-callback] redirecionando para o APK com idToken (${idToken.length} chars)`)

    return NextResponse.redirect(appRedirectUrl, 302)
  } catch (err) {
    console.error('[google-oauth-callback] erro inesperado:', err)
    return redirectToAppWithError('Erro interno no callback OAuth.')
  }
}

/** Redireciona para o APK com um parâmetro de erro */
function redirectToAppWithError(errorMsg: string) {
  // Codifica o erro e passa para o app via custom scheme
  const appUrl = `panfletosbrasil://auth-callback?error=${encodeURIComponent(errorMsg)}`
  return NextResponse.redirect(appUrl, 302)
}