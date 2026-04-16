import { useChartConfigStore } from '../../stores/chartConfigStore';
import { LAYERS } from '../../constants/statistics';
import type { MissingBestOfHandling } from '../../types/statistics';

export function ChartControls() {
  const {
    enabledLayers,
    kernelStdDevDays,
    cutoffThresholdPct,
    missingBestOf,
    toggleLayer,
    setKernelStdDevDays,
    setCutoffThresholdPct,
    setMissingBestOf,
  } = useChartConfigStore();

  return (
    <div className="space-y-3">
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
