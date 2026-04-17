import { useState, useEffect, useRef, type Ref } from 'react';
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
  const [preview, setPreview] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const fadeTimer = useRef<ReturnType<typeof setTimeout>>();

  // Parse live on every change
  useEffect(() => {
    if (!value.trim()) {
      setPreview(null);
      setVisible(false);
      setIsValid(true);
      onParsed(null);
      return;
    }

    const seconds = parseDuration(value);
    if (seconds !== null) {
      setPreview(formatDuration(seconds));
      setVisible(true);
      setIsValid(true);
      onParsed(seconds);

      // Auto-fade after 2s of no typing
      clearTimeout(fadeTimer.current);
      fadeTimer.current = setTimeout(() => setVisible(false), 2000);
    } else {
      setPreview(null);
      setVisible(false);
      setIsValid(false);
      onParsed(null);
    }

    return () => clearTimeout(fadeTimer.current);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

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
