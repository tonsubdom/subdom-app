
// types/profile-widget-filters.types.ts

// Типы для фильтров
export type SortOption = 
  | 'name_asc' | 'name_desc' 
  | 'price_asc' | 'price_desc' 
  | 'date_asc' | 'date_desc' 
  | 'zoneLength_asc' | 'zoneLength_desc' 
  | 'subdomainLength_asc' | 'subdomainLength_desc'
  | 'auctionEnd_asc' | 'auctionEnd_desc'
  | 'bid_asc' | 'bid_desc';

export type ZoneTypeFilter = 'all' | 'proxy' | 'sbt' | 'unknown';
export type ActiveStatusFilter = 'active' | 'inactive';

export interface FilterState {
  zoneLengths: number[];        // Длины зон для фильтрации (4-9+)
  subdomainLengths: number[];   // Длины субдоменов для фильтрации (1-6+)
  auctionStatuses: string[];    // Статусы аукционов
  zoneTypes: ZoneTypeFilter[];  // Типы зон: proxy, sbt
  activeStatuses: ActiveStatusFilter[]; // Активные/неактивные (деактивированные зоны/сабдомены)
}

// Интерфейсы для данных
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
  zoneLength?: number;
  status?: string;
  // undefined/null = кроулер ещё не проверял, true/false = результат
  // последнего пинга через *.ton.run (см. LupaButton).
  siteResolves?: boolean | null;
  image?: string;
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
  zoneLength?: number;
  subdomainLength?: number;
  siteResolves?: boolean | null;
}

export interface Auction {
  name: string;
  bid: string;
  ends: string;
  lastBidder?: string;
  lastBid?: number;
  subdomain?: Subdomain;
  // false — аукцион истёк, но ещё не заклеймлен. Такие попадают в список
  // только если текущий юзер и есть победитель (см. loadAuctionsFromBlockchain
  // в ProfileWidget.tsx) — нужно, чтобы карточка могла показать «забрать».
  isActive?: boolean;
}

// types/profile-widget-filters.types.ts
export interface SearchAndFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  activeTab: 'zones' | 'subdomains' | 'auctions' | 'info';
  colors: {
    primary: string;
    accent: string;
    background: string;
    text: string;
    border: string;
    secondaryBg: string;
    shadow: string;
    cyberpunk: string;
    gold: string;
    blue: string;
    link: string;
    inputBg: string;
    inputBorder: string;
    inputText: string;
    dropdownBg: string;
    dropdownBorder: string;
  };
  isDark: boolean;
    // Добавляем пропсы для реальных данных
}


// Функция для получения текста сортировки
export const getSortText = (sortOption: SortOption): string => {
  switch (sortOption) {
    case 'name_asc': return 'Имя (А-Я)';
    case 'name_desc': return 'Имя (Я-А)';
    case 'price_asc': return 'Цена (низкая → высокая)';
    case 'price_desc': return 'Цена (высокая → низкая)';
    case 'date_asc': return 'Дата (старые → новые)';
    case 'date_desc': return 'Дата (новые → старые)';
    case 'zoneLength_asc': return 'Длина зоны (короткие → длинные)';
    case 'zoneLength_desc': return 'Длина зоны (длинные → короткие)';
    case 'subdomainLength_asc': return 'Длина субдомена (короткие → длинные)';
    case 'subdomainLength_desc': return 'Длина субдомена (длинные → короткие)';
    case 'auctionEnd_asc': return 'Аукцион (ранние → поздние)';
    case 'auctionEnd_desc': return 'Аукцион (поздние → ранние)';
    case 'bid_asc': return 'Ставка (низкая → высокая)';
    case 'bid_desc': return 'Ставка (высокая → низкая)';
    default: return 'Сортировка';
  }
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

// Объявления функций (реализация в utils/profile-widget-filter.utils.ts)
export declare function extractLengths(name: string): { zoneLength: number, subdomainLength: number };
export declare function getZoneLength(name: string): number;
export declare function getSubdomainLength(name: string): number;
export declare function getZoneType(zone: Zone): 'proxy' | 'sbt' | 'unknown';
