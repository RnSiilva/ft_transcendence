import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'
import { useAuth } from '../hooks/useAuth'
import HeroLogo from './HeroLogo'

// Hand-drawn wavy stroke (the same style as the hover underline).
const WAVY_D =
  'M2,6 C15,1 20,10 30,6 C40,2 45,9 55,5 C65,1 70,9 80,5 C88,2 92,7 98,5'

// Drawn Login/Profile button (Uiverse type--C recolored: white outline,
// bold orange scribble on hover; icon instead of text).
function DrawButton({
  to,
  label,
  children,
}: {
  to: string
  label: string
  children: React.ReactNode
}) {
  return (
    <Link to={to} className="ldb" aria-label={label} title={label}>
      <span className="ldb__btn">
        <span className="ldb__line" />
        <span className="ldb__line" />
        <span className="ldb__text">{children}</span>
      </span>
      <NavHighlight />
    </Link>
  )
}

// The project's little mascot (the same silhouette as the team/About us cards).
const PERSON_D =
  'M 50.4 51 C 40.5 49.1 40 46 40 44 v -1.2 a 18.9 18.9 0 0 0 5.7 -8.8 h 0.1 c 3 0 3.8 -6.3 3.8 -7.3 s 0.1 -4.7 -3 -4.7 C 53 4 30 0 22.3 6 c -5.4 0 -5.9 8 -3.9 16 c -3.1 0 -3 3.8 -3 4.7 s 0.7 7.3 3.8 7.3 c 1 3.6 2.3 6.9 4.7 9 v 1.2 c 0 2 0.5 5 -9.5 6.8 S 2 62 2 62 h 60 a 14.6 14.6 0 0 0 -11.6 -11 z'

function PersonIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">
      <path d={PERSON_D} />
    </svg>
  )
}

// Marker stroke that draws itself over the link on hover (Uiverse, recolored
// to the project's red — the color of the old underline).
const HIGHLIGHT_D =
  'M180.02826,169.45123c0,0 12.65228,-25.55115 24.2441,-25.66863c6.39271,-0.06479 -5.89143,46.12943 4.90937,50.63857c10.22345,4.2681 24.14292,-52.38336 37.86455,-59.80493c3.31715,-1.79413 -5.35094,45.88889 -0.78872,58.34589c5.19371,14.18125 33.36934,-58.38221 36.43049,-56.91633c4.67078,2.23667 -0.06338,44.42744 5.22574,47.53647c6.04041,3.55065 19.87185,-20.77286 19.87185,-20.77286'

function NavHighlight() {
  return (
    <svg
      className="nav-highlight"
      viewBox="0 0 144.75738 77.18431"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <g transform="translate(-171.52826,-126.11624)">
        <path d={HIGHLIGHT_D} fill="none" strokeWidth="17" strokeLinecap="round" strokeMiterlimit="10" />
      </g>
    </svg>
  )
}

function Header() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="site">
      <div className="header-inner">
        <Link to="/" className="logo logo-sketch" aria-label="SketchGuess — página inicial">
          <span className="sr-only">SketchGuess</span>
          <span className="logo-sketch-inner">
            <HeroLogo />
            <span className="hero-logo-reflection" aria-hidden="true">
              <span className="reflect-flip">
                <HeroLogo skewed />
              </span>
              <span className="reflection-fade" />
            </span>
          </span>
        </Link>
        <nav className="primary">
          <Link to="/" className="nav-fx">
            <span className="nav-fx-text">{t('nav.home')}</span>
            <span className="nav-fx-front" aria-hidden="true">{t('nav.home')}</span>
            <NavHighlight />
          </Link>
          <Link to="/rules" className="nav-fx">
            <span className="nav-fx-text">{t('nav.rules')}</span>
            <span className="nav-fx-front" aria-hidden="true">{t('nav.rules')}</span>
            <NavHighlight />
          </Link>
          <Link to="/about" className="nav-fx">
            <span className="nav-fx-text">{t('nav.aboutUs')}</span>
            <span className="nav-fx-front" aria-hidden="true">{t('nav.aboutUs')}</span>
            <NavHighlight />
          </Link>
          {user ? (
            <DrawButton to="/profile" label={t('nav.profile')}>
              <PersonIcon />
            </DrawButton>
          ) : (
            <DrawButton to="/login" label={t('nav.login')}>
              <PersonIcon />
            </DrawButton>
          )}
        </nav>

        <button
          type="button"
          className="nav-burger"
          aria-label="Menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg viewBox="0 0 100 56" aria-hidden="true">
            {menuOpen ? (
              <>
                <path className="burger-line" d={WAVY_D} transform="rotate(32 50 28) translate(0 22)" />
                <path className="burger-line" d={WAVY_D} transform="rotate(-32 50 28) translate(0 22)" />
              </>
            ) : (
              <>
                <path className="burger-line" d={WAVY_D} transform="translate(0 2)" />
                <path className="burger-line" d={WAVY_D} transform="translate(0 22)" />
                <path className="burger-line" d={WAVY_D} transform="translate(0 42)" />
              </>
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <nav className="mobile-menu">
          <Link to="/" onClick={closeMenu}>{t('nav.home')}</Link>
          <Link to="/rules" onClick={closeMenu}>{t('nav.rules')}</Link>
          <Link to="/about" onClick={closeMenu}>{t('nav.aboutUs')}</Link>
          {user ? (
            <Link to="/profile" onClick={closeMenu}>{t('nav.profile')}</Link>
          ) : (
            <Link to="/login" onClick={closeMenu}>{t('nav.login')}</Link>
          )}
        </nav>
      )}
    </header>
  )
}

export default Header
