import type { GuestStatus } from '../types'

const STYLES: Record<GuestStatus, string> = {
  pendente: 'bg-amber-100 text-amber-700',
  confirmado: 'bg-emerald-100 text-emerald-700',
  recusado: 'bg-rose-100 text-rose-700',
}

const LABELS: Record<GuestStatus, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  recusado: 'Recusado',
}

export function StatusBadge({ status }: { status: GuestStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  )
}
