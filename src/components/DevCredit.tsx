export function DevCredit({ strong = false }: { strong?: boolean }) {
  return (
    <a
      href="https://pedroluca.dev.br"
      target="_blank"
      rel="noreferrer"
      className={`underline underline-offset-2 ${strong ? 'font-semibold text-brand-primary' : 'text-[#3f3450]/30'}`}
    >
      Desenvolvido por Pedro Luca Prates
    </a>
  )
}
