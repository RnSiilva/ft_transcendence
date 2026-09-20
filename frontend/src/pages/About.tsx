import type { CSSProperties } from 'react'
import { useLanguage } from '../i18n/LanguageContext'
import PencilDivider from '../components/PencilDivider'
import TeamCircuit from '../components/TeamCircuit'
import SketchText from '../components/SketchText'

// About us page: the sketched computer as the identity, the introduction
// text and 3 numbered cards (Uiverse, adapted to the project's colors).

const TROPHY_D =
  'M62.11,53.93c22.582-3.125,22.304-23.471,18.152-29.929-4.166-6.444-10.36-2.153-10.36-2.153v-4.166H30.099v4.166s-6.194-4.291-10.36,2.153c-4.152,6.458-4.43,26.804,18.152,29.929l5.236,7.777v8.249s-.944,4.597-4.833,4.986c-3.903,.389-7.791,4.028-7.791,7.374h38.997c0-3.347-3.889-6.986-7.791-7.374-3.889-.389-4.833-4.986-4.833-4.986v-8.249l5.236-7.777Zm7.388-24.818s2.833-3.097,5.111-1.347c2.292,1.75,2.292,15.86-8.999,18.138l3.889-16.791Zm-44.108-1.347c2.278-1.75,5.111,1.347,5.111,1.347l3.889,16.791c-11.291-2.278-11.291-16.388-8.999-18.138Z'

const PERSON_D =
  'M 50.4 51 C 40.5 49.1 40 46 40 44 v -1.2 a 18.9 18.9 0 0 0 5.7 -8.8 h 0.1 c 3 0 3.8 -6.3 3.8 -7.3 s 0.1 -4.7 -3 -4.7 C 53 4 30 0 22.3 6 c -5.4 0 -5.9 8 -3.9 16 c -3.1 0 -3 3.8 -3 4.7 s 0.7 7.3 3.8 7.3 c 1 3.6 2.3 6.9 4.7 9 v 1.2 c 0 2 0.5 5 -9.5 6.8 S 2 62 2 62 h 60 a 14.6 14.6 0 0 0 -11.6 -11 z'

const CARDS = [
  {
    n: '01',
    accent: '#FF4B3E',
    dark: '#A82E24',
    titleKey: 'about.card1.title',
    textKey: 'about.card1.text',
    icon: (
      <svg height="34" width="34" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    n: '02',
    accent: '#3EC1D3',
    dark: '#2A8A98',
    titleKey: 'about.card2.title',
    textKey: 'about.card2.text',
    icon: (
      <svg height="34" width="34" viewBox="0 0 64 64" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d={PERSON_D} />
      </svg>
    ),
  },
  {
    n: '03',
    accent: '#FFC93C',
    dark: '#C79420',
    titleKey: 'about.card3.title',
    textKey: 'about.card3.text',
    icon: (
      <svg height="34" width="34" viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d={TROPHY_D} />
      </svg>
    ),
  },
]

function About() {
  const { t } = useLanguage()

  return (
    <main className="about-page">
      <h1 className="about-title sketch-title">
        <span className="sr-only">{t('nav.aboutUs')}</span>
        <SketchText text={t('nav.aboutUs')} />
        <span className="hero-logo-reflection" aria-hidden="true">
          <span className="reflect-flip">
            <SketchText text={t('nav.aboutUs')} />
          </span>
          <span className="reflection-fade" />
        </span>
      </h1>
      <p className="about-intro">{t('about.text')}</p>

      <TeamCircuit />

      <div className="about-cards">
        {CARDS.map((card) => (
          <div
            key={card.n}
            className="about-card"
            style={{
              '--card-accent': card.accent,
              '--card-accent-dark': card.dark,
            } as CSSProperties}
          >
            <div className="about-card__body">
              <div className="about-card__icon">{card.icon}</div>
              <p className="about-card__title">{t(card.titleKey)}</p>
              <p className="about-card__paragraph">{t(card.textKey)}</p>
            </div>
            <div className="about-card__ribbon">
              <span className="about-card__label">{card.n}</span>
            </div>
          </div>
        ))}
      </div>

      {/* sketched computer — closing signature, as on the Home page */}
      <div className="home-end" aria-hidden="true">
        <PencilDivider />
      </div>
    </main>
  )
}

export default About
