import { useLanguage } from '../i18n/LanguageContext'
import type { Lang } from '../i18n/translations'
import { useAuth } from '../hooks/useAuth'

const LANGS: { code: Lang; label: string }[] = [
  { code: 'pt', label: '🇵🇹 PT' },
  { code: 'en', label: '🇬🇧 EN' },
  { code: 'es', label: '🇪🇸 ES' },
]

function LanguageBar() {
  const { lang, setLang } = useLanguage()
  const { user, updateLanguage } = useAuth()

  async function handleChange(code: Lang) {
    setLang(code)
    if (user) {
      try {
        await updateLanguage(code)
      } catch {
        // Silent fail if network error
      }
    }
  }

  return (
    <div className="lang-bar">
      <div className="lang-bar-inner">
        {LANGS.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            className={code === lang ? 'lang-btn active' : 'lang-btn'}
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
