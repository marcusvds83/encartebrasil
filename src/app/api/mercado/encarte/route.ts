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
      extracaoLog: 'PDF recebido, iniciando extração...',
      criadoEm: new Date().toISOString(),
    })

    // ── Extrai produtos do PDF usando parser inteligente ─────────────────
    let produtosExtraidos = 0
    let logExtracao = 'PDF recebido. '
    try {
      const { produtos } = await extrairProdutosDoPDF(buffer)
      logExtracao += `Parser identificou ${produtos.length} produto(s). `

      let salvos = 0
      for (const p of produtos) {
        try {
          await db.produto.create({
            encarteId: encarte.id,
            mercadoId: session.id,
            nome: p.nome,
            marca: p.marca || null,
            preco: p.preco,
            unidade: p.unidade || null,
            normalizado: p.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
            criadoEm: new Date().toISOString(),
          })
          salvos++
        } catch {
          // ignora erro de produto individual
        }
      }
      produtosExtraidos = salvos
      logExtracao += `${salvos} produto(s) salvo(s) no encarte.`

      await (db.encarte as any).update?.(encarte.id, {
        statusExtracao: 'concluido',
        extracaoLog: logExtracao,
      })
    } catch (e: any) {
      logExtracao += ` Erro na extração: ${e?.message || String(e)}`
      try {
        await (db.encarte as any).update?.(encarte.id, {
          statusExtracao: 'erro',
          extracaoLog: logExtracao,
        })
      } catch {}
    }

    return NextResponse.json({
      ok: true,
      encarte,
      produtosExtraidos,
      log: logExtracao,
    })
  } catch (e: any) {
    console.error('[encarte upload] erro:', e)
    return NextResponse.json({ erro: 'Erro ao enviar encarte: ' + String(e) }, { status: 500 })
  }
}