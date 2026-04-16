# Advanced Statistics Plan

## Data changes

Log entries gain an optional "best of" field, which is either a number of attempts or a practice duration. Activities gain an optional "typical attempt duration" field, used to convert practice durations into an effective attempt count (effectiveAttempts = floor(practiceDuration / typicalAttemptDuration)). The visualisation page gets a setting for entries without best-of data: either treat as 1-of-1, or exclude from advanced statistics.

## Statistical model

We model the user's ability at any point in time as a normal distribution N(μ, σ). Both μ and σ change over time. Given a set of logged measurements — each with a value, a timestamp, and a best-of count — we want to infer μ(t) and σ(t) at every point along the time axis.

### Order statistic likelihood

When a user records the best of N attempts, the observed value is the maximum of N independent draws from N(μ, σ). The PDF of the maximum of N iid normal samples is:

```
f(x | μ, σ, N) = N · (1/σ) · φ((x-μ)/σ) · [Φ((x-μ)/σ)]^(N-1)
```

where φ is the standard normal PDF and Φ is the standard normal CDF. This follows from differentiating the CDF of the maximum, [Φ((x-μ)/σ)]^N, via the chain rule. When N=1, the Φ term vanishes and this reduces to the ordinary normal PDF.

The key property: for large N, this likelihood becomes broad and shifted relative to the observed value. A high score as the best of many attempts is consistent with a wide range of μ values, so it carries less information about the true mean than the same score from a single attempt.

### Time-varying estimation via kernel weighting

To estimate parameters at a specific time t, we weight each observation by its temporal proximity using a Gaussian kernel:

```
w(tᵢ, t) = exp(-(tᵢ - t)² / 2s²)
```

where s is the kernel standard deviation in days. Observations with weight below a cutoff threshold are excluded entirely. Both s and the cutoff threshold are user-configurable.

### Grid-based inference

We enumerate candidate (μ, σ) pairs over a 2D grid. For each candidate, we compute the weighted sum of log-likelihoods over all included observations:

```
p(μⱼ, σₖ | t) = ∏ᵢ f(xᵢ | μⱼ, σₖ, Nᵢ) ^ w(tᵢ, t)
```

In practice, these PDF values are small numbers (e.g. 0.03), and multiplying hundreds of them together underflows to zero in 64-bit floating point. So we work in log-space, converting the product into a sum:

```
log p(μⱼ, σₖ | t) = Σᵢ w(tᵢ, t) · log f(xᵢ | μⱼ, σₖ, Nᵢ)
```

To recover actual probabilities, we subtract the maximum log value across the grid (so the largest cell becomes e⁰ = 1), exponentiate, and normalise so all cells sum to 1. This is mathematically identical to the product form — just rewritten to avoid floating point underflow.

The result is a discrete approximation to the joint distribution over (μ, σ) at time t.

No prior is included for now. This can be revisited if degenerate results appear at the edges of the time range where data is sparse.

### Extracting results

From the 2D posterior grid at each time point:

- **Estimated mean μ(t)**: collapse the grid onto the μ axis by summing over σ. The mean of this marginal distribution is the point estimate.
- **Estimated standard deviation σ(t)**: collapse onto the σ axis by summing over μ. The mean of this marginal distribution is the point estimate.
- **Confidence band**: from the marginal distribution over μ, find the interval containing 90% of the probability mass. This becomes a shaded region on the chart — narrow where data is dense and informative, wide where it is sparse or dominated by high-N best-of entries.

## Visualisation page

### New chart lines

Three new toggleable statistics join the existing set (raw, highest, lowest, rolling averages, rolling standard deviations):

- **Estimated mean** — the inferred μ(t), plotted as a line. This is the central output of the model: the user's most likely true ability at each point in time, corrected for best-of inflation.
- **Estimated standard deviation** — the inferred σ(t), plotted as a separate line. Tracks how consistent the user's performance is over time.
- **Confidence band** — a shaded region around the estimated mean, representing the 90% credible interval from the marginal distribution over μ. Narrow where data is dense and informative, wide where it is sparse or heavily best-of-inflated.

### Parameters

Two controls for tuning the inference, exposed in the chart controls panel:

- **Kernel standard deviation** (days) — controls how far back and forward in time each estimate looks. A small value (e.g. 3 days) makes the estimate responsive to recent changes but noisy. A large value (e.g. 30 days) produces a smoother trend but lags behind real improvement. Default: 7 days.
- **Cutoff threshold** (%) — the minimum kernel weight below which an observation is ignored entirely. Controls the hard boundary of the window and is the main performance lever. Default: 5%.

### Handling entries without best-of data

A dropdown with two options:

- **Treat as 1 of 1** (default) — assume the logged value is a single attempt. These entries carry full statistical weight and anchor the estimated mean strongly.
- **Exclude from advanced statistics** — these entries still appear on the raw line but are not fed into the inference model. Useful if the user has a mix of careful best-of-logged sessions and casual one-off entries they don't trust.

### Computational cost

For each time point on the chart, iterate over the grid (~5000 cells) and sum over nearby observations. The cutoff threshold limits the effective number of observations per time point. For typical data sizes (hundreds of entries, hundreds of chart points), this is comfortably fast in-browser.
