import { useState } from 'react';

interface ConnectionSetupProps {
  onConnect: (clientId: string, spreadsheetId: string) => Promise<void>;
  isConnecting: boolean;
  error: string | null;
}

export function ConnectionSetup({ onConnect, isConnecting, error }: ConnectionSetupProps) {
  const [clientId, setClientId] = useState(() => localStorage.getItem('google_client_id') ?? '');
  const [spreadsheetId, setSpreadsheetId] = useState(() => localStorage.getItem('spreadsheet_id') ?? '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('google_client_id', clientId);
    localStorage.setItem('spreadsheet_id', spreadsheetId);
    await onConnect(clientId, spreadsheetId);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Activity Tracker</h1>
        <p className="text-gray-600 mb-4">
          Connect to Google Sheets to get started.
        </p>

        <details className="mb-6 text-xs text-gray-500 border border-gray-200 rounded-md p-3">
          <summary className="font-medium text-gray-700 cursor-pointer">Setup instructions</summary>
          <ol className="mt-2 space-y-1.5 list-decimal list-inside">
            <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">Google Cloud Console</a> and create or select a project.</li>
            <li>Enable the <a href="https://console.cloud.google.com/apis/library/sheets.googleapis.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">Google Sheets API</a> for your project.</li>
            <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">Credentials</a> and create an <strong>OAuth 2.0 Client ID</strong>:
              <ul className="ml-4 mt-1 space-y-0.5 list-disc list-inside">
                <li>Application type: <strong>Web application</strong> (not Desktop)</li>
                <li>Authorized JavaScript origins: <code className="bg-gray-100 px-1 rounded">http://localhost:5173</code></li>
              </ul>
            </li>
            <li>Create a new Google Sheets spreadsheet (or use an existing one). The app will create the required tabs automatically.</li>
          </ol>
        </details>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-1">
              Google OAuth Client ID
            </label>
            <input
              id="clientId"
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="123456789.apps.googleusercontent.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              From your Web application OAuth credential (see setup instructions above).
            </p>
          </div>

          <div>
            <label htmlFor="spreadsheetId" className="block text-sm font-medium text-gray-700 mb-1">
              Spreadsheet ID
            </label>
            <input
              id="spreadsheetId"
              type="text"
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Found in the spreadsheet URL: docs.google.com/spreadsheets/d/<strong>SPREADSHEET_ID</strong>/edit
            </p>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isConnecting || !clientId || !spreadsheetId}
            className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isConnecting ? 'Connecting...' : 'Connect to Google Sheets'}
          </button>
        </form>
      </div>
    </div>
  );
}
