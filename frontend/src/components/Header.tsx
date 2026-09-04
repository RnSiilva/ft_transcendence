import type { MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'
import { useAuth } from '../hooks/useAuth'

const UNDERLINE_D =
  'M2,6 C15,1 20,10 30,6 C40,2 45,9 55,5 C65,1 70,9 80,5 C88,2 92,7 98,5'

function NavUnderline() {
  return (
    <svg
      className="nav-underline"
      viewBox="0 0 100 10"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path pathLength={1} d={UNDERLINE_D} />
    </svg>
  )
}

function Header() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const navigate = useNavigate()

  function goToAbout(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    navigate('/')
    setTimeout(() => {
      document
        .getElementById('home-about')
        ?.scrollIntoView({ behavior: 'smooth' })
    }, 50)
  }

  return (
    <header className="site">
      <div className="header-inner">
        <Link to="/" className="logo" aria-label="SketchGuess — página inicial">
          SketchGuess
          <svg width="76" height="12" viewBox="0 0 76 12">
            <path className="stroke" d="M2 8 C 20 2, 40 12, 58 4 S 74 6, 74 6" />
          </svg>
        </Link>
        <nav className="primary">
          <Link to="/" className="nav-fx">
            <span className="nav-fx-text">{t('nav.home')}</span>
            <span className="nav-fx-front" aria-hidden="true">{t('nav.home')}</span>
            <NavUnderline />
          </Link>
          <Link to="/rules" className="nav-fx">
            <span className="nav-fx-text">{t('nav.rules')}</span>
            <span className="nav-fx-front" aria-hidden="true">{t('nav.rules')}</span>
            <NavUnderline />
          </Link>
          <a href="/#home-about" className="nav-fx" onClick={goToAbout}>
            <span className="nav-fx-text">{t('nav.aboutUs')}</span>
            <span className="nav-fx-front" aria-hidden="true">{t('nav.aboutUs')}</span>
            <NavUnderline />
          </a>
          {user ? (
            <Link to="/profile" className="btn btn-primary btn-sm login-underline-host">
              <span>{t('nav.profile')}</span>
              <NavUnderline />
            </Link>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm login-underline-host">
              <span>{t('nav.login')}</span>
              <NavUnderline />
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}

export default Header
