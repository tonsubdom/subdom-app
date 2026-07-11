

// import React, { useState, useEffect, useRef } from 'react';
// import { Page } from "@/components/Page";
// // import { useLanguage } from '@/contexts/LanguageContext';
// import { useTheme } from '@/contexts/ThemeContext';
// import { apiService, Zone } from '../../services/api';
// import { useTonWallet } from '@tonconnect/ui-react';
// import { Address } from "@ton/core";
// import { useLaunchParams } from '@telegram-apps/sdk-react'; // Добавляем импорт

// interface MarketItem {
//   id: number;
//   name: string;
//   owner?: string;
//   lastBid?: string;
//   mintPrice: string;
//   zoneName?: string;
//   subdomainName?: string;
//   imgUri?: string;
//   ggLinkToOffer?: string;
//   registrationDate: string;
//   status: string;
//   zoneLength?: number;
//   subdomainLength?: number;
//   hasLink: boolean;
// }

// interface FilterState {
//   zoneLengths: number[];
//   subdomainLengths: number[];
// }

// type SortOption = 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 
//                   'date_asc' | 'date_desc' | 'zoneLength_asc' | 'zoneLength_desc' | 
//                   'subdomainLength_asc' | 'subdomainLength_desc';// Функция для конвертации адреса в нужный формат
// // Функция для конвертации адреса в нужный формат
// const convertAddress = (address: string, isTestnet: boolean): string => {
//   if (!address) return '';
  
//   try {
//     const parsedAddress = Address.parse(address);
//     return parsedAddress.toString({ 
//       testOnly: isTestnet, 
//       urlSafe: true,
//       bounceable: false 
//     });
//   } catch (error) {
//     console.error('Error converting address:', error, 'address:', address);
//     return address;
//   }
// };

// // Функция для извлечения длины зоны и субдомена
// const extractLengths = (name: string): { zoneLength: number, subdomainLength: number } => {
//   const parts = name.split('.');
//   let subdomainLength = 0;
//   let zoneLength = 0;
  
//   if (parts.length >= 2) {
//     subdomainLength = parts[0].length;
//     zoneLength = parts.slice(1).join('.').length;
//   } else if (parts.length === 1) {
//     subdomainLength = parts[0].length;
//     zoneLength = 0;
//   }
  
//   return { zoneLength, subdomainLength };
// };

// // Функция для создания ссылки GetGems - вызывается в обработчике клика
// const createGetGemsLinkInHandler = (
//   zoneAddress: string | undefined,
//   subdomainAddress: string | undefined,
//   isTestnet: boolean
// ): string => {
//   if (!zoneAddress || !subdomainAddress) {
//     console.log('❌ Нет адресов для создания ссылки:', { zoneAddress, subdomainAddress });
//     return '';
//   }
  
//   try {
//     // Конвертируем адреса в нужный формат
//     const convertedZoneAddress = convertAddress(zoneAddress, isTestnet);
//     const convertedSubdomainAddress = convertAddress(subdomainAddress, isTestnet);
    
//     // Проверяем что адреса валидны
//     if (convertedZoneAddress && convertedSubdomainAddress) {
//       const link = isTestnet 
//         ? `https://testnet.getgems.io/collection/${convertedZoneAddress}/${convertedSubdomainAddress}`
//         : `https://getgems.io/collection/${zoneAddress}/${subdomainAddress}`;
      
//       console.log('✅ Создана ссылка GetGems:', {
//         zoneAddress,
//         subdomainAddress,
//         convertedZoneAddress,
//         convertedSubdomainAddress,
//         isTestnet,
//         link
//       });
      
//       return link;
//     }
//   } catch (error) {
//     console.error('❌ Ошибка создания ссылки GetGems:', error);
//   }
  
//   return '';
// };

//   const MarketPage: React.FC = () => {
//   const { currentTheme } = useTheme();
//   const wallet = useTonWallet();
//   const isDark = currentTheme === 'dark';
//   // const { t } = useLanguage();
//   const isTestnet = wallet?.account?.chain === "-3";
  
//   // Добавляем launchParams для deeplink
//   const launchParams = useLaunchParams();
  
//   // Состояние для отслеживания открытия через deeplink
//   const [openedViaDeeplink, setOpenedViaDeeplink] = useState(false);
  
//   // Состояния
//   const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<string | null>(null);
//   const [filteredItems, setFilteredItems] = useState<MarketItem[]>([]);
//   const [searchQuery, setSearchQuery] = useState<string>('');
//   const [sortBy, setSortBy] = useState<SortOption>('name_asc');
//   const [filters, setFilters] = useState<FilterState>({
//     zoneLengths: [],
//     subdomainLengths: []
//   });
//   const [zones, setZones] = useState<Zone[]>([]);
  
//   // Состояния для дропдаунов
//   const [showZoneFilter, setShowZoneFilter] = useState<boolean>(false);
//   const [showSubdomainFilter, setShowSubdomainFilter] = useState<boolean>(false);
//   const [showSortDropdown, setShowSortDropdown] = useState<boolean>(false);
  
//   // Refs для кликов вне дропдаунов
//   const zoneFilterRef = useRef<HTMLDivElement>(null);
//   const subdomainFilterRef = useRef<HTMLDivElement>(null);
//   const sortDropdownRef = useRef<HTMLDivElement>(null);
  
//   // Ref для верхнего блока
//   const headerRef = useRef<HTMLDivElement>(null);
  
//   // Цветовые схемы
//   const colors = isDark ? {
//     primary: '#D4AF37',
//     secondary: '#B8860B',
//     background: '#1F2937',
//     cardBg: '#1F2937',
//     text: '#F9FAFB',
//     textSecondary: '#9CA3AF',
//     border: '#374151',
//     headerBg: '#374151',
//     success: '#34D399',
//     warning: '#FBBF24',
//     error: '#F87171',
//     hover: '#4B5563',
//     inputBg: '#374151',
//     inputBorder: '#4B5563',
//     inputText: '#F9FAFB',
//     dropdownBg: '#1F2937',
//     dropdownBorder: '#4B5563'
//   } : {
//     primary: '#3B82F6',
//     secondary: '#60A5FA',
//     background: '#F0F9FF',
//     cardBg: '#FFFFFF',
//     text: '#1F2937',
//     textSecondary: '#6B7280',
//     border: '#E5E7EB',
//     headerBg: '#F8FAFC',
//     success: '#10B981',
//     warning: '#F59E0B',
//     error: '#EF4444',
//     hover: '#F3F4F6',
//     inputBg: '#FFFFFF',
//     inputBorder: '#D1D5DB',
//     inputText: '#1F2937',
//     dropdownBg: '#FFFFFF',
//     dropdownBorder: '#E5E7EB'
//   };

//   // Проверяем, открыто ли через deeplink при монтировании
//   useEffect(() => {
//     const startappParam = launchParams.startParam;
//     if (startappParam) {
//       console.log(`🔗 MarketPage открыт через deeplink: ${startappParam}`);
//       setOpenedViaDeeplink(true);
      
//       // Парсим параметр для дополнительной информации
//       const parts = startappParam.split('_');
//       if (parts[0] === 'market') {
//         console.log('✅ Пользователь перешел на маркет из уведомления о завершенном аукционе');
//       }
//     }
//   }, [launchParams.startParam]);

//   // Добавляем блок информации о deeplink
//   const renderDeeplinkInfo = () => {
//     if (!openedViaDeeplink) return null;
    
//     return (
//       <div style={{
//         marginBottom: '16px',
//         padding: '12px 16px',
//         background: isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)',
//         border: `1px solid ${isDark ? '#22c55e' : '#16a34a'}`,
//         borderRadius: '8px',
//         fontSize: '14px',
//         color: isDark ? '#bbf7d0' : '#166534'
//       }}>
//         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
//           <span style={{ fontSize: '16px' }}>🔗</span>
//           <span style={{ fontWeight: '600' }}>Открыто через Telegram deeplink</span>
//         </div>
//         <p style={{ margin: 0, fontSize: '13px' }}>
//           Вы перешли на страницу маркета из уведомления о завершенном аукционе
//         </p>
//       </div>
//     );
//   };

// const loadMarketItems = async () => {
//   setLoading(true);
//   setError(null);
  
//   try {
//     console.log('📡 Загружаем субдомены со статусом "claimed"');
//     console.log(`🌐 Сеть: ${isTestnet ? 'Testnet' : 'Mainnet'}`);
    
//     // Загружаем зоны и субдомены параллельно
//     const [claimedSubdomains, allZones] = await Promise.all([
//       apiService.getSubdomainsByStatus('claimed'),
//       apiService.getAllZones()
//     ]);
    
//     console.log(`✅ Найдено субдоменов: ${claimedSubdomains.length}`);
//     console.log(`✅ Найдено зон: ${allZones.length}`);
//     console.log('📋 Список зон:', allZones.map(z => ({ id: z.id, name: z.name, collectionAddress: z.collectionAddress })));
    
//     setZones(allZones);
    
//     // Создаем маппинг zoneId -> zone для быстрого доступа
//     const zoneMapById = new Map<number, Zone>();
//     // Создаем маппинг zoneName -> zone для поиска по имени
//     const zoneMapByName = new Map<string, Zone>();
    
//     allZones.forEach(zone => {
//       zoneMapById.set(zone.id, zone);
//       zoneMapByName.set(zone.name.toLowerCase(), zone);
//     });
    
//     // Обрабатываем субдомены последовательно, чтобы можно было делать дополнительные запросы
//     const items: MarketItem[] = [];
    
//     for (const sub of claimedSubdomains) {
//       // Определяем формат цены
//       let mintPriceAmount: string;
      
//       if (sub.mintPrice > 1000000) {
//         mintPriceAmount = (sub.mintPrice / 1_000_000_000).toFixed(1);
//       } else {
//         mintPriceAmount = sub.mintPrice.toFixed(1);
//       }
      
//       // Извлекаем зону и субдомен из имени
//       const fullName = sub.name;
//       const fullNameWithoutTon = fullName.slice(0, -4); // Убираем .ton
//       const parts = fullNameWithoutTon.split('.');
//       let subdomainName = '';
//       let zoneName = '';

//       const subdomainAddress = sub.address;
//       const zoneId = sub.zoneId;

//       // Пытаемся найти зону разными способами
//       let currentZone: Zone | undefined;
//       let zoneAddress: string | undefined;
      
//       // Способ 1: По zoneId
//       if (zoneId) {
//         currentZone = zoneMapById.get(zoneId);
//         console.log(`🔍 Поиск зоны по zoneId ${zoneId} для ${fullName}:`, 
//           currentZone ? `найдена: ${currentZone.name}` : 'не найдена');
//       }
      
//       // Определяем имя зоны из полного имени
//       if (parts.length >= 2) {
//         subdomainName = parts[0];
//         zoneName = parts.slice(1).join('.');
//       } else {
//         subdomainName = fullName;
//         zoneName = 'unknown';
//       }
      
//       // Способ 2: По имени зоны из локального маппинга
//       if (!currentZone && zoneName && zoneName !== 'unknown') {
//         currentZone = zoneMapByName.get(zoneName.toLowerCase());
//         console.log(`🔍 Поиск зоны по имени "${zoneName}" в локальном маппинге для ${fullName}:`,
//           currentZone ? `найдена: ${currentZone.name}` : 'не найдена');
//       }
      
//       // Способ 3: Ищем зону через API по имени
//       if (!currentZone && zoneName && zoneName !== 'unknown') {
//         console.log(`🔍 Пробуем найти зону "${zoneName}" через API для ${fullName}...`);
//         // Здесь можно добавить вызов API для поиска зоны по имени
//         // currentZone = await findZoneByName(zoneName);
//       }
      
//       // Получаем адрес зоны
//       zoneAddress = currentZone?.collectionAddress;
      
//       // Если у нас есть zoneName но нет адреса, проверяем есть ли такая зона вообще
//       if (zoneName && zoneName !== 'unknown' && !zoneAddress) {
//         console.warn(`⚠️ Для зоны "${zoneName}" (субдомен: ${fullName}) не найден адрес коллекции`);
//         console.warn(`   zoneId: ${zoneId}, найденная зона:`, currentZone);
//       }
      
//       // Извлекаем длины
//       const { zoneLength, subdomainLength } = extractLengths(fullNameWithoutTon);
      
//       // Проверяем наличие адресов
//       const hasLink = !!(zoneAddress && subdomainAddress);
      
//       if (hasLink) {
//         console.log(`✅ ${fullName}: есть оба адреса для ссылки`);
//       } else {
//         console.log(`❌ ${fullName}: нет адресов для ссылки`, {
//           zoneAddress: zoneAddress ? 'есть' : 'нет',
//           subdomainAddress: subdomainAddress ? 'есть' : 'нет',
//           zoneName,
//           zoneId
//         });
//       }
      
//       // Создаем элемент
//       items.push({
//         id: sub.id,
//         name: sub.name,
//         owner: sub.owner,
//         lastBid: sub.lastBid ? `${(sub.lastBid / 1_000_000_000).toFixed(1)} TON` : undefined,
//         mintPrice: `${mintPriceAmount} TON`,
//         zoneName: zoneName,
//         subdomainName: subdomainName,
//         imgUri: `https://api.subdom.zone/api/v1/subdomain/metadata/ton/${zoneName}/${subdomainName}.png`,
//         registrationDate: sub.registrationDate,
//         status: sub.status,
//         ggLinkToOffer: '', // Пустая строка - ссылка будет создаваться в обработчике
//         zoneLength: zoneLength,
//         subdomainLength: subdomainLength,
//         hasLink,
//         // Сохраняем адреса для создания ссылки
//         _zoneAddress: zoneAddress,
//         _subdomainAddress: subdomainAddress,
//         _zoneName: zoneName
//       } as MarketItem & { _zoneAddress?: string; _subdomainAddress?: string; _zoneName?: string });
//     }
    
//     // Сортируем по умолчанию по имени
//     items.sort((a, b) => a.name.localeCompare(b.name));
    
//     console.log(`✅ Найдено субдоменов для продажи: ${items.length}`);
//     console.log(`🔗 Адреса доступны для: ${items.filter(item => item.hasLink).length} субдоменов`);
    
//     // Группируем по наличию ссылок для отладки
//     const withLinks = items.filter(item => item.hasLink);
//     const withoutLinks = items.filter(item => !item.hasLink);
    
//     console.log('🔗 Ссылки доступны для:', withLinks.map(item => ({
//       name: item.name,
//       zoneAddress: (item as any)._zoneAddress,
//       subdomainAddress: (item as any)._subdomainAddress
//     })));
    
//     console.log('❌ Без ссылок:', withoutLinks.map(item => ({
//       name: item.name,
//       zoneAddress: (item as any)._zoneAddress,
//       subdomainAddress: (item as any)._subdomainAddress,
//       zoneName: (item as any)._zoneName
//     })));
    
//     setMarketItems(items as MarketItem[]);
//     setFilteredItems(items as MarketItem[]);
    
//   } catch (error: any) {
//     console.error('❌ Ошибка при загрузке субдоменов:', error);
//     setError(error.message || 'Ошибка загрузки субдоменов');
//   } finally {
//     setLoading(false);
//   }
// };

// // Фильтрация по поисковому запросу и фильтрам
// useEffect(() => {
//   let filtered = [...marketItems];
  
//   // Поиск по тексту
//   if (searchQuery.trim()) {
//     const query = searchQuery.toLowerCase().trim();
//     filtered = filtered.filter(item => 
//       item.name.toLowerCase().includes(query) ||
//       (item.owner && item.owner.toLowerCase().includes(query)) ||
//       item.mintPrice.toLowerCase().includes(query) ||
//       (item.zoneName && item.zoneName.toLowerCase().includes(query))
//     );
//   }
  
//   // Фильтрация по длине зоны
//   if (filters.zoneLengths.length > 0) {
//     filtered = filtered.filter(item => {
//       if (!item.zoneLength) return false;
//       return filters.zoneLengths.includes(item.zoneLength);
//     });
//   }
  
//   // Фильтрация по длине субдомена
//   if (filters.subdomainLengths.length > 0) {
//     filtered = filtered.filter(item => {
//       if (!item.subdomainLength) return false;
//       return filters.subdomainLengths.includes(item.subdomainLength);
//     });
//   }
  
//   // Сортировка
//   filtered.sort((a, b) => {
//     let comparison = 0;
    
//     switch (sortBy) {
//       case 'name_asc':
//         comparison = a.name.localeCompare(b.name);
//         break;
//       case 'name_desc':
//         comparison = b.name.localeCompare(a.name);
//         break;
//       case 'price_asc':
//         const priceA = parseFloat(a.mintPrice.replace(' TON', ''));
//         const priceB = parseFloat(b.mintPrice.replace(' TON', ''));
//         comparison = priceA - priceB;
//         break;
//       case 'price_desc':
//         const priceA2 = parseFloat(a.mintPrice.replace(' TON', ''));
//         const priceB2 = parseFloat(b.mintPrice.replace(' TON', ''));
//         comparison = priceB2 - priceA2;
//         break;
//       case 'date_asc':
//         comparison = new Date(a.registrationDate).getTime() - new Date(b.registrationDate).getTime();
//         break;
//       case 'date_desc':
//         comparison = new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime();
//         break;
//       case 'zoneLength_asc':
//         comparison = (a.zoneLength || 0) - (b.zoneLength || 0);
//         break;
//       case 'zoneLength_desc':
//         comparison = (b.zoneLength || 0) - (a.zoneLength || 0);
//         break;
//       case 'subdomainLength_asc':
//         comparison = (a.subdomainLength || 0) - (b.subdomainLength || 0);
//         break;
//       case 'subdomainLength_desc':
//         comparison = (b.subdomainLength || 0) - (a.subdomainLength || 0);
//         break;
//     }
    
//     return comparison;
//   });
  
//   setFilteredItems(filtered);
// }, [searchQuery, filters, sortBy, marketItems]);

// // Обработчик кликов вне дропдаунов
// useEffect(() => {
//   const handleClickOutside = (event: MouseEvent) => {
//     if (zoneFilterRef.current && !zoneFilterRef.current.contains(event.target as Node)) {
//       setShowZoneFilter(false);
//     }
//     if (subdomainFilterRef.current && !subdomainFilterRef.current.contains(event.target as Node)) {
//       setShowSubdomainFilter(false);
//     }
//     if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
//       setShowSortDropdown(false);
//     }
//   };

//   document.addEventListener('mousedown', handleClickOutside);
//   return () => {
//     document.removeEventListener('mousedown', handleClickOutside);
//   };
// }, []);

// // Загрузка данных при монтировании
// useEffect(() => {
//   loadMarketItems();
// }, []);
// // Обработчик клика по кнопке - используем item.ggLinkToOffer который уникален для каждого элемента
// // Обработчик клика по кнопке - ГЕНЕРИРУЕМ ССЫЛКУ В МОМЕНТ КЛИКА
// const handleMakeOfferClick = (item: MarketItem, e: React.MouseEvent) => {
//   e.stopPropagation();
  
//   // Приводим тип для доступа к дополнительным полям
//   const typedItem = item as MarketItem & { _zoneAddress?: string; _subdomainAddress?: string };
  
//   console.log(`💼 Обработка клика для: ${item.name}`, {
//     zoneAddress: typedItem._zoneAddress,
//     subdomainAddress: typedItem._subdomainAddress,
//     hasLink: item.hasLink
//   });
  
//   // Генерируем ссылку в момент клика
//   const ggLinkToOffer = createGetGemsLinkInHandler(
//     typedItem._zoneAddress,
//     typedItem._subdomainAddress,
//     isTestnet
//   );
  
//   if (ggLinkToOffer) {
//     console.log(`✅ Открываем GetGems для: ${item.name}`, ggLinkToOffer);
//     window.open(ggLinkToOffer, '_blank');
//   } else {
//     console.log(`❌ Не удалось создать ссылку для: ${item.name}`);
//     alert(`Для субдомена ${item.name} ссылка на GetGems недоступна.\n\nПричина: отсутствует адрес коллекции или NFT.`);
//   }
// };

// // Обработчик клика по субдомену
// const handleItemClick = (item: MarketItem) => {
//   const typedItem = item as MarketItem & { _zoneAddress?: string; _subdomainAddress?: string };
//   console.log(`🔍 Просмотр деталей: ${item.name}`, {
//     hasLink: item.hasLink,
//     zoneAddress: typedItem._zoneAddress,
//     subdomainAddress: typedItem._subdomainAddress
//   });
// };

// // Обработчики фильтров
// const toggleZoneLengthFilter = (length: number) => {
//   setFilters(prev => {
//     const newZoneLengths = prev.zoneLengths.includes(length)
//       ? prev.zoneLengths.filter(l => l !== length)
//       : [...prev.zoneLengths, length];
    
//     return { ...prev, zoneLengths: newZoneLengths };
//   });
// };

// const toggleSubdomainLengthFilter = (length: number) => {
//   setFilters(prev => {
//     const newSubdomainLengths = prev.subdomainLengths.includes(length)
//       ? prev.subdomainLengths.filter(l => l !== length)
//       : [...prev.subdomainLengths, length];
    
//     return { ...prev, subdomainLengths: newSubdomainLengths };
//   });
// };

// // Очистка фильтров
// const clearFilters = () => {
//   setFilters({
//     zoneLengths: [],
//     subdomainLengths: []
//   });
//   setSearchQuery('');
// };

// // Форматирование даты
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

// // Получение текста для сортировки
// const getSortText = (sortOption: SortOption): string => {
//   switch (sortOption) {
//     case 'name_asc': return 'Имя (А-Я)';
//     case 'name_desc': return 'Имя (Я-А)';
//     case 'price_asc': return 'Цена (низкая → высокая)';
//     case 'price_desc': return 'Цена (высокая → низкая)';
//     case 'date_asc': return 'Дата (старые → новые)';
//     case 'date_desc': return 'Дата (новые → старые)';
//     case 'zoneLength_asc': return 'Длина зоны (короткие → длинные)';
//     case 'zoneLength_desc': return 'Длина зоны (длинные → короткие)';
//     case 'subdomainLength_asc': return 'Длина субдомена (короткие → длинные)';
//     case 'subdomainLength_desc': return 'Длина субдомена (длинные → короткие)';
//     default: return 'Сортировка';
//   }
// };

// return (
//   <Page back={true}>
//     <div 
//       className="market-page-wrapper"
//       style={{
//         maxWidth: '425px',
//         margin: '0 auto',
//         padding: '20px 16px 180px 16px',
//         background: colors.background,
//         minHeight: '100vh',
//         position: 'relative'
//       }}
//     >
//       {/* Заголовок - фиксированный вверху */}
//       <div style={{ 
//         marginBottom: '24px',
//         position: 'sticky',
//         top: '0',
//         zIndex: 100,
//         background: colors.background,
//         paddingTop: '10px',
//         paddingBottom: '10px'
//       }}>
//         <h1 
//           style={{
//             fontSize: '28px',
//             fontWeight: '700',
//             color: colors.text,
//             margin: '0 0 8px 0',
//             textAlign: 'center',
//           }}
//         >
//           🏠 Market
//         </h1>
//         <p 
//           style={{
//             fontSize: '16px',
//             color: colors.textSecondary,
//             textAlign: 'center',
//             margin: 0,
//           }}
//         >
//           Продайте субдомен или сделайте оффер.
//         </p>
//       </div>

//       {/* Информация о deeplink */}
//       {renderDeeplinkInfo()}

//       {/* ФИКСИРОВАННЫЙ ВЕРХНИЙ БЛОК с поиском, фильтрами и статистикой */}
//       <div 
//         ref={headerRef}
//         style={{
//           position: 'sticky',
//           top: '88px', // 66px (хедер) + 22px (лейбл) = 88px от верха страницы
//           zIndex: 99,
//           background: colors.background,
//           paddingBottom: '12px',
//           marginBottom: '20px',
//           borderBottom: `1px solid ${colors.border}`,
//           boxShadow: `0 4px 12px ${isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)'}`
//         }}
//       >
//         {/* Поиск и фильтры */}
//         <div style={{ marginBottom: '12px' }}>
//           {/* Строка поиска */}
//           <div style={{ position: 'relative', marginBottom: '12px' }}>
//             <input
//               type="text"
//               placeholder="Поиск по имени, владельцу или цене..."
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               style={{
//                 width: '100%',
//                 padding: '12px 16px 12px 40px',
//                 background: colors.inputBg,
//                 border: `1px solid ${colors.inputBorder}`,
//                 borderRadius: '8px',
//                 color: colors.inputText,
//                 fontSize: '14px',
//                 outline: 'none',
//               }}
//             />
//             <div style={{
//               position: 'absolute',
//               left: '12px',
//               top: '50%',
//               transform: 'translateY(-50%)',
//               color: colors.textSecondary
//             }}>
//               🔍
//             </div>
//           </div>

//           {/* Кнопки фильтров и сортировки */}
//           <div style={{
//             display: 'flex',
//             gap: '8px',
//             flexWrap: 'wrap'
//           }}>
//             {/* Фильтр по длине зоны */}
//             <div style={{ position: 'relative' }} ref={zoneFilterRef}>
//               <button
//                 onClick={() => setShowZoneFilter(!showZoneFilter)}
//                 style={{
//                   padding: '8px 12px',
//                   background: filters.zoneLengths.length > 0 ? colors.primary : colors.headerBg,
//                   color: filters.zoneLengths.length > 0 ? '#FFFFFF' : colors.text,
//                   border: `1px solid ${colors.border}`,
//                   borderRadius: '6px',
//                   fontSize: '12px',
//                   cursor: 'pointer',
//                   display: 'flex',
//                   alignItems: 'center',
//                   gap: '4px'
//                 }}
//               >
//                 <span>🌐 Зона</span>
//                 {filters.zoneLengths.length > 0 && (
//                   <span style={{
//                     background: '#FFFFFF',
//                     color: colors.primary,
//                     borderRadius: '50%',
//                     width: '16px',
//                     height: '16px',
//                     display: 'flex',
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     fontSize: '10px',
//                     fontWeight: '600'
//                   }}>
//                     {filters.zoneLengths.length}
//                   </span>
//                 )}
//               </button>
              
//               {/* Дропдаун фильтра зоны */}
//               {showZoneFilter && (
//                 <div style={{
//                   position: 'absolute',
//                   top: '100%',
//                   left: 0,
//                   marginTop: '4px',
//                   background: colors.dropdownBg,
//                   border: `1px solid ${colors.dropdownBorder}`,
//                   borderRadius: '8px',
//                   padding: '12px',
//                   zIndex: 1000,
//                   minWidth: '180px',
//                   boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
//                 }}>
//                   <div style={{ 
//                     fontSize: '12px', 
//                     fontWeight: '600', 
//                     marginBottom: '8px',
//                     color: colors.text 
//                   }}>
//                     Длина зоны:
//                   </div>
//                   <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
//                     {[4, 5, 6, 7, 8, 9].map(length => (
//                       <label key={length} style={{
//                         display: 'flex',
//                         alignItems: 'center',
//                         gap: '8px',
//                         cursor: 'pointer',
//                         fontSize: '12px',
//                         color: colors.text
//                       }}>
//                         <input
//                           type="checkbox"
//                           checked={filters.zoneLengths.includes(length)}
//                           onChange={() => toggleZoneLengthFilter(length)}
//                           style={{
//                             accentColor: colors.primary
//                           }}
//                         />
//                         <span>{length} {length === 9 ? '+ символов' : 'символов'}</span>
//                       </label>
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </div>
//             {/* Фильтр по длине субдомена */}
//             <div style={{ position: 'relative' }} ref={subdomainFilterRef}>
//               <button
//                 onClick={() => setShowSubdomainFilter(!showSubdomainFilter)}
//                 style={{
//                   padding: '8px 12px',
//                   background: filters.subdomainLengths.length > 0 ? colors.primary : colors.headerBg,
//                   color: filters.subdomainLengths.length > 0 ? '#FFFFFF' : colors.text,
//                   border: `1px solid ${colors.border}`,
//                   borderRadius: '6px',
//                   fontSize: '12px',
//                   cursor: 'pointer',
//                   display: 'flex',
//                   alignItems: 'center',
//                   gap: '4px'
//                 }}
//               >
//                 <span>🔤 Субдомен</span>
//                 {filters.subdomainLengths.length > 0 && (
//                   <span style={{
//                     background: '#FFFFFF',
//                     color: colors.primary,
//                     borderRadius: '50%',
//                     width: '16px',
//                     height: '16px',
//                     display: 'flex',
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     fontSize: '10px',
//                     fontWeight: '600'
//                   }}>
//                     {filters.subdomainLengths.length}
//                   </span>
//                 )}
//               </button>
              
//               {/* Дропдаун фильтра субдомена */}
//               {showSubdomainFilter && (
//                 <div style={{
//                   position: 'absolute',
//                   top: '100%',
//                   left: 0,
//                   marginTop: '4px',
//                   background: colors.dropdownBg,
//                   border: `1px solid ${colors.dropdownBorder}`,
//                   borderRadius: '8px',
//                   padding: '12px',
//                   zIndex: 1000,
//                   minWidth: '180px',
//                   boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
//                 }}>
//                   <div style={{ 
//                     fontSize: '12px', 
//                     fontWeight: '600', 
//                     marginBottom: '8px',
//                     color: colors.text 
//                   }}>
//                     Длина субдомена:
//                   </div>
//                   <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
//                     {[1, 2, 3, 4, 5, 6].map(length => (
//                       <label key={length} style={{
//                         display: 'flex',
//                         alignItems: 'center',
//                         gap: '8px',
//                         cursor: 'pointer',
//                         fontSize: '12px',
//                         color: colors.text
//                       }}>
//                         <input
//                           type="checkbox"
//                           checked={filters.subdomainLengths.includes(length)}
//                           onChange={() => toggleSubdomainLengthFilter(length)}
//                           style={{
//                             accentColor: colors.primary
//                           }}
//                         />
//                         <span>{length} {length === 6 ? '+ символов' : 'символов'}</span>
//                       </label>
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* Сортировка */}
//             <div style={{ position: 'relative' }} ref={sortDropdownRef}>
//               <button
//                 onClick={() => setShowSortDropdown(!showSortDropdown)}
//                 style={{
//                   padding: '8px 12px',
//                   background: colors.headerBg,
//                   color: colors.text,
//                   border: `1px solid ${colors.border}`,
//                   borderRadius: '6px',
//                   fontSize: '12px',
//                   cursor: 'pointer',
//                   display: 'flex',
//                   alignItems: 'center',
//                   gap: '4px'
//                 }}
//               >
//                 <span>↕️ {getSortText(sortBy)}</span>
//               </button>
              
//               {/* Дропдаун сортировки */}
//               {showSortDropdown && (
//                 <div style={{
//                   position: 'absolute',
//                   top: '100%',
//                   right: 0,
//                   marginTop: '4px',
//                   background: colors.dropdownBg,
//                   border: `1px solid ${colors.dropdownBorder}`,
//                   borderRadius: '8px',
//                   padding: '8px 0',
//                   zIndex: 1000,
//                   minWidth: '220px',
//                   boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
//                 }}>
//                   {[
//                     { value: 'name_asc', label: 'Имя (А-Я)' },
//                     { value: 'name_desc', label: 'Имя (Я-А)' },
//                     { value: 'price_asc', label: 'Цена (низкая → высокая)' },
//                     { value: 'price_desc', label: 'Цена (высокая → низкая)' },
//                     { value: 'date_asc', label: 'Дата (старые → новые)' },
//                     { value: 'date_desc', label: 'Дата (новые → старые)' },
//                     { value: 'zoneLength_asc', label: 'Длина зоны (короткие → длинные)' },
//                     { value: 'zoneLength_desc', label: 'Длина зоны (длинные → короткие)' },
//                     { value: 'subdomainLength_asc', label: 'Длина субдомена (короткие → длинные)' },
//                     { value: 'subdomainLength_desc', label: 'Длина субдомена (длинные → короткие)' }
//                   ].map((option) => (
//                     <button
//                       key={option.value}
//                       onClick={() => {
//                         setSortBy(option.value as SortOption);
//                         setShowSortDropdown(false);
//                       }}
//                       style={{
//                         width: '100%',
//                         padding: '8px 12px',
//                         background: 'transparent',
//                         border: 'none',
//                         textAlign: 'left',
//                         fontSize: '12px',
//                         color: sortBy === option.value ? colors.primary : colors.text,
//                         cursor: 'pointer',
//                         display: 'flex',
//                         alignItems: 'center',
//                         gap: '8px'
//                       }}
//                       onMouseEnter={(e) => {
//                         e.currentTarget.style.backgroundColor = colors.hover;
//                       }}
//                       onMouseLeave={(e) => {
//                         e.currentTarget.style.backgroundColor = 'transparent';
//                       }}
//                     >
//                       {sortBy === option.value && (
//                         <span style={{ color: colors.primary }}>✓</span>
//                       )}
//                       <span>{option.label}</span>
//                     </button>
//                   ))}
//                 </div>
//               )}
//             </div>

//             {/* Кнопка очистки фильтров */}
//             {(filters.zoneLengths.length > 0 || filters.subdomainLengths.length > 0 || searchQuery) && (
//               <button
//                 onClick={clearFilters}
//                 style={{
//                   padding: '8px 12px',
//                   background: colors.error,
//                   color: '#FFFFFF',
//                   border: `1px solid ${colors.border}`,
//                   borderRadius: '6px',
//                   fontSize: '12px',
//                   cursor: 'pointer',
//                   display: 'flex',
//                   alignItems: 'center',
//                   gap: '4px'
//                 }}
//               >
//                 <span>🗑️ Очистить</span>
//               </button>
//             )}
//           </div>
//         </div>

//         {/* Статистика */}
//         <div style={{
//           background: colors.cardBg,
//           border: `1px solid ${colors.border}`,
//           borderRadius: '8px',
//           padding: '12px 16px',
//           display: 'flex',
//           justifyContent: 'space-between',
//           alignItems: 'center'
//         }}>
//           <div>
//             <div style={{ fontSize: '12px', color: colors.textSecondary }}>
//               Всего
//             </div>
//             <div style={{ fontSize: '20px', fontWeight: '600', color: colors.text }}>
//               {marketItems.length}
//             </div>
//           </div>
//           <div>
//             <div style={{ fontSize: '12px', color: colors.textSecondary }}>
//               Отфильтровано
//             </div>
//             <div style={{ fontSize: '20px', fontWeight: '600', color: colors.primary }}>
//               {filteredItems.length}
//             </div>
//           </div>
//           <div>
//             <div style={{ fontSize: '12px', color: colors.textSecondary }}>
//               Зон
//             </div>
//             <div style={{ fontSize: '20px', fontWeight: '600', color: colors.success }}>
//               {zones.length}
//             </div>
//           </div>
//         </div>
//       </div>

//                   {/* Контент */}
//             {/* Контент */}
//       <div style={{ background: colors.cardBg, borderRadius: '8px', border: `1px solid ${colors.border}` }}>
//         {loading ? (
//           <div style={{ padding: '40px', textAlign: 'center', color: colors.textSecondary }}>
//             <div style={{
//               border: `2px solid ${colors.primary}`,
//               borderTopColor: 'transparent',
//               borderRadius: '50%',
//               width: '30px',
//               height: '30px',
//               animation: 'spin 1s linear infinite',
//               margin: '0 auto 12px'
//             }}></div>
//             <div style={{ fontSize: '14px' }}>Загрузка субдоменов...</div>
//           </div>
//         ) : error ? (
//           <div style={{ padding: '24px', textAlign: 'center' }}>
//             <div style={{ color: colors.error, marginBottom: '12px', fontSize: '24px' }}>❌</div>
//             <div style={{ color: colors.error, fontSize: '14px', marginBottom: '16px' }}>{error}</div>
//             <button
//               onClick={loadMarketItems}
//               style={{
//                 background: colors.primary,
//                 color: '#FFFFFF',
//                 border: 'none',
//                 padding: '8px 16px',
//                 borderRadius: '6px',
//                 fontSize: '13px',
//                 cursor: 'pointer',
//                 fontWeight: '500'
//               }}
//             >
//               Повторить загрузку
//             </button>
//           </div>
//         ) : filteredItems.length === 0 ? (
//           <div style={{ padding: '40px', textAlign: 'center', color: colors.textSecondary }}>
//             <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
//             <div style={{ fontSize: '16px', marginBottom: '8px' }}>Нет субдоменов для отображения</div>
//             <div style={{ fontSize: '12px' }}>
//               {searchQuery || filters.zoneLengths.length > 0 || filters.subdomainLengths.length > 0 
//                 ? 'Попробуйте изменить фильтры или поисковый запрос' 
//                 : 'Создайте субдомен и установите статус "claimed"'}
//             </div>
//           </div>
//         ) : (
//           <div>
//             {/* Строки таблицы */}
//             {filteredItems.map((item) => {
//               return (
//                 <div
//                   key={item.id}
//                   style={{
//                     display: 'flex',
//                     padding: '16px',
//                     borderBottom: `1px solid ${colors.border}`,
//                     fontSize: '12px',
//                     color: colors.text,
//                     cursor: 'pointer',
//                     alignItems: 'flex-start',
//                     transition: 'background-color 0.2s ease',
//                     gap: '16px'
//                   }}
//                   onMouseEnter={(e) => {
//                     e.currentTarget.style.backgroundColor = colors.hover;
//                   }}
//                   onMouseLeave={(e) => {
//                     e.currentTarget.style.backgroundColor = colors.cardBg;
//                   }}
                  
//                   onClick={() => handleItemClick(item)}
//                 >
//                   {/* Image */}
//                   <div style={{ flexShrink: 0 }}>
//                     <img 
//                       src={item.imgUri} 
//                       alt={item.name}
//                       style={{
//                         width: '140px',
//                         height: '140px',
//                         borderRadius: '8px',
//                         objectFit: 'cover',
//                         border: `1px solid ${colors.border}`
//                       }}
//                       onError={(e) => {
//                         e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 140 140"><rect width="140" height="140" fill="%23f0f0f0"/><text x="70" y="70" font-family="Arial" font-size="14" fill="%23999" text-anchor="middle" dy=".3em">No Image</text></svg>';
//                       }}
//                     />
//                   </div>
                  
//                   {/* Details */}
//                   <div style={{ flex: 1, minWidth: 0 }}>
//                     <div style={{ 
//                       fontWeight: '600', 
//                       wordBreak: 'break-word',
//                       lineHeight: '1.3',
//                       marginBottom: '8px',
//                       color: colors.primary,
//                       fontSize: '14px'
//                     }}>
//                       {item.name}
//                     </div>
                    
//                     <div style={{ 
//                       fontSize: '12px', 
//                       color: colors.textSecondary,
//                       marginBottom: '6px',
//                       display: 'flex',
//                       alignItems: 'center',
//                       gap: '4px'
//                     }}>
//                       <span style={{ fontWeight: '500' }}>Zone:</span> 
//                       <span>{item.zoneName || 'Unknown'}</span>
//                       {item.zoneLength && (
//                         <span style={{
//                           background: colors.headerBg,
//                           color: colors.textSecondary,
//                           padding: '1px 4px',
//                           borderRadius: '2px',
//                           fontSize: '10px',
//                           marginLeft: '4px'
//                         }}>
//                           {item.zoneLength} chars
//                         </span>
//                       )}
//                     </div>
                    
//                     <div style={{ 
//                       fontSize: '12px', 
//                       color: colors.textSecondary,
//                       marginBottom: '6px',
//                       display: 'flex',
//                       alignItems: 'center',
//                       gap: '4px'
//                     }}>
//                       <span style={{ fontWeight: '500' }}>Owner:</span> 
//                       {item.owner ? (
//                         <a 
//                           href={`https://tonviewer.com/${item.owner}`}
//                           target="_blank"
//                           rel="noopener noreferrer"
//                           style={{
//                             color: colors.primary,
//                             textDecoration: 'none',
//                             fontWeight: '500'
//                           }}
//                           onClick={(e) => e.stopPropagation()}
//                         >
//                           {`${item.owner.slice(0, 6)}...${item.owner.slice(-4)}`}
//                         </a>
//                       ) : '—'}
//                     </div>
                    
//                     {/* Price */}
//                     <div style={{ 
//                       fontWeight: '700', 
//                       color: colors.primary,
//                       fontSize: '16px',
//                       marginBottom: '8px',
//                       display: 'flex',
//                       alignItems: 'center',
//                       gap: '4px'
//                     }}>
//                       <span style={{ 
//                         fontSize: '12px', 
//                         color: colors.textSecondary,
//                         fontWeight: '400'
//                       }}>
//                         Цена:
//                       </span>
//                       {item.mintPrice}
//                     </div>
                    
//                     {item.lastBid && (
//                       <div style={{
//                         fontSize: '12px',
//                         color: colors.textSecondary,
//                         fontWeight: '400',
//                         marginBottom: '8px',
//                         display: 'flex',
//                         alignItems: 'center',
//                         gap: '4px'
//                       }}>
//                         <span>Last bid:</span>
//                         <span style={{ color: colors.warning, fontWeight: '500' }}>{item.lastBid}</span>
//                       </div>
//                     )}
                    
//                     {/* Date and Status */}
//                     <div style={{ 
//                       fontSize: '11px', 
//                       color: colors.textSecondary,
//                       display: 'flex',
//                       alignItems: 'center',
//                       gap: '8px',
//                       marginBottom: '12px'
//                     }}>
//                       <span>📅 {formatDate(item.registrationDate)}</span>
//                       <span style={{
//                         background: colors.success,
//                         color: 'white',
//                         padding: '2px 6px',
//                         borderRadius: '4px',
//                         fontSize: '10px',
//                         fontWeight: '500'
//                       }}>
//                         {item.status}
//                       </span>
//                       {item.subdomainLength && (
//                         <span style={{
//                           background: colors.headerBg,
//                           color: colors.textSecondary,
//                           padding: '2px 6px',
//                           borderRadius: '4px',
//                           fontSize: '10px'
//                         }}>
//                           Sub: {item.subdomainLength} chars
//                         </span>
//                       )}
//                     </div>
                    
//                     {/* Button - ВСЕГДА "Make Offer" */}
//                     <div style={{ marginTop: 'auto' }}>
//                       <button
//                         onClick={(e) => handleMakeOfferClick(item, e)}
//                         style={{
//                           background: colors.primary,
//                           color: '#FFFFFF',
//                           border: 'none',
//                           padding: '10px 16px',
//                           borderRadius: '6px',
//                           fontSize: '13px',
//                           cursor: 'pointer',
//                           fontWeight: '600',
//                           width: '100%',
//                           whiteSpace: 'nowrap',
//                           transition: 'all 0.2s ease'
//                         }}
//                         onMouseEnter={(e) => {
//                           e.currentTarget.style.transform = 'translateY(-2px)';
//                           e.currentTarget.style.boxShadow = `0 4px 12px ${colors.primary}40`;
//                         }}
//                         onMouseLeave={(e) => {
//                           e.currentTarget.style.transform = 'translateY(0)';
//                           e.currentTarget.style.boxShadow = 'none';
//                         }}
//                       >
//                         Make Offer
//                       </button>
                      
//                       {item.hasLink ? (
//                         <div style={{
//                           fontSize: '10px',
//                           color: colors.success,
//                           textAlign: 'center',
//                           marginTop: '4px',
//                           display: 'flex',
//                           alignItems: 'center',
//                           justifyContent: 'center',
//                           gap: '4px'
//                         }}>
//                           <span>✓</span>
//                           <span>GetGems link available</span>
//                         </div>
//                       ) : (
//                         <div style={{
//                           fontSize: '10px',
//                           color: colors.textSecondary,
//                           textAlign: 'center',
//                           marginTop: '4px',
//                           display: 'flex',
//                           alignItems: 'center',
//                           justifyContent: 'center',
//                           gap: '4px'
//                         }}>
//                           <span>⚠️</span>
//                           <span>No marketplace link</span>
//                         </div>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         )}
//       </div>
//             {/* Футер информации */}
//       <div style={{
//         marginTop: '20px',
//         padding: '12px 16px',
//         background: colors.cardBg,
//         border: `1px solid ${colors.border}`,
//         borderRadius: '8px',
//         fontSize: '11px',
//         color: colors.textSecondary
//       }}>
//         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
//           <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.success }}></div>
//           <span>Субдомены со статусом "claimed" доступны для покупки</span>
//         </div>
//         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
//           <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.primary }}></div>
//           <span>Нажмите "Make Offer" для перехода на GetGems</span>
//         </div>
//         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
//           <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.warning }}></div>
//           <span>Цены отображаются в TON (1 знак после запятой)</span>
//         </div>
//         <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//           <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isTestnet ? '#F59E0B' : '#10B981' }}></div>
//           <span>Сеть: {isTestnet ? 'Testnet (kQ адреса)' : 'Mainnet (EQ/UQ адреса)'}</span>
//         </div>
//         {(filters.zoneLengths.length > 0 || filters.subdomainLengths.length > 0) && (
//           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
//             <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.primary }}></div>
//             <span>
//               Активные фильтры: 
//               {filters.zoneLengths.length > 0 && ` Зона: ${filters.zoneLengths.join(', ')} chars`}
//               {filters.subdomainLengths.length > 0 && ` Субдомен: ${filters.subdomainLengths.join(', ')} chars`}
//             </span>
//           </div>
//         )}
//         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
//           <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: marketItems.filter(item => item.hasLink).length > 0 ? colors.success : colors.error }}></div>
//           <span>
//             Ссылки доступны для: {marketItems.filter(item => item.hasLink).length} из {marketItems.length} субдоменов
//           </span>
//         </div>
//       </div>
//     </div>
//   </Page>
// );
// };

// export default MarketPage;

// import React, { useState, useEffect, useRef } from 'react';
// import { Page } from "@/components/Page";
// import { useLanguage } from '@/contexts/LanguageContext';
// import { useTheme } from '@/contexts/ThemeContext';
// import { apiService, Zone } from '../../services/api';
// import { useTonWallet } from '@tonconnect/ui-react';
// import { Address } from "@ton/core";
// import { useLaunchParams } from '@telegram-apps/sdk-react';

// interface MarketItem {
//   id: number;
//   name: string;
//   owner?: string;
//   lastBid?: string;
//   mintPrice: string;
//   zoneName?: string;
//   subdomainName?: string;
//   imgUri?: string;
//   ggLinkToOffer?: string;
//   registrationDate: string;
//   status: string;
//   zoneLength?: number;
//   subdomainLength?: number;
//   hasLink: boolean;
// }

// interface FilterState {
//   zoneLengths: number[];
//   subdomainLengths: number[];
// }

// type SortOption = 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 
//                   'date_asc' | 'date_desc' | 'zoneLength_asc' | 'zoneLength_desc' | 
//                   'subdomainLength_asc' | 'subdomainLength_desc';

// // Функция для конвертации адреса в нужный формат
// const convertAddress = (address: string, isTestnet: boolean): string => {
//   if (!address) return '';
  
//   try {
//     const parsedAddress = Address.parse(address);
//     return parsedAddress.toString({ 
//       testOnly: isTestnet, 
//       urlSafe: true,
//       bounceable: false 
//     });
//   } catch (error) {
//     console.error('Error converting address:', error, 'address:', address);
//     return address;
//   }
// };

// // Функция для извлечения длины зоны и субдомена
// const extractLengths = (name: string): { zoneLength: number, subdomainLength: number } => {
//   const parts = name.split('.');
//   let subdomainLength = 0;
//   let zoneLength = 0;
  
//   if (parts.length >= 2) {
//     subdomainLength = parts[0].length;
//     zoneLength = parts.slice(1).join('.').length;
//   } else if (parts.length === 1) {
//     subdomainLength = parts[0].length;
//     zoneLength = 0;
//   }
  
//   return { zoneLength, subdomainLength };
// };

// // Функция для создания ссылки GetGems - вызывается в обработчике клика
// const createGetGemsLinkInHandler = (
//   zoneAddress: string | undefined,
//   subdomainAddress: string | undefined,
//   isTestnet: boolean
// ): string => {
//   if (!zoneAddress || !subdomainAddress) {
//     console.log('❌ Нет адресов для создания ссылки:', { zoneAddress, subdomainAddress });
//     return '';
//   }
  
//   try {
//     // Конвертируем адреса в нужный формат
//     const convertedZoneAddress = convertAddress(zoneAddress, isTestnet);
//     const convertedSubdomainAddress = convertAddress(subdomainAddress, isTestnet);
    
//     // Проверяем что адреса валидны
//     if (convertedZoneAddress && convertedSubdomainAddress) {
//       const link = isTestnet 
//         ? `https://testnet.getgems.io/collection/${convertedZoneAddress}/${convertedSubdomainAddress}`
//         : `https://getgems.io/collection/${zoneAddress}/${subdomainAddress}`;
      
//       console.log('✅ Создана ссылка GetGems:', {
//         zoneAddress,
//         subdomainAddress,
//         convertedZoneAddress,
//         convertedSubdomainAddress,
//         isTestnet,
//         link
//       });
      
//       return link;
//     }
//   } catch (error) {
//     console.error('❌ Ошибка создания ссылки GetGems:', error);
//   }
  
//   return '';
// };

// const MarketPage: React.FC = () => {
//   const { currentTheme } = useTheme();
//   const wallet = useTonWallet();
//   const { t } = useLanguage();
//   const isDark = currentTheme === 'dark';
//   const isTestnet = wallet?.account?.chain === "-3";
  
//   // Добавляем launchParams для deeplink
//   const launchParams = useLaunchParams();
  
//   // Состояние для отслеживания открытия через deeplink
//   const [openedViaDeeplink, setOpenedViaDeeplink] = useState(false);
  
//   // Состояния
//   const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<string | null>(null);
//   const [filteredItems, setFilteredItems] = useState<MarketItem[]>([]);
//   const [searchQuery, setSearchQuery] = useState<string>('');
//   const [sortBy, setSortBy] = useState<SortOption>('name_asc');
//   const [filters, setFilters] = useState<FilterState>({
//     zoneLengths: [],
//     subdomainLengths: []
//   });
//   const [zones, setZones] = useState<Zone[]>([]);
  
//   // Состояния для дропдаунов
//   const [showZoneFilter, setShowZoneFilter] = useState<boolean>(false);
//   const [showSubdomainFilter, setShowSubdomainFilter] = useState<boolean>(false);
//   const [showSortDropdown, setShowSortDropdown] = useState<boolean>(false);
  
//   // Refs для кликов вне дропдаунов
//   const zoneFilterRef = useRef<HTMLDivElement>(null);
//   const subdomainFilterRef = useRef<HTMLDivElement>(null);
//   const sortDropdownRef = useRef<HTMLDivElement>(null);
  
//   // Ref для верхнего блока
//   const headerRef = useRef<HTMLDivElement>(null);
  
//   // Цветовые схемы
//   const colors = isDark ? {
//     primary: '#D4AF37',
//     secondary: '#B8860B',
//     background: '#1F2937',
//     cardBg: '#1F2937',
//     text: '#F9FAFB',
//     textSecondary: '#9CA3AF',
//     border: '#374151',
//     headerBg: '#374151',
//     success: '#34D399',
//     warning: '#FBBF24',
//     error: '#F87171',
//     hover: '#4B5563',
//     inputBg: '#374151',
//     inputBorder: '#4B5563',
//     inputText: '#F9FAFB',
//     dropdownBg: '#1F2937',
//     dropdownBorder: '#4B5563'
//   } : {
//     primary: '#3B82F6',
//     secondary: '#60A5FA',
//     background: '#F0F9FF',
//     cardBg: '#FFFFFF',
//     text: '#1F2937',
//     textSecondary: '#6B7280',
//     border: '#E5E7EB',
//     headerBg: '#F8FAFC',
//     success: '#10B981',
//     warning: '#F59E0B',
//     error: '#EF4444',
//     hover: '#F3F4F6',
//     inputBg: '#FFFFFF',
//     inputBorder: '#D1D5DB',
//     inputText: '#1F2937',
//     dropdownBg: '#FFFFFF',
//     dropdownBorder: '#E5E7EB'
//   };

//   // Проверяем, открыто ли через deeplink при монтировании
//   useEffect(() => {
//     const startappParam = launchParams.startParam;
//     if (startappParam) {
//       console.log(`🔗 MarketPage открыт через deeplink: ${startappParam}`);
//       setOpenedViaDeeplink(true);
      
//       // Парсим параметр для дополнительной информации
//       const parts = startappParam.split('_');
//       if (parts[0] === 'market') {
//         console.log('✅ Пользователь перешел на маркет из уведомления о завершенном аукционе');
//       }
//     }
//   }, [launchParams.startParam]);

//   // Добавляем блок информации о deeplink
//   const renderDeeplinkInfo = () => {
//     if (!openedViaDeeplink) return null;
    
//     return (
//       <div style={{
//         marginBottom: '16px',
//         padding: '12px 16px',
//         background: isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)',
//         border: `1px solid ${isDark ? '#22c55e' : '#16a34a'}`,
//         borderRadius: '8px',
//         fontSize: '14px',
//         color: isDark ? '#bbf7d0' : '#166534'
//       }}>
//         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
//           <span style={{ fontSize: '16px' }}>🔗</span>
//           <span style={{ fontWeight: '600' }}>{t('marketDeeplinkTitle')}</span>
//         </div>
//         <p style={{ margin: 0, fontSize: '13px' }}>
//           {t('marketDeeplinkMessage')}
//         </p>
//       </div>
//     );
//   };

//   const loadMarketItems = async () => {
//     setLoading(true);
//     setError(null);
    
//     try {
//       console.log('📡 Загружаем субдомены со статусом "claimed"');
//       console.log(`🌐 Сеть: ${isTestnet ? 'Testnet' : 'Mainnet'}`);
      
//       // Загружаем зоны и субдомены параллельно
//       const [claimedSubdomains, allZones] = await Promise.all([
//         apiService.getSubdomainsByStatus('claimed'),
//         apiService.getAllZones()
//       ]);
      
//       console.log(`✅ Найдено субдоменов: ${claimedSubdomains.length}`);
//       console.log(`✅ Найдено зон: ${allZones.length}`);
//       console.log('📋 Список зон:', allZones.map(z => ({ id: z.id, name: z.name, collectionAddress: z.collectionAddress })));
      
//       setZones(allZones);
      
//       // Создаем маппинг zoneId -> zone для быстрого доступа
//       const zoneMapById = new Map<number, Zone>();
//       // Создаем маппинг zoneName -> zone для поиска по имени
//       const zoneMapByName = new Map<string, Zone>();
      
//       allZones.forEach(zone => {
//         zoneMapById.set(zone.id, zone);
//         zoneMapByName.set(zone.name.toLowerCase(), zone);
//       });
      
//       // Обрабатываем субдомены последовательно, чтобы можно было делать дополнительные запросы
//       const items: MarketItem[] = [];
      
//       for (const sub of claimedSubdomains) {
//         // Определяем формат цены
//         let mintPriceAmount: string;
        
//         if (sub.mintPrice > 1000000) {
//           mintPriceAmount = (sub.mintPrice / 1_000_000_000).toFixed(1);
//         } else {
//           mintPriceAmount = sub.mintPrice.toFixed(1);
//         }
        
//         // Извлекаем зону и субдомен из имени
//         const fullName = sub.name;
//         const fullNameWithoutTon = fullName.slice(0, -4); // Убираем .ton
//         const parts = fullNameWithoutTon.split('.');
//         let subdomainName = '';
//         let zoneName = '';

//         const subdomainAddress = sub.address;
//         const zoneId = sub.zoneId;

//         // Пытаемся найти зону разными способами
//         let currentZone: Zone | undefined;
//         let zoneAddress: string | undefined;
        
//         // Способ 1: По zoneId
//         if (zoneId) {
//           currentZone = zoneMapById.get(zoneId);
//           console.log(`🔍 Поиск зоны по zoneId ${zoneId} для ${fullName}:`, 
//             currentZone ? `найдена: ${currentZone.name}` : 'не найдена');
//         }
        
//         // Определяем имя зоны из полного имени
//         if (parts.length >= 2) {
//           subdomainName = parts[0];
//           zoneName = parts.slice(1).join('.');
//         } else {
//           subdomainName = fullName;
//           zoneName = 'unknown';
//         }
        
//         // Способ 2: По имени зоны из локального маппинга
//         if (!currentZone && zoneName && zoneName !== 'unknown') {
//           currentZone = zoneMapByName.get(zoneName.toLowerCase());
//           console.log(`🔍 Поиск зоны по имени "${zoneName}" в локальном маппинге для ${fullName}:`,
//             currentZone ? `найдена: ${currentZone.name}` : 'не найдена');
//         }
        
//         // Способ 3: Ищем зону через API по имени
//         if (!currentZone && zoneName && zoneName !== 'unknown') {
//           console.log(`🔍 Пробуем найти зону "${zoneName}" через API для ${fullName}...`);
//           // Здесь можно добавить вызов API для поиска зоны по имени
//           // currentZone = await findZoneByName(zoneName);
//         }
        
//         // Получаем адрес зоны
//         zoneAddress = currentZone?.collectionAddress;
        
//         // Если у нас есть zoneName но нет адреса, проверяем есть ли такая зона вообще
//         if (zoneName && zoneName !== 'unknown' && !zoneAddress) {
//           console.warn(`⚠️ Для зоны "${zoneName}" (субдомен: ${fullName}) не найден адрес коллекции`);
//           console.warn(`   zoneId: ${zoneId}, найденная зона:`, currentZone);
//         }
        
//         // Извлекаем длины
//         const { zoneLength, subdomainLength } = extractLengths(fullNameWithoutTon);
        
//         // Проверяем наличие адресов
//         const hasLink = !!(zoneAddress && subdomainAddress);
        
//         if (hasLink) {
//           console.log(`✅ ${fullName}: есть оба адреса для ссылки`);
//         } else {
//           console.log(`❌ ${fullName}: нет адресов для ссылки`, {
//             zoneAddress: zoneAddress ? 'есть' : 'нет',
//             subdomainAddress: subdomainAddress ? 'есть' : 'нет',
//             zoneName,
//             zoneId
//           });
//         }
        
//         // Создаем элемент
//         items.push({
//           id: sub.id,
//           name: sub.name,
//           owner: sub.owner,
//           lastBid: sub.lastBid ? `${(sub.lastBid / 1_000_000_000).toFixed(1)} TON` : undefined,
//           mintPrice: `${mintPriceAmount} TON`,
//           zoneName: zoneName,
//           subdomainName: subdomainName,
//           imgUri: `https://api.subdom.zone/api/v1/subdomain/metadata/ton/${zoneName}/${subdomainName}.png`,
//           registrationDate: sub.registrationDate,
//           status: sub.status,
//           ggLinkToOffer: '', // Пустая строка - ссылка будет создаваться в обработчике
//           zoneLength: zoneLength,
//           subdomainLength: subdomainLength,
//           hasLink,
//           // Сохраняем адреса для создания ссылки
//           _zoneAddress: zoneAddress,
//           _subdomainAddress: subdomainAddress,
//           _zoneName: zoneName
//         } as MarketItem & { _zoneAddress?: string; _subdomainAddress?: string; _zoneName?: string });
//       }
      
//       // Сортируем по умолчанию по имени
//       items.sort((a, b) => a.name.localeCompare(b.name));
      
//       console.log(`✅ Найдено субдоменов для продажи: ${items.length}`);
//       console.log(`🔗 Адреса доступны для: ${items.filter(item => item.hasLink).length} субдоменов`);
      
//       // Группируем по наличию ссылок для отладки
//       const withLinks = items.filter(item => item.hasLink);
//       const withoutLinks = items.filter(item => !item.hasLink);
      
//       console.log('🔗 Ссылки доступны для:', withLinks.map(item => ({
//         name: item.name,
//         zoneAddress: (item as any)._zoneAddress,
//         subdomainAddress: (item as any)._subdomainAddress
//       })));
      
//       console.log('❌ Без ссылок:', withoutLinks.map(item => ({
//         name: item.name,
//         zoneAddress: (item as any)._zoneAddress,
//         subdomainAddress: (item as any)._subdomainAddress,
//         zoneName: (item as any)._zoneName
//       })));
      
//       setMarketItems(items as MarketItem[]);
//       setFilteredItems(items as MarketItem[]);
      
//     } catch (error: any) {
//       console.error('❌ Ошибка при загрузке субдоменов:', error);
//       setError(error.message || t('marketError'));
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Фильтрация по поисковому запросу и фильтрам
//   useEffect(() => {
//     let filtered = [...marketItems];
    
//     // Поиск по тексту
//     if (searchQuery.trim()) {
//       const query = searchQuery.toLowerCase().trim();
//       filtered = filtered.filter(item => 
//         item.name.toLowerCase().includes(query) ||
//         (item.owner && item.owner.toLowerCase().includes(query)) ||
//         item.mintPrice.toLowerCase().includes(query) ||
//         (item.zoneName && item.zoneName.toLowerCase().includes(query))
//       );
//     }
    
//     // Фильтрация по длине зоны
//     if (filters.zoneLengths.length > 0) {
//       filtered = filtered.filter(item => {
//         if (!item.zoneLength) return false;
//         return filters.zoneLengths.includes(item.zoneLength);
//       });
//     }
    
//     // Фильтрация по длине субдомена
//     if (filters.subdomainLengths.length > 0) {
//       filtered = filtered.filter(item => {
//         if (!item.subdomainLength) return false;
//         return filters.subdomainLengths.includes(item.subdomainLength);
//       });
//     }
    
//     // Сортировка
//     filtered.sort((a, b) => {
//       let comparison = 0;
      
//       switch (sortBy) {
//         case 'name_asc':
//           comparison = a.name.localeCompare(b.name);
//           break;
//         case 'name_desc':
//           comparison = b.name.localeCompare(a.name);
//           break;
//         case 'price_asc':
//           const priceA = parseFloat(a.mintPrice.replace(' TON', ''));
//           const priceB = parseFloat(b.mintPrice.replace(' TON', ''));
//           comparison = priceA - priceB;
//           break;
//         case 'price_desc':
//           const priceA2 = parseFloat(a.mintPrice.replace(' TON', ''));
//           const priceB2 = parseFloat(b.mintPrice.replace(' TON', ''));
//           comparison = priceB2 - priceA2;
//           break;
//         case 'date_asc':
//           comparison = new Date(a.registrationDate).getTime() - new Date(b.registrationDate).getTime();
//           break;
//         case 'date_desc':
//           comparison = new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime();
//           break;
//         case 'zoneLength_asc':
//           comparison = (a.zoneLength || 0) - (b.zoneLength || 0);
//           break;
//         case 'zoneLength_desc':
//           comparison = (b.zoneLength || 0) - (a.zoneLength || 0);
//           break;
//         case 'subdomainLength_asc':
//           comparison = (a.subdomainLength || 0) - (b.subdomainLength || 0);
//           break;
//         case 'subdomainLength_desc':
//           comparison = (b.subdomainLength || 0) - (a.subdomainLength || 0);
//           break;
//       }
      
//       return comparison;
//     });
    
//     setFilteredItems(filtered);
//   }, [searchQuery, filters, sortBy, marketItems]);

//   // Обработчик кликов вне дропдаунов
//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (zoneFilterRef.current && !zoneFilterRef.current.contains(event.target as Node)) {
//         setShowZoneFilter(false);
//       }
//       if (subdomainFilterRef.current && !subdomainFilterRef.current.contains(event.target as Node)) {
//         setShowSubdomainFilter(false);
//       }
//       if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
//         setShowSortDropdown(false);
//       }
//     };

//     document.addEventListener('mousedown', handleClickOutside);
//     return () => {
//       document.removeEventListener('mousedown', handleClickOutside);
//     };
//   }, []);

//   // Загрузка данных при монтировании
//   useEffect(() => {
//     loadMarketItems();
//   }, []);

//   // Обработчик клика по кнопке - ГЕНЕРИРУЕМ ССЫЛКУ В МОМЕНТ КЛИКА
//   const handleMakeOfferClick = (item: MarketItem, e: React.MouseEvent) => {
//     e.stopPropagation();
    
//     // Приводим тип для доступа к дополнительным полям
//     const typedItem = item as MarketItem & { _zoneAddress?: string; _subdomainAddress?: string };
    
//     console.log(`💼 Обработка клика для: ${item.name}`, {
//       zoneAddress: typedItem._zoneAddress,
//       subdomainAddress: typedItem._subdomainAddress,
//       hasLink: item.hasLink
//     });
    
//     // Генерируем ссылку в момент клика
//     const ggLinkToOffer = createGetGemsLinkInHandler(
//       typedItem._zoneAddress,
//       typedItem._subdomainAddress,
//       isTestnet
//     );
    
//     if (ggLinkToOffer) {
//       console.log(`✅ Открываем GetGems для: ${item.name}`, ggLinkToOffer);
//       window.open(ggLinkToOffer, '_blank');
//     } else {
//       console.log(`❌ Не удалось создать ссылку для: ${item.name}`);
//       alert(`Для субдомена ${item.name} ссылка на GetGems недоступна.\n\nПричина: отсутствует адрес коллекции или NFT.`);
//     }
//   };

//   // Обработчик клика по субдомену
//   const handleItemClick = (item: MarketItem) => {
//     const typedItem = item as MarketItem & { _zoneAddress?: string; _subdomainAddress?: string };
//     console.log(`🔍 Просмотр деталей: ${item.name}`, {
//       hasLink: item.hasLink,
//       zoneAddress: typedItem._zoneAddress,
//       subdomainAddress: typedItem._subdomainAddress
//     });
//   };

//   // Обработчики фильтров
//   const toggleZoneLengthFilter = (length: number) => {
//     setFilters(prev => {
//       const newZoneLengths = prev.zoneLengths.includes(length)
//         ? prev.zoneLengths.filter(l => l !== length)
//         : [...prev.zoneLengths, length];
      
//       return { ...prev, zoneLengths: newZoneLengths };
//     });
//   };

//   const toggleSubdomainLengthFilter = (length: number) => {
//     setFilters(prev => {
//       const newSubdomainLengths = prev.subdomainLengths.includes(length)
//         ? prev.subdomainLengths.filter(l => l !== length)
//         : [...prev.subdomainLengths, length];
      
//       return { ...prev, subdomainLengths: newSubdomainLengths };
//     });
//   };

//   // Очистка фильтров
//   const clearFilters = () => {
//     setFilters({
//       zoneLengths: [],
//       subdomainLengths: []
//     });
//     setSearchQuery('');
//   };

//   // Форматирование даты
//   const formatDate = (dateString: string) => {
//     try {
//       const date = new Date(dateString);
//       return date.toLocaleDateString('ru-RU', {
//         day: '2-digit',
//         month: '2-digit',
//         year: 'numeric'
//       });
//     } catch (error) {
//       return dateString;
//     }
//   };

//   // Получение текста для сортировки
//   const getSortText = (sortOption: SortOption): string => {
//     switch (sortOption) {
//       case 'name_asc': return t('marketSortNameAsc');
//       case 'name_desc': return t('marketSortNameDesc');
//       case 'price_asc': return t('marketSortPriceAsc');
//       case 'price_desc': return t('marketSortPriceDesc');
//       case 'date_asc': return t('marketSortDateAsc');
//       case 'date_desc': return t('marketSortDateDesc');
//       case 'zoneLength_asc': return t('marketSortZoneLengthAsc');
//       case 'zoneLength_desc': return t('marketSortZoneLengthDesc');
//       case 'subdomainLength_asc': return t('marketSortSubdomainLengthAsc');
//       case 'subdomainLength_desc': return t('marketSortSubdomainLengthDesc');
//       default: return t('marketSort');
//     }
//   };

//   return (
//     <Page back={true}>
//       <div 
//         className="market-page-wrapper"
//         style={{
//           maxWidth: '425px',
//           margin: '0 auto',
//           padding: '20px 16px 180px 16px',
//           background: colors.background,
//           minHeight: '100vh',
//           position: 'relative'
//         }}
//       >
//         {/* Заголовок - фиксированный вверху */}
//         <div style={{ 
//           marginBottom: '24px',
//           position: 'sticky',
//           top: '0',
//           zIndex: 100,
//           background: colors.background,
//           paddingTop: '10px',
//           paddingBottom: '10px'
//         }}>
//           <h1 
//             style={{
//               fontSize: '28px',
//               fontWeight: '700',
//               color: colors.text,
//               margin: '0 0 8px 0',
//               textAlign: 'center',
//             }}
//           >
//             {t('marketTitle')}
//           </h1>
//           <p 
//             style={{
//               fontSize: '16px',
//               color: colors.textSecondary,
//               textAlign: 'center',
//               margin: 0,
//             }}
//           >
//             {t('marketSubtitle')}
//           </p>
//         </div>

//         {/* Информация о deeplink */}
//         {renderDeeplinkInfo()}

//         {/* ФИКСИРОВАННЫЙ ВЕРХНИЙ БЛОК с поиском, фильтрами и статистикой */}
//         <div 
//           ref={headerRef}
//           style={{
//             position: 'sticky',
//             top: '88px', // 66px (хедер) + 22px (лейбл) = 88px от верха страницы
//             zIndex: 99,
//             background: colors.background,
//             paddingBottom: '12px',
//             marginBottom: '20px',
//             borderBottom: `1px solid ${colors.border}`,
//             boxShadow: `0 4px 12px ${isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)'}`
//           }}
//         >
//           {/* Поиск и фильтры */}
//           <div style={{ marginBottom: '12px' }}>
//             {/* Строка поиска */}
//             <div style={{ position: 'relative', marginBottom: '12px' }}>
//               <input
//                 type="text"
//                 placeholder={t('marketSearchPlaceholder')}
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 style={{
//                   width: '100%',
//                   padding: '12px 16px 12px 40px',
//                   background: colors.inputBg,
//                   border: `1px solid ${colors.inputBorder}`,
//                   borderRadius: '8px',
//                   color: colors.inputText,
//                   fontSize: '14px',
//                   outline: 'none',
//                 }}
//               />
//               <div style={{
//                 position: 'absolute',
//                 left: '12px',
//                 top: '50%',
//                 transform: 'translateY(-50%)',
//                 color: colors.textSecondary
//               }}>
//                 🔍
//               </div>
//             </div>

//             {/* Кнопки фильтров и сортировки */}
//             <div style={{
//               display: 'flex',
//               gap: '8px',
//               flexWrap: 'wrap'
//             }}>
//               {/* Фильтр по длине зоны */}
//               <div style={{ position: 'relative' }} ref={zoneFilterRef}>
//                 <button
//                   onClick={() => setShowZoneFilter(!showZoneFilter)}
//                   style={{
//                     padding: '8px 12px',
//                     background: filters.zoneLengths.length > 0 ? colors.primary : colors.headerBg,
//                     color: filters.zoneLengths.length > 0 ? '#FFFFFF' : colors.text,
//                     border: `1px solid ${colors.border}`,
//                     borderRadius: '6px',
//                     fontSize: '12px',
//                     cursor: 'pointer',
//                     display: 'flex',
//                     alignItems: 'center',
//                     gap: '4px'
//                   }}
//                 >
//                   <span>{t('marketZoneFilter')}</span>
//                   {filters.zoneLengths.length > 0 && (
//                     <span style={{
//                       background: '#FFFFFF',
//                       color: colors.primary,
//                       borderRadius: '50%',
//                       width: '16px',
//                       height: '16px',
//                       display: 'flex',
//                       alignItems: 'center',
//                       justifyContent: 'center',
//                       fontSize: '10px',
//                       fontWeight: '600'
//                     }}>
//                       {filters.zoneLengths.length}
//                     </span>
//                   )}
//                 </button>
                
//                 {/* Дропдаун фильтра зоны */}
//                 {showZoneFilter && (
//                   <div style={{
//                     position: 'absolute',
//                     top: '100%',
//                     left: 0,
//                     marginTop: '4px',
//                     background: colors.dropdownBg,
//                     border: `1px solid ${colors.dropdownBorder}`,
//                     borderRadius: '8px',
//                     padding: '12px',
//                     zIndex: 1000,
//                     minWidth: '180px',
//                     boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
//                   }}>
//                     <div style={{ 
//                       fontSize: '12px', 
//                       fontWeight: '600', 
//                       marginBottom: '8px',
//                       color: colors.text 
//                     }}>
//                       {t('marketZoneLengthLabel')}
//                     </div>
//                     <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
//                       {[4, 5, 6, 7, 8, 9].map(length => (
//                         <label key={length} style={{
//                           display: 'flex',
//                           alignItems: 'center',
//                           gap: '8px',
//                           cursor: 'pointer',
//                           fontSize: '12px',
//                           color: colors.text
//                         }}>
//                           <input
//                             type="checkbox"
//                             checked={filters.zoneLengths.includes(length)}
//                             onChange={() => toggleZoneLengthFilter(length)}
//                             style={{
//                               accentColor: colors.primary
//                             }}
//                           />
//                           <span>{length} {length === 9 ? t('marketCharsPlus') : t('marketChars')}</span>
//                         </label>
//                       ))}
//                     </div>
//                   </div>
//                 )}
//               </div>
//               {/* Фильтр по длине субдомена */}
//               <div style={{ position: 'relative' }} ref={subdomainFilterRef}>
//                 <button
//                   onClick={() => setShowSubdomainFilter(!showSubdomainFilter)}
//                   style={{
//                     padding: '8px 12px',
//                     background: filters.subdomainLengths.length > 0 ? colors.primary : colors.headerBg,
//                     color: filters.subdomainLengths.length > 0 ? '#FFFFFF' : colors.text,
//                     border: `1px solid ${colors.border}`,
//                     borderRadius: '6px',
//                     fontSize: '12px',
//                     cursor: 'pointer',
//                     display: 'flex',
//                     alignItems: 'center',
//                     gap: '4px'
//                   }}
//                 >
//                   <span>{t('marketSubdomainFilter')}</span>
//                   {filters.subdomainLengths.length > 0 && (
//                     <span style={{
//                       background: '#FFFFFF',
//                       color: colors.primary,
//                       borderRadius: '50%',
//                       width: '16px',
//                       height: '16px',
//                       display: 'flex',
//                       alignItems: 'center',
//                       justifyContent: 'center',
//                       fontSize: '10px',
//                       fontWeight: '600'
//                     }}>
//                       {filters.subdomainLengths.length}
//                     </span>
//                   )}
//                 </button>
                
//                 {/* Дропдаун фильтра субдомена */}
//                 {showSubdomainFilter && (
//                   <div style={{
//                     position: 'absolute',
//                     top: '100%',
//                     left: 0,
//                     marginTop: '4px',
//                     background: colors.dropdownBg,
//                     border: `1px solid ${colors.dropdownBorder}`,
//                     borderRadius: '8px',
//                     padding: '12px',
//                     zIndex: 1000,
//                     minWidth: '180px',
//                     boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
//                   }}>
//                     <div style={{ 
//                       fontSize: '12px', 
//                       fontWeight: '600', 
//                       marginBottom: '8px',
//                       color: colors.text 
//                     }}>
//                       {t('marketSubdomainLengthLabel')}
//                     </div>
//                     <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
//                       {[1, 2, 3, 4, 5, 6].map(length => (
//                         <label key={length} style={{
//                           display: 'flex',
//                           alignItems: 'center',
//                           gap: '8px',
//                           cursor: 'pointer',
//                           fontSize: '12px',
//                           color: colors.text
//                         }}>
//                           <input
//                             type="checkbox"
//                             checked={filters.subdomainLengths.includes(length)}
//                             onChange={() => toggleSubdomainLengthFilter(length)}
//                             style={{
//                               accentColor: colors.primary
//                             }}
//                           />
//                           <span>{length} {length === 6 ? t('marketCharsPlus') : t('marketChars')}</span>
//                         </label>
//                       ))}
//                     </div>
//                   </div>
//                 )}
//               </div>

//               {/* Сортировка */}
//               <div style={{ position: 'relative' }} ref={sortDropdownRef}>
//                 <button
//                   onClick={() => setShowSortDropdown(!showSortDropdown)}
//                   style={{
//                     padding: '8px 12px',
//                     background: colors.headerBg,
//                     color: colors.text,
//                     border: `1px solid ${colors.border}`,
//                     borderRadius: '6px',
//                     fontSize: '12px',
//                     cursor: 'pointer',
//                     display: 'flex',
//                     alignItems: 'center',
//                     gap: '4px'
//                   }}
//                 >
//                   <span>↕️ {getSortText(sortBy)}</span>
//                 </button>
                
//                 {/* Дропдаун сортировки */}
//                 {showSortDropdown && (
//                   <div style={{
//                     position: 'absolute',
//                     top: '100%',
//                     right: 0,
//                     marginTop: '4px',
//                     background: colors.dropdownBg,
//                     border: `1px solid ${colors.dropdownBorder}`,
//                     borderRadius: '8px',
//                                         padding: '12px',
//                     zIndex: 1000,
//                     minWidth: '180px',
//                     boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
//                   }}>
//                     <div style={{ 
//                       fontSize: '12px', 
//                       fontWeight: '600', 
//                       marginBottom: '8px',
//                       color: colors.text 
//                     }}>
//                       {t('marketSort')}
//                     </div>
//                     <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
//                       <button
//                         onClick={() => { setSortBy('name_asc'); setShowSortDropdown(false); }}
//                         style={{
//                           padding: '6px 8px',
//                           background: sortBy === 'name_asc' ? colors.primary : 'transparent',
//                           color: sortBy === 'name_asc' ? '#FFFFFF' : colors.text,
//                           border: 'none',
//                           borderRadius: '4px',
//                           fontSize: '12px',
//                           cursor: 'pointer',
//                           textAlign: 'left'
//                         }}
//                       >
//                         {t('marketSortNameAsc')}
//                       </button>
//                       <button
//                         onClick={() => { setSortBy('name_desc'); setShowSortDropdown(false); }}
//                         style={{
//                           padding: '6px 8px',
//                           background: sortBy === 'name_desc' ? colors.primary : 'transparent',
//                           color: sortBy === 'name_desc' ? '#FFFFFF' : colors.text,
//                           border: 'none',
//                           borderRadius: '4px',
//                           fontSize: '12px',
//                           cursor: 'pointer',
//                           textAlign: 'left'
//                         }}
//                       >
//                         {t('marketSortNameDesc')}
//                       </button>
//                       <button
//                         onClick={() => { setSortBy('price_asc'); setShowSortDropdown(false); }}
//                         style={{
//                           padding: '6px 8px',
//                           background: sortBy === 'price_asc' ? colors.primary : 'transparent',
//                           color: sortBy === 'price_asc' ? '#FFFFFF' : colors.text,
//                           border: 'none',
//                           borderRadius: '4px',
//                           fontSize: '12px',
//                           cursor: 'pointer',
//                           textAlign: 'left'
//                         }}
//                       >
//                         {t('marketSortPriceAsc')}
//                       </button>
//                       <button
//                         onClick={() => { setSortBy('price_desc'); setShowSortDropdown(false); }}
//                         style={{
//                           padding: '6px 8px',
//                           background: sortBy === 'price_desc' ? colors.primary : 'transparent',
//                           color: sortBy === 'price_desc' ? '#FFFFFF' : colors.text,
//                           border: 'none',
//                           borderRadius: '4px',
//                           fontSize: '12px',
//                           cursor: 'pointer',
//                           textAlign: 'left'
//                         }}
//                       >
//                         {t('marketSortPriceDesc')}
//                       </button>
//                       <button
//                         onClick={() => { setSortBy('date_asc'); setShowSortDropdown(false); }}
//                         style={{
//                           padding: '6px 8px',
//                           background: sortBy === 'date_asc' ? colors.primary : 'transparent',
//                           color: sortBy === 'date_asc' ? '#FFFFFF' : colors.text,
//                           border: 'none',
//                           borderRadius: '4px',
//                           fontSize: '12px',
//                           cursor: 'pointer',
//                           textAlign: 'left'
//                         }}
//                       >
//                         {t('marketSortDateAsc')}
//                       </button>
//                       <button
//                         onClick={() => { setSortBy('date_desc'); setShowSortDropdown(false); }}
//                         style={{
//                           padding: '6px 8px',
//                           background: sortBy === 'date_desc' ? colors.primary : 'transparent',
//                           color: sortBy === 'date_desc' ? '#FFFFFF' : colors.text,
//                           border: 'none',
//                           borderRadius: '4px',
//                           fontSize: '12px',
//                           cursor: 'pointer',
//                           textAlign: 'left'
//                         }}
//                       >
//                         {t('marketSortDateDesc')}
//                       </button>
//                       <button
//                         onClick={() => { setSortBy('zoneLength_asc'); setShowSortDropdown(false); }}
//                         style={{
//                           padding: '6px 8px',
//                           background: sortBy === 'zoneLength_asc' ? colors.primary : 'transparent',
//                           color: sortBy === 'zoneLength_asc' ? '#FFFFFF' : colors.text,
//                           border: 'none',
//                           borderRadius: '4px',
//                           fontSize: '12px',
//                           cursor: 'pointer',
//                           textAlign: 'left'
//                         }}
//                       >
//                         {t('marketSortZoneLengthAsc')}
//                       </button>
//                       <button
//                         onClick={() => { setSortBy('zoneLength_desc'); setShowSortDropdown(false); }}
//                         style={{
//                           padding: '6px 8px',
//                           background: sortBy === 'zoneLength_desc' ? colors.primary : 'transparent',
//                           color: sortBy === 'zoneLength_desc' ? '#FFFFFF' : colors.text,
//                           border: 'none',
//                           borderRadius: '4px',
//                           fontSize: '12px',
//                           cursor: 'pointer',
//                           textAlign: 'left'
//                         }}
//                       >
//                         {t('marketSortZoneLengthDesc')}
//                       </button>
//                       <button
//                         onClick={() => { setSortBy('subdomainLength_asc'); setShowSortDropdown(false); }}
//                         style={{
//                           padding: '6px 8px',
//                           background: sortBy === 'subdomainLength_asc' ? colors.primary : 'transparent',
//                           color: sortBy === 'subdomainLength_asc' ? '#FFFFFF' : colors.text,
//                           border: 'none',
//                           borderRadius: '4px',
//                           fontSize: '12px',
//                           cursor: 'pointer',
//                           textAlign: 'left'
//                         }}
//                       >
//                         {t('marketSortSubdomainLengthAsc')}
//                       </button>
//                       <button
//                         onClick={() => { setSortBy('subdomainLength_desc'); setShowSortDropdown(false); }}
//                         style={{
//                           padding: '6px 8px',
//                           background: sortBy === 'subdomainLength_desc' ? colors.primary : 'transparent',
//                           color: sortBy === 'subdomainLength_desc' ? '#FFFFFF' : colors.text,
//                           border: 'none',
//                           borderRadius: '4px',
//                           fontSize: '12px',
//                           cursor: 'pointer',
//                           textAlign: 'left'
//                         }}
//                       >
//                         {t('marketSortSubdomainLengthDesc')}
//                       </button>
//                     </div>
//                   </div>
//                 )}
//               </div>

//               {/* Кнопка очистки фильтров */}
//               {(filters.zoneLengths.length > 0 || filters.subdomainLengths.length > 0 || searchQuery.trim()) && (
//                 <button
//                   onClick={clearFilters}
//                   style={{
//                     padding: '8px 12px',
//                     background: colors.error,
//                     color: '#FFFFFF',
//                     border: 'none',
//                     borderRadius: '6px',
//                     fontSize: '12px',
//                     cursor: 'pointer',
//                     display: 'flex',
//                     alignItems: 'center',
//                     gap: '4px'
//                   }}
//                 >
//                   <span>🗑️ {t('marketClearFilters')}</span>
//                 </button>
//               )}
//             </div>
//           </div>

//           {/* Статистика */}
//           <div style={{
//             display: 'flex',
//             justifyContent: 'space-between',
//             alignItems: 'center',
//             padding: '8px 12px',
//             background: colors.headerBg,
//             border: `1px solid ${colors.border}`,
//             borderRadius: '8px',
//             fontSize: '12px',
//             color: colors.textSecondary
//           }}>
//             <div>
//               <span style={{ fontWeight: '600', color: colors.text }}>{filteredItems.length}</span> {t('marketItemsFound')}
//             </div>
//             <div>
//               <span style={{ fontWeight: '600', color: colors.text }}>
//                 {marketItems.filter(item => item.hasLink).length}
//               </span> {t('marketWithLinks')}
//             </div>
//             <div>
//               <span style={{ fontWeight: '600', color: colors.text }}>
//                 {marketItems.filter(item => !item.hasLink).length}
//               </span> {t('marketWithoutLinks')}
//             </div>
//           </div>
//         </div>

//         {/* Список субдоменов */}
//         <div style={{ marginTop: '20px' }}>
//           {loading ? (
//             <div style={{
//               display: 'flex',
//               flexDirection: 'column',
//               alignItems: 'center',
//               justifyContent: 'center',
//               padding: '40px 20px',
//               color: colors.textSecondary
//             }}>
//               <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
//               <div style={{ fontSize: '14px' }}>{t('marketLoading')}</div>
//             </div>
//           ) : error ? (
//             <div style={{
//               padding: '20px',
//               background: colors.error + '20',
//               border: `1px solid ${colors.error}`,
//               borderRadius: '8px',
//               color: colors.error,
//               textAlign: 'center'
//             }}>
//               <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
//                 {t('marketError')}
//               </div>
//               <div style={{ fontSize: '12px', marginBottom: '12px' }}>
//                 {error}
//               </div>
//               <button
//                 onClick={loadMarketItems}
//                 style={{
//                   padding: '8px 16px',
//                   background: colors.error,
//                   color: '#FFFFFF',
//                   border: 'none',
//                   borderRadius: '6px',
//                   fontSize: '12px',
//                   cursor: 'pointer'
//                 }}
//               >
//                 {t('marketRetry')}
//               </button>
//             </div>
//           ) : filteredItems.length === 0 ? (
//             <div style={{
//               display: 'flex',
//               flexDirection: 'column',
//               alignItems: 'center',
//               justifyContent: 'center',
//               padding: '40px 20px',
//               color: colors.textSecondary,
//               textAlign: 'center'
//             }}>
//               <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
//               <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: colors.text }}>
//                 {t('marketNoItems')}
//               </div>
//               <div style={{ fontSize: '12px' }}>
//                 {t('marketNoItemsDesc')}
//               </div>
//             </div>
//           ) : (
//             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
//              {filteredItems.map((item) => (
//                 <div
//                   key={item.id}
//                   onClick={() => handleItemClick(item)}
//                   style={{
//                     background: colors.cardBg,
//                     border: `1px solid ${colors.border}`,
//                     borderRadius: '12px',
//                     padding: '16px',
//                     cursor: 'pointer',
//                     transition: 'all 0.2s ease',
//                     position: 'relative'
//                   }}
//                   onMouseEnter={(e) => {
//                     e.currentTarget.style.transform = 'translateY(-2px)';
//                     e.currentTarget.style.boxShadow = `0 4px 12px ${isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)'}`;
//                   }}
//                   onMouseLeave={(e) => {
//                     e.currentTarget.style.transform = 'translateY(0)';
//                     e.currentTarget.style.boxShadow = 'none';
//                   }}
//                 >
//                   {/* Бейдж статуса */}
//                   <div style={{
//                     position: 'absolute',
//                     top: '12px',
//                     right: '12px',
//                     padding: '4px 8px',
//                     background: item.status === 'claimed' ? colors.success : colors.warning,
//                     color: '#FFFFFF',
//                     borderRadius: '4px',
//                     fontSize: '10px',
//                     fontWeight: '600'
//                   }}>
//                     {item.status === 'claimed' ? t('marketStatusClaimed') : item.status}
//                   </div>

//                   {/* Верхняя часть с изображением и основной информацией */}
//                   <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
//                     {/* Изображение */}
//                     <div style={{
//                       width: '64px',
//                       height: '64px',
//                       borderRadius: '8px',
//                       overflow: 'hidden',
//                       flexShrink: 0,
//                       background: colors.headerBg,
//                       display: 'flex',
//                       alignItems: 'center',
//                       justifyContent: 'center'
//                     }}>
//                       {item.imgUri ? (
//                         <img
//                           src={item.imgUri}
//                           alt={item.name}
//                           style={{
//                             width: '100%',
//                             height: '100%',
//                             objectFit: 'cover'
//                           }}
//                           onError={(e) => {
//                             (e.target as HTMLImageElement).style.display = 'none';
//                             const parent = (e.target as HTMLImageElement).parentElement;
//                             if (parent) {
//                               parent.innerHTML = '<div style="font-size: 24px; color: #9CA3AF">🌐</div>';
//                             }
//                           }}
//                         />
//                       ) : (
//                         <div style={{ fontSize: '24px', color: colors.textSecondary }}>🌐</div>
//                       )}
//                     </div>

//                     {/* Информация */}
//                     <div style={{ flex: 1 }}>
//                       <div style={{
//                         fontSize: '16px',
//                         fontWeight: '600',
//                         color: colors.text,
//                         marginBottom: '4px',
//                         wordBreak: 'break-word'
//                       }}>
//                         {item.name}
//                       </div>
                      
//                       <div style={{
//                         fontSize: '12px',
//                         color: colors.textSecondary,
//                         marginBottom: '8px',
//                         display: 'flex',
//                         alignItems: 'center',
//                         gap: '8px'
//                       }}>
//                         {item.zoneName && (
//                           <span style={{
//                             padding: '2px 6px',
//                             background: colors.headerBg,
//                             borderRadius: '4px'
//                           }}>
//                             {item.zoneName}
//                           </span>
//                         )}
//                         {item.subdomainName && (
//                           <span style={{
//                             padding: '2px 6px',
//                             background: colors.headerBg,
//                             borderRadius: '4px'
//                           }}>
//                             {item.subdomainName}
//                           </span>
//                         )}
//                       </div>

//                       {/* Цена и дата */}
//                       <div style={{
//                         display: 'flex',
//                         justifyContent: 'space-between',
//                         alignItems: 'center'
//                       }}>
//                         <div>
//                           <div style={{
//                             fontSize: '14px',
//                             fontWeight: '600',
//                             color: colors.primary
//                           }}>
//                             {item.mintPrice}
//                           </div>
//                           <div style={{
//                             fontSize: '10px',
//                             color: colors.textSecondary
//                           }}>
//                             {t('marketPrice')}
//                           </div>
//                         </div>
//                         <div style={{ textAlign: 'right' }}>
//                           <div style={{
//                             fontSize: '12px',
//                             color: colors.textSecondary
//                           }}>
//                             {formatDate(item.registrationDate)}
//                           </div>
//                           <div style={{
//                             fontSize: '10px',
//                             color: colors.textSecondary
//                           }}>
//                             {t('marketRegistered')}
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   </div>

//                   {/* Нижняя часть с дополнительной информацией и кнопкой */}
//                   <div style={{
//                     display: 'flex',
//                     justifyContent: 'space-between',
//                     alignItems: 'center',
//                     paddingTop: '12px',
//                     borderTop: `1px solid ${colors.border}`
//                   }}>
//                     {/* Длины */}
//                     <div style={{ display: 'flex', gap: '12px' }}>
//                       {item.zoneLength !== undefined && (
//                         <div style={{ textAlign: 'center' }}>
//                           <div style={{
//                             fontSize: '12px',
//                             fontWeight: '600',
//                             color: colors.text
//                           }}>
//                             {item.zoneLength}
//                           </div>
//                           <div style={{
//                             fontSize: '10px',
//                             color: colors.textSecondary
//                           }}>
//                             {t('marketZoneLength')}
//                           </div>
//                         </div>
//                       )}
//                       {item.subdomainLength !== undefined && (
//                         <div style={{ textAlign: 'center' }}>
//                           <div style={{
//                             fontSize: '12px',
//                             fontWeight: '600',
//                             color: colors.text
//                           }}>
//                             {item.subdomainLength}
//                           </div>
//                           <div style={{
//                             fontSize: '10px',
//                             color: colors.textSecondary
//                           }}>
//                             {t('marketSubdomainLength')}
//                           </div>
//                         </div>
//                       )}
//                     </div>

//                     {/* Кнопка сделать предложение */}
//                     <button
//                       onClick={(e) => handleMakeOfferClick(item, e)}
//                       style={{
//                         padding: '8px 16px',
//                         background: item.hasLink ? colors.primary : colors.textSecondary,
//                         color: '#FFFFFF',
//                         border: 'none',
//                         borderRadius: '6px',
//                         fontSize: '12px',
//                         fontWeight: '600',
//                         cursor: item.hasLink ? 'pointer' : 'not-allowed',
//                         opacity: item.hasLink ? 1 : 0.6,
//                         display: 'flex',
//                         alignItems: 'center',
//                         gap: '6px',
//                         transition: 'all 0.2s ease'
//                       }}
//                       disabled={!item.hasLink}
//                     >
//                       <span>💎</span>
//                       <span>{t('marketMakeOffer')}</span>
//                     </button>
//                   </div>

//                   {/* Индикатор отсутствия ссылки */}
//                   {!item.hasLink && (
//                     <div style={{
//                       position: 'absolute',
//                       bottom: '8px',
//                       right: '8px',
//                       fontSize: '10px',
//                       color: colors.error,
//                       background: colors.error + '20',
//                       padding: '2px 6px',
//                       borderRadius: '4px'
//                     }}>
//                       {t('marketNoLink')}
//                     </div>
//                   )}
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>

//         {/* Информация о сети */}
//         <div style={{
//           position: 'fixed',
//           bottom: '80px',
//           left: '50%',
//           transform: 'translateX(-50%)',
//           background: colors.cardBg,
//           border: `1px solid ${colors.border}`,
//           borderRadius: '8px',
//           padding: '8px 12px',
//           fontSize: '11px',
//           color: colors.textSecondary,
//           zIndex: 100,
//           boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
//           maxWidth: 'calc(100% - 32px)',
//           textAlign: 'center'
//         }}>
//           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
//             <span>🌐</span>
//             <span>{isTestnet ? t('marketTestnet') : t('marketMainnet')}</span>
//             <span>•</span>
//             <span>{t('marketTotalItems')}: {marketItems.length}</span>
//           </div>
//         </div>
//       </div>
//     </Page>
//   );
// };

// export default MarketPage;

import React, { useState, useEffect, useRef } from 'react';
import { Page } from "@/components/Page";
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { apiService, Zone } from '../../services/api';
import { useTonWallet } from '@tonconnect/ui-react';
import { Address } from "@ton/core";
import { useLaunchParams } from '@telegram-apps/sdk-react';

interface MarketItem {
  id: number;
  name: string;
  owner?: string;
  lastBid?: string;
  mintPrice: string;
  zoneName?: string;
  subdomainName?: string;
  imgUri?: string;
  ggLinkToOffer?: string;
  registrationDate: string;
  status: string;
  zoneLength?: number;
  subdomainLength?: number;
  hasLink: boolean;
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
    zoneLength = parts.slice(1).join('.').length;
  } else if (parts.length === 1) {
    subdomainLength = parts[0].length;
    zoneLength = 0;
  }
  
  return { zoneLength, subdomainLength };
};

// Функция для создания ссылки GetGems - вызывается в обработчике клика
const createGetGemsLinkInHandler = (
  zoneAddress: string | undefined,
  subdomainAddress: string | undefined,
  isTestnet: boolean
): string => {
  if (!zoneAddress || !subdomainAddress) {
    console.log('❌ Нет адресов для создания ссылки:', { zoneAddress, subdomainAddress });
    return '';
  }
  
  try {
    // Конвертируем адреса в нужный формат
    const convertedZoneAddress = convertAddress(zoneAddress, isTestnet);
    const convertedSubdomainAddress = convertAddress(subdomainAddress, isTestnet);
    
    // Проверяем что адреса валидны
    if (convertedZoneAddress && convertedSubdomainAddress) {
      const link = isTestnet 
        ? `https://testnet.getgems.io/collection/${convertedZoneAddress}/${convertedSubdomainAddress}`
        : `https://getgems.io/collection/${zoneAddress}/${subdomainAddress}`;
      
      console.log('✅ Создана ссылка GetGems:', {
        zoneAddress,
        subdomainAddress,
        convertedZoneAddress,
        convertedSubdomainAddress,
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

const MarketPage: React.FC = () => {
  const { currentTheme } = useTheme();
  const wallet = useTonWallet();
  const { t } = useLanguage();
  const isDark = currentTheme === 'dark';
  const isTestnet = wallet?.account?.chain === "-3";
  
  // Добавляем launchParams для deeplink
  const launchParams = useLaunchParams();
  
  // Состояние для отслеживания открытия через deeplink
  const [openedViaDeeplink, setOpenedViaDeeplink] = useState(false);
  
  // Состояния
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredItems, setFilteredItems] = useState<MarketItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('name_asc');
  const [filters, setFilters] = useState<FilterState>({
    zoneLengths: [],
    subdomainLengths: []
  });
  const [zones, setZones] = useState<Zone[]>([]);
  
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
    dropdownBorder: '#4B5563'
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
    dropdownBorder: '#E5E7EB'
  };

  // Проверяем, открыто ли через deeplink при монтировании
  useEffect(() => {
    const startappParam = launchParams.startParam;
    if (startappParam) {
      console.log(`🔗 MarketPage открыт через deeplink: ${startappParam}`);
      setOpenedViaDeeplink(true);
      
      // Парсим параметр для дополнительной информации
      const parts = startappParam.split('_');
      if (parts[0] === 'market') {
        console.log('✅ Пользователь перешел на маркет из уведомления о завершенном аукционе');
      }
    }
  }, [launchParams.startParam]);

  // Добавляем блок информации о deeplink
  const renderDeeplinkInfo = () => {
    if (!openedViaDeeplink) return null;
    
    return (
      <div style={{
        marginBottom: '16px',
        padding: '12px 16px',
        background: isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)',
        border: `1px solid ${isDark ? '#22c55e' : '#16a34a'}`,
        borderRadius: '8px',
        fontSize: '14px',
        color: isDark ? '#bbf7d0' : '#166534'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontSize: '16px' }}>🔗</span>
          <span style={{ fontWeight: '600' }}>{t('marketDeeplinkTitle')}</span>
        </div>
        <p style={{ margin: 0, fontSize: '13px' }}>
          {t('marketDeeplinkMessage')}
        </p>
      </div>
    );
  };

  const loadMarketItems = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📡 Загружаем субдомены со статусом "claimed"');
      console.log(`🌐 Сеть: ${isTestnet ? 'Testnet' : 'Mainnet'}`);
      
      // Загружаем зоны и субдомены параллельно
      const [claimedSubdomains, allZones] = await Promise.all([
        apiService.getSubdomainsByStatus('claimed'),
        apiService.getAllZones()
      ]);
      
      console.log(`✅ Найдено субдоменов: ${claimedSubdomains.length}`);
      console.log(`✅ Найдено зон: ${allZones.length}`);
      console.log('📋 Список зон:', allZones.map(z => ({ id: z.id, name: z.name, collectionAddress: z.collectionAddress })));
      
      setZones(allZones);
      
      // Создаем маппинг zoneId -> zone для быстрого доступа
      const zoneMapById = new Map<number, Zone>();
      // Создаем маппинг zoneName -> zone для поиска по имени
      const zoneMapByName = new Map<string, Zone>();
      
      allZones.forEach(zone => {
        zoneMapById.set(zone.id, zone);
        zoneMapByName.set(zone.name.toLowerCase(), zone);
      });
      
      // Обрабатываем субдомены последовательно, чтобы можно было делать дополнительные запросы
      const items: MarketItem[] = [];
      
      for (const sub of claimedSubdomains) {
        // Определяем формат цены
        let mintPriceAmount: string;
        
        if (sub.mintPrice > 1000000) {
          mintPriceAmount = (sub.mintPrice / 1_000_000_000).toFixed(1);
        } else {
          mintPriceAmount = sub.mintPrice.toFixed(1);
        }
        
        // Извлекаем зону и субдомен из имени
        const fullName = sub.name;
        const fullNameWithoutTon = fullName.slice(0, -4); // Убираем .ton
        const parts = fullNameWithoutTon.split('.');
        let subdomainName = '';
        let zoneName = '';

        const subdomainAddress = sub.address;
        const zoneId = sub.zoneId;

        // Пытаемся найти зону разными способами
        let currentZone: Zone | undefined;
        let zoneAddress: string | undefined;
        
        // Способ 1: По zoneId
        if (zoneId) {
          currentZone = zoneMapById.get(zoneId);
          console.log(`🔍 Поиск зоны по zoneId ${zoneId} для ${fullName}:`, 
            currentZone ? `найдена: ${currentZone.name}` : 'не найдена');
        }
        
        // Определяем имя зоны из полного имени
        if (parts.length >= 2) {
          subdomainName = parts[0];
          zoneName = parts.slice(1).join('.');
        } else {
          subdomainName = fullName;
          zoneName = 'unknown';
        }
        
        // Способ 2: По имени зоны из локального маппинга
        if (!currentZone && zoneName && zoneName !== 'unknown') {
          currentZone = zoneMapByName.get(zoneName.toLowerCase());
          console.log(`🔍 Поиск зоны по имени "${zoneName}" в локальном маппинге для ${fullName}:`,
            currentZone ? `найдена: ${currentZone.name}` : 'не найдена');
        }
        
        // Способ 3: Ищем зону через API по имени
        if (!currentZone && zoneName && zoneName !== 'unknown') {
          console.log(`🔍 Пробуем найти зону "${zoneName}" через API для ${fullName}...`);
          // Здесь можно добавить вызов API для поиска зоны по имени
          // currentZone = await findZoneByName(zoneName);
        }
        
        // Получаем адрес зоны
        zoneAddress = currentZone?.collectionAddress;
        
        // Если у нас есть zoneName но нет адреса, проверяем есть ли такая зона вообще
        if (zoneName && zoneName !== 'unknown' && !zoneAddress) {
          console.warn(`⚠️ Для зоны "${zoneName}" (субдомен: ${fullName}) не найден адрес коллекции`);
          console.warn(`   zoneId: ${zoneId}, найденная зона:`, currentZone);
        }
        
        // Извлекаем длины
        const { zoneLength, subdomainLength } = extractLengths(fullNameWithoutTon);
        
        // Проверяем наличие адресов
        const hasLink = !!(zoneAddress && subdomainAddress);
        
        if (hasLink) {
          console.log(`✅ ${fullName}: есть оба адреса для ссылки`);
        } else {
          console.log(`❌ ${fullName}: нет адресов для ссылки`, {
            zoneAddress: zoneAddress ? 'есть' : 'нет',
            subdomainAddress: subdomainAddress ? 'есть' : 'нет',
            zoneName,
            zoneId
          });
        }
        
        // Создаем элемент
        items.push({
          id: sub.id,
          name: sub.name,
          owner: sub.owner,
          lastBid: sub.lastBid ? `${(sub.lastBid / 1_000_000_000).toFixed(1)} TON` : undefined,
          mintPrice: `${mintPriceAmount} TON`,
          zoneName: zoneName,
          subdomainName: subdomainName,
          imgUri: `https://api.subdom.zone/api/v1/subdomain/metadata/ton/${zoneName}/${subdomainName}.png`,
          registrationDate: sub.registrationDate,
          status: sub.status,
          ggLinkToOffer: '', // Пустая строка - ссылка будет создаваться в обработчике
          zoneLength: zoneLength,
          subdomainLength: subdomainLength,
          hasLink,
          // Сохраняем адреса для создания ссылки
          _zoneAddress: zoneAddress,
          _subdomainAddress: subdomainAddress,
          _zoneName: zoneName
        } as MarketItem & { _zoneAddress?: string; _subdomainAddress?: string; _zoneName?: string });
      }
      
      // Сортируем по умолчанию по имени
      items.sort((a, b) => a.name.localeCompare(b.name));
      
      console.log(`✅ Найдено субдоменов для продажи: ${items.length}`);
      console.log(`🔗 Адреса доступны для: ${items.filter(item => item.hasLink).length} субдоменов`);
      
      // Группируем по наличию ссылок для отладки
      const withLinks = items.filter(item => item.hasLink);
      const withoutLinks = items.filter(item => !item.hasLink);
      
      console.log('🔗 Ссылки доступны для:', withLinks.map(item => ({
        name: item.name,
        zoneAddress: (item as any)._zoneAddress,
        subdomainAddress: (item as any)._subdomainAddress
      })));
      
      console.log('❌ Без ссылок:', withoutLinks.map(item => ({
        name: item.name,
        zoneAddress: (item as any)._zoneAddress,
        subdomainAddress: (item as any)._subdomainAddress,
        zoneName: (item as any)._zoneName
      })));
      
      setMarketItems(items as MarketItem[]);
      setFilteredItems(items as MarketItem[]);
      
    } catch (error: any) {
      console.error('❌ Ошибка при загрузке субдоменов:', error);
      setError(error.message || t('marketError'));
    } finally {
      setLoading(false);
    }
  };

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
  }, [searchQuery, filters, sortBy, marketItems]);

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

  // Загрузка данных при монтировании
  useEffect(() => {
    loadMarketItems();
  }, []);

  // Обработчик клика по кнопке - ГЕНЕРИРУЕМ ССЫЛКУ В МОМЕНТ КЛИКА
  const handleMakeOfferClick = (item: MarketItem, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Приводим тип для доступа к дополнительным полям
    const typedItem = item as MarketItem & { _zoneAddress?: string; _subdomainAddress?: string };
    
    console.log(`💼 Обработка клика для: ${item.name}`, {
      zoneAddress: typedItem._zoneAddress,
      subdomainAddress: typedItem._subdomainAddress,
      hasLink: item.hasLink
    });
    
    // Генерируем ссылку в момент клика
    const ggLinkToOffer = createGetGemsLinkInHandler(
      typedItem._zoneAddress,
      typedItem._subdomainAddress,
      isTestnet
    );
    
    if (ggLinkToOffer) {
      console.log(`✅ Открываем GetGems для: ${item.name}`, ggLinkToOffer);
      window.open(ggLinkToOffer, '_blank');
    } else {
      console.log(`❌ Не удалось создать ссылку для: ${item.name}`);
      alert(`Для субдомена ${item.name} ссылка на GetGems недоступна.\n\nПричина: отсутствует адрес коллекции или NFT.`);
    }
  };

  // Обработчик клика по субдомену
  const handleItemClick = (item: MarketItem) => {
    const typedItem = item as MarketItem & { _zoneAddress?: string; _subdomainAddress?: string };
    console.log(`🔍 Просмотр деталей: ${item.name}`, {
      hasLink: item.hasLink,
      zoneAddress: typedItem._zoneAddress,
      subdomainAddress: typedItem._subdomainAddress
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
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

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
          position: 'sticky',
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

        {/* Информация о deeplink */}
        {renderDeeplinkInfo()}

        {/* ФИКСИРОВАННЫЙ ВЕРХНИЙ БЛОК с поиском, фильтрами и статистикой */}
        <div 
          ref={headerRef}
          style={{
            position: 'sticky',
            top: '88px', // 66px (хедер) + 22px (лейбл) = 88px от верха страницы
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
                {t('marketTotal')}
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
                {t('marketZones')}
              </div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: colors.success }}>
                {zones.length}
              </div>
            </div>
          </div>
        </div>

        {/* Контент */}
        <div style={{ background: colors.cardBg, borderRadius: '8px', border: `1px solid ${colors.border}` }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: colors.textSecondary }}>
              <div style={{
                border: `2px solid ${colors.primary}`,
                borderTopColor: 'transparent',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 12px'
              }}></div>
              <div style={{ fontSize: '14px' }}>{t('marketLoading')}</div>
            </div>
          ) : error ? (
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ color: colors.error, marginBottom: '12px', fontSize: '24px' }}>❌</div>
              <div style={{ color: colors.error, fontSize: '14px', marginBottom: '16px' }}>{error}</div>
              <button
                onClick={loadMarketItems}
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
                  : t('marketNoItemsDefault')}
              </div>
            </div>
          ) : (
            <div>
              {/* Строки таблицы */}
              {filteredItems.map((item) => {
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
                    <div style={{ flexShrink: 0 }}>
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
                        {item.name}
                      </div>
                      
                      <div style={{ 
                        fontSize: '12px', 
                        color: colors.textSecondary,
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span style={{ fontWeight: '500' }}>{t('marketZone')}:</span> 
                        <span>{item.zoneName || t('marketUnknown')}</span>
                        {item.zoneLength && (
                          <span style={{
                            background: colors.headerBg,
                            color: colors.textSecondary,
                            padding: '1px 4px',
                            borderRadius: '2px',
                            fontSize: '10px',
                            marginLeft: '4px'
                          }}>
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
                            href={`https://tonviewer.com/${item.owner}`}
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
                      
                      {/* Price */}
                      <div style={{ 
                        fontWeight: '700', 
                        color: colors.primary,
                        fontSize: '16px',
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span style={{ 
                          fontSize: '12px', 
                          color: colors.textSecondary,
                          fontWeight: '400'
                        }}>
                          {t('marketPrice')}:
                        </span>
                        {item.mintPrice}
                      </div>
                      
                      {item.lastBid && (
                        <div style={{
                          fontSize: '12px',
                          color: colors.textSecondary,
                          fontWeight: '400',
                          marginBottom: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <span>{t('marketLastBid')}:</span>
                          <span style={{ color: colors.warning, fontWeight: '500' }}>{item.lastBid}</span>
                        </div>
                      )}
                      
                      {/* Date and Status */}
                      <div style={{ 
                        fontSize: '11px', 
                        color: colors.textSecondary,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '12px'
                      }}>
                        <span>📅 {formatDate(item.registrationDate)}</span>
                        <span style={{
                          background: colors.success,
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '500'
                        }}>
                          {item.status}
                        </span>
                        {item.subdomainLength && (
                          <span style={{
                            background: colors.headerBg,
                            color: colors.textSecondary,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px'
                          }}>
                            {t('marketSub')}: {item.subdomainLength} {t('marketChars')}
                          </span>
                        )}
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
            <span>{t('marketClaimedInfo')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.primary }}></div>
            <span>{t('marketMakeOfferInfo')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.warning }}></div>
            <span>{t('marketPriceInfo')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isTestnet ? '#F59E0B' : '#10B981' }}></div>
            <span>{t('marketNetworkInfo')}: {isTestnet ? t('marketTestnet') : t('marketMainnet')}</span>
          </div>
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
              {t('marketLinksAvailable')}: {marketItems.filter(item => item.hasLink).length} {t('marketOf')} {marketItems.length} {t('marketSubdomains')}
            </span>
          </div>
        </div>
      </div>
    </Page>
  );
};

export default MarketPage;
