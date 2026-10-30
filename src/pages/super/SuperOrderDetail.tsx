import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarPlus, ExternalLink, MessageCircle, RefreshCw } from 'lucide-react'
import { api, ApiError } from '../../lib/api'
import { useAdminAuth } from '../../lib/adminAuthContext'
import { displayPhone, paymentMethodLabel } from '../../lib/checkout'
import { parseMysqlDate } from '../../lib/eventFormat'
import { EVENT_TYPES, eventTitle, formatHostNames } from '../../lib/eventTypes'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { fieldClass } from '../../components/panel/form'
import { OrderStatusBadge } from '../../components/panel/OrderStatusBadge'
import { PageHeader, panelCardClass, primaryButtonClass, secondaryButtonClass } from '../../components/panel/ui'
import type { SuperOrderDetail as OrderDetail } from '../../types'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const dateTime = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const longDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

const OUTCOMES: Record<string, string> = {
  paid: 'marcou como pago',
  refunded: 'marcou como estornado',
  amount_mismatch: 'valor diferente do pedido (não marcou)',
  paid_while_canceled: 'pago com o pedido cancelado (não marcou)',
  ignored: 'sem mudança',
  order_not_found: 'pedido não encontrado',
  payment_not_found: 'pagamento não encontrado',
}
const SOURCES: Record<string, string> = {
  webhook: 'Aviso do Mercado Pago',
  return: 'Volta do cliente',
  check: 'Página do pedido',
  super: 'Conferido aqui',
}
const MP_STATUSES: Record<string, string> = {
  approved: 'aprovado',
  pending: 'pendente',
  in_process: 'em análise',
  rejected: 'recusado',
  cancelled: 'cancelado',
  refunded: 'estornado',
  charged_back: 'contestado',
}

const formatDateTime = (value: string | null) => {
  const date = value ? parseMysqlDate(value) : null
  return date ? dateTime.format(date) : '—'
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={`${panelCardClass} p-5 sm:p-6`}>
      <h2 className="font-semibold text-[#3f3450]">{title}</h2>
      <div className="mt-4 text-sm">{children}</div>
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-1.5">
      <dt className="text-[#8b7a9c]">{label}</dt>
      <dd className="min-w-0 text-right break-words text-[#3f3450]">{children}</dd>
    </div>
  )
}

/** "Até 100 convidados · com lista · Premium · 1 admin extra" */
function choiceLine(order: OrderDetail): string | null {
  const choice = order.choice
  if (!choice) return null
  const parts = [`Até ${choice.max_guests} convidados`, choice.gifts ? 'com lista de presentes' : 'sem lista de presentes']
  if (choice.premium) parts.push('Premium')
  if (choice.extra_admins > 0) parts.push(choice.extra_admins === 1 ? '1 admin extra' : `${choice.extra_admins} admins extras`)
  return parts.join(' · ')
}

/**
 * Um pedido feito pelo site: quem é, o que comprou, o pagamento e o diário
 * de avisos do Mercado Pago. Pedido pago vira evento pelo "Criar evento"
 * (abre "Novo evento" preenchido com o pedido).
 */
export default function SuperOrderDetail() {
  const { orderId = '' } = useParams()
  const { session } = useAdminAuth()
  const token = session?.token ?? null
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [checking, setChecking] = useState(false)
  const [checkMessage, setCheckMessage] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const receive = (next: OrderDetail) => {
    setOrder(next)
    setNotes(next.super_notes ?? '')
  }

  useEffect(() => {
    api
      .get<{ order: OrderDetail }>(`/admin/super/orders/${orderId}`, token)
      .then((res) => receive(res.order))
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Não foi possível carregar o pedido.'))
  }, [orderId, token])

  const backLink = (
    <Link to="/super/pedidos" className="inline-flex items-center gap-1.5 text-sm text-[#8b7a9c] hover:text-brand-primary">
      <ArrowLeft size={15} /> Pedidos
    </Link>
  )

  if (!order) {
    return (
      <div>
        {backLink}
        <p className={`mt-6 ${loadError ? 'text-sm text-rose-600' : 'text-[#8b7a9c]'}`}>{loadError ?? 'Carregando...'}</p>
      </div>
    )
  }

  const checkPayments = async () => {
    setChecking(true)
    setActionError(null)
    setCheckMessage(null)
    try {
      const res = await api.post<{ order: OrderDetail; payments_found: number }>(
        `/admin/super/orders/${order.id}/check`,
        undefined,
        token
      )
      receive(res.order)
      setCheckMessage(
        res.payments_found === 0
          ? 'O Mercado Pago ainda não tem nenhum pagamento para este pedido.'
          : `O Mercado Pago tem ${res.payments_found === 1 ? '1 pagamento' : `${res.payments_found} pagamentos`} para este pedido. O status acima já está atualizado.`
      )
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Não foi possível conferir no Mercado Pago.')
    } finally {
      setChecking(false)
    }
  }

  const saveNotes = async () => {
    setSavingNotes(true)
    setActionError(null)
    try {
      const res = await api.put<{ order: OrderDetail }>(`/admin/super/orders/${order.id}`, { super_notes: notes }, token)
      receive(res.order)
      setNotesSaved(true)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Não foi possível salvar as notas.')
    } finally {
      setSavingNotes(false)
    }
  }

  const cancelOrder = async () => {
    setCanceling(true)
    setActionError(null)
    try {
      const res = await api.put<{ order: OrderDetail }>(`/admin/super/orders/${order.id}`, { status: 'canceled' }, token)
      receive(res.order)
      setConfirmCancel(false)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Não foi possível cancelar o pedido.')
    } finally {
      setCanceling(false)
    }
  }

  const method = paymentMethodLabel(order.payment_method, order.installments)
  const eventDate = order.event_date ? parseMysqlDate(`${order.event_date} 00:00:00`) : null
  const canCancel = ['pending', 'expired', 'paid'].includes(order.status)
  const choice = choiceLine(order)

  return (
    <div>
      {backLink}

      <div className="mt-4">
        <PageHeader
          eyebrow={`Pedido #${order.id}`}
          title={eventTitle(order)}
          description={`Feito em ${formatDateTime(order.created_at)} por ${order.customer_name}.`}
          actions={
            <>
              {order.status === 'paid' && (
                <Link to={`/super/eventos/novo?pedido=${order.id}`} className={primaryButtonClass}>
                  <CalendarPlus size={16} />
                  Criar evento
                </Link>
              )}
              {order.event_id !== null && (
                <Link to={`/super/eventos/${order.event_id}`} className={primaryButtonClass}>
                  Abrir evento
                </Link>
              )}
              <button type="button" onClick={checkPayments} disabled={checking} className={secondaryButtonClass}>
                <RefreshCw size={16} className={checking ? 'animate-spin' : ''} />
                {checking ? 'Conferindo...' : 'Conferir no Mercado Pago'}
              </button>
            </>
          }
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <OrderStatusBadge status={order.status} />
        <a
          href={`/pedido/${order.public_id}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline"
        >
          <ExternalLink size={12} />
          Página do pedido (a que o cliente vê)
        </a>
      </div>
      {checkMessage && <p className="mt-3 text-sm text-emerald-700">{checkMessage}</p>}
      {actionError && <p className="mt-3 text-sm text-rose-600">{actionError}</p>}

      <div className="mt-6 grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="space-y-5">
          <Card title="Cliente">
            <dl className="divide-y divide-[#f3eef5]">
              <Row label="Nome">{order.customer_name}</Row>
              <Row label="Email">
                <a href={`mailto:${order.customer_email}`} className="text-brand-primary hover:underline">
                  {order.customer_email}
                </a>
              </Row>
              <Row label="WhatsApp">
                <a
                  href={`https://wa.me/${order.customer_phone}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-brand-primary hover:underline"
                >
                  <MessageCircle size={14} />
                  {displayPhone(order.customer_phone)}
                </a>
              </Row>
            </dl>
          </Card>

          <Card title="Evento">
            <dl className="divide-y divide-[#f3eef5]">
              <Row label="Tipo">{EVENT_TYPES[order.event_type].label}</Row>
              <Row label="Nomes no convite">{formatHostNames(order)}</Row>
              {order.subtitle && <Row label="Celebração">{order.subtitle}</Row>}
              <Row label="Data">{eventDate ? longDate.format(eventDate) : 'Ainda não sabe'}</Row>
            </dl>
            {order.customer_notes && (
              <p className="mt-3 rounded-xl bg-[#faf8fb] p-3 whitespace-pre-line text-[#6b5d80]">{order.customer_notes}</p>
            )}
          </Card>

          <Card title="Avisos do Mercado Pago">
            {order.notifications.length === 0 ? (
              <p className="text-[#8b7a9c]">Nenhum aviso ainda.</p>
            ) : (
              <ul className="divide-y divide-[#f3eef5]">
                {order.notifications.map((item) => (
                  <li key={item.id} className="py-2">
                    <p className="text-[#3f3450]">
                      {SOURCES[item.source ?? ''] ?? item.source ?? 'Aviso'}: pagamento{' '}
                      {MP_STATUSES[item.mp_status ?? ''] ?? item.mp_status ?? '—'}
                      {item.amount !== null && ` · ${currency.format(item.amount)}`}
                    </p>
                    <p className="text-xs text-[#8b7a9c]">
                      {formatDateTime(item.created_at)} · {OUTCOMES[item.outcome] ?? item.outcome}
                      {item.mp_payment_id && ` · MP ${item.mp_payment_id}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Orçamento">
            {choice && <p className="mb-3 text-[#6b5d80]">{choice}</p>}
            <dl className="divide-y divide-[#f3eef5]">
              {order.items.map((item) => (
                <div key={item.label} className="flex justify-between gap-4 py-1.5">
                  <dt className="text-[#6b5d80]">{item.label}</dt>
                  <dd className={`tabular-nums ${item.amount < 0 ? 'text-emerald-700' : 'text-[#3f3450]'}`}>
                    {item.amount < 0 ? `− ${currency.format(-item.amount)}` : currency.format(item.amount)}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-[#ece6f0] pt-2">
              <span className="font-medium text-[#3f3450]">Total</span>
              <span className="font-display text-lg font-semibold text-[#3f3450] tabular-nums">
                {currency.format(order.total)}
              </span>
            </div>
          </Card>

          <Card title="Pagamento">
            <dl className="divide-y divide-[#f3eef5]">
              <Row label="Forma">{method ?? '—'}</Row>
              <Row label="Valor pago">{order.paid_amount !== null ? currency.format(order.paid_amount) : '—'}</Row>
              <Row label="Pago em">{formatDateTime(order.paid_at)}</Row>
              {order.status === 'pending' && <Row label="Expira em">{formatDateTime(order.expires_at)}</Row>}
              <Row label="Pagamento no MP">{order.mp_payment_id ?? '—'}</Row>
            </dl>
            {order.status === 'refunded' && (
              <p className="mt-3 rounded-xl bg-rose-50 p-3 text-rose-700">
                O pagamento foi estornado ou contestado no Mercado Pago.
                {order.event_id !== null && ' O evento continua no ar: decida o que fazer com ele.'}
              </p>
            )}
          </Card>

          <Card title="Notas">
            <textarea
              rows={3}
              value={notes}
              maxLength={2000}
              onChange={(e) => {
                setNotes(e.target.value)
                setNotesSaved(false)
              }}
              placeholder="Só você vê. Ex: combinei a foto pelo WhatsApp."
              aria-label="Notas do pedido"
              className={fieldClass}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={saveNotes}
                disabled={savingNotes || notes === (order.super_notes ?? '')}
                className={secondaryButtonClass}
              >
                {savingNotes ? 'Salvando...' : 'Salvar notas'}
              </button>
              {notesSaved && <span className="text-sm text-emerald-700">Salvas.</span>}
              {canCancel && (
                <button
                  type="button"
                  onClick={() => setConfirmCancel(true)}
                  className="cursor-pointer ml-auto text-sm font-medium text-rose-600 hover:underline"
                >
                  Cancelar pedido
                </button>
              )}
            </div>
          </Card>
        </div>
      </div>

      {confirmCancel && (
        <ConfirmDialog
          title="Cancelar este pedido?"
          description={
            <p>
              {order.status === 'paid'
                ? 'O pedido já foi pago: cancelar aqui não devolve o dinheiro. Faça o estorno no painel do Mercado Pago.'
                : 'Se a pessoa ainda pagar pela página do Mercado Pago, o pedido continua cancelado e você recebe um aviso pra estornar.'}
            </p>
          }
          confirmLabel="Cancelar pedido"
          loadingLabel="Cancelando..."
          cancelLabel="Voltar"
          loading={canceling}
          onConfirm={cancelOrder}
          onCancel={() => setConfirmCancel(false)}
        />
      )}
    </div>
  )
}
