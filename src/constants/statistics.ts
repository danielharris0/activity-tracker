import type { ChartLayerType } from '../types/statistics';
import { CHART_COLORS } from './colors';

export interface LayerDefinition {
  type: ChartLayerType;
  label: string;
  color: string;
  defaultEnabled: boolean;
}

export const LAYERS: LayerDefinition[] = [
  { type: 'estimated-mean', label: 'Est. Mean', color: CHART_COLORS['estimated-mean'], defaultEnabled: true },
  { type: 'estimated-stddev', label: 'Est. Std Dev', color: CHART_COLORS['estimated-stddev'], defaultEnabled: false },
  { type: 'confidence-band', label: '90% CI (Mean)', color: CHART_COLORS['confidence-band'], defaultEnabled: true },
];
