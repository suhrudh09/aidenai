import { useEffect } from 'react'
import { X, ShieldAlert, ShieldCheck, EyeOff, Clock, MessageSquare } from 'lucide-react'
import SafetyScoreBar from './SafetyScoreBar'
import CategoryBadge from './CategoryBadge'
import { getCategoryMeta } from '../lib/categories'
import { formatDateTime } from '../lib/format'

/**
 * Full-detail modal for a single scan log.
 *
 * @param {{ log: object|null, onClose: () => void }} props
 */
export default function ThreatDetailModal({ log, onClose }) {
  // Close on Escape and lock body scroll while open.
  useEffect(() => {
    if (!log) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [log, onClose])

  if (!log) return null

  const blocked = log.action === 'BLOCKED'
  const { icon: CatIcon } = getCategoryMeta(log.category)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-b-none sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-slate-200 bg-ink-900/95 p-5 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <CatIcon className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Scan Detail</h2>
              <p className="flex items-center gap-1 text-xs text-slate-600">
                <Clock className="h-3 w-3" />
                {formatDateTime(log.timestamp)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${
                blocked
                  ? 'bg-risk-high/15 text-risk-high'
                  : 'bg-risk-low/15 text-risk-low'
              }`}
            >
              {blocked ? (
                <ShieldAlert className="h-4 w-4" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {log.action}
            </div>
            <CategoryBadge category={log.category} />
            <span className="inline-flex items-center gap-1 rounded-lg bg-ink-800 px-2.5 py-1 text-xs capitalize text-slate-600">
              <MessageSquare className="h-3 w-3" />
              {log.mode === 'response' ? 'Model Response' : 'User Prompt'}
            </span>
          </div>

          <SafetyScoreBar score={log.safety_score} />

          <Field label="Full Input">
            <p className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-ink-950 p-3.5 text-sm leading-relaxed text-slate-700">
              {log.text}
            </p>
          </Field>

          <Field label="Explanation">
            <p className="rounded-xl border border-slate-200 bg-ink-950 p-3.5 text-sm leading-relaxed text-slate-700">
              {log.explanation}
            </p>
          </Field>

          {log.redacted_text && (
            <Field
              label={
                <span className="flex items-center gap-1.5 text-blue-700">
                  <EyeOff className="h-3.5 w-3.5" /> Redacted Output
                </span>
              }
            >
              <p className="whitespace-pre-wrap rounded-xl border border-blue-500/20 bg-blue-500/10 p-3.5 font-mono text-sm leading-relaxed text-blue-800">
                {log.redacted_text}
              </p>
            </Field>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
        {label}
      </h3>
      {children}
    </div>
  )
}
