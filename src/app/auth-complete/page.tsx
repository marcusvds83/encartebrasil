'use client'

import { useEffect, useState } from 'react'

/**
 * /auth-complete?token=XXX  ou  /auth-complete?error=YYY
 *
 * Página intermediaria usada pelo APK (WebView) para completar
 * o login com Google. O fluxo e:
 *
 * 1. Usuario clica "Entrar com Google" no WebView
 * 2. Android abre o Chrome para o fluxo OAuth (PKCE)
 * 3. Apos autenticacao, Chrome volta ao servidor /api/auth/google-oauth-callback
 * 4. Servidor troca code por idToken e redireciona para
 *    panfletosbrasil://auth-callback?idToken=XXX (ou ?error=YYY)
 * 5. Android carrega esta pagina no WebView com o idToken
 * 6. Esta pagina envia o token para /api/auth/google-login-webview
 *    que cria o cookie de sessao no WebView
 * 7. Redireciona para a home
 */
export default function AuthCompletePage() {
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')

    // Se veio com erro do callback, mostra direto
    if (error) {
      setErro(decodeURIComponent(error))
      setLoading(false)
      return
    }

    const token = params.get('token')

    if (!token) {
      setErro('Token de autenticacao nao fornecido.')
      setLoading(false)
      return
    }

    // Tenta primeiro com o endpoint que aceita Google tokens diretos
    // (o PKCE flow gera tokens do Google, nao do Firebase)
    const doLogin = async (endpoint: string) => {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        return { success: true }
      }
      return { success: false, data }
    }

    // Tenta google-login-webview primeiro (aceita tokens Google diretos)
    doLogin('/api/auth/google-login-webview')
      .then((result) => {
        if (result.success) {
          window.location.href = '/'
          return
        }
        // Fallback: tenta com o endpoint Firebase
        return doLogin('/api/auth/google-login')
      })
      .then((result) => {
        if (result && result.success) {
          window.location.href = '/'
        } else if (result && result.data && result.data.erro) {
          setErro(result.data.erro)
        } else {
          setErro('Nao foi possivel completar o login. Tente novamente.')
        }
      })
      .catch((err) => {
        console.error('[auth-complete] erro:', err)
        setErro('Erro de conexao: ' + (err instanceof Error ? err.message : String(err)))
      })
      .finally(() => setLoading(false))
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