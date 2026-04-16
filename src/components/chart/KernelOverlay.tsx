import type { ScaleLinear } from 'd3-scale';
import type { LogEntry } from '../../types/activity';
import { CHART_COLORS } from '../../constants/colors';
import {
  entryTimestamp,
  computeKernelAtPoint,
  computeKernelWeight,
} from '../../lib/bayesian';

interface KernelOverlayProps {
  hoveredTimestamp: number;
  kernelStdDevDays: number;
  cutoffThresholdPct: number;
  entries: LogEntry[];
  xScale: ScaleLinear<number, number>;
  yScale: ScaleLinear<number, number>;
  innerWidth: number;
  innerHeight: number;
}

const CURVE_POINTS = 80;
const CURVE_HEIGHT_FRACTION = 0.18;
const HOVERED_COLOR = '#f59e0b'; // amber — distinct from indigo kernel highlights

export function KernelOverlay({
  hoveredTimestamp,
  kernelStdDevDays,
  cutoffThresholdPct,
  entries,
  xScale,
  yScale,
  innerWidth,
  innerHeight,
}: KernelOverlayProps) {
  const timestamps = entries.map(entryTimestamp);
  const { relevantIndices, cutoffDist, variance } = computeKernelAtPoint(
    hoveredTimestamp,
    timestamps,
    kernelStdDevDays,
    cutoffThresholdPct,
  );

  if (cutoffDist === 0) return null;

  const curveMaxHeight = innerHeight * CURVE_HEIGHT_FRACTION;

  const tStart = hoveredTimestamp - cutoffDist;
  const tEnd = hoveredTimestamp + cutoffDist;

  // Build Gaussian curve path, clipped to visible chart area
  const pathPoints: [number, number][] = [];
  for (let i = 0; i <= CURVE_POINTS; i++) {
    const t = tStart + (tEnd - tStart) * (i / CURVE_POINTS);
    const px = xScale(t);
    if (px < 0 || px > innerWidth) continue;

    const weight = computeKernelWeight(t - hoveredTimestamp, variance);
    pathPoints.push([px, innerHeight - weight * curveMaxHeight]);
  }

  if (pathPoints.length < 2) return null;

  const firstX = pathPoints[0][0];
  const lastX = pathPoints[pathPoints.length - 1][0];
  const curvePath =
    `M ${firstX},${innerHeight} ` +
    pathPoints.map(([x, y]) => `L ${x},${y}`).join(' ') +
    ` L ${lastX},${innerHeight} Z`;

  const cutoffLeftX = xScale(tStart);
  const cutoffRightX = xScale(tEnd);

  // Map relevant entry indices to pixel positions, separating the hovered point
  const kernelHighlights: { key: string; cx: number; cy: number }[] = [];
  let hoveredHighlight: { key: string; cx: number; cy: number } | null = null;
  for (const idx of relevantIndices) {
    const entry = entries[idx];
    const ts = timestamps[idx];
    const cx = xScale(ts);
    const cy = yScale(entry.value);
    if (cx < 0 || cx > innerWidth || cy < 0 || cy > innerHeight) continue;

    const point = { key: entry.id, cx, cy };
    if (ts === hoveredTimestamp) {
      hoveredHighlight = point;
    } else {
      kernelHighlights.push(point);
    }
  }

  return (
    <g>
      {/* Gaussian curve */}
      <path
        d={curvePath}
        fill="rgba(100, 116, 139, 0.08)"
        stroke="rgba(100, 116, 139, 0.3)"
        strokeWidth={1}
      />

      {/* Cutoff boundary lines */}
      {cutoffLeftX >= 0 && cutoffLeftX <= innerWidth && (
        <line
          x1={cutoffLeftX} y1={0}
          x2={cutoffLeftX} y2={innerHeight}
          stroke="rgba(100, 116, 139, 0.3)"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
      )}
      {cutoffRightX >= 0 && cutoffRightX <= innerWidth && (
        <line
          x1={cutoffRightX} y1={0}
          x2={cutoffRightX} y2={innerHeight}
          stroke="rgba(100, 116, 139, 0.3)"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
      )}

      {/* Kernel-included points (not the hovered one) */}
      {kernelHighlights.map(({ key, cx, cy }) => (
        <circle
          key={key}
          cx={cx}
          cy={cy}
          r={7}
          fill={CHART_COLORS.raw}
          fillOpacity={0.2}
          stroke={CHART_COLORS.raw}
          strokeOpacity={0.5}
          strokeWidth={1.5}
        />
      ))}

      {/* Hovered raw point — distinct colour */}
      {hoveredHighlight && (
        <circle
          cx={hoveredHighlight.cx}
          cy={hoveredHighlight.cy}
          r={7}
          fill={HOVERED_COLOR}
          fillOpacity={0.25}
          stroke={HOVERED_COLOR}
          strokeOpacity={0.7}
          strokeWidth={2}
        />
      )}
    </g>
  );
}
