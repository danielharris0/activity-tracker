/**
 * Parse a flexible duration string into total seconds.
 * Accepts: "1:23:45" (h:m:s), "23:45" (m:s), "45" (seconds), "0:59" (m:s)
 * Returns null if input is invalid.
 */
export function parseDuration(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').map(Number);
    if (parts.some(isNaN)) return null;
    if (parts.some(p => p < 0)) return null;

    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1) return parts[0];
    return null;
  }

  const num = parseInt(trimmed, 10);
  if (isNaN(num) || num < 0) return null;
  return num;
}

/**
 * Format total seconds into a human-readable duration string.
 * Returns "H:mm:ss" if hours > 0, otherwise "m:ss".
 */
export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Format total seconds for storage in Google Sheets.
 * Always returns "HH:mm:ss" format for unambiguous human reading.
 */
export function formatDurationForSheet(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
