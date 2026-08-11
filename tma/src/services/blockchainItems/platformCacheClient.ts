/**
 * tma/src/services/blockchainItems/platformCacheClient.ts
 *
 * Тонкий клиент для нового бэкенд read-cache (Group 3.3, subdom-server
 * /api/platform/*). Быстрый акселератор для платформенных "список всего"
 * запросов (зоны/субдомены/обёртки) — НЕ замена UniversalBlockchainService,
 * а фолбэк-first слой перед ним: таймаут 2 сек, при неответе/ошибке
 * возвращает null, вызывающий код обязан откатиться на существующий
 * клиентский ончейн-путь.
 *
 * НЕ использовать для: аукционов/ставок (всегда live get_auction_info),
 * минта/любых пишущих транзакций (всегда напрямую кошелёк→блокчейн).
 */

import { SimpleCollection, SimpleEnrichedItem } from './blockchain-items-types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const DEFAULT_TIMEOUT_MS = 2000;

export interface PlatformZoneCacheRow {
  collectionAddress: string;
  name: string;
  // Отображаемое имя коллекции из метадаты ("Song DNS Domains") — НЕ домен.
  // Реальный домен ("song.ton") лежит здесь, распаршен кроулером из
  // collection_content.uri. Может быть null для строк, ещё не пересобранных
  // после добавления этой колонки — до первого нового прохода кроулера.
  domain: string | null;
  isProxy: number;
  wrapperAddress: string | null;
  ownerAddress: string | null;
  image: string | null;
  description: string | null;
  totalItems: number;
  status: string;
  lastSyncedAt: string;
  chainCreatedAt?: string | null;
  siteResolves?: number | null;
}

export interface PlatformSubdomainCacheRow {
  itemAddress: string;
  name: string;
  collectionAddress: string;
  zoneName: string | null;
  isProxy: number;
  itemType: 'proxy_subdomain' | 'sbt_subdomain' | null;
  ownerAddress: string | null;
  image: string | null;
  description: string | null;
  onSale: number;
  lastTransactionLt: string | null;
  status: string;
  lastSyncedAt: string;
  siteResolves?: number | null;
}

export interface PlatformWrapperCacheRow {
  wrapperAddress: string;
  domainName: string;
  collectionAddress: string | null;
  wrapperHolderAddress: string | null;
  dividendOwnerAddress: string | null;
  image: string | null;
  description: string | null;
  lastTransactionLt: string | null;
  status: string;
  lastSyncedAt: string;
}

type PlatformCacheKind = 'zones' | 'subdomains' | 'wrappers';

type PlatformCacheRow<K extends PlatformCacheKind> = K extends 'zones'
  ? PlatformZoneCacheRow
  : K extends 'subdomains'
  ? PlatformSubdomainCacheRow
  : PlatformWrapperCacheRow;

/**
 * Читает /api/platform/{zones|subdomains|wrappers}. Возвращает null (не
 * бросает) при таймауте/сетевой ошибке/невалидном ответе — так вызывающий
 * код единообразно решает "фолбэк на ончейн", не оборачивая каждый вызов
 * в try/catch отдельно.
 */
export async function fetchPlatformCache<K extends PlatformCacheKind>(
  kind: K,
  isTestnet: boolean,
  params: Record<string, string> = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<PlatformCacheRow<K>[] | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const query = new URLSearchParams({ ...params, isTestnet: String(isTestnet) });
    const response = await fetch(`${API_BASE_URL}/api/platform/${kind}?${query.toString()}`, {
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const json = await response.json();
    if (!json?.success || !Array.isArray(json.data)) return null;

    return json.data as PlatformCacheRow<K>[];
  } catch {
    // Таймаут (AbortError) или сетевая ошибка — вызывающий код идёт в фолбэк.
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Точечный апсерт сразу после создания зоны/субдомена/обёртки на фронте —
 * не ждать 15-мин цикла кроулера. Fire-and-forget по духу (как остальные
 * notify*-вызовы в api.ts) — ошибка тут не должна ломать основной флоу
 * создания, следующий проход кроулера сам сверит и поправит запись.
 */
/**
 * Адаптеры кэш-строк бэкенда в те же типы, что и ончейн-путь
 * (UniversalBlockchainService/AppData) — чтобы вставить кэш перед ним в
 * loadAllAppData без изменения формы данных для всех потребителей
 * (Market/минт/профиль/менеджер читают эти типы, не зная, откуда они пришли).
 */

export function platformZoneToSimpleCollection(row: PlatformZoneCacheRow): SimpleCollection {
  return {
    address: row.collectionAddress,
    name: row.name,
    domain: row.domain ?? undefined,
    description: row.description ?? undefined,
    image: row.image ?? undefined,
    total_items: row.totalItems,
    item_count: row.totalItems,
    type: row.isProxy ? 'proxy' : 'sbt',
    owner_address: row.ownerAddress ?? '',
    creator_address: row.ownerAddress ?? undefined,
    lastUpdated: row.lastSyncedAt,
    // Реальное время deploy-транзакции коллекции, а не lastSyncedAt (тот
    // "ползёт" с каждым проходом кроулера) — см. Log.md 2026-08-09.
    created_at: row.chainCreatedAt ?? undefined,
    siteResolves: row.siteResolves == null ? null : !!row.siteResolves,
  };
}

export function platformSubdomainToSimpleEnrichedItem(row: PlatformSubdomainCacheRow): SimpleEnrichedItem {
  return {
    address: row.itemAddress,
    domain: row.name,
    zone: row.zoneName ?? '',
    type: row.itemType ?? (row.isProxy ? 'proxy_subdomain' : 'sbt_subdomain'),
    owner_address: row.ownerAddress,
    collection_address: row.collectionAddress,
    on_sale: !!row.onSale,
    lastUpdated: row.lastSyncedAt,
    last_transaction_lt: row.lastTransactionLt ?? '',
    siteResolves: row.siteResolves == null ? null : !!row.siteResolves,
    metadata: {
      image: row.image ?? undefined,
      token_info: [
        { name: row.name, description: row.description ?? undefined, image: row.image ?? undefined },
      ],
    },
  };
}

export function platformWrapperToSimpleEnrichedItem(row: PlatformWrapperCacheRow): SimpleEnrichedItem {
  return {
    address: row.wrapperAddress,
    domain: row.domainName,
    zone: row.domainName,
    type: 'nft_wrapper',
    owner_address: row.wrapperHolderAddress,
    collection_address: row.collectionAddress ?? '',
    on_sale: false,
    lastUpdated: row.lastSyncedAt,
    last_transaction_lt: row.lastTransactionLt ?? '',
    metadata: {
      image: row.image ?? undefined,
      token_info: [
        { name: row.domainName, description: row.description ?? undefined, image: row.image ?? undefined },
      ],
    },
  };
}

export async function upsertPlatformCacheEntity(
  kind: PlatformCacheKind extends 'zones' ? 'zones' : 'zones' | 'subdomains' | 'wrappers',
  isTestnet: boolean,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/platform/${kind}/upsert?isTestnet=${isTestnet}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn(`[platformCache] upsert ${kind} failed (не критично, догонит кроулер)`, err);
  }
}
