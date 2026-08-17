import { useLanguage } from '../i18n/LanguageContext'

function Rules() {
  const { t } = useLanguage()

  return (
    <div className="simple-wrap">
      <h1>{t('rules.title')}</h1>
      <ol className="rules-list">
        {Array.from({ length: 10 }, (_, i) => (
          <li key={i}>{t(`rules.${i + 1}`)}</li>
        ))}
      </ol>
    </div>
  )
}

export default Rules
