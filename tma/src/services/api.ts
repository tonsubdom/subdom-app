// src/services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||'';

// ========== ТИПЫ ==========

export type ZoneLength = 4 | 5 | 6 | 7 | 8 | 9;

export interface PaymentAttempts {
  proxy: Record<ZoneLength, boolean>;
  sbt: Record<ZoneLength, boolean>;
}

export interface PaymentAttemptsCount {
  proxy: Record<ZoneLength, number>;
  sbt: Record<ZoneLength, number>;
}

// Обновленный интерфейс User с новыми полями
export interface User {
  id: number;
  address: string;
  name?: string;
  domains: number;
  zones: number;
  subdomains: number;
  proxyZones: number;
  sbtZones: number;
  proxySubdomains: number;
  sbtSubdomains: number;
  registrationDate: string;
  nftAccessAmount: PaymentAttempts;
  totalPaidAttempts: PaymentAttemptsCount;
  totalZoneSpending: number;
  totalSubdomainSpending: number;
  totalProxyZoneSpending: number;
  totalSbtZoneSpending: number;
  totalProxySubdomainSpending: number;
  totalSbtSubdomainSpending: number;
  totalProfit: number;
  createdAt: string;
  updatedAt: string;
}

export interface Zone {
  id: number;
  name: string;
  address: string;
  collectionAddress?: string;
  wrapperAddress?: string;
  proxy: number;
  registrationDate: string;
  subdomainsAmount: number;
  owner?: string;
  status: string;
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
  collectionsAddress?: string;
  lastBid?: number;
  lastBidder?: string;
  bids: string;
  createdAt: string;
  updatedAt: string;
}

export interface Chat {
  id: number;
  domain: string;
  userAddress: string;
  messages?: Message[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'operator' | string;
  text: string;
  timestamp: string;
}

export interface Auction {
  id: number;
  subdomainId: number;
  currentBid: number;
  currentBidder?: string;
  endTime: string;
  status: string;
  bids: string;
  createdAt: string;
  updatedAt: string;
}

export interface Stats {
  totalUsers: number;
  totalChats: number;
  totalMessages: number;
  activeChats: number;
  totalZones: number;
  totalSubdomains: number;
}

// ========== API SERVICE ==========

class ApiService {
  private baseUrl: string;
  private isTestnet: boolean;
  // JWT из TonProof-логина (см. AdminPanelPage/index.tsx) — прикладывается
  // ко ВСЕМ запросам, но реально проверяется только requireAdminAuth-
  // ручками на бэкенде (server-sqlite.ts), остальным всё равно.
  private adminToken: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.isTestnet = false;
  }

  setAdminToken(token: string | null) {
    this.adminToken = token;
  }

  setNetwork(isTestnet: boolean) {
    if (this.isTestnet === isTestnet) return;  // ← уже в нужной сети
    this.isTestnet = isTestnet;
    console.log(`🌐 API переключен на ${isTestnet ? 'testnet' : 'mainnet'}`);
  }

  private addNetworkParam(url: string): string {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}isTestnet=${this.isTestnet}`;
  }

  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (this.adminToken) {
      headers['Authorization'] = `Bearer ${this.adminToken}`;
    }
    return headers;
  }

  

  // ========== ПОЛЬЗОВАТЕЛИ ==========
  async getUser(address: string): Promise<User> {
    const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/users/${address}`));
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    
    // Парсим JSON поля
    const userData = data.data;
    
    // Парсим nftAccessAmount если это строка
    if (userData && typeof userData.nftAccessAmount === 'string') {
      try {
        userData.nftAccessAmount = JSON.parse(userData.nftAccessAmount);
      } catch (e) {
        userData.nftAccessAmount = {
          proxy: {4: false, 5: false, 6: false, 7: false, 8: false, 9: false},
          sbt: {4: false, 5: false, 6: false, 7: false, 8: false, 9: false}
        };
      }
    }
    
    // Парсим totalPaidAttempts если это строка
    if (userData && typeof userData.totalPaidAttempts === 'string') {
      try {
        userData.totalPaidAttempts = JSON.parse(userData.totalPaidAttempts);
      } catch (e) {
        userData.totalPaidAttempts = {
          proxy: {4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0},
          sbt: {4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0}
        };
      }
    }
    
    // Конвертируем числовые поля
    return {
      ...userData,
      domains: Number(userData.domains) || 0,
      zones: Number(userData.zones) || 0,
      subdomains: Number(userData.subdomains) || 0,
      proxyZones: Number(userData.proxyZones) || 0,
      sbtZones: Number(userData.sbtZones) || 0,
      proxySubdomains: Number(userData.proxySubdomains) || 0,
      sbtSubdomains: Number(userData.sbtSubdomains) || 0,
      totalZoneSpending: Number(userData.totalZoneSpending) || 0,
      totalSubdomainSpending: Number(userData.totalSubdomainSpending) || 0,
      totalProxyZoneSpending: Number(userData.totalProxyZoneSpending) || 0,
      totalSbtZoneSpending: Number(userData.totalSbtZoneSpending) || 0,
      totalProxySubdomainSpending: Number(userData.totalProxySubdomainSpending) || 0,
      totalSbtSubdomainSpending: Number(userData.totalSbtSubdomainSpending) || 0,
      totalProfit: Number(userData.totalProfit) || 0
    };
  }

  async createUser(address: string, name?: string): Promise<User> {
    const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/users`), {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ address, name, isTestnet: this.isTestnet }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    
    // Парсим JSON поля как в getUser
    const userData = data.data;
    
    if (userData && typeof userData.nftAccessAmount === 'string') {
      try {
        userData.nftAccessAmount = JSON.parse(userData.nftAccessAmount);
      } catch (e) {
        userData.nftAccessAmount = {
          proxy: {4: false, 5: false, 6: false, 7: false, 8: false, 9: false},
          sbt: {4: false, 5: false, 6: false, 7: false, 8: false, 9: false}
        };
      }
    }
    
    if (userData && typeof userData.totalPaidAttempts === 'string') {
      try {
        userData.totalPaidAttempts = JSON.parse(userData.totalPaidAttempts);
      } catch (e) {
        userData.totalPaidAttempts = {
          proxy: {4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0},
          sbt: {4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0}
        };
      }
    }
    
    return {
      ...userData,
      domains: Number(userData.domains) || 0,
      zones: Number(userData.zones) || 0,
      subdomains: Number(userData.subdomains) || 0,
      proxyZones: Number(userData.proxyZones) || 0,
      sbtZones: Number(userData.sbtZones) || 0,
      proxySubdomains: Number(userData.proxySubdomains) || 0,
      sbtSubdomains: Number(userData.sbtSubdomains) || 0,
      totalZoneSpending: Number(userData.totalZoneSpending) || 0,
      totalSubdomainSpending: Number(userData.totalSubdomainSpending) || 0,
      totalProxyZoneSpending: Number(userData.totalProxyZoneSpending) || 0,
      totalSbtZoneSpending: Number(userData.totalSbtZoneSpending) || 0,
      totalProxySubdomainSpending: Number(userData.totalProxySubdomainSpending) || 0,
      totalSbtSubdomainSpending: Number(userData.totalSbtSubdomainSpending) || 0,
      totalProfit: Number(userData.totalProfit) || 0
    };
  }

  async deleteUser(id: number): Promise<{ success: boolean; message?: string; data?: any; }> {
    try {
      const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/users/${id}`), {
        method: 'DELETE',
        headers: this.getHeaders(),
        body: JSON.stringify({ isTestnet: this.isTestnet })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      return { success: false, message: error.message };
    }
  }

  // ========== ОПЛАЧЕННЫЕ ПОПЫТКИ ==========
  async getUserPaymentAttempts(address: string): Promise<{
    success: boolean;
    data: PaymentAttempts;
    message?: string;
  }> {
    try {
      const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/users/${address}/payments`), {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error getting user payment attempts:', error);
      return {
        success: false,
        data: {
          proxy: {4: false, 5: false, 6: false, 7: false, 8: false, 9: false},
          sbt: {4: false, 5: false, 6: false, 7: false, 8: false, 9: false}
        },
        message: error.message
      };
    }
  }

  async addPaymentAttempt(
    address: string, 
    zoneType: 'proxy' | 'sbt', 
    length: ZoneLength
  ): Promise<{
    success: boolean;
    message?: string;
    data?: any;
  }> {
    try {
      const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/users/${address}/payments`), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ zoneType, length, isTestnet: this.isTestnet })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error adding payment attempt:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async consumePaymentAttempt(
    address: string, 
    zoneType: 'proxy' | 'sbt', 
    length: ZoneLength
  ): Promise<{
    success: boolean;
    message?: string;
    data?: any;
  }> {
    try {
      const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/users/${address}/payments`), {
        method: 'DELETE',
        headers: this.getHeaders(),
        body: JSON.stringify({ zoneType, length, isTestnet: this.isTestnet })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error consuming payment attempt:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async checkPaymentAttempt(
    address: string, 
    zoneType: 'proxy' | 'sbt', 
    length: ZoneLength
  ): Promise<{
    success: boolean;
    data: {
      hasPayment: boolean;
      zoneType: string;
      length: number;
    };
    message?: string;
  }> {
    try {
      const response = await fetch(
        this.addNetworkParam(`${this.baseUrl}/api/users/${address}/payments/check?zoneType=${zoneType}&length=${length}`),
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error checking payment attempt:', error);
      return {
        success: false,
        data: {
          hasPayment: false,
          zoneType,
          length
        },
        message: error.message
      };
    }
  }

  // ========== ЗОНЫ ==========
  async createZone(zoneData: {
    name: string;
    address: string;
    collectionAddress?: string;
    wrapperAddress?: string | null;
    proxy?: boolean;
    owner?: string;
    status?: string;
    zonePrice?: number;
    currentID?: number;
  }): Promise<Zone> {
    const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/zones`), {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ...zoneData, isTestnet: this.isTestnet }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  }

  async updateZoneStatusToInactive(id: number): Promise<Zone> {
    const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/zones/${id}/status`), {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ status: 'inactive', isTestnet: this.isTestnet }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  }

  // Обновление адреса зоны
async updateZoneAddress(id: number, address: string): Promise<Zone> {
  const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/zones/${id}/address`), {
    method: 'PUT',
    headers: this.getHeaders(),
    body: JSON.stringify({ address, isTestnet: this.isTestnet }),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.message);
  return data.data;
}

  // Пока чисто ручная правка в БД, пока нет смартконтракта офферов на продажу
  // Proxy-коллекций (третий таб в MarketPage, планируется отдельно) — админ
  // сверяет офчейн-договорённость сам и правит владельца тут.
  async updateZoneOwner(id: number, owner: string): Promise<Zone> {
    const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/zones/${id}/owner`), {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ owner, isTestnet: this.isTestnet }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  }

  async updateZoneCollection(name: string, collectionAddress: string): Promise<Zone> {
    const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/zones/${name}/collection`), {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ collectionAddress, isTestnet: this.isTestnet }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  }

  async updateZoneWrapper(name: string, wrapperAddress: string): Promise<Zone> {
    const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/zones/${name}/wrapper`), {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ wrapperAddress, isTestnet: this.isTestnet }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  }

  async getUserZones(address: string, isTestnet?: boolean): Promise<Zone[]> {
    const network = isTestnet !== undefined ? isTestnet : this.isTestnet;
    const response = await fetch(`${this.baseUrl}/api/zones/user/${address}?isTestnet=${network}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data.zones;
  }

  async getAllZones(): Promise<Zone[]> {
    const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/zones`));
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data.zones;
  }

  async getZoneByName(name: string): Promise<Zone> {
    const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/zones/name/${name}`));
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  }

  async getZoneById(id: number): Promise<Zone> {
    const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/zones/id/${id}`));
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  }



  async deleteZone(id: number): Promise<{ success: boolean; message?: string; data?: any; }> {
    try {
      const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/zones/${id}`), {
        method: 'DELETE',
        headers: this.getHeaders(),
        body: JSON.stringify({ isTestnet: this.isTestnet })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error: any) {
      console.error('Error deleting zone:', error);
      return { success: false, message: error.message };
    }
  }

  

  // ========== СУБДОМЕНЫ ==========
  async createSubdomain(subdomainData: {
    name: string;
    address: string;
    mintPrice: number;
    links?: string[];
    zoneId?: number;
    owner?: string;
    status?: string;
    auctionEndTime?: string;
    collectionAddress?: string;
  }): Promise<Subdomain> {
    const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/subdomains`), {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ...subdomainData, isTestnet: this.isTestnet }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  }

  async deleteSubdomain(id: number): Promise<{ success: boolean; message?: string; data?: any; }> {
    try {
      const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/subdomains/${id}`), {
        method: 'DELETE',
        headers: this.getHeaders(),
        body: JSON.stringify({ isTestnet: this.isTestnet })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error: any) {
      console.error('Error deleting subdomain:', error);
      return { success: false, message: error.message };
    }
  }

  async addBidToSubdomain(id: number, bidData: {
    bidder: string;
    amount: number;
  }): Promise<Subdomain> {
    const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/subdomains/${id}/bid`), {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ...bidData, isTestnet: this.isTestnet }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  }

  async updateSubdomainAddress(id: number, address: string): Promise<Subdomain> {
  const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/subdomains/${id}/address`), {
    method: 'PUT',
    headers: this.getHeaders(),
    body: JSON.stringify({ address, isTestnet: this.isTestnet }),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.message);
  return data.data;
}

// Обновление владельца субдомена
async updateSubdomainOwner(id: number, ownerAddress: string): Promise<Subdomain> {
  const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/subdomains/${id}/owner`), {
    method: 'PUT',
    headers: this.getHeaders(),
    body: JSON.stringify({ ownerAddress, isTestnet: this.isTestnet }),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.message);
  return data.data;
}

  async getUserSubdomains(address: string, isTestnet?: boolean): Promise<Subdomain[]> {
    const network = isTestnet !== undefined ? isTestnet : this.isTestnet;
    const response = await fetch(`${this.baseUrl}/api/subdomains/user/${address}?isTestnet=${network}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data.subdomains;
  }

  async getZoneSubdomains(zoneId: number): Promise<Subdomain[]> {
    const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/subdomains/zone/${zoneId}`));
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data.subdomains;
  }

  async getAllSubdomains(): Promise<Subdomain[]> {
    const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/subdomains`));
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data.subdomains;
  }

  async getSubdomainByName(name: string): Promise<Subdomain> {
    const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/subdomains/name/${name}`));
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  }

  async getSubdomainsByStatus(status: string): Promise<Subdomain[]> {
    const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/subdomains/status/${status}`));
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data.subdomains;
  }

  async updateSubdomainStatus(id: number, status: string, newOwner?: string): Promise<Subdomain> {
    const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/subdomains/${id}/status`), {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ status, newOwner, isTestnet: this.isTestnet }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  }

  // ========== ЧАТЫ ==========
  async getChat(domain: string, userAddress: string): Promise<Chat> {
    const response = await fetch(
      this.addNetworkParam(`${this.baseUrl}/api/chats/domain/${domain}?userAddress=${userAddress}`)
    );
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  }

  async createChat(domain: string, userAddress: string): Promise<Chat> {
    const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/chats`), {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ domain, userAddress, isTestnet: this.isTestnet }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  }

  async deleteChat(id: number): Promise<{ success: boolean; message?: string; data?: any; }> {
    try {
      const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/chats/${id}`), {
        method: 'DELETE',
        headers: this.getHeaders(),
        body: JSON.stringify({ isTestnet: this.isTestnet })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error: any) {
      console.error('Error deleting chat:', error);
      return { success: false, message: error.message };
    }
  }

  async sendMessage(domain: string, messageData: {
    text: string;
    sender: string;
    userAddress: string;
  }): Promise<Chat> {
    const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/chats/${domain}/messages`), {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ...messageData, isTestnet: this.isTestnet }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  }

  async deleteMessage(id: number): Promise<{ success: boolean; message?: string; data?: any; }> {
    try {
      const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/messages/${id}`), {
        method: 'DELETE',
        headers: this.getHeaders(),
        body: JSON.stringify({ isTestnet: this.isTestnet })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error: any) {
      console.error('Error deleting message:', error);
      return { success: false, message: error.message };
    }
  }

  // ========== СТАТИСТИКА ==========
  async getStats(): Promise<Stats> {
    const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/stats`));
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  }

  // Relay-only: сообщает боту факт привязки/отвязки DNS-записи, ничего не
  // пишет в БД. Значение записи (адрес/ADNL/bagID) намеренно не передаётся —
  // это то же самое, что уже скрыто за самим доменом.
  async notifyDnsRecordUpdated(
    domain: string,
    recordFormat: 'address' | 'adnl' | 'bagId',
    action: 'set' | 'delete'
  ): Promise<void> {
    try {
      await fetch(this.addNetworkParam(`${this.baseUrl}/api/notifications/dns-record`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, recordFormat, action }),
      });
    } catch (error) {
      console.error('Error notifying about DNS record update:', error);
    }
  }

  // Relay-only: сообщает боту о создании зоны (proxy/SBT), ничего не пишет в
  // БД — старый createZone()/POST /api/zones остаётся отдельно для легаси-читателей.
  async notifyZoneCreated(zoneData: {
    name: string;
    address: string;
    collectionAddress?: string;
    proxy: boolean;
    owner: string;
    zonePrice: number;
    currentID?: number;
  }): Promise<void> {
    try {
      await fetch(this.addNetworkParam(`${this.baseUrl}/api/notifications/zone-created`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(zoneData),
      });
    } catch (error) {
      console.error('Error notifying about zone creation:', error);
    }
  }

  // Relay-only: сообщает боту о создании субдомена (SBT-минт или старт
  // proxy-аукциона), ничего не пишет в БД.
  async notifySubdomainCreated(subdomainData: {
    name: string;
    address: string;
    mintPrice: number;
    owner: string;
    status: 'auction' | 'active';
  }): Promise<void> {
    try {
      await fetch(this.addNetworkParam(`${this.baseUrl}/api/notifications/subdomain-created`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subdomainData),
      });
    } catch (error) {
      console.error('Error notifying about subdomain creation:', error);
    }
  }

  // Relay-only: сообщает боту о новой ставке на аукционе. Полная история
  // ставок читается ончейн (getAuctionBidHistory), в БД ничего не пишем.
  async notifyNewBid(bidData: {
    domain: string;
    bidder: string;
    amount: number;
    previousBidder?: string;
  }): Promise<void> {
    try {
      await fetch(this.addNetworkParam(`${this.baseUrl}/api/notifications/bid`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bidData),
      });
    } catch (error) {
      console.error('Error notifying about new bid:', error);
    }
  }

  // Relay-only: сообщает боту о завершении аукциона клеймом. Финальную цену
  // берём из уже загруженного ончейн auctionInfo — в БД ничего не пишем.
  async notifyAuctionEnded(data: {
    domain: string;
    winner: string;
    finalPrice: number;
  }): Promise<void> {
    try {
      await fetch(this.addNetworkParam(`${this.baseUrl}/api/notifications/auction-ended`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Error notifying about auction end:', error);
    }
  }

  // Relay-only: сообщает боту о деактивации SBT-зоны при пересоздании — не
  // зависит от наличия DB-строки зоны (в отличие от updateZoneStatusToInactive).
  async notifyZoneDeactivated(data: { name: string; address: string }): Promise<void> {
    try {
      await fetch(this.addNetworkParam(`${this.baseUrl}/api/notifications/zone-deactivated`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Error notifying about zone deactivation:', error);
    }
  }

  // ========== ЗАЯВКИ НА ДЕЙСТВИЯ АДРЕСА ПЛОЩАДКИ ==========
  // change_content/деактивация SBT-зоны может исполнить только сам адрес
  // площадки — юзерский клик создаёт заявку тут вместо (обречённой) отправки
  // транзакции со своего кошелька, см. confirmSbtZoneToggle в ProfileWidget.

  async createPendingAction(data: {
    actionType: string;
    targetType: string;
    targetAddress: string;
    targetCollectionAddress?: string;
    targetName: string;
    requestedBy: string;
  }): Promise<{ success: boolean; data?: any; alreadyPending?: boolean; message?: string }> {
    try {
      const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/admin/pending-actions`), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error: any) {
      console.error('Error creating pending action:', error);
      return { success: false, message: error.message };
    }
  }

  async getPendingActionsMap(actionType: string = 'deactivate_zone'): Promise<Record<string, boolean>> {
    try {
      const response = await fetch(
        this.addNetworkParam(`${this.baseUrl}/api/admin/pending-actions/pending-map?actionType=${encodeURIComponent(actionType)}`)
      );
      const data = await response.json();
      return data.success ? data.data : {};
    } catch (error) {
      console.error('Error fetching pending actions map:', error);
      return {};
    }
  }

  async getPendingActions(status?: string): Promise<{ success: boolean; data?: any[]; message?: string }> {
    try {
      const url = status
        ? `${this.baseUrl}/api/admin/pending-actions?status=${encodeURIComponent(status)}`
        : `${this.baseUrl}/api/admin/pending-actions`;
      const response = await fetch(this.addNetworkParam(url), { headers: this.getHeaders() });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error: any) {
      console.error('Error fetching pending actions:', error);
      return { success: false, message: error.message };
    }
  }

  async completePendingAction(id: number, txHash?: string): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const response = await fetch(this.addNetworkParam(`${this.baseUrl}/api/admin/pending-actions/${id}/complete`), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ txHash }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error: any) {
      console.error('Error completing pending action:', error);
      return { success: false, message: error.message };
    }
  }

  // ========== ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ ==========
  async checkDomainAvailability(domain: string): Promise<boolean> {
    try {
      const response = await fetch(`https://toncenter.com/api/v3/dns/records?domain=${domain}`);
      const data = await response.json();
      return !data.records || data.records.length === 0;
    } catch {
      return false;
    }
  }

  async getDNSRecords(walletAddress: string): Promise<any[]> {
    try {
      const response = await fetch(`https://toncenter.com/api/v3/dns/records?wallet=${walletAddress}`);
      const data = await response.json();
      return data.records || [];
    } catch {
      return [];
    }
  }

  // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========
  // async registerOrGetUser(address: string, name: string | undefined): Promise<User> {
  //   try {
  //     return await this.getUser(address);
  //   } catch (error) {
  //     return await this.createUser(address, name);
  //   }
  // }

  async registerOrGetUser(address: string, name: string | undefined): Promise<User> {
  // Всегда пытаемся создать, если 409 (уже есть) — получаем существующего
  try {
    return await this.createUser(address, name);
  } catch (error: any) {
    if (error.message?.includes('уже существует')) {
      return await this.getUser(address);
    }
    throw error;
  }
}

}

export const apiService = new ApiService();

// ========== HOOKS ==========

export function useUserAPI() {
  const getUser = async (address: string) => await apiService.getUser(address);
  const createUser = async (address: string, name?: string) => await apiService.createUser(address, name);
  const registerOrGetUser = async (address: string, name?: string) => await apiService.registerOrGetUser(address, name);
  const deleteUser = async (id: number) => await apiService.deleteUser(id);
  
  return {
    getUser,
    createUser,
    registerOrGetUser,
    deleteUser
  };
}

export function useZonesAPI() {
  const createZone = async (zoneData: Parameters<typeof apiService.createZone>[0]) => 
    await apiService.createZone(zoneData);
  
  const getUserZones = async (address: string, isTestnet?: boolean) => 
    await apiService.getUserZones(address, isTestnet);
  
  const getAllZones = async () => 
    await apiService.getAllZones();
  
  const updateZoneCollection = async (name: string, collectionAddress: string) => 
    await apiService.updateZoneCollection(name, collectionAddress);
  
  const updateZoneWrapper = async (name: string, wrapperAddress: string) => 
    await apiService.updateZoneWrapper(name, wrapperAddress);
  
  const getZoneById = async (id: number) => 
    await apiService.getZoneById(id);

  const updateZoneAddress = async (id: number, address: string) => 
  await apiService.updateZoneAddress(id, address);

  const deleteZone = async (id: number) => await apiService.deleteZone(id);
  
  return {
    createZone,
    getUserZones,
    getAllZones,
    updateZoneCollection,
    updateZoneWrapper,
    getZoneById,
    updateZoneAddress,
    deleteZone
  };
}

export function useSubdomainsAPI() {
  const createSubdomain = async (subdomainData: Parameters<typeof apiService.createSubdomain>[0]) => 
    await apiService.createSubdomain(subdomainData);
  
  const getUserSubdomains = async (address: string, isTestnet?: boolean) => 
    await apiService.getUserSubdomains(address, isTestnet);
  
  const getZoneSubdomains = async (zoneId: number) => 
    await apiService.getZoneSubdomains(zoneId);
  
  const updateSubdomainStatus = async (id: number, status: string, newOwner: string) => 
    await apiService.updateSubdomainStatus(id, status, newOwner);
  
  const addBidToSubdomain = async (id: number, bidData: { bidder: string; amount: number }) => 
    await apiService.addBidToSubdomain(id, bidData);

  const updateSubdomainAddress = async (id: number, address: string) => 
  await apiService.updateSubdomainAddress(id, address);

  const updateSubdomainOwner = async (id: number, ownerAddress: string) => 
  await apiService.updateSubdomainOwner(id, ownerAddress);
  
  const getAllSubdomains = async () => 
    await apiService.getAllSubdomains();
  
  const getSubdomainsByStatus = async (status: string) => 
    await apiService.getSubdomainsByStatus(status);

  const deleteSubdomain = async (id: number) => await apiService.deleteSubdomain(id);
  
  return {
    createSubdomain,
    getUserSubdomains,
    getZoneSubdomains,
    updateSubdomainStatus,
    addBidToSubdomain,
    updateSubdomainAddress,
    updateSubdomainOwner,
    getAllSubdomains,
    getSubdomainsByStatus,
    deleteSubdomain
  };
}

  // Вспомогательная функция для получения ключа:
export const getZoneLengthKey = (length: number): ZoneLength | null => {
 if (length < 4) {
    return null; // Слишком короткие домены не поддерживаются
  }
  
  if (length >= 4 && length <= 9) {
    return length as ZoneLength;
  }
  
  // Для длин больше 9 возвращаем 9
  return 9;
};

export function usePaymentAttemptsAPI() {
  const getUserPaymentAttempts = async (address: string) => 
    await apiService.getUserPaymentAttempts(address);
  
  const addPaymentAttempt = async (address: string, zoneType: 'proxy' | 'sbt', length: ZoneLength) => 
    await apiService.addPaymentAttempt(address, zoneType, length);
  
  const consumePaymentAttempt = async (address: string, zoneType: 'proxy' | 'sbt', length: ZoneLength) => 
    await apiService.consumePaymentAttempt(address, zoneType, length);
  
  const checkPaymentAttempt = async (address: string, zoneType: 'proxy' | 'sbt', length: ZoneLength) => 
    await apiService.checkPaymentAttempt(address, zoneType, length);
  
  return {
    getUserPaymentAttempts,
    addPaymentAttempt,
    consumePaymentAttempt,
    checkPaymentAttempt,
  };
}

export function useChatsAPI() {
  const getChat = async (domain: string, userAddress: string) => await apiService.getChat(domain, userAddress);
  const createChat = async (domain: string, userAddress: string) => await apiService.createChat(domain, userAddress);
  const sendMessage = async (domain: string, messageData: { text: string; sender: string; userAddress: string }) => 
    await apiService.sendMessage(domain, messageData);
  const deleteChat = async (id: number) => await apiService.deleteChat(id);
  const deleteMessage = async (id: number) => await apiService.deleteMessage(id);
  
  return { getChat, createChat, sendMessage, deleteChat, deleteMessage };
}
