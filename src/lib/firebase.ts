import { initializeApp, getApps, type App } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getAuth, type Auth } from 'firebase/auth'

let _app: App | null = null
let _db: Firestore | null = null
let _auth: Auth | null = null

function initFirebase() {
  if (_app) return

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (!apiKey || apiKey === 'your-api-key') {
    // Not configured yet - will fail at runtime with clear error
    console.warn('[Firebase] API key not configured. Set NEXT_PUBLIC_FIREBASE_* env vars.')
  }

  _app = getApps().length === 0
    ? initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
      })
    : getApps()[0]

  _db = getFirestore(_app)
  _auth = getAuth(_app)
}

export function getFirebaseApp(): App {
  initFirebase()
  return _app!
}

export function getFirebaseDb(): Firestore {
  initFirebase()
  return _db!
}

export function getFirebaseAuth(): Auth {
  initFirebase()
  return _auth!
}

// Lazy exports - only init when actually accessed
export const firebaseApp = new Proxy({} as App, {
  get(_, prop) {
    return (getFirebaseApp() as any)[prop]
  },
})

export const firestore = new Proxy({} as Firestore, {
  get(_, prop) {
    return (getFirebaseDb() as any)[prop]
  },
})

export const firebaseAuth = new Proxy({} as Auth, {
  get(_, prop) {
    return (getFirebaseAuth() as any)[prop]
  },
})