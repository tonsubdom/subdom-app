// src/utils/tonUtils.ts
import { Address } from "ton-core";

const API_PAYLOAD_URL = import.meta.env.VITE_API_SC_PAYLOAD_URL;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/** Ключ toncenter теперь только на сервере — фронт всегда бьёт в бэкенд-прокси. */
function toncenterApiUrl(isTestnet: boolean, path: string): string {
  return `${API_BASE_URL}/api/toncenter-proxy/${isTestnet ? 'testnet' : 'mainnet'}/api/${path}`;
}

/**
 * Конвертирует user-friendly адрес (kQ...) в raw формат (0:...)
 */
export function convertUserFriendlyToRaw(userFriendlyAddress: string): string {
  try {
    // Если адрес уже в raw формате, возвращаем как есть
    if (userFriendlyAddress.startsWith('0:')) {
      return userFriendlyAddress.toLowerCase();
    }
    
    // Парсим адрес
    const address = Address.parse(userFriendlyAddress);
    return address.toRawString();
  } catch (error) {
    console.error('Ошибка конвертации адреса:', error);
    return userFriendlyAddress;
  }
}

/**
 * Канонический raw+lowercase адрес — тот же паттерн, что уже используется в
 * TransactionService.ts (Address.parse(x).toRawString().toLowerCase()) для
 * сверки destination-адреса при подтверждении транзакции. Стандартный
 * способ приводить адрес к виду, безопасному для хранения/сравнения в БД —
 * friendly-адрес регистрозависим (чек-сумма в base64url), lowercase на нём
 * ломает Address.parse() ниже по цепочке ("Invalid checksum", поймано
 * юзером вживую при тесте продажи бенефициарства). Использовать на границе
 * с сетью (apiService) для любого адреса, который потом хранится/
 * сравнивается на бэкенде или парсится обратно на фронте/контракте.
 */
export function normalizeAddress(address: string): string {
  try {
    return Address.parse(address).toRawString().toLowerCase();
  } catch (error) {
    console.error('Ошибка нормализации адреса:', error);
    return address;
  }
}

/**
 * Конвертирует raw адрес (0:...) в user-friendly формат (kQ...)
 */
export function convertRawToUserFriendly(rawAddress: string): string {
  try {
    if (!rawAddress.startsWith('0:')) {
      return rawAddress;
    }
    
    const address = Address.parse(rawAddress);
    return address.toString({ urlSafe: true, bounceable: true });
  } catch (error) {
    console.error('Ошибка конвертации адреса:', error);
    return rawAddress;
  }
}

export function convertRawToUserFriendlyTest(rawAddress: string): string {
  try {
    if (!rawAddress.startsWith('0:')) {
      return rawAddress;
    }
    
    const address = Address.parse(rawAddress);
    return address.toString({ urlSafe: true, bounceable: false , testOnly: true});
  } catch (error) {
    console.error('Ошибка конвертации адреса:', error);
    return rawAddress;
  }
}

/**
 * Получает owner_address NFT через toncenter API
 */
export async function getNftOwnerAddress(
  nftAddress: string, 
  isTestnet: boolean
): Promise<string | null> {
  try {
    const apiUrl = toncenterApiUrl(isTestnet, 'v3/nft/items');
    
    // Конвертируем адрес в raw формат если нужно
    const rawAddress = convertUserFriendlyToRaw(nftAddress);
    
    const response = await fetch(
      `${apiUrl}?address=${encodeURIComponent(rawAddress)}&include_on_sale=false&limit=1&offset=0`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.nft_items && data.nft_items.length > 0) {
      const nftItem = data.nft_items[0];
      return nftItem.owner_address || null;
    }
    
    return null;
  } catch (error) {
    console.error('Ошибка получения owner_address:', error);
    return null;
  }
}

/**
 * Проверяет DNS запись домена (4 поле - resolver)
 */
export async function checkDomainDNSRecord(
  domainAddress: string, 
  isTestnet: boolean
): Promise<string | null> {
  try {
    const apiUrl = toncenterApiUrl(isTestnet, 'v3/runGetMethod');
    
    const rawAddress = convertUserFriendlyToRaw(domainAddress);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: rawAddress,
        method: 'dnsresolve',
        stack: [['tvm.Slice', '']]
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.stack && data.stack.length >= 4) {
      // 4 поле - это resolver address (индекс 3)
      const resolverCell = data.stack[3];
      if (resolverCell && resolverCell[0] === 'tvm.Cell') {
        // Парсим cell чтобы получить адрес
        const parseResponse = await fetch(`${API_PAYLOAD_URL}/api/v1/parse_cell`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cell_bytes: resolverCell[1]
          })
        });
        
        if (parseResponse.ok) {
          const parseData = await parseResponse.json();
          if (parseData && parseData.address) {
            return parseData.address;
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Ошибка проверки DNS записи домена:', error);
    return null;
  }
}

/**
 * Читает текущий partner_share (получатель 90% с аукционов Proxy-зоны +
 * доля/знаменатель) прямо с ончейна через get_partner_share() в collection.fc
 * (метод уже существует в контракте, ничего дописывать не нужно). Нужен
 * перед исполнением заявки transfer_beneficiary (Market -> Коллекции) —
 * меняем только адрес, share/denominator берём отсюда, чтобы не
 * пересматривать процент при продаже доли.
 *
 * Проверено живым вызовом на mainnet (2026-11-21, реальная Proxy-зона) —
 * toncenter v3 `runGetMethod` отдаёт stack-элементы как объекты
 * `{type, value}` (НЕ массивы `[type, value]`, как ошибочно предполагалось
 * раньше по аналогии с другим кодом) — старая проверка `shareItem[0] !==
 * 'num'` всегда была true (на объекте `[0]` === undefined), функция
 * всегда возвращала null, заявка на смену бенефициара не могла даже
 * построить транзакцию. Это и было причиной "красной ошибки при
 * завершении продажи бенефициарства" (Log.md 2026-11-07). Адрес
 * partner_addr (stack[0], тип "cell") больше не декодируется — вызывающий
 * код (PendingActionsPanel.executeTransferBeneficiary) использует только
 * share/denominator, подставляя НОВЫЙ адрес из заявки; декодирование шло
 * через несуществующий на бэкенде эндпоинт `/api/v1/parse_cell/`.
 */
export async function getPartnerShare(
  collectionAddress: string,
  isTestnet: boolean
): Promise<{ share: number; denominator: number } | null> {
  try {
    const apiUrl = toncenterApiUrl(isTestnet, 'v3/runGetMethod');
    const rawAddress = convertUserFriendlyToRaw(collectionAddress);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: rawAddress,
        method: 'get_partner_share',
        stack: []
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // (slice partner_addr, int share_base, int share_factor) — реальный
    // формат ответа toncenter v3: stack — массив ОБЪЕКТОВ {type, value},
    // не пар [type, value]. partner_addr (stack[0], type:"cell") не
    // декодируем — он не нужен единственному вызывающему коду
    // (PendingActionsPanel подставляет новый адрес из заявки, не читает
    // старый) — декодирование через бэкенд всё равно 404'ило бы.
    if (!data || !Array.isArray(data.stack) || data.stack.length < 3) {
      return null;
    }

    const shareItem = data.stack[1];
    const denominatorItem = data.stack[2];

    if (!shareItem || shareItem.type !== 'num' || !denominatorItem || denominatorItem.type !== 'num') {
      return null;
    }
    const share = parseInt(shareItem.value, 16);
    const denominator = parseInt(denominatorItem.value, 16);

    return { share, denominator };
  } catch (error) {
    console.error('Ошибка получения partner_share:', error);
    return null;
  }
}

/**
 * Читает статус/дедлайн эскроу-сделки (Market -> Коллекции, продажа
 * бенефициарства) напрямую с чейна — юзер явно попросил не доверять одной
 * только БД для срока действия оффера/депозита, брать с контракта, где
 * реально видно, когда и до какого момента он действителен
 * (get_escrow_data, см. escrow.fc). status: 0=funded (ещё активен),
 * 1=released, 2=refunded/timeout.
 */
export async function getEscrowOnchainData(
  escrowAddress: string,
  isTestnet: boolean
): Promise<{ status: number; deadline: number } | null> {
  try {
    const apiUrl = toncenterApiUrl(isTestnet, 'v3/runGetMethod');
    const rawAddress = convertUserFriendlyToRaw(escrowAddress);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: rawAddress,
        method: 'get_escrow_data',
        stack: []
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // (slice owner, slice seller, slice buyer, int deal_id, int deadline,
    // int status) — те же объекты {type, value} toncenter v3, что и у
    // get_partner_share выше; адреса (stack[0..2]) не нужны вызывающему
    // коду (он их уже знает), берём только deal_id/deadline/status.
    if (!data || !Array.isArray(data.stack) || data.stack.length < 6) {
      return null;
    }

    const deadlineItem = data.stack[4];
    const statusItem = data.stack[5];
    if (!deadlineItem || deadlineItem.type !== 'num' || !statusItem || statusItem.type !== 'num') {
      return null;
    }

    return {
      deadline: parseInt(deadlineItem.value, 16),
      status: parseInt(statusItem.value, 16),
    };
  } catch (error) {
    console.error('Ошибка получения get_escrow_data:', error);
    return null;
  }
}

/**
 * Резолвит ввод из поля "Передать" (кнопка Transfer, ProfileWidget) — юзер
 * может вставить готовый адрес кошелька ИЛИ вписать домен ("7707.ton"), чтобы
 * найти владельца по-человечески. Проверено вживую на реальном домене
 * (7707.ton, 2026-11-21) — toncenter v3 `/dns/records?domain=` отдаёт
 * dns_wallet/nft_item_owner как ГОТОВЫЕ строки адресов, decode ячеек не
 * нужен (в отличие от get_partner_share тем же утром).
 *
 * dns_wallet (явная DNS wallet-запись — "присылайте сюда") в приоритете
 * перед nft_item_owner (текущий владелец домена) — ровно та же логика,
 * что у любого ENS-подобного резолва: явный wallet record переопределяет
 * владельца, если задан.
 *
 * РЕЗОЛВИТ ТОЛЬКО КОРНЕВЫЕ .ton ДОМЕНЫ — toncenter не знает про субдомены
 * платформы (тот же давний лимит, что и у resolveDomainNftAddress в
 * AvatarSecretPage). Для платформенных субдоменов вызывающий код должен
 * отдельно проверить уже загруженный кэш (allProxySubdomains/allSBTSubdomains
 * в ProfileWidget) по полю domain — сетевого похода для этого не нужно.
 */
export async function resolveDomainToWalletAddress(
  domainInput: string,
  isTestnet: boolean
): Promise<string | null> {
  const trimmed = domainInput.trim().toLowerCase();
  if (!trimmed) return null;
  const withTld = trimmed.endsWith('.ton') ? trimmed : `${trimmed}.ton`;

  try {
    const apiUrl = toncenterApiUrl(isTestnet, 'v3/dns/records');
    const response = await fetch(`${apiUrl}?domain=${encodeURIComponent(withTld)}&limit=1&offset=0`);
    if (!response.ok) return null;

    const data = await response.json();
    const record = data?.records?.[0];
    if (!record) return null;

    return record.dns_wallet || record.nft_item_owner || null;
  } catch (error) {
    console.error('Ошибка резолва домена в адрес:', error);
    return null;
  }
}

/**
 * Получает информацию о NFT через toncenter API
 */
export async function getNftInfo(
  nftAddress: string,
  isTestnet: boolean
): Promise<any> {
  try {
    const apiUrl = toncenterApiUrl(isTestnet, 'v3/nft/items');
    
    const rawAddress = convertUserFriendlyToRaw(nftAddress);
    
    const response = await fetch(
      `${apiUrl}?address=${encodeURIComponent(rawAddress)}&include_on_sale=false&limit=1&offset=0`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.nft_items && data.nft_items.length > 0) {
      return data.nft_items[0];
    }
    
    return null;
  } catch (error) {
    console.error('Ошибка загрузки NFT информации:', error);
    return null;
  }
}

/**
 * Проверяет активность SBT зоны
 */
export async function checkSbtZoneActivity(
  zone: any,
  isTestnet: boolean
): Promise<boolean> {
  try {
    if (!zone.address) return false;
    
    // Проверяем DNS запись зоны
    const resolverAddress = await checkDomainDNSRecord(zone.address, isTestnet);
    
    if (resolverAddress && zone.collectionAddress) {
      // Сравниваем resolverAddress с collectionAddress зоны
      return resolverAddress.toLowerCase() === zone.collectionAddress.toLowerCase();
    }
    
    return false;
  } catch (error) {
    console.error('Ошибка проверки активности SBT зоны:', error);
    return false;
  }
}

/**
 * Проверяет активность субдомена в SBT зоне
 */
export async function checkSbtSubdomainActivity(
  subdomain: any,
  isTestnet: boolean
): Promise<boolean> {
  try {
    if (!subdomain.zone) return false;
    
    // Проверяем активность зоны
    return await checkSbtZoneActivity(subdomain.zone, isTestnet);
  } catch (error) {
    console.error('Ошибка проверки активности субдомена:', error);
    return false;
  }
}

/**
 * Генерирует URL изображения для зоны
 */
export function getZoneImageUrl(zone: any): string {
  if (!zone.name) return '/src/pages/ManageDomainPage/img/subdom_logo.png';
  
  const zoneName = zone.name.replace('.ton', '');
  
  // Проверяем тип зоны
  const proxyValue = zone.proxy;
  const isProxy = typeof proxyValue === 'number' 
    ? proxyValue === 1 
    : proxyValue?.toLowerCase() === 'proxy' || proxyValue === '1';
  
  if (isProxy) {
    // Proxy зона
    return `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${zoneName}.png`;
  } else {
    // SBT зона
    return `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${zoneName}.png`;
  }
}

/**
 * Генерирует URL изображения для субдомена
 */
export function getSubdomainImageUrl(subdomain: any, zone?: any): string {
  if (!subdomain.name) return '/src/pages/ManageDomainPage/img/subdom_logo.png';
  
  const parts = subdomain.name.split('.');
  if (parts.length < 3) return '/src/pages/ManageDomainPage/img/subdom_logo.png';
  
  const subdomainName = parts[0];
  const domainName = parts.slice(1).join('.');
  const cleanDomainName = domainName.replace('.ton', '');
  
  // Определяем тип зоны
  const actualZone = zone || subdomain.zone;
  if (!actualZone) return '/src/pages/ManageDomainPage/img/subdom_logo.png';
  
  const proxyValue = actualZone.proxy;
  const isProxy = typeof proxyValue === 'number' 
    ? proxyValue === 1 
    : proxyValue?.toLowerCase() === 'proxy' || proxyValue === '1';
  
  if (isProxy) {
    // Proxy субдомен
    return `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${cleanDomainName}/${subdomainName}.png`;
  } else {
    // SBT субдомен
    return `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${cleanDomainName}/${subdomainName}.png`;
  }
}

/**
 * Проверяет, является ли зона Proxy зоной
 */
export function isProxyZone(zone: any): boolean {
  if (!zone) return false;
  
  const proxyValue = zone.proxy;
  
  // Если это число
  if (typeof proxyValue === 'number') {
    return proxyValue === 1;
  }
  
  // Если это строка
  if (typeof proxyValue === 'string') {
    const lowerValue = proxyValue.toLowerCase();
    return lowerValue === 'proxy' || lowerValue === '1';
  }
  
  return false;
}

/**
 * Проверяет, является ли зона SBT зоной
 */
export function isSbtZone(zone: any): boolean {
  if (!zone) return false;
  
  const proxyValue = zone.proxy;
  
  // Если это число
  if (typeof proxyValue === 'number') {
    return proxyValue === 0;
  }
  
  // Если это строка
  if (typeof proxyValue === 'string') {
    const lowerValue = proxyValue.toLowerCase();
    return lowerValue === 'sbt' || lowerValue === '0';
  }

  return false;
}

/**
 * tonsite://name.ton -> https://name.ton.run (публичный HTTP-шлюз для
 * обычного браузера — он не понимает кастомную схему tonsite:// напрямую).
 * Домен БЕЗ ".ton" на конце перед ".ton.run" — проверено вживую curl'ом:
 * https://foundation.ton.run отвечает 200, https://foundation.ton.ton.run
 * падает с TLS-ошибкой (см. server/services/platformCache/crawler.ts,
 * тот же трансформ там для пинга живости сайтов).
 */
export function tonsiteToGatewayUrl(tonsiteUrl: string): string {
  const name = tonsiteUrl.replace(/^tonsite:\/\//i, '').replace(/\.ton$/i, '');
  return `https://${name}.ton.run`;
}

/**
 * Резолвит адрес кошелька в привязанный к нему .ton домен (официальная TON
 * DNS-коллекция через toncenter, а не наши зоны платформы) — 1:1 портировано
 * из fetchDomain в ActiveAuctions.tsx, вынесено сюда как общий хелпер, чтобы
 * не дублировать в каждом месте, где нужно показать владельца по-человечески
 * (домен вместо голого адреса), а не только в списке аукционов.
 *
 * Возвращает null, если у адреса нет привязанного домена или запрос не
 * удался (rate limit и т.п.) — вызывающий код должен фолбэчиться на
 * отображение самого адреса, а не считать null ошибкой.
 */
export async function resolveAddressToDomain(address: string, isTestnet: boolean): Promise<string | null> {
  if (!address) return null;

  try {
    const url = new URL(toncenterApiUrl(isTestnet, 'v3/dns/records'), window.location.origin);
    url.searchParams.append('wallet', address);
    url.searchParams.append('limit', '100');
    url.searchParams.append('offset', '0');

    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const data = await response.json();

    const domainFromRecords = data.records?.find(
      (record: any) => record.nft_item_owner === address
    )?.domain;

    const domainFromAddressBook = Object.values(
      (data.address_book as Record<string, { user_friendly: string; domain?: string }>) || {}
    ).find((entry: any) => entry.user_friendly === address)?.domain;

    return domainFromRecords || domainFromAddressBook || null;
  } catch {
    return null;
  }
}

export interface AddressLastTransactionInfo {
  timestamp: number; // unix seconds
  hash: string;
}

/**
 * Последняя транзакция по адресу айтема — используется, чтобы показать
 * "когда реально ушёл" (не placeholder Date.now(), а настоящее время
 * транзакции) + ссылку на неё в эксплорере. sort:'desc' — последняя, а не
 * первая (deploy) транзакция, т.к. нас интересует момент перехода к
 * текущему владельцу, а не создание самого NFT-контракта.
 */
export async function getAddressLastTransaction(
  address: string,
  isTestnet: boolean
): Promise<AddressLastTransactionInfo | null> {
  if (!address) return null;

  try {
    const url = new URL(toncenterApiUrl(isTestnet, 'v3/transactions'), window.location.origin);
    url.searchParams.append('account', address);
    url.searchParams.append('limit', '1');
    url.searchParams.append('offset', '0');
    url.searchParams.append('sort', 'desc');

    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const data = await response.json();
    const tx = data.transactions?.[0];
    if (!tx?.now || !tx?.hash) return null;

    return { timestamp: tx.now, hash: tx.hash };
  } catch {
    return null;
  }
}
