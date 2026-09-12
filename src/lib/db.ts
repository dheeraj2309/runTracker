import { openDB, type IDBPDatabase } from 'idb';
import type { Point } from '../types/run';

interface StoredPoint extends Point {
  segmentId: string;
}

const DB_NAME = 'run-tracker';
const DB_VERSION = 1;
const STORE_NAME = 'points';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('segmentId', 'segmentId');
      },
    });
  }
  return dbPromise;
}

export async function appendPoint(segmentId: string, point: Point): Promise<void> {
  const db = await getDb();
  const stored: StoredPoint = { ...point, segmentId };
  await db.put(STORE_NAME, stored);
}

export async function getAllStoredPoints(): Promise<StoredPoint[]> {
  const db = await getDb();
  return db.getAll(STORE_NAME);
}

export async function clearAllPoints(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE_NAME);
}