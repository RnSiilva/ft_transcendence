import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'

function Login() {
  const { t } = useLanguage()
  const navigate = useNavigate()

  function handleLogin() {
    // AQUI O CODIGO DO LOGIN (autenticação real no backend: bcrypt + JWT em
    // cookie httpOnly, validação de email/password, rate limiting)
    navigate('/profile')
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>{t('login.title')}</h1>
        <div className="field">
          <label>{t('login.email')}</label>
          <input type="email" placeholder="tu@exemplo.com" />
        </div>
        <div className="field">
          <label>{t('login.password')}</label>
          <input type="password" placeholder="••••••••" />
        </div>
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={handleLogin}
        >
          {t('login.enter')}
        </button>
        <p className="switch">
          <span>{t('login.noaccount')}</span>{' '}
          <Link to="/register">{t('login.createaccount')}</Link>
        </p>
      </div>
    </div>
  )
}

export default Login
