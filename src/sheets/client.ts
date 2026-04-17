import { notifyAuthInvalidated } from './auth';

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export class SheetsApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(`Sheets API error ${status}: ${JSON.stringify(body)}`);
    this.status = status;
    this.body = body;
  }
}

export interface SheetsClient {
  getValues(range: string): Promise<string[][]>;
  appendValues(range: string, values: string[][]): Promise<void>;
  updateValues(range: string, values: string[][]): Promise<void>;
  deleteRow(sheetName: string, sheetId: number, rowIndex: number): Promise<void>;
  getSheetProperties(): Promise<Array<{ title: string; sheetId: number }>>;
  addSheet(title: string): Promise<number>;
}

export function createSheetsClient(
  spreadsheetId: string,
  getToken: () => string
): SheetsClient {
  const baseUrl = `${SHEETS_BASE}/${spreadsheetId}`;

  async function request(url: string, options?: RequestInit): Promise<unknown> {
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        notifyAuthInvalidated();
      }
      throw new SheetsApiError(res.status, error);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  }

  return {
    async getValues(range: string): Promise<string[][]> {
      const url = `${baseUrl}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`;
      const data = (await request(url)) as { values?: string[][] };
      return data.values ?? [];
    },

    async appendValues(range: string, values: string[][]): Promise<void> {
      const url = `${baseUrl}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
      await request(url, {
        method: 'POST',
        body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
      });
    },

    async updateValues(range: string, values: string[][]): Promise<void> {
      const url = `${baseUrl}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;
      await request(url, {
        method: 'PUT',
        body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
      });
    },

    async deleteRow(_sheetName: string, sheetId: number, rowIndex: number): Promise<void> {
      const url = `${baseUrl}:batchUpdate`;
      await request(url, {
        method: 'POST',
        body: JSON.stringify({
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndex - 1, // 0-indexed
                  endIndex: rowIndex,
                },
              },
            },
          ],
        }),
      });
    },

    async getSheetProperties(): Promise<Array<{ title: string; sheetId: number }>> {
      const url = `${baseUrl}?fields=sheets.properties`;
      const data = (await request(url)) as {
        sheets?: Array<{ properties: { title: string; sheetId: number } }>;
      };
      return (data.sheets ?? []).map((s) => ({
        title: s.properties.title,
        sheetId: s.properties.sheetId,
      }));
    },

    async addSheet(title: string): Promise<number> {
      const url = `${baseUrl}:batchUpdate`;
      const data = (await request(url, {
        method: 'POST',
        body: JSON.stringify({
          requests: [{ addSheet: { properties: { title } } }],
        }),
      })) as { replies: Array<{ addSheet: { properties: { sheetId: number } } }> };
      return data.replies[0].addSheet.properties.sheetId;
    },
  };
}
