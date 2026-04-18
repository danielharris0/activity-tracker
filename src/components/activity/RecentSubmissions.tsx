import type { Activity, BestOfData, LogEntry } from '../../types/activity';
import { formatDuration } from '../../lib/duration';

interface RecentSubmissionsProps {
  activity: Activity;
  logs: LogEntry[];
}

function formatBestOf(bestOf: BestOfData): string {
  if (bestOf.type === 'attempts') {
    return `best of ${bestOf.count}`;
  }
  return `best of ${formatDuration(bestOf.seconds)}`;
}

export function RecentSubmissions({ activity, logs }: RecentSubmissionsProps) {
  const recent = [...logs]
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
    .slice(0, 10);

  const formatValue = (value: number) =>
    activity.measurementType === 'duration' ? formatDuration(value) : String(value);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Submissions</h3>
      {recent.length === 0 ? (
        <p className="text-xs text-gray-500">No submissions yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {recent.map((log, idx) => (
            <li
              key={`${log.date}-${log.time}-${idx}`}
              className="flex items-center justify-between py-2 text-sm"
            >
              <span className="font-medium text-gray-900">{formatValue(log.value)}</span>
              <span className="text-xs text-gray-500">{formatBestOf(log.bestOf)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
