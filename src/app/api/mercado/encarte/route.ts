import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { extrairProdutosDoPDF } from '@/lib/pdf-parser'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'mercado') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }
    const formData = await req.formData()
    const file = formData.get('pdf') as File | null
    const titulo = formData.get('titulo') as string | null
    const dataInicio = formData.get('dataInicio') as string | null
    const dataFim = formData.get('dataFim') as string | null
    if (!file || !titulo) {
      return NextResponse.json({ erro: 'PDF e título obrigatórios' }, { status: 400 })
    }
    if (!dataInicio || !dataFim) {
      return NextResponse.json({ erro: 'Data início e fim da promoção são obrigatórias' }, { status: 400 })
    }
    // Validação: dataFim deve ser >= dataInicio
    if (new Date(dataFim) < new Date(dataInicio)) {
      return NextResponse.json({ erro: 'Data fim deve ser igual ou posterior à data início' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = `encarte_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const uploadsDir = '/tmp/uploads'
    await mkdir(uploadsDir, { recursive: true })
    await writeFile(path.join(uploadsDir, filename), buffer)

    // Cria o encarte com status "processando"
    const encarte: any = await db.encarte.create({
      mercadoId: session.id,
      titulo,
      pdfPath: filename,
      dataInicio,
      dataFim,
      statusExtracao: 'processando',
      extracaoLog: 'PDF recebido, aguardando revisão dos produtos...',
      criadoEm: new Date().toISOString(),
    })

    // ── Extrai produtos do PDF usando parser inteligente ─────────────────
    let produtosExtraidos: Array<{ nome: string; marca: string | null; preco: string; unidade: string | null }> = []
    let logExtracao = 'PDF recebido. '
    try {
      const { produtos, textoBruto, totalPaginas } = await extrairProdutosDoPDF(buffer)
      console.log(`[encarte upload] parser: ${produtos.length} produtos, texto=${textoBruto.length}chars, paginas=${totalPaginas}`)
      produtosExtraidos = produtos.map(p => ({
        nome: p.nome,
        marca: p.marca,
        preco: p.preco,
        unidade: p.unidade,
      }))
      if (produtos.length > 0) {
        logExtracao += `Parser identificou ${produtos.length} produto(s). Revise antes de publicar.`
      } else if (textoBruto.length === 0) {
        logExtracao += `Nenhum texto foi extraído do PDF — provavelmente os produtos são imagens (Canva/Designer). O PDF precisa ter texto selecionável.`
      } else {
        logExtracao += `Texto extraído (${textoBruto.length} caracteres) mas nenhum produto com preço foi encontrado. Verifique se os preços estão no formato R$ XX,XX.`
      }
    } catch (e: any) {
      console.error('[encarte upload] erro parser:', e)
      logExtracao += ` Erro na extração: ${e?.message || String(e)}`
    }

    return NextResponse.json({
      ok: true,
      encarte,
      produtos: produtosExtraidos,
      log: logExtracao,
    })
  } catch (e: any) {
    console.error('[encarte upload] erro:', e)
    return NextResponse.json({ erro: 'Erro ao enviar encarte: ' + String(e) }, { status: 500 })
  }
}