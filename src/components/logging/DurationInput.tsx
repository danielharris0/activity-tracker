import { useState } from 'react';
import { parseDuration, formatDuration } from '../../lib/duration';

interface DurationInputProps {
  value: string;
  onChange: (value: string) => void;
  onParsed: (seconds: number | null) => void;
}

export function DurationInput({ value, onChange, onParsed }: DurationInputProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(true);

  const handleBlur = () => {
    if (!value.trim()) {
      setPreview(null);
      setIsValid(true);
      onParsed(null);
      return;
    }

    const seconds = parseDuration(value);
    if (seconds !== null) {
      setPreview(formatDuration(seconds));
      setIsValid(true);
      onParsed(seconds);
    } else {
      setPreview(null);
      setIsValid(false);
      onParsed(null);
    }
  };

  return (
    <div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        placeholder="e.g. 1:23:45 or 90"
        className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:border-transparent ${
          isValid
            ? 'border-gray-300 focus:ring-indigo-500'
            : 'border-red-300 focus:ring-red-500'
        }`}
      />
      <div className="mt-1 text-xs">
        {preview && <span className="text-green-600">Parsed as: {preview}</span>}
        {!isValid && <span className="text-red-600">Invalid duration. Use hh:mm:ss, mm:ss, or seconds</span>}
        {!preview && isValid && (
          <span className="text-gray-400">Format: hh:mm:ss, mm:ss, or seconds</span>
        )}
      </div>
    </div>
  );
}
