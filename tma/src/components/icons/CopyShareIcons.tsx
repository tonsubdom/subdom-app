// src/components/icons/CopyShareIcons.tsx
// Более выразительные SVG-иконки для кнопок "копировать ссылку" и
// "поделиться" на карточке аукциона (AddSubdomainPage) — раньше это были
// эмодзи 📋/🔗, которые в разных системах рендерились по-разному и не
// смотрелись современно рядом друг с другом.
import React from "react";

export const CopyLinkIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="8" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="2" />
    <path d="M16 8V6.5C16 5.11929 14.8807 4 13.5 4H6.5C5.11929 4 4 5.11929 4 6.5V13.5C4 14.8807 5.11929 16 6.5 16H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Широкая гнутая стрелка "переслать" — тот же силуэт, что forward-иконка в
// Telegram и большинстве мессенджеров (Feather "corner-up-right"), обводка
// вместо заливки — жирнее и разборчивее на маленьком размере, чем прежняя
// тонкая залитая стрелка.
export const ShareArrowIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polyline points="14 4 20 10 14 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 18v-5a4 4 0 0 1 4-4h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
