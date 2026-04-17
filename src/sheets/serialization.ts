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

export const PROGRESS_HEADERS = ['activityId', 'date', 'time', 'value', 'bestOfType', 'bestOfValue', 'bestOfTypicalDuration'];

export function progressLogToRow(log: LogEntry, measurementType: MeasurementType): string[] {
  const valueStr = measurementType === 'duration'
    ? formatDurationForSheet(log.value)
    : String(log.value);

  const bestOfType = log.bestOf.type;
  const bestOfValue = String(log.bestOf.type === 'attempts' ? log.bestOf.count : log.bestOf.seconds);
  const bestOfTypicalDuration =
    log.bestOf.type === 'duration' && log.bestOf.typicalAttemptDuration != null
      ? String(log.bestOf.typicalAttemptDuration)
      : '';

  return [
    log.activityId,
    log.date,
    log.time,
    valueStr,
    bestOfType,
    bestOfValue,
    bestOfTypicalDuration,
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

  let bestOf: BestOfData = { type: 'attempts', count: 1 };
  const boType = get('bestoftype');
  const boValue = get('bestofvalue');
  if (boType === 'attempts' && boValue) {
    const count = parseInt(boValue, 10);
    if (!isNaN(count) && count > 0) bestOf = { type: 'attempts', count };
  } else if (boType === 'duration' && boValue) {
    const seconds = parseInt(boValue, 10);
    if (!isNaN(seconds) && seconds > 0) {
      const boTypicalDur = get('bestoftypicalduration');
      const typicalSecs = boTypicalDur ? parseInt(boTypicalDur, 10) : undefined;
      bestOf = {
        type: 'duration',
        seconds,
        ...(typicalSecs && !isNaN(typicalSecs) ? { typicalAttemptDuration: typicalSecs } : {}),
      };
    }
  }

  return {
    activityId: get('activityid'),
    date: get('date'),
    time: get('time'),
    value,
    bestOf,
  };
}
