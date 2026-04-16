import type { LogEntry } from '../types/activity';
import type { BayesianEstimate, BayesianParams, BayesianDebugData, MarginalEntry, MissingBestOfHandling } from '../types/statistics';
import { logNormalPdf, logNormalCdf } from './normal';
import { makeRange, uniformSamples } from './timeRange';

export interface Observation {
  timestamp: number;
  value: number;
  effectiveN: number;
}

const DAY_MS = 86_400_000;

export function entryTimestamp(e: LogEntry): number {
  return new Date(`${e.date}T${e.time || '00:00'}`).getTime();
}

export function computeKernelVariance(stdDevDays: number): number {
  return 2 * (stdDevDays * DAY_MS) ** 2;
}

export function computeKernelWeight(dt: number, variance: number): number {
  return Math.exp(-(dt * dt) / variance);
}

/**
 * Compute kernel weights and cutoff at a single evaluation timestamp,
 * using the same relative-threshold logic as computeBayesianEstimates.
 */
export interface KernelAtPoint {
  relevantIndices: number[];
  cutoffDist: number;
  variance: number;
}

export function computeKernelAtPoint(
  evalTimestamp: number,
  observationTimestamps: number[],
  kernelStdDevDays: number,
  cutoffThresholdPct: number,
): KernelAtPoint {
  const variance = computeKernelVariance(kernelStdDevDays);
  const cutoffFraction = cutoffThresholdPct / 100;

  let maxWeight = 0;
  const weights: number[] = [];
  for (const ts of observationTimestamps) {
    const w = computeKernelWeight(ts - evalTimestamp, variance);
    weights.push(w);
    if (w > maxWeight) maxWeight = w;
  }

  const threshold = maxWeight * cutoffFraction;
  const relevantIndices: number[] = [];
  for (let i = 0; i < weights.length; i++) {
    if (weights[i] >= threshold) relevantIndices.push(i);
  }

  // Cutoff distance: where kernel weight equals the threshold
  const cutoffDist = threshold > 0
    ? Math.sqrt(-variance * Math.log(threshold))
    : 0;

  return { relevantIndices, cutoffDist, variance };
}

export function prepareObservations(
  entries: LogEntry[],
  typicalAttemptDuration: number | undefined,
  missingBestOf: MissingBestOfHandling,
): Observation[] {
  const observations: Observation[] = [];

  for (const entry of entries) {
    let effectiveN: number;

    if (entry.bestOf) {
      if (entry.bestOf.type === 'attempts') {
        effectiveN = Math.max(1, entry.bestOf.count);
      } else {
        // duration-based best-of: prefer per-entry override, then activity-level
        const tad = entry.bestOf.typicalAttemptDuration ?? typicalAttemptDuration;
        if (tad && tad > 0) {
          effectiveN = Math.max(1, Math.floor(entry.bestOf.seconds / tad));
        } else {
          effectiveN = 1; // can't convert without typical duration
        }
      }
    } else {
      if (missingBestOf === 'exclude') continue;
      effectiveN = 1;
    }

    observations.push({
      timestamp: entryTimestamp(entry),
      value: entry.value,
      effectiveN,
    });
  }

  return observations.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Compute the log-likelihood of a single observation under the order statistic model.
 * f(x | μ, σ, N) = N · (1/σ) · φ((x-μ)/σ) · [Φ((x-μ)/σ)]^(N-1)
 * In log form: log(N) - log(σ) + logφ(z) + (N-1) · logΦ(z)
 */
function orderStatLogLikelihood(x: number, mu: number, sigma: number, n: number): number {
  const z = (x - mu) / sigma;
  let ll = -Math.log(sigma) + logNormalPdf(z);
  if (n > 1) {
    ll += Math.log(n) + (n - 1) * logNormalCdf(z);
  }
  return ll;
}

const MU_GRID_SIZE = 100;
const SIGMA_GRID_SIZE = 50;
const MAX_EVAL_POINTS = 300;

const TARGET_FILL_COUNT = 100;

/**
 * Generate evaluation timestamps: evenly-spaced fill-in points across the given
 * window, plus any observation timestamps inside the window. Fill density scales
 * with the window span (giving consistent visual resolution at any zoom level).
 * Fill-in points that fall too close to an observation are omitted.
 *
 * If `window` is omitted, falls back to the observations' own range.
 */
export function generateEvalTimestamps(
  observations: Observation[],
  window?: { startMs: number; endMs: number },
): number[] {
  let rangeStart: number;
  let rangeEnd: number;
  if (window) {
    rangeStart = window.startMs;
    rangeEnd = window.endMs;
  } else {
    if (observations.length === 0) return [];
    rangeStart = observations[0].timestamp;
    rangeEnd = observations[observations.length - 1].timestamp;
  }

  if (rangeEnd === rangeStart) return [rangeStart];
  if (rangeEnd < rangeStart) return [];

  // Observation timestamps within the window, deduped (observations are sorted).
  const obsTimes: number[] = [];
  for (const obs of observations) {
    if (obs.timestamp < rangeStart || obs.timestamp > rangeEnd) continue;
    if (obsTimes.length === 0 || obsTimes[obsTimes.length - 1] !== obs.timestamp) {
      obsTimes.push(obs.timestamp);
    }
  }

  const range = makeRange(rangeStart, rangeEnd);
  const fillStep = range.span / TARGET_FILL_COUNT;
  const minDist = fillStep / 2;

  const obsSet = new Set(obsTimes);

  const fillTimestamps: number[] = [];
  for (const t of uniformSamples(range, TARGET_FILL_COUNT)) {
    if (obsSet.has(t)) continue;
    let tooClose = false;
    for (let j = 0; j < obsTimes.length; j++) {
      if (Math.abs(obsTimes[j] - t) < minDist) { tooClose = true; break; }
      if (obsTimes[j] > t + minDist) break;
    }
    if (!tooClose) fillTimestamps.push(t);
  }

  // Merge: all observations + fill-in, then sort
  const merged = [...obsTimes, ...fillTimestamps].sort((a, b) => a - b);

  // Cap at MAX_EVAL_POINTS: keep all observations, thin fill-in evenly
  if (merged.length <= MAX_EVAL_POINTS) return merged;

  const result = new Set(obsTimes);
  const budget = MAX_EVAL_POINTS - result.size;
  if (budget > 0 && fillTimestamps.length > 0) {
    const keepStep = fillTimestamps.length / budget;
    for (let i = 0; i < budget; i++) {
      result.add(fillTimestamps[Math.floor(i * keepStep)]);
    }
  }
  return [...result].sort((a, b) => a - b);
}

// --- Shared grid infrastructure ---

interface GridSetup {
  muGrid: number[];
  sigmaGrid: number[];
  gridSize: number;
}

function buildGrid(observations: Observation[]): GridSetup {
  const values = observations.map(o => o.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const valRange = Math.max(maxVal - minVal, 1);

  const muMin = minVal - valRange;
  const muMax = maxVal + valRange;
  const sigmaMin = valRange / 200;
  const sigmaMax = Math.max(valRange * 2, sigmaMin * 10);

  const muStep = (muMax - muMin) / (MU_GRID_SIZE - 1);
  const sigmaStep = (sigmaMax - sigmaMin) / (SIGMA_GRID_SIZE - 1);

  const muGrid: number[] = [];
  for (let i = 0; i < MU_GRID_SIZE; i++) muGrid.push(muMin + i * muStep);

  const sigmaGrid: number[] = [];
  for (let j = 0; j < SIGMA_GRID_SIZE; j++) sigmaGrid.push(sigmaMin + j * sigmaStep);

  return { muGrid, sigmaGrid, gridSize: MU_GRID_SIZE * SIGMA_GRID_SIZE };
}

interface PosteriorResult {
  muMarginal: Float64Array;
  sigmaMarginal: Float64Array;
  meanMu: number;
  meanSigma: number;
  ciLower: number;
  ciUpper: number;
}

/**
 * Core posterior computation for a single evaluation timestamp.
 * Shared by both computeBayesianEstimates and computeBayesianDebugAtTimestamp.
 */
function computePosteriorAtTimestamp(
  observations: Observation[],
  weights: number[],
  relevant: number[],
  grid: GridSetup,
  logPosterior: Float64Array,
): PosteriorResult | null {
  const { muGrid, sigmaGrid, gridSize } = grid;

  logPosterior.fill(0);

  for (const idx of relevant) {
    const obs = observations[idx];
    const w = weights[idx];
    for (let mi = 0; mi < MU_GRID_SIZE; mi++) {
      const mu = muGrid[mi];
      for (let si = 0; si < SIGMA_GRID_SIZE; si++) {
        const sigma = sigmaGrid[si];
        const ll = orderStatLogLikelihood(obs.value, mu, sigma, obs.effectiveN);
        logPosterior[mi * SIGMA_GRID_SIZE + si] += w * ll;
      }
    }
  }

  // Convert log-posterior to posterior: subtract max, exponentiate, normalize
  let maxLogP = -Infinity;
  for (let k = 0; k < gridSize; k++) {
    if (logPosterior[k] > maxLogP) maxLogP = logPosterior[k];
  }

  let totalProb = 0;
  for (let k = 0; k < gridSize; k++) {
    const p = Math.exp(logPosterior[k] - maxLogP);
    logPosterior[k] = p;
    totalProb += p;
  }

  if (totalProb === 0) return null;

  for (let k = 0; k < gridSize; k++) logPosterior[k] /= totalProb;

  // Marginal over mu (sum over sigma for each mu)
  const muMarginal = new Float64Array(MU_GRID_SIZE);
  for (let mi = 0; mi < MU_GRID_SIZE; mi++) {
    let sum = 0;
    for (let si = 0; si < SIGMA_GRID_SIZE; si++) {
      sum += logPosterior[mi * SIGMA_GRID_SIZE + si];
    }
    muMarginal[mi] = sum;
  }

  // Marginal over sigma (sum over mu for each sigma)
  const sigmaMarginal = new Float64Array(SIGMA_GRID_SIZE);
  for (let si = 0; si < SIGMA_GRID_SIZE; si++) {
    let sum = 0;
    for (let mi = 0; mi < MU_GRID_SIZE; mi++) {
      sum += logPosterior[mi * SIGMA_GRID_SIZE + si];
    }
    sigmaMarginal[si] = sum;
  }

  // Weighted means
  let meanMu = 0;
  for (let mi = 0; mi < MU_GRID_SIZE; mi++) {
    meanMu += muGrid[mi] * muMarginal[mi];
  }

  let meanSigma = 0;
  for (let si = 0; si < SIGMA_GRID_SIZE; si++) {
    meanSigma += sigmaGrid[si] * sigmaMarginal[si];
  }

  // 90% credible interval for mu (5th and 95th percentile)
  let cumulative = 0;
  let ciLower = muGrid[0];
  let ciUpper = muGrid[MU_GRID_SIZE - 1];
  let foundLower = false;
  for (let mi = 0; mi < MU_GRID_SIZE; mi++) {
    cumulative += muMarginal[mi];
    if (!foundLower && cumulative >= 0.05) {
      ciLower = muGrid[mi];
      foundLower = true;
    }
    if (cumulative >= 0.95) {
      ciUpper = muGrid[mi];
      break;
    }
  }

  return { muMarginal, sigmaMarginal, meanMu, meanSigma, ciLower, ciUpper };
}

/**
 * Compute kernel weights and filter by cutoff threshold for a single timestamp.
 */
function computeWeightsAtTimestamp(
  observations: Observation[],
  t: number,
  kernelVariance: number,
  cutoffFraction: number,
): { weights: number[]; relevant: number[] } {
  const weights: number[] = [];
  let maxWeight = 0;
  for (let i = 0; i < observations.length; i++) {
    const w = computeKernelWeight(observations[i].timestamp - t, kernelVariance);
    weights.push(w);
    if (w > maxWeight) maxWeight = w;
  }

  const threshold = maxWeight * cutoffFraction;
  const relevant: number[] = [];
  for (let i = 0; i < observations.length; i++) {
    if (weights[i] >= threshold) relevant.push(i);
  }

  return { weights, relevant };
}

export function computeBayesianEstimates(
  observations: Observation[],
  params: BayesianParams,
  evalTimestamps: number[],
): BayesianEstimate[] {
  if (observations.length === 0 || evalTimestamps.length === 0) return [];

  const kernelVariance = computeKernelVariance(params.kernelStdDevDays);
  const cutoffFraction = params.cutoffThresholdPct / 100;
  const grid = buildGrid(observations);
  const logPosterior = new Float64Array(grid.gridSize);

  const results: BayesianEstimate[] = [];

  for (const t of evalTimestamps) {
    const { weights, relevant } = computeWeightsAtTimestamp(observations, t, kernelVariance, cutoffFraction);

    if (relevant.length === 0) {
      results.push({ timestamp: t, mean: NaN, stddev: NaN, ciLower: NaN, ciUpper: NaN });
      continue;
    }

    const posterior = computePosteriorAtTimestamp(observations, weights, relevant, grid, logPosterior);
    if (!posterior) {
      results.push({ timestamp: t, mean: NaN, stddev: NaN, ciLower: NaN, ciUpper: NaN });
      continue;
    }

    results.push({
      timestamp: t,
      mean: posterior.meanMu,
      stddev: posterior.meanSigma,
      ciLower: posterior.ciLower,
      ciUpper: posterior.ciUpper,
    });
  }

  return results;
}

/**
 * Compute full debug data for a single evaluation timestamp.
 * Uses the same grid infrastructure as computeBayesianEstimates.
 */
export function computeBayesianDebugAtTimestamp(
  observations: Observation[],
  params: BayesianParams,
  evalTimestamp: number,
): BayesianDebugData | null {
  if (observations.length === 0) return null;

  const kernelVariance = computeKernelVariance(params.kernelStdDevDays);
  const cutoffFraction = params.cutoffThresholdPct / 100;
  const grid = buildGrid(observations);
  const logPosterior = new Float64Array(grid.gridSize);

  const { weights, relevant } = computeWeightsAtTimestamp(observations, evalTimestamp, kernelVariance, cutoffFraction);

  if (relevant.length === 0) return null;

  const posterior = computePosteriorAtTimestamp(observations, weights, relevant, grid, logPosterior);
  if (!posterior) return null;

  // Convert Float64Array marginals to MarginalEntry arrays
  const muMarginal: MarginalEntry[] = grid.muGrid.map((v, i) => ({
    gridValue: v,
    probability: posterior.muMarginal[i],
  }));

  const sigmaMarginal: MarginalEntry[] = grid.sigmaGrid.map((v, i) => ({
    gridValue: v,
    probability: posterior.sigmaMarginal[i],
  }));

  return {
    timestamp: evalTimestamp,
    muMarginal,
    sigmaMarginal,
    weightedMeanMu: posterior.meanMu,
    weightedMeanSigma: posterior.meanSigma,
    relevantObservationCount: relevant.length,
    observations: observations.map((obs, i) => ({
      timestamp: obs.timestamp,
      value: obs.value,
      effectiveN: obs.effectiveN,
      kernelWeight: weights[i],
      relevant: relevant.includes(i),
    })),
  };
}
