import { useState } from 'react';
import { format } from 'date-fns';
import { useDataStore } from '../../stores/dataStore';
import type { Activity, BestOfData } from '../../types/activity';
import { parseDuration } from '../../lib/duration';
import { DurationInput } from './DurationInput';
import { CountInput } from './CountInput';

interface LogEntryFormProps {
  activity: Activity;
}

export function LogEntryForm({ activity }: LogEntryFormProps) {
  const createProgressLog = useDataStore((s) => s.createProgressLog);
  const now = new Date();

  const [date, setDate] = useState(format(now, 'yyyy-MM-dd'));
  const [time, setTime] = useState(format(now, 'HH:mm'));
  const [valueInput, setValueInput] = useState('');
  const [parsedDuration, setParsedDuration] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [bestOfAttempts, setBestOfAttempts] = useState('');
  const [bestOfDurationInput, setBestOfDurationInput] = useState('');
  const [parsedBestOfDuration, setParsedBestOfDuration] = useState<number | null>(null);
  const [inlineTypicalDuration, setInlineTypicalDuration] = useState('');
  const [parsedInlineTypicalDuration, setParsedInlineTypicalDuration] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAttempts = bestOfAttempts.trim() !== '';
  const hasDuration = bestOfDurationInput.trim() !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let value: number;
    if (activity.measurementType === 'duration') {
      const seconds = parsedDuration ?? parseDuration(valueInput);
      if (seconds === null || seconds < 0) {
        setError('Please enter a valid duration');
        return;
      }
      value = seconds;
    } else {
      const num = parseInt(valueInput, 10);
      if (isNaN(num) || num < 0) {
        setError('Please enter a valid count');
        return;
      }
      value = num;
    }

    let bestOf: BestOfData | undefined;
    if (hasAttempts) {
      const count = parseInt(bestOfAttempts, 10);
      if (isNaN(count) || count < 1) {
        setError('Please enter a valid number of attempts (1 or more)');
        return;
      }
      bestOf = { type: 'attempts', count };
    } else if (hasDuration) {
      const seconds = parsedBestOfDuration ?? parseDuration(bestOfDurationInput);
      if (seconds === null || seconds <= 0) {
        setError('Please enter a valid session duration');
        return;
      }
      // If activity has no typical duration, require inline entry
      if (!activity.typicalAttemptDuration) {
        const typicalSecs = parsedInlineTypicalDuration ?? parseDuration(inlineTypicalDuration);
        if (!typicalSecs || typicalSecs <= 0) {
          setError('Please enter a typical attempt duration to convert session time to attempts');
          return;
        }
        bestOf = { type: 'duration', seconds, typicalAttemptDuration: typicalSecs };
      } else {
        bestOf = { type: 'duration', seconds };
      }
    }

    setIsSubmitting(true);
    try {
      await createProgressLog({
        activityId: activity.id,
        date,
        time,
        value,
        notes,
        ...(bestOf ? { bestOf } : {}),
      });
      setValueInput('');
      setParsedDuration(null);
      setNotes('');
      setBestOfAttempts('');
      setBestOfDurationInput('');
      setParsedBestOfDuration(null);
      setInlineTypicalDuration('');
      setParsedInlineTypicalDuration(null);
      const n = new Date();
      setDate(format(n, 'yyyy-MM-dd'));
      setTime(format(n, 'HH:mm'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to log entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Log Progress</h3>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Time</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            required
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {activity.measurementType === 'duration' ? 'Duration' : 'Count'}
        </label>
        {activity.measurementType === 'duration' ? (
          <DurationInput
            value={valueInput}
            onChange={setValueInput}
            onParsed={setParsedDuration}
          />
        ) : (
          <CountInput value={valueInput} onChange={setValueInput} />
        )}
      </div>

      {/* Best-of section — two always-visible fields */}
      <fieldset className="mb-3">
        <legend className="text-xs font-medium text-gray-600 mb-1">Best of (optional)</legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Session duration</label>
            <div className="relative">
              <DurationInput
                value={bestOfDurationInput}
                onChange={(v) => {
                  setBestOfDurationInput(v);
                  if (!v.trim()) setParsedBestOfDuration(null);
                }}
                onParsed={setParsedBestOfDuration}
                disabled={hasAttempts}
              />
              {hasDuration && !hasAttempts && (
                <button
                  type="button"
                  onClick={() => { setBestOfDurationInput(''); setParsedBestOfDuration(null); }}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 text-sm leading-none"
                >
                  &times;
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Number of attempts</label>
            <div className="relative">
              <input
                type="number"
                min={1}
                value={bestOfAttempts}
                onChange={(e) => setBestOfAttempts(e.target.value)}
                disabled={hasDuration}
                placeholder="e.g. 5"
                className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  hasDuration ? 'opacity-50 bg-gray-50 cursor-not-allowed' : ''
                }`}
              />
              {hasAttempts && !hasDuration && (
                <button
                  type="button"
                  onClick={() => setBestOfAttempts('')}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 text-sm leading-none"
                >
                  &times;
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Conditional typical attempt duration — only when session duration is filled and activity has none configured */}
        {hasDuration && parsedBestOfDuration && !activity.typicalAttemptDuration && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <label className="block text-xs font-medium text-amber-800 mb-1">
              Typical attempt duration
            </label>
            <p className="text-xs text-amber-600 mb-2">
              Needed to estimate the number of attempts from session duration.
            </p>
            <DurationInput
              value={inlineTypicalDuration}
              onChange={setInlineTypicalDuration}
              onParsed={setParsedInlineTypicalDuration}
            />
          </div>
        )}
      </fieldset>

      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Felt strong today"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md mb-3">{error}</div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !valueInput}
        className="w-full py-2 px-4 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? 'Logging...' : 'Log Entry'}
      </button>
    </form>
  );
}
