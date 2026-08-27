import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { translations } from './translations';

const savedLanguage = localStorage.getItem('i18nextLng') || 'pt';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: translations.pt },
      en: { translation: translations.en },
      es: { translation: translations.es },
    },
    lng: savedLanguage,
    fallbackLng: 'pt',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
