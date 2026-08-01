

// src/store/nft/nftReducer.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { 
  fetchNfts, 
  filterNftsByCollection, 
  setSelectedCollection,
  fetchZonesFromDB,
  fetchSubdomainsFromDB,
  NFT 
} from './actions';
import { CollectionKey } from './constants';

// Интерфейс для данных, разделенных по сетям
interface NetworkData {
  allNfts: NFT[];
  filteredItems: any[];
  zones: any[];
  subdomains: any[];
  selectedCollection: CollectionKey;
}

interface NftState {
  // Данные разделены по сетям
  mainnet: NetworkData;
  testnet: NetworkData;
  
  // Общие состояния
  currentNetwork: 'mainnet' | 'testnet';
  loading: boolean;
  error: string | null;
  walletAddress: string | null;
}

const initialNetworkData: NetworkData = {
  allNfts: [],
  filteredItems: [],
  zones: [],
  subdomains: [],
  selectedCollection: 'zones'
};

const initialState: NftState = {
  mainnet: { ...initialNetworkData },
  testnet: { ...initialNetworkData },
  currentNetwork: 'mainnet',
  loading: false,
  error: null,
  walletAddress: null
};

// Вспомогательная функция для получения текущих данных сети
// const getCurrentNetworkData = (state: NftState) => {
//   return state.currentNetwork === 'mainnet' ? state.mainnet : state.testnet;
// };

export const nftSlice = createSlice({
  name: 'nft',
  initialState,
  reducers: {
    // Установка выбранной коллекции (синхронная версия)
    setSelectedCollectionSync: (state, action: PayloadAction<{ collectionKey: CollectionKey, isTestnet: boolean }>) => {
      const { collectionKey, isTestnet } = action.payload;
      const network = isTestnet ? 'testnet' : 'mainnet';
      state[network].selectedCollection = collectionKey;
    },
    
    // Переключение сети
    setIsTestnet: (state, action: PayloadAction<boolean>) => {
      state.currentNetwork = action.payload ? 'testnet' : 'mainnet';
    },
    
    // Установка адреса кошелька
    setWalletAddress: (state, action: PayloadAction<string>) => {
      state.walletAddress = action.payload;
    },
    
    // Сброс состояния для конкретной сети
    resetNetworkState: (state, action: PayloadAction<boolean>) => {
      const isTestnet = action.payload;
      const network = isTestnet ? 'testnet' : 'mainnet';
      state[network] = { ...initialNetworkData };
    },
    
    // Сброс всего состояния
    resetNftState: () => {
      return initialState;
    },
    
    // Ручная установка отфильтрованных элементов
    setFilteredItems: (state, action: PayloadAction<{ items: any[], isTestnet: boolean }>) => {
      const { items, isTestnet } = action.payload;
      const network = isTestnet ? 'testnet' : 'mainnet';
      state[network].filteredItems = items;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchNfts - загрузка всех NFT
      .addCase(fetchNfts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNfts.fulfilled, (state, action) => {
        state.loading = false;
        const { isTestnet } = action.meta.arg;
        const network = isTestnet ? 'testnet' : 'mainnet';
        state[network].allNfts = action.payload || [];
        state.error = null;
      })
      .addCase(fetchNfts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to fetch NFTs';
        const { isTestnet } = action.meta.arg;
        const network = isTestnet ? 'testnet' : 'mainnet';
        state[network].allNfts = [];
      })
      
      // setSelectedCollection - асинхронная версия с isTestnet
      .addCase(setSelectedCollection.fulfilled, (state, action) => {
        const { collectionKey, isTestnet } = action.payload;
        const network = isTestnet ? 'testnet' : 'mainnet';
        state[network].selectedCollection = collectionKey;
        state.currentNetwork = network;
      })
      
      // filterNftsByCollection - фильтрация по коллекции
      .addCase(filterNftsByCollection.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(filterNftsByCollection.fulfilled, (state, action) => {
        state.loading = false;
        const { isTestnet } = action.meta.arg;
        const network = isTestnet ? 'testnet' : 'mainnet';
        state[network].filteredItems = action.payload || [];
        state.error = null;
      })
      .addCase(filterNftsByCollection.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to filter items';
        const { isTestnet } = action.meta.arg;
        const network = isTestnet ? 'testnet' : 'mainnet';
        state[network].filteredItems = [];
      })
      
      // fetchZonesFromDB - загрузка зон из БД
      .addCase(fetchZonesFromDB.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchZonesFromDB.fulfilled, (state, action) => {
        state.loading = false;
        const { isTestnet } = action.meta.arg;
        const network = isTestnet ? 'testnet' : 'mainnet';
        state[network].zones = action.payload || [];
        state.error = null;
      })
      .addCase(fetchZonesFromDB.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to fetch zones';
        const { isTestnet } = action.meta.arg;
        const network = isTestnet ? 'testnet' : 'mainnet';
        state[network].zones = [];
      })
      
      // fetchSubdomainsFromDB - загрузка субдоменов из БД
      .addCase(fetchSubdomainsFromDB.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubdomainsFromDB.fulfilled, (state, action) => {
        state.loading = false;
        const { isTestnet } = action.meta.arg;
        const network = isTestnet ? 'testnet' : 'mainnet';
        state[network].subdomains = action.payload || [];
        state.error = null;
      })
      .addCase(fetchSubdomainsFromDB.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to fetch subdomains';
        const { isTestnet } = action.meta.arg;
        const network = isTestnet ? 'testnet' : 'mainnet';
        state[network].subdomains = [];
      });
  }
});

// Export actions
export const { 
  setSelectedCollectionSync, 
  setIsTestnet, 
  setWalletAddress, 
  resetNetworkState,
  resetNftState,
  setFilteredItems
} = nftSlice.actions;

// Export reducer
export default nftSlice.reducer;

// Селекторы
export const selectAllNfts = (state: { nft: NftState }, isTestnet: boolean) => 
  isTestnet ? state.nft.testnet.allNfts : state.nft.mainnet.allNfts;

export const selectFilteredItems = (state: { nft: NftState }, isTestnet: boolean) => 
  isTestnet ? state.nft.testnet.filteredItems : state.nft.mainnet.filteredItems;

export const selectZones = (state: { nft: NftState }, isTestnet: boolean) => 
  isTestnet ? state.nft.testnet.zones : state.nft.mainnet.zones;

export const selectSubdomains = (state: { nft: NftState }, isTestnet: boolean) => 
  isTestnet ? state.nft.testnet.subdomains : state.nft.mainnet.subdomains;

export const selectSelectedCollection = (state: { nft: NftState }, isTestnet: boolean) => 
  isTestnet ? state.nft.testnet.selectedCollection : state.nft.mainnet.selectedCollection;

export const selectCurrentNetwork = (state: { nft: NftState }) => state.nft.currentNetwork;
export const selectIsTestnet = (state: { nft: NftState }) => state.nft.currentNetwork === 'testnet';
export const selectLoading = (state: { nft: NftState }) => state.nft.loading;
export const selectError = (state: { nft: NftState }) => state.nft.error;
export const selectWalletAddress = (state: { nft: NftState }) => state.nft.walletAddress;
