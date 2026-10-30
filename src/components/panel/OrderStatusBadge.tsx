import { ORDER_STATUS } from '../../lib/checkout'
import type { OrderStatus } from '../../types'

/** Status de um pedido feito pelo site, sempre com texto (não só cor). */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, className } = ORDER_STATUS[status]

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${className}`}
    >
      {label}
    </span>
  )
}
