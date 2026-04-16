import type { SheetsClient } from './client';
import { ACTIVITY_HEADERS, PROGRESS_HEADERS } from './serialization';

export async function ensureSheetsExist(
  client: SheetsClient
): Promise<{ activitiesSheetId: number; progressSheetId: number }> {
  const existing = await client.getSheetProperties();
  const byName = new Map(existing.map(s => [s.title, s.sheetId]));

  let activitiesSheetId: number;
  if (byName.has('Activities')) {
    activitiesSheetId = byName.get('Activities')!;
  } else {
    activitiesSheetId = await client.addSheet('Activities');
  }

  let progressSheetId: number;
  if (byName.has('Progress')) {
    progressSheetId = byName.get('Progress')!;
  } else {
    progressSheetId = await client.addSheet('Progress');
  }

  // Ensure headers exist and are up to date
  await ensureHeaders(client, 'Activities', ACTIVITY_HEADERS);
  await ensureHeaders(client, 'Progress', PROGRESS_HEADERS);

  return { activitiesSheetId, progressSheetId };
}

async function ensureHeaders(
  client: SheetsClient,
  sheetName: string,
  expectedHeaders: string[]
): Promise<void> {
  const rows = await client.getValues(`${sheetName}!1:1`);
  if (rows.length === 0 || rows[0].length === 0) {
    await client.updateValues(`${sheetName}!A1`, [expectedHeaders]);
    return;
  }

  // Extend existing headers if new columns have been added
  const currentHeaders = rows[0];
  if (currentHeaders.length < expectedHeaders.length) {
    const missingHeaders = expectedHeaders.slice(currentHeaders.length);
    const startCol = String.fromCharCode(65 + currentHeaders.length); // A=65
    await client.updateValues(
      `${sheetName}!${startCol}1`,
      [missingHeaders]
    );
  }
}
