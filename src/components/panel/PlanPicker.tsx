import { planDescription, PLAN_OPTIONS } from '../../lib/plans'
import { usePricingSettings } from '../../lib/pricing'
import type { EventPlan } from '../../types'

/** Escolha do plano do evento (criação e página do evento no super-admin). */
export function PlanPicker({ value, onChange }: { value: EventPlan; onChange: (plan: EventPlan) => void }) {
  const settings = usePricingSettings()

  return (
    <div role="radiogroup" aria-label="Plano do evento" className="grid gap-3 sm:col-span-2 sm:grid-cols-3">
      {PLAN_OPTIONS.map((option) => {
        const selected = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`cursor-pointer flex flex-col rounded-2xl border bg-white p-4 text-left transition ${
              selected
                ? 'border-brand-primary ring-2 ring-brand-primary/25'
                : 'border-brand-primary-soft hover:border-brand-primary/40'
            }`}
          >
            <span className="block text-sm font-semibold text-[#3f3450]">{option.label}</span>
            <span className="mt-1 block text-xs text-[#8b7a9c]">{planDescription(option.value, settings)}</span>
          </button>
        )
      })}
    </div>
  )
}
