import { useLanguage } from '../i18n/LanguageContext'

function Terms() {
  const { t } = useLanguage()

  return (
    <div className="simple-wrap">
      <h1>{t('terms.title')}</h1>
      <p className="kicker">{t('legal.kicker')}</p>
      {Array.from({ length: 6 }, (_, i) => (
        <div className="legal-section" key={i}>
          <h2>{t(`terms.s${i + 1}.title`)}</h2>
          <p>{t(`terms.s${i + 1}.text`)}</p>
        </div>
      ))}
    </div>
  )
}

export default Terms
