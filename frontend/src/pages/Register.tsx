import { useState, type FormEvent, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'

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
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)
  const [photo, setPhoto] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)

  function handlePhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setPhoto(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

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
        body: JSON.stringify({ email, username, password, confirmPassword, avatarUrl: photo }),
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
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>{t('signup.title')}</h1>

        {errors.general && (
          <p role="alert" style={{ color: 'var(--red)', marginBottom: 16 }}>
            {errors.general}
          </p>
        )}

        <form id="register-form" onSubmit={handleSubmit}>
          <div className="signup-avatar">
            <label htmlFor="signup-photo" className="signup-avatar-btn">
              <div className="signup-avatar-preview">
                {photo ? <img src={photo} alt="" /> : <span>📷</span>}
              </div>
              <span className="signup-avatar-label">{t('signup.photo')}</span>
            </label>
            <input
              type="file"
              id="signup-photo"
              accept="image/*"
              hidden
              onChange={handlePhoto}
            />
          </div>

          <div className="field">
            <label>{t('login.email')}</label>
            <input
              type="email"
              placeholder="tu@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {errors.email && <span style={{ color: 'var(--red)', fontSize: 13 }}>{errors.email}</span>}
          </div>

          <div className="field">
            <label>{t('signup.nickname')}</label>
            <input
              type="text"
              placeholder="utilizador_demo"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            {errors.username && <span style={{ color: 'var(--red)', fontSize: 13 }}>{errors.username}</span>}
          </div>

          <div className="field">
            <label>{t('login.password')}</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {errors.password && <span style={{ color: 'var(--red)', fontSize: 13 }}>{errors.password}</span>}
          </div>

          <div className="field">
            <label>{t('login.password')} (confirmação)</label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {errors.confirmPassword && (
              <span style={{ color: 'var(--red)', fontSize: 13 }}>{errors.confirmPassword}</span>
            )}
          </div>

          <label className="signup-terms">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
            />
            <span>
              <span>{t('signup.terms.pre')}</span>{' '}
              <Link to="/terms">{t('footer.terms')}</Link>{' '}
              <span>{t('signup.terms.and')}</span>{' '}
              <Link to="/privacy">{t('footer.privacy')}</Link>
            </span>
          </label>

          <button
            id="register-submit"
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading || !termsAccepted}
          >
            {loading ? '...' : t('signup.create')}
          </button>
        </form>

        <p className="switch">
          <span>{t('signup.hasaccount')}</span>{' '}
          <Link to="/login">{t('login.enter')}</Link>
        </p>
      </div>
    </div>
  )
}

export default Register
