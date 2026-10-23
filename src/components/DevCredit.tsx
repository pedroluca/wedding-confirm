const PORTFOLIO_URL = 'https://pedroluca.dev.br'

const subtleLink =
  'underline underline-offset-2 decoration-[#3f3450]/20 transition-colors hover:text-brand-primary hover:decoration-brand-primary/40'

// Rodapé das páginas de evento (convite, confirmação, presentes)
export function DevCredit() {
  return (
    <span className="text-[#3f3450]/40">
      Feito com{' '}
      <a href="/" target="_blank" rel="noreferrer" className={subtleLink}>
        Presenzo
      </a>{' '}
      · por{' '}
      <a href={PORTFOLIO_URL} target="_blank" rel="noreferrer" className={subtleLink}>
        Pedro Luca Prates
      </a>
    </span>
  )
}

// Rodapé da página institucional
export function Copyright() {
  return (
    <p className="space-y-1 text-[#6b5d80]/70">
      <span className="block">© {new Date().getFullYear()} Presenzo. Todos os direitos reservados.</span>
      <span className="block">
        Desenvolvido por{' '}
        <a href={PORTFOLIO_URL} target="_blank" rel="noreferrer" className={subtleLink}>
          Pedro Luca Prates
        </a>
      </span>
    </p>
  )
}
