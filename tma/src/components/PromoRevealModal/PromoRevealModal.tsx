// tma/src/components/PromoRevealModal/PromoRevealModal.tsx
//
// Показывается ровно один раз — сразу после того, как юзер В ЭТОЙ СЕССИИ
// впервые подключил кошелёк и на бэкенде реально создалась новая строка в
// users (см. server-sqlite.ts POST /api/users, промо-акция "подарена
// бесплатная SBT-попытка случайной длины"). Состояние в UserContext
// (promoRevealLength) намеренно не персистится — при обычном заходе в уже
// зарегистрированный аккаунт модалка не всплывает снова.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import TonLogo from '@/components/Header/ton.svg';

const sbtPrices: Record<number, number> = {
  4: 5,
  5: 2.5,
  6: 2,
  7: 1.5,
  8: 1,
  9: 0.5,
};

export const PromoRevealModal: React.FC = () => {
  const { promoRevealLength, dismissPromoReveal } = useUser();
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';
  const { t } = useLanguage();
  const navigate = useNavigate();

  if (!promoRevealLength) return null;

  const price = sbtPrices[promoRevealLength] ?? 0;

  const goCreate = () => {
    dismissPromoReveal();
    navigate('/create-collection?promo=sbt');
  };

  return (
    <div
      onClick={dismissPromoReveal}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 20000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <style>{`
        @keyframes promoCardFlyIn {
          0% { transform: perspective(900px) rotateY(-95deg) rotateX(8deg) scale(0.6); opacity: 0; }
          60% { transform: perspective(900px) rotateY(12deg) rotateX(-2deg) scale(1.04); opacity: 1; }
          100% { transform: perspective(900px) rotateY(0deg) rotateX(0deg) scale(1); opacity: 1; }
        }
        @keyframes promoCardFloat {
          0%, 100% { transform: translateY(0px) rotateZ(-0.6deg); }
          50% { transform: translateY(-10px) rotateZ(0.6deg); }
        }
        @keyframes promoGlow {
          0%, 100% { box-shadow: 0 0 25px 4px rgba(255,215,0,0.35), 0 20px 60px rgba(0,0,0,0.5); }
          50% { box-shadow: 0 0 45px 10px rgba(255,215,0,0.55), 0 20px 60px rgba(0,0,0,0.5); }
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'promoCardFlyIn 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both',
        }}
      >
        <div
          style={{
            animation: 'promoCardFloat 3.5s ease-in-out infinite, promoGlow 2.4s ease-in-out infinite',
            width: '300px',
            maxWidth: '85vw',
            borderRadius: '20px',
            background: isDark
              ? 'linear-gradient(160deg, #1F2937 0%, #111827 100%)'
              : 'linear-gradient(160deg, #FFFFFF 0%, #EFF6FF 100%)',
            border: `2px solid ${isDark ? '#FFD700' : '#3B82F6'}`,
            padding: '28px 22px',
            textAlign: 'center' as const,
            position: 'relative' as const,
            fontFamily: 'monospace',
          }}
        >
          <button
            onClick={dismissPromoReveal}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: 'none',
              background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
              color: isDark ? '#F9FAFB' : '#1F2937',
              cursor: 'pointer',
              fontSize: '14px',
              lineHeight: '28px',
            }}
          >
            ✕
          </button>

          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎁</div>

          <div
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: isDark ? '#FFD700' : '#3B82F6',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.5px',
              marginBottom: '10px',
            }}
          >
            {t('promoRevealTitle') || 'Действует акция!'}
          </div>

          <div
            style={{
              fontSize: '13px',
              color: isDark ? '#D1D5DB' : '#374151',
              marginBottom: '16px',
              lineHeight: 1.5,
            }}
          >
            {t('promoRevealSubtitle') || 'Тебе подарена бесплатная попытка создать SBT-зону:'}
          </div>

          <div
            style={{
              borderRadius: '14px',
              border: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
              background: isDark ? '#0D0D0D' : '#FFFFFF',
              padding: '16px',
              marginBottom: '18px',
            }}
          >
            <div style={{ fontSize: '12px', color: isDark ? '#9CA3AF' : '#6B7280', marginBottom: '6px' }}>
              {t('paymentAttemptsZoneLength') || 'Длина'}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: isDark ? '#F9FAFB' : '#1F2937', marginBottom: '10px' }}>
              {promoRevealLength} {t('chars') || 'символов'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', color: '#9CA3AF', textDecoration: 'line-through', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {price}
                <img src={TonLogo} alt="" style={{ width: '11px', height: '11px' }} />
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'white',
                  background: '#10B981',
                  padding: '3px 10px',
                  borderRadius: '20px',
                }}
              >
                {t('promoRevealFree') || 'БЕСПЛАТНО'}
              </span>
            </div>
          </div>

          <button
            onClick={goCreate}
            style={{
              width: '100%',
              padding: '13px 16px',
              borderRadius: '10px',
              border: 'none',
              background: isDark ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' : 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
              color: isDark ? '#000' : '#fff',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            {t('promoRevealCta') || 'Создать SBT-зону'} →
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromoRevealModal;
