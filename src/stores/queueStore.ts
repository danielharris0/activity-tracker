import { create } from 'zustand';
import type { QueueEntry, QueueStatus } from '../data/queue/types';
import type { QueuedProvider } from '../data/queue/queuedProvider';

interface QueueState extends QueueStatus {
  retry(entryId: string): void;
  discard(entryId: string): void;
  reconnect(): void;
  bind(provider: QueuedProvider): void;
  _unbind?: () => void;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  pending: 0,
  isOnline: navigator.onLine,
  authPaused: false,
  isSyncing: false,
  failedEntries: [] as QueueEntry[],

  retry() {},
  discard() {},
  reconnect() {},

  bind(provider: QueuedProvider) {
    get()._unbind?.();
    const unsubscribe = provider.subscribe((status) => {
      set(status);
    });
    set({
      ...provider.getStatus(),
      retry: (id: string) => provider.retry(id),
      discard: (id: string) => provider.discard(id),
      reconnect: () => provider.resumeAfterReconnect(),
      _unbind: unsubscribe,
    });
  },
}));
