import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { miniApp, useSignal } from '@telegram-apps/sdk-react';
import { isRealTelegramEnv } from '@/mockEnv';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  currentTheme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Ручной выбор темы (кнопка в Header) раньше нигде не персистился — при
// каждом перезаходе тема пересчитывалась заново из сигнала Telegram/дефолта,
// игнорируя то, что юзер мог явно переключить в прошлый раз.
const MANUAL_THEME_STORAGE_KEY = 'subdom:manualTheme';

const getManualTheme = (): Theme | null => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(MANUAL_THEME_STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : null;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Получаем сигнал темы из Telegram Mini App
  const isDarkSignal = useSignal(miniApp.isDark);

  // Определяем начальную тему: ручной выбор юзера (если был) > реальный
  // Telegram-сигнал (внутри настоящего Telegram доверяем isDarkSignal
  // полностью — и light, и dark, это подлинная тема юзера) > дефолт dark.
  // isDarkSignal сам по себе false и "юзер в Telegram выбрал светлую", и
  // "мы вообще не в Telegram, сигнала нет" — различить это можно только
  // через isRealTelegramEnv (mockEnv.ts, к этому моменту уже разрешён).
  // Раньше вне настоящего Telegram-клиента (браузер) статично открывалась
  // светлая тема просто потому, что isDarkSignal там всегда false.
  const getInitialTheme = (): Theme => {
    const manual = getManualTheme();
    if (manual) return manual;

    if (isRealTelegramEnv) {
      return isDarkSignal ? 'dark' : 'light';
    }
    return 'dark';
  };

  const [currentTheme, setCurrentTheme] = useState<Theme>(getInitialTheme);

  // Функция для применения темы к документу и Telegram Mini App
  const applyThemeToDocument = (theme: Theme) => {
    if (typeof window !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('telegram-comments-widget');
        // Устанавливаем темные цвета для Telegram Mini App
        miniApp.setHeaderColor('#121212');
        miniApp.setBackgroundColor('#121212');
        // Устанавливаем темный фон для body
        document.body.style.backgroundColor = '#121212';
        document.body.style.color = '#E5E5E5';
      } else {
        document.documentElement.classList.remove('telegram-comments-widget');
        // Устанавливаем светлые цвета для Telegram Mini App
        miniApp.setHeaderColor('#ffffff');
        miniApp.setBackgroundColor('#f8fafc');
        // Устанавливаем светлый фон для body
        document.body.style.backgroundColor = '#f8fafc';
        document.body.style.color = '#1F2937';
      }
    }
  };

  // Слушаем изменения класса на documentElement
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const isDark = document.documentElement.classList.contains('telegram-comments-widget');
          setCurrentTheme(isDark ? 'dark' : 'light');
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // Слушаем изменения темы в Telegram Mini App — только вне ручного
  // override и только внутри настоящего Telegram (см. getInitialTheme).
  // Раньше это безусловно применяло isDarkSignal, поэтому даже ручной
  // toggleTheme/сохранённый выбор тут же перетирался следующим срабатыванием
  // сигнала (в браузере — тем самым false-дефолтом, откуда и бралась
  // статично светлая тема).
  useEffect(() => {
    if (getManualTheme()) return;
    if (!isRealTelegramEnv) return;
    const newTheme = isDarkSignal ? 'dark' : 'light';
    setCurrentTheme(newTheme);
    applyThemeToDocument(newTheme);
  }, [isDarkSignal]);

  const toggleTheme = () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setCurrentTheme(newTheme);
    applyThemeToDocument(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem(MANUAL_THEME_STORAGE_KEY, newTheme);
    }
  };

  const setTheme = (theme: Theme) => {
    setCurrentTheme(theme);
    applyThemeToDocument(theme);
    if (typeof window !== 'undefined') {
      localStorage.setItem(MANUAL_THEME_STORAGE_KEY, theme);
    }
  };

  // Применяем тему при изменении
  useEffect(() => {
    applyThemeToDocument(currentTheme);
  }, [currentTheme]);

  // Инициализация при монтировании
  useEffect(() => {
    applyThemeToDocument(currentTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ currentTheme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};