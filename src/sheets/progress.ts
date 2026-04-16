import { nanoid } from 'nanoid';
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
  const activityIdCol = colMap.get('activityid') ?? 1;

  return rows
    .slice(1)
    .filter(row => row.some(cell => cell))
    .filter(row => !activityId || row[activityIdCol] === activityId)
    .map(row => rowToProgressLog(row, colMap, measurementType));
}

export async function createProgressLog(
  client: SheetsClient,
  data: Omit<LogEntry, 'id' | 'createdAt'>,
  measurementType: MeasurementType
): Promise<LogEntry> {
  const log: LogEntry = {
    ...data,
    id: nanoid(8),
    createdAt: new Date().toISOString(),
  };
  await client.appendValues('Progress!A:I', [progressLogToRow(log, measurementType)]);
  return log;
}

export async function deleteProgressLog(
  client: SheetsClient,
  id: string,
  progressSheetId: number
): Promise<void> {
  const rows = await client.getValues('Progress!A1:Z');
  const colMap = buildColumnMap(rows[0]);
  const idCol = colMap.get('id') ?? 0;

  const rowIndex = rows.findIndex((row, i) => i > 0 && row[idCol] === id);
  if (rowIndex === -1) throw new Error(`Progress log ${id} not found`);

  await client.deleteRow('Progress', progressSheetId, rowIndex + 1);
}
