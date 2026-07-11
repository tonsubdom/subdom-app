/**
 * TON Center API Configuration - Исправленная версия
 * Только PLATFORM_OWNER и NFT_WRAPPER_COLLECTION как исходные данные
 */

// ==================== КОНФИГУРАЦИЯ СЕТЕЙ ====================

export interface NetworkConfig {
  API_URL: string;
  API_KEY?: string;
  DEFAULT_ADDRESSES: {
    PLATFORM_OWNER: string;        // Владелец платформы - от него получаем все коллекции
    NFT_WRAPPER_COLLECTION: string; // NFT Wrapper коллекция
  };
  CODE_HASHES: {
    // Коллекции (определяем по code_hash)
    PROXY_COLLECTION: string;      // Определяем динамически
    SBT_COLLECTION: string;        // Определяем динамически
    NFT_WRAPPER_COLLECTION: string; // Известен заранее
    
    // Итемы
    PROXY_SUBDOMAIN: string;
    PROXY_SUBDOMAIN_NEW: string; 
    SBT_SUBDOMAIN: string;
    NFT_WRAPPER: string;
  };
}

export interface GetItemsByCollectionResponse {
  nft_items: any[];
  metadata?: Record<string, any>; // ← ДОБАВИТЬ!
  address_book?: Record<string, any>; // ← ДОБАВИТЬ!
}

export const NETWORK_CONFIGS: Record<'mainnet' | 'testnet', NetworkConfig> = {
  testnet: {
    API_URL: 'https://testnet.toncenter.com/api/v3',
    // API_KEY: process.env.REACT_APP_TONCENTER_API_KEY,
    API_KEY: "129c5dfcac700a20e4905ee453be6e2406f941e12c128a738497d5dfc80bdf5d",
    DEFAULT_ADDRESSES: {
      PLATFORM_OWNER: '0:2cbb9de88c03a6448aa4263b5230faf2aae330fa1c75329f21a9d2270cb7b5a8',
      NFT_WRAPPER_COLLECTION: '0:CB5877BFF6DF7699CCCF5A31D99D778491B6C99FB5EBBEDEB4F373CA7F1D341B'
    },
    CODE_HASHES: {
      // Коллекции (code_hash для определения типа)
      
      PROXY_COLLECTION: '4PDeUC50/mj9CteuqQR+GXnpzVXLbHltMSG/sOav+mM=', // Proxy коллекция
      SBT_COLLECTION: 'DPYRDOevq89GsCNAqMcohG4Xt94Xf/43b77crnV+rbU=', // SBT коллекция 
      NFT_WRAPPER_COLLECTION: 'OgHQNsQTEUsUycNlOvM90utMWUneDnyFfI6gIFIIe4M=', // NFT wrapper коллекция
      
      // Итемы
      PROXY_SUBDOMAIN: 'GJrdszJEE0E/o5QjCE0FgUlNPagw3D/6yKZKRs+0xbA=', // Proxy субдомен
      PROXY_SUBDOMAIN_NEW: 'gBRC3/YgBLs4HV1R7DK7wFeyEWi0gjjQvORlgQUosSg=',
      SBT_SUBDOMAIN: 'vqDGzzV8hIsGXlC/rZvATuHgzNWZvgfxTdBZMzvGyt0=', // SBT субдомен 
      NFT_WRAPPER: 'aj3FhPvT0VV48/bfAa68n4FEhEcWcpKnymAwE6o4hFo=' // NFT wrapper
    }
  },
  mainnet: {
    API_URL: 'https://toncenter.com/api/v3',
    // API_KEY: process.env.REACT_APP_TONCENTER_API_KEY,
    API_KEY: "129c5dfcac700a20e4905ee453be6e2406f941e12c128a738497d5dfc80bdf5d",
    DEFAULT_ADDRESSES: {
      PLATFORM_OWNER: '0:098507db36d99a5a9628815a28e7db25a71c3c60bbf71e5bb138e3cf1c78549c',
      NFT_WRAPPER_COLLECTION: '0:51e88054c20d7fb7ccfdadf310c535b430b84b532f2508c130feb6b972c9c062'
    },
    CODE_HASHES: {
      // TODO: Заполнить актуальными хешами для mainnet
      PROXY_COLLECTION: '4PDeUC50/mj9CteuqQR+GXnpzVXLbHltMSG/sOav+mM=',
      // SBT_COLLECTION: 'QstmFwiVgKQVqGKkKiXVtqlzoMy+PFhsKjlm+vnb5TU=',//старый до правки смарта
      SBT_COLLECTION: 'DPYRDOevq89GsCNAqMcohG4Xt94Xf/43b77crnV+rbU=',
      // NFT_WRAPPER_COLLECTION: '/hmQgk+MeqPciHLIjbUZ9gM3nEL5srI10/v1kjupxNA=', //старый до правки смарта
      NFT_WRAPPER_COLLECTION: 'OgHQNsQTEUsUycNlOvM90utMWUneDnyFfI6gIFIIe4M=',
      PROXY_SUBDOMAIN: 'GJrdszJEE0E/o5QjCE0FgUlNPagw3D/6yKZKRs+0xbA=',
      PROXY_SUBDOMAIN_NEW: 'gBRC3/YgBLs4HV1R7DK7wFeyEWi0gjjQvORlgQUosSg=',
      SBT_SUBDOMAIN: 'vqDGzzV8hIsGXlC/rZvATuHgzNWZvgfxTdBZMzvGyt0=',
      NFT_WRAPPER: 'aj3FhPvT0VV48/bfAa68n4FEhEcWcpKnymAwE6o4hFo='
    }
  }
};

// ==================== КЛАССИФИКАТОР ====================

export class SubdomainClassifier {
  private config: NetworkConfig;
  
  constructor(isTestnet: boolean = true) {
    this.config = NETWORK_CONFIGS[isTestnet ? 'testnet' : 'mainnet'];
  }
  
  // ==================== КЛАССИФИКАЦИЯ КОЛЛЕКЦИЙ ====================
  
  isProxyCollection(collection: any): boolean {
    return collection.code_hash === this.config.CODE_HASHES.PROXY_COLLECTION;
  }
  
  isSBTCollection(collection: any): boolean {
    return collection.code_hash === this.config.CODE_HASHES.SBT_COLLECTION;
  }
  
  isNFTWrapperCollection(collection: any): boolean {
    return collection.code_hash === this.config.CODE_HASHES.NFT_WRAPPER_COLLECTION;
  }
  
  isSubdomainCollection(collection: any): boolean {
    return this.isProxyCollection(collection) || this.isSBTCollection(collection);
  }
  
  // ==================== КЛАССИФИКАЦИЯ ИТЕМОВ ====================
  
 // isProxySubdomain(item: any): boolean {
 //   return item.code_hash === this.config.CODE_HASHES.PROXY_SUBDOMAIN;
 // }

  isProxySubdomain(item: any): boolean {
    return item.code_hash === this.config.CODE_HASHES.PROXY_SUBDOMAIN
        || item.code_hash === this.config.CODE_HASHES.PROXY_SUBDOMAIN_NEW;
  }
  
  isSBTSubdomain(item: any): boolean {
    return item.code_hash === this.config.CODE_HASHES.SBT_SUBDOMAIN;
  }
  
  isNFTWrapper(item: any): boolean {
    return item.code_hash === this.config.CODE_HASHES.NFT_WRAPPER;
  }
  
  isSubdomainItem(item: any): boolean {
    return this.isProxySubdomain(item) || this.isSBTSubdomain(item);
  }
  
  // ==================== УТИЛИТЫ ====================
  
  getItemType(item: any): 'proxy_subdomain' | 'sbt_subdomain' | 'nft_wrapper' | 'unknown' {
    if (this.isProxySubdomain(item)) return 'proxy_subdomain';
    if (this.isSBTSubdomain(item)) return 'sbt_subdomain';
    if (this.isNFTWrapper(item)) return 'nft_wrapper';
    return 'unknown';
  }
  
  getCollectionType(collection: any): 'proxy' | 'sbt' | 'nft_wrapper' | 'unknown' {
    if (this.isProxyCollection(collection)) return 'proxy';
    if (this.isSBTCollection(collection)) return 'sbt';
    if (this.isNFTWrapperCollection(collection)) return 'nft_wrapper';
    return 'unknown';
  }
}

// ==================== API КЛИЕНТ ====================

export class TonCenterAPI {
  private baseUrl: string;
  private apiKey?: string;
  
  constructor(isTestnet: boolean = true, apiKey?: string) {
    const config = NETWORK_CONFIGS[isTestnet ? 'testnet' : 'mainnet'];
    this.baseUrl = config.API_URL;
    this.apiKey = apiKey || config.API_KEY;
  }
  
  private async request<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    // Добавляем параметры
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
    
    // Добавляем API ключ
    if (this.apiKey) {
      url.searchParams.append('api_key', this.apiKey);
    }
    
    try {
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.ok === false) {
        throw new Error(data.error || 'API error');
      }
      
      return data;
    } catch (error) {
      console.error('TON Center API request failed:', error);
      throw error;
    }
  }
  
  // ==================== МЕТОДЫ ДЛЯ КОЛЛЕКЦИЙ ====================
  
  async getCollectionsByOwner(
    ownerAddress: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ nft_collections: any[] }> {
    return this.request('/nft/collections', {
      owner_address: ownerAddress,
      limit,
      offset
    });
  }
  
  async getCollectionByAddress(address: string): Promise<any> {
    return this.request(`/nft/collections/${address}`);
  }
  
  // ==================== МЕТОДЫ ДЛЯ ИТЕМОВ ====================
  
  // async getItemsByCollection(
  //   collectionAddress: string,
  //   limit: number = 100,
  //   offset: number = 0
  // ): Promise<{ nft_items: any[] }> {
  //   return this.request('/nft/items', {
  //     collection_address: collectionAddress,
  //     limit,
  //     offset
  //   });
  // }

  async getItemsByCollection(
  collectionAddress: string,
  limit: number = 100,
  offset: number = 0
): Promise<GetItemsByCollectionResponse> {  // ← ИСПРАВЛЕННЫЙ ТИП!
  return this.request('/nft/items', {
    collection_address: collectionAddress,
    limit,
    offset
  });
}
  
  async getItemsByOwner(
    ownerAddress: string,
    options: {
      limit?: number;
      offset?: number;
      collection_address?: string;
    } = {}
  ): Promise<{ nft_items: any[] }> {
    return this.request('/nft/items', {
      owner_address: ownerAddress,
      ...options
    });
  }
  
  async getItemsByCollectionAndOwner(
    collectionAddress: string,
    ownerAddress: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ nft_items: any[] }> {
    return this.request('/nft/items', {
      collection_address: collectionAddress,
      owner_address: ownerAddress,
      limit,
      offset
    });
  }
  
  async getItemByAddress(address: string): Promise<any> {
    return this.request(`/nft/items/${address}`);
  }
  
  // ==================== МЕТОДЫ ДЛЯ АДРЕСОВ ====================
  
  async getAddressInfo(address: string): Promise<any> {
    return this.request(`/address/${address}`);
  }
  
  async getTransactions(
    address: string,
    limit: number = 100,
    lt?: string,
    hash?: string,
    to_lt?: string
  ): Promise<any> {
    return this.request(`/transactions/${address}`, {
      limit,
      lt,
      hash,
      to_lt
    });
  }
}

// ==================== МЕНЕДЖЕР КЭША ====================

export class CacheManager {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private defaultTTL: number;
  
  constructor(defaultTTL: number = 5 * 60 * 1000) { // 5 минут по умолчанию
    this.defaultTTL = defaultTTL;
  }
  
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + (ttl || this.defaultTTL)
    });
  }
  
  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }
    
    if (Date.now() > cached.timestamp) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }
  
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  has(key: string): boolean {
    return this.cache.has(key);
  }
  
  get size(): number {
    return this.cache.size;
  }
}

// ==================== ЭКСПОРТ ====================

// export {
//   NETWORK_CONFIGS,
//   SubdomainClassifier,
//   TonCenterAPI,
//   CacheManager
// };
