

/**
 * Redux slice для управления состоянием blockchain items
 * Исправленная версия без non-serializable value
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AppData, SimpleEnrichedItem, SimpleCollection, NetworkType, CollectionType } from './blockchain-items-types';
import { UniversalBlockchainService } from './universal-blockchain-service';

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
  async (params: { network?: NetworkType; apiKey?: string }, thunkAPI) => {
    try {
      const { network = 'testnet', apiKey } = params;
      
      // Создаем сервис
     // const _service = createService(network, apiKey);
      
      // Просто создаем сервис без тестирования подключения
      // (метод testConnection не существует)
      console.log('✅ Сервис создан успешно');
      
      // Возвращаем только конфигурацию, а не сам сервис
      return { 
        network, 
        apiKey,
        isInitialized: true 
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
      
      // Создаем сервис на лету
      const service = createService(network, apiKey);
      
      const { userAddress, forceRefresh = false } = params;
      const data = await service.getAllAppData(userAddress, forceRefresh);
      
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
    }
  },
  extraReducers: (builder) => {
    // ==================== INITIALIZE SERVICE ====================
    
    builder.addCase(initializeService.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    
    builder.addCase(initializeService.fulfilled, (state, action) => {
      const { network, apiKey, isInitialized } = action.payload;
      
      state.serviceConfig = {
        network,
        apiKey,
        isInitialized
      };
      
      state.network = network;
      state.isLoading = false;
      state.error = null;
      
      console.log('✅ Сервис инициализирован в Redux:', {
        network,
        hasApiKey: !!apiKey,
        isInitialized
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
  filterByZone
} = blockchainItemsSlice.actions;

export default blockchainItemsSlice.reducer;
