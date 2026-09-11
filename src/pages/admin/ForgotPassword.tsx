import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { PageShell } from '../../components/PageShell'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/admin/forgot-password', { email })
    } catch {
      // A resposta do backend é sempre genérica (evita enumeração de contas),
      // então mesmo um erro de rede aqui não muda o que mostramos ao usuário.
    } finally {
      setLoading(false)
      setSent(true)
    }
  }

  return (
    <PageShell>
      <div className="w-full max-w-sm rounded-3xl border border-brand-primary-soft bg-white p-8 shadow-lg shadow-brand-primary-soft">
        <h1 className="text-center text-2xl font-semibold text-[#3f3450]">Esqueci minha senha</h1>

        {sent ? (
          <p className="mt-4 text-center text-sm text-[#6b5d80]">
            Se este email estiver cadastrado, enviaremos um link para redefinir a senha.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="mt-1 text-center text-sm text-[#8b7a9c]">
              Informe o email da sua conta para receber um link de redefinição.
            </p>
            <label className="mt-6 block text-sm font-medium text-[#3f3450]">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="cursor-pointer mt-6 w-full rounded-full bg-brand-primary px-6 py-3 font-semibold text-white transition hover:bg-brand-primary-hover disabled:opacity-60"
            >
              {loading ? 'Enviando...' : 'Enviar link'}
            </button>
          </form>
        )}

        <Link
          to="/admin/login"
          className="mt-4 block text-center text-sm text-brand-primary underline underline-offset-4"
        >
          Voltar para o login
        </Link>
      </div>
    </PageShell>
  )
}
