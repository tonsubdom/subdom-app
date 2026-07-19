/**
 * Universal Blockchain Service - Исправленная версия
 * Правильная логика загрузки с учетом исходных данных
 */

import { 
  TonCenterAPI, 
  SubdomainClassifier, 
  CacheManager,
  NETWORK_CONFIGS 
} from './toncenter-api-config';
import {
  TonCenterNFTItem,
  TonCenterCollection,
  SimpleEnrichedItem,
  SimpleCollection,
  AppData,
  NetworkType
} from './blockchain-items-types';
import {
  convertToSimpleEnrichedItems,
  convertToSimpleCollections,
  filterCollectionsByType
} from './blockchain-items-utils';
import { convertUserFriendlyToRaw } from '@/utils/tonUtils';

// ==================== КОНФИГУРАЦИЯ ====================

interface ServiceConfig {
  // Лимиты запросов
  collectionsBatchSize: number;
  itemsBatchSize: number;
  
  // Задержки
  delayBetweenBatches: number; // мс
  delayBetweenCollections: number; // мс
  
  // Кэширование
  cacheTTL: number; // мс
  
  // Параллельные запросы
  maxConcurrentRequests: number;
  
  // Включение/выключение типов данных
  loadProxyCollections: boolean;
  loadSBTCollections: boolean;
  loadNFTWrapperCollections: boolean;
  loadProxySubdomains: boolean;
  loadSBTSubdomains: boolean;
  loadNFTWrappers: boolean;
}

const DEFAULT_CONFIG: ServiceConfig = {
  // Оптимальные настройки
  collectionsBatchSize: 50,
  itemsBatchSize: 100,
  
  // Задержки для соблюдения rate limit
  delayBetweenBatches: 50,
  delayBetweenCollections: 100,
  
  // Кэширование
  cacheTTL: 5 * 60 * 1000, // 5 минут
  
  // Параллельные запросы
  maxConcurrentRequests: 5,
  
  // По умолчанию загружаем все
  loadProxyCollections: true,
  loadSBTCollections: true,
  loadNFTWrapperCollections: true,
  loadProxySubdomains: true,
  loadSBTSubdomains: true,
  loadNFTWrappers: true
};

// ==================== ОСНОВНОЙ СЕРВИС ====================

export class UniversalBlockchainService {
  private api: TonCenterAPI;
  private classifier: SubdomainClassifier;
  private cache: CacheManager;
  private platformOwner: string;
  private nftWrapperCollection: string;
  private config: ServiceConfig;

  constructor(
    private isTestnet: boolean = true,
    apiKey?: string,
    config: Partial<ServiceConfig> = {}
  ) {
    this.api = new TonCenterAPI(isTestnet, apiKey);
    this.classifier = new SubdomainClassifier(isTestnet);
    this.cache = new CacheManager(config.cacheTTL || DEFAULT_CONFIG.cacheTTL);
    
    const networkConfig = NETWORK_CONFIGS[isTestnet ? 'testnet' : 'mainnet'];
    this.platformOwner = networkConfig.DEFAULT_ADDRESSES.PLATFORM_OWNER;
    this.nftWrapperCollection = networkConfig.DEFAULT_ADDRESSES.NFT_WRAPPER_COLLECTION;
    
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==================== ОСНОВНЫЕ МЕТОДЫ ====================

  /**
   * Получение всех данных приложения
   */
  

  async getAllAppData(userAddress?: string, forceRefresh = false): Promise<AppData> {
  const cacheKey = `app_data_${this.isTestnet ? 'testnet' : 'mainnet'}_${userAddress || 'no_user'}`;
  
  if (!forceRefresh) {
    const cached = this.cache.get<AppData>(cacheKey);
    if (cached) {
      console.log('📦 Используем кэшированные данные приложения');
      return cached;
    }
  }

  console.log('🔄 Загружаем все данные приложения...');
  
  try {
    // Используем существующие методы сервиса
    const collectionsData = await this.getCollectionsData(forceRefresh);
    const itemsData = await this.getItemsData(userAddress, forceRefresh);
    
    // Формируем результат
    const result: AppData = {
      // Коллекции
      allCollections: collectionsData.allCollections,
      proxyCollections: collectionsData.proxyCollections,
      sbtCollections: collectionsData.sbtCollections,
      nftWrapperCollections: collectionsData.nftWrapperCollections,
      
      // Все итемы
      allItems: itemsData.allItems,
      proxySubdomains: itemsData.proxySubdomains,
      sbtSubdomains: itemsData.sbtSubdomains,
      nftWrappers: itemsData.nftWrappers,
      
      // Итемы пользователя
      userProxySubdomains: itemsData.userProxySubdomains,
      userSBTSubdomains: itemsData.userSBTSubdomains,
      userNFTWrappers: itemsData.userNFTWrappers,
      
      // Метаданные
      lastUpdated: new Date().toISOString(),
      network: this.isTestnet ? 'testnet' : 'mainnet'
    };
    
    this.cache.set(cacheKey, result);
    console.log('🎉 Все данные приложения загружены');
    
    return result;
    
  } catch (error) {
    console.error('❌ Ошибка загрузки данных приложения:', error);
    throw error;
  }
}


  /**
   * Получение только коллекций
   */

//   async getCollectionsData(forceRefresh = false): Promise<{
//   allCollections: SimpleCollection[];
//   proxyCollections: SimpleCollection[];
//   sbtCollections: SimpleCollection[];
//   nftWrapperCollections: SimpleCollection[];
// }> {
//   const cacheKey = `collections_data_${this.isTestnet ? 'testnet' : 'mainnet'}`;
  
//   if (!forceRefresh) {
//     const cached = this.cache.get<{
//       allCollections: SimpleCollection[];
//       proxyCollections: SimpleCollection[];
//       sbtCollections: SimpleCollection[];
//       nftWrapperCollections: SimpleCollection[];
//     }>(cacheKey);
//     if (cached) return cached;
//   }

//   console.log('🔄 Загружаем данные коллекций...');
  
//   try {
//     // Коллекции от владельца платформы
//     const allCollections = await this.getAllCollectionsFromPlatformOwner();
    
//     // Метаданные
//     const metadata = await this.getMetadataForAll(allCollections);
    
//     // Конвертация
//     const simpleAllCollections = convertToSimpleCollections(allCollections, metadata, this.isTestnet);
//     const simpleProxyCollections = filterCollectionsByType(simpleAllCollections, 'proxy');
//     const simpleSBTCollections = filterCollectionsByType(simpleAllCollections, 'sbt');
    
//     // Создаем фиктивную NFT wrapper коллекцию
//     const simpleNFTWrapperCollections: SimpleCollection[] = [];
//     // Можно добавить логику для создания фиктивной коллекции если нужно
    
//     const result = {
//       allCollections: [...simpleAllCollections, ...simpleNFTWrapperCollections],
//       proxyCollections: simpleProxyCollections,
//       sbtCollections: simpleSBTCollections,
//       nftWrapperCollections: simpleNFTWrapperCollections
//     };
    
//     this.cache.set(cacheKey, result);
//     console.log(`✅ Данные коллекций загружены: ${result.allCollections.length} всего`);
    
//     return result;
    
//   } catch (error) {
//     console.error('❌ Ошибка загрузки данных коллекций:', error);
//     throw error;
//   }
// }

async getCollectionsData(forceRefresh = false): Promise<{
    allCollections: SimpleCollection[];
    proxyCollections: SimpleCollection[];
    sbtCollections: SimpleCollection[];
    nftWrapperCollections: SimpleCollection[];
  }> {
    const cacheKey = `collections_data_${this.isTestnet ? 'testnet' : 'mainnet'}`;
    
    if (!forceRefresh) {
      const cached = this.cache.get<{
        allCollections: SimpleCollection[];
        proxyCollections: SimpleCollection[];
        sbtCollections: SimpleCollection[];
        nftWrapperCollections: SimpleCollection[];
      }>(cacheKey);
      if (cached) return cached;
    }

    console.log('🔄 Загружаем данные коллекций...');
    
    try {
      // 1️⃣ Коллекции от владельца платформы
      // const allCollections = await this.getAllCollectionsFromPlatformOwner();
      
      // // 2️⃣ Метаданные
      // const metadata = await this.getMetadataForAll(allCollections);

      const { collections: allCollections, metadata } = await this.getAllCollectionsFromPlatformOwner();
      
      // 3️⃣ Конвертация
      const simpleAllCollections = convertToSimpleCollections(allCollections, metadata, this.isTestnet);
      
      // 4️⃣ Обогащаем — определяем реальных создателей коллекций
      console.log(`🔍 Определяем создателей для ${simpleAllCollections.length} коллекций...`);
      const enrichedCollections: SimpleCollection[] = [];

// Ограничиваем параллельные запросы до 5 одновременных
const concurrency = 5;

for (let i = 0; i < simpleAllCollections.length; i += concurrency) {
  const batch = simpleAllCollections.slice(i, i + concurrency);

  const results = await Promise.all(
    batch.map(async (col) => {
      try {
        // Только 2 запроса на коллекцию (убираем getCollectionByAddress,
        // метаданные будем грузить отдельно — см. ниже)
        const [creator, txTime] = await Promise.all([
          this.getCollectionCreator(col.address),
          this.api.getCollectionFirstTxTime(col.address),
        ]);

        console.log(`⏱️ ${col.address.slice(0,10)}: creator=${!!creator}, txTime=${txTime}`);

        return {
        ...col,
        creator_address: creator ?? undefined,
        lastUpdated: txTime
          ? new Date(txTime * 1000).toISOString()
          : col.lastUpdated,
        created_at: txTime
          ? new Date(txTime * 1000).toISOString()
          : undefined,
      } as SimpleCollection;
      } catch {
        return col;
      }
    })
  );

  enrichedCollections.push(...results);

  // Задержка между пачками
  if (i + concurrency < simpleAllCollections.length) {
    await this.delay(500); // 500 мс вместо 200
  }
}
      
      console.log(`✅ Коллекций с известным создателем: ${enrichedCollections.filter(c => c.creator_address).length}/${enrichedCollections.length}`);

      // 5️⃣ Подсчитываем реальное количество итемов в каждой коллекции
console.log('📊 Подсчитываем количество итемов в коллекциях...');

const { collections: allCollectionsForCount } = await this.getAllCollectionsFromPlatformOwner();
const proxyCollectionsForCount = allCollectionsForCount.filter(c => this.classifier.isProxyCollection(c));
const sbtCollectionsForCount = allCollectionsForCount.filter(c => this.classifier.isSBTCollection(c));

const itemCountByCollection = new Map<string, number>();

// Загружаем итемы из proxy и SBT коллекций
const collectionsToCount = [...proxyCollectionsForCount, ...sbtCollectionsForCount];

if (collectionsToCount.length > 0) {
  const chunks = this.chunkArray(collectionsToCount, this.config.maxConcurrentRequests);

  for (const chunk of chunks) {
    const chunkPromises = chunk.map(async (collection) => {
      try {
        const items = await this.getItemsFromCollection(collection.address);
        itemCountByCollection.set(collection.address, items.length);
      } catch {
        itemCountByCollection.set(collection.address, 0);
      }
    });
    await Promise.all(chunkPromises);
  }

  // Проставляем item_count для proxy и SBT коллекций
  for (const col of enrichedCollections) {
    if (col.type === 'proxy' || col.type === 'sbt') {
      const count = itemCountByCollection.get(col.address) || 0;
      col.item_count = count;
      col.total_items = count;
    }
  }

  console.log(`✅ Количество итемов подсчитано для ${itemCountByCollection.size} коллекций`);
}
      
      // 6 Фильтрация по типам
      const simpleProxyCollections = filterCollectionsByType(enrichedCollections, 'proxy');
      const simpleSBTCollections = filterCollectionsByType(enrichedCollections, 'sbt');
      const simpleNFTWrapperCollections: SimpleCollection[] = [];
      
      const result = {
        allCollections: [...enrichedCollections, ...simpleNFTWrapperCollections],
        proxyCollections: simpleProxyCollections,
        sbtCollections: simpleSBTCollections,
        nftWrapperCollections: simpleNFTWrapperCollections
      };
      
      this.cache.set(cacheKey, result);
      console.log(`✅ Данные коллекций загружены: ${result.allCollections.length} всего`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Ошибка загрузки данных коллекций:', error);
      throw error;
    }
  }


  /**
   * Получение только итемов
   */
  
  async getItemsData(userAddress?: string, forceRefresh = false): Promise<{
  allItems: SimpleEnrichedItem[];
  proxySubdomains: SimpleEnrichedItem[];
  sbtSubdomains: SimpleEnrichedItem[];
  nftWrappers: SimpleEnrichedItem[];
  userProxySubdomains: SimpleEnrichedItem[];
  userSBTSubdomains: SimpleEnrichedItem[];
  userNFTWrappers: SimpleEnrichedItem[];
}> {
  const cacheKey = `items_data_${this.isTestnet ? 'testnet' : 'mainnet'}_${userAddress || 'no_user'}`;
  
  if (!forceRefresh) {
    const cached = this.cache.get<{
      allItems: SimpleEnrichedItem[];
      proxySubdomains: SimpleEnrichedItem[];
      sbtSubdomains: SimpleEnrichedItem[];
      nftWrappers: SimpleEnrichedItem[];
      userProxySubdomains: SimpleEnrichedItem[];
      userSBTSubdomains: SimpleEnrichedItem[];
      userNFTWrappers: SimpleEnrichedItem[];
    }>(cacheKey);
    if (cached) return cached;
  }

  console.log('🔄 Загружаем данные итемов...');
  
  try {
    // Используем существующие методы сервиса
    const proxySubdomains = await this.getAllProxySubdomains(forceRefresh);
    const nftWrappers = await this.getAllNFTWrappers(forceRefresh);
    
    let sbtSubdomains: SimpleEnrichedItem[] = [];
    if (userAddress) {
      sbtSubdomains = await this.getUserSBTSubdomains(userAddress, forceRefresh);
    }
    
    // Объединяем все итемы
    const allItems = [...proxySubdomains, ...sbtSubdomains, ...nftWrappers];
    
    // Фильтруем по пользователю
    let userProxySubdomains: SimpleEnrichedItem[] = [];
    let userSBTSubdomains: SimpleEnrichedItem[] = [];
    let userNFTWrappers: SimpleEnrichedItem[] = [];
    
//     if (userAddress) {
//       // userProxySubdomains = proxySubdomains.filter(item => item.owner_address === userAddress);
//       userProxySubdomains = proxySubdomains.filter(
//   item => item.owner_address?.toLowerCase() === userAddress?.toLowerCase()
// );
//       userSBTSubdomains = sbtSubdomains; // Уже загружены только пользовательские
//       userNFTWrappers = nftWrappers.filter(item => item.owner_address === userAddress);
//     }
const rawUserAddress = userAddress
    ? convertUserFriendlyToRaw(userAddress).toLowerCase()
    : undefined;

  if (rawUserAddress) {
    userProxySubdomains = proxySubdomains.filter(
      item => (item.owner_address || '').toLowerCase() === rawUserAddress
    );
    userSBTSubdomains = sbtSubdomains.filter(
      item => (item.owner_address || '').toLowerCase() === rawUserAddress
    );
    userNFTWrappers = nftWrappers.filter(
      item => (item.owner_address || '').toLowerCase() === rawUserAddress
    );
  }
    
    const result = {
      allItems,
      proxySubdomains,
      sbtSubdomains,
      nftWrappers,
      userProxySubdomains,
      userSBTSubdomains,
      userNFTWrappers
    };
    
    this.cache.set(cacheKey, result);
    console.log(`✅ Данные итемов загружены: ${allItems.length} всего`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Ошибка загрузки данных итемов:', error);
    throw error;
  }
}


  // ==================== СПЕЦИАЛИЗИРОВАННЫЕ МЕТОДЫ ====================

  /**
   * Получение всех proxy субдоменов
   */
  async getAllProxySubdomains(forceRefresh = false): Promise<SimpleEnrichedItem[]> {
    const cacheKey = `all_proxy_subdomains_${this.isTestnet ? 'testnet' : 'mainnet'}`;
    
    if (!forceRefresh) {
      const cached = this.cache.get<SimpleEnrichedItem[]>(cacheKey);
      if (cached) return cached;
    }

    console.log('🔄 Загрузка всех proxy субдоменов...');
    
    try {
      const { collections } = await this.getAllCollectionsFromPlatformOwner();
      const proxyCollections = collections.filter(c => this.classifier.isProxyCollection(c));
      
      if (proxyCollections.length === 0) {
        console.log('⚠️ Proxy коллекции не найдены');
        return [];
      }
      
      const items = await this.getAllItemsFromCollections(proxyCollections);
      const metadata = await this.getMetadataForAll(items);
      const result = convertToSimpleEnrichedItems(items, metadata, this.isTestnet);
      
      this.cache.set(cacheKey, result);
      console.log(`✅ Загружено ${result.length} proxy субдоменов`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Ошибка загрузки proxy субдоменов:', error);
      throw error;
    }
  }

  

  /**
   * Получение proxy субдоменов пользователя
   */
  async getUserProxySubdomains(userAddress: string, forceRefresh = false): Promise<SimpleEnrichedItem[]> {
    const cacheKey = `user_proxy_subdomains_${userAddress}_${this.isTestnet ? 'testnet' : 'mainnet'}`;
    
    if (!forceRefresh) {
      const cached = this.cache.get<SimpleEnrichedItem[]>(cacheKey);
      if (cached) return cached;
    }

    console.log(`🔄 Загрузка proxy субдоменов пользователя ${userAddress}...`);
    
    try {
      const { collections } = await this.getAllCollectionsFromPlatformOwner();
      const proxyCollections = collections.filter(c => this.classifier.isProxyCollection(c));
      
      if (proxyCollections.length === 0) {
        console.log('⚠️ Proxy коллекции не найдены');
        return [];
      }
      
      const items = await this.getUserItemsFromCollections(proxyCollections, userAddress);
      const metadata = await this.getMetadataForAll(items);
      const result = convertToSimpleEnrichedItems(items, metadata, this.isTestnet);
      
      this.cache.set(cacheKey, result);
      console.log(`✅ Загружено ${result.length} proxy субдоменов пользователя`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Ошибка загрузки proxy субдоменов пользователя:', error);
      throw error;
    }
  }

  /**
   * Получение SBT субдоменов пользователя
   */
  async getUserSBTSubdomains(userAddress: string, forceRefresh = false): Promise<SimpleEnrichedItem[]> {
    const cacheKey = `user_sbt_subdomains_${userAddress}_${this.isTestnet ? 'testnet' : 'mainnet'}`;
    
    if (!forceRefresh) {
      const cached = this.cache.get<SimpleEnrichedItem[]>(cacheKey);
      if (cached) return cached;
    }

    console.log(`🔄 Загрузка SBT субдоменов пользователя ${userAddress}...`);
    
    try {
      const { collections } = await this.getAllCollectionsFromPlatformOwner();
      const sbtCollections = collections.filter(c => this.classifier.isSBTCollection(c));
      
      if (sbtCollections.length === 0) {
        console.log('⚠️ SBT коллекции не найдены');
        return [];
      }
      
      const items = await this.getUserItemsFromCollections(sbtCollections, userAddress);
      const metadata = await this.getMetadataForAll(items);
      const result = convertToSimpleEnrichedItems(items, metadata, this.isTestnet);
      
      this.cache.set(cacheKey, result);
      console.log(`✅ Загружено ${result.length} SBT субдоменов пользователя`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Ошибка загрузки SBT субдоменов пользователя:', error);
      throw error;
    }
  }

  /**
   * Получение всех сбт коллекций юзера
   */

    /**
   * Получение SBT коллекций пользователя
   */
  async getUserSBTCollections(userAddress: string, forceRefresh = false): Promise<SimpleCollection[]> {
    const cacheKey = `user_sbt_collections_${userAddress}_${this.isTestnet ? 'testnet' : 'mainnet'}`;
    
    if (!forceRefresh) {
      const cached = this.cache.get<SimpleCollection[]>(cacheKey);
      if (cached) return cached;
    }

    console.log(`🔄 Загрузка SBT коллекций пользователя ${userAddress}...`);
    
    try {
      const { collections } = await this.getAllCollectionsFromPlatformOwner();
      const sbtCollections = collections.filter(c => this.classifier.isSBTCollection(c));
      
      if (sbtCollections.length === 0) {
        console.log('⚠️ SBT коллекции не найдены');
        return [];
      }
      
      // Загружаем метаданные и конвертируем
      const metadata = await this.getMetadataForAll(sbtCollections);
      const result = convertToSimpleCollections(sbtCollections, metadata, this.isTestnet)
        .filter(c => c.owner_address === userAddress);
      
      this.cache.set(cacheKey, result);
      console.log(`✅ Загружено ${result.length} SBT коллекций пользователя`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Ошибка загрузки SBT коллекций пользователя:', error);
      throw error;
    }
  }


  /**
   * Получение всех NFT оберток_С ОДНИМ КОД ХЕШЕМ СТАРЫМ
   */
  
// async getAllNFTWrappers(forceRefresh = false): Promise<SimpleEnrichedItem[]> {
//   const cacheKey = `all_nft_wrappers_${this.isTestnet ? 'testnet' : 'mainnet'}`;
  
//   if (!forceRefresh) {
//     const cached = this.cache.get<SimpleEnrichedItem[]>(cacheKey);
//     if (cached) {
//       console.log('📦 NFT обертки из кэша:', cached.length);
//       console.log('📋 Пример NFT обертки из кэша:', cached[0]);
//       return cached;
//     }
//   }

//   console.log('🔄 Загрузка всех NFT оберток...');
//   console.log('📍 Адрес коллекции из конфига:', this.nftWrapperCollection);
  
//   try {
//     // 1️⃣ Прямой запрос итемов из коллекции
//     console.log('1️⃣ Прямой запрос итемов из коллекции...');
//     const response = await this.api.getItemsByCollection(this.nftWrapperCollection);

    
//     const items = response.nft_items || [];
//     console.log(`📊 Найдено ${items.length} итемов в коллекции`);
//     console.log('📋 Пример итема из коллекции:', items[0]);
    
//     // 2️⃣ Фильтрация NFT wrapper итемов (по code_hash)
//     console.log('2️⃣ Фильтрация NFT wrapper итемов...');
//     const networkConfig = NETWORK_CONFIGS[this.isTestnet ? 'testnet' : 'mainnet'];
//     const nftWrapperHash = networkConfig.CODE_HASHES.NFT_WRAPPER;
//     console.log('🔑 NFT Wrapper hash:', nftWrapperHash);
    
//     const nftWrapperItems = items.filter(item => 
//       item.code_hash === nftWrapperHash
//     );
//     console.log(`📊 После фильтрации: ${nftWrapperItems.length} NFT wrapper итемов`);
//     console.log('📋 Пример NFT wrapper итема:', nftWrapperItems[0]);

    
    
//     // 3️⃣ Загрузка метаданных
//     console.log('3️⃣ Загрузка метаданных...');
//     // const metadata = await this.getMetadataForAll(nftWrapperItems);
//     // 3️⃣ Используем метаданные из response
// console.log('3️⃣ Используем метаданные из response...');
// const metadata = response.metadata || {};
//     console.log(`📊 Загружено ${Object.keys(metadata).length} метаданных`);
//     console.log('📋 Пример метаданных:', metadata[nftWrapperItems[0]?.address]);
    
//     // 4️⃣ Конвертация через существующую утилиту
//     console.log('4️⃣ Конвертация в SimpleEnrichedItems...');
//     const result = convertToSimpleEnrichedItems(nftWrapperItems, metadata, this.isTestnet);
//     console.log(`📊 Результат конвертации: ${result.length} итемов`);
//     console.log('📋 Пример конвертированного итема:', result[0]);
    
//     console.log('5️⃣ Сохранение в кэш...');
//     this.cache.set(cacheKey, result);
//     console.log(`✅ Загружено ${result.length} NFT оберток`);

    
    
//     return result;
    
//   } catch (error) {
//     console.error('❌ Ошибка загрузки NFT оберток:', error);
//     console.error('🔧 Детали ошибки:', {
//       message: error instanceof Error ? error.message : String(error),
//       stack: error instanceof Error ? error.stack : undefined,
//       collectionAddress: this.nftWrapperCollection
//     });
//     throw error;
//   }
// }

// async getAllNFTWrappers(forceRefresh = false): Promise<SimpleEnrichedItem[]> {
//   const cacheKey = `all_nft_wrappers_${this.isTestnet ? 'testnet' : 'mainnet'}`;
  
//   if (!forceRefresh) {
//     const cached = this.cache.get<SimpleEnrichedItem[]>(cacheKey);
//     if (cached) {
//       console.log('📦 NFT обертки из кэша:', cached.length);
//       console.log('📋 Пример NFT обертки из кэша:', cached[0]);
//       return cached;
//     }
//   }

//   console.log('🔄 Загрузка всех NFT оберток...');
//   console.log('📍 Адрес коллекции из конфига:', this.nftWrapperCollection);
  
//   try {
//     // 1️⃣ Прямой запрос итемов из коллекции
//     console.log('1️⃣ Прямой запрос итемов из коллекции...');
//     const response = await this.api.getItemsByCollection(this.nftWrapperCollection);
    
//     const items = response.nft_items || [];
//     console.log(`📊 Найдено ${items.length} итемов в коллекции`);
//     console.log('📋 Пример итема из коллекции:', items[0]);
    
//     // 2️⃣ Фильтрация NFT wrapper итемов (по code_hash)
//     console.log('2️⃣ Фильтрация NFT wrapper итемов...');
//     const networkConfig = NETWORK_CONFIGS[this.isTestnet ? 'testnet' : 'mainnet'];
//     const nftWrapperHashes = [
//       networkConfig.CODE_HASHES.NFT_WRAPPER,
//       networkConfig.CODE_HASHES.PROXY_SUBDOMAIN,
//       networkConfig.CODE_HASHES.PROXY_SUBDOMAIN_NEW
//     ];
//     console.log('🔑 NFT Wrapper hashes:', nftWrapperHashes);
    
//     const nftWrapperItems = items.filter(item =>
//       nftWrapperHashes.includes(item.code_hash)
//     );
//     console.log(`📊 После фильтрации: ${nftWrapperItems.length} NFT wrapper итемов`);
//     console.log('📋 Пример NFT wrapper итема:', nftWrapperItems[0]);
    
//     // 3️⃣ Используем метаданные из response
//     console.log('3️⃣ Используем метаданные из response...');
//     const metadata = response.metadata || {};
//     console.log(`📊 Загружено ${Object.keys(metadata).length} метаданных`);
//     console.log('📋 Пример метаданных:', metadata[nftWrapperItems[0]?.address]);
    
//     // 4️⃣ Конвертация через существующую утилиту
//     console.log('4️⃣ Конвертация в SimpleEnrichedItems...');
//     const result = convertToSimpleEnrichedItems(nftWrapperItems, metadata, this.isTestnet);
//     console.log(`📊 Результат конвертации: ${result.length} итемов`);
//     console.log('📋 Пример конвертированного итема:', result[0]);
    
//     console.log('5️⃣ Сохранение в кэш...');
//     this.cache.set(cacheKey, result);
//     console.log(`✅ Загружено ${result.length} NFT оберток`);
    
//     return result;
    
//   } catch (error) {
//     console.error('❌ Ошибка загрузки NFT оберток:', error);
//     console.error('🔧 Детали ошибки:', {
//       message: error instanceof Error ? error.message : String(error),
//       stack: error instanceof Error ? error.stack : undefined,
//       collectionAddress: this.nftWrapperCollection
//     });
//     throw error;
//   }
// }

async getAllNFTWrappers(forceRefresh = false): Promise<SimpleEnrichedItem[]> {
  const cacheKey = `all_nft_wrappers_${this.isTestnet ? 'testnet' : 'mainnet'}`;
  
  if (!forceRefresh) {
    const cached = this.cache.get<SimpleEnrichedItem[]>(cacheKey);
    if (cached) {
      console.log('📦 NFT обертки из кэша:', cached.length);
      return cached;
    }
  }

  console.log('🔄 Загрузка всех NFT оберток...');
  
  try {
    const networkConfig = NETWORK_CONFIGS[this.isTestnet ? 'testnet' : 'mainnet'];
    
    // Хеши для фильтрации итемов
    const nftWrapperHashes = [
      networkConfig.CODE_HASHES.NFT_WRAPPER,
      networkConfig.CODE_HASHES.PROXY_SUBDOMAIN,
      networkConfig.CODE_HASHES.PROXY_SUBDOMAIN_NEW
    ];
    
    const allWrapperItems: TonCenterNFTItem[] = [];
    let allMetadata: Record<string, any> = {};

    // 1️⃣ Запрос к НОВОЙ NFT wrapper коллекции
    console.log('1️⃣ Запрос к новой NFT wrapper коллекции:', this.nftWrapperCollection);
    const newResponse = await this.api.getItemsByCollection(this.nftWrapperCollection);
    const newItems = (newResponse.nft_items || []).filter(item =>
      nftWrapperHashes.includes(item.code_hash)
    );
    console.log(`📊 Новая коллекция: ${newItems.length} NFT wrapper итемов`);
    allWrapperItems.push(...newItems);
    Object.assign(allMetadata, newResponse.metadata || {});

    // 2️⃣ Конвертация
    console.log(`📊 Всего NFT wrapper итемов: ${allWrapperItems.length}`);
    const result = convertToSimpleEnrichedItems(allWrapperItems, allMetadata, this.isTestnet);
    
    this.cache.set(cacheKey, result);
    console.log(`✅ Загружено ${result.length} NFT оберток`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Ошибка загрузки NFT оберток:', error);
    throw error;
  }
}



  /**
   * Получение NFT оберток пользователя
   */
  async getUserNFTWrappers(userAddress: string, forceRefresh = false): Promise<SimpleEnrichedItem[]> {
    const cacheKey = `user_nft_wrappers_${userAddress}_${this.isTestnet ? 'testnet' : 'mainnet'}`;
    
    if (!forceRefresh) {
      const cached = this.cache.get<SimpleEnrichedItem[]>(cacheKey);
      if (cached) return cached;
    }

    console.log(`🔄 Загрузка NFT оберток пользователя ${userAddress}...`);
    
    try {
      const collection = await this.getNFTWrapperCollection();
      if (!collection) {
        console.log('⚠️ NFT Wrapper коллекция не найдена');
        return [];
      }
      
      const items = await this.getUserItemsFromCollections([collection], userAddress);
      const metadata = await this.getMetadataForAll(items);
      const result = convertToSimpleEnrichedItems(items, metadata, this.isTestnet);
      
      this.cache.set(cacheKey, result);
      console.log(`✅ Загружено ${result.length} NFT оберток пользователя`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Ошибка загрузки NFT оберток пользователя:', error);
      throw error;
    }
  }

  // ==================== БАЗОВЫЕ МЕТОДЫ ====================

  /**
   * Получение всех коллекций от владельца платформы
   */
  // private async getAllCollectionsFromPlatformOwner(): Promise<TonCenterCollection[]> {
  //   const cacheKey = `platform_collections_${this.isTestnet ? 'testnet' : 'mainnet'}`;
    
  //   const cached = this.cache.get<TonCenterCollection[]>(cacheKey);
  //   if (cached) return cached;

  //   console.log('📚 Загрузка коллекций от владельца платформы...');
    
  //   let allCollections: TonCenterCollection[] = [];
  //   let offset = 0;
  //   let hasMore = true;

  //   while (hasMore) {
  //     console.log(`📄 Пакет коллекций ${offset / this.config.collectionsBatchSize + 1}, offset: ${offset}`);
      
  //     try {
  //       const response = await this.api.getCollectionsByOwner(
  //         this.platformOwner,
  //         this.config.collectionsBatchSize,
  //         offset
  //       );
        
  //       const collections = response.nft_collections || [];
        
  //       if (collections.length === 0) {
  //         hasMore = false;
  //         break;
  //       }
        
  //       allCollections.push(...collections);
        
  //       if (collections.length < this.config.collectionsBatchSize) {
  //         hasMore = false;
  //       } else {
  //         offset += this.config.collectionsBatchSize;
          
  //         if (hasMore) {
  //           await this.delay(this.config.delayBetweenBatches);
  //         }
  //       }
        
  //     } catch (error) {
  //       console.error(`❌ Ошибка загрузки пакета коллекций (offset: ${offset}):`, error);
  //       offset += this.config.collectionsBatchSize;
  //     }
  //   }
    
  //   console.log(`✅ Загружено ${allCollections.length} коллекций от владельца платформы`);
    
  //   this.cache.set(cacheKey, allCollections, this.config.cacheTTL);
  //   return allCollections;
  // }

  private async getAllCollectionsFromPlatformOwner(): Promise<{
  collections: TonCenterCollection[];
  metadata: Record<string, any>;
}> {
  const cacheKey = `platform_collections_${this.isTestnet ? 'testnet' : 'mainnet'}`;

  const cached = this.cache.get<{
    collections: TonCenterCollection[];
    metadata: Record<string, any>;
  }>(cacheKey);
  if (cached) return cached;

  console.log('📚 Загрузка коллекций от владельца платформы...');

  let allCollections: TonCenterCollection[] = [];
  let allMetadata: Record<string, any> = {};
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      const response = await this.api.getCollectionsByOwner(
        this.platformOwner,
        this.config.collectionsBatchSize,
        offset
      );

      const collections = response.nft_collections || [];
      const batchMetadata = response.metadata || {};

      if (collections.length === 0) {
        hasMore = false;
        break;
      }

      allCollections.push(...collections);
      Object.assign(allMetadata, batchMetadata);

      if (collections.length < this.config.collectionsBatchSize) {
        hasMore = false;
      } else {
        offset += this.config.collectionsBatchSize;
        if (hasMore) await this.delay(this.config.delayBetweenBatches);
      }
    } catch (error) {
      console.error(`❌ Ошибка загрузки пакета коллекций (offset: ${offset}):`, error);
      offset += this.config.collectionsBatchSize;
    }
  }

  const result = { collections: allCollections, metadata: allMetadata };
  this.cache.set(cacheKey, result, this.config.cacheTTL);

  console.log(`✅ Загружено ${allCollections.length} коллекций, метаданные для ${Object.keys(allMetadata).length} шт.`);
  return result;
}


  /**
   * Получение NFT Wrapper коллекции
   */
  private async getNFTWrapperCollection(): Promise<TonCenterCollection | null> {
    const cacheKey = `nft_wrapper_collection_${this.isTestnet ? 'testnet' : 'mainnet'}`;
    
    const cached = this.cache.get<TonCenterCollection>(cacheKey);
    if (cached) return cached;

    console.log('📚 Загрузка NFT Wrapper коллекции...');
    
    try {
      const collection = await this.api.getCollectionByAddress(this.nftWrapperCollection);
      
      if (collection && this.classifier.isNFTWrapperCollection(collection)) {
        this.cache.set(cacheKey, collection, this.config.cacheTTL);
        console.log('✅ NFT Wrapper коллекция загружена');
        return collection;
      } else {
        console.log('⚠️ NFT Wrapper коллекция не найдена или неверный тип');
        return null;
      }
      
    } catch (error) {
      console.error('❌ Ошибка загрузки NFT Wrapper коллекции:', error);
      return null;
    }
  }

  /**
   * Получение всех итемов из коллекций
   */
  private async getAllItemsFromCollections(collections: TonCenterCollection[]): Promise<TonCenterNFTItem[]> {
    if (collections.length === 0) return [];
    
    console.log(`📦 Загрузка всех итемов из ${collections.length} коллекций...`);
    
    const allItems: TonCenterNFTItem[] = [];
    
    // Обрабатываем коллекции параллельно, но с ограничением
    const chunks = this.chunkArray(collections, this.config.maxConcurrentRequests);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`📄 Пакет коллекций ${i + 1}/${chunks.length}`);
      
      const chunkPromises = chunk.map(async (collection) => {
        try {
          const items = await this.getItemsFromCollection(collection.address);
          return items;
        } catch (error) {
          console.error(`❌ Ошибка загрузки итемов из коллекции ${collection.address}:`, error);
          return [];
        }
      });
      
      const chunkResults = await Promise.all(chunkPromises);
      const flatResults = chunkResults.flat();
      allItems.push(...flatResults);
      
      // Задержка между пакетами
      if (i < chunks.length - 1) {
        await this.delay(this.config.delayBetweenCollections);
      }
    }
    
    console.log(`✅ Загружено ${allItems.length} итемов из ${collections.length} коллекций`);
    return allItems;
  }

  /**
   * Получение итемов пользователя из коллекций
   */
  private async getUserItemsFromCollections(collections: TonCenterCollection[], userAddress: string): Promise<TonCenterNFTItem[]> {
    if (collections.length === 0) return [];
    
    console.log(`📦 Загрузка итемов пользователя ${userAddress} из ${collections.length} коллекций...`);
    
    const allItems: TonCenterNFTItem[] = [];
    
    // Обрабатываем коллекции параллельно, но с ограничением
    const chunks = this.chunkArray(collections, this.config.maxConcurrentRequests);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`📄 Пакет коллекций ${i + 1}/${chunks.length}`);
      
      const chunkPromises = chunk.map(async (collection) => {
        try {
          const items = await this.getItemsFromCollectionByOwner(collection.address, userAddress);
          return items;
        } catch (error) {
          console.error(`❌ Ошибка загрузки итемов пользователя из коллекции ${collection.address}:`, error);
          return [];
        }
      });
      
      const chunkResults = await Promise.all(chunkPromises);
      const flatResults = chunkResults.flat();
      allItems.push(...flatResults);
      
      // Задержка между пакетами
      if (i < chunks.length - 1) {
        await this.delay(this.config.delayBetweenCollections);
      }
    }
    
    console.log(`✅ Загружено ${allItems.length} итемов пользователя из ${collections.length} коллекций`);
    return allItems;
  }

  /**
   * Получение итемов из коллекции
   */
  private async getItemsFromCollection(collectionAddress: string): Promise<TonCenterNFTItem[]> {
    const cacheKey = `collection_items_${collectionAddress}_${this.isTestnet ? 'testnet' : 'mainnet'}`;
    
    const cached = this.cache.get<TonCenterNFTItem[]>(cacheKey);
    if (cached) return cached;

    let allItems: TonCenterNFTItem[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await this.api.getItemsByCollection(
          collectionAddress,
          this.config.itemsBatchSize,
          offset
        );
        
        const items = response.nft_items || [];
        
        if (items.length === 0) {
          hasMore = false;
          break;
        }
        
        allItems.push(...items);
        
        if (items.length < this.config.itemsBatchSize) {
          hasMore = false;
        } else {
          offset += this.config.itemsBatchSize;
          
          if (hasMore) {
            await this.delay(this.config.delayBetweenBatches);
          }
        }
        
      } catch (error) {
        console.error(`❌ Ошибка загрузки пакета итемов (offset: ${offset}):`, error);
        offset += this.config.itemsBatchSize;
      }
    }
    
    this.cache.set(cacheKey, allItems, this.config.cacheTTL);
    return allItems;
  }

  /**
   * Получение итемов из коллекции по владельцу
   */
  private async getItemsFromCollectionByOwner(collectionAddress: string, ownerAddress: string): Promise<TonCenterNFTItem[]> {
    const cacheKey = `collection_items_${collectionAddress}_owner_${ownerAddress}_${this.isTestnet ? 'testnet' : 'mainnet'}`;
    
    const cached = this.cache.get<TonCenterNFTItem[]>(cacheKey);
    if (cached) return cached;

    let allItems: TonCenterNFTItem[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await this.api.getItemsByCollectionAndOwner(
          collectionAddress,
          ownerAddress,
          this.config.itemsBatchSize,
          offset
        );
        
        const items = response.nft_items || [];
        
        if (items.length === 0) {
          hasMore = false;
          break;
        }
        
        allItems.push(...items);
        
        if (items.length < this.config.itemsBatchSize) {
          hasMore = false;
        } else {
          offset += this.config.itemsBatchSize;
          
          if (hasMore) {
            await this.delay(this.config.delayBetweenBatches);
          }
        }
        
      } catch (error) {
        console.error(`❌ Ошибка загрузки пакета итемов пользователя (offset: ${offset}):`, error);
        offset += this.config.itemsBatchSize;
      }
    }
    
    this.cache.set(cacheKey, allItems, this.config.cacheTTL);
    return allItems;
  }

  /**
   * Получение метаданных для списка адресов
   */
  private async getMetadataForAll(addresses: Array<{ address: string }>): Promise<Record<string, any>> {
    if (addresses.length === 0) return {};
    
    console.log(`📊 Загрузка метаданных для ${addresses.length} адресов...`);
    
    const metadata: Record<string, any> = {};
    
    // Здесь должен быть запрос к API метаданных
    // Временная заглушка
    addresses.forEach(item => {
      metadata[item.address] = {};
    });
    
    return metadata;
  }

  /**
   * Определяет реального создателя коллекции по первой транзакции (deploy)
   * 
   * Логика:
   * - Берём самую первую транзакцию (sort=asc, limit=1)
   * - Признаки deploy: orig_status === 'nonexist', prev_trans_lt === '0'
   * - in_msg.source — адрес создателя (raw-формат 0:...)
   */
   /**
   * Определяет реального создателя коллекции по первой транзакции (deploy)
   * 
   * Логика:
   * - Берём самую первую транзакцию (sort=asc, limit=1) через getFirstTransaction
   * - Признаки deploy: orig_status === 'nonexist', prev_trans_lt === '0'
   * - in_msg.source — адрес создателя (raw-формат 0:...)
   */
  async getCollectionCreator(collectionAddress: string): Promise<string | null> {
    try {
      const response = await this.api.getFirstTransaction(collectionAddress);
      
      if (!response.transactions || response.transactions.length === 0) {
        console.warn(`⚠️ Нет транзакций для коллекции ${collectionAddress.slice(0, 10)}...`);
        return null;
      }

      const firstTx = response.transactions[0];
      
      // Признаки deploy-транзакции
      if (
        firstTx.orig_status === 'nonexist' &&
        firstTx.prev_trans_lt === '0' &&
        firstTx.in_msg?.source
      ) {
        console.log(`✅ Создатель коллекции ${collectionAddress.slice(0, 10)}...: ${firstTx.in_msg.source}`);
        return firstTx.in_msg.source;
      }

      // Запасной вариант — берём source из любого in_msg
      if (firstTx.in_msg?.source) {
        return firstTx.in_msg.source;
      }

      return null;
    } catch (error) {
      console.error(`❌ Ошибка получения создателя коллекции ${collectionAddress.slice(0, 10)}...:`, error);
      return null;
    }
  }

  // ==================== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ====================

  /**
   * Разделение массива на чанки
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Задержка
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

    // ==================== УПРАВЛЕНИЕ КЭШЕМ ====================

  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Кэш очищен');
  }

  invalidateCache(key: string): void {
    this.cache.delete(key);
    console.log(`🗑️ Кэш для ключа ${key} очищен`);
  }

  getCacheStats() {
    return {
      isTestnet: this.isTestnet,
      platformOwner: this.platformOwner,
      nftWrapperCollection: this.nftWrapperCollection,
      config: {
        collectionsBatchSize: this.config.collectionsBatchSize,
        itemsBatchSize: this.config.itemsBatchSize,
        cacheTTL: this.config.cacheTTL
      }
    };
  }

  // ==================== УПРАВЛЕНИЕ КОНФИГУРАЦИЕЙ ====================

  updateConfig(newConfig: Partial<ServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Конфигурация сервиса обновлена');
  }

  getCurrentConfig(): ServiceConfig {
    return { ...this.config };
  }

  // ==================== СТАТИСТИКА И ИНФОРМАЦИЯ ====================

  /**
   * Получение информации о сервисе
   */
  getServiceInfo() {
    return {
      serviceName: 'UniversalBlockchainService',
      version: '1.0.0',
      isTestnet: this.isTestnet,
      network: this.isTestnet ? 'testnet' : 'mainnet',
      platformOwner: this.platformOwner,
      nftWrapperCollection: this.nftWrapperCollection,
      config: this.getCurrentConfig(),
      cacheStats: this.getCacheStats()
    };
  }

  /**
   * Получение статистики загрузки
   */
  async getLoadingStats(): Promise<{
    totalCollections: number;
    totalItems: number;
    proxyCollections: number;
    sbtCollections: number;
    nftWrapperCollections: number;
    proxySubdomains: number;
    sbtSubdomains: number;
    nftWrappers: number;
    lastUpdated?: string;
  }> {
    try {
      // Получаем коллекции
      const { collections } = await this.getAllCollectionsFromPlatformOwner();
      const proxyCollections = collections.filter(c => this.classifier.isProxyCollection(c));
      const sbtCollections = collections.filter(c => this.classifier.isSBTCollection(c));
      
      // Получаем NFT Wrapper коллекцию
      const nftWrapperCollection = await this.getNFTWrapperCollection();
      const nftWrapperCollections = nftWrapperCollection ? 1 : 0;
      
      // Получаем итемы
      let totalItems = 0;
      let proxySubdomains = 0;
      let sbtSubdomains = 0;
      let nftWrappers = 0;
      
      // Proxy коллекции
      if (proxyCollections.length > 0) {
        const proxyItems = await this.getAllItemsFromCollections(proxyCollections);
        proxySubdomains = proxyItems.filter(item => this.classifier.isProxySubdomain(item)).length;
        totalItems += proxyItems.length;
      }
      
      // NFT Wrapper коллекция
      if (nftWrapperCollection) {
        const wrapperItems = await this.getAllItemsFromCollections([nftWrapperCollection]);
        nftWrappers = wrapperItems.filter(item => this.classifier.isNFTWrapper(item)).length;
        totalItems += wrapperItems.length;
      }
      
      return {
        totalCollections: collections.length + nftWrapperCollections,
        totalItems,
        proxyCollections: proxyCollections.length,
        sbtCollections: sbtCollections.length,
        nftWrapperCollections,
        proxySubdomains,
        sbtSubdomains,
        nftWrappers,
        lastUpdated: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Ошибка получения статистики:', error);
      throw error;
    }
  }

  // ==================== ПОИСК И ФИЛЬТРАЦИЯ ====================

  /**
   * Поиск коллекций по имени
   */
  async searchCollectionsByName(name: string): Promise<SimpleCollection[]> {
    const { allCollections } = await this.getCollectionsData();
    
    return allCollections.filter(collection => 
      collection.name.toLowerCase().includes(name.toLowerCase())
    );
  }

  /**
   * Поиск итемов по домену
   */
  async searchItemsByDomain(domain: string): Promise<SimpleEnrichedItem[]> {
    const { allItems } = await this.getItemsData();
    
    return allItems.filter(item => 
      item.domain.toLowerCase().includes(domain.toLowerCase())
    );
  }

  /**
   * Поиск итемов по зоне
   */
  async searchItemsByZone(zone: string): Promise<SimpleEnrichedItem[]> {
    const { allItems } = await this.getItemsData();
    
    return allItems.filter(item => 
      item.zone.toLowerCase().includes(zone.toLowerCase())
    );
  }

  /**
   * Получение итемов на продаже
   */
  async getItemsOnSale(): Promise<SimpleEnrichedItem[]> {
    const { allItems } = await this.getItemsData();
    
    return allItems.filter(item => item.on_sale);
  }

  /**
   * Получение итемов по цене (диапазон)
   */
  async getItemsByPriceRange(minPrice?: string, maxPrice?: string): Promise<SimpleEnrichedItem[]> {
    const { allItems } = await this.getItemsData();
    
    return allItems.filter(item => {
      const price = item.metadata?.price || item.metadata?.sale?.price?.value;
      if (!price) return false;
      
      const priceNum = parseFloat(price);
      
      if (minPrice && priceNum < parseFloat(minPrice)) return false;
      if (maxPrice && priceNum > parseFloat(maxPrice)) return false;
      
      return true;
    });
  }

  // ==================== ЭКСПОРТ ДАННЫХ ====================

  /**
   * Экспорт данных в JSON
   */
  async exportToJSON(userAddress?: string): Promise<string> {
    const data = await this.getAllAppData(userAddress);
    return JSON.stringify(data, null, 2);
  }

  /**
   * Экспорт коллекций в CSV
   */
  async exportCollectionsToCSV(): Promise<string> {
    const { allCollections } = await this.getCollectionsData();
    
    const headers = ['Address', 'Name', 'Type', 'Owner', 'Total Items', 'Image'];
    const rows = allCollections.map(collection => [
      collection.address,
      collection.name || '',
      collection.type,
      collection.owner_address,
      collection.total_items?.toString() || '0',
      collection.image || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    return csvContent;
  }

  /**
   * Экспорт итемов в CSV
   */
  async exportItemsToCSV(userAddress?: string): Promise<string> {
    const { allItems } = await this.getItemsData(userAddress);
    
    const headers = ['Address', 'Domain', 'Zone', 'Type', 'Owner', 'Collection', 'On Sale', 'Last Updated'];
    const rows = allItems.map(item => [
      item.address,
      item.domain,
      item.zone,
      item.type,
      item.owner_address || '',
      item.collection_address,
      item.on_sale ? 'Yes' : 'No',
      item.lastUpdated
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    return csvContent;
  }

  // ==================== ВАЛИДАЦИЯ И ПРОВЕРКИ ====================

  /**
   * Проверка доступности API
   */
  async checkAPIHealth(): Promise<boolean> {
    try {
      await this.api.getCollectionsByOwner(this.platformOwner, 1, 0);
      return true;
    } catch (error) {
      console.error('❌ API недоступно:', error);
      return false;
    }
  }

  /**
   * Проверка валидности адреса
   */
  isValidAddress(address: string): boolean {
    try {
      // Простая проверка формата адреса TON
      return address.startsWith('0:') && address.length === 66;
    } catch (error) {
      return false;
    }
  }

  /**
   * Проверка принадлежности итема пользователю
   */
  async isItemOwnedByUser(itemAddress: string, userAddress: string): Promise<boolean> {
    try {
      const item = await this.api.getItemByAddress(itemAddress);
      return item.owner_address === userAddress;
    } catch (error) {
      console.error('❌ Ошибка проверки владения:', error);
      return false;
    }
  }

  // ==================== УПРАВЛЕНИЕ СЕТЬЮ ====================

  /**
   * Переключение сети
   */
  switchNetwork(isTestnet: boolean): void {
    this.isTestnet = isTestnet;
    
    const networkConfig = NETWORK_CONFIGS[isTestnet ? 'testnet' : 'mainnet'];
    this.platformOwner = networkConfig.DEFAULT_ADDRESSES.PLATFORM_OWNER;
    this.nftWrapperCollection = networkConfig.DEFAULT_ADDRESSES.NFT_WRAPPER_COLLECTION;
    
    // Очищаем кэш при смене сети
    this.clearCache();
    
    console.log(`🌐 Сеть переключена на: ${isTestnet ? 'testnet' : 'mainnet'}`);
  }

  /**
   * Получение текущей сети
   */
  getCurrentNetwork(): NetworkType {
    return this.isTestnet ? 'testnet' : 'mainnet';
  }

  // ==================== СИНХРОНИЗАЦИЯ И ОБНОВЛЕНИЯ ====================

  /**
   * Принудительная синхронизация всех данных
   */
  async forceSyncAll(userAddress?: string): Promise<void> {
    console.log('🔄 Принудительная синхронизация всех данных...');
    
    // Очищаем весь кэш
    this.clearCache();
    
    // Загружаем все данные заново
    await this.getAllAppData(userAddress, true);
    
    console.log('✅ Все данные синхронизированы');
  }

  /**
   * Инкрементальное обновление данных
   */
  async incrementalUpdate(userAddress?: string): Promise<void> {
    console.log('🔄 Инкрементальное обновление данных...');
    
    // Здесь можно добавить логику инкрементального обновления
    // Например, проверять только новые транзакции
    
    // Пока просто обновляем все данные
    await this.getAllAppData(userAddress, true);
    
    console.log('✅ Данные обновлены');
  }

  // ==================== ЛОГИРОВАНИЕ И МОНИТОРИНГ ====================

  /**
   * Включение/выключение подробного логирования
   */
  setVerboseLogging(enabled: boolean): void {
    // Можно добавить логику управления уровнем логирования
    console.log(`📝 Подробное логирование ${enabled ? 'включено' : 'выключено'}`);
  }

  /**
   * Получение логов последних операций
   */
  getRecentLogs(): string[] {
    // Здесь можно возвращать логи из внутреннего хранилища
    return ['Логирование не реализовано'];
  }

  // ==================== УТИЛИТЫ ДЛЯ РАЗРАБОТЧИКОВ ====================

  /**
   * Тестирование классификатора
   */
  async testClassifier(): Promise<{
    proxyCollections: number;
    sbtCollections: number;
    nftWrapperCollections: number;
    proxySubdomains: number;
    sbtSubdomains: number;
    nftWrappers: number;
  }> {
    const { collections } = await this.getAllCollectionsFromPlatformOwner();
    const proxyCollections = collections.filter(c => this.classifier.isProxyCollection(c));
    const sbtCollections = collections.filter(c => this.classifier.isSBTCollection(c));
    
    const nftWrapperCollection = await this.getNFTWrapperCollection();
    const nftWrapperCollections = nftWrapperCollection ? 1 : 0;
    
    let proxySubdomains = 0;
    let sbtSubdomains = 0;
    let nftWrappers = 0;
    
    if (proxyCollections.length > 0) {
      const proxyItems = await this.getAllItemsFromCollections(proxyCollections.slice(0, 1));
      proxySubdomains = proxyItems.filter(item => this.classifier.isProxySubdomain(item)).length;
    }
    
    if (sbtCollections.length > 0) {
      const sbtItems = await this.getAllItemsFromCollections(sbtCollections.slice(0, 1));
      sbtSubdomains = sbtItems.filter(item => this.classifier.isSBTSubdomain(item)).length;
    }
    
    if (nftWrapperCollection) {
      const wrapperItems = await this.getAllItemsFromCollections([nftWrapperCollection]);
      nftWrappers = wrapperItems.filter(item => this.classifier.isNFTWrapper(item)).length;
    }
    
    return {
      proxyCollections: proxyCollections.length,
      sbtCollections: sbtCollections.length,
      nftWrapperCollections,
      proxySubdomains,
      sbtSubdomains,
      nftWrappers
    };
  }

  /**
   * Генерация отчета о производительности
   */
  async generatePerformanceReport(): Promise<{
    loadTime: number;
    memoryUsage: number;
    cacheHitRate: number;
    apiCalls: number;
  }> {
    const startTime = Date.now();
    
    // Тестовая загрузка
    await this.getAllAppData(undefined, true);
    
    const loadTime = Date.now() - startTime;
    
    return {
      loadTime,
      memoryUsage: 0, // Можно добавить реальное измерение памяти
      cacheHitRate: 0, // Можно добавить статистику кэша
      apiCalls: 0 // Можно добавить счетчик API вызовов
    };
  }
}

// ==================== ЭКСПОРТ ====================

export default UniversalBlockchainService;
