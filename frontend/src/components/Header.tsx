import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { LanguageSelector } from './LanguageSelector'

function Header() {
  const { t } = useTranslation()
  const { user } = useAuth()

  return (
    <header className="header">
      <Link to="/" className="logo">LOGO</Link>
      <nav>
        <Link to="/rules">{t('nav.rules')}</Link>
        <a href="/#about-us">{t('nav.aboutUs')}</a>
        {user ? (
          <>
            <Link to="/profile">{t('nav.profile')}</Link>
          </>
        ) : (
          <Link to="/login">{t('nav.login')}</Link>
        )}
        <LanguageSelector />
      </nav>
    </header>
  )
}

export default Header
