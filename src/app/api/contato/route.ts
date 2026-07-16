import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

const ODOO_WEBHOOK_URL = 'https://panfletosbrasil.odoo.com/web/hook/a1968b1c-2885-46f2-b77b-88cd76337459'
const ODOO_API_KEY = 'dfb4bca4b7563ed7fa4f7664d1d61ef2fdf9a4ee'

/**
 * API de contato / suporte
 * Mercado logado: preenche dados do mercado automaticamente
 * Consumidor logado: identifica como consumidor
 * Mensagens ficam armazenadas em memória e podem ser vistas pelo admin via GET
 * Envio direto para Odoo Helpdesk via webhook (sem e-mail)
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
  telefone?: string
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
    let telefone = ''

    if (session?.tipo === 'mercado') {
      tipo = 'mercado'
      const mercado = await db.mercado.findUnique({ where: { id: session.id } })
      if (mercado) {
        msgNome = (mercado as any).nome || session.nome || ''
        msgEmail = (mercado as any).emailLogin || session.email || ''
        mercadoNome = (mercado as any).nome || null
        telefone = (mercado as any).telefone || ''
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
      telefone,
      criadoEm: new Date().toISOString(),
    }
    mensagens.push(msg)

    // Monta descrição completa para o ticket Odoo
    const descricao = [
      `Tipo: ${tipo.toUpperCase()}${mercadoNome ? ` (${mercadoNome})` : ''}`,
      `Nome: ${msgNome}`,
      `E-mail: ${msgEmail}`,
      `Telefone: ${telefone || 'Não informado'}`,
      `Categoria: ${categoria}`,
      `Assunto: ${assunto}`,
      '',
      msg.mensagem,
      '',
      `Enviado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
    ].join('\n')

    // Envia para Odoo Helpdesk via webhook
    try {
      const odooPayload = {
        partner_id: tipo === 'mercado' ? 'MERCADO' : 'CONSUMIDOR',
        partner_phone: telefone || '',
        x_studio_contato_do_mercado_1: msgNome,
        x_studio_related_email_1: msgEmail,
        description: descricao,
        x_studio_categoria: categoria,
      }
      console.log(`[contato] Odoo payload: ${JSON.stringify(odooPayload)}`)
      const odooRes = await fetch(ODOO_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': ODOO_API_KEY,
        },
        body: JSON.stringify(odooPayload),
      })
      if (odooRes.ok) {
        console.log(`[contato] Odoo OK — status ${odooRes.status}`)
      } else {
        const errText = await odooRes.text().catch(() => '')
        console.error(`[contato] Odoo erro ${odooRes.status}: ${errText}`)
      }
    } catch (odooErr: any) {
      console.error(`[contato] Odoo falha: ${odooErr?.message || odooErr}`)
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