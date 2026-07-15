import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { readFile } from 'fs/promises'
import path from 'path'

/**
 * GET /api/encarte/[id]/pdf — serve o PDF do encarte para visualização.
 * Retorna o arquivo PDF com content-type application/pdf.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    // Busca o encarte para pegar o pdfPath
    // Como não temos findUnique por id direto, buscamos via mercados e filtramos
    const mercados = await db.mercado.findMany()
    let encarte: any = null
    for (const m of mercados) {
      const detail: any = await db.mercado.findUniqueWithRelations(m.id)
      const found = detail?.encartes?.find((e: any) => e.id === id)
      if (found) {
        encarte = found
        break
      }
    }

    if (!encarte) {
      return NextResponse.json({ erro: 'Encarte não encontrado' }, { status: 404 })
    }

    if (!encarte.pdfPath) {
      return NextResponse.json({ erro: 'Encarte sem PDF' }, { status: 404 })
    }

    const filePath = path.join('/tmp/uploads', encarte.pdfPath)
    let buffer: Buffer
    try {
      buffer = await readFile(filePath)
    } catch {
      return NextResponse.json({ erro: 'Arquivo PDF não encontrado no servidor' }, { status: 404 })
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encarte.titulo || 'encarte'}.pdf"`,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (e) {
    console.error('[pdf] erro:', e)
    return NextResponse.json({ erro: 'Erro ao servir PDF' }, { status: 500 })
  }
}
