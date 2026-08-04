// tma/src/components/Tutorial/TutorialDim.tsx
//
// Затемняет всё, кроме подсвеченного текущим шагом обучалки элемента.
// Копирует ровно тот паттерн, что уже используется для onboarding-подсказки
// "настройте профиль" в ProfileWidget.tsx (opacity+saturate, БЕЗ
// pointerEvents:'none' — юзер по-прежнему может взаимодействовать со всем,
// подсветка чисто визуальная, ничего не блокирует).
import React, { ReactNode } from 'react';

interface TutorialDimProps {
  dimmed: boolean;
  children: ReactNode;
}

export const TutorialDim: React.FC<TutorialDimProps> = ({ dimmed, children }) => (
  <div
    style={{
      opacity: dimmed ? 0.4 : 1,
      filter: dimmed ? 'saturate(0.5)' : undefined,
      transition: 'opacity 0.2s ease, filter 0.2s ease',
    }}
  >
    {children}
  </div>
);

export default TutorialDim;
