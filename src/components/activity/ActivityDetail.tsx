import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useActivities } from '../../hooks/useActivities';
import { useActivityLogs } from '../../hooks/useActivityLogs';
import { useDataStore } from '../../stores/dataStore';
import { LogEntryForm } from '../logging/LogEntryForm';
import { ProgressChart } from '../chart/ProgressChart';
import { formatDuration, parseDuration } from '../../lib/duration';
import { DurationInput } from '../logging/DurationInput';
import { InlineEdit } from '../ui/InlineEdit';
import { InlineTagsEdit } from '../ui/InlineTagsEdit';

export function ActivityDetail() {
  const { id } = useParams<{ id: string }>();
  const { activities } = useActivities();
  const activity = activities.find((a) => a.id === id);
  const { logs } = useActivityLogs(id ?? '');
  const updateActivity = useDataStore((s) => s.updateActivity);

  const [editingDuration, setEditingDuration] = useState(false);
  const [durationInput, setDurationInput] = useState('');
  const [parsedDuration, setParsedDuration] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  if (!activity) {
    return <p className="text-gray-500">Activity not found.</p>;
  }

  const handleSaveDuration = async () => {
    const seconds = parsedDuration ?? parseDuration(durationInput);
    if (seconds == null || seconds <= 0) return;

    setSaving(true);
    try {
      await updateActivity(activity.id, { typicalAttemptDuration: seconds });
      setEditingDuration(false);
      setDurationInput('');
      setParsedDuration(null);
    } finally {
      setSaving(false);
    }
  };

  const handleClearDuration = async () => {
    setSaving(true);
    try {
      await updateActivity(activity.id, { typicalAttemptDuration: undefined });
      setEditingDuration(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <InlineEdit
          value={activity.name}
          onSave={(name) => updateActivity(activity.id, { name })}
          as="h2"
          className="text-xl font-bold text-gray-900"
          validate={(v) => v.trim() ? null : 'Name is required'}
        />
        <div className="mt-1">
          <InlineEdit
            value={activity.description}
            onSave={(description) => updateActivity(activity.id, { description })}
            as="p"
            className="text-sm text-gray-500"
            inputType="textarea"
            emptyText="No description — click to add"
          />
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
            {activity.measurementType === 'duration' ? 'Duration' : 'Count'}
          </span>
          <InlineTagsEdit
            tags={activity.tags}
            onSave={(tags) => updateActivity(activity.id, { tags })}
          />
        </div>

        {/* Typical attempt duration */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-gray-500">Typical attempt duration:</span>
          {editingDuration ? (
            <div className="flex flex-wrap items-center gap-2">
              <DurationInput
                value={durationInput}
                onChange={setDurationInput}
                onParsed={setParsedDuration}
              />
              <button
                onClick={handleSaveDuration}
                disabled={saving || (!parsedDuration && !parseDuration(durationInput))}
                className="px-2 py-1 bg-indigo-600 text-white rounded text-xs disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => { setEditingDuration(false); setDurationInput(''); }}
                className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
              >
                Cancel
              </button>
              {activity.typicalAttemptDuration != null && (
                <button
                  onClick={handleClearDuration}
                  disabled={saving}
                  className="px-2 py-1 text-red-500 text-xs disabled:opacity-50"
                >
                  Clear
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => setEditingDuration(true)}
              className="text-indigo-600 hover:text-indigo-800"
            >
              {activity.typicalAttemptDuration != null
                ? formatDuration(activity.typicalAttemptDuration)
                : 'Not set'}
            </button>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Progress</h3>
        <ProgressChart
          logs={logs}
          activity={activity}
        />
      </div>

      {/* Log form */}
      <div className="max-w-lg">
        <LogEntryForm activity={activity} />
      </div>
    </div>
  );
}
