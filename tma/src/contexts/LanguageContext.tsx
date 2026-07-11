// 10 языков // src/contexts/LanguageContext.tsx
// src/contexts/LanguageContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Типы языков
export type Language = 'ru' | 'en' | 'zh' | 'ja' | 'hi' | 'ar' | 'es' | 'it' | 'de' | 'fr';

// Импортируем переводы из отдельных файлов
import { ruTranslations } from './translations/ru';
import { enTranslations } from './translations/en';
import { zhTranslations } from './translations/zh';
import { jaTranslations } from './translations/ja';
import { hiTranslations } from './translations/hi';
import { arTranslations } from './translations/ar';
import { esTranslations } from './translations/es';
import { itTranslations } from './translations/it';
import { deTranslations } from './translations/de';
import { frTranslations } from './translations/fr';

// Объединяем все переводы
const translations = {
  ru: ruTranslations,
  en: enTranslations,
  zh: zhTranslations,
  ja: jaTranslations,
  hi: hiTranslations,
  ar: arTranslations,
  es: esTranslations,
  it: itTranslations,
  de: deTranslations,
  fr: frTranslations
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('ru');

  // Загружаем язык из localStorage при инициализации
  useEffect(() => {
    const savedLanguage = localStorage.getItem('app-language') as Language;
    if (savedLanguage && Object.keys(translations).includes(savedLanguage)) {
      setLanguage(savedLanguage);
    }
  }, []);

  // Сохраняем язык в localStorage при изменении
  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('app-language', lang);
  };

  // Функция для получения перевода
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Если перевод не найден, пробуем найти в английском
        if (language !== 'en') {
          let enValue: any = translations.en;
          for (const enK of keys) {
            if (enValue && typeof enValue === 'object' && enK in enValue) {
              enValue = enValue[enK];
            } else {
              return key;
            }
          }
          return typeof enValue === 'string' ? enValue : key;
        }
        return key;
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};




