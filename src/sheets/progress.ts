import type { SheetsClient } from './client';
import type { LogEntry, MeasurementType } from '../types/activity';
import { progressLogToRow, rowToProgressLog, buildColumnMap } from './serialization';

export async function getProgressLogs(
  client: SheetsClient,
  measurementType: MeasurementType,
  activityId?: string
): Promise<LogEntry[]> {
  const rows = await client.getValues('Progress!A1:Z');
  if (rows.length < 2) return [];

  const colMap = buildColumnMap(rows[0]);
  const activityIdCol = colMap.get('activityid') ?? 0;

  return rows
    .slice(1)
    .filter(row => row.some(cell => cell))
    .filter(row => !activityId || row[activityIdCol] === activityId)
    .map(row => rowToProgressLog(row, colMap, measurementType));
}

export async function createProgressLog(
  client: SheetsClient,
  data: LogEntry,
  measurementType: MeasurementType
): Promise<LogEntry> {
  await client.appendValues('Progress!A:G', [progressLogToRow(data, measurementType)]);
  return data;
}
