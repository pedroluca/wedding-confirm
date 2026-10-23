import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { LogOut, Menu, X, type LucideIcon } from 'lucide-react'

export type PanelNavItem = { to: string; label: string; icon: LucideIcon; end?: boolean }

// Super-admin: barra escura com o logo pra fundo escuro, cores fixas do
// Presenzo. Admin do evento: barra clara, na cor de destaque do painel.
const THEMES = {
  super: {
    sidebar: 'bg-[#231b2e] text-white',
    logo: '/presenzo-logo-dark-bg.svg',
    link: 'text-white/65 hover:bg-white/5 hover:text-white',
    active: 'bg-white/10 text-white',
    indicator: 'bg-presenzo-gold',
    muted: 'text-white/50',
    divider: 'border-white/10',
  },
  admin: {
    sidebar: 'border-r border-[#ece6f0] bg-white text-[#3f3450]',
    logo: '/presenzo-logo.svg',
    link: 'text-[#6b5d80] hover:bg-brand-primary-soft/50 hover:text-[#3f3450]',
    active: 'bg-brand-primary-soft text-brand-primary',
    indicator: 'bg-brand-primary',
    muted: 'text-[#8b7a9c]',
    divider: 'border-[#ece6f0]',
  },
}

/**
 * Estrutura dos painéis (super-admin e admin do evento): menu lateral fixo
 * no desktop, gaveta no celular. `context` aparece abaixo do logo (ex: o
 * evento do painel) e `banner` acima do conteúdo (ex: aviso de "entrar como
 * admin").
 */
export function PanelLayout({
  variant,
  nav,
  badge,
  context,
  userName,
  logoutLabel = 'Sair',
  onLogout,
  banner,
  children,
}: {
  variant: keyof typeof THEMES
  nav: PanelNavItem[]
  badge?: string
  context?: ReactNode
  userName: string
  logoutLabel?: string
  onLogout: () => void
  banner?: ReactNode
  children: ReactNode
}) {
  const theme = THEMES[variant]
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  return (
    <div className="min-h-screen bg-[#faf8fb] lg:flex">
      <header className={`sticky top-0 z-30 flex items-center justify-between px-4 py-3 lg:hidden ${theme.sidebar}`}>
        <img src={theme.logo} alt="Presenzo" className="h-6 w-auto" />
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={menuOpen}
          className="cursor-pointer rounded-lg p-2"
        >
          <Menu size={20} />
        </button>
      </header>

      {menuOpen && <div className="fixed inset-0 z-40 bg-[#231b2e]/40 lg:hidden" onClick={closeMenu} aria-hidden />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        } ${theme.sidebar}`}
      >
        <div className="flex items-center justify-between gap-2 px-5 pt-6 pb-5">
          <div className="flex min-w-0 items-center gap-2">
            <img src={theme.logo} alt="Presenzo" className="h-7 w-auto" />
            {badge && (
              <span className="rounded-full bg-presenzo-gold/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-presenzo-gold uppercase">
                {badge}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={closeMenu}
            aria-label="Fechar menu"
            className="cursor-pointer rounded-lg p-1.5 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {context && <div className="px-4">{context}</div>}

        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeMenu}
              className={({ isActive }) =>
                `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? theme.active : theme.link
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span aria-hidden className={`absolute top-2 bottom-2 -left-3 w-1 rounded-r-full ${theme.indicator}`} />
                  )}
                  <item.icon size={18} aria-hidden />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className={`border-t px-5 py-4 ${theme.divider}`}>
          <p className="truncate text-sm font-medium">{userName}</p>
          <button
            type="button"
            onClick={onLogout}
            className={`cursor-pointer mt-2 inline-flex items-center gap-2 text-sm transition hover:underline ${theme.muted}`}
          >
            <LogOut size={15} aria-hidden />
            {logoutLabel}
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {banner}
        <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  )
}
