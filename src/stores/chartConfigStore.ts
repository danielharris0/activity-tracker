import { create } from 'zustand';
import type { ChartLayerType, MissingBestOfHandling } from '../types/statistics';
import { LAYERS } from '../constants/statistics';

export type DatePreset = '7d' | '30d' | '90d' | 'all' | 'custom';

interface ChartConfigState {
  enabledLayers: Set<ChartLayerType>;
  kernelStdDevDays: number;
  cutoffThresholdPct: number;
  missingBestOf: MissingBestOfHandling;
  datePreset: DatePreset;
  customDateRange: { start: string; end: string } | null;

  toggleLayer: (type: ChartLayerType) => void;
  setKernelStdDevDays: (days: number) => void;
  setCutoffThresholdPct: (pct: number) => void;
  setMissingBestOf: (handling: MissingBestOfHandling) => void;
  setDatePreset: (preset: DatePreset) => void;
  setCustomDateRange: (start: string, end: string) => void;
}

const defaultEnabled = new Set<ChartLayerType>(
  LAYERS.filter(l => l.defaultEnabled).map(l => l.type)
);

export const useChartConfigStore = create<ChartConfigState>((set) => ({
  enabledLayers: defaultEnabled,
  kernelStdDevDays: 7,
  cutoffThresholdPct: 5,
  missingBestOf: 'treat-as-1',
  datePreset: 'all',
  customDateRange: null,

  toggleLayer: (type) =>
    set((state) => {
      const next = new Set(state.enabledLayers);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return { enabledLayers: next };
    }),

  setKernelStdDevDays: (days) => set({ kernelStdDevDays: days }),
  setCutoffThresholdPct: (pct) => set({ cutoffThresholdPct: pct }),
  setMissingBestOf: (handling) => set({ missingBestOf: handling }),
  setDatePreset: (preset) => set({ datePreset: preset, customDateRange: null }),
  setCustomDateRange: (start, end) =>
    set({ datePreset: 'custom', customDateRange: { start, end } }),
}));
