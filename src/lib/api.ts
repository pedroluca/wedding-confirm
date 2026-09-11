const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

export class ApiError extends Error {
  status: number
  code: string | null

  constructor(status: number, message: string, code: string | null = null) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(options.headers)
  // FormData precisa que o browser defina o Content-Type (com boundary) sozinho.
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  const isJson = res.headers.get('content-type')?.includes('application/json') ?? false
  const data = isJson ? await res.json() : null

  if (!res.ok) {
    const message = (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string')
      ? data.error
      : 'Erro inesperado. Tente novamente.'
    const code = (data && typeof data === 'object' && 'code' in data && typeof data.code === 'string')
      ? data.code
      : null
    throw new ApiError(res.status, message, code)
  }

  return data as T
}

export const api = {
  get: <T>(path: string, token?: string | null) => request<T>(path, { method: 'GET' }, token),
  post: <T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(
      path,
      { method: 'POST', body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined },
      token
    ),
  put: <T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }, token),
  del: <T>(path: string, token?: string | null) => request<T>(path, { method: 'DELETE' }, token),
}
