import type { DataProvider } from './provider';
import type { LogEntry } from '../types/activity';
import { createSheetsClient } from '../sheets/client';
import { connect, getAccessToken } from '../sheets/auth';
import { ensureSheetsExist } from '../sheets/init';
import * as activitiesApi from '../sheets/activities';
import * as progressApi from '../sheets/progress';
import { buildColumnMap, rowToProgressLog } from '../sheets/serialization';

export async function createSheetsProvider(
  clientId: string,
  spreadsheetId: string
): Promise<DataProvider> {
  await connect(clientId);

  const client = createSheetsClient(spreadsheetId, () => {
    const token = getAccessToken();
    if (!token) throw new Error('No access token available');
    return token;
  });

  const { activitiesSheetId } = await ensureSheetsExist(client);

  return {
    async loadAll() {
      const activities = await activitiesApi.getActivities(client);

      const mtByActivityId = new Map(
        activities.map((a) => [a.id, a.measurementType])
      );

      const rows = await client.getValues('Progress!A1:Z');
      let logs: LogEntry[] = [];
      if (rows.length >= 2) {
        const colMap = buildColumnMap(rows[0]);
        const activityIdCol = colMap.get('activityid') ?? 1;
        logs = rows
          .slice(1)
          .filter((row) => row.some((cell) => cell))
          .map((row) => {
            const actId = row[activityIdCol] ?? '';
            const mt = mtByActivityId.get(actId) ?? 'count';
            return rowToProgressLog(row, colMap, mt);
          });
      }

      return { activities, logs };
    },

    createActivity: (data) => activitiesApi.createActivity(client, data),
    updateActivity: (id, updates) =>
      activitiesApi.updateActivity(client, id, updates),
    deleteActivity: (id) =>
      activitiesApi.deleteActivity(client, id, activitiesSheetId),

    createProgressLog: (data, measurementType) =>
      progressApi.createProgressLog(client, data, measurementType),
  };
}
