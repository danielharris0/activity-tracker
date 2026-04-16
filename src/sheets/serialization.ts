import type { Activity, LogEntry, MeasurementType, BestOfData } from '../types/activity';
import { parseDuration, formatDurationForSheet } from '../lib/duration';

export function buildColumnMap(headerRow: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headerRow.forEach((header, index) => {
    map.set(header.trim().toLowerCase(), index);
  });
  return map;
}

// --- Activities ---

export const ACTIVITY_HEADERS = ['id', 'name', 'description', 'tags', 'measurementType', 'typicalAttemptDuration'];

export function activityToRow(a: Activity): string[] {
  return [
    a.id,
    a.name,
    a.description,
    a.tags.join(', '),
    a.measurementType,
    a.typicalAttemptDuration != null ? String(a.typicalAttemptDuration) : '',
  ];
}

export function rowToActivity(row: string[], colMap: Map<string, number>): Activity {
  const get = (key: string) => row[colMap.get(key) ?? -1] ?? '';
  const tadStr = get('typicalattemptduration');
  const tad = tadStr ? parseInt(tadStr, 10) : undefined;
  return {
    id: get('id'),
    name: get('name'),
    description: get('description'),
    tags: get('tags') ? get('tags').split(',').map(s => s.trim()).filter(Boolean) : [],
    measurementType: (get('measurementtype') as MeasurementType) || 'count',
    ...(tad != null && !isNaN(tad) ? { typicalAttemptDuration: tad } : {}),
  };
}

// --- Progress logs ---

export const PROGRESS_HEADERS = ['id', 'activityId', 'date', 'time', 'value', 'notes', 'createdAt', 'bestOfType', 'bestOfValue'];

export function progressLogToRow(log: LogEntry, measurementType: MeasurementType): string[] {
  const valueStr = measurementType === 'duration'
    ? formatDurationForSheet(log.value)
    : String(log.value);

  let bestOfType = '';
  let bestOfValue = '';
  if (log.bestOf) {
    bestOfType = log.bestOf.type;
    bestOfValue = String(log.bestOf.type === 'attempts' ? log.bestOf.count : log.bestOf.seconds);
  }

  return [
    log.id,
    log.activityId,
    log.date,
    log.time,
    valueStr,
    log.notes,
    log.createdAt,
    bestOfType,
    bestOfValue,
  ];
}

export function rowToProgressLog(
  row: string[],
  colMap: Map<string, number>,
  measurementType: MeasurementType
): LogEntry {
  const get = (key: string) => row[colMap.get(key) ?? -1] ?? '';
  const rawValue = get('value') || '0';
  const value = measurementType === 'duration'
    ? (parseDuration(rawValue) ?? 0)
    : parseInt(rawValue, 10) || 0;

  let bestOf: BestOfData | undefined;
  const boType = get('bestoftype');
  const boValue = get('bestofvalue');
  if (boType === 'attempts' && boValue) {
    const count = parseInt(boValue, 10);
    if (!isNaN(count) && count > 0) bestOf = { type: 'attempts', count };
  } else if (boType === 'duration' && boValue) {
    const seconds = parseInt(boValue, 10);
    if (!isNaN(seconds) && seconds > 0) bestOf = { type: 'duration', seconds };
  }

  return {
    id: get('id'),
    activityId: get('activityid'),
    date: get('date'),
    time: get('time'),
    value,
    notes: get('notes'),
    createdAt: get('createdat'),
    ...(bestOf ? { bestOf } : {}),
  };
}
