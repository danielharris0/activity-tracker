import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { createSheetsProvider } from './data/sheets-adapter';
import { createQueuedProvider } from './data/queue/queuedProvider';
import { useDataStore } from './stores/dataStore';
import { useQueueStore } from './stores/queueStore';
import { connect, getAccessToken } from './sheets/auth';
import { ConnectionSetup } from './components/settings/ConnectionSetup';
import { AppShell } from './components/layout/AppShell';
import { ReconnectBanner } from './components/layout/ReconnectBanner';
import { ActivityList } from './components/activity/ActivityList';
import { ActivityDetail } from './components/activity/ActivityDetail';
import { CreateActivityForm } from './components/activity/CreateActivityForm';

export default function App() {
  const isLoaded = useDataStore((s) => s.isLoaded);
  const init = useDataStore((s) => s.init);
  const bindQueue = useQueueStore((s) => s.bind);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoConnectAttempted = useRef(false);

  const handleConnect = useCallback(
    async (clientId: string, spreadsheetId: string, requireFreshToken: boolean) => {
      setIsConnecting(true);
      setError(null);
      try {
        if (requireFreshToken || getAccessToken()) {
          await connect(clientId);
        }
        const inner = await createSheetsProvider(spreadsheetId);
        const queued = await createQueuedProvider(inner);
        bindQueue(queued);
        await init(queued);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to connect');
      } finally {
        setIsConnecting(false);
      }
    },
    [init, bindQueue],
  );

  useEffect(() => {
    if (autoConnectAttempted.current) return;
    autoConnectAttempted.current = true;

    const clientId = localStorage.getItem('google_client_id');
    const spreadsheetId = localStorage.getItem('spreadsheet_id');
    if (clientId && spreadsheetId) {
      // Don't force a fresh token on boot — if it's missing, the wrapper
      // serves cached snapshot and the reconnect banner handles re-auth.
      handleConnect(clientId, spreadsheetId, false);
    }
  }, [handleConnect]);

  if (!isLoaded) {
    if (isConnecting) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-gray-500 text-sm">Reconnecting to Google Sheets...</p>
        </div>
      );
    }

    return (
      <ConnectionSetup
        onConnect={(clientId, spreadsheetId) => handleConnect(clientId, spreadsheetId, true)}
        isConnecting={isConnecting}
        error={error}
      />
    );
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ReconnectBanner />
      <Routes>
        <Route path="/" element={<Navigate to="/activities" replace />} />
        <Route element={<AppShell />}>
          <Route path="/activities" element={<ActivityList />} />
          <Route path="/activities/new" element={<CreateActivityForm />} />
          <Route path="/activities/:id" element={<ActivityDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
