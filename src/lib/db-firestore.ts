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
import { firestore } from './firebase'

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
    ? query(collection(firestore, colName), ...constraints)
    : collection(firestore, colName)
  const snap = await getDocs(q)
  return snap.size
}

export const db = {
  // ── Admin ───────────────────────────────────────────────────────────────
  admin: {
    findUnique: async (w: { where: { email: string } }) => {
      const snap = await getDocs(
        query(collection(firestore, COLS.admins), where('email', '==', w.where.email))
      )
      const d = snap.docs[0]
      return d ? { id: d.id, ...d.data() } : null
    },
  },

  // ── Mercado ─────────────────────────────────────────────────────────────
  mercado: {
    findMany: async (opts?: { orderBy?: string; include?: Record<string, any> }) => {
      const snap = await getDocs(
        query(collection(firestore, COLS.mercados), orderBy('criadoEm', 'desc'))
      )
      const mercados: any[] = []
      for (const d of snap.docs) {
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
      return mercados
    },

    findUnique: async (w: { where: { id?: string; cnpj?: string; emailLogin?: string }; select?: Record<string, boolean> }) => {
      let d: any = null
      if (w.where.id) {
        const docSnap = await getDoc(doc(firestore, COLS.mercados, w.where.id))
        if (!docSnap.exists()) return null
        d = docSnap
      } else if (w.where.cnpj) {
        const snap = await getDocs(
          query(collection(firestore, COLS.mercados), where('cnpj', '==', w.where.cnpj))
        )
        if (snap.empty) return null
        d = snap.docs[0]
      } else if (w.where.emailLogin) {
        const snap = await getDocs(
          query(collection(firestore, COLS.mercados), where('emailLogin', '==', w.where.emailLogin))
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
      const d = await getDoc(doc(firestore, COLS.mercados, id))
      if (!d.exists()) return null

      const encartesSnap = await getDocs(
        query(collection(firestore, COLS.encartes), where('mercadoId', '==', id), orderBy('criadoEm', 'desc'))
      )
      const encartes = await Promise.all(encartesSnap.docs.map(async (ed) => {
        const prodCount = await countCollection(COLS.produtos, where('encarteId', '==', ed.id))
        return { id: ed.id, ...ed.data(), _count: { produtos: prodCount } }
      }))

      const prodsSnap = await getDocs(
        query(collection(firestore, COLS.produtos), where('mercadoId', '==', id), orderBy('criadoEm', 'desc'))
      )
      const produtos = prodsSnap.docs.map((pd) => ({ id: pd.id, ...pd.data() }))

      return { id: d.id, ...d.data(), encartes, produtos }
    },

    create: async (data: Record<string, any>) => {
      const ref = await addDoc(collection(firestore, COLS.mercados), data)
      return { id: ref.id, ...data }
    },

    update: async (id: string, data: Record<string, any>) => {
      await updateDoc(doc(firestore, COLS.mercados, id), data)
      const d = await getDoc(doc(firestore, COLS.mercados, id))
      return { id: d.id, ...d.data() }
    },

    delete: async (id: string) => {
      // Delete subcollections
      const prodsSnap = await getDocs(query(collection(firestore, COLS.produtos), where('mercadoId', '==', id)))
      for (const p of prodsSnap.docs) await deleteDoc(p.ref)
      const encsSnap = await getDocs(query(collection(firestore, COLS.encartes), where('mercadoId', '==', id)))
      for (const e of encsSnap.docs) await deleteDoc(e.ref)
      const clicksSnap = await getDocs(query(collection(firestore, COLS.cliques), where('mercadoId', '==', id)))
      for (const c of clicksSnap.docs) await deleteDoc(c.ref)
      await deleteDoc(doc(firestore, COLS.mercados, id))
    },
  },

  // ── Encarte ─────────────────────────────────────────────────────────────
  encarte: {
    create: async (data: Record<string, any>) => {
      const ref = await addDoc(collection(firestore, COLS.encartes), data)
      return { id: ref.id, ...data }
    },
  },

  // ── Produto ─────────────────────────────────────────────────────────────
  produto: {
    findMany: async (opts: { where: { encarteId: string; mercadoId: string }; orderBy?: Record<string, string> }) => {
      const snap = await getDocs(
        query(
          collection(firestore, COLS.produtos),
          where('encarteId', '==', opts.where.encarteId),
          where('mercadoId', '==', opts.where.mercadoId),
          orderBy('criadoEm', 'desc')
        )
      )
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    },

    findAll: async () => {
      const snap = await getDocs(query(collection(firestore, COLS.produtos), orderBy('criadoEm', 'desc')))
      const results: any[] = []
      for (const d of snap.docs) {
        const data = d.data()
        const mDoc = await getDoc(doc(firestore, COLS.mercados, data.mercadoId))
        const mercado = mDoc.exists()
          ? { id: mDoc.id, nome: mDoc.data().nome, cidade: mDoc.data().cidade, estado: mDoc.data().estado }
          : { id: data.mercadoId, nome: 'Desconhecido', cidade: '', estado: '' }
        results.push({ id: d.id, ...data, mercado })
      }
      return results
    },

    findUnique: async (id: string) => {
      const d = await getDoc(doc(firestore, COLS.produtos, id))
      return d.exists() ? { id: d.id, ...d.data() } : null
    },

    create: async (data: Record<string, any>) => {
      const ref = await addDoc(collection(firestore, COLS.produtos), data)
      return { id: ref.id, ...data }
    },

    deleteMany: async (opts: { where: { id: string; encarteId: string; mercadoId: string } }) => {
      const snap = await getDocs(
        query(
          collection(firestore, COLS.produtos),
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
      await addDoc(collection(firestore, COLS.cliques), data)
    },

    findByMarket: async (mercadoId: string) => {
      const snap = await getDocs(
        query(collection(firestore, COLS.cliques), where('mercadoId', '==', mercadoId), orderBy('criadoEm', 'desc'))
      )
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
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
        query(
          collection(firestore, COLS.listas),
          where('sessionId', '==', opts.where.sessionId),
          orderBy('criadoEm', 'desc')
        )
      )
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    },

    findUnique: async (id: string) => {
      const d = await getDoc(doc(firestore, COLS.listas, id))
      return d.exists() ? { id: d.id, ...d.data() } : null
    },

    create: async (data: Record<string, any>) => {
      const ref = await addDoc(collection(firestore, COLS.listas), data)
      return { id: ref.id, ...data }
    },

    update: async (id: string, data: Record<string, any>) => {
      await updateDoc(doc(firestore, COLS.listas, id), data)
    },

    delete: async (id: string) => {
      await deleteDoc(doc(firestore, COLS.listas, id))
    },
  },

  // ── Usuario (PF) ────────────────────────────────────────────────────────
  usuario: {
    findUnique: async (w: { where: { email?: string; firebaseUid?: string; id?: string }; select?: Record<string, boolean> }) => {
      let d: any = null
      if (w.where.id) {
        const s = await getDoc(doc(firestore, COLS.usuarios, w.where.id))
        if (!s.exists()) return null
        d = s
      } else if (w.where.email) {
        const snap = await getDocs(
          query(collection(firestore, COLS.usuarios), where('email', '==', w.where.email))
        )
        if (snap.empty) return null
        d = snap.docs[0]
      } else if (w.where.firebaseUid) {
        const snap = await getDocs(
          query(collection(firestore, COLS.usuarios), where('firebaseUid', '==', w.where.firebaseUid))
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
      const ref = await addDoc(collection(firestore, COLS.usuarios), data)
      return { id: ref.id, ...data }
    },

    update: async (id: string, data: Record<string, any>) => {
      await updateDoc(doc(firestore, COLS.usuarios, id), data)
      const d = await getDoc(doc(firestore, COLS.usuarios, id))
      return { id: d.id, ...d.data() }
    },
  },
}
