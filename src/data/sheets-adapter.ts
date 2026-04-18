import type { InnerDataProvider } from './provider';
import type { LogEntry } from '../types/activity';
import { createSheetsClient, SheetsApiError } from '../sheets/client';
import { getAccessToken } from '../sheets/auth';
import { ensureSheetsExist } from '../sheets/init';
import * as activitiesApi from '../sheets/activities';
import * as progressApi from '../sheets/progress';
import { buildColumnMap, rowToProgressLog } from '../sheets/serialization';

export async function createSheetsProvider(
  spreadsheetId: string
): Promise<InnerDataProvider> {
  const client = createSheetsClient(spreadsheetId, () => {
    const token = getAccessToken();
    if (!token) throw new SheetsApiError(401, { error: 'No access token' });
    return token;
  });

  let activitiesSheetId: number | null = null;
  async function getActivitiesSheetId(): Promise<number> {
    if (activitiesSheetId == null) {
      const ids = await ensureSheetsExist(client);
      activitiesSheetId = ids.activitiesSheetId;
    }
    return activitiesSheetId;
  }

  return {
    async loadAll() {
      await getActivitiesSheetId();
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
            const actId = String(row[activityIdCol] ?? '');
            const mt = mtByActivityId.get(actId) ?? 'count';
            return rowToProgressLog(row, colMap, mt);
          });
      }

      return { activities, logs };
    },

    createActivity: (activity) => activitiesApi.createActivity(client, activity),
    updateActivity: (id, updates) =>
      activitiesApi.updateActivity(client, id, updates),
    async deleteActivity(id) {
      const sheetId = await getActivitiesSheetId();
      return activitiesApi.deleteActivity(client, id, sheetId);
    },

    createProgressLog: (data, measurementType) =>
      progressApi.createProgressLog(client, data, measurementType),
  };
}
