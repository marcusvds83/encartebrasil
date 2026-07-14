import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'mercado') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }
    const formData = await req.formData()
    const file = formData.get('pdf') as File | null
    const titulo = formData.get('titulo') as string | null
    if (!file || !titulo) return NextResponse.json({ erro: 'PDF e título obrigatórios' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = `encarte_${Date.now()}_${file.name}`
    const uploadsDir = '/tmp/uploads'
    await mkdir(uploadsDir, { recursive: true })
    await writeFile(path.join(uploadsDir, filename), buffer)

    const encarte = await db.encarte.create({
      mercadoId: session.id,
      titulo,
      pdfPath: filename,
      statusExtracao: 'concluido',
      extracaoLog: 'PDF recebido manualmente',
      criadoEm: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true, encarte })
  } catch {
    return NextResponse.json({ erro: 'Erro ao enviar encarte' }, { status: 500 })
  }
}
