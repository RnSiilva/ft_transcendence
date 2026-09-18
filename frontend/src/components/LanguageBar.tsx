import { useLanguage } from '../i18n/LanguageContext'
import type { Lang } from '../i18n/translations'
import { useAuth } from '../hooks/useAuth'

/* SVG flags instead of emoji: Windows (Chrome/Edge) does not render flag
   emojis — it only showed "PT"/"GB"/"ES" as loose letters. Drawn by hand,
   they look the same on every system. */
const flagStyle = { verticalAlign: '-2px', marginRight: 6, borderRadius: 2 } as const

const FLAGS: Record<Lang, React.ReactNode> = {
  pt: (
    <svg width="18" height="12" viewBox="0 0 60 40" style={flagStyle} aria-hidden="true">
      <rect width="60" height="40" fill="#DA291C" />
      <rect width="24" height="40" fill="#046A38" />
      <circle cx="24" cy="20" r="8" fill="#FFE900" />
      <circle cx="24" cy="20" r="4.5" fill="#fff" />
      <circle cx="24" cy="20" r="2.5" fill="#DA291C" />
    </svg>
  ),
  en: (
    <svg width="18" height="12" viewBox="0 0 60 40" style={flagStyle} aria-hidden="true">
      <rect width="60" height="40" fill="#012169" />
      <path d="M0,0 60,40 M60,0 0,40" stroke="#fff" strokeWidth="8" />
      <path d="M0,0 60,40 M60,0 0,40" stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 V40 M0,20 H60" stroke="#fff" strokeWidth="13" />
      <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="7" />
    </svg>
  ),
  es: (
    <svg width="18" height="12" viewBox="0 0 60 40" style={flagStyle} aria-hidden="true">
      <rect width="60" height="40" fill="#AA151B" />
      <rect y="10" width="60" height="20" fill="#F1BF00" />
    </svg>
  ),
}

const LANGS: { code: Lang; label: string }[] = [
  { code: 'pt', label: 'PT' },
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
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
            {FLAGS[code]}
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default LanguageBar
