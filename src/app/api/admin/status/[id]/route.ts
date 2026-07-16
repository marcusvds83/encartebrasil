import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'admin') return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    const { id } = await params
    const { status } = await req.json()
    if (!status) return NextResponse.json({ erro: 'Status obrigatório' }, { status: 400 })

    const validStatuses = ['piloto', 'ativo', 'inativo', 'suspenso']
    if (!validStatuses.includes(status)) return NextResponse.json({ erro: 'Status inválido' }, { status: 400 })

    // Quando admin ativa um mercado que estava em piloto ou piloto_expirado,
    // marca como "ativo_aguardando_pagamento" para forçar a tela de pagamento
    let effectiveStatus = status
    if (status === 'ativo') {
      const mercadoAtual = await db.mercado.findUnique({ where: { id } })
      const mAtual = mercadoAtual as any
      const precisaPagar = (
        mAtual.status === 'piloto' ||
        mAtual.status === 'piloto_expirado' ||
        mAtual.status === 'ativo_aguardando_pagamento' ||
        !mAtual.ultimoPagamento
      )
      if (precisaPagar) {
        effectiveStatus = 'ativo_aguardando_pagamento'
        console.log(`[admin status] mercado ${id} ativado mas aguardando pagamento`)
      }
    }

    const updated = await db.mercado.update(id, { status: effectiveStatus })
    return NextResponse.json({ ok: true, status: (updated as any)?.status || effectiveStatus, statusOriginal: status })
  } catch {
    return NextResponse.json({ erro: 'Erro ao alterar status' }, { status: 500 })
  }
}
