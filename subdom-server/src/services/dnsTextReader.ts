// subdom-server/src/services/dnsTextReader.ts
//
// Серверный порт tma/src/services/ownerMetaService.ts (fetchAllOwnerDnsText) —
// нужен, чтобы бот мог сам прочитать актуальную аватарку/профиль домена
// напрямую с чейна вместо того, чтобы полагаться на то, что передал фронт
// (фронт не всегда шлёт picture — например, при tsi_icon-загрузке локального
// файла). Держать в синхроне с ownerMetaService.ts при изменении формата.

import { Address, Cell, Dictionary } from '@ton/core';
import { createHash } from 'crypto';

const TONCENTER_API_KEY = process.env.TONCENTER_API_KEY;

const CATEGORY_TITLE = 'title';
const CATEGORY_DESCRIPTION = 'description';
const CATEGORY_CATEGORY = 'category';
const CATEGORY_PICTURE = 'picture';
const CATEGORY_ICON = 'tsi_icon';

const DNS_TEXT_TAG = 0x1eda;
const OWNER_META_VERSION = 1;

function categoryKey(name: string): bigint {
  const hash = createHash('sha256').update(name, 'utf8').digest();
  return BigInt('0x' + hash.toString('hex'));
}

function decodeDnsText(cell: Cell): string | null {
  try {
    let slice = cell.beginParse();
    const tag = slice.loadUint(16);
    if (tag !== DNS_TEXT_TAG) return null;
    const chunkCount = slice.loadUint(8);

    const parts: Buffer[] = [];
    for (let i = 0; i < chunkCount; i++) {
      const len = slice.loadUint(8);
      parts.push(Buffer.from(slice.loadBuffer(len)));
      if (i + 1 < chunkCount) {
        slice = slice.loadRef().beginParse();
      }
    }
    return Buffer.concat(parts).toString('utf8');
  } catch {
    return null;
  }
}

function loadBinarySnake(cell: Cell): Buffer {
  let slice = cell.beginParse();
  const parts: Buffer[] = [];
  while (true) {
    const bytesAvailable = Math.floor(slice.remainingBits / 8);
    parts.push(Buffer.from(slice.loadBuffer(bytesAvailable)));
    if (slice.remainingRefs > 0) {
      slice = slice.loadRef().beginParse();
    } else {
      break;
    }
  }
  return Buffer.concat(parts);
}

function sniffImageMime(bytes: Buffer): string {
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (bytes.length >= 3 && bytes.toString('ascii', 0, 3) === 'GIF') {
    return 'image/gif';
  }
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return 'image/png';
}

async function fetchSelfDnsRecordsDict(
  nftAddress: string,
  isTestnet: boolean
): Promise<Dictionary<bigint, Cell> | null> {
  const rawAddress = Address.parse(nftAddress).toRawString();
  const base = isTestnet
    ? 'https://testnet.toncenter.com/api/v3/runGetMethod'
    : 'https://toncenter.com/api/v3/runGetMethod';
  const apiUrl = TONCENTER_API_KEY ? `${base}?api_key=${encodeURIComponent(TONCENTER_API_KEY)}` : base;

  const { beginCell } = await import('@ton/core');
  const selfMarkerBoc = beginCell().storeUint(0, 8).endCell().toBoc().toString('base64');

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: rawAddress,
      method: 'dnsresolve',
      stack: [
        { type: 'slice', value: selfMarkerBoc },
        { type: 'num', value: '0' },
      ],
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;

  const data: any = await response.json();
  const dictEntry = data?.stack?.[1];
  if (!dictEntry || dictEntry.type !== 'cell') return null;

  const boc = dictEntry.value;
  if (!boc) return null;
  const dictRootCell = Cell.fromBoc(Buffer.from(boc, 'base64'))[0];
  if (!dictRootCell) return null;

  return Dictionary.loadDirect(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell(), dictRootCell);
}

export interface OwnerDnsText {
  title: string | null;
  description: string | null;
  category: string | null;
  picture: string | null;
  icon: string | null;
}

/**
 * Читает title/description/category/picture(+tsi_icon фолбэк) домена/субдомена
 * напрямую с чейна по адресу NFT-айтема — авторитетный источник для бота,
 * не зависит от того, что (и передал ли вообще) фронт в момент сохранения.
 */
export async function fetchAllOwnerDnsText(nftAddress: string, isTestnet: boolean): Promise<OwnerDnsText> {
  const empty: OwnerDnsText = { title: null, description: null, category: null, picture: null, icon: null };
  try {
    const dict = await fetchSelfDnsRecordsDict(nftAddress, isTestnet);
    if (!dict) return empty;

    const titleKey = categoryKey(CATEGORY_TITLE);
    const descriptionKey = categoryKey(CATEGORY_DESCRIPTION);
    const categoryKeyHash = categoryKey(CATEGORY_CATEGORY);
    const pictureKey = categoryKey(CATEGORY_PICTURE);
    const iconKey = categoryKey(CATEGORY_ICON);

    const readCell = (key: bigint) => {
      const cell = dict.get(key);
      return cell ? decodeDnsText(cell) : null;
    };

    const iconCell = dict.get(iconKey);
    let icon: string | null = null;
    if (iconCell) {
      const raw = loadBinarySnake(iconCell);
      if (raw.length > 1 && raw[0] === OWNER_META_VERSION) {
        const bytes = raw.subarray(1);
        icon = `data:${sniffImageMime(bytes)};base64,${bytes.toString('base64')}`;
      }
    }

    return {
      title: readCell(titleKey),
      description: readCell(descriptionKey),
      category: readCell(categoryKeyHash),
      picture: readCell(pictureKey),
      icon,
    };
  } catch {
    return empty;
  }
}

/** picture (URL) в приоритете, tsi_icon (data: URI) — фолбэк. null, если ни того ни другого нет. */
export async function fetchOwnerAvatarUrl(nftAddress: string, isTestnet: boolean): Promise<string | null> {
  const { picture, icon } = await fetchAllOwnerDnsText(nftAddress, isTestnet);
  return picture || icon || null;
}

// ==================== SITE (ADNL) / STORAGE (bagID) ====================
// Порт fetchSiteAndStorageRecords из ownerMetaService.ts — нужен, чтобы бот
// понимал, что РЕАЛЬНО привязано к домену/субдомену (сайт или торрент), и не
// подсовывал кнопку "Посмотреть сайт" туда, где на самом деле только bagID
// (см. content-updated уведомление — раньше кнопка была захардкожена).
const SITE_ADNL_TAG = 0xad01;
const STORAGE_BAG_ID_TAG = 0x7473;

function decodeSiteAdnl(cell: Cell): string | null {
  try {
    const slice = cell.beginParse();
    if (slice.loadUint(16) !== SITE_ADNL_TAG) return null;
    return slice.loadBuffer(32).toString('hex').toUpperCase();
  } catch {
    return null;
  }
}

function decodeStorageBagId(cell: Cell): string | null {
  try {
    const slice = cell.beginParse();
    if (slice.loadUint(16) !== STORAGE_BAG_ID_TAG) return null;
    return slice.loadBuffer(32).toString('hex').toUpperCase();
  } catch {
    return null;
  }
}

export async function fetchSiteAndStorageRecords(
  nftAddress: string,
  isTestnet: boolean
): Promise<{ siteAdnl: string | null; storageBagId: string | null }> {
  const empty = { siteAdnl: null, storageBagId: null };
  try {
    const dict = await fetchSelfDnsRecordsDict(nftAddress, isTestnet);
    if (!dict) return empty;

    const siteKey = categoryKey('site');
    const storageKey = categoryKey('storage');
    const siteCell = dict.get(siteKey);
    const storageCell = dict.get(storageKey);

    return {
      siteAdnl: siteCell ? decodeSiteAdnl(siteCell) : null,
      storageBagId: storageCell ? decodeStorageBagId(storageCell) : null,
    };
  } catch {
    return empty;
  }
}
