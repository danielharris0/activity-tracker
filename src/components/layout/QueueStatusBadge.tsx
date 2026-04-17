import { useState } from 'react';
import { useQueueStore } from '../../stores/queueStore';
import { FailedEntriesDialog } from './FailedEntriesDialog';

export function QueueStatusBadge() {
  const { pending, isOnline, authPaused, isSyncing, failedEntries } = useQueueStore();
  const [dialogOpen, setDialogOpen] = useState(false);

  const failedCount = failedEntries.length;

  if (authPaused) {
    // The ReconnectBanner handles this state; keep the badge area empty.
    return failedCount > 0 ? (
      <>
        <FailedPill count={failedCount} onClick={() => setDialogOpen(true)} />
        {dialogOpen && <FailedEntriesDialog onClose={() => setDialogOpen(false)} />}
      </>
    ) : null;
  }

  if (pending === 0 && failedCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {pending > 0 && isOnline && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
          <span className={`h-1.5 w-1.5 rounded-full bg-amber-500 ${isSyncing ? 'animate-pulse' : ''}`} />
          Syncing {pending}…
        </span>
      )}
      {pending > 0 && !isOnline && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-700">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-500" />
          Offline · {pending} pending
        </span>
      )}
      {failedCount > 0 && (
        <FailedPill count={failedCount} onClick={() => setDialogOpen(true)} />
      )}
      {dialogOpen && <FailedEntriesDialog onClose={() => setDialogOpen(false)} />}
    </div>
  );
}

function FailedPill({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 hover:bg-red-200 transition-colors"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      {count} failed
    </button>
  );
}
