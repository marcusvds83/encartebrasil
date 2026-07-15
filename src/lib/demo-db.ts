/**
 * EncarteBrasil Demo DB — armazenamento em memória (sem Firebase, sem Prisma).
 * Ativado quando a env var DEMO_MODE=true.
 *
 * Dados pré-cadastrados:
 *   Admin:    admin@encartebrasil.com / admin123
 *   Mercado:  CNPJ 11.222.333/0001-81 / super@central.com / super123
 *   Usuario PF: criado automaticamente no primeiro login Google
 *
 * Observação: dados são perdidos a cada reinício do processo (Render free
 * hiberna depois de 15 min). Para hoje é suficiente para testar APK +
 * upload de PDF.
 */
import { createHash } from 'crypto'

function hashSenha(s: string) {
  return createHash('sha256').update(s).digest('hex')
}

interface Mercado {
  id: string
  nome: string
  cnpj: string
  cidade: string
  estado: string
  endereco: string | null
  telefone: string | null
  emailLogin: string
  senhaHash: string
  logoPath: string | null
  destaque: boolean
  destaqueInicio: string | null
  destaqueFim: string | null
  pilotoInicio: string
  pilotoFim: string
  mensalidade: number
  status: string
  criadoEm: string
  latitude: number | null
  longitude: number | null
}

interface Usuario {
  id: string
  email: string
  firebaseUid: string | null
  nome: string | null
  photoURL: string | null
  provider: string
  criadoEm: string
  senhaHash?: string
  ativo?: boolean
}

interface Encarte {
  id: string
  mercadoId: string
  titulo: string
  pdfPath: string | null
  dataInicio: string | null
  dataFim: string | null
  statusExtracao: string
  extracaoLog: string | null
  criadoEm: string
}

interface Produto {
  id: string
  encarteId: string
  mercadoId: string
  nome: string
  marca: string | null
  preco: string
  unidade: string | null
  normalizado: string | null
  criadoEm: string
}

interface CliqueProduto {
  id: string
  produtoId: string
  mercadoId: string
  sessionId: string
  criadoEm: string
}

interface ListaCompras {
  id: string
  sessionId: string
  produtoId: string | null
  mercadoId: string | null
  nome: string
  marca: string | null
  preco: string | null
  unidade: string | null
  checked: boolean
  mercadoNome: string | null
  criadoEm: string
}

interface Admin {
  id: string
  email: string
  senhaHash: string
}

// ── Estado em memória ────────────────────────────────────────────────────
const admins: Admin[] = [
  {
    id: 'admin-1',
    email: 'admin@encartebrasil.com',
    senhaHash: hashSenha('admin123'),
  },
]

const agora = new Date()
const pilotoFim = new Date(agora.getTime() + 60 * 24 * 60 * 60 * 1000)

const mercados: Mercado[] = [
  {
    id: 'mercado-1',
    nome: 'Supermercado Central Demo',
    cnpj: '11222333000181',
    cidade: 'São Paulo',
    estado: 'SP',
    endereco: 'Av. Paulista, 1000',
    telefone: '(11) 99999-0000',
    emailLogin: 'super@central.com',
    senhaHash: hashSenha('super123'),
    logoPath: null,
    destaque: true,
    destaqueInicio: agora.toISOString(),
    destaqueFim: null,
    pilotoInicio: agora.toISOString(),
    pilotoFim: pilotoFim.toISOString(),
    mensalidade: 599,
    status: 'piloto',
    criadoEm: agora.toISOString(),
    latitude: null,
    longitude: null,
  },
]

const usuarios: Usuario[] = []
const encartes: Encarte[] = []
const produtos: Produto[] = []
const cliques: CliqueProduto[] = []
const listas: ListaCompras[] = []

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// ── Implementação da "API" do db (mesma interface do db.ts real) ────────
export const demoDb = {
  admin: {
    findUnique: async (w: { where: { email: string } }) => {
      return admins.find((a) => a.email === w.where.email) || null
    },

    create: async (data: Record<string, any>) => {
      const novo: Admin = {
        id: uid('admin'),
        email: data.email,
        senhaHash: data.senhaHash,
      }
      admins.push(novo)
      return { ...novo }
    },
  },

  mercado: {
    findMany: async () => {
      return mercados.map((m) => ({
        ...m,
        totalProdutos: produtos.filter((p) => p.mercadoId === m.id).length,
        totalEncartes: encartes.filter((e) => e.mercadoId === m.id).length,
      }))
    },

    findUnique: async (w: {
      where: { id?: string; cnpj?: string; emailLogin?: string }
      select?: Record<string, boolean>
    }) => {
      let m: Mercado | undefined
      if (w.where.id) m = mercados.find((x) => x.id === w.where.id)
      else if (w.where.cnpj) m = mercados.find((x) => x.cnpj === w.where.cnpj)
      else if (w.where.emailLogin) m = mercados.find((x) => x.emailLogin === w.where.emailLogin)
      if (!m) return null
      if (w.select) {
        const picked: any = { id: m.id }
        for (const k of Object.keys(w.select)) {
          if (k in m) (picked as any)[k] = (m as any)[k]
        }
        return picked
      }
      return { ...m }
    },

    findUniqueWithRelations: async (id: string) => {
      const m = mercados.find((x) => x.id === id)
      if (!m) return null
      const mEncs = encartes
        .filter((e) => e.mercadoId === id)
        .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
        .map((e) => ({
          ...e,
          _count: { produtos: produtos.filter((p) => p.encarteId === e.id).length },
        }))
      const mProds = produtos
        .filter((p) => p.mercadoId === id)
        .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
      return { ...m, encartes: mEncs, produtos: mProds }
    },

    create: async (data: Record<string, any>) => {
      const novo: Mercado = {
        id: uid('mercado'),
        nome: data.nome,
        cnpj: data.cnpj,
        cidade: data.cidade,
        estado: data.estado,
        endereco: data.endereco || null,
        telefone: data.telefone || null,
        emailLogin: data.emailLogin,
        senhaHash: data.senhaHash,
        logoPath: data.logoPath || null,
        destaque: data.destaque || false,
        destaqueInicio: data.destaqueInicio || null,
        destaqueFim: data.destaqueFim || null,
        pilotoInicio: data.pilotoInicio || new Date().toISOString(),
        pilotoFim: data.pilotoFim || new Date(Date.now() + 60 * 86400000).toISOString(),
        mensalidade: data.mensalidade || 599,
        status: data.status || 'piloto',
        criadoEm: data.criadoEm || new Date().toISOString(),
        latitude: data.latitude || null,
        longitude: data.longitude || null,
      }
      mercados.push(novo)
      return { ...novo }
    },

    update: async (id: string, data: Record<string, any>) => {
      const i = mercados.findIndex((x) => x.id === id)
      if (i === -1) return null
      mercados[i] = { ...mercados[i], ...data }
      return { ...mercados[i] }
    },

    delete: async (id: string) => {
      const i = mercados.findIndex((x) => x.id === id)
      if (i !== -1) mercados.splice(i, 1)
      // remove nested
      for (let j = produtos.length - 1; j >= 0; j--) {
        if (produtos[j].mercadoId === id) produtos.splice(j, 1)
      }
      for (let j = encartes.length - 1; j >= 0; j--) {
        if (encartes[j].mercadoId === id) encartes.splice(j, 1)
      }
      for (let j = cliques.length - 1; j >= 0; j--) {
        if (cliques[j].mercadoId === id) cliques.splice(j, 1)
      }
    },
  },

  encarte: {
    create: async (data: Record<string, any>) => {
      const novo: Encarte = {
        id: uid('encarte'),
        mercadoId: data.mercadoId,
        titulo: data.titulo,
        pdfPath: data.pdfPath || null,
        dataInicio: data.dataInicio || null,
        dataFim: data.dataFim || null,
        statusExtracao: data.statusExtracao || 'pendente',
        extracaoLog: data.extracaoLog || null,
        criadoEm: data.criadoEm || new Date().toISOString(),
      }
      encartes.push(novo)
      return { ...novo }
    },

    update: async (id: string, data: Record<string, any>) => {
      const i = encartes.findIndex((e) => e.id === id)
      if (i !== -1) {
        encartes[i] = { ...encartes[i], ...data }
        return { ...encartes[i] }
      }
      return null
    },

    findMany: async (opts?: { where?: { mercadoId: string } }) => {
      let list = [...encartes]
      if (opts?.where?.mercadoId) {
        const mid = opts.where.mercadoId
        list = list.filter((e) => e.mercadoId === mid)
      }
      return list.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)).map(e => ({
        ...e,
        _fileSize: encarteFileSizes[e.id] || 0,
      }))
    },

    count: async (opts: { where: { mercadoId: string } }) => {
      return encartes.filter((e) => e.mercadoId === opts.where.mercadoId).length
    },

    delete: async (id: string) => {
      const i = encartes.findIndex((e) => e.id === id)
      if (i !== -1) encartes.splice(i, 1)
      // Remove todos os produtos associados
      for (let j = produtos.length - 1; j >= 0; j--) {
        if (produtos[j].encarteId === id) produtos.splice(j, 1)
      }
    },
  },

  produto: {
    findMany: async (opts: {
      where: { encarteId: string; mercadoId: string }
      orderBy?: Record<string, string>
    }) => {
      return produtos
        .filter((p) => p.encarteId === opts.where.encarteId && p.mercadoId === opts.where.mercadoId)
        .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
    },

    findAll: async () => {
      return produtos.map((p) => {
        const m = mercados.find((x) => x.id === p.mercadoId)
        return {
          ...p,
          mercado: m
            ? { id: m.id, nome: m.nome, cidade: m.cidade, estado: m.estado }
            : { id: p.mercadoId, nome: 'Desconhecido', cidade: '', estado: '' },
        }
      })
    },

    findUnique: async (id: string) => {
      return produtos.find((p) => p.id === id) || null
    },

    create: async (data: Record<string, any>) => {
      const novo: Produto = {
        id: uid('produto'),
        encarteId: data.encarteId,
        mercadoId: data.mercadoId,
        nome: data.nome,
        marca: data.marca || null,
        preco: data.preco,
        unidade: data.unidade || null,
        normalizado: data.normalizado || null,
        criadoEm: data.criadoEm || new Date().toISOString(),
      }
      produtos.push(novo)
      return { ...novo }
    },

    deleteMany: async (opts: { where: { id?: string; encarteId?: string; mercadoId?: string } }) => {
      const where = opts.where
      for (let i = produtos.length - 1; i >= 0; i--) {
        const p = produtos[i]
        let match = true
        if (where.id && p.id !== where.id) match = false
        if (where.encarteId && p.encarteId !== where.encarteId) match = false
        if (where.mercadoId && p.mercadoId !== where.mercadoId) match = false
        if (match) produtos.splice(i, 1)
      }
    },

    count: async (opts: { where: { mercadoId: string } }) => {
      return produtos.filter((p) => p.mercadoId === opts.where.mercadoId).length
    },

    countByEncarteIds: async (mercadoId: string, encarteIds: string[]): Promise<number> => {
      const idSet = new Set(encarteIds)
      return produtos.filter((p) => p.mercadoId === mercadoId && idSet.has(p.encarteId)).length
    },
  },

  cliqueProduto: {
    create: async (data: Record<string, any>) => {
      cliques.push({
        id: uid('clique'),
        produtoId: data.produtoId,
        mercadoId: data.mercadoId,
        sessionId: data.sessionId,
        criadoEm: data.criadoEm || new Date().toISOString(),
      })
    },

    findByMarket: async (mercadoId: string) => {
      return cliques
        .filter((c) => c.mercadoId === mercadoId)
        .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
    },

    groupByProduto: async (mercadoId: string) => {
      const counts: Record<string, number> = {}
      for (const c of cliques) {
        if (c.mercadoId !== mercadoId) continue
        counts[c.produtoId] = (counts[c.produtoId] || 0) + 1
      }
      return Object.entries(counts)
        .map(([produtoId, count]) => ({ produtoId, _count: { id: count } }))
        .sort((a, b) => b._count.id - a._count.id)
        .slice(0, 10)
    },

    count: async (opts: { where: { mercadoId: string } }) => {
      return cliques.filter((c) => c.mercadoId === opts.where.mercadoId).length
    },
  },

  listaCompras: {
    findMany: async (opts: { where: { sessionId: string } }) => {
      return listas
        .filter((l) => l.sessionId === opts.where.sessionId)
        .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
    },

    findUnique: async (id: string) => {
      return listas.find((l) => l.id === id) || null
    },

    create: async (data: Record<string, any>) => {
      const nova: ListaCompras = {
        id: uid('lista'),
        sessionId: data.sessionId,
        produtoId: data.produtoId || null,
        mercadoId: data.mercadoId || null,
        nome: data.nome,
        marca: data.marca || null,
        preco: data.preco || null,
        unidade: data.unidade || null,
        checked: data.checked || false,
        mercadoNome: data.mercadoNome || null,
        criadoEm: data.criadoEm || new Date().toISOString(),
      }
      listas.push(nova)
      return { ...nova }
    },

    update: async (id: string, data: Record<string, any>) => {
      const i = listas.findIndex((l) => l.id === id)
      if (i !== -1) listas[i] = { ...listas[i], ...data }
    },

    delete: async (id: string) => {
      const i = listas.findIndex((l) => l.id === id)
      if (i !== -1) listas.splice(i, 1)
    },
  },

  usuario: {
    findUnique: async (w: {
      where: { email?: string; firebaseUid?: string; id?: string }
      select?: Record<string, boolean>
    }) => {
      let u: Usuario | undefined
      if (w.where.id) u = usuarios.find((x) => x.id === w.where.id)
      else if (w.where.email) u = usuarios.find((x) => x.email === w.where.email)
      else if (w.where.firebaseUid) u = usuarios.find((x) => x.firebaseUid === w.where.firebaseUid)
      if (!u) return null
      if (w.select) {
        const picked: any = { id: u.id }
        for (const k of Object.keys(w.select)) {
          if (k in u) (picked as any)[k] = (u as any)[k]
        }
        return picked
      }
      return { ...u }
    },

    create: async (data: Record<string, any>) => {
      const novo: Usuario = {
        id: uid('usuario'),
        email: data.email,
        firebaseUid: data.firebaseUid || null,
        nome: data.nome || null,
        photoURL: data.photoURL || null,
        provider: data.provider || 'email',
        criadoEm: data.criadoEm || new Date().toISOString(),
        senhaHash: data.senhaHash || undefined,
        ativo: data.ativo !== undefined ? data.ativo : true,
      }
      usuarios.push(novo)
      return { ...novo }
    },

    update: async (id: string, data: Record<string, any>) => {
      const i = usuarios.findIndex((x) => x.id === id)
      if (i !== -1) {
        usuarios[i] = { ...usuarios[i], ...data }
        return { ...usuarios[i] }
      }
      return null
    },

    findMany: async () => {
      return usuarios.map((u) => ({ ...u }))
    },
  },
}

const encarteFileSizes: Record<string, number> = {}

export function _setFileSize(encarteId: string, size: number) {
  encarteFileSizes[encarteId] = size
}

export const isDemo = true
