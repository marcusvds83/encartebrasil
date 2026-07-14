/**
 * Router de banco de dados — decide entre Demo (memória) e Firestore.
 *
 * - DEMO_MODE=true  -> src/lib/demo-db.ts (memória, sem Firebase)
 * - default         -> src/lib/db-firestore.ts (Firestore)
 *
 * Sempre importe `db` de `@/lib/db` (este arquivo).
 */
import { demoDb } from './demo-db'

const DEMO_MODE = process.env.DEMO_MODE === 'true'

if (DEMO_MODE) {
  console.log('[db] Demo mode ATIVO — usando armazenamento em memória (sem Firebase).')
} else {
  console.log('[db] Modo produção — usando Firestore.')
}

// Em demo mode, exporta o demo-db diretamente (não importa firestore)
export const db = DEMO_MODE
  ? demoDb
  : require('./db-firestore').db as typeof demoDb
