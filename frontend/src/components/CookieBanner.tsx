import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'

function CookieBanner() {
  const { t } = useLanguage()
  const [accepted, setAccepted] = useState(
    () => localStorage.getItem('cookiesAceites') === 'sim'
  )

  function accept() {
    localStorage.setItem('cookiesAceites', 'sim')
    setAccepted(true)
  }

  return (
    <div className={accepted ? 'cookies hide' : 'cookies'}>
      <p>
        <span>{t('cookies.text')}</span>{' '}
        <Link to="/privacy">{t('cookies.more')}</Link>
      </p>
      <button type="button" className="btn btn-primary btn-sm" onClick={accept}>
        {t('cookies.accept')}
      </button>
    </div>
  )
}

export default CookieBanner
