const DB_NAME = 'mymusic-db'
const STORE_NAME = 'recordings'
const KV_STORE = 'kv'
const DB_VERSION = 2

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

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
}

export async function saveAudioBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDB()
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    
    const request = store.put({ id, blob })
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
    
    tx.oncomplete = () => db.close()
  })
}

export async function getAudioBlob(id: string): Promise<Blob | null> {
  const db = await openDB()
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    
    const request = store.get(id)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      resolve(request.result?.blob || null)
    }
    
    tx.oncomplete = () => db.close()
  })
}

export async function deleteAudioBlob(id: string): Promise<void> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    const request = store.delete(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()

    tx.oncomplete = () => db.close()
  })
}

async function kvSet(key: string, value: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KV_STORE, 'readwrite')
    const request = tx.objectStore(KV_STORE).put(value, key)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
    tx.oncomplete = () => db.close()
  })
}

async function kvGet(key: string): Promise<string | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KV_STORE, 'readonly')
    const request = tx.objectStore(KV_STORE).get(key)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve((request.result as string | undefined) ?? null)
    tx.oncomplete = () => db.close()
  })
}

async function kvDelete(key: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KV_STORE, 'readwrite')
    const request = tx.objectStore(KV_STORE).delete(key)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
    tx.oncomplete = () => db.close()
  })
}

/** Adaptador de almacenamiento para `zustand/middleware` persist sobre IndexedDB. */
export const indexedDBStorage = {
  getItem: (name: string) => kvGet(name),
  setItem: (name: string, value: string) => kvSet(name, value),
  removeItem: (name: string) => kvDelete(name),
}