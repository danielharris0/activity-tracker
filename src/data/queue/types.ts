import type { Activity, LogEntry } from '../../types/activity';

export type QueueKind =
  | 'createActivity'
  | 'updateActivity'
  | 'deleteActivity'
  | 'createProgressLog';

export type QueueEntry =
  | {
      id: string;
      kind: 'createActivity';
      payload: Activity;
      createdAt: number;
      attempts: number;
      lastError?: string;
      permanentlyFailed?: boolean;
      failureReason?: string;
    }
  | {
      id: string;
      kind: 'updateActivity';
      payload: { id: string; updates: Partial<Omit<Activity, 'id'>> };
      createdAt: number;
      attempts: number;
      lastError?: string;
      permanentlyFailed?: boolean;
      failureReason?: string;
    }
  | {
      id: string;
      kind: 'deleteActivity';
      payload: { id: string };
      createdAt: number;
      attempts: number;
      lastError?: string;
      permanentlyFailed?: boolean;
      failureReason?: string;
    }
  | {
      id: string;
      kind: 'createProgressLog';
      payload: LogEntry;
      createdAt: number;
      attempts: number;
      lastError?: string;
      permanentlyFailed?: boolean;
      failureReason?: string;
    };

export type QueueStatus = {
  pending: number;
  isOnline: boolean;
  authPaused: boolean;
  isSyncing: boolean;
  failedEntries: QueueEntry[];
};
