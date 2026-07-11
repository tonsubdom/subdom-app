import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { miniApp, useSignal } from '@telegram-apps/sdk-react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  currentTheme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Получаем сигнал темы из Telegram Mini App
  const isDarkSignal = useSignal(miniApp.isDark);

  // Определяем начальную тему из Telegram Mini App и класса на documentElement
  const getInitialTheme = (): Theme => {
    if (typeof window !== 'undefined') {
      // Приоритет у Telegram Mini App темы
      if (isDarkSignal) return 'dark';
      
      // Затем проверяем класс на documentElement
      if (document.documentElement.classList.contains('telegram-comments-widget')) {
        return 'dark';
      }
    }
    return 'light';
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

  // Слушаем изменения темы в Telegram Mini App
  useEffect(() => {
    const newTheme = isDarkSignal ? 'dark' : 'light';
    setCurrentTheme(newTheme);
    applyThemeToDocument(newTheme);
  }, [isDarkSignal]);

  const toggleTheme = () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setCurrentTheme(newTheme);
    applyThemeToDocument(newTheme);
  };

  const setTheme = (theme: Theme) => {
    setCurrentTheme(theme);
    applyThemeToDocument(theme);
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