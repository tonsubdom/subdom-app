/**
 * subdom-server/src/services/platformCache/toncenter-api-config.ts
 *
 * Бэкенд-порт tma/src/services/blockchainItems/toncenter-api-config.ts.
 * Логика классификации (code_hash) и HTTP-клиент toncenter — 1:1 с фронтом,
 * только чтение конфига идёт из process.env вместо import.meta.env.VITE_*.
 * Меняешь классификацию/хеши на фронте — не забудь поправить и здесь (или
 * вынести в общий пакет, если разъедутся ещё раз).
 */

export interface NetworkConfig {
  API_URL: string;
  API_KEY?: string;
  DEFAULT_ADDRESSES: {
    PLATFORM_OWNER: string;
    NFT_WRAPPER_COLLECTION: string;
  };
  CODE_HASHES: {
    PROXY_COLLECTION: string;
    SBT_COLLECTION: string;
    NFT_WRAPPER_COLLECTION: string;
    PROXY_SUBDOMAIN: string;
    PROXY_SUBDOMAIN_NEW: string;
    SBT_SUBDOMAIN: string;
    NFT_WRAPPER: string;
  };
}

export interface GetItemsByCollectionResponse {
  nft_items: any[];
  metadata?: Record<string, any>;
  address_book?: Record<string, any>;
}

export const NETWORK_CONFIGS: Record<'mainnet' | 'testnet', NetworkConfig> = {
  testnet: {
    API_URL: 'https://testnet.toncenter.com/api/v3',
    API_KEY: process.env.TONCENTER_API_KEY,
    DEFAULT_ADDRESSES: {
      PLATFORM_OWNER: process.env.PLATFORM_OWNER_TESTNET || '',
      NFT_WRAPPER_COLLECTION: process.env.NFT_WRAPPER_COLLECTION_TESTNET || '',
    },
    CODE_HASHES: {
      PROXY_COLLECTION: process.env.HASH_PROXY_COLLECTION_TESTNET || '',
      SBT_COLLECTION: process.env.HASH_SBT_COLLECTION_TESTNET || '',
      NFT_WRAPPER_COLLECTION: process.env.HASH_NFT_WRAPPER_COLLECTION_TESTNET || '',
      PROXY_SUBDOMAIN: process.env.HASH_PROXY_SUBDOMAIN_TESTNET || '',
      PROXY_SUBDOMAIN_NEW: process.env.HASH_PROXY_SUBDOMAIN_NEW_TESTNET || '',
      SBT_SUBDOMAIN: process.env.HASH_SBT_SUBDOMAIN_TESTNET || '',
      NFT_WRAPPER: process.env.HASH_NFT_WRAPPER_TESTNET || '',
    },
  },
  mainnet: {
    API_URL: 'https://toncenter.com/api/v3',
    API_KEY: process.env.TONCENTER_API_KEY,
    DEFAULT_ADDRESSES: {
      PLATFORM_OWNER: process.env.PLATFORM_OWNER_MAINNET || '',
      NFT_WRAPPER_COLLECTION: process.env.NFT_WRAPPER_COLLECTION_MAINNET || '',
    },
    CODE_HASHES: {
      PROXY_COLLECTION: process.env.HASH_PROXY_COLLECTION_MAINNET || '',
      SBT_COLLECTION: process.env.HASH_SBT_COLLECTION_MAINNET || '',
      NFT_WRAPPER_COLLECTION: process.env.HASH_NFT_WRAPPER_COLLECTION_MAINNET || '',
      PROXY_SUBDOMAIN: process.env.HASH_PROXY_SUBDOMAIN_MAINNET || '',
      PROXY_SUBDOMAIN_NEW: process.env.HASH_PROXY_SUBDOMAIN_NEW_MAINNET || '',
      SBT_SUBDOMAIN: process.env.HASH_SBT_SUBDOMAIN_MAINNET || '',
      NFT_WRAPPER: process.env.HASH_NFT_WRAPPER_MAINNET || '',
    },
  },
};

// ==================== КЛАССИФИКАТОР ====================
// 1:1 с tma/src/services/blockchainItems/toncenter-api-config.ts —
// не расходиться с фронтом в правилах классификации.

export class SubdomainClassifier {
  private config: NetworkConfig;

  constructor(isTestnet: boolean = true) {
    this.config = NETWORK_CONFIGS[isTestnet ? 'testnet' : 'mainnet'];
  }

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

  isProxySubdomain(item: any): boolean {
    return (
      item.code_hash === this.config.CODE_HASHES.PROXY_SUBDOMAIN ||
      item.code_hash === this.config.CODE_HASHES.PROXY_SUBDOMAIN_NEW
    );
  }

  isSBTSubdomain(item: any): boolean {
    return item.code_hash === this.config.CODE_HASHES.SBT_SUBDOMAIN;
  }

  // Совпадает со старой и новой версией смартконтрактов — см. tma-версию файла.
  isNFTWrapper(item: any): boolean {
    return (
      item.code_hash === this.config.CODE_HASHES.NFT_WRAPPER ||
      item.code_hash === this.config.CODE_HASHES.PROXY_SUBDOMAIN ||
      item.code_hash === this.config.CODE_HASHES.PROXY_SUBDOMAIN_NEW
    );
  }

  isSubdomainItem(item: any): boolean {
    return this.isProxySubdomain(item) || this.isSBTSubdomain(item);
  }

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

export interface TonCenterTransaction {
  account: string;
  hash: string;
  lt: string;
  now: number;
  orig_status: string;
  end_status: string;
  prev_trans_hash: string;
  prev_trans_lt: string;
  in_msg?: {
    source: string;
    destination: string;
    value: string;
    message_content?: {
      decoded?: {
        '@type'?: string;
        comment?: string;
      };
    };
  };
}

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

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    if (this.apiKey) {
      url.searchParams.append('api_key', this.apiKey);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as any;

    if (data.ok === false) {
      throw new Error(data.error || 'API error');
    }

    return data as T;
  }

  async getCollectionsByOwner(
    ownerAddress: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ nft_collections: any[]; metadata?: Record<string, any> }> {
    return this.request('/nft/collections', { owner_address: ownerAddress, limit, offset });
  }

  async getCollectionByAddress(address: string): Promise<any> {
    return this.request(`/nft/collections/${address}`);
  }

  async getItemsByCollection(
    collectionAddress: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<GetItemsByCollectionResponse> {
    return this.request('/nft/items', { collection_address: collectionAddress, limit, offset });
  }

  async getItemsByOwner(
    ownerAddress: string,
    options: { limit?: number; offset?: number; collection_address?: string } = {}
  ): Promise<{ nft_items: any[] }> {
    return this.request('/nft/items', { owner_address: ownerAddress, ...options });
  }

  async getItemByAddress(address: string): Promise<any> {
    return this.request(`/nft/items/${address}`);
  }

  async getAddressInfo(address: string): Promise<any> {
    return this.request(`/address/${address}`);
  }

  /**
   * Первая (deploy) транзакция адреса — источник "реального создателя"
   * коллекции/обёртки (in_msg.source). 1:1 с tma-версией, используется
   * фронтом в getCollectionCreatorAndTime (universal-blockchain-service.ts).
   */
  async getFirstTransaction(
    account: string
  ): Promise<{ transactions: TonCenterTransaction[]; address_book?: Record<string, any> }> {
    return this.request('/transactions', { account, limit: 1, offset: 0, sort: 'asc' });
  }
}

// ==================== МЕНЕДЖЕР КЭША (in-memory, для внутрипроцессных догонялок) ====================

export class CacheManager {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private defaultTTL: number;

  constructor(defaultTTL: number = 5 * 60 * 1000) {
    this.defaultTTL = defaultTTL;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, { data, timestamp: Date.now() + (ttl ?? this.defaultTTL) });
  }

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() > cached.timestamp) {
      this.cache.delete(key);
      return null;
    }
    return cached.data as T;
  }
}
