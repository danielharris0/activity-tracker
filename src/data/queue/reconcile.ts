import type { Activity } from '../../types/activity';
import type { QueueEntry } from './types';

export interface FailedClassification {
  entry: QueueEntry;
  reason: string;
}

export interface ClassifiedQueue {
  toFlush: QueueEntry[];
  toDrop: QueueEntry[];
  toFail: FailedClassification[];
}

/**
 * Classifies pending queue entries against an authoritative upstream snapshot.
 * Decisions:
 *   - createActivity             → flush.
 *   - updateActivity, upstream present  → flush (queue wins).
 *   - updateActivity, upstream missing  → fail — activity was deleted elsewhere.
 *   - deleteActivity, upstream missing  → drop (already gone).
 *   - deleteActivity, upstream present  → flush.
 *   - createProgressLog, activity present → flush.
 *   - createProgressLog, activity missing → fail — activity was deleted elsewhere.
 *
 * Ids of pending `createActivity` entries in `queue` are treated as present
 * upstream so that a log or update queued behind its own create is not
 * mis-classified as failed.
 */
export function classifyQueueAgainstUpstream(
  queue: QueueEntry[],
  upstream: { activities: Activity[] },
): ClassifiedQueue {
  const ids = new Set(upstream.activities.map((a) => a.id));
  const result: ClassifiedQueue = { toFlush: [], toDrop: [], toFail: [] };

  const pendingCreateIds = new Set(
    queue.filter((e) => e.kind === 'createActivity').map((e) => (e as { payload: Activity }).payload.id),
  );

  for (const entry of queue) {
    if (entry.permanentlyFailed) continue;
    switch (entry.kind) {
      case 'createActivity':
        result.toFlush.push(entry);
        break;
      case 'updateActivity': {
        if (ids.has(entry.payload.id) || pendingCreateIds.has(entry.payload.id)) {
          result.toFlush.push(entry);
        } else {
          result.toFail.push({ entry, reason: 'Activity deleted on another device' });
        }
        break;
      }
      case 'deleteActivity': {
        if (ids.has(entry.payload.id) || pendingCreateIds.has(entry.payload.id)) {
          result.toFlush.push(entry);
        } else {
          result.toDrop.push(entry);
        }
        break;
      }
      case 'createProgressLog': {
        if (ids.has(entry.payload.activityId) || pendingCreateIds.has(entry.payload.activityId)) {
          result.toFlush.push(entry);
        } else {
          result.toFail.push({ entry, reason: 'Activity deleted on another device' });
        }
        break;
      }
    }
  }

  return result;
}
