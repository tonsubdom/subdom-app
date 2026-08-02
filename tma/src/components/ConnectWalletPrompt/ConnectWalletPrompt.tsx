// src/components/ConnectWalletPrompt/ConnectWalletPrompt.tsx
//
// Единая точка входа для "подключите кошелёк" на любой странице/виджете.
// НЕ рендерит свою <TonConnectButton /> — @tonconnect/ui-react полноценно
// работает только с одним экземпляром этой кнопки на всё приложение
// (второй превращается в мёртвый виджет, и то, какой из двух "живой",
// зависит от того, что смонтировалось последним — баг, найденный
// 2026-08-02 в связке ChatWidget/ProfileWidget). Канонический видимый
// TonConnectButton остаётся только в ProfileWidget; здесь — просто кнопка,
// вызывающая tonConnectUI.openModal() того же общего инстанса.
import React from 'react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

const themeColors = {
  light: {
    primary: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
    text: '#1F2937',
    shadow: 'rgba(59, 130, 246, 0.4)',
  },
  dark: {
    primary: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
    text: '#E5E5E5',
    shadow: 'rgba(255, 215, 0, 0.4)',
  },
};

interface ConnectWalletPromptProps {
  subtitle?: string;
}

const ConnectWalletPrompt: React.FC<ConnectWalletPromptProps> = ({ subtitle }) => {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';
  const colors = themeColors[isDark ? 'dark' : 'light'];
  const { t } = useLanguage();
  const [tonConnectUI] = useTonConnectUI();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '48px 24px',
        gap: '8px',
      }}
    >
      <div style={{ fontSize: '40px', marginBottom: '4px' }}>🔌</div>
      <h3
        style={{
          margin: 0,
          fontSize: '16px',
          fontFamily: 'monospace',
          color: colors.text,
        }}
      >
        {t('connectWalletFirstTitle')}
      </h3>
      <p
        style={{
          margin: '0 0 16px 0',
          fontSize: '12px',
          fontFamily: 'monospace',
          color: colors.text,
          opacity: 0.7,
        }}
      >
        {subtitle ?? t('connectWalletFirstSubtitle')}
      </p>
      <button
        onClick={() => tonConnectUI.openModal()}
        style={{
          background: colors.primary,
          color: isDark ? '#000' : '#fff',
          border: 'none',
          outline: 'none',
          padding: '10px 24px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 600,
          fontFamily: 'monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          boxShadow: `0 0 10px ${colors.shadow}`,
          cursor: 'pointer',
        }}
      >
        {t('connectWalletFirstButton')}
      </button>
    </div>
  );
};

export default ConnectWalletPrompt;
