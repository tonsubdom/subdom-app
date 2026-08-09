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

export const ShareArrowIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"
      fill="currentColor"
    />
  </svg>
);
