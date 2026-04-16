const SQRT_2PI = Math.sqrt(2 * Math.PI);

/** Standard normal PDF: φ(x) = (1/√(2π)) · exp(-x²/2) */
export function normalPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / SQRT_2PI;
}

/** Log of standard normal PDF: log(φ(x)) = -0.5·x² - log(√(2π)) */
export function logNormalPdf(x: number): number {
  return -0.5 * x * x - Math.log(SQRT_2PI);
}

/**
 * Standard normal CDF: Φ(x)
 * Uses Abramowitz & Stegun approximation (formula 26.2.17), accurate to ~1.5e-7.
 */
export function normalCdf(x: number): number {
  if (x < -8) return 0;
  if (x > 8) return 1;

  const negative = x < 0;
  const z = negative ? -x : x;

  const t = 1 / (1 + 0.2316419 * z);
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;
  const t5 = t4 * t;

  const poly =
    0.319381530 * t
    - 0.356563782 * t2
    + 1.781477937 * t3
    - 1.821255978 * t4
    + 1.330274429 * t5;

  const cdf = 1 - normalPdf(z) * poly;

  return negative ? 1 - cdf : cdf;
}

/**
 * Log of standard normal CDF: log(Φ(x))
 * Uses direct computation for x > -6, and a tail approximation for very negative x
 * to avoid log(0) underflow.
 */
export function logNormalCdf(x: number): number {
  if (x > 6) return 0; // log(1)
  if (x > -6) return Math.log(normalCdf(x));

  // For very negative x, use Mill's ratio approximation:
  // Φ(x) ≈ φ(x) / |x| · (1 - 1/x² + 3/x⁴ - ...)
  // log(Φ(x)) ≈ log(φ(x)) - log(|x|)
  return logNormalPdf(x) - Math.log(-x);
}
