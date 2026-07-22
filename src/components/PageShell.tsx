import type { ReactNode } from 'react'

export function PageShell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-white via-lilac-100/40 to-lilac-100/70">
      <main className="flex flex-1 items-center justify-center px-4 py-12">{children}</main>
      {footer && <div className="pb-6 text-center text-xs">{footer}</div>}
    </div>
  )
}
