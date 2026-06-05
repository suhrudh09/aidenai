import { useEffect, useMemo, useState } from 'react'
import { History, Filter, RotateCcw, Inbox, ChevronRight } from 'lucide-react'
import { getScanLogs, isFirebaseConfigured } from '../services/firebase'
import { CATEGORY_NAMES } from '../lib/categories'
import CategoryBadge from './CategoryBadge'
import { riskTier } from './SafetyScoreBar'
import ThreatDetailModal from './ThreatDetailModal'
import { truncate, formatDateTime } from '../lib/format'

export default function ThreatHistory() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)

  // Filters
  const [category, setCategory] = useState('All')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    let active = true
    getScanLogs(500)
      .then((data) => active && setLogs(data))
      .catch((e) => {
        console.error('[history] load failed', e)
        if (active) setError('Failed to load scan logs from Firestore.')
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(() => {
    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null
    const to = toDate ? new Date(`${toDate}T23:59:59`) : null
    return logs.filter((l) => {
      if (category !== 'All' && l.category !== category) return false
      const t = l.timestamp ? new Date(l.timestamp) : null
      if (from && (!t || t < from)) return false
      if (to && (!t || t > to)) return false
      return true
    })
  }, [logs, category, fromDate, toDate])

  const hasFilters = category !== 'All' || fromDate || toDate
  function resetFilters() {
    setCategory('All')
    setFromDate('')
    setToDate('')
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
          <History className="h-6 w-6 text-risk-low" />
          Threat History
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Every scan recorded in Firestore, newest first.
        </p>
      </header>

      {/* Filters */}
      <div className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <Filter className="h-3.5 w-3.5" /> Filters
        </div>

        <label className="flex flex-col gap-1 text-xs text-slate-600">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-slate-300 bg-ink-950 px-2.5 py-1.5 text-sm text-slate-900 focus:border-risk-low/40 focus:outline-none"
          >
            <option value="All">All categories</option>
            {CATEGORY_NAMES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-slate-600">
          From
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg border border-slate-300 bg-ink-950 px-2.5 py-1.5 text-sm text-slate-900 focus:border-risk-low/40 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-slate-600">
          To
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg border border-slate-300 bg-ink-950 px-2.5 py-1.5 text-sm text-slate-900 focus:border-risk-low/40 focus:outline-none"
          />
        </label>

        {hasFilters && (
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 transition-colors hover:text-slate-900"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        )}

        <span className="ml-auto self-center text-xs text-slate-500">
          {loading ? '…' : `${filtered.length} of ${logs.length}`}
        </span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-ink-850 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Input Preview</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <SkeletonRows />
              ) : error ? (
                <MessageRow text={error} />
              ) : filtered.length === 0 ? (
                <MessageRow
                  text={
                    !isFirebaseConfigured
                      ? 'Firebase is not configured — no logs to display.'
                      : logs.length === 0
                        ? 'No scans recorded yet.'
                        : 'No scans match the current filters.'
                  }
                />
              ) : (
                filtered.map((log) => {
                  const tier = riskTier(log.safety_score)
                  const blocked = log.action === 'BLOCKED'
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelected(log)}
                      className="cursor-pointer transition-colors hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="max-w-xs px-4 py-3 text-slate-700">
                        {truncate(log.text, 56)}
                      </td>
                      <td className="px-4 py-3">
                        <CategoryBadge category={log.category} size="sm" />
                      </td>
                      <td className={`px-4 py-3 font-semibold tabular-nums ${tier.text}`}>
                        {Number(log.safety_score).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${
                            blocked
                              ? 'bg-risk-high/15 text-risk-high'
                              : 'bg-risk-low/15 text-risk-low'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ChevronRight className="ml-auto h-4 w-4 text-slate-500" />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ThreatDetailModal log={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function SkeletonRows() {
  return Array.from({ length: 6 }).map((_, i) => (
    <tr key={i}>
      {Array.from({ length: 6 }).map((__, j) => (
        <td key={j} className="px-4 py-3.5">
          <div className="skeleton h-4 w-full" />
        </td>
      ))}
    </tr>
  ))
}

function MessageRow({ text }) {
  return (
    <tr>
      <td colSpan={6} className="px-4 py-16">
        <div className="flex flex-col items-center justify-center text-center text-slate-500">
          <Inbox className="mb-2 h-8 w-8 opacity-40" />
          <p className="text-sm">{text}</p>
        </div>
      </td>
    </tr>
  )
}
