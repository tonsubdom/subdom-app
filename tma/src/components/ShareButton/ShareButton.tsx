// src/components/ShareButton/ShareButton.tsx
//
// Единый "поделиться" по всему приложению — раньше в AddSubdomainPage были
// только серые прямоугольные IconButton (backgroundColor #333, borderColor
// #555) для proxy-аукционов, а в карточках зон/степпере создания зоны/вкладке
// Аукционы такой кнопки не было вообще. Один компонент вместо копипасты —
// акцентный цвет темы (золото/синий, как у CustomDomainSelector), клик сразу
// вызывает shareAuction() (Web Share API с fallback на копирование в буфер,
// см. utils/urlParams.ts) — системный шеринг сам предложит Telegram и другие
// приложения, отдельное меню не нужно.
import React, { useState } from "react";
import { shareAuction, type AuctionUrlParams } from "@/utils/urlParams";
import { ShareArrowIcon } from "@/components/icons/CopyShareIcons";
import { useLanguage } from "@/contexts/LanguageContext";

interface ShareButtonProps {
  params: AuctionUrlParams;
  isDark: boolean;
  size?: number;
  // Переопределение текста для Web Share API — для мест, где шарится зона
  // целиком (без конкретного субдомена/аукциона).
  shareTitle?: string;
  shareText?: string;
  style?: React.CSSProperties;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  params,
  isDark,
  size = 32,
  shareTitle,
  shareText,
  style,
}) => {
  const { t } = useLanguage();
  const [justShared, setJustShared] = useState(false);

  const accent = isDark ? "#FFD700" : "#3B82F6";

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await shareAuction(params, { title: shareTitle, text: shareText });
    if (ok) {
      setJustShared(true);
      setTimeout(() => setJustShared(false), 1500);
    }
  };

  return (
    <button
      onClick={handleClick}
      title={t("shareButtonTitle") || "Поделиться"}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        // 2px вместо прежних 1.5 — на золотом акценте (#FFD700, тёмная
        // тема) тонкая рамка почти не читалась на тёмном фоне, юзер жаловался
        // "неочевидная и некрасивая".
        border: `2px solid ${accent}`,
        background: isDark ? "rgba(255, 215, 0, 0.18)" : "rgba(59, 130, 246, 0.12)",
        color: accent,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "transform 0.15s ease",
        flexShrink: 0,
        padding: 0,
        ...style,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      {justShared ? "✓" : <ShareArrowIcon size={Math.round(size * 0.56)} />}
    </button>
  );
};

export default ShareButton;
