import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { calcularStatusEfetivo } from '@/lib/piloto'

/**
 * GET /api/admin/mercados/exportar-csv
 *
 * Exporta empresas em formato CSV para Excel.
 * Filtros via query params:
 *   ?filtro=sem_pagamento    → apenas empresas SEM forma de pagamento
 *   ?filtro=vencidos         → apenas empresas vencidas (piloto_expirado, pagamento_vencido)
 *   ?filtro=todos            → todas as empresas (default)
 *
 * Colunas: Nome, CNPJ, Email, Cidade, Estado, Segmento, Status, Status Efetivo,
 * Forma de Pagamento, Data Escolha, Último Pagamento, Próx. Vencimento, Mensalidade, Telefone
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'admin') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const filtro = searchParams.get('filtro') || 'todos'

    const mercados = await db.mercado.findMany()
    const agora = new Date()

    // Processa cada mercado calculando status efetivo
    let empresas = await Promise.all(mercados.map(async (m: any) => {
      const totalCliques = await db.cliqueProduto.count({ where: { mercadoId: m.id } })
      const statusInfo = calcularStatusEfetivo(m, agora)

      return {
        ...m,
        totalCliques,
        statusEfetivo: statusInfo.statusEfetivo,
        diasParaVencer: statusInfo.diasParaVencer,
        bloqueado: statusInfo.bloqueado,
      }
    }))

    // Aplica filtro
    if (filtro === 'sem_pagamento') {
      empresas = empresas.filter((m: any) => !m.formaPagamento)
    } else if (filtro === 'vencidos') {
      empresas = empresas.filter((m: any) =>
        m.statusEfetivo === 'piloto_expirado' ||
        m.statusEfetivo === 'teste_gratis_expirado' ||
        m.statusEfetivo === 'pagamento_vencido' ||
        m.statusEfetivo === 'assinatura_cancelada'
      )
    } else if (filtro === 'pendentes') {
      empresas = empresas.filter((m: any) =>
        m.statusEfetivo === 'ativo_aguardando_pagamento' ||
        m.statusEfetivo === 'aguardando_confirmacao_72h'
      )
    }

    // Monta CSV
    const headers = [
      'Nome',
      'CNPJ',
      'E-mail',
      'Telefone',
      'Cidade',
      'Estado',
      'Segmento',
      'Status',
      'Status Efetivo',
      'Forma de Pagamento',
      'Data Escolha Pagamento',
      'Último Pagamento',
      'Próximo Vencimento',
      'Piloto Fim',
      'Mensalidade',
      'Dias para Vencer',
      'Total Produtos',
      'Total Encartes',
      'Total Cliques',
      'Responsável',
      'CPF',
    ]

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return ''
      const s = String(val)
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    }

    const formatarData = (iso?: string | null) => {
      if (!iso) return ''
      try {
        return new Date(iso).toLocaleDateString('pt-BR')
      } catch {
        return ''
      }
    }

    const formatarMetodo = (metodo?: string | null) => {
      if (!metodo) return 'NÃO ESCOLHEU'
      const map: Record<string, string> = {
        pix: 'Pix',
        cartao_mensal: 'Cartão (Mensal)',
        cartao_recorrente: 'Cartão (Recorrente)',
        boleto: 'Boleto',
      }
      return map[metodo] || metodo
    }

    const formatarSegmento = (seg?: string | null) => {
      if (!seg) return 'Mercados'
      const map: Record<string, string> = {
        mercados: 'Mercados',
        petshops: 'PetShops',
        farmacias: 'Farmácias',
      }
      return map[seg] || seg
    }

    const linhas = empresas.map((m: any) => [
      escapeCSV(m.nome),
      escapeCSV(m.cnpj ? m.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : ''),
      escapeCSV(m.emailLogin),
      escapeCSV(m.telefone || ''),
      escapeCSV(m.cidade),
      escapeCSV(m.estado),
      escapeCSV(formatarSegmento(m.segmento)),
      escapeCSV(m.status),
      escapeCSV(m.statusEfetivo),
      escapeCSV(formatarMetodo(m.formaPagamento)),
      escapeCSV(formatarData(m.dataEscolhaPagamento)),
      escapeCSV(formatarData(m.ultimoPagamento)),
      escapeCSV(formatarData(m.dataProximoPagamento)),
      escapeCSV(formatarData(m.pilotoFim)),
      escapeCSV(m.mensalidade || ''),
      escapeCSV(m.diasParaVencer ?? ''),
      escapeCSV(m.totalProdutos || 0),
      escapeCSV(m.totalEncartes || 0),
      escapeCSV(m.totalCliques || 0),
      escapeCSV(m.responsavel || ''),
      escapeCSV(m.cpf || ''),
    ].join(','))

    const csv = [headers.join(','), ...linhas].join('\n')

    // BOM para Excel reconhecer UTF-8
    const csvWithBOM = '\uFEFF' + csv

    const nomeArquivo = `empresas_${filtro}_${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csvWithBOM, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
      },
    })
  } catch (e: any) {
    console.error('[admin/exportar-csv] erro:', e)
    return NextResponse.json({ erro: 'Erro ao exportar: ' + String(e) }, { status: 500 })
  }
}
