import { useState, useEffect, useMemo, type Ref } from 'react';
import { parseDuration, formatDuration } from '../../lib/duration';

interface DurationInputProps {
  value: string;
  onChange: (value: string) => void;
  onParsed: (seconds: number | null) => void;
  disabled?: boolean;
  ref?: Ref<HTMLInputElement>;
  autoFocus?: boolean;
  enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send';
  large?: boolean;
}

export function DurationInput({
  value,
  onChange,
  onParsed,
  disabled,
  ref,
  autoFocus,
  enterKeyHint,
  large,
}: DurationInputProps) {
  const parsed = useMemo(() => {
    if (!value.trim()) return { preview: null, seconds: null, isValid: true };
    const seconds = parseDuration(value);
    return seconds !== null
      ? { preview: formatDuration(seconds), seconds, isValid: true }
      : { preview: null, seconds: null, isValid: false };
  }, [value]);

  const { preview, isValid } = parsed;

  useEffect(() => {
    onParsed(parsed.seconds);
  }, [parsed.seconds, onParsed]);

  // Auto-fade the preview badge 2s after it appears. setVisible(true) runs
  // from an effect body (flagged by react-hooks/set-state-in-effect) because
  // the badge is a one-shot animation triggered by a prop transition — the
  // natural place to kick it off is when `preview` changes.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!preview) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(timer);
  }, [preview]);

  return (
    <div>
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="e.g. 1:23:45 or 90"
        autoFocus={autoFocus}
        enterKeyHint={enterKeyHint}
        inputMode="numeric"
        className={`w-full px-3 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent ${
          large ? 'py-3 text-base' : 'py-2 text-sm'
        } ${
          disabled
            ? 'opacity-50 bg-gray-50 cursor-not-allowed'
            : isValid
              ? 'border-gray-300 focus:ring-indigo-500'
              : 'border-red-300 focus:ring-red-500'
        }`}
      />
      <div className="mt-1 text-xs h-5">
        {visible && preview && (
          <span className="inline-block bg-green-100 text-green-800 px-2 py-0.5 rounded font-medium animate-fade-in">
            {preview}
          </span>
        )}
        {!isValid && (
          <span className="text-red-600">Invalid duration. Use hh:mm:ss, mm:ss, or seconds</span>
        )}
      </div>
    </div>
  );
}
