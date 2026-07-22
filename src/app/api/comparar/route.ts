import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Normalização agressiva de nome de produto para comparação.
 *
 * Remove: acentos, maiúsculas, espaços extras, pontuação
 * Remove conectivos: de, da, do, das, dos, e, com, sem, para, a, o
 * Padroniza unidades: litros→l, quilos→kg, gramas→g, mililitros→ml
 * Remove unidades isoladas: kg, g, ml, l, un, cx
 * Remove espaços completamente
 *
 * Exemplos:
 *   "Bandeja de 30 Ovos"     → "30ovos"
 *   "Bandeja 30 ovos"        → "30ovos"
 *   "Arroz Tipo 1 5kg"       → "arroz1"
 *   "Arroz tipo 1 - 5 kg"    → "arroz1"
 *   "Coca-Cola 2L"           → "cocacola2"
 *   "Coca Cola 2 litros"     → "cocacola2"
 */
function normalizarNomeParaComparacao(nome: string): string {
  if (!nome) return ''

  let result = nome
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos

  // Remove pontuação
  result = result.replace(/[.,\-_()[\]/\\:;'"!@#$%&*+=<>?]/g, ' ')

  // Padroniza unidades antes de remover espaços
  result = result.replace(/\b(litros|litro)\b/g, 'l')
  result = result.replace(/\b(quilos|quilo)\b/g, 'kg')
  result = result.replace(/\b(gramas|grama)\b/g, 'g')
  result = result.replace(/\b(mililitros|mililitro)\b/g, 'ml')
  result = result.replace(/\b(unidades|unidade)\b/g, 'un')
  result = result.replace(/\b(caixas|caixa)\b/g, 'cx')
  result = result.replace(/\b(pacotes|pacote)\b/g, 'pct')
  result = result.replace(/\b(duzias|duzia)\b/g, 'dz')

  // Remove conectivos
  const conectivos = [
    'de', 'da', 'do', 'das', 'dos', 'e', 'com', 'sem', 'para', 'pa',
    'a', 'o', 'as', 'os', 'em', 'na', 'no', 'nas', 'nos', 'por', 'p',
    'ou', 'tipo',
  ]
  const palavras = result.split(/\s+/).filter(p => p.length > 0)
  const palavrasFiltradas = palavras.filter(p => !conectivos.includes(p))

  result = palavrasFiltradas.join(' ')

  // Remove unidades isoladas (agora padronizadas)
  result = result.replace(/\b(kg|g|ml|l|un|cx|pct|dz)\b/g, '')

  // Remove espaços completamente
  result = result.replace(/\s+/g, '')

  return result
}

/**
 * GET /api/comparar
 *
 * Compara preços de produtos entre mercados.
 *
 * Regras:
 * - Só compara produtos com o MESMO nome normalizado (agressivo)
 * - Produtos devem ser de mercados DIFERENTES (pelo menos 2)
 * - Se ?cidade=X for passado, filtra só mercados dessa cidade
 * - Ordena por menor preço primeiro
 *
 * Query params:
 *   ?cidade=São Paulo    → filtra só mercados de São Paulo
 *   ?estado=SP           → filtra só mercados de SP
 *   ?mercadoId=123       → filtra só produtos de um mercado específico
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const cidadeFiltro = searchParams.get('cidade')
    const estadoFiltro = searchParams.get('estado')
    const mercadoIdFiltro = searchParams.get('mercadoId')

    console.log(`[comparar] Filtros: cidade=${cidadeFiltro || 'todas'}, estado=${estadoFiltro || 'todos'}, mercadoId=${mercadoIdFiltro || 'nenhum'}`)

    // Busca todos os produtos (findAll já traz mercado com cidade/estado)
    const produtos = await db.produto.findAll()
    console.log(`[comparar] Total de produtos encontrados: ${produtos.length}`)

    // Filtra por cidade/estado se passado
    let produtosFiltrados = produtos
    if (cidadeFiltro) {
      produtosFiltrados = produtosFiltrados.filter((p: any) =>
        p.mercado?.cidade?.toLowerCase() === cidadeFiltro.toLowerCase()
      )
      console.log(`[comparar] Após filtro cidade "${cidadeFiltro}": ${produtosFiltrados.length} produtos`)
    }
    if (estadoFiltro) {
      produtosFiltrados = produtosFiltrados.filter((p: any) =>
        p.mercado?.estado?.toUpperCase() === estadoFiltro.toUpperCase()
      )
      console.log(`[comparar] Após filtro estado "${estadoFiltro}": ${produtosFiltrados.length} produtos`)
    }
    if (mercadoIdFiltro) {
      produtosFiltrados = produtosFiltrados.filter((p: any) => p.mercadoId === mercadoIdFiltro)
    }

    // Filtra produtos sem preço válido
    produtosFiltrados = produtosFiltrados.filter((p: any) => {
      if (!p.preco) return false
      const precoNum = parseFloat(String(p.preco).replace(/[^\d,]/g, '').replace(',', '.')) || 0
      return precoNum > 0
    })
    console.log(`[comparar] Produtos com preço válido: ${produtosFiltrados.length}`)

    // Agrupa por nome normalizado (agressivo)
    const grouped: Record<string, any> = {}
    for (const p of produtosFiltrados as any[]) {
      const nomeNormalizado = normalizarNomeParaComparacao(p.normalizado || p.nome || '')

      if (!nomeNormalizado || nomeNormalizado.length < 2) continue

      if (!grouped[nomeNormalizado]) {
        grouped[nomeNormalizado] = {
          nome: nomeNormalizado,
          nomeOriginal: p.nome,
          produtos: [],
        }
      }

      const precoNum = parseFloat(String(p.preco).replace(/[^\d,]/g, '').replace(',', '.')) || 0

      grouped[nomeNormalizado].produtos.push({
        id: p.id,
        nome: p.nome,
        marca: p.marca || null,
        preco: p.preco,
        precoNum,
        unidade: p.unidade || null,
        mercado: {
          id: p.mercado?.id || p.mercadoId || '',
          nome: p.mercado?.nome || 'Desconhecido',
          cidade: p.mercado?.cidade || '',
          estado: p.mercado?.estado || '',
        },
      })
    }

    console.log(`[comparar] Grupos de produtos (nomes únicos normalizados): ${Object.keys(grouped).length}`)

    // Só mantém grupos com 2+ mercados diferentes
    const comparacoes = Object.values(grouped)
      .filter((group: any) => {
        const marketIds = new Set((group.produtos as any[]).map((p: any) => p.mercado.id))
        return marketIds.size >= 2
      })
      .map((group: any) => ({
        normalizado: group.nome,
        nome: group.nomeOriginal,
        produtos: group.produtos.sort((a: any, b: any) => a.precoNum - b.precoNum),
      }))
      .sort((a: any, b: any) => a.normalizado.localeCompare(b.normalizado))

    console.log(`[comparar] Comparações (2+ mercados): ${comparacoes.length}`)

    // Estatísticas para debug
    const stats = {
      totalProdutos: produtosFiltrados.length,
      nomesUnicos: Object.keys(grouped).length,
      comparacoes: comparacoes.length,
      mercadosEnvolvidos: new Set(
        comparacoes.flatMap((c: any) => c.produtos.map((p: any) => p.mercado.id))
      ).size,
    }
    console.log(`[comparar] Stats:`, stats)

    return NextResponse.json({ comparacoes, stats })
  } catch (e: any) {
    console.error('[comparar] erro:', e)
    return NextResponse.json({ erro: 'Erro ao comparar: ' + String(e?.message || e) }, { status: 500 })
  }
}
