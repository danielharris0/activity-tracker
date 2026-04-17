import { useRef, useMemo } from 'react';
import type { LogEntry, Activity } from '../types/activity';
import type { ChartLayerType, BayesianParams, BayesianEstimate } from '../types/statistics';
import type { BayesianChartPoint } from '../types/chart';
import { prepareObservations, computeBayesianEstimates, generateEvalTimestamps, entryTimestamp } from '../lib/bayesian';

interface CacheEntry {
  entriesRef: LogEntry[];
  paramsKey: string;
  windowKey: string;
  estimates: BayesianEstimate[];
}

function paramsToKey(params: BayesianParams, typicalAttemptDuration: number | undefined): string {
  return `${params.kernelStdDevDays}|${params.cutoffThresholdPct}|${typicalAttemptDuration ?? ''}`;
}

// Note: because `window` is part of the cache key, panning (which commits a
// new window) triggers a full re-run of prepareObservations, eval-timestamp
// generation, and the Bayesian posterior grid. The observations themselves
// don't change across pans — only the eval timestamps move — so this is
// wasted work, but acceptable for typical log counts (kernel cutoff keeps the
// per-eval-point cost bounded to nearby observations). Revisit if pan feels
// laggy on large datasets.
//
// Eval timestamps are generated over an overscan region (EVAL_OVERSCAN of the
// window span on each side) so that a drag-in-progress has pre-computed
// estimates to render as the visible range shifts into the overscan margin,
// up until the next commit.
const EVAL_OVERSCAN = 0.5;

export function useChartData(
  entries: LogEntry[],
  activity: Activity,
  enabledLayers: Set<ChartLayerType>,
  params: BayesianParams,
  window: { startMs: number; endMs: number },
): BayesianChartPoint[] {
  const cacheRef = useRef<CacheEntry | null>(null);

  const estimates = useMemo(() => {
    const key = paramsToKey(params, activity.typicalAttemptDuration);
    const windowKey = `${window.startMs}|${window.endMs}`;

    if (
      cacheRef.current &&
      cacheRef.current.entriesRef === entries &&
      cacheRef.current.paramsKey === key &&
      cacheRef.current.windowKey === windowKey
    ) {
      return cacheRef.current.estimates;
    }

    const observations = prepareObservations(
      entries,
      activity.typicalAttemptDuration,
    );

    const span = window.endMs - window.startMs;
    const overscan = span * EVAL_OVERSCAN;
    const evalTimestamps = generateEvalTimestamps(observations, {
      startMs: window.startMs - overscan,
      endMs: window.endMs + overscan,
    });
    const result = computeBayesianEstimates(observations, params, evalTimestamps);

    cacheRef.current = { entriesRef: entries, paramsKey: key, windowKey, estimates: result };
    return result;
  }, [entries, activity.typicalAttemptDuration, params, window.startMs, window.endMs]);

  const chartData = useMemo(() => {
    if (entries.length === 0) return [];

    const needsBayesian =
      enabledLayers.has('estimated-mean') ||
      enabledLayers.has('estimated-stddev') ||
      enabledLayers.has('confidence-band');

    const timestampMap = new Map<number, BayesianChartPoint>();

    // Always add raw data points
    const sorted = [...entries].sort((a, b) => entryTimestamp(a) - entryTimestamp(b));
    for (const entry of sorted) {
      const ts = entryTimestamp(entry);
      let point = timestampMap.get(ts);
      if (!point) {
        point = { timestamp: ts };
        timestampMap.set(ts, point);
      }
      point.raw = entry.value;
    }

    // Add Bayesian estimates
    if (needsBayesian) {
      for (const est of estimates) {
        if (isNaN(est.mean)) continue;

        let point = timestampMap.get(est.timestamp);
        if (!point) {
          point = { timestamp: est.timestamp };
          timestampMap.set(est.timestamp, point);
        }

        if (enabledLayers.has('estimated-mean')) point.mean = est.mean;
        if (enabledLayers.has('estimated-stddev')) point.stddev = est.stddev;
        if (enabledLayers.has('confidence-band')) {
          point.ciLower = Math.max(0, est.ciLower);
          point.ciUpper = Math.max(0, est.ciUpper);
        }
      }
    }

    return Array.from(timestampMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [entries, estimates, enabledLayers]);

  return chartData;
}
