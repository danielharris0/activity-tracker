import { useState } from 'react';
import { useQueueStore } from '../../stores/queueStore';
import { connect } from '../../sheets/auth';

export function ReconnectBanner() {
  const authPaused = useQueueStore((s) => s.authPaused);
  const pending = useQueueStore((s) => s.pending);
  const reconnect = useQueueStore((s) => s.reconnect);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!authPaused) return null;

  async function handleReconnect() {
    const clientId = localStorage.getItem('google_client_id');
    if (!clientId) {
      setError('Missing Google client ID — reconfigure in settings.');
      return;
    }
    setIsReconnecting(true);
    setError(null);
    try {
      await connect(clientId);
      reconnect();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reconnect failed');
    } finally {
      setIsReconnecting(false);
    }
  }

  return (
    <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between gap-4">
      <div className="text-sm">
        Reconnect to sync {pending} pending change{pending === 1 ? '' : 's'}.
        {error && <span className="ml-2 opacity-80">{error}</span>}
      </div>
      <button
        type="button"
        onClick={handleReconnect}
        disabled={isReconnecting}
        className="px-3 py-1 text-sm font-medium bg-white text-red-700 rounded hover:bg-red-50 disabled:opacity-50"
      >
        {isReconnecting ? 'Reconnecting…' : 'Reconnect'}
      </button>
    </div>
  );
}
