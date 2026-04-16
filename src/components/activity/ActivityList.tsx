import { useActivities } from '../../hooks/useActivities';

export function ActivityList() {
  const { activities, isLoading } = useActivities();

  if (isLoading) {
    return <p className="text-gray-500">Loading activities...</p>;
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-2">No activities yet.</p>
        <p className="text-sm text-gray-400">
          Click "New Activity" in the sidebar to get started.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Activities</h2>
      <p className="text-gray-500 text-sm">Select an activity from the sidebar to view details.</p>
    </div>
  );
}
