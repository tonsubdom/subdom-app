import { useState } from "react";
import { List, Text } from "@telegram-apps/telegram-ui";
import { useNavigate } from "react-router-dom";
import { useTheme } from '@/contexts/ThemeContext';
import { openLink } from '@telegram-apps/sdk-react';
import tonFooterSvg from "./ton.svg";

// Логотипы Community dapps — юзер пришлёт картинки позже (2026-08-09,
// см. Log.md), пока плейсхолдеры-инициалы того же размера (48px, как
// иконки в ServiceTabs.tsx менеджера — юзер попросил "не совсем уж
// маленькие").
interface CommunityDapp {
  label: string;
  href: string;
  initials: string;
}

const COMMUNITY_DAPPS: CommunityDapp[] = [
  { label: 'TonSite Builder', href: 'https://t.me/Ton_site_builder_bot', initials: 'TSB' },
  { label: 'TonSite Catalog', href: 'tonsite://tonsitecatalog.ton', initials: 'TSC' },
  { label: 'Webdom', href: 'https://webdom.market', initials: 'WD' },
  { label: 'Resistance Tools', href: 'https://app.resistance.dog', initials: 'RT' },
  { label: '10K Club', href: 'https://10kclub.com/', initials: '10K' },
];

const GITHUB_REPO_URL = 'https://github.com/tonsubdom/subdom-app';
const TELEGRAM_CHANNEL_URL = 'https://t.me/subdom_blog';

const Footer = () => {
  const { currentTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const isDark = currentTheme === 'dark';

  const footerColors = {
    light: {
      background: "#ffffff",
      text: "#6B7280",
      hint: "#9CA3AF"
    },
    dark: {
      background: "#121212",
      text: "#D1D5DB",
      hint: "#6B7280"
    }
  };

  const colors = footerColors[isDark ? "dark" : "light"];
  const accent = isDark ? '#FFD700' : '#3B82F6';

  const handleExternalLink = (href: string) => {
    setMenuOpen(false);
    try {
      openLink(href);
    } catch {
      window.open(href, '_blank');
    }
  };

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      width: "100vw",
      marginTop: '80px'
    }}>
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              bottom: '70px',
              right: '12px',
              left: '12px',
              maxWidth: '360px',
              marginLeft: 'auto',
              background: isDark ? '#1F2937' : '#FFFFFF',
              border: `1px solid ${accent}`,
              borderRadius: '14px',
              padding: '16px',
              boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
              maxHeight: '70vh',
              overflowY: 'auto',
            }}
          >
            {/* Крестик — тот же способ свернуть, что и клик вне панели
                (затемнённая подложка тоже закрывает по клику). */}
            <button
              onClick={() => setMenuOpen(false)}
              aria-label="Закрыть"
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'none',
                border: 'none',
                color: colors.hint,
                fontSize: '18px',
                lineHeight: 1,
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              ✕
            </button>

            {/* FAQ */}
            <button
              onClick={() => { setMenuOpen(false); navigate('/faq'); }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '10px',
                border: `1px solid ${colors.hint}40`,
                background: 'transparent',
                color: colors.text,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '14px',
              }}
            >
              <span style={{ fontSize: '18px' }}>❓</span>
              FAQ
            </button>

            {/* Разработчикам */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: colors.hint, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
                Разработчикам
              </div>
              <button
                onClick={() => handleExternalLink('https://api.subdom.zone/docs')}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', border: 'none', background: 'transparent', color: colors.text, cursor: 'pointer', fontSize: '13px' }}
              >
                <span>Swagger API</span>
                <span style={{ color: colors.hint }}>↗</span>
              </button>
              <button
                onClick={() => handleExternalLink('https://www.npmjs.com/package/@subdom/sdk')}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', border: 'none', background: 'transparent', color: colors.text, cursor: 'pointer', fontSize: '13px' }}
              >
                <span>@subdom/sdk (npm)</span>
                <span style={{ color: colors.hint }}>↗</span>
              </button>
            </div>

            {/* TON DNS Community dapps */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: colors.hint, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
                TON DNS Community dapps
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
                {COMMUNITY_DAPPS.map((dapp) => (
                  <button
                    key={dapp.label}
                    onClick={() => handleExternalLink(dapp.href)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {/* Плейсхолдер-инициалы вместо картинки — юзер пришлёт
                        реальные логотипы отдельно. */}
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '14px',
                        background: isDark
                          ? 'linear-gradient(135deg, rgba(255,215,0,0.25) 0%, rgba(255,165,0,0.15) 100%)'
                          : 'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(96,165,250,0.12) 100%)',
                        border: `1px solid ${accent}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: accent,
                      }}
                    >
                      {dapp.initials}
                    </div>
                    <span style={{ fontSize: '10px', color: colors.text, textAlign: 'center', lineHeight: 1.2 }}>{dapp.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* GitHub + Telegram канал */}
            <button
              onClick={() => handleExternalLink(GITHUB_REPO_URL)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', border: 'none', background: 'transparent', color: colors.text, cursor: 'pointer', fontSize: '13px' }}
            >
              <span>Репозиторий на GitHub</span>
              <span style={{ color: colors.hint }}>↗</span>
            </button>
            <button
              onClick={() => handleExternalLink(TELEGRAM_CHANNEL_URL)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', border: 'none', background: 'transparent', color: colors.text, cursor: 'pointer', fontSize: '13px' }}
            >
              <span>Канал в Telegram — @subdom_blog</span>
              <span style={{ color: colors.hint }}>↗</span>
            </button>
          </div>
        </div>
      )}

      <List
        style={{
          // Раньше был однострочный copyright — вертикальный padding был
          // 20px. Текст теперь в 3 строки, поэтому padding уменьшен, чтобы
          // общая высота футера осталась прежней (юзер попросил не менять).
          padding: "8px 20px",
          backgroundColor: colors.background,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: '10px' }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Text style={{
              fontSize: "12px",
              color: colors.hint,
              fontWeight: "bold"
            }}>
              BASED ON
            </Text>
            <img src={tonFooterSvg} alt="TON Logo" style={{ width: "24px", height: "24px" }} />
            <Text style={{
              fontSize: "12px",
              color: colors.hint,
              fontWeight: "bold"
            }}>
              DNS
            </Text>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1.1 }}>
            <Text style={{ fontSize: "9px", color: colors.hint }}>{new Date().getFullYear()} ©</Text>
            <Text style={{ fontSize: "9px", color: colors.hint }}>TON DNS</Text>
            <Text style={{ fontSize: "9px", color: colors.hint }}>Subdomains</Text>
          </div>

          {/* Бургер-меню — FAQ, ссылки для разработчиков, Community dapps,
              GitHub, Telegram-канал. */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Меню"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              alignItems: 'flex-end',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              flexShrink: 0,
              padding: 0,
            }}
          >
            <span style={{ display: 'block', width: '20px', height: '2px', background: colors.hint, borderRadius: '1px' }} />
            <span style={{ display: 'block', width: '20px', height: '2px', background: colors.hint, borderRadius: '1px' }} />
            <span style={{ display: 'block', width: '20px', height: '2px', background: colors.hint, borderRadius: '1px' }} />
          </button>
        </div>
      </List>
    </div>
  );
};

export default Footer;
