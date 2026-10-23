import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export const panelCardClass = 'rounded-2xl border border-[#ece6f0] bg-white'

export const primaryButtonClass =
  'cursor-pointer inline-flex items-center justify-center gap-2 rounded-full bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-primary-hover disabled:cursor-default disabled:opacity-60'

export const secondaryButtonClass =
  'cursor-pointer inline-flex items-center justify-center gap-2 rounded-full border border-[#ece6f0] bg-white px-5 py-2.5 text-sm font-semibold text-[#3f3450] transition hover:border-brand-primary/40 hover:text-brand-primary disabled:cursor-default disabled:opacity-60'

/** Título da página do painel, com descrição e ações à direita. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-semibold tracking-wide text-brand-primary uppercase">{eyebrow}</p>}
        <h1 className="font-display text-2xl font-semibold text-balance text-[#3f3450] sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-[#8b7a9c]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

/** Número de destaque (rótulo, valor e uma linha de contexto). */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: LucideIcon
}) {
  return (
    <div className={`${panelCardClass} p-4 sm:p-5`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-[#8b7a9c]">{label}</p>
        {Icon && <Icon size={16} className="shrink-0 text-brand-primary" aria-hidden />}
      </div>
      <p className="mt-2 font-display text-2xl font-semibold text-[#3f3450] sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-[#8b7a9c]">{hint}</p>}
    </div>
  )
}

/** Barra de progresso: trilho num tom claro da mesma cor do preenchimento. */
export function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      title={label}
      className="h-1.5 w-full overflow-hidden rounded-full bg-brand-primary-soft"
    >
      <div className="h-full rounded-full bg-brand-primary" style={{ width: `${percent}%` }} />
    </div>
  )
}

/** Estado vazio de listas e tabelas. */
export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-4 py-10 text-center text-sm text-[#8b7a9c]">{children}</p>
}
