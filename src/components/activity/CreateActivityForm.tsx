import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '../../stores/dataStore';
import type { MeasurementType } from '../../types/activity';
import { parseDuration } from '../../lib/duration';
import { DurationInput } from '../logging/DurationInput';

export function CreateActivityForm() {
  const createActivity = useDataStore((s) => s.createActivity);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [measurementType, setMeasurementType] = useState<MeasurementType>('count');
  const [typicalDurationInput, setTypicalDurationInput] = useState('');
  const [parsedTypicalDuration, setParsedTypicalDuration] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const tags = tagsInput.split(',').map(s => s.trim()).filter(Boolean);
      const typicalAttemptDuration = parsedTypicalDuration ?? parseDuration(typicalDurationInput) ?? undefined;
      const activity = await createActivity({
        name,
        description,
        tags,
        measurementType,
        ...(typicalAttemptDuration != null && typicalAttemptDuration > 0
          ? { typicalAttemptDuration }
          : {}),
      });
      navigate(`/activities/${activity.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create activity');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-bold text-gray-900 mb-6">New Activity</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Push-ups"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
            Tags
          </label>
          <input
            id="tags"
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="e.g. strength, upper-body, calisthenics"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">Comma-separated</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Measurement Type
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="measurementType"
                value="count"
                checked={measurementType === 'count'}
                onChange={() => setMeasurementType('count')}
                className="text-indigo-600"
              />
              <span className="text-sm text-gray-700">Count (integer)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="measurementType"
                value="duration"
                checked={measurementType === 'duration'}
                onChange={() => setMeasurementType('duration')}
                className="text-indigo-600"
              />
              <span className="text-sm text-gray-700">Duration (hh:mm:ss)</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Typical Attempt Duration (optional)
          </label>
          <DurationInput
            value={typicalDurationInput}
            onChange={setTypicalDurationInput}
            onParsed={setParsedTypicalDuration}
          />
          <p className="text-xs text-gray-500 mt-1">
            Used to convert practice session durations into an effective number of attempts for statistical analysis.
          </p>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting || !name}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Create Activity'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/activities')}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
