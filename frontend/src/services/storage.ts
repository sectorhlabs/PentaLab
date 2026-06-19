const DB_NAME = 'pentalab-db'
const STORE_NAME = 'recordings'
const KV_STORE = 'kv'
const DB_VERSION = 2

// Conexión cacheada: abrir IndexedDB en cada operación es costoso.
let dbPromise: Promise<IDBDatabase> | null = null

export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }
    request.onsuccess = () => {
      const db = request.result
      // Si otra pestaña actualiza la versión, soltamos la conexión.
      db.onversionchange = () => {
        db.close()
        dbPromise = null
      }
      resolve(db)
    }
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(KV_STORE)) {
        db.createObjectStore(KV_STORE)
      }
    }
  })
  return dbPromise
}

export async function saveAudioBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDB()
  // WebKit (iOS/Safari) ha tenido bugs guardando Blobs directamente en
  // IndexedDB: lanza error aunque haya espacio de sobra. Guardamos el
  // ArrayBuffer + el type y reconstruimos el Blob al leer.
  const data = await blob.arrayBuffer()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put({ id, data, type: blob.type })
    tx.oncomplete = () => resolve()
    // onabort cubre los rechazos por cuota, que llegan como abort, no error.
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function getAudioBlob(id: string): Promise<Blob | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).get(id)
    request.onsuccess = () => {
      const rec = request.result
      if (!rec) return resolve(null)
      // Compat: registros antiguos guardaban el Blob directamente.
      if (rec.blob instanceof Blob) return resolve(rec.blob)
      if (rec.data) return resolve(new Blob([rec.data], { type: rec.type || 'audio/webm' }))
      resolve(null)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function deleteAudioBlob(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function kvSet(key: string, value: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KV_STORE, 'readwrite')
    tx.objectStore(KV_STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function kvGet(key: string): Promise<string | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KV_STORE, 'readonly')
    const request = tx.objectStore(KV_STORE).get(key)
    request.onsuccess = () => resolve((request.result as string | undefined) ?? null)
    request.onerror = () => reject(request.error)
  })
}

async function kvDelete(key: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KV_STORE, 'readwrite')
    tx.objectStore(KV_STORE).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** Adaptador de almacenamiento para `zustand/middleware` persist sobre IndexedDB. */
export const indexedDBStorage = {
  getItem: (name: string) => kvGet(name),
  setItem: (name: string, value: string) => kvSet(name, value),
  removeItem: (name: string) => kvDelete(name),
}
