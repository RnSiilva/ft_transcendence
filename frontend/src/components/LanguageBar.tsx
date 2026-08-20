import { useLanguage } from '../i18n/LanguageContext'
import type { Lang } from '../i18n/translations'

const LANGS: { code: Lang; label: string }[] = [
  { code: 'pt', label: '🇵🇹 PT' },
  { code: 'en', label: '🇬🇧 EN' },
  { code: 'es', label: '🇪🇸 ES' },
]

function LanguageBar() {
  const { lang, setLang } = useLanguage()

  return (
    <div className="lang-bar">
      <div className="lang-bar-inner">
        {LANGS.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            className={code === lang ? 'lang-btn active' : 'lang-btn'}
            onClick={() => setLang(code)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default LanguageBar
