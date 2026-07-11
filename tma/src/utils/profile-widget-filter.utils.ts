
// utils/profile-widget-filter.utils.ts - Исправленные функции фильтрации

import { 
  Zone, 
  Subdomain, 
  Auction, 
  FilterState, 
  SortOption,
  ZoneTypeFilter,
} from '@/types/profile-widget-filters.types';

// Функция для фильтрации зон
export const filterZones = (
  zones: Zone[],
  searchQuery: string,
  filters: FilterState
): Zone[] => {
  let filtered = [...zones];
  
  // Поиск по тексту
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(zone => 
      zone.name.toLowerCase().includes(query) ||
      (zone.owner && zone.owner.toLowerCase().includes(query)) ||
      (zone.collectionAddress && zone.collectionAddress.toLowerCase().includes(query))
    );
  }
  
  // Фильтрация по длине зоны
  if (filters.zoneLengths && filters.zoneLengths.length > 0) {
    filtered = filtered.filter(zone => {
      const zoneLength = getZoneLength(zone.name);
      return filters.zoneLengths!.includes(zoneLength);
    });
  }
  
  // Фильтрация по типу зоны
  if (filters.zoneTypes && filters.zoneTypes.length > 0 && !filters.zoneTypes.includes('all')) {
    filtered = filtered.filter(zone => {
      const zoneType = getZoneType(zone);
      return filters.zoneTypes!.includes(zoneType);
    });
  }
  
  return filtered;
};

// Функция для получения текста типа зоны
export const getZoneTypeText = (type: ZoneTypeFilter): string => {
  switch (type) {
    case 'proxy': return '🌐 Proxy';
    case 'sbt': return '🔒 SBT';
    case 'all': return 'Все типы';
    default: return 'Неизвестно';
  }
};


// utils/profile-widget-filter.utils.ts
// Функция для извлечения длин из имени домена
export const extractLengths = (name: string): { zoneLength: number, subdomainLength: number } => {
  if (!name || typeof name !== 'string') {
    console.log('❌ extractLengths: невалидное имя:', name);
    return { zoneLength: 0, subdomainLength: 0 };
  }
  
  // Убираем пробелы и приводим к нижнему регистру
  const cleanName = name.trim().toLowerCase();
  console.log('🔍 extractLengths для:', cleanName);
  
  // Убираем .ton в конце, если есть
  let nameWithoutTon = cleanName;
  if (cleanName.endsWith('.ton')) {
    nameWithoutTon = cleanName.slice(0, -4); // Убираем ".ton"
  }
  
  // Разделяем на части по точке
  const parts = nameWithoutTon.split('.');
  console.log('Части имени (без .ton):', parts);
  
  // Если нет точек - это только зона без субдомена
  if (parts.length === 1) {
    console.log('Только зона:', parts[0]);
    return { 
      zoneLength: parts[0].length, 
      subdomainLength: 0 
    };
  }
  
  // Если есть точки, последняя часть - это зона
  // Все части кроме последней - это субдомен (может быть несколько уровней)
  const zonePart = parts[parts.length - 1];
  const subdomainParts = parts.slice(0, -1);
  const subdomain = subdomainParts.join('.'); // Объединяем все части субдомена
  
  console.log('Результат:', {
    zonePart,
    zoneLength: zonePart.length,
    subdomain,
    subdomainLength: subdomain.length
  });
  
  return {
    zoneLength: zonePart.length,
    subdomainLength: subdomain.length
  };
};


// Функция для получения только длины зоны
export const getZoneLength = (name: string): number => {
  return extractLengths(name).zoneLength;
};

// Функция для получения только длины субдомена
export const getSubdomainLength = (name: string): number => {
  return extractLengths(name).subdomainLength;
};

// Функция для определения типа зоны
export const getZoneType = (zone: Zone): 'proxy' | 'sbt' | 'unknown' => {
  if (!zone || zone.proxy === undefined || zone.proxy === null) return 'unknown';
  
  const proxyValue = zone.proxy;
  
  // Проверяем числовые значения
  if (typeof proxyValue === 'number') {
    return proxyValue === 1 ? 'proxy' : 'sbt'; // 0 или другие числа = sbt
  }
  
  // Проверяем строковые значения
  if (typeof proxyValue === 'string') {
    const lowerValue = proxyValue.toLowerCase().trim();
    
    // Проверяем все возможные варианты для proxy
    if (lowerValue === 'proxy' || lowerValue === '1' || lowerValue === 'true') {
      return 'proxy';
    }
    
    // Проверяем все возможные варианты для sbt
    if (lowerValue === 'sbt' || lowerValue === '0' || lowerValue === 'false') {
      return 'sbt';
    }
  }
  
  return 'unknown';
};


// Функция для фильтрации субдоменов
export const filterSubdomains = (
  subdomains: Subdomain[],
  searchQuery: string,
  filters: FilterState
): Subdomain[] => {
  let filtered = [...subdomains];
  
  // Поиск по тексту
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(subdomain => 
      subdomain.name.toLowerCase().includes(query) ||
      (subdomain.owner && subdomain.owner.toLowerCase().includes(query)) ||
      subdomain.mintPrice.toString().includes(query) ||
      (subdomain.zone?.name && subdomain.zone.name.toLowerCase().includes(query))
    );
  }
  
  // Фильтрация по длине зоны
  if (filters.zoneLengths && filters.zoneLengths.length > 0) {
    filtered = filtered.filter(subdomain => {
      if (!subdomain.zone) return false;
      const zoneLength = getZoneLength(subdomain.zone.name);
      return filters.zoneLengths!.includes(zoneLength);
    });
  }
  
  // Фильтрация по длине субдомена
  if (filters.subdomainLengths && filters.subdomainLengths.length > 0) {
    filtered = filtered.filter(subdomain => {
      const subdomainLength = getSubdomainLength(subdomain.name);
      return filters.subdomainLengths!.includes(subdomainLength);
    });
  }
  
  // Фильтрация по типу зоны (для субдоменов)
  if (filters.zoneTypes && filters.zoneTypes.length > 0 && !filters.zoneTypes.includes('all')) {
    filtered = filtered.filter(subdomain => {
      if (!subdomain.zone) return false;
      const zoneType = getZoneType(subdomain.zone);
      return filters.zoneTypes!.includes(zoneType);
    });
  }
  
  return filtered;
};

// Функция для фильтрации аукционов
export const filterAuctions = (
  auctions: Auction[],
  searchQuery: string,
): Auction[] => {
  let filtered = [...auctions];
  
  // Поиск по тексту
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(auction => 
      auction.name.toLowerCase().includes(query) ||
      (auction.lastBidder && auction.lastBidder.toLowerCase().includes(query)) ||
      auction.bid.toLowerCase().includes(query)
    );
  }
  
  return filtered;
};

// Функция для сортировки зон
export const sortZones = (zones: Zone[], sortBy: SortOption): Zone[] => {
  const sorted = [...zones];
  
  sorted.sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name_asc':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'name_desc':
        comparison = b.name.localeCompare(a.name);
        break;
      case 'date_asc':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'date_desc':
        comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        break;
      case 'zoneLength_asc':
        const lengthA = getZoneLength(a.name);
        const lengthB = getZoneLength(b.name);
        comparison = lengthA - lengthB;
        break;
      case 'zoneLength_desc':
        const lengthA2 = getZoneLength(a.name);
        const lengthB2 = getZoneLength(b.name);
        comparison = lengthB2 - lengthA2;
        break;
      default:
        comparison = a.name.localeCompare(b.name);
    }
    
    return comparison;
  });
  
  return sorted;
};

// Функция для сортировки субдоменов
export const sortSubdomains = (subdomains: Subdomain[], sortBy: SortOption): Subdomain[] => {
  const sorted = [...subdomains];
  
  sorted.sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name_asc':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'name_desc':
        comparison = b.name.localeCompare(a.name);
        break;
      case 'price_asc':
        comparison = a.mintPrice - b.mintPrice;
        break;
      case 'price_desc':
        comparison = b.mintPrice - a.mintPrice;
        break;
      case 'date_asc':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'date_desc':
        comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        break;
      case 'zoneLength_asc':
        const zoneLengthA = a.zone ? getZoneLength(a.zone.name) : 0;
        const zoneLengthB = b.zone ? getZoneLength(b.zone.name) : 0;
        comparison = zoneLengthA - zoneLengthB;
        break;
      case 'zoneLength_desc':
        const zoneLengthA2 = a.zone ? getZoneLength(a.zone.name) : 0;
        const zoneLengthB2 = b.zone ? getZoneLength(b.zone.name) : 0;
        comparison = zoneLengthB2 - zoneLengthA2;
        break;
      case 'subdomainLength_asc':
        const subLengthA = getSubdomainLength(a.name);
        const subLengthB = getSubdomainLength(b.name);
        comparison = subLengthA - subLengthB;
        break;
      case 'subdomainLength_desc':
        const subLengthA2 = getSubdomainLength(a.name);
        const subLengthB2 = getSubdomainLength(b.name);
        comparison = subLengthB2 - subLengthA2;
        break;
      default:
        comparison = a.name.localeCompare(b.name);
    }
    
    return comparison;
  });
  
  return sorted;
};

// Функция для сортировки аукционов
export const sortAuctions = (auctions: Auction[], sortBy: SortOption): Auction[] => {
  const sorted = [...auctions];
  
  sorted.sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name_asc':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'name_desc':
        comparison = b.name.localeCompare(a.name);
        break;
      case 'date_asc':
        comparison = new Date(a.ends).getTime() - new Date(b.ends).getTime();
        break;
      case 'date_desc':
        comparison = new Date(b.ends).getTime() - new Date(a.ends).getTime();
        break;
      case 'bid_asc':
        const bidA = a.lastBid || 0;
        const bidB = b.lastBid || 0;
        comparison = bidA - bidB;
        break;
      case 'bid_desc':
        const bidA2 = a.lastBid || 0;
        const bidB2 = b.lastBid || 0;
        comparison = bidB2 - bidA2;
        break;
      case 'auctionEnd_asc':
        comparison = new Date(a.ends).getTime() - new Date(b.ends).getTime();
        break;
      case 'auctionEnd_desc':
        comparison = new Date(b.ends).getTime() - new Date(a.ends).getTime();
        break;
      default:
        comparison = a.name.localeCompare(b.name);
    }
    
    return comparison;
  });
  
  return sorted;
};

// Функция для получения отфильтрованных и отсортированных данных
export const getFilteredData = (
  dataType: 'zones' | 'subdomains' | 'auctions',
  data: any[],
  searchQuery: string,
  filters: FilterState,
  sortBy: SortOption
): any[] => {
  let filtered = [];
  
  // Фильтрация
  switch (dataType) {
    case 'zones':
      filtered = filterZones(data as Zone[], searchQuery, filters);
      filtered = sortZones(filtered as Zone[], sortBy);
      break;
    case 'subdomains':
      filtered = filterSubdomains(data as Subdomain[], searchQuery, filters);
      filtered = sortSubdomains(filtered as Subdomain[], sortBy);
      break;
    case 'auctions':
      filtered = filterAuctions(data as Auction[], searchQuery);
      filtered = sortAuctions(filtered as Auction[], sortBy);
      break;
    default:
      filtered = data;
  }
  
  return filtered;
};