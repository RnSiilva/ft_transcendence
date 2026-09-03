import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'

const API = import.meta.env.VITE_API_URL ?? '/api'

function Login() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (!login || !password) {
      setError(t('errors.fillAllFields'))
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ login, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 429) {
          setError(t('errors.tooManyAttempts'))
        } else {
          setError(t('errors.invalidCredentials'))
        }
        return
      }

      void data
      navigate('/profile')
    } catch {
      setError(t('errors.networkError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>{t('login.title')}</h1>

        {error && (
          <p id="login-error" role="alert" style={{ color: 'var(--red)', marginBottom: 16 }}>
            {error}
          </p>
        )}

        <form id="login-form" onSubmit={handleSubmit}>
          <div className="field">
            <label>{t('login.email')}</label>
            <input
              id="login-identifier"
              type="text"
              placeholder="tu@exemplo.com"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>{t('login.password')}</label>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? '...' : t('login.enter')}
          </button>
        </form>

        <p className="switch">
          <span>{t('login.noaccount')}</span>{' '}
          <Link id="link-to-register" to="/register">{t('login.createaccount')}</Link>
        </p>
      </div>
    </div>
  )
}

export default Login
