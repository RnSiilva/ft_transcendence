import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';

export function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const { user, updateLanguage } = useAuth();

  async function handleLanguageChange(newLang: string) {
    await i18n.changeLanguage(newLang);
    localStorage.setItem('i18nextLng', newLang);

    if (user && updateLanguage) {
      try {
        await updateLanguage(newLang);
      } catch (err) {
        console.error('Failed to update language on backend', err);
      }
    }
  }

  return (
    <div className="language-selector" style={{ marginBottom: '1rem' }}>
      <label htmlFor="language-select" style={{ marginRight: '0.5rem', fontSize: '0.9rem' }}>
        {t('profile.language')}:
      </label>
      <select
        id="language-select"
        value={i18n.language.slice(0, 2)}
        onChange={(e) => handleLanguageChange(e.target.value)}
        style={{ padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid #ccc' }}
      >
        <option value="pt">{t('languages.pt')}</option>
        <option value="en">{t('languages.en')}</option>
        <option value="es">{t('languages.es')}</option>
      </select>
    </div>
  );
}
