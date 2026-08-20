import { useState, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'

function Register() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [photo, setPhoto] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)

  function handlePhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setPhoto(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function handleCreate() {
    // AQUI O CODIGO DE CRIAR CONTA (registo no backend + BASE DE DADOS:
    // validação de email/username/password, hash bcrypt, upload do avatar)
    navigate('/profile')
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>{t('signup.title')}</h1>

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
          <label>{t('signup.name')}</label>
          <input type="text" placeholder="O teu nome" />
        </div>
        <div className="field">
          <label>{t('signup.nickname')}</label>
          <input type="text" placeholder="utilizador_demo" />
        </div>
        <div className="field">
          <label>{t('login.email')}</label>
          <input type="email" placeholder="tu@exemplo.com" />
        </div>
        <div className="field">
          <label>{t('login.password')}</label>
          <input type="password" placeholder="••••••••" />
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
          type="button"
          className="btn btn-primary btn-block"
          disabled={!termsAccepted}
          onClick={handleCreate}
        >
          {t('signup.create')}
        </button>
        <p className="switch">
          <span>{t('signup.hasaccount')}</span>{' '}
          <Link to="/login">{t('login.enter')}</Link>
        </p>
      </div>
    </div>
  )
}

export default Register
