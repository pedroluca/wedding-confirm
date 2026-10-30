import type { MouseEvent, ReactNode } from 'react'
import {
  ArrowRight,
  CalendarPlus,
  Check,
  Crown,
  Gift,
  GraduationCap,
  Heart,
  Image as ImageIcon,
  MailOpen,
  MapPin,
  MessageCircle,
  Music,
  Palette,
  PartyPopper,
  Quote,
  Shirt,
  Smartphone,
  Sparkles,
  Timer,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { WHATSAPP_URL } from '../lib/contact'
import { demoInvitePath, useDemos } from '../lib/demo'
import type { DemoEvent, EventType } from '../types'
import { Copyright } from '../components/DevCredit'
import { PageShell } from '../components/PageShell'
import { QuoteSimulator } from '../components/QuoteSimulator'
import { DemoShowcase } from '../components/home/DemoShowcase'
import { HomeFaq } from '../components/home/HomeFaq'
import { PanelShowcase } from '../components/home/PanelShowcase'

const HIGHLIGHTS = ['Sem app pros convidados', 'Sem taxa nos presentes', 'Pronto pro WhatsApp']

const INVITE_FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: MailOpen,
    title: 'Abertura animada',
    description: 'Envelope com selo de cera, portas, abertura vertical ou direto no convite. Você escolhe.',
  },
  { icon: ImageIcon, title: 'Foto de capa', description: 'Uma foto de vocês logo no topo do convite.' },
  {
    icon: Music,
    title: 'Música de fundo',
    description: 'A música que você escolher começa a tocar quando o convidado abre o convite.',
  },
  { icon: Quote, title: 'Mensagem de vocês', description: 'Um texto com as suas palavras, do jeito que você quiser.' },
  { icon: Timer, title: 'Contagem regressiva', description: 'Dias, horas e minutos até o grande dia.' },
  {
    icon: CalendarPlus,
    title: 'Salvar na agenda',
    description: 'Um toque e a data vai pro Google Agenda ou pro calendário do celular.',
  },
  {
    icon: MapPin,
    title: 'Local com rota',
    description: 'Cerimônia e festa, cada uma com o botão "Como chegar" no mapa.',
  },
  { icon: Shirt, title: 'Traje', description: 'O dress code no convite, sem precisar repetir pra cada um.' },
  {
    icon: Crown,
    title: 'Padrinhos em destaque',
    description: 'Padrinhos, madrinhas e pais recebem uma mensagem especial no convite deles.',
  },
  { icon: Palette, title: 'Cores e fonte', description: 'A cor do convite e a fonte dos nomes combinando com a festa.' },
  {
    icon: Users,
    title: 'Família num link só',
    description: 'Um link por família: cada um marca quem vai, tudo de uma vez.',
  },
  {
    icon: Smartphone,
    title: 'Feito pro celular',
    description: 'Abre direto do WhatsApp, sem baixar nada e sem cadastro.',
  },
]

const GIFT_POINTS = [
  'Sugestões prontas pra cada tipo de evento: é só ajustar.',
  'O convidado escolhe e manda o Pix direto pra você, ou compra o presente por conta própria.',
  'A lista acompanha o que já foi escolhido, então ninguém repete presente sem querer.',
  'Junto com o presente, o convidado deixa um recado.',
  'No painel, você vê quem deu o quê e lê todos os recados.',
]

const STEPS = [
  { title: 'Fale com a gente', description: 'Conta pelo WhatsApp como é o seu evento e a gente ativa tudo pra você.' },
  {
    title: 'Personalize',
    description: 'Abertura, cores, foto, música, textos, convidados e presentes: tudo pelo seu painel.',
  },
  { title: 'Envie e acompanhe', description: 'Mande os links pelo WhatsApp e veja as confirmações chegando.' },
]

const EVENT_KINDS: { type: EventType; icon: LucideIcon; title: string; description: string }[] = [
  {
    type: 'wedding',
    icon: Heart,
    title: 'Casamentos',
    description: 'Cerimônia e recepção, padrinhos em destaque e lista de presentes pra casa nova ou pra lua de mel.',
  },
  {
    type: 'birthday',
    icon: PartyPopper,
    title: 'Aniversários',
    description: 'Do infantil aos 80 anos: confirmação simples e lista pra quem não sabe o que dar.',
  },
  {
    type: 'graduation',
    icon: GraduationCap,
    title: 'Formaturas',
    description: 'Colação e baile no mesmo convite, com destaque pros padrinhos e pra família.',
  },
  {
    type: 'other',
    icon: Sparkles,
    title: 'Outras celebrações',
    description: 'Chá de bebê, bodas, batizado, noivado: qualquer festa que mereça um convite à altura.',
  },
]

const primaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-full bg-brand-primary px-6 py-3.5 font-semibold text-white transition hover:bg-brand-primary-hover'
const secondaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-full border border-brand-primary-soft bg-white/70 px-6 py-3.5 font-semibold text-[#3f3450] transition hover:bg-brand-primary-soft'

function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="text-center">
      <p className="font-display text-sm font-semibold tracking-widest text-brand-primary uppercase">{eyebrow}</p>
      <h2 className="mt-3 font-display text-2xl font-semibold text-balance text-[#3f3450] sm:text-3xl">{title}</h2>
      {children && <p className="mx-auto mt-3 max-w-xl text-balance text-[#6b5d80]">{children}</p>}
    </div>
  )
}

function scrollToExamples(event: MouseEvent<HTMLAnchorElement>) {
  const target = document.getElementById('exemplos')
  if (!target) return
  event.preventDefault()
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
}

export default function Home() {
  const demos = useDemos()
  // Enquanto carrega, o botão do exemplo já aparece; some só se não houver nenhum.
  const showDemoButton = demos === null || demos.length > 0
  const demoByType = (type: EventType): DemoEvent | undefined => demos?.find((demo) => demo.event_type === type)
  const giftDemo = demoByType('wedding') ?? demos?.[0]

  return (
    <PageShell footer={<Copyright />}>
      <div className="w-full max-w-5xl">
        {/* Hero */}
        <section className="text-center">
          <img src="/presenzo-logo.svg" alt="Presenzo" className="mx-auto h-9 w-auto sm:h-11" />

          <h1 className="mt-8 text-balance font-display text-4xl leading-[1.1] font-semibold bg-linear-to-r from-presenzo-gold to-presenzo-rose bg-clip-text text-transparent sm:text-5xl md:text-6xl">
            Convide. Confirme. Celebre.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-base text-[#6b5d80] sm:text-lg">
            Convites online com confirmação de presença e lista de presentes para casamentos, aniversários,
            formaturas e qualquer celebração. Do seu jeito, prontos pra mandar no WhatsApp.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {showDemoButton && (
              <a href="#exemplos" onClick={scrollToExamples} className={primaryButtonClass}>
                Ver um convite de exemplo
                <ArrowRight size={18} />
              </a>
            )}
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className={showDemoButton ? secondaryButtonClass : primaryButtonClass}
            >
              <MessageCircle size={18} />
              Quero o meu
            </a>
          </div>
          <Link
            to="/admin/login"
            className="mt-5 inline-block text-sm font-medium text-[#6b5d80] underline decoration-brand-primary/40 underline-offset-4 transition hover:text-brand-primary"
          >
            Já é cliente? Entrar
          </Link>

          <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-[#6b5d80]">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="inline-flex items-center gap-1.5">
                <Check size={16} className="text-brand-primary" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Convites de exemplo */}
        {demos && demos.length > 0 && (
          <section id="exemplos" className="mt-16 scroll-mt-8 sm:mt-24">
            <SectionHeading eyebrow="Veja na prática" title="Abra um convite de verdade">
              É exatamente o que seus convidados recebem: abertura, música, confirmação e lista de presentes. Pode
              clicar em tudo, nada do que você fizer no exemplo é salvo.
            </SectionHeading>
            <DemoShowcase demos={demos} />
          </section>
        )}

        {/* O convite */}
        <section className="mt-16 sm:mt-24">
          <SectionHeading eyebrow="O convite" title="Tudo o que seus convidados recebem">
            Um convite com a cara do seu evento, que abre no celular e já leva pra confirmação.
          </SectionHeading>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {INVITE_FEATURES.map((feature) => (
              <div key={feature.title} className="flex gap-4 rounded-2xl border border-brand-primary-soft bg-white p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary-soft text-brand-primary">
                  <feature.icon size={20} />
                </span>
                <div>
                  <p className="font-display font-semibold text-[#3f3450]">{feature.title}</p>
                  <p className="mt-1 text-sm text-[#6b5d80]">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Lista de presentes */}
        <section className="mt-16 rounded-3xl bg-linear-to-br from-presenzo-gold/15 to-presenzo-rose/15 p-6 sm:mt-24 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div className="text-center lg:text-left">
              <p className="font-display text-sm font-semibold tracking-widest text-brand-primary uppercase">
                Lista de presentes (opcional)
              </p>
              <h2 className="mt-3 font-display text-2xl font-semibold text-balance text-[#3f3450] sm:text-3xl">
                Presentes sem complicação, e sem taxa
              </h2>
              <p className="mt-3 text-[#6b5d80]">
                O Pix vai direto pra sua chave. O Presenzo não fica com nenhuma parte dos presentes: o valor chega
                inteiro pra você.
              </p>
              <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#3f3450] shadow-sm">
                <Gift size={16} className="text-brand-primary" />
                0% de taxa sobre os presentes
              </span>
              {giftDemo && (
                <Link
                  to={`${demoInvitePath(giftDemo)}/presentes`}
                  className="mt-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-brand-primary hover:underline lg:justify-start"
                >
                  Ver a lista de um exemplo
                  <ArrowRight size={16} />
                </Link>
              )}
            </div>
            <ul className="space-y-3">
              {GIFT_POINTS.map((point) => (
                <li key={point} className="flex gap-3 rounded-2xl bg-white/80 p-4 text-sm text-[#3f3450]">
                  <Check size={18} className="mt-0.5 shrink-0 text-brand-primary" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Painel */}
        <section className="mt-16 sm:mt-24">
          <SectionHeading eyebrow="Seu painel" title="Organize tudo num lugar só">
            Convidados, confirmações, mensagens e presentes, num painel simples que funciona no celular e no
            computador. Dá pra dividir com quem organiza com você.
          </SectionHeading>
          <PanelShowcase />
        </section>

        {/* Como funciona */}
        <section className="mt-16 rounded-3xl bg-brand-primary-soft/40 p-6 sm:mt-24 sm:p-10">
          <p className="text-center font-display text-sm font-semibold tracking-widest text-brand-primary uppercase">
            Como funciona
          </p>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="text-center sm:text-left">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary font-display text-sm font-bold text-white">
                  {i + 1}
                </span>
                <p className="mt-3 font-display font-semibold text-[#3f3450]">{step.title}</p>
                <p className="mt-1 text-sm text-[#6b5d80]">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tipos de evento */}
        <section className="mt-16 sm:mt-24">
          <SectionHeading eyebrow="Pra qualquer celebração" title="Cada evento com os textos certos" />
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {EVENT_KINDS.map((kind) => {
              const demo = demoByType(kind.type)
              return (
                <div
                  key={kind.type}
                  className="flex flex-col rounded-2xl bg-linear-to-br from-presenzo-gold/15 to-presenzo-rose/15 p-6"
                >
                  <kind.icon className="text-brand-primary" size={22} />
                  <p className="mt-3 font-display font-semibold text-[#3f3450]">{kind.title}</p>
                  <p className="mt-1 flex-1 text-sm text-[#6b5d80]">{kind.description}</p>
                  {demo && (
                    <Link
                      to={demoInvitePath(demo)}
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-primary hover:underline"
                    >
                      Ver exemplo
                      <ArrowRight size={16} />
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <QuoteSimulator />

        {/* Perguntas frequentes */}
        <section className="mt-16 sm:mt-24">
          <SectionHeading eyebrow="Dúvidas" title="Perguntas frequentes" />
          <HomeFaq />
        </section>

        {/* CTA final */}
        <section className="mt-16 rounded-3xl bg-linear-to-br from-presenzo-gold/15 to-presenzo-rose/15 p-8 text-center sm:mt-24 sm:p-12">
          <p className="font-display text-2xl font-semibold text-[#3f3450] sm:text-3xl">
            Pronto pra organizar seu evento?
          </p>
          <p className="mx-auto mt-3 max-w-sm text-[#6b5d80]">
            Fala com a gente pelo WhatsApp e a gente configura tudo pra você.
          </p>
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className={`mt-6 ${primaryButtonClass}`}>
            <MessageCircle size={18} />
            Falar no WhatsApp
          </a>
        </section>
      </div>
    </PageShell>
  )
}
