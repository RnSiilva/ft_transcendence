import { useTranslation } from 'react-i18next'

function Rules() {
  const { t } = useTranslation()

  return (
    <div className="simple-wrap">
      <h1>{t('rules.title')}</h1>
      <p className="kicker">{t('rules.intro')}</p>
      <ol className="rules-list">
        {Array.from({ length: 10 }, (_, i) => (
          <li key={i}>{t(`rules.rule${i + 1}`)}</li>
        ))}
      </ol>
    </div>
  )
}

export default Rules
