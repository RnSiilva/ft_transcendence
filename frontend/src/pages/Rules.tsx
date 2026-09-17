import { useLanguage } from '../i18n/LanguageContext'
import SketchText from '../components/SketchText'
import PencilDivider from '../components/PencilDivider'

function Rules() {
  const { t } = useLanguage()

  return (
    <div className="simple-wrap">
      {/* título com a mesma animação/reflexo do Sobre nós */}
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
      {/* o computador desenhado fecha a página, como na Home e no About */}
      <PencilDivider />
    </div>
  )
}

export default Rules
