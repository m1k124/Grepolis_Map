import type { GrepolisTablesLoad } from "../grepolis/api";
import type { GrepolisServerId, GrepolisTables } from "../types/grepolis";

const dbName = "grepolis-map";
const storeName = "world-cache";
const dbVersion = 1;
const defaultCacheTtlMs = 30 * 60 * 1000;

export interface CachedWorldTables extends GrepolisTablesLoad {
  serverId: GrepolisServerId;
  expiresAt: string;
  counts: WorldTableCounts;
}

export interface WorldTableCounts {
  players: number;
  alliances: number;
  islands: number;
  towns: number;
}

export async function getFreshCachedWorld(serverId: GrepolisServerId, now = new Date()): Promise<CachedWorldTables | null> {
  const cached = await getCachedWorld(serverId);
  if (!cached || new Date(cached.expiresAt).getTime() <= now.getTime()) {
    return null;
  }

  return cached;
}

export async function getCachedWorld(serverId: GrepolisServerId): Promise<CachedWorldTables | null> {
  const db = await openCacheDb();
  return requestToPromise<CachedWorldTables | undefined>(
    db.transaction(storeName, "readonly").objectStore(storeName).get(serverId),
  ).then((cached) => cached ?? null);
}

export async function saveCachedWorld(
  serverId: GrepolisServerId,
  load: GrepolisTablesLoad,
  ttlMs = defaultCacheTtlMs,
): Promise<CachedWorldTables> {
  const cached: CachedWorldTables = {
    ...load,
    serverId,
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    counts: countTables(load.tables),
  };
  const db = await openCacheDb();
  await requestToPromise(db.transaction(storeName, "readwrite").objectStore(storeName).put(cached));
  return cached;
}

export async function clearCachedWorld(serverId: GrepolisServerId): Promise<void> {
  const db = await openCacheDb();
  await requestToPromise(db.transaction(storeName, "readwrite").objectStore(storeName).delete(serverId));
}

export function countTables(tables: GrepolisTables): WorldTableCounts {
  return {
    players: countLines(tables.players),
    alliances: countLines(tables.alliances),
    islands: countLines(tables.islands),
    towns: countLines(tables.towns),
  };
}

function openCacheDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: "serverId" });
      }
    };

    request.onerror = () => reject(request.error ?? new Error("IndexedDB indisponible"));
    request.onsuccess = () => resolve(request.result);
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error ?? new Error("Operation IndexedDB impossible"));
    request.onsuccess = () => resolve(request.result);
  });
}

function countLines(input: string): number {
  return input.trim().split("\n").filter(Boolean).length;
}
