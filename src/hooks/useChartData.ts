import { useRef, useMemo } from 'react';
import type { LogEntry, Activity } from '../types/activity';
import type { ChartLayerType, BayesianParams, BayesianEstimate } from '../types/statistics';
import type { BayesianChartPoint } from '../types/chart';
import { prepareObservations, computeBayesianEstimates, generateEvalTimestamps, entryTimestamp } from '../lib/bayesian';

interface CacheEntry {
  entriesRef: LogEntry[];
  paramsKey: string;
  estimates: BayesianEstimate[];
}

function paramsToKey(params: BayesianParams, typicalAttemptDuration: number | undefined): string {
  return `${params.kernelStdDevDays}|${params.cutoffThresholdPct}|${params.missingBestOf}|${typicalAttemptDuration ?? ''}`;
}

export function useChartData(
  entries: LogEntry[],
  activity: Activity,
  enabledLayers: Set<ChartLayerType>,
  params: BayesianParams,
): BayesianChartPoint[] {
  const cacheRef = useRef<CacheEntry | null>(null);

  const estimates = useMemo(() => {
    const key = paramsToKey(params, activity.typicalAttemptDuration);

    // Return cached estimates if inputs haven't changed
    if (
      cacheRef.current &&
      cacheRef.current.entriesRef === entries &&
      cacheRef.current.paramsKey === key
    ) {
      return cacheRef.current.estimates;
    }

    const observations = prepareObservations(
      entries,
      activity.typicalAttemptDuration,
      params.missingBestOf,
    );

    const evalTimestamps = generateEvalTimestamps(observations);
    const result = computeBayesianEstimates(observations, params, evalTimestamps);

    cacheRef.current = { entriesRef: entries, paramsKey: key, estimates: result };
    return result;
  }, [entries, activity.typicalAttemptDuration, params]);

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
