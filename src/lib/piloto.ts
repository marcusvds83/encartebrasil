/**
 * Helper centralizado para lógica de Piloto / Teste Grátis / Bloqueio.
 *
 * Regras (confirmadas com cliente em 19/07/2026):
 * - Piloto: TODAS as empresas em piloto vencem em 01/10/2026 (antigos e novos até essa data)
 * - Pós 01/10/2026: novos cadastros ganham Teste Grátis de 15 dias (mesmas regras do piloto)
 * - D-3 a D-0 (3 dias antes do vencimento): popup de aviso a cada login, fechável
 *   Aplica-se a Piloto, Teste Grátis e Mensal — exceto cartão recorrente
 * - D-0 (vencimento): se não escolheu pagamento → bloqueia
 *   Se escolheu qualquer forma no D-0 → ganha +72h de carência
 * - Após 72h sem confirmação → bloqueia, com e-mail de suporte
 */

// ── Constantes ────────────────────────────────────────────────────────────

export const PILOTO_FIM_GLOBAL = '2026-10-01T00:00:00-03:00' // 01/10/2026 00:00 BRT
export const TESTE_GRATIS_DIAS = 15
export const DIAS_AVISO_PRE_VENC = 3
export const HORAS_CARENCIA_POS_ESCOLHA = 72
export const EMAIL_SUPORTE = 'notifications@panfletosbrasil.odoo.com'

export type StatusMercado =
  | 'piloto'
  | 'teste_gratis'
  | 'ativo'
  | 'ativo_aguardando_pagamento'
  | 'ativo_carencia'
  | 'inativo'
  | 'suspenso'
  | 'piloto_expirado'
  | 'teste_gratis_expirado'
  | 'assinatura_cancelada'
  | 'pagamento_vencido'
  | 'aguardando_confirmacao_72h'

export interface DadosAcesso {
  status: 'piloto' | 'teste_gratis'
  pilotoInicio: string
  pilotoFim: string
}

/**
 * Calcula dados de acesso para NOVO mercado no momento do cadastro.
 * - Antes de 01/10/2026: status='piloto', pilotoFim=01/10/2026
 * - Após 01/10/2026: status='teste_gratis', pilotoFim=agora+15 dias
 */
export function calcularDadosAcessoNovoMercado(now: Date = new Date()): DadosAcesso {
  const pilotoFimGlobal = new Date(PILOTO_FIM_GLOBAL)
  const pilotoInicio = now.toISOString()

  if (now < pilotoFimGlobal) {
    // Período de piloto: vence em 01/10/2026
    return {
      status: 'piloto',
      pilotoInicio,
      pilotoFim: pilotoFimGlobal.toISOString(),
    }
  }

  // Pós-piloto: Teste Grátis de 15 dias
  const pilotoFim = new Date(now.getTime() + TESTE_GRATIS_DIAS * 24 * 60 * 60 * 1000)
  return {
    status: 'teste_gratis',
    pilotoInicio,
    pilotoFim: pilotoFim.toISOString(),
  }
}

export interface StatusEfetivoInfo {
  statusEfetivo: StatusMercado
  diasParaVencer: number | null
  dentroJanelaAviso: boolean
  dentroCarencia72h: boolean
  horasRestantesCarencia: number | null
  dataFimAcesso: string | null
  bloqueado: boolean
}

/**
 * Calcula status efetivo de uma empresa com base nos dados do Firestore.
 *
 * @param mercado Objeto do mercado com status, pilotoFim, formaPagamento, dataEscolhaPagamento, etc.
 * @param agora Data atual (default: new Date())
 */
export function calcularStatusEfetivo(
  mercado: {
    status: string
    pilotoFim?: string | null
    formaPagamento?: string | null
    dataEscolhaPagamento?: string | null
    ultimoPagamento?: string | null
    dataProximoPagamento?: string | null
  },
  agora: Date = new Date(),
): StatusEfetivoInfo {
  let statusEfetivo = (mercado.status as StatusMercado) || 'piloto'
  let diasParaVencer: number | null = null
  let dentroJanelaAviso = false
  let dentroCarencia72h = false
  let horasRestantesCarencia: number | null = null
  let dataFimAcesso: string | null = null

  // Calcula dias para vencer (piloto ou teste grátis)
  if (mercado.pilotoFim) {
    const fim = new Date(mercado.pilotoFim)
    diasParaVencer = Math.ceil((fim.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24))
  }

  // 1. Piloto ou Teste Grátis expirado
  if (
    (mercado.status === 'piloto' || mercado.status === 'teste_gratis') &&
    mercado.pilotoFim &&
    agora > new Date(mercado.pilotoFim)
  ) {
    // Verifica se escolheu pagamento dentro das últimas 72h
    if (mercado.dataEscolhaPagamento) {
      const escolha = new Date(mercado.dataEscolhaPagamento)
      const horasDesdeEscolha = (agora.getTime() - escolha.getTime()) / (1000 * 60 * 60)
      if (horasDesdeEscolha <= HORAS_CARENCIA_POS_ESCOLHA) {
        // Dentro das 72h de carência
        dentroCarencia72h = true
        horasRestantesCarencia = Math.ceil(HORAS_CARENCIA_POS_ESCOLHA - horasDesdeEscolha)
        statusEfetivo = 'aguardando_confirmacao_72h'
        dataFimAcesso = new Date(escolha.getTime() + HORAS_CARENCIA_POS_ESCOLHA * 60 * 60 * 1000).toISOString()
      } else {
        // 72h passaram sem confirmação → bloqueia
        statusEfetivo = mercado.status === 'piloto' ? 'piloto_expirado' : 'teste_gratis_expirado'
      }
    } else {
      // Não escolheu pagamento → bloqueia direto
      statusEfetivo = mercado.status === 'piloto' ? 'piloto_expirado' : 'teste_gratis_expirado'
    }
  }

  // 2. Aguardando pagamento (admin ativou mas não pagou)
  if (mercado.status === 'ativo_aguardando_pagamento') {
    statusEfetivo = 'ativo_aguardando_pagamento'
  }

  // 3. Assinatura cancelada com carência (30 dias após último pagamento)
  if (mercado.status === 'ativo' && mercado.formaPagamento && mercado.ultimoPagamento && !mercado.dataProximoPagamento) {
    const diasDesdePagamento = (agora.getTime() - new Date(mercado.ultimoPagamento).getTime()) / (1000 * 60 * 60 * 24)
    if (diasDesdePagamento > 30) {
      statusEfetivo = 'assinatura_cancelada'
    } else {
      statusEfetivo = 'ativo_carencia'
      dataFimAcesso = new Date(new Date(mercado.ultimoPagamento).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  }

  // 4. Próximo pagamento vencido
  if (mercado.status === 'ativo' && mercado.dataProximoPagamento && new Date(mercado.dataProximoPagamento) < agora) {
    // Verifica carência de 72h
    if (mercado.dataEscolhaPagamento) {
      const escolha = new Date(mercado.dataEscolhaPagamento)
      const horasDesdeEscolha = (agora.getTime() - escolha.getTime()) / (1000 * 60 * 60)
      if (horasDesdeEscolha <= HORAS_CARENCIA_POS_ESCOLHA) {
        dentroCarencia72h = true
        horasRestantesCarencia = Math.ceil(HORAS_CARENCIA_POS_ESCOLHA - horasDesdeEscolha)
        statusEfetivo = 'aguardando_confirmacao_72h'
        dataFimAcesso = new Date(escolha.getTime() + HORAS_CARENCIA_POS_ESCOLHA * 60 * 60 * 1000).toISOString()
      } else {
        statusEfetivo = 'pagamento_vencido'
      }
    } else {
      statusEfetivo = 'pagamento_vencido'
    }
  }

  // 5. Janela de aviso D-3 — SIMPLIFICADO
  // Sempre verifica TODAS as datas de vencimento possíveis:
  // - pilotoFim (para piloto, teste_gratis, e ativo que ainda tem pilotoFim)
  // - dataProximoPagamento (para ativo com mensalidade)
  // Se qualquer uma estiver dentro de 3 dias (ou vencida em carência 72h) → popup
  // EXCETO cartao_recorrente (isento de avisos)

  // Calcula bloqueado ANTES do D-3 (para não mostrar popup se bloqueou)
  const bloqueado = [
    'piloto_expirado',
    'teste_gratis_expirado',
    'assinatura_cancelada',
    'pagamento_vencido',
  ].includes(statusEfetivo)

  if (mercado.formaPagamento !== 'cartao_recorrente' && !bloqueado) {
    // Verifica pilotoFim
    if (mercado.pilotoFim) {
      const diasPiloto = Math.ceil((new Date(mercado.pilotoFim).getTime() - agora.getTime()) / (1000 * 60 * 60 * 24))
      if (diasPiloto <= DIAS_AVISO_PRE_VENC) {
        dentroJanelaAviso = true
        if (diasParaVencer === null || diasPiloto < diasParaVencer) {
          diasParaVencer = diasPiloto
        }
      }
    }

    // Verifica dataProximoPagamento (para ativos)
    if (mercado.dataProximoPagamento) {
      const diasProxPagto = Math.ceil((new Date(mercado.dataProximoPagamento).getTime() - agora.getTime()) / (1000 * 60 * 60 * 24))
      if (diasProxPagto <= DIAS_AVISO_PRE_VENC) {
        dentroJanelaAviso = true
        if (diasParaVencer === null || diasProxPagto < diasParaVencer) {
          diasParaVencer = diasProxPagto
        }
      }
    }

    // Também ativa se está em carência 72h
    if (dentroCarencia72h) {
      dentroJanelaAviso = true
    }
  }

  return {
    statusEfetivo,
    diasParaVencer,
    dentroJanelaAviso,
    dentroCarencia72h,
    horasRestantesCarencia,
    dataFimAcesso,
    bloqueado,
  }
}
