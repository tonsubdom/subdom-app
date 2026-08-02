// tma/src/components/LupaButton/LupaButton.tsx
//
// Переиспользуемая "лупа" на карточках зон/субдоменов/маркета/менеджера:
// клик открывает поп-меню "Открыть кошелек" / "Открыть как сайт" / "Открыть
// как торрент". Резолв site/storage через уже существующий dnsRecordsSlice
// (fetchDNSRecords -> parseDNSRecord), bagID-детали — через тот же
// /api/storage/details, что и в CreateTorrentPage.

import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/store/store';
import { fetchDNSRecords, fetchTestnetDNSRecords, parseDNSRecord } from '@/store/dns/dnsRecordsSlice';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

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
  const [openLeft, setOpenLeft] = useState(true);
  const [openDown, setOpenDown] = useState(true);
  const [busy, setBusy] = useState<'site' | 'torrent' | null>(null);
  const [result, setResult] = useState<InlineResult>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const colors = {
    text: isDark ? '#F9FAFB' : '#1F2937',
    textSecondary: isDark ? '#9CA3AF' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
    menuBg: isDark ? '#111827' : '#FFFFFF',
    accent: isDark ? '#FFD700' : '#3B82F6',
    error: '#e53935',
  };

  const toggleOpen = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuWidth = 210;
      const menuHeight = 200;

      const spaceLeftOfTrigger = rect.right;
      const spaceRightOfTrigger = window.innerWidth - rect.left;
      setOpenLeft(spaceLeftOfTrigger >= menuWidth || spaceLeftOfTrigger >= spaceRightOfTrigger);

      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenDown(spaceBelow >= menuHeight || spaceBelow >= spaceAbove);

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

  const menuItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '10px 12px',
    background: 'transparent',
    border: 'none',
    borderBottom: `1px solid ${colors.border}`,
    color: colors.text,
    fontSize: '12px',
    fontFamily: 'monospace',
    textAlign: 'left',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      ref={rootRef}
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

      {open && (
        <div
          style={{
            position: 'absolute',
            ...(openDown ? { top: `${size + 6}px` } : { bottom: `${size + 6}px` }),
            ...(openLeft ? { right: 0 } : { left: 0 }),
            width: '210px',
            background: colors.menuBg,
            border: `1px solid ${colors.border}`,
            borderRadius: '10px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
            overflow: 'hidden',
          }}
        >
          <button onClick={handleOpenWallet} style={menuItemStyle}>
            👛 {t('lupaOpenWallet') || 'Открыть кошелек'}
          </button>
          <button onClick={handleOpenAsSite} style={menuItemStyle} disabled={busy !== null}>
            🖥️ {busy === 'site' ? (t('processing') || 'Обработка...') : (t('lupaOpenAsSite') || 'Открыть как сайт')}
          </button>
          <button onClick={handleOpenAsTorrent} style={{ ...menuItemStyle, borderBottom: 'none' }} disabled={busy !== null}>
            📦 {busy === 'torrent' ? (t('processing') || 'Обработка...') : (t('lupaOpenAsTorrent') || 'Открыть как торрент')}
          </button>

          {result?.kind === 'site-not-found' && (
            <div style={{ padding: '8px 12px', fontSize: '11px', color: colors.error, borderTop: `1px solid ${colors.border}` }}>
              {t('lupaSiteNotFound') || 'ADNL-запись сайта не найдена'}
            </div>
          )}
          {result?.kind === 'torrent-not-found' && (
            <div style={{ padding: '8px 12px', fontSize: '11px', color: colors.error, borderTop: `1px solid ${colors.border}` }}>
              {t('lupaTorrentNotFound') || 'bagID-запись не найдена'}
            </div>
          )}
          {result?.kind === 'torrent-found' && (
            <div style={{ padding: '8px 12px', fontSize: '11px', color: colors.textSecondary, borderTop: `1px solid ${colors.border}`, wordBreak: 'break-all' }}>
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
      )}
    </div>
  );
};

export default LupaButton;
