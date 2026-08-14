// tma/src/components/Tutorial/TutorialEntryWidget.tsx
//
// Зеркало SearchWidget.tsx (тот же WIDGET_SIZE/позиция под хедером), но
// слева и без поиска — просто вход в обучалку. Если тур уже начинали,
// повторный клик НЕ переспрашивает "начать?" заново — сразу продолжает с
// места остановки (см. TutorialContext.openEntry).
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTonWallet } from '@tonconnect/ui-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTutorial } from '@/contexts/TutorialContext';
import { LengthRevealCard } from '@/components/PromoRevealModal/LengthRevealCard';
import { TutorialProgressPanel } from '@/components/Tutorial/TutorialProgressPanel';
import { TutorialMasteryCard } from '@/components/Tutorial/TutorialMasteryCard';
import ConnectWalletPrompt from '@/components/ConnectWalletPrompt/ConnectWalletPrompt';

const WIDGET_SIZE = 60;

export const TutorialEntryWidget: React.FC = () => {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';
  const { t } = useLanguage();
  const navigate = useNavigate();
  const tutorial = useTutorial();
  const wallet = useTonWallet();
  const [showCompletedHint, setShowCompletedHint] = useState(false);
  const [showConnectPrompt, setShowConnectPrompt] = useState(false);
  // Карточка "Освоился" (снимок пройденных шагов) показывается ПЕРВОЙ, до
  // денежной части (LengthRevealCard с SBT-попыткой) — юзер сначала видит
  // закреплённый прогресс, потом уже награду. Сбрасывается на каждый новый
  // showRewardReveal, а не остаётся залипшей после первого показа.
  const [showMasteryCard, setShowMasteryCard] = useState(false);
  const prevShowRewardRevealRef = React.useRef(false);
  React.useEffect(() => {
    if (tutorial.showRewardReveal && !prevShowRewardRevealRef.current) {
      setShowMasteryCard(true);
    }
    prevShowRewardRevealRef.current = tutorial.showRewardReveal;
  }, [tutorial.showRewardReveal]);

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
    // startTutorial() молча return'ится без кошелька (нет walletAddress) —
    // раньше клик по "Старт" без коннекта просто ничего не делал.
    if (!wallet) {
      tutorial.closeIntroModal();
      setShowConnectPrompt(true);
      return;
    }
    // startTutorial() сам открывает виджет профиля (первый незавершённый
    // шаг всегда "профиль" при свежем старте) — навигация не нужна здесь.
    await tutorial.startTutorial();
  };

  const handleRewardCta = () => {
    tutorial.dismissRewardReveal();
    navigate('/create-collection?promo=sbt');
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
    // Ниже ProfileWidget (панель — 999, кнопка-аватар — 998), чтобы
    // раскрытый профиль не перекрывался этим виджетом сверху. Внутренний
    // intro-модал (zIndex 1001 ниже) остаётся выше всего — это полноэкранный
    // оверлей, открывается явным кликом, а не пассивно висит поверх профиля.
    <div style={{ position: 'fixed', top: '64px', left: '20px', zIndex: 900 }}>
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
        }}
      >
        {/* Контурная "шапка выпускника" — тем же стилем (stroke=colors.text,
            без заливки), что и лупа в SearchWidget, эмодзи 🎓 плохо видно на
            тёмном фоне ("чёрное на чёрном", по фидбэку юзера вживую). */}
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3 2 8l10 5 10-5-10-5z" />
          <path d="M6 10.5V16c0 1.5 2.5 3 6 3s6-1.5 6-3v-5.5" />
          <path d="M22 8v6" />
        </svg>
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

      <TutorialProgressPanel />

      {showConnectPrompt && (
        <div
          onClick={() => setShowConnectPrompt(false)}
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
              maxWidth: '320px',
              width: '100%',
              boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
            }}
          >
            <ConnectWalletPrompt subtitle={t('connectWalletFirstFromIndexSubtitle') || 'Этот раздел доступен только подключённым пользователям — подключите кошелёк, чтобы продолжить.'} />
          </div>
        </div>
      )}

      {tutorial.showRewardReveal && tutorial.rewardLength && showMasteryCard && (
        <TutorialMasteryCard
          isDark={isDark}
          t={t}
          completedSteps={tutorial.completedSteps}
          stepDetails={tutorial.stepDetails}
          onClose={() => {
            setShowMasteryCard(false);
            tutorial.dismissRewardReveal();
          }}
          onNext={() => setShowMasteryCard(false)}
        />
      )}

      {tutorial.showRewardReveal && tutorial.rewardLength && !showMasteryCard && (
        <LengthRevealCard
          length={Number(tutorial.rewardLength)}
          zoneType="sbt"
          variant="gift"
          isDark={isDark}
          t={t}
          onClose={tutorial.dismissRewardReveal}
          onCta={handleRewardCta}
          title={t('tutorialCompleteRevealTitle') || 'Обучение пройдено!'}
          subtitle={t('tutorialCompleteRevealSubtitle') || 'В награду вам подарена бесплатная попытка создать SBT-зону:'}
        />
      )}
    </div>
  );
};

export default TutorialEntryWidget;
