import React, { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'
import { useAuth } from '../hooks/useAuth'

const API = import.meta.env.VITE_API_URL ?? '/api'

function Login() {
  const { t } = useLanguage()
  const { user, loading: checkingSession } = useAuth()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (checkingSession) {
    return null
  }

  // Quem já tem sessão não volta a ver o login: vai direto para o perfil.
  if (user) {
    return <Navigate to="/profile" replace />
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
      window.location.href = '/profile'
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
            <label>{t('login.identifier')}</label>
            <input
              id="login-identifier"
              type="text"
              placeholder={t('login.placeholder')}
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

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          <span style={{ padding: '0 10px', fontSize: 12, color: 'var(--chalk-dim)', textTransform: 'uppercase' }}>{t('login.or')}</span>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        </div>
        <a
          href={`${API}/auth/42`}
          className="btn btn-block"
          style={{
            background: '#00BABC',
            color: '#fff',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}
        >
          <img src="https://upload.wikimedia.org/wikipedia/commons/8/8d/42_Logo.svg" alt="42" style={{ height: '18px', filter: 'brightness(0) invert(1)' }} />
          {t('login.with42')}
        </a>

        <p className="switch">
          <span>{t('login.noaccount')}</span>{' '}
          <Link id="link-to-register" to="/register">{t('login.createaccount')}</Link>
        </p>
      </div>
    </div>
  )
}

export default Login
