import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eid: string }> },
) {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'mercado') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }
    const { eid } = await params

    // Verifica se o encarte pertence ao mercado logado
    const encartes = await db.encarte.findMany({ where: { mercadoId: session.id } })
    const encarte = encartes.find(e => e.id === eid)
    if (!encarte) {
      return NextResponse.json({ erro: 'Encarte não encontrado' }, { status: 404 })
    }

    const body = await req.json()
    const { produtos: produtosLista } = body as {
      produtos: Array<{ nome: string; marca?: string | null; preco: string; unidade?: string | null }>
    }

    if (!Array.isArray(produtosLista)) {
      return NextResponse.json({ erro: 'Lista de produtos obrigatória' }, { status: 400 })
    }

    // Remove produtos anteriores do encarte (caso tenha republicação)
    await db.produto.deleteMany({ where: { encarteId: eid, mercadoId: session.id } })

    // Salva os produtos revisados
    let salvos = 0
    for (const p of produtosLista) {
      if (!p.nome || !p.preco) continue
      try {
        await db.produto.create({
          encarteId: eid,
          mercadoId: session.id,
          nome: p.nome,
          marca: p.marca || null,
          preco: p.preco,
          unidade: p.unidade || null,
          normalizado: p.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
          criadoEm: new Date().toISOString(),
        })
        salvos++
      } catch (prodErr: any) {
        console.error(`[encarte publicar] erro ao salvar produto "${p.nome}":`, prodErr?.message || prodErr)
      }
    }

    // Atualiza status do encarte
    await db.encarte.update(eid, {
      statusExtracao: 'concluido',
      extracaoLog: `Publicação concluída. ${salvos} produto(s) salvo(s).`,
    })

    return NextResponse.json({ ok: true, totalSalvos: salvos })
  } catch (e: any) {
    console.error('[encarte publicar] erro:', e)
    return NextResponse.json({ erro: 'Erro ao publicar encarte: ' + String(e) }, { status: 500 })
  }
}