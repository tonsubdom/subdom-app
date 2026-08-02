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

// Тот же ключ, что и в services/blockchainItems/toncenter-api-config.ts —
// без него публичный toncenter даёт 429 уже на 2-3 запросе подряд, а полный
// TEP-81 резолв поддомена (dnsResolveChain) делает по одному запросу на
// каждый уровень вложенности, так что без ключа он почти всегда падает на
// последнем прыжке (подтверждено вживую 2026-08-02 на resistor.tondev.ton).
const TONCENTER_API_KEY = import.meta.env.VITE_TONCENTER_API_KEY as string | undefined;

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

async function resolveDomainViaTonapi(domain: string): Promise<ResolvedDomain | null> {
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

// ==================== ПОЛНЫЙ TEP-81 РЕЗОЛВ (корень сети → любой поддомен) ====================
//
// tonapi.io/v2/dns/{name} — это плоский лукап по её собственному индексу
// зарегистрированных ИМЁН, а не настоящий ончейн-резолв: подтверждено вживую
// 2026-08-02 — резолвит корневые .ton-домены и "плоские" коллекции (t.me-
// юзернеймы), но 404 на ЛЮБОЙ вложенный поддомен ЛЮБОЙ коллекции (в т.ч.
// заведомо существующий, судя по address_book chuжого домена). Единственный
// общий способ резолвить поддомен (сабдом-платформы или чужой — .gram,
// tonnel.ton, getgems.ton, vipx.ton, pseudonym.ton и т.д.) — самому пройти
// протокол TEP-81 рекурсивного делегирования от корневого DNS-резолвера
// сети (ConfigParam 4), как это делает tonweb's Dns.resolve (сверено с её
// исходником: node_modules/tonweb/src/contract/dns/DnsUtils.js — тот же
// формат байт домена и тот же алгоритм цикла по dns_next_resolver, портировано
// на toncenter v3 runGetMethod). Проверено вживую 2026-08-02: root → "TON DNS
// Domains" коллекция → nft-айтем 7707.ton, оба адреса совпали с уже
// подтверждённым результатом tonapi для того же домена.

const MAINNET_ROOT_DNS = '-1:e56754f83426f69b09267bd876ac97c44821345b7e266bd956a7bfbfb98df35c';
const TESTNET_ROOT_DNS = '-1:efe71d13860afaa6aeaeaf636f9168487f80f1031b0bf8d939ae49d3ea7f7da0';

/** TEP-81 domainToBytes — реверс лейблов через null-байты, с ведущим null-байтом (см. tonweb DnsUtils.js). */
function domainToBytes(domain: string): Buffer {
  const labels = domain.toLowerCase().split('.');
  if (labels.some((l) => l.length === 0)) throw new Error('domain name cannot have an empty component');
  const parts: Buffer[] = [];
  for (const label of [...labels].reverse()) {
    parts.push(Buffer.from(label, 'utf8'), Buffer.from([0]));
  }
  let raw = Buffer.concat(parts);
  if (raw.length < 126) raw = Buffer.concat([Buffer.from([0]), raw]);
  return raw;
}

async function runGetMethodV3(address: string, method: string, stack: Array<{ type: string; value: string }>, isTestnet: boolean) {
  const base = isTestnet ? 'https://testnet.toncenter.com/api/v3/runGetMethod' : 'https://toncenter.com/api/v3/runGetMethod';
  const apiUrl = TONCENTER_API_KEY ? `${base}?api_key=${encodeURIComponent(TONCENTER_API_KEY)}` : base;
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, method, stack }),
  });
  if (!response.ok) return null;
  return response.json();
}

/** Один шаг рекурсивного dnsresolve — при неполном резолве прыгает на dns_next_resolver и продолжает с остатком байт. */
async function dnsResolveChain(address: string, rawDomainBytes: Buffer, isTestnet: boolean): Promise<string | null> {
  const lenBits = rawDomainBytes.length * 8;
  const sliceBoc = beginCell().storeBuffer(rawDomainBytes).endCell().toBoc().toString('base64');

  const data = await runGetMethodV3(
    address,
    'dnsresolve',
    [
      { type: 'slice', value: sliceBoc },
      { type: 'num', value: '0' },
    ],
    isTestnet
  );
  if (!data?.stack || data.stack.length < 2) return null;

  const resultLenEntry = data.stack[0];
  const cellEntry = data.stack[1];
  if (!resultLenEntry || resultLenEntry.type !== 'num') return null;
  const resultLen = parseInt(resultLenEntry.value, 16);
  if (!resultLen || resultLen % 8 !== 0 || resultLen > lenBits) return null;

  if (resultLen === lenBits) {
    // Полностью резолвлено этим контрактом — он и есть искомый dns_item.
    return address;
  }
  if (!cellEntry || cellEntry.type !== 'cell') return null; // дальше пути нет

  try {
    const nextCell = Cell.fromBoc(Buffer.from(cellEntry.value, 'base64'))[0];
    const slice = nextCell.beginParse();
    slice.loadUint(16); // dns_next_resolver record prefix (0xba93) — не проверяем строго, как и tonweb
    const nextAddress = slice.loadAddress();
    return dnsResolveChain(nextAddress.toRawString(), rawDomainBytes.subarray(resultLen / 8), isTestnet);
  } catch {
    return null;
  }
}

async function resolveDomainViaFullChain(domain: string, isTestnet: boolean): Promise<ResolvedDomain | null> {
  try {
    const rootAddress = isTestnet ? TESTNET_ROOT_DNS : MAINNET_ROOT_DNS;
    const finalAddress = await dnsResolveChain(rootAddress, domainToBytes(domain), isTestnet);
    if (!finalAddress) return null;
    // ownerAddress здесь не резолвим (нужен отдельный вызов get_nft_data,
    // которым ни один текущий вызывающий код не пользуется) — пустая строка,
    // не undefined, чтобы не ломать существующий тип ResolvedDomain.
    return {
      nftAddress: Address.parse(finalAddress).toString({ bounceable: true, testOnly: isTestnet }),
      ownerAddress: '',
    };
  } catch {
    return null;
  }
}

/**
 * Ищет dns_item-адрес домена. Сначала быстрый путь через tonapi.io (корневые
 * .ton-домены, t.me-юзернеймы), при неудаче — общий путь: полный TEP-81
 * резолв от корня сети, который умеет резолвить ЛЮБОЙ поддомен ЛЮБОЙ
 * коллекции (сабдом-платформы или чужой), если та стандартно реализует
 * dns_next_resolver-делегирование.
 */
export async function resolveDomainNftAddress(domain: string, isTestnet: boolean = false): Promise<ResolvedDomain | null> {
  const viaTonapi = await resolveDomainViaTonapi(domain);
  if (viaTonapi) return viaTonapi;
  return resolveDomainViaFullChain(domain, isTestnet);
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
  const base = isTestnet
    ? 'https://testnet.toncenter.com/api/v3/runGetMethod'
    : 'https://toncenter.com/api/v3/runGetMethod';
  const apiUrl = TONCENTER_API_KEY ? `${base}?api_key=${encodeURIComponent(TONCENTER_API_KEY)}` : base;

  // self-маркер по TEP-81: subdomain — слайс из одного нулевого байта (НЕ
  // пустой слайс), category = 0.
  const selfMarkerBoc = beginCell().storeUint(0, 8).endCell().toBoc().toString('base64');

  // toncenter v3 runGetMethod ждёт стек как объекты {type, value}, а не
  // array-tuple ["tvm.Slice", ...] (это формат другой, TL-based, API — им
  // здесь никогда не пользовались). С array-tuple v3 отдаёт 422:
  // "cannot unmarshal array into Go struct field ...V2StackEntity" —
  // подтверждено вручную запросом к живому API 2026-08-02.
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
  });
  if (!response.ok) return null;

  const data = await response.json();
  // dnsresolve(slice, int) -> (int used_bits, cell|null records) — второй элемент стека.
  // Пустой словарь TVM отдаёт как null, а не как Cell — это нормальное состояние
  // "у домена ещё нет ни одной записи", не ошибка.
  const dictEntry = data?.stack?.[1];
  if (!dictEntry || dictEntry.type !== 'cell') return null;

  const boc = dictEntry.value;
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

// ==================== SITE (ADNL) / STORAGE (bagID) ====================
//
// Те же категории "site"/"storage", что уже читает toncenter's REST
// /api/v3/dns/records (см. dnsRecordsSlice.ts, dns_site_adnl/dns_storage_bag_id) —
// но тот эндпоинт индексирует по ИМЕНИ домена и, как tonapi.io, находит
// только корневые .ton-домены, не кастомные субдомены платформы. Тут —
// тот же прямой dnsresolve по адресу NFT-айтема, что уже используется выше
// для title/description/picture, поэтому резолвит ЛЮБОЙ субдомен.
// Форматы записей — TEP-81: dns_adnl_address#ad01 (256 бит ADNL),
// dns_storage_address#7473 (256 бит bagID).
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

/** Читает site (ADNL) и storage (bagID) записи одним dnsresolve-вызовом — работает и для субдоменов. */
export async function fetchSiteAndStorageRecords(
  nftAddress: string,
  isTestnet: boolean
): Promise<{ siteAdnl: string | null; storageBagId: string | null }> {
  const empty = { siteAdnl: null, storageBagId: null };
  try {
    const dict = await fetchSelfDnsRecordsDict(nftAddress, isTestnet);
    if (!dict) return empty;

    const [siteKey, storageKey] = await Promise.all([categoryKey('site'), categoryKey('storage')]);
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
