import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET /api/mercado/meus-encartes
 * Retorna todos os encartes + produtos do mercado logado.
 */
export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'mercado') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }

    // Usa findUniqueWithRelations que retorna encartes + produtos
    const detail: any = await db.mercado.findUniqueWithRelations(session.id)
    if (!detail) {
      return NextResponse.json({ erro: 'Mercado não encontrado' }, { status: 404 })
    }

    // Formata encartes com produtos
    const agora = new Date().toISOString()

    const encartes = (detail.encartes || []).map((e: any) => ({
      id: e.id,
      titulo: e.titulo,
      pdfPath: e.pdfPath,
      dataInicio: e.dataInicio || null,
      dataFim: e.dataFim || null,
      expirado: e.dataFim && new Date(e.dataFim) < new Date(agora) ? true : false,
      statusExtracao: e.statusExtracao,
      extracaoLog: e.extracaoLog,
      criadoEm: e.criadoEm,
      produtos: (detail.produtos || []).filter((p: any) => p.encarteId === e.id),
    }))

    return NextResponse.json({
      mercado: {
        id: detail.id,
        nome: detail.nome,
        cidade: detail.cidade,
        estado: detail.estado,
        emailLogin: detail.emailLogin,
        status: detail.status,
        cnpj: detail.cnpj,
      },
      encartes,
      totalProdutos: detail.produtos?.length || 0,
      totalEncartes: encartes.length,
    })
  } catch (e) {
    console.error('[meus-encartes] erro:', e)
    return NextResponse.json({ erro: 'Erro interno: ' + String(e) }, { status: 500 })
  }
}
