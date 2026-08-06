// с отправкой нагрузки

import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Address } from 'ton-core';
import { TransactionService } from '@/services/transactionService';
import { track } from '@/utils/analytics';

// ============ API CONFIG ============
const siteApiAddr = import.meta.env.VITE_API_SC_PAYLOAD_URL;
const API_BASE_URL = `$${siteApiAddr}/api/v1/dns`;

// ============ ТИПЫ ============

export interface DNSRecord {
  nft_item_address: string;
  nft_item_owner: string;
  domain: string;
  dns_next_resolver: string | null;
  dns_wallet: string | null;
  dns_site_adnl: string | null;
  dns_storage_bag_id: string | null;
}

export interface AddressBookEntry {
  user_friendly: string;
  domain: string | null;
}

export interface DNSRecordsResponse {
  records: DNSRecord[];
  address_book: Record<string, AddressBookEntry>;
}

export interface ParsedDNSRecord {
  domain: string;
  walletAddress: string | null;
  siteAdnl: string | null;
  storageBagId: string | null;
  nextResolver: string | null;
}

export interface APIMessage {
  address: string;
  amount: string;
  payload: string;
  stateInit?: string;
}

export interface APIResponse {
  messages: APIMessage[];
  validUntil: number;
}

// Раньше каждый thunk слепо звал `await tonConnectUI.sendTransaction(...)` и
// считал это успехом сразу по факту подписи — не было ни извлечения hash, ни
// проверки, что транзакция реально дошла до блокчейна. UI-код на вызывающей
// стороне усугублял это: `if (result.payload)` истинно и на fulfilled, и на
// rejected (rejectWithValue тоже кладёт значение в action.payload) — то есть
// "успешный" тост мог показываться даже при ошибке. Теперь используем тот же
// TransactionService, что и в CreateCollectionPage (hash + поллинг
// подтверждения в блокчейне), и кидаем ошибку, если транзакция не
// подтвердилась — thunk уйдёт в rejected, а не в ложный fulfilled.
async function sendDnsTransaction(
  tonConnectUI: any,
  data: APIResponse,
  isTestnet: boolean,
  action: string
): Promise<void> {
  if (!data.messages || data.messages.length === 0) return;

  const result = await TransactionService.sendTransaction(
    tonConnectUI,
    {
      validUntil: data.validUntil || Math.floor(Date.now() / 1000) + 360,
      messages: data.messages,
    },
    {
      network: isTestnet ? 'testnet' : 'mainnet',
      verifyBlockchain: true,
      action,
    }
  );

  if (!result.success) {
    track('dns_record_failed', { action, reason: (result.error || 'not_confirmed').slice(0, 120) });
    throw new Error(result.error || 'Транзакция не подтверждена в блокчейне');
  }

  track('dns_record_confirmed', { action });
}

export interface DNSRecordsState {
  records: DNSRecord[];
  addressBook: Record<string, AddressBookEntry>;
  parsedRecords: Record<string, ParsedDNSRecord>;
  currentDomain: string | null;
  loading: boolean;
  error: string | null;
  operationLoading: boolean;
  operationError: string | null;
}

// ============ УТИЛИТЫ ДЛЯ КОНВЕРТАЦИИ ============

export const convertRawAddressToFriendly = (rawAddress: string | null): string | null => {
  if (!rawAddress) return null;
  try {
    const addr = Address.parse(rawAddress);
    return addr.toString();
  } catch (error) {
    console.error('Error converting raw address:', error);
    return null;
  }
};

export const convertBase64ToHex = (base64String: string | null): string | null => {
  if (!base64String) return null;
  try {
    const binaryString = atob(base64String);
    const hexString = Array.from(binaryString)
      .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    return hexString;
  } catch (error) {
    console.error('Error converting Base64 to HEX:', error);
    return null;
  }
};

export const parseDNSRecord = (
  record: DNSRecord,
  addressBook: Record<string, AddressBookEntry>
): ParsedDNSRecord => {
  const walletRaw = record.dns_wallet;
  let walletAddress: string | null = null;
  
  if (walletRaw) {
    if (addressBook[walletRaw]) {
      walletAddress = addressBook[walletRaw].user_friendly;
    } else {
      walletAddress = convertRawAddressToFriendly(walletRaw);
    }
  }

  const siteAdnl = record.dns_site_adnl 
    ? convertBase64ToHex(record.dns_site_adnl) 
    : null;

  const storageBagId = record.dns_storage_bag_id 
    ? convertBase64ToHex(record.dns_storage_bag_id) 
    : null;

  const nextResolver = record.dns_next_resolver
    ? convertRawAddressToFriendly(record.dns_next_resolver)
    : null;

  return {
    domain: record.domain,
    walletAddress,
    siteAdnl,
    storageBagId,
    nextResolver,
  };
};

// ============ ASYNC THUNKS ============

export const fetchDNSRecords = createAsyncThunk(
  'dns/fetchRecords',
  async (domain: string, { rejectWithValue }) => {
    try {
      console.log('📌 Загружаем DNS записи для домена:', domain);
      const response = await fetch(
        `https://toncenter.com/api/v3/dns/records?domain=${domain}&limit=100&offset=0`
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const data: DNSRecordsResponse = await response.json();
      console.log('✅ Получены DNS записи:', data);
      return { ...data, domain };
    } catch (error: any) {
      console.error('❌ Error fetching DNS records:', error);
      return rejectWithValue(error.message || 'Failed to fetch DNS records');
    }
  }
);

export const fetchTestnetDNSRecords = createAsyncThunk(
  'dns/fetchRecords',
  async (domain: string, { rejectWithValue }) => {
    try {
      console.log('📌 Загружаем DNS записи для домена:', domain);

      const response = await fetch(
        `https://testnet.toncenter.com/api/v3/dns/records?domain=${domain}&limit=100&offset=0`
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const data: DNSRecordsResponse = await response.json();
      console.log('✅ Получены DNS записи:', data);
      return { ...data, domain };
    } catch (error: any) {
      console.error('❌ Error fetching DNS records:', error);
      return rejectWithValue(error.message || 'Failed to fetch DNS records');
    }
  }
);

// ✅ SET WALLET RECORD
export const setWalletRecord = createAsyncThunk(
  'dns/setWalletRecord',
  async (
    { dnsItemAddress, userWalletAddress, queryId = 0, tonConnectUI, isTestnet = false }:
    { dnsItemAddress: string; userWalletAddress: string; queryId?: number; tonConnectUI: any; isTestnet?: boolean },
    { rejectWithValue }
  ) => {
    try {
      const normalizedAddress = Address.parse(dnsItemAddress).toString();
      const url = new URL(`${API_BASE_URL}/${normalizedAddress}/set_wallet_record`);
      url.searchParams.append('user_wallet_address', userWalletAddress);
      url.searchParams.append('query_id', queryId.toString());

      console.log('📌 PUT запрос (setWalletRecord):', url.toString());
      
      const response = await fetch(url.toString(), { 
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorData}`);
      }

      const data: APIResponse = await response.json();
      console.log('✅ API Response:', data);

      await sendDnsTransaction(tonConnectUI, data, isTestnet, 'set_wallet_record');

      return data;
    } catch (error: any) {
      console.error('❌ Error setting wallet record:', error);
      return rejectWithValue(error.message || 'Failed to set wallet record');
    }
  }
);

// ✅ SET SITE RECORD (ADNL)
export const setSiteRecord = createAsyncThunk(
  'dns/setSiteRecord',
  async (
    { dnsItemAddress, adnlAddressHex, queryId = 0, tonConnectUI, isTestnet = false }:
    { dnsItemAddress: string; adnlAddressHex: string; queryId?: number; tonConnectUI: any; isTestnet?: boolean },
    { rejectWithValue }
  ) => {
    try {
      const normalizedAddress = Address.parse(dnsItemAddress).toString();
      const url = new URL(`${API_BASE_URL}/${normalizedAddress}/set_site_record`);
      url.searchParams.append('adnl_adress_hex', adnlAddressHex);
      url.searchParams.append('query_id', queryId.toString());

      console.log('📌 PUT запрос (setSiteRecord):', url.toString());
      
      const response = await fetch(url.toString(), { 
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorData}`);
      }

      const data: APIResponse = await response.json();
      console.log('✅ API Response:', data);

      await sendDnsTransaction(tonConnectUI, data, isTestnet, 'set_site_record');

      return data;
    } catch (error: any) {
      console.error('❌ Error setting site record:', error);
      return rejectWithValue(error.message || 'Failed to set site record');
    }
  }
);

// ✅ SET STORAGE RECORD
export const setStorageRecord = createAsyncThunk(
  'dns/setStorageRecord',
  async (
    { dnsItemAddress, bagIdHex, queryId = 0, tonConnectUI, isTestnet = false }:
    { dnsItemAddress: string; bagIdHex: string; queryId?: number; tonConnectUI: any; isTestnet?: boolean },
    { rejectWithValue }
  ) => {
    try {
      const normalizedAddress = Address.parse(dnsItemAddress).toString();
      const url = new URL(`${API_BASE_URL}/${normalizedAddress}/set_storage_record`);
      url.searchParams.append('bag_id_hex', bagIdHex);
      url.searchParams.append('query_id', queryId.toString());

      console.log('📌 PUT запрос (setStorageRecord):', url.toString());
      
      const response = await fetch(url.toString(), { 
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorData}`);
      }

      const data: APIResponse = await response.json();
      console.log('✅ API Response:', data);

      await sendDnsTransaction(tonConnectUI, data, isTestnet, 'set_storage_record');

      return data;
    } catch (error: any) {
      console.error('❌ Error setting storage record:', error);
      return rejectWithValue(error.message || 'Failed to set storage record');
    }
  }
);

// ✅ SET NEXT RESOLVER RECORD
export const setNextResolverRecord = createAsyncThunk(
  'dns/setNextResolverRecord',
  async (
    { dnsItemAddress, resolverAddress, queryId = 0, tonConnectUI, isTestnet = false }:
    { dnsItemAddress: string; resolverAddress: string; queryId?: number; tonConnectUI: any; isTestnet?: boolean },
    { rejectWithValue }
  ) => {
    try {
      const normalizedAddress = Address.parse(dnsItemAddress).toString();
      const normalizedResolverAddress = Address.parse(resolverAddress).toString();
      const url = new URL(`${API_BASE_URL}/${normalizedAddress}/set_next_resolver_record`);
      url.searchParams.append('resolver_address', normalizedResolverAddress);
      url.searchParams.append('query_id', queryId.toString());

      console.log('📌 PUT запрос (setNextResolverRecord):', url.toString());
      
      const response = await fetch(url.toString(), { 
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorData}`);
      }

      const data: APIResponse = await response.json();
      console.log('✅ API Response:', data);

      await sendDnsTransaction(tonConnectUI, data, isTestnet, 'set_next_resolver_record');

      return data;
    } catch (error: any) {
      console.error('❌ Error setting next resolver record:', error);
      return rejectWithValue(error.message || 'Failed to set next resolver record');
    }
  }
);

// ✅ DELETE WALLET RECORD
export const deleteWalletRecord = createAsyncThunk(
  'dns/deleteWalletRecord',
  async (
    { dnsItemAddress, queryId = 0, tonConnectUI, isTestnet = false }:
    { dnsItemAddress: string; queryId?: number; tonConnectUI: any; isTestnet?: boolean },
    { rejectWithValue }
  ) => {
    try {
      const normalizedAddress = Address.parse(dnsItemAddress).toString();
      const url = new URL(`${API_BASE_URL}/${normalizedAddress}/delete_wallet_record`);
      url.searchParams.append('query_id', queryId.toString());

      console.log('📌 DELETE запрос (deleteWalletRecord):', url.toString());
      
      const response = await fetch(url.toString(), { method: 'DELETE' });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorData}`);
      }

      const data: APIResponse = await response.json();
      console.log('✅ API Response:', data);

      await sendDnsTransaction(tonConnectUI, data, isTestnet, 'delete_wallet_record');

      return data;
    } catch (error: any) {
      console.error('❌ Error deleting wallet record:', error);
      return rejectWithValue(error.message || 'Failed to delete wallet record');
    }
  }
);

// ✅ DELETE SITE RECORD
export const deleteSiteRecord = createAsyncThunk(
  'dns/deleteSiteRecord',
  async (
    { dnsItemAddress, queryId = 0, tonConnectUI, isTestnet = false }:
    { dnsItemAddress: string; queryId?: number; tonConnectUI: any; isTestnet?: boolean },
    { rejectWithValue }
  ) => {
    try {
      const normalizedAddress = Address.parse(dnsItemAddress).toString();
      const url = new URL(`${API_BASE_URL}/${normalizedAddress}/delete_site_record`);
      url.searchParams.append('query_id', queryId.toString());

      console.log('📌 DELETE запрос (deleteSiteRecord):', url.toString());
      
      const response = await fetch(url.toString(), { method: 'DELETE' });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorData}`);
      }

      const data: APIResponse = await response.json();
      console.log('✅ API Response:', data);

      await sendDnsTransaction(tonConnectUI, data, isTestnet, 'delete_site_record');

      return data;
    } catch (error: any) {
      console.error('❌ Error deleting site record:', error);
      return rejectWithValue(error.message || 'Failed to delete site record');
    }
  }
);

// ✅ DELETE STORAGE RECORD
export const deleteStorageRecord = createAsyncThunk(
  'dns/deleteStorageRecord',
  async (
    { dnsItemAddress, queryId = 0, tonConnectUI, isTestnet = false }:
    { dnsItemAddress: string; queryId?: number; tonConnectUI: any; isTestnet?: boolean },
    { rejectWithValue }
  ) => {
    try {
      const normalizedAddress = Address.parse(dnsItemAddress).toString();
      const url = new URL(`${API_BASE_URL}/${normalizedAddress}/delete_storage_record`);
      url.searchParams.append('query_id', queryId.toString());

      console.log('📌 DELETE запрос (deleteStorageRecord):', url.toString());
      
      const response = await fetch(url.toString(), { method: 'DELETE' });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorData}`);
      }

      const data: APIResponse = await response.json();
      console.log('✅ API Response:', data);

      await sendDnsTransaction(tonConnectUI, data, isTestnet, 'delete_storage_record');

      return data;
    } catch (error: any) {
      console.error('❌ Error deleting storage record:', error);
      return rejectWithValue(error.message || 'Failed to delete storage record');
    }
  }
);

// ✅ DELETE NEXT RESOLVER RECORD
export const deleteNextResolverRecord = createAsyncThunk(
  'dns/deleteNextResolverRecord',
  async (
    { dnsItemAddress, queryId = 0, tonConnectUI, isTestnet = false }:
    { dnsItemAddress: string; queryId?: number; tonConnectUI: any; isTestnet?: boolean },
    { rejectWithValue }
  ) => {
    try {
      const normalizedAddress = Address.parse(dnsItemAddress).toString();
      const url = new URL(`${API_BASE_URL}/${normalizedAddress}/delete_next_resolver_record`);
      url.searchParams.append('query_id', queryId.toString());

      console.log('📌 DELETE запрос (deleteNextResolverRecord):', url.toString());
      
      const response = await fetch(url.toString(), { method: 'DELETE' });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorData}`);
      }

      const data: APIResponse = await response.json();
      console.log('✅ API Response:', data);

      await sendDnsTransaction(tonConnectUI, data, isTestnet, 'delete_next_resolver_record');

      return data;
    } catch (error: any) {
      console.error('❌ Error deleting next resolver record:', error);
      return rejectWithValue(error.message || 'Failed to delete next resolver record');
    }
  }
);

// ============ SLICE ============

const initialState: DNSRecordsState = {
  records: [],
  addressBook: {},
  parsedRecords: {},
  currentDomain: null,
  loading: false,
  error: null,
  operationLoading: false,
  operationError: null,
};

export const dnsRecordsSlice = createSlice({
  name: 'dnsRecords',
  initialState,
  reducers: {
    clearDNSRecords: (state) => {
      state.records = [];
      state.addressBook = {};
      state.parsedRecords = {};
      state.currentDomain = null;
      state.error = null;
    },
    clearOperationError: (state) => {
      state.operationError = null;
    },
    resetDNSState: (state) => {
      state.records = [];
      state.addressBook = {};
      state.parsedRecords = {};
      state.currentDomain = null;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDNSRecords.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.records = [];
        state.addressBook = {};
        state.parsedRecords = {};
      })
      .addCase(fetchDNSRecords.fulfilled, (state, action) => {
        state.loading = false;
        state.records = action.payload.records;
        state.addressBook = action.payload.address_book;
        state.currentDomain = action.payload.domain;

        const parsed: Record<string, ParsedDNSRecord> = {};
        action.payload.records.forEach((record) => {
          console.log('📌 Парсим запись:', record.domain);
          const parsedRecord = parseDNSRecord(record, action.payload.address_book);
          console.log('✅ Результат парсинга:', parsedRecord);
          parsed[record.domain] = parsedRecord;
        });
        state.parsedRecords = parsed;
        
        console.log('✅ Все parsedRecords в state:', state.parsedRecords);
        console.log('✅ currentDomain установлен на:', state.currentDomain);
      })
      .addCase(fetchDNSRecords.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(setWalletRecord.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
      })
      .addCase(setWalletRecord.fulfilled, (state) => {
        state.operationLoading = false;
      })
      .addCase(setWalletRecord.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload as string;
      })

      .addCase(setSiteRecord.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
      })
      .addCase(setSiteRecord.fulfilled, (state) => {
        state.operationLoading = false;
      })
      .addCase(setSiteRecord.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload as string;
      })

      .addCase(setStorageRecord.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
      })
      .addCase(setStorageRecord.fulfilled, (state) => {
        state.operationLoading = false;
      })
      .addCase(setStorageRecord.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload as string;
      })

      .addCase(setNextResolverRecord.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
      })
      .addCase(setNextResolverRecord.fulfilled, (state) => {
        state.operationLoading = false;
      })
      .addCase(setNextResolverRecord.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload as string;
      })

      .addCase(deleteWalletRecord.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
      })
      .addCase(deleteWalletRecord.fulfilled, (state) => {
        state.operationLoading = false;
      })
      .addCase(deleteWalletRecord.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload as string;
      })

      .addCase(deleteSiteRecord.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
      })
      .addCase(deleteSiteRecord.fulfilled, (state) => {
        state.operationLoading = false;
      })
      .addCase(deleteSiteRecord.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload as string;
      })

      .addCase(deleteStorageRecord.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
      })
      .addCase(deleteStorageRecord.fulfilled, (state) => {
        state.operationLoading = false;
      })
      .addCase(deleteStorageRecord.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload as string;
      })

      .addCase(deleteNextResolverRecord.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
      })
      .addCase(deleteNextResolverRecord.fulfilled, (state) => {
        state.operationLoading = false;
      })
      .addCase(deleteNextResolverRecord.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload as string;
      });
  },
});

export const { clearDNSRecords, clearOperationError, resetDNSState } = dnsRecordsSlice.actions;
export default dnsRecordsSlice.reducer;