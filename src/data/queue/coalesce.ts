import type { QueueEntry } from './types';

/**
 * Returns the next queue array given an incoming entry.
 * Rules:
 *   - updateActivity(id, patch) + pending createActivity(id): merge patch into create, drop update.
 *   - deleteActivity(id) + pending createActivity(id): remove both entries.
 *   - createProgressLog for a locally-created activity: leave as-is (serial replay handles ordering).
 *   - Otherwise: append.
 */
export function coalesce(queue: QueueEntry[], incoming: QueueEntry): QueueEntry[] {
  if (incoming.kind === 'updateActivity') {
    const targetId = incoming.payload.id;
    const pendingCreateIdx = queue.findIndex(
      (e) => e.kind === 'createActivity' && e.payload.id === targetId,
    );
    if (pendingCreateIdx !== -1) {
      const create = queue[pendingCreateIdx];
      if (create.kind !== 'createActivity') return [...queue, incoming];
      const merged: QueueEntry = {
        ...create,
        payload: { ...create.payload, ...incoming.payload.updates },
      };
      const next = [...queue];
      next[pendingCreateIdx] = merged;
      return next;
    }
    return [...queue, incoming];
  }

  if (incoming.kind === 'deleteActivity') {
    const targetId = incoming.payload.id;
    const pendingCreateIdx = queue.findIndex(
      (e) => e.kind === 'createActivity' && e.payload.id === targetId,
    );
    if (pendingCreateIdx !== -1) {
      return queue.filter((e, i) => {
        if (i === pendingCreateIdx) return false;
        if (e.kind === 'updateActivity' && e.payload.id === targetId) return false;
        if (e.kind === 'createProgressLog' && e.payload.activityId === targetId) return false;
        return true;
      });
    }
    return [...queue, incoming];
  }

  return [...queue, incoming];
}
