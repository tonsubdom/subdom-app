// src/components/AlphaTestModal/AlphaTestModal.tsx
import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTonWallet } from '@tonconnect/ui-react';
import { useTonConnectUI } from '@tonconnect/ui-react';

interface AlphaTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'mainnet' | 'not-whitelisted';
  testnetAddress?: string;
}

const AlphaTestModal: React.FC<AlphaTestModalProps> = ({ 
  isOpen, 
  onClose, 
  type,
  testnetAddress 
}) => {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';
  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();

  const themeColors = {
    light: {
      background: "#FFFFFF",
      text: "#1F2937",
      border: "#E5E7EB",
      primary: "#3B82F6",
      error: "#EF4444",
      warning: "#F59E0B",
      overlay: "rgba(0, 0, 0, 0.5)",
      disconnect: "#DC2626"
    },
    dark: {
      background: "#1A1A1A",
      text: "#E5E5E5",
      border: "#333333",
      primary: "#FFD700",
      error: "#DC2626",
      warning: "#D97706",
      overlay: "rgba(0, 0, 0, 0.7)",
      disconnect: "#EF4444"
    }
  };

  const colors = themeColors[isDark ? "dark" : "light"];

  // Функция для отключения кошелька
  const handleDisconnect = async () => {
    try {
      await tonConnectUI.disconnect();
      console.log('✅ Кошелек отключен');
      onClose(); // Закрываем модальное окно после отключения
    } catch (error) {
      console.error('❌ Ошибка отключения кошелька:', error);
    }
  };

  if (!isOpen) return null;

  const getModalContent = () => {
    switch (type) {
      case 'mainnet':
        return {
          title: '⚠️ Mainnet недоступен',
          titleEn: '⚠️ Mainnet Unavailable',
          message: 'Альфа-тест проходит в testnet-сети, mainnet-сеть недоступна.',
          messageEn: 'Alpha testing is conducted in testnet network, mainnet is unavailable.',
          instruction: 'Если вы участник фокус-группы - пожалуйста, подключите testnet-кошелек.',
          instructionEn: 'If you are a focus group participant - please connect a testnet wallet.',
          icon: '🔴',
          color: colors.error
        };
      
      case 'not-whitelisted':
        return {
          title: '🚫 Доступ ограничен',
          titleEn: '🚫 Access Restricted',
          message: 'Ваш адрес кошелька не числится в списке адресов фокус-группы.',
          messageEn: 'Your wallet address is not listed in the focus group whitelist.',
          instruction: 'Пожалуйста, обратитесь к администратору:',
          instructionEn: 'Please contact the administrator:',
          telegramLink: 'https://t.me/ifyes',
          icon: '🟡',
          color: colors.warning,
          addressInfo: testnetAddress ? `Ваш адрес: ${testnetAddress.slice(0, 10)}...${testnetAddress.slice(-8)}` : undefined,
          addressInfoEn: testnetAddress ? `Your address: ${testnetAddress.slice(0, 10)}...${testnetAddress.slice(-8)}` : undefined
        };
      
      default:
        return {
          title: 'Информация',
          titleEn: 'Information',
          message: '',
          messageEn: '',
          instruction: '',
          instructionEn: '',
          icon: 'ℹ️',
          color: colors.primary
        };
    }
  };

  const content = getModalContent();

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.overlay,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={onClose}
      >
        {/* Modal */}
        <div
          style={{
            backgroundColor: colors.background,
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '450px',
            width: '100%',
            border: `1px solid ${colors.border}`,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'none',
              border: 'none',
              fontSize: '20px',
              color: colors.text,
              cursor: 'pointer',
              opacity: 0.7,
              transition: 'opacity 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
            onMouseOut={(e) => e.currentTarget.style.opacity = '0.7'}
          >
            ✕
          </button>

          {/* Icon */}
          <div
            style={{
              fontSize: '48px',
              textAlign: 'center',
              marginBottom: '16px'
            }}
          >
            {content.icon}
          </div>

          {/* Title */}
          <h3
            style={{
              margin: '0 0 12px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: colors.text,
              textAlign: 'center',
              fontFamily: 'monospace'
            }}
          >
            {content.title}
          </h3>

          {/* English title */}
          <h4
            style={{
              margin: '0 0 8px 0',
              fontSize: '14px',
              fontWeight: '500',
              color: colors.text,
              opacity: 0.8,
              textAlign: 'center',
              fontFamily: 'monospace',
              fontStyle: 'italic'
            }}
          >
            {content.titleEn}
          </h4>

          {/* Message */}
          <p
            style={{
              margin: '0 0 8px 0',
              fontSize: '14px',
              color: colors.text,
              opacity: 0.9,
              lineHeight: '1.5',
              textAlign: 'center'
            }}
          >
            {content.message}
          </p>

          {/* English message */}
          <p
            style={{
              margin: '0 0 16px 0',
              fontSize: '13px',
              color: colors.text,
              opacity: 0.7,
              lineHeight: '1.4',
              textAlign: 'center',
              fontStyle: 'italic'
            }}
          >
            {content.messageEn}
          </p>

          {/* Address info (if available) */}
          {content.addressInfo && (
            <>
              <div
                style={{
                  backgroundColor: isDark ? '#2A2A2A' : '#F3F4F6',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  marginBottom: '12px',
                  border: `1px solid ${colors.border}`
                }}
              >
                <p
                  style={{
                    margin: '0',
                    fontSize: '12px',
                    color: colors.text,
                    opacity: 0.8,
                    fontFamily: 'monospace',
                    textAlign: 'center'
                  }}
                >
                  {content.addressInfo}
                </p>
              </div>
              {/* English address info */}
              <div
                style={{
                  backgroundColor: isDark ? '#2A2A2A' : '#F3F4F6',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  border: `1px solid ${colors.border}`
                }}
              >
                <p
                  style={{
                    margin: '0',
                    fontSize: '11px',
                    color: colors.text,
                    opacity: 0.7,
                    fontFamily: 'monospace',
                    textAlign: 'center',
                    fontStyle: 'italic'
                  }}
                >
                  {content.addressInfoEn}
                </p>
              </div>
            </>
          )}

          {/* Instruction */}
          <p
            style={{
              margin: '0 0 12px 0',
              fontSize: '13px',
              color: colors.text,
              opacity: 0.8,
              lineHeight: '1.5',
              textAlign: 'center'
            }}
          >
            {content.instruction}
          </p>

          {/* English instruction */}
          <p
            style={{
              margin: '0 0 20px 0',
              fontSize: '12px',
              color: colors.text,
              opacity: 0.7,
              lineHeight: '1.4',
              textAlign: 'center',
              fontStyle: 'italic'
            }}
          >
            {content.instructionEn}
          </p>

          {/* Telegram link for not-whitelisted */}
          {content.telegramLink && (
            <div
              style={{
                textAlign: 'center',
                marginBottom: '20px'
              }}
            >
              <a
                href={content.telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  backgroundColor: colors.primary,
                  color: isDark ? '#000' : '#fff',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                  fontFamily: 'monospace',
                  transition: 'all 0.2s',
                  boxShadow: `0 4px 12px ${colors.primary}40`
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 6px 16px ${colors.primary}60`;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = `0 4px 12px ${colors.primary}40`;
                }}
              >
                📨 Перейти в Telegram / Go to Telegram
              </a>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: '12px',
            alignItems: 'center'
          }}>
            {/* Disconnect button (only if wallet is connected) */}
            {wallet && (
              <button
                onClick={handleDisconnect}
                style={{
                  backgroundColor: colors.disconnect,
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'monospace',
                  width: '100%',
                  maxWidth: '300px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 4px 12px ${colors.disconnect}80`;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <span>🔌</span>
                Отключить кошелек / Disconnect Wallet
              </button>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              style={{
                backgroundColor: 'transparent',
                color: colors.text,
                border: `1px solid ${colors.border}`,
                padding: '10px 24px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'monospace',
                width: '100%',
                maxWidth: '300px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = isDark ? '#2A2A2A' : '#F3F4F6';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Понятно / Understood
            </button>
          </div>

          {/* Help text */}
          <div style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: `1px solid ${colors.border}`,
            textAlign: 'center'
          }}>
            <p style={{
              margin: '0',
              fontSize: '11px',
              color: colors.text,
              opacity: 0.6,
              lineHeight: '1.4'
            }}>
              {wallet ? 
                'Отключите кошелек, чтобы подключить правильный / Disconnect wallet to connect the correct one' :
                'Подключите testnet кошелек из списка участников / Connect a testnet wallet from the participant list'
              }
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default AlphaTestModal;
