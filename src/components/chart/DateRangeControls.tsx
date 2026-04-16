import { useChartConfigStore, type DatePreset } from '../../stores/chartConfigStore';

const DATE_PRESETS: Array<{ value: DatePreset; label: string }> = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'all', label: 'All' },
];

const DAY_MS = 86_400_000;

function msToDateStr(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function DateRangeControls() {
  const {
    datePreset,
    customDateRange,
    setDatePreset,
    setCustomDateRange,
  } = useChartConfigStore();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-gray-500">Range:</span>
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset.value}
            onClick={() => setDatePreset(preset.value)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              datePreset === preset.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {preset.label}
          </button>
        ))}
        <button
          onClick={() => {
            const endMs = Date.now();
            const startMs = endMs - 30 * DAY_MS;
            setCustomDateRange(
              msToDateStr(customDateRange?.startMs ?? startMs),
              msToDateStr(customDateRange ? customDateRange.endMs - DAY_MS : endMs),
            );
          }}
          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
            datePreset === 'custom'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Custom
        </button>
      </div>

      {datePreset === 'custom' && customDateRange && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={msToDateStr(customDateRange.startMs)}
            onChange={(e) =>
              setCustomDateRange(e.target.value, msToDateStr(customDateRange.endMs - DAY_MS))
            }
            className="px-2 py-1 border border-gray-300 rounded text-xs"
          />
          <span className="text-xs text-gray-500">to</span>
          <input
            type="date"
            value={msToDateStr(customDateRange.endMs - DAY_MS)}
            onChange={(e) =>
              setCustomDateRange(msToDateStr(customDateRange.startMs), e.target.value)
            }
            className="px-2 py-1 border border-gray-300 rounded text-xs"
          />
        </div>
      )}
    </div>
  );
}
