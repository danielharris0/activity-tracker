import type { Activity, LogEntry, MeasurementType } from '../types/activity';

export interface DataProvider {
  loadAll(): Promise<{ activities: Activity[]; logs: LogEntry[] }>;

  createActivity(data: Omit<Activity, 'id'>): Promise<Activity>;
  updateActivity(id: string, updates: Partial<Omit<Activity, 'id'>>): Promise<Activity>;
  deleteActivity(id: string): Promise<void>;

  createProgressLog(
    data: LogEntry,
    measurementType: MeasurementType
  ): Promise<LogEntry>;
}

// The wrapper owns id generation for activities, so the inner (network-side)
// provider takes a full Activity with a pre-assigned id rather than generating
// its own.
export interface InnerDataProvider {
  loadAll(): Promise<{ activities: Activity[]; logs: LogEntry[] }>;

  createActivity(activity: Activity): Promise<Activity>;
  updateActivity(id: string, updates: Partial<Omit<Activity, 'id'>>): Promise<Activity>;
  deleteActivity(id: string): Promise<void>;

  createProgressLog(
    data: LogEntry,
    measurementType: MeasurementType
  ): Promise<LogEntry>;
}
