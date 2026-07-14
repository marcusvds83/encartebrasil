import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHash } from 'crypto'

function hashSenha(s: string) {
  return createHash('sha256').update(s).digest('hex')
}

/**
 * GET /api/setup — popula admin e mercado demo no Firestore (se não existirem).
 * Seguro chamar múltiplas vezes — verifica se já existe antes de criar.
 */
export async function GET(req: NextRequest) {
  try {
    const resultados: string[] = []

    // 1. Cria admin demo se não existir
    const adminExistente = await db.admin.findUnique({ where: { email: 'admin@encartebrasil.com' } })
    if (!adminExistente) {
      await db.admin.create({
        email: 'admin@encartebrasil.com',
        senhaHash: hashSenha('admin123'),
      } as any)
      resultados.push('Admin criado: admin@encartebrasil.com / admin123')
    } else {
      resultados.push('Admin ja existe: admin@encartebrasil.com')
    }

    // 2. Cria mercado demo se não existir
    const mercadoExistente = await db.mercado.findUnique({ where: { cnpj: '11222333000181' } })
    if (!mercadoExistente) {
      const agora = new Date()
      const pilotoFim = new Date(agora.getTime() + 60 * 24 * 60 * 60 * 1000)
      await db.mercado.create({
        nome: 'Supermercado Central Demo',
        cnpj: '11222333000181',
        cidade: 'São Paulo',
        estado: 'SP',
        endereco: 'Av. Paulista, 1000',
        telefone: '(11) 99999-0000',
        emailLogin: 'super@central.com',
        senhaHash: hashSenha('super123'),
        mensalidade: 599,
        status: 'piloto',
        pilotoInicio: agora.toISOString(),
        pilotoFim: pilotoFim.toISOString(),
        criadoEm: agora.toISOString(),
        destaque: true,
        destaqueInicio: agora.toISOString(),
        latitude: null,
        longitude: null,
        logoPath: null,
        destaqueFim: null,
        responsavel: 'Administrador Demo',
        cpf: '12345678901',
      } as any)
      resultados.push('Mercado demo criado: CNPJ 11.222.333/0001-81 / super@central.com / super123')
    } else {
      resultados.push('Mercado demo ja existe')
    }

    return NextResponse.json({
      ok: true,
      mensagem: 'Setup concluido com sucesso!',
      resultados,
      credenciais: {
        admin: { email: 'admin@encartebrasil.com', senha: 'admin123' },
        mercado: {
          cnpj: '11.222.333/0001-81',
          email: 'super@central.com',
          senha: 'super123',
        },
      },
    })
  } catch (e: any) {
    console.error('[setup] erro:', e)
    return NextResponse.json({
      erro: 'Erro no setup',
      message: e?.message || String(e),
      code: e?.code || null,
      stack: e?.stack?.split('\n').slice(0, 5) || null,
    }, { status: 500 })
  }
}
