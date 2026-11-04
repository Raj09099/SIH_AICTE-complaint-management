import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext(null);

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', short: 'EN' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', short: 'हि' },
  { code: 'mr', label: 'Marathi', native: 'मराठी', short: 'म' },
];

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('aicte_language') || 'en';
  });

  const setLanguage = (langCode) => {
    if (translations[langCode]) {
      setLanguageState(langCode);
      localStorage.setItem('aicte_language', langCode);
    }
  };

  /**
   * Helper function to retrieve nested translation keys.
   * e.g., t('dashboard.title') or t('common.save')
   */
  const t = (keyPath, fallback = '') => {
    if (!keyPath) return fallback;
    const parts = keyPath.split('.');

    // Try current selected language
    let cur = translations[language];
    for (const part of parts) {
      if (cur && cur[part] !== undefined) {
        cur = cur[part];
      } else {
        cur = undefined;
        break;
      }
    }
    if (cur !== undefined && typeof cur === 'string') {
      return cur;
    }

    // Fallback to English
    let enCur = translations.en;
    for (const part of parts) {
      if (enCur && enCur[part] !== undefined) {
        enCur = enCur[part];
      } else {
        enCur = undefined;
        break;
      }
    }
    if (enCur !== undefined && typeof enCur === 'string') {
      return enCur;
    }

    return fallback || keyPath;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        supportedLanguages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

