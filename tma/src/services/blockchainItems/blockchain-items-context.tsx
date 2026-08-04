
/**
 * React Context для удобного доступа к blockchain items
 * Обновленный с учетом новой логики
 */


//tma/src/services/blockchainItems/blockchain-items-context.tsx
import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTonWallet } from '@tonconnect/ui-react';
import {
  initializeService,
  loadAllAppData,
  loadCollectionsData,
  loadItemsData,
  loadUserProxySubdomains,
  loadUserSBTSubdomains,
  loadUserNFTWrappers,
  setNetwork,
  setUserAddress,
  clearError,
  filterByCollection,
  filterByZone,
  
  // Селекторы
  selectAppData,
  selectAllCollections,
  selectProxyCollections,
  selectSBTCollections,
  selectNFTWrapperCollections,
  selectAllItems,
  selectProxySubdomains,
  selectSBTSubdomains,
  selectNFTWrappers,
  selectUserProxySubdomains,
  selectUserSBTSubdomains,
  selectUserNFTWrappers,
  selectIsLoading,
  selectIsRefreshing,
  selectError,
  selectNetwork,
  selectLastUpdated,
  selectHasFetchedThisSession,
  selectCurrentUserAddress,
  selectStats,
  selectCollectionsByType,
  selectItemsByType,
  selectUserItemsByType,
  selectIsServiceInitialized,
  selectServiceConfig,
  CACHE_TTL_MS
} from './blockchain-items-slice';
import { AppDispatch } from '@/store/store';
import { NetworkType, ItemType, CollectionType, SimpleCollection, SimpleEnrichedItem } from './blockchain-items-types';

// ==================== ТИПЫ КОНТЕКСТА ====================

interface BlockchainItemsContextType {
  // Данные
  appData: ReturnType<typeof selectAppData>;
  allCollections: ReturnType<typeof selectAllCollections>;
  proxyCollections: ReturnType<typeof selectProxyCollections>;
  sbtCollections: ReturnType<typeof selectSBTCollections>;
  nftWrapperCollections: ReturnType<typeof selectNFTWrapperCollections>;
  
  allItems: ReturnType<typeof selectAllItems>;
  proxySubdomains: ReturnType<typeof selectProxySubdomains>;
  sbtSubdomains: ReturnType<typeof selectSBTSubdomains>;
  nftWrappers: ReturnType<typeof selectNFTWrappers>;
  
  userProxySubdomains: ReturnType<typeof selectUserProxySubdomains>;
  userSBTSubdomains: ReturnType<typeof selectUserSBTSubdomains>;
  userNFTWrappers: ReturnType<typeof selectUserNFTWrappers>;
  
  // Состояние
  isLoading: ReturnType<typeof selectIsLoading>;
  isRefreshing: ReturnType<typeof selectIsRefreshing>;
  error: ReturnType<typeof selectError>;
  network: ReturnType<typeof selectNetwork>;
  lastUpdated: ReturnType<typeof selectLastUpdated>;
  currentUserAddress: ReturnType<typeof selectCurrentUserAddress>;
  isServiceInitialized: ReturnType<typeof selectIsServiceInitialized>;
  serviceConfig: ReturnType<typeof selectServiceConfig>;

  isTestnet: boolean;
  
  // Статистика
  stats: ReturnType<typeof selectStats>;
  
  // Действия
  initialize: (network?: NetworkType, apiKey?: string) => Promise<void>;
  loadAllData: (forceRefresh?: boolean) => Promise<void>;
  ensureData: () => Promise<void>;
  loadCollections: (forceRefresh?: boolean) => Promise<void>;
  loadItems: (forceRefresh?: boolean) => Promise<void>;
  loadUserProxyItems: () => Promise<void>;
  loadUserSBTItems: () => Promise<void>;
  loadUserNFTItems: () => Promise<void>;
  setCurrentNetwork: (network: NetworkType) => void;
  setCurrentUser: (address: string | null) => void;
  clearCurrentError: () => void;
  filterItemsByCollection: (collectionAddress: string) => void;
  filterItemsByZone: (zone: string) => void;
  
  // Утилиты
  getCollectionsByType: (type: CollectionType) => SimpleCollection[];
  getItemsByType: (type: ItemType) => SimpleEnrichedItem[];
  getUserItemsByType: (type: ItemType) => SimpleEnrichedItem[];
}

// ==================== СОЗДАНИЕ КОНТЕКСТА ====================

const BlockchainItemsContext = createContext<BlockchainItemsContextType | undefined>(undefined);

// ==================== ПРОВАЙДЕР ====================

interface BlockchainItemsProviderProps {
  children: React.ReactNode;
  autoInitialize?: boolean;
  defaultNetwork?: NetworkType;
  apiKey?: string;
}

export const BlockchainItemsProvider: React.FC<BlockchainItemsProviderProps> = ({
  children,
  autoInitialize = true,
  defaultNetwork = 'mainnet',
  apiKey
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const wallet = useTonWallet();

  // ⭐ Автоопределение сети: если chain === "-3" — testnet, иначе mainnet
  const isTestnet = wallet?.account?.chain === '-3';
  const resolvedNetwork: NetworkType = isTestnet ? 'testnet' : 'mainnet';
  
  // Селекторы
  const appData = useSelector(selectAppData);
  const allCollections = useSelector(selectAllCollections);
  const proxyCollections = useSelector(selectProxyCollections);
  const sbtCollections = useSelector(selectSBTCollections);
  const nftWrapperCollections = useSelector(selectNFTWrapperCollections);
  
  const allItems = useSelector(selectAllItems);
  const proxySubdomains = useSelector(selectProxySubdomains);
  const sbtSubdomains = useSelector(selectSBTSubdomains);
  const nftWrappers = useSelector(selectNFTWrappers);
  
  const userProxySubdomains = useSelector(selectUserProxySubdomains);
  const userSBTSubdomains = useSelector(selectUserSBTSubdomains);
  const userNFTWrappers = useSelector(selectUserNFTWrappers);
  
  const isLoading = useSelector(selectIsLoading);
  const isRefreshing = useSelector(selectIsRefreshing);
  const error = useSelector(selectError);
  const network = useSelector(selectNetwork);
  const lastUpdated = useSelector(selectLastUpdated);
  const hasFetchedThisSession = useSelector(selectHasFetchedThisSession);
  const currentUserAddress = useSelector(selectCurrentUserAddress);
  const isServiceInitialized = useSelector(selectIsServiceInitialized);
  const serviceConfig = useSelector(selectServiceConfig);
  
  const stats = useSelector(selectStats);
  
  // ==================== ДЕЙСТВИЯ ====================
  
  // Завязано на wallet?.account?.address (примитив), а не на весь объект
  // wallet — у TonConnect SDK он не гарантированно стабилен по ссылке между
  // рендерами, и колбэк, зависящий от него целиком, мог пересоздаваться чаще,
  // чем логически менялся сам адрес кошелька.
  const walletAddress = wallet?.account?.address || null;

  const initialize = useCallback(async (initNetwork?: NetworkType, initApiKey?: string) => {
    await dispatch(initializeService({
      network: initNetwork || resolvedNetwork,
      apiKey: initApiKey || apiKey,
      userAddress: walletAddress
    })).unwrap();
  }, [dispatch, network, apiKey, walletAddress]);

  const loadAllData = useCallback(async (forceRefresh = false) => {
    await dispatch(loadAllAppData({
      userAddress: walletAddress || undefined,
      forceRefresh
    })).unwrap();
  }, [dispatch, walletAddress]);

  /**
   * Вызывать вместо loadAllData() в эффектах монтирования страниц/виджетов.
   * Пропускаем сетевой запрос только если данные уже реально загружались по
   * сети В ЭТОЙ ЖЕ сессии вкладки (hasFetchedThisSession) — гидрация из
   * localStorage сама по себе НЕ считается "свежей" для этой проверки: она
   * лишь даёт что показать мгновенно при холодном старте, но может быть
   * неполной/устаревшей относительно того, что изменилось на чейне только
   * что (например, юзер только что задеплоил новую зону) — если полагаться
   * только на TTL снимка, стор может молча простоять на этих неполных данных
   * до 20 минут, и всё, что ищет "есть ли уже такой-то итем/коллекция"
   * (аукционы, проверка существующей зоны) не найдёт то, что реально есть.
   */
  const ensureData = useCallback(async () => {
    const isFresh =
      hasFetchedThisSession &&
      !!appData &&
      !!lastUpdated &&
      Date.now() - new Date(lastUpdated).getTime() < CACHE_TTL_MS &&
      network === resolvedNetwork &&
      currentUserAddress === walletAddress;

    if (isFresh) return;

    await loadAllData();
  }, [appData, lastUpdated, hasFetchedThisSession, network, resolvedNetwork, currentUserAddress, walletAddress, loadAllData]);

  const loadCollections = useCallback(async (forceRefresh = false) => {
    await dispatch(loadCollectionsData({ forceRefresh })).unwrap();
  }, [dispatch]);
  
  const loadItems = useCallback(async (forceRefresh = false) => {
    const userAddress = wallet?.account?.address || null;
    
    await dispatch(loadItemsData({
      userAddress: userAddress || undefined,
      forceRefresh
    })).unwrap();
  }, [dispatch, wallet]);
  
  const loadUserProxyItems = useCallback(async () => {
    if (!wallet?.account?.address) return;
    
    await dispatch(loadUserProxySubdomains({
      userAddress: wallet.account.address,
      forceRefresh: true
    })).unwrap();
  }, [dispatch, wallet]);
  
  const loadUserSBTItems = useCallback(async () => {
    if (!wallet?.account?.address) return;
    
    await dispatch(loadUserSBTSubdomains({
      userAddress: wallet.account.address,
      forceRefresh: true
    })).unwrap();
  }, [dispatch, wallet]);
  
  const loadUserNFTItems = useCallback(async () => {
    if (!wallet?.account?.address) return;
    
    await dispatch(loadUserNFTWrappers({
      userAddress: wallet.account.address,
      forceRefresh: true
    })).unwrap();
  }, [dispatch, wallet]);
  
  const setCurrentNetwork = useCallback((newNetwork: NetworkType) => {
    dispatch(setNetwork(newNetwork));
  }, [dispatch]);
  
  const setCurrentUser = useCallback((address: string | null) => {
    dispatch(setUserAddress(address));
  }, [dispatch]);
  
  const clearCurrentError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);
  
  const filterItemsByCollection = useCallback((collectionAddress: string) => {
    dispatch(filterByCollection(collectionAddress));
  }, [dispatch]);
  
  const filterItemsByZone = useCallback((zone: string) => {
    dispatch(filterByZone(zone));
  }, [dispatch]);
  
  // ==================== УТИЛИТЫ ====================
  
  const getCollectionsByType = useCallback((type: CollectionType): SimpleCollection[] => {
    const selector = selectCollectionsByType(type);
    return useSelector(selector);
  }, []);
  
  const getItemsByType = useCallback((type: ItemType): SimpleEnrichedItem[] => {
    const selector = selectItemsByType(type);
    return useSelector(selector);
  }, []);
  
  const getUserItemsByType = useCallback((type: ItemType): SimpleEnrichedItem[] => {
    const selector = selectUserItemsByType(type);
    return useSelector(selector);
  }, []);
  

  // ==================== ЭФФЕКТЫ ====================

// Автоматическая инициализация при монтировании
useEffect(() => {
  if (autoInitialize && !isServiceInitialized) {
    initialize(defaultNetwork, apiKey);
  }
}, [autoInitialize, isServiceInitialized, initialize, defaultNetwork, apiKey]);

// Обновление пользователя при изменении кошелька
useEffect(() => {
  if (wallet?.account?.address) {
    setCurrentUser(wallet.account.address);
  } else {
    setCurrentUser(null);
  }
}, [wallet, setCurrentUser]);

// Автоопределение сети из кошелька при подключении/смене
const walletChain = wallet?.account?.chain;

useEffect(() => {
  if (!walletChain) return; // кошелёк не подключён — ничего не делаем

  const resolvedNetwork: NetworkType = walletChain === '-3' ? 'testnet' : 'mainnet';
  
  if (isServiceInitialized && network !== resolvedNetwork) {
    console.log(`🔄 Смена сети: ${network} → ${resolvedNetwork} (chain: ${walletChain})`);
    setCurrentNetwork(resolvedNetwork);
    initialize(resolvedNetwork, apiKey);
  }
}, [walletChain, isServiceInitialized, network, apiKey, setCurrentNetwork, initialize]);

  
  // ==================== КОНТЕКСТНОЕ ЗНАЧЕНИЕ ====================
  
  const contextValue: BlockchainItemsContextType = {
    // Данные
    appData,
    allCollections,
    proxyCollections,
    sbtCollections,
    nftWrapperCollections,
    allItems,
    proxySubdomains,
    sbtSubdomains,
    nftWrappers,
    userProxySubdomains,
    userSBTSubdomains,
    userNFTWrappers,
    
    // Состояние
    isLoading,
    isRefreshing,
    error,
    network,
    lastUpdated,
    currentUserAddress,
    isServiceInitialized,
    serviceConfig,
    isTestnet, 

    // Статистика
    stats,
    
    // Действия
    initialize,
    loadAllData,
    ensureData,
    loadCollections,
    loadItems,
    loadUserProxyItems,
    loadUserSBTItems,
    loadUserNFTItems,
    setCurrentNetwork,
    setCurrentUser,
    clearCurrentError,
    filterItemsByCollection,
    filterItemsByZone,
    
    // Утилиты
    getCollectionsByType,
    getItemsByType,
    getUserItemsByType
  };
  
  return (
    <BlockchainItemsContext.Provider value={contextValue}>
      {children}
    </BlockchainItemsContext.Provider>
  );
};

// ==================== ХУК ДЛЯ ИСПОЛЬЗОВАНИЯ ====================

export const useBlockchainItems = (): BlockchainItemsContextType => {
  const context = useContext(BlockchainItemsContext);
  
  if (context === undefined) {
    throw new Error('useBlockchainItems must be used within a BlockchainItemsProvider');
  }
  
  return context;
};

// ==================== СПЕЦИАЛИЗИРОВАННЫЕ ХУКИ ====================

/**
 * Хук для работы с коллекциями
 */
export const useCollections = () => {
  const { 
    allCollections, 
    proxyCollections, 
    sbtCollections, 
    nftWrapperCollections,
    getCollectionsByType,
    loadCollections,
    isLoading,
    error 
  } = useBlockchainItems();
  
  return {
    allCollections,
    proxyCollections,
    sbtCollections,
    nftWrapperCollections,
    getCollectionsByType,
    loadCollections,
    isLoading,
    error
  };
};

/**
 * Хук для работы с proxy субдоменами
 */
export const useProxySubdomains = () => {
  const { 
    proxySubdomains, 
    userProxySubdomains,
    loadItems,
    loadUserProxyItems,
    isLoading,
    isRefreshing,
    error 
  } = useBlockchainItems();
  
  return {
    all: proxySubdomains,
    user: userProxySubdomains,
    loadItems,
    loadUserProxyItems,
    isLoading,
    isRefreshing,
    error
  };
};

/**
 * Хук для работы с SBT субдоменами
 */
export const useSBTSubdomains = () => {
  const { 
    sbtSubdomains, 
    userSBTSubdomains,
    loadItems,
    loadUserSBTItems,
    isLoading,
    isRefreshing,
    error 
  } = useBlockchainItems();
  
  return {
    all: sbtSubdomains,
    user: userSBTSubdomains,
    loadItems,
    loadUserSBTItems,
    isLoading,
    isRefreshing,
    error
  };
};

/**
 * Хук для работы с NFT обертками
 */
export const useNFTWrappers = () => {
  const { 
    nftWrappers, 
    userNFTWrappers,
    loadItems,
    loadUserNFTItems,
    isLoading,
    isRefreshing,
    error 
  } = useBlockchainItems();
  
  return {
    all: nftWrappers,
    user: userNFTWrappers,
    loadItems,
    loadUserNFTItems,
    isLoading,
    isRefreshing,
    error
  };
};

/**
 * Хук для работы с маркетом (proxy субдомены + NFT обертки)
 */
export const useMarketData = () => {
  const { 
    proxySubdomains, 
    nftWrappers,
    loadAllData,
    isLoading,
    error,
    stats 
  } = useBlockchainItems();
  
  return {
    proxySubdomains,
    nftWrappers,
    loadAllData,
    isLoading,
    error,
    stats
  };
};

/**
 * Хук для работы с данными пользователя
 */
export const useUserData = () => {
  const { 
    userProxySubdomains, 
    userSBTSubdomains, 
    userNFTWrappers,
    currentUserAddress,
    loadUserProxyItems,
    loadUserSBTItems,
    loadUserNFTItems,
    isRefreshing,
    error 
  } = useBlockchainItems();
  
  return {
    proxySubdomains: userProxySubdomains,
    sbtSubdomains: userSBTSubdomains,
    nftWrappers: userNFTWrappers,
    userAddress: currentUserAddress,
    loadUserProxyItems,
    loadUserSBTItems,
    loadUserNFTItems,
    isRefreshing,
    error,
    hasData: userProxySubdomains.length > 0 || userSBTSubdomains.length > 0 || userNFTWrappers.length > 0
  };
};

// ==================== ЭКСПОРТ ====================

export default BlockchainItemsContext;