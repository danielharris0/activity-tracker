import { useChartConfigStore, type DatePreset } from '../../stores/chartConfigStore';
import { LAYERS } from '../../constants/statistics';
import type { MissingBestOfHandling } from '../../types/statistics';

const DATE_PRESETS: Array<{ value: DatePreset; label: string }> = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'all', label: 'All' },
];

export function ChartControls() {
  const {
    enabledLayers,
    datePreset,
    customDateRange,
    kernelStdDevDays,
    cutoffThresholdPct,
    missingBestOf,
    toggleLayer,
    setDatePreset,
    setCustomDateRange,
    setKernelStdDevDays,
    setCutoffThresholdPct,
    setMissingBestOf,
  } = useChartConfigStore();

  return (
    <div className="space-y-3">
      {/* Date range presets */}
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
            const end = new Date().toISOString().slice(0, 10);
            const start = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
            setCustomDateRange(customDateRange?.start ?? start, customDateRange?.end ?? end);
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
            value={customDateRange.start}
            onChange={(e) => setCustomDateRange(e.target.value, customDateRange.end)}
            className="px-2 py-1 border border-gray-300 rounded text-xs"
          />
          <span className="text-xs text-gray-500">to</span>
          <input
            type="date"
            value={customDateRange.end}
            onChange={(e) => setCustomDateRange(customDateRange.start, e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded text-xs"
          />
        </div>
      )}

      {/* Layer toggles */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-gray-500">Layers:</span>
        {LAYERS.map((layer) => (
          <button
            key={layer.type}
            onClick={() => toggleLayer(layer.type)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              enabledLayers.has(layer.type)
                ? 'text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={
              enabledLayers.has(layer.type)
                ? { backgroundColor: layer.color }
                : undefined
            }
          >
            {layer.label}
          </button>
        ))}
      </div>

      {/* Bayesian parameters */}
      <div className="space-y-2 border-t border-gray-100 pt-2">
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-gray-500 w-28 shrink-0">Kernel width:</label>
          <input
            type="range"
            min={1}
            max={60}
            step={1}
            value={kernelStdDevDays}
            onChange={(e) => setKernelStdDevDays(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-xs text-gray-600 w-10 text-right">{kernelStdDevDays}d</span>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-gray-500 w-28 shrink-0">Cutoff:</label>
          <input
            type="range"
            min={1}
            max={20}
            step={1}
            value={cutoffThresholdPct}
            onChange={(e) => setCutoffThresholdPct(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-xs text-gray-600 w-10 text-right">{cutoffThresholdPct}%</span>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-gray-500 w-28 shrink-0">No best-of:</label>
          <select
            value={missingBestOf}
            onChange={(e) => setMissingBestOf(e.target.value as MissingBestOfHandling)}
            className="text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option value="treat-as-1">Treat as single attempt</option>
            <option value="exclude">Exclude from analysis</option>
          </select>
        </div>
      </div>
    </div>
  );
}
