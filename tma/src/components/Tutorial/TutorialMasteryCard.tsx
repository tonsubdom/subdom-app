// tma/src/components/Tutorial/TutorialMasteryCard.tsx
//
// Первый экран при завершении обучения — до денежной части (LengthRevealCard
// с SBT-попыткой в подарок). Раньше юзер видел только сухой title/subtitle
// поверх лутбокс-карточки ("уже позади, забудьте") — юзер прямо сказал, что
// хочет ощущение прогресса и памяти о пройденном, как раньше давал степпер
// с цветастыми пунктами во время самого тура. Здесь — закреплённый снимок
// того, что реально сделано (с конкретными именами зон/субдоменов/etc, см.
// stepDetails), статус-бейдж и возможность поделиться этим "трофеем" —
// задел под будущие статусы выше "Освоился" (монетизация).
import React from 'react';
import { TUTORIAL_STEPS, TutorialStepId } from '@/contexts/TutorialContext';
import { getStepCopy } from '@/components/Tutorial/TutorialProgressPanel';
import { shareUrl } from '@/utils/urlParams';

interface TutorialMasteryCardProps {
  isDark: boolean;
  t: (key: string) => string;
  completedSteps: TutorialStepId[];
  stepDetails: Partial<Record<TutorialStepId, string>>;
  onClose: () => void;
  onNext: () => void;
}

export const TutorialMasteryCard: React.FC<TutorialMasteryCardProps> = ({
  isDark,
  t,
  completedSteps,
  stepDetails,
  onClose,
  onNext,
}) => {
  const stepCopy = getStepCopy(t);

  const handleShare = async () => {
    const url = `${window.location.origin}/#/?tutorial=1`;
    const title = t('tutorialShareTitle') || 'Я освоил TON DNS!';
    const text = t('tutorialShareText') || 'Прошёл обучение на @subdom — попробуй тоже:';
    await shareUrl(url, title, text, async () => {
      try {
        await navigator.clipboard.writeText(url);
        return true;
      } catch {
        return false;
      }
    });
  };

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
        @keyframes masteryCardFlyIn {
          0% { transform: perspective(900px) rotateY(-95deg) rotateX(8deg) scale(0.6); opacity: 0; }
          60% { transform: perspective(900px) rotateY(12deg) rotateX(-2deg) scale(1.04); opacity: 1; }
          100% { transform: perspective(900px) rotateY(0deg) rotateX(0deg) scale(1); opacity: 1; }
        }
        @keyframes masteryTrophyFloat {
          0%, 100% { transform: translateY(0px) rotateZ(-2deg); }
          50% { transform: translateY(-8px) rotateZ(2deg); }
        }
        @keyframes masteryGlow {
          0%, 100% { box-shadow: 0 0 25px 4px rgba(255,215,0,0.35), 0 20px 60px rgba(0,0,0,0.5); }
          50% { box-shadow: 0 0 45px 10px rgba(255,215,0,0.55), 0 20px 60px rgba(0,0,0,0.5); }
        }
        @keyframes masterySparkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>

      <div onClick={(e) => e.stopPropagation()} style={{ animation: 'masteryCardFlyIn 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both' }}>
        <div
          style={{
            animation: 'masteryGlow 2.4s ease-in-out infinite',
            width: '320px',
            maxWidth: '85vw',
            borderRadius: '20px',
            background: isDark
              ? 'linear-gradient(160deg, #1F2937 0%, #111827 100%)'
              : 'linear-gradient(160deg, #FFFFFF 0%, #EFF6FF 100%)',
            border: `2px solid ${isDark ? '#FFD700' : '#3B82F6'}`,
            padding: '26px 22px 22px',
            textAlign: 'center' as const,
            position: 'relative' as const,
            fontFamily: 'monospace',
          }}
        >
          <button
            onClick={onClose}
            aria-label={t('close') || 'Закрыть'}
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

          {/* Мультяшный кубок — не эмодзи, свой SVG с "лицом", чтобы не
              выглядело как дефолтный чатовский смайлик. */}
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
            <span style={{ position: 'absolute', left: '18%', top: '4px', fontSize: '14px', animation: 'masterySparkle 1.8s ease-in-out infinite' }}>✦</span>
            <span style={{ position: 'absolute', right: '16%', top: '18px', fontSize: '10px', animation: 'masterySparkle 1.8s ease-in-out infinite 0.6s' }}>✦</span>
            <svg
              width="76"
              height="76"
              viewBox="0 0 100 100"
              style={{ animation: 'masteryTrophyFloat 3.2s ease-in-out infinite' }}
            >
              <defs>
                <linearGradient id="masteryCupGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFE066" />
                  <stop offset="100%" stopColor="#FFA500" />
                </linearGradient>
              </defs>
              {/* Ручки */}
              <path d="M22 28 C8 28 8 50 24 52" fill="none" stroke="url(#masteryCupGold)" strokeWidth="6" strokeLinecap="round" />
              <path d="M78 28 C92 28 92 50 76 52" fill="none" stroke="url(#masteryCupGold)" strokeWidth="6" strokeLinecap="round" />
              {/* Чаша */}
              <path d="M26 24 H74 L68 56 C68 68 32 68 32 56 Z" fill="url(#masteryCupGold)" stroke="#B8860B" strokeWidth="2.5" />
              {/* Ножка */}
              <rect x="46" y="66" width="8" height="12" fill="#B8860B" />
              <rect x="34" y="78" width="32" height="8" rx="3" fill="#B8860B" />
              {/* Мультяшное лицо на чаше */}
              <circle cx="42" cy="38" r="3.2" fill="#3d2b00" />
              <circle cx="58" cy="38" r="3.2" fill="#3d2b00" />
              <path d="M40 47 Q50 54 60 47" fill="none" stroke="#3d2b00" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>

          <div
            style={{
              display: 'inline-block',
              fontSize: '12px',
              fontWeight: 700,
              color: isDark ? '#000' : '#fff',
              background: isDark ? '#FFD700' : '#3B82F6',
              padding: '4px 14px',
              borderRadius: '20px',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.5px',
              marginBottom: '12px',
            }}
          >
            🏆 {t('tutorialMasteredStatus') || 'Освоился'}
          </div>

          <div style={{ fontSize: '12px', color: isDark ? '#D1D5DB' : '#374151', marginBottom: '14px', lineHeight: 1.5 }}>
            {t('tutorialMasteredSubtitle') || 'Ты прошёл весь путь TON DNS. Вот что осталось на память:'}
          </div>

          {/* Скроллящийся список — снимок конкретных действий, а не просто
              галочки, чтобы реально осталось как память об опыте. */}
          <div
            style={{
              maxHeight: '190px',
              overflowY: 'auto' as const,
              textAlign: 'left' as const,
              borderRadius: '14px',
              border: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
              background: isDark ? '#0D0D0D' : '#FFFFFF',
              padding: '12px 14px',
              marginBottom: '18px',
            }}
          >
            {TUTORIAL_STEPS.map((step, i) => {
              const done = completedSteps.includes(step);
              const detail = stepDetails[step];
              return (
                <div
                  key={step}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '6px 0',
                    borderBottom: i < TUTORIAL_STEPS.length - 1 ? `1px solid ${isDark ? '#1F2937' : '#F3F4F6'}` : 'none',
                  }}
                >
                  <span style={{ fontSize: '13px', flexShrink: 0, marginTop: '1px' }}>{done ? '✅' : '▫️'}</span>
                  <span style={{ fontSize: '12px', color: isDark ? '#F9FAFB' : '#1F2937', lineHeight: 1.4 }}>
                    {stepCopy[step].title}
                    {detail && (
                      <span style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>: {detail}</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleShare}
              style={{
                flex: 1,
                padding: '12px 10px',
                borderRadius: '10px',
                border: `1px solid ${isDark ? '#FFD700' : '#3B82F6'}`,
                background: 'transparent',
                color: isDark ? '#FFD700' : '#3B82F6',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              📤 {t('tutorialShareButton') || 'Поделиться'}
            </button>
            <button
              onClick={onNext}
              style={{
                flex: 1,
                padding: '12px 10px',
                borderRadius: '10px',
                border: 'none',
                background: isDark
                  ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
                  : 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
                color: isDark ? '#000' : '#fff',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {t('tutorialNext') || 'Далее'} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialMasteryCard;
