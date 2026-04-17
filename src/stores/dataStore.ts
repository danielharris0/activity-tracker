import { create } from 'zustand';
import type { Activity, LogEntry } from '../types/activity';
import type { DataProvider } from '../data/provider';
import type { QueuedProvider } from '../data/queue/queuedProvider';

let provider: DataProvider | null = null;
let snapshotUnsubscribe: (() => void) | null = null;

interface DataState {
  activities: Activity[];
  logs: LogEntry[];
  isLoaded: boolean;

  init(p: DataProvider): Promise<void>;
  createActivity(data: Omit<Activity, 'id'>): Promise<Activity>;
  updateActivity(id: string, updates: Partial<Omit<Activity, 'id'>>): Promise<Activity>;
  deleteActivity(id: string): Promise<void>;
  createProgressLog(data: LogEntry): Promise<LogEntry>;
}

function requireProvider(): DataProvider {
  if (!provider) throw new Error('Not connected — call init() first');
  return provider;
}

function hasSnapshotSubscribe(p: DataProvider): p is QueuedProvider {
  return typeof (p as QueuedProvider).subscribeSnapshot === 'function';
}

export const useDataStore = create<DataState>((set, get) => ({
  activities: [],
  logs: [],
  isLoaded: false,

  async init(p) {
    provider = p;
    snapshotUnsubscribe?.();
    snapshotUnsubscribe = null;

    const { activities, logs } = await p.loadAll();
    set({ activities, logs, isLoaded: true });

    if (hasSnapshotSubscribe(p)) {
      snapshotUnsubscribe = p.subscribeSnapshot((snapshot) => {
        set({ activities: snapshot.activities, logs: snapshot.logs });
      });
    }
  },

  async createActivity(data) {
    const activity = await requireProvider().createActivity(data);
    set((s) => ({ activities: [...s.activities, activity] }));
    return activity;
  },

  async updateActivity(id, updates) {
    const activity = await requireProvider().updateActivity(id, updates);
    set((s) => ({
      activities: s.activities.map((a) => (a.id === id ? activity : a)),
    }));
    return activity;
  },

  async deleteActivity(id) {
    await requireProvider().deleteActivity(id);
    set((s) => ({
      activities: s.activities.filter((a) => a.id !== id),
      logs: s.logs.filter((l) => l.activityId !== id),
    }));
  },

  async createProgressLog(data) {
    const activity = get().activities.find((a) => a.id === data.activityId);
    if (!activity) throw new Error(`Activity ${data.activityId} not found`);
    const log = await requireProvider().createProgressLog(data, activity.measurementType);
    set((s) => ({ logs: [...s.logs, log] }));
    return log;
  },

}));
