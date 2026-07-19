import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { calcularStatusEfetivo, EMAIL_SUPORTE } from '@/lib/piloto'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'mercado') return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const mercado = await db.mercado.findUnique({
      where: { id: session.id },
      select: {
        id: true, nome: true, cidade: true, estado: true,
        emailLogin: true, status: true, destaque: true,
        pilotoInicio: true, pilotoFim: true, mensalidade: true,
        criadoEm: true, logoPath: true, endereco: true, telefone: true, segmento: true,
        formaPagamento: true, dataEscolhaPagamento: true,
        ultimoPagamento: true, ultimoPagamentoValor: true,
        dataProximoPagamento: true,
      },
    })
    if (!mercado) return NextResponse.json({ erro: 'Empresa não encontrada' }, { status: 404 })

    const m = mercado as any
    const agora = new Date()

    // Usa helper centralizado para calcular status efetivo
    const statusInfo = calcularStatusEfetivo(m, agora)

    // Encartes ativos (concluídos e não expirados)
    const todosEncartes = await db.encarte.findMany({ where: { mercadoId: mercado.id } })
    const agoraISO = agora.toISOString()
    const encartesAtivos = todosEncartes.filter(
      (e: any) => e.statusExtracao === 'concluido' && (!e.dataFim || e.dataFim >= agoraISO),
    )
    const activeEncarteIds = encartesAtivos.map((e: any) => e.id)

    const totalProdutos = await (db.produto as any).countByEncarteIds?.(mercado.id, activeEncarteIds) ?? 0
    const totalEncartes = encartesAtivos.length
    const totalCliques = await db.cliqueProduto.count({ where: { mercadoId: mercado.id } })

    return NextResponse.json({
      ...mercado,
      statusEfetivo: statusInfo.statusEfetivo,
      diasParaVencer: statusInfo.diasParaVencer,
      dentroJanelaAviso: statusInfo.dentroJanelaAviso,
      dentroCarencia72h: statusInfo.dentroCarencia72h,
      horasRestantesCarencia: statusInfo.horasRestantesCarencia,
      dataFimAcesso: statusInfo.dataFimAcesso,
      bloqueado: statusInfo.bloqueado,
      emailSuporte: EMAIL_SUPORTE,
      totalProdutos,
      totalEncartes,
      totalCliques,
    })
  } catch (e) {
    console.error('[conta] erro:', e)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
