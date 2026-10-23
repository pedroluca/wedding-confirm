import type { ReactNode } from 'react'
import { panelCardClass } from './ui'

// Campos dos formulários dos painéis (configurações do evento, edição no super-admin).
// fieldClass é o campo sem margem, pra quando ele não fica abaixo de um rótulo.
export const fieldClass =
  'w-full rounded-xl border border-brand-primary-soft bg-white px-4 py-2 font-normal outline-none focus:border-brand-primary'
export const inputClass = `mt-1 ${fieldClass}`
export const labelClass = 'block text-sm font-medium text-[#3f3450]'
export const hintClass = 'mt-1 block text-xs font-normal text-[#8b7a9c]'
export const fileInputClass =
  'mt-2 block w-full text-sm text-[#6b5d80] file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-brand-primary-soft file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-primary hover:file:bg-brand-primary/20'
export const boxClass = 'space-y-3 rounded-xl border border-brand-primary-soft bg-brand-primary-soft/25 p-4'
export const boxTitleClass = 'text-xs font-semibold tracking-wide text-brand-primary uppercase'
export const checkboxLabelClass = 'mt-2 flex cursor-pointer items-center gap-2 text-sm text-[#6b5d80]'

/** Bloco de formulário com ícone, título e campos em duas colunas. */
export function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className={`${panelCardClass} p-5 sm:p-6`}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary-soft text-brand-primary">
          {icon}
        </span>
        <div>
          <h2 className="font-semibold text-[#3f3450]">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-[#8b7a9c]">{description}</p>}
        </div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

/** Barra fixa no rodapé do formulário com o resultado do salvar e o botão. */
export function SaveBar({
  saving,
  disabled = false,
  error,
  saved,
}: {
  saving: boolean
  disabled?: boolean
  error: string | null
  saved: boolean
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-end gap-x-4 gap-y-2 border-t border-[#ece6f0] bg-white/90 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
      {error && <p className="mr-auto text-sm text-rose-600">{error}</p>}
      {saved && !error && <p className="mr-auto text-sm text-emerald-600">Alterações salvas!</p>}
      <button
        type="submit"
        disabled={saving || disabled}
        className="cursor-pointer rounded-full bg-brand-primary px-8 py-2.5 font-semibold text-white transition hover:bg-brand-primary-hover disabled:opacity-60"
      >
        {saving ? 'Salvando...' : 'Salvar alterações'}
      </button>
    </div>
  )
}
