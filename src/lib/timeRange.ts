import type { ScaleLinear } from 'd3-scale';

export interface TimeRange {
  start: number;
  end: number;
  span: number;
}

export function makeRange(start: number, end: number): TimeRange {
  return { start, end, span: end - start };
}

export function visibleRangeFromScale(
  xScale: ScaleLinear<number, number>,
  innerWidth: number,
): TimeRange {
  return makeRange(xScale.invert(0), xScale.invert(innerWidth));
}

export function intersectRanges(a: TimeRange, b: TimeRange): TimeRange | null {
  const start = Math.max(a.start, b.start);
  const end = Math.min(a.end, b.end);
  if (end <= start) return null;
  return makeRange(start, end);
}

/**
 * `count + 1` evenly-spaced timestamps from range.start to range.end inclusive.
 * Returns empty if the range has zero or negative span.
 */
export function uniformSamples(range: TimeRange, count: number): number[] {
  if (range.span <= 0 || count <= 0) return [];
  const step = range.span / count;
  const out: number[] = new Array(count + 1);
  for (let i = 0; i <= count; i++) out[i] = range.start + i * step;
  return out;
}
