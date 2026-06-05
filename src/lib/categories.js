import {
  ShieldCheck,
  Syringe,
  Unlock,
  IdCard,
  Brain,
  Skull,
  AlertTriangle,
} from 'lucide-react'

/**
 * Central registry of threat categories. Used by CategoryBadge, the dashboard
 * chart, and the history filters so colors/icons stay consistent everywhere.
 *
 * `tw` holds Tailwind utility classes for the badge; `hex` is the raw color
 * for Recharts (which can't read Tailwind classes).
 */
export const CATEGORIES = {
  'Prompt Injection': {
    icon: Syringe,
    hex: '#f97316',
    tw: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  },
  Jailbreak: {
    icon: Unlock,
    hex: '#a855f7',
    tw: 'bg-purple-500/15 text-purple-700 border-purple-500/30',
  },
  Toxicity: {
    icon: Skull,
    hex: '#ef4444',
    tw: 'bg-red-500/15 text-red-700 border-red-500/30',
  },
  'PII Exposure': {
    icon: IdCard,
    hex: '#3b82f6',
    tw: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  },
  'Hallucination Risk': {
    icon: Brain,
    hex: '#eab308',
    tw: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  },
  Safe: {
    icon: ShieldCheck,
    hex: '#22c55e',
    tw: 'bg-green-500/15 text-green-700 border-green-500/30',
  },
}

export const CATEGORY_NAMES = Object.keys(CATEGORIES)

const FALLBACK = {
  icon: AlertTriangle,
  hex: '#94a3b8',
  tw: 'bg-slate-500/15 text-slate-700 border-slate-500/30',
}

export function getCategoryMeta(category) {
  return CATEGORIES[category] || FALLBACK
}
