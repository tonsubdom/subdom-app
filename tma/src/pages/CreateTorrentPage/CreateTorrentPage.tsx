// tma/src/pages/CreateTorrentPage/CreateTorrentPage.tsx
//
// "Создать торрент" — загрузить файлы, выбрать провайдеров TON Storage,
// получить bagID, оплатить провайдерам (реальный storage-contract на чейне,
// см. utils/storageContract.ts) и опционально сразу привязать bagID в
// DNS-запись домена. Провайдеров берём напрямую с mytonprovider.org (у них
// Access-Control-Allow-Origin: *, прокси через свой бэкенд не нужен). Само
// создание bag'а — через subdom-server -> tonutils-storage демон
// (см. storage-daemon/, subdom-server/src/utils/storageDaemon.ts).
//
// Заливка — чанками с докачкой (POST /api/storage/upload-chunk +
// /api/storage/finalize), не одним fetch: при лимите 2GB/файл обрыв сети
// на середине означал бы начинать всё заново. sessionId — детерминированный
// хеш от списка выбранных файлов (см. computeSessionId ниже), поэтому даже
// без localStorage повторный выбор тех же файлов после сбоя/релоада сам
// попадает в ту же сессию и продолжает с места обрыва (см. GET
// /api/storage/upload-status).

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useTonAddress, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { Page } from '@/components/Page';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppDispatch } from '@/store/store';
import { setStorageRecord } from '@/store/dns/dnsRecordsSlice';
import { resolveDomainNftAddress, fetchSiteAndStorageRecords } from '@/services/ownerMetaService';
import {
  calculateStorageCostNanoTon,
  prepareStorageDeal,
  ratePerMbDayFromMyTonProviderPrice,
  toTonConnectMessage,
  tonscanAddressUrl,
  type StorageProviderDeal,
} from '@/utils/storageContract';
import { Address } from '@ton/core';
import { useTutorial } from '@/contexts/TutorialContext';
import { TutorialTooltip } from '@/components/Tutorial/TutorialTooltip';
import { TransactionService } from '@/services/transactionService';
import { track } from '@/utils/analytics';
import { apiService } from '@/services/api';
import { shareUrl } from '@/utils/urlParams';
import TonLogo from '@/components/Header/ton.svg';

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

interface BagFileInfo {
  index: number;
  name: string;
  size: number;
}

interface BagDetails {
  bag_id: string;
  size: number;
  piece_size: number;
  bag_size: number;
  merkle_hash: string;
  downloaded?: number;
  completed?: boolean;
  active?: boolean;
  files?: BagFileInfo[];
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

// ====== ЧАНКОВАЯ ЗАЛИВКА С ДОКАЧКОЙ ======
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB — backend принимает до 8MB на чанк, запас на неточности
const CHUNK_RETRIES = 4;

// Детерминированный ID сессии заливки — от списка (имя+размер+lastModified)
// выбранных файлов. Не localStorage: если юзер после обрыва/релоада заново
// перетащит те же файлы, sessionId совпадёт сам собой, и upload-status
// вернёт уже принятые байты — заливка продолжится, а не начнётся с нуля.
async function computeSessionId(files: File[]): Promise<string> {
  const manifest = files.map((f) => `${f.name}:${f.size}:${f.lastModified}`).join('|');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(manifest));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function fetchUploadStatus(sessionId: string): Promise<Record<string, number>> {
  const res = await fetch(`${API_BASE_URL}/api/storage/upload-status?sessionId=${sessionId}`);
  if (!res.ok) throw new Error(`Не удалось получить статус заливки: HTTP ${res.status}`);
  const data = await res.json();
  return data.received || {};
}

async function uploadChunkWithRetry(sessionId: string, file: File, offset: number): Promise<number> {
  const end = Math.min(offset + CHUNK_SIZE, file.size);
  const blob = file.slice(offset, end);

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= CHUNK_RETRIES; attempt++) {
    try {
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('fileName', file.name);
      formData.append('offset', String(offset));
      formData.append('chunk', blob);

      const res = await fetch(`${API_BASE_URL}/api/storage/upload-chunk`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      return data.receivedBytes as number;
    } catch (e) {
      lastError = e;
      if (attempt < CHUNK_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  throw lastError;
}

/**
 * Заливает один файл чанками начиная с resumeFromBytes (уже принятое на
 * бэкенде количество байт) — при обрыве где-то в середине откатывается на
 * один чанк назад от последнего известного смещения: последняя запись
 * могла быть не завершена физически, а перезапись того же чанка безопасна
 * (backend пишет строго по offset, не аппендит вслепую).
 */
async function uploadFileResumable(
  sessionId: string,
  file: File,
  resumeFromBytes: number,
  onProgress: (uploadedBytes: number) => void
): Promise<void> {
  let offset = resumeFromBytes;
  if (offset > 0 && offset < file.size) {
    const chunkIndex = Math.floor(offset / CHUNK_SIZE);
    offset = Math.max(0, (chunkIndex - 1) * CHUNK_SIZE);
  }
  onProgress(offset);
  while (offset < file.size) {
    const receivedBytes = await uploadChunkWithRetry(sessionId, file, offset);
    offset = receivedBytes;
    onProgress(offset);
  }
}

type SortField = 'rating' | 'price' | 'uptime' | 'freeSpace';
const TABS = ['create', 'download'] as const;
type Tab = typeof TABS[number];

const BAG_ID_RE = /^[0-9a-fA-F]{64}$/;

const CreateTorrentPage: React.FC = () => {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';
  const { t } = useLanguage();
  const dispatch = useDispatch<AppDispatch>();
  const [tonConnectUI] = useTonConnectUI();
  const userAddress = useTonAddress();
  const wallet = useTonWallet();
  const tutorial = useTutorial();
  const isTestnet = wallet?.account?.chain === '-3';

  const [tab, setTab] = useState<Tab>('create');

  const [providers, setProviders] = useState<Provider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providersError, setProvidersError] = useState<string | null>(null);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [providerCount, setProviderCount] = useState<number>(3);
  const [sortField, setSortField] = useState<SortField>('rating');
  const [sortDesc, setSortDesc] = useState(true);

  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [description, setDescription] = useState('');
  const [days, setDays] = useState<number>(30);

  const [creating, setCreating] = useState(false);
  const [uploadedBytes, setUploadedBytes] = useState(0);
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
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [bagIdCopied, setBagIdCopied] = useState(false);

  // ====== ВКЛАДКА "ЗАГРУЗИТЬ" (скачивание уже существующего bagID) ======
  const [downloadInput, setDownloadInput] = useState('');
  const [downloadResolving, setDownloadResolving] = useState(false);
  const [downloadBagId, setDownloadBagId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadDetails, setDownloadDetails] = useState<BagDetails | null>(null);
  const [downloadStalled, setDownloadStalled] = useState(false);
  // Пришли по диплинку из бота с уже готовым значением (?bagId=&tab=download)
  // — акцент на кнопку "Загрузить", юзеру остаётся только нажать её.
  const [downloadButtonPulse, setDownloadButtonPulse] = useState(false);
  // Пришли по диплинку на вкладку "Загрузить", но без значения (?tab=download
  // без bagId — см. фолбэк в DeeplinkHandler.ts на случай, если разбор
  // startapp-параметра выше по цепочке не долетел с готовым bagID/доменом) —
  // явно просим ввести вручную, а не молча оставляем пустой инпут без
  // объяснений, откуда юзер вообще тут оказался.
  const [showManualEntryHint, setShowManualEntryHint] = useState(false);
  const downloadPollRef = useRef<number | null>(null);
  const downloadProgressRef = useRef<{ bytes: number; sinceMs: number }>({ bytes: 0, sinceMs: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProviders()
      .then((list) => setProviders(list))
      .catch((e) => setProvidersError(e?.message || 'Ошибка загрузки провайдеров'))
      .finally(() => setProvidersLoading(false));
  }, []);

  // Автоподбор топ-N провайдеров (по рейтингу — независимо от текущей
  // сортировки таблицы) при загрузке списка и при смене желаемого
  // количества источников. Юзер может дальше вручную донастроить чекбоксами
  // ниже — эффект не трогает выбор, пока сам providerCount не поменяется.
  useEffect(() => {
    if (providers.length === 0) return;
    const topByRating = [...providers].sort((a, b) => b.rating - a.rating);
    setSelectedProviders(topByRating.slice(0, providerCount).map((p) => p.pubkey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providers, providerCount]);

  const toggleProvider = (pubkey: string) => {
    setSelectedProviders((prev) =>
      prev.includes(pubkey) ? prev.filter((k) => k !== pubkey) : [...prev, pubkey]
    );
  };

  // domain приходит с карточки конкретной зоны/субдомена в ProfileWidget
  // (handleCreateTorrent) — сразу подставляет имя в поле привязки и включает
  // чекбокс, а не пустую форму без параметров.
  useEffect(() => {
    const hash = window.location.hash;
    const queryString = hash.includes('?') ? hash.split('?')[1] : '';
    const params = new URLSearchParams(queryString);
    const domainFromUrl = params.get('domain');
    if (domainFromUrl) {
      setDomainInput(domainFromUrl);
      setBindImmediately(true);
    }

    // Кнопка "Поделиться"/уведомления бота (см. DeeplinkUtils.generateTorrentDownloadLink
    // на бэкенде, DeeplinkHandler.tsx) — сразу открывает вкладку "Загрузить"
    // с вбитым bagID (или доменом — handleDownloadStart резолвит оба
    // формата сам, поэтому регэксп на bagID тут больше не гейт). Раньше
    // тут же вызывался handleDownloadStart() автоматически — юзер видел
    // "Скачивается X/X" ещё до того, как сам что-то нажал (бэкенд реально
    // стартовал закачку через /api/storage/download при каждом заходе по
    // ссылке). Теперь только подставляем значение — жмёт "Загрузить" сам.
    const bagIdFromUrl = params.get('bagId');
    if (params.get('tab') === 'download') {
      setTab('download');
      if (bagIdFromUrl) {
        setDownloadInput(bagIdFromUrl);
        setDownloadButtonPulse(true);
      } else {
        setShowManualEntryHint(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const selectedProviderObjs = useMemo(
    () => providers.filter((p) => selectedProviders.includes(p.pubkey)),
    [providers, selectedProviders]
  );
  const totalBytes = useMemo(() => files.reduce((sum, f) => sum + f.size, 0), [files]);

  // Контракт платит бонус тому провайдеру, который прислал proof, из ОБЩЕГО
  // баланса контракта — то есть суммарное финансирование должно покрывать
  // ставку КАЖДОГО из выбранных провайдеров за весь срок, а не одну ставку
  // на всех (см. storage-contract.fc: bounty считается по rate_per_mb_day
  // конкретного провайдера, но списывается с общего contract_balance).
  const totalCostNanoTon = totalBytes > 0
    ? selectedProviderObjs.reduce(
        (sum, p) => sum + calculateStorageCostNanoTon(p.price, totalBytes, days),
        0n
      )
    : 0n;
  const oversizeProvider =
    selectedProviderObjs.length > 0 &&
    selectedProviderObjs.some((p) => totalBytes > p.max_bag_size_bytes);
  const oversizeProviderNames = selectedProviderObjs
    .filter((p) => totalBytes > p.max_bag_size_bytes)
    .map((p) => `${p.location?.country || '?'} (${formatBytes(p.max_bag_size_bytes)})`)
    .join(', ');

  const colors = {
    text: isDark ? '#F9FAFB' : '#1F2937',
    textSecondary: isDark ? '#9CA3AF' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
    background: isDark ? '#1F2937' : '#FFFFFF',
    accent: isDark ? '#FFD700' : '#3B82F6',
    error: '#e53935',
    success: '#4ade80',
  };

  // Сумма + логотип монеты вместо текстового тикера — как в
  // PaymentAttemptsSection.tsx (карточки оплаченных попыток создания зон).
  const CoinAmount: React.FC<{ amount: string }> = ({ amount }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
      {amount}
      <img src={TonLogo} alt="GRAM" style={{ width: '12px', height: '12px' }} />
    </span>
  );

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

  // Нумерованный заголовок шага — чтобы длинная форма читалась как 3
  // понятных действия, а не сплошная простыня полей.
  const StepHeader: React.FC<{ n: number; title: string; done?: boolean }> = ({ n, title, done }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0 10px 0' }}>
      <div
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 700,
          background: done ? colors.success : colors.accent,
          color: isDark ? '#000' : '#fff',
        }}
      >
        {done ? '✓' : n}
      </div>
      <div style={{ fontSize: '14px', fontWeight: 700, color: colors.text }}>{title}</div>
    </div>
  );

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

  // ====== ВКЛАДКА "ЗАГРУЗИТЬ" ======
  // Принимает и голый bagID (64 hex-символа), и имя домена/субдомена — во
  // втором случае резолвим NFT-адрес (та же схема с фолбэком на ".ton", что
  // и в handleBind) и достаём storageBagId тем же прямым dnsresolve, что
  // теперь использует LupaButton (работает и для субдоменов, не только
  // корневых .ton-доменов).
  const stopDownloadPolling = () => {
    if (downloadPollRef.current) {
      window.clearInterval(downloadPollRef.current);
      downloadPollRef.current = null;
    }
  };

  useEffect(() => stopDownloadPolling, []);

  // Если скачанные байты не растут дольше этого порога — в сети TON Storage
  // прямо сейчас нет ни одного пира, реально раздающего этот bag (метаданные
  // демон получил, а данные тянуть неоткуда). Юзеру иначе непонятно, почему
  // прогресс навсегда завис на "0 Б" — предупреждаем явно, а не молчим.
  const STALL_THRESHOLD_MS = 30000;

  const startDownloadPolling = (bagId: string) => {
    stopDownloadPolling();
    downloadProgressRef.current = { bytes: 0, sinceMs: Date.now() };
    setDownloadStalled(false);
    const poll = async () => {
      const details = await fetchBagDetails(bagId);
      if (details) {
        setDownloadDetails(details);
        if (details.completed) {
          stopDownloadPolling();
          setDownloadStalled(false);
          return;
        }
        const downloaded = details.downloaded || 0;
        if (downloaded > downloadProgressRef.current.bytes) {
          downloadProgressRef.current = { bytes: downloaded, sinceMs: Date.now() };
          setDownloadStalled(false);
        } else if (Date.now() - downloadProgressRef.current.sinceMs > STALL_THRESHOLD_MS) {
          setDownloadStalled(true);
        }
      }
    };
    poll();
    downloadPollRef.current = window.setInterval(poll, 3000);
  };

  const handleDownloadStart = async (overrideInput?: string) => {
    const raw = (overrideInput ?? downloadInput).trim();
    if (!raw || downloadResolving) return;

    setDownloadResolving(true);
    setDownloadError(null);
    setDownloadDetails(null);
    setDownloadBagId(null);
    setDownloadStalled(false);
    stopDownloadPolling();

    try {
      let bagId: string;
      if (BAG_ID_RE.test(raw)) {
        bagId = raw.toLowerCase();
      } else {
        const domain = raw.toLowerCase();
        let resolved = await resolveDomainNftAddress(domain, isTestnet);
        if (!resolved && !domain.endsWith('.ton')) {
          resolved = await resolveDomainNftAddress(`${domain}.ton`, isTestnet);
        }
        if (!resolved) {
          throw new Error(t('createTorrentDomainNotFound') || 'Домен не найден');
        }
        const records = await fetchSiteAndStorageRecords(resolved.nftAddress, isTestnet);
        if (!records.storageBagId) {
          throw new Error(t('createTorrentDownloadNoBagId') || 'У этого домена нет привязанного bagID');
        }
        bagId = records.storageBagId.toLowerCase();
      }

      setDownloadBagId(bagId);
      const res = await fetch(`${API_BASE_URL}/api/storage/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bagId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `HTTP ${res.status}`);
      }
      startDownloadPolling(bagId);
    } catch (e: any) {
      setDownloadError(e?.message || 'Ошибка загрузки');
    } finally {
      setDownloadResolving(false);
    }
  };

  // Заливает все файлы чанками (с докачкой, см. uploadFileResumable) и
  // финализирует bag на бэкенде. Повторный вызов (например, после разрыва
  // сети — юзер просто снова жмёт "Создать") продолжает ту же сессию с
  // места, где данные реально долетели, а не с нуля.
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
    setShowCompleteModal(false);
    try {
      const sessionId = await computeSessionId(files);
      const received = await fetchUploadStatus(sessionId);

      const progressByFile = new Map<string, number>(files.map((f) => [f.name, 0]));
      const reportProgress = () => {
        let sum = 0;
        progressByFile.forEach((v) => { sum += v; });
        setUploadedBytes(sum);
      };

      for (const file of files) {
        await uploadFileResumable(sessionId, file, received[file.name] || 0, (uploaded) => {
          progressByFile.set(file.name, uploaded);
          reportProgress();
        });
      }

      const res = await fetch(`${API_BASE_URL}/api/storage/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          description,
          isTestnet,
          files: files.map((f) => ({ name: f.name, size: f.size })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setBagId(data.bagId);
      track('torrent_created');

      const details = await fetchBagDetails(data.bagId);
      setBagDetails(details);

      if (bindImmediately && domainInput.trim()) {
        await handleBind(data.bagId);
      }
    } catch (e: any) {
      track('torrent_creation_failed', { reason: String(e?.message || 'unknown').slice(0, 120) });
      setCreateError(
        (e?.message || 'Ошибка заливки') +
          ' — уже переданные данные сохранены, можно нажать «Создать» ещё раз, заливка продолжится с места обрыва.'
      );
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
      const raw = domainInput.trim();
      let nftAddress: string;
      try {
        // Ввод уже сам по себе адрес NFT-контракта — резолв домена не нужен.
        Address.parse(raw);
        nftAddress = raw;
      } catch {
        const domain = raw.toLowerCase();
        // Пробуем как есть первым (t.me/.gram и т.п. не нуждаются в ".ton"),
        // и только потом — с ".ton" на конце, см. тот же фикс в AvatarSecretPage.
        let resolved = await resolveDomainNftAddress(domain, isTestnet);
        if (!resolved && !domain.endsWith('.ton')) {
          resolved = await resolveDomainNftAddress(`${domain}.ton`, isTestnet);
        }
        if (!resolved) {
          throw new Error(t('createTorrentDomainNotFound') || 'Домен не найден');
        }
        nftAddress = resolved.nftAddress;
      }
      const result = await dispatch(
        setStorageRecord({
          dnsItemAddress: nftAddress,
          bagIdHex: id,
          tonConnectUI,
          isTestnet,
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
    if (selectedProviderObjs.length === 0 || !bagId || !bagDetails || !userAddress || dealPreparing) return;
    setDealPreparing(true);
    setDealError(null);
    try {
      const owner = Address.parse(userAddress);
      const providerDeals: StorageProviderDeal[] = selectedProviderObjs.map((p) => ({
        pubkey: p.pubkey,
        address: p.address,
        maxSpanSeconds: p.max_span,
        ratePerMbDayNanoTon: ratePerMbDayFromMyTonProviderPrice(p.price),
      }));
      const deal = prepareStorageDeal(
        {
          bagIdHex: bagId,
          merkleHashHex: bagDetails.merkle_hash,
          fileSizeBytes: bagDetails.bag_size,
          pieceSizeBytes: bagDetails.piece_size,
        },
        owner,
        providerDeals,
        totalCostNanoTon
      );
      setDealContractAddress(deal.contractAddress);

      const result = await TransactionService.sendTransaction(
        tonConnectUI,
        {
          validUntil: Math.floor(Date.now() / 1000) + 360,
          messages: [toTonConnectMessage(deal, isTestnet)],
        },
        {
          network: isTestnet ? 'testnet' : 'mainnet',
          verifyBlockchain: true,
          action: 'deploy_storage_deal',
        }
      );

      if (!result.success) {
        track('torrent_deal_failed', { reason: (result.error || 'not_confirmed').slice(0, 120) });
        setDealError(result.error || 'Транзакция не подтверждена в блокчейне');
        return;
      }

      // Регистрируем сделку на бэкенде — без этого storageDealsChecker не
      // узнает, каких провайдеров ждать перед тем, как освободить диск (см.
      // services/storageDealsChecker.ts). Если этот вызов не удался — сама
      // сделка на чейне всё равно живая, просто автоочистка не сработает;
      // не блокируем юзера ошибкой, только логируем.
      try {
        const res = await fetch(`${API_BASE_URL}/api/storage/deals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bagId,
            contractAddress: deal.contractAddress.toString({ bounceable: true, testOnly: isTestnet }),
            providers: providerDeals.map((p) => ({ pubkey: p.pubkey, address: p.address })),
            isTestnet,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error('Не удалось зарегистрировать storage-сделку на бэкенде:', err?.error);
        }
      } catch (e) {
        console.error('Не удалось зарегистрировать storage-сделку на бэкенде:', e);
      }

      track('torrent_deal_sent');
      setDealSent(true);
      setShowCompleteModal(true);

      // Торрент считается реально "созданным" только теперь — раньше (на
      // одном лишь bagID без оплаты провайдерам) шаг обучалки засчитывался
      // преждевременно, до того как файлы реально начинали где-то храниться.
      if (tutorial.active && !tutorial.isStepDone('torrent_created')) {
        tutorial.recordStep('torrent_created', domainInput.trim() || bagId);
      }

      apiService.setNetwork(isTestnet);
      apiService.notifyStorageDealCreated({
        bagId,
        contractAddress: deal.contractAddress.toString({ bounceable: true, testOnly: isTestnet }),
        providerCount: providerDeals.length,
        fileSizeBytes: bagDetails.bag_size,
        storageDays: days,
        totalCostTon: formatTon(totalCostNanoTon),
        ownerAddress: userAddress,
        boundTo: bindResult === 'success' ? domainInput.trim() : undefined,
      });
    } catch (e: any) {
      track('torrent_deal_failed', { reason: String(e?.message || 'unknown').slice(0, 120) });
      setDealError(e?.message || 'Ошибка отправки транзакции');
    } finally {
      setDealPreparing(false);
    }
  };

  const canDeploy = selectedProviderObjs.length > 0 && !!bagId && !!bagDetails && !!userAddress && !oversizeProvider;

  // Кнопка "Поделиться" в завершающей модалке — ссылка ведёт получателя
  // прямо на вкладку "Загрузить" с вбитым bagID (см. useEffect с bagIdFromUrl
  // выше и DeeplinkUtils.generateTorrentDownloadLink на бэкенде для той же
  // ссылки в Telegram-уведомлении).
  const handleShareBagId = async (bagIdToShare: string) => {
    const url = `${window.location.origin}/#/create-torrent?bagId=${bagIdToShare}&tab=download`;
    const title = t('createTorrentCompleteShareTitle') || 'Файл на TON Storage';
    const text = t('createTorrentCompleteShareText') || 'Скачайте файл, который я только что разместил на TON Storage:';
    await shareUrl(url, title, text, async () => {
      try {
        await navigator.clipboard.writeText(url);
        return true;
      } catch {
        return false;
      }
    });
  };

  return (
    <Page back={true}>
      <div style={{ maxWidth: '425px', margin: '0 auto', padding: '20px 16px 180px 16px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: colors.text, margin: '0 0 6px 0' }}>
          {t('createTorrentTitle') || 'Создать торрент'}
        </h1>
        <p style={{ fontSize: '13px', fontWeight: 600, color: colors.text, margin: '0 0 4px 0' }}>
          {t('createTorrentHeadline') || 'Храни безотказно в нескольких местах одновременно за микроплатежи'}
        </p>
        <p style={{ fontSize: '12px', color: colors.textSecondary, margin: '0 0 16px 0' }}>
          {t('createTorrentHeadlineSub') ||
            'subdom не хранит данные и не участвует в раздаче — после успешных подтверждений от провайдеров о скачивании вашего файла папка на сервисе очищается.'}
        </p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button style={tabButtonStyle(tab === 'create')} onClick={() => setTab('create')}>
            {t('createTorrentTabCreate') || 'Создать'}
          </button>
          <button style={tabButtonStyle(tab === 'download')} onClick={() => setTab('download')}>
            {t('createTorrentTabDownload') || 'Загрузить'}
          </button>
        </div>

        {tab === 'create' && (
          <>
            <p style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '16px' }}>
              {t('createTorrentDescription') ||
                'Всего 3 шага: загрузить файлы → выбрать провайдеров → запустить и оплатить.'}
            </p>

            <StepHeader n={1} title={t('createTorrentStep1') || 'Файлы'} done={files.length > 0} />

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
                  'Любые файлы и архивы, несколько штук за раз. До 2 ГБ на файл, до 50 файлов.'}
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
                      {' '}— {t('createTorrentTooBigForProvider') || 'больше лимита у'}: {oversizeProviderNames}
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

            <StepHeader n={2} title={t('createTorrentStep2') || 'Провайдеры хранения'} done={selectedProviders.length > 0} />

            {/* ====== КОЛИЧЕСТВО ИСТОЧНИКОВ ====== */}
            <label style={{ fontSize: '12px', color: colors.textSecondary, display: 'block', marginBottom: '6px' }}>
              {t('createTorrentProviderCountLabel') || 'Количество независимых провайдеров'}{' '}
              <span style={{ opacity: 0.7 }}>
                ({t('createTorrentProviderCountHint') || 'subdom рекомендует 3–5 источников для надёжности'})
              </span>
            </label>
            <select
              value={providerCount}
              onChange={(e) => setProviderCount(Number(e.target.value))}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>
                  {n} {n >= 3 && n <= 5 ? `— ${t('createTorrentRecommended') || 'рекомендуется'}` : ''}
                </option>
              ))}
            </select>

            {/* ====== ПРОВАЙДЕРЫ + СОРТИРОВКА ====== */}
            <label style={{ fontSize: '12px', color: colors.textSecondary, display: 'block', margin: '12px 0 6px 0' }}>
              {t('createTorrentProviderLabel') || 'Провайдеры хранения'}
              {!providersLoading && !providersError && (
                <span style={{ opacity: 0.7 }}>
                  {' '}({t('createTorrentProvidersSelected') || 'выбрано'}: {selectedProviders.length} {t('createTorrentProvidersOf') || 'из'} {providers.length})
                </span>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', maxHeight: '340px', overflowY: 'auto', paddingRight: '2px' }}>
                {sortedProviders.map((p) => {
                  const isChecked = selectedProviders.includes(p.pubkey);
                  const stat = (label: string, value: React.ReactNode) => (
                    <div>
                      <div style={{ fontSize: '9px', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
                      <div style={{ fontSize: '12px', color: colors.text, fontWeight: 600 }}>{value}</div>
                    </div>
                  );
                  return (
                    <label
                      key={p.pubkey}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '10px',
                        borderRadius: '10px',
                        border: `1px solid ${isChecked ? colors.accent : colors.border}`,
                        background: isChecked ? `${colors.accent}11` : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <input type="checkbox" checked={isChecked} onChange={() => toggleProvider(p.pubkey)} style={{ marginTop: '3px', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: colors.text, marginBottom: '6px' }}>
                          {p.location?.country || '?'}{p.location?.city ? `, ${p.location.city}` : ''}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                          {stat(t('createTorrentSortRating') || 'Рейтинг', `${p.rating.toFixed(1)}★`)}
                          {stat(t('createTorrentSortPrice') || 'Цена', <CoinAmount amount={formatTon(p.price)} />)}
                          {stat(t('createTorrentSortUptime') || 'Uptime', `${p.uptime.toFixed(0)}%`)}
                          {stat(t('createTorrentSortSpace') || 'Свободно', formatSpace(freeSpaceGb(p)))}
                        </div>
                      </div>
                    </label>
                  );
                })}
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

            {selectedProviderObjs.length > 0 && (
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
                  {t('createTorrentTariffMultiLabel') || 'Оплата провайдерам'}: {selectedProviderObjs.length} × {t('createTorrentTariffPer200gb30d') || 'ставка своя за 200 ГБ / 30 дней'}
                </div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: colors.accent }}>
                  {t('createTorrentTotalCostLabel') || 'Итого за'} {days} {t('createTorrentDays') || 'дн.'}: <CoinAmount amount={totalBytes > 0 ? formatTon(totalCostNanoTon) : '0'} />
                </div>
                {totalBytes === 0 && (
                  <div style={{ fontSize: '11px', color: colors.textSecondary, marginTop: '4px' }}>
                    {t('createTorrentAddFilesForEstimate') || 'Добавь файлы, чтобы увидеть точную сумму'}
                  </div>
                )}
                {oversizeProvider && (
                  <div style={{ fontSize: '11px', color: colors.error, marginTop: '4px' }}>
                    {t('createTorrentTooBigForProvider') || 'Больше лимита у'}: {oversizeProviderNames}
                  </div>
                )}
              </div>
            )}

            <StepHeader n={3} title={t('createTorrentStep3') || 'Запуск и оплата'} done={dealSent} />

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
                placeholder={t('createTorrentBindDomainPlaceholder') || 'Имя домена или адрес NFT (например: mysite.ton или EQ...)'}
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                style={inputStyle}
              />
            )}

            <button onClick={handleCreate} disabled={files.length === 0 || creating || oversizeProvider} style={primaryButtonStyle(files.length === 0 || creating || oversizeProvider)}>
              {creating
                ? `${t('createTorrentUploading') || 'Заливка'}... ${formatBytes(uploadedBytes)} / ${formatBytes(totalBytes)}`
                : (t('createTorrentButton') || 'Создать bagID')}
            </button>

            {creating && totalBytes > 0 && (
              <div style={{ height: '4px', borderRadius: '2px', background: colors.border, marginTop: '6px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, (uploadedBytes / totalBytes) * 100)}%`,
                    background: colors.accent,
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>
            )}

            {tutorial.active && !tutorial.isStepDone('torrent_created') && (
              <TutorialTooltip
                blockLabel={t('tutorialBlock4Label') || 'Блок 4'}
                stepLabel={t('tutorialStep2Label') || 'Шаг 2'}
                text={t('tutorialCreateTorrentHint') || 'Загрузите файл и создайте торрент — так ваш сайт можно будет раздавать через TON Storage.'}
                buttons={[]}
                style={{ position: 'static', width: '280px', marginTop: '8px' }}
              />
            )}

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
                {bagDetails && !bindImmediately && bindResult !== 'success' && (
                  <div style={{ marginTop: '10px' }}>
                    <p style={{ color: colors.textSecondary, marginBottom: '8px' }}>
                      {t('createTorrentPaymentHint') || 'Дальше — оплати провайдеру ниже, чтобы он начал реально раздавать файлы. Привязать bagID к домену можно и сейчас:'}
                    </p>
                    <input
                      type="text"
                      placeholder={t('createTorrentBindDomainPlaceholder') || 'Имя домена или адрес NFT (например: mysite.ton или EQ...)'}
                      value={domainInput}
                      onChange={(e) => setDomainInput(e.target.value)}
                      style={{ ...inputStyle, marginBottom: '8px' }}
                    />
                    <button
                      onClick={() => handleBind()}
                      disabled={!domainInput.trim() || binding}
                      style={primaryButtonStyle(!domainInput.trim() || binding)}
                    >
                      {binding ? (t('createTorrentBinding') || 'Привязываем к домену...') : (t('createTorrentBindNowButton') || 'Привязать')}
                    </button>
                  </div>
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
                  {dealPreparing ? (
                    t('processing') || 'Отправка...'
                  ) : (
                    <>
                      {t('createTorrentDealButton') || 'Оплатить и запустить хранение'} (<CoinAmount amount={formatTon(totalCostNanoTon)} />)
                    </>
                  )}
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

        {tab === 'download' && (
          <>
            <p style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '16px' }}>
              {t('createTorrentDownloadDescription') ||
                'Введи bagID или имя домена/субдомена, привязанного к bagID — скачаем содержимое через демон TON Storage.'}
            </p>

            {showManualEntryHint && (
              <div
                style={{
                  fontSize: '12px',
                  color: colors.text,
                  background: `${colors.accent}15`,
                  border: `1px solid ${colors.accent}55`,
                  borderRadius: '8px',
                  padding: '10px 12px',
                  marginBottom: '12px',
                }}
              >
                {t('createTorrentManualEntryHint') ||
                  'Не удалось автоматически подставить bagID из ссылки — введите bagID или домен вручную ниже.'}
              </div>
            )}

            <input
              type="text"
              placeholder={t('createTorrentDownloadPlaceholder') || 'bagID или домен (например: mysite.ton)'}
              value={downloadInput}
              onChange={(e) => {
                setDownloadInput(e.target.value);
                if (showManualEntryHint) setShowManualEntryHint(false);
              }}
              style={inputStyle}
            />

            {downloadButtonPulse && (
              <style>{`
                @keyframes downloadButtonPulse {
                  0%, 100% { box-shadow: 0 0 4px rgba(76, 175, 80, 0.6); }
                  50% { box-shadow: 0 0 16px rgba(76, 175, 80, 1); }
                }
              `}</style>
            )}
            <button
              onClick={() => {
                setDownloadButtonPulse(false);
                handleDownloadStart();
              }}
              disabled={!downloadInput.trim() || downloadResolving}
              style={{
                ...primaryButtonStyle(!downloadInput.trim() || downloadResolving),
                ...(downloadButtonPulse ? { animation: 'downloadButtonPulse 1.3s ease-in-out infinite' } : {}),
              }}
            >
              {downloadResolving ? (t('processing') || 'Обработка...') : (t('createTorrentDownloadButton') || 'Загрузить')}
            </button>

            {downloadError && <p style={{ fontSize: '12px', color: colors.error, marginTop: '12px' }}>{downloadError}</p>}

            {downloadBagId && (
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
                <strong>bagID:</strong> {downloadBagId}

                {downloadDetails && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ color: colors.textSecondary, marginBottom: '6px' }}>
                      {downloadDetails.completed
                        ? (t('createTorrentDownloadCompleted') || 'Скачано полностью')
                        : `${t('createTorrentDownloadInProgress') || 'Скачивается'}${
                            downloadDetails.downloaded !== undefined
                              ? ` — ${formatBytes(downloadDetails.downloaded)} / ${formatBytes(downloadDetails.size)}`
                              : '...'
                          }`}
                    </div>

                    {!downloadDetails.completed && downloadStalled && (
                      <div
                        style={{
                          fontSize: '11px',
                          color: colors.error,
                          background: `${colors.error}15`,
                          border: `1px solid ${colors.error}55`,
                          borderRadius: '8px',
                          padding: '8px 10px',
                          marginBottom: '8px',
                        }}
                      >
                        {t('createTorrentDownloadStalled') ||
                          'Похоже, сейчас никто в сети TON Storage не раздаёт этот файл (0 активных пиров) — скачивание может не начаться. Попробуйте позже или свяжитесь с владельцем файла, чтобы он снова запустил раздачу.'}
                      </div>
                    )}

                    {downloadDetails.files && downloadDetails.files.length > 0 && (
                      <div>
                        <div style={{ color: colors.text, fontWeight: 600, marginBottom: '6px' }}>
                          {t('createTorrentDownloadFiles') || 'Файлы'}:
                        </div>
                        {downloadDetails.files.map((f) => (
                          <div
                            key={f.index}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 0',
                              borderTop: `1px solid ${colors.border}`,
                              gap: '8px',
                            }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                              {f.name}
                            </span>
                            <span style={{ color: colors.textSecondary, whiteSpace: 'nowrap' }}>{formatBytes(f.size)}</span>
                            {downloadDetails.completed && (
                              <a
                                href={`${API_BASE_URL}/api/storage/download-file?bag_id=${encodeURIComponent(downloadBagId)}&file=${encodeURIComponent(f.name)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: colors.accent, whiteSpace: 'nowrap' }}
                              >
                                {t('createTorrentDownloadFile') || 'Скачать'} ⬇️
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {showCompleteModal && bagId && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setShowCompleteModal(false)}
        >
          <div
            style={{
              backgroundColor: colors.background,
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
              border: `1px solid ${colors.border}`,
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '40px', textAlign: 'center', marginBottom: '12px' }}>✅</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: 700, color: colors.text, textAlign: 'center' }}>
              {t('createTorrentCompleteTitle') || 'Торрент создан и записан!'}
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: colors.textSecondary, textAlign: 'center', lineHeight: '1.4' }}>
              {t('createTorrentCompleteSubtitle') ||
                'Провайдеры получили оплату и начали хранить файлы. Сохраните bagID — он понадобится, чтобы раздавать или скачивать файлы.'}
            </p>

            <div
              style={{
                background: isDark ? '#111827' : '#F3F4F6',
                borderRadius: '8px',
                padding: '10px 12px',
                marginBottom: '12px',
                fontSize: '12px',
                color: colors.text,
              }}
            >
              <div style={{ marginBottom: '6px' }}>
                <div style={{ fontSize: '10px', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: '2px' }}>
                  {t('createTorrentCompleteFilesLabel') || 'Файлы'}
                </div>
                {files.map((f) => (
                  <div key={f.name} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    <span style={{ color: colors.textSecondary, whiteSpace: 'nowrap' }}>{formatBytes(f.size)}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: `1px solid ${colors.border}` }}>
                <span style={{ color: colors.textSecondary }}>{t('createTorrentCompleteProvidersLabel') || 'Провайдеров'}</span>
                <span>{selectedProviderObjs.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: colors.textSecondary }}>{t('createTorrentTotalCostLabel') || 'Итого за'} {days} {t('createTorrentDays') || 'дн.'}</span>
                <span style={{ fontWeight: 700, color: colors.accent }}><CoinAmount amount={formatTon(totalCostNanoTon)} /></span>
              </div>
            </div>

            <div
              style={{
                background: isDark ? '#111827' : '#F3F4F6',
                borderRadius: '8px',
                padding: '10px 12px',
                marginBottom: '12px',
              }}
            >
              <div style={{ fontSize: '10px', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>
                {t('createTorrentCompleteBagIdLabel') || 'bagID'}
              </div>
              <div style={{ fontSize: '12px', color: colors.text, wordBreak: 'break-all', fontFamily: 'monospace' }}>
                {bagId}
              </div>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(bagId);
                setBagIdCopied(true);
                setTimeout(() => setBagIdCopied(false), 2000);
              }}
              style={{ ...primaryButtonStyle(false), marginBottom: '8px' }}
            >
              {bagIdCopied
                ? `✓ ${t('createTorrentCompleteCopied') || 'Скопировано!'}`
                : `📋 ${t('createTorrentCompleteCopyButton') || 'Скопировать bagID'}`}
            </button>

            {dealContractAddress && (
              <a
                href={tonscanAddressUrl(dealContractAddress, isTestnet)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  fontSize: '12px',
                  color: colors.accent,
                  marginBottom: '14px',
                }}
              >
                {t('createTorrentViewOnTonscan') || 'Посмотреть на tonscan'} →
              </a>
            )}

            <button
              onClick={() => handleShareBagId(bagId)}
              style={{ ...primaryButtonStyle(false), marginBottom: '8px' }}
            >
              📤 {t('createTorrentCompleteShareButton') || 'Поделиться'}
            </button>

            <button
              onClick={() => setShowCompleteModal(false)}
              style={{
                width: '100%',
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.text,
                borderRadius: '10px',
                padding: '10px',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {t('createTorrentCompleteDoneButton') || 'Готово'}
            </button>
          </div>
        </div>
      )}
    </Page>
  );
};

export default CreateTorrentPage;
