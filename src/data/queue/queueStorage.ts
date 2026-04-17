import { get, set } from 'idb-keyval';
import type { Activity, LogEntry } from '../../types/activity';
import type { QueueEntry } from './types';

const QUEUE_KEY = 'offline_queue';
const SNAPSHOT_KEY = 'cached_snapshot';

export interface CachedSnapshot {
  activities: Activity[];
  logs: LogEntry[];
}

export async function loadQueue(): Promise<QueueEntry[]> {
  const val = await get<QueueEntry[]>(QUEUE_KEY);
  return val ?? [];
}

export async function saveQueue(queue: QueueEntry[]): Promise<void> {
  await set(QUEUE_KEY, queue);
}

export async function loadSnapshot(): Promise<CachedSnapshot | null> {
  const val = await get<CachedSnapshot>(SNAPSHOT_KEY);
  return val ?? null;
}

export async function saveSnapshot(snapshot: CachedSnapshot): Promise<void> {
  await set(SNAPSHOT_KEY, snapshot);
}
