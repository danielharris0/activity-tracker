import { format } from 'date-fns';
import { ParentSize } from '@visx/responsive';
import { scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows, GridColumns } from '@visx/grid';
import { LinePath, AreaClosed } from '@visx/shape';
import { Group } from '@visx/group';
import { useTooltip, TooltipWithBounds } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { curveMonotoneX } from '@visx/curve';
import { useChartConfigStore } from '../../stores/chartConfigStore';
import { useChartData } from '../../hooks/useChartData';
import { CHART_COLORS } from '../../constants/colors';
import { CustomTooltip } from './CustomTooltip';
import { KernelOverlay } from './KernelOverlay';
import { ChartControls } from './ChartControls';
import { findNearestPerSeries, type NearestPoints } from '../../lib/chartHover';
import type { LogEntry, Activity } from '../../types/activity';
import type { BayesianChartPoint } from '../../types/chart';
import { formatDuration } from '../../lib/duration';
import { useMemo, useState, useCallback } from 'react';

interface ProgressChartProps {
  logs: LogEntry[];
  activityId: string;
  activity: Activity;
}

const margin = { top: 10, right: 20, bottom: 30, left: 65 };

export function ProgressChart({ logs, activityId, activity }: ProgressChartProps) {
  const {
    enabledLayers,
    datePreset,
    customDateRange,
    kernelStdDevDays,
    cutoffThresholdPct,
    missingBestOf,
  } = useChartConfigStore();

  // Filter logs by date range
  const filteredLogs = useMemo(() => {
    if (datePreset === 'all') return logs;

    let startDate: Date;
    const endDate = new Date();

    if (datePreset === 'custom' && customDateRange) {
      startDate = new Date(customDateRange.start);
      endDate.setTime(new Date(customDateRange.end).getTime() + 86400000);
    } else {
      const days = datePreset === '7d' ? 7 : datePreset === '30d' ? 30 : 90;
      startDate = new Date(Date.now() - days * 86400000);
    }

    return logs.filter((log) => {
      const logDate = new Date(log.date);
      return logDate >= startDate && logDate <= endDate;
    });
  }, [logs, datePreset, customDateRange]);

  const params = useMemo(() => ({
    kernelStdDevDays,
    cutoffThresholdPct,
    missingBestOf,
  }), [kernelStdDevDays, cutoffThresholdPct, missingBestOf]);

  // Entries visible as raw points (filtered by missingBestOf)
  const rawEntries = useMemo(() => {
    if (missingBestOf === 'exclude') {
      return filteredLogs.filter(e => e.bestOf != null);
    }
    return filteredLogs;
  }, [filteredLogs, missingBestOf]);

  const chartData = useChartData(rawEntries, activity, enabledLayers, params);

  return (
    <div className="space-y-4">
      <ChartControls />

      {chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-gray-400">
          No data to display. Log some entries to see the chart.
        </div>
      ) : (
        <ParentSize debounceTime={100}>
          {({ width }) => (
            <ProgressChartInner
              width={width}
              height={350}
              chartData={chartData}
              activity={activity}
              rawEntries={rawEntries}
              enabledLayers={enabledLayers}
              kernelStdDevDays={kernelStdDevDays}
              cutoffThresholdPct={cutoffThresholdPct}
            />
          )}
        </ParentSize>
      )}
    </div>
  );
}

interface ProgressChartInnerProps {
  width: number;
  height: number;
  chartData: BayesianChartPoint[];
  activity: Activity;
  rawEntries: LogEntry[];
  enabledLayers: Set<string>;
  kernelStdDevDays: number;
  cutoffThresholdPct: number;
}

function ProgressChartInner({
  width,
  height,
  chartData,
  activity,
  rawEntries,
  enabledLayers,
  kernelStdDevDays,
  cutoffThresholdPct,
}: ProgressChartInnerProps) {
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const [hoveredTimestamp, setHoveredTimestamp] = useState<number | null>(null);
  const showKernel = enabledLayers.has('estimated-mean') || enabledLayers.has('estimated-stddev');

  const { showTooltip, hideTooltip, tooltipData, tooltipLeft, tooltipTop, tooltipOpen } =
    useTooltip<NearestPoints>();

  // Build scales
  const xScale = useMemo(() => {
    const timestamps = chartData.map(d => d.timestamp);
    return scaleLinear<number>({
      domain: [Math.min(...timestamps), Math.max(...timestamps)],
      range: [0, innerWidth],
    });
  }, [chartData, innerWidth]);

  const yScale = useMemo(() => {
    const values: number[] = [];
    for (const d of chartData) {
      if (d.raw != null) values.push(d.raw);
      if (d.mean != null) values.push(d.mean);
      if (d.stddev != null) values.push(d.stddev);
      if (d.ciLower != null) values.push(d.ciLower);
      if (d.ciUpper != null) values.push(d.ciUpper);
    }
    if (values.length === 0) return scaleLinear<number>({ domain: [0, 1], range: [innerHeight, 0] });

    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.05 || 1;
    return scaleLinear<number>({
      domain: [min - padding, max + padding],
      range: [innerHeight, 0],
    });
  }, [chartData, innerHeight]);

  const yAxisFormatter = activity.measurementType === 'duration'
    ? (v: number) => formatDuration(Math.round(v))
    : (v: number) => String(v);

  // Pre-filter data per series
  const rawPoints = useMemo(() => chartData.filter(d => d.raw != null), [chartData]);
  const meanPoints = useMemo(
    () => enabledLayers.has('estimated-mean') ? chartData.filter(d => d.mean != null) : [],
    [chartData, enabledLayers],
  );
  const stddevPoints = useMemo(
    () => enabledLayers.has('estimated-stddev') ? chartData.filter(d => d.stddev != null) : [],
    [chartData, enabledLayers],
  );
  const ciUpperPoints = useMemo(
    () => enabledLayers.has('confidence-band') ? chartData.filter(d => d.ciUpper != null) : [],
    [chartData, enabledLayers],
  );
  const ciLowerPoints = useMemo(
    () => enabledLayers.has('confidence-band') ? chartData.filter(d => d.ciLower != null) : [],
    [chartData, enabledLayers],
  );

  const handleMouseMove = useCallback((event: React.MouseEvent<SVGRectElement>) => {
    const point = localPoint(event);
    if (!point) return;

    const x = point.x - margin.left;
    if (x < 0 || x > innerWidth) return;

    const cursorTimestamp = xScale.invert(x);
    const nearest = findNearestPerSeries(cursorTimestamp, chartData);

    showTooltip({
      tooltipData: nearest,
      tooltipLeft: point.x,
      tooltipTop: point.y,
    });

    if (showKernel && nearest.raw) {
      setHoveredTimestamp(nearest.raw.timestamp);
    }
  }, [xScale, chartData, innerWidth, showTooltip, showKernel]);

  const handleMouseLeave = useCallback(() => {
    hideTooltip();
    setHoveredTimestamp(null);
  }, [hideTooltip]);

  if (innerWidth <= 0 || innerHeight <= 0) return null;

  return (
    <div style={{ position: 'relative' }}>
      <svg width={width} height={height}>
        <Group left={margin.left} top={margin.top}>
          {/* Grid */}
          <GridRows
            scale={yScale}
            width={innerWidth}
            stroke="#f0f0f0"
            strokeDasharray="3 3"
          />
          <GridColumns
            scale={xScale}
            height={innerHeight}
            stroke="#f0f0f0"
            strokeDasharray="3 3"
          />

          {/* CI band — upper area filled, lower area white to cut out */}
          {enabledLayers.has('confidence-band') && ciUpperPoints.length > 0 && (
            <>
              <AreaClosed
                data={ciUpperPoints}
                x={d => xScale(d.timestamp)}
                y={d => yScale(d.ciUpper!)}
                yScale={yScale}
                curve={curveMonotoneX}
                fill={CHART_COLORS['confidence-band']}
                fillOpacity={0.12}
                stroke="none"
              />
              {ciLowerPoints.length > 0 && (
                <AreaClosed
                  data={ciLowerPoints}
                  x={d => xScale(d.timestamp)}
                  y={d => yScale(d.ciLower!)}
                  yScale={yScale}
                  curve={curveMonotoneX}
                  fill="#ffffff"
                  fillOpacity={1}
                  stroke="none"
                />
              )}
            </>
          )}

          {/* Estimated mean line */}
          {meanPoints.length > 0 && (
            <LinePath
              data={meanPoints}
              x={d => xScale(d.timestamp)}
              y={d => yScale(d.mean!)}
              curve={curveMonotoneX}
              stroke={CHART_COLORS['estimated-mean']}
              strokeWidth={2}
            />
          )}

          {/* Estimated stddev line */}
          {stddevPoints.length > 0 && (
            <LinePath
              data={stddevPoints}
              x={d => xScale(d.timestamp)}
              y={d => yScale(d.stddev!)}
              curve={curveMonotoneX}
              stroke={CHART_COLORS['estimated-stddev']}
              strokeWidth={1.5}
              strokeDasharray="5 5"
            />
          )}

          {/* Raw data line */}
          {rawPoints.length > 0 && (
            <LinePath
              data={rawPoints}
              x={d => xScale(d.timestamp)}
              y={d => yScale(d.raw!)}
              curve={curveMonotoneX}
              stroke={CHART_COLORS.raw}
              strokeWidth={1.5}
            />
          )}

          {/* Raw data dots */}
          {rawPoints.map(d => (
            <circle
              key={d.timestamp}
              cx={xScale(d.timestamp)}
              cy={yScale(d.raw!)}
              r={3}
              fill={CHART_COLORS.raw}
            />
          ))}

          {/* Kernel overlay */}
          {showKernel && hoveredTimestamp != null && (
            <KernelOverlay
              hoveredTimestamp={hoveredTimestamp}
              kernelStdDevDays={kernelStdDevDays}
              cutoffThresholdPct={cutoffThresholdPct}
              entries={rawEntries}
              xScale={xScale}
              yScale={yScale}
              innerWidth={innerWidth}
              innerHeight={innerHeight}
            />
          )}

          {/* Vertical crosshair snapped to nearest raw point */}
          {tooltipOpen && tooltipData?.raw && (
            <line
              x1={xScale(tooltipData.raw.timestamp)}
              y1={0}
              x2={xScale(tooltipData.raw.timestamp)}
              y2={innerHeight}
              stroke="#9ca3af"
              strokeWidth={1}
              strokeDasharray="4 3"
              pointerEvents="none"
            />
          )}

          {/* Axes */}
          <AxisBottom
            top={innerHeight}
            scale={xScale}
            tickFormat={(ts) => format(new Date(ts as number), 'MMM d')}
            numTicks={Math.max(2, Math.floor(innerWidth / 80))}
            tickLabelProps={() => ({ fontSize: 12, fill: '#9ca3af', textAnchor: 'middle' as const })}
            stroke="#9ca3af"
            tickStroke="#9ca3af"
          />
          <AxisLeft
            scale={yScale}
            tickFormat={(v) => yAxisFormatter(v as number)}
            numTicks={Math.max(2, Math.floor(innerHeight / 40))}
            tickLabelProps={() => ({ fontSize: 12, fill: '#9ca3af', textAnchor: 'end' as const, dx: -4 })}
            stroke="#9ca3af"
            tickStroke="#9ca3af"
          />

          {/* Transparent hover overlay — must be last to capture events */}
          <rect
            width={innerWidth}
            height={innerHeight}
            fill="transparent"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
        </Group>
      </svg>

      {/* Tooltip */}
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          left={tooltipLeft}
          top={tooltipTop}
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            padding: 0,
            background: 'none',
            border: 'none',
            boxShadow: 'none',
          }}
        >
          <CustomTooltip
            cursorTimestamp={tooltipData.cursorTimestamp}
            nearest={tooltipData}
            measurementType={activity.measurementType}
          />
        </TooltipWithBounds>
      )}
    </div>
  );
}
