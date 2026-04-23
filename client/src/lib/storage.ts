import type { Point, PathMode } from "./spline";

const DB_NAME = "squad-map-tool";
const DB_VERSION = 1;
const STORE_SESSION = "session";
const STORE_HISTORY = "history";
const SESSION_KEY = "current";
const HISTORY_LIMIT = 20;

export interface SessionData {
  mainImage?: Blob;
  referenceImage?: Blob;
  points: Point[];
  closed: boolean;
  pathMode: PathMode;
  activeImage: 1 | 2;
}

export interface HistoryEntry {
  id: string;
  ts: number;
  exportBlob: Blob;
  points: Point[];
  pathMode: PathMode;
  width: number;
  height: number;
}

function isAvailable(): boolean {
  try {
    return typeof indexedDB !== "undefined";
  } catch {
    return false;
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_SESSION)) {
        db.createObjectStore(STORE_SESSION);
      }
      if (!db.objectStoreNames.contains(STORE_HISTORY)) {
        const store = db.createObjectStore(STORE_HISTORY, { keyPath: "id" });
        store.createIndex("ts", "ts");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const result = fn(store);
        if (result instanceof IDBRequest) {
          result.onsuccess = () => resolve(result.result);
          result.onerror = () => reject(result.error);
        } else {
          result.then(resolve, reject);
        }
        transaction.onerror = () => reject(transaction.error);
      })
  );
}

export async function saveSession(data: SessionData): Promise<void> {
  if (!isAvailable()) return;
  try {
    await tx(STORE_SESSION, "readwrite", (store) => store.put(data, SESSION_KEY));
  } catch {
    // ignore
  }
}

export async function loadSession(): Promise<SessionData | null> {
  if (!isAvailable()) return null;
  try {
    const data = await tx<SessionData | undefined>(STORE_SESSION, "readonly", (store) =>
      store.get(SESSION_KEY)
    );
    return data ?? null;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  if (!isAvailable()) return;
  try {
    await tx(STORE_SESSION, "readwrite", (store) => store.delete(SESSION_KEY));
  } catch {
    // ignore
  }
}

export async function addHistoryEntry(
  entry: Omit<HistoryEntry, "id" | "ts">
): Promise<HistoryEntry> {
  const full: HistoryEntry = {
    ...entry,
    id: crypto.randomUUID(),
    ts: Date.now(),
  };
  if (!isAvailable()) return full;
  try {
    await tx(STORE_HISTORY, "readwrite", (store) => store.put(full));
    await trimHistory();
  } catch {
    // ignore
  }
  return full;
}

export async function listHistory(): Promise<HistoryEntry[]> {
  if (!isAvailable()) return [];
  try {
    const all = await tx<HistoryEntry[]>(STORE_HISTORY, "readonly", (store) =>
      store.getAll()
    );
    return all.sort((a, b) => b.ts - a.ts);
  } catch {
    return [];
  }
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  if (!isAvailable()) return;
  try {
    await tx(STORE_HISTORY, "readwrite", (store) => store.delete(id));
  } catch {
    // ignore
  }
}

export async function clearHistory(): Promise<void> {
  if (!isAvailable()) return;
  try {
    await tx(STORE_HISTORY, "readwrite", (store) => store.clear());
  } catch {
    // ignore
  }
}

async function trimHistory(): Promise<void> {
  const all = await listHistory();
  if (all.length <= HISTORY_LIMIT) return;
  const toRemove = all.slice(HISTORY_LIMIT);
  for (const entry of toRemove) {
    await deleteHistoryEntry(entry.id);
  }
}

export function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string = "image/png"
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type));
}
