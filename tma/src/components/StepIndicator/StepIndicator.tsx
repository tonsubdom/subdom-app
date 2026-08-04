// tma/src/components/StepIndicator/StepIndicator.tsx
//
// Онбординг-путь "Кошелёк → Аватарка → Зона" в 3 клика — показывает, на каком
// шаге пользователь сейчас, в модалке-превью ончейн-профиля (ProfileWidget),
// в AvatarSecretPage и в CreateCollectionPage. Не завязан на конкретный
// объект colors проекта (у каждой страницы своя форма palette) — принимает
// голые цвета, чтобы оставаться переиспользуемым.
import React from 'react';

interface StepIndicatorProps {
  current: number; // 1-based
  labels: string[];
  accentColor: string;
  mutedColor: string;
  textColor: string;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  current,
  labels,
  accentColor,
  mutedColor,
  textColor,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        margin: '4px 0 16px 0',
        flexWrap: 'wrap',
      }}
    >
      {labels.map((label, i) => {
        const step = i + 1;
        const isDone = step < current;
        const isActive = step === current;
        const color = isActive || isDone ? accentColor : mutedColor;

        return (
          <React.Fragment key={label}>
            {i > 0 && <div style={{ width: '14px', height: '1px', background: mutedColor }} />}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 700,
                  flexShrink: 0,
                  background: isActive ? color : 'transparent',
                  border: `1.5px solid ${color}`,
                  color: isActive ? '#000' : color,
                }}
              >
                {isDone ? '✓' : step}
              </div>
              <span
                style={{
                  fontSize: '11px',
                  color: isActive ? textColor : mutedColor,
                  fontWeight: isActive ? 700 : 400,
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
