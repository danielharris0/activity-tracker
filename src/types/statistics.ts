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

export interface MarginalEntry {
  gridValue: number;
  probability: number;
}

export interface BayesianDebugData {
  timestamp: number;
  muMarginal: MarginalEntry[];
  sigmaMarginal: MarginalEntry[];
  weightedMeanMu: number;
  weightedMeanSigma: number;
  relevantObservationCount: number;
  observations: Array<{
    timestamp: number;
    value: number;
    effectiveN: number;
    kernelWeight: number;
    relevant: boolean;
  }>;
}
