// tma/src/components/LupaButton/LupaButton.tsx
//
// Переиспользуемая кнопка-"сеть" на карточках зон/субдоменов/маркета/менеджера:
// клик открывает поп-меню "Открыть кошелек" / "Открыть как сайт" / "Открыть
// как торрент". Резолв site/storage — через ownerMetaService.fetchSiteAndStorageRecords
// (прямой dnsresolve по адресу NFT-айтема, который уже используют
// title/description/picture там же) — а не через dnsRecordsSlice/toncenter
// REST-поиск по имени домена, который (как и tonapi.io) находит только
// корневые .ton-домены и не резолвит кастомные субдомены платформы.
// bagID-детали — через тот же /api/storage/details, что и в CreateTorrentPage.
//
// Меню рендерится через портал в document.body с position:fixed — если бы
// оно жило внутри карточки/картинки как обычный ребёнок, оно бы обрезалось
// их overflow:hidden (сама картинка триммится под borderRadius).

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { fetchSiteAndStorageRecords } from '@/services/ownerMetaService';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { isRealTelegramEnv } from '@/mockEnv';
import { tonsiteToGatewayUrl } from '@/utils/tonUtils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const MENU_WIDTH = 240;
const MENU_HEIGHT_ESTIMATE = 230;

interface BagDetails {
  bag_id: string;
  size: number;
  piece_size: number;
  bag_size: number;
  merkle_hash: string;
}

interface LupaButtonProps {
  domain: string;
  address: string;
  isTestnet?: boolean;
  size?: number;
  corner?: 'top-right' | 'bottom-right';
  offset?: number;
  // Кнопка сети показывается ВСЕГДА (адрес есть у любого итема, "Открыть
  // кошелек" в тонвьювере работает безусловно) — не гейтится этим пропом.
  // Используется только как быстрый шорткат для "Открыть как сайт": если
  // кроулер уже подтвердил false (сайт не отвечает через *.ton.run),
  // сразу показываем "не найдено" без повторного живого запроса. Если
  // undefined/null (кроулер ещё не проверял) или true — делаем обычный
  // живой ончейн-чек (fetchSiteAndStorageRecords), как и раньше.
  siteResolves?: boolean | null;
}

type InlineResult =
  | { kind: 'site-not-found' }
  | { kind: 'torrent-not-found' }
  | { kind: 'torrent-found'; bagId: string; details: BagDetails | null }
  | null;

export const LupaButton: React.FC<LupaButtonProps> = ({
  domain,
  address,
  isTestnet = false,
  size = 60,
  corner = 'top-right',
  offset = 8,
  siteResolves,
}) => {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';
  const { t } = useLanguage();
  const navigate = useNavigate();

  // "sub.zone.ton" (3+ части) — субдомен, "zone.ton" (2 части) — домен/зона.
  // Для формулировки "не найдено": юзер попросил различать домен/субдомен
  // в тексте, не одну общую фразу на оба случая.
  const isSubdomainItem = domain.split('.').filter(Boolean).length >= 3;

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [busy, setBusy] = useState<'site' | 'torrent' | null>(null);
  const [result, setResult] = useState<InlineResult>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const colors = {
    text: isDark ? '#F9FAFB' : '#1F2937',
    textSecondary: isDark ? '#9CA3AF' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
    menuBg: isDark ? '#111827' : '#FFFFFF',
    hoverBg: isDark ? '#1F2937' : '#F3F4F6',
    accent: isDark ? '#FFD700' : '#3B82F6',
    error: '#e53935',
  };

  const toggleOpen = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();

      const spaceRight = window.innerWidth - rect.left;
      const spaceLeftSide = rect.right;
      const alignRightEdgeToTrigger = spaceLeftSide >= MENU_WIDTH || spaceLeftSide >= spaceRight;
      let left = alignRightEdgeToTrigger ? rect.right - MENU_WIDTH : rect.left;
      left = Math.min(Math.max(left, 8), window.innerWidth - MENU_WIDTH - 8);

      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openDown = spaceBelow >= MENU_HEIGHT_ESTIMATE || spaceBelow >= spaceAbove;
      let top = openDown ? rect.bottom + 8 : rect.top - MENU_HEIGHT_ESTIMATE - 8;
      top = Math.min(Math.max(top, 8), window.innerHeight - 8);

      setPos({ top, left });
      setResult(null);
    }
    setOpen((v) => !v);
  };

  const handleOpenWallet = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://${isTestnet ? 'testnet.' : ''}tonviewer.com/${address}`, '_blank', 'noopener,noreferrer');
    setOpen(false);
  };

  const handleOpenAsSite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Бэкенд-кроулер уже точечно пинговал этот домен и получил явный отказ —
    // не дублируем живой ончейн-запрос, сразу показываем результат.
    if (siteResolves === false) {
      setResult({ kind: 'site-not-found' });
      return;
    }
    setBusy('site');
    setResult(null);
    try {
      const parsed = await fetchSiteAndStorageRecords(address, isTestnet);
      if (parsed.siteAdnl) {
        // window.open('tonsite://...') открывал ссылку в ТЕКУЩЕЙ вкладке
        // вместо отдельной — кастомные URI-схемы браузеры обрабатывают через
        // window.open ненадёжно. Клик по настоящему <a href> — тот же
        // паттерн, что уже работает в ManageDomainPage/AvatarSecretPage.
        // Вне Telegram (обычный браузер) — гейтвей *.ton.run вместо
        // tonsite://, браузер кастомную схему не понимает и просто ничего
        // не сделает по клику.
        const link = document.createElement('a');
        if (isRealTelegramEnv) {
          link.href = `tonsite://${domain}`;
        } else {
          link.href = tonsiteToGatewayUrl(`tonsite://${domain}`);
          link.target = '_blank';
        }
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setOpen(false);
      } else {
        setResult({ kind: 'site-not-found' });
      }
    } catch {
      setResult({ kind: 'site-not-found' });
    } finally {
      setBusy(null);
    }
  };

  const handleOpenAsTorrent = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBusy('torrent');
    setResult(null);
    try {
      const parsed = await fetchSiteAndStorageRecords(address, isTestnet);
      if (parsed.storageBagId) {
        let details: BagDetails | null = null;
        try {
          const res = await fetch(`${API_BASE_URL}/api/storage/details?bag_id=${encodeURIComponent(parsed.storageBagId)}`);
          if (res.ok) details = await res.json();
        } catch {
          details = null;
        }
        setResult({ kind: 'torrent-found', bagId: parsed.storageBagId, details });
      } else {
        setResult({ kind: 'torrent-not-found' });
      }
    } catch {
      setResult({ kind: 'torrent-not-found' });
    } finally {
      setBusy(null);
    }
  };

  // Ведёт в CreateTorrentPage, вкладка "Загрузить", с уже вбитым bagID —
  // сама загрузка стартует только когда юзер жмёт "Загрузить" там (см.
  // комментарий у эффекта чтения ?bagId= в CreateTorrentPage.tsx — раньше
  // тут же автостартовало скачивание через бэкенд без явного клика).
  const handleGoToDownload = (bagId: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    navigate(`/create-torrent?bagId=${encodeURIComponent(bagId)}&tab=download`);
  };

  const menuItemStyle = (key: string): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '13px 16px',
    background: hoveredItem === key ? colors.hoverBg : 'transparent',
    border: 'none',
    borderBottom: `1px solid ${colors.border}`,
    color: colors.text,
    fontSize: '14px',
    fontFamily: 'monospace',
    textAlign: 'left',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background 0.12s ease',
  });

  const menu = open && pos ? (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        width: `${MENU_WIDTH}px`,
        background: colors.menuBg,
        border: `1px solid ${colors.border}`,
        borderRadius: '14px',
        boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        zIndex: 1000,
      }}
    >
      <button
        onClick={handleOpenWallet}
        onMouseEnter={() => setHoveredItem('wallet')}
        onMouseLeave={() => setHoveredItem(null)}
        style={{ ...menuItemStyle('wallet'), fontSize: '20px' }}
      >
        <span>👛</span>
        <span style={{ fontSize: '14px' }}>{t('lupaOpenWallet') || 'Открыть кошелек'}</span>
      </button>
      <button
        onClick={handleOpenAsSite}
        onMouseEnter={() => setHoveredItem('site')}
        onMouseLeave={() => setHoveredItem(null)}
        style={menuItemStyle('site')}
        disabled={busy !== null}
      >
        <span style={{ fontSize: '20px' }}>🖥️</span>
        <span>{busy === 'site' ? (t('processing') || 'Обработка...') : (t('lupaOpenAsSite') || 'Открыть как сайт')}</span>
      </button>
      <button
        onClick={handleOpenAsTorrent}
        onMouseEnter={() => setHoveredItem('torrent')}
        onMouseLeave={() => setHoveredItem(null)}
        style={{ ...menuItemStyle('torrent'), borderBottom: result ? `1px solid ${colors.border}` : 'none' }}
        disabled={busy !== null}
      >
        <span style={{ fontSize: '20px' }}>📦</span>
        <span>{busy === 'torrent' ? (t('processing') || 'Обработка...') : (t('lupaOpenAsTorrent') || 'Открыть как торрент')}</span>
      </button>

      {result?.kind === 'site-not-found' && (
        <div style={{ padding: '12px 16px', fontSize: '12px', color: colors.error }}>
          {isSubdomainItem
            ? (t('lupaSiteNotFoundSubdomain') || 'На субдомене ещё нет сайта')
            : (t('lupaSiteNotFoundDomain') || 'На домене ещё нет сайта')}
        </div>
      )}
      {result?.kind === 'torrent-not-found' && (
        <div style={{ padding: '12px 16px', fontSize: '12px', color: colors.error }}>
          {isSubdomainItem
            ? (t('lupaTorrentNotFoundSubdomain') || 'На субдомене ещё нет торрента')
            : (t('lupaTorrentNotFoundDomain') || 'На домене ещё нет торрента')}
        </div>
      )}
      {result?.kind === 'torrent-found' && (
        <div style={{ padding: '12px 16px', fontSize: '12px', color: colors.textSecondary, wordBreak: 'break-all' }}>
          <div style={{ color: colors.text, fontWeight: 600, marginBottom: '4px' }}>bagID</div>
          <div>{result.bagId}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', gap: '8px' }}>
            {result.details ? (
              <span>
                {t('lupaTorrentSize') || 'Размер'}: {(result.details.bag_size / (1024 * 1024)).toFixed(2)} МБ
              </span>
            ) : <span />}
            <button
              onClick={handleGoToDownload(result.bagId)}
              title={t('lupaDownloadTorrent') || 'Скачать'}
              style={{
                flexShrink: 0,
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                border: 'none',
                background: '#4ade80',
                color: '#0a2e14',
                fontSize: '15px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(74, 222, 128, 0.5)',
              }}
            >
              ↓
            </button>
          </div>
        </div>
      )}
    </div>
  ) : null;

  return (
    <>
      <div
        style={{
          position: 'absolute',
          ...(corner === 'bottom-right' ? { bottom: `${offset}px` } : { top: `${offset}px` }),
          right: `${offset}px`,
          zIndex: 2,
        }}
      >
        <button
          ref={triggerRef}
          onClick={(e) => {
            e.stopPropagation();
            toggleOpen();
          }}
          title={t('lupaButtonTitle') || 'Открыть / проверить'}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            border: `1px solid ${colors.border}`,
            background: isDark ? 'rgba(17,24,39,0.85)' : 'rgba(255,255,255,0.9)',
            color: colors.text,
            fontSize: `${Math.round(size * 0.45)}px`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
            transition: 'transform 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          🌐
        </button>
      </div>

      {menu && createPortal(menu, document.body)}
    </>
  );
};

export default LupaButton;
