// tma/src/components/Tutorial/TutorialTooltip.tsx
//
// Пузырь-подсказка обучалки: текст шага + кнопки (обычно "Далее"/"Выйти",
// на шаге вопроса про домен — "Да"/"Нет"). Стиль — по образцу тултипа
// onboarding-подсказки в ProfileWidget.tsx (~4959-5001), но как отдельный
// переиспользуемый компонент, чтобы не дублировать разметку на каждой
// странице, которая участвует в туре.
import React, { CSSProperties, ReactNode } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface TutorialTooltipButton {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

interface TutorialTooltipProps {
  text: string;
  buttons: TutorialTooltipButton[];
  // "Блок N" сверху, помельче и приглушённым цветом — над самим текстом
  // шага. Шаги нумеруются заново в каждом блоке (Шаг 1, Шаг 2, ...), а не
  // сквозным счётчиком по всей обучалке — так проще ориентироваться.
  blockLabel?: string;
  stepLabel?: string;
  // Позиционирование — тултип сам position:absolute/fixed, родитель решает,
  // где именно (обычно position:relative-контейнер вокруг подсвечиваемого
  // элемента + position="bottom"/"top" тут).
  style?: CSSProperties;
  icon?: ReactNode;
}

export const TutorialTooltip: React.FC<TutorialTooltipProps> = ({ text, buttons, blockLabel, stepLabel, style, icon }) => {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';

  const colors = {
    text: isDark ? '#F9FAFB' : '#1F2937',
    background: isDark ? '#111827' : '#FFFFFF',
    accent: isDark ? '#FFD700' : '#3B82F6',
    accentText: isDark ? '#000000' : '#FFFFFF',
    border: isDark ? '#374151' : '#E5E7EB',
    shadow: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.2)',
  };

  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '280px',
        padding: '12px 14px',
        borderRadius: '12px',
        background: colors.background,
        border: `1px solid ${colors.accent}`,
        boxShadow: `0 6px 20px ${colors.shadow}`,
        fontSize: '12px',
        lineHeight: 1.5,
        color: colors.text,
        ...style,
      }}
    >
      {(blockLabel || stepLabel) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {blockLabel && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: colors.accent, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              {blockLabel}
            </span>
          )}
          {stepLabel && (
            <span style={{ fontSize: '11px', fontWeight: 700, color: colors.text, opacity: 0.7 }}>
              {stepLabel}
            </span>
          )}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        {icon}
        <span>{text}</span>
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        {buttons.map((btn) => (
          <button
            key={btn.label}
            onClick={btn.onClick}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: btn.primary ? 'none' : `1px solid ${colors.border}`,
              background: btn.primary ? colors.accent : 'transparent',
              color: btn.primary ? colors.accentText : colors.text,
              fontSize: '12px',
              fontWeight: btn.primary ? 700 : 400,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TutorialTooltip;
