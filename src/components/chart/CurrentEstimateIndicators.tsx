import { useEffect, useMemo, useState } from 'react';
import { useChartConfigStore } from '../../stores/chartConfigStore';
import { prepareObservations, computeBayesianEstimates } from '../../lib/bayesian';
import { formatDuration } from '../../lib/duration';
import { CHART_COLORS } from '../../constants/colors';
import type { Activity, LogEntry, MeasurementType } from '../../types/activity';

interface Props {
  logs: LogEntry[];
  activity: Activity;
}

export function CurrentEstimateIndicators({ logs, activity }: Props) {
  const kernelStdDevDays = useChartConfigStore(s => s.kernelStdDevDays);
  const cutoffThresholdPct = useChartConfigStore(s => s.cutoffThresholdPct);
  const datePreset = useChartConfigStore(s => s.datePreset);

  const [nowAnchor, setNowAnchor] = useState<number>(() => Date.now());
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNowAnchor(Date.now());
  }, [datePreset]);

  const params = useMemo(
    () => ({ kernelStdDevDays, cutoffThresholdPct }),
    [kernelStdDevDays, cutoffThresholdPct],
  );

  const nowEstimate = useMemo(() => {
    if (logs.length === 0) return null;
    const observations = prepareObservations(logs, activity.typicalAttemptDuration);
    const [est] = computeBayesianEstimates(observations, params, [nowAnchor]);
    if (!est || Number.isNaN(est.mean) || Number.isNaN(est.stddev)) return null;
    return { mean: est.mean, stddev: est.stddev };
  }, [logs, activity.typicalAttemptDuration, params, nowAnchor]);

  return (
    <div className="grid grid-cols-2 gap-6">
      <Indicator
        label="Est. Mean"
        value={nowEstimate?.mean ?? null}
        color={CHART_COLORS['estimated-mean']}
        measurementType={activity.measurementType}
      />
      <Indicator
        label="Est. Std Dev"
        value={nowEstimate?.stddev ?? null}
        color={CHART_COLORS['estimated-stddev']}
        measurementType={activity.measurementType}
      />
    </div>
  );
}

interface IndicatorProps {
  label: string;
  value: number | null;
  color: string;
  measurementType: MeasurementType;
}

function Indicator({ label, value, color, measurementType }: IndicatorProps) {
  const formatted = value == null
    ? null
    : measurementType === 'duration'
      ? formatDuration(Math.round(value))
      : String(Math.round(value * 100) / 100);

  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        {label}
      </div>
      {formatted == null ? (
        <div className="mt-1 text-3xl font-semibold font-mono tabular-nums text-gray-400">
          &mdash;
        </div>
      ) : (
        <div
          className="mt-1 text-3xl font-semibold font-mono tabular-nums"
          style={{ color }}
        >
          {formatted}
        </div>
      )}
    </div>
  );
}
