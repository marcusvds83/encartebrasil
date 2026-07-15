import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  setDoc,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore'
import { getFirebaseDb } from './firebase'

// Pega a instância real do Firestore (não Proxy) — crítico para collection() funcionar
const firestore = getFirebaseDb()

if (!firestore) {
  console.error('[db-firestore] Firestore não inicializado! Verifique as variáveis NEXT_PUBLIC_FIREBASE_*.')
}

const COLS = {
  admins: 'admins',
  mercados: 'mercados',
  encartes: 'encartes',
  produtos: 'produtos',
  cliques: 'cliques',
  listas: 'listas',
  usuarios: 'usuarios',
} as const

/** Simple count by querying all docs (Firestore has no native count on free) */
async function countCollection(colName: string, constraints: QueryConstraint[] = []) {
  const q = constraints.length > 0
    ? query(collection(firestore as any, colName), ...constraints)
    : collection(firestore as any, colName)
  const snap = await getDocs(q)
  return snap.size
}

export const db = {
  // ── Admin ───────────────────────────────────────────────────────────────
  admin: {
    findUnique: async (w: { where: { email: string } }) => {
      const snap = await getDocs(
        query(collection(firestore as any, COLS.admins), where('email', '==', w.where.email))
      )
      const d = snap.docs[0]
      return d ? { id: d.id, ...d.data() } : null
    },

    create: async (data: Record<string, any>) => {
      const ref = await addDoc(collection(firestore as any, COLS.admins), data)
      return { id: ref.id, ...data }
    },
  },

  // ── Mercado ─────────────────────────────────────────────────────────────
  mercado: {
    findMany: async (opts?: { orderBy?: string; include?: Record<string, any> }) => {
      // Sem orderBy para evitar indice composto — ordena em memoria
      const snap = await getDocs(collection(firestore as any, COLS.mercados))
      const docs = snap.docs
      const mercados: any[] = []
      for (const d of docs) {
        const data = d.data()
        const totalProdutos = await countCollection(COLS.produtos, where('mercadoId', '==', d.id))
        const totalEncartes = await countCollection(COLS.encartes, where('mercadoId', '==', d.id))
        mercados.push({
          id: d.id,
          ...data,
          totalProdutos,
          totalEncartes,
        })
      }
      return mercados.sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''))
    },

    findUnique: async (w: { where: { id?: string; cnpj?: string; emailLogin?: string }; select?: Record<string, boolean> }) => {
      let d: any = null
      if (w.where.id) {
        const docSnap = await getDoc(doc(firestore as any, COLS.mercados, w.where.id))
        if (!docSnap.exists()) return null
        d = docSnap
      } else if (w.where.cnpj) {
        const snap = await getDocs(
          query(collection(firestore as any, COLS.mercados), where('cnpj', '==', w.where.cnpj))
        )
        if (snap.empty) return null
        d = snap.docs[0]
      } else if (w.where.emailLogin) {
        const snap = await getDocs(
          query(collection(firestore as any, COLS.mercados), where('emailLogin', '==', w.where.emailLogin))
        )
        if (snap.empty) return null
        d = snap.docs[0]
      } else {
        return null
      }
      const data = d.data()
      if (w.select) {
        const picked: any = { id: d.id }
        for (const k of Object.keys(w.select)) {
          if (k in data) picked[k] = data[k]
        }
        return picked
      }
      return { id: d.id, ...data }
    },

    findUniqueWithRelations: async (id: string) => {
      const d = await getDoc(doc(firestore as any, COLS.mercados, id))
      if (!d.exists()) return null

      // Sem orderBy para evitar necessidade de indice composto — ordena em memoria
      const encartesSnap = await getDocs(
        query(collection(firestore as any, COLS.encartes), where('mercadoId', '==', id))
      )
      const encartes = (await Promise.all(encartesSnap.docs.map(async (ed) => {
        const prodCount = await countCollection(COLS.produtos, where('encarteId', '==', ed.id))
        const produtosSnap = await getDocs(
          query(collection(firestore as any, COLS.produtos), where('encarteId', '==', ed.id), where('mercadoId', '==', id))
        )
        const produtos = produtosSnap.docs.map((pd) => ({ id: pd.id, ...pd.data() }))
        return { id: ed.id, ...ed.data(), _count: { produtos: prodCount }, produtos }
      }))).sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''))

      // Sem orderBy — filtra e ordena em memoria
      const prodsSnap = await getDocs(
        query(collection(firestore as any, COLS.produtos), where('mercadoId', '==', id))
      )
      const produtos = prodsSnap.docs.map((pd) => ({ id: pd.id, ...pd.data() }))
        .sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''))

      return { id: d.id, ...d.data(), encartes, produtos }
    },

    create: async (data: Record<string, any>) => {
      const ref = await addDoc(collection(firestore as any, COLS.mercados), data)
      return { id: ref.id, ...data }
    },

    update: async (id: string, data: Record<string, any>) => {
      await updateDoc(doc(firestore as any, COLS.mercados, id), data)
      const d = await getDoc(doc(firestore as any, COLS.mercados, id))
      return { id: d.id, ...d.data() }
    },

    delete: async (id: string) => {
      // Delete subcollections
      const prodsSnap = await getDocs(query(collection(firestore as any, COLS.produtos), where('mercadoId', '==', id)))
      for (const p of prodsSnap.docs) await deleteDoc(p.ref)
      const encsSnap = await getDocs(query(collection(firestore as any, COLS.encartes), where('mercadoId', '==', id)))
      for (const e of encsSnap.docs) await deleteDoc(e.ref)
      const clicksSnap = await getDocs(query(collection(firestore as any, COLS.cliques), where('mercadoId', '==', id)))
      for (const c of clicksSnap.docs) await deleteDoc(c.ref)
      await deleteDoc(doc(firestore as any, COLS.mercados, id))
    },
  },

  // ── Encarte ─────────────────────────────────────────────────────────────
  encarte: {
    create: async (data: Record<string, any>) => {
      const ref = await addDoc(collection(firestore as any, COLS.encartes), data)
      return { id: ref.id, ...data }
    },

    update: async (id: string, data: Record<string, any>) => {
      await updateDoc(doc(firestore as any, COLS.encartes, id), data)
      const d = await getDoc(doc(firestore as any, COLS.encartes, id))
      return { id: d.id, ...d.data() }
    },
  },

  // ── Produto ─────────────────────────────────────────────────────────────
  produto: {
    findMany: async (opts: { where: { encarteId: string; mercadoId: string }; orderBy?: Record<string, string> }) => {
      // Sem orderBy composto — filtra por encarteId e ordena em memoria
      const snap = await getDocs(
        query(collection(firestore as any, COLS.produtos), where('encarteId', '==', opts.where.encarteId))
      )
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((p: any) => p.mercadoId === opts.where.mercadoId)
        .sort((a: any, b: any) => (b.criadoEm || '').localeCompare(a.criadoEm || ''))
    },

    findAll: async () => {
      // Sem orderBy — ordena em memoria
      const snap = await getDocs(collection(firestore as any, COLS.produtos))
      const results: any[] = []
      for (const d of snap.docs) {
        const data = d.data()
        const mDoc = await getDoc(doc(firestore as any, COLS.mercados, data.mercadoId))
        const mercado = mDoc.exists()
          ? { id: mDoc.id, nome: mDoc.data().nome, cidade: mDoc.data().cidade, estado: mDoc.data().estado }
          : { id: data.mercadoId, nome: 'Desconhecido', cidade: '', estado: '' }
        results.push({ id: d.id, ...data, mercado })
      }
      return results.sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''))
    },

    findUnique: async (id: string) => {
      const d = await getDoc(doc(firestore as any, COLS.produtos, id))
      return d.exists() ? { id: d.id, ...d.data() } : null
    },

    create: async (data: Record<string, any>) => {
      const ref = await addDoc(collection(firestore as any, COLS.produtos), data)
      return { id: ref.id, ...data }
    },

    deleteMany: async (opts: { where: { id: string; encarteId: string; mercadoId: string } }) => {
      const snap = await getDocs(
        query(
          collection(firestore as any, COLS.produtos),
          where('id', '==', opts.where.id)
        )
      )
      for (const d of snap.docs) {
        await deleteDoc(d.ref)
      }
    },

    count: async (opts: { where: { mercadoId: string } }) => {
      return countCollection(COLS.produtos, where('mercadoId', '==', opts.where.mercadoId))
    },
  },

  // ── CliqueProduto ───────────────────────────────────────────────────────
  cliqueProduto: {
    create: async (data: Record<string, any>) => {
      await addDoc(collection(firestore as any, COLS.cliques), data)
    },

    findByMarket: async (mercadoId: string) => {
      const snap = await getDocs(
        query(collection(firestore as any, COLS.cliques), where('mercadoId', '==', mercadoId))
      )
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => (b.criadoEm || '').localeCompare(a.criadoEm || ''))
    },

    groupByProduto: async (mercadoId: string) => {
      const cliques = await db.cliqueProduto.findByMarket(mercadoId)
      const counts: Record<string, number> = {}
      for (const c of cliques) {
        counts[c.produtoId] = (counts[c.produtoId] || 0) + 1
      }
      return Object.entries(counts)
        .map(([produtoId, _count]) => ({ produtoId, _count: { id: _count } }))
        .sort((a, b) => b._count.id - a._count.id)
        .slice(0, 10)
    },

    count: async (opts: { where: { mercadoId: string } }) => {
      return countCollection(COLS.cliques, where('mercadoId', '==', opts.where.mercadoId))
    },
  },

  // ── ListaCompras ────────────────────────────────────────────────────────
  listaCompras: {
    findMany: async (opts: { where: { sessionId: string }; orderBy?: Record<string, string> }) => {
      const snap = await getDocs(
        query(collection(firestore as any, COLS.listas), where('sessionId', '==', opts.where.sessionId))
      )
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => (b.criadoEm || '').localeCompare(a.criadoEm || ''))
    },

    findUnique: async (id: string) => {
      const d = await getDoc(doc(firestore as any, COLS.listas, id))
      return d.exists() ? { id: d.id, ...d.data() } : null
    },

    create: async (data: Record<string, any>) => {
      const ref = await addDoc(collection(firestore as any, COLS.listas), data)
      return { id: ref.id, ...data }
    },

    update: async (id: string, data: Record<string, any>) => {
      await updateDoc(doc(firestore as any, COLS.listas, id), data)
    },

    delete: async (id: string) => {
      await deleteDoc(doc(firestore as any, COLS.listas, id))
    },
  },

  // ── Usuario (PF) ────────────────────────────────────────────────────────
  usuario: {
    findUnique: async (w: { where: { email?: string; firebaseUid?: string; id?: string }; select?: Record<string, boolean> }) => {
      let d: any = null
      if (w.where.id) {
        const s = await getDoc(doc(firestore as any, COLS.usuarios, w.where.id))
        if (!s.exists()) return null
        d = s
      } else if (w.where.email) {
        const snap = await getDocs(
          query(collection(firestore as any, COLS.usuarios), where('email', '==', w.where.email))
        )
        if (snap.empty) return null
        d = snap.docs[0]
      } else if (w.where.firebaseUid) {
        const snap = await getDocs(
          query(collection(firestore as any, COLS.usuarios), where('firebaseUid', '==', w.where.firebaseUid))
        )
        if (snap.empty) return null
        d = snap.docs[0]
      } else {
        return null
      }
      const data = d.data()
      if (w.select) {
        const picked: any = { id: d.id }
        for (const k of Object.keys(w.select)) {
          if (k in data) picked[k] = data[k]
        }
        return picked
      }
      return { id: d.id, ...data }
    },

    create: async (data: Record<string, any>) => {
      const ref = await addDoc(collection(firestore as any, COLS.usuarios), data)
      return { id: ref.id, ...data }
    },

    update: async (id: string, data: Record<string, any>) => {
      await updateDoc(doc(firestore as any, COLS.usuarios, id), data)
      const d = await getDoc(doc(firestore as any, COLS.usuarios, id))
      return { id: d.id, ...d.data() }
    },

    findMany: async () => {
      const snap = await getDocs(collection(firestore as any, COLS.usuarios))
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => (b.criadoEm || '').localeCompare(a.criadoEm || ''))
    },
  },
}
