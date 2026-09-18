import { useLanguage } from '../i18n/LanguageContext'
import SketchText from '../components/SketchText'
import PencilDivider from '../components/PencilDivider'

function Rules() {
  const { t } = useLanguage()

  return (
    <div className="simple-wrap">
      {/* title with the same animation/reflection as the About us page */}
      <h1 className="sketch-title page-title">
        <span className="sr-only">{t('rules.title')}</span>
        <SketchText text={t('rules.title')} />
        <span className="hero-logo-reflection" aria-hidden="true">
          <span className="reflect-flip">
            <SketchText text={t('rules.title')} />
          </span>
          <span className="reflection-fade" />
        </span>
      </h1>
      <ol className="rules-list">
        {Array.from({ length: 12 }, (_, i) => (
          <li key={i}>{t(`rules.${i + 1}`)}</li>
        ))}
      </ol>
      {/* the sketched computer closes the page, as on the Home and About pages */}
      <PencilDivider />
    </div>
  )
}

export default Rules
