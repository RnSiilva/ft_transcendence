import { Link } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'

function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="site">
      <div>{t('footer.copyright')}</div>
      <div className="line2">
        <Link to="/privacy">{t('footer.privacy')}</Link>
        <Link to="/terms">{t('footer.terms')}</Link>
        <Link to="/rules">{t('footer.rules')}</Link>
      </div>
    </footer>
  )
}

export default Footer
