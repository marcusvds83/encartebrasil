'use client'

import { useEffect } from 'react'

/**
 * Error Boundary para páginas individuais.
 * Captura erros antes de mostrar "Application error".
 *
 * IMPORTANTE:
 * - "Tentar novamente" usa window.location.reload() — recarrega a página
 *   preservando a sessão (via cookie httpOnly). Usar reset() re-monta o
 *   AppShell e perde a sessão em memória, levando o usuário à tela de login.
 * - "Início" também recarrega (não temos acesso ao contexto do AppShell aqui
 *   para navegar para a aba "home" — recarregar é mais seguro e mantém a sessão).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[ErrorBoundary]', error)
  }, [error])

  const handleTentarNovamente = () => {
    // reset() pode funcionar em alguns casos — mas para garantir que a sessão
    // é preservada, fazemos reload completo (cookie continua válido).
    try {
      reset()
    } catch {
      /* ignora */
    }
    // Pequeno delay para o reset ter efeito; se falhar, recarrega a página
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.reload()
      }
    }, 100)
  }

  const handleInicio = () => {
    if (typeof window !== 'undefined') {
      // Recarrega a URL atual — AppShell decide para qual tela ir baseado na sessão.
      // NÃO navega para "/" porque isso poderia levar à tela de login.
      window.location.reload()
    }
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 gap-4">
      <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
        <span className="text-2xl font-bold text-red-600">!</span>
      </div>
      <h2 className="text-lg font-bold text-gray-800">Ops! Algo deu errado</h2>
      <p className="text-sm text-gray-500 max-w-sm text-center">
        Ocorreu um erro ao carregar esta página. Tente novamente — sua sessão
        será mantida.
      </p>
      <p className="text-xs text-gray-300 max-w-sm text-center break-words">
        {error?.message || 'Erro desconhecido'}
      </p>
      <div className="flex gap-3">
        <button
          onClick={handleTentarNovamente}
          className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
        >
          Tentar novamente
        </button>
        <button
          onClick={handleInicio}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
        >
          Recarregar
        </button>
      </div>
    </div>
  )
}
