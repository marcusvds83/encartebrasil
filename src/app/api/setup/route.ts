import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHash } from 'crypto'
import { calcularDadosAcessoNovoMercado } from '@/lib/piloto'

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
    const adminExistente = await db.admin.findUnique({ where: { email: 'admin@panfletosbrasil.com' } })
    if (!adminExistente) {
      await db.admin.create({
        email: 'admin@panfletosbrasil.com',
        senhaHash: hashSenha('admin123'),
      } as any)
      resultados.push('Admin criado: admin@panfletosbrasil.com / admin123')
    } else {
      resultados.push('Admin ja existe: admin@panfletosbrasil.com')
    }

    // 2. Cria mercado demo se não existir
    const mercadoExistente = await db.mercado.findUnique({ where: { cnpj: '11222333000181' } })
    let mercadoId: string = ''
    if (!mercadoExistente) {
      const agora = new Date()
      const { status, pilotoInicio, pilotoFim } = calcularDadosAcessoNovoMercado(agora)
      const novoMercado: any = await db.mercado.create({
        nome: 'Supermercado Central Demo',
        cnpj: '11222333000181',
        cidade: 'São Paulo',
        estado: 'SP',
        endereco: 'Av. Paulista, 1000',
        telefone: '(11) 99999-0000',
        emailLogin: 'super@central.com',
        senhaHash: hashSenha('super123'),
        mensalidade: 399,
        status,
        pilotoInicio,
        pilotoFim,
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
      mercadoId = novoMercado.id
      resultados.push('Mercado demo criado: CNPJ 11.222.333/0001-81 / super@central.com / super123')
    } else {
      mercadoId = (mercadoExistente as any).id
      resultados.push('Mercado demo ja existe')
    }

    // 3. Garante que a coleção "listas" existe (cria placeholder se vazio)
    try {
      const listasExistentes = await (db.listaCompras as any).findMany?.({ where: { sessionId: '__setup_check__' } }) || []
      if (!Array.isArray(listasExistentes) || listasExistentes.length === 0) {
        // Tenta criar um doc placeholder para garantir que a coleção existe no Firestore
        await db.listaCompras.create({
          sessionId: '__setup_check__',
          nome: '__setup__',
          marca: null,
          preco: null,
          unidade: null,
          checked: true,
          mercadoNome: null,
          criadoEm: new Date().toISOString(),
        } as any)
        // Remove o placeholder imediatamente
        const placeholder = await (db.listaCompras as any).findMany?.({ where: { sessionId: '__setup_check__' } })
        if (Array.isArray(placeholder) && placeholder.length > 0) {
          await db.listaCompras.delete(placeholder[0].id)
        }
        resultados.push('Colecao "listas" verificada/criada')
      } else {
        resultados.push('Colecao "listas" ja existe')
      }
    } catch (listErr: any) {
      resultados.push(`Aviso: nao foi possivel verificar colecao listas: ${listErr?.message || listErr}`)
    }

    // 4. Garante que a coleção "produtos" existe (cria placeholder se vazio)
    try {
      const prodsCheck = await (db.produto as any).findMany?.({ where: { encarteId: '__setup_check__', mercadoId: '__setup_check__' } }) || []
      if (!Array.isArray(prodsCheck) || prodsCheck.length === 0) {
        await db.produto.create({
          encarteId: '__setup_check__',
          mercadoId: '__setup_check__',
          nome: '__setup__',
          marca: null,
          preco: 'R$ 0,00',
          unidade: null,
          normalizado: '__setup__',
          criadoEm: new Date().toISOString(),
        } as any)
        // Remove placeholder
        const ph = await (db.produto as any).findMany?.({ where: { encarteId: '__setup_check__', mercadoId: '__setup_check__' } })
        if (Array.isArray(ph) && ph.length > 0) {
          await db.produto.deleteMany({ where: { id: ph[0].id, encarteId: '__setup_check__', mercadoId: '__setup_check__' } })
        }
        resultados.push('Colecao "produtos" verificada/criada')
      } else {
        resultados.push('Colecao "produtos" ja existe')
      }
    } catch (prodErr: any) {
      resultados.push(`Aviso: nao foi possivel verificar colecao produtos: ${prodErr?.message || prodErr}`)
    }

    // 5. Cria encarte demo + produtos demo (se não existirem)
    const encartesExistentes = await (db.encarte as any).findMany?.()
    if (!encartesExistentes || encartesExistentes.length === 0) {
      const agora = new Date().toISOString()
      const encarte: any = await db.encarte.create({
        mercadoId,
        titulo: 'Encarte Demo - Ofertas da Semana',
        pdfPath: null,
        statusExtracao: 'concluido',
        extracaoLog: 'Produtos demo criados via setup',
        criadoEm: agora,
      } as any)

      const produtosDemo = [
        { nome: 'Arroz Branco 5kg', marca: 'Tio João', preco: 'R$ 19,90', unidade: '5kg' },
        { nome: 'Feijão Carioca 1kg', marca: 'Camil', preco: 'R$ 8,49', unidade: '1kg' },
        { nome: 'Açúcar Cristal 1kg', marca: 'União', preco: 'R$ 4,99', unidade: '1kg' },
        { nome: 'Café Torrado 500g', marca: 'Pilão', preco: 'R$ 14,90', unidade: '500g' },
        { nome: 'Leite Integral 1L', marca: 'Itambé', preco: 'R$ 4,79', unidade: '1L' },
        { nome: 'Óleo de Soja 900ml', marca: 'Liza', preco: 'R$ 6,49', unidade: '900ml' },
        { nome: 'Macarrão Espaguete 500g', marca: 'Adria', preco: 'R$ 3,29', unidade: '500g' },
        { nome: 'Margarina 500g', marca: 'Becel', preco: 'R$ 7,99', unidade: '500g' },
        { nome: 'Refrigerante 2L', marca: 'Coca-Cola', preco: 'R$ 9,49', unidade: '2L' },
        { nome: 'Biscoito Recheado', marca: 'Trakinas', preco: 'R$ 2,99', unidade: '1un' },
        { nome: 'Detergente 500ml', marca: 'Ypê', preco: 'R$ 1,99', unidade: '500ml' },
        { nome: 'Sabão em Pó 1kg', marca: 'Omo', preco: 'R$ 12,90', unidade: '1kg' },
        { nome: 'Papel Higiênico 12un', marca: 'Personal', preco: 'R$ 8,90', unidade: '12un' },
        { nome: 'Shampoo 350ml', marca: 'Seda', preco: 'R$ 9,90', unidade: '350ml' },
        { nome: 'Carne Moída 1kg', marca: 'Friboi', preco: 'R$ 32,90', unidade: '1kg' },
        { nome: 'Frango Resfriado 1kg', marca: 'Sadia', preco: 'R$ 14,90', unidade: '1kg' },
        { nome: 'Queijo Mussarela 300g', marca: 'Polenghi', preco: 'R$ 12,99', unidade: '300g' },
        { nome: 'Presunto Fatiado 200g', marca: 'Sadia', preco: 'R$ 6,49', unidade: '200g' },
        { nome: 'Pão Francês 6un', marca: 'Padaria', preco: 'R$ 5,40', unidade: '6un' },
        { nome: 'Banana Prata 1kg', marca: null, preco: 'R$ 4,50', unidade: '1kg' },
      ]
      for (const p of produtosDemo) {
        await db.produto.create({
          encarteId: encarte.id,
          mercadoId,
          nome: p.nome,
          marca: p.marca,
          preco: p.preco,
          unidade: p.unidade,
          normalizado: p.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
          criadoEm: agora,
        } as any)
      }
      resultados.push(`Encarte demo criado com ${produtosDemo.length} produtos`)
    } else {
      resultados.push(`Encartes ja existem (${encartesExistentes.length})`)
    }

    // 6. Cria "Mercadinho da Lu" — empresa no 2º mês (ativo, próximo pgto em 2 dias) para testar aviso D-3
    const mercadinhoLuExistente = await db.mercado.findUnique({ where: { cnpj: '33333333000133' } })
    if (!mercadinhoLuExistente) {
      const agoraMs = Date.now()
      const ultimoPagamento = new Date(agoraMs - 28 * 24 * 60 * 60 * 1000) // 28 dias atrás
      const dataProximoPagamento = new Date(agoraMs + 2 * 24 * 60 * 60 * 1000) // 2 dias à frente
      const pilotoFim = new Date(agoraMs - 3 * 24 * 60 * 60 * 1000) // piloto já venceu há 3 dias

      await db.mercado.create({
        nome: 'Mercadinho da Lu',
        cnpj: '33333333000133',
        cidade: 'Belo Horizonte',
        estado: 'MG',
        endereco: 'Rua das Flores, 456',
        telefone: '(31) 98888-1234',
        emailLogin: 'lu@mercadinho.com',
        senhaHash: hashSenha('lu123456'),
        mensalidade: 399,
        status: 'ativo',
        pilotoInicio: new Date(agoraMs - 33 * 24 * 60 * 60 * 1000).toISOString(), // 33 dias atrás
        pilotoFim: pilotoFim.toISOString(),
        criadoEm: new Date(agoraMs - 33 * 24 * 60 * 60 * 1000).toISOString(),
        destaque: false,
        destaqueInicio: null,
        destaqueFim: null,
        latitude: null,
        longitude: null,
        logoPath: null,
        responsavel: 'Luiza Silva',
        cpf: '98765432100',
        segmento: 'mercados',
        formaPagamento: 'pix',
        ultimoPagamento: ultimoPagamento.toISOString(),
        ultimoPagamentoValor: 399,
        dataProximoPagamento: dataProximoPagamento.toISOString(),
        dataEscolhaPagamento: new Date(agoraMs - 28 * 24 * 60 * 60 * 1000).toISOString(),
      } as any)
      resultados.push('Mercadinho da Lu criado: CNPJ 33.333.333/0001-33 / lu@mercadinho.com / lu123456 (ativo, 2º mês, próximo pgto em 2 dias)')
    } else {
      resultados.push('Mercadinho da Lu ja existe')
    }

    return NextResponse.json({
      ok: true,
      mensagem: 'Setup concluido com sucesso!',
      resultados,
      credenciais: {
        admin: { email: 'admin@panfletosbrasil.com', senha: 'admin123' },
        mercado: {
          cnpj: '11.222.333/0001-81',
          email: 'super@central.com',
          senha: 'super123',
        },
        mercadinhoLu: {
          cnpj: '33.333.333/0001-33',
          email: 'lu@mercadinho.com',
          senha: 'lu123456',
          obs: '2º mês, próximo pagamento em 2 dias (teste do aviso D-3)',
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
