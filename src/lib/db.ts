/**
 * Router de banco de dados — decide entre Demo (memória) e Firestore.
 *
 * - DEMO_MODE=true  -> src/lib/demo-db.ts (memória, sem Firebase)
 * - default         -> src/lib/db-firestore.ts (Firestore)
 *
 * Sempre importe `db` de `@/lib/db` (este arquivo).
 */
import { demoDb } from './demo-db'

// Demo mode ativo quando DEMO_MODE=true OU quando Firebase não configurado
const DEMO_MODE = process.env.DEMO_MODE === 'true'
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
const FIREBASE_CONFIGURED = !!FIREBASE_API_KEY && FIREBASE_API_KEY !== 'your-api-key'

const useDemo = DEMO_MODE || !FIREBASE_CONFIGURED

if (useDemo) {
  console.log('[db] Demo mode ATIVO — usando armazenamento em memória (sem Firebase).')
  console.log('[db] DEMO_MODE env:', DEMO_MODE, '| Firebase configured:', FIREBASE_CONFIGURED)
} else {
  console.log('[db] Modo produção — usando Firestore.')
}

// Em demo mode, exporta o demo-db diretamente (não importa firestore)
export const db = useDemo
  ? demoDb
  : require('./db-firestore').db as typeof demoDb
