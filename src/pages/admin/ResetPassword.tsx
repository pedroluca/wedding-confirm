import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { PageShell } from '../../components/PageShell'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('A senha precisa ter ao menos 8 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      await api.post('/admin/reset-password', { token, password })
      setDone(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível redefinir a senha.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <PageShell>
        <p className="max-w-sm text-center text-[#6b5d80]">
          Link inválido. Solicite um novo em "Esqueci minha senha".
        </p>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="w-full max-w-sm rounded-3xl border border-brand-primary-soft bg-white p-8 shadow-lg shadow-brand-primary-soft">
        <h1 className="text-center text-2xl font-semibold text-[#3f3450]">Defina sua senha</h1>

        {done ? (
          <>
            <p className="mt-4 text-center text-sm text-[#6b5d80]">Senha definida com sucesso!</p>
            <button
              type="button"
              onClick={() => navigate('/admin/login', { replace: true })}
              className="cursor-pointer mt-6 w-full rounded-full bg-brand-primary px-6 py-3 font-semibold text-white transition hover:bg-brand-primary-hover"
            >
              Ir para o login
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="mt-6 block text-sm font-medium text-[#3f3450]">
              Nova senha
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
              />
            </label>
            <label className="mt-4 block text-sm font-medium text-[#3f3450]">
              Confirmar senha
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
              />
            </label>

            {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="cursor-pointer mt-6 w-full rounded-full bg-brand-primary px-6 py-3 font-semibold text-white transition hover:bg-brand-primary-hover disabled:opacity-60"
            >
              {loading ? 'Salvando...' : 'Definir senha'}
            </button>
          </form>
        )}

        {!done && (
          <Link
            to="/admin/login"
            className="mt-4 block text-center text-sm text-brand-primary underline underline-offset-4"
          >
            Voltar para o login
          </Link>
        )}
      </div>
    </PageShell>
  )
}
