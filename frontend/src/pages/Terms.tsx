import { useTranslation } from 'react-i18next'

function Terms() {
  const { t } = useTranslation()

  return (
    <main className="page">
      <h1>{t('terms.title')}</h1>
      <p><em>{t('terms.disclaimer')}</em></p>

      <h2>{t('terms.s1Title')}</h2>
      <p>{t('terms.s1Body')}</p>

      <h2>{t('terms.s2Title')}</h2>
      <p>{t('terms.s2Body')}</p>

      <h2>{t('terms.s3Title')}</h2>
      <p>{t('terms.s3Body')}</p>

      <h2>{t('terms.s4Title')}</h2>
      <p>{t('terms.s4Body')}</p>

      <h2>{t('terms.s5Title')}</h2>
      <p>{t('terms.s5Body')}</p>

      <h2>{t('terms.s6Title')}</h2>
      <p>{t('terms.s6Body')}</p>
    </main>
  )
}

export default Terms
