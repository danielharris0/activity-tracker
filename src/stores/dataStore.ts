import { create } from 'zustand';
import type { Activity, LogEntry } from '../types/activity';
import type { DataProvider } from '../data/provider';

let provider: DataProvider | null = null;

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

export const useDataStore = create<DataState>((set, get) => ({
  activities: [],
  logs: [],
  isLoaded: false,

  async init(p) {
    provider = p;
    const { activities, logs } = await p.loadAll();
    set({ activities, logs, isLoaded: true });
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
      progressLogs: s.logs.filter((l) => l.activityId !== id),
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
