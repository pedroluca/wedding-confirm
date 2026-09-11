import { useState, type FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../../lib/adminAuthContext'
import { PageShell } from '../../components/PageShell'

export default function AdminLogin() {
  const { session, login } = useAdminAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (session) {
    return <Navigate to={session.admin.event_id === null ? '/super' : '/admin'} replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const data = await login(email, password)
      navigate(data.admin.event_id === null ? '/super' : '/admin', { replace: true })
    } catch {
      setError('Email ou senha inválidos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell>
      <div className="w-full max-w-sm">
        <img src="/presenzo-logo.svg" alt="Presenzo" className="mx-auto h-8 w-auto" />

        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-3xl border border-brand-primary-soft bg-white p-8 shadow-lg shadow-brand-primary-soft"
        >
          <h1 className="text-center text-2xl font-semibold text-[#3f3450]">Painel do seu evento</h1>
          <p className="mt-1 text-center text-sm text-[#8b7a9c]">
            Entre para gerenciar convidados, presentes e as configurações do seu evento.
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
  
          <label className="mt-4 block text-sm font-medium text-[#3f3450]">
            Senha
            <div className="relative mt-1">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-brand-primary-soft px-4 py-2 pr-10 outline-none focus:border-brand-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="cursor-pointer absolute inset-y-0 right-0 flex items-center px-3 text-brand-primary"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
  
          {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
  
          <button
            type="submit"
            disabled={loading}
            className="cursor-pointer mt-6 w-full rounded-full bg-brand-primary px-6 py-3 font-semibold text-white transition hover:bg-brand-primary-hover disabled:opacity-60"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <Link
            to="/admin/forgot-password"
            className="mt-4 block text-center text-sm text-brand-primary underline underline-offset-4"
          >
            Esqueci minha senha
          </Link>
        </form>
      </div>
    </PageShell>
  )
}
