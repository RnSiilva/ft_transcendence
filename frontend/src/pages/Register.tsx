import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const API = import.meta.env.VITE_API_URL ?? '/api'

interface FieldErrors {
  email?: string
  username?: string
  password?: string
  confirmPassword?: string
  general?: string
}

function Register() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)

  function validate(
    emailVal: string,
    usernameVal: string,
    passwordVal: string,
    confirmVal: string
  ): FieldErrors {
    const errs: FieldErrors = {}
    if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      errs.email = t('errors.validEmail')
    }
    if (!usernameVal || usernameVal.length < 3 || usernameVal.length > 20) {
      errs.username = t('errors.usernameLength')
    }
    if (!passwordVal || passwordVal.length < 8 || !/[a-zA-Z]/.test(passwordVal) || !/[0-9]/.test(passwordVal)) {
      errs.password = t('errors.passwordRequirements')
    }
    if (passwordVal !== confirmVal) {
      errs.confirmPassword = t('errors.passwordsDoNotMatch')
    }
    return errs
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const clientErrors = validate(email, username, password, confirmPassword)
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }

    setErrors({})
    setLoading(true)

    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, username, password, confirmPassword }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrors(data.errors ?? { general: data.error ?? t('errors.registrationFailed') })
        return
      }

      navigate('/profile')
    } catch {
      setErrors({ general: t('errors.networkError') })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page center">
      <h1>{t('auth.registerTitle')}</h1>

      {errors.general && (
        <p role="alert" style={{ color: 'red', margin: '0 auto', maxWidth: 320 }}>
          {errors.general}
        </p>
      )}

      <form id="register-form" className="form" onSubmit={handleSubmit}>
        <label>
          {t('auth.email')}
          <input
            id="register-email"
            type="email"
            placeholder={t('auth.placeholderEmail')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {errors.email && <span style={{ color: 'red', fontSize: 13 }}>{errors.email}</span>}
        </label>

        <label>
          {t('auth.username')}
          <input
            id="register-username"
            type="text"
            placeholder={t('auth.placeholderUsername')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          {errors.username && <span style={{ color: 'red', fontSize: 13 }}>{errors.username}</span>}
        </label>

        <label>
          {t('auth.password')}
          <input
            id="register-password"
            type="password"
            placeholder={t('auth.placeholderPassword')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {errors.password && <span style={{ color: 'red', fontSize: 13 }}>{errors.password}</span>}
        </label>

        <label>
          {t('auth.confirmPassword')}
          <input
            id="register-confirm"
            type="password"
            placeholder={t('auth.placeholderConfirmPassword')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {errors.confirmPassword && (
            <span style={{ color: 'red', fontSize: 13 }}>{errors.confirmPassword}</span>
          )}
        </label>

        <button id="register-submit" type="submit" disabled={loading}>
          {loading ? t('auth.creatingAccount') : t('auth.registerSubmit')}
        </button>
      </form>

      <p>
        {t('auth.haveAccount')}{' '}
        <Link id="link-to-login" to="/login">{t('auth.linkToLogin')}</Link>
      </p>
    </main>
  )
}

export default Register
