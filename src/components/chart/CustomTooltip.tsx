import { format } from 'date-fns';
import type { MeasurementType } from '../../types/activity';
import type { NearestPoints } from '../../lib/chartHover';
import { formatDuration } from '../../lib/duration';
import { CHART_COLORS } from '../../constants/colors';

interface CustomTooltipProps {
  cursorTimestamp: number;
  nearest: NearestPoints;
  measurementType: MeasurementType;
}

const LAYER_CONFIG: Record<string, { label: string; color: string }> = {
  raw: { label: 'Raw', color: CHART_COLORS.raw },
  mean: { label: 'Est. Mean', color: CHART_COLORS['estimated-mean'] },
  stddev: { label: 'Est. Std Dev', color: CHART_COLORS['estimated-stddev'] },
};

type SeriesKey = 'raw' | 'mean' | 'stddev' | 'ciLower' | 'ciUpper';

export function CustomTooltip({ cursorTimestamp, nearest, measurementType }: CustomTooltipProps) {
  const formatValue = (value: number) => {
    return measurementType === 'duration' ? formatDuration(Math.round(value)) : String(Math.round(value * 100) / 100);
  };

  const hasCiBand = nearest.ciLower != null && nearest.ciUpper != null;

  const seriesKeys: SeriesKey[] = ['raw', 'mean', 'stddev'];

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
      <p className="text-xs text-gray-500 mb-1">
        {format(new Date(cursorTimestamp), 'MMM d, yyyy HH:mm')}
      </p>
      {seriesKeys.map((key) => {
        const entry = nearest[key];
        if (!entry) return null;
        const config = LAYER_CONFIG[key];
        if (!config) return null;
        return (
          <div key={key} className="flex items-center gap-2 text-sm">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: config.color }}
            />
            <span className="text-gray-600">{config.label}:</span>
            <span className="font-medium text-gray-900">
              {formatValue(entry.value)}
            </span>
          </div>
        );
      })}
      {hasCiBand && (
        <>
          <div className="flex items-center gap-2 text-sm">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: CHART_COLORS['confidence-band'] }}
            />
            <span className="text-gray-600">90% CI (Mean):</span>
            <span className="font-medium text-gray-900">
              [{formatValue(nearest.ciLower!.value)}, {formatValue(nearest.ciUpper!.value)}]
            </span>
          </div>
          <div className="text-xs text-gray-400 ml-4">
            90% probability the true mean lies in this range
          </div>
        </>
      )}
    </div>
  );
}
