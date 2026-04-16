import type { LogEntry } from '../types/activity';
import type { BayesianEstimate, BayesianParams, MissingBestOfHandling } from '../types/statistics';
import { logNormalPdf, logNormalCdf } from './normal';

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
        // duration-based best-of
        if (typicalAttemptDuration && typicalAttemptDuration > 0) {
          effectiveN = Math.max(1, Math.floor(entry.bestOf.seconds / typicalAttemptDuration));
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

/**
 * Generate evenly-spaced evaluation timestamps across the observation range.
 */
export function generateEvalTimestamps(observations: Observation[]): number[] {
  if (observations.length === 0) return [];

  const first = observations[0].timestamp;
  const last = observations[observations.length - 1].timestamp;
  const range = last - first;

  if (range === 0) return [first];

  const count = Math.min(MAX_EVAL_POINTS, Math.max(2, Math.ceil(range / DAY_MS)));
  const step = range / (count - 1);
  const timestamps: number[] = [];
  for (let i = 0; i < count; i++) {
    timestamps.push(first + i * step);
  }
  return timestamps;
}

export function computeBayesianEstimates(
  observations: Observation[],
  params: BayesianParams,
  evalTimestamps: number[],
): BayesianEstimate[] {
  if (observations.length === 0 || evalTimestamps.length === 0) return [];

  const kernelVariance = computeKernelVariance(params.kernelStdDevDays);
  const cutoffFraction = params.cutoffThresholdPct / 100;

  // Determine grid ranges from observation values
  const values = observations.map(o => o.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const valRange = Math.max(maxVal - minVal, 1); // avoid zero range

  const muMin = minVal - valRange;
  const muMax = maxVal + valRange;
  const sigmaMin = valRange / 200;
  const sigmaMax = Math.max(valRange * 2, sigmaMin * 10);

  // Build grid arrays
  const muStep = (muMax - muMin) / (MU_GRID_SIZE - 1);
  const sigmaStep = (sigmaMax - sigmaMin) / (SIGMA_GRID_SIZE - 1);

  const muGrid: number[] = [];
  for (let i = 0; i < MU_GRID_SIZE; i++) muGrid.push(muMin + i * muStep);

  const sigmaGrid: number[] = [];
  for (let j = 0; j < SIGMA_GRID_SIZE; j++) sigmaGrid.push(sigmaMin + j * sigmaStep);

  // Pre-allocate grid (flat array for performance)
  const gridSize = MU_GRID_SIZE * SIGMA_GRID_SIZE;
  const logPosterior = new Float64Array(gridSize);

  const results: BayesianEstimate[] = [];

  for (const t of evalTimestamps) {
    // Compute kernel weights and apply cutoff
    const weights: number[] = [];
    const relevant: number[] = [];

    let maxWeight = 0;
    for (let i = 0; i < observations.length; i++) {
      const w = computeKernelWeight(observations[i].timestamp - t, kernelVariance);
      weights.push(w);
      if (w > maxWeight) maxWeight = w;
    }

    const threshold = maxWeight * cutoffFraction;
    for (let i = 0; i < observations.length; i++) {
      if (weights[i] >= threshold) relevant.push(i);
    }

    if (relevant.length === 0) {
      results.push({ timestamp: t, mean: NaN, stddev: NaN, ciLower: NaN, ciUpper: NaN });
      continue;
    }

    // Compute weighted log-likelihood over grid
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
    // Re-use logPosterior array to store probabilities
    for (let k = 0; k < gridSize; k++) {
      const p = Math.exp(logPosterior[k] - maxLogP);
      logPosterior[k] = p;
      totalProb += p;
    }

    if (totalProb === 0) {
      results.push({ timestamp: t, mean: NaN, stddev: NaN, ciLower: NaN, ciUpper: NaN });
      continue;
    }

    // Normalize
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

    // Mean of mu marginal
    let meanMu = 0;
    for (let mi = 0; mi < MU_GRID_SIZE; mi++) {
      meanMu += muGrid[mi] * muMarginal[mi];
    }

    // Mean of sigma marginal
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

    results.push({
      timestamp: t,
      mean: meanMu,
      stddev: meanSigma,
      ciLower,
      ciUpper,
    });
  }

  return results;
}
