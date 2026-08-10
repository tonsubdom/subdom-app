

/**
 * Redux slice для управления состоянием blockchain items
 * Исправленная версия без non-serializable value
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AppData, SimpleEnrichedItem, SimpleCollection, NetworkType, CollectionType } from './blockchain-items-types';
import { UniversalBlockchainService } from './universal-blockchain-service';
import { convertUserFriendlyToRaw } from '@/utils/tonUtils';
import {
  fetchPlatformCache,
  platformZoneToSimpleCollection,
  platformSubdomainToSimpleEnrichedItem,
  platformWrapperToSimpleEnrichedItem,
} from './platformCacheClient';

/**
 * Group 3.3 — бэкенд read-cache как быстрый акселератор перед полным
 * ончейн-обходом. fetchPlatformCache сама укладывается в таймаут (2 сек) и
 * возвращает null при любой проблеме — тут просто проверяем, что ВСЕ три
 * запроса удались, иначе бросаем частичный результат и идём в фолбэк
 * (service.getAllAppData ниже), а не мешаем кэш с ончейном в одном AppData.
 *
 * Персональные user*-массивы — тот же фильтр по owner_address, что уже
 * делает getItemsData в universal-blockchain-service.ts (raw-адрес,
 * lowercase) — не отдельный запрос, а срез той же платформенной выборки.
 */
async function tryLoadFromPlatformCache(
  isTestnet: boolean,
  userAddress?: string
): Promise<AppData | null> {
  const [zoneRows, subdomainRows, wrapperRows] = await Promise.all([
    fetchPlatformCache('zones', isTestnet),
    fetchPlatformCache('subdomains', isTestnet),
    fetchPlatformCache('wrappers', isTestnet),
  ]);

  if (!zoneRows || !subdomainRows || !wrapperRows) return null;

  // Пустой ответ (не null!) — это не "на платформе правда 0 зон", а почти
  // наверняка кроулер ещё не сделал первый проход (только задеплоили) или
  // упал молча (например опечатка в env). Отдавать пустой Market/селектор
  // зоны реальным юзерам хуже, чем один раз пойти медленным ончейн-путём —
  // считаем это тем же "кэш не готов", что и null/таймаут.
  //
  // wrapperRows НЕ гейтит зоны/субдомены — секция обёрток в crawler.ts
  // обёрнута в собственный try/catch отдельно от зон и может транзиентно/
  // постоянно не находить wrapper-коллекцию (см. Log.md 2026-08-10), даже
  // когда зоны и субдомены давно и стабильно находятся. Раньше пустой
  // wrapperRows обнулял вообще весь кэш-путь (включая рабочие зоны/
  // субдомены) — из-за чего фронт вообще переставал пользоваться кэшем и
  // всегда шёл в медленный полный ончейн-обход. Пустые обёртки сами по себе
  // не мешают отдать зоны/субдомены из кэша; чтобы не закрепить "0 обёрток"
  // в localStorage на 20 мин (CACHE_TTL_MS), персист этого случая отдельно
  // пропускается в loadAllAppData — см. комментарий там.
  if (zoneRows.length === 0) return null;

  const allCollections = zoneRows.map(platformZoneToSimpleCollection);
  const proxyCollections = allCollections.filter((c) => c.type === 'proxy');
  const sbtCollections = allCollections.filter((c) => c.type === 'sbt');

  const proxySubdomains = subdomainRows
    .filter((r) => r.isProxy === 1)
    .map(platformSubdomainToSimpleEnrichedItem);
  const sbtSubdomains = subdomainRows
    .filter((r) => r.isProxy !== 1)
    .map(platformSubdomainToSimpleEnrichedItem);
  const nftWrappers = wrapperRows.map(platformWrapperToSimpleEnrichedItem);
  const allItems = [...proxySubdomains, ...sbtSubdomains, ...nftWrappers];

  const rawUserAddress = userAddress ? convertUserFriendlyToRaw(userAddress).toLowerCase() : undefined;
  const byOwner = (items: SimpleEnrichedItem[]) =>
    rawUserAddress ? items.filter((i) => (i.owner_address || '').toLowerCase() === rawUserAddress) : [];

  return {
    allCollections,
    proxyCollections,
    sbtCollections,
    nftWrapperCollections: [], // не персистится отдельно — нет реальных потребителей вне сервиса (см. Log.md)
    allItems,
    proxySubdomains,
    sbtSubdomains,
    nftWrappers,
    userProxySubdomains: byOwner(proxySubdomains),
    userSBTSubdomains: byOwner(sbtSubdomains),
    userNFTWrappers: byOwner(nftWrappers),
    lastUpdated: new Date().toISOString(),
    network: isTestnet ? 'testnet' : 'mainnet',
  };
}

// ==================== СОСТОЯНИЕ ====================

interface BlockchainItemsState {
  // Основные данные
  appData: AppData | null;
  
  // Отдельные списки для быстрого доступа
  allCollections: SimpleCollection[];
  proxyCollections: SimpleCollection[];
  sbtCollections: SimpleCollection[];
  nftWrapperCollections: SimpleCollection[];
  
  allItems: SimpleEnrichedItem[];
  proxySubdomains: SimpleEnrichedItem[];
  sbtSubdomains: SimpleEnrichedItem[];
  nftWrappers: SimpleEnrichedItem[];
  
  userProxySubdomains: SimpleEnrichedItem[];
  userSBTSubdomains: SimpleEnrichedItem[];
  userNFTWrappers: SimpleEnrichedItem[];
  
  // Состояние загрузки
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  
  // Настройки
  network: NetworkType;
  lastUpdated: string | null;

  // true только после реального сетевого fetch в ТЕКУЩЕЙ сессии вкладки
  // (loadAllAppData.fulfilled). Гидрация из localStorage lastUpdated тоже
  // выставляет (снимок может быть свежим по TTL, но неполным/устаревшим
  // относительно того, что изменилось на чейне только что) — ensureData()
  // должен ориентироваться на этот флаг, а не только на TTL, иначе стор может
  // молча простоять до 20 минут на неполных гидрированных данных.
  hasFetchedThisSession: boolean;

  // Пользователь
  currentUserAddress: string | null;
  
  // Конфигурация сервиса (вместо самого сервиса)
  serviceConfig: {
    network: NetworkType;
    apiKey?: string;
    isInitialized: boolean;
  };
}

const initialState: BlockchainItemsState = {
  // Основные данные
  appData: null,
  
  // Коллекции
  allCollections: [],
  proxyCollections: [],
  sbtCollections: [],
  nftWrapperCollections: [],
  
  // Итемы
  allItems: [],
  proxySubdomains: [],
  sbtSubdomains: [],
  nftWrappers: [],
  
  // Итемы пользователя
  userProxySubdomains: [],
  userSBTSubdomains: [],
  userNFTWrappers: [],
  
  // Состояние
  isLoading: false,
  isRefreshing: false,
  error: null,
  
  // Настройки
  network: 'testnet',
  lastUpdated: null,
  hasFetchedThisSession: false,

  // Пользователь
  currentUserAddress: null,
  
  // Конфигурация сервиса
  serviceConfig: {
    network: 'testnet',
    apiKey: undefined,
    isInitialized: false
  }
};

// ==================== УТИЛИТЫ ====================

/**
 * Синглтон сервиса на network+apiKey — раньше здесь создавался НОВЫЙ экземпляр
 * (с пустым in-memory кэшем) на каждый вызов thunk'а, из-за чего кэш внутри
 * UniversalBlockchainService физически не мог пережить даже соседний диспатч,
 * не то что переход между страницами: любой заход заново гонял полный
 * ончейн-скан. Держим по одному инстансу на комбинацию сеть+ключ на время
 * жизни вкладки — TTL самого кэша (см. cacheTTL) сам решает, когда обновлять.
 */
const serviceInstances = new Map<string, UniversalBlockchainService>();

/**
 * Держим TTL синхронным с UniversalBlockchainService.DEFAULT_CONFIG.cacheTTL —
 * это то же окно, в течение которого сервис отдаёт данные из своего
 * in-memory кэша без похода в сеть. localStorage-снимок ниже — тот же TTL,
 * но переживающий полную перезагрузку страницы/вкладки.
 */
export const CACHE_TTL_MS = 20 * 60 * 1000;

const STORAGE_PREFIX = 'subdom:blockchainAppData:';

interface PersistedAppDataEnvelope {
  data: AppData;
  userAddress: string | null;
  savedAt: number;
}

const persistAppData = (network: NetworkType, data: AppData, userAddress?: string | null): void => {
  try {
    const envelope: PersistedAppDataEnvelope = {
      data,
      userAddress: userAddress ?? null,
      savedAt: Date.now(),
    };
    localStorage.setItem(`${STORAGE_PREFIX}${network}`, JSON.stringify(envelope));
  } catch (e) {
    console.warn('⚠️ Не удалось сохранить blockchain-кэш в localStorage:', e);
  }
};

const loadPersistedAppData = (network: NetworkType): PersistedAppDataEnvelope | null => {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${network}`);
    if (!raw) return null;

    const envelope = JSON.parse(raw) as PersistedAppDataEnvelope;
    if (!envelope?.data || !envelope?.savedAt) return null;
    if (Date.now() - envelope.savedAt > CACHE_TTL_MS) return null;

    return envelope;
  } catch (e) {
    console.warn('⚠️ Не удалось прочитать blockchain-кэш из localStorage:', e);
    return null;
  }
};

const createService = (network: NetworkType, apiKey?: string): UniversalBlockchainService => {
  const instanceKey = `${network}_${apiKey || 'no-key'}`;
  const existing = serviceInstances.get(instanceKey);
  if (existing) return existing;

  console.log('🔧 Создаем сервис (новый инстанс на сессию):', {
    network,
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length,
    apiKeyPreview: apiKey ? `${apiKey.substring(0, 10)}...` : 'none'
  });

  const service = new UniversalBlockchainService(network === 'testnet', apiKey);
  serviceInstances.set(instanceKey, service);
  return service;
};

// ==================== ASYNC THUNKS ====================

/**
 * Инициализация сервиса
 */
export const initializeService = createAsyncThunk(
  'blockchainItems/initializeService',
  async (params: { network?: NetworkType; apiKey?: string; userAddress?: string | null }, thunkAPI) => {
    try {
      const { network = 'testnet', apiKey, userAddress = null } = params;

      // Создаем сервис
     // const _service = createService(network, apiKey);

      // Просто создаем сервис без тестирования подключения
      // (метод testConnection не существует)
      console.log('✅ Сервис создан успешно');

      // Возвращаем только конфигурацию, а не сам сервис
      return {
        network,
        apiKey,
        isInitialized: true,
        userAddress
      };
    } catch (error: any) {
      console.error('❌ Ошибка инициализации сервиса:', error);
      return thunkAPI.rejectWithValue(error.message || 'Ошибка инициализации сервиса');
    }
  }
);

/**
 * Загрузка всех данных приложения
 */
export const loadAllAppData = createAsyncThunk(
  'blockchainItems/loadAllAppData',
  async (params: { userAddress?: string; forceRefresh?: boolean }, thunkAPI) => {
    try {
      const state = thunkAPI.getState() as { blockchainItems: BlockchainItemsState };
      const { network, apiKey } = state.blockchainItems.serviceConfig;
      const { userAddress, forceRefresh = false } = params;

      // Бэкенд read-cache (Group 3.3) — акселератор перед полным ончейн-обходом,
      // не при forceRefresh (юзер явно просит live-данные — не отдаём кэш).
      if (!forceRefresh) {
        const cached = await tryLoadFromPlatformCache(network === 'testnet', userAddress);
        if (cached) {
          // Обёртки в этом снимке кэша могут быть пустыми не потому что их
          // реально 0, а потому что crawler.ts транзиентно/постоянно не
          // находит wrapper-коллекцию (см. комментарий в
          // tryLoadFromPlatformCache) — не закрепляем такой снимок в
          // localStorage на CACHE_TTL_MS, иначе следующая жёсткая
          // перезагрузка страницы покажет "0 обёрток" из устаревшего
          // снапшота вместо повторной попытки. Зоны/субдомены при этом всё
          // равно отдаются из кэша сейчас, только не персистятся длительно.
          if (cached.nftWrappers.length > 0) {
            persistAppData(network, cached, userAddress ?? null);
          }
          return { data: cached, userAddress };
        }
      }

      // Создаем сервис на лету
      const service = createService(network, apiKey);
      const data = await service.getAllAppData(userAddress, forceRefresh);
      persistAppData(network, data, userAddress ?? null);

      return { data, userAddress };
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.message || 'Ошибка загрузки данных');
    }
  }
);

/**
 * Загрузка только коллекций
 */
export const loadCollectionsData = createAsyncThunk(
  'blockchainItems/loadCollectionsData',
  async (params: { forceRefresh?: boolean }, thunkAPI) => {
    try {
      const state = thunkAPI.getState() as { blockchainItems: BlockchainItemsState };
      const { network, apiKey } = state.blockchainItems.serviceConfig;
      
      // Создаем сервис на лету
      const service = createService(network, apiKey);
      
      const { forceRefresh = false } = params;
      const data = await service.getCollectionsData(forceRefresh);
      
      return { data };
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.message || 'Ошибка загрузки коллекций');
    }
  }
);

/**
 * Загрузка только итемов
 */
export const loadItemsData = createAsyncThunk(
  'blockchainItems/loadItemsData',
  async (params: { userAddress?: string; forceRefresh?: boolean }, thunkAPI) => {
    try {
      const state = thunkAPI.getState() as { blockchainItems: BlockchainItemsState };
      const { network, apiKey } = state.blockchainItems.serviceConfig;
      
      // Создаем сервис на лету
      const service = createService(network, apiKey);
      
      const { userAddress, forceRefresh = false } = params;
      const data = await service.getItemsData(userAddress, forceRefresh);
      
      return { data, userAddress };
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.message || 'Ошибка загрузки итемов');
    }
  }
);

/**
 * Загрузка proxy субдоменов пользователя
 */
export const loadUserProxySubdomains = createAsyncThunk(
  'blockchainItems/loadUserProxySubdomains',
  async (params: { userAddress: string; forceRefresh?: boolean }, thunkAPI) => {
    try {
      const state = thunkAPI.getState() as { blockchainItems: BlockchainItemsState };
      const { network, apiKey } = state.blockchainItems.serviceConfig;
      
      // Создаем сервис на лету
      const service = createService(network, apiKey);
      
      const { userAddress, forceRefresh = false } = params;
      const data = await service.getUserProxySubdomains(userAddress, forceRefresh);
      
      return { data, userAddress };
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.message || 'Ошибка загрузки proxy субдоменов');
    }
  }
);

/**
 * Загрузка SBT субдоменов пользователя
 */
export const loadUserSBTSubdomains = createAsyncThunk(
  'blockchainItems/loadUserSBTSubdomains',
  async (params: { userAddress: string; forceRefresh?: boolean }, thunkAPI) => {
    try {
      const state = thunkAPI.getState() as { blockchainItems: BlockchainItemsState };
      const { network, apiKey } = state.blockchainItems.serviceConfig;
      
      // Создаем сервис на лету
      const service = createService(network, apiKey);
      
      const { userAddress, forceRefresh = false } = params;
      const data = await service.getUserSBTSubdomains(userAddress, forceRefresh);
      
      return { data, userAddress };
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.message || 'Ошибка загрузки SBT субдоменов');
    }
  }
);

export const loadUserSBTCollections = createAsyncThunk(
  'blockchainItems/loadUserSBTCollections',
  async (params: { userAddress: string; forceRefresh?: boolean }, thunkAPI) => {
    const state = thunkAPI.getState() as { blockchainItems: BlockchainItemsState };
    const { network, apiKey } = state.blockchainItems.serviceConfig;
    const service = createService(network, apiKey);

    const { userAddress, forceRefresh = false } = params;
    const collections = await service.getUserSBTCollections(userAddress, forceRefresh);
    return { collections, userAddress };
  }
);


/**
 * Загрузка NFT оберток пользователя
 */
export const loadUserNFTWrappers = createAsyncThunk(
  'blockchainItems/loadUserNFTWrappers',
  async (params: { userAddress: string; forceRefresh?: boolean }, thunkAPI) => {
    try {
      const state = thunkAPI.getState() as { blockchainItems: BlockchainItemsState };
      const { network, apiKey } = state.blockchainItems.serviceConfig;
      
      // Создаем сервис на лету
      const service = createService(network, apiKey);
      
      const { userAddress, forceRefresh = false } = params;
      const data = await service.getUserNFTWrappers(userAddress, forceRefresh);
      
      return { data, userAddress };
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.message || 'Ошибка загрузки NFT оберток');
    }
  }
);

// ==================== SLICE ====================

const blockchainItemsSlice = createSlice({
  name: 'blockchainItems',
  initialState,
  reducers: {
    // Сброс состояния
    resetState: () => initialState,
    
    // Установка сети
    setNetwork: (state, action: PayloadAction<NetworkType>) => {
      state.network = action.payload;
      state.serviceConfig.network = action.payload;
      state.serviceConfig.isInitialized = false; // При смене сети нужно переинициализировать
    },
    
    // Установка API ключа
    setApiKey: (state, action: PayloadAction<string>) => {
      state.serviceConfig.apiKey = action.payload;
      state.serviceConfig.isInitialized = false; // При смене ключа нужно переинициализировать
    },
    
    // Установка пользователя
    setUserAddress: (state, action: PayloadAction<string | null>) => {
      state.currentUserAddress = action.payload;
    },
    
    // Очистка ошибки
    clearError: (state) => {
      state.error = null;
    },
    
    // Обновление отдельных списков
    updateProxySubdomains: (state, action: PayloadAction<SimpleEnrichedItem[]>) => {
      state.proxySubdomains = action.payload;
    },
    
    updateSBTSubdomains: (state, action: PayloadAction<SimpleEnrichedItem[]>) => {
      state.sbtSubdomains = action.payload;
    },
    
    updateNFTWrappers: (state, action: PayloadAction<SimpleEnrichedItem[]>) => {
      state.nftWrappers = action.payload;
    },
    
    // Фильтрация
    filterByCollection: (state, action: PayloadAction<string>) => {
      const collectionAddress = action.payload;
      
      state.proxySubdomains = state.allItems.filter(
        item => item.type === 'proxy_subdomain' && item.collection_address === collectionAddress
      );
      
      state.sbtSubdomains = state.allItems.filter(
        item => item.type === 'sbt_subdomain' && item.collection_address === collectionAddress
      );
      
      state.nftWrappers = state.allItems.filter(
        item => item.type === 'nft_wrapper' && item.collection_address === collectionAddress
      );
    },
    
    filterByZone: (state, action: PayloadAction<string>) => {
      const zone = action.payload;

      state.proxySubdomains = state.allItems.filter(
        item => item.type === 'proxy_subdomain' && item.zone === zone
      );

      state.sbtSubdomains = state.allItems.filter(
        item => item.type === 'sbt_subdomain' && item.zone === zone
      );
    },

    // Сразу после успешного деплоя зоны на фронте — не ждать 15-мин цикл
    // кроулера/TTL стора, иначе селектор зоны на странице создания
    // субдомена окажется пустым сразу после того, как юзер только что
    // создал зону (upsert на бэкенд — отдельно, см. platformCacheClient).
    addOptimisticCollection: (state, action: PayloadAction<SimpleCollection>) => {
      const collection = action.payload;
      if (state.allCollections.some((c) => c.address === collection.address)) return;
      state.allCollections.push(collection);
      if (collection.type === 'proxy') {
        state.proxyCollections.push(collection);
      } else if (collection.type === 'sbt') {
        state.sbtCollections.push(collection);
      }
    },
  },
  extraReducers: (builder) => {
    // ==================== INITIALIZE SERVICE ====================
    
    builder.addCase(initializeService.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    
    builder.addCase(initializeService.fulfilled, (state, action) => {
      const { network, apiKey, isInitialized, userAddress: currentWalletAddress } = action.payload;

      state.serviceConfig = {
        network,
        apiKey,
        isInitialized
      };

      state.network = network;
      state.isLoading = false;
      state.error = null;

      // Гидрация из localStorage: пока сеть ещё не ответила на текущий
      // loadAllAppData, компоненты уже видят последний известный снимок
      // через селекторы — без этого при каждой жёсткой перезагрузке
      // страницы приходилось заново гонять полный ончейн-скан.
      if (!state.appData) {
        const persisted = loadPersistedAppData(network);
        if (persisted) {
          const { data, userAddress: persistedUserAddress, savedAt } = persisted;
          // Снапшот принадлежал другому кошельку (например, ранее подключённому
          // на этом же устройстве) — общие (не привязанные к юзеру) коллекции/
          // итемы всё равно валидны и их можно показать сразу, но user-scoped
          // массивы обязаны остаться пустыми, иначе UI на секунду покажет
          // субдомены/зоны чужого адреса до того, как отработает реальный рефетч.
          const sameUser = persistedUserAddress === currentWalletAddress;

          state.appData = data;
          state.allCollections = data.allCollections;
          state.proxyCollections = data.proxyCollections;
          state.sbtCollections = data.sbtCollections;
          state.nftWrapperCollections = data.nftWrapperCollections;
          state.allItems = data.allItems;
          state.proxySubdomains = data.proxySubdomains;
          state.sbtSubdomains = data.sbtSubdomains;
          state.nftWrappers = data.nftWrappers;
          state.userProxySubdomains = sameUser ? data.userProxySubdomains : [];
          state.userSBTSubdomains = sameUser ? data.userSBTSubdomains : [];
          state.userNFTWrappers = sameUser ? data.userNFTWrappers : [];
          state.lastUpdated = new Date(savedAt).toISOString();
          state.currentUserAddress = sameUser ? persistedUserAddress : currentWalletAddress;
        }
      }

      console.log('✅ Сервис инициализирован в Redux:', {
        network,
        hasApiKey: !!apiKey,
        isInitialized,
        hydratedFromStorage: !!state.appData
      });
    });
    
    builder.addCase(initializeService.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string || 'Ошибка инициализации сервиса';
      state.serviceConfig.isInitialized = false;
    });
    
    // ==================== LOAD ALL APP DATA ====================
    
    builder.addCase(loadAllAppData.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    
    builder.addCase(loadAllAppData.fulfilled, (state, action) => {
      const { data, userAddress } = action.payload;
      
      state.appData = data;
      
      // Коллекции
      state.allCollections = data.allCollections;
      state.proxyCollections = data.proxyCollections;
      state.sbtCollections = data.sbtCollections;
      state.nftWrapperCollections = data.nftWrapperCollections;
      
      // Итемы
      state.allItems = data.allItems;
      state.proxySubdomains = data.proxySubdomains;
      state.sbtSubdomains = data.sbtSubdomains;
      state.nftWrappers = data.nftWrappers;
      
      // Итемы пользователя
      state.userProxySubdomains = data.userProxySubdomains;
      state.userSBTSubdomains = data.userSBTSubdomains;
      state.userNFTWrappers = data.userNFTWrappers;
      
      // Метаданные
      state.lastUpdated = data.lastUpdated;
      state.currentUserAddress = userAddress || null;
      state.hasFetchedThisSession = true;

      state.isLoading = false;
      state.isRefreshing = false;
    });
    
    builder.addCase(loadAllAppData.rejected, (state, action) => {
      state.isLoading = false;
      state.isRefreshing = false;
      state.error = action.payload as string || 'Ошибка загрузки данных';
    });
    
    // ==================== LOAD COLLECTIONS DATA ====================
    
    builder.addCase(loadCollectionsData.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    
    builder.addCase(loadCollectionsData.fulfilled, (state, action) => {
      const { data } = action.payload;
      
      // Коллекции
      state.allCollections = data.allCollections;
      state.proxyCollections = data.proxyCollections;
      state.sbtCollections = data.sbtCollections;
      state.nftWrapperCollections = data.nftWrapperCollections;
      
      state.isLoading = false;
    });
    
    builder.addCase(loadCollectionsData.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string || 'Ошибка загрузки коллекций';
    });
    
    
    // ==================== LOAD ITEMS DATA ====================
    
    builder.addCase(loadItemsData.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    
    builder.addCase(loadItemsData.fulfilled, (state, action) => {
      const { data, userAddress } = action.payload;
      
      // Итемы
      state.allItems = data.allItems;
      state.proxySubdomains = data.proxySubdomains;
      state.sbtSubdomains = data.sbtSubdomains;
      state.nftWrappers = data.nftWrappers;
      
      // Итемы пользователя
      state.userProxySubdomains = data.userProxySubdomains;
      state.userSBTSubdomains = data.userSBTSubdomains;
      state.userNFTWrappers = data.userNFTWrappers;
      
      state.currentUserAddress = userAddress || null;
      state.isLoading = false;
    });
    
    builder.addCase(loadItemsData.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string || 'Ошибка загрузки итемов';
    });
    
    // ==================== LOAD USER PROXY SUBDOMAINS ====================
    
    builder.addCase(loadUserProxySubdomains.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    
    builder.addCase(loadUserProxySubdomains.fulfilled, (state, action) => {
      const { data, userAddress } = action.payload;
      
      state.userProxySubdomains = data;
      state.currentUserAddress = userAddress;
      state.isLoading = false;
      state.lastUpdated = new Date().toISOString();
    });
    
    builder.addCase(loadUserProxySubdomains.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string || 'Ошибка загрузки proxy субдоменов';
    });
    
    // ==================== LOAD USER SBT SUBDOMAINS ====================
    
    builder.addCase(loadUserSBTSubdomains.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    
    builder.addCase(loadUserSBTSubdomains.fulfilled, (state, action) => {
      const { data, userAddress } = action.payload;
      
      state.userSBTSubdomains = data;
      state.currentUserAddress = userAddress;
      state.isLoading = false;
      state.lastUpdated = new Date().toISOString();
    });
    
    builder.addCase(loadUserSBTSubdomains.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string || 'Ошибка загрузки SBT субдоменов';
    });
    
    // ==================== LOAD USER NFT WRAPPERS ====================
    
    builder.addCase(loadUserNFTWrappers.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    
    builder.addCase(loadUserNFTWrappers.fulfilled, (state, action) => {
      const { data, userAddress } = action.payload;
      
      state.userNFTWrappers = data;
      state.currentUserAddress = userAddress;
      state.isLoading = false;
      state.lastUpdated = new Date().toISOString();
    });
    
    builder.addCase(loadUserNFTWrappers.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string || 'Ошибка загрузки NFT оберток';
    });
  }
});

// ==================== SELECTORS ====================

// Основные селекторы
export const selectAppData = (state: { blockchainItems: BlockchainItemsState }) => 
  state.blockchainItems.appData;

export const selectAllCollections = (state: { blockchainItems: BlockchainItemsState }) => 
  state.blockchainItems.allCollections;

export const selectProxyCollections = (state: { blockchainItems: BlockchainItemsState }) => 
  state.blockchainItems.proxyCollections;

export const selectSBTCollections = (state: { blockchainItems: BlockchainItemsState }) => 
  state.blockchainItems.sbtCollections;

export const selectNFTWrapperCollections = (state: { blockchainItems: BlockchainItemsState }) => 
  state.blockchainItems.nftWrapperCollections;

export const selectAllItems = (state: { blockchainItems: BlockchainItemsState }) => 
  state.blockchainItems.allItems;

export const selectProxySubdomains = (state: { blockchainItems: BlockchainItemsState }) => 
  state.blockchainItems.proxySubdomains;

export const selectSBTSubdomains = (state: { blockchainItems: BlockchainItemsState }) => 
  state.blockchainItems.sbtSubdomains;

export const selectNFTWrappers = (state: { blockchainItems: BlockchainItemsState }) => 
  state.blockchainItems.nftWrappers;

export const selectUserProxySubdomains = (state: { blockchainItems: BlockchainItemsState }) => 
  state.blockchainItems.userProxySubdomains;

export const selectUserSBTSubdomains = (state: { blockchainItems: BlockchainItemsState }) => 
  state.blockchainItems.userSBTSubdomains;

export const selectUserNFTWrappers = (state: { blockchainItems: BlockchainItemsState }) => 
  state.blockchainItems.userNFTWrappers;

// Селекторы состояния
export const selectIsLoading = (state: { blockchainItems: BlockchainItemsState }) => 
  state.blockchainItems.isLoading;

export const selectIsRefreshing = (state: { blockchainItems: BlockchainItemsState }) => 
  state.blockchainItems.isRefreshing;

export const selectError = (state: { blockchainItems: BlockchainItemsState }) => 
  state.blockchainItems.error;

export const selectNetwork = (state: { blockchainItems: BlockchainItemsState }) => 
  state.blockchainItems.network;

export const selectLastUpdated = (state: { blockchainItems: BlockchainItemsState }) =>
  state.blockchainItems.lastUpdated;

export const selectHasFetchedThisSession = (state: { blockchainItems: BlockchainItemsState }) =>
  state.blockchainItems.hasFetchedThisSession;

export const selectCurrentUserAddress = (state: { blockchainItems: BlockchainItemsState }) =>
  state.blockchainItems.currentUserAddress;

// Селекторы конфигурации сервиса
export const selectServiceConfig = (state: { blockchainItems: BlockchainItemsState }) => 
  state.blockchainItems.serviceConfig;

export const selectIsServiceInitialized = (state: { blockchainItems: BlockchainItemsState }) => 
  state.blockchainItems.serviceConfig.isInitialized;

export const selectApiKey = (state: { blockchainItems: BlockchainItemsState }) => 
  state.blockchainItems.serviceConfig.apiKey;

// Утилитарные селекторы
export const selectCollectionsByType = (type: CollectionType) => 
  (state: { blockchainItems: BlockchainItemsState }) => {
    switch (type) {
      case 'proxy': return state.blockchainItems.proxyCollections;
      case 'sbt': return state.blockchainItems.sbtCollections;
      case 'nft_wrapper': return state.blockchainItems.nftWrapperCollections;
      default: return [];
    }
  };

export const selectItemsByType = (type: 'proxy_subdomain' | 'sbt_subdomain' | 'nft_wrapper') => 
  (state: { blockchainItems: BlockchainItemsState }) => {
    switch (type) {
      case 'proxy_subdomain': return state.blockchainItems.proxySubdomains;
      case 'sbt_subdomain': return state.blockchainItems.sbtSubdomains;
      case 'nft_wrapper': return state.blockchainItems.nftWrappers;
      default: return [];
    }
  };

export const selectUserItemsByType = (type: 'proxy_subdomain' | 'sbt_subdomain' | 'nft_wrapper') => 
  (state: { blockchainItems: BlockchainItemsState }) => {
    switch (type) {
      case 'proxy_subdomain': return state.blockchainItems.userProxySubdomains;
      case 'sbt_subdomain': return state.blockchainItems.userSBTSubdomains;
      case 'nft_wrapper': return state.blockchainItems.userNFTWrappers;
      default: return [];
    }
  };

// Статистика
export const selectStats = (state: { blockchainItems: BlockchainItemsState }) => {
  const items = state.blockchainItems;
  
  return {
    totalCollections: items.allCollections.length,
    totalProxyCollections: items.proxyCollections.length,
    totalSBTCollections: items.sbtCollections.length,
    totalNFTWrapperCollections: items.nftWrapperCollections.length,
    
    totalItems: items.allItems.length,
    totalProxySubdomains: items.proxySubdomains.length,
    totalSBTSubdomains: items.sbtSubdomains.length,
    totalNFTWrappers: items.nftWrappers.length,
    
    totalUserProxySubdomains: items.userProxySubdomains.length,
    totalUserSBTSubdomains: items.userSBTSubdomains.length,
    totalUserNFTWrappers: items.userNFTWrappers.length,
    
    lastUpdated: items.lastUpdated,
    isServiceInitialized: items.serviceConfig.isInitialized,
    hasApiKey: !!items.serviceConfig.apiKey
  };
};

// ==================== ЭКСПОРТ ====================

export const {
  resetState,
  setNetwork,
  setApiKey,
  setUserAddress,
  clearError,
  updateProxySubdomains,
  updateSBTSubdomains,
  updateNFTWrappers,
  filterByCollection,
  filterByZone,
  addOptimisticCollection
} = blockchainItemsSlice.actions;

export default blockchainItemsSlice.reducer;
