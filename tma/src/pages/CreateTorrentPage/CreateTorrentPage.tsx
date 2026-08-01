// tma/src/pages/CreateTorrentPage/CreateTorrentPage.tsx
//
// "Создать торрент" — загрузить файлы, выбрать провайдера TON Storage,
// получить bagID. Провайдеров берём напрямую с mytonprovider.org (у них
// Access-Control-Allow-Origin: *, прокси через свой бэкенд не нужен).
// Само создание bag'а — через subdom-server -> tonutils-storage демон
// (см. storage-daemon/, subdom-server/src/utils/storageDaemon.ts):
// POST /api/storage/create принимает multipart/form-data.
//
// Оплата провайдеру за реальное хранение (деплой storage-контракта) —
// отдельный будущий шаг, здесь не реализован: пока только create bag.

import React, { useEffect, useState } from 'react';
import { Page } from '@/components/Page';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

interface ProviderTelemetry {
  cpu_name?: string;
  cpu_number?: number;
  total_ram?: number; // GB
  usage_ram?: number; // GB
  ram_usage_percent?: number;
  total_provider_space?: number; // GB
  used_provider_space?: number; // GB
  qd64_disk_read_speed?: string;
  qd64_disk_write_speed?: string;
  speedtest_download?: number; // bit/s
  speedtest_upload?: number; // bit/s
  speedtest_ping?: number; // ms
  isp?: string;
}

interface Provider {
  pubkey: string;
  address: string;
  uptime: number;
  rating: number;
  price: number; // nanoTON per (MB * day), см. mytonprovider.org
  max_bag_size_bytes: number;
  location: { country: string; city: string };
  telemetry?: ProviderTelemetry;
}

async function fetchProviders(): Promise<Provider[]> {
  const res = await fetch('https://mytonprovider.org/api/v1/providers/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filters: { uptime_gt_percent: 20 },
      sort: { column: 'rating', order: 'desc' },
      exact: [],
      limit: 50,
      offset: 0,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.providers || [];
}

function formatPrice(nanoTonPerMbDay: number): string {
  // price в API — nanoTON за (МБ * день), переводим в TON для читаемости.
  return (nanoTonPerMbDay / 1e9).toFixed(6);
}

function formatSpeed(bitsPerSec?: number): string {
  if (!bitsPerSec) return '—';
  return (bitsPerSec / 1e6).toFixed(1) + ' Мбит/с';
}

function formatSpace(gb?: number): string {
  if (gb === undefined) return '—';
  return gb >= 1024 ? (gb / 1024).toFixed(1) + ' ТБ' : gb.toFixed(0) + ' ГБ';
}

const TABS = ['create', '10k'] as const;
type Tab = typeof TABS[number];

const CreateTorrentPage: React.FC = () => {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';
  const { t } = useLanguage();

  const [tab, setTab] = useState<Tab>('create');

  const [providers, setProviders] = useState<Provider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providersError, setProvidersError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('');

  const [files, setFiles] = useState<File[]>([]);
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [bagId, setBagId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    fetchProviders()
      .then((list) => {
        setProviders(list);
        if (list[0]) setSelectedProvider(list[0].pubkey);
      })
      .catch((e) => setProvidersError(e?.message || 'Ошибка загрузки провайдеров'))
      .finally(() => setProvidersLoading(false));
  }, []);

  const colors = {
    text: isDark ? '#F9FAFB' : '#1F2937',
    textSecondary: isDark ? '#9CA3AF' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
    background: isDark ? '#1F2937' : '#FFFFFF',
    accent: isDark ? '#FFD700' : '#3B82F6',
  };

  const tabButtonStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '10px 12px',
    borderRadius: '10px',
    border: `1px solid ${active ? colors.accent : colors.border}`,
    background: active ? colors.accent : 'transparent',
    color: active ? (isDark ? '#000' : '#fff') : colors.text,
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
  });

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: `1px solid ${colors.border}`,
    background: 'transparent',
    color: colors.text,
    fontSize: '13px',
    marginBottom: '12px',
    boxSizing: 'border-box',
  };

  const handleCreate = async () => {
    if (files.length === 0 || creating) return;
    setCreating(true);
    setCreateError(null);
    setBagId(null);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));
      formData.append('description', description);

      const res = await fetch(`${API_BASE_URL}/api/storage/create`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setBagId(data.bagId);
    } catch (e: any) {
      setCreateError(e?.message || 'Ошибка создания bag');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Page back={true}>
      <div style={{ maxWidth: '425px', margin: '0 auto', padding: '20px 16px 180px 16px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: colors.text, margin: '0 0 16px 0' }}>
          {t('createTorrentTitle') || 'Создать торрент'}
        </h1>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button style={tabButtonStyle(tab === 'create')} onClick={() => setTab('create')}>
            {t('createTorrentTabCreate') || 'Создать'}
          </button>
          <button style={tabButtonStyle(tab === '10k')} onClick={() => setTab('10k')}>
            10k Club
          </button>
        </div>

        {tab === 'create' && (
          <>
            <p style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '16px' }}>
              {t('createTorrentDescription') ||
                'Загрузи файлы сайта — они превратятся в bagID (TON Storage), который потом можно вписать в DNS-запись домена.'}
            </p>

            <input
              type="file"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              style={{ ...inputStyle, padding: '8px' }}
            />
            {files.length > 0 && (
              <p style={{ fontSize: '11px', color: colors.textSecondary, marginTop: '-8px', marginBottom: '12px' }}>
                {files.length} {t('createTorrentFilesSelected') || 'файл(ов) выбрано'}
              </p>
            )}

            <input
              type="text"
              placeholder={t('createTorrentDescriptionPlaceholder') || 'Описание (необязательно)'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={inputStyle}
            />

            <label style={{ fontSize: '12px', color: colors.textSecondary, display: 'block', marginBottom: '6px' }}>
              {t('createTorrentProviderLabel') || 'Провайдер хранения'}
              {!providersLoading && !providersError && (
                <span style={{ opacity: 0.7 }}>
                  {' '}
                  ({t('createTorrentProvidersFound') || 'найдено'}: {providers.length})
                </span>
              )}
            </label>
            {providersLoading && (
              <p style={{ fontSize: '12px', color: colors.textSecondary }}>{t('loading') || 'Загрузка...'}</p>
            )}
            {providersError && (
              <p style={{ fontSize: '12px', color: '#e53935' }}>{providersError}</p>
            )}
            {!providersLoading && !providersError && (
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {providers.map((p) => (
                  <option key={p.pubkey} value={p.pubkey}>
                    {(p.location?.country || '?')} — {p.rating.toFixed(1)}★ — uptime {p.uptime.toFixed(1)}% —{' '}
                    {formatPrice(p.price)} TON/МБ/день — свободно {formatSpace(
                      p.telemetry ? p.telemetry.total_provider_space! - p.telemetry.used_provider_space! : undefined
                    )}
                  </option>
                ))}
              </select>
            )}

            {(() => {
              const selected = providers.find((p) => p.pubkey === selectedProvider);
              if (!selected?.telemetry) return null;
              const tel = selected.telemetry;
              return (
                <div
                  style={{
                    border: `1px solid ${colors.border}`,
                    borderRadius: '10px',
                    padding: '12px',
                    marginBottom: '12px',
                    fontSize: '11px',
                    color: colors.textSecondary,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '6px 12px',
                  }}
                >
                  <div>💰 {formatPrice(selected.price)} TON/МБ/день</div>
                  <div>📦 {formatSpace(tel.total_provider_space && tel.used_provider_space !== undefined ? tel.total_provider_space - tel.used_provider_space : undefined)} {t('createTorrentFreeSpace') || 'свободно'}</div>
                  <div>⬇️ {formatSpeed(tel.speedtest_download)}</div>
                  <div>⬆️ {formatSpeed(tel.speedtest_upload)}</div>
                  <div>📶 ping {tel.speedtest_ping !== undefined ? tel.speedtest_ping.toFixed(0) + ' мс' : '—'}</div>
                  <div>🖥️ {tel.cpu_number || '—'} CPU</div>
                  <div style={{ gridColumn: '1 / -1' }}>🌐 {tel.isp || '—'}</div>
                </div>
              );
            })()}

            <button
              onClick={handleCreate}
              disabled={files.length === 0 || creating}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: 'none',
                background: files.length === 0 || creating ? colors.border : colors.accent,
                color: isDark ? '#000' : '#fff',
                fontWeight: 700,
                fontSize: '14px',
                cursor: files.length === 0 || creating ? 'default' : 'pointer',
                marginTop: '8px',
              }}
            >
              {creating ? (t('processing') || 'Создание...') : (t('createTorrentButton') || 'Создать bagID')}
            </button>

            {createError && (
              <p style={{ fontSize: '12px', color: '#e53935', marginTop: '12px' }}>{createError}</p>
            )}
            {bagId && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.accent}`,
                  fontSize: '12px',
                  color: colors.text,
                  wordBreak: 'break-all',
                }}
              >
                <strong>bagID:</strong> {bagId}
                <p style={{ color: colors.textSecondary, marginTop: '8px', marginBottom: 0 }}>
                  {t('createTorrentPaymentTodo') ||
                    'Дальше: оплата провайдеру (деплой storage-контракта) и запись bagID в DNS-запись домена — пока не реализовано.'}
                </p>
              </div>
            )}
          </>
        )}

        {tab === '10k' && (
          <p style={{ fontSize: '13px', color: colors.textSecondary, textAlign: 'center', padding: '40px 0' }}>
            {t('comingSoon') || 'Скоро'}
          </p>
        )}
      </div>
    </Page>
  );
};

export default CreateTorrentPage;
