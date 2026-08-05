import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="footer">
      <p>{t('footer.copyright')}</p>
      <p>
        <Link to="/privacy">{t('footer.privacy')}</Link> ·{' '}
        <Link to="/terms">{t('footer.terms')}</Link> ·{' '}
        <Link to="/rules">{t('footer.rules')}</Link>
      </p>
    </footer>
  )
}

export default Footer
