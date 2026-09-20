import { useLanguage } from '../i18n/LanguageContext'
import SketchText from '../components/SketchText'
import PencilDivider from '../components/PencilDivider'

function Privacy() {
  const { t } = useLanguage()

  return (
    <div className="simple-wrap">
      {/* title with the same animation/reflection as the About us page */}
      <h1 className="sketch-title page-title">
        <span className="sr-only">{t('privacy.title')}</span>
        <SketchText text={t('privacy.title')} />
        <span className="hero-logo-reflection" aria-hidden="true">
          <span className="reflect-flip">
            <SketchText text={t('privacy.title')} />
          </span>
          <span className="reflection-fade" />
        </span>
      </h1>
      <p className="kicker">{t('legal.kicker')}</p>
      {Array.from({ length: 9 }, (_, i) => (
        <div className="legal-section" key={i}>
          <h2>{t(`privacy.s${i + 1}.title`)}</h2>
          <p>{t(`privacy.s${i + 1}.text`)}</p>
        </div>
      ))}
      {/* the sketched computer closes the page, as on the Home and About pages */}
      <PencilDivider />
    </div>
  )
}

export default Privacy
