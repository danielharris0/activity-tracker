import { format } from 'date-fns';
import type { BayesianDebugData, MarginalEntry } from '../../types/statistics';
import type { MeasurementType } from '../../types/activity';
import { formatDuration } from '../../lib/duration';
import { useState } from 'react';

interface BayesianDebugTableProps {
  debug: BayesianDebugData;
  measurementType: MeasurementType;
}

const TOP_N = 10;

function formatVal(v: number, mt: MeasurementType) {
  return mt === 'duration' ? formatDuration(Math.round(v)) : String(Math.round(v * 100) / 100);
}

/**
 * Format a value with at least 3 significant figures.
 * For durations, shows fractional seconds (e.g. "1:23.4", "0:06.00", "0.123s")
 * when integer seconds would lose precision.
 */
function format3sf(v: number, mt: MeasurementType): string {
  if (v === 0) return mt === 'duration' ? '0:00.00' : '0.00';
  const abs = Math.abs(v);
  const digits = Math.floor(Math.log10(abs)) + 1;
  const decimals = Math.max(0, 3 - digits);

  if (mt !== 'duration') {
    return v.toFixed(decimals);
  }

  // Duration: value is in seconds
  if (abs < 1) {
    return abs.toFixed(Math.max(3, decimals)) + 's';
  }

  const totalSec = Math.abs(v);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  // How many fractional digits on the seconds part to get 3sf overall?
  // Total significant digits from h, m, s integer parts
  const intSeconds = Math.floor(totalSec);
  const intDigits = intSeconds > 0 ? Math.floor(Math.log10(intSeconds)) + 1 : 1;
  const fracDigits = Math.max(0, 3 - intDigits);
  const secStr = s.toFixed(fracDigits);
  const secPadLen = fracDigits > 0 ? fracDigits + 3 : 2; // "06.00" = 5 chars, "00" = 2 chars

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${secStr.padStart(secPadLen, '0')}`;
  }
  return `${m}:${secStr.padStart(secPadLen, '0')}`;
}

function topEntries(entries: MarginalEntry[]): MarginalEntry[] {
  return [...entries].sort((a, b) => b.probability - a.probability).slice(0, TOP_N);
}

function MarginalTable({
  title,
  entries,
  weightedMean,
  measurementType,
}: {
  title: string;
  entries: MarginalEntry[];
  weightedMean: number;
  measurementType: MeasurementType;
}) {
  const top = topEntries(entries);
  const [showAll, setShowAll] = useState(false);
  const display = showAll ? [...entries].sort((a, b) => b.probability - a.probability) : top;

  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-700 mb-1">{title}</h4>
      <p className="text-xs text-gray-500 mb-2">
        <span className="font-semibold text-gray-700">Graph value (weighted mean)</span> = {format3sf(weightedMean, measurementType)}
        {' '}= sum(value &times; P(value))
      </p>
      <p className="text-xs text-gray-400 mb-2">
        Rank 1 below is the posterior mode (most probable single value), which may differ from the mean plotted on the graph.
      </p>
      <div className="overflow-auto max-h-64">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-1 pr-3 text-gray-500 font-medium">Rank</th>
              <th className="text-right py-1 pr-3 text-gray-500 font-medium">Value</th>
              <th className="text-right py-1 pr-3 text-gray-500 font-medium">P(value)</th>
              <th className="text-right py-1 text-gray-500 font-medium">Weighted Contribution</th>
            </tr>
          </thead>
          <tbody>
            {display.map((entry, i) => {
              const contribution = entry.gridValue * entry.probability;
              const isTop3 = i < 3;
              return (
                <tr
                  key={entry.gridValue}
                  className={isTop3 ? 'bg-indigo-50' : ''}
                >
                  <td className="py-0.5 pr-3 text-gray-400">{i + 1}</td>
                  <td className="py-0.5 pr-3 text-right font-mono">
                    {format3sf(entry.gridValue, measurementType)}
                  </td>
                  <td className="py-0.5 pr-3 text-right font-mono">
                    {(entry.probability * 100).toFixed(2)}%
                  </td>
                  <td className="py-0.5 text-right font-mono">
                    {format3sf(contribution, measurementType)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!showAll && entries.length > TOP_N && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-indigo-600 hover:text-indigo-800 mt-1"
        >
          Show all {entries.length} values
        </button>
      )}
      {showAll && (
        <button
          onClick={() => setShowAll(false)}
          className="text-xs text-indigo-600 hover:text-indigo-800 mt-1"
        >
          Show top {TOP_N} only
        </button>
      )}
    </div>
  );
}

export function BayesianDebugTable({ debug, measurementType }: BayesianDebugTableProps) {
  const [tab, setTab] = useState<'mu' | 'sigma' | 'observations'>('mu');

  return (
    <div className="border border-gray-200 rounded-lg p-3 mt-3 bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-gray-700">
          Debug — {format(new Date(debug.timestamp), 'MMM d, yyyy HH:mm')}
        </h3>
        <span className="text-xs text-gray-400">
          {debug.relevantObservationCount} relevant observations
        </span>
      </div>

      <div className="flex gap-1 mb-3">
        {(['mu', 'sigma', 'observations'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
              tab === t
                ? 'bg-gray-800 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            {t === 'mu' ? 'Mean (mu)' : t === 'sigma' ? 'Std Dev (sigma)' : 'Observations'}
          </button>
        ))}
      </div>

      {tab === 'mu' && (
        <MarginalTable
          title="Mu Marginal Distribution"
          entries={debug.muMarginal}
          weightedMean={debug.weightedMeanMu}
          measurementType={measurementType}
        />
      )}

      {tab === 'sigma' && (
        <MarginalTable
          title="Sigma Marginal Distribution"
          entries={debug.sigmaMarginal}
          weightedMean={debug.weightedMeanSigma}
          measurementType={measurementType}
        />
      )}

      {tab === 'observations' && (
        <div>
          <h4 className="text-xs font-semibold text-gray-700 mb-1">Observation Kernel Weights</h4>
          <p className="text-xs text-gray-500 mb-2">
            Only highlighted rows (above cutoff) are used in the posterior computation.
          </p>
          <div className="overflow-auto max-h-64">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1 pr-3 text-gray-500 font-medium">Date</th>
                  <th className="text-right py-1 pr-3 text-gray-500 font-medium">Value</th>
                  <th className="text-right py-1 pr-3 text-gray-500 font-medium">N</th>
                  <th className="text-right py-1 text-gray-500 font-medium">Kernel Weight</th>
                </tr>
              </thead>
              <tbody>
                {[...debug.observations]
                  .sort((a, b) => a.timestamp - b.timestamp)
                  .map((obs) => (
                    <tr
                      key={obs.timestamp}
                      className={obs.relevant ? 'bg-indigo-50' : 'opacity-40'}
                    >
                      <td className="py-0.5 pr-3 text-gray-600">
                        {format(new Date(obs.timestamp), 'MMM d HH:mm')}
                      </td>
                      <td className="py-0.5 pr-3 text-right font-mono">
                        {formatVal(obs.value, measurementType)}
                      </td>
                      <td className="py-0.5 pr-3 text-right font-mono">{obs.effectiveN}</td>
                      <td className="py-0.5 text-right font-mono">
                        {obs.kernelWeight.toFixed(4)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
