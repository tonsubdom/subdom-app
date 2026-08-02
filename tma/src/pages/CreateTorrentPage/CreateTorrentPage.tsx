// tma/src/pages/CreateTorrentPage/CreateTorrentPage.tsx
//
// "Создать торрент" — загрузить файлы, выбрать провайдера TON Storage,
// получить bagID, оплатить провайдеру (реальный storage-contract на чейне,
// см. utils/storageContract.ts) и опционально сразу привязать bagID в
// DNS-запись домена. Провайдеров берём напрямую с mytonprovider.org (у них
// Access-Control-Allow-Origin: *, прокси через свой бэкенд не нужен). Само
// создание bag'а — через subdom-server -> tonutils-storage демон
// (см. storage-daemon/, subdom-server/src/utils/storageDaemon.ts):
// POST /api/storage/create принимает multipart/form-data.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { Page } from '@/components/Page';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppDispatch } from '@/store/store';
import { setStorageRecord } from '@/store/dns/dnsRecordsSlice';
import { resolveDomainNftAddress } from '@/services/ownerMetaService';
import {
  calculateStorageCostNanoTon,
  prepareStorageDeal,
  ratePerMbDayFromMyTonProviderPrice,
  toTonConnectMessage,
  tonscanAddressUrl,
  type StorageProviderDeal,
} from '@/utils/storageContract';
import { Address } from '@ton/core';

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
  price: number; // nanoTON — стоимость хранения 200 ГБ за 30 дней (см. utils/storageContract.ts)
  max_span: number; // секунды
  max_bag_size_bytes: number;
  location: { country: string; city: string };
  telemetry?: ProviderTelemetry;
}

interface BagDetails {
  bag_id: string;
  size: number;
  piece_size: number;
  bag_size: number;
  merkle_hash: string;
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

function freeSpaceGb(p: Provider): number {
  if (!p.telemetry?.total_provider_space || p.telemetry.used_provider_space === undefined) return 0;
  return p.telemetry.total_provider_space - p.telemetry.used_provider_space;
}

function formatSpace(gb: number): string {
  if (!gb) return '—';
  return gb >= 1024 ? (gb / 1024).toFixed(1) + ' ТБ' : gb.toFixed(0) + ' ГБ';
}

function formatSpeed(bitsPerSec?: number): string {
  if (!bitsPerSec) return '—';
  return (bitsPerSec / 1e6).toFixed(1) + ' Мбит/с';
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(2) + ' ГБ';
  if (bytes >= 1024 ** 2) return (bytes / 1024 ** 2).toFixed(2) + ' МБ';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' КБ';
  return bytes + ' Б';
}

function formatTon(nanoTon: bigint | number): string {
  const n = typeof nanoTon === 'bigint' ? Number(nanoTon) : nanoTon;
  const ton = n / 1e9;
  if (ton === 0) return '0';
  if (ton < 0.001) return ton.toFixed(6);
  if (ton < 1) return ton.toFixed(4);
  return ton.toFixed(2);
}

type SortField = 'rating' | 'price' | 'uptime' | 'freeSpace';
const TABS = ['create', '10k'] as const;
type Tab = typeof TABS[number];

const CreateTorrentPage: React.FC = () => {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';
  const { t } = useLanguage();
  const dispatch = useDispatch<AppDispatch>();
  const [tonConnectUI] = useTonConnectUI();
  const userAddress = useTonAddress();
  // TODO: подхватить реальный флаг сети, как в остальном приложении
  // (сейчас страница не завязана на isTestnet нигде — оставляем mainnet).
  const isTestnet = false;

  const [tab, setTab] = useState<Tab>('create');

  const [providers, setProviders] = useState<Provider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providersError, setProvidersError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('rating');
  const [sortDesc, setSortDesc] = useState(true);

  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [description, setDescription] = useState('');
  const [days, setDays] = useState<number>(30);

  const [creating, setCreating] = useState(false);
  const [bagId, setBagId] = useState<string | null>(null);
  const [bagDetails, setBagDetails] = useState<BagDetails | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const [bindImmediately, setBindImmediately] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [binding, setBinding] = useState(false);
  const [bindResult, setBindResult] = useState<'success' | 'error' | null>(null);
  const [bindMessage, setBindMessage] = useState<string | null>(null);

  const [dealPreparing, setDealPreparing] = useState(false);
  const [dealError, setDealError] = useState<string | null>(null);
  const [dealContractAddress, setDealContractAddress] = useState<Address | null>(null);
  const [dealSent, setDealSent] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProviders()
      .then((list) => {
        setProviders(list);
        if (list[0]) setSelectedProvider(list[0].pubkey);
      })
      .catch((e) => setProvidersError(e?.message || 'Ошибка загрузки провайдеров'))
      .finally(() => setProvidersLoading(false));
  }, []);

  const sortedProviders = useMemo(() => {
    const list = [...providers];
    const value = (p: Provider): number => {
      switch (sortField) {
        case 'rating':
          return p.rating;
        case 'price':
          return p.price;
        case 'uptime':
          return p.uptime;
        case 'freeSpace':
          return freeSpaceGb(p);
      }
    };
    list.sort((a, b) => (sortDesc ? value(b) - value(a) : value(a) - value(b)));
    return list;
  }, [providers, sortField, sortDesc]);

  const selected = providers.find((p) => p.pubkey === selectedProvider);
  const totalBytes = useMemo(() => files.reduce((sum, f) => sum + f.size, 0), [files]);

  const ratePerMbDay = selected ? ratePerMbDayFromMyTonProviderPrice(selected.price) : 0n;
  const totalCostNanoTon = selected && totalBytes > 0
    ? calculateStorageCostNanoTon(selected.price, totalBytes, days)
    : 0n;
  const oversizeProvider = !!selected && totalBytes > selected.max_bag_size_bytes;

  const colors = {
    text: isDark ? '#F9FAFB' : '#1F2937',
    textSecondary: isDark ? '#9CA3AF' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
    background: isDark ? '#1F2937' : '#FFFFFF',
    accent: isDark ? '#FFD700' : '#3B82F6',
    error: '#e53935',
    success: '#4ade80',
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

  const sortButtonStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 10px',
    borderRadius: '8px',
    border: `1px solid ${active ? colors.accent : colors.border}`,
    background: active ? `${colors.accent}22` : 'transparent',
    color: active ? colors.accent : colors.textSecondary,
    fontWeight: 600,
    fontSize: '11px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
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

  const primaryButtonStyle = (disabled: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: 'none',
    background: disabled ? colors.border : colors.accent,
    color: isDark ? '#000' : '#fff',
    fontWeight: 700,
    fontSize: '14px',
    cursor: disabled ? 'default' : 'pointer',
    marginTop: '8px',
  });

  // ====== DROPZONE ======
  const addFiles = (incoming: FileList | File[]) => {
    setFiles((prev) => [...prev, ...Array.from(incoming)]);
  };
  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  // ====== СОЗДАНИЕ BAG'А ======
  const fetchBagDetails = async (id: string): Promise<BagDetails | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/storage/details?bag_id=${encodeURIComponent(id)}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  };

  const handleCreate = async () => {
    if (files.length === 0 || creating) return;
    setCreating(true);
    setCreateError(null);
    setBagId(null);
    setBagDetails(null);
    setBindResult(null);
    setBindMessage(null);
    setDealContractAddress(null);
    setDealSent(false);
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

      const details = await fetchBagDetails(data.bagId);
      setBagDetails(details);

      if (bindImmediately && domainInput.trim()) {
        await handleBind(data.bagId);
      }
    } catch (e: any) {
      setCreateError(e?.message || 'Ошибка создания bag');
    } finally {
      setCreating(false);
    }
  };

  // ====== ПРИВЯЗКА bagID В DNS ======
  const handleBind = async (bagIdOverride?: string) => {
    const id = bagIdOverride || bagId;
    if (!id || !domainInput.trim() || !userAddress) return;
    setBinding(true);
    setBindResult(null);
    setBindMessage(null);
    try {
      const domain = domainInput.trim().toLowerCase();
      // Пробуем как есть первым (t.me/.gram и т.п. не нуждаются в ".ton"),
      // и только потом — с ".ton" на конце, см. тот же фикс в AvatarSecretPage.
      let resolved = await resolveDomainNftAddress(domain, isTestnet);
      if (!resolved && !domain.endsWith('.ton')) {
        resolved = await resolveDomainNftAddress(`${domain}.ton`, isTestnet);
      }
      if (!resolved) {
        throw new Error(t('createTorrentDomainNotFound') || 'Домен не найден');
      }
      const result = await dispatch(
        setStorageRecord({
          dnsItemAddress: resolved.nftAddress,
          bagIdHex: id,
          tonConnectUI,
        })
      ).unwrap();
      setBindResult('success');
      setBindMessage(null);
      void result;
    } catch (e: any) {
      setBindResult('error');
      setBindMessage(e?.message || 'Ошибка привязки bagID');
    } finally {
      setBinding(false);
    }
  };

  // ====== ОПЛАТА ПРОВАЙДЕРУ (реальный storage-contract) ======
  const handleDeploy = async () => {
    if (!selected || !bagId || !bagDetails || !userAddress || dealPreparing) return;
    setDealPreparing(true);
    setDealError(null);
    try {
      const owner = Address.parse(userAddress);
      const providerDeal: StorageProviderDeal = {
        pubkey: selected.pubkey,
        address: selected.address,
        maxSpanSeconds: selected.max_span,
        ratePerMbDayNanoTon: ratePerMbDayFromMyTonProviderPrice(selected.price),
      };
      const deal = prepareStorageDeal(
        {
          bagIdHex: bagId,
          merkleHashHex: bagDetails.merkle_hash,
          fileSizeBytes: bagDetails.bag_size,
          pieceSizeBytes: bagDetails.piece_size,
        },
        owner,
        [providerDeal],
        totalCostNanoTon
      );
      setDealContractAddress(deal.contractAddress);

      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 360,
        messages: [toTonConnectMessage(deal, isTestnet)],
      });
      setDealSent(true);
    } catch (e: any) {
      setDealError(e?.message || 'Ошибка отправки транзакции');
    } finally {
      setDealPreparing(false);
    }
  };

  const canDeploy = !!selected && !!bagId && !!bagDetails && !!userAddress && !oversizeProvider;

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

            {/* ====== DROPZONE ====== */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragActive ? colors.accent : colors.border}`,
                borderRadius: '12px',
                padding: '24px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                marginBottom: '8px',
                background: dragActive ? `${colors.accent}11` : 'transparent',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>📁</div>
              <div style={{ fontSize: '13px', color: colors.text, fontWeight: 600 }}>
                {t('createTorrentDropzoneTitle') || 'Перетащи файлы сюда или нажми, чтобы выбрать'}
              </div>
              <div style={{ fontSize: '11px', color: colors.textSecondary, marginTop: '6px' }}>
                {t('createTorrentDropzoneHint') ||
                  'Любые файлы и архивы, несколько штук за раз. До 200 МБ на файл, до 50 файлов.'}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => e.target.files && addFiles(e.target.files)}
                style={{ display: 'none' }}
              />
            </div>

            {files.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                {files.map((f, idx) => (
                  <div
                    key={`${f.name}-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      background: colors.background,
                      border: `1px solid ${colors.border}`,
                      marginBottom: '6px',
                      fontSize: '12px',
                    }}
                  >
                    <span style={{ color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '8px' }}>
                      {f.name}
                    </span>
                    <span style={{ color: colors.textSecondary, marginRight: '8px', whiteSpace: 'nowrap' }}>
                      {formatBytes(f.size)}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                      style={{ background: 'none', border: 'none', color: colors.error, cursor: 'pointer', fontSize: '14px', padding: 0 }}
                      aria-label={t('createTorrentRemoveFile') || 'Убрать файл'}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <p style={{ fontSize: '11px', color: colors.textSecondary, margin: '4px 0 0 0' }}>
                  {t('createTorrentTotalSize') || 'Итого'}: {formatBytes(totalBytes)}
                  {oversizeProvider && (
                    <span style={{ color: colors.error }}>
                      {' '}— {t('createTorrentTooBigForProvider') || 'больше лимита выбранного провайдера'} ({formatBytes(selected!.max_bag_size_bytes)})
                    </span>
                  )}
                </p>
              </div>
            )}

            <input
              type="text"
              placeholder={t('createTorrentDescriptionPlaceholder') || 'Описание (необязательно)'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={inputStyle}
            />

            {/* ====== ПРОВАЙДЕР + СОРТИРОВКА ====== */}
            <label style={{ fontSize: '12px', color: colors.textSecondary, display: 'block', marginBottom: '6px' }}>
              {t('createTorrentProviderLabel') || 'Провайдер хранения'}
              {!providersLoading && !providersError && (
                <span style={{ opacity: 0.7 }}> ({t('createTorrentProvidersFound') || 'найдено'}: {providers.length})</span>
              )}
            </label>

            {!providersLoading && !providersError && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', overflowX: 'auto' }}>
                {([
                  ['rating', t('createTorrentSortRating') || 'Рейтинг'],
                  ['price', t('createTorrentSortPrice') || 'Цена'],
                  ['uptime', t('createTorrentSortUptime') || 'Uptime'],
                  ['freeSpace', t('createTorrentSortSpace') || 'Свободно'],
                ] as [SortField, string][]).map(([field, label]) => (
                  <button
                    key={field}
                    onClick={() => {
                      if (sortField === field) setSortDesc((v) => !v);
                      else { setSortField(field); setSortDesc(true); }
                    }}
                    style={sortButtonStyle(sortField === field)}
                  >
                    {label} {sortField === field ? (sortDesc ? '↓' : '↑') : ''}
                  </button>
                ))}
              </div>
            )}

            {providersLoading && (
              <p style={{ fontSize: '12px', color: colors.textSecondary }}>{t('loading') || 'Загрузка...'}</p>
            )}
            {providersError && <p style={{ fontSize: '12px', color: colors.error }}>{providersError}</p>}
            {!providersLoading && !providersError && (
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {sortedProviders.map((p) => (
                  <option key={p.pubkey} value={p.pubkey}>
                    {p.location?.country || '?'} — {p.rating.toFixed(1)}★ — uptime {p.uptime.toFixed(1)}% —{' '}
                    {formatTon(p.price)} TON/200ГБ/мес — свободно {formatSpace(freeSpaceGb(p))}
                  </option>
                ))}
              </select>
            )}

            {selected?.telemetry && (
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
                <div>⬇️ {formatSpeed(selected.telemetry.speedtest_download)}</div>
                <div>⬆️ {formatSpeed(selected.telemetry.speedtest_upload)}</div>
                <div>📶 ping {selected.telemetry.speedtest_ping !== undefined ? selected.telemetry.speedtest_ping.toFixed(0) + ' мс' : '—'}</div>
                <div>🖥️ {selected.telemetry.cpu_number || '—'} CPU</div>
                <div style={{ gridColumn: '1 / -1' }}>🌐 {selected.telemetry.isp || '—'}</div>
              </div>
            )}

            {/* ====== ТАРИФ / ДНИ / ИТОГО ====== */}
            <label style={{ fontSize: '12px', color: colors.textSecondary, display: 'block', marginBottom: '6px' }}>
              {t('createTorrentDaysLabel') || 'Сколько дней хранить'}
            </label>
            <input
              type="number"
              min={1}
              max={3650}
              value={days}
              onChange={(e) => setDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
              style={inputStyle}
            />

            {selected && (
              <div
                style={{
                  border: `1px solid ${colors.accent}55`,
                  borderRadius: '10px',
                  padding: '12px',
                  marginBottom: '16px',
                  fontSize: '12px',
                  color: colors.text,
                }}
              >
                <div style={{ marginBottom: '6px', color: colors.textSecondary }}>
                  {t('createTorrentTariffLabel') || 'Тариф'}: <strong>{formatTon(selected.price)} TON</strong> {t('createTorrentTariffPer200gb30d') || 'за 200 ГБ за 30 дней'}
                  {' '}(≈ {formatTon(ratePerMbDay)} TON/{t('createTorrentPerMbDay') || 'МБ/день'})
                </div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: colors.accent }}>
                  {t('createTorrentTotalCostLabel') || 'Итого за'} {days} {t('createTorrentDays') || 'дн.'}: {totalBytes > 0 ? formatTon(totalCostNanoTon) : '0'} TON
                </div>
                {totalBytes === 0 && (
                  <div style={{ fontSize: '11px', color: colors.textSecondary, marginTop: '4px' }}>
                    {t('createTorrentAddFilesForEstimate') || 'Добавь файлы, чтобы увидеть точную сумму'}
                  </div>
                )}
              </div>
            )}

            {/* ====== ПРИВЯЗКА К ДОМЕНУ ====== */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: colors.text,
                marginBottom: '8px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={bindImmediately}
                onChange={(e) => setBindImmediately(e.target.checked)}
              />
              {t('createTorrentBindCheckbox') || 'Сразу привязать bagID к домену'}
            </label>
            {bindImmediately && (
              <input
                type="text"
                placeholder={t('createTorrentBindDomainPlaceholder') || 'Имя домена (например: mysite.ton)'}
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                style={inputStyle}
              />
            )}

            <button onClick={handleCreate} disabled={files.length === 0 || creating || oversizeProvider} style={primaryButtonStyle(files.length === 0 || creating || oversizeProvider)}>
              {creating ? (t('processing') || 'Создание...') : (t('createTorrentButton') || 'Создать bagID')}
            </button>

            {createError && <p style={{ fontSize: '12px', color: colors.error, marginTop: '12px' }}>{createError}</p>}

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
                {!bagDetails && (
                  <p style={{ color: colors.textSecondary, marginTop: '8px', marginBottom: 0 }}>
                    {t('createTorrentLoadingDetails') || 'Считаем размер и merkle-хеш...'}
                  </p>
                )}

                {binding && (
                  <p style={{ color: colors.textSecondary, marginTop: '8px', marginBottom: 0 }}>
                    {t('createTorrentBinding') || 'Привязываем к домену...'}
                  </p>
                )}
                {bindResult === 'success' && (
                  <p style={{ color: colors.success, marginTop: '8px', marginBottom: 0 }}>
                    ✅ {t('createTorrentBindSuccess') || 'bagID записан в DNS-запись домена'}
                  </p>
                )}
                {bindResult === 'error' && (
                  <p style={{ color: colors.error, marginTop: '8px', marginBottom: 0 }}>
                    {bindMessage}
                  </p>
                )}
                {bagDetails && !bindImmediately && (
                  <p style={{ color: colors.textSecondary, marginTop: '8px', marginBottom: 0 }}>
                    {t('createTorrentPaymentHint') || 'Дальше — оплати провайдеру ниже, чтобы он начал реально раздавать файлы, и при желании привяжи bagID к домену вручную на странице DNS-записей.'}
                  </p>
                )}
              </div>
            )}

            {/* ====== ОПЛАТА ПРОВАЙДЕРУ ====== */}
            {bagId && bagDetails && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '14px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                }}
              >
                <h3 style={{ fontSize: '14px', color: colors.text, margin: '0 0 8px 0' }}>
                  {t('createTorrentDealSectionTitle') || 'Оплата провайдеру'}
                </h3>
                <p style={{ fontSize: '11px', color: colors.textSecondary, marginBottom: '10px' }}>
                  {t('createTorrentDealSectionHint') ||
                    'Разворачивает storage-contract на чейне и сразу финансирует его на сумму выше — провайдер увидит контракт и начнёт хранить файлы.'}
                </p>
                <button
                  onClick={handleDeploy}
                  disabled={!canDeploy || dealPreparing}
                  style={primaryButtonStyle(!canDeploy || dealPreparing)}
                >
                  {dealPreparing
                    ? (t('processing') || 'Отправка...')
                    : `${t('createTorrentDealButton') || 'Оплатить и запустить хранение'} (${formatTon(totalCostNanoTon)} TON)`}
                </button>
                {dealError && <p style={{ fontSize: '12px', color: colors.error, marginTop: '8px' }}>{dealError}</p>}
                {dealContractAddress && (
                  <p style={{ fontSize: '12px', marginTop: '10px' }}>
                    {dealSent
                      ? `✅ ${t('createTorrentDealSuccess') || 'Транзакция отправлена'}. `
                      : `${t('createTorrentDealAddressPreview') || 'Адрес будущего контракта'}: `}
                    <a
                      href={tonscanAddressUrl(dealContractAddress, isTestnet)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: colors.accent }}
                    >
                      {t('createTorrentViewOnTonscan') || 'Посмотреть на tonscan'} →
                    </a>
                  </p>
                )}
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
