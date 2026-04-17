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
import { DateRangeControls } from './DateRangeControls';
import { BayesianDebugTable } from './BayesianDebugTable';
import { findNearestPerSeries, type NearestPoints } from '../../lib/chartHover';
import { prepareObservations, computeBayesianDebugAtTimestamp } from '../../lib/bayesian';
import type { LogEntry, Activity } from '../../types/activity';
import type { BayesianChartPoint } from '../../types/chart';
import { formatDuration } from '../../lib/duration';
import { useMemo, useState, useCallback, useRef, useEffect } from 'react';

interface ProgressChartProps {
  logs: LogEntry[];
  activity: Activity;
}

const margin = { top: 10, right: 20, bottom: 30, left: 65 };

export function ProgressChart({ logs, activity }: ProgressChartProps) {
  const {
    enabledLayers,
    datePreset,
    customDateRange,
    kernelStdDevDays,
    cutoffThresholdPct,
  } = useChartConfigStore();

  // `nowAnchor` freezes "now" for preset-relative windows. We re-anchor when
  // the preset changes (via an effect, not during render) so Date.now() never
  // runs in the render path. The setState-in-effect is intentional here: the
  // only alternative — Date.now() in render — violates react-hooks/purity.
  const [nowAnchor, setNowAnchor] = useState<number>(() => Date.now());
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNowAnchor(Date.now());
  }, [datePreset]);

  // Committed view window. Always defined; drives both filtering and (when no
  // drag is active) the x-axis domain. Never changes mid-drag.
  const baseWindow = useMemo<{ startMs: number; endMs: number }>(() => {
    if (datePreset === 'custom' && customDateRange) {
      return { startMs: customDateRange.startMs, endMs: customDateRange.endMs };
    }
    if (datePreset !== 'all') {
      const days = datePreset === '7d' ? 7 : datePreset === '30d' ? 30 : 90;
      return { startMs: nowAnchor - days * 86_400_000, endMs: nowAnchor };
    }
    if (logs.length === 0) {
      return { startMs: nowAnchor - 30 * 86_400_000, endMs: nowAnchor };
    }
    let min = Infinity;
    let max = -Infinity;
    for (const log of logs) {
      const ts = new Date(`${log.date}T${log.time || '00:00'}`).getTime();
      if (ts < min) min = ts;
      if (ts > max) max = ts;
    }
    return { startMs: min, endMs: max + 1 };
  }, [datePreset, customDateRange, logs, nowAnchor]);

  const params = useMemo(() => ({
    kernelStdDevDays,
    cutoffThresholdPct,
  }), [kernelStdDevDays, cutoffThresholdPct]);

  const chartData = useChartData(logs, activity, enabledLayers, params, baseWindow);

  const showDebugTable = useChartConfigStore(s => s.showDebugTable);
  const toggleDebugTable = useChartConfigStore(s => s.toggleDebugTable);
  const [debugTimestamp, setDebugTimestamp] = useState<number | null>(null);

  // Compute debug data when clicking a data point and debug is enabled.
  // Observation timestamps are now eval timestamps, so no snapping needed.
  const debugData = useMemo(() => {
    if (!showDebugTable || debugTimestamp == null) return null;
    const observations = prepareObservations(logs, activity.typicalAttemptDuration);
    return computeBayesianDebugAtTimestamp(observations, params, debugTimestamp);
  }, [showDebugTable, debugTimestamp, logs, activity.typicalAttemptDuration, params]);

  return (
    <div className="space-y-4">
      <ChartControls />

      {logs.length === 0 ? (
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
              rawEntries={logs}
              enabledLayers={enabledLayers}
              kernelStdDevDays={kernelStdDevDays}
              cutoffThresholdPct={cutoffThresholdPct}
              baseWindow={baseWindow}
              onSelectTimestamp={showDebugTable ? setDebugTimestamp : undefined}
            />
          )}
        </ParentSize>
      )}

      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-500">Debug:</label>
        <button
          role="switch"
          aria-checked={showDebugTable}
          onClick={toggleDebugTable}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
            showDebugTable ? 'bg-gray-800' : 'bg-gray-300'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
              showDebugTable ? 'translate-x-[18px]' : 'translate-x-0.5'
            }`}
          />
        </button>
        {showDebugTable && !debugData && chartData.length > 0 && (
          <span className="text-xs text-gray-400">Click a data point to inspect</span>
        )}
      </div>

      {showDebugTable && debugData && (
        <BayesianDebugTable
          debug={debugData}
          measurementType={activity.measurementType}
        />
      )}

      <DateRangeControls />
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
  baseWindow: { startMs: number; endMs: number };
  onSelectTimestamp?: (ts: number) => void;
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
  baseWindow,
  onSelectTimestamp,
}: ProgressChartInnerProps) {
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const setCustomDateRangeFromTimestamps = useChartConfigStore(s => s.setCustomDateRangeFromTimestamps);

  const [hoveredTimestamp, setHoveredTimestamp] = useState<number | null>(null);
  const showDebug = useChartConfigStore(s => s.showDebugTable);
  const showKernel = showDebug && (enabledLayers.has('estimated-mean') || enabledLayers.has('estimated-stddev'));

  // Drag state: `dragWindow` is the transient window shown during a drag (null
  // when no drag is in progress). `dragStart` snapshots the mouse position and
  // the window at mouseDown, so mouseMove can compute the new window as a pure
  // function of the pixel delta from start. This keeps the drag decoupled
  // from any re-renders of `baseWindow`/`chartData`.
  const [dragWindow, setDragWindow] = useState<{ startMs: number; endMs: number } | null>(null);
  const dragStart = useRef<{
    pxStart: number;
    windowAtStart: { startMs: number; endMs: number };
  } | null>(null);

  const viewWindow = dragWindow ?? baseWindow;

  const { showTooltip, hideTooltip, tooltipData, tooltipLeft, tooltipTop, tooltipOpen } =
    useTooltip<NearestPoints>();

  const xScale = useMemo(() => {
    return scaleLinear<number>({
      domain: [viewWindow.startMs, viewWindow.endMs],
      range: [0, innerWidth],
    });
  }, [viewWindow.startMs, viewWindow.endMs, innerWidth]);

  // Y-scale derived from the raw logs only (not chartData), so it stays
  // stable across pans and zooms. Mean/stddev/CI may occasionally extend
  // beyond this range and clip at the edges — acceptable tradeoff to avoid
  // the whole chart jumping when eval timestamps shift.
  const yScale = useMemo(() => {
    if (rawEntries.length === 0) {
      return scaleLinear<number>({ domain: [0, 1], range: [innerHeight, 0] });
    }
    let min = Infinity;
    let max = -Infinity;
    for (const e of rawEntries) {
      if (e.value < min) min = e.value;
      if (e.value > max) max = e.value;
    }
    const padding = (max - min) * 0.15 || 1;
    return scaleLinear<number>({
      domain: [Math.max(0, min - padding), max + padding],
      range: [innerHeight, 0],
    });
  }, [rawEntries, innerHeight]);

  const DAY_MS = 86_400_000;
  const xTickFormat = useMemo(() => {
    const [domainMin, domainMax] = xScale.domain();
    const rangeMs = domainMax - domainMin;
    if (rangeMs < DAY_MS) {
      return (ts: number) => format(new Date(ts), 'HH:mm');
    }
    if (rangeMs < 7 * DAY_MS) {
      return (ts: number) => format(new Date(ts), 'MMM d HH:mm');
    }
    return (ts: number) => format(new Date(ts), 'MMM d');
  }, [xScale]);

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

  const CLICK_THRESHOLD_PX = 3;

  const handleMouseDown = useCallback((event: React.MouseEvent<SVGRectElement>) => {
    const point = localPoint(event);
    if (!point) return;
    dragStart.current = {
      pxStart: point.x - margin.left,
      windowAtStart: viewWindow,
    };
  }, [viewWindow]);

  const handleMouseMove = useCallback((event: React.MouseEvent<SVGRectElement>) => {
    const point = localPoint(event);
    if (!point) return;

    const x = point.x - margin.left;
    if (x < 0 || x > innerWidth) return;

    if (dragStart.current) {
      const pxDelta = x - dragStart.current.pxStart;
      if (Math.abs(pxDelta) > CLICK_THRESHOLD_PX) {
        const w = dragStart.current.windowAtStart;
        const msShift = -pxDelta * (w.endMs - w.startMs) / innerWidth;
        setDragWindow({ startMs: w.startMs + msShift, endMs: w.endMs + msShift });
      }
      return;
    }

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

  const commitDrag = useCallback(() => {
    if (dragWindow) {
      setCustomDateRangeFromTimestamps(dragWindow.startMs, dragWindow.endMs);
      setDragWindow(null);
    }
    dragStart.current = null;
  }, [dragWindow, setCustomDateRangeFromTimestamps]);

  const handleMouseUp = useCallback((event: React.MouseEvent<SVGRectElement>) => {
    // Click (no significant drag): forward to onSelectTimestamp
    if (dragStart.current && !dragWindow) {
      const point = localPoint(event);
      if (point && onSelectTimestamp) {
        const x = point.x - margin.left;
        if (x >= 0 && x <= innerWidth) {
          const cursorTimestamp = xScale.invert(x);
          const nearest = findNearestPerSeries(cursorTimestamp, chartData);
          if (nearest.raw) {
            onSelectTimestamp(nearest.raw.timestamp);
          }
        }
      }
    }
    commitDrag();
  }, [commitDrag, dragWindow, xScale, chartData, innerWidth, onSelectTimestamp]);

  const handleMouseLeave = useCallback(() => {
    commitDrag();
    hideTooltip();
    setHoveredTimestamp(null);
  }, [hideTooltip, commitDrag]);

  // Wheel-to-zoom: attached to the SVG root as a native non-passive listener
  // (React's onWheel is delegated through a passive root listener in modern
  // browsers, which makes preventDefault a no-op and makes reliable wheel
  // capture flaky on nested SVG elements like <rect>). Refs keep the handler
  // stable across view-window updates so we don't re-bind on every render.
  const svgRef = useRef<SVGSVGElement | null>(null);
  const viewWindowRef = useRef(viewWindow);
  const xScaleRef = useRef(xScale);
  useEffect(() => {
    viewWindowRef.current = viewWindow;
  }, [viewWindow]);
  useEffect(() => {
    xScaleRef.current = xScale;
  }, [xScale]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const ZOOM_SENSITIVITY = 0.001;
    const handleWheel = (event: WheelEvent) => {
      if (dragStart.current) return;
      event.preventDefault();
      const svgRect = svg.getBoundingClientRect();
      const x = event.clientX - svgRect.left - margin.left;
      if (x < 0 || x > innerWidth) return;

      const vw = viewWindowRef.current;
      const xs = xScaleRef.current;
      const cursorMs = xs.invert(x);
      const span = vw.endMs - vw.startMs;
      const zoomFactor = Math.exp(event.deltaY * ZOOM_SENSITIVITY);
      const newSpan = span * zoomFactor;
      const fracFromStart = (cursorMs - vw.startMs) / span;
      const newStart = cursorMs - fracFromStart * newSpan;
      const newEnd = cursorMs + (1 - fracFromStart) * newSpan;

      setCustomDateRangeFromTimestamps(newStart, newEnd);
    };
    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, [innerWidth, setCustomDateRangeFromTimestamps]);

  if (innerWidth <= 0 || innerHeight <= 0) return null;

  const clipId = `chart-clip-${innerWidth}-${innerHeight}`;

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={svgRef} width={width} height={height}>
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={0} width={innerWidth} height={innerHeight} />
          </clipPath>
        </defs>
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

          {/* Data content — clipped to the chart area so lines/dots outside
              the current view window never bleed into the axes. */}
          <g clipPath={`url(#${clipId})`}>
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
          </g>

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
            tickFormat={(ts) => xTickFormat(ts as number)}
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
            style={{ cursor: dragWindow ? 'grabbing' : 'grab' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
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
