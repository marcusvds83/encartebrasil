/**
 * EncarteBrasil PDF Parser
 *
 * Extrai dados de produtos (nome, marca, preço, unidade) de encartes PDF
 * de supermercados brasileiros.
 *
 * IMPORTANTE: encartes BR são quase 100% MAIÚSCULOS. Os filtros de ruído
 * devem ser cirúrgicos — só eliminar o que é claramente marketing/legal,
 * sem bloquear nomes de produtos em caixa alta.
 */

import { PDFParse } from 'pdf-parse'
import { readFile } from 'fs/promises'

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface ProdutoExtraido {
  nome: string
  marca: string | null
  preco: string
  unidade: string | null
}

// ── Frases de marketing COMPLETAS a ignorar (só matches exatos ou quase) ────

const MARKETING_PHRASES = new Set([
  'OFERTA', 'SUPER OFERTA', 'MEGA OFERTA', 'OFERTA ESPECIAL',
  'PREÇO IMBATÍVEL', 'APROVEITE', 'IMPERDÍVEL',
  'MELHOR PREÇO', 'O MENOR PREÇO', 'MENOR PREÇO',
  'LEVE MAIS POR MENOS', 'ECONOMIA GARANTIDA', 'ECONOMIA TOTAL',
  'ESPECIAL DE HOJE', 'SÓ HOJE', 'ÚLTIMAS UNIDADES',
  'PREÇO ÚNICO', 'PREÇO ESPECIAL', 'PREÇO BAIXO',
  'FIRE SALE', 'LIQUIDAÇÃO', 'PROMOÇÃO', 'PROMO',
  'QUEIMA DE ESTOQUE', 'DESCONTO',
  'COMPRE E GANHE', 'LEVE 2 PAGUE 1', 'LEVE 3 PAGUE 2',
  'GARANTIA DE FRESQUURA', 'SEMPRE FRESCO',
  'QUALIDADE GARANTIDA', 'PRODUTO SELECIONADO',
])

// Padrões de texto legal / rodapé
const LEGAL_PATTERNS = [
  /ofertas?\s*(válidas?|sujeitas?)/i,
  /enquanto\s+durarem\s+(os\s+)?estoques/i,
  /imagens?\s+meramente\s+ilustrativa/i,
  /garantimos?\s+(a\s+)?quantidade/i,
  /formas?\s+de\s+pagamento/i,
  /dinheiro.*pix.*cart/i,
  /produtos?\s+(sujeitos?\s+)?à\s+disponibilidade/i,
  /preços?\s+válidos/i,
  /--\s*\d+\s+of\s+\d+\s*--/, // page markers: "-- 1 of 2 --"
]

// Padrão para detectar linhas que são apenas unidade
const UNIT_ONLY = /^(un\.?|kg|g|ml|l|cx|pct|dz)$/i

// Padrão para preços: R$ XX,XX seguido opcionalmente de unidade
const PRICE_REGEX = /^R\$\s*(\d+[.,]\d{2})\s*(un\.?|kg|g|ml|l|cx|pct|pacote|dz|par)?/i

// Padrão para detectar preço em qualquer posição da linha
const PRICE_ANYWHERE = /R\$\s*\d+[.,]\d{2}/i

// Padrão para cabeçalhos de seção do encarte
const SECTION_HEADERS = [
  /mercearia/i,
  /açougue/i,
  /frios/i,
  /hortifruti/i,
  /higiene/i,
  /limpeza/i,
  /bebidas/i,
  /laticínios/i,
  /padaria/i,
  /frios\s*&\s*derivados/i,
  /básicos/i,
  /lácteos/i,
  /carnes/i,
  /verduras/i,
  /frutas/i,
  /legumes/i,
]

/**
 * Verifica se uma linha é ruído puro (marketing exato, legal, vazio, etc.)
 * REGRA: ser permissivo. Só bloqueia o que é CLARAMENTE não-produto.
 */
function isNoise(line: string): boolean {
  const trimmed = line.trim()

  // Vazio
  if (!trimmed) return true

  // Muito curto e sem preço
  if (trimmed.length < 4 && !PRICE_ANYWHERE.test(trimmed)) return true

  // Apenas dígitos
  if (/^\d+$/.test(trimmed)) return true

  // Apenas símbolos/pontuação (sem letras)
  if (/^[^\wáéíóúãõâêîôûçÁÉÍÓÚÃÕÂÊÎÔÛÇ]+$/i.test(trimmed)) return true

  // Apenas "un." ou unidade solta
  if (UNIT_ONLY.test(trimmed)) return true

  // Page markers
  if (/--\s*\d+\s+of\s+\d+\s*--/.test(trimmed)) return true

  // Texto legal
  for (const pattern of LEGAL_PATTERNS) {
    if (pattern.test(trimmed)) return true
  }

  // Frases de marketing exatas
  const upper = trimmed.toUpperCase().trim()
  if (MARKETING_PHRASES.has(upper)) return true

  // Cabeçalhos de seção (ex: "MERCEARIA", "AÇOUGUE") — só se for curto e sem preço
  for (const header of SECTION_HEADERS) {
    if (header.test(trimmed) && trimmed.length < 30 && !PRICE_ANYWHERE.test(trimmed)) return true
  }

  // Emojis puros
  if (/^[\u{1F300}-\u{1FAFF}\s]+$/u.test(trimmed)) return true

  // "ENCARTE ESPECIAL DA SEMANA" etc.
  if (/^ENCARTE\s+(ESPECIAL|DA\s+SEMANA|DA\s+QUINZENA)/i.test(trimmed)) return true

  // Linha que é SÓ o nome do mercado (curto, sem preço)
  if (/^(SUPERMERCADO|MERCADO|ATACADO)\s+/i.test(trimmed) && trimmed.length < 35 && !PRICE_ANYWHERE.test(trimmed)) return true

  return false
}


/**
 * Extrai informações de unidade/marca da linha de detalhes
 */
function parseDetails(detailsLine: string): { unidade: string | null; marca: string | null } {
  if (!detailsLine) return { unidade: null, marca: null }

  let unidade: string | null = null
  let marca: string | null = null

  const unitPatterns = [
    /(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l|litro[s]?|metro[s]?|unidade[s]?|rolo[s]?|pacote[s]?|cx|caixa[s]?|sachê[s]?|bandeja[s]?|garrafa[s]?|pet|vidro[s]?|dose[s]?|pct|dz|dúzia[s]?)/i,
    /pacote\s+de\s+(\d+(?:[.,]\d+)?\s*(kg|g|ml|l))/i,
    /garrafa\s+(?:pet\s+)?(\d+(?:[.,]\d+)?\s*(ml|l))/i,
    /bandeja\s+de\s+(\d+(?:[.,]\d+)?\s*(kg|g))/i,
    /(\d+)\s*(rolo[s]?|metros?|m)\b(?!\s*pague)/i,
    /leve\s+\d+\s+pague\s+\d+\s*[-–]\s*(\d+)\s*(m|metros?|rolo[s]?)/i,
  ]

  for (const pattern of unitPatterns) {
    const match = detailsLine.match(pattern)
    if (match) {
      const fullMatch = match[0]
      const numMatch = fullMatch.match(/(\d+(?:[.,]\d+)?)/)
      const unitMatch = fullMatch.match(/(kg|g|ml|l|litro[s]?|unidade[s]?|rolo[s]?|pacote[s]?|cx|caixa[s]?|sachê[s]?|bandeja[s]?|garrafa[s]?|pet|vidro[s]?|dose[s]?|pct|dz|dúzia[s]?)/i)

      if (numMatch && unitMatch) {
        const num = numMatch[1].replace(',', '.')
        const unit = unitMatch[1].toLowerCase()
        let normalizedUnit = unit
        if (unit === 'litros' || unit === 'litro' || unit === 'l') normalizedUnit = 'L'
        else if (unit === 'quilos' || unit === 'quilo' || unit === 'kg') normalizedUnit = 'kg'
        else if (unit === 'gramas' || unit === 'grama' || unit === 'g') normalizedUnit = 'g'
        else if (unit === 'mililitros' || unit === 'mililitro' || unit === 'ml') normalizedUnit = 'ml'

        unidade = `${num}${normalizedUnit}`
      }
      break
    }
  }

  const marcaMatch = detailsLine.match(/[-–]\s*Marca\s+(.+)/i) ||
                     detailsLine.match(/marca[:\s]+(.+)/i)
  if (marcaMatch) {
    marca = marcaMatch[1].trim()
  }

  return { unidade, marca }
}

/**
 * Extrai a unidade da linha de preço (ex: "R$ 19,98 un." → "un")
 */
function extractUnitFromPrice(priceLine: string): string | null {
  const match = priceLine.match(/R\$\s*[\d.,]+\s*(un\.?|kg|g|ml|l)/i)
  return match ? match[1].replace('.', '').toLowerCase() : null
}

/**
 * Normaliza um texto para comparação de duplicatas:
 * minúsculas, sem diacríticos, espaços colapsados.
 */
function normalizeForDedup(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Verifica se uma linha pode ser um nome de produto.
 * PERMISSIVO: aceita maiúsculas (encartes BR são assim).
 * Só rejeita o que é claramente preço, número solto, ou ruído conhecido.
 */
function isValidProductLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false

  // Muito curto
  if (trimmed.length < 4) return false

  // Apenas dígitos
  if (/^\d+$/.test(trimmed)) return false

  // Apenas "un." ou unidade solta
  if (/^un\.?$/i.test(trimmed)) return false

  // Começa com R$ → é linha de preço, não nome
  if (/^R\$/i.test(trimmed)) return false

  // Apenas preço (R$ XX,XX) com nada mais
  if (/^R\$\s*\d+[.,]\d{2}\s*$/i.test(trimmed)) return false

  // Ruído conhecido
  if (isNoise(trimmed)) return false

  // Precisa ter pelo menos 2 caracteres de letra
  const letters = trimmed.replace(/[^a-zA-ZÁÉÍÓÚÃÕÂÊÎÔÛÇàáéíóúãõâêîôûç]/g, '')
  if (letters.length < 2) return false

  return true
}

/**
 * Parser principal: extrai produtos do texto do PDF.
 *
 * Abordagem "name-first": encontra linhas de nome de produto e olha
 * ADIANTE (1-5 linhas) por uma linha de preço (R$ XX,XX).
 */
export function parseProdutosDoTexto(text: string): ProdutoExtraido[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  const produtos: ProdutoExtraido[] = []
  const usedIndices = new Set<number>()
  const seenKeys = new Set<string>()

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (usedIndices.has(i)) continue
    if (!isValidProductLine(line)) continue

    // Busca preço nas próximas 1-5 linhas
    let precoStr: string | null = null
    let priceLineIndex = -1
    let priceUnit: string | null = null

    for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
      if (usedIndices.has(j)) continue
      const priceMatch = lines[j].match(PRICE_REGEX)
      if (priceMatch) {
        precoStr = `R$ ${priceMatch[1].replace('.', ',')}`
        priceUnit = extractUnitFromPrice(lines[j])
        priceLineIndex = j
        break
      }
    }

    // Sem preço encontrado → não é listagem de produto
    if (!precoStr) continue

    // Tenta encontrar detalhes (unidade/marca) entre nome e preço, ou após o preço
    let detailsLine = ''
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      if (j === priceLineIndex) continue
      if (usedIndices.has(j)) continue
      if (!isNoise(lines[j]) && !PRICE_REGEX.test(lines[j])) {
        detailsLine = lines[j]
        usedIndices.add(j)
        break
      }
    }

    const { unidade: detailUnit, marca } = parseDetails(detailsLine)
    const unidade = detailUnit || priceUnit || null

    // Limpa o nome (preserva traços em palavras compostas como Contra-Filé)
    let nomeLimpo = line.replace(/\s+[-–]\s+.*$/, '').trim()
    if (nomeLimpo.length < 6) nomeLimpo = line.trim()

    // Deduplicação: normaliza nome+preço e mantém só a primeira ocorrência
    const dedupKey = `${normalizeForDedup(nomeLimpo)}|${precoStr}`
    if (seenKeys.has(dedupKey)) continue
    seenKeys.add(dedupKey)

    produtos.push({
      nome: nomeLimpo,
      marca: marca || null,
      preco: precoStr,
      unidade,
    })

    usedIndices.add(i)
    if (priceLineIndex >= 0) usedIndices.add(priceLineIndex)
  }

  // Post-processing dedup: same normalized name → keep longest
  const dedupMap = new Map<string, ProdutoExtraido>()
  for (const p of produtos) {
    const key = normalizeForDedup(p.nome)
    const existing = dedupMap.get(key)
    if (!existing || p.nome.length > existing.nome.length) {
      dedupMap.set(key, p)
    }
  }

  return Array.from(dedupMap.values())
}

/**
 * Extrai texto de um buffer de PDF e retorna os produtos
 */
export async function extrairProdutosDoPDF(pdfBuffer: Buffer | Uint8Array): Promise<{
  produtos: ProdutoExtraido[]
  textoBruto: string
  totalPaginas: number
}> {
  const uint8 = pdfBuffer instanceof Buffer ? new Uint8Array(pdfBuffer) : pdfBuffer
  const parser = new PDFParse(uint8)
  const result = await parser.getText()

  const textoBruto = result.text || ''
  const totalPaginas = result.pages?.length || 0

  const produtos = parseProdutosDoTexto(textoBruto)

  return { produtos, textoBruto, totalPaginas }
}