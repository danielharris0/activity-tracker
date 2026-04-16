import { useDataStore } from '../stores/dataStore';

export function useActivities() {
  const activities = useDataStore((s) => s.activities);
  const isLoaded = useDataStore((s) => s.isLoaded);
  return { activities, isLoading: !isLoaded };
}
