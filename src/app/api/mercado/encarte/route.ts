import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

/**
 * Extrai produtos de um texto de encarte (PDF).
 * Procura por linhas com padrão: NOME PRODUTO ... R$ XX,XX
 */
interface ProdutoExtraido {
  nome: string
  marca?: string | null
  preco: string
  unidade?: string | null
}

function extrairProdutosDoTexto(texto: string): ProdutoExtraido[] {
  const produtos: ProdutoExtraido[] = []
  const vistos = new Set<string>()

  // Padrão 1: Linhas com preço no formato R$ XX,XX ou XX,XX
  const linhas = texto.split(/\r?\n/)

  const precoRegex = /R\$\s*(\d{1,4}(?:\.\d{3})*,\d{2})/g
  const unidadeRegex = /\b(\d+(?:,\d+)?)\s*(kg|g|ml|l|litro|litros|un|unidade|pct|pack|cx|caixa|lata|garrafa|frasco|saco|pacote|bandeja|grama|gramas)\b/i

  for (const linhaOriginal of linhas) {
    const linha = linhaOriginal.trim()
    if (linha.length < 3 || linha.length > 200) continue

    const precos = [...linha.matchAll(precoRegex)]
    if (precos.length === 0) continue

    const preco = `R$ ${precos[0][1]}`
    let nome = linha.replace(precoRegex, '').replace(/\s+/g, ' ').trim()
    nome = nome.replace(/^[\d\.\-\*]+\s*/, '').trim()

    const unidadeMatch = nome.match(unidadeRegex)
    let unidade: string | null = null
    if (unidadeMatch) {
      unidade = `${unidadeMatch[1]}${unidadeMatch[2]}`
    }

    if (nome.length < 3) continue

    const chave = `${nome}|${preco}`
    if (vistos.has(chave)) continue
    vistos.add(chave)

    produtos.push({
      nome: nome.substring(0, 100),
      marca: null,
      preco,
      unidade,
    })
  }

  // Padrão 2: texto em uma linha só (pdfjs junta tudo)
  // Procura por "Nome Produto R$ XX,XX" em sequência
  if (produtos.length === 0) {
    const regexInline = /([A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç][A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç\s\d\.,-]{2,80}?)\s+R\$\s*(\d{1,4}(?:\.\d{3})*,\d{2})/g
    let match
    while ((match = regexInline.exec(texto)) !== null) {
      const nome = match[1].trim().replace(/^[\d\.\-\*]+\s*/, '').trim()
      const preco = `R$ ${match[2]}`
      if (nome.length < 3) continue
      const chave = `${nome}|${preco}`
      if (vistos.has(chave)) continue
      vistos.add(chave)

      const unidadeMatch = nome.match(unidadeRegex)
      produtos.push({
        nome: nome.substring(0, 100),
        marca: null,
        preco,
        unidade: unidadeMatch ? `${unidadeMatch[1]}${unidadeMatch[2]}` : null,
      })
    }
  }

  return produtos
}

/** Extrai texto de um PDF usando pdfjs-dist (worker desabilitado) */
async function extrairTextoPDF(buffer: Buffer): Promise<string> {
  let workerSrc: string | null = null
  try {
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js')
    const path = require('path')
    const fs = require('fs')

    // Tenta encontrar o worker no node_modules
    const workerPaths = [
      path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.js'),
      path.join(__dirname, '..', '..', '..', '..', 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.js'),
      path.join(__dirname, '..', '..', '..', '..', '..', '..', 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.js'),
    ]
    for (const p of workerPaths) {
      if (fs.existsSync(p)) {
        workerSrc = p
        break
      }
    }

    // Se encontrou o worker, configura; senão, tenta sem worker
    if (workerSrc && pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc
    }

    const uint8 = new Uint8Array(buffer)
    const doc = await pdfjsLib.getDocument({
      data: uint8,
      disableFontFace: true,
      useSystemFonts: false,
      isEvalSupported: false,
      // Passa o worker port diretamente para evitar problema de path
      worker: workerSrc ? new pdfjsLib.PDFWorker() : undefined,
    }).promise

    let allText = ''
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      let lastY: number | null = null
      const parts: string[] = []
      for (const item of content.items as any[]) {
        const y = item.transform?.[5]
        if (lastY !== null && y !== undefined && Math.abs(y - lastY) > 5) {
          parts.push('\n')
        }
        parts.push(item.str)
        if (y !== undefined) lastY = y
      }
      allText += parts.join(' ') + '\n'
    }
    return allText
  } catch (e: any) {
    console.error('[pdf] erro ao extrair texto:', e?.message || String(e))
    throw new Error('Falha ao extrair texto do PDF: ' + (e?.message || String(e)))
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'mercado') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }
    const formData = await req.formData()
    const file = formData.get('pdf') as File | null
    const titulo = formData.get('titulo') as string | null
    if (!file || !titulo) {
      return NextResponse.json({ erro: 'PDF e título obrigatórios' }, { status: 400 })
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
      statusExtracao: 'processando',
      extracaoLog: 'PDF recebido, iniciando extração...',
      criadoEm: new Date().toISOString(),
    })

    // Extrai produtos do PDF
    let produtosExtraidos: ProdutoExtraido[] = []
    let logExtracao = 'PDF recebido. '
    try {
      const texto = await extrairTextoPDF(buffer)
      logExtracao += `Texto extraído: ${texto.length} caracteres. `

      produtosExtraidos = extrairProdutosDoTexto(texto)
      logExtracao += `${produtosExtraidos.length} produtos encontrados.`

      // Salva os produtos extraídos no Firestore
      let salvos = 0
      for (const p of produtosExtraidos) {
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
        } catch (e) {
          // ignora erro de produto individual
        }
      }
      logExtracao += ` ${salvos} produtos salvos.`

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
      produtosExtraidos: produtosExtraidos.length,
      log: logExtracao,
    })
  } catch (e: any) {
    console.error('[encarte upload] erro:', e)
    return NextResponse.json({ erro: 'Erro ao enviar encarte: ' + String(e) }, { status: 500 })
  }
}
