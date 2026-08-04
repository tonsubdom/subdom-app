

import React from "react";
import Lottie from "lottie-react";
import { Link } from "@/components/Link/Link.tsx";
import { Page } from "@/components/Page";
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useTutorial } from '@/contexts/TutorialContext';
import { TutorialDim } from '@/components/Tutorial/TutorialDim';
import { TutorialTooltip } from '@/components/Tutorial/TutorialTooltip';
import {FormattedHeaderDescription} from "../IndexPage/acentHeaderFrases"
import tsbLogo from "./img/tsb_logo.png";

// Блок 3/4 обучалки: какие карточки на этой странице участвуют в туре и
// какой шаг они закрывают по клику на настоящую кнопку карточки.
type TutorialCardId = 'site' | 'catalog';

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



type CornerIconKind = 'plus' | 'gear' | 'search' | 'edit';

interface CardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  cornerIcon?: CornerIconKind;
  actionText: string;
  to: string;
  tutorialId?: TutorialCardId;
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
// управление (Менеджер/Аватар), search — обзор/поиск (Каталог/Маркет), edit —
// конструктор/создание контента (Создать сайт/торрент).
const CORNER_ICON_PATHS: Record<CornerIconKind, React.ReactNode> = {
  plus: (
    <>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </>
  ),
  edit: (
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
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

interface CardTutorialProps {
  isTutorialTarget?: boolean;
  tutorialText?: string;
  tutorialBlockLabel?: string;
  tutorialStepLabel?: string;
  onTutorialClick?: () => void;
  cardRef?: React.Ref<HTMLDivElement>;
}

const Card: React.FC<CardProps & { isDark: boolean } & CardTutorialProps> = ({
  title, description, icon, cornerIcon, actionText, to, isDark,
  isTutorialTarget, tutorialText, tutorialBlockLabel, tutorialStepLabel, onTutorialClick, cardRef,
}) => {

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
      ref={cardRef}
      style={{
        background: theme.background,
        borderRadius: "16px",
        padding: "24px",
        boxShadow: theme.shadow,
        border: isTutorialTarget ? `2px solid ${isDark ? '#FFD700' : '#3B82F6'}` : `1px solid ${theme.border}`,
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

      {isTutorialTarget && tutorialText && (
        <TutorialTooltip
          blockLabel={tutorialBlockLabel}
          stepLabel={tutorialStepLabel}
          text={tutorialText}
          buttons={[]}
          style={{ position: 'static', width: '100%', maxWidth: 'none', marginBottom: '12px' }}
        />
      )}

      <Link to={to} onClick={onTutorialClick}>
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

  // Блок 3/4 обучалки: "Создать сайт" идёт раньше "TonSite Catalog" в
  // TUTORIAL_STEPS — та же приоритетность здесь, чтобы не подсветить обе
  // карточки сразу или не ту, что нужна по порядку.
  const tutorial = useTutorial();
  const tutorialTargetId: TutorialCardId | null = !tutorial.active
    ? null
    : !tutorial.isStepDone('site_visited')
    ? 'site'
    : !tutorial.isStepDone('catalog_focused')
    ? 'catalog'
    : null;
  const tutorialCardRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (tutorialTargetId) {
      window.setTimeout(() => {
        tutorialCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  }, [tutorialTargetId]);

  const handleTutorialCardClick = async () => {
    if (!tutorialTargetId) return;
    const step = tutorialTargetId === 'site' ? 'site_visited' : 'catalog_focused';
    await tutorial.recordStep(step);
    tutorial.resumeStep();
  };

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
      title: t('createSiteButton') || 'Создать сайт',
      description: t('createSiteCardSubtitle') || 'Конструктор сайтов для доменов — оформи свой tonsite за пару кликов',
      icon: (
        <IconWrapper bgColor={isDark ? "#374151" : "#DBEAFE"} isDark={isDark}>
          <img src={tsbLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </IconWrapper>
      ),
      cornerIcon: "edit",
      actionText: t('open'),
      to: "https://t.me/Ton_site_builder_bot",
      tutorialId: 'site',
    },
    {
      title: t('createTorrentTitle') || 'Создать торрент',
      description: t('createTorrentCardSubtitle') || 'Загрузи файлы, выбери провайдера TON Storage — получи bagID',
      icon: (
        <IconWrapper bgColor={isDark ? "#374151" : "#DBEAFE"} isDark={isDark}>
          {/* Стилизованная 3D-папка (намёк на директории), не плоский логотип */}
          <div style={{ position: 'relative', width: '56px', height: '46px' }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: '4px',
              width: '24px',
              height: '11px',
              background: isDark ? '#FFA500' : '#60A5FA',
              borderRadius: '4px 10px 0 0',
            }} />
            <div style={{
              position: 'absolute',
              top: '7px',
              left: 0,
              width: '56px',
              height: '39px',
              background: isDark
                ? 'linear-gradient(145deg, #FFD700 0%, #FFA500 100%)'
                : 'linear-gradient(145deg, #60A5FA 0%, #2563EB 100%)',
              borderRadius: '8px',
              boxShadow: isDark
                ? '0 4px 10px rgba(255, 165, 0, 0.35)'
                : '0 4px 10px rgba(37, 99, 235, 0.35)',
            }} />
          </div>
        </IconWrapper>
      ),
      cornerIcon: "edit",
      actionText: t('open'),
      to: "/create-torrent",
    },
    {
      title: "TonSite Catalog",
      description: t('tonsiteCatalogSubtitle') || "Все TON-сайты в одном месте — по категориям и с превью",
      icon: (
        <IconWrapper bgColor={isDark ? "#374151" : "#DBEAFE"} isDark={isDark}>
          <GiftLottieIcon />
        </IconWrapper>
      ),
      cornerIcon: "search",
      actionText: t('open'),
      to: "tonsite://tonsitecatalog.ton",
      tutorialId: 'catalog',
    },
    {
      title: t('marketTitle'),
      description: t('marketSubtitle'),
      icon: (
        <IconWrapper bgColor={isDark ? "#065F46" : "#DCFCE7"} isDark={isDark}>
          {/* Сумка-магазин (Feather "shopping-bag") вместо составного домика с долларом */}
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke={isDark ? "#FFD700" : "#059669"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
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
          {cards.map((card, index) => {
            const isTutorialTarget = !!card.tutorialId && card.tutorialId === tutorialTargetId;
            return (
              <TutorialDim key={index} dimmed={!!tutorialTargetId && !isTutorialTarget}>
                <Card
                  title={card.title}
                  description={card.description}
                  icon={card.icon}
                  cornerIcon={card.cornerIcon}
                  actionText={card.actionText}
                  to={card.to}
                  isDark={isDark}
                  isTutorialTarget={isTutorialTarget}
                  cardRef={isTutorialTarget ? tutorialCardRef : undefined}
                  tutorialBlockLabel={
                    card.tutorialId === 'site'
                      ? t('tutorialBlock3Label') || 'Блок 3'
                      : card.tutorialId === 'catalog'
                      ? t('tutorialBlock4Label') || 'Блок 4'
                      : undefined
                  }
                  tutorialStepLabel={
                    card.tutorialId === 'site'
                      ? t('tutorialStep1Label') || 'Шаг 1'
                      : card.tutorialId === 'catalog'
                      ? t('tutorialStep2Label') || 'Шаг 2'
                      : undefined
                  }
                  tutorialText={
                    card.tutorialId === 'site'
                      ? t('tutorialCreateSiteHint') || 'Создайте первый сайт — это займёт несколько минут.'
                      : card.tutorialId === 'catalog'
                      ? t('tutorialCatalogHint') || 'Каталог TonSite — все опубликованные сайты платформы в одном месте.'
                      : undefined
                  }
                  onTutorialClick={isTutorialTarget ? handleTutorialCardClick : undefined}
                />
              </TutorialDim>
            );
          })}
        </div>
      </div>
    </Page>
  );
};