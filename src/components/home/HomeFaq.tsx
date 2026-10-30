import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { WHATSAPP_URL } from '../../lib/contact'
import { usePricingSettings } from '../../lib/pricing'

function FaqItem({ question, children }: { question: string; children: ReactNode }) {
  return (
    <details className="group rounded-2xl border border-brand-primary-soft bg-white px-5 py-4 open:pb-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-[#3f3450] [&::-webkit-details-marker]:hidden">
        {question}
        <ChevronDown size={18} className="shrink-0 text-brand-primary transition group-open:rotate-180" />
      </summary>
      <div className="mt-3 text-sm leading-relaxed text-[#6b5d80]">{children}</div>
    </details>
  )
}

/** Perguntas frequentes da home. O prazo do painel vem de "Preços e planos" no super-admin. */
export function HomeFaq() {
  const settings = usePricingSettings()
  const premiumGrace =
    settings.grace_days_premium !== settings.grace_days_standard
      ? ` (${settings.grace_days_premium} no plano Premium)`
      : ''

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-3">
      <FaqItem question="Meus convidados precisam baixar algum aplicativo?">
        Não. O convite abre no navegador do celular, direto do link que você manda pelo WhatsApp. Ninguém precisa criar
        conta nem senha.
      </FaqItem>
      <FaqItem question="Como eu recebo os presentes?">
        O convidado escolhe um item da lista e faz o Pix direto pra sua chave, ou compra o presente por conta própria. O
        dinheiro não passa pelo Presenzo e não cobramos nenhuma taxa sobre os presentes: o valor vai inteiro pra você.
      </FaqItem>
      <FaqItem question="Os convidados veem quem mais foi convidado?">
        Não. Cada link mostra só o convite daquela família. A lista completa, com quem confirmou, fica só no seu painel.
      </FaqItem>
      <FaqItem question="Posso mudar o convite depois de enviar?">
        Pode. Textos, foto, música, local e lista de presentes mudam a qualquer momento, e o link que os convidados já
        receberam continua o mesmo.
      </FaqItem>
      <FaqItem question="Até quando o convite fica no ar?">
        O convite continua no ar mesmo depois da festa. O painel fica disponível até {settings.grace_days_standard} dias
        depois do evento{premiumGrace}, tempo de sobra pra agradecer os presentes e reler os recados.
      </FaqItem>
      <FaqItem question="Serve pra outros tipos de evento?">
        Serve. Casamento, aniversário, formatura e qualquer outra celebração, como chá de bebê, bodas ou batizado, cada
        um com os textos certos pra ocasião.
      </FaqItem>
      <FaqItem question="Quanto custa?">
        Depende do tipo de evento, da quantidade de convidados e do que você quiser incluir.{' '}
        <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="font-semibold text-brand-primary underline">
          Chama a gente no WhatsApp
        </a>{' '}
        e a gente monta o orçamento com você.
      </FaqItem>
    </div>
  )
}
