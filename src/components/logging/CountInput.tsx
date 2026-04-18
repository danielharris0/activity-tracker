import type { Ref } from 'react';

interface CountInputProps {
  value: string;
  onChange: (value: string) => void;
  ref?: Ref<HTMLInputElement>;
  autoFocus?: boolean;
  enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send';
  large?: boolean;
}

const MAX_DIGITS = 9;

export function CountInput({ value, onChange, ref, autoFocus, enterKeyHint, large }: CountInputProps) {
  const handleDigit = (digit: string) => {
    if (value === '0') {
      onChange(digit);
      return;
    }
    if (value.length >= MAX_DIGITS) return;
    onChange(value + digit);
  };

  const handleClear = () => onChange('');
  const handleBackspace = () => onChange(value.slice(0, -1));

  const digitKey = (label: string, onClick: () => void, extra = '') => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      className={`h-14 rounded-md bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-2xl font-medium tabular-nums transition-colors ${extra}`}
    >
      {label}
    </button>
  );

  return (
    <>
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
        className={`hidden md:block w-full px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
          large ? 'py-3 text-base' : 'py-2 text-sm'
        }`}
      />

      <div className="md:hidden">
        <div className="w-full py-4 px-4 bg-gray-50 border border-gray-200 rounded-md text-4xl font-mono tabular-nums text-center text-gray-900 mb-3">
          {value || '0'}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) =>
            digitKey(d, () => handleDigit(d)),
          )}
          {digitKey('Clear', handleClear, 'text-sm text-red-600')}
          {digitKey('0', () => handleDigit('0'))}
          {digitKey('⌫', handleBackspace, 'text-xl')}
        </div>
      </div>
    </>
  );
}
