import type { BayesianChartPoint } from '../types/chart';

export interface NearestPoints {
  cursorTimestamp: number;
  raw?: { timestamp: number; value: number };
  mean?: { timestamp: number; value: number };
  stddev?: { timestamp: number; value: number };
  ciLower?: { timestamp: number; value: number };
  ciUpper?: { timestamp: number; value: number };
}

type SeriesKey = 'raw' | 'mean' | 'stddev' | 'ciLower' | 'ciUpper';

/**
 * Binary-search for the index of the point whose timestamp is closest to `target`.
 * `pts` must be sorted by timestamp ascending.
 */
function bisectNearest(pts: BayesianChartPoint[], target: number): number {
  let lo = 0;
  let hi = pts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (pts[mid].timestamp < target) lo = mid + 1;
    else hi = mid;
  }
  // lo is the first index >= target; compare with lo-1 to find closest
  if (lo > 0 && Math.abs(pts[lo - 1].timestamp - target) <= Math.abs(pts[lo].timestamp - target)) {
    return lo - 1;
  }
  return lo;
}

/**
 * For each series, find the nearest data point that has a non-null value.
 * Returns the cursor's true timestamp (from scale.invert) plus the nearest
 * value per series — solving both the "missing points" and "inaccurate x" bugs.
 */
export function findNearestPerSeries(
  cursorTimestamp: number,
  data: BayesianChartPoint[],
): NearestPoints {
  const result: NearestPoints = { cursorTimestamp };
  if (data.length === 0) return result;

  const keys: SeriesKey[] = ['raw', 'mean', 'stddev', 'ciLower', 'ciUpper'];

  for (const key of keys) {
    // Filter to points that have a non-null value for this series
    const filtered = data.filter(d => d[key] != null);
    if (filtered.length === 0) continue;

    const idx = bisectNearest(filtered, cursorTimestamp);
    const pt = filtered[idx];
    result[key] = { timestamp: pt.timestamp, value: pt[key] as number };
  }

  return result;
}
