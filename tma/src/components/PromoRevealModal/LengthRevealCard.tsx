// tma/src/components/PromoRevealModal/LengthRevealCard.tsx
//
// Общая "лутбокс"-карточка реролла — 3D flip-in + парение + свечение.
// Два варианта переиспользования:
// - 'gift': PromoRevealModal, юзер только что зарегистрировался и получил
//   промо-попытку (см. UserContext.promoRevealLength).
// - 'purchased': PaymentAttemptsSection, юзер только что купил конкретную
//   попытку в секции оплаты — та же "выпало!"-анимация, но за реальные
//   деньги, не в подарок (юзер попросил показывать её и там тоже).

import React from 'react';
import TonLogo from '@/components/Header/ton.svg';

const sbtPrices: Record<number, number> = { 4: 5, 5: 2.5, 6: 2, 7: 1.5, 8: 1, 9: 0.5 };
const proxyPrices: Record<number, number> = { 4: 100, 5: 50, 6: 40, 7: 30, 8: 20, 9: 10 };

interface LengthRevealCardProps {
  length: number;
  zoneType: 'proxy' | 'sbt';
  variant: 'gift' | 'purchased';
  isDark: boolean;
  t: (key: string) => string;
  onClose: () => void;
  onCta: () => void;
  // Только для варианта 'gift' — вход в обучалку прямо с карточки промо-
  // попытки. Награда за прохождение обучалки — тоже случайная SBT-попытка
  // (см. TutorialContext/POST /api/tutorial/complete), отсюда "+1" в подписи.
  onStartTutorial?: () => void;
  // Override дефолтного текста заголовка/подзаголовка варианта 'gift' — тот
  // же компонент переиспользуется в TutorialEntryWidget для награды за
  // ПРОХОЖДЕНИЕ обучалки, где "Действует акция!" (текст для промо за
  // регистрацию) не подходит по смыслу.
  title?: string;
  subtitle?: string;
}

export const LengthRevealCard: React.FC<LengthRevealCardProps> = ({
  length,
  zoneType,
  variant,
  isDark,
  t,
  onClose,
  onCta,
  onStartTutorial,
  title,
  subtitle,
}) => {
  const price = (zoneType === 'sbt' ? sbtPrices : proxyPrices)[length] ?? 0;
  const isGift = variant === 'gift';

  return (
    <div
      onClick={onClose}
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
        @keyframes revealCardFlyIn {
          0% { transform: perspective(900px) rotateY(-95deg) rotateX(8deg) scale(0.6); opacity: 0; }
          60% { transform: perspective(900px) rotateY(12deg) rotateX(-2deg) scale(1.04); opacity: 1; }
          100% { transform: perspective(900px) rotateY(0deg) rotateX(0deg) scale(1); opacity: 1; }
        }
        @keyframes revealCardFloat {
          0%, 100% { transform: translateY(0px) rotateZ(-0.6deg); }
          50% { transform: translateY(-10px) rotateZ(0.6deg); }
        }
        @keyframes revealGlow {
          0%, 100% { box-shadow: 0 0 25px 4px rgba(255,215,0,0.35), 0 20px 60px rgba(0,0,0,0.5); }
          50% { box-shadow: 0 0 45px 10px rgba(255,215,0,0.55), 0 20px 60px rgba(0,0,0,0.5); }
        }
      `}</style>

      <div onClick={(e) => e.stopPropagation()} style={{ animation: 'revealCardFlyIn 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both' }}>
        <div
          style={{
            animation: 'revealCardFloat 3.5s ease-in-out infinite, revealGlow 2.4s ease-in-out infinite',
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
            onClick={onClose}
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

          <div style={{ fontSize: '48px', marginBottom: '8px' }}>{isGift ? '🎁' : '🔓'}</div>

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
            {title || (isGift
              ? t('promoRevealTitle') || 'Действует акция!'
              : t('purchaseRevealTitle') || 'Успешно приобретено!')}
          </div>

          <div style={{ fontSize: '13px', color: isDark ? '#D1D5DB' : '#374151', marginBottom: '16px', lineHeight: 1.5 }}>
            {subtitle || (isGift
              ? t('promoRevealSubtitle') || 'Тебе подарена бесплатная попытка создать SBT-зону:'
              : (t('purchaseRevealSubtitle') || 'Открыта попытка создать {type}-зону:').replace(
                  '{type}',
                  zoneType === 'sbt' ? 'SBT' : 'Proxy'
                ))}
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
              {length} {t('chars') || 'символов'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <span
                style={{
                  fontSize: '13px',
                  color: isGift ? '#9CA3AF' : (isDark ? '#F9FAFB' : '#1F2937'),
                  textDecoration: isGift ? 'line-through' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
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
                {isGift ? t('promoRevealFree') || 'БЕСПЛАТНО' : t('purchaseRevealPaid') || '✓ ОПЛАЧЕНО'}
              </span>
            </div>
          </div>

          {isGift && onStartTutorial && (
            <div
              style={{
                fontSize: '11px',
                lineHeight: 1.5,
                color: isDark ? '#9CA3AF' : '#6B7280',
                marginBottom: '8px',
                textAlign: 'left',
              }}
            >
              {t('tutorialPromoDescription') ||
                'Вы можете пройти обучение по приложению. Вы освоите: настройку ончейн-профиля, создание зон и субдоменов, публикацию сайта и торрента, маркет и другие возможности платформы.'}
            </div>
          )}

          {isGift && onStartTutorial && (
            <button
              onClick={onStartTutorial}
              style={{
                width: '100%',
                padding: '11px 16px',
                borderRadius: '10px',
                border: `1px solid ${isDark ? '#FFD700' : '#3B82F6'}`,
                background: 'transparent',
                color: isDark ? '#FFD700' : '#3B82F6',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                marginBottom: '10px',
              }}
            >
              🎓 {t('tutorialPromoButton') || 'Пройти обучение'} (+1 🎫)
            </button>
          )}

          <button
            onClick={onCta}
            style={{
              width: '100%',
              padding: '13px 16px',
              borderRadius: '10px',
              border: 'none',
              background: isDark
                ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
                : 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
              color: isDark ? '#000' : '#fff',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            {isGift
              ? t('promoRevealCta') || 'Создать SBT-зону'
              : t('purchaseRevealCta') || `Создать ${zoneType === 'sbt' ? 'SBT' : 'Proxy'}-зону`}{' '}
            →
          </button>
        </div>
      </div>
    </div>
  );
};

export default LengthRevealCard;
