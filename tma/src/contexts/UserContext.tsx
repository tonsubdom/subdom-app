// src/contexts/UserContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useTonWallet } from '@tonconnect/ui-react';
import { apiService, User as ApiUser, Zone as ApiZone, Subdomain as ApiSubdomain, PaymentAttemptsCount } from '@/services/api';

// Интерфейсы для UserContext
interface User extends ApiUser {
  // Все поля уже определены в ApiUser
}

interface Zone extends ApiZone {
  // Наследуем все поля из ApiZone
}

interface Subdomain extends ApiSubdomain {
  // Наследуем все поля из ApiSubdomain
}

interface UserContextType {
  user: User | null;
  zones: Zone[];
  subdomains: Subdomain[];
  loading: boolean;
  error: string | null;
  connectWallet: (walletAddress: string, domainName: string) => Promise<void>;
  disconnectWallet: () => void;
  createZone: (zoneData: {
    name: string;
    bundleAddress?: string;
    proxy?: boolean;
    linkWithNFTNumber?: number;
  }) => Promise<Zone>;
  createSubdomain: (subdomainData: {
    name: string;
    mintPrice: number;
    links?: string[];
    zoneId?: number;
    status?: string;
    auctionEndTime?: string;
  }) => Promise<Subdomain>;
  refreshSubdomains: () => Promise<void>;
  refreshZones: () => Promise<void>;
  refreshUser: () => Promise<void>;
  // Новые методы для работы с финансовыми данными
  getUserFinancialSummary: () => {
    totalZoneSpending: number;
    totalSubdomainSpending: number;
    totalProxyZoneSpending: number;
    totalSbtZoneSpending: number;
    totalProxySubdomainSpending: number;
    totalSbtSubdomainSpending: number;
    totalProfit: number;
  };
  getUserPaymentAttemptsSummary: () => {
    totalProxyAttempts: number;
    totalSbtAttempts: number;
    totalAttempts: number;
    byLength: {
      proxy: Record<number, number>;
      sbt: Record<number, number>;
    };
  };
  // Длина SBT-попытки, подаренной юзеру промо-акцией при регистрации (см.
  // server-sqlite.ts POST /api/users) — не null только сразу после первого
  // подключения кошелька в этой сессии, пока юзер не закроет модалку-реролл
  // или не перейдёт в создание зоны. Не персистится намеренно — реролл
  // должен показаться один раз, не при каждом заходе в приложение.
  promoRevealLength: number | null;
  dismissPromoReveal: () => void;
}

// Создаем контекст
const UserContext = createContext<UserContextType | undefined>(undefined);

// Хук для использования контекста
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

// Отдельные хуки для удобства
export const useZones = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useZones must be used within a UserProvider');
  }
  return {
    zones: context.zones,
    loading: context.loading,
    error: context.error,
    refreshZones: context.refreshZones,
  };
};

export const useSubdomains = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useSubdomains must be used within a UserProvider');
  }
  return {
    subdomains: context.subdomains,
    loading: context.loading,
    error: context.error,
    refreshSubdomains: context.refreshSubdomains,
  };
};

// Вспомогательные функции для парсинга JSON полей
const parseUserFields = (apiUser: ApiUser): User => {
  return {
    id: apiUser.id,
    address: apiUser.address,
    name: apiUser.name,
    domains: apiUser.domains,
    zones: apiUser.zones,
    subdomains: apiUser.subdomains,
    proxyZones: apiUser.proxyZones || 0,
    sbtZones: apiUser.sbtZones || 0,
    proxySubdomains: apiUser.proxySubdomains || 0,
    sbtSubdomains: apiUser.sbtSubdomains || 0,
    registrationDate: apiUser.registrationDate,
    nftAccessAmount: apiUser.nftAccessAmount,
    totalPaidAttempts: apiUser.totalPaidAttempts,
    totalZoneSpending: apiUser.totalZoneSpending || 0,
    totalSubdomainSpending: apiUser.totalSubdomainSpending || 0,
    totalProxyZoneSpending: apiUser.totalProxyZoneSpending || 0,
    totalSbtZoneSpending: apiUser.totalSbtZoneSpending || 0,
    totalProxySubdomainSpending: apiUser.totalProxySubdomainSpending || 0,
    totalSbtSubdomainSpending: apiUser.totalSbtSubdomainSpending || 0,
    totalProfit: apiUser.totalProfit || 0,
    createdAt: apiUser.createdAt,
    updatedAt: apiUser.updatedAt,
  };
};

const parseSubdomainFields = (apiSubdomain: ApiSubdomain): Subdomain => {
  return {
    ...apiSubdomain,
  };
};

// Провайдер
interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [subdomains, setSubdomains] = useState<Subdomain[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoRevealLength, setPromoRevealLength] = useState<number | null>(null);
  const wallet = useTonWallet();                                    // ← ДОБАВИТЬ
  const isTestnet = wallet?.account?.chain === "-3";

  const dismissPromoReveal = () => setPromoRevealLength(null);

  // Из nftAccessAmount.sbt достаём ту единственную длину, где промо-акция
  // выставила true — если их вдруг несколько (юзер и так уже что-то покупал),
  // берём первую попавшуюся, это чисто для витрины модалки, не для логики выдачи.
  const findGrantedSbtLength = (u: User): number | null => {
    const sbt = u.nftAccessAmount?.sbt;
    if (!sbt) return null;
    const lengths = Object.keys(sbt).map(Number).sort((a, b) => a - b);
    for (const length of lengths) {
      if (sbt[length as keyof typeof sbt]) return length;
    }
    return null;
  };


  useEffect(() => {
  const loadStoredUser = async () => {
    const storedAddress = localStorage.getItem('walletAddress');
    const storedUserData = localStorage.getItem('userData');

    if (storedAddress && storedUserData) {
      try {
        apiService.setNetwork(isTestnet);

        // ВАЖНО: всегда синхронизируем с backend, не полагаемся на localStorage
        const apiUser = await apiService.registerOrGetUser(storedAddress, undefined);
        const userData = parseUserFields(apiUser);
        setUser(userData);

        // Загружаем зоны пользователя
        const userZones = await apiService.getUserZones(storedAddress);
        setZones(userZones);

        // Загружаем субдомены пользователя
        const userSubdomains = await apiService.getUserSubdomains(storedAddress);
        setSubdomains(userSubdomains.map(parseSubdomainFields));
      } catch (error) {
        console.error('Ошибка загрузки сохраненных данных:', error);
        localStorage.removeItem('walletAddress');
        localStorage.removeItem('userData');
      }
    }
  };

  loadStoredUser();
}, [isTestnet]);


  // Подключение кошелька
  const connectWallet = async (walletAddress: string, name: string) => {
    setLoading(true);
    setError(null);
    
    try {
      apiService.setNetwork(isTestnet);
      // Регистрируем/получаем пользователя на бэкенде
      const { user: apiUser, isNewUser } = await apiService.registerOrGetUserWithMeta(walletAddress, name);
      const transformedUser = parseUserFields(apiUser);

      setUser(transformedUser);
      if (isNewUser) {
        const grantedLength = findGrantedSbtLength(transformedUser);
        if (grantedLength) setPromoRevealLength(grantedLength);
      }

      // Загружаем зоны пользователя
      const userZones = await apiService.getUserZones(walletAddress);
      setZones(userZones);
      
      // Загружаем субдомены пользователя
      const userSubdomains = await apiService.getUserSubdomains(walletAddress);
      setSubdomains(userSubdomains.map(parseSubdomainFields));
      
      // Сохраняем в localStorage для persistence
      localStorage.setItem('walletAddress', walletAddress);
      localStorage.setItem('userData', JSON.stringify(transformedUser));
      
    } catch (err: any) {
      setError(err.message || 'Ошибка подключения кошелька');
      console.error('Ошибка подключения:', err);
    } finally {
      setLoading(false);
    }
  };

  // Отключение кошелька
  const disconnectWallet = () => {
    setUser(null);
    setZones([]);
    setSubdomains([]);
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('userData');
  };

  // Обновление пользователя
  const refreshUser = async () => {
    if (!user) return;
    
    try {
      apiService.setNetwork(isTestnet);
      const apiUser = await apiService.getUser(user.address);
      const transformedUser = parseUserFields(apiUser);
      setUser(transformedUser);
      localStorage.setItem('userData', JSON.stringify(transformedUser));
    } catch (error) {
      console.error('Ошибка обновления пользователя:', error);
    }
  };

  // Создание зоны
  const createZone = async (zoneData: {
    name: string;
    bundleAddress?: string;
    proxy?: boolean;
    linkWithNFTNumber?: number;
  }) => {
    if (!user) throw new Error('Пользователь не авторизован');
    
    setLoading(true);
    setError(null);
    
    try {
      apiService.setNetwork(isTestnet);
      const newZone = await apiService.createZone({
        ...zoneData,
        address: user.address,
        owner: user.address,
      });
      
      setZones(prev => [...prev, newZone]);
      return newZone;
    } catch (err: any) {
      setError(err.message || 'Ошибка создания зоны');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Создание субдомена
  const createSubdomain = async (subdomainData: {
    name: string;
    mintPrice: number;
    links?: string[];
    zoneId?: number;
    status?: string;
    auctionEndTime?: string;
  }) => {
    if (!user) throw new Error('Пользователь не авторизован');
    
    setLoading(true);
    setError(null);
    
    try {
      apiService.setNetwork(isTestnet);
      const newSubdomain = await apiService.createSubdomain({
        ...subdomainData,
        address: user.address,
        owner: user.address,
      });
      
      const transformedSubdomain = parseSubdomainFields(newSubdomain);
      setSubdomains(prev => [...prev, transformedSubdomain]);
      return transformedSubdomain;
    } catch (err: any) {
      setError(err.message || 'Ошибка создания субдомена');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Обновление субдоменов
  const refreshSubdomains = async () => {
    if (!user) return;
    
    try {
      apiService.setNetwork(isTestnet);
      const userSubdomains = await apiService.getUserSubdomains(user.address);
      setSubdomains(userSubdomains.map(parseSubdomainFields));
    } catch (error) {
      console.error('Ошибка обновления субдоменов:', error);
    }
  };

  // Обновление зон
  const refreshZones = async () => {
    if (!user) return;
    
    try {
      apiService.setNetwork(isTestnet);
      const userZones = await apiService.getUserZones(user.address);
      setZones(userZones);
    } catch (error) {
      console.error('Ошибка обновления зон:', error);
    }
  };

  // Новые методы для работы с финансовыми данными

  // Получить финансовую сводку пользователя
  const getUserFinancialSummary = () => {
    if (!user) {
      return {
        totalZoneSpending: 0,
        totalSubdomainSpending: 0,
        totalProxyZoneSpending: 0,
        totalSbtZoneSpending: 0,
        totalProxySubdomainSpending: 0,
        totalSbtSubdomainSpending: 0,
        totalProfit: 0
      };
    }

    return {
      totalZoneSpending: user.totalZoneSpending || 0,
      totalSubdomainSpending: user.totalSubdomainSpending || 0,
      totalProxyZoneSpending: user.totalProxyZoneSpending || 0,
      totalSbtZoneSpending: user.totalSbtZoneSpending || 0,
      totalProxySubdomainSpending: user.totalProxySubdomainSpending || 0,
      totalSbtSubdomainSpending: user.totalSbtSubdomainSpending || 0,
      totalProfit: user.totalProfit || 0
    };
  };

  // Получить сводку по оплаченным попыткам
  const getUserPaymentAttemptsSummary = () => {
    if (!user || !user.totalPaidAttempts) {
      return {
        totalProxyAttempts: 0,
        totalSbtAttempts: 0,
        totalAttempts: 0,
        byLength: {
          proxy: {4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0},
          sbt: {4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0}
        }
      };
    }

    const attempts = user.totalPaidAttempts;
    
    // Рассчитываем общее количество попыток
    const totalProxyAttempts = Object.values(attempts.proxy || {}).reduce((sum, count) => sum + count, 0);
    const totalSbtAttempts = Object.values(attempts.sbt || {}).reduce((sum, count) => sum + count, 0);
    const totalAttempts = totalProxyAttempts + totalSbtAttempts;

    return {
      totalProxyAttempts,
      totalSbtAttempts,
      totalAttempts,
      byLength: {
        proxy: attempts.proxy || {4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0},
        sbt: attempts.sbt || {4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0}
      }
    };
  };

  // Значение контекста
  const contextValue: UserContextType = {
    user,
    zones,
    subdomains,
    loading,
    error,
    connectWallet,
    disconnectWallet,
    createZone,
    createSubdomain,
    refreshSubdomains,
    refreshZones,
    refreshUser,
    getUserFinancialSummary,
    getUserPaymentAttemptsSummary,
    promoRevealLength,
    dismissPromoReveal,
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

// Дополнительные хуки для удобства

// Хук для получения финансовых данных пользователя
export const useUserFinancialData = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserFinancialData must be used within a UserProvider');
  }
  
  return {
    getFinancialSummary: context.getUserFinancialSummary,
    getPaymentAttemptsSummary: context.getUserPaymentAttemptsSummary,
    user: context.user
  };
};

// Хук для получения статистики пользователя
export const useUserStats = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserStats must be used within a UserProvider');
  }
  
  const { user, zones, subdomains } = context;
  
  const getZoneStats = useMemo(() => {
    if (!user) {
      return {
        totalZones: 0,
        proxyZones: 0,
        sbtZones: 0
      };
    }
    
    return {
      totalZones: user.zones || 0,
      proxyZones: user.proxyZones || 0,
      sbtZones: user.sbtZones || 0
    };
  }, [user]);
  
  const getSubdomainStats = useMemo(() => {
    if (!user) {
      return {
        totalSubdomains: 0,
        proxySubdomains: 0,
        sbtSubdomains: 0
      };
    }
    
    return {
      totalSubdomains: user.subdomains || 0,
      proxySubdomains: user.proxySubdomains || 0,
      sbtSubdomains: user.sbtSubdomains || 0
    };
  }, [user]);
  
  const getAuctionStats = useMemo(() => {
    const auctionSubdomains = subdomains.filter(sub => sub.status === 'auction');
    return {
      activeAuctions: auctionSubdomains.length
    };
  }, [subdomains]);
  
  return {
    zoneStats: getZoneStats,
    subdomainStats: getSubdomainStats,
    auctionStats: getAuctionStats,
    user,
    zones,
    subdomains
  };
};

// Утилитарные функции для форматирования данных
export const formatTonAmount = (amount: number): string => {
  return amount.toFixed(2) + ' TON';
};

export const formatAttemptsByLength = (attempts: PaymentAttemptsCount): string => {
  if (!attempts) return 'Нет данных';
  
  const proxyCounts = Object.entries(attempts.proxy || {})
    .filter(([_, count]) => count > 0)
    .map(([length, count]) => `${length} симв: ${count}`)
    .join(', ');
    
  const sbtCounts = Object.entries(attempts.sbt || {})
    .filter(([_, count]) => count > 0)
    .map(([length, count]) => `${length} симв: ${count}`)
    .join(', ');
    
  const proxyText = proxyCounts ? `Proxy: ${proxyCounts}` : '';
  const sbtText = sbtCounts ? `SBT: ${sbtCounts}` : '';
  
  return [proxyText, sbtText].filter(Boolean).join(' | ') || 'Нет оплаченных попыток';
};

export const calculateTotalAttempts = (attempts: PaymentAttemptsCount): number => {
  if (!attempts) return 0;
  
  const proxyTotal = Object.values(attempts.proxy || {}).reduce((sum, count) => sum + count, 0);
  const sbtTotal = Object.values(attempts.sbt || {}).reduce((sum, count) => sum + count, 0);
  
  return proxyTotal + sbtTotal;
};

