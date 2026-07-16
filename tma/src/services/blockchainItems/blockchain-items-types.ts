
/**
 * Blockchain Items - Обновленные TypeScript типы
 * Упрощенные типы с учетом новой логики
 */

// ==================== БАЗОВЫЕ ТИПЫ ====================

export type NetworkType = 'mainnet' | 'testnet';

// ==================== ТИПЫ ДЛЯ API ОТВЕТОВ ====================

// Базовый интерфейс для NFT-итема из TON Center API
export interface TonCenterNFTItem {
  address: string;
  init: boolean;
  index: string;
  collection_address: string;
  owner_address: string | null;
  content: {
    uri: string;
  };
  last_transaction_lt: string;
  code_hash: string;
  data_hash: string;
  collection: TonCenterCollection;
  on_sale: boolean;
}

// Базовый интерфейс для коллекции из TON Center API
export interface TonCenterCollection {
  address: string;
  owner_address: string;
  last_transaction_lt: string;
  next_item_index: string;
  collection_content: {
    uri: string;
  };
  data_hash: string;
  code_hash: string;
}

// ==================== ТИПЫ ДЛЯ МЕТАДАННЫХ ====================

export interface TokenInfo {
  valid: boolean;
  type: 'nft_items' | 'nft_collections';
  name: string;
  description: string;
  image: string;
  nft_index?: string;
  extra?: {
    _image_big: string;
    _image_medium: string;
    _image_small: string;
    uri?: string;
    attributes?: Array<{
      trait_type: string;
      value: string;
    }>;
    buttons?: Array<{
      label: string;
      uri: string;
    }>;
  };
}

export interface MetadataItem {
  is_indexed: boolean;
  token_info: TokenInfo[];
}

// ==================== ОСНОВНЫЕ ТИПЫ ДЛЯ КЛИЕНТА ====================

// Тип для определения типа итема
export type ItemType = 'proxy_subdomain' | 'sbt_subdomain' | 'nft_wrapper';

// Тип для коллекций
export type CollectionType = 'proxy' | 'sbt' | 'nft_wrapper';

// Упрощенный тип для передачи данных из сервиса
export interface SimpleEnrichedItem {
  address: string;
  domain: string;
  zone: string;
  type: ItemType;
  owner_address: string | null;
  collection_address: string;
  on_sale: boolean;
  lastUpdated: string;
  last_transaction_lt: string,
  metadata?: {
    price?: string;
    sale?: {
      price?: {
        value: string;
        token_name: string;
      };
    };
    image?: string;
    token_info?: Array<{
      valid?: boolean;
      type?: string;
      name?: string;
      description?: string;
      image?: string;
      nft_index?: string;
      extra?: {
        _image_big?: string;
        _image_medium?: string;
        _image_small?: string;
        uri?: string;
        [key: string]: any;
      };
      [key: string]: any;
    }>;
    [key: string]: any;
  };
}

// Упрощенный тип для коллекций
export interface SimpleCollection {
  address: string;
  name: string;
  description?: string;
  image?: string;
  total_items?: number;
  type: CollectionType;
  owner_address: string;
}

// Данные для разных страниц приложения
export interface AppData {
  // Коллекции
  allCollections: SimpleCollection[];
  proxyCollections: SimpleCollection[];
  sbtCollections: SimpleCollection[];
  nftWrapperCollections: SimpleCollection[];
  
  // Все итемы
  allItems: SimpleEnrichedItem[];
  proxySubdomains: SimpleEnrichedItem[];
  sbtSubdomains: SimpleEnrichedItem[];
  nftWrappers: SimpleEnrichedItem[];
  
  // Итемы пользователя
  userProxySubdomains: SimpleEnrichedItem[];
  userSBTSubdomains: SimpleEnrichedItem[];
  userNFTWrappers: SimpleEnrichedItem[];
  
  // Метаданные
  lastUpdated: string;
  network: NetworkType;
}

// ==================== УТИЛИТЫ ДЛЯ КОНВЕРТАЦИИ ====================

// Функция для определения типа итема по code_hash
export const getItemType = (codeHash: string, isTestnet: boolean): ItemType => {
  const testnetHashes = {
    PROXY_SUBDOMAIN: import.meta.env.VITE_HASH_PROXY_SUBDOMAIN_TESTNET,
    PROXY_SUBDOMAIN_NEW: import.meta.env.VITE_HASH_PROXY_SUBDOMAIN_NEW_TESTNET,
    SBT_SUBDOMAIN: import.meta.env.VITE_HASH_SBT_SUBDOMAIN_TESTNET, 
    NFT_WRAPPER: import.meta.env.VITE_HASH_NFT_WRAPPER_TESTNET,
  };
  
  const mainnetHashes = {
    PROXY_SUBDOMAIN: import.meta.env.VITE_HASH_PROXY_SUBDOMAIN_MAINNET,
    PROXY_SUBDOMAIN_NEW: import.meta.env.VITE_HASH_PROXY_SUBDOMAIN_NEW_MAINNET,
    SBT_SUBDOMAIN: import.meta.env.VITE_HASH_SBT_SUBDOMAIN_MAINNET, 
    NFT_WRAPPER: import.meta.env.VITE_HASH_NFT_WRAPPER_MAINNET,
  };
  
  const hashes = isTestnet ? testnetHashes : mainnetHashes;
  
 // if (codeHash === hashes.PROXY_SUBDOMAIN) return 'proxy_subdomain';
  if (codeHash === hashes.PROXY_SUBDOMAIN || codeHash === hashes.PROXY_SUBDOMAIN_NEW) return 'proxy_subdomain';
  if (codeHash === hashes.SBT_SUBDOMAIN) return 'sbt_subdomain';
  if (codeHash === hashes.NFT_WRAPPER) return 'nft_wrapper';
  
  return 'proxy_subdomain'; // По умолчанию
};

// Функция для определения типа коллекции по code_hash
export const getCollectionType = (codeHash: string, isTestnet: boolean): CollectionType => {
  const testnetHashes = {
    PROXY_COLLECTION: import.meta.env.VITE_HASH_PROXY_COLLECTION_TESTNET,
    SBT_COLLECTION: import.meta.env.VITE_HASH_SBT_COLLECTION_TESTNET, // Пока такой же
    NFT_WRAPPER_COLLECTION: import.meta.env.VITE_HASH_NFT_WRAPPER_COLLECTION_TESTNET, // Пока такой же
  };
  
  const mainnetHashes = {
    PROXY_COLLECTION: import.meta.env.VITE_HASH_PROXY_COLLECTION_MAINNET,
    SBT_COLLECTION: import.meta.env.VITE_HASH_SBT_COLLECTION_MAINNET,
    NFT_WRAPPER_COLLECTION: import.meta.env.VITE_HASH_NFT_WRAPPER_COLLECTION_MAINNET,
  };
  
  const hashes = isTestnet ? testnetHashes : mainnetHashes;
  
  if (codeHash === hashes.PROXY_COLLECTION) return 'proxy';
  if (codeHash === hashes.SBT_COLLECTION) return 'sbt';
  if (codeHash === hashes.NFT_WRAPPER_COLLECTION) return 'nft_wrapper';
  
  return 'proxy'; // По умолчанию
};

// Функция для извлечения домена и зоны из URI
export const extractDomainAndZone = (uri: string): { domain: string | null; zone: string | null } => {
  if (!uri) return { domain: null, zone: null };
  
  try {
    const url = new URL(uri);
    const pathParts = url.pathname.split('/');
    
    // Ищем индекс 'metadata'
    const metadataIndex = pathParts.indexOf('metadata');
    if (metadataIndex === -1) return { domain: null, zone: null };
    
    // Части после 'metadata'
    const afterMetadata = pathParts.slice(metadataIndex + 1);
    
    if (afterMetadata.length >= 2) {
      const zone = afterMetadata[1];
      const subdomain = afterMetadata.length >= 3 ? afterMetadata[2] : null;
      
      let domain = null;
      if (subdomain) {
        domain = `${subdomain}.${zone}.ton`;
      }
      
      return {
        domain,
        zone: `${zone}.ton`
      };
    }
    
    return { domain: null, zone: null };
  } catch (error) {
    console.error('Error extracting domain and zone from URI:', error);
    return { domain: null, zone: null };
  }
};

// Функция для получения имени из метаданных
export const getNameFromMetadata = (metadata?: MetadataItem): string => {
  if (!metadata || !metadata.token_info || metadata.token_info.length === 0) {
    return 'Без названия';
  }
  
  return metadata.token_info[0].name || 'Без названия';
};

// Функция для получения описания из метаданных
export const getDescriptionFromMetadata = (metadata?: MetadataItem): string => {
  if (!metadata || !metadata.token_info || metadata.token_info.length === 0) {
    return '';
  }
  
  return metadata.token_info[0].description || '';
};

// Функция для получения изображения из метаданных
export const getImageFromMetadata = (metadata?: MetadataItem): string => {
  if (!metadata || !metadata.token_info || metadata.token_info.length === 0) {
    return '';
  }
  
  return metadata.token_info[0].image || '';
};

// ==================== ЭКСПОРТ ====================

// export type {
//   NetworkType,
//   ItemType,
//   CollectionType,
//   SimpleEnrichedItem,
//   SimpleCollection,
//   AppData
// };
