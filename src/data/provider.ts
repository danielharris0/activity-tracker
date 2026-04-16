import type { Activity, LogEntry, MeasurementType } from '../types/activity';

export interface DataProvider {
  loadAll(): Promise<{ activities: Activity[]; logs: LogEntry[] }>;

  createActivity(data: Omit<Activity, 'id'>): Promise<Activity>;
  updateActivity(id: string, updates: Partial<Omit<Activity, 'id'>>): Promise<Activity>;
  deleteActivity(id: string): Promise<void>;

  createProgressLog(
    data: Omit<LogEntry, 'id' | 'createdAt'>,
    measurementType: MeasurementType
  ): Promise<LogEntry>;
  deleteProgressLog(id: string): Promise<void>;
}
