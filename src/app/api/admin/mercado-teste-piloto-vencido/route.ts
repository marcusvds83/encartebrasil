import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { createHash } from 'crypto'

/**
 * POST /api/admin/mercado-teste-piloto-vencido
 * Cria um mercado de teste com piloto vencido para testar a tela de pagamento.
 * Só pode ser chamado pelo admin.
 */
export async function POST() {
  try {
    const session = await getSession()
    if (!session || session.tipo !== 'admin') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }

    // Verifica se já existe
    const existente = await db.mercado.findUnique({ where: { cnpj: '99887766000155' } })
    if (existente) {
      const e = existente as any
      return NextResponse.json({
        ok: true,
        jaExistia: true,
        login: {
          cnpj: '99.887.766/0001-55',
          email: e.emailLogin,
          senha: 'teste123',
        },
      })
    }

    // Cria mercado com piloto vencido (pilotoFim no passado)
    const agora = new Date()
    const pilotoInicio = new Date(agora.getTime() - 70 * 24 * 60 * 60 * 1000) // 70 dias atrás
    const pilotoFim = new Date(agora.getTime() - 10 * 24 * 60 * 60 * 1000) // 10 dias atrás (vencido)

    const mercado = await db.mercado.create({
      nome: 'Mercado Teste Piloto Vencido',
      cnpj: '99887766000155',
      cidade: 'Rio de Janeiro',
      estado: 'RJ',
      endereco: 'Rua Teste, 123',
      telefone: '(21) 98888-0000',
      emailLogin: 'teste@pilotovencido.com',
      senhaHash: createHash('sha256').update('teste123').digest('hex'),
      mensalidade: 399,
      status: 'piloto',
      pilotoInicio: pilotoInicio.toISOString(),
      pilotoFim: pilotoFim.toISOString(),
      criadoEm: pilotoInicio.toISOString(),
      destaque: false,
      segmento: 'mercados',
      responsavel: 'Teste Piloto Vencido',
      cpf: '98765432100',
      latitude: null,
      longitude: null,
      logoPath: null,
      destaqueInicio: null,
      destaqueFim: null,
    } as any)

    return NextResponse.json({
      ok: true,
      jaExistia: false,
      mercadoId: mercado.id,
      login: {
        cnpj: '99.887.766/0001-55',
        email: 'teste@pilotovencido.com',
        senha: 'teste123',
      },
    })
  } catch (e: any) {
    console.error('[mercado-teste] erro:', e)
    return NextResponse.json({ erro: 'Erro ao criar mercado teste: ' + String(e) }, { status: 500 })
  }
}