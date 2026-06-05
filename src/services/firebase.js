import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit as fsLimit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Only initialize when a project is actually configured. This lets the rest of
// the UI run (and the scanner still work against the API) even if Firebase
// env vars are missing during local development.
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId,
)

let db = null
export let auth = null
if (isFirebaseConfigured) {
  const app = initializeApp(firebaseConfig)
  db = getFirestore(app)
  auth = getAuth(app)
}

const COLLECTION = 'scan_logs'

/**
 * Persist a single scan result to Firestore.
 *
 * @param {object} result  The /api/analyze response merged with the request.
 * @returns {Promise<string|null>}  The new document id, or null if Firebase is off.
 */
export async function saveScanLog(result) {
  if (!db) {
    if (import.meta.env.DEV) {
      console.warn('[firebase] Not configured — scan log not persisted.')
    }
    return null
  }

  const docRef = await addDoc(collection(db, COLLECTION), {
    text: result.text,
    mode: result.mode,
    safety_score: result.safety_score,
    category: result.category,
    action: result.action,
    explanation: result.explanation,
    redacted_text: result.redacted_text ?? null,
    timestamp: serverTimestamp(),
  })
  return docRef.id
}

/**
 * Read scan logs ordered by timestamp descending.
 *
 * @param {number} max  Maximum number of documents to fetch.
 * @returns {Promise<Array<object>>}  Logs with a normalized JS Date `timestamp`.
 */
export async function getScanLogs(max = 200) {
  if (!db) return []

  const q = query(
    collection(db, COLLECTION),
    orderBy('timestamp', 'desc'),
    fsLimit(max),
  )
  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => {
    const data = doc.data()
    const ts = data.timestamp
    return {
      id: doc.id,
      ...data,
      // Firestore Timestamp -> JS Date (serverTimestamp can be null briefly)
      timestamp: ts instanceof Timestamp ? ts.toDate() : ts ? new Date(ts) : null,
    }
  })
}

export default db
