import { useTranslation } from 'react-i18next'

function Terms() {
  const { t } = useTranslation()

  return (
    <div className="simple-wrap">
      <h1>{t('terms.title')}</h1>
      <p className="kicker">{t('terms.disclaimer')}</p>

      <div className="legal-section">
        <h2>{t('terms.s1Title')}</h2>
        <p>{t('terms.s1Body')}</p>
      </div>

      <div className="legal-section">
        <h2>{t('terms.s2Title')}</h2>
        <p>{t('terms.s2Body')}</p>
      </div>

      <div className="legal-section">
        <h2>{t('terms.s3Title')}</h2>
        <p>{t('terms.s3Body')}</p>
      </div>

      <div className="legal-section">
        <h2>{t('terms.s4Title')}</h2>
        <p>{t('terms.s4Body')}</p>
      </div>

      <div className="legal-section">
        <h2>{t('terms.s5Title')}</h2>
        <p>{t('terms.s5Body')}</p>
      </div>

      <div className="legal-section">
        <h2>{t('terms.s6Title')}</h2>
        <p>{t('terms.s6Body')}</p>
      </div>
    </div>
  )
}

export default Terms
