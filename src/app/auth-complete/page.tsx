'use client'

import { useEffect, useState } from 'react'

/**
 * /auth-complete?token=XXX
 *
 * Pagina intermediaria usada pelo APK (WebView) para completar
 * o login com Google. O fluxo e:
 *
 * 1. Usuario clica "Entrar com Google" no WebView
 * 2. Android abre o Chrome para o fluxo OAuth
 * 3. Apos autenticacao, Chrome volta ao app via custom scheme (panfletosbrasil://)
 * 4. Android carrega esta pagina no WebView com o idToken
 * 5. Esta pagina tenta /api/auth/google-login (Firebase token)
 *    e se falhar, tenta /api/auth/google-login-webview (Google token direto)
 * 6. Cookie eb_session e setado pelo servidor no WebView
 * 7. Redireciona para a home
 */
export default function AuthCompletePage() {
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')

    if (!token) {
      setErro('Token de autenticacao nao fornecido.')
      setLoading(false)
      return
    }

    // Tenta primeiro com o endpoint Firebase, depois com o endpoint Google direto
    const tryLogin = async (endpoint: string) => {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      })
      return res.json()
    }

    tryLogin('/api/auth/google-login')
      .then((data) => {
        if (data.ok) {
          window.location.href = '/'
        } else {
          // Fallback: tenta com o endpoint que aceita Google tokens diretos
          return tryLogin('/api/auth/google-login-webview')
        }
        return null
      })
      .then((data) => {
        if (data && data.ok) {
          window.location.href = '/'
        } else if (data && data.erro) {
          setErro(data.erro)
        }
      })
      .catch((err) => {
        setErro('Erro de conexao: ' + err.message)
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