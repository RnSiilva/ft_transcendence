import { useTranslation } from 'react-i18next'

function Rules() {
  const { t } = useTranslation()

  return (
    <main className="page">
      <h1>{t('rules.title')}</h1>
      <p>{t('rules.intro')}</p>
      <ul>
        <li>{t('rules.rule1')}</li>
        <li>{t('rules.rule2')}</li>
        <li>{t('rules.rule3')}</li>
        <li>{t('rules.rule4')}</li>
        <li>{t('rules.rule5')}</li>
        <li>{t('rules.rule6')}</li>
        <li>{t('rules.rule7')}</li>
        <li>{t('rules.rule8')}</li>
        <li>{t('rules.rule9')}</li>
        <li>{t('rules.rule10')}</li>
      </ul>
    </main>
  )
}

export default Rules
