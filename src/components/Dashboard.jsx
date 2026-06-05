import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import {
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Gauge,
  ArrowUpRight,
  Inbox,
} from 'lucide-react'
import { getScanLogs, isFirebaseConfigured } from '../services/firebase'
import { CATEGORY_NAMES, getCategoryMeta } from '../lib/categories'
import { riskTier } from './SafetyScoreBar'
import CategoryBadge from './CategoryBadge'
import { truncate, timeAgo } from '../lib/format'

export default function Dashboard() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    getScanLogs(500)
      .then((data) => active && setLogs(data))
      .catch((e) => console.error('[dashboard] load failed', e))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const stats = useMemo(() => {
    const total = logs.length
    const threats = logs.filter((l) => l.action === 'BLOCKED').length
    const safe = total - threats
    const avg =
      total > 0
        ? logs.reduce((sum, l) => sum + (Number(l.safety_score) || 0), 0) / total
        : 0
    return { total, threats, safe, avg }
  }, [logs])

  const chartData = useMemo(() => {
    const counts = Object.fromEntries(CATEGORY_NAMES.map((c) => [c, 0]))
    for (const l of logs) {
      if (l.category in counts) counts[l.category] += 1
    }
    return CATEGORY_NAMES.map((name) => ({
      name,
      value: counts[name],
      color: getCategoryMeta(name).hex,
    })).filter((d) => d.value > 0)
  }, [logs])

  const recent = logs.slice(0, 6)

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Overview of guardrail activity and detected threats.
        </p>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          loading={loading}
          icon={ScanLine}
          label="Total Scans"
          value={stats.total}
          tint="text-slate-700"
        />
        <StatCard
          loading={loading}
          icon={ShieldAlert}
          label="Threats Detected"
          value={stats.threats}
          tint="text-risk-high"
        />
        <StatCard
          loading={loading}
          icon={ShieldCheck}
          label="Safe Responses"
          value={stats.safe}
          tint="text-risk-low"
        />
        <StatCard
          loading={loading}
          icon={Gauge}
          label="Avg Safety Score"
          value={stats.avg.toFixed(2)}
          tint={riskTier(stats.avg).text}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* Threat breakdown chart */}
        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">
            Threat Breakdown
          </h2>
          {loading ? (
            <div className="skeleton mx-auto h-56 w-56 rounded-full" />
          ) : chartData.length === 0 ? (
            <EmptyState message="No scans yet to chart." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  stroke="none"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    color: '#0f172a',
                  }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, color: '#475569' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* Recent activity */}
        <section className="card p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
              Recent Activity
            </h2>
            <Link
              to="/history"
              className="inline-flex items-center gap-1 text-xs font-medium text-risk-low hover:underline"
            >
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-12 w-full" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <EmptyState
              message={
                isFirebaseConfigured
                  ? 'No scans recorded yet. Run one from the Scanner.'
                  : 'Configure Firebase to see scan history here.'
              }
            />
          ) : (
            <ul className="divide-y divide-slate-200">
              {recent.map((log) => (
                <li
                  key={log.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div
                    className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                      log.action === 'BLOCKED' ? 'bg-risk-high' : 'bg-risk-low'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-700">
                      {truncate(log.text, 70)}
                    </p>
                    <p className="text-xs text-slate-500">{timeAgo(log.timestamp)}</p>
                  </div>
                  <CategoryBadge category={log.category} size="sm" />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function StatCard({ loading, icon: Icon, label, value, tint }) {
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <Icon className={`h-4 w-4 ${tint}`} />
      </div>
      {loading ? (
        <div className="skeleton h-8 w-16" />
      ) : (
        <div className={`text-2xl font-bold tabular-nums ${tint}`}>{value}</div>
      )}
    </div>
  )
}

function EmptyState({ message }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center text-center text-slate-500">
      <Inbox className="mb-2 h-8 w-8 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
