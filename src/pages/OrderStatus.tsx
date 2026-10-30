import { useEffect, useState, type ReactNode } from 'react'
import { CheckCircle2, Clock, Lock, MessageCircle, PartyPopper, XCircle } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { paymentMethodLabel } from '../lib/checkout'
import { WHATSAPP_URL } from '../lib/contact'
import { formatEventDay, parseMysqlDate } from '../lib/eventFormat'
import { eventTitle } from '../lib/eventTypes'
import { currencyFormatter } from '../lib/pricing'
import { Copyright } from '../components/DevCredit'
import { PageShell } from '../components/PageShell'
import type { PublicOrder } from '../types'

// Enquanto aguarda pagamento, consulta de tempos em tempos (o Pix costuma
// confirmar em segundos, e o aviso do Mercado Pago pode chegar depois da volta).
const POLL_MS = 5000
const MAX_POLLS = 120

const primaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-full bg-brand-primary px-6 py-3 font-semibold text-white transition hover:bg-brand-primary-hover'
const secondaryLinkClass = 'inline-flex items-center gap-1.5 font-semibold text-brand-primary hover:underline'

function formatRemaining(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  if (hours >= 1) return hours === 1 ? '1 hora' : `${hours} horas`
  const minutes = Math.max(1, Math.round(seconds / 60))
  return minutes === 1 ? '1 minuto' : `${minutes} minutos`
}

function StatusCard({
  icon,
  tone,
  title,
  children,
}: {
  icon: ReactNode
  tone: 'success' | 'waiting' | 'problem'
  title: string
  children: ReactNode
}) {
  const tones = {
    success: 'bg-emerald-50 text-emerald-600',
    waiting: 'bg-brand-primary-soft text-brand-primary',
    problem: 'bg-amber-50 text-amber-600',
  }
  return (
    <div className="text-center">
      <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${tones[tone]}`}>{icon}</span>
      <h1 className="mt-4 text-2xl font-semibold text-balance text-[#3f3450]">{title}</h1>
      <div className="mt-3 space-y-3 text-sm text-[#6b5d80]">{children}</div>
    </div>
  )
}

/** O que mostrar enquanto o pedido aguarda, conforme o que o Mercado Pago disse na volta (status na URL). */
function PendingCard({ order, mpStatus }: { order: PublicOrder; mpStatus: string | null }) {
  const remaining = order.expires_in_seconds ? formatRemaining(order.expires_in_seconds) : null
  const payButton = order.checkout_url && (
    <a href={order.checkout_url} className={primaryButtonClass}>
      <Lock size={16} />
      {mpStatus === 'rejected' ? 'Tentar de novo' : 'Ir para o pagamento'}
    </a>
  )

  if (mpStatus === 'approved') {
    return (
      <StatusCard icon={<Clock size={28} />} tone="waiting" title="Confirmando o pagamento...">
        <p>O Mercado Pago aprovou. Estamos só confirmando, esta página atualiza sozinha.</p>
      </StatusCard>
    )
  }
  if (mpStatus === 'pending' || mpStatus === 'in_process') {
    return (
      <StatusCard icon={<Clock size={28} />} tone="waiting" title="Aguardando a confirmação do pagamento">
        <p>
          Se você gerou um Pix, é só pagar: esta página atualiza sozinha quando o pagamento for confirmado. Pagamento
          com cartão em análise também aparece aqui.
        </p>
        {payButton && <div className="pt-2">{payButton}</div>}
      </StatusCard>
    )
  }
  return (
    <StatusCard
      icon={mpStatus === 'rejected' ? <XCircle size={28} /> : <Clock size={28} />}
      tone={mpStatus === 'rejected' ? 'problem' : 'waiting'}
      title={mpStatus === 'rejected' ? 'O pagamento não foi aprovado' : 'Aguardando pagamento'}
    >
      <p>
        {mpStatus === 'rejected'
          ? 'Nada foi cobrado. Você pode tentar de novo com outro cartão ou com Pix.'
          : 'Seu pedido está guardado. Assim que o pagamento for feito, esta página atualiza sozinha.'}
      </p>
      {payButton && <div className="pt-2">{payButton}</div>}
      {remaining && <p className="text-xs text-[#8b7a9c]">O link de pagamento vale por mais {remaining}.</p>}
    </StatusCard>
  )
}

function StatusMessage({ order, mpStatus }: { order: PublicOrder; mpStatus: string | null }) {
  const whatsapp = (
    <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className={secondaryLinkClass}>
      <MessageCircle size={16} />
      Falar no WhatsApp
    </a>
  )

  switch (order.status) {
    case 'pending':
      return <PendingCard order={order} mpStatus={mpStatus} />
    case 'paid':
      return (
        <StatusCard icon={<CheckCircle2 size={28} />} tone="success" title={`Pagamento confirmado, ${order.customer_first_name}!`}>
          <p>
            Agora a gente prepara o seu convite. Assim que estiver pronto, você recebe um email pra entrar no painel e
            personalizar tudo: foto, música, textos, convidados e a lista de presentes.
          </p>
          <p>Mandamos também um email com o resumo do pedido.</p>
        </StatusCard>
      )
    case 'event_created':
      return (
        <StatusCard icon={<PartyPopper size={28} />} tone="success" title="Seu convite está pronto!">
          <p>
            Mandamos um email pra você entrar no painel. Não achou? Confira o spam ou use "Esqueci minha senha" com o
            email do pedido.
          </p>
          <div className="pt-2">
            <Link to="/admin/login" className={primaryButtonClass}>
              Entrar no painel
            </Link>
          </div>
        </StatusCard>
      )
    case 'expired':
      return (
        <StatusCard icon={<Clock size={28} />} tone="problem" title="Esse pedido expirou">
          <p>O link de pagamento vale por 24 horas e esse passou do prazo. Nada foi cobrado.</p>
          <div className="pt-2">
            <Link to="/contratar" className={primaryButtonClass}>
              Fazer um novo pedido
            </Link>
          </div>
        </StatusCard>
      )
    case 'canceled':
      return (
        <StatusCard icon={<XCircle size={28} />} tone="problem" title="Pedido cancelado">
          <p>Esse pedido foi cancelado. Se tiver alguma dúvida, fala com a gente.</p>
          <div className="pt-1">{whatsapp}</div>
        </StatusCard>
      )
    case 'refunded':
      return (
        <StatusCard icon={<XCircle size={28} />} tone="problem" title="Pagamento estornado">
          <p>O pagamento desse pedido foi estornado. Se tiver alguma dúvida, fala com a gente.</p>
          <div className="pt-1">{whatsapp}</div>
        </StatusCard>
      )
  }
}

function OrderSummary({ order }: { order: PublicOrder }) {
  // Só a data (AAAA-MM-DD): com o horário junto ela é lida no fuso local, não em UTC.
  const date = order.event_date ? parseMysqlDate(`${order.event_date} 00:00:00`) : null
  const method = paymentMethodLabel(order.payment_method, order.installments)

  return (
    <div className="mt-8 rounded-2xl bg-brand-primary-soft/30 p-5 text-sm">
      <p className="font-semibold text-[#3f3450]">{eventTitle(order)}</p>
      <p className="text-xs text-[#8b7a9c]">{date ? formatEventDay(date) : 'Data ainda não definida'}</p>
      <dl className="mt-3 divide-y divide-[#ece6f0]">
        {order.items.map((item) => (
          <div key={item.label} className="flex justify-between gap-4 py-1.5">
            <dt className="text-[#6b5d80]">{item.label}</dt>
            <dd className={`tabular-nums ${item.amount < 0 ? 'text-emerald-700' : 'text-[#3f3450]'}`}>
              {item.amount < 0 ? `− ${currencyFormatter.format(-item.amount)}` : currencyFormatter.format(item.amount)}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-[#ece6f0] pt-2">
        <span className="font-medium text-[#3f3450]">Total</span>
        <span className="font-display text-lg font-semibold text-[#3f3450] tabular-nums">
          {currencyFormatter.format(order.total)}
        </span>
      </div>
      {method && <p className="mt-1 text-right text-xs text-[#8b7a9c]">{method}</p>}
    </div>
  )
}

/**
 * /pedido/:publicId: o status de um pedido feito pelo site, pra onde o
 * Mercado Pago devolve a pessoa (pagando ou não). O payment_id da URL de
 * volta faz a API conferir o pagamento na hora; depois, enquanto aguarda,
 * a página consulta sozinha. O link não pede login: a API não devolve
 * email nem telefone.
 */
export default function OrderStatus() {
  const { publicId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const paymentId = searchParams.get('payment_id') ?? searchParams.get('collection_id')
  const mpStatus = searchParams.get('status') ?? searchParams.get('collection_status')
  const [order, setOrder] = useState<PublicOrder | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [polls, setPolls] = useState(0)

  // A primeira consulta leva o payment_id da volta (se houver); as seguintes, não.
  useEffect(() => {
    let active = true
    const query = paymentId && paymentId !== 'null' ? `?payment_id=${encodeURIComponent(paymentId)}` : ''
    api
      .get<{ order: PublicOrder }>(`/orders/${publicId}${query}`)
      .then((res) => {
        if (active) setOrder(res.order)
      })
      .catch((err) => {
        if (active && err instanceof ApiError && err.status === 404) setNotFound(true)
      })
    return () => {
      active = false
    }
  }, [publicId, paymentId])

  const waiting = order?.status === 'pending' && polls < MAX_POLLS
  useEffect(() => {
    if (!waiting) return
    const timer = window.setTimeout(() => {
      api
        .get<{ order: PublicOrder }>(`/orders/${publicId}`)
        .then((res) => setOrder(res.order))
        .catch(() => {})
        .finally(() => setPolls((count) => count + 1))
    }, POLL_MS)
    return () => window.clearTimeout(timer)
  }, [waiting, polls, publicId])

  return (
    <PageShell footer={<Copyright />}>
      <div className="w-full max-w-md">
        <Link to="/" aria-label="Página inicial do Presenzo">
          <img src="/presenzo-logo.svg" alt="Presenzo" className="mx-auto h-8 w-auto" />
        </Link>
        <div className="mt-6 rounded-3xl border border-brand-primary-soft bg-white p-6 shadow-lg shadow-brand-primary-soft sm:p-8">
          {notFound ? (
            <StatusCard icon={<XCircle size={28} />} tone="problem" title="Pedido não encontrado">
              <p>Confira se o link está completo. Se precisar, fala com a gente pelo WhatsApp.</p>
            </StatusCard>
          ) : !order ? (
            <p className="text-center text-[#6b5d80]">Carregando...</p>
          ) : (
            <>
              <StatusMessage order={order} mpStatus={mpStatus} />
              <OrderSummary order={order} />
              {order.status === 'pending' && polls >= MAX_POLLS && (
                <p className="mt-4 text-center text-xs text-[#8b7a9c]">
                  Já pagou?{' '}
                  <button type="button" onClick={() => setPolls(0)} className="cursor-pointer font-semibold text-brand-primary hover:underline">
                    Atualizar
                  </button>
                </p>
              )}
            </>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-[#8b7a9c]">
          Dúvidas sobre o pedido?{' '}
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="font-semibold text-brand-primary hover:underline">
            Fale com a gente
          </a>
        </p>
      </div>
    </PageShell>
  )
}
