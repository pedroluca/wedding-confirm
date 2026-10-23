import { ACCESS_STATE_STYLES, accessStatus } from '../../lib/eventAccess'

/** Situação do acesso ao painel do evento, sempre com texto (não só cor). */
export function AccessBadge({ expiresAt }: { expiresAt: string | null }) {
  const status = accessStatus(expiresAt)

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${ACCESS_STATE_STYLES[status.state]}`}
    >
      {status.label}
    </span>
  )
}
