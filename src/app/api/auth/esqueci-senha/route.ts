import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHash } from 'crypto'

function hashSenha(s: string) {
  return createHash('sha256').update(s).digest('hex')
}

/**
 * POST /api/auth/esqueci-senha
 * Para demo mode, permite redefinir a senha se o e-mail + CNPJ (para mercado) ou e-mail (para usuario) existirem.
 *
 * Body:
 *   { email, novaSenha, tipo: 'usuario' | 'mercado', cnpj?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { email, novaSenha, tipo, cnpj } = await req.json()

    if (!email || !novaSenha || !tipo) {
      return NextResponse.json({ erro: 'Preencha todos os campos' }, { status: 400 })
    }

    if (novaSenha.length < 6) {
      return NextResponse.json({ erro: 'Nova senha deve ter no mínimo 6 caracteres' }, { status: 400 })
    }

    if (tipo === 'mercado') {
      // Mercado: precisa CNPJ + email
      const cnpjLimpo = (cnpj || '').replace(/\D/g, '')
      if (cnpjLimpo.length !== 14) {
        return NextResponse.json({ erro: 'CNPJ inválido. Digite 14 dígitos.' }, { status: 400 })
      }
      const mercado: any = await db.mercado.findUnique({ where: { cnpj: cnpjLimpo } })
      if (!mercado) {
        return NextResponse.json({ erro: 'CNPJ não encontrado' }, { status: 404 })
      }
      if (mercado.emailLogin !== email) {
        return NextResponse.json({ erro: 'E-mail não corresponde ao CNPJ informado' }, { status: 400 })
      }
      await db.mercado.update(mercado.id, { senhaHash: hashSenha(novaSenha) })
      return NextResponse.json({ ok: true, mensagem: 'Senha atualizada com sucesso!' })
    }

    if (tipo === 'usuario') {
      // Consumidor PF
      const usuario: any = await db.usuario.findUnique({ where: { email } })
      if (!usuario) {
        return NextResponse.json({ erro: 'E-mail não cadastrado' }, { status: 404 })
      }
      await db.usuario.update(usuario.id, { senhaHash: hashSenha(novaSenha) })
      return NextResponse.json({ ok: true, mensagem: 'Senha atualizada com sucesso!' })
    }

    return NextResponse.json({ erro: 'Tipo inválido. Use "usuario" ou "mercado".' }, { status: 400 })
  } catch (e) {
    console.error('[esqueci-senha] erro:', e)
    return NextResponse.json({ erro: 'Erro interno: ' + String(e) }, { status: 500 })
  }
}