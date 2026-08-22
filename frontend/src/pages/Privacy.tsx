import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

function Privacy() {
  const { t } = useTranslation()

  return (
    <div className="simple-wrap">
      <h1>{t('privacy.title')}</h1>
      <p className="kicker">{t('privacy.disclaimer')}</p>

      <div className="legal-section">
        <h2>{t('privacy.s1Title')}</h2>
        <p>{t('privacy.s1Body')}</p>
      </div>

      <div className="legal-section">
        <h2>{t('privacy.s2Title')}</h2>
        <ul>
          <li>{t('privacy.s2i1')}</li>
          <li>{t('privacy.s2i2')}</li>
          <li>{t('privacy.s2i3')}</li>
          <li>{t('privacy.s2i4')}</li>
          <li>{t('privacy.s2i5')}</li>
        </ul>
      </div>

      <div className="legal-section">
        <h2>{t('privacy.s3Title')}</h2>
        <p>{t('privacy.s3Body')}</p>
      </div>

      <div className="legal-section">
        <h2>{t('privacy.s4Title')}</h2>
        <p>{t('privacy.s4Body')}</p>
      </div>

      <div className="legal-section">
        <h2>{t('privacy.s5Title')}</h2>
        <p>{t('privacy.s5Body')}</p>
      </div>

      <div className="legal-section">
        <h2>{t('privacy.s6Title')}</h2>
        <p>{t('privacy.s6Body')}</p>
      </div>

      <div className="legal-section">
        <h2>{t('privacy.s7Title')}</h2>
        <p>{t('privacy.s7Body')}</p>
      </div>

      <p><Link to="/terms">{t('footer.terms')}</Link></p>
    </div>
  )
}

export default Privacy
