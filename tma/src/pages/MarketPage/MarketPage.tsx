
import React, { useState, useEffect, useRef } from 'react';
import { Page } from "@/components/Page";
import { ScanProgressLoader } from '@/components/ScanProgressLoader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useTonWallet } from '@tonconnect/ui-react';
import { useLaunchParams } from '@telegram-apps/sdk-react';
import { MiniAppLinkGenerator } from '@/utils/miniAppLinks';
import { Address } from "@ton/core";

// Импортируем наш новый механизм
import { useBlockchainItems } from '@/services/blockchainItems/blockchain-items-context.tsx';
import { SimpleEnrichedItem } from '@/services/blockchainItems/blockchain-items-types';
import { LupaButton } from '@/components/LupaButton/LupaButton';
import { TutorialTooltip } from '@/components/Tutorial/TutorialTooltip';
import { useTutorial } from '@/contexts/TutorialContext';
import { track } from '@/utils/analytics';

// Типы для табов
type TabType = 'subdomains' | 'nft-wrappers';

// interface MarketItem {
//   id: string; // Используем адрес NFT как ID
//   name: string;
//   owner?: string;
//   mintPrice: string;
//   zoneName?: string;
//   subdomainName?: string;
//   imgUri?: string;
//   registrationDate: string;
//   status: string;
//   zoneLength?: number;
//   subdomainLength?: number;
//   hasLink: boolean;
//   type: 'proxy_subdomain' | 'nft_wrapper';
//   address: string;
//   collection_address: string;
//   metadata?: any;
// }
interface MarketItem {
  id: string;
  name: string;
  owner?: string; // Теперь точно string | undefined, а не string | null
  mintPrice: string;
  zoneName?: string;
  subdomainName?: string;
  imgUri?: string;
  registrationDate: string;
  status: string;
  zoneLength?: number;
  subdomainLength?: number;
  hasLink: boolean;
  type: 'proxy_subdomain' | 'nft_wrapper';
  address: string;
  collection_address: string;
  metadata?: {
    price?: string;
    sale?: {
      price?: {
        value: string;
        token_name: string;
      };
    };
    image?: string;
    previews?: Array<{
      url: string;
      resolution?: string;
    }>;
    tokenInfo?: {
      image?: string;
      name?: string;
      description?: string;
    };
    // Другие возможные поля metadata
    [key: string]: any;
  };
}

interface FilterState {
  zoneLengths: number[];
  subdomainLengths: number[];
}

type SortOption = 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 
                  'date_asc' | 'date_desc' | 'zoneLength_asc' | 'zoneLength_desc' | 
                  'subdomainLength_asc' | 'subdomainLength_desc';

// Функция для конвертации адреса в нужный формат
const convertAddress = (address: string, isTestnet: boolean): string => {
  if (!address) return '';
  
  try {
    const parsedAddress = Address.parse(address);
    return parsedAddress.toString({ 
      testOnly: isTestnet, 
      urlSafe: true,
      bounceable: false 
    });
  } catch (error) {
    console.error('Error converting address:', error, 'address:', address);
    return address;
  }
};

// Функция для извлечения длины зоны и субдомена
const extractLengths = (name: string): { zoneLength: number, subdomainLength: number } => {
  const parts = name.split('.');
  let subdomainLength = 0;
  let zoneLength = 0;
  
  if (parts.length >= 2) {
    subdomainLength = parts[0].length;
    // zoneLength = parts.slice(1).join('.').length;
    zoneLength = parts[1].length
  } else if (parts.length === 1) {
    zoneLength = parts[0].length;
    subdomainLength = 0;
  }
  
  return { zoneLength, subdomainLength };
};

// Функция для создания ссылки GetGems
const createGetGemsLink = (
  collectionAddress: string,
  nftAddress: string,
  isTestnet: boolean
): string => {
  if (!collectionAddress || !nftAddress) {
    console.log('❌ Нет адресов для создания ссылки:', { collectionAddress, nftAddress });
    return '';
  }
  
  try {
    const convertedCollectionAddress = convertAddress(collectionAddress, isTestnet);
    const convertedNftAddress = convertAddress(nftAddress, isTestnet);

      

    
    if (convertedCollectionAddress && convertedNftAddress) {
      const link = isTestnet 
        ? `https://testnet.getgems.io/collection/${convertedCollectionAddress}/${convertedNftAddress}`
        : `https://getgems.io/collection/${convertedCollectionAddress}/${convertedNftAddress}`;
      
      console.log('✅ Создана ссылка GetGems:', {
        collectionAddress,
        nftAddress,
        convertedCollectionAddress,
        convertedNftAddress,
        isTestnet,
        link
      });
      
      return link;
    }
  } catch (error) {
    console.error('❌ Ошибка создания ссылки GetGems:', error);
  }
  
  return '';
};

const convertToMarketItem = (item: SimpleEnrichedItem, _isTestnet: boolean): MarketItem => {
  console.log('🔄 Конвертация SimpleEnrichedItem в MarketItem:', {
    address: item.address,
    domain: item.domain,
    type: item.type,
    hasMetadata: !!item.metadata,
    metadata: item.metadata
  });

      const API_PAYLOAD_URL=import.meta.env.VITE_API_SC_PAYLOAD_URL;
  
  // Получаем token_info из metadata . 
  const tokenInfo = item.metadata?.token_info?.[0] || {};
  console.log('📋 Token info:', tokenInfo);
  
  
  
  // Определяем тип для отображения - приводим к нужному типу
  let itemType: 'proxy_subdomain' | 'nft_wrapper';
  
  if (item.type === 'proxy_subdomain' || item.type === 'nft_wrapper') {
    itemType = item.type;
  } else if (item.type === 'sbt_subdomain') {
    // SBT субдомены тоже отображаем как proxy_subdomain для маркета
    itemType = 'proxy_subdomain';

  } else {
    // По умолчанию считаем NFT wrapper
    itemType = 'nft_wrapper';
  }
  
  // // Определяем статус
  const status = item.on_sale ? 'On Sale' : 'Claimed';
  
  // // Определяем цену
  let mintPrice = '0 TON';
  // if (item.metadata?.price) {
  //   mintPrice = `${item.metadata.price} TON`;
  // } else if (item.metadata?.sale?.price?.value) {
  //   const priceValue = parseFloat(item.metadata.sale.price.value);
  //   mintPrice = `${priceValue.toFixed(1)} TON`;
  // }
  
  // Разделяем домен на субдомен и зону
  const parts = item.domain.split('.');
  let subdomainName = '';
  let zoneName = '';
  
  if (parts.length >= 2) {
    subdomainName = parts[0];
    zoneName = parts.slice(1).join('.');
  } else {
    subdomainName = 'unknown';
    zoneName = item.domain;
  }
  
  // Проверяем наличие ссылки
  const hasLink = !!(item.collection_address && item.address);
  
  // Получаем URL для изображения из metadata.token_info[0].image
  let imgUri: string | undefined;
  
  // Сначала пробуем из token_info
  if (tokenInfo.image) {
    imgUri = tokenInfo.image;
    console.log('✅ Изображение из token_info.image:', imgUri);
  } 
  // Затем из корня metadata
  else if (item.metadata?.image) {
    imgUri = item.metadata.image;
    console.log('✅ Изображение из metadata.image:', imgUri);
  }
  // Для субдоменов используем стандартный URL
  else if (itemType === 'proxy_subdomain' && zoneName !== 'unknown' && subdomainName) {
    imgUri = `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${zoneName.slice(0,-4)}/${subdomainName}.png`;
    console.log('✅ Изображение из API субдоменов:', imgUri);
  } // Для NFT wrapper используем API прокси-метаданных e
else if (itemType === 'nft_wrapper' && item.domain) {
    const domainName = item.domain.replace('.ton', '');
    imgUri = `${API_PAYLOAD_URL}/api/v1/proxy/metadata/ton/${domainName}.png`;
    console.log('✅ Изображение из API прокси для NFT wrapper:', imgUri);
} 
else {
    console.log('❌ Изображение не найдено');
  }
  
  // Получаем имя из token_info или из домена
  let name = tokenInfo.name || item.domain || 'Без названия';
let { zoneLength, subdomainLength } = extractLengths(item.domain);
  // if (itemType === 'nft_wrapper') {
  //   name = name.split(' ')[1]+'.ton';
  //   zoneLength = name.slice(0,-4).length;
  // }
  if (itemType === 'nft_wrapper') {
    // Для NFT wrapper имя берём из домена, а не из token_info (там может быть что угодно)
    name = item.domain || name;
    if (!name.endsWith('.ton')) {
        name = name + '.ton';
    }
    zoneLength = name.slice(0, -4).length;
}
  console.log('📝 Имя:', name);

  
  
  const result: MarketItem = {
    id: item.address,
    name: name,
    owner: item.owner_address || undefined,
    mintPrice,
    zoneName,
    subdomainName,
    imgUri,
    registrationDate: item.lastUpdated || new Date().toISOString(),
    status,
    zoneLength,
    subdomainLength,
    hasLink,
    type: itemType, // Теперь точно 'proxy_subdomain' | 'nft_wrapper'
    address: item.address,
    collection_address: item.collection_address,
    metadata: item.metadata
  };
  
  console.log('✅ Результат MarketItem:', {
    name: result.name,
    imgUri: result.imgUri,
    type: result.type,
    hasImage: !!result.imgUri
  });
  
  return result;
};



const MarketPage: React.FC = () => {
  const { currentTheme } = useTheme();
  const wallet = useTonWallet();
  const { t } = useLanguage();
  const isDark = currentTheme === 'dark';
  const isTestnet = wallet?.account?.chain === "-3";
  
  // Используем наш новый механизм
  const {
    proxySubdomains,
    nftWrappers,
    loadAllData,
    ensureData,
    // isLoading,
    // isRefreshing,
    // error: blockchainError
  } = useBlockchainItems();
  
  // Добавляем launchParams для deeplink
  const launchParams = useLaunchParams();
  const tutorial = useTutorial();

  // Состояния
  const [activeTab, setActiveTab] = useState<TabType>('subdomains');
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredItems, setFilteredItems] = useState<MarketItem[]>([]);
  const [marketCurrentPage, setMarketCurrentPage] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('name_asc');
  const [filters, setFilters] = useState<FilterState>({
    zoneLengths: [],
    subdomainLengths: []
  });
  
  // Состояния для дропдаунов
  const [showZoneFilter, setShowZoneFilter] = useState<boolean>(false);
  const [showSubdomainFilter, setShowSubdomainFilter] = useState<boolean>(false);
  const [showSortDropdown, setShowSortDropdown] = useState<boolean>(false);
  
  // Refs для кликов вне дропдаунов
  const zoneFilterRef = useRef<HTMLDivElement>(null);
  const subdomainFilterRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  
  // Ref для верхнего блока
  const headerRef = useRef<HTMLDivElement>(null);
  
  // Цветовые схемы
  const colors = isDark ? {
    primary: '#D4AF37',
    secondary: '#B8860B',
    background: '#1F2937',
    cardBg: '#1F2937',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    border: '#374151',
    headerBg: '#374151',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    hover: '#4B5563',
    inputBg: '#374151',
    inputBorder: '#4B5563',
    inputText: '#F9FAFB',
    dropdownBg: '#1F2937',
    dropdownBorder: '#4B5563',
    tabActive: '#D4AF37',
    tabInactive: '#4B5563'
  } : {
    primary: '#3B82F6',
    secondary: '#60A5FA',
    background: '#F0F9FF',
    cardBg: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    headerBg: '#F8FAFC',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    hover: '#F3F4F6',
    inputBg: '#FFFFFF',
    inputBorder: '#D1D5DB',
    inputText: '#1F2937',
    dropdownBg: '#FFFFFF',
    dropdownBorder: '#E5E7EB',
    tabActive: '#3B82F6',
    tabInactive: '#E5E7EB'
  };

  // Проверяем, открыто ли через deeplink при монтировании. Если ссылка
  // сгенерирована для конкретного завершённого аукциона (zone/subdomain в
  // startapp — см. DeeplinkUtils.generateMarketLink(domain) на бэкенде),
  // подставляем полное имя домена в поиск — список сразу сужается до этого
  // одного итема, а не просто открывает общий список.
  useEffect(() => {
    const startappParam = launchParams.startParam;
    if (!startappParam) return;

    console.log(`🔗 MarketPage открыт через deeplink: ${startappParam}`);
    const { route, params } = MiniAppLinkGenerator.parseStartappParam(startappParam);

    if (route === '/market' && params.zone) {
      const domain = params.subdomain ? `${params.subdomain}.${params.zone}` : params.zone;
      console.log(`✅ Переход с конкретного завершённого аукциона: ${domain}`);
      setSearchQuery(domain);
    }
  }, [launchParams.startParam]);

  // Загрузка данных из blockchain items
  useEffect(() => {
    const loadBlockchainData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('🔄 Загружаем данные из blockchain...');
        console.log(`🌐 Сеть: ${isTestnet ? 'Testnet' : 'Mainnet'}`);
        
        // Загружаем данные, только если в сторе их ещё нет/протухли
        await ensureData();

        console.log(`✅ Данные загружены: ${proxySubdomains.length} proxy субдоменов, ${nftWrappers.length} NFT оберток`);
        
      } catch (error: any) {
        console.error('❌ Ошибка при загрузке данных из blockchain:', error);
        setError(error.message || t('marketError'));
      } finally {
        setLoading(false);
      }
    };
    
    loadBlockchainData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- строго один раз на
    // маунт: ensureData меняет идентичность после каждого fetch (appData/
    // lastUpdated в её зависимостях), зависимость от неё самой вызывала
    // повторные срабатывания эффекта при каждой загрузке.
  }, []);

  // Обновление marketItems при изменении данных или таба
  useEffect(() => {
    let items: SimpleEnrichedItem[] = [];
    
    if (activeTab === 'subdomains') {
      items = proxySubdomains;
      console.log(`📊 Показываем proxy субдомены: ${items.length} шт`);
    } else {
      items = nftWrappers;
      console.log(`📊 Показываем NFT обертки: ${items.length} шт`);
    }
    
    // Конвертируем в MarketItem
    const marketItems = items.map(item => convertToMarketItem(item, isTestnet));
    
    // Сортируем по умолчанию по имени
    marketItems.sort((a, b) => a.name.localeCompare(b.name));
    
    setMarketItems(marketItems);
    console.log(`✅ Конвертировано ${marketItems.length} итемов для таба "${activeTab}"`);
    
  }, [activeTab, proxySubdomains, nftWrappers, isTestnet]);

  // Фильтрация по поисковому запросу и фильтрам
  useEffect(() => {
    let filtered = [...marketItems];
    
    // Поиск по тексту
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query) ||
        (item.owner && item.owner.toLowerCase().includes(query)) ||
        item.mintPrice.toLowerCase().includes(query) ||
        (item.zoneName && item.zoneName.toLowerCase().includes(query))
      );
    }
    
    // Фильтрация по длине зоны
    if (filters.zoneLengths.length > 0) {
      filtered = filtered.filter(item => {
        if (!item.zoneLength) return false;
        return filters.zoneLengths.includes(item.zoneLength);
      });
    }
    
    // Фильтрация по длине субдомена
    if (filters.subdomainLengths.length > 0) {
      filtered = filtered.filter(item => {
        if (!item.subdomainLength) return false;
        return filters.subdomainLengths.includes(item.subdomainLength);
      });
    }
    
    // Сортировка
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name_asc':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'name_desc':
          comparison = b.name.localeCompare(a.name);
          break;
        case 'price_asc':
          const priceA = parseFloat(a.mintPrice.replace(' TON', ''));
          const priceB = parseFloat(b.mintPrice.replace(' TON', ''));
          comparison = priceA - priceB;
          break;
        case 'price_desc':
          const priceA2 = parseFloat(a.mintPrice.replace(' TON', ''));
          const priceB2 = parseFloat(b.mintPrice.replace(' TON', ''));
          comparison = priceB2 - priceA2;
          break;
        case 'date_asc':
          comparison = new Date(a.registrationDate).getTime() - new Date(b.registrationDate).getTime();
          break;
        case 'date_desc':
          comparison = new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime();
          break;
        case 'zoneLength_asc':
          comparison = (a.zoneLength || 0) - (b.zoneLength || 0);
          break;
        case 'zoneLength_desc':
          comparison = (b.zoneLength || 0) - (a.zoneLength || 0);
          break;
        case 'subdomainLength_asc':
          comparison = (a.subdomainLength || 0) - (b.subdomainLength || 0);
          break;
        case 'subdomainLength_desc':
          comparison = (b.subdomainLength || 0) - (a.subdomainLength || 0);
          break;
      }
      
      return comparison;
    });
    
    setFilteredItems(filtered);
    setMarketCurrentPage(0);
  }, [searchQuery, filters, sortBy, marketItems]);

  const MARKET_ITEMS_PER_PAGE = 10;
  const marketTotalPages = Math.ceil(filteredItems.length / MARKET_ITEMS_PER_PAGE);
  const pagedMarketItems = filteredItems.slice(
    marketCurrentPage * MARKET_ITEMS_PER_PAGE,
    marketCurrentPage * MARKET_ITEMS_PER_PAGE + MARKET_ITEMS_PER_PAGE
  );

  // Обработчик кликов вне дропдаунов
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (zoneFilterRef.current && !zoneFilterRef.current.contains(event.target as Node)) {
        setShowZoneFilter(false);
      }
      if (subdomainFilterRef.current && !subdomainFilterRef.current.contains(event.target as Node)) {
        setShowSubdomainFilter(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Обработчик клика по кнопке - ГЕНЕРИРУЕМ ССЫЛКУ В МОМЕНТ КЛИКА
  const handleMakeOfferClick = (item: MarketItem, e: React.MouseEvent) => {
    e.stopPropagation();
    
    console.log(`💼 Обработка клика для: ${item.name}`, {
      collectionAddress: item.collection_address,
      nftAddress: item.address,
      hasLink: item.hasLink
    });
    
    // Генерируем ссылку в момент клика
    const ggLinkToOffer = createGetGemsLink(
      item.collection_address,
      item.address,
      isTestnet
    );
    
    if (ggLinkToOffer) {
      console.log(`✅ Открываем GetGems для: ${item.name}`, ggLinkToOffer);
      track('market_offer_clicked', { itemType: item.type });
      window.open(ggLinkToOffer, '_blank');
    } else {
      console.log(`❌ Не удалось создать ссылку для: ${item.name}`);
      track('market_offer_link_failed', { itemType: item.type });
      alert(`Для ${item.type === 'proxy_subdomain' ? 'субдомена' : 'NFT обертки'} ${item.name} ссылка на GetGems недоступна.\n\nПричина: отсутствует адрес коллекции или NFT.`);
    }
  };

  // Обработчик клика по итему
  const handleItemClick = (item: MarketItem) => {
    console.log(`🔍 Просмотр деталей: ${item.name}`, {
      hasLink: item.hasLink,
      collectionAddress: item.collection_address,
      nftAddress: item.address,
      type: item.type
    });
  };

  // Обработчики фильтров
  const toggleZoneLengthFilter = (length: number) => {
    setFilters(prev => {
      const newZoneLengths = prev.zoneLengths.includes(length)
        ? prev.zoneLengths.filter(l => l !== length)
        : [...prev.zoneLengths, length];
      
      return { ...prev, zoneLengths: newZoneLengths };
    });
  };

  const toggleSubdomainLengthFilter = (length: number) => {
    setFilters(prev => {
      const newSubdomainLengths = prev.subdomainLengths.includes(length)
        ? prev.subdomainLengths.filter(l => l !== length)
        : [...prev.subdomainLengths, length];
      
      return { ...prev, subdomainLengths: newSubdomainLengths };
    });
  };

  // Очистка фильтров
  const clearFilters = () => {
    setFilters({
      zoneLengths: [],
      subdomainLengths: []
    });
    setSearchQuery('');
  };

  // Форматирование даты
  // const formatDate = (dateString: string) => {
  //   try {
  //     const date = new Date(dateString);
  //     return date.toLocaleDateString('ru-RU', {
  //       day: '2-digit',
  //       month: '2-digit',
  //       year: 'numeric'
  //     });
  //   } catch (error) {
  //     return dateString;
  //   }
  // };

  // Получение текста для сортировки
  const getSortText = (sortOption: SortOption): string => {
    switch (sortOption) {
      case 'name_asc': return t('marketSortNameAsc');
      case 'name_desc': return t('marketSortNameDesc');
      case 'price_asc': return t('marketSortPriceAsc');
      case 'price_desc': return t('marketSortPriceDesc');
      case 'date_asc': return t('marketSortDateAsc');
      case 'date_desc': return t('marketSortDateDesc');
      case 'zoneLength_asc': return t('marketSortZoneLengthAsc');
      case 'zoneLength_desc': return t('marketSortZoneLengthDesc');
      case 'subdomainLength_asc': return t('marketSortSubdomainLengthAsc');
      case 'subdomainLength_desc': return t('marketSortSubdomainLengthDesc');
      default: return t('marketSort');
    }
  };

  // Функция для обновления данных
  const handleRefresh = async () => {
    setLoading(true);
    try {
      await loadAllData(true); // forceRefresh = true
    } catch (error) {
      console.error('❌ Ошибка обновления данных:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page back={true}>
      <div 
        className="market-page-wrapper"
        style={{
          maxWidth: '425px',
          margin: '0 auto',
          padding: '20px 16px 180px 16px',
          background: colors.background,
          minHeight: '100vh',
          position: 'relative'
        }}
      >
        {/* Заголовок - фиксированный вверху */}
        <div style={{ 
          marginBottom: '24px',
          // position: 'sticky',
          top: '0',
          zIndex: 100,
          background: colors.background,
          paddingTop: '10px',
          paddingBottom: '10px'
        }}>
          <h1 
            style={{
              fontSize: '28px',
              fontWeight: '700',
              color: colors.text,
              margin: '0 0 8px 0',
              textAlign: 'center',
            }}
          >
            {t('marketTitle')}
          </h1>
          <p 
            style={{
              fontSize: '16px',
              color: colors.textSecondary,
              textAlign: 'center',
              margin: 0,
            }}
          >
            {t('marketSubtitle')}
          </p>
        </div>

        {/* Табы для переключения между субдоменами и NFT обертками */}
        <div style={{
          display: 'flex',
          background: colors.cardBg,
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          marginBottom: '16px',
          overflow: 'hidden'
        }}>
          <button
            onClick={() => setActiveTab('subdomains')}
            style={{
              flex: 1,
              padding: '12px',
              background: activeTab === 'subdomains' ? colors.tabActive : colors.tabInactive,
              color: activeTab === 'subdomains' ? '#FFFFFF' : colors.text,
              border: 'none',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            📝 {t('marketTabSubdomains')}
          </button>
          <button
            onClick={() => setActiveTab('nft-wrappers')}
            style={{
              flex: 1,
              padding: '12px',
              background: activeTab === 'nft-wrappers' ? colors.tabActive : colors.tabInactive,
              color: activeTab === 'nft-wrappers' ? '#FFFFFF' : colors.text,
              border: 'none',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            🎨 {t('marketTabZones')}
          </button>
        </div>

        {/* ФИКСИРОВАННЫЙ ВЕРХНИЙ БЛОК с поиском, фильтрами и статистикой */}
        <div 
          ref={headerRef}
          style={{
            position: 'sticky',
            top: '66px', // 66px (хедер) + 22px (лейбл) = 88px от верха страницы
            zIndex: 99,
            background: colors.background,
            paddingBottom: '12px',
            marginBottom: '20px',
            borderBottom: `1px solid ${colors.border}`,
            boxShadow: `0 4px 12px ${isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)'}`
          }}
        >
          {/* Поиск и фильтры */}
          <div style={{ marginBottom: '12px' }}>
            {/* Строка поиска */}
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <input
                type="text"
                placeholder={t('marketSearchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 40px',
                  background: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: '8px',
                  color: colors.inputText,
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <div style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: colors.textSecondary
              }}>
                🔍
              </div>
            </div>

            {/* Кнопки фильтров и сортировки */}
            <div style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap'
            }}>
              {/* Фильтр по длине зоны */}
              <div style={{ position: 'relative' }} ref={zoneFilterRef}>
                <button
                  onClick={() => setShowZoneFilter(!showZoneFilter)}
                  style={{
                    padding: '8px 12px',
                    background: filters.zoneLengths.length > 0 ? colors.primary : colors.headerBg,
                    color: filters.zoneLengths.length > 0 ? '#FFFFFF' : colors.text,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>{t('marketZoneFilter')}</span>
                  {filters.zoneLengths.length > 0 && (
                    <span style={{
                      background: '#FFFFFF',
                      color: colors.primary,
                      borderRadius: '50%',
                      width: '16px',
                      height: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: '600'
                    }}>
                      {filters.zoneLengths.length}
                    </span>
                  )}
                </button>
                
                {/* Дропдаун фильтра зоны */}
                {showZoneFilter && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '4px',
                    background: colors.dropdownBg,
                    border: `1px solid ${colors.dropdownBorder}`,
                    borderRadius: '8px',
                    padding: '12px',
                    zIndex: 1000,
                    minWidth: '180px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div style={{ 
                      fontSize: '12px', 
                      fontWeight: '600', 
                      marginBottom: '8px',
                      color: colors.text 
                    }}>
                      {t('marketZoneLengthLabel')}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {[4, 5, 6, 7, 8, 9].map(length => (
                        <label key={length} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          color: colors.text
                        }}>
                          <input
                            type="checkbox"
                            checked={filters.zoneLengths.includes(length)}
                            onChange={() => toggleZoneLengthFilter(length)}
                            style={{
                              accentColor: colors.primary
                            }}
                          />
                          <span>{length} {length === 9 ? t('marketCharsPlus') : t('marketChars')}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Фильтр по длине субдомена */}
              <div style={{ position: 'relative' }} ref={subdomainFilterRef}>
                <button
                  onClick={() => setShowSubdomainFilter(!showSubdomainFilter)}
                  style={{
                    padding: '8px 12px',
                    background: filters.subdomainLengths.length > 0 ? colors.primary : colors.headerBg,
                    color: filters.subdomainLengths.length > 0 ? '#FFFFFF' : colors.text,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>{t('marketSubdomainFilter')}</span>
                  {filters.subdomainLengths.length > 0 && (
                    <span style={{
                      background: '#FFFFFF',
                      color: colors.primary,
                      borderRadius: '50%',
                      width: '16px',
                      height: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: '600'
                    }}>
                      {filters.subdomainLengths.length}
                    </span>
                  )}
                </button>
                
                {/* Дропдаун фильтра субдомена */}
                {showSubdomainFilter && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '4px',
                    background: colors.dropdownBg,
                    border: `1px solid ${colors.dropdownBorder}`,
                    borderRadius: '8px',
                    padding: '12px',
                    zIndex: 1000,
                    minWidth: '180px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div style={{ 
                      fontSize: '12px', 
                      fontWeight: '600', 
                      marginBottom: '8px',
                      color: colors.text 
                    }}>
                      {t('marketSubdomainLengthLabel')}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {[1, 2, 3, 4, 5, 6].map(length => (
                        <label key={length} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          color: colors.text
                        }}>
                          <input
                            type="checkbox"
                            checked={filters.subdomainLengths.includes(length)}
                            onChange={() => toggleSubdomainLengthFilter(length)}
                            style={{
                              accentColor: colors.primary
                            }}
                          />
                          <span>{length} {length === 6 ? t('marketCharsPlus') : t('marketChars')}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Сортировка */}
              <div style={{ position: 'relative' }} ref={sortDropdownRef}>
                <button
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  style={{
                    padding: '8px 12px',
                    background: colors.headerBg,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>↕️ {getSortText(sortBy)}</span>
                </button>
                
                {/* Дропдаун сортировки */}
                {showSortDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '4px',
                    background: colors.dropdownBg,
                    border: `1px solid ${colors.dropdownBorder}`,
                    borderRadius: '8px',
                    padding: '8px 0',
                    zIndex: 1000,
                    minWidth: '220px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }}>
                    {[
                      { value: 'name_asc', label: t('marketSortNameAsc') },
                      { value: 'name_desc', label: t('marketSortNameDesc') },
                      { value: 'price_asc', label: t('marketSortPriceAsc') },
                      { value: 'price_desc', label: t('marketSortPriceDesc') },
                      { value: 'date_asc', label: t('marketSortDateAsc') },
                      { value: 'date_desc', label: t('marketSortDateDesc') },
                      { value: 'zoneLength_asc', label: t('marketSortZoneLengthAsc') },
                      { value: 'zoneLength_desc', label: t('marketSortZoneLengthDesc') },
                      { value: 'subdomainLength_asc', label: t('marketSortSubdomainLengthAsc') },
                      { value: 'subdomainLength_desc', label: t('marketSortSubdomainLengthDesc') }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value as SortOption);
                          setShowSortDropdown(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: 'transparent',
                                                    border: 'none',
                          textAlign: 'left',
                          fontSize: '12px',
                          color: sortBy === option.value ? colors.primary : colors.text,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = colors.hover;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {sortBy === option.value && (
                          <span style={{ color: colors.primary }}>✓</span>
                        )}
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Кнопка очистки фильтров */}
              {(filters.zoneLengths.length > 0 || filters.subdomainLengths.length > 0 || searchQuery) && (
                <button
                  onClick={clearFilters}
                  style={{
                    padding: '8px 12px',
                    background: colors.error,
                    color: '#FFFFFF',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>🗑️ {t('marketClearFilters')}</span>
                </button>
              )}

             
            </div>
          </div>

          {/* Статистика */}
          <div style={{
            background: colors.cardBg,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                {activeTab === 'subdomains' ? t('marketTotal') : t('marketTotal')}
              </div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: colors.text }}>
                {marketItems.length}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                {t('marketFiltered')}
              </div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: colors.primary }}>
                {filteredItems.length}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                {t('marketOnSale')}
              </div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: colors.success }}>
                {marketItems.filter(item => item.status === 'On Sale').length}
              </div>
            </div>
          </div>
        </div>

        {/* Контент */}
        <div style={{ background: colors.cardBg, borderRadius: '8px', border: `1px solid ${colors.border}` }}>
          {loading ? (
            <ScanProgressLoader label={t('marketLoading') || 'Загрузка рынка'} textColor={colors.textSecondary} />
          ) : error ? (
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ color: colors.error, marginBottom: '12px', fontSize: '24px' }}>❌</div>
              <div style={{ color: colors.error, fontSize: '14px', marginBottom: '16px' }}>{error}</div>
              <button
                onClick={handleRefresh}
                style={{
                  background: colors.primary,
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                {t('marketRetry')}
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: colors.textSecondary }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
              <div style={{ fontSize: '16px', marginBottom: '8px' }}>{t('marketNoItems')}</div>
              <div style={{ fontSize: '12px' }}>
                {searchQuery || filters.zoneLengths.length > 0 || filters.subdomainLengths.length > 0 
                  ? t('marketNoItemsFiltered') 
                  : activeTab === 'subdomains' 
                    ? t('marketNoSubdomains') 
                    : t('marketNoNFTWrappers')}
              </div>
            </div>
          ) : (
            <div>
              {/* Строки таблицы */}
              {pagedMarketItems.map((item) => {
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      padding: '16px',
                      borderBottom: `1px solid ${colors.border}`,
                      fontSize: '12px',
                      color: colors.text,
                      cursor: 'pointer',
                      alignItems: 'flex-start',
                      transition: 'background-color 0.2s ease',
                      gap: '16px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.hover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = colors.cardBg;
                    }}
                    onClick={() => handleItemClick(item)}
                  >
                    {/* Image */}
                    <div style={{ flexShrink: 0, position: 'relative' }}>
                      <img
                        src={item.imgUri}
                        alt={item.name}
                        style={{
                          width: '140px',
                          height: '140px',
                          borderRadius: '8px',
                          objectFit: 'cover',
                          border: `1px solid ${colors.border}`
                        }}
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 140 140"><rect width="140" height="140" fill="%23f0f0f0"/><text x="70" y="70" font-family="Arial" font-size="14" fill="%23999" text-anchor="middle" dy=".3em">No Image</text></svg>';
                        }}
                      />
                      {item.address && (
                        <LupaButton
                          domain={item.name}
                          address={item.address}
                          isTestnet={isTestnet}
                          size={32}
                          offset={4}
                          corner="bottom-right"
                        />
                      )}
                    </div>
                    
                    {/* Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontWeight: '600', 
                        wordBreak: 'break-word',
                        lineHeight: '1.3',
                        marginBottom: '8px',
                        color: colors.primary,
                        fontSize: '14px'
                      }}>
                        {/* {item.type === 'nft_wrapper' ?
                        `${item.name.split(' ')[1]}.${item.name.split(' ')[2]}` : `${item.name}`} */}
                        {item.name}
                      </div>
                      
                      {/* Тип итема */}
                      <div style={{ 
                        fontSize: '11px', 
                        color: colors.textSecondary,
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span style={{
                          background: item.type === 'proxy_subdomain' ? colors.primary : colors.warning,
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '500'
                        }}>
                          {item.type === 'proxy_subdomain' ? t('marketTypeSubdomain') : t('marketTypeNFTWrapper')}
                        </span>
                        
                      </div>

                      <div style={{ 
                        fontSize: '12px', 
                        color: colors.textSecondary,
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span style={{ fontWeight: '500' }}>{t('marketItemAddress')}:</span> 
                        {item.address ? (
                          <a 
                            href={`https://tonviewer.com/${item.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: colors.primary,
                              textDecoration: 'none',
                              fontWeight: '500'
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {`${item.address.slice(0, 6)}...${item.address.slice(-4)}`}
                          </a>
                        ) : '—'}
                      </div>

                        {item.type === 'proxy_subdomain' && (
                          <>
                          <div style={{ 
                        fontSize: '12px', 
                        color: colors.textSecondary,
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span style={{ fontWeight: '500' }}>{t('marketSubdomainLengthLabel')}</span> 
                        {item.subdomainLength && (
                          <span style={{
                            background: colors.headerBg,
                            color: colors.textSecondary,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px'
                          }}>
                            {item.subdomainLength} {t('marketChars')}
                          </span>
                        )}
                      </div>
                      </>
                        )}
                      <div style={{ 
                        fontSize: '12px', 
                        color: colors.textSecondary,
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span style={{ fontWeight: '500' }}>{t('marketZoneLengthLabel')}</span> 
                        {item.zoneLength && (
                          <span style={{
                            background: colors.headerBg,
                            color: colors.textSecondary,
                            padding: '1px 4px',
                            borderRadius: '2px',
                            fontSize: '10px',
                            marginLeft: '4px'
                          }}>
                            {/* {item.type !== 'proxy_subdomain' ? `${item.name.split(' ')[2].length}` :`${item.zoneLength}` } {t('marketChars')} */}
                            {item.zoneLength} {t('marketChars')}
                          </span>
                        )}
                      </div>
                    
                      
                      <div style={{ 
                        fontSize: '12px', 
                        color: colors.textSecondary,
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span style={{ fontWeight: '500' }}>{t('marketOwner')}:</span> 
                        {item.owner ? (
                          <a 
                            href={isTestnet ? `https://testnet.tonviewer.com/${item.owner}` : `https://tonviewer.com/${item.owner}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: colors.primary,
                              textDecoration: 'none',
                              fontWeight: '500'
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {`${item.owner.slice(0, 6)}...${item.owner.slice(-4)}`}
                          </a>
                        ) : '—'}
                      </div>
                      
                      
                      
                      {/* Button - ВСЕГДА "Make Offer" */}
                      <div style={{ marginTop: 'auto' }}>
                        <button
                          onClick={(e) => handleMakeOfferClick(item, e)}
                          style={{
                            background: colors.primary,
                            color: '#FFFFFF',
                            border: 'none',
                            padding: '10px 16px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            width: '100%',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = `0 4px 12px ${colors.primary}40`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          {t('marketMakeOffer')}
                        </button>
                        
                        {item.hasLink ? (
                          <div style={{
                            fontSize: '10px',
                            color: colors.success,
                            textAlign: 'center',
                            marginTop: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}>
                            <span>✓</span>
                            <span>{t('marketLinkAvailable')}</span>
                          </div>
                        ) : (
                          <div style={{
                            fontSize: '10px',
                            color: colors.textSecondary,
                            textAlign: 'center',
                            marginTop: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}>
                            <span>⚠️</span>
                            <span>{t('marketNoLink')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {marketTotalPages > 1 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px 0',
                  }}
                >
                  <button
                    onClick={() => setMarketCurrentPage((p) => Math.max(0, p - 1))}
                    disabled={marketCurrentPage === 0}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: marketCurrentPage === 0 ? 'transparent' : colors.cardBg,
                      color: marketCurrentPage === 0 ? colors.textSecondary : colors.text,
                      cursor: marketCurrentPage === 0 ? 'default' : 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    ‹ {t('marketPrev') || 'Назад'}
                  </button>
                  <span style={{ fontSize: '13px', color: colors.textSecondary }}>
                    {marketCurrentPage + 1} / {marketTotalPages}
                  </span>
                  <button
                    onClick={() => setMarketCurrentPage((p) => Math.min(marketTotalPages - 1, p + 1))}
                    disabled={marketCurrentPage === marketTotalPages - 1}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: marketCurrentPage === marketTotalPages - 1 ? 'transparent' : colors.cardBg,
                      color: marketCurrentPage === marketTotalPages - 1 ? colors.textSecondary : colors.text,
                      cursor: marketCurrentPage === marketTotalPages - 1 ? 'default' : 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    {t('marketNext') || 'Вперёд'} ›
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        {/* Футер информации */}
        <div style={{
          marginTop: '20px',
          padding: '12px 16px',
          background: colors.cardBg,
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          fontSize: '11px',
          color: colors.textSecondary
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.success }}></div>
            <span>{t('marketFooterInfoZones')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.primary }}></div>
            <span>{t('marketMakeOfferInfo')}</span>
          </div>
          {/* <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.warning }}></div>
            <span>{activeTab === 'subdomains' ? t('marketSubdomainInfo') : t('marketNFTWrapperInfo')}</span>
          </div> */}
          
          {(filters.zoneLengths.length > 0 || filters.subdomainLengths.length > 0) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.primary }}></div>
              <span>
                {t('marketActiveFilters')}: 
                {filters.zoneLengths.length > 0 && ` ${t('marketZone')}: ${filters.zoneLengths.join(', ')} ${t('marketChars')}`}
                {filters.subdomainLengths.length > 0 && ` ${t('marketSubdomain')}: ${filters.subdomainLengths.join(', ')} ${t('marketChars')}`}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: marketItems.filter(item => item.hasLink).length > 0 ? colors.success : colors.error }}></div>
            <span>
              {t('marketLinksAvailable')}: {marketItems.filter(item => item.hasLink).length} {t('marketOf')} {marketItems.length} {activeTab === 'subdomains' ? t('marketSubdomains') : t('marketNFTWrappers')}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isTestnet ? '#F59E0B' : '#10B981' }}></div>
            <span>{t('marketNetworkInfo')}: {isTestnet ? t('marketTestnet') : t('marketMainnet')}</span>
          </div>
          {/* <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: blockchainError ? colors.error : colors.success }}></div>
            <span>
              {blockchainError ? `❌ ${t('marketBlockchainError')}: ${blockchainError}` : `✅ ${t('marketBlockchainConnected')}`}
            </span>
          </div> */}
        </div>
      </div>

      {tutorial.active && tutorial.isStepDone('torrent_created') && !tutorial.isStepDone('market_toured') && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: '80px', display: 'flex', justifyContent: 'center', zIndex: 1002, padding: '0 16px' }}>
          <TutorialTooltip
            blockLabel={t('tutorialBlock4Label') || 'Блок 4'}
            stepLabel={t('tutorialStep1Label') || 'Шаг 1'}
            text={t('tutorialMarketTourText') || 'Здесь маркет: вкладка "Субдомены" — покупка/продажа готовых субдоменов, вкладка "NFT-обёртки" — площадка для Proxy-доменов, разыгранных на аукционе.'}
            buttons={[{ label: t('tutorialNext') || 'Далее', primary: true, onClick: async () => { await tutorial.recordStep('market_toured'); tutorial.resumeStep(); } }]}
            style={{ position: 'static' }}
          />
        </div>
      )}
    </Page>
  );
};

export default MarketPage;
