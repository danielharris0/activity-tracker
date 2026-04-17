import { create } from 'zustand';
import type { ChartLayerType } from '../types/statistics';
import { LAYERS } from '../constants/statistics';

export type DatePreset = '7d' | '30d' | '90d' | 'all' | 'custom';

export interface CustomDateRange {
  startMs: number;
  endMs: number;
}

interface ChartConfigState {
  enabledLayers: Set<ChartLayerType>;
  kernelStdDevDays: number;
  cutoffThresholdPct: number;
  datePreset: DatePreset;
  customDateRange: CustomDateRange | null;
  showDebugTable: boolean;

  toggleLayer: (type: ChartLayerType) => void;
  setKernelStdDevDays: (days: number) => void;
  setCutoffThresholdPct: (pct: number) => void;
  setDatePreset: (preset: DatePreset) => void;
  setCustomDateRange: (start: string, end: string) => void;
  setCustomDateRangeFromTimestamps: (startMs: number, endMs: number) => void;
  toggleDebugTable: () => void;
}

const DAY_MS = 86_400_000;

function dateStringToMs(s: string): number {
  return new Date(s + 'T00:00:00Z').getTime();
}

const defaultEnabled = new Set<ChartLayerType>(
  LAYERS.filter(l => l.defaultEnabled).map(l => l.type)
);

export const useChartConfigStore = create<ChartConfigState>((set) => ({
  enabledLayers: defaultEnabled,
  kernelStdDevDays: 7,
  cutoffThresholdPct: 5,
  datePreset: 'all',
  customDateRange: null,
  showDebugTable: false,

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
  setDatePreset: (preset) => set({ datePreset: preset, customDateRange: null }),
  setCustomDateRange: (start, end) =>
    set({
      datePreset: 'custom',
      customDateRange: {
        startMs: dateStringToMs(start),
        endMs: dateStringToMs(end) + DAY_MS,
      },
    }),
  setCustomDateRangeFromTimestamps: (startMs, endMs) =>
    set({ datePreset: 'custom', customDateRange: { startMs, endMs } }),
  toggleDebugTable: () => set((s) => ({ showDebugTable: !s.showDebugTable })),
}));
