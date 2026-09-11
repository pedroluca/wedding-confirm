import { CheckCircle2, Gift, Heart, MessageCircle, Palette, PartyPopper } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DevCredit } from '../components/DevCredit'
import { PageShell } from '../components/PageShell'

// TODO: trocar pelo número real (com DDI+DDD, só dígitos) antes de publicar.
const WHATSAPP_URL = 'https://wa.me/5577936181281'

const STEPS = [
  { title: 'Fale com a gente', description: 'Conta sobre o seu evento pelo WhatsApp e a gente configura tudo pra você.' },
  { title: 'Personalize', description: 'Cores, nomes, data, local e logo — do jeito que combina com a sua celebração.' },
  { title: 'Compartilhe o link', description: 'Envie pros convidados confirmarem presença e verem a lista de presentes.' },
]

const FEATURES = [
  {
    icon: Palette,
    title: 'Convite com a sua cara',
    description: 'Cores, nomes, data e logo do seu jeito — sem depender de ninguém pra ajustar.',
  },
  {
    icon: CheckCircle2,
    title: 'Confirmação em um clique',
    description: 'Convidados confirmam presença (deles e da família) direto pelo link, sem complicação.',
  },
  {
    icon: Gift,
    title: 'Lista de presentes com Pix',
    description: 'Convidados escolhem o presente e contribuem direto, sem duplicar item por engano.',
  },
  {
    icon: PartyPopper,
    title: 'Casamentos e aniversários',
    description: 'Um painel simples pra organizar convidados e presentes de qualquer celebração.',
  },
]

export default function Home() {
  return (
    <PageShell footer={<DevCredit strong />}>
      <div className="w-full max-w-4xl">
        {/* Hero */}
        <section className="text-center">
          <img src="/presenzo-logo.svg" alt="Presenzo" className="mx-auto h-9 w-auto sm:h-11" />

          <h1 className="mt-8 text-balance font-display text-4xl leading-[1.1] font-semibold bg-linear-to-r from-presenzo-gold to-presenzo-rose bg-clip-text text-transparent sm:text-5xl md:text-6xl">
            Convide. Confirme. Celebre.
          </h1>
          <p className="mx-auto mt-5 max-w-md text-balance text-base text-[#6b5d80] sm:text-lg">
            A plataforma para criar a página de confirmação de presença e lista de presentes do
            seu casamento ou aniversário — com a sua cara, pronta em minutos.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-primary px-6 py-3.5 font-semibold text-white transition hover:bg-brand-primary-hover"
            >
              <MessageCircle size={18} />
              Quero ser cliente
            </a>
            <Link
              to="/admin/login"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-primary-soft px-6 py-3.5 font-semibold text-[#3f3450] transition hover:bg-brand-primary-soft"
            >
              Já é cliente? Entrar
            </Link>
          </div>
        </section>

        {/* Como funciona */}
        <section className="mt-16 rounded-3xl bg-brand-primary-soft/40 p-6 sm:mt-20 sm:p-10">
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

        {/* Features */}
        <section className="mt-16 sm:mt-20">
          <p className="text-center font-display text-sm font-semibold tracking-widest text-brand-primary uppercase">
            O que você tem
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-brand-primary-soft bg-white p-5">
                <feature.icon className="text-brand-primary" size={22} />
                <p className="mt-3 font-display font-semibold text-[#3f3450]">{feature.title}</p>
                <p className="mt-1 text-sm text-[#6b5d80]">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tipos de evento */}
        <section className="mt-16 sm:mt-20">
          <p className="text-center font-display text-sm font-semibold tracking-widest text-brand-primary uppercase">
            Pra qualquer celebração
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-linear-to-br from-presenzo-gold/15 to-presenzo-rose/15 p-6">
              <Heart className="text-brand-primary" size={22} />
              <p className="mt-3 font-display font-semibold text-[#3f3450]">Casamentos</p>
              <p className="mt-1 text-sm text-[#6b5d80]">
                Cerimônia, festa e lista de presentes — tudo em um convite só.
              </p>
            </div>
            <div className="rounded-2xl bg-linear-to-br from-presenzo-gold/15 to-presenzo-rose/15 p-6">
              <PartyPopper className="text-brand-primary" size={22} />
              <p className="mt-3 font-display font-semibold text-[#3f3450]">Aniversários</p>
              <p className="mt-1 text-sm text-[#6b5d80]">
                Confirmação simples e lista de presentes pra qualquer festa.
              </p>
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="mt-16 rounded-3xl bg-linear-to-br from-presenzo-gold/15 to-presenzo-rose/15 p-8 text-center sm:mt-20 sm:p-12">
          <p className="font-display text-2xl font-semibold text-[#3f3450] sm:text-3xl">
            Pronto pra organizar seu evento?
          </p>
          <p className="mx-auto mt-3 max-w-sm text-[#6b5d80]">
            Fala com a gente pelo WhatsApp e a gente configura tudo pra você.
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-brand-primary px-8 py-3.5 font-semibold text-white transition hover:bg-brand-primary-hover"
          >
            <MessageCircle size={18} />
            Falar no WhatsApp
          </a>
        </section>
      </div>
    </PageShell>
  )
}
