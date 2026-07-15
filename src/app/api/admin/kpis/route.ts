import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET /api/admin/kpis — KPIs para o painel admin:
 *  - Total de usuários PF
 *  - Total de mercados PJ
 *  - Usuários por região (estado)
 *  - Mercados por região (estado)
 *  - Mercados por status (piloto, ativo, inativo, suspenso)
 *  - Novos cadastros nos últimos 30 dias
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'admin') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }

    const [usuarios, mercados] = await Promise.all([
      (db.usuario as any).findMany(),
      db.mercado.findMany(),
    ])

    // Usuários por estado (região)
    const usuariosPorEstado: Record<string, number> = {}
    for (const u of usuarios) {
      const estado = (u as any).estado || (u as any).uf || 'Não informado'
      usuariosPorEstado[estado] = (usuariosPorEstado[estado] || 0) + 1
    }

    // Mercados por estado
    const mercadosPorEstado: Record<string, number> = {}
    for (const m of mercados) {
      const estado = (m as any).estado || 'Não informado'
      mercadosPorEstado[estado] = (mercadosPorEstado[estado] || 0) + 1
    }

    // Mercados por status
    const mercadosPorStatus: Record<string, number> = {}
    for (const m of mercados) {
      const status = (m as any).status || 'piloto'
      mercadosPorStatus[status] = (mercadosPorStatus[status] || 0) + 1
    }

    // Novos cadastros nos últimos 30 dias
    const agora = Date.now()
    const trintaDiasAtras = agora - 30 * 24 * 60 * 60 * 1000
    const novosUsuarios = usuarios.filter((u: any) => {
      const criado = new Date(u.criadoEm || 0).getTime()
      return criado >= trintaDiasAtras
    }).length
    const novosMercados = mercados.filter((m: any) => {
      const criado = new Date(m.criadoEm || 0).getTime()
      return criado >= trintaDiasAtras
    }).length

    // Regiões do Brasil (agrupamento por macro-região)
    const regioes: Record<string, string[]> = {
      'Norte': ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
      'Nordeste': ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
      'Centro-Oeste': ['DF', 'GO', 'MT', 'MS'],
      'Sudeste': ['ES', 'MG', 'RJ', 'SP'],
      'Sul': ['PR', 'RS', 'SC'],
    }
    const usuariosPorRegiao: Record<string, number> = {}
    const mercadosPorRegiao: Record<string, number> = {}
    for (const [regiao, estados] of Object.entries(regioes)) {
      usuariosPorRegiao[regiao] = usuarios.filter((u: any) =>
        estados.includes((u as any).estado || (u as any).uf || '')
      ).length
      mercadosPorRegiao[regiao] = mercados.filter((m: any) =>
        estados.includes((m as any).estado || '')
      ).length
    }

    return NextResponse.json({
      totais: {
        usuarios: usuarios.length,
        mercados: mercados.length,
        mercadosAtivos: mercados.filter((m: any) => m.status === 'ativo').length,
        mercadosPiloto: mercados.filter((m: any) => m.status === 'piloto').length,
        novosUsuarios30d: novosUsuarios,
        novosMercados30d: novosMercados,
      },
      usuariosPorEstado: Object.entries(usuariosPorEstado)
        .map(([estado, total]) => ({ estado, total }))
        .sort((a, b) => b.total - a.total),
      mercadosPorEstado: Object.entries(mercadosPorEstado)
        .map(([estado, total]) => ({ estado, total }))
        .sort((a, b) => b.total - a.total),
      mercadosPorStatus: Object.entries(mercadosPorStatus)
        .map(([status, total]) => ({ status, total })),
      usuariosPorRegiao: Object.entries(usuariosPorRegiao)
        .map(([regiao, total]) => ({ regiao, total })),
      mercadosPorRegiao: Object.entries(mercadosPorRegiao)
        .map(([regiao, total]) => ({ regiao, total })),
    })
  } catch (e) {
    return NextResponse.json({ erro: 'Erro ao gerar KPIs: ' + String(e) }, { status: 500 })
  }
}
