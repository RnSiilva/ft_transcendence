import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function Home() {
  const { t } = useTranslation()

  return (
    <main className="page center">
      <h1>{t('home.title')}</h1>
      <p>{t('home.description')}</p>

      <p>
        <img
          src="/jogo-placeholder.svg"
          alt={t('home.title')}
          className="game-image"
        />
      </p>

      <Link to="/login">
        <button type="button">{t('home.playButton')}</button>
      </Link>

      <section id="about-us">
        <h2>{t('home.aboutTitle')}</h2>
        <p>{t('home.aboutText')}</p>
      </section>
    </main>
  )
}

export default Home
