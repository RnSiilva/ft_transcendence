import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function CookieBanner() {
  const { t } = useTranslation()
  const [accepted, setAccepted] = useState(() => {
    try {
      return localStorage.getItem('cookiesAccepted') === 'yes'
    } catch {
      return false
    }
  })

  function accept() {
    try {
      localStorage.setItem('cookiesAccepted', 'yes')
    } catch {
      // Ignore storage errors (e.g. private mode).
    }
    setAccepted(true)
  }

  return (
    <div className={accepted ? 'cookies hide' : 'cookies'}>
      <p>
        <span>{t('cookies.message')}</span>{' '}
        <Link to="/privacy">{t('cookies.learnMore')}</Link>
      </p>
      <button type="button" className="btn btn-primary btn-sm" onClick={accept}>
        {t('cookies.accept')}
      </button>
    </div>
  )
}

export default CookieBanner
