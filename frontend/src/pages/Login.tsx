import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const API = import.meta.env.VITE_API_URL ?? '/api'

function Login() {
  const navigate = useNavigate()
  const { t } = useTranslation()
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
    <main className="page center">
      <h1>{t('auth.loginTitle')}</h1>

      {error && (
        <p id="login-error" role="alert" style={{ color: 'red', margin: '0 auto', maxWidth: 320 }}>
          {error}
        </p>
      )}

      <form id="login-form" className="form" onSubmit={handleSubmit}>
        <label>
          {t('auth.loginOrUsername')}
          <input
            id="login-identifier"
            type="text"
            placeholder={t('auth.placeholderLogin')}
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
          />
        </label>
        <label>
          {t('auth.password')}
          <input
            id="login-password"
            type="password"
            placeholder={t('auth.placeholderPassword')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button id="login-submit" type="submit" disabled={loading}>
          {loading ? t('auth.loggingIn') : t('auth.loginSubmit')}
        </button>
      </form>

      <p>
        {t('auth.noAccount')}{' '}
        <Link id="link-to-register" to="/register">{t('auth.linkToRegister')}</Link>
      </p>
    </main>
  )
}

export default Login
