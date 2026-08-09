// tma/src/components/Tutorial/TutorialProgressPanel.tsx
//
// Раскрывающаяся панель прогресса обучалки — открывается вместо немедленного
// resumeStep() при клике на TutorialEntryWidget/бейдж награды, чтобы юзер не
// улетал молча по потенциально сбившейся цепочке шагов (см. Log.md
// 2026-08-09, гонка walletAddress в TutorialContext). Ряд кружков-индикаторов
// (пройден/текущий/заблокирован) + под ним полное название и описание
// ПРОСМАТРИВАЕМОГО шага — по умолчанию текущий незавершённый, но пройденные
// кружки кликабельны, чтобы посмотреть, что уже сделано. Кнопка "Выполнить"
// реально переходит на страницу шага (тот же resumeStep()) и есть только у
// текущего шага — по пройденным идёт просто предпросмотр.
import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTutorial, TUTORIAL_STEPS, TutorialStepId } from '@/contexts/TutorialContext';

interface StepCopy {
  title: string;
  description: string;
}

// Отдельно от текстов подсказок над инпутами (те завязаны на конкретный
// элемент интерфейса) — здесь нужен более общий пересказ "что за шаг", не
// заточенный под один конкретный виджет на странице.
const STEP_COPY: Record<TutorialStepId, StepCopy> = {
  domain_answered: {
    title: 'Указать домен',
    description: 'Ответьте, есть ли у вас .ton домен — от этого зависит, с чего начнётся тур.',
  },
  zone_selected: {
    title: 'Создать зону',
    description: 'Задеплойте свою субдоменную .ton-зону — бесплатная попытка уже начислена.',
  },
  subdomain_created: {
    title: 'Создать субдомен',
    description: 'Зарегистрируйте первый субдомен внутри только что созданной зоны.',
  },
  profile_saved: {
    title: 'Настроить блокчейн-профиль',
    description: 'Заполните аватар, описание и категорию — это видно в других dApp-приложениях.',
  },
  site_visited: {
    title: 'Создать сайт',
    description: 'Оформите свой tonsite через конструктор сайтов — пара кликов через бота.',
  },
  torrent_created: {
    title: 'Создать торрент',
    description: 'Загрузите файлы и получите bagID через TON Storage.',
  },
  market_toured: {
    title: 'Посмотреть Маркет',
    description: 'Загляните на витрину всех зон и субдоменов платформы.',
  },
  catalog_focused: {
    title: 'Открыть каталог сайтов',
    description: 'Откройте TonSite Catalog — каталог всех .ton-сайтов с превью.',
  },
  profile_tabs_toured: {
    title: 'Изучить вкладки профиля',
    description: 'Короткий тур по вкладкам виджета профиля: зоны, субдомены, аукционы, инфо.',
  },
};

export const TutorialProgressPanel: React.FC = () => {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';
  const { t } = useLanguage();
  const tutorial = useTutorial();

  const currentIndex = tutorial.completedSteps.length >= TUTORIAL_STEPS.length
    ? TUTORIAL_STEPS.length - 1
    : TUTORIAL_STEPS.findIndex((step) => !tutorial.isStepDone(step));
  const allDone = tutorial.completedSteps.length >= TUTORIAL_STEPS.length;

  const [viewedIndex, setViewedIndex] = useState(currentIndex);

  // Панель переоткрывают на каждый клик по виджету — сбрасываем просмотр на
  // актуальный текущий шаг, а не оставляем то, что юзер листал прошлый раз.
  useEffect(() => {
    if (tutorial.showProgressPanel) setViewedIndex(currentIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorial.showProgressPanel]);

  if (!tutorial.showProgressPanel) return null;

  const colors = {
    text: isDark ? '#F9FAFB' : '#1F2937',
    textSecondary: isDark ? '#9CA3AF' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
    panelBg: isDark ? 'rgba(17,24,39,0.96)' : 'rgba(255,255,255,0.98)',
    accent: isDark ? '#FFD700' : '#3B82F6',
    accentText: isDark ? '#000000' : '#FFFFFF',
    done: '#4caf50',
    locked: isDark ? '#374151' : '#E5E7EB',
  };

  const viewedStep = TUTORIAL_STEPS[viewedIndex];
  const copy = STEP_COPY[viewedStep];
  const remaining = TUTORIAL_STEPS.length - tutorial.completedSteps.length;

  const handleExecute = () => {
    tutorial.closeProgressPanel();
    tutorial.resumeStep();
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: '68px',
        left: 0,
        width: '300px',
        maxWidth: 'calc(100vw - 40px)',
        borderRadius: '16px',
        background: colors.panelBg,
        border: `1px solid ${colors.accent}`,
        boxShadow: '0 8px 28px rgba(0,0,0,0.35)',
        padding: '14px 16px',
        zIndex: 950,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: colors.text, lineHeight: 1.3 }}>
          {allDone
            ? (t('tutorialAllStepsDone') || 'Все шаги пройдены 🎉')
            : (t('tutorialStepsRemaining') || `Ещё ${remaining} ${remaining === 1 ? 'шаг' : 'шагов'} до +1 SBT попытки`)}
        </span>
        <button
          onClick={tutorial.closeProgressPanel}
          aria-label={t('close') || 'Закрыть'}
          style={{
            background: 'none',
            border: 'none',
            color: colors.textSecondary,
            fontSize: '16px',
            lineHeight: 1,
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>

      {/* Ряд кружков-индикаторов — пройденные и текущий кликабельны для
          просмотра, будущие заблокированы (нечего ещё смотреть). */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
        {TUTORIAL_STEPS.map((step, i) => {
          const done = tutorial.isStepDone(step);
          const isCurrent = i === currentIndex;
          const clickable = done || isCurrent;
          const isViewed = i === viewedIndex;
          return (
            <React.Fragment key={step}>
              {i > 0 && <div style={{ width: '10px', height: '1px', background: colors.border, flexShrink: 0 }} />}
              <button
                onClick={() => clickable && setViewedIndex(i)}
                disabled={!clickable}
                title={STEP_COPY[step].title}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  flexShrink: 0,
                  border: isViewed ? `2px solid ${colors.accent}` : '2px solid transparent',
                  background: done ? colors.done : isCurrent ? colors.accent : colors.locked,
                  color: done || isCurrent ? colors.accentText : colors.textSecondary,
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: clickable ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {done ? '✓' : i + 1}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: colors.text }}>
          {t('step') || 'Шаг'} {viewedIndex + 1}: {copy.title}
        </span>
        <span style={{ fontSize: '12px', lineHeight: 1.5, color: colors.textSecondary }}>
          {copy.description}
        </span>
      </div>

      {viewedIndex === currentIndex ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={handleExecute}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: 'none',
              background: colors.accent,
              color: colors.accentText,
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {allDone ? (t('tutorialFinish') || 'Завершить') : (t('tutorialExecuteStep') || 'Выполнить')}
          </button>
          <button
            onClick={tutorial.closeProgressPanel}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.text,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {t('tutorialLater') || 'Позже'}
          </button>
        </div>
      ) : viewedIndex !== currentIndex ? (
        <span style={{ fontSize: '11px', color: colors.done, fontWeight: 700 }}>
          ✓ {t('tutorialStepAlreadyDone') || 'Шаг уже пройден'}
        </span>
      ) : null}
    </div>
  );
};

export default TutorialProgressPanel;
