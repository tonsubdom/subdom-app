// tma/src/services/ownerMetaService.ts
//
// Портировано bit-for-bit из референса вадвека (ton-dns-siteinfo,
// reference/ownerMetaService.ts) — уже live-протестированный энкодер для
// dns_text#1eda категорий title/description/category/picture, читаемых
// TONresistor/webdom.market. Пишется через тот же опкод change_dns_record,
// что уже используется в проекте для site/storage/wallet записей
// (см. store/dns/dnsRecordsSlice.ts) — но там бэкенд строит payload,
// здесь BOC собирается прямо на фронте (как в оригинале), без похода
// на builder-api-master.
//
// При изменении держать в синхроне с internal/resolver.go (decodeDnsText) —
// см. комментарии в исходном файле про TL-B схему dns_text#1eda.

import { Address, Builder, Cell, Dictionary, beginCell } from '@ton/core';

const DNS_CHANGE_RECORD_OP = 0x4eb1f0f9;

const CATEGORY_TITLE = 'title';
const CATEGORY_DESCRIPTION = 'description';
const CATEGORY_CATEGORY = 'category';
const CATEGORY_PICTURE = 'picture';

const DNS_TEXT_TAG = 0x1eda;
const TEXT_CHUNK_MAX_BYTES = 120;

// tsi_icon — легаси-категория Ton Site Index/Builder (sha256("tsi_icon"), не
// часть TEP-81), сырые байты картинки вместо URL. У subdom нет своего
// хостинга картинок — раньше локальный файл кодировался как data:-URI и
// писался в "picture", что нарушает конвенцию "picture = чистый URL"
// (совпадает byte-for-byte с webdom.market только пока там реальная ссылка).
// tsi_icon — официально предусмотренный вадвеком путь для этого случая:
// версионный байт + бинарный snake, без base64-раздувания.
const CATEGORY_ICON = 'tsi_icon';
const OWNER_META_VERSION = 1;

function encodeDnsText(str: string): Cell {
  const data = Buffer.from(str, 'utf8');
  const chunks: Buffer[] = [];
  for (let i = 0; i < data.length; i += TEXT_CHUNK_MAX_BYTES) {
    chunks.push(data.subarray(i, i + TEXT_CHUNK_MAX_BYTES));
  }
  const builder = beginCell().storeUint(DNS_TEXT_TAG, 16).storeUint(chunks.length, 8);
  if (chunks.length > 0) appendTextChunk(builder, chunks, 0);
  return builder.endCell();
}

function appendTextChunk(builder: Builder, chunks: Buffer[], index: number): void {
  const chunk = chunks[index];
  builder.storeUint(chunk.length, 8).storeBuffer(chunk);
  if (index + 1 < chunks.length) {
    const rest = beginCell();
    appendTextChunk(rest, chunks, index + 1);
    builder.storeRef(rest.endCell());
  }
}

async function sha256Bytes(str: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(buf);
}

async function categoryKey(name: string): Promise<bigint> {
  const bytes = await sha256Bytes(name);
  return BigInt('0x' + Buffer.from(bytes).toString('hex'));
}

function buildChangeRecordMessage(categoryKeyBig: bigint, valueCell: Cell): Cell {
  return beginCell()
    .storeUint(DNS_CHANGE_RECORD_OP, 32)
    .storeUint(0, 64) // query_id
    .storeUint(categoryKeyBig, 256)
    .storeRef(valueCell)
    .endCell();
}

export interface OwnerMetaFields {
  title: string;
  description: string;
  category: string;
}

/** 3 сообщения change_dns_record (title/description/category), каждое — отдельным message в транзакции. */
export async function buildOwnerDnsTextPayloads(fields: OwnerMetaFields): Promise<string[]> {
  const entries: [string, string][] = [
    [CATEGORY_TITLE, fields.title],
    [CATEGORY_DESCRIPTION, fields.description],
    [CATEGORY_CATEGORY, fields.category],
  ];
  return Promise.all(
    entries.map(async ([name, value]) => {
      const key = await categoryKey(name);
      return buildChangeRecordMessage(key, encodeDnsText(value)).toBoc().toString('base64');
    })
  );
}

/** 4-е сообщение — категория "picture", просто URL картинки (совпадает по конвенции с webdom.market). */
export async function buildOwnerPicturePayload(url: string): Promise<string> {
  const key = await categoryKey(CATEGORY_PICTURE);
  return buildChangeRecordMessage(key, encodeDnsText(url)).toBoc().toString('base64');
}

// Цепочка сырых байт по ячейкам как @ton/core's Builder.storeStringTail —
// "сколько влезло в эту ячейку, потом ref на новую для остатка" snake-формат,
// но без UTF-8-кодирования (испортило бы бинарные данные картинки).
function storeBinarySnake(builder: Builder, data: Buffer): Builder {
  if (data.length === 0) return builder;
  const bytesAvailable = Math.floor(builder.availableBits / 8);
  if (data.length <= bytesAvailable) {
    return builder.storeBuffer(data);
  }
  builder.storeBuffer(data.subarray(0, bytesAvailable));
  const rest = beginCell();
  storeBinarySnake(rest, data.subarray(bytesAvailable));
  return builder.storeRef(rest.endCell());
}

/**
 * Альтернатива buildOwnerPicturePayload для локального файла без хостинга —
 * категория "tsi_icon" (версионный байт + сырые байты). Форма шлёт ровно
 * одно из двух сообщений (picture ИЛИ tsi_icon), никогда оба — иначе выйдет
 * за лимит 4 сообщений на транзакцию для v3/v4-кошельков.
 */
export async function buildOwnerIconPayload(iconBytes: Uint8Array): Promise<string> {
  const key = await categoryKey(CATEGORY_ICON);
  const valueCell = storeBinarySnake(
    beginCell().storeUint(OWNER_META_VERSION, 8),
    Buffer.from(iconBytes)
  ).endCell();
  return buildChangeRecordMessage(key, valueCell).toBoc().toString('base64');
}

export function toUserFriendly(raw: string): string {
  return Address.parse(raw).toString({ bounceable: true });
}

export interface ResolvedDomain {
  nftAddress: string;
  ownerAddress: string;
}

/** Ищет dns_item-адрес домена через публичный tonapi.io GET (без похода на свой бэкенд/гейтвей). */
export async function resolveDomainNftAddress(domain: string): Promise<ResolvedDomain | null> {
  const res = await fetch(`https://tonapi.io/v2/dns/${encodeURIComponent(domain)}`);
  if (!res.ok) return null;
  const data = await res.json();
  const addr = data?.item?.address;
  const owner = data?.item?.owner?.address;
  if (!addr || !owner) return null;
  // tonapi.io отдаёт адреса в raw-формате (0:hex...) — TonConnect SDK валидирует
  // messages[].address строго как user-friendly (isValidUserFriendlyAddress),
  // raw-адрес там отклоняется ("Wrong 'address' format"). Нормализуем сразу
  // здесь, чтобы результат этой функции всегда был безопасен для sendTransaction.
  return {
    nftAddress: Address.parse(addr).toString({ bounceable: true }),
    ownerAddress: Address.parse(owner).toString({ bounceable: true }),
  };
}

// ==================== ЧТЕНИЕ dns_text (зеркало энкодера выше) ====================
//
// Протокол сверен с reference/resolver_excerpt.go.txt (вадвековский Ton Site
// Index, живой код в проде) — прошлая версия звала dnsresolve(slice, category)
// напрямую по TEP-81 буквально ("одна категория — один вызов"), но реальные
// dns_item-контракты TEP-81 отдают через dnsresolve НЕ конкретную запись, а
// self-маркером (subdomain = один байт 0x00, category = 0) — ЦЕЛЫЙ словарь
// всех записей домена разом (второй элемент стека — TVM null, если записей
// нет вообще, иначе Cell-корень HashmapE<256, ^Cell>). Нужную категорию потом
// достаём из словаря по её sha256-ключу. Старая версия из-за этого не находила
// вообще ничего, даже для доменов с заведомо существующими записями.

/** Обратная операция encodeDnsText — реконструирует строку из dns_text#1eda cell. */
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

/** Обратная операция storeBinarySnake — читает сырые байты, идя по ref-цепочке ячеек. */
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

/**
 * Один вызов dnsresolve с TEP-81 self-маркером — возвращает словарь ВСЕХ
 * dns_text (и любых других) записей домена разом, либо null (у домена вообще
 * нет записей). Категории потом ищутся в этом словаре локально, без похода
 * в сеть на каждую.
 */
async function fetchSelfDnsRecordsDict(
  nftAddress: string,
  isTestnet: boolean
): Promise<Dictionary<bigint, Cell> | null> {
  const rawAddress = Address.parse(nftAddress).toRawString();
  const apiUrl = isTestnet
    ? 'https://testnet.toncenter.com/api/v3/runGetMethod'
    : 'https://toncenter.com/api/v3/runGetMethod';

  // self-маркер по TEP-81: subdomain — слайс из одного нулевого байта (НЕ
  // пустой слайс), category = 0.
  const selfMarkerBoc = beginCell().storeUint(0, 8).endCell().toBoc().toString('base64');

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: rawAddress,
      method: 'dnsresolve',
      stack: [
        ['tvm.Slice', selfMarkerBoc],
        ['num', '0'],
      ],
    }),
  });
  if (!response.ok) return null;

  const data = await response.json();
  // dnsresolve(slice, int) -> (int used_bits, cell|null records) — второй элемент стека.
  // Пустой словарь TVM отдаёт как null, а не как Cell — это нормальное состояние
  // "у домена ещё нет ни одной записи", не ошибка.
  const dictEntry = data?.stack?.[1];
  if (!dictEntry || dictEntry[0] !== 'tvm.Cell') return null;

  const boc = dictEntry[1]?.bytes ?? dictEntry[1];
  if (!boc) return null;
  const dictRootCell = Cell.fromBoc(Buffer.from(boc, 'base64'))[0];

  return Dictionary.loadDirect(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell(), dictRootCell);
}

/** Читает одну dns_text-категорию (например "picture") с dns_item-контракта домена. */
export async function fetchOwnerDnsTextCategory(
  nftAddress: string,
  category: string,
  isTestnet: boolean
): Promise<string | null> {
  try {
    const dict = await fetchSelfDnsRecordsDict(nftAddress, isTestnet);
    if (!dict) return null;
    const key = await categoryKey(category);
    const valueCell = dict.get(key);
    return valueCell ? decodeDnsText(valueCell) : null;
  } catch {
    return null;
  }
}

/**
 * Читает все 4 наших dns_text-категории + легаси tsi_icon ОДНИМ вызовом
 * dnsresolve (вместо N отдельных сетевых запросов по кругу) — используется
 * формой AvatarSecretPage для подтяжки уже существующей записи. icon
 * возвращается уже готовым data:-URI (mime определяется по magic bytes) —
 * используется как фолбэк для превью, если "picture" (URL) не задан.
 */
export async function fetchAllOwnerDnsText(
  nftAddress: string,
  isTestnet: boolean
): Promise<{
  title: string | null;
  description: string | null;
  category: string | null;
  picture: string | null;
  icon: string | null;
}> {
  const empty = { title: null, description: null, category: null, picture: null, icon: null };
  try {
    const dict = await fetchSelfDnsRecordsDict(nftAddress, isTestnet);
    if (!dict) return empty;

    const [titleKey, descriptionKey, categoryKeyHash, pictureKey, iconKey] = await Promise.all([
      categoryKey(CATEGORY_TITLE),
      categoryKey(CATEGORY_DESCRIPTION),
      categoryKey(CATEGORY_CATEGORY),
      categoryKey(CATEGORY_PICTURE),
      categoryKey(CATEGORY_ICON),
    ]);

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

/** Читает category "picture" — используется как аватар домена/зоны (ProfileWidget). */
export async function fetchOwnerPicture(nftAddress: string, isTestnet: boolean): Promise<string | null> {
  return fetchOwnerDnsTextCategory(nftAddress, CATEGORY_PICTURE, isTestnet);
}
