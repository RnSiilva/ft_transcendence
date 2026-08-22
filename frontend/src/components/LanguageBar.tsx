import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'

const LANGS = [
  { code: 'pt', label: '🇵🇹 PT' },
  { code: 'en', label: '🇬🇧 EN' },
  { code: 'es', label: '🇪🇸 ES' },
] as const

function LanguageBar() {
  const { i18n } = useTranslation()
  const { user, updateLanguage } = useAuth()

  async function handleChange(code: string) {
    if (user) {
      await updateLanguage(code)
    } else {
      i18n.changeLanguage(code)
      localStorage.setItem('i18nextLng', code)
    }
  }

  return (
    <div className="lang-bar">
      <div className="lang-bar-inner">
        {LANGS.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            className={code === i18n.language ? 'lang-btn active' : 'lang-btn'}
            onClick={() => void handleChange(code)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default LanguageBar
