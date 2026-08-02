// tma/src/components/LupaButton/LupaButton.tsx
//
// Переиспользуемая кнопка-"сеть" на карточках зон/субдоменов/маркета/менеджера:
// клик открывает поп-меню "Открыть кошелек" / "Открыть как сайт" / "Открыть
// как торрент". Резолв site/storage через уже существующий dnsRecordsSlice
// (fetchDNSRecords -> parseDNSRecord), bagID-детали — через тот же
// /api/storage/details, что и в CreateTorrentPage.
//
// Меню рендерится через портал в document.body с position:fixed — если бы
// оно жило внутри карточки/картинки как обычный ребёнок, оно бы обрезалось
// их overflow:hidden (сама картинка триммится под borderRadius).

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/store/store';
import { fetchDNSRecords, fetchTestnetDNSRecords, parseDNSRecord } from '@/store/dns/dnsRecordsSlice';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

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
}) => {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';
  const { t } = useLanguage();
  const dispatch = useDispatch<AppDispatch>();

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

  const resolveDns = async () => {
    const thunk = isTestnet ? fetchTestnetDNSRecords : fetchDNSRecords;
    const data = await dispatch(thunk(domain)).unwrap();
    const record = data.records.find((r) => r.domain === domain) || data.records[0];
    if (!record) return null;
    return parseDNSRecord(record, data.address_book);
  };

  const handleOpenWallet = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://app.tonkeeper.com/nft/${address}`, '_blank', 'noopener,noreferrer');
    setOpen(false);
  };

  const handleOpenAsSite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBusy('site');
    setResult(null);
    try {
      const parsed = await resolveDns();
      if (parsed?.siteAdnl) {
        window.open(`tonsite://${domain}`, '_blank', 'noopener,noreferrer');
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
      const parsed = await resolveDns();
      if (parsed?.storageBagId) {
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
          {t('lupaSiteNotFound') || 'ADNL-запись сайта не найдена'}
        </div>
      )}
      {result?.kind === 'torrent-not-found' && (
        <div style={{ padding: '12px 16px', fontSize: '12px', color: colors.error }}>
          {t('lupaTorrentNotFound') || 'bagID-запись не найдена'}
        </div>
      )}
      {result?.kind === 'torrent-found' && (
        <div style={{ padding: '12px 16px', fontSize: '12px', color: colors.textSecondary, wordBreak: 'break-all' }}>
          <div style={{ color: colors.text, fontWeight: 600, marginBottom: '4px' }}>bagID</div>
          <div>{result.bagId}</div>
          {result.details && (
            <div style={{ marginTop: '6px' }}>
              {t('lupaTorrentSize') || 'Размер'}: {(result.details.bag_size / (1024 * 1024)).toFixed(2)} МБ
            </div>
          )}
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
          }}
        >
          🌐
        </button>
      </div>

      {menu && createPortal(menu, document.body)}
    </>
  );
};

export default LupaButton;
