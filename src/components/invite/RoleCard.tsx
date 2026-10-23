import { Heart } from 'lucide-react'
import type { GuestRole } from '../../types'

type RoleCopy = { label: [single: string, group: string]; text: [single: string, group: string] }

// Singular para convite de uma pessoa só, plural quando o link tem relacionados.
const ROLE_COPY: Record<Exclude<GuestRole, 'convidado'>, RoleCopy> = {
  padrinho: {
    label: ['Padrinho', 'Padrinhos'],
    text: [
      'Você foi escolhido para ser nosso padrinho. Obrigado por estar ao nosso lado em um dia tão especial.',
      'Vocês foram escolhidos para serem nossos padrinhos. Obrigado por estarem ao nosso lado em um dia tão especial.',
    ],
  },
  madrinha: {
    label: ['Madrinha', 'Padrinhos'],
    text: [
      'Você foi escolhida para ser nossa madrinha. Obrigado por estar ao nosso lado em um dia tão especial.',
      'Vocês foram escolhidos para serem nossos padrinhos. Obrigado por estarem ao nosso lado em um dia tão especial.',
    ],
  },
  pais: {
    label: ['Família', 'Família'],
    text: [
      'Obrigado por todo o amor que nos trouxe até aqui. Este dia também é seu.',
      'Obrigado por todo o amor que nos trouxe até aqui. Este dia também é de vocês.',
    ],
  },
  especial: {
    label: ['Presença especial', 'Presença especial'],
    text: [
      'Você é muito especial para nós, e não poderíamos celebrar este dia sem a sua presença.',
      'Vocês são muito especiais para nós, e não poderíamos celebrar este dia sem a presença de vocês.',
    ],
  },
}

/** Destaque para padrinhos, madrinhas, pais e convidados especiais. */
export function RoleCard({ role, isGroup }: { role: GuestRole; isGroup: boolean }) {
  if (role === 'convidado') return null

  const copy = ROLE_COPY[role]
  const index = isGroup ? 1 : 0

  return (
    <div className="relative rounded-3xl border border-brand-primary/30 bg-white/70 px-6 pt-9 pb-7 text-center shadow-sm shadow-brand-primary-soft">
      <span className="absolute -top-5 left-1/2 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full bg-brand-primary text-white shadow-md shadow-brand-primary/30">
        <Heart size={18} className="fill-current" />
      </span>
      <p className="text-xs font-semibold tracking-[0.3em] text-brand-primary uppercase">{copy.label[index]}</p>
      <p className="mt-3 font-serif text-xl leading-relaxed text-[#3f3450] italic">{copy.text[index]}</p>
    </div>
  )
}
