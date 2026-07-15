/**
 * EncarteBrasil PDF Parser
 *
 * Extrai dados de produtos (nome, marca, preço, unidade) de encartes PDF
 * de supermercados brasileiros.
 *
 * Suporta DOIS formatos comuns:
 *   1) Preço em linha separada:  "Arroz Tipo 1" \n "R$ 5,49 un."
 *   2) Preço na mesma linha:    "Banana Caturra kg R$ 4,99"
 *
 * IMPORTANTE: encartes BR são quase 100% MAIÚSCULOS. Os filtros de ruído
 * são cirúrgicos — só eliminam o que é claramente marketing/legal.
 */

// Tipos e parser de texto — sem dependência de módulo externo no import principal
// PDFParse e pdfjs-dist são importados dinamicamente dentro das funções

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface ProdutoExtraido {
  nome: string
  marca: string | null
  preco: string
  unidade: string | null
}

// ── Frases de marketing COMPLETAS a ignorar (só matches exatos) ───────────

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
  /ofertas?\s*(válida|sujeita)/i,
  /enquanto\s+durarem\s+(os\s+)?estoques/i,
  /imagens?\s+meramente\s+ilustrativa/i,
  /garantimos?\s+(a\s+)?quantidade/i,
  /formas?\s+de\s+pagamento/i,
  /dinheiro.*pix.*cart/i,
  /produtos?\s+(sujeitos?\s+)?à\s+disponibilidade/i,
  /preços?\s+válidos/i,
  /--\s*\d+\s+of\s+\d+\s*--/,
  /consulte\s+condi/i,
  /quantidades?\s+limitada/i,
  /este\s+encarte\s+é\s+fictício/i,
  /criado\s+exclusivamente\s+para/i,
  /clientes?\s+cadastrado/i,
]

// Padrão para detectar linhas que são apenas unidade
const UNIT_ONLY = /^(un\.?|kg|g|ml|l|cx|pct|dz|unidade)$/i

// Preço no INÍCIO da linha (formato 1: preço em linha separada)
const PRICE_LINE_REGEX = /^R\$\s*(\d+[.,]\d{2})/

// Preço em QUALQUER posição da linha (formato 2: preço inline)
const PRICE_INLINE_REGEX = /R\$\s*(\d+[.,]\d{2})/

// Unidade após preço
const PRICE_UNIT_REGEX = /R\$\s*[\d.,]+\s*(un\.?|kg|g|ml|l)/i

// Padrão para detectar preço com unidade no final: "R$ 5,49" ou "R$ 5,49 un."
const TAIL_PRICE_REGEX = /R\$\s*\d+[.,]\d{2}\s*(un\.?|kg|g|ml|l)?\s*$/

// Cabeçalhos de seção do encarte (com & ou sozinhos)
const SECTION_HEADERS = [
  /^mercearia/i,
  /^açougue/i,
  /^frios/i,
  /^hortifruti/i,
  /^higiene/i,
  /^limpeza/i,
  /^bebidas/i,
  /^laticínios/i,
  /^padaria/i,
  /^básicos/i,
  /^lácteos/i,
  /^carnes/i,
  /^verduras/i,
  /^frutas/i,
  /^legumes/i,
  /^latic[ií]nios/i,
]

/**
 * Verifica se uma linha é ruído puro.
 */
function isNoise(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return true
  if (trimmed.length < 4) return true
  if (/^\d+$/.test(trimmed)) return true
  if (/^[^\wáéíóúãõâêîôûçÁÉÍÓÚÃÕÂÊÎÔÛÇ]+$/i.test(trimmed)) return true
  if (UNIT_ONLY.test(trimmed)) return true
  if (/--\s*\d+\s+of\s+\d+\s*--/.test(trimmed)) return true

  for (const pattern of LEGAL_PATTERNS) {
    if (pattern.test(trimmed)) return true
  }

  const upper = trimmed.toUpperCase().trim()
  if (MARKETING_PHRASES.has(upper)) return true

  // Cabeçalhos de seção curtos sem preço
  for (const header of SECTION_HEADERS) {
    if (header.test(trimmed) && trimmed.length < 40 && !PRICE_INLINE_REGEX.test(trimmed)) return true
  }

  // "AÇOUGUE & FRIOS (PREÇO POR KG)" — header composto sem preço real
  if (/\&\s*(FRIOS|DERIVADOS|BÁSICOS)/i.test(trimmed) && !PRICE_INLINE_REGEX.test(trimmed)) return true
  if (/\(PREÇO\s+POR\s+KG\)/i.test(trimmed)) return true

  // Emojis puros
  if (/^[\u{1F300}-\u{1FAFF}\s]+$/u.test(trimmed)) return true

  // "ENCARTE ESPECIAL..."
  if (/^ENCARTE\s+(ESPECIAL|DA\s+SEMANA|DA\s+QUINZENA)/i.test(trimmed)) return true

  // "PRODUTO UNIDADE PREÇO" — header de tabela
  if (/^PRODUTO\s+UNIDADE\s+PREÇO/i.test(trimmed)) return true

  // Nome do mercado curto sem preço
  if (/^(SUPERMERCADO|MERCADO|ATACADO)\s+/i.test(trimmed) && trimmed.length < 40 && !PRICE_INLINE_REGEX.test(trimmed)) return true

  // "DE R$ XX POR APENAS" — frase de marketing
  if (/^DE\s+R\$\s*\d+[.,]\d{2}\s+POR\s+APENAS/i.test(trimmed)) return true

  // Emojis com texto curto tipo "🔥 ENCARTE ESPECIAL"
  if (/^[\u{1F300}-\u{1FAFF}]/u.test(trimmed) && trimmed.length < 80 && !PRICE_INLINE_REGEX.test(trimmed)) return true

  // "O ORGULHO DE ECONOMIZAR..." — slogan
  if (/^(O\s+)?ORGULHO\s+DE/i.test(trimmed)) return true

  return false
}

/**
 * Extrai unidade de uma string (detalhes ou preço)
 */
function extractUnit(text: string): string | null {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l|litro[s]?|unidade[s]?|rolo[s]?|pacote[s]?|cx|caixa[s]?|sachê[s]?|bandeja[s]?|garrafa[s]?|pet|vidro[s]?|dose[s]?|pct|dz|dúzia[s]?|un\.?)/i)
  if (m) {
    const num = m[1].replace(',', '.')
    let unit = m[2].toLowerCase()
    if (/^(litro|l)s?$/i.test(unit)) unit = 'L'
    else if (/^(quilo|kg)s?$/i.test(unit)) unit = 'kg'
    else if (/^(grama|g)s?$/i.test(unit)) unit = 'g'
    else if (/^(mililitro|ml)s?$/i.test(unit)) unit = 'ml'
    else if (/^un/i.test(unit)) unit = 'un'
    return `${num}${unit}`
  }
  return null
}

function extractUnitFromPriceLine(line: string): string | null {
  const m = line.match(PRICE_UNIT_REGEX)
  if (m) {
    let unit = m[1].replace('.', '').toLowerCase()
    if (/^un/i.test(unit)) return 'un'
    return unit
  }
  return null
}

/**
 * Extrai marca de uma string
 */
function extractMarca(text: string): string | null {
  const m = text.match(/[-–]\s*Marca\s+(.+)/i) || text.match(/marca[:\s]+(.+)/i)
  return m ? m[1].trim() : null
}

/**
 * Normaliza texto para dedup
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
 * Extrai unidade solta (sem número) do final de um texto.
 * Ex: "Banana Caturra kg" → "kg", "Alface Crespa unidade" → "un"
 */
function extractStandaloneUnit(text: string): string | null {
  const m = text.match(/(?:^|\s)(kg|g|ml|l|unidade|pacote|sachê|bandeja|garrafa|rolo[s]?|cx|caixa[s]?)\s*$/i)
  if (m) {
    let unit = m[1].toLowerCase()
    if (/^(litro|l)s?$/i.test(unit)) return 'L'
    if (/^(quilo|kg)s?$/i.test(unit)) return 'kg'
    if (/^(grama|g)s?$/i.test(unit)) return 'g'
    if (/^(mililitro|ml)s?$/i.test(unit)) return 'ml'
    if (/^un/i.test(unit)) return 'un'
    return unit
  }
  return null
}

/**
 * Tenta extrair um produto de uma linha que tem nome + preço inline.
 * Formato: "Banana Caturra kg R$ 4,99" ou "Arroz Tipo 1 5 kg pacote R$ 24,90"
 */
function tryParseInline(line: string): ProdutoExtraido | null {
  // Precisa ter R$ XX,XX em algum lugar
  const priceMatch = line.match(PRICE_INLINE_REGEX)
  if (!priceMatch) return null

  const precoStr = `R$ ${priceMatch[1].replace('.', ',')}`
  const priceIndex = priceMatch.index!

  // Tudo antes do R$ é o candidato a nome + unidade
  const beforePrice = line.substring(0, priceIndex).trim()
  if (beforePrice.length < 3) return null

  // Remove unidade solta do final do nome (ex: "kg", "unidade", "pacote")
  let nome = beforePrice.replace(/\s+(kg|g|ml|l|unidade|pacote|sachê|bandeja|garrafa|rolo[s]?|cx|caixa[s]?)\s*$/i, '').trim()

  // Se o nome ficou muito curto, usa tudo antes do preço
  if (nome.length < 3) nome = beforePrice

  // Se o nome é só números ou símbolos, ignora
  if (nome.length < 3) return null
  if (/^\d+$/.test(nome)) return null

  // Pega unidade: com número (5kg) ou solta (kg) do trecho antes do preço
  const unidade = extractUnit(beforePrice) || extractStandaloneUnit(beforePrice) || extractUnitFromPriceLine(line.substring(priceIndex))

  return {
    nome,
    marca: null,
    preco: precoStr,
    unidade,
  }
}

/**
 * Parser principal
 */
export function parseProdutosDoTexto(text: string): ProdutoExtraido[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  const produtos: ProdutoExtraido[] = []
  const usedIndices = new Set<number>()
  const seenKeys = new Set<string>()

  // ── PASSO 1: Linhas com preço inline (formato tabela) ─────────────────
  for (let i = 0; i < lines.length; i++) {
    if (usedIndices.has(i)) continue
    if (isNoise(lines[i])) continue
    // Skip se começa com R$ (é preço em linha separada, trata no passo 2)
    if (PRICE_LINE_REGEX.test(lines[i])) continue

    const inline = tryParseInline(lines[i])
    if (!inline) continue

    // Verifica se nome não é ruído
    if (isNoise(inline.nome)) continue
    if (inline.nome.length < 3) continue

    const dedupKey = `${normalizeForDedup(inline.nome)}|${inline.preco}`
    if (seenKeys.has(dedupKey)) continue
    seenKeys.add(dedupKey)

    produtos.push(inline)
    usedIndices.add(i)
  }

  // ── PASSO 2: Nome em uma linha, preço na próxima (formato encarte) ──
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (usedIndices.has(i)) continue
    if (isNoise(line)) continue
    // Skip se é linha de preço
    if (PRICE_LINE_REGEX.test(line)) continue
    // Skip se tem preço inline (já tratado no passo 1)
    if (PRICE_INLINE_REGEX.test(line)) continue
    // Precisa ter pelo menos 3 letras
    const letters = line.replace(/[^a-zA-ZÁÉÍÓÚÃÕÂÊÎÔÛÇàáéíóúãõâêîôûç]/g, '')
    if (letters.length < 3) continue
    // Muito curto
    if (line.length < 4) continue

    // Busca preço nas próximas 1-5 linhas
    let precoStr: string | null = null
    let priceLineIndex = -1
    let priceUnit: string | null = null

    for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
      if (usedIndices.has(j)) continue
      const priceMatch = lines[j].match(PRICE_LINE_REGEX)
      if (priceMatch) {
        precoStr = `R$ ${priceMatch[1].replace('.', ',')}`
        priceUnit = extractUnitFromPriceLine(lines[j])
        priceLineIndex = j
        break
      }
    }

    if (!precoStr) continue

    // Tenta encontrar detalhes (unidade/marca) entre nome e preço
    let detailsLine = ''
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      if (j === priceLineIndex) continue
      if (usedIndices.has(j)) continue
      if (!isNoise(lines[j]) && !PRICE_LINE_REGEX.test(lines[j])) {
        detailsLine = lines[j]
        usedIndices.add(j)
        break
      }
    }

    const unidade = extractUnit(detailsLine) || priceUnit || null
    const marca = extractMarca(detailsLine)

    // Limpa nome
    let nomeLimpo = line.replace(/\s+[-–]\s+.*$/, '').trim()
    if (nomeLimpo.length < 4) nomeLimpo = line.trim()

    const dedupKey = `${normalizeForDedup(nomeLimpo)}|${precoStr}`
    if (seenKeys.has(dedupKey)) continue
    seenKeys.add(dedupKey)

    produtos.push({
      nome: nomeLimpo,
      marca,
      preco: precoStr,
      unidade,
    })

    usedIndices.add(i)
    if (priceLineIndex >= 0) usedIndices.add(priceLineIndex)
  }

  // ── Dedup final: mesmo nome normalizado → mantém o mais longo ────────
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
 * Extrai texto de um buffer de PDF e retorna os produtos.
 * Método 1: PDFParse (pdf-parse v2) — melhor reconstrução de linhas/colunas
 * Método 2: pdfjs-dist direto — fallback mais robusto no Render
 */
export async function extrairProdutosDoPDF(pdfBuffer: Buffer | Uint8Array): Promise<{
  produtos: ProdutoExtraido[]
  textoBruto: string
  totalPaginas: number
}> {
  let textoBruto = ''
  let totalPaginas = 0

  // Método 1: PDFParse (melhor para colunas lado a lado)
  try {
    const { PDFParse } = await import('pdf-parse')
    const uint8 = pdfBuffer instanceof Buffer ? new Uint8Array(pdfBuffer) : pdfBuffer
    const parser = new PDFParse(uint8)
    const result = await parser.getText()
    textoBruto = result.text || ''
    totalPaginas = result.pages?.length || 0
    console.log(`[pdf-parser] PDFParse: ${textoBruto.length} chars, ${totalPaginas} páginas`)
  } catch (e1: any) {
    console.error('[pdf-parser] PDFParse falhou:', e1?.message || e1)

    // Método 2: pdfjs-dist direto (sem worker, mais robusto)
    try {
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js').then((m: any) => m.default || m)
      const uint8 = pdfBuffer instanceof Buffer ? new Uint8Array(pdfBuffer) : pdfBuffer
      const doc = await pdfjsLib.getDocument({
        data: uint8,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
      }).promise
      totalPaginas = doc.numPages
      const allLines: string[] = []

      for (let i = 1; i <= totalPaginas; i++) {
        const page = await doc.getPage(i)
        const content = await page.getTextContent()
        const items = (content.items as any[])
          .filter((it: any) => it.str && it.str.trim().length > 0)
          .map((it: any) => ({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width || 0 }))

        if (items.length === 0) continue
        items.sort((a: any, b: any) => {
          const yd = b.y - a.y
          return Math.abs(yd) > 3 ? yd : a.x - b.x
        })

        let line = [items[0]]
        let ly = items[0].y
        for (let j = 1; j < items.length; j++) {
          const yd = Math.abs(items[j].y - ly)
          if (yd > 3) {
            allLines.push(line.map((it: any) => it.str).join(' '))
            line = [items[j]]
            ly = items[j].y
          } else {
            line.push(items[j])
          }
        }
        allLines.push(line.map((it: any) => it.str).join(' '))
      }

      textoBruto = allLines.join('\n')
      await doc.destroy()
      console.log(`[pdf-parser] pdfjs-dist fallback: ${textoBruto.length} chars, ${totalPaginas} páginas`)
    } catch (e2: any) {
      console.error('[pdf-parser] pdfjs-dist também falhou:', e2?.message || e2)
    }
  }

  const produtos = parseProdutosDoTexto(textoBruto)
  console.log(`[pdf-parser] ${produtos.length} produto(s) extraído(s) de ${textoBruto.length} chars`)

  return { produtos, textoBruto, totalPaginas }
}