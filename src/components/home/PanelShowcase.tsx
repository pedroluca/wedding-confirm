import { useState } from 'react'

// Prints do painel de um evento de exemplo, em public/home/{id}-desktop.webp
// (1280x800 a 1,5x) e {id}-mobile.webp (390x760 a 2x).
const SCREENS = [
  {
    id: 'confirmacoes',
    label: 'Confirmações',
    caption: 'Quem confirmou, quem falta responder e quem não vai, pessoa por pessoa. E quem já abriu a lista de presentes.',
  },
  {
    id: 'convidados',
    label: 'Convidados',
    caption: 'Cadastre cada família uma vez: cada convite tem o próprio link, e padrinhos, madrinhas e pais ganham destaque.',
  },
  {
    id: 'mensagem',
    label: 'Mensagem pronta',
    caption: 'Escreva a mensagem uma vez. O painel copia pra cada convidado, com o nome e o link dele, pronta pra colar no WhatsApp.',
  },
  {
    id: 'presentes',
    label: 'Presentes',
    caption: 'Veja quem escolheu cada presente e leia o recado que veio junto.',
  },
  {
    id: 'personalizacao',
    label: 'Personalização',
    caption: 'Escolha a abertura, a cor, a fonte, a foto, a música e os textos do convite. E mude quando quiser.',
  },
] as const

type ScreenId = (typeof SCREENS)[number]['id']

/** "Seu painel" na home: abas com prints do painel de verdade (celular ou computador, conforme a tela). */
export function PanelShowcase() {
  const [active, setActive] = useState<ScreenId>('confirmacoes')
  const screen = SCREENS.find((item) => item.id === active) ?? SCREENS[0]

  return (
    <div className="mt-8">
      <div role="tablist" aria-label="Telas do painel" className="flex flex-wrap justify-center gap-2">
        {SCREENS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === active}
            aria-controls="panel-screen"
            onClick={() => setActive(item.id)}
            className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition ${
              item.id === active
                ? 'bg-brand-primary text-white'
                : 'border border-brand-primary-soft bg-white text-[#6b5d80] hover:bg-brand-primary-soft/50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="mx-auto mt-5 max-w-xl text-center text-sm text-balance text-[#6b5d80] sm:text-base">{screen.caption}</p>

      <div
        id="panel-screen"
        role="tabpanel"
        className="mx-auto mt-6 max-w-72 overflow-hidden rounded-4xl border-[6px] border-[#2a2233] bg-white shadow-xl sm:max-w-none sm:rounded-2xl sm:border sm:border-brand-primary-soft"
      >
        <div aria-hidden className="hidden items-center gap-3 border-b border-brand-primary-soft bg-[#faf7fa] px-4 py-2.5 sm:flex">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#e8dce6]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#e8dce6]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#e8dce6]" />
          </span>
          <span className="flex-1 rounded-full bg-white px-3 py-1 text-center text-xs text-[#8b7a9c]">
            presenzo.com.br/admin
          </span>
        </div>
        <picture>
          <source
            media="(max-width: 639px)"
            srcSet={`/home/${screen.id}-mobile.webp`}
            width={780}
            height={1520}
          />
          <img
            src={`/home/${screen.id}-desktop.webp`}
            width={1920}
            height={1200}
            alt={`Painel do Presenzo: ${screen.label.toLowerCase()}`}
            loading="lazy"
            className="block h-auto w-full"
          />
        </picture>
      </div>
    </div>
  )
}
