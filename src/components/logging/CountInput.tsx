interface CountInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function CountInput({ value, onChange }: CountInputProps) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="e.g. 42"
      min={0}
      step={1}
      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
    />
  );
}
