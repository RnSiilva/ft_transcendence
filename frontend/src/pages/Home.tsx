import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'
import HeroLogo from '../components/HeroLogo'
import TeamCircuit from '../components/TeamCircuit'
import HeroIllustration from '../components/HeroIllustration'

// Traço do divisor de lápis do "About us" (copiado do modelo aprovado;
// a mesma linha é usada duas vezes: risco vermelho + ponta amarela com blur).
const PENCIL_D =
  'M-43.9,63.4 Q-32.7,65.4 -27.2,65.9 Q-21.7,66.5 -16.4,66.4 Q-11.2,66.4 -6.1,65.5 Q-1.1,64.7 3.7,63.1 Q8.5,61.4 13.0,58.9 Q17.5,56.5 21.7,53.3 Q26.0,50.1 30.1,46.3 Q34.2,42.5 38.2,38.4 Q42.2,34.3 46.1,30.0 Q50.1,25.8 54.1,21.8 Q58.1,17.7 62.2,14.1 Q66.3,10.4 70.7,7.4 Q75.0,4.4 86.3,12.8 Q97.5,21.1 106.2,21.6 Q115.0,22.1 123.8,22.4 Q132.5,22.8 141.2,22.9 Q150.0,23.0 158.8,22.9 Q167.5,22.8 176.2,22.4 Q185.0,22.1 193.8,21.6 Q202.5,21.1 211.2,20.6 Q220.0,20.0 219.4,26.0 Q218.9,32.0 218.4,38.0 Q217.9,44.0 217.6,50.0 Q217.3,56.0 217.1,62.0 Q217.0,68.0 217.1,74.0 Q217.1,80.0 217.4,86.0 Q217.7,92.0 218.1,98.0 Q218.6,104.0 219.1,110.0 Q219.6,116.0 220.2,122.0 Q220.7,128.0 221.3,134.0 Q221.8,140.0 222.2,140.0 Q222.7,140.1 225.3,140.4 Q227.9,140.8 230.0,142.5 Q232.1,144.1 233.0,146.6 Q234.0,149.0 233.5,151.6 Q233.1,154.2 231.4,156.2 Q229.7,158.3 227.2,159.1 Q224.7,160.0 222.1,159.5 Q219.5,158.9 217.5,157.2 Q215.6,155.4 214.8,152.9 Q214.0,150.3 214.6,147.8 Q215.2,145.2 220.7,143.3 Q226.2,141.4 229.4,141.7 Q232.5,142.0 235.6,141.7 Q238.8,141.4 241.9,140.7 Q245.0,140.0 246.3,143.5 Q247.5,147.0 249.2,150.3 Q250.8,153.5 252.9,156.5 Q255.0,159.5 257.5,162.2 Q260.0,165.0 249.0,164.4 Q238.0,163.8 227.0,163.3 Q216.0,162.8 205.0,162.5 Q194.0,162.2 183.0,162.1 Q172.0,162.0 161.0,162.2 Q150.0,162.3 139.0,162.7 Q128.0,163.1 117.0,163.6 Q106.0,164.2 95.0,164.8 Q84.0,165.4 73.0,166.0 Q62.0,166.5 51.0,167.0 Q40.0,167.4 42.5,163.5 Q45.0,159.5 47.1,156.5 Q49.2,153.5 50.8,150.3 Q52.5,147.0 53.7,143.5 Q55.0,140.0 58.1,140.7 Q61.2,141.4 64.4,141.7 Q67.5,142.0 70.6,141.7 Q73.8,141.4 76.9,140.7 Q80.0,140.0 80.6,134.0 Q81.1,128.0 81.6,122.0 Q82.1,116.0 82.4,110.0 Q82.7,104.0 82.9,98.0 Q83.0,92.0 82.9,86.0 Q82.9,80.0 82.6,74.0 Q82.3,68.0 81.9,62.0 Q81.4,56.0 80.9,50.0 Q80.4,44.0 79.8,38.0 Q79.3,32.0 78.7,26.0 Q78.2,20.0 85.6,29.0 Q93.0,37.9 100.7,41.5 Q108.4,45.1 116.4,47.8 Q124.3,50.6 132.4,52.4 Q140.6,54.2 148.9,55.0 Q157.3,55.9 165.9,55.9 Q174.4,55.9 183.1,55.2 Q191.8,54.6 200.6,53.5 Q209.4,52.5 218.3,51.3 Q227.1,50.1 235.9,49.2 Q244.7,48.2 253.3,47.6 Q262.0,47.1 270.5,47.2 Q279.1,47.4 287.4,48.4 Q295.7,49.4 303.8,51.4 Q311.9,53.3 319.8,56.2 Q327.7,59.1 335.4,62.9 L343.1,66.6'

function Home() {
  const { t } = useLanguage()
  const navigate = useNavigate()

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
          onClick={() => navigate('/login')}
        >
          <span>{t('cta.play')}</span>
          {Array.from({ length: 11 }, (_, i) => (
            <span key={i} className={`spark spark-${i + 1}`} />
          ))}
        </button>
      </div>

      <div className="about" id="home-about">
        <svg
          className="pencil-divider"
          viewBox="-50 -5 400 185"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <filter id="pencil-blur">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>
          <path pathLength={1} className="pencil-line" d={PENCIL_D} />
          <path
            pathLength={1}
            className="pencil-point"
            filter="url(#pencil-blur)"
            d={PENCIL_D}
          />
        </svg>
        <h2>About us</h2>
        <p>{t('about.text')}</p>
      </div>

      <TeamCircuit />
    </section>
  )
}

export default Home
