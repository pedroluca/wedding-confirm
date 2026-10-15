import { useEffect, useId, type ReactNode } from 'react'
import { Trash2 } from 'lucide-react'

type ConfirmDialogProps = {
  title: string
  description?: ReactNode
  confirmLabel?: string
  loadingLabel?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Modal de confirmação para ações destrutivas (no lugar do window.confirm).
 * O pai controla a exibição renderizando-o condicionalmente, como no
 * GiftClaimModal. Esc e clique fora cancelam, exceto enquanto a ação roda.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Remover',
  loadingLabel = 'Removendo...',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [loading, onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8 motion-safe:animate-fade-in"
      onClick={() => !loading && onCancel()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl motion-safe:animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <Trash2 size={20} />
        </div>
        <h2 id={titleId} className="mt-4 text-lg font-semibold text-[#3f3450]">
          {title}
        </h2>
        {description && <div className="mt-2 space-y-2 text-sm text-[#6b5d80]">{description}</div>}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            autoFocus
            disabled={loading}
            onClick={onCancel}
            className="cursor-pointer flex-1 rounded-full border border-brand-primary-soft px-4 py-2.5 font-medium text-[#3f3450] hover:bg-brand-primary-soft disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="cursor-pointer flex-1 rounded-full bg-rose-600 px-4 py-2.5 font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
          >
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
