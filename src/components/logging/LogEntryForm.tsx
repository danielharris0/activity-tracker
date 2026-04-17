import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { useDataStore } from '../../stores/dataStore';
import { useQueueStore } from '../../stores/queueStore';
import type { Activity, BestOfData } from '../../types/activity';
import { parseDuration } from '../../lib/duration';
import { DurationInput } from './DurationInput';
import { CountInput } from './CountInput';

interface LogEntryFormProps {
  activity: Activity;
}

function nowParts() {
  const n = new Date();
  return {
    date: format(n, 'yyyy-MM-dd'),
    time: format(n, 'HH:mm'),
  };
}

export function LogEntryForm({ activity }: LogEntryFormProps) {
  const createProgressLog = useDataStore((s) => s.createProgressLog);
  const initial = nowParts();

  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [valueInput, setValueInput] = useState('');
  const [parsedDuration, setParsedDuration] = useState<number | null>(null);
  const [bestOfAttempts, setBestOfAttempts] = useState('1');
  const [bestOfDurationInput, setBestOfDurationInput] = useState('');
  const [parsedBestOfDuration, setParsedBestOfDuration] = useState<number | null>(null);
  const [inlineTypicalDuration, setInlineTypicalDuration] = useState('');
  const [parsedInlineTypicalDuration, setParsedInlineTypicalDuration] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<'saved' | 'queued' | null>(null);

  const valueInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1500);
    return () => clearTimeout(t);
  }, [flash]);

  const hasAttempts = bestOfAttempts.trim() !== '';
  const hasDuration = bestOfDurationInput.trim() !== '';

  const current = nowParts();
  const dateDiffersFromNow = date !== current.date;
  const timeDiffersFromNow = time !== current.time;

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

    let bestOf: BestOfData;
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
    } else {
      setError('Please enter either a number of attempts or a session duration');
      return;
    }

    try {
      await createProgressLog({
        activityId: activity.id,
        date,
        time,
        value,
        bestOf,
      });
      const { isOnline, pending } = useQueueStore.getState();
      setFlash(!isOnline || pending > 0 ? 'queued' : 'saved');
      setValueInput('');
      setParsedDuration(null);
      valueInputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log entry');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Log Progress</h3>

      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {activity.measurementType === 'duration' ? 'Duration' : 'Count'}
        </label>
        {activity.measurementType === 'duration' ? (
          <DurationInput
            ref={valueInputRef}
            value={valueInput}
            onChange={setValueInput}
            onParsed={setParsedDuration}
            autoFocus
            enterKeyHint="done"
            large
          />
        ) : (
          <CountInput
            ref={valueInputRef}
            value={valueInput}
            onChange={setValueInput}
            autoFocus
            enterKeyHint="done"
            large
          />
        )}
      </div>

      {/* Best-of section — either number of attempts or session duration is required */}
      <fieldset className="mb-3">
        <legend className="text-xs font-medium text-gray-600 mb-1">Best of</legend>
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

      {/* Advanced — date/time collapsed by default */}
      <details className="mb-3">
        <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 select-none">
          Advanced — change date or time
        </summary>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div>
            <div className="flex items-center justify-between mb-1 h-4">
              <label className="text-xs font-medium text-gray-600">Date</label>
              {dateDiffersFromNow && (
                <button
                  type="button"
                  onClick={() => setDate(nowParts().date)}
                  className="text-xs text-indigo-600 hover:text-indigo-800"
                >
                  Reset to now
                </button>
              )}
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1 h-4">
              <label className="text-xs font-medium text-gray-600">Time</label>
              {timeDiffersFromNow && (
                <button
                  type="button"
                  onClick={() => setTime(nowParts().time)}
                  className="text-xs text-indigo-600 hover:text-indigo-800"
                >
                  Reset to now
                </button>
              )}
            </div>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>
        </div>
      </details>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md mb-3">{error}</div>
      )}

      {flash && (
        <div
          className={`text-sm p-2 rounded-md mb-3 ${
            flash === 'saved'
              ? 'text-green-700 bg-green-50'
              : 'text-amber-800 bg-amber-50'
          }`}
        >
          {flash === 'saved' ? 'Saved' : 'Queued — will sync when online'}
        </div>
      )}

      <button
        type="submit"
        disabled={!valueInput.trim()}
        className="w-full py-3 px-4 bg-indigo-600 text-white text-base font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Log Entry
      </button>
    </form>
  );
}
