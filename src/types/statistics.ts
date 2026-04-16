export type ChartLayerType = 'estimated-mean' | 'estimated-stddev' | 'confidence-band';

export type MissingBestOfHandling = 'treat-as-1' | 'exclude';

export interface BayesianParams {
  kernelStdDevDays: number;
  cutoffThresholdPct: number;
  missingBestOf: MissingBestOfHandling;
}

export interface BayesianEstimate {
  timestamp: number;
  mean: number;
  stddev: number;
  ciLower: number;
  ciUpper: number;
}
