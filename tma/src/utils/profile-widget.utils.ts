
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
