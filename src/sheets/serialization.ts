import type { Activity, LogEntry, MeasurementType } from '../types/activity';
import type { SheetCell } from './client';
import { parseDuration, formatDurationForSheet } from '../lib/duration';

function asString(cell: SheetCell | undefined): string {
  return cell == null ? '' : String(cell);
}

function asNumber(cell: SheetCell | undefined): number | null {
  if (typeof cell === 'number' && Number.isFinite(cell)) return cell;
  if (cell == null || cell === '') return null;
  const n = parseInt(String(cell), 10);
  return Number.isNaN(n) ? null : n;
}

export function buildColumnMap(headerRow: SheetCell[]): Map<string, number> {
  const map = new Map<string, number>();
  headerRow.forEach((header, index) => {
    map.set(asString(header).trim().toLowerCase(), index);
  });
  return map;
}

// --- Activities ---

export const ACTIVITY_HEADERS = ['id', 'name', 'description', 'tags', 'measurementType', 'typicalAttemptDuration'];

export function activityToRow(a: Activity): SheetCell[] {
  return [
    a.id,
    a.name,
    a.description,
    a.tags.join(', '),
    a.measurementType,
    a.typicalAttemptDuration != null ? a.typicalAttemptDuration : '',
  ];
}

export function rowToActivity(row: SheetCell[], colMap: Map<string, number>): Activity {
  const get = (key: string) => row[colMap.get(key) ?? -1];
  const tad = asNumber(get('typicalattemptduration'));
  const tagsStr = asString(get('tags'));
  return {
    id: asString(get('id')),
    name: asString(get('name')),
    description: asString(get('description')),
    tags: tagsStr ? tagsStr.split(',').map(s => s.trim()).filter(Boolean) : [],
    measurementType: (asString(get('measurementtype')) as MeasurementType) || 'count',
    ...(tad != null ? { typicalAttemptDuration: tad } : {}),
  };
}

// --- Progress logs ---

export const PROGRESS_HEADERS = ['activityId', 'date', 'time', 'value', 'bestOf'];

export function progressLogToRow(log: LogEntry, measurementType: MeasurementType): SheetCell[] {
  const valueCell: SheetCell = measurementType === 'duration'
    ? formatDurationForSheet(log.value)
    : log.value;

  return [
    log.activityId,
    log.date,
    log.time,
    valueCell,
    log.bestOf,
  ];
}

export function rowToProgressLog(
  row: SheetCell[],
  colMap: Map<string, number>,
  measurementType: MeasurementType
): LogEntry {
  const get = (key: string) => row[colMap.get(key) ?? -1];
  const rawValue = get('value');
  const value = measurementType === 'duration'
    ? (parseDuration(asString(rawValue)) ?? 0)
    : (asNumber(rawValue) ?? 0);

  const parsedBestOf = asNumber(get('bestof'));
  const bestOf = parsedBestOf != null && parsedBestOf > 0 ? parsedBestOf : 1;

  return {
    activityId: asString(get('activityid')),
    date: asString(get('date')),
    time: asString(get('time')),
    value,
    bestOf,
  };
}
