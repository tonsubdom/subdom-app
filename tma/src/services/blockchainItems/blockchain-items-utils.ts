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


