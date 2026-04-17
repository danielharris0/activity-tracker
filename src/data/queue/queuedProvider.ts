import { nanoid } from 'nanoid';
import type { Activity, LogEntry, MeasurementType } from '../../types/activity';
import type { DataProvider, InnerDataProvider } from '../provider';
import { SheetsApiError } from '../../sheets/client';
import {
  loadQueue,
  saveQueue,
  loadSnapshot,
  saveSnapshot,
  type CachedSnapshot,
} from './queueStorage';
import { coalesce } from './coalesce';
import { classifyQueueAgainstUpstream } from './reconcile';
import type { QueueEntry, QueueStatus } from './types';

const BACKOFF_MAX_MS = 60_000;
const POLL_INTERVAL_MS = 30_000;

export interface QueuedProvider extends DataProvider {
  getStatus(): QueueStatus;
  subscribe(listener: (status: QueueStatus) => void): () => void;
  subscribeSnapshot(listener: (snapshot: CachedSnapshot) => void): () => void;
  retry(entryId: string): void;
  discard(entryId: string): void;
  resumeAfterReconnect(): void;
  flushNow(): Promise<void>;
  getSnapshot(): CachedSnapshot | null;
}

export async function createQueuedProvider(
  inner: InnerDataProvider,
): Promise<QueuedProvider> {
  let queue: QueueEntry[] = await loadQueue();
  let snapshot: CachedSnapshot | null = await loadSnapshot();

  let authPaused = false;
  let isSyncing = false;
  let isOnline = navigator.onLine;
  let backoffMs = 1000;
  let flushPromise: Promise<void> | null = null;

  const listeners = new Set<(status: QueueStatus) => void>();
  const snapshotListeners = new Set<(snapshot: CachedSnapshot) => void>();

  function emitSnapshot() {
    if (!snapshot) return;
    for (const l of snapshotListeners) l(snapshot);
  }

  function currentStatus(): QueueStatus {
    return {
      pending: queue.filter((e) => !e.permanentlyFailed).length,
      isOnline,
      authPaused,
      isSyncing,
      failedEntries: queue.filter((e) => e.permanentlyFailed),
    };
  }

  function emit() {
    const status = currentStatus();
    for (const listener of listeners) listener(status);
  }

  async function persistQueue() {
    await saveQueue(queue);
  }

  async function persistSnapshot(next: CachedSnapshot) {
    snapshot = next;
    await saveSnapshot(next);
    emitSnapshot();
  }

  function updateSnapshot(next: CachedSnapshot) {
    snapshot = next;
    void saveSnapshot(next);
    emitSnapshot();
  }

  function applyOptimisticCreateActivity(activity: Activity) {
    if (!snapshot) {
      updateSnapshot({ activities: [activity], logs: [] });
      return;
    }
    updateSnapshot({ ...snapshot, activities: [...snapshot.activities, activity] });
  }

  function applyOptimisticUpdateActivity(
    id: string,
    updates: Partial<Omit<Activity, 'id'>>,
  ): Activity | null {
    if (!snapshot) return null;
    let updated: Activity | null = null;
    const activities = snapshot.activities.map((a) => {
      if (a.id === id) {
        updated = { ...a, ...updates };
        return updated;
      }
      return a;
    });
    updateSnapshot({ ...snapshot, activities });
    return updated;
  }

  function applyOptimisticDeleteActivity(id: string) {
    if (!snapshot) return;
    updateSnapshot({
      activities: snapshot.activities.filter((a) => a.id !== id),
      logs: snapshot.logs.filter((l) => l.activityId !== id),
    });
  }

  function applyOptimisticCreateLog(log: LogEntry) {
    if (!snapshot) return;
    updateSnapshot({ ...snapshot, logs: [...snapshot.logs, log] });
  }

  async function enqueue(entry: QueueEntry) {
    queue = coalesce(queue, entry);
    await persistQueue();
    emit();
    scheduleFlush();
  }

  function scheduleFlush() {
    if (flushPromise) return;
    if (!isOnline || authPaused) return;
    flushPromise = flush()
      .catch((err) => {
        console.error('[offline-queue] flush error', err);
      })
      .finally(() => {
        flushPromise = null;
      });
  }

  function isRetryableError(err: unknown): boolean {
    if (err instanceof SheetsApiError) {
      if (err.status === 0) return true;
      if (err.status >= 500) return true;
      return false;
    }
    return true;
  }

  function isAuthError(err: unknown): boolean {
    if (err instanceof SheetsApiError) {
      return err.status === 401 || err.status === 403;
    }
    return false;
  }

  async function runOne(entry: QueueEntry): Promise<void> {
    switch (entry.kind) {
      case 'createActivity':
        await inner.createActivity(entry.payload);
        return;
      case 'updateActivity':
        await inner.updateActivity(entry.payload.id, entry.payload.updates);
        return;
      case 'deleteActivity':
        await inner.deleteActivity(entry.payload.id);
        return;
      case 'createProgressLog': {
        // We need the measurementType for the write. Use the snapshot's
        // authoritative view; fall back to 'count' if somehow missing.
        const activity = snapshot?.activities.find(
          (a) => a.id === entry.payload.activityId,
        );
        const mt: MeasurementType = activity?.measurementType ?? 'count';
        await inner.createProgressLog(entry.payload, mt);
        return;
      }
    }
  }

  async function flush(): Promise<void> {
    if (queue.filter((e) => !e.permanentlyFailed).length === 0) return;
    isSyncing = true;
    emit();

    try {
      // Pre-flush reconciliation: fetch authoritative upstream state.
      let upstream: { activities: Activity[]; logs: LogEntry[] };
      try {
        upstream = await inner.loadAll();
      } catch (err) {
        if (isAuthError(err)) {
          pauseForAuth();
          return;
        }
        // Network/5xx — backoff and retry later.
        scheduleBackoff();
        return;
      }

      const { toFlush, toDrop, toFail } = classifyQueueAgainstUpstream(
        queue.filter((e) => !e.permanentlyFailed),
        upstream,
      );

      const failedIds = new Set(toFail.map((f) => f.entry.id));
      const droppedIds = new Set(toDrop.map((e) => e.id));
      queue = queue.map((e) => {
        const fail = toFail.find((f) => f.entry.id === e.id);
        if (fail) {
          return { ...e, permanentlyFailed: true, failureReason: fail.reason };
        }
        return e;
      }).filter((e) => !droppedIds.has(e.id));
      await persistQueue();
      emit();

      // Serial replay.
      for (const entry of toFlush) {
        if (failedIds.has(entry.id)) continue;
        try {
          await runOne(entry);
          queue = queue.filter((e) => e.id !== entry.id);
          await persistQueue();
          emit();
          backoffMs = 1000;
        } catch (err) {
          if (isAuthError(err)) {
            pauseForAuth();
            return;
          }
          if (isRetryableError(err)) {
            queue = queue.map((e) =>
              e.id === entry.id
                ? {
                    ...e,
                    attempts: e.attempts + 1,
                    lastError: err instanceof Error ? err.message : String(err),
                  }
                : e,
            );
            await persistQueue();
            scheduleBackoff();
            return;
          }
          // 4xx non-auth — permanently fail.
          queue = queue.map((e) =>
            e.id === entry.id
              ? {
                  ...e,
                  permanentlyFailed: true,
                  lastError: err instanceof Error ? err.message : String(err),
                  failureReason: err instanceof Error ? err.message : String(err),
                }
              : e,
          );
          await persistQueue();
          emit();
        }
      }

      // Post-flush refresh — pick up new data from other devices.
      try {
        const fresh = await inner.loadAll();
        await persistSnapshot(fresh);
        emit();
      } catch {
        // Post-flush refresh is best-effort.
      }
    } finally {
      isSyncing = false;
      emit();
    }
  }

  function pauseForAuth() {
    authPaused = true;
    isSyncing = false;
    emit();
  }

  function scheduleBackoff() {
    isSyncing = false;
    emit();
    const delay = backoffMs;
    backoffMs = Math.min(backoffMs * 2, BACKOFF_MAX_MS);
    setTimeout(() => {
      if (isOnline && !authPaused) scheduleFlush();
    }, delay);
  }

  function handleOnline() {
    isOnline = true;
    backoffMs = 1000;
    emit();
    scheduleFlush();
  }

  function handleOffline() {
    isOnline = false;
    emit();
  }

  function handleFocus() {
    if (isOnline && !authPaused) scheduleFlush();
  }

  function poll() {
    if (navigator.onLine && !authPaused) {
      if (isOnline === false) {
        isOnline = true;
        emit();
      }
      scheduleFlush();
    } else if (!navigator.onLine && isOnline) {
      isOnline = false;
      emit();
    }
    setTimeout(poll, POLL_INTERVAL_MS);
  }

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  window.addEventListener('focus', handleFocus);
  setTimeout(poll, POLL_INTERVAL_MS);

  // Kick off initial flush if there's work and we're online.
  if (queue.some((e) => !e.permanentlyFailed) && isOnline) {
    scheduleFlush();
  }

  const outer: QueuedProvider = {
    async loadAll() {
      // If the queue is empty, do a live fetch and cache it.
      if (queue.filter((e) => !e.permanentlyFailed).length === 0) {
        try {
          const fresh = await inner.loadAll();
          await persistSnapshot(fresh);
          return fresh;
        } catch (err) {
          if (isAuthError(err)) pauseForAuth();
          if (snapshot) return snapshot;
          throw err;
        }
      }
      // Queue non-empty — serve cached snapshot immediately; flush triggers
      // a refresh in the background that updates state via emit().
      if (snapshot) {
        scheduleFlush();
        return snapshot;
      }
      // No cached snapshot — try a live fetch.
      const fresh = await inner.loadAll();
      await persistSnapshot(fresh);
      return fresh;
    },

    async createActivity(data) {
      const activity: Activity = { ...data, id: nanoid(8) };
      applyOptimisticCreateActivity(activity);
      await enqueue({
        id: nanoid(),
        kind: 'createActivity',
        payload: activity,
        createdAt: Date.now(),
        attempts: 0,
      });
      return activity;
    },

    async updateActivity(id, updates) {
      const updated = applyOptimisticUpdateActivity(id, updates);
      if (!updated) throw new Error(`Activity ${id} not found`);
      await enqueue({
        id: nanoid(),
        kind: 'updateActivity',
        payload: { id, updates },
        createdAt: Date.now(),
        attempts: 0,
      });
      return updated;
    },

    async deleteActivity(id) {
      applyOptimisticDeleteActivity(id);
      await enqueue({
        id: nanoid(),
        kind: 'deleteActivity',
        payload: { id },
        createdAt: Date.now(),
        attempts: 0,
      });
    },

    async createProgressLog(data) {
      applyOptimisticCreateLog(data);
      await enqueue({
        id: nanoid(),
        kind: 'createProgressLog',
        payload: data,
        createdAt: Date.now(),
        attempts: 0,
      });
      return data;
    },

    getStatus: currentStatus,

    subscribe(listener) {
      listeners.add(listener);
      listener(currentStatus());
      return () => listeners.delete(listener);
    },

    subscribeSnapshot(listener) {
      snapshotListeners.add(listener);
      if (snapshot) listener(snapshot);
      return () => snapshotListeners.delete(listener);
    },

    retry(entryId) {
      queue = queue.map((e) =>
        e.id === entryId
          ? { ...e, permanentlyFailed: false, lastError: undefined, failureReason: undefined, attempts: 0 }
          : e,
      );
      void persistQueue();
      emit();
      scheduleFlush();
    },

    discard(entryId) {
      queue = queue.filter((e) => e.id !== entryId);
      void persistQueue();
      emit();
    },

    resumeAfterReconnect() {
      authPaused = false;
      backoffMs = 1000;
      emit();
      scheduleFlush();
    },

    async flushNow() {
      scheduleFlush();
      if (flushPromise) await flushPromise;
    },

    getSnapshot() {
      return snapshot;
    },
  };

  return outer;
}
