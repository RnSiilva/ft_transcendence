import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function CookieBanner() {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem('cookiesAccepted') !== 'yes'
    } catch {
      return true
    }
  })

  if (!visible) return null

  function accept() {
    try {
      localStorage.setItem('cookiesAccepted', 'yes')
    } catch {
      // Ignore storage errors (e.g. private mode).
    }
    setVisible(false)
  }

  return (
    <div className="cookie-banner">
      <span>
        {t('cookies.message')}{' '}
        <Link to="/privacy">{t('cookies.learnMore')}</Link>
      </span>
      <button type="button" onClick={accept}>{t('cookies.accept')}</button>
    </div>
  )
}

export default CookieBanner
