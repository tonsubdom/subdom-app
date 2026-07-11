
// src/components/Header/index.tsx
import { useState, useEffect, useRef } from "react";
import { useTonWallet} from "@tonconnect/ui-react";
import { Caption, Cell, Title } from "@telegram-apps/telegram-ui";

import src from '/src/components/Header/subdom_logo.png';
import "./style.css";
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

import { useAdminAccess } from '@/hooks/useAdminAccess';

const Header: React.FC = () => {
  const wallet = useTonWallet();
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const isTestnet = wallet?.account?.chain === "-3";

  const { clickCount, handleSubdomClick, isOwner } = useAdminAccess();
  
  // Получаем текущую тему из ThemeContext
  const { currentTheme, toggleTheme } = useTheme();
  
  // Получаем язык и функцию перевода
  const { language, setLanguage, t } = useLanguage();

  // Получаем сигнал темы из Telegram Mini App

  // Ref для обработки кликов вне выпадающего списка
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Обработчик кликов вне выпадающего списка
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLanguageDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // const handleDisconnect = (): void => {
  //   tonConnectUi.disconnect();
  //   setIsModalOpen(false);
  // };

  const handleToggleTheme = () => {
    toggleTheme();
  };

  const toggleLanguageDropdown = () => {
    setIsLanguageDropdownOpen(!isLanguageDropdownOpen);
  };

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
    setIsLanguageDropdownOpen(false);
  };

  // Функция для получения названия языка
  const getLanguageName = (lang: Language): string => {
    const languageNames: Record<Language, string> = {
      ru: 'Русский',
      en: 'English',
      zh: '中文',
      ja: '日本語',
      hi: 'हिन्दी',
      ar: 'العربية',
      es: 'Español',
      it: 'Italiano',
      de: 'Deutsch',
      fr: 'Français'
    };
    return languageNames[lang] || lang;
  };

  // Функция для получения флага языка
  const getLanguageFlag = (lang: Language): string => {
    const flags: Record<Language, string> = {
      ru: '🇷🇺',
      en: '🇺🇸',
      zh: '🇨🇳',
      ja: '🇯🇵',
      hi: '🇮🇳',
      ar: '🇸🇦',
      es: '🇪🇸',
      it: '🇮🇹',
      de: '🇩🇪',
      fr: '🇫🇷'
    };
    return flags[lang] || '🌐';
  };

  // Золотые стили
  const goldButtonStyle = {
    backgroundColor: 'transparent',
    color: currentTheme === 'dark' ? '#FFD700' : '#60A5FA',
    border: currentTheme === 'dark' ? '1px solid #FFD700' : '1px solid #60A5FA',
    outline: 'none',
    marginRight: '8px',
    padding: '6px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    fontFamily: 'monospace',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    boxShadow: currentTheme === 'dark' 
      ? '0 0 8px rgba(255, 215, 0, 0.4)' 
      : '0 0 8px #60A5FA',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  };

  const dropdownStyle = {
    position: 'absolute' as const,
    top: '100%',
    right: 0,
    marginTop: '4px',
    backgroundColor: currentTheme === 'dark' ? '#1F2937' : '#FFFFFF',
    border: currentTheme === 'dark' ? '1px solid #374151' : '1px solid #E5E7EB',
    borderRadius: '8px',
    boxShadow: currentTheme === 'dark' 
      ? '0 4px 20px rgba(0, 0, 0, 0.5)' 
      : '0 4px 20px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    minWidth: '180px',
    maxHeight: 'minContent',
    overflowY: 'auto' as const
  };

  const dropdownItemStyle = {
    padding: '10px 16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderBottom: currentTheme === 'dark' ? '1px solid #374151' : '1px solid #E5E7EB',
    color: currentTheme === 'dark' ? '#F9FAFB' : '#1F2937',
    fontSize: '14px',
    transition: 'background-color 0.2s ease'
  };

  const selectedItemStyle = {
    ...dropdownItemStyle,
    backgroundColor: currentTheme === 'dark' ? '#374151' : '#F3F4F6',
    fontWeight: '600'
  };

  return (
    <>
      {isTestnet && (
        <div className="testnetBanner">
          <Caption>{t('attentionTestnet')}</Caption>
        </div>
      )}
      <div className="headerContainer" style={{marginBottom: '15px'}}>
        <Cell
          style={{ 
            margin: "0px 0px 10px 0px",
            backgroundColor: currentTheme === 'dark' ? '#121212' : '#ffffff',
            padding: '8px',
            position: 'relative'
          }}
          before={
  <div className="logoContainer">
    <a href="/"><img src={src} alt="TON Logo" className="logoImage" style={{background: 'white', borderRadius: '50%'}} /></a>
    <Title 
      weight="1" 
      style={{ 
        color: currentTheme === 'dark' ? '#ffffff' : '#1F2937',
        fontFamily: 'monospace',
        letterSpacing: '1px',
        cursor: 'pointer',
        position: 'relative'
      }}
      onClick={handleSubdomClick}
    >
      {t('subdom')}
      {/* Индикатор кликов (только для владельца) */}
      {isOwner && clickCount > 0 && (
        <span style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          backgroundColor: clickCount >= 5 ? '#10B981' : '#F59E0B',
          color: 'white',
          fontSize: '10px',
          fontWeight: 'bold',
          borderRadius: '50%',
          width: '16px',
          height: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'pulse 0.5s ease-in-out'
        }}>
          {clickCount}
        </span>
      )}
    </Title>
  </div>
}
          after={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }} ref={dropdownRef}>
              {/* Кнопка переключения языка с выпадающим списком */}
              <div style={{ position: 'relative' }}>
                <button 
                  style={goldButtonStyle}
                  onClick={toggleLanguageDropdown}
                  onMouseOver={(e) => {
                    e.currentTarget.style.boxShadow = currentTheme === 'dark' 
                      ? '0 0 12px rgba(255, 215, 0, 0.8)' 
                      : '0 0 12px #60A5FA';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.boxShadow = currentTheme === 'dark' 
                      ? '0 0 8px rgba(255, 215, 0, 0.4)' 
                      : '0 0 8px #60A5FA';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <span>{getLanguageFlag(language)}</span>
                  <span>{getLanguageName(language)}</span>
                  <svg 
                    width="12" 
                    height="12" 
                    viewBox="0 0 24 24" 
                    fill="currentColor"
                    style={{ 
                      transform: isLanguageDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s ease'
                    }}
                  >
                    <path d="M7 10l5 5 5-5z"/>
                  </svg>
                </button>
                
                {/* Выпадающий список языков */}
                {isLanguageDropdownOpen && (
                  <div style={dropdownStyle}>
                    {(['ru', 'en', 'zh', 'ja', 'hi', 'ar', 'es', 'it', 'de', 'fr'] as Language[]).map((lang) => (
                      <div
                        key={lang}
                        style={language === lang ? selectedItemStyle : dropdownItemStyle}
                        onClick={() => handleLanguageSelect(lang)}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = currentTheme === 'dark' ? '#374151' : '#F3F4F6';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = language === lang 
                            ? (currentTheme === 'dark' ? '#374151' : '#F3F4F6')
                            : 'transparent';
                        }}
                      >
                        <span style={{ fontSize: '16px' }}>{getLanguageFlag(lang)}</span>
                        <span>{getLanguageName(lang)}</span>
                        {language === lang && (
                          <svg 
                            width="14" 
                            height="14" 
                            viewBox="0 0 24 24" 
                            fill="currentColor"
                            style={{ marginLeft: 'auto' }}
                          >
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Кнопка переключения темы с иконками */}
              <button 
                style={goldButtonStyle}
                onClick={handleToggleTheme}
                onMouseOver={(e) => {
                  e.currentTarget.style.boxShadow = currentTheme === 'dark' 
                    ? '0 0 12px rgba(255, 215, 0, 0.8)' 
                    : '0 0 12px #60A5FA';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.boxShadow = currentTheme === 'dark' 
                    ? '0 0 8px rgba(255, 215, 0, 0.4)' 
                    : '0 0 8px #60A5FA';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {currentTheme === 'dark' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM6.34 5.16l-1.42 1.42c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.42-1.42c.39-.39.39-1.02 0-1.41-.38-.39-1.02-.39-1.41 0zm12.73 12.73l-1.42-1.42c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41l1.42 1.42c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41zm-14.14 0c-.39-.39-.39-1.02 0-1.41l1.42-1.42c.39-.39 1.02-.39 1.41 0 .39.39.39 1.02 0 1.41l-1.42 1.42c-.39.39-1.02.39-1.41 0zm12.73-12.73c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0l-1.42 1.42c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.42-1.42z"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9.37 5.51A7.35 7.35 0 0 0 9.1 7.5c0 4.08 3.32 7.4 7.4 7.4.68 0 1.35-.09 1.99-.27A7.014 7.014 0 0 1 12 19c-3.86 0-7-3.14-7-7 0-2.93 1.81-5.45 4.37-6.49zM12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>
                  </svg>
                )}
              </button>
            </div>
          }
        />
      </div>
    </>
  );
};

export default Header;
