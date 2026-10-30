import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAdminAuth } from '../../lib/adminAuthContext'
import { paymentMethodLabel } from '../../lib/checkout'
import { parseMysqlDate } from '../../lib/eventFormat'
import { eventTitle } from '../../lib/eventTypes'
import { OrderStatusBadge } from '../../components/panel/OrderStatusBadge'
import { EmptyState, PageHeader, panelCardClass, PanelTabs } from '../../components/panel/ui'
import type { OrderStatus, SuperOrder } from '../../types'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const dateTime = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

type Tab = 'pagos' | 'aguardando' | 'todos'

const TAB_STATUS: Record<Exclude<Tab, 'todos'>, OrderStatus> = { pagos: 'paid', aguardando: 'pending' }

const COLUMNS = 'md:grid-cols-[minmax(0,2.2fr)_9rem_11rem_7rem]'

/**
 * Pedidos feitos pelo site (Contratar). Abre nos pagos que ainda não viraram
 * evento, quando há algum: é o que pede ação ("Criar evento", no detalhe).
 */
export default function SuperOrderList() {
  const { session } = useAdminAuth()
  const token = session?.token ?? null
  const [searchParams, setSearchParams] = useSearchParams()
  const [orders, setOrders] = useState<SuperOrder[] | null>(null)
  const [counts, setCounts] = useState<Record<OrderStatus, number> | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    api
      .get<{ orders: SuperOrder[]; counts: Record<OrderStatus, number> }>('/admin/super/orders', token)
      .then((res) => {
        setOrders(res.orders)
        setCounts(res.counts)
      })
      .catch(() => setError(true))
  }, [token])

  const requested = searchParams.get('aba') as Tab | null
  const tab: Tab = requested ?? (counts && counts.paid > 0 ? 'pagos' : 'todos')
  const setTab = (value: Tab) => setSearchParams({ aba: value }, { replace: true })
  const visible = (orders ?? []).filter((order) => tab === 'todos' || order.status === TAB_STATUS[tab])

  return (
    <div>
      <PageHeader
        title="Pedidos"
        description="Contratações feitas pelo site. Pedido pago vira evento pelo botão “Criar evento”, no detalhe."
      />

      <PanelTabs
        className="mt-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'pagos', label: `Pagos aguardando${counts ? ` (${counts.paid})` : ''}` },
          { value: 'aguardando', label: `Aguardando pagamento${counts ? ` (${counts.pending})` : ''}` },
          { value: 'todos', label: `Todos${orders ? ` (${orders.length})` : ''}` },
        ]}
      />

      <div className={`mt-4 overflow-hidden ${panelCardClass}`}>
        <div
          className={`hidden gap-4 border-b border-[#f3eef5] px-5 py-3 text-xs font-medium tracking-wide text-[#8b7a9c] uppercase md:grid ${COLUMNS}`}
        >
          <span>Pedido</span>
          <span>Feito em</span>
          <span>Status</span>
          <span className="text-right">Total</span>
        </div>

        {error ? (
          <EmptyState>Não foi possível carregar os pedidos.</EmptyState>
        ) : !orders ? (
          <EmptyState>Carregando...</EmptyState>
        ) : visible.length === 0 ? (
          <EmptyState>
            {orders.length === 0
              ? 'Nenhum pedido pelo site ainda.'
              : tab === 'pagos'
                ? 'Nenhum pedido pago esperando virar evento.'
                : 'Nenhum pedido aguardando pagamento.'}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-[#f3eef5]">
            {visible.map((order) => {
              const created = parseMysqlDate(order.created_at)
              const method = paymentMethodLabel(order.payment_method, order.installments)
              return (
                <li key={order.id}>
                  <Link
                    to={`/super/pedidos/${order.id}`}
                    className={`grid grid-cols-1 gap-x-4 gap-y-2 px-5 py-4 transition hover:bg-[#faf8fb] md:items-center ${COLUMNS}`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium break-words text-[#3f3450]">{eventTitle(order)}</p>
                      <p className="text-xs break-words text-[#8b7a9c]">
                        {order.customer_name} · {order.customer_email}
                      </p>
                    </div>
                    <p className="text-sm text-[#6b5d80]">{created ? dateTime.format(created) : '—'}</p>
                    <div>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <div className="md:text-right">
                      <p className="text-sm text-[#3f3450] tabular-nums">{currency.format(order.total)}</p>
                      {method && <p className="text-xs text-[#8b7a9c]">{method}</p>}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
