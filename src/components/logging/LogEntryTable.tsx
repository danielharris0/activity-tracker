import type { LogEntry, MeasurementType } from '../../types/activity';
import { formatDuration } from '../../lib/duration';
import { useDataStore } from '../../stores/dataStore';
import { useState } from 'react';

interface LogEntryTableProps {
  logs: LogEntry[];
  measurementType: MeasurementType;
}

function formatBestOf(log: LogEntry): string {
  if (!log.bestOf) return '\u2014';
  if (log.bestOf.type === 'attempts') return `${log.bestOf.count} attempts`;
  return `${formatDuration(log.bestOf.seconds)} session`;
}

export function LogEntryTable({ logs, measurementType }: LogEntryTableProps) {
  const deleteProgressLog = useDataStore((s) => s.deleteProgressLog);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sorted = [...logs].sort((a, b) => {
    const ta = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
    const tb = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
    return tb - ta;
  });

  const formatValue = (value: number) => {
    return measurementType === 'duration' ? formatDuration(value) : String(value);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteProgressLog(id);
    } catch {
      // silently fail for now
    } finally {
      setDeletingId(null);
    }
  };

  if (logs.length === 0) {
    return <p className="text-sm text-gray-500">No entries logged yet.</p>;
  }

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Date</th>
            <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Time</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">Value</th>
            <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Best Of</th>
            <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Notes</th>
            <th className="py-2 px-2"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((log) => (
            <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-2 text-gray-900">{log.date}</td>
              <td className="py-2 px-2 text-gray-600">{log.time}</td>
              <td className="py-2 px-2 text-right font-mono text-gray-900">
                {formatValue(log.value)}
              </td>
              <td className="py-2 px-2 text-gray-500">{formatBestOf(log)}</td>
              <td className="py-2 px-2 text-gray-500">{log.notes}</td>
              <td className="py-2 px-2">
                <button
                  onClick={() => handleDelete(log.id)}
                  disabled={deletingId === log.id}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  {deletingId === log.id ? '...' : 'Delete'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
