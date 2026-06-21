// 저수준 IndexedDB Promise 래퍼.
// 완전 로컬 저장소 (외부 전송 없음, 계획서 §1.3).

const DB_NAME = 'next-chart'
const DB_VERSION = 1

export const STORES = {
  meta: 'meta', // 앱 설정/감사로그 헤드 (평문 소량)
  users: 'users', // 계정 (wrappedDek 포함, 비밀번호 평문 없음)
  patients: 'patients', // 환자 (레코드 전체 암호화)
  charts: 'charts', // 차트 (payload 암호화, patientId 인덱스 평문)
  printouts: 'printouts', // 출력본 스냅샷
  audit: 'audit', // 감사로그 (append-only 해시체인)
} as const

let dbPromise: Promise<IDBDatabase> | null = null

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORES.meta)) {
        db.createObjectStore(STORES.meta, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORES.users)) {
        const s = db.createObjectStore(STORES.users, { keyPath: 'id' })
        s.createIndex('username', 'username', { unique: true })
      }
      if (!db.objectStoreNames.contains(STORES.patients)) {
        db.createObjectStore(STORES.patients, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORES.charts)) {
        const s = db.createObjectStore(STORES.charts, { keyPath: 'id' })
        s.createIndex('patientId', 'patientId', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORES.printouts)) {
        const s = db.createObjectStore(STORES.printouts, { keyPath: 'id' })
        s.createIndex('chartId', 'chartId', { unique: false })
        s.createIndex('patientId', 'patientId', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORES.audit)) {
        db.createObjectStore(STORES.audit, { keyPath: 'seq' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

type StoreName = (typeof STORES)[keyof typeof STORES]

function tx(db: IDBDatabase, store: StoreName, mode: IDBTransactionMode) {
  return db.transaction(store, mode).objectStore(store)
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function idbGet<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDb()
  return wrap(tx(db, store, 'readonly').get(key) as IDBRequest<T | undefined>)
}

export async function idbGetAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDb()
  return wrap(tx(db, store, 'readonly').getAll() as IDBRequest<T[]>)
}

export async function idbGetByIndex<T>(
  store: StoreName,
  index: string,
  value: IDBValidKey,
): Promise<T[]> {
  const db = await openDb()
  const idx = tx(db, store, 'readonly').index(index)
  return wrap(idx.getAll(value) as IDBRequest<T[]>)
}

export async function idbPut<T>(store: StoreName, value: T): Promise<void> {
  const db = await openDb()
  await wrap(tx(db, store, 'readwrite').put(value))
}

export async function idbAdd<T>(store: StoreName, value: T): Promise<void> {
  const db = await openDb()
  await wrap(tx(db, store, 'readwrite').add(value))
}

export async function idbDelete(store: StoreName, key: IDBValidKey): Promise<void> {
  const db = await openDb()
  await wrap(tx(db, store, 'readwrite').delete(key))
}

export async function idbCount(store: StoreName): Promise<number> {
  const db = await openDb()
  return wrap(tx(db, store, 'readonly').count())
}
