export function AccessExpired() {
  return (
    <div className="mx-auto max-w-md rounded-3xl border border-brand-primary-soft bg-white p-8 text-center shadow-lg shadow-brand-primary-soft">
      <h1 className="text-xl font-semibold text-[#3f3450]">Acesso expirado</h1>
      <p className="mt-3 text-sm text-[#6b5d80]">
        O acesso ao painel deste evento expirou. As páginas públicas do convite continuam
        funcionando normalmente para os convidados — para renovar o acesso administrativo, entre
        em contato com o suporte.
      </p>
    </div>
  )
}
