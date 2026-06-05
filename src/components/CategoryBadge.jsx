import { getCategoryMeta } from '../lib/categories'

/**
 * Pill badge for a threat category, color-coded with a leading icon.
 *
 * @param {{ category: string, size?: 'sm'|'md', showIcon?: boolean }} props
 */
export default function CategoryBadge({ category, size = 'md', showIcon = true }) {
  const { icon: Icon, tw } = getCategoryMeta(category)
  const sizing =
    size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : 'px-2.5 py-1 text-sm gap-1.5'

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${tw} ${sizing}`}
    >
      {showIcon && <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />}
      {category}
    </span>
  )
}
