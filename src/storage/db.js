// History persistence via IndexedDB with a localStorage fallback.
const DB_NAME = 'novacalc';
const DB_VERSION = 1;
const STORE = 'history';
const LS_KEY = 'novacalc:history';
const MAX_ITEMS = 200;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === 'undefined') {
    dbPromise = Promise.resolve(null);
    return dbPromise;
  }
  dbPromise = new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return dbPromise;
}

function lsGet() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
  catch { return []; }
}
function lsSet(items) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(items.slice(-MAX_ITEMS))); }
  catch {}
}

export async function addHistory(entry) {
  const item = { ...entry, ts: Date.now() };
  const db = await openDB();
  if (!db) {
    const items = lsGet();
    items.push(item);
    lsSet(items);
    return;
  }
  await new Promise((res) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add(item);
    tx.oncomplete = res;
    tx.onerror = res;
  });
}

export async function getHistory(limit = 50) {
  const db = await openDB();
  if (!db) return lsGet().slice(-limit).reverse();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result || []).slice(-limit).reverse());
    req.onerror = () => resolve([]);
  });
}

export async function clearHistory() {
  const db = await openDB();
  if (!db) { lsSet([]); return; }
  await new Promise((res) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = res;
    tx.onerror = res;
  });
}
