// src/store/nft/constants.ts
// Обновленная версия с поддержкой двух режимов: Other и Service

// Тип для ключей NFT коллекций (режим Other)
export type NFTCollectionKey = 'ton' | 'tme' | 'gram' | 'tonnel' | 'getgems' | 'other';

// Тип для ключей сервисных коллекций (режим Service)
export type ServiceCollectionKey = 'zones' | 'subdomains' | 'any';

// Общий тип для совместимости
export type CollectionKey = NFTCollectionKey | ServiceCollectionKey;

// Интерфейс информации о коллекции
export interface CollectionInfo {
  address: string;
  label: string;
  details?: {
    AmountOfHolders?: number;
    AmountNFTinCollection?: number;
    ValueCap?: number;
    Prices?: number;
    tld?: string;
    domain?: string;
  };
}

/**
 * Получает коллекции для режима Other (NFT из блокчейна)
 */
export const getNFTCollections = (isTestnet: boolean): Record<NFTCollectionKey, CollectionInfo> => {
  // Адреса для testnet (взяты из вашей финальной версии)
  const testnetAddresses = {
    ton: 
    '0:e33ed33a42eb2032059f97d90c706f8400bb256d32139ca707f1564ad699c7dd',
    getgems: '0:665807b02b8322a502cdbb921fa17164f91789bcc85098e3e5184dcccae4d026'
  };

  // Адреса для mainnet (взяты из вашей рабочей версии)
  const mainnetAddresses = {
    ton: '0:b774d95eb20543f186c06b371ab88ad704f7e256130caf96189368a7d0cb6ccf',
    tme: '0:80d78a35f955a14b679faa887ff4cd5bfc0f43b4a4eea2a7e6927f3701b273c2',
    gram: '0:22737ccf71ee3deae9050e16dca36f0556c28a9765945ff889c1a2fcec20714a',
    tonnel: '0:c8580e8afdffc117aaa344b36e873994f49107398672a99e568122d70a0c00ca',
    getgems: '0:e1955aba7249f23e4fd2086654a176516d98b134e0df701302677c037c358b17',
    other: ''
  };

  const addresses = isTestnet ? {
    ...mainnetAddresses,
    ton: testnetAddresses.ton,
    getgems: testnetAddresses.getgems
  } : mainnetAddresses;

  return {
    'ton': {
      address: addresses.ton,
      label: '.*.ton',
      details: {
        AmountOfHolders: 1000,
        AmountNFTinCollection: 5000,
        ValueCap: 10000000,
        Prices: 1000,
        tld: 'ton',
        domain: '.*'
      }
    },
    'tme': {
      address: addresses.tme,
      label: '.t.me',
      details: {
        AmountOfHolders: 800,
        AmountNFTinCollection: 3000,
        ValueCap: 8000000,
        Prices: 800,
        tld: 't.me',
        domain: '.t.me'
      }
    },
    'gram': {
      address: addresses.gram,
      label: '.gram',
      details: {
        AmountOfHolders: 600,
        AmountNFTinCollection: 2000,
        ValueCap: 6000000,
        Prices: 600,
        tld: 'gram',
        domain: '.gram'
      }
    },
    'tonnel': {
      address: addresses.tonnel,
      label: '.tonnel',
      details: {
        AmountOfHolders: 400,
        AmountNFTinCollection: 1500,
        ValueCap: 4000000,
        Prices: 400,
        tld: 'tonnel',
        domain: '.tonnel'
      }
    },
    'getgems': {
      address: addresses.getgems,
      label: '.getgems',
      details: {
        AmountOfHolders: 300,
        AmountNFTinCollection: 1000,
        ValueCap: 3000000,
        Prices: 300,
        tld: 'getgems',
        domain: '.getgems'
      }
    },
    'other': {
      address: addresses.other,
      label: 'Other',
      details: {
        AmountOfHolders: 200,
        AmountNFTinCollection: 500,
        ValueCap: 2000000,
        Prices: 200,
        tld: '',
        domain: ''
      }
    }
  };
};

/**
 * Получает коллекции для режима Service (зоны и субдомены из БД)
 */
export const getServiceCollections = (): Record<ServiceCollectionKey, CollectionInfo> => {
  // Для сервисных коллекций адреса не нужны, так как данные берутся из БД
  return {
    'zones': {
      address: 'db_zones',
      label: 'Zones',
      details: {
        AmountOfHolders: 100,
        AmountNFTinCollection: 50,
        ValueCap: 1000000,
        Prices: 100,
        tld: 'zones',
        domain: 'Зоны из БД'
      }
    },
    'subdomains': {
      address: 'db_subdomains',
      label: 'Subdomains',
      details: {
        AmountOfHolders: 200,
        AmountNFTinCollection: 100,
        ValueCap: 2000000,
        Prices: 50,
        tld: 'subdomains',
        domain: 'Субдомены из БД'
      }
    },
    'any': {
      address: '',
      label: 'Any',
      details: {
        AmountOfHolders: 0,
        AmountNFTinCollection: 0,
        ValueCap: 0,
        Prices: 0,
        tld: '',
        domain: ''
      }
    }
  };
};

/**
 * Получает все коллекции (для обратной совместимости)
 */
export const getCollections = (isTestnet: boolean): Record<CollectionKey, CollectionInfo> => {
  const nftCollections = getNFTCollections(isTestnet);
  const serviceCollections = getServiceCollections();
  
  return {
    ...nftCollections,
    ...serviceCollections
  };
};

/**
 * Получает адрес коллекции по ключу
 */
export const getCollectionAddress = (collectionKey: CollectionKey, isTestnet: boolean): string => {
  const collections = getCollections(isTestnet);
  return collections[collectionKey]?.address || '';
};

/**
 * Получает информацию о коллекции по ключу
 */
export const getCollectionInfo = (collectionKey: CollectionKey, isTestnet: boolean): CollectionInfo | null => {
  const collections = getCollections(isTestnet);
  return collections[collectionKey] || null;
};

/**
 * Проверяет, является ли коллекция NFT коллекцией
 */
export const isNFTCollection = (collectionKey: CollectionKey): boolean => {
  const nftKeys: NFTCollectionKey[] = ['ton', 'tme', 'gram', 'tonnel', 'getgems', 'other'];
  return nftKeys.includes(collectionKey as NFTCollectionKey);
};

/**
 * Проверяет, является ли коллекция сервисной коллекцией
 */
export const isServiceCollection = (collectionKey: CollectionKey): boolean => {
  const serviceKeys: ServiceCollectionKey[] = ['zones', 'subdomains', 'any'];
  return serviceKeys.includes(collectionKey as ServiceCollectionKey);
};

// URL для TON API
export const getTonApiUrl = (isTestnet: boolean): string => {
  return isTestnet ? 'https://testnet.tonapi.io/v2' : 'https://tonapi.io/v2';
};

// URL для TON Center API
export const getTonCenterUrl = (isTestnet: boolean): string => {
  return isTestnet ? 'https://testnet.toncenter.com/api/v2' : 'https://toncenter.com/api/v2';
};

// URL для TON Center NFT items API
export const getTonCenterNftItemsUrl = (isTestnet: boolean): string => {
  return isTestnet 
    ? 'https://testnet.toncenter.com/api/v3/nft/items' 
    : 'https://toncenter.com/api/v3/nft/items';
};

// Экспорт для обратной совместимости
export const COLLECTIONS = getCollections(false); // По умолчанию mainnet