// tma/src/components/Tutorial/TutorialEntryWidget.tsx
//
// Зеркало SearchWidget.tsx (тот же WIDGET_SIZE/позиция под хедером), но
// слева и без поиска — просто вход в обучалку. Если тур уже начинали,
// повторный клик НЕ переспрашивает "начать?" заново — сразу продолжает с
// места остановки (см. TutorialContext.openEntry).
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTutorial } from '@/contexts/TutorialContext';
import { TutorialTooltip } from './TutorialTooltip';

const WIDGET_SIZE = 60;

export const TutorialEntryWidget: React.FC = () => {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';
  const { t } = useLanguage();
  const navigate = useNavigate();
  const tutorial = useTutorial();
  const [showCompletedHint, setShowCompletedHint] = useState(false);

  const colors = {
    text: isDark ? '#F9FAFB' : '#1F2937',
    textSecondary: isDark ? '#9CA3AF' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
    panelBg: isDark ? 'rgba(17,24,39,0.92)' : 'rgba(255,255,255,0.96)',
    triggerBg: isDark ? 'rgba(17,24,39,0.55)' : 'rgba(255,255,255,0.6)',
    accent: isDark ? '#FFD700' : '#3B82F6',
    accentText: isDark ? '#000000' : '#FFFFFF',
  };

  const handleStart = async () => {
    await tutorial.startTutorial();
    navigate('/avatar-secret');
  };

  const handleWidgetClick = () => {
    if (tutorial.rewardGranted) {
      setShowCompletedHint(true);
      window.setTimeout(() => setShowCompletedHint(false), 2500);
      return;
    }
    tutorial.openEntry();
  };

  return (
    <div style={{ position: 'fixed', top: '64px', left: '20px', zIndex: 1000 }}>
      <button
        onClick={handleWidgetClick}
        title={t('tutorialWidgetTitle') || 'Пройти обучение'}
        style={{
          width: `${WIDGET_SIZE}px`,
          height: `${WIDGET_SIZE}px`,
          borderRadius: '50%',
          border: 'none',
          background: colors.triggerBg,
          backdropFilter: 'blur(6px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
        }}
      >
        🎓
      </button>

      {showCompletedHint && (
        <div
          style={{
            position: 'absolute',
            top: `${WIDGET_SIZE + 8}px`,
            left: 0,
            padding: '8px 12px',
            borderRadius: '10px',
            background: colors.panelBg,
            border: `1px solid ${colors.border}`,
            color: colors.text,
            fontSize: '12px',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          }}
        >
          {t('tutorialAlreadyCompleted') || 'Обучение уже пройдено 🎓'}
        </div>
      )}

      {tutorial.showIntroModal && (
        <div
          onClick={tutorial.closeIntroModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: colors.panelBg,
              border: `1px solid ${colors.border}`,
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '320px',
              textAlign: 'center',
              boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
            }}
          >
            <p style={{ color: colors.text, fontSize: '14px', lineHeight: 1.5, marginBottom: '20px' }}>
              {t('tutorialIntroQuestion') || 'Вы желаете пройти обучение и освоить широкий функционал TON DNS?'}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={handleStart}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: colors.accent,
                  color: colors.accentText,
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {t('tutorialStart') || 'Старт'}
              </button>
              <button
                onClick={tutorial.closeIntroModal}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.text,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {t('tutorialExit') || 'Выйти'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Блок 2-5 ещё не собраны (следующие сессии) — как только пройден
          блок 1, честно говорим об этом вместо того, чтобы молча зависнуть
          на недостроенном туре. */}
      {tutorial.active && tutorial.isStepDone('domain_answered') && !tutorial.isStepDone('zone_selected') && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: '80px', display: 'flex', justifyContent: 'center', zIndex: 1002, padding: '0 16px' }}>
          <TutorialTooltip
            text={t('tutorialBlock1Done') || 'Блок 1 пройден. Продолжение обучения появится совсем скоро!'}
            buttons={[{ label: t('tutorialExit') || 'Выйти', primary: true, onClick: tutorial.exitTutorial }]}
            style={{ position: 'static' }}
          />
        </div>
      )}
    </div>
  );
};

export default TutorialEntryWidget;
