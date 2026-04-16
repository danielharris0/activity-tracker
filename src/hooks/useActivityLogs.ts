import { useMemo } from 'react';
import { useDataStore } from '../stores/dataStore';

export function useActivityLogs(activityId: string) {
  const logs = useDataStore((s) => s.logs);
  const isLoaded = useDataStore((s) => s.isLoaded);
  const filtered = useMemo(
    () => logs.filter((log) => log.activityId === activityId),
    [logs, activityId]
  );
  return { logs: filtered, isLoading: !isLoaded };
}
