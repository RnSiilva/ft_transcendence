import { useLanguage } from '../i18n/LanguageContext'

function Privacy() {
  const { t } = useLanguage()

  return (
    <div className="simple-wrap">
      <h1>{t('privacy.title')}</h1>
      <p className="kicker">{t('legal.kicker')}</p>
      {Array.from({ length: 7 }, (_, i) => (
        <div className="legal-section" key={i}>
          <h2>{t(`privacy.s${i + 1}.title`)}</h2>
          <p>{t(`privacy.s${i + 1}.text`)}</p>
        </div>
      ))}
    </div>
  )
}

export default Privacy
