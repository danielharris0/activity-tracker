import type { Ref } from 'react';

interface CountInputProps {
  value: string;
  onChange: (value: string) => void;
  ref?: Ref<HTMLInputElement>;
  autoFocus?: boolean;
  enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send';
  large?: boolean;
}

export function CountInput({ value, onChange, ref, autoFocus, enterKeyHint, large }: CountInputProps) {
  return (
    <input
      ref={ref}
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="e.g. 42"
      min={0}
      step={1}
      autoFocus={autoFocus}
      enterKeyHint={enterKeyHint}
      inputMode="numeric"
      className={`w-full px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
        large ? 'py-3 text-base' : 'py-2 text-sm'
      }`}
    />
  );
}
