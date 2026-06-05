/**
 * Map a 0.0–1.0 risk/safety score to a risk tier.
 * Higher score == higher risk (matches the API: 0.94 -> Prompt Injection).
 */
export function riskTier(score) {
  if (score > 0.7) return { key: 'high', label: 'High Risk', color: '#ef4444', bar: 'bg-risk-high', text: 'text-risk-high' }
  if (score >= 0.4) return { key: 'med', label: 'Medium Risk', color: '#eab308', bar: 'bg-risk-med', text: 'text-risk-med' }
  return { key: 'low', label: 'Low Risk', color: '#22c55e', bar: 'bg-risk-low', text: 'text-risk-low' }
}

/**
 * Colored progress bar for a safety score.
 *
 * @param {{ score: number, showLabel?: boolean, size?: 'sm'|'md' }} props
 */
export default function SafetyScoreBar({ score = 0, showLabel = true, size = 'md' }) {
  const clamped = Math.max(0, Math.min(1, Number(score) || 0))
  const pct = Math.round(clamped * 100)
  const tier = riskTier(clamped)
  const height = size === 'sm' ? 'h-1.5' : 'h-2.5'

  return (
    <div className="w-full">
      {showLabel && (
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="text-slate-600">Safety Score</span>
          <span className={`font-semibold tabular-nums ${tier.text}`}>
            {clamped.toFixed(2)} · {tier.label}
          </span>
        </div>
      )}
      <div className={`w-full overflow-hidden rounded-full bg-ink-800 ${height}`}>
        <div
          className={`${height} rounded-full ${tier.bar} transition-all duration-500`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  )
}
