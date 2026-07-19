/**
 * Google OAuth helper — fluxo server-side para WebView (Android APK).
 *
 * IMPORTANTE: O Render free roda em container efêmero. Não podemos
 * armazenar o PKCE state em memória porque a instância pode reiniciar
 * entre o /google-oauth-start e o /google-oauth-callback.
 *
 * Solução: codificar verifier + clientId no próprio state (JWT-like).
 * O state é assinado com um secret para evitar tampering.
 */

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

// Secret para assinar o state (usa NEXT_PUBLIC_BASE_URL como fallback)
const STATE_SECRET = process.env.OAUTH_STATE_SECRET || 'panfletosbrasil-oauth-secret-2026'

/**
 * Codifica { verifier, clientId } em um state string (base64url + HMAC).
 * Formato: base64url(verifier).base64url(clientId).base64url(hmac)
 */
export function storePkceState(verifier: string, clientId: string): string {
  const payload = `${base64UrlEncodeStr(verifier)}.${base64UrlEncodeStr(clientId)}`
  const hmac = simpleHmac(payload)
  const state = `${payload}.${hmac}`
  console.log(`[pkce-state] state gerado (stateless): ${state.substring(0, 20)}...`)
  return state
}

/**
 * Decodifica o state e valida o HMAC.
 * Retorna { verifier, clientId } ou null se inválido.
 */
export function consumePkceState(state: string): { verifier: string; clientId: string } | null {
  try {
    const parts = state.split('.')
    if (parts.length !== 3) {
      console.warn(`[pkce-state] state inválido (partes: ${parts.length})`)
      return null
    }
    const [verifierB64, clientIdB64, hmac] = parts
    const payload = `${verifierB64}.${clientIdB64}`
    const expectedHmac = simpleHmac(payload)
    if (hmac !== expectedHmac) {
      console.warn(`[pkce-state] HMAC inválido (esperado: ${expectedHmac.substring(0, 8)}..., recebido: ${hmac.substring(0, 8)}...)`)
      return null
    }
    const verifier = base64UrlDecodeStr(verifierB64)
    const clientId = base64UrlDecodeStr(clientIdB64)
    console.log(`[pkce-state] state válido: clientId=${clientId.substring(0, 10)}... verifier=${verifier.substring(0, 8)}...`)
    return { verifier, clientId }
  } catch (e) {
    console.warn(`[pkce-state] erro ao decodificar state:`, e)
    return null
  }
}

/** Gera uma string aleatória para verifier */
function randomString(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  let result = ''
  const randomValues = new Uint8Array(length)
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

/** Base64url encode (ArrayBuffer) */
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Base64url encode (string) */
function base64UrlEncodeStr(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Base64url decode (string) */
function base64UrlDecodeStr(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4)
  return atob(padded)
}

/** HMAC simples (não criptograficamente forte, mas suficiente para state) */
function simpleHmac(payload: string): string {
  const { createHmac } = require('crypto')
  return createHmac('sha256', STATE_SECRET).update(payload).digest('base64url')
}

/**
 * Tenta obter o Google OAuth Client ID.
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
        const providers = config.signInProviders || {}
        const google = providers.google || {}
        if (google.clientId) return google.clientId
      }
    } catch (e) {
      console.error('[google-oauth] erro ao buscar config do Firebase:', e)
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

/** Troca o code por tokens via PKCE (com client_secret se disponível) */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  clientId: string,
  codeVerifier: string
): Promise<any> {
  const params: Record<string, string> = {
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  }

  // Para "Web Application" clients, o Google exige client_secret
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  if (clientSecret) {
    params.client_secret = clientSecret
    console.log('[google-oauth] usando client_secret (Web Application)')
  } else {
    console.log('[google-oauth] sem client_secret (PKCE puro — Desktop app)')
  }

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error(`[google-oauth] erro ao trocar code: ${errText}`)
    throw new Error(`Google token exchange failed: ${errText}`)
  }

  return res.json()
}
