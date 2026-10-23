import { Crown, Infinity as InfinityIcon } from 'lucide-react'
import { PLAN_LABELS } from '../../lib/plans'
import type { EventPlan } from '../../types'

/** Selo do plano no super-admin. O Padrão é o normal, então não ganha selo. */
export function PlanBadge({ plan }: { plan: EventPlan }) {
  if (plan === 'standard') return null

  const Icon = plan === 'premium' ? Crown : InfinityIcon

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
        plan === 'premium' ? 'bg-amber-50 text-amber-700' : 'bg-[#231b2e] text-presenzo-gold'
      }`}
    >
      <Icon size={12} aria-hidden />
      {PLAN_LABELS[plan]}
    </span>
  )
}
