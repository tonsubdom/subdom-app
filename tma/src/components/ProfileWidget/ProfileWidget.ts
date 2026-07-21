// components/ProfileWidget/ProfileWidget.tsx
// Версия с фильтрами в дропдауне, переключателем вида карточек и увеличенной высотой

// import React, { useState, useEffect, useMemo } from "react";
// import {
//   useTonAddress,
//   useTonWallet,
//   TonConnectButton
// } from "@tonconnect/ui-react";
// import { useTheme } from '@/contexts/ThemeContext';
// import { useLanguage } from '@/contexts/LanguageContext';
// import { useUser } from '@/contexts/UserContext';
// import TonLogo from '@/components/Header/ton.svg';

// import { fromNano } from 'ton-core';

// // Импортируем компоненты и утилиты
// import SearchAndFilters from '@/components/SearchAndFilters/SearchAndFilters';

// import {
//   FilterState,
//   SortOption,
//   Zone,
//   Subdomain,
//   Auction
// } from '@/types/profile-widget-filters.types';

// import {
//   getFilteredData,
//   getZoneType
// } from '@/utils/profile-widget-filter.utils';

// // ИМПОРТИРУЕМ ХУК ДЛЯ РАБОТЫ С ЗОНАМИ ИЗ БАЗЫ
// import { useZones } from '@/hooks/useZones';

// // Добавляем импорт API
// import { apiService } from '@/services/api';
// import PaymentAttemptsSection from "../PaymentAttemptsSection";

// const ProfileWidget: React.FC = () => {
//   const [isExpanded, setIsExpanded] = useState<boolean>(false);
//   const wallet = useTonWallet();
//   const address = useTonAddress();
//   const isTestnet = wallet?.account?.chain === "-3";

//   // Получаем тему из ThemeContext
//   const { currentTheme } = useTheme();
//   const isDark = currentTheme === 'dark';

//   // Получаем язык и переводы
//   const { t } = useLanguage();

//   // Используем хуки для работы с данными
//   const { user, refreshUser , connectWallet} = useUser();

//   // ИСПОЛЬЗУЕМ ХУК ДЛЯ РАБОТЫ С ЗОНАМИ ИЗ БАЗЫ
//   const {
//     allZones,
//     loading: zonesLoading,
//     error: zonesError,
//     refreshZones
//   } = useZones();

//   // UI state
//   const [domain, setDomain] = useState<string | null>(null);
//   // const [, setDomainLoading] = useState<boolean>(false);
//   const [activeTab, setActiveTab] = useState<'zones' | 'subdomains' | 'auctions' | 'info'>("zones");
//   const [activeAuctions, setActiveAuctions] = useState<Auction[]>([]);
//   const [auctionsLoading, setAuctionsLoading] = useState<boolean>(false);
//   const [subdomains, setSubdomains] = useState<Subdomain[]>([]);
//   const [subdomainsLoading, setSubdomainsLoading] = useState<boolean>(false);
//   const [subdomainsError, setSubdomainsError] = useState<string | null>(null);

//   //  состояние для баланса:
//   const [balance, setBalance] = useState<string>('0');

//   // СОСТОЯНИЯ ДЛЯ ФИЛЬТРОВ И ПОИСКА
//   const [searchQuery, setSearchQuery] = useState<string>('');
//   const [filters, setFilters] = useState<FilterState>({
//     zoneLengths: [],
//     subdomainLengths: [],
//     auctionStatuses: [],
//     zoneTypes: []
//   });
//   const [sortBy, setSortBy] = useState<SortOption>('name_asc');

//   // ====== НОВОЕ: состояние дропдауна фильтров ======
//   const [filtersOpen, setFiltersOpen] = useState<boolean>(false);

//   // ====== НОВОЕ: переключатель вида карточек 'list' | 'swipe' ======
//   const [cardView, setCardView] = useState<'list' | 'swipe'>('list');
//   const [swipeIndex, setSwipeIndex] = useState<number>(0);

//   // Ref для верхнего блока с фильтрами
//   // const headerRef = useRef<HTMLDivElement>(null);

//   // Цвета для темы - синие в светлой, золотые в темной
//   const themeColors = {
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
//       blue: "#3B82F6",
//       link: "#3B82F6",
//       inputBg: "#FFFFFF",
//       inputBorder: "#D1D5DB",
//       inputText: "#1F2937",
//       dropdownBg: "#FFFFFF",
//       dropdownBorder: "#E5E7EB"
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
//       blue: "#00FFFF",
//       link: "#00FFFF",
//       inputBg: "#1A1A1A",
//       inputBorder: "#444444",
//       inputText: "#E5E5E5",
//       dropdownBg: "#1A1A1A",
//       dropdownBorder: "#444444"
//     }
//   };

//   const colors = themeColors[isDark ? "dark" : "light"];

//   const checkAuctionTimerEnd = (time: Date) => {
//     const nowDate = new Date();
//     if (nowDate > time) {
//       return false;
//     } else {
//       return true;
//     }
//   };

//   const fetchBalanceSimple = async () => {
//     if (!address) {
//       setBalance('0');
//       return;
//     }

//     try {
//       const baseUrl = isTestnet
//         ? 'https://testnet.toncenter.com/api/v3/addressInformation'
//         : 'https://toncenter.com/api/v3/addressInformation';

//       // API ключ для testnet
//       const apiKey = import.meta.env.VITE_TONCENTER_API_KEY; // Добавьте mainnet ключ если нужно

//       // Создаем URL с API ключом
//       const url = new URL(baseUrl);
//       url.searchParams.append('address', address);
//       url.searchParams.append('use_v2', 'true');

//       if (apiKey) {
//         url.searchParams.append('api_key', apiKey);
//       }

//       console.log(`📡 Запрос баланса для адреса: ${address} с API ключом`);

//       const response = await fetch(url.toString());

//       if (!response.ok) {
//         if (response.status === 429) {
//           console.error('❌ Rate limit exceeded (429) при запросе баланса');
//           setBalance('0');
//           return;
//         }
//         if (response.status === 500) {
//           console.error('❌ Internal server error (500) при запросе баланса');
//           setBalance('0');
//           return;
//         }
//         throw new Error(`HTTP error: ${response.status}`);
//       }

//       const data = await response.json();

//       if (data?.balance) {
//         const balanceInTON = fromNano(data.balance);
//         setBalance(parseFloat(balanceInTON).toFixed(2));
//         console.log(`✅ Баланс получен: ${parseFloat(balanceInTON).toFixed(2)} TON`);
//       } else {
//         setBalance('0');
//         console.log('ℹ️ Баланс не найден, установлен 0');
//       }

//     } catch (error) {
//       console.error('❌ Ошибка получения баланса:', error);
//       setBalance('0');
//     }
//   };

//   // Обновите функции навигации в ProfileWidget: 1

//   const handleAddSubdomain = () => {
//     setIsExpanded(false); // Сворачиваем виджет
//     setTimeout(() => {
//       if (typeof window !== 'undefined') {
//         window.location.href = `/#/add-subdomain`;
//       }
//     }, 300); // Небольшая задержка для анимации
//   };

//   const handleManage = () => {
//     setIsExpanded(false); // Сворачиваем виджет
//     setTimeout(() => {
//       if (typeof window !== 'undefined') {
//         window.location.href = `/manage#/manage`;
//       }
//     }, 300);
//   };

//   const handleMarket = () => {
//     setIsExpanded(false); // Сворачиваем виджет
//     setTimeout(() => {
//       if (typeof window !== 'undefined') {
//         window.location.href = `/#/market`;
//       }
//     }, 300);
//   };

//   // // Также обновите handleGoToAuction:
//   // const handleGoToAuction = (auctionName: string) => {
//   //   console.log('Перейти к аукциону:', auctionName);
//   //   setIsExpanded(false); // Сворачиваем виджет
//   //   setTimeout(() => {
//   //     if (typeof window !== 'undefined') {
//   //       window.location.href = `/#/add-subdomain`;
//   //     }
//   //   }, 300);
//   // };

//   // Функция для загрузки субдоменов пользователя с информацией о зонах
//   const loadSubdomains = async () => {
//     if (!address) return;

//     setSubdomainsLoading(true);
//     setSubdomainsError(null);

//     try {
//       console.log('📡 Загружаем субдомены для адреса:', address);
//       // Используем apiService вместо прямого fetch
//       const userSubdomains = await apiService.getUserSubdomains(address);
//       console.log('✅ Субдомены загружены:', userSubdomains.length);

//       // Добавляем информацию о зонах к субдоменам
//       const subdomainsWithZones = userSubdomains.map((subdomain: Subdomain) => {
//         const zone = allZones.find(z => z.id === subdomain.zoneId);
//         return {
//           ...subdomain,
//           zone: zone || undefined
//         };
//       });

//       setSubdomains(subdomainsWithZones || []);
//     } catch (error: any) {
//       console.error('❌ Ошибка загрузки субдоменов:', error);
//       setSubdomainsError(error.message || 'Ошибка загрузки субдоменов');
//     } finally {
//       setSubdomainsLoading(false);
//     }
//   };

//   // Загрузка активных аукционов
//   const loadActiveAuctions = async () => {
//     if (!address) return;

//     setAuctionsLoading(true);
//     try {
//       // Используем субдомены со статусом 'auction'
//       const auctionSubdomains = subdomains.filter(sub => sub.status === 'auction');
//       setActiveAuctions(auctionSubdomains.map(sub => ({
//         name: sub.name,
//         bid: `${sub.lastBid ? (sub.lastBid / 1_000_000_000).toFixed(2) : '0.00'} TON`,
//         ends: sub.auctionEndTime || '2024-04-01',
//         lastBidder: sub.lastBidder,
//         lastBid: sub.lastBid,
//         subdomain: sub
//       })));
//     } catch (error) {
//       console.error('Ошибка загрузки аукционов:', error);
//     } finally {
//       setAuctionsLoading(false);
//     }
//   };

//   const fetchDomain = async () => {
//     if (!wallet || !address) return;

//     try {
//       const hexAddress = wallet.account.address;
//       const modeFetchDomainUrl = isTestnet ? 'testnet.toncenter.com' : 'toncenter.com';

//       // API ключ для testnet
//       const apiKey = import.meta.env.VITE_TONCENTER_API_KEY; // Добавьте mainnet ключ если нужно

//       // Создаем URL с API ключом
//       const url = new URL(`https://${modeFetchDomainUrl}/api/v3/dns/records`);
//       url.searchParams.append('wallet', hexAddress);
//       url.searchParams.append('limit', '100');
//       url.searchParams.append('offset', '0');

//       if (apiKey) {
//         url.searchParams.append('api_key', apiKey);
//       }

//       console.log(`📡 Запрос домена для адреса: ${hexAddress} с API ключом`);

//       const response = await fetch(url.toString());

//       if (!response.ok) {
//         if (response.status === 429) {
//           console.error('❌ Rate limit exceeded (429) при запросе домена');
//           setDomain(null);
//           return;
//         }
//         throw new Error('Failed to fetch DNS records');
//       }

//       const data = await response.json();

//       const domainFromRecords = data.records?.find(
//         (record: any) => record.nft_item_owner === hexAddress
//       )?.domain;

//       const domainFromAddressBook = Object.values(data.address_book as Record<string, { user_friendly: string; domain?: string }>)
//         .find((entry: { user_friendly: string; domain?: string }) => entry.user_friendly === address)?.domain;

//       const foundDomain = domainFromRecords || domainFromAddressBook || null;

//       if (foundDomain) {
//         console.log(`✅ Найден домен: ${foundDomain}`);
//         setDomain(foundDomain);
//       } else {
//         console.log('ℹ️ Домен не найден');
//         setDomain(null);
//       }
//     } catch (error) {
//       console.error('Error fetching domain:', error);
//       setDomain(null);
//     }
//   };

//   useEffect(() => {
//     const loadData = async () => {
//       if (!address) return;

//       try {

//         apiService.setNetwork(isTestnet);
//         // Если пользователя нет в контексте, подключаем
//         await connectWallet(address, domain || '');

//         // Загружаем домен и баланс последовательно с задержкой
//         console.log('🔄 Начинаем загрузку данных профиля...');

//         // Сначала домен
//         await fetchDomain();

//         // Задержка 500ms между запросами
//         await new Promise(resolve => setTimeout(resolve, 500));

//         // Затем баланс
//         await fetchBalanceSimple();

//         // Задержка перед загрузкой зон и субдоменов
//         await new Promise(resolve => setTimeout(resolve, 500));

//         // Загружаем зоны и субдомены параллельно
//         await Promise.all([
//           refreshZones(),
//           loadSubdomains()
//         ]);

//         console.log('✅ Все данные профиля загружены');

//       } catch (error) {
//         console.error('❌ Ошибка загрузки данных:', error);
//       }
//     };

//     loadData();
//   }, [address, isTestnet]); // Только адрес как зависимость

//   useEffect(() => {
//     if (!address) return;

//     // Обновляем баланс при монтировании
//     fetchBalanceSimple();

//     // Устанавливаем интервал для обновления баланса каждые 15 секунд (вместо 10)
//     const intervalId = setInterval(fetchBalanceSimple, 15000);

//     // Очистка интервала при размонтировании
//     return () => clearInterval(intervalId);
//   }, [address]);

//   // Отдельный эффект для обновления аукционов
//   useEffect(() => {
//     if (subdomains.length > 0) {
//       loadActiveAuctions();
//     }
//   }, [subdomains]);

//   // Отдельный эффект для обновления информации о зонах в субдоменах
//   useEffect(() => {
//     if (allZones.length > 0 && subdomains.length > 0) {
//       const updatedSubdomains = subdomains.map(subdomain => {
//         const zone = allZones.find(z => z.id === subdomain.zoneId);
//         return {
//           ...subdomain,
//           zone: zone || undefined
//         };
//       });
//       setSubdomains(updatedSubdomains);
//     }
//   }, [allZones]);

//   // ====== НОВОЕ: сброс индекса при смене таба или фильтров ======
//   useEffect(() => {
//     setSwipeIndex(0);
//   }, [activeTab, searchQuery, filters]);

//   // 8. Вспомогательная функция для форматирования баланса:
//   const formatBalance = (balance: string) => {
//     const num = parseFloat(balance);
//     if (num >= 1000) {
//       return `${(num / 1000).toFixed(1)}k `;
//     }
//     return `${balance} `;
//   };

//   // Функция для получения статуса зоны
//   const getZoneStatusInfo = (zone: any) => {
//     if ((zone as any).status) {
//   switch ((zone as any).status.toLowerCase()) {
//         case 'active':
//           return { status: 'Active', color: '#4caf50', description: 'Активная зона' };
//         case 'inactive':
//           return { status: 'Inactive', color: '#9ca3af', description: 'Неактивная зона' };
//         case 'ready':
//           return { status: 'Ready', color: '#ff9800', description: 'Готова к использованию' };
//       }
//     }
//     // Определяем тип зоны
//     const isProxy = zone.proxy === 1 || zone.proxy === 'Proxy' || zone.proxy === 'proxy' || zone.proxy === '1';
//     const isSbt = zone.proxy === 0 || zone.proxy === 'SBT' || zone.proxy === 'sbt' || zone.proxy === '0';

//     if (isProxy) {
//       // Для Proxy зон всегда "Infinity"
//       return { status: 'Infinity', color: '#000000ff', description: 'Бесконечная зона' };
//     }

//     if (isSbt) {
//       // Для SBT зон проверяем наличие collectionAddress
//       if (!zone.collectionAddress) {
//         return { status: 'inactive', color: '#9ca3af', description: 'Collection не настроен' };
//       }

//       // Проверяем количество субдоменов
//       if (zone.subdomainsAmount > 0) {
//         return { status: 'Active', color: '#4caf50', description: 'Субдомены созданы' };
//       }

//       return { status: 'Active', color: '#4caf50', description: 'Готова к использованию' };
//     }

//     return { status: 'Unknown', color: '#9ca3af', description: 'Неизвестный тип зоны' };
//   };

//   // Функция для получения статуса субдомена
//   const getSubdomainStatusInfo = (subdomain: Subdomain) => {
//     switch (subdomain.status) {
//       case 'active':
//         return { status: 'Active', color: '#4caf50', description: 'Активный' };
//       case 'inactive':
//         return { status: 'Inactive', color: '#9ca3af', description: 'Неактивный' };
//       case 'auction':
//         return { status: 'Auction', color: '#ff9800', description: 'На аукционе' };
//       case 'claimed':
//         return { status: 'Claimed', color: '#3b82f6', description: 'Получен' };
//       default:
//         return { status: 'Unknown', color: '#9ca3af', description: 'Неизвестный' };
//     }
//   };

//   // Получаем отфильтрованные и отсортированные данные
//   const getFilteredZones = () => {
//     const userZones = getUserZones;
//     return getFilteredData('zones', userZones, searchQuery, filters, sortBy);
//   };

//   const getFilteredSubdomains = () => {
//     return getFilteredData('subdomains', subdomains, searchQuery, filters, sortBy);
//   };

//   const getFilteredAuctions = () => {
//     return getFilteredData('auctions', activeAuctions, searchQuery, filters, sortBy);
//   };

//   // Функция для создания ссылки tonviewer с учетом тестовой сети
//   const createTonViewerLink = (addr: string) => {
//     const baseUrl = isTestnet ? 'https://testnet.tonviewer.com' : 'https://tonviewer.com';
//     return `${baseUrl}/${addr}`;
//   };

//   // Функция для обновления всех данных
//   const refreshAllData = async () => {
//     if (!address) return;

//     try {
//       console.log('🔄 Обновляем все данные...');
//       await Promise.all([
//         refreshUser(),
//         refreshZones(),
//         loadSubdomains()
//       ]);

//       console.log('✅ Все данные обновлены');
//     } catch (error) {
//       console.error('❌ Ошибка обновления данных:', error);
//     }
//   };

//   // Обновляем функцию getZoneTypeInfo для использования новой утилиты
//   // Функция для получения типа зоны с лейблом и цветом
//   const getZoneTypeInfo = (zone: Zone) => {
//     const zoneType = getZoneType(zone);

//     switch (zoneType) {
//       case 'proxy':
//         return {
//           type: 'proxy',
//           label: '🌐 Proxy',
//           color: '#4caf50',
//           description: 'Общая зона для всех пользователей'
//         };
//       case 'sbt':
//         return {
//           type: 'sbt',
//           label: '🔒 SBT',
//           color: '#3b82f6',
//           description: 'Персональная зона владельца'
//         };
//       default:
//         return {
//           type: 'unknown',
//           label: '❓ Unknown',
//           color: '#9ca3af',
//           description: 'Неизвестный тип зоны'
//         };
//     }
//   };

//   // Функция для получения зон пользователя (МЕМОИЗИРОВАННАЯ)
//   const getUserZones = useMemo(() => {
//     if (!address) return [];

//     // УБРАТЬ ВСЕ console.log ОТСЮДА!

//     // Для Proxy зон показываем только те, которые создал пользователь
//     const userProxyZones = allZones.filter(zone => {
//       const zoneType = getZoneType(zone);
//       const isProxy = zoneType === 'proxy';
//       const isUserZone = zone.owner === address;

//       return isProxy && isUserZone;
//     });

//     // Для SBT зон показываем только те, где owner === address
//     const userSbtZones = allZones.filter(zone => {
//       const zoneType = getZoneType(zone);
//       const isSbt = zoneType === 'sbt';
//       const isUserOwner = zone.owner === address;

//       return isSbt && isUserOwner;
//     });

//     return [...userProxyZones, ...userSbtZones];
//   }, [address, allZones]); // ← Ключевое: useMemo с зависимостями

//   // Обновить использование в рендере:

//   // Проверка, является ли субдомен SBT (нельзя продавать)
//   const isSbtSubdomain = (subdomain: Subdomain) => {
//     if (!subdomain.zone) return false;
//     const zoneType = getZoneType(subdomain.zone);
//     return zoneType === 'sbt';
//   };

//   const handleGoToAuction = (auctionName: string) => {
//     console.log('Перейти к аукциону:', auctionName);
//     if (typeof window !== 'undefined') {
//       window.location.href = `/#/add-subdomain`;
//     }
//   };

//   // Стили кнопок для карточек
//   const cardButtonStyle = {
//     background: isDark ? colors.gold : colors.blue,
//     color: isDark ? '#000' : '#fff',
//     border: 'none',
//     outline: 'none',
//     padding: '10px 10px',
//     borderRadius: '4px',
//     fontSize: '12px',
//     fontWeight: '600',
//     fontFamily: 'monospace',
//     textTransform: 'uppercase',
//     letterSpacing: '0.5px',
//     boxShadow: `0 0 4px ${colors.shadow}`,
//     transition: 'all 0.2s ease',
//     cursor: 'pointer',
//     position: 'relative' as const,
//     overflow: 'hidden',
//     textAlign: 'center' as const,
//     marginLeft: '4px',
//     flexShrink: 0,
//   };

//   const tabButtonStyle = (isActive: boolean) => ({
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
//   });

//   // ====== НОВОЕ: стили для иконок переключателя вида ======
//   const viewToggleBaseStyle: React.CSSProperties = {
//     background: 'none',
//     border: `1px solid ${colors.border}`,
//     borderRadius: '4px',
//     color: colors.text,
//     cursor: 'pointer',
//     padding: '5px',
//     display: 'flex',
//     alignItems: 'center',
//     justifyContent: 'center',
//     fontSize: '14px',
//     transition: 'all 0.2s',
//     width: '28px',
//     height: '28px',
//   };

//   const viewToggleActiveStyle: React.CSSProperties = {
//     ...viewToggleBaseStyle,
//     background: colors.cyberpunk,
//     border: `1px solid ${colors.cyberpunk}`,
//     color: isDark ? '#000' : '#fff',
//   };

//   // ====== НОВОЕ: рендер-функции для карточек (используются и в list, и в swipe) ======
//   const renderZoneCard = (zone: Zone) => {
//     const zoneType = getZoneTypeInfo(zone);
//     const zoneStatus = getZoneStatusInfo(zone);
//     return (
//       <div
//         key={zone.id}
//         style={{
//           padding: "12px",
//           border: `1px solid ${colors.border}`,
//           borderRadius: "8px",
//           fontSize: "13px",
//           backgroundColor: colors.secondaryBg,
//           fontFamily: 'monospace',
//           position: 'relative' as const,
//         }}
//       >
//         <div
//           style={{
//             display: 'grid',
//             gridTemplateColumns: '1fr 1fr',
//             alignItems: "center",
//             marginBottom: "8px",
//             gap: '18px'
//           }}
//         >
//           <div
//             style={{
//               display: "flex",
//               flexDirection: 'column',
//               gap: 8,
//               alignItems: "flex-start",
//               justifyContent: 'flex-start',
//               flexWrap: 'wrap',
//               marginLeft: '12px'
//             }}
//           >
//             <div
//               style={{
//                 fontWeight: "600",
//                 color: colors.text,
//                 fontSize: "16px",
//                 wordBreak: 'break-word'
//               }}
//             >
//               .{zone.name}
//             </div>
//             <div className="labelWrapperRow" style={{display: 'flex', gap: '4px'}}>
//               <div
//                 style={{
//                   padding: "4px 8px",
//                   borderRadius: "4px",
//                   backgroundColor: zoneType.color,
//                   color: "white",
//                   fontSize: "11px",
//                   fontWeight: "600",
//                 }}
//               >
//                 {zoneType.label}
//               </div>
//               <div
//                 style={{
//                   padding: "4px 8px",
//                   borderRadius: "4px",
//                   backgroundColor: zoneStatus.color,
//                   color: "white",
//                   fontSize: "11px",
//                   fontWeight: "600",
//                 }}
//               >
//                 {zoneStatus.status}
//               </div>
//             </div>
//           </div>
//           <div style={{ display: 'flex', justifyContent: 'space-between', flexDirection: 'column' }}>
//             <div>
//               {zone.id && (
//                 <p
//                   style={{
//                     margin: "4px 0",
//                     color: colors.text,
//                     opacity: 0.7,
//                     fontSize: "11px",
//                   }}
//                 >
//                   ID: {zone.id}
//                 </p>
//               )}
//               <p
//                 style={{
//                   margin: "4px 0",
//                   color: colors.text,
//                   opacity: 0.7,
//                   fontSize: "11px",
//                 }}
//               >
//                 {t('created')}: {new Date(zone.createdAt).toLocaleDateString()}
//               </p>
//               <p
//                 style={{
//                   margin: "4px 0",
//                   color: colors.text,
//                   opacity: 0.7,
//                   fontSize: "11px",
//                 }}
//               >
//                 {t('subdomainsAmount')}: {zone.subdomainsAmount}
//               </p>
//               {zone.collectionAddress && (
//                 <p style={{ margin: "4px 0", color: colors.text, opacity: 0.7, fontSize: "11px" }}>
//                   {t('marketCollection')}: <a
//                     href={createTonViewerLink(zone.collectionAddress)}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     style={{ color: colors.link, textDecoration: 'none' }}
//                     onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
//                     onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
//                   >
//                     {zone.collectionAddress.slice(0, 4)}...{zone.collectionAddress.slice(-4)}
//                   </a>
//                 </p>
//               )}
//             </div>
//           </div>
//         </div>

//         {zone.status !== 'inactive' && (
//           <div style={{
//             width: '100%',
//             display: 'grid',
//             gridTemplateColumns: '1fr 1fr',
//             marginTop: '12px',
//             gap: '12px'
//           }}>
//             <button
//               onClick={(e) => {
//                 e.stopPropagation();
//                 handleAddSubdomain();
//               }}
//               style={cardButtonStyle}
//               onMouseOver={(e) => {
//                 e.currentTarget.style.transform = "translateY(-1px)";
//                 e.currentTarget.style.boxShadow = `0 2px 8px ${colors.shadow}`;
//               }}
//               onMouseOut={(e) => {
//                 e.currentTarget.style.transform = "translateY(0)";
//                 e.currentTarget.style.boxShadow = `0 0 4px ${colors.shadow}`;
//               }}
//             >
//               {t('createSubdomain')}
//             </button>
//             <button
//               onClick={(e) => {
//                 e.stopPropagation();
//                 handleManage();
//               }}
//               style={cardButtonStyle}
//               onMouseOver={(e) => {
//                 e.currentTarget.style.transform = "translateY(-1px)";
//                 e.currentTarget.style.boxShadow = `0 2px 8px ${colors.shadow}`;
//               }}
//               onMouseOut={(e) => {
//                 e.currentTarget.style.transform = "translateY(0)";
//                 e.currentTarget.style.boxShadow = `0 0 4px ${colors.shadow}`;
//               }}
//             >
//               {t('manageDomain')}
//             </button>
//           </div>
//         )}
//       </div>
//     );
//   };

//   const renderSubdomainCard = (subdomain: Subdomain) => {
//     const statusInfo = getSubdomainStatusInfo(subdomain);
//     const isSbt = isSbtSubdomain(subdomain);
//     return (
//       <div
//         key={subdomain.id}
//         style={{
//           padding: "12px",
//           border: `1px solid ${colors.border}`,
//           borderRadius: "8px",
//           fontSize: "13px",
//           backgroundColor: colors.secondaryBg,
//           fontFamily: 'monospace',
//           position: 'relative' as const,
//         }}
//       >
//         <div
//           style={{
//             display: 'grid',
//             gridTemplateColumns: '1fr 1fr',
//             alignItems: "center",
//             marginBottom: "8px",
//             gap: '18px'
//           }}
//         >
//           <div
//             style={{
//               display: "flex",
//               flexDirection: 'column',
//               gap: 12,
//               alignItems: "flex-start",
//               marginLeft: '12px',
//               justifyContent: 'flex-start'
//             }}
//           >
//             <div
//               style={{
//                 fontWeight: "600",
//                 color: colors.text,
//                 fontSize: "16px",
//                 wordBreak: 'break-word'
//               }}
//             >
//               {subdomain.name}
//             </div>
//             <div className="labelWrapperRow" style={{display: 'flex', gap: '4px'}}>
//               {isSbt && (
//                 <div
//                   style={{
//                     padding: "4px 8px",
//                     borderRadius: "4px",
//                     backgroundColor: '#3b82f6',
//                     color: "white",
//                     fontSize: "11px",
//                     fontWeight: "600",
//                   }}
//                 >
//                   🔒 SBT
//                 </div>
//               )}
//               <div
//                 style={{
//                   padding: "4px 8px",
//                   borderRadius: "4px",
//                   backgroundColor: statusInfo.color,
//                   color: "white",
//                   fontSize: "11px",
//                   fontWeight: "600",
//                 }}
//               >
//                 {statusInfo.status}
//               </div>
//             </div>
//           </div>
//           <div style={{ display: 'flex', justifyContent: 'space-between' }}>
//             <div style={{ flex: 1 }}>
//               <p
//                 style={{
//                   margin: "4px 0",
//                   color: colors.text,
//                   opacity: 0.7,
//                   fontSize: "11px",
//                 }}
//               >
//                 {t('created')}: {new Date(subdomain.createdAt).toLocaleDateString()}
//               </p>
//               <p
//                 style={{
//                   margin: "4px 0",
//                   color: colors.text,
//                   opacity: 0.7,
//                   fontSize: "11px",
//                 }}
//               >
//                 {t('price')}: {(subdomain.mintPrice).toFixed(2)} <img
//                   src={TonLogo}
//                   alt="TON"
//                   style={{
//                     width: '16px',
//                     height: '16px'
//                   }}
//                 />
//               </p>
//               {subdomain.zoneId && (
//                 <p
//                   style={{
//                     margin: "4px 0",
//                     color: colors.text,
//                     opacity: 0.7,
//                     fontSize: "11px",
//                   }}
//                 >
//                   {t('zoneId')}: {subdomain.zoneId}
//                 </p>
//               )}
//               {subdomain.address && (
//                 <p style={{ margin: "4px 0", color: colors.text, opacity: 0.7, fontSize: "11px" }}>
//                   {t('address')}: <a
//                     href={createTonViewerLink(subdomain.address)}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     style={{ color: colors.link, textDecoration: 'none' }}
//                     onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
//                     onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
//                   >
//                     {subdomain.address.slice(0, 4)}...{subdomain.address.slice(-4)}
//                   </a>
//                 </p>
//               )}
//               {subdomain.status === 'auction' && subdomain.lastBid && (
//                 <p
//                   style={{
//                     margin: "4px 0",
//                     color: colors.text,
//                     opacity: 0.7,
//                     fontSize: "11px",
//                   }}
//                 >
//                   {t('currentBid')}: <span style={{color: colors.cyberpunk, textDecoration: 'none'}}>{(subdomain.lastBid / 1_000_000_000).toFixed(2)} <img
//                     src={TonLogo}
//                     alt="TON"
//                     style={{
//                       width: '16px',
//                       height: '16px'
//                     }}
//                   /></span>
//                 </p>
//               )}
//             </div>
//           </div>
//         </div>

//         {subdomain.status === 'auction' && (
//           <div style={{
//             width: '100%',
//             display: 'grid',
//             gridTemplateColumns: '1fr 1fr',
//             marginTop: '12px',
//             gap: '12px'
//           }}>
//             <button
//               onClick={() => handleGoToAuction(subdomain.name)}
//               style={cardButtonStyle}
//               onMouseOver={(e) => {
//                 e.currentTarget.style.transform = "translateY(-1px)";
//                 e.currentTarget.style.boxShadow = `0 2px 8px ${colors.shadow}`;
//               }}
//               onMouseOut={(e) => {
//                 e.currentTarget.style.transform = "translateY(0)";
//                 e.currentTarget.style.boxShadow = `0 0 4px ${colors.shadow}`;
//               }}
//             >
//               {t('goTo')}
//             </button>
//           </div>
//         )}

//         {subdomain.status !== 'auction' && subdomain.status !== 'inactive' && (
//           <div style={{
//             width: '100%',
//             display: 'grid',
//             gridTemplateColumns: '1fr 1fr',
//             marginTop: '12px',
//             gap: '12px'
//           }}>
//             <button
//               onClick={(e) => {
//                 e.stopPropagation();
//                 handleManage();
//               }}
//               style={cardButtonStyle}
//               onMouseOver={(e) => {
//                 e.currentTarget.style.transform = "translateY(-1px)";
//                 e.currentTarget.style.boxShadow = `0 2px 8px ${colors.shadow}`;
//               }}
//               onMouseOut={(e) => {
//                 e.currentTarget.style.transform = "translateY(0)";
//                 e.currentTarget.style.boxShadow = `0 0 4px ${colors.shadow}`;
//               }}
//             >
//               {t('manage')}
//             </button>
//             {!isSbt && (
//               <button
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   handleMarket();
//                 }}
//                 style={cardButtonStyle}
//                 onMouseOver={(e) => {
//                   e.currentTarget.style.transform = "translateY(-1px)";
//                   e.currentTarget.style.boxShadow = `0 2px 8px ${colors.shadow}`;
//                 }}
//                 onMouseOut={(e) => {
//                   e.currentTarget.style.transform = "translateY(0)";
//                   e.currentTarget.style.boxShadow = `0 0 4px ${colors.shadow}`;
//                 }}
//               >
//                 {t('sell')}
//               </button>
//             )}
//           </div>
//         )}
//       </div>
//     );
//   };

//   const renderAuctionCard = (auction: Auction, idx: number) => {
//     const endDate = new Date(auction.ends);
//     const now = new Date();
//     const isEnded = endDate < now;
//     const formatDate = (date: Date) => {
//       return date.toLocaleDateString('ru-RU', {
//         day: '2-digit',
//         month: '2-digit',
//         year: 'numeric',
//         hour: '2-digit',
//         minute: '2-digit'
//       });
//     };
//     return (
//       <div
//         key={idx}
//         style={{
//           padding: "12px",
//           border: `1px solid ${colors.border}`,
//           borderRadius: "8px",
//           fontSize: "13px",
//           backgroundColor: colors.secondaryBg,
//           fontFamily: 'monospace',
//           position: 'relative' as const,
//           minHeight: '140px'
//         }}
//       >
//         <div
//           style={{
//             display: "flex",
//             justifyContent: "space-between",
//             alignItems: "center",
//             marginBottom: "8px",
//           }}
//         >
//           <div
//             style={{
//               display: "flex",
//               gap: 12,
//               alignItems: "center",
//             }}
//           >
//             <div
//               style={{
//                 fontWeight: "600",
//                 color: colors.text,
//                 fontSize: "16px",
//               }}
//             >
//               {auction.name}
//             </div>
//             <div
//               style={{
//                 padding: "4px 8px",
//                 borderRadius: "4px",
//                 backgroundColor: colors.cyberpunk,
//                 color: isDark ? "black" : "white",
//                 fontSize: "11px",
//                 fontWeight: "600",
//               }}
//             >
//               {auction.bid}
//             </div>
//           </div>
//         </div>

//         <div style={{ display: 'flex', justifyContent: 'space-between' }}>
//           <div style={{ flex: 1 }}>
//             {(() => {
//               return (
//                 <p
//                   style={{
//                     margin: "4px 0",
//                     color: isEnded ? colors.text : colors.cyberpunk,
//                     opacity: 0.7,
//                     fontSize: "11px",
//                   }}
//                 >
//                   {isEnded ? `${t('ended')}` : `${t('ends')}`}: {formatDate(endDate)}
//                 </p>
//               );
//             })()}

//             {auction.lastBidder && (
//               <p
//                 style={{
//                   margin: "4px 0", color: colors.text, opacity: 0.7, fontSize: "11px"
//                 }}
//               >
//                 {t('bidder')}: <a
//                   href={createTonViewerLink(auction.lastBidder)}
//                   target="_blank"
//                   rel="noopener noreferrer"
//                   style={{ color: colors.link, textDecoration: 'none' }}
//                   onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
//                   onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
//                 >
//                   {auction.lastBidder.slice(0, 6)}...
//                   {auction.lastBidder.slice(-4)}
//                 </a>
//               </p>
//             )}
//           </div>
//         </div>

//         {/* Кнопка в нижнем ряду слева */}
//         <div style={{
//           position: 'absolute' as const,
//           bottom: '12px',
//           left: '12px',
//           display: 'flex',
//           gap: '8px'
//         }}>
//           {checkAuctionTimerEnd(new Date(auction.ends)) ?
//             <button
//               onClick={() => handleGoToAuction(auction.name)}
//               style={cardButtonStyle}
//               onMouseOver={(e) => {
//                 e.currentTarget.style.transform = "translateY(-1px)";
//                 e.currentTarget.style.boxShadow = `0 2px 8px ${colors.shadow}`;
//               }}
//               onMouseOut={(e) => {
//                 e.currentTarget.style.transform = "translateY(0)";
//                 e.currentTarget.style.boxShadow = `0 0 4px ${colors.shadow}`;
//               }}
//             >
//               {t('take')}
//             </button>
//             :
//             <button
//               onClick={() => handleGoToAuction(auction.name)}
//               style={cardButtonStyle}
//               onMouseOver={(e) => {
//                 e.currentTarget.style.transform = "translateY(-1px)";
//                 e.currentTarget.style.boxShadow = `0 2px 8px ${colors.shadow}`;
//               }}
//               onMouseOut={(e) => {
//                 e.currentTarget.style.transform = "translateY(0)";
//                 e.currentTarget.style.boxShadow = `0 0 4px ${colors.shadow}`;
//               }}
//             >
//               {t('goTo')}
//             </button>
//           }
//         </div>
//       </div>
//     );
//   };

//   // ====== НОВОЕ: получение данных для swipe-режима ======
//   const getSwipeItems = (): { items: any[]; renderer: (item: any, idx: number) => JSX.Element } => {
//     if (activeTab === 'zones') return { items: getFilteredZones(), renderer: (item) => renderZoneCard(item) };
//     if (activeTab === 'subdomains') return { items: getFilteredSubdomains(), renderer: (item) => renderSubdomainCard(item) };
//     if (activeTab === 'auctions') return { items: getFilteredAuctions(), renderer: (item, idx) => renderAuctionCard(item, idx) };
//     return { items: [], renderer: () => <></> };
//   };

//   const { items: swipeItems, renderer: swipeRenderer } = getSwipeItems();

//   // ====================================================================
//   // RENDER
//   // ====================================================================
//   return (
//     <>
//       {!isExpanded && (
//         <div
//           onClick={() => setIsExpanded(true)}
//           style={{
//             position: "fixed",
//             bottom: "80px",
//             left: "20px",
//             width: "60px",
//             height: "60px",
//             borderRadius: "50%",
//             background: colors.primary,
//             boxShadow: `0 4px 12px ${colors.shadow}`,
//             cursor: "pointer",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             zIndex: 998,
//             transition: "all 0.3s ease",
//           }}
//           onMouseOver={(e) => {
//             e.currentTarget.style.transform = "scale(1.1)";
//             e.currentTarget.style.boxShadow = `0 6px 20px ${colors.shadow}`;
//           }}
//           onMouseOut={(e) => {
//             e.currentTarget.style.transform = "scale(1)";
//             e.currentTarget.style.boxShadow = `0 4px 12px ${colors.shadow}`;
//           }}
//           title="Профиль"
//         >
//           <svg
//             width="32"
//             height="32"
//             viewBox="0 0 24 24"
//             fill="none"
//             stroke={isDark ? "black" : "white"}
//             strokeWidth="2"
//             strokeLinecap="round"
//             strokeLinejoin="round"
//           >
//             <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
//             <circle cx="12" cy="7" r="4"></circle>
//           </svg>
//         </div>
//       )}

//       <div
//         style={{
//           position: "fixed",
//           bottom: "20px",
//           left: isExpanded ? "15px" : "calc(15px - 420px)",
//           transition: "left 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
//           width: "min(400px, calc(100% - 30px))",
//           height: "100%",
//           minHeight: "200px",
//           maxHeight: "95vh",  // <--- УВЕЛИЧЕНО с 90vh
//           backgroundColor: colors.background,
//           borderRadius: "12px",
//           boxShadow: "0 5px 40px rgba(0, 0, 0, 0.2)",
//           zIndex: 999,
//           display: "flex",
//           flexDirection: "column",
//           overflow: "hidden",
//           border: `1px solid ${colors.border}`,
//         }}
//       >
//         {/* HEADER */}
//         <div
//           style={{
//             display: "flex",
//             justifyContent: "space-between",
//             alignItems: "center",
//             padding: "12px 12px",
//             background: colors.primary,
//             color: isDark ? "black" : "white",
//             borderBottom: `1px solid ${colors.border}`,
//           }}
//         >
//           <div>
//             <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontFamily: 'monospace' }}>
//               👤 {t('profile')}
//             </h3>
//             <div className="addressModeRow" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
//               <p style={{ margin: 0, fontSize: "12px", opacity: 0.9 }}>
//                 {address
//                   ? `${t('connected')}: ${address.slice(0, 6)}...${address.slice(-4)}`
//                   : t('connectWalletForHistory')}
//               </p>
//               {wallet && (
//                 <div style={{
//                   fontSize: '11px',
//                   fontWeight: '700',
//                   padding: '4px 8px',
//                   borderRadius: '6px',
//                   background: isTestnet ? '#f59e0b' : '#10b981',
//                   color: '#fff',
//                   display: 'flex',
//                   alignItems: 'center',
//                   gap: '4px',
//                   textTransform: 'uppercase',
//                   letterSpacing: '0.5px'
//                 }}>
//                   <span style={{ fontSize: '10px' }}>
//                     {isTestnet ? '🟡' : '🟢'}
//                   </span>
//                   <span>{isTestnet ? 'Testnet' : 'Mainnet'}</span>
//                 </div>
//               )}
//             </div>
//           </div>

//           <button
//             onClick={() => setIsExpanded(false)}
//             style={{
//               background: "none",
//               border: "none",
//               color: isDark ? "black" : "white",
//               fontSize: "24px",
//               cursor: "pointer",
//               padding: "0",
//               width: "32px",
//               height: "32px",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               transition: "transform 0.2s",
//             }}
//             title="Закрыть"
//             onMouseOver={(e) =>
//               (e.currentTarget.style.transform = "scale(1.2)")
//             }
//             onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
//           >
//             ✕
//           </button>
//         </div>

//         {/* CONTENT */}
//         <div
//           style={{
//             padding: "16px 16px",
//             display: "flex",
//             flexDirection: "column",
//             gap: "12px",
//             flex: 1,
//             minHeight: 0,
//             overflow: 'hidden'
//           }}
//         >
//           {/* user info */}
//           <div
//             style={{
//               display: "flex",
//               justifyContent: "space-between",
//               alignItems: "flex-start",
//               gap: "10px",
//             }}
//           >
//             <div
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: 'flex-start',
//                 gap: "16px",
//                 flex: 1,
//               }}
//             >
//               <div
//                 style={{
//                   width: "50px",
//                   height: "50px",
//                   borderRadius: "50%",
//                   background: colors.primary,
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   boxShadow: `0 4px 12px ${colors.shadow}`,
//                 }}
//               >
//                 <svg
//                   width="33"
//                   height="33"
//                   viewBox="0 0 24 24"
//                   fill={isDark ? "black" : "white"}
//                   stroke={isDark ? "black" : "white"}
//                   strokeWidth="1.5"
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                 >
//                   <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
//                   <circle cx="12" cy="7" r="4"></circle>
//                 </svg>
//               </div>
//               <div className="domainAndBalance" style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center'}}>
//                 <p
//                   style={{
//                     margin: "0",
//                     fontSize: "16px",
//                     fontWeight: "600",
//                     color: colors.text,
//                     fontFamily: 'monospace'
//                   }}
//                 >
//                   {address
//                     ? `${domain || 'Connected'}`
//                     : ''}
//                 </p>
//                 <div className="amountWithLogo" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px'}}>
//                   <p
//                     style={{
//                       margin: "0",
//                       fontSize: "14px",
//                       fontWeight: "300",
//                       color: colors.text,
//                       fontFamily: 'monospace'
//                     }}
//                   >
//                     {address
//                       ? formatBalance(balance)
//                       : `${t('guest')}`}
//                   </p>
//                   {address ?  <img
//                     src={TonLogo}
//                     alt="TON"
//                     style={{
//                       width: '16px',
//                       height: '16px'
//                     }}
//                   /> : ''}
//                 </div>
//               </div>
//             </div>

//             <div
//               style={{
//                 display: "flex",
//                 flexDirection: "column",
//                 gap: "12px",
//                 flex: 1,
//                 alignItems: "center",
//               }}
//             >
//               <TonConnectButton />
//             </div>
//           </div>

//           {/* tabs & content */}
//           {address ? (
//             <>
//               <div
//                 style={{
//                   width: "100%",
//                   display: "flex",
//                   gap: "4px",
//                   borderBottom: `1px solid ${colors.border}`,
//                 }}
//               >
//                 <button
//                   onClick={() => setActiveTab("zones")}
//                   style={tabButtonStyle(activeTab === "zones")}
//                 >
//                   🌐 {t('zones')}
//                 </button>
//                 <button
//                   onClick={() => setActiveTab("subdomains")}
//                   style={tabButtonStyle(activeTab === "subdomains")}
//                 >
//                   🔗 {t('subdomains')}
//                 </button>
//                 <button
//                   onClick={() => setActiveTab("auctions")}
//                   style={tabButtonStyle(activeTab === "auctions")}
//                 >
//                   ⚡ {t('auctions')}
//                 </button>
//                 <button
//                   onClick={() => setActiveTab("info")}
//                   style={tabButtonStyle(activeTab === "info")}
//                 >
//                   ℹ️ {t('info')}
//                 </button>
//               </div>

//               {/* ====== НОВОЕ: ПАНЕЛЬ ИКОНОК ФИЛЬТР + ПЕРЕКЛЮЧАТЕЛЬ ВИДА (только не на info) ====== */}
//               {activeTab !== 'info' && (
//                 <div style={{
//                   display: 'flex',
//                   justifyContent: 'space-between',
//                   alignItems: 'center',
//                   padding: '0 4px',
//                   position: 'relative',
//                   zIndex: 100,
//                 }}>
//                   {/* Иконка фильтра с дропдауном */}
//                   <div style={{ position: 'relative' }}>
//                     <button
//                       onClick={() => setFiltersOpen(!filtersOpen)}
//                       title={t('filters') || 'Фильтры'}
//                       style={{
//                         background: filtersOpen ? `rgba(${isDark ? '255,215,0' : '59,130,246'}, 0.15)` : 'none',
//                         border: `1px solid ${filtersOpen ? colors.cyberpunk : colors.border}`,
//                         borderRadius: '6px',
//                         color: filtersOpen ? colors.cyberpunk : colors.text,
//                         cursor: 'pointer',
//                         padding: '6px 10px',
//                         display: 'flex',
//                         alignItems: 'center',
//                         gap: '6px',
//                         fontSize: '12px',
//                         fontFamily: 'monospace',
//                         transition: 'all 0.2s',
//                       }}
//                     >
//                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//                         <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
//                       </svg>
//                       {t('filters') || 'Filter'}
//                     </button>

//                     {filtersOpen && (
//                       <>
//                         <div
//                           onClick={() => setFiltersOpen(false)}
//                           style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 997 }}
//                         />
//                         <div style={{
//                           position: 'absolute',
//                           top: '100%',
//                           left: 0,
//                           marginTop: '8px',
//                           zIndex: 998,
//                           width: '320px',
//                           maxWidth: 'calc(100vw - 80px)',
//                           background: colors.dropdownBg,
//                           border: `1px solid ${colors.dropdownBorder}`,
//                           borderRadius: '8px',
//                           boxShadow: `0 8px 30px ${colors.shadow}`,
//                           padding: '12px',
//                         }}>
//                           <SearchAndFilters
//                             searchQuery={searchQuery}
//                             setSearchQuery={setSearchQuery}
//                             filters={filters}
//                             setFilters={setFilters}
//                             sortBy={sortBy}
//                             setSortBy={setSortBy}
//                             activeTab={activeTab}
//                             colors={colors}
//                             isDark={isDark}
//                           />
//                         </div>
//                       </>
//                     )}
//                   </div>

//                   {/* Счётчик + переключатели вида */}
//                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//                     <span style={{
//                       fontSize: '11px',
//                       color: colors.text,
//                       opacity: 0.7,
//                       fontFamily: 'monospace'
//                     }}>
//                       {activeTab === 'zones' && `${getFilteredZones().length}/${getUserZones.length}`}
//                       {activeTab === 'subdomains' && `${getFilteredSubdomains().length}/${subdomains.length}`}
//                       {activeTab === 'auctions' && `${getFilteredAuctions().length}/${activeAuctions.length}`}
//                     </span>

//                     {/* List view */}
//                     <button
//                       onClick={() => setCardView('list')}
//                       style={cardView === 'list' ? viewToggleActiveStyle : viewToggleBaseStyle}
//                       title={t('listView') || 'Список'}
//                     >
//                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//                         <line x1="8" y1="6" x2="21" y2="6"></line>
//                         <line x1="8" y1="12" x2="21" y2="12"></line>
//                         <line x1="8" y1="18" x2="21" y2="18"></line>
//                         <line x1="3" y1="6" x2="3.01" y2="6"></line>
//                         <line x1="3" y1="12" x2="3.01" y2="12"></line>
//                         <line x1="3" y1="18" x2="3.01" y2="18"></line>
//                       </svg>
//                     </button>

//                     {/* Swipe view */}
//                     <button
//                       onClick={() => setCardView('swipe')}
//                       style={cardView === 'swipe' ? viewToggleActiveStyle : viewToggleBaseStyle}
//                       title={t('swipeView') || 'Лента'}
//                     >
//                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//                         <rect x="2" y="4" width="20" height="16" rx="2"></rect>
//                         <polygon points="10 8 6 12 10 16"></polygon>
//                         <polygon points="14 8 18 12 14 16"></polygon>
//                       </svg>
//                     </button>
//                   </div>
//                 </div>
//               )}

//               {/* ====== LIST VIEW ====== */}
//               {cardView === 'list' && (
//                 <>
//                   {/* ЗОНЫ */}
//                   {activeTab === "zones" && (
//                     <div
//                       style={{
//                         display: "flex",
//                         flexDirection: "column",
//                         gap: "12px",
//                         overflowY: "auto",
//                         flex: 1,
//                         minHeight: 0,
//                         paddingRight: "6px",
//                       }}
//                     >
//                       {zonesLoading ? (
//                         <div style={{ textAlign: 'center', padding: '20px' }}>
//                           <p style={{ color: colors.text }}>{t('loadingZones')}...</p>
//                         </div>
//                       ) : zonesError ? (
//                         <div style={{ textAlign: 'center', padding: '20px', color: '#f87171' }}>
//                           <p>{t('error')}: {zonesError}</p>
//                         </div>
//                       ) : getFilteredZones().length === 0 ? (
//                         <div style={{ textAlign: 'center', padding: '20px', color: colors.text, opacity: 0.7 }}>
//                           <p>
//                             {searchQuery || filters.zoneLengths.length > 0
//                               ? `${t('noZonesMatchingFilters')}`
//                               : `${t('noZones')}`}
//                           </p>
//                           <button
//                             onClick={() => window.location.href = '#/create-collection'}
//                             style={{
//                               background: colors.primary,
//                               color: isDark ? '#000' : '#fff',
//                               border: 'none',
//                               outline: 'none',
//                               padding: '8px 16px',
//                               borderRadius: '6px',
//                               fontSize: '12px',
//                               fontWeight: '600',
//                               fontFamily: 'monospace',
//                               textTransform: 'uppercase',
//                               letterSpacing: '0.5px',
//                               boxShadow: `0 0 8px ${colors.shadow}`,
//                               transition: 'all 0.3s ease',
//                               cursor: 'pointer',
//                               marginTop: '10px'
//                             }}
//                           >
//                             {t('createFirstZone')}
//                           </button>
//                         </div>
//                       ) : (
//                         getFilteredZones().map((zone) => renderZoneCard(zone))
//                       )}
//                     </div>
//                   )}

//                   {/* СУБДОМЕНЫ */}
//                   {activeTab === "subdomains" && (
//                     <div
//                       style={{
//                         display: "flex",
//                         flexDirection: "column",
//                         gap: "12px",
//                         overflowY: "auto",
//                         flex: 1,
//                         minHeight: 0,
//                         paddingRight: "6px",
//                       }}
//                     >
//                       {subdomainsLoading ? (
//                         <div style={{ textAlign: 'center', padding: '20px' }}>
//                           <p style={{ color: colors.text }}>{t('loadingSubdomains')}...</p>
//                         </div>
//                       ) : subdomainsError ? (
//                         <div style={{ textAlign: 'center', padding: '20px', color: '#f87171' }}>
//                           <p>{t('error')}: {subdomainsError}</p>
//                         </div>
//                       ) : getFilteredSubdomains().length === 0 ? (
//                         <div style={{ textAlign: 'center', padding: '20px', color: colors.text, opacity: 0.7 }}>
//                           <p>
//                             {searchQuery || filters.zoneLengths.length > 0 || filters.subdomainLengths.length > 0
//                               ? `${t('noSubdomainsMatchingFilters')}`
//                               : `${t('noSubdomains')}`}
//                           </p>
//                           <button
//                             onClick={() => window.location.href = '#/add-subdomain'}
//                             style={{
//                               background: colors.primary,
//                               color: isDark ? '#000' : '#fff',
//                               border: 'none',
//                               outline: 'none',
//                               padding: '8px 16px',
//                               borderRadius: '6px',
//                               fontSize: '12px',
//                               fontWeight: '600',
//                               fontFamily: 'monospace',
//                               textTransform: 'uppercase',
//                               letterSpacing: '0.5px',
//                               boxShadow: `0 0 8px ${colors.shadow}`,
//                               transition: 'all 0.3s ease',
//                               cursor: 'pointer',
//                               marginTop: '10px'
//                             }}
//                           >
//                             {t('createFirstSubdomain')}
//                           </button>
//                         </div>
//                       ) : (
//                         getFilteredSubdomains().map((subdomain) => renderSubdomainCard(subdomain))
//                       )}
//                     </div>
//                   )}

//                   {/* АУКЦИОНЫ */}
//                   {activeTab === "auctions" && (
//                     <div
//                       style={{
//                         display: "flex",
//                         flexDirection: "column",
//                         gap: "12px",
//                         overflowY: "auto",
//                         flex: 1,
//                         minHeight: 0,
//                         paddingRight: "6px",
//                       }}
//                     >
//                       {auctionsLoading ? (
//                         <div style={{ textAlign: 'center', padding: '20px' }}>
//                           <p style={{ color: colors.text }}>{t('loadingAuctions')}...</p>
//                         </div>
//                       ) : getFilteredAuctions().length === 0 ? (
//                         <div style={{ textAlign: 'center', padding: '20px', color: colors.text, opacity: 0.7 }}>
//                           <p>
//                             {searchQuery
//                               ? `${t('noAuctionsMatchingFilters')}`
//                               : `${t('noAuctions')}` }
//                           </p>
//                           <button
//                             onClick={() => window.location.href = '/add-subdomain'}
//                             style={{
//                               background: colors.primary,
//                               color: isDark ? '#000' : '#fff',
//                               border: 'none',
//                               outline: 'none',
//                               padding: '8px 16px',
//                               borderRadius: '6px',
//                               fontSize: '12px',
//                               fontWeight: '600',
//                               fontFamily: 'monospace',
//                               textTransform: 'uppercase',
//                               letterSpacing: '0.5px',
//                               boxShadow: `0 0 8px ${colors.shadow}`,
//                               transition: 'all 0.3s ease',
//                               cursor: 'pointer',
//                               marginTop: '10px'
//                             }}
//                           >
//                             {t('createAuction')}
//                           </button>
//                         </div>
//                       ) : (
//                         getFilteredAuctions().map((auction, idx) => renderAuctionCard(auction, idx))
//                       )}
//                     </div>
//                   )}
//                 </>
//               )}

//               {/* ====== SWIPE VIEW (общий для zones/subdomains/auctions) ====== */}
//               {activeTab !== 'info' && cardView === 'swipe' && (
//                 <div style={{
//                   display: "flex",
//                   flexDirection: "column",
//                   alignItems: "center",
//                   flex: 1,
//                   minHeight: 0,
//                   overflow: 'hidden',
//                   position: 'relative',
//                 }}>
//                   {swipeItems.length === 0 ? (
//                     <div style={{ textAlign: 'center', padding: '20px', color: colors.text, opacity: 0.7, marginTop: '40px' }}>
//                       <p>{t('noItems') || 'Нет элементов для отображения'}</p>
//                     </div>
//                   ) : (
//                     <>
//                       <div style={{
//                         flex: 1,
//                         display: 'flex',
//                         alignItems: 'center',
//                         justifyContent: 'center',
//                         width: '100%',
//                         overflow: 'hidden',
//                         position: 'relative',
//                       }}>
//                         {/* Левая стрелка */}
//                         {swipeItems.length > 1 && (
//                           <button
//                             onClick={() => setSwipeIndex(prev => (prev - 1 + swipeItems.length) % swipeItems.length)}
//                             style={{
//                               position: 'absolute',
//                               left: 0,
//                               top: '50%',
//                               transform: 'translateY(-50%)',
//                               background: 'none',
//                               border: 'none',
//                               color: colors.cyberpunk,
//                               fontSize: '28px',
//                               cursor: 'pointer',
//                               zIndex: 10,
//                               padding: '8px',
//                             }}
//                             aria-label="Previous"
//                           >
//                             ◀
//                           </button>
//                         )}

//                         {/* Карточка */}
//                         <div style={{
//                           width: '90%',
//                           maxWidth: '340px',
//                           transition: 'transform 0.3s ease',
//                         }}>
//                           {swipeItems[swipeIndex] && swipeRenderer(swipeItems[swipeIndex], swipeIndex)}
//                         </div>

//                         {/* Правая стрелка */}
//                         {swipeItems.length > 1 && (
//                           <button
//                             onClick={() => setSwipeIndex(prev => (prev + 1) % swipeItems.length)}
//                             style={{
//                               position: 'absolute',
//                               right: 0,
//                               top: '50%',
//                               transform: 'translateY(-50%)',
//                               background: 'none',
//                               border: 'none',
//                               color: colors.cyberpunk,
//                               fontSize: '28px',
//                               cursor: 'pointer',
//                               zIndex: 10,
//                               padding: '8px',
//                             }}
//                             aria-label="Next"
//                           >
//                             ▶
//                           </button>
//                         )}
//                       </div>

//                       {/* Индикатор (точки) */}
//                       {swipeItems.length > 1 && (
//                         <div style={{ display: 'flex', gap: '6px', padding: '8px 0 4px' }}>
//                           {swipeItems.map((_, i) => (
//                             <div
//                               key={i}
//                               onClick={() => setSwipeIndex(i)}
//                               style={{
//                                 width: '8px',
//                                 height: '8px',
//                                 borderRadius: '50%',
//                                 background: i === swipeIndex ? colors.cyberpunk : colors.border,
//                                 cursor: 'pointer',
//                                 transition: 'background 0.2s',
//                               }}
//                             />
//                           ))}
//                         </div>
//                       )}
//                     </>
//                   )}
//                 </div>
//               )}

//               {/* INFO TAB */}
//               {activeTab === "info" && (
//                 <div className="scrollPartWrapper" style={{overflow: 'scroll', height: '100%'}}>
//                   <div>
//                     <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: colors.text, fontWeight: "600", fontFamily: 'monospace' }}>
//                       📊 {t('statistics')}:
//                     </p>
//                     <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", color: colors.text, opacity: 0.8, fontFamily: 'monospace' }}>

//                       {/* Основные счетчики */}
//                       <div style={{ display: "flex", justifyContent: "space-between" }}>
//                         <span>{t('totalZones')}:</span>
//                         <span style={{ fontWeight: "600", color: colors.cyberpunk }}>
//                           {user?.zones || 0}
//                         </span>
//                       </div>

//                       <div style={{ display: "flex", justifyContent: "space-between" }}>
//                         <span>{t('proxyZones')}:</span>
//                         <span style={{ fontWeight: "600", color: '#4caf50' }}>
//                           {user?.proxyZones || 0}
//                         </span>
//                       </div>

//                       <div style={{ display: "flex", justifyContent: "space-between" }}>
//                         <span>{t('sbtZones')}:</span>
//                         <span style={{ fontWeight: "600", color: '#3b82f6' }}>
//                           {user?.sbtZones || 0}
//                         </span>
//                       </div>

//                       <div style={{ display: "flex", justifyContent: "space-between" }}>
//                         <span>{t('totalSubdomains')}:</span>
//                         <span style={{ fontWeight: "600", color: colors.cyberpunk }}>
//                           {user?.subdomains || 0}
//                         </span>
//                       </div>

//                       <div style={{ display: "flex", justifyContent: "space-between" }}>
//                         <span>{t('proxySubdomains')}:</span>
//                         <span style={{ fontWeight: "600", color: '#4caf50' }}>
//                           {user?.proxySubdomains || 0}
//                         </span>
//                       </div>

//                       <div style={{ display: "flex", justifyContent: "space-between" }}>
//                         <span>{t('sbtSubdomains')}:</span>
//                         <span style={{ fontWeight: "600", color: '#3b82f6' }}>
//                           {user?.sbtSubdomains || 0}
//                         </span>
//                       </div>

//                       {/* Активные аукционы */}
//                       <div style={{ display: "flex", justifyContent: "space-between", marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${colors.border}` }}>
//                         <span>{t('activeAuctions')}:</span>
//                         <span style={{ fontWeight: "600", color: colors.cyberpunk }}>
//                           {activeAuctions.length}
//                         </span>
//                       </div>

//                       {/* Оплаченные попытки */}
//                       <div style={{ display: "flex", justifyContent: "space-between", marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${colors.border}` }}>
//                         <span style={{ fontWeight: "600" }}>{t('totalPaidAttempts')}:</span>
//                         <span style={{ fontWeight: "600", color: colors.cyberpunk }}>
//                           {(() => {
//                             if (!user?.totalPaidAttempts) return 0;
//                             const attempts = user.totalPaidAttempts;
//                             const proxyTotal = Object.values(attempts.proxy || {}).reduce((a, b) => a + b, 0);
//                             const sbtTotal = Object.values(attempts.sbt || {}).reduce((a, b) => a + b, 0);
//                             return proxyTotal + sbtTotal;
//                           })()}
//                         </span>
//                       </div>

//                       <div style={{ display: "flex", justifyContent: "space-between" }}>
//                         <span>{t('proxyPaidAttempts')}:</span>
//                         <span style={{ fontWeight: "600", color: '#4caf50' }}>
//                           {(() => {
//                             if (!user?.totalPaidAttempts) return 0;
//                             return Object.values(user.totalPaidAttempts.proxy || {}).reduce((a, b) => a + b, 0);
//                           })()}
//                         </span>
//                       </div>

//                       <div style={{ display: "flex", justifyContent: "space-between" }}>
//                         <span>{t('sbtPaidAttempts')}:</span>
//                         <span style={{ fontWeight: "600", color: '#3b82f6' }}>
//                           {(() => {
//                             if (!user?.totalPaidAttempts) return 0;
//                             return Object.values(user.totalPaidAttempts.sbt || {}).reduce((a, b) => a + b, 0);
//                           })()}
//                         </span>
//                       </div>

//                       {/* Траты */}
//                       <div style={{ display: "flex", justifyContent: "space-between", marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${colors.border}` }}>
//                         <span style={{ fontWeight: "600" }}>{t('totalZoneSpending')}:</span>
//                         <span style={{ fontWeight: "600", color: colors.cyberpunk }}>
//                           {user?.totalZoneSpending?.toFixed(2) || '0.00'} <img
//                             src={TonLogo}
//                             alt="TON"
//                             style={{
//                               width: '16px',
//                               height: '16px'
//                             }}
//                           />
//                         </span>
//                       </div>

//                       <div style={{ display: "flex", justifyContent: "space-between" }}>
//                         <span>{t('proxyZoneSpending')}:</span>
//                         <span style={{ fontWeight: "600", color: '#4caf50' }}>
//                           {user?.totalProxyZoneSpending?.toFixed(2) || '0.00'} <img
//                             src={TonLogo}
//                             alt="TON"
//                             style={{
//                               width: '16px',
//                               height: '16px'
//                             }}
//                           />
//                         </span>
//                       </div>

//                       <div style={{ display: "flex", justifyContent: "space-between" }}>
//                         <span>{t('sbtZoneSpending')}:</span>
//                         <span style={{ fontWeight: "600", color: '#3b82f6' }}>
//                           {user?.totalSbtZoneSpending?.toFixed(2) || '0.00'} <img
//                             src={TonLogo}
//                             alt="TON"
//                             style={{
//                               width: '16px',
//                               height: '16px'
//                             }}
//                           />
//                         </span>
//                       </div>

//                       <div style={{ display: "flex", justifyContent: "space-between" }}>
//                         <span>{t('totalSubdomainSpending')}:</span>
//                         <span style={{ fontWeight: "600", color: colors.cyberpunk }}>
//                           {user?.totalSubdomainSpending?.toFixed(2) || '0.00'} <img
//                             src={TonLogo}
//                             alt="TON"
//                             style={{
//                               width: '16px',
//                               height: '16px'
//                             }}
//                           />
//                         </span>
//                       </div>

//                       <div style={{ display: "flex", justifyContent: "space-between" }}>
//                         <span>{t('proxySubdomainSpending')}:</span>
//                         <span style={{ fontWeight: "600", color: '#4caf50' }}>
//                           {user?.totalProxySubdomainSpending?.toFixed(2) || '0.00'} <img
//                             src={TonLogo}
//                             alt="TON"
//                             style={{
//                               width: '16px',
//                               height: '16px'
//                             }}
//                           />
//                         </span>
//                       </div>

//                       <div style={{ display: "flex", justifyContent: "space-between" }}>
//                         <span>{t('sbtSubdomainSpending')}:</span>
//                         <span style={{ fontWeight: "600", color: '#3b82f6' }}>
//                           {user?.totalSbtSubdomainSpending?.toFixed(2) || '0.00'} <img
//                             src={TonLogo}
//                             alt="TON"
//                             style={{
//                               width: '16px',
//                               height: '16px'
//                             }}
//                           />
//                         </span>
//                       </div>

//                       {/* Прибыль */}
//                       <div style={{ display: "flex", justifyContent: "space-between", marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${colors.border}` }}>
//                         <span style={{ fontWeight: "600" }}>{t('totalProfit')}:</span>
//                         <span style={{ fontWeight: "600", color: '#10b981' }}>
//                           {user?.totalProfit?.toFixed(2) || '0.00'} <img
//                             src={TonLogo}
//                             alt="TON"
//                             style={{
//                               width: '16px',
//                               height: '16px'
//                             }}
//                           />
//                         </span>
//                       </div>

//                       {/* Дата регистрации */}
//                       <div style={{ display: "flex", justifyContent: "space-between", marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${colors.border}` }}>
//                         <span>{t('registrationDate')}:</span>
//                         <span style={{ fontWeight: "600", color: colors.cyberpunk }}>
//                           {user?.registrationDate
//                             ? new Date(user.registrationDate).toLocaleDateString("ru-RU")
//                             : user?.createdAt
//                             ? new Date(user.createdAt).toLocaleDateString("ru-RU")
//                             : "-"}
//                         </span>
//                       </div>

//                       {/* Блок с оплаченными попытками */}
//                       <PaymentAttemptsSection
//                         address={address}
//                         colors={colors}
//                         isDark={isDark}
//                       />
//                     </div>
//                   </div>
//                 </div>
//               )}

//               <div
//                 style={{
//                   paddingTop: "12px",
//                   borderTop: `1px solid ${colors.border}`,
//                   fontSize: "11px",
//                   color: colors.text,
//                   opacity: 0.6,
//                   textAlign: "center",
//                   lineHeight: "1.5",
//                   fontFamily: 'monospace',
//                   display: "flex",
//                   flexDirection: "column",
//                   justifyContent: "end",
//                 }}
//               >
//                 <button
//                   onClick={refreshAllData}
//                   style={{
//                     background: 'none',
//                     border: 'none',
//                     color: colors.cyberpunk,
//                     cursor: 'pointer',
//                     fontSize: '12px',
//                     textDecoration: 'underline',
//                     fontFamily: 'monospace',
//                     marginTop: '5px',
//                     fontWeight: '900',
//                   }}
//                 >
//                   🔄 {t('refreshData')}
//                 </button>
//               </div>
//             </>
//           ) : (
//             <div
//               style={{
//                 padding: "20px",
//                 backgroundColor: colors.secondaryBg,
//                 borderRadius: "8px",
//                 textAlign: "center",
//               }}
//             >
//               <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔐</div>
//               <p
//                 style={{
//                   margin: "0 0 8px 0",
//                   fontSize: "14px",
//                   fontWeight: "600",
//                   color: colors.text,
//                   fontFamily: 'monospace'
//                 }}
//               >
//                 {t('accessRestricted')}
//               </p>
//               <p
//                 style={{
//                   margin: "0",
//                   fontSize: "12px",
//                   color: colors.text,
//                   opacity: 0.7,
//                   lineHeight: "1.5",
//                 }}
//               >
//                 {t('connectWalletForHistory')}
//               </p>
//             </div>
//           )}
//         </div>
//       </div>

//       {isExpanded && (
//         <div
//           onClick={() => setIsExpanded(false)}
//           style={{
//             position: "fixed",
//             top: 0,
//             left: 0,
//             right: 0,
//             bottom: 0,
//             backgroundColor: "rgba(0,0,0,0.3)",
//             zIndex: 998,
//           }}
//         />
//       )}

//       <style>{`
//         :global(.ton-connect-button) {
//           width: 100%;
//           padding: 10px 12px !important;
//           background: ${colors.primary} !important;
//           border: none !important;
//           border-radius: 8px !important;
//           color: ${isDark ? 'black' : 'white'} !important;
//           font-weight: 600 !important;
//           font-size: 13px !important;
//           cursor: pointer !important;
//           transition: all 0.3s ease !important;
//           box-shadow: 0 4px 12px ${colors.shadow} !important;
//           font-family: monospace !important;
//           textTransform: uppercase !important;
//           letterSpacing: 0.5px !important;
//         }

//         :global(.ton-connect-button:hover) {
//           background: ${colors.accent} !important;
//           box-shadow: 0 6px 20px ${colors.shadow} !important;
//           transform: translateY(-2px) !important;
//         }

//         /* Стили для кнопок в карточках при наведении */
//         button[style*="background: linear-gradient"]:hover {
//           transform: translateY(-2px) !important;
//           box-shadow: 0 4px 12px ${colors.shadow} !important;
//           filter: brightness(1.1);
//         }

//         button[style*="background: linear-gradient"]:active {
//           transform: translateY(0) !important;
//           boxShadow: 0 2px 6px ${colors.shadow} !important;
//         }
//       `}</style>
//     </>
//   );
// };

// export default ProfileWidget;

// components/ProfileWidget/ProfileWidget.tsx
//СТАБИЛЬНАЯ ВЕРСИЯ но сбт все и т д
// ⚠️ Импорты useZones / apiService сохранены ради info-блока — НЕ УДАЛЯТЬ.

// import React, { useState, useEffect, useMemo } from "react";
// import {
//   useTonAddress,
//   useTonWallet,
//   TonConnectButton,
// } from "@tonconnect/ui-react";
// import { useTheme } from "@/contexts/ThemeContext";
// import { useLanguage } from "@/contexts/LanguageContext";
// import { useUser } from "@/contexts/UserContext";
// import TonLogo from "@/components/Header/ton.svg";

// import { fromNano } from "ton-core";

// import SearchAndFilters from "@/components/SearchAndFilters/SearchAndFilters";
// import {
//   FilterState,
//   SortOption,
//   Zone,
//   Subdomain,
//   Auction,
// } from "@/types/profile-widget-filters.types";
// import {
//   getFilteredData,
//   getZoneType,
// } from "@/utils/profile-widget-filter.utils";

// // ====== [NEW] БЛОКЧЕЙН-СЕРВИС ======
// import { useBlockchainItems } from "@/services/blockchainItems/blockchain-items-context.tsx";
// import {
//   SimpleCollection,
//   SimpleEnrichedItem,
//   ItemType,
// } from "@/services/blockchainItems/blockchain-items-types";
// import { getAuctionInfo } from "@/pages/AddSubdomainPage/flipTimer/getAuctionInfo";

// // ====== [KEEP] БЭКЕНД ДЛЯ INFO-БЛОКА ======
// // import { useZones } from "@/hooks/useZones";
// import { apiService } from "@/services/api";
// import PaymentAttemptsSection from "../PaymentAttemptsSection";
// import { convertUserFriendlyToRaw } from "@/utils/tonUtils";
// import searchDog from "@/pages/ManageDomainPage/img/searchDog.gif";

// // ====================================================================
// // КОНСТАНТЫ
// // ====================================================================

// const API_PAYLOAD_URL = import.meta.env.VITE_API_SC_PAYLOAD_URL || "";

// // ====================================================================
// // АДАПТЕР: SimpleCollection → Zone
// // ====================================================================

// /**
//  * Превращает ончейн-коллекцию (SimpleCollection) в Zone для UI.
//  * Тип (proxy/sbt) уже проставлен в col.type через getCollectionType по code_hash.
//  * creator_address заполняется через getCollectionCreator в сервисе.
//  * item_count — количество итемов (подсчитывается на стороне сервиса).
//  */

// // const collectionToZone = (col: SimpleCollection): Zone => {
// //   const zoneName = (col.name || "")
// //     .replace(" DNS Domains", "")
// //     .replace(" Proxy Domains", "")
// //     .toLowerCase();

// //   return {
// //     id: col.address.slice(0, 10),
// //     name: zoneName.endsWith(".ton") ? zoneName : `${zoneName}.ton`,
// //     address: col.address,
// //     owner: col.creator_address || col.owner_address,
// //     collectionAddress: col.address,
// //     createdAt: col.lastUpdated || new Date().toISOString(),
// //     subdomainsAmount: col.item_count || 0,
// //     proxy: col.type === "proxy" ? 1 : 0,
// //     status: "active",
// //     image: col.metadata?.token_info?.[0]?.image || col.image,
// //     description: col.metadata?.token_info?.[0]?.description || col.description,
// //     zoneLength: zoneName.length,
// //   } as any as Zone;
// // };

// const collectionToZone = (col: SimpleCollection): Zone => {
//   const rawName = col.name || "";
//   console.log(
//     `🔍 collectionToZone: raw="${rawName}", address=${col.address.slice(0, 10)}`
//   );

//   const zoneName = rawName
//     .replace(" DNS Domains", "")
//     .replace(" Proxy Domains", "")
//     .toLowerCase();

//   console.log(
//     `   zoneName="${zoneName}", endsWith('.ton')=${zoneName.endsWith(".ton")}`
//   );

//   return {
//     id: col.address.slice(0, 10),
//     name: zoneName.endsWith(".ton") ? zoneName : `${zoneName}.ton`,
//     address: col.address,
//     owner: col.creator_address || col.owner_address,
//     collectionAddress: col.address,
//     createdAt: col.lastUpdated || new Date().toISOString(),
//     subdomainsAmount: col.item_count || 0,
//     proxy: col.type === "proxy" ? 1 : 0,
//     status: "active",
//     image: col.metadata?.token_info?.[0]?.image || col.image,
//     description: col.metadata?.token_info?.[0]?.description || col.description,
//     zoneLength: zoneName.length,
//   } as any as Zone;
// };

// // ====================================================================
// // АДАПТЕР: SimpleEnrichedItem → Subdomain
// // ====================================================================

// const enrichedItemToSubdomain = (item: SimpleEnrichedItem): Subdomain => {
//   const subName = item.domain.split(".")[0] || "";

//   return {
//     id: item.address,
//     name: item.domain,
//     zoneId: item.zone,
//     address: item.address,
//     owner_address: item.owner_address,
//     collectionAddress: item.collection_address,
//     createdAt: item.lastUpdated,
//     status: item.on_sale ? "auction" : "active",
//     mintPrice: 0,
//     lastBid: undefined,
//     lastBidder: undefined,
//     auctionEndTime: undefined,
//     type: item.type,
//     metadata: item.metadata,
//     subdomainLength: subName.length, // <-- NEW
//     zoneLength: item.zone.replace(".ton", "").length, // <-- NEW
//   } as any as Subdomain;
// };

// // ====================================================================
// // ОНЧЕЙН-АУКЦИОНЫ
// // ====================================================================

// const loadAuctionsFromBlockchain = async (
//   subdomains: Subdomain[],
//   isTestnet: boolean
// ): Promise<Auction[]> => {
//   const auctions: Auction[] = [];

//   for (const sub of subdomains) {
//     try {
//       // const collectionAddress = sub.collectionAddress;
//       const collectionAddress = (sub as any).collectionAddress as
//         | string
//         | undefined;
//       if (!collectionAddress || !sub.name) continue;

//       const subName = sub.name.split(".")[0];
//       const info = await getAuctionInfo(subName, collectionAddress, isTestnet);

//       if (info && info.isActive) {
//         auctions.push({
//           name: sub.name,
//           bid: `${(Number(info.maxBid) / 1e9).toFixed(2)} TON`,
//           ends: new Date(info.timestamp * 1000).toISOString(),
//           lastBidder: info.maxBidderOwner || undefined,
//           lastBid: Number(info.maxBid),
//           subdomain: sub,
//         });
//       }
//     } catch {
//       // не на аукционе — пропускаем
//     }
//   }

//   return auctions;
// };

// // ====================================================================
// // URL КАРТИНКИ СУБДОМЕНА (swipe-режим)
// // ====================================================================

// /**
//  * Формирует URL картинки субдомена для swipe-режима.
//  * Тип определяем по полю type (ItemType), которое проставлено
//  * через getItemType по code_hash.  Никаких догадок по URI.
//  */
// const getSubdomainImage = (subdomain: Subdomain): string | undefined => {
//   if (!subdomain.name || !subdomain.zoneId) return undefined;

//   const zoneName = String(subdomain.zoneId).replace(".ton", "");
//   const subName = subdomain.name.split(".")[0];
//   const itemType: ItemType = (subdomain as any).type || "proxy_subdomain";

//   if (itemType === "sbt_subdomain") {
//     return `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${zoneName}/${subName}.png`;
//   }
//   return `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${zoneName}/${subName}.png`;
// };

// // ====================================================================
// // КОМПОНЕНТ
// // ====================================================================

// const ProfileWidget: React.FC = () => {
//   const [isExpanded, setIsExpanded] = useState<boolean>(false);
//   const wallet = useTonWallet();
//   const address = useTonAddress();
//   const isTestnet = wallet?.account?.chain === "-3";

//   const { currentTheme } = useTheme();
//   const isDark = currentTheme === "dark";
//   const { t } = useLanguage();

//   // ====== [KEEP] Бэкенд-хуки (для info-блока) ======
//   const { user, refreshUser, connectWallet } = useUser();
//   // const {
//   //   allZones,
//   //   loading: zonesLoading,
//   //   error: zonesError,
//   //   refreshZones,
//   // } = useZones();

//   // ====== [NEW] Блокчейн-хук ======
//   const {
//     proxyCollections,
//     sbtCollections,
//     userProxySubdomains,
//     userSBTSubdomains,
//     loadAllData,
//     isLoading: blockchainLoading,
//     error: blockchainError,
//   } = useBlockchainItems();

//   // UI state
//   const [domain, setDomain] = useState<string | null>(null);
//   const [activeTab, setActiveTab] = useState<
//     "zones" | "subdomains" | "auctions" | "info"
//   >("zones");
//   const [activeAuctions, setActiveAuctions] = useState<Auction[]>([]);
//   const [auctionsLoading, setAuctionsLoading] = useState<boolean>(false);
//   const [subdomains, setSubdomains] = useState<Subdomain[]>([]);
//   const [_subdomainsLoading, setSubdomainsLoading] = useState<boolean>(false);
//   const [_subdomainsError, setSubdomainsError] = useState<string | null>(null);
//   const [balance, setBalance] = useState<string>("0");

//   const [_soonModalOpen, setSoonModalOpen] = useState<boolean>(false);
//   // Фильтры
//   const [searchQuery, setSearchQuery] = useState<string>("");
//   const [filters, setFilters] = useState<FilterState>({
//     zoneLengths: [],
//     subdomainLengths: [],
//     auctionStatuses: [],
//     zoneTypes: [],
//   });
//   const [sortBy, setSortBy] = useState<SortOption>("name_asc");
//   const [filtersOpen, setFiltersOpen] = useState<boolean>(false);
//   const [cardView, setCardView] = useState<"list" | "swipe">("list");
//   const [swipeIndex, setSwipeIndex] = useState<number>(0);

//   // Цвета темы
//   const themeColors = {
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
//       blue: "#3B82F6",
//       link: "#3B82F6",
//       inputBg: "#FFFFFF",
//       inputBorder: "#D1D5DB",
//       inputText: "#1F2937",
//       dropdownBg: "#FFFFFF",
//       dropdownBorder: "#E5E7EB",
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
//       blue: "#00FFFF",
//       link: "#00FFFF",
//       inputBg: "#1A1A1A",
//       inputBorder: "#444444",
//       inputText: "#E5E5E5",
//       dropdownBg: "#1A1A1A",
//       dropdownBorder: "#444444",
//     },
//   };
//   const colors = themeColors[isDark ? "dark" : "light"];

//   // ====== [KEEP] СУЩЕСТВУЮЩИЕ УТИЛИТЫ (без изменений) ======

//   const checkAuctionTimerEnd = (time: Date) => new Date() <= time;

//   const fetchBalanceSimple = async () => {
//     if (!address) {
//       setBalance("0");
//       return;
//     }
//     try {
//       const baseUrl = isTestnet
//         ? "https://testnet.toncenter.com/api/v3/addressInformation"
//         : "https://toncenter.com/api/v3/addressInformation";
//       const apiKey = import.meta.env.VITE_TONCENTER_API_KEY;
//       const url = new URL(baseUrl);
//       url.searchParams.append("address", address);
//       url.searchParams.append("use_v2", "true");
//       if (apiKey) url.searchParams.append("api_key", apiKey);
//       const response = await fetch(url.toString());
//       if (!response.ok) {
//         setBalance("0");
//         return;
//       }
//       const data = await response.json();
//       if (data?.balance) {
//         setBalance(parseFloat(fromNano(data.balance)).toFixed(2));
//       } else {
//         setBalance("0");
//       }
//     } catch {
//       setBalance("0");
//     }
//   };

//   const handleAddSubdomain = () => {
//     setIsExpanded(false);
//     setTimeout(() => {
//       window.location.href = `/#/add-subdomain`;
//     }, 300);
//   };
//   const handleManage = () => {
//     setIsExpanded(false);
//     setTimeout(() => {
//       window.location.href = `/manage#/manage`;
//     }, 300);
//   };
//   const handleMarket = () => {
//     setIsExpanded(false);
//     setTimeout(() => {
//       window.location.href = `/#/market`;
//     }, 300);
//   };
//   const handleGoToAuction = (_name: string) => {
//     if (typeof window !== "undefined")
//       window.location.href = `/#/add-subdomain`;
//   };

//   const fetchDomain = async () => {
//     if (!wallet || !address) return;
//     try {
//       const hexAddress = wallet.account.address;
//       const modeFetchDomainUrl = isTestnet
//         ? "testnet.toncenter.com"
//         : "toncenter.com";
//       const apiKey = import.meta.env.VITE_TONCENTER_API_KEY;
//       const url = new URL(`https://${modeFetchDomainUrl}/api/v3/dns/records`);
//       url.searchParams.append("wallet", hexAddress);
//       url.searchParams.append("limit", "100");
//       url.searchParams.append("offset", "0");
//       if (apiKey) url.searchParams.append("api_key", apiKey);
//       const response = await fetch(url.toString());
//       if (!response.ok) {
//         setDomain(null);
//         return;
//       }
//       const data = await response.json();
//       const domainFromRecords = data.records?.find(
//         (record: any) => record.nft_item_owner === hexAddress
//       )?.domain;
//       const domainFromAddressBook = Object.values(
//         data.address_book as Record<
//           string,
//           { user_friendly: string; domain?: string }
//         >
//       ).find((entry: any) => entry.user_friendly === address)?.domain;
//       setDomain(domainFromRecords || domainFromAddressBook || null);
//     } catch {
//       setDomain(null);
//     }
//   };

//   const formatBalance = (bal: string) => {
//     const num = parseFloat(bal);
//     return num >= 1000 ? `${(num / 1000).toFixed(1)}k ` : `${bal} `;
//   };

//   const createTonViewerLink = (addr: string) => {
//     const baseUrl = isTestnet
//       ? "https://testnet.tonviewer.com"
//       : "https://tonviewer.com";
//     return `${baseUrl}/${addr}`;
//   };

//   // ====== [NEW] ЗОНЫ ПОЛЬЗОВАТЕЛЯ — ИЗ БЛОКЧЕЙНА ======

//   // const getUserZones = useMemo((): Zone[] => {
//   //   if (!address) return [];

//   //   const proxyZones = proxyCollections
//   //     .filter((col) => (col.creator_address || col.owner_address) === address)
//   //     .map((col) => collectionToZone(col));

//   //   const sbtZones = sbtCollections
//   //     .filter((col) => (col.creator_address || col.owner_address) === address)
//   //     .map((col) => collectionToZone(col));

//   //   return [...proxyZones, ...sbtZones];
//   // }, [address, proxyCollections, sbtCollections]);

//   const getUserZones = useMemo((): Zone[] => {
//     if (!address) return [];

//     // Нормализуем адрес: user-friendly → raw (0:...)
//     const normalizedAddress = convertUserFriendlyToRaw(address).toLowerCase();

//     console.log("🔍 getUserZones filter:", {
//       userFriendly: address,
//       normalized: normalizedAddress,
//     });

//     const proxyZones = proxyCollections
//       .filter((col) => {
//         const creator = (
//           col.creator_address ||
//           col.owner_address ||
//           ""
//         ).toLowerCase();
//         const matches = creator === normalizedAddress;
//         if (col.creator_address) {
//           console.log(
//             `  proxy col ${col.name}: creator=${col.creator_address} vs user=${normalizedAddress} → ${matches}`
//           );
//         }
//         return matches;
//       })
//       .map((col) => collectionToZone(col));

//     const sbtZones = sbtCollections
//       .filter((col) => {
//         const creator = (
//           col.creator_address ||
//           col.owner_address ||
//           ""
//         ).toLowerCase();
//         const matches = creator === normalizedAddress;
//         if (col.creator_address) {
//           console.log(
//             `  sbt col ${col.name}: creator=${col.creator_address} vs user=${normalizedAddress} → ${matches}`
//           );
//         }
//         return matches;
//       })
//       .map((col) => collectionToZone(col));

//     const result = [...proxyZones, ...sbtZones];
//     console.log(`✅ getUserZones: найдено ${result.length} зон`);
//     return result;
//   }, [address, proxyCollections, sbtCollections]);

//   // ====== [NEW] СУБДОМЕНЫ ПОЛЬЗОВАТЕЛЯ — ИЗ БЛОКЧЕЙНА ======

//   const getUserSubdomainsFromBlockchain = useMemo((): Subdomain[] => {
//     const proxySubs = userProxySubdomains.map((item) =>
//       enrichedItemToSubdomain(item)
//     );
//     const sbtSubs = userSBTSubdomains.map((item) =>
//       enrichedItemToSubdomain(item)
//     );
//     return [...proxySubs, ...sbtSubs];
//   }, [userProxySubdomains, userSBTSubdomains]);

//   useEffect(() => {
//     if (getUserSubdomainsFromBlockchain.length > 0) {
//       setSubdomains(getUserSubdomainsFromBlockchain);
//       setSubdomainsLoading(false);
//       setSubdomainsError(null);
//     }
//   }, [getUserSubdomainsFromBlockchain]);

//   // ====== [NEW] АУКЦИОНЫ — ОНЧЕЙН ======

//   useEffect(() => {
//     if (subdomains.length === 0) return;
//     const load = async () => {
//       setAuctionsLoading(true);
//       try {
//         const auctions = await loadAuctionsFromBlockchain(
//           subdomains,
//           isTestnet
//         );
//         setActiveAuctions(auctions);
//       } catch (err) {
//         console.error("❌ Ошибка загрузки аукционов:", err);
//       } finally {
//         setAuctionsLoading(false);
//       }
//     };
//     load();
//   }, [subdomains, isTestnet]);

//   // ====== [NEW] ОСНОВНОЙ ЭФФЕКТ ЗАГРУЗКИ ======

//   useEffect(() => {
//     const loadData = async () => {
//       if (!address) return;
//       try {
//         apiService.setNetwork(isTestnet);
//         await connectWallet(address, domain || "");
//         console.log("🔄 Начинаем загрузку данных профиля...");
//         await fetchDomain();
//         await new Promise((r) => setTimeout(r, 500));
//         await fetchBalanceSimple();
//         await new Promise((r) => setTimeout(r, 500));
//         await loadAllData();
//         console.log("✅ Все данные профиля загружены");
//       } catch (error) {
//         console.error("❌ Ошибка загрузки:", error);
//       }
//     };
//     loadData();
//   }, [address, isTestnet]);

//   // ====== [KEEP] Периодический баланс ======
//   useEffect(() => {
//     if (!address) return;
//     fetchBalanceSimple();
//     const id = setInterval(fetchBalanceSimple, 15000);
//     return () => clearInterval(id);
//   }, [address]);

//   // Сброс индекса при смене таба / фильтров
//   useEffect(() => {
//     setSwipeIndex(0);
//   }, [activeTab, searchQuery, filters]);

//   // ====== [KEEP] СТАТУСЫ ======

//   const getZoneStatusInfo = (zone: any) => {
//     const isProxy =
//       zone.proxy === 1 ||
//       zone.proxy === "Proxy" ||
//       zone.proxy === "proxy" ||
//       zone.proxy === "1";
//     if (isProxy)
//       return {
//         status: "Infinity",
//         color: "#000000ff",
//         description: "Бесконечная зона",
//       };
//     return { status: "Active", color: "#4caf50", description: "Активная зона" };
//   };

//   const getSubdomainStatusInfo = (subdomain: Subdomain) => {
//     switch (subdomain.status) {
//       case "active":
//         return { status: "Active", color: "#4caf50", description: "Активный" };
//       case "inactive":
//         return {
//           status: "Inactive",
//           color: "#9ca3af",
//           description: "Неактивный",
//         };
//       case "auction":
//         return {
//           status: "Auction",
//           color: "#ff9800",
//           description: "На аукционе",
//         };
//       case "claimed":
//         return { status: "Claimed", color: "#3b82f6", description: "Получен" };
//       default:
//         return {
//           status: "Unknown",
//           color: "#9ca3af",
//           description: "Неизвестный",
//         };
//     }
//   };

//   const getZoneTypeInfo = (zone: Zone) => {
//     const zoneType = getZoneType(zone);
//     switch (zoneType) {
//       case "proxy":
//         return {
//           type: "proxy",
//           label: "🌐 Proxy",
//           color: "#4caf50",
//           description: "Общая зона",
//         };
//       case "sbt":
//         return {
//           type: "sbt",
//           label: "🔒 SBT",
//           color: "#3b82f6",
//           description: "Персональная зона",
//         };
//       default:
//         return {
//           type: "unknown",
//           label: "❓ Unknown",
//           color: "#9ca3af",
//           description: "Неизвестный",
//         };
//     }
//   };

//   /**
//    * Определяет SBT по типу итема (ItemType через code_hash).
//    * Раньше проверялось через getZoneType(subdomain.zone) — заменено.
//    */
//   const isSbtSubdomain = (subdomain: Subdomain): boolean => {
//     const itemType: ItemType = (subdomain as any).type || "proxy_subdomain";
//     return itemType === "sbt_subdomain";
//   };

//   // ====== [KEEP] ФИЛЬТРАЦИЯ ======

//   const getFilteredZones = () =>
//     getFilteredData("zones", getUserZones, searchQuery, filters, sortBy);
//   const getFilteredSubdomains = () =>
//     getFilteredData("subdomains", subdomains, searchQuery, filters, sortBy);
//   const getFilteredAuctions = () =>
//     getFilteredData("auctions", activeAuctions, searchQuery, filters, sortBy);

//   const refreshAllData = async () => {
//     if (!address) return;
//     try {
//       await Promise.all([refreshUser(), loadAllData(true)]);
//     } catch (e) {
//       console.error("❌ Ошибка обновления данных:", e);
//     }
//   };

//   // ====== [KEEP] СТИЛИ ======

//   const cardButtonStyle: React.CSSProperties = {
//     background: isDark ? colors.gold : colors.blue,
//     color: isDark ? "#000" : "#fff",
//     border: "none",
//     outline: "none",
//     padding: "10px 10px",
//     borderRadius: "4px",
//     fontSize: "12px",
//     fontWeight: "600",
//     fontFamily: "monospace",
//     textTransform: "uppercase",
//     letterSpacing: "0.5px",
//     boxShadow: `0 0 4px ${colors.shadow}`,
//     transition: "all 0.2s ease",
//     cursor: "pointer",
//     position: "relative",
//     overflow: "hidden",
//     textAlign: "center",
//     marginLeft: "4px",
//     flexShrink: 0,
//   };

//   const tabButtonStyle = (isActive: boolean): React.CSSProperties => ({
//     flex: 1,
//     padding: "10px 8px",
//     border: "none",
//     background: "none",
//     cursor: "pointer",
//     fontSize: "11px",
//     fontWeight: "600",
//     fontFamily: "monospace",
//     color: isActive ? colors.cyberpunk : colors.text,
//     borderBottom: isActive ? `2px solid ${colors.cyberpunk}` : "none",
//     transition: "all 0.3s",
//     textTransform: "uppercase",
//     letterSpacing: "0.5px",
//   });

//   const viewToggleBaseStyle: React.CSSProperties = {
//     background: "none",
//     border: `1px solid ${colors.border}`,
//     borderRadius: "4px",
//     color: colors.text,
//     cursor: "pointer",
//     padding: "5px",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     fontSize: "14px",
//     transition: "all 0.2s",
//     width: "28px",
//     height: "28px",
//   };

//   const viewToggleActiveStyle: React.CSSProperties = {
//     ...viewToggleBaseStyle,
//     background: colors.cyberpunk,
//     border: `1px solid ${colors.cyberpunk}`,
//     color: isDark ? "#000" : "#fff",
//   };

//   // ====================================================================
//   // РЕНДЕР-КАРТОЧКИ
//   // ====================================================================

//   const responsiveButtonStyle = (text: string): React.CSSProperties => {
//     const len = text.length;
//     const fontSize =
//       len > 16 ? "9px" : len > 12 ? "10px" : len > 8 ? "11px" : "12px";
//     return {
//       ...cardButtonStyle,
//       fontSize,
//       padding: "8px 6px",
//       whiteSpace: "nowrap" as const,
//       overflow: "hidden",
//       textOverflow: "ellipsis",
//     };
//   };

//   const renderZoneCard = (zone: Zone) => {
//     const zoneType = getZoneTypeInfo(zone);
//     const zoneStatus = getZoneStatusInfo(zone);

//     return (
//       <div
//         key={zone.id}
//         style={{
//           padding: "12px",
//           border: `1px solid ${colors.border}`,
//           borderRadius: "8px",
//           fontSize: "13px",
//           backgroundColor: colors.secondaryBg,
//           fontFamily: "monospace",
//           position: "relative" as const,
//         }}
//       >
//         {/* КАРТИНКА СЛЕВА + КОНТЕНТ СПРАВА */}
//         <div style={{ display: "flex", gap: "14px", marginBottom: "10px" }}>
//           {(zone as any).image && (
//             <div
//               style={{
//                 width: "120px",
//                 height: "120px",
//                 borderRadius: "8px",
//                 overflow: "hidden",
//                 flexShrink: 0,
//                 backgroundColor: colors.background,
//               }}
//             >
//               <img
//                 src={(zone as any).image}
//                 alt={zone.name}
//                 style={{ width: "100%", height: "100%", objectFit: "contain" }}
//                 onError={(e) => {
//                   (e.currentTarget as HTMLImageElement).style.display = "none";
//                 }}
//               />
//             </div>
//           )}

//           <div
//             style={{
//               flex: 1,
//               minWidth: 0,
//               display: "flex",
//               flexDirection: "column",
//               gap: "6px",
//             }}
//           >
//             <div
//               style={{
//                 fontWeight: "600",
//                 color: colors.text,
//                 fontSize: "16px",
//                 wordBreak: "break-word",
//               }}
//             >
//               .{zone.name}
//             </div>

//             <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
//               <div
//                 style={{
//                   padding: "3px 8px",
//                   borderRadius: "4px",
//                   backgroundColor: zoneType.color,
//                   color: "white",
//                   fontSize: "10px",
//                   fontWeight: "600",
//                 }}
//               >
//                 {zoneType.label}
//               </div>
//               <div
//                 style={{
//                   padding: "3px 8px",
//                   borderRadius: "4px",
//                   backgroundColor: zoneStatus.color,
//                   color: "white",
//                   fontSize: "10px",
//                   fontWeight: "600",
//                 }}
//               >
//                 {zoneStatus.status}
//               </div>
//             </div>

//             <div>
//               <p
//                 style={{
//                   margin: "2px 0",
//                   color: colors.text,
//                   opacity: 0.7,
//                   fontSize: "11px",
//                 }}
//               >
//                 {t("created")}: {new Date(zone.createdAt).toLocaleDateString()}
//               </p>
//               <p
//                 style={{
//                   margin: "2px 0",
//                   color: colors.text,
//                   opacity: 0.7,
//                   fontSize: "11px",
//                 }}
//               >
//                 {t("subdomainsAmount")}: {zone.subdomainsAmount}
//               </p>
//               {zone.collectionAddress && (
//                 <p
//                   style={{
//                     margin: "2px 0",
//                     color: colors.text,
//                     opacity: 0.7,
//                     fontSize: "11px",
//                   }}
//                 >
//                   {t("marketCollection")}:{" "}
//                   <a
//                     href={createTonViewerLink(zone.collectionAddress)}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     style={{ color: colors.link, textDecoration: "none" }}
//                     onMouseOver={(e) =>
//                       (e.currentTarget.style.textDecoration = "underline")
//                     }
//                     onMouseOut={(e) =>
//                       (e.currentTarget.style.textDecoration = "none")
//                     }
//                   >
//                     {zone.collectionAddress.slice(0, 4)}...
//                     {zone.collectionAddress.slice(-4)}
//                   </a>
//                 </p>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* КНОПКИ: ряд 1 + ряд 2 */}
//         {zone.status !== "inactive" && (
//           <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
//             {/* Ряд 1 */}
//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "1fr 1fr",
//                 gap: "8px",
//               }}
//             >
//               <button
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   handleAddSubdomain();
//                 }}
//                 style={responsiveButtonStyle(
//                   t("createSubdomain") || "Сделать субдомен"
//                 )}
//               >
//                 {t("createSubdomain") || "Сделать субдомен"}
//               </button>
//               <button
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   handleManage();
//                 }}
//                 style={responsiveButtonStyle(
//                   t("manageDomain") || "Управлять доменом"
//                 )}
//               >
//                 {t("manageDomain") || "Управлять доменом"}
//               </button>
//             </div>

//             {/* Ряд 2 */}
//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "1fr 1fr",
//                 gap: "8px",
//               }}
//             >
//               <button
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   setIsExpanded(false);
//                   setTimeout(() => {
//                     window.open(
//                       "https://t.me/Ton_site_builder_bot?startapp",
//                       "_blank"
//                     );
//                   }, 300);
//                 }}
//                 style={responsiveButtonStyle("Создать сайт")}
//               >
//                 Создать сайт
//               </button>
//               <button
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   setSoonModalOpen(true);
//                 }}
//                 style={responsiveButtonStyle("Аватар / Секрет")}
//               >
//                 Аватар / Секрет
//               </button>
//             </div>
//           </div>
//         )}
//       </div>
//     );
//   };

//   const renderSubdomainCard = (subdomain: Subdomain) => {
//     const statusInfo = getSubdomainStatusInfo(subdomain);
//     const isSbt = isSbtSubdomain(subdomain);
//     const imgUri = getSubdomainImage(subdomain);
//     const isAuction = activeAuctions.some(
//       (a) => a.subdomain?.id === subdomain.id
//     );
//     const effectiveStatus = isAuction ? "auction" : subdomain.status;

//     return (
//       <div
//         key={subdomain.id}
//         style={{
//           padding: "12px",
//           border: `1px solid ${colors.border}`,
//           borderRadius: "8px",
//           fontSize: "13px",
//           backgroundColor: colors.secondaryBg,
//           fontFamily: "monospace",
//           position: "relative" as const,
//         }}
//       >
//         {/* КАРТИНКА + КОНТЕНТ */}
//         <div style={{ display: "flex", gap: "14px", marginBottom: "10px" }}>
//           {imgUri && (
//             <div
//               style={{
//                 width: "120px",
//                 height: "120px",
//                 borderRadius: "8px",
//                 overflow: "hidden",
//                 flexShrink: 0,
//                 backgroundColor: colors.background,
//               }}
//             >
//               <img
//                 src={imgUri}
//                 alt={subdomain.name}
//                 style={{ width: "100%", height: "100%", objectFit: "contain" }}
//                 onError={(e) => {
//                   (e.currentTarget as HTMLImageElement).style.display = "none";
//                 }}
//               />
//             </div>
//           )}

//           <div
//             style={{
//               flex: 1,
//               minWidth: 0,
//               display: "flex",
//               flexDirection: "column",
//               gap: "6px",
//             }}
//           >
//             <div
//               style={{
//                 fontWeight: "600",
//                 color: colors.text,
//                 fontSize: "16px",
//                 wordBreak: "break-word",
//               }}
//             >
//               {subdomain.name}
//             </div>

//             <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
//               {isSbt && (
//                 <div
//                   style={{
//                     padding: "3px 8px",
//                     borderRadius: "4px",
//                     backgroundColor: "#3b82f6",
//                     color: "white",
//                     fontSize: "10px",
//                     fontWeight: "600",
//                   }}
//                 >
//                   🔒 SBT
//                 </div>
//               )}
//               <div
//                 style={{
//                   padding: "3px 8px",
//                   borderRadius: "4px",
//                   backgroundColor:
//                     effectiveStatus === "auction"
//                       ? "#ff9800"
//                       : statusInfo.color,
//                   color: "white",
//                   fontSize: "10px",
//                   fontWeight: "600",
//                 }}
//               >
//                 {effectiveStatus === "auction" ? "Auction" : statusInfo.status}
//               </div>
//             </div>

//             <div>
//               <p
//                 style={{
//                   margin: "2px 0",
//                   color: colors.text,
//                   opacity: 0.7,
//                   fontSize: "11px",
//                 }}
//               >
//                 {t("created")}:{" "}
//                 {new Date(subdomain.createdAt).toLocaleDateString()}
//               </p>
//               {subdomain.zoneId && (
//                 <p
//                   style={{
//                     margin: "2px 0",
//                     color: colors.text,
//                     opacity: 0.7,
//                     fontSize: "11px",
//                   }}
//                 >
//                   {t("zoneId")}: {subdomain.zoneId}
//                 </p>
//               )}
//               {subdomain.address && (
//                 <p
//                   style={{
//                     margin: "2px 0",
//                     color: colors.text,
//                     opacity: 0.7,
//                     fontSize: "11px",
//                   }}
//                 >
//                   {t("address")}:{" "}
//                   <a
//                     href={createTonViewerLink(subdomain.address)}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     style={{ color: colors.link, textDecoration: "none" }}
//                     onMouseOver={(e) =>
//                       (e.currentTarget.style.textDecoration = "underline")
//                     }
//                     onMouseOut={(e) =>
//                       (e.currentTarget.style.textDecoration = "none")
//                     }
//                   >
//                     {subdomain.address.slice(0, 4)}...
//                     {subdomain.address.slice(-4)}
//                   </a>
//                 </p>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* КНОПКИ */}
//         {effectiveStatus === "auction" && (
//           <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "1fr 1fr",
//                 gap: "8px",
//               }}
//             >
//               <div />
//               <button
//                 onClick={() => handleGoToAuction(subdomain.name)}
//                 style={responsiveButtonStyle(t("goTo") || "Перейти")}
//               >
//                 {t("goTo")}
//               </button>
//             </div>
//           </div>
//         )}

//         {effectiveStatus !== "auction" && effectiveStatus !== "inactive" && (
//           <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
//             {/* Ряд 1: Продать (только proxy) + Управлять */}
//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "1fr 1fr",
//                 gap: "8px",
//               }}
//             >
//               {!isSbt ? (
//                 <button
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     handleMarket();
//                   }}
//                   style={responsiveButtonStyle(t("sell") || "Продать")}
//                 >
//                   {t("sell")}
//                 </button>
//               ) : (
//                 <div />
//               )}
//               <button
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   handleManage();
//                 }}
//                 style={responsiveButtonStyle(t("manage") || "Управлять")}
//               >
//                 {t("manage")}
//               </button>
//             </div>

//             {/* Ряд 2: Создать сайт + Аватар/Секрет */}
//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "1fr 1fr",
//                 gap: "8px",
//               }}
//             >
//               <button
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   setIsExpanded(false);
//                   setTimeout(() => {
//                     window.open(
//                       "https://t.me/Ton_site_builder_bot?startapp",
//                       "_blank"
//                     );
//                   }, 300);
//                 }}
//                 style={responsiveButtonStyle("Создать сайт")}
//               >
//                 Создать сайт
//               </button>
//               <button
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   setSoonModalOpen(true);
//                 }}
//                 style={responsiveButtonStyle("Аватар / Секрет")}
//               >
//                 Аватар / Секрет
//               </button>
//             </div>
//           </div>
//         )}
//       </div>
//     );
//   };

//   // === renderAuctionCard (без существенных изменений) ===
//   const renderAuctionCard = (auction: Auction, idx: number) => {
//     const endDate = new Date(auction.ends);
//     const now = new Date();
//     const isEnded = endDate < now;
//     const formatDate = (date: Date) =>
//       date.toLocaleDateString("ru-RU", {
//         day: "2-digit",
//         month: "2-digit",
//         year: "numeric",
//         hour: "2-digit",
//         minute: "2-digit",
//       });

//     return (
//       <div
//         key={idx}
//         style={{
//           padding: "12px",
//           border: `1px solid ${colors.border}`,
//           borderRadius: "8px",
//           fontSize: "13px",
//           backgroundColor: colors.secondaryBg,
//           fontFamily: "monospace",
//           position: "relative" as const,
//         }}
//       >
//         <div style={{ display: "flex", gap: "14px", marginBottom: "10px" }}>
//           {auction.subdomain && getSubdomainImage(auction.subdomain) && (
//             <div
//               style={{
//                 width: "80px",
//                 height: "80px",
//                 borderRadius: "8px",
//                 overflow: "hidden",
//                 flexShrink: 0,
//                 backgroundColor: colors.background,
//               }}
//             >
//               <img
//                 src={getSubdomainImage(auction.subdomain)}
//                 alt={auction.name}
//                 style={{ width: "100%", height: "100%", objectFit: "contain" }}
//                 onError={(e) => {
//                   (e.currentTarget as HTMLImageElement).style.display = "none";
//                 }}
//               />
//             </div>
//           )}
//           <div
//             style={{
//               flex: 1,
//               minWidth: 0,
//               display: "flex",
//               flexDirection: "column",
//               gap: "6px",
//             }}
//           >
//             <div
//               style={{
//                 display: "flex",
//                 gap: 8,
//                 alignItems: "center",
//                 flexWrap: "wrap",
//               }}
//             >
//               <div
//                 style={{
//                   fontWeight: "600",
//                   color: colors.text,
//                   fontSize: "16px",
//                 }}
//               >
//                 {auction.name}
//               </div>
//               <div
//                 style={{
//                   padding: "3px 8px",
//                   borderRadius: "4px",
//                   backgroundColor: colors.cyberpunk,
//                   color: isDark ? "black" : "white",
//                   fontSize: "10px",
//                   fontWeight: "600",
//                 }}
//               >
//                 {auction.bid}
//               </div>
//             </div>
//             <div>
//               <p
//                 style={{
//                   margin: "2px 0",
//                   color: isEnded ? colors.text : colors.cyberpunk,
//                   opacity: 0.7,
//                   fontSize: "11px",
//                 }}
//               >
//                 {isEnded ? `${t("ended")}` : `${t("ends")}`}:{" "}
//                 {formatDate(endDate)}
//               </p>
//               {auction.lastBidder && (
//                 <p
//                   style={{
//                     margin: "2px 0",
//                     color: colors.text,
//                     opacity: 0.7,
//                     fontSize: "11px",
//                   }}
//                 >
//                   {t("bidder")}:{" "}
//                   <a
//                     href={createTonViewerLink(auction.lastBidder)}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     style={{ color: colors.link, textDecoration: "none" }}
//                     onMouseOver={(e) =>
//                       (e.currentTarget.style.textDecoration = "underline")
//                     }
//                     onMouseOut={(e) =>
//                       (e.currentTarget.style.textDecoration = "none")
//                     }
//                   >
//                     {auction.lastBidder.slice(0, 6)}...
//                     {auction.lastBidder.slice(-4)}
//                   </a>
//                 </p>
//               )}
//             </div>
//           </div>
//         </div>

//         <div style={{ display: "flex", gap: "8px" }}>
//           {checkAuctionTimerEnd(new Date(auction.ends)) ? (
//             <button
//               onClick={() => handleGoToAuction(auction.name)}
//               style={responsiveButtonStyle(t("take") || "Забрать")}
//             >
//               {t("take")}
//             </button>
//           ) : (
//             <button
//               onClick={() => handleGoToAuction(auction.name)}
//               style={responsiveButtonStyle(t("goTo") || "Перейти")}
//             >
//               {t("goTo")}
//             </button>
//           )}
//         </div>
//       </div>
//     );
//   };

//   // ====== SWIPE ======
//   const getSwipeItems = (): {
//     items: any[];
//     renderer: (item: any, idx: number) => JSX.Element;
//   } => {
//     if (activeTab === "zones")
//       return {
//         items: getFilteredZones(),
//         renderer: (item) => renderZoneCard(item),
//       };
//     if (activeTab === "subdomains")
//       return {
//         items: getFilteredSubdomains(),
//         renderer: (item) => renderSubdomainCard(item),
//       };
//     if (activeTab === "auctions")
//       return {
//         items: getFilteredAuctions(),
//         renderer: (item, idx) => renderAuctionCard(item, idx),
//       };
//     return { items: [], renderer: () => <></> };
//   };

//   const { items: swipeItems, renderer: swipeRenderer } = getSwipeItems();

//   // ====================================================================
//   // RENDER
//   // ====================================================================
//   return (
//     <>
//       {/* Кнопка открытия */}
//       {!isExpanded && (
//         <div
//           onClick={() => setIsExpanded(true)}
//           style={{
//             position: "fixed",
//             bottom: "80px",
//             left: "20px",
//             width: "60px",
//             height: "60px",
//             borderRadius: "50%",
//             background: colors.primary,
//             boxShadow: `0 4px 12px ${colors.shadow}`,
//             cursor: "pointer",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             zIndex: 998,
//             transition: "all 0.3s ease",
//           }}
//           onMouseOver={(e) => {
//             e.currentTarget.style.transform = "scale(1.1)";
//             e.currentTarget.style.boxShadow = `0 6px 20px ${colors.shadow}`;
//           }}
//           onMouseOut={(e) => {
//             e.currentTarget.style.transform = "scale(1)";
//             e.currentTarget.style.boxShadow = `0 4px 12px ${colors.shadow}`;
//           }}
//           title="Профиль"
//         >
//           <svg
//             width="32"
//             height="32"
//             viewBox="0 0 24 24"
//             fill="none"
//             stroke={isDark ? "black" : "white"}
//             strokeWidth="2"
//             strokeLinecap="round"
//             strokeLinejoin="round"
//           >
//             <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
//             <circle cx="12" cy="7" r="4"></circle>
//           </svg>
//         </div>
//       )}

//       {/* ПАНЕЛЬ */}
//       <div
//         style={{
//           position: "fixed",
//           bottom: "20px",
//           left: isExpanded ? "15px" : "calc(15px - 420px)",
//           transition: "left 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
//           width: "min(400px, calc(100% - 30px))",
//           height: "100%",
//           minHeight: "200px",
//           maxHeight: "95vh",
//           backgroundColor: colors.background,
//           borderRadius: "12px",
//           boxShadow: "0 5px 40px rgba(0, 0, 0, 0.2)",
//           zIndex: 999,
//           display: "flex",
//           flexDirection: "column",
//           overflow: "hidden",
//           border: `1px solid ${colors.border}`,
//         }}
//       >
//         {/* HEADER */}
//         <div
//           style={{
//             display: "flex",
//             justifyContent: "space-between",
//             alignItems: "center",
//             padding: "12px 12px",
//             background: colors.primary,
//             color: isDark ? "black" : "white",
//             borderBottom: `1px solid ${colors.border}`,
//           }}
//         >
//           <div>
//             <h3
//               style={{
//                 margin: "0 0 4px 0",
//                 fontSize: "16px",
//                 fontFamily: "monospace",
//               }}
//             >
//               👤 {t("profile")}
//             </h3>
//             <div
//               className="addressModeRow"
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 gap: "8px",
//               }}
//             >
//               <p style={{ margin: 0, fontSize: "12px", opacity: 0.9 }}>
//                 {address
//                   ? `${t("connected")}: ${address.slice(
//                       0,
//                       6
//                     )}...${address.slice(-4)}`
//                   : t("connectWalletForHistory")}
//               </p>
//               {wallet && (
//                 <div
//                   style={{
//                     fontSize: "11px",
//                     fontWeight: "700",
//                     padding: "4px 8px",
//                     borderRadius: "6px",
//                     background: isTestnet ? "#f59e0b" : "#10b981",
//                     color: "#fff",
//                     display: "flex",
//                     alignItems: "center",
//                     gap: "4px",
//                     textTransform: "uppercase",
//                     letterSpacing: "0.5px",
//                   }}
//                 >
//                   <span style={{ fontSize: "10px" }}>
//                     {isTestnet ? "🟡" : "🟢"}
//                   </span>
//                   <span>{isTestnet ? "Testnet" : "Mainnet"}</span>
//                 </div>
//               )}
//             </div>
//           </div>
//           <button
//             onClick={() => setIsExpanded(false)}
//             style={{
//               background: "none",
//               border: "none",
//               color: isDark ? "black" : "white",
//               fontSize: "24px",
//               cursor: "pointer",
//               padding: "0",
//               width: "32px",
//               height: "32px",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               transition: "transform 0.2s",
//             }}
//             title="Закрыть"
//             onMouseOver={(e) =>
//               (e.currentTarget.style.transform = "scale(1.2)")
//             }
//             onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
//           >
//             ✕
//           </button>
//         </div>

//         {/* CONTENT */}
//         <div
//           style={{
//             padding: "16px 16px",
//             display: "flex",
//             flexDirection: "column",
//             gap: "12px",
//             flex: 1,
//             minHeight: 0,
//             overflow: "hidden",
//           }}
//         >
//           {/* user info */}
//           <div
//             style={{
//               display: "flex",
//               justifyContent: "space-between",
//               alignItems: "flex-start",
//               gap: "10px",
//             }}
//           >
//             <div
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "flex-start",
//                 gap: "16px",
//                 flex: 1,
//               }}
//             >
//               <div
//                 style={{
//                   width: "50px",
//                   height: "50px",
//                   borderRadius: "50%",
//                   background: colors.primary,
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   boxShadow: `0 4px 12px ${colors.shadow}`,
//                 }}
//               >
//                 <svg
//                   width="33"
//                   height="33"
//                   viewBox="0 0 24 24"
//                   fill={isDark ? "black" : "white"}
//                   stroke={isDark ? "black" : "white"}
//                   strokeWidth="1.5"
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                 >
//                   <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
//                   <circle cx="12" cy="7" r="4"></circle>
//                 </svg>
//               </div>
//               <div
//                 className="domainAndBalance"
//                 style={{
//                   display: "flex",
//                   flexDirection: "column",
//                   alignItems: "flex-start",
//                   justifyContent: "center",
//                 }}
//               >
//                 <p
//                   style={{
//                     margin: "0",
//                     fontSize: "16px",
//                     fontWeight: "600",
//                     color: colors.text,
//                     fontFamily: "monospace",
//                   }}
//                 >
//                   {address ? `${domain || "Connected"}` : ""}
//                 </p>
//                 <div
//                   className="amountWithLogo"
//                   style={{
//                     display: "flex",
//                     justifyContent: "center",
//                     alignItems: "center",
//                     gap: "4px",
//                   }}
//                 >
//                   <p
//                     style={{
//                       margin: "0",
//                       fontSize: "14px",
//                       fontWeight: "300",
//                       color: colors.text,
//                       fontFamily: "monospace",
//                     }}
//                   >
//                     {address ? formatBalance(balance) : `${t("guest")}`}
//                   </p>
//                   {address ? (
//                     <img
//                       src={TonLogo}
//                       alt="TON"
//                       style={{ width: "16px", height: "16px" }}
//                     />
//                   ) : (
//                     ""
//                   )}
//                 </div>
//               </div>
//             </div>
//             <div
//               style={{
//                 display: "flex",
//                 flexDirection: "column",
//                 gap: "12px",
//                 flex: 1,
//                 alignItems: "center",
//               }}
//             >
//               <TonConnectButton />
//             </div>
//           </div>

//           {address ? (
//             <>
//               {/* TABS */}
//               <div
//                 style={{
//                   width: "100%",
//                   display: "flex",
//                   gap: "4px",
//                   borderBottom: `1px solid ${colors.border}`,
//                 }}
//               >
//                 <button
//                   onClick={() => setActiveTab("zones")}
//                   style={tabButtonStyle(activeTab === "zones")}
//                 >
//                   🌐 {t("zones")}
//                 </button>
//                 <button
//                   onClick={() => setActiveTab("subdomains")}
//                   style={tabButtonStyle(activeTab === "subdomains")}
//                 >
//                   🔗 {t("subdomains")}
//                 </button>
//                 <button
//                   onClick={() => setActiveTab("auctions")}
//                   style={tabButtonStyle(activeTab === "auctions")}
//                 >
//                   ⚡ {t("auctions")}
//                 </button>
//                 <button
//                   onClick={() => setActiveTab("info")}
//                   style={tabButtonStyle(activeTab === "info")}
//                 >
//                   ℹ️ {t("info")}
//                 </button>
//               </div>

//               {/* FILTERS + VIEW TOGGLE */}
//               {activeTab !== "info" && (
//                 <div
//                   style={{
//                     display: "flex",
//                     justifyContent: "space-between",
//                     alignItems: "center",
//                     padding: "0 4px",
//                     position: "relative",
//                     zIndex: 100,
//                   }}
//                 >
//                   {/* Кнопка фильтра */}
//                   <div style={{ position: "relative" }}>
//                     <button
//                       onClick={() => setFiltersOpen(!filtersOpen)}
//                       title={t("filters") || "Фильтры"}
//                       style={{
//                         background: filtersOpen
//                           ? `rgba(${isDark ? "255,215,0" : "59,130,246"}, 0.15)`
//                           : "none",
//                         border: `1px solid ${
//                           filtersOpen ? colors.cyberpunk : colors.border
//                         }`,
//                         borderRadius: "6px",
//                         color: filtersOpen ? colors.cyberpunk : colors.text,
//                         cursor: "pointer",
//                         padding: "6px 10px",
//                         display: "flex",
//                         alignItems: "center",
//                         gap: "6px",
//                         fontSize: "12px",
//                         fontFamily: "monospace",
//                         transition: "all 0.2s",
//                       }}
//                     >
//                       <svg
//                         width="14"
//                         height="14"
//                         viewBox="0 0 24 24"
//                         fill="none"
//                         stroke="currentColor"
//                         strokeWidth="2"
//                         strokeLinecap="round"
//                         strokeLinejoin="round"
//                       >
//                         <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
//                       </svg>
//                       {t("filters") || "Filter"}
//                     </button>

//                     {/* Дропдаун фильтров */}
//                     {filtersOpen && (
//                       <>
//                         <div
//                           onClick={() => setFiltersOpen(false)}
//                           style={{
//                             position: "fixed",
//                             top: 0,
//                             left: 0,
//                             right: 0,
//                             bottom: 0,
//                             zIndex: 997,
//                           }}
//                         />
//                         <div
//                           style={{
//                             position: "absolute",
//                             top: "100%",
//                             left: 0,
//                             marginTop: "8px",
//                             zIndex: 998,
//                             width: "320px",
//                             maxWidth: "calc(100vw - 80px)",
//                             background: colors.dropdownBg,
//                             border: `1px solid ${colors.dropdownBorder}`,
//                             borderRadius: "8px",
//                             boxShadow: `0 8px 30px ${colors.shadow}`,
//                             padding: "12px",
//                           }}
//                         >
//                           <SearchAndFilters
//                             searchQuery={searchQuery}
//                             setSearchQuery={setSearchQuery}
//                             filters={filters}
//                             setFilters={setFilters}
//                             sortBy={sortBy}
//                             setSortBy={setSortBy}
//                             activeTab={activeTab}
//                             colors={colors}
//                             isDark={isDark}
//                           />
//                         </div>
//                       </>
//                     )}
//                   </div>

//                   {/* Счётчик + переключатели вида */}
//                   <div
//                     style={{
//                       display: "flex",
//                       alignItems: "center",
//                       gap: "8px",
//                     }}
//                   >
//                     <span
//                       style={{
//                         fontSize: "11px",
//                         color: colors.text,
//                         opacity: 0.7,
//                         fontFamily: "monospace",
//                       }}
//                     >
//                       {activeTab === "zones" &&
//                         `${getFilteredZones().length}/${getUserZones.length}`}
//                       {activeTab === "subdomains" &&
//                         `${getFilteredSubdomains().length}/${
//                           subdomains.length
//                         }`}
//                       {activeTab === "auctions" &&
//                         `${getFilteredAuctions().length}/${
//                           activeAuctions.length
//                         }`}
//                     </span>
//                     <button
//                       onClick={() => setCardView("list")}
//                       style={
//                         cardView === "list"
//                           ? viewToggleActiveStyle
//                           : viewToggleBaseStyle
//                       }
//                       title={t("listView") || "Список"}
//                     >
//                       <svg
//                         width="14"
//                         height="14"
//                         viewBox="0 0 24 24"
//                         fill="none"
//                         stroke="currentColor"
//                         strokeWidth="2"
//                       >
//                         <line x1="8" y1="6" x2="21" y2="6" />
//                         <line x1="8" y1="12" x2="21" y2="12" />
//                         <line x1="8" y1="18" x2="21" y2="18" />
//                         <line x1="3" y1="6" x2="3.01" y2="6" />
//                         <line x1="3" y1="12" x2="3.01" y2="12" />
//                         <line x1="3" y1="18" x2="3.01" y2="18" />
//                       </svg>
//                     </button>
//                     <button
//                       onClick={() => setCardView("swipe")}
//                       style={
//                         cardView === "swipe"
//                           ? viewToggleActiveStyle
//                           : viewToggleBaseStyle
//                       }
//                       title={t("swipeView") || "Лента"}
//                     >
//                       <svg
//                         width="14"
//                         height="14"
//                         viewBox="0 0 24 24"
//                         fill="none"
//                         stroke="currentColor"
//                         strokeWidth="2"
//                       >
//                         <rect x="2" y="4" width="20" height="16" rx="2" />
//                         <polygon points="10 8 6 12 10 16" />
//                         <polygon points="14 8 18 12 14 16" />
//                       </svg>
//                     </button>
//                   </div>
//                 </div>
//               )}

//               {/* LIST VIEW */}

//               {cardView === "list" && (
//                 <>
//                   {/* ЗОНЫ */}
//                   {activeTab === "zones" && (
//                     <div
//                       style={{
//                         display: "flex",
//                         flexDirection: "column",
//                         gap: "12px",
//                         overflowY: "auto",
//                         flex: 1,
//                         minHeight: 0,
//                         paddingRight: "6px",
//                       }}
//                     >
//                       {blockchainLoading ? (
//                         <div
//                           style={{
//                             flex: 1,
//                             display: "flex",
//                             flexDirection: "column",
//                             alignItems: "center",
//                             justifyContent: "center",
//                             padding: "20px",
//                             color: colors.text,
//                             fontFamily: "monospace",
//                           }}
//                         >
//                           <img
//                             src={searchDog}
//                             alt="Loading"
//                             style={{ width: 100, height: 100 }}
//                           />
//                           <div style={{ fontSize: 16, marginTop: 12 }}>
//                             {t("loadingZones") || "Загрузка данных..."}
//                           </div>
//                           <div
//                             style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}
//                           >
//                             {t("pleaseWait") || "Пожалуйста, подождите"}
//                           </div>
//                         </div>
//                       ) : blockchainError ? (
//                         <div
//                           style={{
//                             textAlign: "center",
//                             padding: "20px",
//                             color: "#f87171",
//                           }}
//                         >
//                           <p>
//                             {t("error")}: {blockchainError}
//                           </p>
//                         </div>
//                       ) : getFilteredZones().length === 0 ? (
//                         <div
//                           style={{
//                             textAlign: "center",
//                             padding: "20px",
//                             color: colors.text,
//                             opacity: 0.7,
//                           }}
//                         >
//                           <p>
//                             {searchQuery || filters.zoneLengths.length > 0
//                               ? t("noZonesMatchingFilters")
//                               : t("noZones")}
//                           </p>
//                           <button
//                             onClick={() =>
//                               (window.location.href = "#/create-collection")
//                             }
//                             style={{
//                               background: colors.primary,
//                               color: isDark ? "#000" : "#fff",
//                               border: "none",
//                               outline: "none",
//                               padding: "8px 16px",
//                               borderRadius: "6px",
//                               fontSize: "12px",
//                               fontWeight: "600",
//                               fontFamily: "monospace",
//                               textTransform: "uppercase",
//                               letterSpacing: "0.5px",
//                               boxShadow: `0 0 8px ${colors.shadow}`,
//                               transition: "all 0.3s ease",
//                               cursor: "pointer",
//                               marginTop: "10px",
//                             }}
//                           >
//                             {t("createFirstZone")}
//                           </button>
//                         </div>
//                       ) : (
//                         getFilteredZones().map((zone) => renderZoneCard(zone))
//                       )}
//                     </div>
//                   )}

//                   {/* СУБДОМЕНЫ */}
//                   {activeTab === "subdomains" && (
//                     <div
//                       style={{
//                         display: "flex",
//                         flexDirection: "column",
//                         gap: "12px",
//                         overflowY: "auto",
//                         flex: 1,
//                         minHeight: 0,
//                         paddingRight: "6px",
//                       }}
//                     >
//                       {blockchainLoading ? (
//                         <div
//                           style={{
//                             flex: 1,
//                             display: "flex",
//                             flexDirection: "column",
//                             alignItems: "center",
//                             justifyContent: "center",
//                             padding: "20px",
//                             color: colors.text,
//                             fontFamily: "monospace",
//                           }}
//                         >
//                           <img
//                             src={searchDog}
//                             alt="Loading"
//                             style={{ width: 100, height: 100 }}
//                           />
//                           <div style={{ fontSize: 16, marginTop: 12 }}>
//                             {t("loadingSubdomains") || "Загрузка данных..."}
//                           </div>
//                           <div
//                             style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}
//                           >
//                             {t("pleaseWait") || "Пожалуйста, подождите"}
//                           </div>
//                         </div>
//                       ) : blockchainError ? (
//                         <div
//                           style={{
//                             textAlign: "center",
//                             padding: "20px",
//                             color: "#f87171",
//                           }}
//                         >
//                           <p>
//                             {t("error")}: {blockchainError}
//                           </p>
//                         </div>
//                       ) : getFilteredSubdomains().length === 0 ? (
//                         <div
//                           style={{
//                             textAlign: "center",
//                             padding: "20px",
//                             color: colors.text,
//                             opacity: 0.7,
//                           }}
//                         >
//                           <p>
//                             {searchQuery ||
//                             filters.zoneLengths.length > 0 ||
//                             filters.subdomainLengths.length > 0
//                               ? t("noSubdomainsMatchingFilters")
//                               : t("noSubdomains")}
//                           </p>
//                           <button
//                             onClick={() =>
//                               (window.location.href = "#/add-subdomain")
//                             }
//                             style={{
//                               background: colors.primary,
//                               color: isDark ? "#000" : "#fff",
//                               border: "none",
//                               outline: "none",
//                               padding: "8px 16px",
//                               borderRadius: "6px",
//                               fontSize: "12px",
//                               fontWeight: "600",
//                               fontFamily: "monospace",
//                               textTransform: "uppercase",
//                               letterSpacing: "0.5px",
//                               boxShadow: `0 0 8px ${colors.shadow}`,
//                               transition: "all 0.3s ease",
//                               cursor: "pointer",
//                               marginTop: "10px",
//                             }}
//                           >
//                             {t("createFirstSubdomain")}
//                           </button>
//                         </div>
//                       ) : (
//                         getFilteredSubdomains().map((subdomain) =>
//                           renderSubdomainCard(subdomain)
//                         )
//                       )}
//                     </div>
//                   )}

//                   {/* АУКЦИОНЫ */}
//                   {activeTab === "auctions" && (
//                     <div
//                       style={{
//                         display: "flex",
//                         flexDirection: "column",
//                         gap: "12px",
//                         overflowY: "auto",
//                         flex: 1,
//                         minHeight: 0,
//                         paddingRight: "6px",
//                       }}
//                     >
//                       {auctionsLoading ? (
//                         <div
//                           style={{
//                             flex: 1,
//                             display: "flex",
//                             flexDirection: "column",
//                             alignItems: "center",
//                             justifyContent: "center",
//                             padding: "20px",
//                             color: colors.text,
//                             fontFamily: "monospace",
//                           }}
//                         >
//                           <img
//                             src={searchDog}
//                             alt="Loading"
//                             style={{ width: 100, height: 100 }}
//                           />
//                           <div style={{ fontSize: 16, marginTop: 12 }}>
//                             {t("loadingAuctions") || "Загрузка данных..."}
//                           </div>
//                           <div
//                             style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}
//                           >
//                             {t("pleaseWait") || "Пожалуйста, подождите"}
//                           </div>
//                         </div>
//                       ) : getFilteredAuctions().length === 0 ? (
//                         <div
//                           style={{
//                             textAlign: "center",
//                             padding: "20px",
//                             color: colors.text,
//                             opacity: 0.7,
//                           }}
//                         >
//                           <p>
//                             {searchQuery
//                               ? t("noAuctionsMatchingFilters")
//                               : t("noAuctions")}
//                           </p>
//                           <button
//                             onClick={() =>
//                               (window.location.href = "/add-subdomain")
//                             }
//                             style={{
//                               background: colors.primary,
//                               color: isDark ? "#000" : "#fff",
//                               border: "none",
//                               outline: "none",
//                               padding: "8px 16px",
//                               borderRadius: "6px",
//                               fontSize: "12px",
//                               fontWeight: "600",
//                               fontFamily: "monospace",
//                               textTransform: "uppercase",
//                               letterSpacing: "0.5px",
//                               boxShadow: `0 0 8px ${colors.shadow}`,
//                               transition: "all 0.3s ease",
//                               cursor: "pointer",
//                               marginTop: "10px",
//                             }}
//                           >
//                             {t("createAuction")}
//                           </button>
//                         </div>
//                       ) : (
//                         getFilteredAuctions().map((auction, idx) =>
//                           renderAuctionCard(auction, idx)
//                         )
//                       )}
//                     </div>
//                   )}
//                 </>
//               )}

//               {/* SWIPE VIEW */}
//               {activeTab !== "info" && cardView === "swipe" && (
//                 <div
//                   style={{
//                     display: "flex",
//                     flexDirection: "column",
//                     alignItems: "center",
//                     flex: 1,
//                     minHeight: 0,
//                     overflow: "hidden",
//                     position: "relative",
//                   }}
//                 >
//                   {swipeItems.length === 0 ? (
//                     <div
//                       style={{
//                         textAlign: "center",
//                         padding: "20px",
//                         color: colors.text,
//                         opacity: 0.7,
//                         marginTop: "40px",
//                       }}
//                     >
//                       <p>{t("noItems") || "Нет элементов для отображения"}</p>
//                     </div>
//                   ) : (
//                     <>
//                       <div
//                         style={{
//                           flex: 1,
//                           display: "flex",
//                           alignItems: "center",
//                           justifyContent: "center",
//                           width: "100%",
//                           overflow: "hidden",
//                           position: "relative",
//                         }}
//                       >
//                         {swipeItems.length > 1 && (
//                           <button
//                             onClick={() =>
//                               setSwipeIndex(
//                                 (prev) =>
//                                   (prev - 1 + swipeItems.length) %
//                                   swipeItems.length
//                               )
//                             }
//                             style={{
//                               position: "absolute",
//                               left: 0,
//                               top: "50%",
//                               transform: "translateY(-50%)",
//                               background: "none",
//                               border: "none",
//                               color: colors.cyberpunk,
//                               fontSize: "28px",
//                               cursor: "pointer",
//                               zIndex: 10,
//                               padding: "8px",
//                             }}
//                           >
//                             ◀
//                           </button>
//                         )}

//                         <div
//                           style={{
//                             width: "90%",
//                             maxWidth: "340px",
//                             transition: "transform 0.3s ease",
//                           }}
//                         >
//                           {swipeItems[swipeIndex] &&
//                             swipeRenderer(swipeItems[swipeIndex], swipeIndex)}
//                         </div>

//                         {swipeItems.length > 1 && (
//                           <button
//                             onClick={() =>
//                               setSwipeIndex(
//                                 (prev) => (prev + 1) % swipeItems.length
//                               )
//                             }
//                             style={{
//                               position: "absolute",
//                               right: 0,
//                               top: "50%",
//                               transform: "translateY(-50%)",
//                               background: "none",
//                               border: "none",
//                               color: colors.cyberpunk,
//                               fontSize: "28px",
//                               cursor: "pointer",
//                               zIndex: 10,
//                               padding: "8px",
//                             }}
//                           >
//                             ▶
//                           </button>
//                         )}
//                       </div>

//                       {swipeItems.length > 1 && (
//                         <div
//                           style={{
//                             display: "flex",
//                             gap: "6px",
//                             padding: "8px 0 4px",
//                           }}
//                         >
//                           {swipeItems.map((_, i) => (
//                             <div
//                               key={i}
//                               onClick={() => setSwipeIndex(i)}
//                               style={{
//                                 width: "8px",
//                                 height: "8px",
//                                 borderRadius: "50%",
//                                 background:
//                                   i === swipeIndex
//                                     ? colors.cyberpunk
//                                     : colors.border,
//                                 cursor: "pointer",
//                                 transition: "background 0.2s",
//                               }}
//                             />
//                           ))}
//                         </div>
//                       )}
//                     </>
//                   )}
//                 </div>
//               )}

//               {/* INFO TAB — [KEEP] Бэкенд (useUser) без изменений */}
//               {activeTab === "info" && (
//                 <div
//                   className="scrollPartWrapper"
//                   style={{
//                     overflow: "scroll",
//                     height: "100%",
//                   }}
//                 >
//                   <div>
//                     <p
//                       style={{
//                         margin: "0 0 12px 0",
//                         fontSize: "13px",
//                         color: colors.text,
//                         fontWeight: "600",
//                         fontFamily: "monospace",
//                       }}
//                     >
//                       📊 {t("statistics")}:
//                     </p>
//                     <div
//                       style={{
//                         display: "flex",
//                         flexDirection: "column",
//                         gap: "8px",
//                         fontSize: "13px",
//                         color: colors.text,
//                         opacity: 0.8,
//                         fontFamily: "monospace",
//                       }}
//                     >
//                       <div
//                         style={{
//                           display: "flex",
//                           justifyContent: "space-between",
//                         }}
//                       >
//                         <span>{t("totalZones")}:</span>
//                         <span
//                           style={{
//                             fontWeight: "600",
//                             color: colors.cyberpunk,
//                           }}
//                         >
//                           {user?.zones || 0}
//                         </span>
//                       </div>

//                       <div
//                         style={{
//                           display: "flex",
//                           justifyContent: "space-between",
//                         }}
//                       >
//                         <span>{t("proxyZones")}:</span>
//                         <span
//                           style={{
//                             fontWeight: "600",
//                             color: "#4caf50",
//                           }}
//                         >
//                           {user?.proxyZones || 0}
//                         </span>
//                       </div>

//                       <div
//                         style={{
//                           display: "flex",
//                           justifyContent: "space-between",
//                         }}
//                       >
//                         <span>{t("sbtZones")}:</span>
//                         <span
//                           style={{
//                             fontWeight: "600",
//                             color: "#3b82f6",
//                           }}
//                         >
//                           {user?.sbtZones || 0}
//                         </span>
//                       </div>

//                       <div
//                         style={{
//                           display: "flex",
//                           justifyContent: "space-between",
//                         }}
//                       >
//                         <span>{t("totalSubdomains")}:</span>
//                         <span
//                           style={{
//                             fontWeight: "600",
//                             color: colors.cyberpunk,
//                           }}
//                         >
//                           {user?.subdomains || 0}
//                         </span>
//                       </div>

//                       <div
//                         style={{
//                           display: "flex",
//                           justifyContent: "space-between",
//                         }}
//                       >
//                         <span>{t("proxySubdomains")}:</span>
//                         <span
//                           style={{
//                             fontWeight: "600",
//                             color: "#4caf50",
//                           }}
//                         >
//                           {user?.proxySubdomains || 0}
//                         </span>
//                       </div>

//                       <div
//                         style={{
//                           display: "flex",
//                           justifyContent: "space-between",
//                         }}
//                       >
//                         <span>{t("sbtSubdomains")}:</span>
//                         <span
//                           style={{
//                             fontWeight: "600",
//                             color: "#3b82f6",
//                           }}
//                         >
//                           {user?.sbtSubdomains || 0}
//                         </span>
//                       </div>

//                       <div
//                         style={{
//                           display: "flex",
//                           justifyContent: "space-between",
//                           marginTop: "12px",
//                           paddingTop: "12px",
//                           borderTop: `1px solid ${colors.border}`,
//                         }}
//                       >
//                         <span>{t("activeAuctions")}:</span>
//                         <span
//                           style={{
//                             fontWeight: "600",
//                             color: colors.cyberpunk,
//                           }}
//                         >
//                           {activeAuctions.length}
//                         </span>
//                       </div>

//                       <div
//                         style={{
//                           display: "flex",
//                           justifyContent: "space-between",
//                           marginTop: "12px",
//                           paddingTop: "12px",
//                           borderTop: `1px solid ${colors.border}`,
//                         }}
//                       >
//                         <span style={{ fontWeight: "600" }}>
//                           {t("totalPaidAttempts")}:
//                         </span>
//                         <span
//                           style={{
//                             fontWeight: "600",
//                             color: colors.cyberpunk,
//                           }}
//                         >
//                           {(() => {
//                             if (!user?.totalPaidAttempts) return 0;
//                             const a = user.totalPaidAttempts;
//                             const proxyTotal = Object.values(
//                               a.proxy || {}
//                             ).reduce((x, y) => x + y, 0);
//                             const sbtTotal = Object.values(a.sbt || {}).reduce(
//                               (x, y) => x + y,
//                               0
//                             );
//                             return proxyTotal + sbtTotal;
//                           })()}
//                         </span>
//                       </div>

//                       <div
//                         style={{
//                           display: "flex",
//                           justifyContent: "space-between",
//                         }}
//                       >
//                         <span>{t("proxyPaidAttempts")}:</span>
//                         <span
//                           style={{
//                             fontWeight: "600",
//                             color: "#4caf50",
//                           }}
//                         >
//                           {(() => {
//                             if (!user?.totalPaidAttempts) return 0;
//                             return Object.values(
//                               user.totalPaidAttempts.proxy || {}
//                             ).reduce((x, y) => x + y, 0);
//                           })()}
//                         </span>
//                       </div>

//                       <div
//                         style={{
//                           display: "flex",
//                           justifyContent: "space-between",
//                         }}
//                       >
//                         <span>{t("sbtPaidAttempts")}:</span>
//                         <span
//                           style={{
//                             fontWeight: "600",
//                             color: "#3b82f6",
//                           }}
//                         >
//                           {(() => {
//                             if (!user?.totalPaidAttempts) return 0;
//                             return Object.values(
//                               user.totalPaidAttempts.sbt || {}
//                             ).reduce((x, y) => x + y, 0);
//                           })()}
//                         </span>
//                       </div>

//                       <div
//                         style={{
//                           display: "flex",
//                           justifyContent: "space-between",
//                           marginTop: "12px",
//                           paddingTop: "12px",
//                           borderTop: `1px solid ${colors.border}`,
//                         }}
//                       >
//                         <span style={{ fontWeight: "600" }}>
//                           {t("totalZoneSpending")}:
//                         </span>
//                         <span
//                           style={{
//                             fontWeight: "600",
//                             color: colors.cyberpunk,
//                           }}
//                         >
//                           {user?.totalZoneSpending?.toFixed(2) || "0.00"}{" "}
//                           <img
//                             src={TonLogo}
//                             alt="TON"
//                             style={{ width: "16px", height: "16px" }}
//                           />
//                         </span>
//                       </div>

//                       <div
//                         style={{
//                           display: "flex",
//                           justifyContent: "space-between",
//                         }}
//                       >
//                         <span>{t("proxyZoneSpending")}:</span>
//                         <span
//                           style={{
//                             fontWeight: "600",
//                             color: "#4caf50",
//                           }}
//                         >
//                           {user?.totalProxyZoneSpending?.toFixed(2) || "0.00"}{" "}
//                           <img
//                             src={TonLogo}
//                             alt="TON"
//                             style={{ width: "16px", height: "16px" }}
//                           />
//                         </span>
//                       </div>

//                       <div
//                         style={{
//                           display: "flex",
//                           justifyContent: "space-between",
//                         }}
//                       >
//                         <span>{t("sbtZoneSpending")}:</span>
//                         <span
//                           style={{
//                             fontWeight: "600",
//                             color: "#3b82f6",
//                           }}
//                         >
//                           {user?.totalSbtZoneSpending?.toFixed(2) || "0.00"}{" "}
//                           <img
//                             src={TonLogo}
//                             alt="TON"
//                             style={{ width: "16px", height: "16px" }}
//                           />
//                         </span>
//                       </div>

//                       <div
//                         style={{
//                           display: "flex",
//                           justifyContent: "space-between",
//                         }}
//                       >
//                         <span>{t("totalSubdomainSpending")}:</span>
//                         <span
//                           style={{
//                             fontWeight: "600",
//                             color: colors.cyberpunk,
//                           }}
//                         >
//                           {user?.totalSubdomainSpending?.toFixed(2) || "0.00"}{" "}
//                           <img
//                             src={TonLogo}
//                             alt="TON"
//                             style={{ width: "16px", height: "16px" }}
//                           />
//                         </span>
//                       </div>

//                       <div
//                         style={{
//                           display: "flex",
//                           justifyContent: "space-between",
//                         }}
//                       >
//                         <span>{t("proxySubdomainSpending")}:</span>
//                         <span
//                           style={{
//                             fontWeight: "600",
//                             color: "#4caf50",
//                           }}
//                         >
//                           {user?.totalProxySubdomainSpending?.toFixed(2) ||
//                             "0.00"}{" "}
//                           <img
//                             src={TonLogo}
//                             alt="TON"
//                             style={{ width: "16px", height: "16px" }}
//                           />
//                         </span>
//                       </div>

//                       <div
//                         style={{
//                           display: "flex",
//                           justifyContent: "space-between",
//                         }}
//                       >
//                         <span>{t("sbtSubdomainSpending")}:</span>
//                         <span
//                           style={{
//                             fontWeight: "600",
//                             color: "#3b82f6",
//                           }}
//                         >
//                           {user?.totalSbtSubdomainSpending?.toFixed(2) ||
//                             "0.00"}{" "}
//                           <img
//                             src={TonLogo}
//                             alt="TON"
//                             style={{ width: "16px", height: "16px" }}
//                           />
//                         </span>
//                       </div>

//                       <div
//                         style={{
//                           display: "flex",
//                           justifyContent: "space-between",
//                           marginTop: "12px",
//                           paddingTop: "12px",
//                           borderTop: `1px solid ${colors.border}`,
//                         }}
//                       >
//                         <span style={{ fontWeight: "600" }}>
//                           {t("totalProfit")}:
//                         </span>
//                         <span
//                           style={{
//                             fontWeight: "600",
//                             color: "#10b981",
//                           }}
//                         >
//                           {user?.totalProfit?.toFixed(2) || "0.00"}{" "}
//                           <img
//                             src={TonLogo}
//                             alt="TON"
//                             style={{ width: "16px", height: "16px" }}
//                           />
//                         </span>
//                       </div>

//                       <div
//                         style={{
//                           display: "flex",
//                           justifyContent: "space-between",
//                           marginTop: "12px",
//                           paddingTop: "12px",
//                           borderTop: `1px solid ${colors.border}`,
//                         }}
//                       >
//                         <span>{t("registrationDate")}:</span>
//                         <span
//                           style={{
//                             fontWeight: "600",
//                             color: colors.cyberpunk,
//                           }}
//                         >
//                           {user?.registrationDate
//                             ? new Date(
//                                 user.registrationDate
//                               ).toLocaleDateString("ru-RU")
//                             : user?.createdAt
//                             ? new Date(user.createdAt).toLocaleDateString(
//                                 "ru-RU"
//                               )
//                             : "-"}
//                         </span>
//                       </div>

//                       <PaymentAttemptsSection
//                         address={address}
//                         colors={colors}
//                         isDark={isDark}
//                       />
//                     </div>
//                   </div>
//                 </div>
//               )}

//               {/* FOOTER */}
//               <div
//                 style={{
//                   paddingTop: "12px",
//                   borderTop: `1px solid ${colors.border}`,
//                   fontSize: "11px",
//                   color: colors.text,
//                   opacity: 0.6,
//                   textAlign: "center",
//                   lineHeight: "1.5",
//                   fontFamily: "monospace",
//                   display: "flex",
//                   flexDirection: "column",
//                   justifyContent: "end",
//                 }}
//               >
//                 <button
//                   onClick={refreshAllData}
//                   style={{
//                     background: "none",
//                     border: "none",
//                     color: colors.cyberpunk,
//                     cursor: "pointer",
//                     fontSize: "12px",
//                     textDecoration: "underline",
//                     fontFamily: "monospace",
//                     marginTop: "5px",
//                     fontWeight: "900",
//                   }}
//                 >
//                   🔄 {t("refreshData")}
//                 </button>
//               </div>
//             </>
//           ) : (
//             /* НЕ ПОДКЛЮЧЕН */
//             <div
//               style={{
//                 padding: "20px",
//                 backgroundColor: colors.secondaryBg,
//                 borderRadius: "8px",
//                 textAlign: "center",
//               }}
//             >
//               <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔐</div>
//               <p
//                 style={{
//                   margin: "0 0 8px 0",
//                   fontSize: "14px",
//                   fontWeight: "600",
//                   color: colors.text,
//                   fontFamily: "monospace",
//                 }}
//               >
//                 {t("accessRestricted")}
//               </p>
//               <p
//                 style={{
//                   margin: "0",
//                   fontSize: "12px",
//                   color: colors.text,
//                   opacity: 0.7,
//                   lineHeight: "1.5",
//                 }}
//               >
//                 {t("connectWalletForHistory")}
//               </p>
//             </div>
//           )}
//         </div>
//       </div>

//       {isExpanded && (
//         <div
//           onClick={() => setIsExpanded(false)}
//           style={{
//             position: "fixed",
//             top: 0,
//             left: 0,
//             right: 0,
//             bottom: 0,
//             backgroundColor: "rgba(0,0,0,0.3)",
//             zIndex: 998,
//           }}
//         />
//       )}

//       <style>{`
//         :global(.ton-connect-button) {
//           width: 100%;
//           padding: 10px 12px !important;
//           background: ${colors.primary} !important;
//           border: none !important;
//           border-radius: 8px !important;
//           color: ${isDark ? "black" : "white"} !important;
//           font-weight: 600 !important;
//           font-size: 13px !important;
//           cursor: pointer !important;
//           transition: all 0.3s ease !important;
//           box-shadow: 0 4px 12px ${colors.shadow} !important;
//           font-family: monospace !important;
//           textTransform: uppercase !important;
//           letterSpacing: 0.5px !important;
//         }
//         :global(.ton-connect-button:hover) {
//           background: ${colors.accent} !important;
//           box-shadow: 0 6px 20px ${colors.shadow} !important;
//           transform: translateY(-2px) !important;
//         }
//         button[style*="background: linear-gradient"]:hover {
//           transform: translateY(-2px) !important;
//           box-shadow: 0 4px 12px ${colors.shadow} !important;
//           filter: brightness(1.1);
//         }
//         button[style*="background: linear-gradient"]:active {
//           transform: translateY(0) !important;
//           boxShadow: 0 2px 6px ${colors.shadow} !important;
//         }
//       `}</style>
//     </>
//   );
// };

// export default ProfileWidget;

// src/pages/AuctionPage/index.tsx
// ФИНАЛЬНАЯ ВЕРСИЯ: селекты зон — из useBlockchainItems (ончейн)
// Все вызовы API (createSubdomain, addBid, updateSubdomainStatus) — на бэкенд (СОХРАНЕНЫ)
// dedupe коллекций, кнопка «Создать сайт»
import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import {
  Banner,
  Button,
  Card,
  Input,
  List,
  IconButton,
} from "@telegram-apps/telegram-ui";
import { useTonWallet, useTonAddress } from "@tonconnect/ui-react";
import { useTonConnectUI } from "@tonconnect/ui-react";
import TonWeb from "tonweb";
import { Address } from "ton-core";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";

import { useTypedDispatch } from "../../hooks/useTypeDispatch";
import { Page } from "@/components/Page";
import { ShowSnackbar } from "@/components/ShowSnackbar";
import { claimSubdomain } from "@/store/nft/actions";
import FlipTimer from "./flipTimer/FlipTimer";
import { getAuctionInfo, ParsedAuctionInfo } from "./flipTimer/getAuctionInfo";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useUser } from "@/contexts/UserContext";
import { apiService, Subdomain, Zone } from "@/services/api";

import { checkSBTSubdomain, SBTSubdomainInfo } from "./checkSBTSubdomain";
import { calculateProxyNFTAddress } from "./CalculateProxyNFTAddress";

// ====== ONCHAIN REDUX ======
import { useBlockchainItems } from "@/services/blockchainItems/blockchain-items-context.tsx";
import { SimpleCollection } from "@/services/blockchainItems/blockchain-items-types";

import ActiveAuctions from "@/components/ActiveAuctions/ActiveAuctions";
import { useAuctionIntegration } from "@/hooks/useAuctionIntegration";

import {
  getAuctionParamsFromUrl,
  updateAuctionUrl,
  copyAuctionUrlToClipboard,
  shareAuction,
  isAuctionPage,
  clearAuctionUrl,
} from "@/utils/urlParams";

import { useLaunchParams } from "@telegram-apps/sdk-react";
import { MiniAppLinks } from "@/utils/miniAppLinks";
import { AuctionCollectionSelector } from "./AuctionCollectionSelector";
import { getUserSbtSubdomainsCount } from "@/utils/sbt-utils";

type CollectionAddressMap = {
  [key: string]: string;
};

type ActiveTab = "proxy" | "sbt";

const mapPrices: Record<number, number> = {
  1: 30,
  2: 20,
  3: 10,
  4: 5,
  5: 2.5,
  6: 1,
};

const API_PAYLOAD_URL = import.meta.env.VITE_API_SC_PAYLOAD_URL;

const normalizeAddress = (addr: string): string => {
  if (!addr) return "";
  try {
    const address = Address.parse(addr);
    return address.toString({ bounceable: true, testOnly: false });
  } catch (error) {
    console.error("Error parsing address:", addr, error);
    return addr;
  }
};

// ====== ДЕДУПЛИКАЦИЯ SimpleCollection (поздняя по created_at/lastUpdated) ======
const dedupeByLatest = (cols: SimpleCollection[]): SimpleCollection[] => {
  const map = new Map<string, SimpleCollection>();
  for (const c of cols) {
    const key = (c.name || "")
      .toLowerCase()
      .replace(" proxy domains", "")
      .replace(" dns domains", "");
    const exist = map.get(key);
    if (
      !exist ||
      new Date(c.created_at || c.lastUpdated || 0).getTime() >
        new Date(exist.created_at || exist.lastUpdated || 0).getTime()
    ) {
      map.set(key, c);
    }
  }
  return Array.from(map.values());
};

// ====== КОНВЕРТАЦИЯ SimpleCollection → Zone ======
const collectionToZone = (
  col: SimpleCollection,
  proxy: number
): Zone => {
  const rawName = (col.name || "")
    .replace(/ Proxy Domains/i, "")
    .replace(/ DNS Domains/i, "")
    .toLowerCase()
    .trim();
  const name = rawName.endsWith(".ton") || rawName.endsWith(".test")
    ? rawName
    : rawName + ".ton";

  return {
    id: col.address
      ? parseInt(col.address.slice(0, 8), 16) || Date.now()
      : Date.now(),
    name,
    address: col.address,
    collectionAddress: col.address,
    wrapperAddress: undefined,
    proxy,
    registrationDate:
      col.created_at || col.lastUpdated || new Date().toISOString(),
    subdomainsAmount: col.item_count || 0,
    owner: col.creator_address || col.owner_address || "",
    status: "active" as const,
    createdAt: col.created_at || col.lastUpdated || new Date().toISOString(),
    updatedAt: col.lastUpdated || col.created_at || new Date().toISOString(),
  };
};

export const AuctionPage: React.FC<{}> = () => {
  const dispatch = useTypedDispatch();
  const wallet = useTonWallet();
  const userAddress = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
  const { refreshSubdomains } = useUser();

  const [sbtSubdomainInfo, setSbtSubdomainInfo] =
    useState<SBTSubdomainInfo | null>(null);

  const { currentTheme } = useTheme();
  const isDark = currentTheme === "dark";
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<ActiveTab>("proxy");
  const [selectedDomainZone, setSelectedDomainZone] = useState("");
  const [subDomainName, setSubDomainName] = useState("");
  const [collectionAddress, setCollectionAddress] = useState("");
  const [snackbar, setSnackbar] = useState<JSX.Element | null>(null);
  const [auctionInfo, setAuctionInfo] = useState<ParsedAuctionInfo | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [nftAddress, setNftAddress] = useState("");
  const [hasChecked, setHasChecked] = useState(false);
  const [isClaimLoading, setIsClaimLoading] = useState(false);
  const [customBidAmount, setCustomBidAmount] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [manualBidValue, setManualBidValue] = useState("");
  const [sbtPurchaseCompleted, setSbtPurchaseCompleted] = useState(false);
  const [sbtLoading, setSbtLoading] = useState(false);
  const [sbtZonesCount, setSbtZonesCount] = useState<Record<string, number>>(
    {}
  );
  const prevSbtMapRef = useRef<{
    cacheKey: string;
    map: CollectionAddressMap;
  } | null>(null);

  const isTestnet = wallet?.account?.chain === "-3";

  const launchParams = useLaunchParams();
  const [, setOpenedViaDeeplink] = useState(false);

  // ====== ONCHAIN ДАННЫЕ (useBlockchainItems) ======
  const {
    proxyCollections,
    sbtCollections,
    loadAllData,
    isLoading: zonesLoading,
    error: zonesError,
  } = useBlockchainItems();

  // ====== КОНВЕРТИРУЕМ SimpleCollection[] → Zone[] ======
  const onchainProxyZones: Zone[] = useMemo(
    () => dedupeByLatest(proxyCollections).map((c) => collectionToZone(c, 1)),
    [proxyCollections]
  );
  const onchainSbtZones: Zone[] = useMemo(
    () => dedupeByLatest(sbtCollections).map((c) => collectionToZone(c, 0)),
    [sbtCollections]
  );

  const allZones: Zone[] = useMemo(
    () => [...onchainProxyZones, ...onchainSbtZones],
    [onchainProxyZones, onchainSbtZones]
  );
  const proxyZones: Zone[] = onchainProxyZones;
  const sbtZones: Zone[] = onchainSbtZones;

  const activeSbtZones: Zone[] = useMemo(
    () => sbtZones.filter((zone) => zone.status !== "inactive"),
    [sbtZones]
  );

  // Устанавливаем сеть в apiService при изменении isTestnet
  useEffect(() => {
    if (wallet) {
      apiService.setNetwork(isTestnet);
      console.log(
        `🌐 API сеть установлена: ${isTestnet ? "testnet" : "mainnet"}`
      );
    }
  }, [wallet, isTestnet]);

  const isProxyZone = useCallback((zone: any): boolean => {
    const proxyValue = zone.proxy;
    if (typeof proxyValue === "number") return proxyValue === 1;
    if (typeof proxyValue === "string") {
      const lowerValue = proxyValue.toLowerCase();
      return lowerValue === "proxy" || lowerValue === "1";
    }
    return false;
  }, []);

  const proxyCollectionAddressesMap = useMemo(() => {
    const map: CollectionAddressMap = {};
    allZones.forEach((zone) => {
      if (isProxyZone(zone) && zone.name && zone.collectionAddress) {
        map[zone.name] = zone.collectionAddress;
      }
    });
    console.log("🌐 Proxy коллекции загружены:", Object.keys(map).length);
    return map;
  }, [allZones, isProxyZone]);

  const sbtCollectionAddressesMap = useMemo(() => {
    const cacheKey = activeSbtZones
      .map((z) => `${z.name}|${z.collectionAddress}`)
      .sort()
      .join(";");

    if (prevSbtMapRef.current && prevSbtMapRef.current.cacheKey === cacheKey) {
      return prevSbtMapRef.current.map;
    }

    const newMap: CollectionAddressMap = {};
    activeSbtZones.forEach((zone) => {
      if (zone.name && zone.collectionAddress) {
        newMap[zone.name] = zone.collectionAddress;
      }
    });

    prevSbtMapRef.current = { cacheKey, map: newMap };
    return newMap;
  }, [activeSbtZones]);

  const currentCollectionMap = useMemo(() => {
    return activeTab === "proxy"
      ? proxyCollectionAddressesMap
      : sbtCollectionAddressesMap;
  }, [activeTab, proxyCollectionAddressesMap, sbtCollectionAddressesMap]);

  useEffect(() => {
    if (selectedDomainZone && !collectionAddress && allZones.length > 0) {
      const zone = allZones.find((z) => z.name === selectedDomainZone);
      if (zone?.collectionAddress) {
        console.log(
          `✅ Устанавливаем collectionAddress из базы: ${zone.collectionAddress}`
        );
        setCollectionAddress(zone.collectionAddress);
      } else {
        console.log(
          `⚠️ У зоны "${selectedDomainZone}" нет collectionAddress в базе`
        );
        const addressFromMap = currentCollectionMap[selectedDomainZone];
        if (addressFromMap) {
          console.log(
            `✅ Устанавливаем collectionAddress из мапы: ${addressFromMap}`
          );
          setCollectionAddress(addressFromMap);
        }
      }
    }
  }, [selectedDomainZone, collectionAddress, allZones, currentCollectionMap]);

  const domainZoneName = useMemo(() => {
    if (!selectedDomainZone) return "";
    return selectedDomainZone.split(".")[0];
  }, [selectedDomainZone]);

  const calculateDomainPrice = useMemo(() => {
    if (activeTab === "sbt") return 500_000_000;
    const domainLength = subDomainName.length;
    const basePrice = mapPrices[domainLength] || 0.5;
    return Math.floor(basePrice * 1_000_000_000);
  }, [subDomainName, activeTab]);

  const calculateBidPrice = useMemo(() => {
    if (activeTab === "sbt" || !auctionInfo) return 0;
    if (customBidAmount && !isNaN(Number(customBidAmount))) {
      return Math.floor(Number(customBidAmount) * 1_000_000_000);
    }
    const currentMaxBid = Number(auctionInfo.maxBid);
    const bidIncrease = Math.ceil(currentMaxBid * 0.05);
    return currentMaxBid + bidIncrease;
  }, [auctionInfo, customBidAmount, activeTab]);

  const canClaim = useMemo(() => {
    if (activeTab === "sbt" || !auctionInfo || !userAddress) return false;
    try {
      if (auctionInfo.maxBidderOwner === null) return false;
      const normalizedMaxBidder = normalizeAddress(
        auctionInfo.maxBidderOwner
      );
      const normalizedUserAddress = normalizeAddress(userAddress);
      return (
        !auctionInfo.isActive &&
        normalizedMaxBidder === normalizedUserAddress
      );
    } catch (error) {
      console.error("Error in canClaim:", error);
      return false;
    }
  }, [auctionInfo, userAddress, activeTab]);

  const marketplaceUrl = useMemo(() => {
    if (activeTab === "sbt" || !nftAddress || !collectionAddress) return "";
    const baseUrl = isTestnet
      ? "https://testnet.getgems.io"
      : "https://getgems.io";
    return `${baseUrl}/collection/${collectionAddress}/${nftAddress}`;
  }, [nftAddress, collectionAddress, isTestnet, activeTab]);

  const showSnackbar = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      setSnackbar(
        <ShowSnackbar
          message={message}
          type={type}
          onClose={() => setSnackbar(null)}
        />
      );
    },
    []
  );

  const updateUrlWithCurrentAuction = useCallback(() => {
    if (selectedDomainZone && subDomainName && activeTab === "proxy") {
      updateAuctionUrl({
        zone: selectedDomainZone,
        subdomain: subDomainName,
      });
    }
  }, [selectedDomainZone, subDomainName, activeTab]);

  const handleCopyAuctionLink = useCallback(async () => {
    if (!selectedDomainZone || !subDomainName) {
      showSnackbar(t("selectZoneAndSubdomainFirst"), "error");
      return;
    }
    const success = await copyAuctionUrlToClipboard({
      zone: selectedDomainZone,
      subdomain: subDomainName,
    });
    if (success) showSnackbar(t("auctionLinkCopied"), "success");
    else showSnackbar(t("failedToCopyLink"), "error");
  }, [selectedDomainZone, subDomainName, showSnackbar, t]);

  const handleShareAuction = useCallback(async () => {
    if (!selectedDomainZone || !subDomainName) {
      showSnackbar(t("selectZoneAndSubdomainFirst"), "error");
      return;
    }
    const success = await shareAuction({
      zone: selectedDomainZone,
      subdomain: subDomainName,
    });
    if (!success) await handleCopyAuctionLink();
  }, [selectedDomainZone, subDomainName, showSnackbar, handleCopyAuctionLink, t]);

  // ====== DEEPLINK / URL ======
  useEffect(() => {
    const startappParam = launchParams.startParam;
    if (startappParam) {
      console.log(`🔗 AuctionPage открыт через deeplink: ${startappParam}`);
      setOpenedViaDeeplink(true);
      const parts = startappParam.split("_");
      if (parts[0] === "add-subdomain") {
        console.log("✅ Пользователь перешел на аукцион из уведомления");
      }
    }
  }, [launchParams.startParam]);

  useEffect(() => {
    const hasUrlParams = isAuctionPage();
    const hasDeeplink = !!launchParams.startParam;
    if ((hasUrlParams || hasDeeplink) && allZones.length === 0) {
      console.log("⏳ Ждем загрузку зон...");
      return;
    }
    if (hasDeeplink) {
      const startappParam = launchParams.startParam!;
      try {
        const { route, params } = MiniAppLinks.parseStartapp(startappParam);
        if (
          route === "/add-subdomain" &&
          params.zone &&
          params.subdomain
        ) {
          loadAuctionFromParams(params.zone, params.subdomain);
        }
      } catch (error) {
        console.error("❌ Ошибка парсинга deeplink:", error);
      }
    } else if (hasUrlParams) {
      const params = getAuctionParamsFromUrl();
      if (params.zone && params.subdomain) {
        loadAuctionFromParams(params.zone, params.subdomain);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allZones, launchParams.startParam]);

  // ====== ПРОВЕРКА ИТЕМА ======
  const handleCheckItem = useCallback(async () => {
    if (!selectedDomainZone || !subDomainName || !collectionAddress) {
      showSnackbar(t("pleaseEnterDomainName"), "error");
      return;
    }
    const validCharsRegex = /^[a-z0-9-]+$/;
    if (!validCharsRegex.test(subDomainName)) {
      showSnackbar(t("subdomainInvalidCharsError"), "error");
      return;
    }
    setIsLoading(true);
    setHasChecked(false);
    const lowerValue = subDomainName.toLowerCase();

    if (activeTab === "sbt") {
      const sbtInfo = await checkSBTSubdomain(
        lowerValue,
        collectionAddress,
        isTestnet
      );
      if (sbtInfo) {
        setSbtSubdomainInfo(sbtInfo);
        setAuctionInfo(null);
        if (sbtInfo.nftAddress) setNftAddress(sbtInfo.nftAddress);
        else setNftAddress("");
        if (sbtInfo.isTaken)
          showSnackbar(t("sbtSubdomainAlreadyTaken"), "error");
        else showSnackbar(t("sbtSubdomainAvailable"), "success");
      } else {
        setSbtSubdomainInfo(null);
        setAuctionInfo(null);
        setNftAddress("");
        showSnackbar(t("checkingAvailability"), "error");
      }
    } else {
      const info = await getAuctionInfo(
        lowerValue,
        collectionAddress,
        isTestnet
      );
      if (info) {
        setAuctionInfo(info);
        setSbtSubdomainInfo(null);
        if (info.nftAddress) setNftAddress(info.nftAddress);
        else setNftAddress("");
        showSnackbar(t("auctionInfoLoaded"), "success");
        if (activeTab === "proxy") updateUrlWithCurrentAuction();
      } else {
        setAuctionInfo(null);
        setSbtSubdomainInfo(null);
        const proxyNFTAddress = await calculateProxyNFTAddress(
          lowerValue,
          collectionAddress,
          isTestnet
        );
        if (proxyNFTAddress) {
          setNftAddress(proxyNFTAddress);
          showSnackbar(t("subdomainAvailableForFirstBid"), "success");
        } else {
          setNftAddress("");
          showSnackbar(t("failedToCalculateNFTAddress"), "error");
        }
        if (activeTab === "proxy") updateUrlWithCurrentAuction();
      }
    }
    setHasChecked(true);
    setIsLoading(false);
  }, [
    selectedDomainZone,
    subDomainName,
    collectionAddress,
    isTestnet,
    t,
    activeTab,
    updateUrlWithCurrentAuction,
    showSnackbar,
  ]);

  // ====== SBT SUBDOMAINS COUNT ======
  const loadUserSbtSubdomainsCount = useCallback(async () => {
    if (!userAddress || activeTab !== "sbt") return;
    try {
      const counts = await getUserSbtSubdomainsCount(userAddress, isTestnet);
      setSbtZonesCount(counts);
    } catch (error) {
      console.error("❌ Ошибка загрузки SBT субдоменов:", error);
      setSbtZonesCount({});
    }
  }, [userAddress, isTestnet, activeTab]);

  useEffect(() => {
    if (activeTab === "sbt" && userAddress) loadUserSbtSubdomainsCount();
    else setSbtZonesCount({});
  }, [activeTab, userAddress, loadUserSbtSubdomainsCount]);

  // ====== ЗАГРУЗКА АУКЦИОНА ИЗ ПАРАМЕТРОВ ======
  const loadAuctionFromParams = useCallback(
    (zoneName: string, subdomainName: string) => {
      setOpenedViaDeeplink(true);
      setActiveTab("proxy");
      setSelectedDomainZone(zoneName);
      setSubDomainName(subdomainName);
      const zone = allZones.find((z) => z.name === zoneName);
      if (zone?.collectionAddress)
        setCollectionAddress(zone.collectionAddress);
      updateUrlWithCurrentAuction();
      setTimeout(() => handleCheckItem(), 500);
    },
    [allZones, handleCheckItem, updateUrlWithCurrentAuction]
  );

  // ====== ТАБЫ ======
  const handleTabChange = (
    _event: React.SyntheticEvent,
    newValue: ActiveTab
  ) => {
    setActiveTab(newValue);
    setSelectedDomainZone("");
    setSubDomainName("");
    setCollectionAddress("");
    setAuctionInfo(null);
    setNftAddress("");
    setHasChecked(false);
    setCustomBidAmount("");
    setShowCustomInput(false);
    setManualBidValue("");
    setSbtPurchaseCompleted(false);
    setOpenedViaDeeplink(false);
    if (newValue === "sbt") clearAuctionUrl();
  };

  const checkItemByName = useCallback(
    async (zoneName: string, subdomain: string) => {
      setAuctionInfo(null);
      setNftAddress("");
      setHasChecked(false);
      setCustomBidAmount("");
      setShowCustomInput(false);
      setManualBidValue("");
      setSbtPurchaseCompleted(false);
      setSelectedDomainZone(zoneName);
      setSubDomainName(subdomain);
      const zone = allZones.find((z) => z.name === zoneName);
      if (zone?.collectionAddress)
        setCollectionAddress(zone.collectionAddress);
      else setCollectionAddress("");
      await new Promise((resolve) => setTimeout(resolve, 100));
      await handleCheckItem();
    },
    [allZones, handleCheckItem]
  );

  const { handleAuctionClick, setSelectedZoneName, setSubdomainName } =
    useAuctionIntegration({ zones: allZones, checkItem: checkItemByName });

  const handleAuctionClickFromComponent = useCallback(
    (zoneName: string, subdomainName: string) => {
      handleAuctionClick(zoneName, subdomainName);
      if (activeTab === "proxy") updateUrlWithCurrentAuction();
    },
    [handleAuctionClick, activeTab, updateUrlWithCurrentAuction]
  );

  const setupCollectionAddressForZone = useCallback(
    (zoneName: string) => {
      if (!zoneName) return false;
      const zone = allZones.find((z) => z.name === zoneName);
      if (zone?.collectionAddress) {
        setCollectionAddress(zone.collectionAddress);
        return true;
      }
      const a = currentCollectionMap[zoneName];
      if (a) {
        setCollectionAddress(a);
        return true;
      }
      return false;
    },
    [allZones, currentCollectionMap]
  );

  const handleDomainZoneChangeForSelector = useCallback(
    (value: string) => {
      setSelectedDomainZone(value);
      setOpenedViaDeeplink(false);
      setSelectedZoneName(value);
      setAuctionInfo(null);
      setNftAddress("");
      setHasChecked(false);
      setCustomBidAmount("");
      setShowCustomInput(false);
      setManualBidValue("");
      setSbtPurchaseCompleted(false);
      setupCollectionAddressForZone(value);
      if (value && subDomainName && activeTab === "proxy")
        updateUrlWithCurrentAuction();
    },
    [
      setSelectedZoneName,
      setupCollectionAddressForZone,
      subDomainName,
      activeTab,
      updateUrlWithCurrentAuction,
    ]
  );

  const handleSubDomainNameChange = useCallback(
    (value: string) => {
      setSubDomainName(value.toLowerCase());
      setSubdomainName(value.toLowerCase());
      setAuctionInfo(null);
      setNftAddress("");
      setHasChecked(false);
      setCustomBidAmount("");
      setShowCustomInput(false);
      setManualBidValue("");
      setSbtPurchaseCompleted(false);
      if (selectedDomainZone && value && activeTab === "proxy")
        updateUrlWithCurrentAuction();
    },
    [
      setSubdomainName,
      selectedDomainZone,
      activeTab,
      updateUrlWithCurrentAuction,
    ]
  );

  // ====== SELECT BID ======
  const handleBidSelectChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const v = e.target.value;
    if (v === "custom") {
      setShowCustomInput(true);
      setCustomBidAmount("");
      setManualBidValue("");
    } else {
      setShowCustomInput(false);
      setCustomBidAmount(v);
      setManualBidValue("");
    }
  };

  const handleManualBidChange = (value: string) => {
    setManualBidValue(value);
    setCustomBidAmount(value && !isNaN(Number(value)) ? value : "");
  };

  // ====== БД: createSubdomainIfNotExists ======
  const createSubdomainIfNotExists = async (subdomainData: {
    name: string;
    address: string;
    mintPrice: number;
    links?: string[];
    zoneId?: number;
    owner?: string;
    status: "active" | "inactive" | "auction" | "claimed";
    auctionEndTime?: string;
    collectionAddress?: string;
  }): Promise<Subdomain> => {
    try {
      apiService.setNetwork(isTestnet);
      try {
        return await apiService.getSubdomainByName(subdomainData.name);
      } catch {
        return await apiService.createSubdomain({ ...subdomainData });
      }
    } catch (error) {
      console.error("createSubdomainIfNotExists:", error);
      throw error;
    }
  };

  // ====== СТАРТ АУКЦИОНА ======
  const handleStartAuction = async () => {
    if (!selectedDomainZone || !subDomainName || !collectionAddress) {
      showSnackbar(t("pleaseEnterDomainName"), "error");
      return;
    }
    if (!userAddress) {
      showSnackbar(t("walletNotConnected"), "error");
      return;
    }
    try {
      const tonWeb = new TonWeb();
      const cell = new tonWeb.boc.Cell();
      cell.bits.writeUint(0, 32);
      cell.bits.writeString(`${subDomainName}`);
      const payload = TonWeb.utils.bytesToBase64(await cell.toBoc());
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 360,
        messages: [
          {
            amount: calculateDomainPrice.toString(),
            address: collectionAddress,
            payload,
          },
        ],
      });
      const full = `${subDomainName}.${selectedDomainZone}`;
      const auctionEndTime = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString();
      try {
        apiService.setNetwork(isTestnet);
        const zone = allZones.find((z) => z.name === selectedDomainZone);
        await apiService.createSubdomain({
          name: full,
          address: nftAddress,
          mintPrice: calculateDomainPrice / 1_000_000_000,
          owner: userAddress,
          status: "auction",
          auctionEndTime,
          zoneId: zone?.id,
          collectionAddress: zone?.collectionAddress,
        });
        loadAllData(true);
        showSnackbar(t("startAuction"), "success");
      } catch (dbError: any) {
        console.error("DB error:", dbError);
        showSnackbar(t("auctionStartedBlockchainDbError"), "error");
      }
      setTimeout(() => handleCheckItem(), 2000);
    } catch (error: any) {
      if (error?.message?.includes("cancelled"))
        showSnackbar(t("auctionStartCancelled"), "error");
      else if (error?.message?.includes("rejected"))
        showSnackbar(t("auctionStartRejected"), "error");
      else if (error?.message?.includes("insufficient"))
        showSnackbar(t("insufficientFundsForAuctionStart"), "error");
      else showSnackbar(t("auctionStartError"), "error");
    }
  };

  // ====== СТАВКА ======
  const handlePlaceBid = async () => {
    if (
      !auctionInfo ||
      !selectedDomainZone ||
      !subDomainName ||
      !collectionAddress
    ) {
      showSnackbar(t("auctionDataNotLoaded"), "error");
      return;
    }
    if (!userAddress) {
      showSnackbar(t("walletNotConnected"), "error");
      return;
    }
    try {
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 360,
        messages: [
          { amount: calculateBidPrice.toString(), address: nftAddress },
        ],
      });
      const full = `${subDomainName}.${selectedDomainZone}`;
      try {
        apiService.setNetwork(isTestnet);
        const zone = allZones.find((z) => z.name === selectedDomainZone);
        const subdomain = await createSubdomainIfNotExists({
          name: full,
          address: nftAddress,
          mintPrice: calculateBidPrice / 1_000_000_000,
          owner: userAddress,
          status: "auction",
          auctionEndTime: new Date(
            Date.now() + 24 * 60 * 60 * 1000
          ).toISOString(),
          zoneId: zone?.id,
          collectionAddress: zone?.collectionAddress,
        });
        await apiService.addBidToSubdomain(subdomain.id, {
          bidder: userAddress,
          amount: calculateBidPrice,
        });
        await apiService.updateSubdomainStatus(subdomain.id, "auction");
        refreshSubdomains();
        loadAllData(true);
      } catch (dbError: any) {
        console.error("DB error:", dbError);
        showSnackbar(t("bidPlacedBlockchainDbError"), "error");
      }
      showSnackbar(t("bid"), "success");
      setCustomBidAmount("");
      setShowCustomInput(false);
      setManualBidValue("");
      setTimeout(() => handleCheckItem(), 2000);
    } catch (error: any) {
      if (error?.message?.includes("cancelled"))
        showSnackbar(t("bidCancelled"), "error");
      else if (error?.message?.includes("rejected"))
        showSnackbar(t("bidRejected"), "error");
      else if (error?.message?.includes("insufficient"))
        showSnackbar(t("insufficientFundsForBid"), "error");
      else showSnackbar(t("bidError"), "error");
    }
  };

  // ====== ПОКУПКА SBT ======
  const handlePurchaseSBTSubdomain = async () => {
    if (!selectedDomainZone || !subDomainName || !collectionAddress) {
      showSnackbar(t("pleaseEnterDomainName"), "error");
      return;
    }
    if (!wallet) {
      showSnackbar(t("walletNotConnected"), "error");
      return;
    }
    if (sbtSubdomainInfo?.isTaken) {
      showSnackbar(t("sbtSubdomainAlreadyTaken"), "error");
      return;
    }
    setSbtLoading(true);
    try {
      const tonWeb = new TonWeb();
      const cell = new tonWeb.boc.Cell();
      cell.bits.writeUint(0, 32);
      cell.bits.writeString(`${subDomainName}`);
      const payload = TonWeb.utils.bytesToBase64(await cell.toBoc());
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 360,
        messages: [
          {
            amount: calculateDomainPrice.toString(),
            address: collectionAddress,
            payload,
          },
        ],
      });
      const full = `${subDomainName}.${selectedDomainZone}`;
      if (!userAddress) throw new Error("No user address");
      const nftAddr = sbtSubdomainInfo?.nftAddress || userAddress;
      apiService.setNetwork(isTestnet);
      const zone = allZones.find((z) => z.name === selectedDomainZone);
      await apiService.createSubdomain({
        name: full,
        address: nftAddr,
        mintPrice: calculateDomainPrice / 1_000_000_000,
        owner: userAddress,
        status: "active",
        collectionAddress,
        zoneId: zone?.id,
      });
      showSnackbar(t("sbtSubdomainPurchased"), "success");
      setSbtPurchaseCompleted(true);
    } catch (error: any) {
      if (error?.message?.includes("cancelled"))
        showSnackbar(t("sbtPurchaseCancelled"), "error");
      else showSnackbar(t("sbtPurchaseError"), "error");
    } finally {
      setSbtLoading(false);
    }
  };

  // ====== CLAIM ======
  const handleClaimSubdomain = async () => {
    if (!nftAddress) {
      showSnackbar(t("nftAddressNotFound"), "error");
      return;
    }
    if (!userAddress) {
      showSnackbar(t("walletNotConnected"), "error");
      return;
    }
    setIsClaimLoading(true);
    try {
      const result = await dispatch(
        claimSubdomain({
          subdomain_item_address: nftAddress,
          query_id: 0,
          isTestnet,
        })
      ).unwrap();
      await tonConnectUI.sendTransaction({
        validUntil: result.validUntil,
        messages: result.messages,
      });
      const full = `${subDomainName}.${selectedDomainZone}`;
      try {
        apiService.setNetwork(isTestnet);
        const s = await apiService.getSubdomainByName(full);
        if (s) await apiService.updateSubdomainStatus(s.id, "claimed");
      } catch (e) {
        console.error("DB claim error:", e);
      }
      showSnackbar(t("subdomainClaimedSuccess"), "success");
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : t("subdomainClaimError"),
        "error"
      );
    } finally {
      setIsClaimLoading(false);
    }
  };

  // ====== URL КАРТИНКИ ======
  const getImageUrl = () => {
    if (!domainZoneName || !subDomainName) return "";
    if (activeTab === "proxy")
      return `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${domainZoneName}/${subDomainName}.png`;
    else
      return `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${domainZoneName}/${subDomainName}.png`;
  };

  // ====== ТЕКСТЫ КНОПОК ======
  const getActionButtonText = (): string => {
    if (activeTab === "sbt") {
      if (sbtPurchaseCompleted) return `✅ ${t("purchased")}`;
      if (sbtSubdomainInfo?.isTaken)
        return `❌ ${t("sbtSubdomainAlreadyTaken")}`;
      return `${t("mintSubdomain")} (${t("buyFor1TON")})`;
    }
    if (!auctionInfo)
      return `${t("startAuction")} (${t("price")}: ${
        calculateDomainPrice / 1_000_000_000
      } TON)`;
    if (auctionInfo.isActive)
      return `${t("bid")} (${
        customBidAmount ||
        (calculateBidPrice / 1_000_000_000).toFixed(2)
      } TON)`;
    if (canClaim)
      return isClaimLoading ? t("claiming") : `🎁 ${t("claimSubdomain")}`;
    return "";
  };

  const getActionButtonHandler = (): (() => void) | undefined => {
    if (activeTab === "sbt") {
      if (sbtPurchaseCompleted || sbtSubdomainInfo?.isTaken) return undefined;
      return handlePurchaseSBTSubdomain;
    }
    if (!auctionInfo) return handleStartAuction;
    if (auctionInfo.isActive) return handlePlaceBid;
    if (canClaim) return handleClaimSubdomain;
    return undefined;
  };

  const getActionButtonDisabled = (): boolean => {
    if (activeTab === "sbt")
      return (
        sbtPurchaseCompleted ||
        sbtLoading ||
        !selectedDomainZone ||
        !subDomainName ||
        !!sbtSubdomainInfo?.isTaken
      );
    if (!auctionInfo) return !selectedDomainZone || !subDomainName;
    if (auctionInfo.isActive) return false;
    if (canClaim) return isClaimLoading;
    return true;
  };

  const themeColors = {
    light: {
      primary: "linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)",
      accent: "#3B82F6",
      background: "#FFFFFF",
      text: "#1F2937",
      border: "#E5E7EB",
      secondaryBg: "#F9FAFB",
      shadow: "rgba(59, 130, 246, 0.4)",
      cyberpunk: "#3B82F6",
      gold: "#FFD700",
      blue: "#3B82F6",
      link: "#3B82F6",
      inputBg: "#FFFFFF",
      inputBorder: "#D1D5DB",
      inputText: "#1F2937",
      dropdownBg: "#FFFFFF",
      dropdownBorder: "#E5E7EB",
    },
    dark: {
      primary: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
      accent: "#FFD700",
      background: "#121212",
      text: "#E5E5E5",
      border: "#333333",
      secondaryBg: "#1A1A1A",
      shadow: "rgba(255, 215, 0, 0.4)",
      cyberpunk: "#FFD700",
      gold: "#FFD700",
      blue: "#00FFFF",
      link: "#00FFFF",
      inputBg: "#1A1A1A",
      inputBorder: "#444444",
      inputText: "#E5E5E5",
      dropdownBg: "#1A1A1A",
      dropdownBorder: "#444444",
    },
  };
  const colors = themeColors[isDark ? "dark" : "light"];

  const getActionButtonColor = () => {
    if (activeTab === "sbt") {
      if (sbtPurchaseCompleted) return "#4ade80";
      if (sbtSubdomainInfo?.isTaken) return "#888";
      return sbtLoading ? "#888" : "#4a90e2";
    }
    if (!auctionInfo) return "#4ade80";
    if (auctionInfo.isActive) return "rgb(74, 144, 226)";
    if (canClaim) return isClaimLoading ? "#888" : "#4ade80";
    return "transparent";
  };

  useEffect(() => {
    if (userAddress) refreshSubdomains();
  }, [userAddress, refreshSubdomains]);

  // ========================================================================
  // RENDER
  // ========================================================================
  return (
    <Page back={true}>
      {snackbar}

      <Box sx={{ display: "flex", justifyContent: "center", mt: 2, mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            "& .MuiTab-root": {
              color: isDark ? "#ccc" : "#666",
              "&.Mui-selected": {
                color: isDark ? "#FFD700" : "#3B82F6",
              },
            },
          }}
        >
          <Tab label={t("proxyForSale")} value="proxy" />
          <Tab label={t("sbtNotForSale")} value="sbt" />
        </Tabs>
      </Box>

      {/* Proxy banner */}
      {activeTab === "proxy" && (
        <div
          className="bannerWrapper"
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Banner
            type="section"
            header={t("proxyAuctionTitle")}
            subheader={t("proxyAuctionDescription")}
            style={{
              textAlign: "center",
              marginBottom: "20px",
              padding: "15px",
              maxWidth: "425px",
              background: isDark
                ? "linear-gradient(to bottom, #1a1a1a, #2a2a2a)"
                : "linear-gradient(to bottom, #f5f5f5, #e5e5e5)",
              color: isDark ? "#fff" : "#333",
            }}
          >
            <div
              style={{
                textAlign: "left",
                marginTop: "15px",
                fontSize: "14px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                maxWidth: "425px",
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  marginBottom: "10px",
                  textAlign: "center",
                }}
              >
                {t("proxyFeatures")}
              </div>
              <ul style={{ paddingLeft: "20px", margin: 0 }}>
                <li style={{ marginBottom: "8px" }}>{t("proxyFeature1")}</li>
                <li style={{ marginBottom: "8px" }}>{t("proxyFeature2")}</li>
                <li style={{ marginBottom: "8px" }}>{t("proxyFeature3")}</li>
                <li style={{ marginBottom: "8px" }}>{t("proxyFeature4")}</li>
                <li style={{ marginBottom: "8px" }}>{t("proxyFeature5")}</li>
                <li style={{ marginBottom: "8px" }}>{t("proxyFeature6")}</li>
                <li style={{ marginBottom: "8px" }}>{t("proxyFeature7")}</li>
              </ul>
            </div>
          </Banner>
        </div>
      )}

      {/* SBT banner */}
      {activeTab === "sbt" && (
        <div
          className="bannerWrapper"
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Banner
            type="section"
            header={t("sbtMintTitle")}
            subheader={t("sbtMintDescription")}
            style={{
              textAlign: "center",
              marginBottom: "20px",
              padding: "15px",
              maxWidth: "425px",
              background: isDark
                ? "linear-gradient(to bottom, #1a1a1a, #2a2a2a)"
                : "linear-gradient(to bottom, #f5f5f5, #e5e5e5)",
              color: isDark ? "#fff" : "#333",
            }}
          >
            <div
              style={{
                textAlign: "left",
                marginTop: "15px",
                fontSize: "14px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                maxWidth: "425px",
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  marginBottom: "10px",
                  textAlign: "center",
                }}
              >
                {t("sbtFeatures")}
              </div>
              <ul style={{ paddingLeft: "20px", margin: 0 }}>
                <li style={{ marginBottom: "8px" }}>{t("sbtFeature1")}</li>
                <li style={{ marginBottom: "8px" }}>{t("sbtFeature2")}</li>
                <li style={{ marginBottom: "8px" }}>{t("sbtFeature3")}</li>
                <li style={{ marginBottom: "8px" }}>{t("sbtFeature4")}</li>
                <li style={{ marginBottom: "8px" }}>{t("sbtFeature5")}</li>
                <li style={{ marginBottom: "8px" }}>{t("sbtFeature6")}</li>
                <li style={{ marginBottom: "8px" }}>{t("sbtFeature7")}</li>
              </ul>
            </div>
          </Banner>
        </div>
      )}

      {activeTab === "proxy" && (
        <ActiveAuctions
          isTestnet={isTestnet}
          isDark={isDark}
          onAuctionClick={handleAuctionClickFromComponent}
        />
      )}

      {/* Индикатор сети */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "10px",
          padding: "5px 10px",
          borderRadius: "15px",
          background: isTestnet ? "#f59e0b" : "#10b981",
          color: "white",
          fontSize: "12px",
          fontWeight: "bold",
          maxWidth: "280px",
          margin: "0 auto",
        }}
      >
        {isTestnet ? "🌐 Testnet Mode" : "🌐 Mainnet Mode"}
      </div>

      <List
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "15px",
          paddingBottom: "150px",
        }}
      >
        {/* Шаг 1: Выбор зоны */}
        <div style={{ position: "relative", width: "280px" }}>
          <div
            style={{
              position: "absolute",
              left: "-30px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "18px",
              fontWeight: "bold",
              color: isDark ? "white" : "black",
            }}
          >
            1
          </div>
          <AuctionCollectionSelector
            activeTab={activeTab}
            selectedDomainZone={selectedDomainZone}
            onDomainZoneChange={handleDomainZoneChangeForSelector}
            zonesLoading={zonesLoading}
            zonesError={zonesError}
            userAddress={userAddress}
            isDark={isDark}
            t={t}
            sbtCollectionAddressesMap={sbtCollectionAddressesMap}
            activeSbtZones={activeSbtZones}
            proxyZones={proxyZones}
            isTestnet={isTestnet}
            sbtZonesCount={sbtZonesCount}
          />
          {zonesError && (
            <p
              style={{
                color: "#f87171",
                fontSize: "12px",
                marginTop: "5px",
              }}
            >
              {zonesError}
            </p>
          )}
          {activeTab === "sbt" &&
            sbtZones.length === 0 &&
            !zonesLoading &&
            !zonesError && (
              <p
                style={{
                  color: "#f59e0b",
                  fontSize: "12px",
                  marginTop: "5px",
                  textAlign: "center",
                }}
              >
                {t("noSbtZones")}
              </p>
            )}
        </div>

        {/* Информация о зоне */}
        {selectedDomainZone && (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              background: isDark ? "#2a2a2a" : "#f5f5f5",
              border: `1px solid ${isDark ? "#444" : "#ddd"}`,
              fontSize: "12px",
              color: isDark ? "#ccc" : "#666",
              maxWidth: "280px",
              textAlign: "center",
            }}
          >
            <p style={{ margin: 0 }}>
              <strong>{t("zoneType")}</strong>{" "}
              {activeTab === "proxy" ? t("proxyType") : t("sbtType")}
            </p>
            {collectionAddress ? (
              <p
                style={{
                  margin: "3px 0 0 0",
                  color: "#4caf50",
                  fontSize: "11px",
                }}
              >
                {t("collectionConfigured")}
              </p>
            ) : (
              <p
                style={{
                  margin: "3px 0 0 0",
                  color: "#f59e0b",
                  fontSize: "11px",
                }}
              >
                {t("collectionNotConfigured")}
              </p>
            )}
            <p
              style={{
                margin: "3px 0 0 0",
                fontSize: "11px",
                color: isTestnet ? "#f59e0b" : "#10b981",
              }}
            >
              {t("network")} {isTestnet ? t("testnet") : t("mainnet")}
            </p>
          </div>
        )}

        {/* Шаг 2: Ввод названия субдомена */}
        <div style={{ position: "relative", width: "280px" }}>
          <div
            style={{
              position: "absolute",
              left: "-30px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "18px",
              fontWeight: "bold",
              color: isDark ? "white" : "black",
            }}
          >
            2
          </div>
          <Input
            placeholder={t("enterSubdomainName")}
            value={subDomainName}
            onChange={(e) => {
              const val = e.target.value
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, "");
              handleSubDomainNameChange(val);
            }}
            style={{
              width: "280px",
              borderRadius: "50%",
              padding: "0px 15px",
              position: "relative",
            }}
            before={
              <div
                style={{
                  position: "absolute",
                  left: "15px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  opacity: 0.5,
                }}
              >
                🔍
              </div>
            }
          />
        </div>

        {/* Шаг 2.5: Проверка итема */}
        <div style={{ position: "relative", width: "280px" }}>
          <div
            style={{
              position: "absolute",
              left: "-30px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "18px",
              fontWeight: "bold",
              color: isDark ? "white" : "black",
            }}
          >
            2.5
          </div>
          <Button
            onClick={handleCheckItem}
            disabled={
              !selectedDomainZone ||
              !subDomainName ||
              isLoading ||
              !collectionAddress
            }
            style={{
              width: "280px",
              borderRadius: "25px",
              padding: "10px 15px",
              background: isLoading ? "#888" : colors.primary,
              opacity: !collectionAddress ? 0.5 : 1,
              cursor: !collectionAddress ? "not-allowed" : "pointer",
              color: isDark ? "black" : "white",
            }}
          >
            {isLoading ? t("checking") : t("checkingItem")}
          </Button>
          {!collectionAddress && (
            <p
              style={{
                color: "#f59e0b",
                fontSize: "12px",
                marginTop: "5px",
                textAlign: "center",
              }}
            >
              {t("noCollectionAddress")}
            </p>
          )}
        </div>

        {/* КАРТОЧКА АУКЦИОНА (proxy) */}
        {hasChecked && auctionInfo && activeTab === "proxy" && (
          <Card
            style={{
              background: "linear-gradient(to bottom, #1a1a1a, #2a2a2a)",
              marginBottom: "20px",
              padding: "15px",
              borderRadius: "10px",
              width: "280px",
              border: `2px solid ${
                auctionInfo.isActive ? "#4ade80" : "#f87171"
              }`,
            }}
          >
            <div style={{ color: "#fff", fontSize: "14px" }}>
              <div
                style={{
                  marginBottom: "10px",
                  textAlign: "center",
                  color: auctionInfo.isActive ? "#4ade80" : "#f87171",
                  fontWeight: "bold",
                }}
              >
                {auctionInfo.isActive
                  ? `✅  ${t("bidOnAuction")}`
                  : `❌ ${t("subdomainAlreadyTaken")}`}
              </div>
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <img
                  style={{
                    width: "200px",
                    height: "200px",
                    borderRadius: "25px",
                    marginBottom: "15px",
                  }}
                  src={getImageUrl()}
                  alt="subdomainImage"
                />
              </div>
              <div style={{ marginBottom: "10px" }}>
                <strong>{t("maxBidder")}:</strong>
                <br />
                <code
                  style={{ fontSize: "12px", wordBreak: "break-all" }}
                >
                  <a
                    style={{ color: "white" }}
                    href={`https://tonviewer.com/${
                      auctionInfo.maxBidderOwner || t("domainLeftAuction")
                    }`}
                  >
                    {auctionInfo.maxBidderOwner ||
                      t("domainLeftAuction")}
                  </a>
                </code>
              </div>
              <div style={{ marginBottom: "10px" }}>
                <strong>{t("maxBid")}: </strong>
                {Number(auctionInfo.maxBid) === 0
                  ? t("hideAfterAuctionEnd")
                  : (Number(auctionInfo.maxBid) / 1_000_000_000).toFixed(
                      2
                    )}{" "}
                TON
              </div>
              <div style={{ marginBottom: "10px" }}>
                <strong>{t("endTime")}:</strong>{" "}
                {new Date(auctionInfo.timestamp * 1000).toLocaleString()}
              </div>
              <div>
                <strong>{t("status")}:</strong>
                <span
                  style={{
                    marginLeft: "5px",
                    color: auctionInfo.isActive ? "#4ade80" : "#f87171",
                  }}
                >
                  {auctionInfo.isActive
                    ? `🟢 ${t("active")}`
                    : `🔴 ${t("ended")}`}
                </span>
              </div>
              <div
                style={{
                  marginTop: "10px",
                  paddingTop: "10px",
                  borderTop: "1px solid #444",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ fontSize: "11px", color: "#aaa" }}>
                  <strong>{t("networkLabel")}</strong>{" "}
                  {isTestnet ? t("testnet") : t("mainnet")}
                </div>
                {activeTab === "proxy" && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <IconButton
                      size="s"
                      mode="outline"
                      onClick={handleCopyAuctionLink}
                      title={t("copyAuctionLink")}
                      style={{
                        backgroundColor: "#333",
                        borderColor: "#555",
                        color: "white",
                        padding: "4px 8px",
                        fontSize: "10px",
                      }}
                    >
                      📋
                    </IconButton>
                    <IconButton
                      size="s"
                      mode="outline"
                      onClick={handleShareAuction}
                      title={t("shareAuction")}
                      style={{
                        backgroundColor: "#333",
                        borderColor: "#555",
                        color: "white",
                        padding: "4px 8px",
                        fontSize: "10px",
                      }}
                    >
                      🔗
                    </IconButton>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* КАРТОЧКА SBT */}
        {hasChecked && sbtSubdomainInfo && activeTab === "sbt" && (
          <Card
            style={{
              background: sbtSubdomainInfo.isTaken
                ? "linear-gradient(to bottom, #2a1a1a, #3a2a2a)"
                : "linear-gradient(to bottom, #1a2a1a, #2a3a2a)",
              marginBottom: "20px",
              padding: "15px",
              borderRadius: "10px",
              width: "280px",
              border: sbtSubdomainInfo.isTaken
                ? "2px solid #f87171"
                : "2px solid #4a90e2",
            }}
          >
            <div style={{ color: "#fff", fontSize: "14px" }}>
              <div
                style={{
                  marginBottom: "10px",
                  textAlign: "center",
                  color: sbtSubdomainInfo.isTaken ? "#f87171" : "#4a90e2",
                  fontWeight: "bold",
                }}
              >
                {sbtSubdomainInfo.isTaken
                  ? `❌ ${t("sbtSubdomainAlreadyTaken")}`
                  : `✅ ${t("sbtSubdomainAvailable")}`}
              </div>
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <img
                  style={{
                    width: "200px",
                    height: "200px",
                    borderRadius: "25px",
                    marginBottom: "15px",
                  }}
                  src={getImageUrl()}
                  alt="subdomainImage"
                />
              </div>
              {sbtSubdomainInfo.isTaken &&
                sbtSubdomainInfo.ownerAddress && (
                  <>
                    <div style={{ marginBottom: "10px" }}>
                      <strong>{t("sbtOwner")}:</strong>
                      <br />
                      <code
                        style={{
                          fontSize: "12px",
                          wordBreak: "break-all",
                        }}
                      >
                        <a
                          style={{ color: "white" }}
                          href={`https://tonviewer.com/${sbtSubdomainInfo.ownerAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {sbtSubdomainInfo.ownerAddress}
                        </a>
                      </code>
                    </div>
                    {sbtSubdomainInfo.nftAddress && (
                      <div style={{ marginBottom: "10px" }}>
                        <strong>NFT Address:</strong>
                        <br />
                        <code
                          style={{
                            fontSize: "12px",
                            wordBreak: "break-all",
                          }}
                        >
                          <a
                            style={{ color: "white" }}
                            href={`https://tonviewer.com/${sbtSubdomainInfo.nftAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {sbtSubdomainInfo.nftAddress}
                          </a>
                        </code>
                      </div>
                    )}
                    {sbtSubdomainInfo.timestamp && (
                      <div style={{ marginBottom: "10px" }}>
                        <strong>{t("created")}:</strong>{" "}
                        {new Date(
                          sbtSubdomainInfo.timestamp * 1000
                        ).toLocaleString()}
                      </div>
                    )}
                  </>
                )}
              {!sbtSubdomainInfo.isTaken && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "8px",
                    background: "rgba(74, 144, 226, 0.1)",
                    borderRadius: "5px",
                    fontSize: "12px",
                    color: "#ccc",
                    textAlign: "center",
                  }}
                >
                  {t("sbtForPersonalUse")} • {t("buyFor1TON")}
                </div>
              )}
              <div
                style={{
                  marginTop: "10px",
                  paddingTop: "10px",
                  borderTop: "1px solid #444",
                  fontSize: "11px",
                  color: "#aaa",
                }}
              >
                <strong>{t("networkLabel")}</strong>{" "}
                {isTestnet ? t("testnet") : t("mainnet")}
              </div>
            </div>
          </Card>
        )}

        {/* Сообщение — субдомен свободен */}
        {hasChecked && !auctionInfo && !sbtSubdomainInfo && (
          <Card
            style={{
              background:
                activeTab === "sbt"
                  ? "linear-gradient(to bottom, #1a2a1a, #2a2a2a)"
                  : "linear-gradient(to bottom, #2a1a1a, #2a2a1a)",
              marginBottom: "20px",
              padding: "15px",
              borderRadius: "10px",
              width: "280px",
              border:
                activeTab === "sbt"
                  ? "2px solid #4a90e2"
                  : "2px solid #4ade80",
            }}
          >
            <div
              style={{
                color: "#fff",
                fontSize: "14px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  marginBottom: "10px",
                  color: activeTab === "sbt" ? "#4a90e2" : "#4ade80",
                  fontWeight: "bold",
                }}
              >
                {activeTab === "sbt"
                  ? sbtPurchaseCompleted
                    ? `✅ ${t("sbtSubdomainPurchased")}`
                    : `✅ ${t("sbtSubdomainAvailable")}`
                  : `✅ ${t("subdomainAvailable")}`}
              </div>
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <img
                  style={{
                    width: "200px",
                    height: "200px",
                    borderRadius: "25px",
                    marginBottom: "15px",
                  }}
                  src={getImageUrl()}
                  alt="subdomainImage"
                />
              </div>
              <div style={{ color: "#ccc", fontSize: "13px" }}>
                {activeTab === "sbt"
                  ? sbtPurchaseCompleted
                    ? t("sbtSubdomainPurchased")
                    : t("sbtForPersonalUse")
                  : t("makeFirstBid")}
              </div>
              <div
                style={{
                  marginTop: "10px",
                  paddingTop: "10px",
                  borderTop: "1px solid #444",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ fontSize: "11px", color: "#aaa" }}>
                  <strong>{t("networkLabel")}</strong>{" "}
                  {isTestnet ? t("testnet") : t("mainnet")}
                </div>
                {activeTab === "proxy" && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <IconButton
                      size="s"
                      mode="outline"
                      onClick={handleCopyAuctionLink}
                      title={t("copyAuctionLink")}
                      style={{
                        backgroundColor: "#333",
                        borderColor: "#555",
                        color: "white",
                        padding: "4px 8px",
                        fontSize: "10px",
                      }}
                    >
                      📋
                    </IconButton>
                    <IconButton
                      size="s"
                      mode="outline"
                      onClick={handleShareAuction}
                      title={t("shareAuction")}
                      style={{
                        backgroundColor: "#333",
                        borderColor: "#555",
                        color: "white",
                        padding: "4px 8px",
                        fontSize: "10px",
                      }}
                    >
                      🔗
                    </IconButton>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* ТАЙМЕР */}
        {activeTab === "proxy" && (
          <Card
            style={{
              background: "linear-gradient(to bottom, black, gray)",
              marginBottom: "20px",
              padding: "5px 5px 20px 5px",
              borderRadius: "10px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
              width: "min-content",
            }}
          >
            <FlipTimer
              auctionData={auctionInfo}
              defaultTime={
                hasChecked && !auctionInfo ? 86400 : undefined
              }
              onComplete={() => console.log("Аукцион завершен!")}
            />
            <div style={{ fontSize: "11px", color: "#aaa" }}>
              {t("networkLabel")}{" "}
              {isTestnet ? t("testnet") : t("mainnet")}
            </div>
          </Card>
        )}

        {/* Селект кастомной ставки */}
        {hasChecked &&
          auctionInfo &&
          auctionInfo.isActive &&
          activeTab === "proxy" && (
            <>
              <div style={{ position: "relative", width: "200px" }}>
                <select
                  value={showCustomInput ? "custom" : customBidAmount}
                  onChange={handleBidSelectChange}
                  style={{
                    width: "200px",
                    borderRadius: "25px",
                    padding: "10px 15px",
                    fontSize: "14px",
                  }}
                >
                  <option value="">
                    {`${t("price")}: Min. ${(
                      calculateBidPrice / 1_000_000_000
                    ).toFixed(2)} TON`}
                  </option>
                  <option value="custom">{t("enterValue")}</option>
                  <option value="10">10 TON</option>
                  <option value="20">20 TON</option>
                  <option value="50">50 TON</option>
                  <option value="100">100 TON</option>
                  <option value="500">500 TON</option>
                </select>
              </div>
              {showCustomInput && (
                <div style={{ position: "relative", width: "200px" }}>
                  <Input
                    placeholder={t("yourBid")}
                    value={manualBidValue}
                    onChange={(e) =>
                      handleManualBidChange(e.target.value)
                    }
                    style={{
                      width: "200px",
                      borderRadius: "25px",
                      padding: "10px 15px",
                      fontSize: "24px",
                      fontWeight: "600",
                      marginLeft: "20px",
                    }}
                  />
                </div>
              )}
            </>
          )}

        {/* Шаг 3: Основная кнопка действия */}
        {hasChecked && getActionButtonText() && (
          <div style={{ position: "relative", width: "280px" }}>
            <div
              style={{
                position: "absolute",
                left: "-30px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "18px",
                fontWeight: "bold",
                color: isDark ? "white" : "black",
              }}
            >
              3
            </div>
            <Button
              onClick={getActionButtonHandler()}
              disabled={getActionButtonDisabled()}
              style={{
                width: "280px",
                borderRadius: "25px",
                padding: "10px 15px",
                backgroundColor: getActionButtonColor(),
                marginBottom:
                  activeTab === "proxy" &&
                  auctionInfo &&
                  !auctionInfo.isActive &&
                  !canClaim
                    ? "10px"
                    : "0",
                display: getActionButtonText() ? "block" : "none",
              }}
            >
              {getActionButtonText()}
            </Button>
          </div>
        )}

        {/* Шаг 4: Marketplace (аукцион завершён, пользователь не выиграл) */}
        {hasChecked &&
          auctionInfo &&
          !auctionInfo.isActive &&
          !canClaim &&
          activeTab === "proxy" && (
            <div style={{ position: "relative", width: "280px" }}>
              <div
                style={{
                  position: "absolute",
                  left: "-30px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: isDark ? "white" : "black",
                }}
              >
                4
              </div>
              <a
                href={marketplaceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  width: "280px",
                  borderRadius: "25px",
                  padding: "11.75px 15px",
                  backgroundColor: "#6366f1",
                  color: "white",
                  textDecoration: "none",
                  textAlign: "center",
                  fontWeight: "bold",
                  cursor: "pointer",
                  border: "none",
                }}
              >
                🛍️ {t("viewOnMarketplace")}
              </a>
            </div>
          )}

        {/* Шаг 4: Кнопка «Создать сайт» (после покупки/claim) */}
        {(sbtPurchaseCompleted ||
          (auctionInfo && !auctionInfo.isActive && canClaim)) && (
          <div style={{ position: "relative", width: "280px" }}>
            <div
              style={{
                position: "absolute",
                left: "-30px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "18px",
                fontWeight: "bold",
                color: isDark ? "white" : "black",
              }}
            >
              4
            </div>
            <a
              href="https://t.me/Ton_site_builder_bot?startapp"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                width: "280px",
                borderRadius: "25px",
                padding: "11.75px 15px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "white",
                textDecoration: "none",
                textAlign: "center",
                fontWeight: "bold",
                cursor: "pointer",
                border: "none",
                fontSize: "14px",
              }}
            >
              🏗️ Создать сайт на {subDomainName}.{selectedDomainZone}
            </a>
          </div>
        )}
      </List>
    </Page>
  );
};
