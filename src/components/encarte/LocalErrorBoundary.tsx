'use client'

import React from 'react'
import { AlertCircle } from 'lucide-react'

/**
 * Error Boundary LOCAL — captura erros apenas no sub-componente envolvido,
 * SEM desmontar o AppShell pai. Assim a sessão do usuário é preservada.
 *
 * Uso:
 *   <LocalErrorBoundary>
 *     <MyListView ... />
 *   </LocalErrorBoundary>
 *
 * Quando o filho crasha, mostra UI amigável inline com botão "Tentar novamente"
 * que chama reset() — apenas o boundary é resetado, o AppShell permanece montado
 * com seu estado (session, tab, etc.) intacto.
 */
interface Props {
  children: React.ReactNode
  /** Mensagem opcional personalizada */
  fallbackMessage?: string
}

interface State {
  hasError: boolean
  error: Error | null
  /** Incrementado para forçar remount do filho ao clicar em Tentar novamente */
  resetKey: number
}

export default class LocalErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, resetKey: 0 }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[LocalErrorBoundary] erro capturado:', error, info)
  }

  handleReset = () => {
    this.setState((s) => ({
      hasError: false,
      error: null,
      resetKey: s.resetKey + 1,
    }))
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center py-16 px-4">
          <div className="h-14 w-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-7 w-7 text-red-500" />
          </div>
          <h2 className="text-base font-semibold text-gray-800 mb-1">
            {this.props.fallbackMessage || 'Não foi possível carregar esta seção'}
          </h2>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mb-1">
            Você pode tentar novamente — suas outras abas continuam funcionando.
          </p>
          {this.state.error?.message && (
            <p className="text-[10px] text-gray-300 max-w-sm mx-auto mb-4 break-words">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleReset}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      )
    }
    // resetKey no key força remount do filho, garantindo estado limpo após reset
    return (
      <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>
    )
  }
}
