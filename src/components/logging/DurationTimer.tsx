import { useEffect, useRef, useState } from 'react';

interface DurationTimerProps {
  onComplete: (seconds: number) => void;
  disabled?: boolean;
}

function formatRunning(ms: number): string {
  const clamped = Math.max(0, ms);
  const tenths = Math.floor(clamped / 100) % 10;
  const totalSeconds = Math.floor(clamped / 1000);
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  const ss = String(s).padStart(2, '0');
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${ss}.${tenths}`;
  return `${m}:${ss}.${tenths}`;
}

export function DurationTimer({ onComplete, disabled }: DurationTimerProps) {
  const [startMs, setStartMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (startMs === null) return;
    intervalRef.current = window.setInterval(() => setNowMs(Date.now()), 100);
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [startMs]);

  const running = startMs !== null;
  const elapsedMs = running ? nowMs - startMs : 0;

  const handleStart = () => {
    const now = Date.now();
    setStartMs(now);
    setNowMs(now);
  };

  const handleStop = () => {
    if (startMs === null) return;
    const elapsed = Math.round((Date.now() - startMs) / 1000);
    setStartMs(null);
    onComplete(elapsed);
  };

  if (!running) {
    return (
      <button
        type="button"
        onClick={handleStart}
        disabled={disabled}
        className="w-full py-3 px-4 bg-indigo-600 text-white text-base font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        ▶ Start timer
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 py-3 px-4 bg-gray-50 border border-gray-200 rounded-md text-2xl font-mono tabular-nums text-center text-gray-900">
        {formatRunning(elapsedMs)}
      </div>
      <button
        type="button"
        onClick={handleStop}
        className="py-3 px-4 bg-red-600 text-white text-base font-medium rounded-md hover:bg-red-700 transition-colors"
      >
        ■ Stop
      </button>
    </div>
  );
}
