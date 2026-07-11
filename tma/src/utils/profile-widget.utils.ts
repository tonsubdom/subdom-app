// // utils/profile-widget.utils.ts

// import { Zone, ZoneTypeInfo, ZoneStatusInfo, Subdomain, SubdomainStatusInfo, ThemeColors } from '@/types/profile-widget.types';

// export const getZoneTypeInfo = (zone: Zone): ZoneTypeInfo => {
//   const isProxyZone = (zone: Zone) => {
//     // proxy всегда number: 1 = Proxy, 0 = SBT
//     return zone.proxy === 1;
//   };
  
//   const isSbtZone = (zone: Zone) => {
//     // proxy всегда number: 1 = Proxy, 0 = SBT
//     return zone.proxy === 0;
//   };
  
//   if (isProxyZone(zone)) {
//     return { 
//       type: 'proxy', 
//       label: '🌐 Proxy', 
//       color: '#4caf50',
//       description: 'Общая зона для всех пользователей'
//     };
//   } else if (isSbtZone(zone)) {
//     return { 
//       type: 'sbt', 
//       label: '🔒 SBT', 
//       color: '#3b82f6',
//       description: 'Персональная зона владельца'
//     };
//   } else {
//     return { 
//       type: 'unknown', 
//       label: '❓ Unknown', 
//       color: '#9ca3af',
//       description: 'Неизвестный тип зоны'
//     };
//   }
// };


// export const getZoneStatusInfo = (zone: Zone): ZoneStatusInfo => {
//   const isProxy = zone.proxy === 1;
//   const isSbt = zone.proxy === 0;
  
//   if (isProxy) {
//     return { status: 'Infinity', color: '#000000ff', description: 'Бесконечная зона' };
//   }
  
//   if (isSbt) {
//     if (!zone.collectionAddress) {
//       return { status: 'Inactive', color: '#9ca3af', description: 'Collection не настроен' };
//     }
    
//     if (zone.subdomainsAmount > 0) {
//       return { status: 'Active', color: '#4caf50', description: 'Субдомены созданы' };
//     }
    
//     return { status: 'Active', color: '#4caf50', description: 'Готова к использованию' };
//   }
  
//   return { status: 'Unknown', color: '#9ca3af', description: 'Неизвестный тип зоны' };
// };

// /**
//  * Определяет статус субдомена и возвращает информацию о нем
//  */
// export const getSubdomainStatusInfo = (subdomain: Subdomain): SubdomainStatusInfo => {
//   switch (subdomain.status) {
//     case 'active': 
//       return { status: 'Active', color: '#4caf50', description: 'Активный' };
//     case 'inactive': 
//       return { status: 'Inactive', color: '#9ca3af', description: 'Неактивный' };
//     case 'auction': 
//       return { status: 'Auction', color: '#ff9800', description: 'На аукционе' };
//     case 'claimed': 
//       return { status: 'Claimed', color: '#3b82f6', description: 'Получен' };
//     default: 
//       return { status: 'Unknown', color: '#9ca3af', description: 'Неизвестный' };
//   }
// };

// /**
//  * Фильтрует зоны пользователя
//  */
// export const getUserZones = (allZones: Zone[], address: string): Zone[] => {
//   if (!address) return [];
  
//   const userProxyZones = allZones.filter(zone => {
//     const isProxy = zone.proxy === 1;
//     return isProxy && zone.address === address;
//   });
  
//   const userSbtZones = allZones.filter(zone => {
//     const isSbt = zone.proxy === 0;
//     return isSbt && zone.owner === address;
//   });
  
//   return [...userProxyZones, ...userSbtZones];
// };

// /**
//  * Создает ссылку на TonViewer
//  */
// export const createTonViewerLink = (address: string): string => {
//   return `https://tonviewer.com/${address}`;
// };

// /**
//  * Форматирует дату в читаемый формат
//  */
// export const formatDate = (dateString: string): string => {
//   try {
//     return new Date(dateString).toLocaleDateString('ru-RU', {
//       day: '2-digit',
//       month: '2-digit',
//       year: 'numeric'
//     });
//   } catch (error) {
//     return dateString;
//   }
// };

// /**
//  * Форматирует цену в TON
//  */
// export const formatTonPrice = (price: number): string => {
//   return (price / 1_000_000_000).toFixed(2) + ' TON';
// };

// /**
//  * Создает стили для кнопок в зависимости от темы
//  */
// export const getButtonStyle = (isDark: boolean, colors: ThemeColors): React.CSSProperties => {
//   return {
//     background: isDark 
//       ? "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)" 
//       : "linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)",
//     color: isDark ? '#000' : '#fff',
//     border: 'none',
//     outline: 'none',
//     padding: '6px 10px',
//     borderRadius: '4px',
//     fontSize: '10px',
//     fontWeight: '600',
//     fontFamily: 'monospace',
//     textTransform: 'uppercase',
//     letterSpacing: '0.3px',
//     boxShadow: `0 0 6px ${colors.shadow}`,
//     transition: 'all 0.3s ease',
//     cursor: 'pointer',
//     position: 'relative',
//     overflow: 'hidden',
//     width: '100%',
//     marginBottom: '4px'
//   };
// };

// /**
//  * Создает стили для кнопок вкладок
//  */
// export const getTabButtonStyle = (isActive: boolean, colors: ThemeColors): React.CSSProperties => {
//   return {
//     flex: 1,
//     padding: "10px 8px",
//     border: "none",
//     background: "none",
//     cursor: "pointer",
//     fontSize: "11px",
//     fontWeight: "600",
//     fontFamily: 'monospace',
//     color: isActive ? colors.cyberpunk : colors.text,
//     borderBottom: isActive ? `2px solid ${colors.cyberpunk}` : "none",
//     transition: "all 0.3s",
//     textTransform: 'uppercase',
//     letterSpacing: '0.5px'
//   };
// };

// /**
//  * Получает цветовую схему для темы
//  */
// export const getThemeColors = (isDark: boolean): ThemeColors => {
//   return {
//     light: {
//       primary: "linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)",
//       accent: "#3B82F6",
//       background: "#FFFFFF",
//       text: "#1F2937",
//       border: "#E5E7EB",
//       secondaryBg: "#F9FAFB",
//       shadow: "rgba(59, 130, 246, 0.4)",
//       cyberpunk: "#3B82F6",
//       gold: "#FFD700",
//       blue: "#3B82F6"
//     },
//     dark: {
//       primary: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
//       accent: "#FFD700",
//       background: "#121212",
//       text: "#E5E5E5",
//       border: "#333333",
//       secondaryBg: "#1A1A1A",
//       shadow: "rgba(255, 215, 0, 0.4)",
//       cyberpunk: "#FFD700",
//       gold: "#FFD700",
//       blue: "#00FFFF"
//     }
//   }[isDark ? 'dark' : 'light'];
// };

// Файл: src/utils/profile-widget-filter.utils.ts
// Добавить поддержку новых полей в фильтрацию

import { FilterState, SortOption, getZoneType } from '@/types/profile-widget-filters.types';

// Обновить функцию getFilteredData для поддержки новых полей:
export const getFilteredData = (
  dataType: 'zones' | 'subdomains' | 'auctions',
  data: any[],
  searchQuery: string,
  filters: FilterState,
  sortBy: SortOption
): any[] => {
  if (!data || data.length === 0) return [];

  let filtered = [...data];

  // Применяем поиск
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(item => {
      switch (dataType) {
        case 'zones':
          return (
            item.name?.toLowerCase().includes(query) ||
            item.address?.toLowerCase().includes(query) ||
            item.collectionAddress?.toLowerCase().includes(query) ||
            item.wrapperAddress?.toLowerCase().includes(query) ||
            item.owner?.toLowerCase().includes(query) ||
            item.status?.toLowerCase().includes(query)
          );
        case 'subdomains':
          return (
            item.name?.toLowerCase().includes(query) ||
            item.address?.toLowerCase().includes(query) ||
            item.owner?.toLowerCase().includes(query) ||
            item.status?.toLowerCase().includes(query) ||
            item.collectionsAddress?.toLowerCase().includes(query) ||
            item.lastBidder?.toLowerCase().includes(query)
          );
        case 'auctions':
          return (
            item.name?.toLowerCase().includes(query) ||
            item.lastBidder?.toLowerCase().includes(query) ||
            item.bid?.toLowerCase().includes(query)
          );
        default:
          return true;
      }
    });
  }

  // Применяем фильтры
  if (filters.zoneLengths.length > 0 && dataType === 'zones') {
    filtered = filtered.filter(zone => {
      const zoneLength = zone.name?.length || 0;
      return filters.zoneLengths.includes(zoneLength);
    });
  }

  if (filters.subdomainLengths.length > 0 && dataType === 'subdomains') {
    filtered = filtered.filter(subdomain => {
      const subdomainLength = subdomain.name?.length || 0;
      return filters.subdomainLengths.includes(subdomainLength);
    });
  }

  if (filters.auctionStatuses.length > 0 && dataType === 'auctions') {
    filtered = filtered.filter(auction => {
      return filters.auctionStatuses.includes(auction.status || '');
    });
  }

  if (filters.zoneTypes.length > 0 && dataType === 'zones') {
    filtered = filtered.filter(zone => {
      const zoneType = getZoneType(zone);
      return filters.zoneTypes.includes(zoneType);
    });
  }

  // Применяем сортировку
  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'name_asc':
        return (a.name || '').localeCompare(b.name || '');
      case 'name_desc':
        return (b.name || '').localeCompare(a.name || '');
      case 'date_asc':
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      case 'date_desc':
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      case 'price_asc':
        return (a.mintPrice || 0) - (b.mintPrice || 0);
      case 'price_desc':
        return (b.mintPrice || 0) - (a.mintPrice || 0);
      case 'bid_asc':
        return (a.lastBid || 0) - (b.lastBid || 0);
      case 'bid_desc':
        return (b.lastBid || 0) - (a.lastBid || 0);
      default:
        return 0;
    }
  });

  return filtered;
};

// Файл: src/utils/format.utils.ts
// Добавить утилиты для форматирования новых данных

export const formatTonAmount = (amount: number): string => {
  if (amount === undefined || amount === null) return '0.00 TON';
  return `${amount.toFixed(2)} TON`;
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return 'Не указано';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
};

export const formatDateTime = (dateString: string): string => {
  if (!dateString) return 'Не указано';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
};

export const formatPaymentAttempts = (attempts: any): string => {
  if (!attempts) return 'Нет данных';
  
  const proxyCounts = Object.entries(attempts.proxy || {})
    .filter(([_, count]) => Number(count) > 0)
    .map(([length, count]) => `${length} симв: ${count}`)
    .join(', ');
    
  const sbtCounts = Object.entries(attempts.sbt || {})
    .filter(([_, count]) => Number(count) > 0)
    .map(([length, count]) => `${length} симв: ${count}`)
    .join(', ');
    
  const proxyText = proxyCounts ? `Proxy: ${proxyCounts}` : '';
  const sbtText = sbtCounts ? `SBT: ${sbtCounts}` : '';
  
  return [proxyText, sbtText].filter(Boolean).join(' | ') || 'Нет оплаченных попыток';
};

export const calculateTotalSpending = (user: any): number => {
  if (!user) return 0;
  
  return (
    (user.totalZoneSpending || 0) +
    (user.totalSubdomainSpending || 0) +
    (user.totalProxyZoneSpending || 0) +
    (user.totalSbtZoneSpending || 0) +
    (user.totalProxySubdomainSpending || 0) +
    (user.totalSbtSubdomainSpending || 0)
  );
};

export const getZoneStats = (user: any) => {
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
};

export const getSubdomainStats = (user: any) => {
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
};
