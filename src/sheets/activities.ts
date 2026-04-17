import type { SheetsClient } from './client';
import type { Activity } from '../types/activity';
import { activityToRow, rowToActivity, buildColumnMap } from './serialization';

export async function getActivities(client: SheetsClient): Promise<Activity[]> {
  const rows = await client.getValues('Activities!A1:Z');
  if (rows.length < 2) return [];

  const colMap = buildColumnMap(rows[0]);
  return rows.slice(1).filter(row => row.some(cell => cell)).map(row => rowToActivity(row, colMap));
}

export async function createActivity(
  client: SheetsClient,
  activity: Activity
): Promise<Activity> {
  await client.appendValues('Activities!A:F', [activityToRow(activity)]);
  return activity;
}

export async function updateActivity(
  client: SheetsClient,
  id: string,
  updates: Partial<Omit<Activity, 'id'>>
): Promise<Activity> {
  const rows = await client.getValues('Activities!A1:Z');
  const colMap = buildColumnMap(rows[0]);
  const idCol = colMap.get('id') ?? 0;

  const rowIndex = rows.findIndex((row, i) => i > 0 && row[idCol] === id);
  if (rowIndex === -1) throw new Error(`Activity ${id} not found`);

  const existing = rowToActivity(rows[rowIndex], colMap);
  const updated: Activity = { ...existing, ...updates };
  const sheetRow = rowIndex + 1; // 1-indexed
  await client.updateValues(`Activities!A${sheetRow}:F${sheetRow}`, [activityToRow(updated)]);
  return updated;
}

export async function deleteActivity(
  client: SheetsClient,
  id: string,
  activitiesSheetId: number
): Promise<void> {
  const rows = await client.getValues('Activities!A1:Z');
  const colMap = buildColumnMap(rows[0]);
  const idCol = colMap.get('id') ?? 0;

  const rowIndex = rows.findIndex((row, i) => i > 0 && row[idCol] === id);
  if (rowIndex === -1) throw new Error(`Activity ${id} not found`);

  await client.deleteRow('Activities', activitiesSheetId, rowIndex + 1);
}
