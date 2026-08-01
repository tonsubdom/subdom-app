

import React from "react";
import Lottie from "lottie-react";
import { Link } from "@/components/Link/Link.tsx";
import { Page } from "@/components/Page";
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import {FormattedHeaderDescription} from "../IndexPage/acentHeaderFrases"
import tsbLogo from "./img/tsb_logo.png";

// Анимированная иконка карточек TonSite Catalog и "Создать сайт" вместо
// плоских эмодзи — подгружаем JSON лениво. Временно одна и та же анимация на
// обеих карточках (юзер не нашёл отдельный подходящий гифт под "Создать
// сайт" — заменить на что-то своё, когда найдётся). Кэш на модуле — чтобы
// два инстанса на странице не тянули один и тот же JSON дважды.
const SHARED_GIFT_LOTTIE_URL = "https://nft.fragment.com/gift/bigyear-7470.lottie.json";
let sharedLottieCache: object | null = null;
let sharedLottiePromise: Promise<object> | null = null;

function loadSharedLottie(): Promise<object> {
  if (sharedLottieCache) return Promise.resolve(sharedLottieCache);
  if (!sharedLottiePromise) {
    sharedLottiePromise = fetch(SHARED_GIFT_LOTTIE_URL)
      .then((res) => res.json())
      .then((data) => {
        sharedLottieCache = data;
        return data;
      });
  }
  return sharedLottiePromise;
}

const GiftLottieIcon: React.FC = () => {
  const [animationData, setAnimationData] = React.useState<object | null>(sharedLottieCache);

  React.useEffect(() => {
    if (animationData) return;
    let cancelled = false;
    loadSharedLottie()
      .then((data) => {
        if (!cancelled) setAnimationData(data);
      })
      .catch(() => {
        /* тихо — фолбэк ниже просто не подгрузится, IconWrapper останется пустым */
      });
    return () => {
      cancelled = true;
    };
  }, [animationData]);

  if (!animationData) return null;
  return <Lottie animationData={animationData} loop style={{ width: 80, height: 80 }} />;
};



type CornerIconKind = 'plus' | 'gear' | 'search';

interface CardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  cornerIcon?: CornerIconKind;
  actionText: string;
  to: string;
}

const IconWrapper: React.FC<{ children: React.ReactNode; bgColor: string; isDark: boolean }> = ({ 
  children, 
  bgColor, 
  isDark 
}) => (
  <div
    style={{
      width: 80,
      height: 80,
      borderRadius: 25,
      backgroundColor: bgColor,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      boxShadow: isDark
        ? "0 4px 12px rgba(255, 215, 0, 0.3)"
        : "0 4px 12px rgba(59, 130, 246, 0.3)",
      border: isDark
        ? "1px solid rgba(255, 215, 0, 0.2)"
        : "1px solid rgba(59, 130, 246, 0.2)",
    }}
  >
    {children}
  </div>
);

// Line-art SVG (в духе Feather Icons) вместо плоских эмодзи для угловой
// "говорящей" иконки карточки: plus — создание зоны/субдомена, gear —
// управление (Менеджер/Аватар), search — обзор/поиск (Каталог/Маркет).
const CORNER_ICON_PATHS: Record<CornerIconKind, React.ReactNode> = {
  plus: (
    <>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>
  ),
};

const CornerIconBadge: React.FC<{ kind: CornerIconKind; isDark: boolean }> = ({ kind, isDark }) => (
  <div
    style={{
      position: "absolute",
      top: "12px",
      right: "12px",
      width: "40px",
      height: "40px",
      borderRadius: "12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: isDark
        ? "linear-gradient(135deg, rgba(255, 215, 0, 0.18) 0%, rgba(255, 165, 0, 0.10) 100%)"
        : "linear-gradient(135deg, rgba(59, 130, 246, 0.14) 0%, rgba(96, 165, 250, 0.08) 100%)",
      border: `1px solid ${isDark ? "rgba(255, 215, 0, 0.25)" : "rgba(59, 130, 246, 0.2)"}`,
      backdropFilter: "blur(6px)",
      boxShadow: isDark
        ? "0 2px 10px rgba(255, 165, 0, 0.15)"
        : "0 2px 10px rgba(59, 130, 246, 0.12)",
    }}
  >
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={isDark ? "#FFD700" : "#3B82F6"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {CORNER_ICON_PATHS[kind]}
    </svg>
  </div>
);

const Card: React.FC<CardProps & { isDark: boolean }> = ({ title, description, icon, cornerIcon, actionText, to, isDark }) => {
  
  const colors = {
    light: {
      primary: "#3B82F6",
      accent: "#60A5FA",
      background: "#FFFFFF",
      text: "#1F2937",
      border: "#E5E7EB",
      shadow: "0 8px 25px rgba(0, 0, 0, 0.1)"
    },
    dark: {
      primary: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
      accent: "#FFED4A",
      background: "#1F2937",
      text: "#F9FAFB",
      border: "#374151",
      shadow: "0 8px 25px rgba(0, 0, 0, 0.3)"
    }
  };

  const theme = colors[isDark ? "dark" : "light"];

  return (
    <div
      style={{
        background: theme.background,
        borderRadius: "16px",
        padding: "24px",
        boxShadow: theme.shadow,
        border: `1px solid ${theme.border}`,
        transition: "all 0.3s ease",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = isDark
          ? "0 12px 35px rgba(255, 215, 0, 0.2)"
          : "0 12px 35px rgba(59, 130, 246, 0.2)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = theme.shadow;
      }}
    >
      {/* Большая говорящая иконка в углу (создать / управление / поиск) */}
      {cornerIcon && <CornerIconBadge kind={cornerIcon} isDark={isDark} />}

      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
        {icon}
        <h3
          style={{
            margin: 0,
            fontSize: "18px",
            fontWeight: "600",
            color: theme.text,
          }}
        >
          {title}
        </h3>
      </div>

      <p
        style={{
          margin: "0 0 20px 0",
          color: theme.text,
          opacity: 0.8,
          fontSize: "14px",
          lineHeight: "1.5",
        }}
      >
        {description}
      </p>

      <Link to={to}>
        <button
          style={{
            width: "100%",
            padding: "12px 16px",
            background: theme.primary,
            color: isDark ? 'black' : "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.3s ease",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = isDark
              ? "0 4px 12px rgba(255, 215, 0, 0.4)"
              : "0 4px 12px rgba(59, 130, 246, 0.4)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {actionText}
        </button>
      </Link>
    </div>
  );
};

export const IndexPage: React.FC = () => {
  // Получаем тему из ThemeContext
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';
  
  // Получаем переводы из LanguageContext
  const { t } = useLanguage();

  // Создаем карточки с передачей isDark
  const createCards = (isDark: boolean): CardProps[] => [
    {
      title: t('addSubdomZone'),
      description: t('createCollection'),
      icon: (
        <IconWrapper bgColor={isDark ? "#374151" : "#000000ff"} isDark={isDark}>
          <p style={{
            color: 'white', 
            fontFamily: 'monospace', 
            fontSize: '16px', 
            fontWeight: '600'
          }}>
            .*.ton
          </p>
        </IconWrapper>
      ),
      cornerIcon: "plus",
      actionText: t('add'),
      to: "/create-collection",
    },
    {
      title: t('createSubdomain'),
      description: t('addSubdomainToCollection'),
      icon: (
        <IconWrapper bgColor={isDark ? "#4B5563" : "#DBEAFE"} isDark={isDark}>
          <p style={{
            color: isDark ? 'white' : 'black', 
            fontFamily: 'monospace', 
            fontSize: '14px', 
            fontWeight: '600'
          }}>
            *.*.ton
          </p>
        </IconWrapper>
      ),
      cornerIcon: "plus",
      actionText: t('create'),
      to: "/add-subdomain",
    },
    {
      title: t('avatarSecretTitle') || 'Аватар / Секрет',
      description: t('avatarSecretSubtitle') || 'Заголовок, описание, картинка домена — прямо в DNS',
      icon: (
        <IconWrapper bgColor={isDark ? "#000000" : "#DBEAFE"} isDark={isDark}>
          <p style={{
            color: isDark ? '#FFD700' : '#3B82F6',
            fontFamily: 'monospace',
            fontSize: '28px',
            fontWeight: '600'
          }}>
            🎭
          </p>
        </IconWrapper>
      ),
      cornerIcon: "gear",
      actionText: t('open'),
      to: "/avatar-secret",
    },
    {
      title: t('createSiteButton') || 'Создать сайт',
      description: t('createSiteCardSubtitle') || 'Конструктор сайтов для доменов — оформи свой tonsite за пару кликов',
      icon: (
        <IconWrapper bgColor={isDark ? "#374151" : "#DBEAFE"} isDark={isDark}>
          <img src={tsbLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </IconWrapper>
      ),
      actionText: t('open'),
      to: "https://t.me/Ton_site_builder_bot",
    },
    {
      title: t('createTorrentTitle') || 'Создать торрент',
      description: t('createTorrentCardSubtitle') || 'Загрузи файлы, выбери провайдера TON Storage — получи bagID',
      icon: (
        <IconWrapper bgColor={isDark ? "#374151" : "#DBEAFE"} isDark={isDark}>
          <p style={{
            color: isDark ? '#FFD700' : '#3B82F6',
            fontFamily: 'monospace',
            fontSize: '28px',
            fontWeight: '600'
          }}>
            🧲
          </p>
        </IconWrapper>
      ),
      cornerIcon: "plus",
      actionText: t('open'),
      to: "/create-torrent",
    },
    {
      title: t('manageDNSRecords'),
      description: t('linkWalletSiteStorage'),
      icon: (
        <IconWrapper bgColor={isDark ? "#374151" : "#FFFFFF"} isDark={isDark}>
          <div 
            style={{
              display:'flex', 
              flexDirection: 'column', 
              alignItems:'center', 
              width: '80px', 
              height: '80px', 
              border: `2px solid ${isDark ? '#FFD700' : 'black'}`, 
              borderRadius: '25px', 
              justifyContent: 'center'
            }}
          >
            <p style={{
              color: isDark ? '#FFD700' : 'black', 
              fontFamily: 'monospace', 
              fontSize: '14px', 
              fontWeight: '600', 
              margin: 0, 
              height:'20px'
            }}>
              LINKS
            </p>
          </div>
        </IconWrapper>
      ),
      cornerIcon: "gear",
      actionText: t('manage'),
      to: "/manage",
    },
    {
      title: "TonSite Catalog",
      description: t('tonsiteCatalogSubtitle') || "Все TON-сайты в одном месте — по категориям и с превью",
      icon: (
        <IconWrapper bgColor={isDark ? "#374151" : "#DBEAFE"} isDark={isDark}>
          <GiftLottieIcon />
        </IconWrapper>
      ),
      actionText: t('open'),
      to: "tonsite://tonsitecatalog.ton",
    },
    {
      title: t('marketTitle'),
      description: t('marketSubtitle'),
      icon: (
        <IconWrapper bgColor={isDark ? "#065F46" : "#DCFCE7"} isDark={isDark}>
          {/* Логотип домик с долларом внутри */}
          <div style={{
            position: 'relative',
            width: '50px',
            height: '50px',
          }}>
            {/* Домик */}
            <div style={{
              position: 'absolute',
              top: '15px',
              left: '10px',
              width: '30px',
              height: '20px',
              backgroundColor: isDark ? '#FFD700' : '#3B82F6',
              borderRadius: '4px 4px 0 0',
            }} />
            {/* Крыша */}
            <div style={{
              position: 'absolute',
              top: '5px',
              left: '5px',
              width: '40px',
              height: '15px',
              backgroundColor: isDark ? '#FFA500' : '#2563EB',
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
            }} />
            {/* Доллар */}
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '22px',
              width: '6px',
              height: '20px',
              backgroundColor: isDark ? '#000000' : '#FFFFFF',
              borderRadius: '1px',
            }} />
            <div style={{
              position: 'absolute',
              top: '22px',
              left: '18px',
              width: '14px',
              height: '6px',
              backgroundColor: isDark ? '#000000' : '#FFFFFF',
              borderRadius: '3px',
            }} />
            <div style={{
              position: 'absolute',
              top: '32px',
              left: '18px',
              width: '14px',
              height: '6px',
              backgroundColor: isDark ? '#000000' : '#FFFFFF',
              borderRadius: '3px',
            }} />
          </div>
        </IconWrapper>
      ),
      cornerIcon: "search",
      actionText: t('open'),
      to: "/market",
    }
  ];

  const cards = createCards(isDark);
    // Получаем язык и функцию перевода
  const { language } = useLanguage();

  return (
    <Page back={false}>
      <div 
        className="bodyWrapperFlex"
        style={{
          maxWidth: '425px',
          margin: '0 auto',
          padding: '20px 16px 180px 16px',
        }}
      >
        <div style={{ marginBottom: '32px' }}>
          <h1 
            style={{
              fontSize: '28px',
              fontWeight: '700',
              color: isDark ? '#F9FAFB' : '#1F2937',
              margin: '0 0 8px 0',
              textAlign: 'center',
            }}
          >
            {t('subdomHeaderWelcome')}
          </h1>
          <FormattedHeaderDescription
        text={t('headerServiceDescription')}
        isDark={isDark}
        language={language}/>
        </div>

        <div 
          style={{
            display: 'grid',
            gap: '20px',
            gridTemplateColumns: '1fr',
          }}
        >
          {cards.map((card, index) => (
            <Card
              key={index}
              title={card.title}
              description={card.description}
              icon={card.icon}
              cornerIcon={card.cornerIcon}
              actionText={card.actionText}
              to={card.to}
              isDark={isDark}
            />
          ))}
        </div>
      </div>
    </Page>
  );
};