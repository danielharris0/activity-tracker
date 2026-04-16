export interface BayesianChartPoint {
  timestamp: number;
  raw?: number | null;
  mean?: number | null;
  stddev?: number | null;
  ciLower?: number | null;
  ciUpper?: number | null;
}
