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

import { Address, Builder, Cell, beginCell } from '@ton/core';

const DNS_CHANGE_RECORD_OP = 0x4eb1f0f9;

const CATEGORY_TITLE = 'title';
const CATEGORY_DESCRIPTION = 'description';
const CATEGORY_CATEGORY = 'category';
const CATEGORY_PICTURE = 'picture';

const DNS_TEXT_TAG = 0x1eda;
const TEXT_CHUNK_MAX_BYTES = 120;

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
  return { nftAddress: addr, ownerAddress: owner };
}

// ==================== ЧТЕНИЕ dns_text (зеркало энкодера выше) ====================
//
// ВНИМАНИЕ: как и энкодер (см. комментарий encodeDnsText в референсе), это
// НЕ проверено вживую на реальной ончейн-записи — писать/читать один и тот же
// баг можно "успешно" протестировать друг на друге. Перед тем как полагаться
// на это в проде, стоит явно проверить чтение записи, реально записанной через
// AvatarSecretPage, а не только то, что код компилируется.

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

/**
 * Читает одну dns_text-категорию (например "picture") с dns_item-контракта
 * домена через get-метод dnsresolve(subdomain, category) — тот же метод,
 * которым в проекте уже читается next_resolver (см. tonUtils.ts
 * checkDomainDNSRecord), но с конкретной category вместо "поля 4 подряд".
 */
export async function fetchOwnerDnsTextCategory(
  nftAddress: string,
  category: string,
  isTestnet: boolean
): Promise<string | null> {
  try {
    const key = await categoryKey(category);
    const rawAddress = Address.parse(nftAddress).toRawString();
    const apiUrl = isTestnet
      ? 'https://testnet.toncenter.com/api/v3/runGetMethod'
      : 'https://toncenter.com/api/v3/runGetMethod';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: rawAddress,
        method: 'dnsresolve',
        stack: [
          ['tvm.Slice', ''],
          ['num', key.toString()],
        ],
      }),
    });
    if (!response.ok) return null;

    const data = await response.json();
    // dnsresolve(slice, int) -> (int used_bits, cell value) — второй элемент стека.
    const cellEntry = data?.stack?.[1];
    if (!cellEntry || cellEntry[0] !== 'tvm.Cell') return null;

    const boc = cellEntry[1]?.bytes ?? cellEntry[1];
    if (!boc) return null;
    const cell = Cell.fromBoc(Buffer.from(boc, 'base64'))[0];
    return decodeDnsText(cell);
  } catch {
    return null;
  }
}

/** Читает category "picture" — используется как аватар домена/зоны (ProfileWidget). */
export async function fetchOwnerPicture(nftAddress: string, isTestnet: boolean): Promise<string | null> {
  return fetchOwnerDnsTextCategory(nftAddress, CATEGORY_PICTURE, isTestnet);
}
