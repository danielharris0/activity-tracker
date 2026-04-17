import { useQueueStore } from '../../stores/queueStore';
import type { QueueEntry } from '../../data/queue/types';

interface Props {
  onClose: () => void;
}

export function FailedEntriesDialog({ onClose }: Props) {
  const failedEntries = useQueueStore((s) => s.failedEntries);
  const retry = useQueueStore((s) => s.retry);
  const discard = useQueueStore((s) => s.discard);

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg max-w-xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Failed changes
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700"
          >
            &times;
          </button>
        </div>
        <div className="overflow-auto flex-1">
          {failedEntries.length === 0 ? (
            <div className="p-6 text-sm text-gray-500 text-center">
              No failed changes.
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {failedEntries.map((entry) => (
                <li key={entry.id} className="px-4 py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">
                      {describeEntry(entry)}
                    </div>
                    <div className="text-xs text-red-600 mt-0.5">
                      {entry.failureReason || entry.lastError || 'Unknown error'}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => retry(entry.id)}
                      className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 rounded hover:bg-indigo-100"
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => discard(entry.id)}
                      className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100"
                    >
                      Discard
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function describeEntry(entry: QueueEntry): string {
  switch (entry.kind) {
    case 'createActivity':
      return `Create activity "${entry.payload.name}"`;
    case 'updateActivity':
      return `Update activity ${entry.payload.id}`;
    case 'deleteActivity':
      return `Delete activity ${entry.payload.id}`;
    case 'createProgressLog':
      return `Log entry on ${entry.payload.date} ${entry.payload.time}`;
  }
}
