export type MeasurementType = 'count' | 'duration';

export type BestOfData =
  | { type: 'attempts'; count: number }
  | { type: 'duration'; seconds: number; typicalAttemptDuration?: number };

export interface Activity {
  id: string;
  name: string;
  description: string;
  tags: string[];
  measurementType: MeasurementType;
  typicalAttemptDuration?: number; // seconds, used to convert practice durations to effective N
}

export interface LogEntry {
  activityId: string;
  date: string;       // "YYYY-MM-DD"
  time: string;       // "HH:mm"
  value: number;      // integer for count, total seconds for duration
  bestOf: BestOfData;
}
