import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { enviarEmail } from '@/lib/email'

/**
 * API de contato / suporte
 * Mercado logado: preenche dados do mercado automaticamente
 * Consumidor logado: identifica como consumidor
 * Mensagens ficam armazenadas em memória e podem ser vistas pelo admin via GET
 */

const mensagens: Array<{
  id: string
  tipo: 'mercado' | 'consumidor'
  nome: string
  email: string
  categoria: string
  assunto: string
  mensagem: string
  mercadoNome?: string | null
  criadoEm: string
}> = []

function uid() {
  return 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    const body = await req.json()
    const { categoria, assunto, mensagem, nome, email } = body

    if (!categoria || !assunto || !mensagem) {
      return NextResponse.json({ erro: 'Categoria, assunto e mensagem são obrigatórios' }, { status: 400 })
    }
    if (mensagem.trim().length < 10) {
      return NextResponse.json({ erro: 'A mensagem deve ter pelo menos 10 caracteres' }, { status: 400 })
    }

    let tipo: 'mercado' | 'consumidor' = 'consumidor'
    let msgNome = nome || ''
    let msgEmail = email || ''
    let mercadoNome: string | null = null

    if (session?.tipo === 'mercado') {
      tipo = 'mercado'
      const mercado = await db.mercado.findUnique({ where: { id: session.id } })
      if (mercado) {
        msgNome = (mercado as any).nome || session.nome || ''
        msgEmail = (mercado as any).emailLogin || session.email || ''
        mercadoNome = (mercado as any).nome || null
      }
    } else if (session?.tipo === 'usuario') {
      tipo = 'consumidor'
      msgNome = session.nome || nome || ''
      msgEmail = session.email || email || ''
    }

    if (!msgNome || !msgEmail) {
      return NextResponse.json({ erro: 'Nome e e-mail são obrigatórios' }, { status: 400 })
    }

    const msg = {
      id: uid(),
      tipo,
      nome: msgNome,
      email: msgEmail,
      categoria,
      assunto,
      mensagem: mensagem.trim(),
      mercadoNome,
      criadoEm: new Date().toISOString(),
    }
    mensagens.push(msg)

    // Envia e-mail via Resend (primário) ou SMTP (fallback local)
    const tipoLabel = tipo === 'mercado' ? '[MERCADO]' : '[CONSUMIDOR]'
    const mercadoInfo = mercadoNome ? ` (${mercadoNome})` : ''
    const texto = [
      `Tipo: ${tipo.toUpperCase()}${mercadoInfo}`,
      `Nome: ${msgNome}`,
      `E-mail: ${msgEmail}`,
      `Categoria: ${categoria}`,
      `Assunto: ${assunto}`,
      '', msg.mensagem, '',
      `Enviado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
    ].join('\n')
    const html = texto.replace(/\n/g, '<br>')
    const emailResult = await enviarEmail({
      to: process.env.CONTATO_EMAIL || 'contato@3codenexus.com.br',
      subject: `${tipoLabel}${mercadoInfo} ${categoria}: ${assunto}`,
      html,
      text: texto,
      replyTo: msgEmail,
    })
    if (!emailResult.ok) {
      console.error(`[contato] falha e-mail: ${emailResult.error}`)
    }

    return NextResponse.json({ ok: true, mensagem: 'Mensagem enviada com sucesso!' })
  } catch (e) {
    console.error('[contato] erro:', e)
    return NextResponse.json({ erro: 'Erro ao enviar mensagem' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'admin') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }
    return NextResponse.json({
      mensagens: mensagens.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
      total: mensagens.length,
    })
  } catch {
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}