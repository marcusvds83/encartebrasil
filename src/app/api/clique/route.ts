import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Registra cliques e visualizações para o BI do mercado.
 *
 * tipos aceitos:
 *   - "produto":   consumidor clicou em um produto (add à lista ou card na home)
 *   - "mercado":   consumidor entrou na página de um mercado (visualização)
 *
 * Para tipo "mercado", produtoId é opcional.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { produtoId, mercadoId, sessionId, tipo } = body

    if (!mercadoId) {
      return NextResponse.json({ erro: 'mercadoId obrigatório' }, { status: 400 })
    }
    if (tipo !== 'mercado' && !produtoId) {
      return NextResponse.json({ erro: 'produtoId obrigatório para cliques de produto' }, { status: 400 })
    }

    await db.cliqueProduto.create({
      produtoId: produtoId || '',
      mercadoId,
      sessionId: sessionId || 'anon',
      tipo: tipo || 'produto',   // padrão 'produto' p/ backward-compat
      criadoEm: new Date().toISOString(),
    })
    console.log(`[clique] tipo=${tipo || 'produto'} mercado=${mercadoId} produto=${produtoId || '—'}`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[clique] erro ao registrar:', err)
    return NextResponse.json({ erro: 'Erro ao registrar clique' }, { status: 500 })
  }
}