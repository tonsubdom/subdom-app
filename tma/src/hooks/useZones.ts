
// src/hooks/useZones.ts
// import { useState, useCallback, useEffect } from 'react';
// import { apiService, Zone } from '@/services/api';
// import { useUser } from '@/contexts/UserContext';
// import { useTonAddress } from '@tonconnect/ui-react';
// import { useTonWallet } from '@tonconnect/ui-react';

// interface UseZonesReturn {
//   // Все зоны
//   allZones: Zone[];
//   loading: boolean;
//   error: string | null;
  
//   // Proxy зоны (ВСЕ Proxy зоны)
//   proxyZones: Zone[];
  
//   // SBT зоны пользователя (только где владелец = текущий пользователь)
//   sbtZones: Zone[];
  
//   // Функции
//   refreshZones: () => Promise<void>;
//   createZone: (zoneData: {
//     name: string;
//     collectionAddress?: string;
//     wrapperAddress?: string;
//     proxy?: boolean;
//     owner?: string;
//   }) => Promise<Zone>;
//   updateZoneCollection: (name: string, collectionAddress: string) => Promise<Zone>;
//   updateZoneWrapper: (name: string, wrapperAddress: string) => Promise<Zone>;
// }

// // Вспомогательные функции для определения типа зоны
// // const isProxyZone = (zone: Zone): boolean => {
// //   const proxyValue = zone.proxy;
  
// //   // Если это число
// //   if (typeof proxyValue === 'number') {
// //     return proxyValue === 1;
// //   }
  
// //   // Если это строка
// //   if (typeof proxyValue === 'string') {
// //     const lowerValue = proxyValue.toLowerCase();
// //     return lowerValue === 'proxy' || lowerValue === '1';
// //   }
  
// //   return false;
// // };

// // const isSbtZone = (zone: Zone): boolean => {
// //   const proxyValue = zone.proxy;
  
// //   // Если это число
// //   if (typeof proxyValue === 'number') {
// //     return proxyValue === 0;
// //   }
  
// //   // Если это строка
// //   if (typeof proxyValue === 'string') {
// //     const lowerValue = proxyValue.toLowerCase();
// //     return lowerValue === 'sbt' || lowerValue === '0';
// //   }
  
// //   return false;
// // };
// const isProxyZone = (zone: Zone): boolean => {
//   // proxy всегда number: 1 = Proxy, 0 = SBT
//   return zone.proxy === 1;
// };

// const isSbtZone = (zone: Zone): boolean => {
//   // proxy всегда number: 1 = Proxy, 0 = SBT
//   return zone.proxy === 0;
// };

// export const useZones = (): UseZonesReturn => {
//   const { user } = useUser();
//   const userAddress = useTonAddress();
//   const wallet = useTonWallet();
//   const [allZones, setAllZones] = useState<Zone[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   // Определяем сеть
//   const isTestnet = wallet?.account?.chain === "-3";

//   // Загрузка всех зон
//   const loadZones = useCallback(async () => {
//     setLoading(true);
//     setError(null);
    
//     try {
//       console.log(`📡 Загружаем зоны из базы (${isTestnet ? 'testnet' : 'mainnet'})...`);
      
//       // Устанавливаем сеть перед вызовом
//       apiService.setNetwork(isTestnet);
      
//       const zones = await apiService.getAllZones();
//       console.log('✅ Зоны загружены:', zones.length);
      
//       // Отладочная информация
//       zones.forEach((zone, index) => {
//         console.log(`Зона ${index + 1}:`, {
//           name: zone.name,
//           proxy: zone.proxy,
//           proxyType: typeof zone.proxy,
//           isProxy: isProxyZone(zone),
//           isSbt: isSbtZone(zone),
//           owner: zone.owner,
//           userAddress: user?.address,
//           ownerMatches: zone.owner === user?.address,
//           collectionAddress: zone.collectionAddress ? '✓' : '✗'
//         });
//       });
      
//       setAllZones(zones);
//     } catch (err: any) {
//       setError(err.message || 'Ошибка загрузки зон');
//       console.error('❌ Ошибка загрузки зон:', err);
//     } finally {
//       setLoading(false);
//     }
//   }, [user?.address, isTestnet]);

//   // Proxy зоны - ВСЕ Proxy зоны
//   const proxyZones = allZones.filter(zone => isProxyZone(zone));

//   // SBT зоны - только зоны текущего пользователя
//   const sbtZones = allZones.filter(zone => 
//     isSbtZone(zone) && zone.owner === userAddress
//   );

//   // Создание зоны
//   const createZone = useCallback(async (zoneData: {
//     name: string;
//     collectionAddress?: string;
//     wrapperAddress?: string;
//     proxy?: boolean;
//     owner?: string;
//   }) => {
//     if (!user?.address) {
//       throw new Error('Пользователь не авторизован');
//     }

//     setLoading(true);
//     setError(null);
    
//     try {
//       // Устанавливаем сеть перед вызовом
//       apiService.setNetwork(isTestnet);
      
//       const newZone = await apiService.createZone({
//         ...zoneData,
//         address: user.address,
//         owner: zoneData.owner || user.address,
//       });
      
//       // Обновляем список зон
//       setAllZones(prev => [...prev, newZone]);
//       return newZone;
//     } catch (err: any) {
//       setError(err.message || 'Ошибка создания зоны');
//       throw err;
//     } finally {
//       setLoading(false);
//     }
//   }, [user?.address, isTestnet]);

//   // Обновление collectionAddress зоны
//   const updateZoneCollection = useCallback(async (name: string, collectionAddress: string) => {
//     setLoading(true);
//     setError(null);
    
//     try {
//       // Устанавливаем сеть перед вызовом
//       apiService.setNetwork(isTestnet);
      
//       const updatedZone = await apiService.updateZoneCollection(name, collectionAddress);
      
//       // Обновляем зону в списке
//       setAllZones(prev => 
//         prev.map(zone => zone.name === name ? updatedZone : zone)
//       );
      
//       return updatedZone;
//     } catch (err: any) {
//       setError(err.message || 'Ошибка обновления зоны');
//       throw err;
//     } finally {
//       setLoading(false);
//     }
//   }, [isTestnet]);

//   // Обновление wrapperAddress зоны
//   const updateZoneWrapper = useCallback(async (name: string, wrapperAddress: string) => {
//     setLoading(true);
//     setError(null);
    
//     try {
//       // Устанавливаем сеть перед вызовом
//       apiService.setNetwork(isTestnet);
      
//       const updatedZone = await apiService.updateZoneWrapper(name, wrapperAddress);
      
//       // Обновляем зону в списке
//       setAllZones(prev => 
//         prev.map(zone => zone.name === name ? updatedZone : zone)
//       );
      
//       return updatedZone;
//     } catch (err: any) {
//       setError(err.message || 'Ошибка обновления зоны');
//       throw err;
//     } finally {
//       setLoading(false);
//     }
//   }, [isTestnet]);

//   // Загружаем зоны при монтировании
//   useEffect(() => {
//     loadZones();
//   }, [loadZones]);

//   // Обновляем зоны при изменении сети
//   useEffect(() => {
//     if (wallet) {
//       loadZones();
//     }
//   }, [wallet, isTestnet, loadZones]);

//   return {
//     allZones,
//     loading,
//     error,
//     proxyZones,
//     sbtZones,
//     refreshZones: loadZones,
//     createZone,
//     updateZoneCollection,
//     updateZoneWrapper,
//   };
// };

// // Утилита для создания мапа коллекций
// export const createCollectionAddressMap = (zones: Zone[]): Record<string, string> => {
//   const map: Record<string, string> = {};
  
//   zones.forEach(zone => {
//     if (zone.name && zone.collectionAddress) {
//       map[zone.name] = zone.collectionAddress;
//     }
//   });
  
//   return map;
// };

// // Утилита для фильтрации зон по типу
// export const filterZonesByType = (zones: Zone[], type: 'proxy' | 'sbt', userAddress?: string): Zone[] => {
//   if (type === 'proxy') {
//     return zones.filter(zone => isProxyZone(zone));
//   } else {
//     return zones.filter(zone => 
//       isSbtZone(zone) && (!userAddress || zone.owner === userAddress)
//     );
//   }
// };

// // Утилита для получения информации о зоне
// export const getZoneInfo = (zone: Zone) => {
//   const type = isProxyZone(zone) ? 'proxy' : 'sbt';
//   const typeLabel = type === 'proxy' ? '🌐 Proxy' : '🔒 SBT';
//   const typeColor = type === 'proxy' ? '#4caf50' : '#3b82f6';
  
//   let status = 'Inactive';
//   let statusColor = '#9ca3af';
  
//   if (zone.subdomainsAmount > 0) {
//     status = 'Active';
//     statusColor = '#4caf50';
//   } else if (zone.collectionAddress) {
//     status = 'Ready';
//     statusColor = '#ff9800';
//   }
  
//   return {
//     type,
//     typeLabel,
//     typeColor,
//     status,
//     statusColor,
//     hasCollection: !!zone.collectionAddress,
//     hasWrapper: !!zone.wrapperAddress,
//     isProxy: isProxyZone(zone),
//     isSBT: isSbtZone(zone),
//   };
// };
// src/hooks/useZones.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { apiService, Zone } from '@/services/api';
import { useUser } from '@/contexts/UserContext';
import { useTonAddress } from '@tonconnect/ui-react';
import { useTonWallet } from '@tonconnect/ui-react';

interface UseZonesReturn {
  // Все зоны
  allZones: Zone[];
  loading: boolean;
  error: string | null;
  
  // Proxy зоны (ВСЕ Proxy зоны)
  proxyZones: Zone[];
  
  // SBT зоны пользователя (только где владелец = текущий пользователь)
  sbtZones: Zone[];
  
  // Функции
  refreshZones: () => Promise<void>;
  createZone: (zoneData: {
    name: string;
    collectionAddress?: string;
    wrapperAddress?: string;
    proxy?: boolean;
    owner?: string;
  }) => Promise<Zone>;
  updateZoneCollection: (name: string, collectionAddress: string) => Promise<Zone>;
  updateZoneWrapper: (name: string, wrapperAddress: string) => Promise<Zone>;
}

const isProxyZone = (zone: Zone): boolean => {
  return zone.proxy === 1;
};

const isSbtZone = (zone: Zone): boolean => {
  return zone.proxy === 0;
};

export const useZones = (): UseZonesReturn => {
  const { user } = useUser();
  const userAddress = useTonAddress();
  const wallet = useTonWallet();
  const [allZones, setAllZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Добавляем ref для предотвращения дублирующих вызовов
  const isMountedRef = useRef(true);
  const lastLoadTimeRef = useRef<number>(0);
  const isLoadingRef = useRef(false);

  // Определяем сеть
  const isTestnet = wallet?.account?.chain === "-3";

  // Загрузка всех зон с оптимизацией
  const loadZones = useCallback(async (force = false) => {
    // Предотвращаем множественные одновременные вызовы
    if (isLoadingRef.current && !force) {
      console.log('⏳ Загрузка зон уже выполняется, пропускаем...');
      return;
    }
    
    // Дебаунс: не загружаем чаще чем раз в 5 секунд
    const now = Date.now();
    if (!force && now - lastLoadTimeRef.current < 5000) {
      console.log('⏳ Слишком частый вызов loadZones, пропускаем...');
      return;
    }
    
    isLoadingRef.current = true;
    lastLoadTimeRef.current = now;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`📡 Загружаем зоны из базы (${isTestnet ? 'testnet' : 'mainnet'})...`);
      
      // Устанавливаем сеть перед вызовом
      apiService.setNetwork(isTestnet);
      
      const zones = await apiService.getAllZones();
      
      // Проверяем, действительно ли данные изменились
      const hasChanged = JSON.stringify(zones) !== JSON.stringify(allZones);
      
      if (hasChanged && isMountedRef.current) {
        console.log('✅ Зоны загружены (изменения обнаружены):', zones.length);
        setAllZones(zones);
      } else if (isMountedRef.current) {
        console.log('✅ Зоны загружены (без изменений):', zones.length);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Ошибка загрузки зон');
        console.error('❌ Ошибка загрузки зон:', err);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        isLoadingRef.current = false;
      }
    }
  }, [isTestnet, allZones]); // Добавляем allZones в зависимости для сравнения

  // Proxy зоны - ВСЕ Proxy зоны (мемоизируем)
  const proxyZones = allZones.filter(zone => isProxyZone(zone));

  // SBT зоны - только зоны текущего пользователя (мемоизируем)
  const sbtZones = allZones.filter(zone => 
    isSbtZone(zone) && zone.owner === userAddress
  );

  // Создание зоны
  const createZone = useCallback(async (zoneData: {
    name: string;
    collectionAddress?: string;
    wrapperAddress?: string;
    proxy?: boolean;
    owner?: string;
  }) => {
    if (!user?.address) {
      throw new Error('Пользователь не авторизован');
    }

    setLoading(true);
    setError(null);
    
    try {
      // Устанавливаем сеть перед вызовом
      apiService.setNetwork(isTestnet);
      
      const newZone = await apiService.createZone({
        ...zoneData,
        address: user.address,
        owner: zoneData.owner || user.address,
      });
      
      // Обновляем список зон
      setAllZones(prev => [...prev, newZone]);
      return newZone;
    } catch (err: any) {
      setError(err.message || 'Ошибка создания зоны');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.address, isTestnet]);

  // Обновление collectionAddress зоны
  const updateZoneCollection = useCallback(async (name: string, collectionAddress: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Устанавливаем сеть перед вызовом
      apiService.setNetwork(isTestnet);
      
      const updatedZone = await apiService.updateZoneCollection(name, collectionAddress);
      
      // Обновляем зону в списке
      setAllZones(prev => 
        prev.map(zone => zone.name === name ? updatedZone : zone)
      );
      
      return updatedZone;
    } catch (err: any) {
      setError(err.message || 'Ошибка обновления зоны');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isTestnet]);

  // Обновление wrapperAddress зоны
  const updateZoneWrapper = useCallback(async (name: string, wrapperAddress: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Устанавливаем сеть перед вызовом
      apiService.setNetwork(isTestnet);
      
      const updatedZone = await apiService.updateZoneWrapper(name, wrapperAddress);
      
      // Обновляем зону в списке
      setAllZones(prev => 
        prev.map(zone => zone.name === name ? updatedZone : zone)
      );
      
      return updatedZone;
    } catch (err: any) {
      setError(err.message || 'Ошибка обновления зоны');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isTestnet]);

  // Загружаем зоны при монтировании
  useEffect(() => {
    isMountedRef.current = true;
    
    // Загружаем зоны с небольшой задержкой
    const timer = setTimeout(() => {
      loadZones();
    }, 100);
    
    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
    };
  }, []); // Пустой массив зависимостей - только при монтировании

  // Обновляем зоны при изменении сети или кошелька
  useEffect(() => {
    if (wallet && isMountedRef.current) {
      console.log('🔄 Сеть/кошелек изменились, обновляем зоны...');
      loadZones(true); // force = true
    }
  }, [wallet, isTestnet]); // Следим за изменениями кошелька и сети

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    allZones,
    loading,
    error,
    proxyZones,
    sbtZones,
    refreshZones: () => loadZones(true), // Всегда force при ручном обновлении
    createZone,
    updateZoneCollection,
    updateZoneWrapper,
  };
};

// Утилита для создания мапа коллекций
export const createCollectionAddressMap = (zones: Zone[]): Record<string, string> => {
  const map: Record<string, string> = {};
  
  zones.forEach(zone => {
    if (zone.name && zone.collectionAddress) {
      map[zone.name] = zone.collectionAddress;
    }
  });
  
  return map;
};

// Утилита для фильтрации зон по типу
export const filterZonesByType = (zones: Zone[], type: 'proxy' | 'sbt', userAddress?: string): Zone[] => {
  if (type === 'proxy') {
    return zones.filter(zone => isProxyZone(zone));
  } else {
    return zones.filter(zone => 
      isSbtZone(zone) && (!userAddress || zone.owner === userAddress)
    );
  }
};

// Утилита для получения информации о зоне
export const getZoneInfo = (zone: Zone) => {
  const type = isProxyZone(zone) ? 'proxy' : 'sbt';
  const typeLabel = type === 'proxy' ? '🌐 Proxy' : '🔒 SBT';
  const typeColor = type === 'proxy' ? '#4caf50' : '#3b82f6';
  
  let status = 'Inactive';
  let statusColor = '#9ca3af';
  
  if (zone.subdomainsAmount > 0) {
    status = 'Active';
    statusColor = '#4caf50';
  } else if (zone.collectionAddress) {
    status = 'Ready';
    statusColor = '#ff9800';
  }
  
  return {
    type,
    typeLabel,
    typeColor,
    status,
    statusColor,
    hasCollection: !!zone.collectionAddress,
    hasWrapper: !!zone.wrapperAddress,
    isProxy: isProxyZone(zone),
    isSBT: isSbtZone(zone),
  };
};
