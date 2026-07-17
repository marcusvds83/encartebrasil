/**
 * Google OAuth helper — fluxo server-side para WebView (Android APK).
 *
 * O signInWithRedirect do Firebase falha no WebView porque o estado
 * é guardado em sessionStorage e se perde quando o Chrome abre.
 * Este módulo implementa um fluxo OAuth independente do Firebase.
 */

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

/** Gera uma string aleatória para state/nonce */
function randomString(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  let result = ''
  const randomValues = new Uint8Array(length)
  // eslint-disable-next-line no-restricted-globals
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues)
  } else {
    for (let i = 0; i < length; i++) randomValues[i] = Math.floor(Math.random() * 256)
  }
  for (let i = 0; i < length; i++) result += chars[randomValues[i] % chars.length]
  return result
}

/** Gera um PKCE code verifier (43-128 chars) */
export function generateCodeVerifier(): string {
  return randomString(64)
}

/** Gera o PKCE code challenge (S256) a partir do verifier */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(hash)
}

/** Base64url encode */
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Tenta obter o Google OAuth Client ID do projeto Firebase.
 * Tenta múltiplos métodos.
 */
export async function getGoogleClientId(): Promise<string | null> {
  // Método 1: Variável de ambiente direta
  if (process.env.GOOGLE_OAUTH_CLIENT_ID) {
    return process.env.GOOGLE_OAUTH_CLIENT_ID
  }

  // Método 2: Buscar da config do Firebase via API REST
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

  if (apiKey && projectId) {
    try {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v2/projects/${projectId}/config?key=${apiKey}`
      )
      if (res.ok) {
        const config = await res.json()
        // A config pode ter o client ID em signInProviders
        const providers = config.signInProviders || {}
        const google = providers.google || {}
        if (google.clientId) return google.clientId
      }
    } catch (e) {
      console.error('[google-oauth] erro ao buscar config do Firebase:', e)
    }

    // Método 3: Tentar descobrir via endpoint público do Firebase
    try {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v2/projects/${projectId}/oauthIdpConfigs/google?key=${apiKey}`
      )
      if (res.ok) {
        const data = await res.json()
        if (data.clientId) return data.clientId
      }
    } catch {
      // ignore
    }
  }

  return null
}

/**
 * Constrói a URL de autorização Google OAuth para o fluxo PKCE.
 */
export async function buildGoogleAuthUrl(
  redirectUri: string,
  state: string,
  codeChallenge: string
): Promise<string | null> {
  const clientId = await getGoogleClientId()
  if (!clientId) {
    console.error('[google-oauth] Não foi possível obter o Google Client ID')
    return null
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'select_account',
  })

  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

/**
 * Troca um authorization code por tokens usando PKCE (sem client secret).
 * Chamado do lado do cliente (Chrome).
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<{ id_token: string; access_token: string }> {
  const clientId = await getGoogleClientId()
  if (!clientId) throw new Error('Google Client ID não disponível')

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }).toString(),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Erro ao trocar código: ${err}`)
  }

  return res.json()
}