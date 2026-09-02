// tma/src/pages/FaqPage/FaqPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page } from '@/components/Page';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { openLink } from '@telegram-apps/sdk-react';

interface FaqLink {
  label: string;
  href: string;
  // true — реальный роут приложения (навигация через react-router, без
  // перезагрузки страницы); иначе — внешняя ссылка (Telegram/npm/сайт),
  // открывается через openLink/window.open.
  internal?: boolean;
}

interface FaqEntry {
  question: string;
  answer: string;
  links?: FaqLink[];
}

// Вопросы/ответы переведены на все 10 языков (t('faqQ1'..'faqQ12'/'faqA1'..'faqA12'),
// см. contexts/translations/*.ts) — сама структура (какие вопросы, какие
// ссылки) одна на все языки, различается только текст. Часть лейблов ссылок
// намеренно НЕ через t() — это бренд-имена/URL (subdom.zone, TonSite Builder
// bot, api.subdom.zone/docs, @subdom_blog), одинаковые независимо от языка.
function buildFaqEntries(t: (key: string) => string): FaqEntry[] {
  return [
    {
      question: t('faqQ1'),
      answer: t('faqA1'),
      links: [
        { label: t('faqLinkTryNow'), href: '/add-subdomain', internal: true },
        { label: t('faqLinkOpenSubdom'), href: 'https://t.me/subdom' },
      ],
    },
    {
      question: t('faqQ2'),
      answer: t('faqA2'),
      links: [{ label: t('faqLinkCreateZone'), href: '/create-collection', internal: true }],
    },
    {
      question: t('faqQ3'),
      answer: t('faqA3'),
      links: [{ label: t('faqLinkOpenProfile'), href: '/avatar-secret', internal: true }],
    },
    {
      question: t('faqQ4'),
      answer: t('faqA4'),
      links: [{ label: 'TonSite Builder bot', href: 'https://t.me/Ton_site_builder_bot' }],
    },
    {
      question: t('faqQ5'),
      answer: t('faqA5'),
      links: [{ label: t('faqLinkCreateTorrent'), href: '/create-torrent', internal: true }],
    },
    {
      question: t('faqQ6'),
      answer: t('faqA6'),
      links: [{ label: 'TonSite Catalog', href: 'tonsite://tonsitecatalog.ton' }],
    },
    {
      question: t('faqQ7'),
      answer: t('faqA7'),
      links: [{ label: t('faqLinkOpenSubdom'), href: 'https://t.me/subdom' }],
    },
    {
      question: t('faqQ8'),
      answer: `${t('faqA8')}\nyarn add @subdom/sdk (${t('faqOr')} npm install @subdom/sdk)`,
      links: [{ label: t('faqLinkSdkNpm'), href: 'https://www.npmjs.com/package/@subdom/sdk' }],
    },
    {
      question: t('faqQ9'),
      answer: t('faqA9'),
      links: [{ label: 'api.subdom.zone/docs', href: 'https://api.subdom.zone/docs' }],
    },
    {
      // Было (устарело): "manifest-файла пока нет". Живой MCP-манифест
      // существует и отдаётся боевым бэкендом — см. subdom-server/src/
      // server-sqlite.ts (app.get('/mcp/manifest', ...)) и
      // nginx/conf.d/subdom.conf (location /mcp/). Проверено вживую
      // 2026-09-03: curl https://subdom.zone/mcp/manifest отдаёт реальный
      // непустой JSON со списком функций (claim_subdomain, deploy_proxy_zone
      // и др.), не заглушку.
      question: t('faqQ10'),
      answer: t('faqA10'),
      links: [{ label: 'subdom.zone/mcp/manifest', href: 'https://subdom.zone/mcp/manifest' }],
    },
    {
      question: t('faqQ11'),
      answer: t('faqA11'),
      links: [{ label: '@subdom_blog', href: 'https://t.me/subdom_blog' }],
    },
    {
      question: t('faqQ12'),
      answer: t('faqA12'),
      links: [{ label: t('faqLinkCreateZone'), href: '/create-collection', internal: true }],
    },
    {
      question: t('faqQ13'),
      answer: t('faqA13'),
      links: [{ label: '@subdom_blog', href: 'https://t.me/subdom_blog' }],
    },
  ];
}

const handleLink = (href: string) => {
  try {
    openLink(href);
  } catch {
    window.open(href, '_blank');
  }
};

export const FaqPage: React.FC = () => {
  const { currentTheme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const isDark = currentTheme === 'dark';
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const FAQ_ENTRIES = buildFaqEntries(t);

  const handleLinkClick = (link: FaqLink) => {
    if (link.internal) {
      navigate(link.href);
      return;
    }
    handleLink(link.href);
  };

  const colors = {
    background: isDark ? '#121212' : '#FFFFFF',
    text: isDark ? '#F9FAFB' : '#1F2937',
    textSecondary: isDark ? '#9CA3AF' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
    accent: isDark ? '#FFD700' : '#3B82F6',
    cardBg: isDark ? '#1F2937' : '#F9FAFB',
  };

  return (
    <Page>
      <div style={{ padding: '16px 16px 120px 16px', maxWidth: '520px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: colors.text, textAlign: 'center', margin: '0 0 4px 0' }}>
          {t('faqPageTitle')}
        </h1>
        <p style={{ fontSize: '13px', color: colors.textSecondary, textAlign: 'center', margin: '0 0 20px 0' }}>
          {t('faqPageSubtitle')}
        </p>

        {FAQ_ENTRIES.map((entry, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              style={{
                background: colors.cardBg,
                border: `1px solid ${isOpen ? colors.accent : colors.border}`,
                borderRadius: '10px',
                marginBottom: '10px',
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : index)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  padding: '12px 14px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 600, color: colors.text }}>{entry.question}</span>
                <span style={{ fontSize: '16px', color: colors.accent, flexShrink: 0 }}>{isOpen ? '−' : '+'}</span>
              </button>
              {isOpen && (
                <div style={{ padding: '0 14px 14px 14px' }}>
                  <div style={{ fontSize: '13px', lineHeight: 1.6, color: colors.textSecondary, whiteSpace: 'pre-line' }}>
                    {entry.answer}
                  </div>
                  {entry.links && entry.links.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                      {entry.links.map((link) => (
                        <button
                          key={link.href}
                          onClick={() => handleLinkClick(link)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: `1px solid ${colors.accent}`,
                            background: 'transparent',
                            color: colors.accent,
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {link.label}{!link.internal && ' ↗'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Page>
  );
};

export default FaqPage;
