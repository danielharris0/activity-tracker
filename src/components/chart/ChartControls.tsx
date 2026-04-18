import { useEffect, useState } from 'react';
import { useChartConfigStore } from '../../stores/chartConfigStore';
import { LAYERS } from '../../constants/statistics';

const KERNEL_MIN_DAYS = 0.01;
const KERNEL_MAX_DAYS = 60;
const KERNEL_SLIDER_STEPS = 1000;
const KERNEL_LOG_RATIO = Math.log(KERNEL_MAX_DAYS / KERNEL_MIN_DAYS);

function sliderToDays(pos: number): number {
  return KERNEL_MIN_DAYS * Math.exp((pos / KERNEL_SLIDER_STEPS) * KERNEL_LOG_RATIO);
}

function daysToSlider(days: number): number {
  return (Math.log(days / KERNEL_MIN_DAYS) / KERNEL_LOG_RATIO) * KERNEL_SLIDER_STEPS;
}

function formatKernelWidth(days: number): string {
  if (days >= 10) return `${Math.round(days)}d`;
  if (days >= 1) return `${days.toFixed(1)}d`;
  const hours = days * 24;
  if (hours >= 10) return `${Math.round(hours)}h`;
  if (hours >= 1) return `${hours.toFixed(1)}h`;
  const minutes = hours * 60;
  return `${Math.round(minutes)}m`;
}

export function ChartControls() {
  const {
    enabledLayers,
    kernelStdDevDays,
    cutoffThresholdPct,
    toggleLayer,
    setKernelStdDevDays,
    setCutoffThresholdPct,
  } = useChartConfigStore();

  // Dragging the kernel slider triggers an expensive Bayesian recompute on
  // every tick. Keep the thumb/label driven by a local draft and only commit
  // to the store on release.
  const [kernelDraft, setKernelDraft] = useState(kernelStdDevDays);
  useEffect(() => { setKernelDraft(kernelStdDevDays); }, [kernelStdDevDays]);

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
        <div className="flex items-center gap-2 sm:gap-3">
          <label className="text-xs font-medium text-gray-500 w-20 sm:w-28 shrink-0">Kernel width:</label>
          <input
            type="range"
            min={0}
            max={KERNEL_SLIDER_STEPS}
            step={1}
            value={daysToSlider(kernelDraft)}
            onChange={(e) => setKernelDraft(sliderToDays(Number(e.target.value)))}
            onPointerUp={() => setKernelStdDevDays(kernelDraft)}
            onKeyUp={() => setKernelStdDevDays(kernelDraft)}
            className="flex-1 min-w-0"
          />
          <span className="text-xs text-gray-600 w-12 text-right tabular-nums shrink-0">
            {formatKernelWidth(kernelDraft)}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <label className="text-xs font-medium text-gray-500 w-20 sm:w-28 shrink-0">Cutoff:</label>
          <input
            type="range"
            min={1}
            max={20}
            step={1}
            value={cutoffThresholdPct}
            onChange={(e) => setCutoffThresholdPct(Number(e.target.value))}
            className="flex-1 min-w-0"
          />
          <span className="text-xs text-gray-600 w-10 text-right shrink-0">{cutoffThresholdPct}%</span>
        </div>

      </div>
    </div>
  );
}
