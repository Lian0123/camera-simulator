import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from './resources';

export function setupI18n(language: keyof typeof resources): void {
  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({ resources: Object.fromEntries(Object.entries(resources).map(([lng, data]) => [lng, { translation: data }])), lng: language, fallbackLng: 'zh', interpolation: { escapeValue: false } });
  } else void i18n.changeLanguage(language);
}

export default i18n;
