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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const DEFAULT_TIMEOUT_MS = 2000;

export interface PlatformZoneCacheRow {
  collectionAddress: string;
  name: string;
  isProxy: number;
  wrapperAddress: string | null;
  ownerAddress: string | null;
  status: string;
  lastSyncedAt: string;
}

export interface PlatformSubdomainCacheRow {
  itemAddress: string;
  name: string;
  collectionAddress: string;
  isProxy: number;
  ownerAddress: string | null;
  status: string;
  lastSyncedAt: string;
}

export interface PlatformWrapperCacheRow {
  wrapperAddress: string;
  domainName: string;
  collectionAddress: string | null;
  wrapperHolderAddress: string | null;
  dividendOwnerAddress: string | null;
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
