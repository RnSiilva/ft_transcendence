import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'
import { useAuth } from '../hooks/useAuth'
import HeroLogo from '../components/HeroLogo'
import HeroIllustration from '../components/HeroIllustration'
import PencilDivider from '../components/PencilDivider'

function Home() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  // Logado, o Jogar salta o login e vai direto para as salas (lobby).
  const { user } = useAuth()

  return (
    <section>
      <div className="hero">
        <h1 className="hero-logo">
          <span className="sr-only">SketchGuess</span>
          <HeroLogo />
        </h1>
        <div className="hero-logo-reflection" aria-hidden="true">
          <div className="reflect-flip">
            <HeroLogo skewed />
          </div>
          <div className="reflection-fade" />
        </div>
        <p className="lede">{t('hero.lede')}</p>

        <div className="hero-frame">
          <HeroIllustration />
        </div>

        <button
          type="button"
          className="btn btn-primary cta-btn"
          style={{ fontSize: 17, padding: '15px 34px' }}
          onClick={() => navigate(user ? '/rooms' : '/login')}
        >
          <span>{t('cta.play')}</span>
          {Array.from({ length: 11 }, (_, i) => (
            <span key={i} className={`spark spark-${i + 1}`} />
          ))}
        </button>
      </div>

      {/* computador desenhado — assinatura de fecho da Home */}
      <div className="home-end" aria-hidden="true">
        <PencilDivider />
      </div>
    </section>
  )
}

export default Home
