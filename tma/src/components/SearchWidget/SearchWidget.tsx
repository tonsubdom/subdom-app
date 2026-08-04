// tma/src/components/SearchWidget/SearchWidget.tsx
//
// Глобальный виджет поиска по страницам приложения (аналог ProfileWidget/
// ChatWidget по размеру/манере, но фиксирован сверху под хедером). Пока без
// AI-агента: простое совпадение по ключевым словам среди статичного индекса
// страниц — умный диалоговый агент (Claude API или отдельный сервис вроде
// teleton-agent) это отдельная, более крупная задача на будущее.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { openLink } from '@telegram-apps/sdk-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

// Событие, которым SearchWidget просит ProfileWidget открыться — сам
// ProfileWidget держит isExpanded как локальный стейт, лезть в его (и без
// того гигантский) компонент ради шаринга стейта через контекст/redux не
// стали, событие проще и ничего не ломает.
export const OPEN_PROFILE_WIDGET_EVENT = 'subdom:open-profile-widget';

interface SearchIndexEntry {
  labelKey: string;
  labelFallback: string;
  keywords: string[];
  // Либо внутренний роут (навигация через react-router), либо внешняя
  // ссылка (открывается через openLink — как в components/Link/Link.tsx),
  // либо служебное действие вроде открытия другого виджета.
  kind: 'route' | 'external' | 'action';
  to?: string;
  action?: () => void;
  // id элемента на целевой странице, к которому проскроллить после перехода
  // (scrollIntoView). Пока ни у одной страницы такие якоря не расставлены —
  // просто переходим на верх страницы; добавить id на страницах и проставить
  // тут anchor — отдельная задача на будущее, по мере надобности.
  anchor?: string;
}

const SEARCH_INDEX: SearchIndexEntry[] = [
  {
    kind: 'route',
    to: '/',
    labelKey: 'searchIndexHome',
    labelFallback: 'Главная',
    keywords: ['главная', 'домой', 'home', 'старт'],
  },
  {
    kind: 'action',
    action: () => window.dispatchEvent(new Event(OPEN_PROFILE_WIDGET_EVENT)),
    labelKey: 'searchIndexProfile',
    labelFallback: 'Профиль',
    keywords: ['профиль', 'кошелек', 'мои зоны', 'мои субдомены', 'profile'],
  },
  {
    kind: 'route',
    to: '/manage',
    labelKey: 'searchIndexManage',
    labelFallback: 'Управление доменами',
    keywords: ['управление', 'мои домены', 'зоны', 'субдомены', 'manage', 'домены'],
  },
  {
    kind: 'route',
    to: '/market',
    labelKey: 'searchIndexMarket',
    labelFallback: 'Маркет',
    keywords: ['маркет', 'market', 'купить', 'продать', 'покупка', 'продажа'],
  },
  {
    kind: 'route',
    to: '/add-subdomain',
    labelKey: 'searchIndexAddSubdomain',
    labelFallback: 'Добавить субдомен',
    keywords: ['субдомен', 'добавить', 'аукцион', 'ставка', 'auction'],
  },
  {
    kind: 'route',
    to: '/avatar-secret',
    labelKey: 'searchIndexAvatarSecret',
    labelFallback: 'Аватар / Секрет',
    keywords: ['аватар', 'секрет', 'dns', 'настройки домена'],
  },
  {
    kind: 'route',
    to: '/create-torrent',
    labelKey: 'searchIndexCreateTorrent',
    labelFallback: 'Создать торрент',
    keywords: ['торрент', 'bagid', 'storage', 'хранение', 'файлы'],
  },
  {
    kind: 'route',
    to: '/create-collection',
    labelKey: 'searchIndexCreateCollection',
    labelFallback: 'Создать коллекцию',
    keywords: ['коллекция', 'зона', 'создать зону', 'collection'],
  },
  {
    // Внешний бот-конструктор сайтов, см. IndexPage.tsx (to: "https://t.me/Ton_site_builder_bot")
    kind: 'external',
    to: 'https://t.me/Ton_site_builder_bot',
    labelKey: 'createSiteButton',
    labelFallback: 'Создать сайт',
    keywords: ['сайт', 'создать сайт', 'конструктор сайтов', 'tonsite', 'site builder'],
  },
  {
    // tonsite://-ссылка на общий каталог сайтов, см. IndexPage.tsx (to: "tonsite://tonsitecatalog.ton")
    kind: 'external',
    to: 'tonsite://tonsitecatalog.ton',
    labelKey: 'searchIndexTonsiteCatalog',
    labelFallback: 'TonSite Catalog',
    keywords: ['каталог', 'tonsite catalog', 'каталог тонсайтов', 'catalog'],
  },
];

const WIDGET_SIZE = 60;
const EXPANDED_WIDTH = 340;

export const SearchWidget: React.FC = () => {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 260);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return SEARCH_INDEX.filter((entry) => {
      const label = (t(entry.labelKey) || entry.labelFallback).toLowerCase();
      if (label.includes(q)) return true;
      return entry.keywords.some((k) => k.includes(q));
    }).slice(0, 6);
  }, [query, t]);

  const colors = {
    text: isDark ? '#F9FAFB' : '#1F2937',
    textSecondary: isDark ? '#9CA3AF' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
    panelBg: isDark ? 'rgba(17,24,39,0.92)' : 'rgba(255,255,255,0.96)',
    triggerBg: isDark ? 'rgba(17,24,39,0.55)' : 'rgba(255,255,255,0.6)',
    hoverBg: isDark ? '#1F2937' : '#F3F4F6',
    accent: isDark ? '#FFD700' : '#3B82F6',
  };

  const goTo = (entry: SearchIndexEntry) => {
    setOpen(false);
    setQuery('');

    if (entry.kind === 'action') {
      entry.action?.();
      return;
    }
    if (entry.kind === 'external') {
      openLink(entry.to!);
      return;
    }

    navigate(entry.to!);
    if (entry.anchor) {
      // ждём кадр, чтобы страница по новому роуту успела смонтироваться
      window.setTimeout(() => {
        document.getElementById(entry.anchor!)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  };

  return (
    <div
      ref={rootRef}
      style={{
        position: 'fixed',
        top: '64px',
        right: '20px',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: `${WIDGET_SIZE}px`,
          width: open ? `${EXPANDED_WIDTH}px` : `${WIDGET_SIZE}px`,
          // Запас слева под TutorialEntryWidget (левый верхний угол) — на
          // узких экранах развёрнутый поиск иначе наезжает на него.
          maxWidth: 'calc(100vw - 140px)',
          borderRadius: `${WIDGET_SIZE / 2}px`,
          background: open ? colors.panelBg : colors.triggerBg,
          backdropFilter: 'blur(6px)',
          boxShadow: open ? '0 6px 24px rgba(0,0,0,0.35)' : '0 4px 12px rgba(0,0,0,0.25)',
          border: open ? `1px solid ${colors.border}` : 'none',
          overflow: 'hidden',
          transition: 'width 0.25s ease, background 0.25s ease',
        }}
      >
        {open && (
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchWidgetPlaceholder') || 'Поиск по приложению...'}
            style={{
              flex: 1,
              minWidth: 0,
              height: '100%',
              padding: '0 4px 0 18px',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: colors.text,
              fontFamily: 'monospace',
              fontSize: '13px',
            }}
          />
        )}
        <button
          onClick={() => setOpen((v) => !v)}
          title={t('searchWidgetTitle') || 'Поиск'}
          style={{
            flexShrink: 0,
            width: `${WIDGET_SIZE}px`,
            height: `${WIDGET_SIZE}px`,
            borderRadius: '50%',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke={colors.text} strokeWidth="2" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" stroke={colors.text} strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && query.trim() && (
        <div
          style={{
            position: 'absolute',
            top: `${WIDGET_SIZE + 8}px`,
            right: 0,
            width: `${EXPANDED_WIDTH}px`,
            // 40px запаса справа + ~100px слева под виджет обучалки
            // (TutorialEntryWidget, левый верхний угол) с отступом — иначе
            // на узких экранах развёрнутый поиск наезжает на него.
            maxWidth: 'calc(100vw - 140px)',
            background: colors.panelBg,
            border: `1px solid ${colors.border}`,
            borderRadius: '14px',
            boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
            overflow: 'hidden',
            backdropFilter: 'blur(6px)',
          }}
        >
          {results.length === 0 ? (
            <div style={{ padding: '14px 16px', fontSize: '12px', color: colors.textSecondary, fontFamily: 'monospace' }}>
              {t('searchWidgetNoResults') || 'Ничего не найдено'}
            </div>
          ) : (
            results.map((entry) => (
              <button
                key={entry.labelKey}
                onClick={() => goTo(entry)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `1px solid ${colors.border}`,
                  color: colors.text,
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                }}
              >
                {t(entry.labelKey) || entry.labelFallback}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SearchWidget;
