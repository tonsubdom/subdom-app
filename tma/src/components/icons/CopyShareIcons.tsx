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

// Завёрнутая стрелка "поделиться" — гладкий крюк вместо резкого угла (был
// прежний угловой Telegram-forward силуэт, юзер попросил заменить, см.
// Log.md). Жирная обводка (3) вместо прежней 2.5 — на золотом акценте
// (#FFD700, тёмная тема кнопок Share) тонкая линия терялась и читалась
// как "неочевидное жёлтое пятно".
export const ShareArrowIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 17v-4c0-4.42 3.58-8 8-8h3" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="12 1 18 5 12 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
