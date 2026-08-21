/**
 * Утилиты конвертации для всех blockchain сущностей
 * Обновленные с учетом новой логики
 */

import { 
  TonCenterNFTItem, 
  TonCenterCollection,
  SimpleEnrichedItem,
  SimpleCollection,
  ItemType,
  CollectionType,
  extractDomainAndZone,
  getItemType,
  getCollectionType
} from './blockchain-items-types';
import { Address } from '@ton/core';

// ==================== БАЗОВЫЕ УТИЛИТЫ ====================

// Конвертация адреса в user-friendly формат
export const convertToUserFriendly = (address: string, isTestnet: boolean): string => {
  if (!address) return '';
  
  try {
    const addr = Address.parse(address);
    return addr.toString({ 
      testOnly: isTestnet, 
      urlSafe: true,
      bounceable: false 
    });
  } catch (error) {
    console.error('Error converting address:', error, 'address:', address);
    return address;
  }
};

// Извлечение имени субдомена из URI
export const extractSubdomainName = (uri: string): string => {
  const { domain } = extractDomainAndZone(uri);
  if (!domain) return 'Без названия';
  
  const parts = domain.split('.');
  return parts.length > 0 ? parts[0] : 'Без названия';
};

// Извлечение имени зоны из URI
export const extractZoneName = (uri: string): string => {
  const { zone } = extractDomainAndZone(uri);
  if (!zone) return 'Без названия зоны';

  return zone;
};

// Сырые имена NFT-коллекций зон приходят с мусорными префиксами/суффиксами
// вида "Proxy downloader ton Domain" вместо "downloader.ton" (метаданные
// коллекции так и были заданы при деплое, не поле для правки) — было
// исправлено локально в ProfileWidget.tsx (collectionToZone), но
// ManageDomainPage строил свой DisplayItem.title из тех же сырых метаданных
// отдельно и той же чистки не делал — юзер увидел разницу между виджетом
// профиля и менеджером на одной и той же зоне.
// change_content на реальной ончейн-деактивации SBT-зоны дописывает
// "[INACTIVE]" прямо в название коллекции (не отдельное поле статуса) —
// проверено вживую 2026-08-11. Суффиксные regex'ы в cleanZoneDisplayName
// ниже все заточены под $ (конец строки) и переставали срабатывать
// целиком, стоило добавиться этому маркеру после "Domain" — юзер видел
// сырое ".4044 dns domains [inactive].ton" вместо "4044.ton". Снимаем
// маркер ДО чистки суффиксов, а не после.
const INACTIVE_MARKER_RE = /\s*\[\s*inactive\s*\]\s*/i;

export const isZoneMarkedInactive = (rawName: string): boolean =>
  INACTIVE_MARKER_RE.test(rawName || '');

// Персистентный (localStorage, без TTL) кэш "адрес коллекции → настоящее
// имя зоны" — отдельно от обычного 20-минутного blockchain-снимка
// (blockchain-items-slice.ts:persistAppData). Имя известно СРАЗУ в момент
// деплоя зоны (юзер его только что ввёл и он подтверждён транзакцией) —
// задолго до того, как тонцентр проиндексирует content коллекции. Пишем
// его сюда сразу же (CreateCollectionPage), чтобы collectionToZone мог
// показать настоящее имя без видимого "шва"-плейсхолдера, даже если
// тонцентр ещё долго отдаёт пустые метаданные для этого адреса.
const ZONE_NAME_CACHE_KEY = 'subdom:knownZoneNames';

export const rememberZoneName = (collectionAddress: string, name: string): void => {
  if (!collectionAddress || !name) return;
  try {
    const raw = localStorage.getItem(ZONE_NAME_CACHE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    if (map[collectionAddress] === name) return;
    map[collectionAddress] = name;
    localStorage.setItem(ZONE_NAME_CACHE_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('⚠️ Не удалось сохранить имя зоны в localStorage:', e);
  }
};

export const getRememberedZoneName = (collectionAddress: string): string | null => {
  try {
    const raw = localStorage.getItem(ZONE_NAME_CACHE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map[collectionAddress] || null;
  } catch (e) {
    console.warn('⚠️ Не удалось прочитать кэш имён зон из localStorage:', e);
    return null;
  }
};

export const cleanZoneDisplayName = (rawName: string): string => {
  return rawName
    // trimEnd отдельным шагом — replace оставлял висящий пробел на месте
    // маркера, из-за которого следующий $-заточенный regex (dns domains$)
    // переставал матчиться, и суффикс "DNS Domains" оставался в имени.
    .replace(INACTIVE_MARKER_RE, ' ').trimEnd()
    .replace(/^proxy\s+/i, '') // "Proxy downloader ton Domain" -> "downloader ton Domain"
    .replace(/\s+dns\s+domains?$/i, '') // "... DNS Domains" / "... DNS Domain"
    .replace(/\s+proxy\s+domains?$/i, '') // "... Proxy Domains" / "... Proxy Domain" (суффиксом)
    .replace(/\s+domains?$/i, '') // остаточное "... Domain"/"... Domains" (единственное число — старый баг)
    .replace(/\s+ton$/i, '.ton') // "downloader ton" -> "downloader.ton" (точка потерялась в метаданных)
    .trim();
};


/**
 * Конвертация в SimpleEnrichedItem
 */
export const convertToSimpleEnrichedItem = (
  item: TonCenterNFTItem,
  metadata?: any,
  isTestnet: boolean = false
): SimpleEnrichedItem => {
  console.log('🔄 Конвертация итема в SimpleEnrichedItem:', {
    address: item.address,
    uri: item.content?.uri,
    metadata: metadata?.[item.address]
  });
  
  const { domain, zone } = extractDomainAndZone(item.content?.uri || '');
  const itemType = getItemType(item.code_hash, isTestnet);
  
  const itemMetadata = metadata?.[item.address];
  
  const result = {
    address: item.address,
    owner_address: item.owner_address,
    collection_address: item.collection_address,
    domain: domain || '',
    zone: zone || '',
    type: itemType,
    metadata: itemMetadata,
    lastUpdated: new Date().toISOString(),
    on_sale: item.on_sale,
    last_transaction_lt: item.last_transaction_lt
  };
  
  console.log('✅ Результат конвертации SimpleEnrichedItem:', {
    address: result.address,
    domain: result.domain,
    type: result.type,
    hasMetadata: !!result.metadata,
    metadataKeys: result.metadata ? Object.keys(result.metadata) : []
  });

  if (itemType === 'nft_wrapper' && !domain) {
  console.log('🔍 Проблемный итем — полный content:', JSON.stringify(item.content));
  console.log('🔍 Проблемный итем — URI:', item.content?.uri);
}
  
  return result;
};


/**
 * Конвертация в SimpleCollection
 */
// export const convertToSimpleCollection = (
//   collection: TonCenterCollection,
//   metadata?: any,
//   isTestnet: boolean = false
// ): SimpleCollection => {
//   const collectionMetadata = metadata?.[collection.address];
//   const tokenInfo = collectionMetadata?.token_info?.[0] || {};
//   const collectionType = getCollectionType(collection.code_hash, isTestnet);
  
//   // Извлекаем имя зоны из URI коллекции
//   const zoneName = extractZoneName(collection.collection_content?.uri || '');
  
//   return {
//     address: collection.address,
//     name: tokenInfo.name || zoneName,
//     description: tokenInfo.description,
//     image: tokenInfo.image,
//     type: collectionType,
//     owner_address: collection.owner_address
//   };
// };

export const convertToSimpleCollection = (
  collection: TonCenterCollection,
  metadata?: any,
  isTestnet: boolean = false
): SimpleCollection => {
  const collectionMetadata = metadata?.[collection.address];
  const tokenInfo = collectionMetadata?.token_info?.[0] || {};
  const collectionType = getCollectionType(collection.code_hash, isTestnet);

  // ИСПРАВЛЕНИЕ: извлекаем domain (полное имя), а не zone (только TLD)
  const { domain: collectionDomain } = extractDomainAndZone(collection.collection_content?.uri || '');

  return {
    address: collection.address,
    name: tokenInfo.name || collectionDomain || 'Без названия',
    domain: collectionDomain || undefined,
    description: tokenInfo.description,
    image: tokenInfo.image,
    type: collectionType,
    owner_address: collection.owner_address
  };
};

// ==================== ПАКЕТНАЯ КОНВЕРТАЦИЯ ====================

/**
 * Конвертация массива в SimpleEnrichedItem
 */
export const convertToSimpleEnrichedItems = (
  items: TonCenterNFTItem[],
  metadata?: any,
  isTestnet: boolean = false
): SimpleEnrichedItem[] => {
  
  return items.map(item => 
    convertToSimpleEnrichedItem(item, metadata, isTestnet)
  );
};

/**
 * Конвертация массива в SimpleCollection
 */
export const convertToSimpleCollections = (
  collections: TonCenterCollection[],
  metadata?: any,
  isTestnet: boolean = false
): SimpleCollection[] => {
  return collections.map(collection => 
    convertToSimpleCollection(collection, metadata, isTestnet)
  );
};

// ==================== ФИЛЬТРАЦИЯ ====================

/**
 * Фильтрация коллекций по типу
 */
export const filterCollectionsByType = (
  collections: SimpleCollection[],
  type: CollectionType
): SimpleCollection[] => {
  return collections.filter(collection => collection.type === type);
};

/**
 * Фильтрация итемов по типу
 */
export const filterItemsByType = (
  items: SimpleEnrichedItem[],
  type: ItemType
): SimpleEnrichedItem[] => {
  return items.filter(item => item.type === type);
};

/**
 * Фильтрация итемов по владельцу
 */
export const filterItemsByOwner = (
  items: SimpleEnrichedItem[],
  ownerAddress: string
): SimpleEnrichedItem[] => {
  return items.filter(item => item.owner_address === ownerAddress);
};

// ==================== УТИЛИТЫ ДЛЯ ПОЛУЧЕНИЯ ДАННЫХ ====================

/**
 * Получение уникальных зон из списка итемов
 */
export const getUniqueZones = (items: SimpleEnrichedItem[]): string[] => {
  const zones = items
    .map(item => item.zone)
    .filter(zone => zone && zone !== '');
  
  return Array.from(new Set(zones));
};

/**
 * Детект дублей зон (пересозданная зона с тем же именем оставляет старую NFT-обёртку
 * висеть в кошельке владельца). Группируем по имени (domain), в каждой группе с >1
 * элементом самая свежая по last_transaction_lt (ончейн logical time, а не backend-статус)
 * считается активной, остальные — адреса возвращаются как inactive.
 */
export const getInactiveZoneAddresses = (zones: SimpleEnrichedItem[]): Set<string> => {
  const byName = new Map<string, SimpleEnrichedItem[]>();

  for (const zone of zones) {
    const name = (zone.domain || '').trim().toLowerCase();
    if (!name) continue;
    const group = byName.get(name);
    if (group) group.push(zone);
    else byName.set(name, [zone]);
  }

  const inactive = new Set<string>();

  for (const group of byName.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => {
      const aLt = BigInt(a.last_transaction_lt || '0');
      const bLt = BigInt(b.last_transaction_lt || '0');
      return aLt > bLt ? -1 : aLt < bLt ? 1 : 0;
    });
    for (const stale of sorted.slice(1)) {
      inactive.add(stale.address);
    }
  }

  return inactive;
};

/**
 * Получение итемов по коллекции
 */
export const getItemsByCollection = (
  items: SimpleEnrichedItem[],
  collectionAddress: string
): SimpleEnrichedItem[] => {
  return items.filter(item => item.collection_address === collectionAddress);
};

/**
 * Получение коллекции по адресу
 */
export const getCollectionByAddress = (
  collections: SimpleCollection[],
  address: string
): SimpleCollection | undefined => {
  return collections.find(collection => collection.address === address);
};

/**
 * Получение статистики по итемам
 */
export const getItemsStats = (items: SimpleEnrichedItem[]) => {
  const total = items.length;
  const onSale = items.filter(item => item.on_sale).length;
  const uniqueZones = getUniqueZones(items).length;
  const uniqueCollections = Array.from(new Set(items.map(item => item.collection_address))).length;
  
  return {
    total,
    onSale,
    uniqueZones,
    uniqueCollections,
    salePercentage: total > 0 ? (onSale / total * 100).toFixed(1) : '0.0'
  };
};


