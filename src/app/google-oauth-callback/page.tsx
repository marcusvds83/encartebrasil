'use client'

import { useEffect, useState } from 'react'

/**
 * /google-oauth-callback?code=XXX&state=YYY
 *
 * Esta página roda no CHROME (não no WebView) após o usuário autenticar
 * no Google. O fluxo é:
 *
 * 1. Google redireciona para cá com ?code=XXX&state=YYY
 * 2. Lê cookies (state, verifier, client_id) setados pelo /api/auth/google-oauth-start
 * 3. Valida o state
 * 4. Troca o code por tokens via PKCE (sem client secret)
 * 5. Redireciona para panfletosbrasil://auth-callback?idToken=XXX
 *    O APK recebe esse intent e carrega /auth-complete?token=XXX no WebView,
 *    onde o cookie de sessão é criado corretamente.
 */
export default function GoogleOAuthCallbackPage() {
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')
        const state = params.get('state')

        if (!code || !state) {
          setErro('Parâmetros de autenticação ausentes (code/state).')
          setLoading(false)
          return
        }

        // 1. Ler cookies
        const cookies = document.cookie.split(';').reduce(
          (acc, c) => {
            const [k, v] = c.trim().split('=')
            acc[k] = v
            return acc
          },
          {} as Record<string, string>
        )

        const savedState = cookies['google_oauth_state']
        const verifier = cookies['google_oauth_verifier']
        const clientId = cookies['google_oauth_cid']

        if (!savedState || !verifier || !clientId) {
          setErro('Sessão OAuth expirada. Tente novamente.')
          setLoading(false)
          return
        }

        // 2. Validar state
        if (state !== savedState) {
          setErro('Erro de segurança: state inválido. Tente novamente.')
          setLoading(false)
          return
        }

        // 3. Trocar code por tokens via PKCE
        const redirectUri = `${window.location.origin}/google-oauth-callback`

        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            client_id: clientId,
            redirect_uri: redirectUri,
            code_verifier: verifier,
          }).toString(),
        })

        if (!tokenRes.ok) {
          const errText = await tokenRes.text()
          setErro(`Erro do Google: ${errText}`)
          setLoading(false)
          return
        }

        const tokenData = await tokenRes.json()
        const idToken = tokenData.id_token

        if (!idToken) {
          setErro('Google não retornou o token de identidade.')
          setLoading(false)
          return
        }

        // 4. Passar o token para o APK via custom scheme
        // O APK vai carregar /auth-complete?token=XXX no WebView
        // onde a sessão será criada com o cookie correto
        window.location.href = `panfletosbrasil://auth-callback?idToken=${encodeURIComponent(idToken)}`
      } catch (err) {
        setErro('Erro: ' + (err instanceof Error ? err.message : String(err)))
      } finally {
        setLoading(false)
      }
    }

    handleCallback()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Finalizando login com Google...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="text-center max-w-sm mx-auto px-6">
        <p className="text-red-600 font-medium mb-6">{erro}</p>
        <button
          onClick={() => (window.location.href = '/')}
          className="bg-red-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
        >
          Voltar ao inicio
        </button>
      </div>
    </div>
  )
}