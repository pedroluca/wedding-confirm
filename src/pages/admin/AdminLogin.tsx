import { useState, type FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
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
    return <Navigate to="/admin" replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(email, password)
      navigate('/admin', { replace: true })
    } catch {
      setError('Email ou senha inválidos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl border border-lilac-200 bg-white p-8 shadow-lg shadow-lilac-100"
      >
        <h1 className="text-center text-2xl font-semibold text-[#3f3450]">Admin</h1>
        <p className="mt-1 text-center text-sm text-[#8b7a9c]">Acesse para gerenciar os convidados.</p>

        <label className="mt-6 block text-sm font-medium text-[#3f3450]">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-lilac-200 px-4 py-2 outline-none focus:border-lilac-500"
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
              className="w-full rounded-xl border border-lilac-200 px-4 py-2 pr-10 outline-none focus:border-lilac-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              className="cursor-pointer absolute inset-y-0 right-0 flex items-center px-3 text-lilac-500"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="cursor-pointer mt-6 w-full rounded-full bg-lilac-500 px-6 py-3 font-semibold text-white transition hover:bg-[#c298ff] disabled:opacity-60"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </PageShell>
  )
}
