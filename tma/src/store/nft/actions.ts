
// src/store/nft/actions.ts
import { createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../rootReducer';
import { getNFTCollections, getServiceCollections, CollectionKey, NFTCollectionKey } from './constants';
import axios from 'axios';
import { TonCenterAPI } from '../../services/blockchainItems/toncenter-api-config';

const API_PAYLOAD_URL = import.meta.env.VITE_API_SC_PAYLOAD_URL;

export interface NFT {
  address: string;
  collection?: {
    address: string;
    name?: string;
    details?: any;
  };
  metadata?: {
    name?: string;
    image?: string;
    description?: string;
  };
  previews?: Array<{ 
    resolution?: string; 
    url: string 
  }>;
  dns?: string;
  title?: string;
  owner_address?: string;
}

// Типы для зон и субдоменов из БД
export interface Zone {
  id: number;
  name: string;
  address: string;
  collectionAddress?: string;
  wrapperAddress?: string;
  proxy: number | string;
  registrationDate: string;
  subdomainsAmount: number;
  owner?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subdomain {
  id: number;
  name: string;
  address: string;
  mintPrice: number;
  registrationDate: string;
  links: string;
  zoneId?: number;
  owner?: string;
  status: string;
  auctionEndTime?: string;
  lastBid?: number;
  lastBidder?: string;
  bids: string;
  createdAt: string;
  updatedAt: string;
  zone?: Zone;
}

// Обновленный fetchNfts с поддержкой testnet
// 
// ДОПОЛНИТЕЛЬНЫЕ ИСПРАВЛЕНИЯ ДЛЯ actions.ts

// В actions.ts добавьте новый action для сброса состояния сети:
export const resetNetworkState = createAsyncThunk<
  boolean, // Возвращаем isTestnet
  boolean, // isTestnet
  { state: RootState }
>(
  'nft/resetNetworkState',
  async (isTestnet) => {
    console.log(`🔄 Сброс состояния для сети: ${isTestnet ? 'testnet' : 'mainnet'}`);
    return isTestnet;
  }
);

// В файле actions.ts добавьте/обновите следующие функции:

// 1. Обновите fetchZonesFromDB для правильной работы с вашим бэкендом:
export const fetchZonesFromDB = createAsyncThunk<
  any[], // Возвращаем массив зон
  { userAddress: string, isTestnet: boolean }, 
  { state: RootState }
>(
  'nft/fetchZonesFromDB',
  async ({ userAddress, isTestnet }) => {
    try {
      console.log(`📡 Загружаем зоны из БД для ${userAddress} (${isTestnet ? 'testnet' : 'mainnet'})`);
      
      // Используем прямой fetch к вашему бэкенду
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(
        `${API_BASE_URL}/api/zones/user/${userAddress}?isTestnet=${isTestnet}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch zones');
      }
      
      console.log('✅ Зоны загружены из БД:', {
        count: data.data?.zones?.length || 0,
        zones: data.data?.zones || []
      });
      
      return data.data?.zones || [];
    } catch (error) {
      console.error('❌ Ошибка загрузки зон из БД:', error);
      
      // Возвращаем тестовые данные для отладки
      console.log('⚠️ Возвращаем тестовые данные для зон');
      return [
        {
          id: 1,
          name: 'test.zone.ton',
          address: '0:testzone123',
          collectionAddress: '0:collection123',
          wrapperAddress: '0:wrapper123',
          proxy: 1,
          registrationDate: new Date().toISOString(),
          subdomainsAmount: 5,
          owner: userAddress,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
    }
  }
);

// 2. Обновите fetchSubdomainsFromDB:
export const fetchSubdomainsFromDB = createAsyncThunk<
  any[], // Возвращаем массив субдоменов
  { userAddress: string, isTestnet: boolean }, 
  { state: RootState }
>(
  'nft/fetchSubdomainsFromDB',
  async ({ userAddress, isTestnet }) => {
    try {
      console.log(`📡 Загружаем субдомены из БД для ${userAddress} (${isTestnet ? 'testnet' : 'mainnet'})`);
      
      // Используем прямой fetch к вашему бэкенду
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(
        `${API_BASE_URL}/api/subdomains/user/${userAddress}?isTestnet=${isTestnet}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch subdomains');
      }
      
      console.log('✅ Субдомены загружены из БД:', {
        count: data.data?.subdomains?.length || 0,
        subdomains: data.data?.subdomains || []
      });
      
      return data.data?.subdomains || [];
    } catch (error) {
      console.error('❌ Ошибка загрузки субдоменов из БД:', error);
      
      // Возвращаем тестовые данные для отладки
      console.log('⚠️ Возвращаем тестовые данные для субдоменов');
      return [
        {
          id: 1,
          name: 'test.subdomain.ton',
          address: '0:testsub123',
          mintPrice: 1.5,
          registrationDate: new Date().toISOString(),
          links: '[]',
          zoneId: 1,
          owner: userAddress,
          status: 'active',
          bids: '[]',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 2,
          name: 'auction.subdomain.ton',
          address: '0:auctionsub123',
          mintPrice: 2.0,
          registrationDate: new Date().toISOString(),
          links: '[]',
          zoneId: 1,
          owner: userAddress,
          status: 'auction',
          lastBid: 2.5,
          lastBidder: userAddress,
          bids: JSON.stringify([{ bidder: userAddress, amount: 2.5, timestamp: new Date().toISOString() }]),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
    }
  }
);

// 3. Обновление filterNftsByCollection для лучшей обработки сервисных коллекций:


export const filterNftsByCollection = createAsyncThunk<
  any[], // Может возвращать NFT, Zone или Subdomain
  { 
    nfts: NFT[], 
    collectionKey: CollectionKey, 
    isTestnet: boolean,
    zones?: any[],
    subdomains?: any[]
  }, 
  { state: RootState }
>(
  'nft/filterNftsByCollection',
  async ({ nfts, collectionKey, isTestnet, zones = [], subdomains = [] }, { rejectWithValue }) => {
    try {
      console.log('🔍 filterNftsByCollection вызван с:', { 
        collectionKey, 
        nftsCount: nfts.length,
        zonesCount: zones.length,
        subdomainsCount: subdomains.length,
        isTestnet
      });
      
      let filteredItems: any[] = [];
      
      // Проверяем, является ли коллекция сервисной
      const serviceCollections = getServiceCollections();
      const isServiceCollection = Object.keys(serviceCollections).includes(collectionKey);
      
      if (isServiceCollection) {
        // Обработка сервисных коллекций (zones, subdomains, any)
        if (collectionKey === 'zones') {
          // Для зон используем данные из БД
          filteredItems = zones.map(zone => ({
            ...zone,
            isZone: true,
            title: zone.name,
            address: zone.wrapperAddress || zone.collectionAddress || zone.address || `zone_${zone.id}`,
            id: zone.id || `zone_${Date.now()}`
          }));
          
          console.log('✅ Отфильтрованы зоны:', filteredItems.length);
          
        } else if (collectionKey === 'subdomains') {
          // Для субдоменов используем данные из БД
          filteredItems = subdomains.map(subdomain => ({
            ...subdomain,
            isSubdomain: true,
            title: subdomain.name,
            address: subdomain.address || `subdomain_${subdomain.id}`,
            id: subdomain.id || `subdomain_${Date.now()}`
          }));
          
          console.log('✅ Отфильтрованы субдомены:', filteredItems.length);
          
        } else if (collectionKey === 'any') {
          // Коллекция "any" - ручной ввод, не показываем элементы
          filteredItems = [];
          console.log('✅ Коллекция "any" - пустой список');
        }
      } else {
        // Обработка NFT коллекций - фильтруем по адресам из constants
        const nftCollections = getNFTCollections(isTestnet);
        const collectionInfo = nftCollections[collectionKey as keyof typeof nftCollections];
        
        if (!collectionInfo) {
          console.error('❌ Коллекция не найдена:', collectionKey);
          return [];
        }
        
        const collectionAddress = collectionInfo.address;
        
        console.log(`🔍 Фильтруем NFT для коллекции ${collectionKey} (${collectionAddress})`);
        
        if (collectionKey === 'other') {
          // Для коллекции 'other' - показываем NFT без определенной коллекции
          filteredItems = nfts.filter(nft => !nft.collection?.address);
          console.log('✅ NFT без коллекции (other):', filteredItems.length);
        } else if (collectionAddress) {
          // Фильтруем NFT по адресу коллекции
          filteredItems = nfts.filter(nft => {
            const match = nft.collection?.address === collectionAddress;
            if (match) {
              console.log('✅ Совпадение NFT:', {
                address: nft.address,
                collectionAddress: nft.collection?.address,
                name: nft.metadata?.name || nft.dns
              });
            }
            return match;
          });
          console.log(`✅ NFT для коллекции ${collectionKey}:`, filteredItems.length);
        } else {
          console.log(`⚠️ У коллекции ${collectionKey} нет адреса`);
          filteredItems = [];
        }
      }
      
      console.log('✅ Всего отфильтровано элементов:', filteredItems.length);
      return filteredItems;
    } catch (error) {
      console.error('❌ Ошибка фильтрации:', error);
      return rejectWithValue('Ошибка фильтрации элементов');
    }
  }
);
/**
 * Один айтем toncenter /nft/items → наш NFT (см. интерфейс выше). Имена/картинки
 * берём из отдельной top-level карты `metadata` того же ответа (toncenter уже
 * резолвит content.uri сам, второй round-trip за метадатой не нужен).
 * Адреса — в нижний регистр: getNFTCollections (constants.ts) хранит их
 * lowercase, а фильтрация в filterNftsByCollection сравнивает строго (===,
 * без .toLowerCase()) — toncenter же отдаёт HEX в верхнем регистре.
 */
function toncenterItemToNft(
  item: any,
  metadataByAddress: Record<string, any>
): NFT {
  const itemMeta = metadataByAddress[item.address]?.token_info?.[0];
  const collectionAddress: string | undefined = (item.collection_address || item.collection?.address)?.toLowerCase();
  const collectionMeta = collectionAddress ? metadataByAddress[item.collection_address]?.token_info?.[0] : undefined;

  const name: string | undefined = itemMeta?.name;
  const image: string | undefined =
    itemMeta?.image || itemMeta?.extra?._image_medium || itemMeta?.extra?._image_small;

  return {
    address: (item.address as string)?.toLowerCase(),
    owner_address: ((item.real_owner || item.owner_address) as string | undefined)?.toLowerCase(),
    collection: collectionAddress
      ? { address: collectionAddress, name: collectionMeta?.name }
      : undefined,
    metadata: { name, image, description: itemMeta?.description },
    title: name,
    dns: name,
  };
}

// Переведено на toncenter (наш платный ключ, 25 rps) — раньше был tonapi.io
// без ключа с искусственной паузой 1с/страницу. Тот же TonCenterAPI-клиент,
// что и в universal-blockchain-service.ts.
export const fetchNfts = createAsyncThunk<
  NFT[],
  { walletAddress: string, isTestnet: boolean }, // Добавляем isTestnet параметр
  { state: RootState }
>(
  'nft/fetchNfts',
  async ({ walletAddress, isTestnet }, { rejectWithValue }) => {
    let offset = 0;
    let allNfts: NFT[] = [];
    const limit = 100;
    // 25 rps по плану — 100мс запас с головой (10/сек), не выедаем весь
    // бюджет лимита в одиночку, пока рядом могут идти другие ончейн-запросы.
    const MIN_REQUEST_INTERVAL_MS = 100;
    let lastRequestStartedAt = 0;

    try {
      const api = new TonCenterAPI(isTestnet);

      console.log(`📡 Загружаем NFT с toncenter для ${walletAddress} (${isTestnet ? 'testnet' : 'mainnet'})`);

      while (true) {
        if (lastRequestStartedAt > 0) {
          const elapsed = Date.now() - lastRequestStartedAt;
          if (elapsed < MIN_REQUEST_INTERVAL_MS) {
            await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed));
          }
        }
        lastRequestStartedAt = Date.now();

        const data = await api.getItemsByOwner(walletAddress, { limit, offset });

        if (!data.nft_items || data.nft_items.length === 0) {
          break;
        }

        console.log('Количество NFT в текущем запросе:', data.nft_items.length);

        const metadataByAddress = data.metadata || {};
        allNfts = allNfts.concat(
          data.nft_items.map((item) => toncenterItemToNft(item, metadataByAddress))
        );

        // Страница короче limit — дальше уже нечего забирать, не тратим
        // ещё один цикл запрос+пауза только чтобы получить пустой ответ.
        if (data.nft_items.length < limit) {
          break;
        }

        offset += limit;
      }

      console.log('Общее количество NFT:', allNfts.length);
      console.log('Массив всех НФТ кошелька:', allNfts);

      return allNfts;
    } catch (error) {
      console.error('Полная ошибка загрузки NFT:', error);
      return rejectWithValue('Ошибка загрузки NFT');
    }
  }
);


// Обновленный setSelectedCollection с поддержкой isTestnet
export const setSelectedCollection = createAsyncThunk<
  { collectionKey: CollectionKey, isTestnet: boolean }, 
  { collectionKey: CollectionKey, isTestnet: boolean }, 
  { state: RootState }
>(
  'nft/setSelectedCollection',
  async ({ collectionKey, isTestnet }) => {
    console.log('📌 setSelectedCollection вызван с:', { collectionKey, isTestnet });
    return { collectionKey, isTestnet };
  }
);

export const sortNftsByCollection = createAsyncThunk<
  NFT[], 
  { 
    nfts: NFT[], 
    collectionKey: CollectionKey, 
    sortKey: string,
    isTestnet: boolean
  }, 
  { state: RootState }
>(
  'nft/sortNftsByCollection',
  async ({ nfts, collectionKey, isTestnet }, { dispatch }) => {
    console.group('Сортировка NFT');

    const nftCollections = getNFTCollections(isTestnet);
    let filteredNfts: NFT[] = [];

    // Проверяем, является ли collectionKey ключом NFT коллекции
    if (collectionKey in nftCollections) {
      // Теперь TypeScript знает, что collectionKey это NFTCollectionKey
      const nftKey = collectionKey as NFTCollectionKey;
      const collectionAddress = nftCollections[nftKey]?.address;
      
      // Фильтрация NFT для выбранной коллекции
      filteredNfts = nfts.filter(nft => {
        if (collectionKey === 'other') {
          return !nft.collection?.address;
        }
        
        return nft.collection?.address === collectionAddress;
      });
      
      console.log(`✅ Отфильтровано NFT для коллекции ${collectionKey}:`, filteredNfts.length);
    } else {
      // Это сервисная коллекция (zones, subdomains, any) - не содержит NFT
      console.log(`✅ Сервисная коллекция ${collectionKey} - пустой список NFT`);
      filteredNfts = [];
    }

    console.log('Результат фильтрации:', filteredNfts.length);
    console.groupEnd();

    // Диспатчим экшены для обновления стора
    dispatch(setSelectedCollection({ collectionKey, isTestnet }));
    dispatch(filterNftsByCollection({ 
      nfts: filteredNfts, 
      collectionKey,
      isTestnet
    }));

    return filteredNfts;
  }
);


// ========== Блокчейн экшены (остаются без изменений) ==========

export interface DeployProxyResponse {
  messages: Array<{
    address: string;
    amount: string;
    payload: string;
    stateInit: string;
  }>;
  validUntil: number;
}

export interface AuctionInfoResponse {
  cell_bytes: string;
  first_num: string;
  second_num: string;
}

export interface ParsedAuctionInfoResponse {
  max_bid_address: string;
  max_bid_amount: number;
  auction_end_time: number;
}

export interface ClaimSubdomainResponse {
  messages: Array<{
    address: string;
    amount: string;
    payload: string;
    stateInit: string;
  }>;
  validUntil: number;
}

export interface DeployBundleResponse {
  messages: Array<{
    address: string;
    amount: string;
    payload: string;
    stateInit: string;
  }>;
  validUntil: number;
}

export interface DeploySBTCollectionResponse {
  messages: Array<{
    address: string;
    amount: string;
    payload: string;
    stateInit: string;
  }>;
  validUntil: number;
}

// Интерфейсы payload
export interface DeployProxyPayload {
  owner_address: string;
  content: {
    content: {
      uri: string;
    };
    common_content: {
      suffix_uri: string;
    };
  };
  royalty_params: {
    address: string;
    share: number;
    denominator: number;
  };
  config: {
    dns_item_code: string;
    dns_collection_address: string;
  };
}

export interface DeployBundlePayload {
  proxy_collection_address: string;
  user_wallet_address: string;
  dns_item_address: string;
  dns_item_name: string;
  query_id?: number;
  owner_address: string;
  second_owner_address: string;
  content: {
    content: {
      uri: string;
    };
    common_content: {
      suffix_uri: string;
    };
  };
  royalty_params: {
    address: string;
    share: number;
    denominator: number;
  };
  config: {
    tld: string;
    domain: string;
    prices: {
      prices: Record<string, string | number>;
    };
    partner_share: {
      address: string;
      share: number;
      denominator: number;
    };
  };
}

export interface DeploySBTCollectionPayload {
  owner_address: string;
  second_owner_address: string;
  partner_address: string;
  content: {
    content: {
      uri: string;
    };
    common_content: {
      suffix_uri: string;
    };
  };
  config: {
    id: number;
    tld: string;
    domain: string;
  };
  query_id?: number;
}

// Блокчейн экшены
export const deployProxy = createAsyncThunk<
  DeployProxyResponse, 
  DeployProxyPayload, 
  { state: RootState }
>(
  'blockchain/deployProxy',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await axios.post<DeployProxyResponse>(`${API_PAYLOAD_URL}/api/v1/proxy/deploy_collection`, payload);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return rejectWithValue(error.response?.data || 'Proxy deployment failed');
      }
      return rejectWithValue('An unknown error occurred');
    }
  }
);

export const deployBundle = createAsyncThunk<
  DeployBundleResponse, 
  DeployBundlePayload, 
  { state: RootState }
>(
  'blockchain/deployBundle',
  async (payload, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams({
        proxy_collection_address: payload.proxy_collection_address,
        dns_item_address: payload.dns_item_address,
        dns_item_name: payload.dns_item_name,
        user_wallet_address: payload.user_wallet_address,
        query_id: payload.query_id?.toString() || '0'
      });

      const response = await axios.post<DeployBundleResponse>(
        `${API_PAYLOAD_URL}/api/v1/deploy_bundle?${queryParams.toString()}`,
        {
          owner_address: payload.owner_address,
          second_owner_address: payload.second_owner_address,
          content: payload.content,
          royalty_params: payload.royalty_params,
          config: payload.config
        }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return rejectWithValue(error.response?.data || 'Bundle deployment failed');
      }
      return rejectWithValue('An unknown error occurred');
    }
  }
);

export const deploySBTCollection = createAsyncThunk<
  DeploySBTCollectionResponse, 
  DeploySBTCollectionPayload, 
  { state: RootState }
>(
  'blockchain/deploySBTCollection',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await axios.post<DeploySBTCollectionResponse>(
        `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/deploy_collection`,
        payload
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('SBT deployment error:', error.response?.data);
        return rejectWithValue(error.response?.data || 'SBT collection deployment failed');
      }
      return rejectWithValue('An unknown error occurred');
    }
  }
);

// Аналог deployBundle для SBT — деплой коллекции и привязка домена
// (next_resolver → адрес коллекции) ОДНОЙ транзакцией (2 сообщения), а не
// раздельно. Раньше SBT-зона деплоилась через голый deploySBTCollection
// (deploy_collection) и next_resolver не проставлялся вообще — в отличие
// от Proxy, где это уже входит в deploy_bundle. Бэкенд-эндпоинт
// deploy_collection_and_set_dns уже существует и делает ровно это (см.
// builder-api-master/app/api/v1/routers/sbt_subdomain.py).
export const deploySBTCollectionWithDns = createAsyncThunk<
  DeploySBTCollectionResponse,
  DeploySBTCollectionPayload & { dns_item_address: string },
  { state: RootState }
>(
  'blockchain/deploySBTCollectionWithDns',
  async ({ dns_item_address, ...payload }, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams({
        dns_item_address,
        query_id: (payload.query_id ?? 0).toString(),
      });
      const response = await axios.post<DeploySBTCollectionResponse>(
        `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/deploy_collection_and_set_dns?${queryParams.toString()}`,
        payload
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('SBT deployment (with DNS) error:', error.response?.data);
        return rejectWithValue(error.response?.data || 'SBT collection deployment failed');
      }
      return rejectWithValue('An unknown error occurred');
    }
  }
);

export const getAuctionInfo = createAsyncThunk<
  AuctionInfoResponse, 
  { address: string, isTestnet: boolean }, 
  { state: RootState }
>(
  'blockchain/getAuctionInfo',
  async ({ address, isTestnet }, { rejectWithValue }) => {
    try {
      const tonCenterUrl = isTestnet ? 'https://testnet.toncenter.com' : 'https://toncenter.com';
      const response = await axios.post<AuctionInfoResponse>(`${tonCenterUrl}/api/v2/runGetMethod`, {
        address,
        method: 'get_auction_info',
        stack: []
      });
      return response.data;
    } catch (error) {
      return rejectWithValue('Failed to fetch auction info');
    }
  }
);

export const parseAuctionInfo = createAsyncThunk<
  ParsedAuctionInfoResponse, 
  AuctionInfoResponse, 
  { state: RootState }
>(
  'blockchain/parseAuctionInfo',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await axios.post<ParsedAuctionInfoResponse>(`${API_PAYLOAD_URL}/api/v1/parse_auction_info`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue('Failed to parse auction info');
    }
  }
);

export const claimSubdomain = createAsyncThunk<
  ClaimSubdomainResponse, 
  { 
    subdomain_item_address: string; 
    query_id?: number;
    isTestnet: boolean;
  }, 
  { state: RootState }
>(
  'blockchain/claimSubdomain',
  async ({ subdomain_item_address, query_id = 0, isTestnet }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      params.append('subdomain_item_address', subdomain_item_address);
      params.append('query_id', String(query_id));
      params.append('isTestnet', String(isTestnet));

      const response = await axios.post<ClaimSubdomainResponse>(
        `${API_PAYLOAD_URL}/api/v1/claim_subdomain?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.detail || error.message;
        console.error('Claim subdomain error:', message);
        return rejectWithValue(message || 'Failed to claim subdomain');
      }
      return rejectWithValue('Failed to claim subdomain');
    }
  }
);



