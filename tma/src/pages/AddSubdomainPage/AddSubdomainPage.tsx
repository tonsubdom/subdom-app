// src/pages/AuctionPage/index.tsx
// import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
// import {
//   Banner,
//   Button,
//   Card,
//   Input,
//   List,
//   IconButton
// } from "@telegram-apps/telegram-ui";
// import { useTonWallet, useTonAddress } from "@tonconnect/ui-react";
// import { useTonConnectUI } from "@tonconnect/ui-react";
// import TonWeb from "tonweb";
// import { Address } from 'ton-core';
// import Box from '@mui/material/Box';
// import Tabs from '@mui/material/Tabs';
// import Tab from '@mui/material/Tab';

// import { useTypedDispatch } from '../../hooks/useTypeDispatch';
// import { Page } from "@/components/Page";
// import { ShowSnackbar } from "@/components/ShowSnackbar";
// import { claimSubdomain } from '@/store/nft/actions';
// import FlipTimer from './flipTimer/FlipTimer';
// import { getAuctionInfo, ParsedAuctionInfo } from './flipTimer/getAuctionInfo';
// import { useLanguage } from '@/contexts/LanguageContext';
// import { useTheme } from '@/contexts/ThemeContext';
// import { useUser } from '@/contexts/UserContext';
// import { apiService, Subdomain } from '@/services/api';

// import { checkSBTSubdomain, SBTSubdomainInfo } from './checkSBTSubdomain';
// import { calculateProxyNFTAddress } from './CalculateProxyNFTAddress';

// // ИМПОРТ ДЛЯ РАБОТЫ С ЗОНАМИ ИЗ БАЗЫ
// import { useZones } from '@/hooks/useZones';
// import ActiveAuctions from '@/components/ActiveAuctions/ActiveAuctions';
// import { useAuctionIntegration } from '@/hooks/useAuctionIntegration';

// // ИМПОРТ УТИЛИТ ДЛЯ URL ПАРАМЕТРОВ
// import {
//   getAuctionParamsFromUrl,
//   updateAuctionUrl,
//   copyAuctionUrlToClipboard,
//   shareAuction,
//   isAuctionPage,
//   clearAuctionUrl
// } from '@/utils/urlParams';

// import { useLaunchParams } from '@telegram-apps/sdk-react';
// import { MiniAppLinks } from '@/utils/miniAppLinks';
// import { AuctionCollectionSelector } from './AuctionCollectionSelector';
// import { getUserSbtSubdomainsCount } from '@/utils/sbt-utils';

// type CollectionAddressMap = {
//   [key: string]: string;
// };

// type ActiveTab = 'proxy' | 'sbt';

// const mapPrices = {
//   1: 30,
//   2: 20,
//   3: 10,
//   4: 5,
//   5: 2.5,
//   6: 1,
// };

// const API_PAYLOAD_URL = import.meta.env.VITE_API_SC_PAYLOAD_URL;

// const normalizeAddress = (addr: string): string => {
//   if (!addr) return '';
//   try {
//     const address = Address.parse(addr);
//     return address.toString({ bounceable: true, testOnly: false });
//   } catch (error) {
//     console.error('Error parsing address:', addr, error);
//     return addr;
//   }
// };

// export const AuctionPage: React.FC<{}> = () => {
//   const dispatch = useTypedDispatch();
//   const wallet = useTonWallet();
//   const userAddress = useTonAddress();
//   const [tonConnectUI] = useTonConnectUI();
//   const { refreshSubdomains } = useUser();

//   const [sbtSubdomainInfo, setSbtSubdomainInfo] = useState<SBTSubdomainInfo | null>(null);

//   const { currentTheme } = useTheme();
//   const isDark = currentTheme === 'dark';
//   const { t } = useLanguage();

//   const [activeTab, setActiveTab] = useState<ActiveTab>('proxy');
//   const [selectedDomainZone, setSelectedDomainZone] = useState('');
//   const [subDomainName, setSubDomainName] = useState('');
//   const [collectionAddress, setCollectionAddress] = useState('');
//   const [snackbar, setSnackbar] = useState<JSX.Element | null>(null);
//   const [auctionInfo, setAuctionInfo] = useState<ParsedAuctionInfo | null>(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const [nftAddress, setNftAddress] = useState('');
//   const [hasChecked, setHasChecked] = useState(false);
//   const [isClaimLoading, setIsClaimLoading] = useState(false);
//   const [customBidAmount, setCustomBidAmount] = useState('');
//   const [showCustomInput, setShowCustomInput] = useState(false);
//   const [manualBidValue, setManualBidValue] = useState('');
//   const [sbtPurchaseCompleted, setSbtPurchaseCompleted] = useState(false);
//   const [sbtLoading, setSbtLoading] = useState(false);
//   const [sbtZonesCount, setSbtZonesCount] = useState<Record<string, number>>({});
//   const prevSbtMapRef = useRef<{cacheKey: string, map: CollectionAddressMap} | null>(null);

//   const isTestnet = wallet?.account?.chain === "-3";

//   const launchParams = useLaunchParams(); // Добавляем launchParams

//   // Добавим состояние для отслеживания, была ли страница открыта по deeplink
//   const [, setOpenedViaDeeplink] = useState(false);

//   // ИСПОЛЬЗУЕМ ХУК ДЛЯ РАБОТЫ С ЗОНАМИ ИЗ БАЗЫ
//   const {
//     allZones,
//     proxyZones,
//     sbtZones,
//     loading: zonesLoading,
//     error: zonesError,
//     refreshZones
//   } = useZones();

//   const activeSbtZones = sbtZones.filter(zone => zone.status !== 'inactive');

//   // Устанавливаем сеть в apiService при изменении isTestnet
//   useEffect(() => {
//     if (wallet) {
//       apiService.setNetwork(isTestnet);
//       console.log(`🌐 API сеть установлена: ${isTestnet ? 'testnet' : 'mainnet'}`);
//     }
//   }, [wallet, isTestnet]);

//   // Вспомогательные функции для определения типа зоны
//   const isProxyZone = useCallback((zone: any): boolean => {
//     const proxyValue = zone.proxy;

//     if (typeof proxyValue === 'number') {
//       return proxyValue === 1;
//     }

//     if (typeof proxyValue === 'string') {
//       const lowerValue = proxyValue.toLowerCase();
//       return lowerValue === 'proxy' || lowerValue === '1';
//     }

//     return false;
//   }, []);

//   // СОЗДАЕМ ДИНАМИЧЕСКИЕ МАПЫ ИЗ ЗОН БАЗЫ
//   // Proxy коллекции - ВСЕ Proxy зоны
//   const proxyCollectionAddressesMap = useMemo(() => {
//     const map: CollectionAddressMap = {};
//     allZones.forEach(zone => {
//       if (isProxyZone(zone) && zone.name && zone.collectionAddress) {
//         map[zone.name] = zone.collectionAddress;
//       }
//     });

//     console.log('🌐 Proxy коллекции загружены:', Object.keys(map).length);
//     return map;
//   }, [allZones, isProxyZone]);

//   // SBT коллекции - только зоны текущего пользователя
//   // const sbtCollectionAddressesMap = useMemo(() => {
//   //   const map: CollectionAddressMap = {};
//   //   sbtZones.forEach(zone => {
//   //     if (zone.name && zone.collectionAddress && zone.status !== 'inactive') {
//   //       map[zone.name] = zone.collectionAddress;
//   //     }
//   //   });

//   //   // console.log('🔒 SBT коллекции пользователя загружены:', Object.keys(map).length);
//   //   // console.log('SBT зоны пользователя:', sbtZones.map(z => z.name));
//   //   return map;
//   // }, [sbtZones]);

//   // SBT коллекции - только зоны текущего пользователя

//   const sbtCollectionAddressesMap = useMemo(() => {
//   const activeSbtZones = sbtZones.filter(z => z.status !== 'inactive');
//   const cacheKey = activeSbtZones
//     .map(z => `${z.name}|${z.collectionAddress}`)
//     .sort()
//     .join(';');

//   if (prevSbtMapRef.current && prevSbtMapRef.current.cacheKey === cacheKey) {
//     return prevSbtMapRef.current.map;
//   }

//   const newMap: CollectionAddressMap = {};
//   activeSbtZones.forEach(zone => {
//     if (zone.name && zone.collectionAddress) {
//       newMap[zone.name] = zone.collectionAddress;
//     }
//   });

//   prevSbtMapRef.current = { cacheKey, map: newMap };
//   return newMap;
// }, [sbtZones]);

//   // console.log(`Коллекция активных SBT-зон в мапе для селекта: ${JSON.stringify(sbtCollectionAddressesMap, null, 2)}`);

//   const currentCollectionMap = useMemo(() => {
//     return activeTab === 'proxy' ? proxyCollectionAddressesMap : sbtCollectionAddressesMap;
//   }, [activeTab, proxyCollectionAddressesMap, sbtCollectionAddressesMap]);

//   // Добавьте этот useEffect после загрузки зон
// useEffect(() => {
//   // Если есть выбранная зона, но нет collectionAddress
//   if (selectedDomainZone && !collectionAddress && allZones.length > 0) {
//     // Находим зону в списке
//     const zone = allZones.find(z => z.name === selectedDomainZone);

//     if (zone?.collectionAddress) {
//       console.log(`✅ Устанавливаем collectionAddress из базы: ${zone.collectionAddress}`);
//       setCollectionAddress(zone.collectionAddress);
//     } else {
//       console.log(`⚠️ У зоны "${selectedDomainZone}" нет collectionAddress в базе`);

//       // Пробуем найти в текущей мапе коллекций
//       const addressFromMap = currentCollectionMap[selectedDomainZone];
//       if (addressFromMap) {
//         console.log(`✅ Устанавливаем collectionAddress из мапы: ${addressFromMap}`);
//         setCollectionAddress(addressFromMap);
//       }
//     }
//   }
// }, [selectedDomainZone, collectionAddress, allZones, currentCollectionMap]);

//   // const domainZoneName = useMemo(() => {
//   //   return selectedDomainZone.split('.')[0];
//   // }, [selectedDomainZone]);
//   //  console.log(`Текущее имя зоны:${domainZoneName}`);
//   const domainZoneName = useMemo(() => {
//   if (!selectedDomainZone) return '';
//   return selectedDomainZone.split('.')[0];
// }, [selectedDomainZone]);

//   const calculateDomainPrice = useMemo(() => {
//     if (activeTab === 'sbt') {
//       return 500_000_000; // Фиксированная цена 0.5 TON для SBT
//     }

//     const domainLength = subDomainName.length;
//     const basePrice = mapPrices[domainLength as keyof typeof mapPrices] || 0.5;
//     return Math.floor(basePrice * 1_000_000_000);
//   }, [subDomainName, activeTab]);

//   const calculateBidPrice = useMemo(() => {
//     if (activeTab === 'sbt' || !auctionInfo) return 0;

//     if (customBidAmount && !isNaN(Number(customBidAmount))) {
//       return Math.floor(Number(customBidAmount) * 1_000_000_000);
//     }

//     const currentMaxBid = Number(auctionInfo.maxBid);
//     const bidIncrease = Math.ceil(currentMaxBid * 0.05);
//     return currentMaxBid + bidIncrease;
//   }, [auctionInfo, customBidAmount, activeTab]);

//   const canClaim = useMemo(() => {
//   if (activeTab === 'sbt' || !auctionInfo || !userAddress) return false;

//   try {
//     // Проверяем, что maxBidderOwner не равен null
//     if (auctionInfo.maxBidderOwner === null) return false;

//     const normalizedMaxBidder = normalizeAddress(auctionInfo.maxBidderOwner);
//     const normalizedUserAddress = normalizeAddress(userAddress);
//     const isEqual = normalizedMaxBidder === normalizedUserAddress;

//     return !auctionInfo.isActive && isEqual;
//   } catch (error) {
//     console.error('Error in canClaim:', error);
//     return false;
//   }
// }, [auctionInfo, userAddress, activeTab]);

//   const marketplaceUrl = useMemo(() => {
//     if (activeTab === 'sbt' || !nftAddress || !collectionAddress) return '';

//     const baseUrl = isTestnet
//       ? 'https://testnet.getgems.io'
//       : 'https://getgems.io';

//     return `${baseUrl}/collection/${collectionAddress}/${nftAddress}`;
//   }, [nftAddress, collectionAddress, isTestnet, activeTab]);

//     const showSnackbar = useCallback((message: string, type: "success" | "error" = "success") => {
//       setSnackbar(<ShowSnackbar message={message} type={type} onClose={() => setSnackbar(null)} />);
//     }, []);

//   // Функция для обновления URL с параметрами текущего аукциона
//     // const updateUrlWithCurrentAuction = useCallback(() => {
//     //   if (selectedDomainZone && subDomainName) {
//     //     updateAuctionUrl({
//     //       zone: selectedDomainZone,
//     //       subdomain: subDomainName,
//     //     });
//     //   }
//     // }, [selectedDomainZone, subDomainName, activeTab]);

//     // Функция для обновления URL с параметрами текущего аукциона
// const updateUrlWithCurrentAuction = useCallback(() => {
//   if (selectedDomainZone && subDomainName && activeTab === 'proxy') {
//     console.log(`🔗 Обновление URL: зона=${selectedDomainZone}, субдомен=${subDomainName}`);
//     updateAuctionUrl({
//       zone: selectedDomainZone,
//       subdomain: subDomainName,
//     });
//   }
// }, [selectedDomainZone, subDomainName, activeTab]);

//     // Функция для копирования ссылки на аукцион
//     const handleCopyAuctionLink = useCallback(async () => {
//       // Копируем ссылку только для proxy таба
//   // if (activeTab !== 'proxy') {
//   //   showSnackbar("Ссылки доступны только для Proxy аукционов", "info");
//   //   return;
//   // }
//       if (!selectedDomainZone || !subDomainName) {
//         showSnackbar(t('selectZoneAndSubdomainFirst'), "error");
//         return;
//       }

//       const success = await copyAuctionUrlToClipboard({
//         zone: selectedDomainZone,
//         subdomain: subDomainName,
//       });

//       if (success) {
//         showSnackbar(t('auctionLinkCopied'), "success");
//       } else {
//         showSnackbar(t('failedToCopyLink'), "error");
//       }
//     }, [selectedDomainZone, subDomainName, activeTab, showSnackbar]);

//     // Функция для поделиться аукционом
//     const handleShareAuction = useCallback(async () => {
//       if (!selectedDomainZone || !subDomainName) {
//         showSnackbar(t('selectZoneAndSubdomainFirst'), "error");
//         return;
//       }

//       const success = await shareAuction({
//         zone: selectedDomainZone,
//         subdomain: subDomainName,
//       });

//       if (!success) {
//         // Если Web Share API не поддерживается, предлагаем копирование
//         await handleCopyAuctionLink();
//       }
//     }, [selectedDomainZone, subDomainName, activeTab, showSnackbar, handleCopyAuctionLink]);

//   // Добавим состояние для отслеживания, была ли страница открыта по deeplink

//   // Проверяем, открыто ли через deeplink при монтировании
//   useEffect(() => {
//     const startappParam = launchParams.startParam;
//     if (startappParam) {
//       console.log(`🔗 AuctionPage открыт через deeplink: ${startappParam}`);
//       setOpenedViaDeeplink(true);

//       // Парсим параметр для дополнительной информации
//       const parts = startappParam.split('_');
//       if (parts[0] === 'add-subdomain') {
//         console.log('✅ Пользователь перешел на аукцион из уведомления');
//       }
//     }
//   }, [launchParams.startParam]);

//   // Обновим useEffect для загрузки параметров из URL
//   useEffect(() => {
//     // Проверяем и URL параметры, и deeplink
//     const hasUrlParams = isAuctionPage();
//     const hasDeeplink = !!launchParams.startParam;

//     if ((hasUrlParams || hasDeeplink) && allZones.length === 0) {
//       console.log('⏳ Ждем загрузку зон...');
//       return;
//     }

//     // Сначала проверяем deeplink (он имеет приоритет)
//     if (hasDeeplink) {
//       const startappParam = launchParams.startParam!;
//       console.log('📥 Загружаем аукцион из deeplink:', startappParam);

//       try {
//         const { route, params } = MiniAppLinks.parseStartapp(startappParam);

//         if (route === '/add-subdomain' && params.zone && params.subdomain) {
//           console.log('✅ Найден аукцион в deeplink:', params);
//           loadAuctionFromParams(params.zone, params.subdomain);
//         }
//       } catch (error) {
//         console.error('❌ Ошибка парсинга deeplink:', error);
//       }
//     }
//     // Затем проверяем URL параметры
//     else if (hasUrlParams) {
//       const params = getAuctionParamsFromUrl();

//       if (params.zone && params.subdomain) {
//         console.log('📥 Загружаем аукцион из URL параметров:', params);
//         loadAuctionFromParams(params.zone, params.subdomain);
//       }
//     }
//   }, [allZones, launchParams.startParam]);

// const handleCheckItem = useCallback(async () => {
//   if (!selectedDomainZone || !subDomainName || !collectionAddress) {
//     showSnackbar(t('pleaseEnterDomainName'), "error");
//     return;
//   }

//   // Валидация допустимых символов для всех режимов
//   const validCharsRegex = /^[a-z0-9-]+$/;
//   if (!validCharsRegex.test(subDomainName)) {
//     showSnackbar(t('subdomainInvalidCharsError'), "error");
//     return;
//   }

//   setIsLoading(true);
//   setHasChecked(false);
//   const lowerValue = subDomainName.toLowerCase();

//   console.log(`🔍 Checking item: ${lowerValue}.${selectedDomainZone}`);
//   console.log(`Collection address: ${collectionAddress}`);
//   console.log(`Network: ${isTestnet ? 'testnet' : 'mainnet'}`);

//   if (activeTab === 'sbt') {
//     const sbtInfo = await checkSBTSubdomain(lowerValue, collectionAddress, isTestnet);

//     if (sbtInfo) {
//       setSbtSubdomainInfo(sbtInfo);
//       setAuctionInfo(null);

//       if (sbtInfo.nftAddress) {
//         setNftAddress(sbtInfo.nftAddress);
//         console.log('✅ SBT NFT Address:', sbtInfo.nftAddress);
//       } else {
//         setNftAddress('');
//       }

//       if (sbtInfo.isTaken) {
//         console.log('❌ SBT subdomain is already taken');
//         showSnackbar(t('sbtSubdomainAlreadyTaken'), "error");
//       } else {
//         console.log('✅ SBT subdomain is available for purchase');
//         showSnackbar(t('sbtSubdomainAvailable'), "success");
//       }
//     } else {
//       setSbtSubdomainInfo(null);
//       setAuctionInfo(null);
//       setNftAddress('');
//       console.log('❌ Failed to check SBT subdomain');
//       showSnackbar(t('checkingAvailability'), "error");
//     }
//   } else {
//     // PROXY режим
//     const info = await getAuctionInfo(lowerValue, collectionAddress, isTestnet);

//     if (info) {
//       // Аукцион уже существует
//       setAuctionInfo(info);
//       setSbtSubdomainInfo(null);

//       if (info.nftAddress) {
//         setNftAddress(info.nftAddress);
//         console.log('✅ NFT Address from auction:', info.nftAddress);
//       } else {
//         // Если в информации об аукционе нет адреса NFT
//         // const proxyInfo = await calculateProxyNFTAddress(lowerValue, collectionAddress, isTestnet);
//         // if (proxyInfo) {
//         //   setNftAddress(proxyInfo);
//         //   console.log('✅ Calculated NFT Address for auction:', proxyInfo);
//         // }
//         // Это не должно происходить, но на всякий случай
//         console.warn('⚠️ Auction info exists but nftAddress is missing');
//         setNftAddress('');
//       }

//       console.log('✅ Auction info loaded successfully');
//       showSnackbar(t('auctionInfoLoaded'), "success");

//       // Обновляем URL для proxy режима
//       if (activeTab === 'proxy') {
//         updateUrlWithCurrentAuction();
//       }
//     } else {
//       // Аукцион не существует - первая ставка
//       setAuctionInfo(null);
//       setSbtSubdomainInfo(null);

//       // Используем специальную функцию для расчета адреса NFT для первой ставки
//       const proxyNFTAddress = await calculateProxyNFTAddress(lowerValue, collectionAddress, isTestnet);
//       console.log(`Адрес прокси субдомена из расчетов: ${proxyNFTAddress}`);

//       if (proxyNFTAddress) {
//         setNftAddress(proxyNFTAddress);
//         console.log('✅ Calculated NFT Address for first bid:', proxyNFTAddress);
//         showSnackbar(t('subdomainAvailableForFirstBid'), "success");
//       } else {
//         setNftAddress('');
//         console.log('❌ Failed to calculate NFT address');
//         showSnackbar(t('failedToCalculateNFTAddress'), "error");
//       }

//       // Обновляем URL для proxy режима
//       if (activeTab === 'proxy') {
//         updateUrlWithCurrentAuction();
//       }
//     }
//   }

//   setHasChecked(true);
//   setIsLoading(false);
// }, [selectedDomainZone, subDomainName, collectionAddress, isTestnet, t, activeTab, updateUrlWithCurrentAuction]);

// // Функция для загрузки SBT субдоменов пользователя
// const loadUserSbtSubdomainsCount = useCallback(async () => {
//   if (!userAddress || activeTab !== 'sbt') return;

//   try {
//     console.log(`🔄 Загрузка SBT субдоменов пользователя ${userAddress}...`);
//     const counts = await getUserSbtSubdomainsCount(userAddress, isTestnet);
//     setSbtZonesCount(counts);
//     console.log('✅ SBT субдомены пользователя загружены:', counts);
//   } catch (error) {
//     console.error('❌ Ошибка загрузки SBT субдоменов:', error);
//     setSbtZonesCount({});
//   }
// }, [userAddress, isTestnet, activeTab]);

// // Загружаем SBT субдомены при изменении пользователя или таба
// useEffect(() => {
//   if (activeTab === 'sbt' && userAddress) {
//     loadUserSbtSubdomainsCount();
//   } else {
//     setSbtZonesCount({});
//   }
// }, [activeTab, userAddress, loadUserSbtSubdomainsCount]);

//   // Функция для загрузки аукциона из параметров
// const loadAuctionFromParams = useCallback((zoneName: string, subdomainName: string) => {
//   console.log('🚀 Загрузка аукциона:', { zoneName, subdomainName });

//   // Помечаем, что страница открыта по deeplink/URL
//   setOpenedViaDeeplink(true);

//   // Автоматически переключаемся на proxy таб
//   setActiveTab('proxy');

//   // Устанавливаем зону и субдомен
//   setSelectedDomainZone(zoneName);
//   setSubDomainName(subdomainName);

//   // Находим collectionAddress для зоны
//   const zone = allZones.find(z => z.name === zoneName);
//   if (zone?.collectionAddress) {
//     setCollectionAddress(zone.collectionAddress);
//   }

//   // ДОБАВЛЯЕМ ОБНОВЛЕНИЕ URL
//   updateUrlWithCurrentAuction();

//   // Даем время для обновления UI, затем проверяем
//   setTimeout(() => {
//     handleCheckItem();
//   }, 500);
// }, [allZones, handleCheckItem, updateUrlWithCurrentAuction]);

// const handleTabChange = (_event: React.SyntheticEvent, newValue: ActiveTab) => {
//     setActiveTab(newValue);
//     setSelectedDomainZone('');
//     setSubDomainName('');
//     setCollectionAddress('');
//     setAuctionInfo(null);
//     setNftAddress('');
//     setHasChecked(false);
//     setCustomBidAmount('');
//     setShowCustomInput(false);
//     setManualBidValue('');
//     setSbtPurchaseCompleted(false);
//     setOpenedViaDeeplink(false); // Сбрасываем флаг deeplink

//     // При переключении на SBT очищаем URL параметры
//     if (newValue === 'sbt') {
//       clearAuctionUrl();
//     }
//   };

// // Функция для проверки субдомена по zoneName и subdomainName
// const checkItemByName = useCallback(async (zoneName: string, subdomain: string) => {
//   console.log(`🔍 Проверка субдомена: зона=${zoneName}, субдомен=${subdomain}`);

//     // Сбрасываем предыдущие состояния
//   setAuctionInfo(null);
//   setNftAddress('');
//   setHasChecked(false);
//   setCustomBidAmount('');
//   setShowCustomInput(false);
//   setManualBidValue('');
//   setSbtPurchaseCompleted(false);

//   // Устанавливаем выбранную зону и субдомен
//   setSelectedDomainZone(zoneName);
//   setSubDomainName(subdomain);

//   // Находим зону по имени для получения collectionAddress
//   const zone = allZones.find(z => z.name === zoneName);
//   if (zone?.collectionAddress) {
//     setCollectionAddress(zone.collectionAddress);
//     console.log(`✅ Collection адрес установлен: ${zone.collectionAddress}`);
//   } else {
//     console.warn(`⚠️ У зоны "${zoneName}" нет collectionAddress`);
//     setCollectionAddress("");
//   }

//   // Даем время для обновления UI
//   await new Promise(resolve => setTimeout(resolve, 100));

//   // Вызываем стандартную проверку
//   await handleCheckItem();
// }, [allZones, setSelectedDomainZone, setSubDomainName, setCollectionAddress, handleCheckItem]);

// // Используем исправленный хук для интеграции с ActiveAuctions
// const {
//   handleAuctionClick,
//   setSelectedZoneName,
//   setSubdomainName
// } = useAuctionIntegration({
//   zones: allZones,
//   checkItem: checkItemByName  // Используем функцию, которая принимает имя зоны
// });

// // Функция для обработки клика из ActiveAuctions
// const handleAuctionClickFromComponent = useCallback((zoneName: string, subdomainName: string) => {
//   console.log(`🎯 Клик из ActiveAuctions: зона=${zoneName}, субдомен=${subdomainName}`);

//   // Вызываем обработчик из исправленного хука
//   handleAuctionClick(zoneName, subdomainName);

//   // ДОБАВЛЯЕМ ОБНОВЛЕНИЕ URL
//   if (activeTab === 'proxy') {
//     updateUrlWithCurrentAuction();
//   }
// }, [handleAuctionClick, activeTab, updateUrlWithCurrentAuction]);

// // Также добавьте функцию для принудительной установки collectionAddress
// const setupCollectionAddressForZone = useCallback((zoneName: string) => {
//   if (!zoneName) return false;

//   // Ищем зону в базе
//   const zone = allZones.find(z => z.name === zoneName);

//   if (zone?.collectionAddress) {
//     setCollectionAddress(zone.collectionAddress);
//     console.log(`✅ Collection адрес установлен для "${zoneName}": ${zone.collectionAddress}`);
//     return true;
//   }

//   // Пробуем найти в текущей мапе
//   const addressFromMap = currentCollectionMap[zoneName];
//   if (addressFromMap) {
//     setCollectionAddress(addressFromMap);
//     console.log(`✅ Collection адрес установлен из мапы для "${zoneName}": ${addressFromMap}`);
//     return true;
//   }

//   console.log(`❌ Не удалось найти collectionAddress для зоны "${zoneName}"`);
//   return false;
// }, [allZones, currentCollectionMap, setCollectionAddress]);

// // Обновите handleDomainZoneChange
// // const handleDomainZoneChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
// //   const value = e.target.value;
// //   setSelectedDomainZone(value);

// //   // Сбрасываем флаг URL при ручном изменении
// //   setOpenedViaDeeplink(false);

// //   // Синхронизируем с хуком (теперь передаем имя зоны)
// //   setSelectedZoneName(value);

// //   setAuctionInfo(null);
// //   setNftAddress('');
// //   setHasChecked(false);
// //   setCustomBidAmount('');
// //   setShowCustomInput(false);
// //   setManualBidValue('');
// //   setSbtPurchaseCompleted(false);

// //   // Устанавливаем collectionAddress
// //   setupCollectionAddressForZone(value);

// //   // ОБНОВЛЯЕМ URL ПРИ ИЗМЕНЕНИИ ЗОНЫ
// //   if (value && subDomainName && activeTab === 'proxy') {
// //     updateUrlWithCurrentAuction();
// //   }
// // }, [setSelectedDomainZone, setOpenedViaDeeplink, setSelectedZoneName, setupCollectionAddressForZone, setAuctionInfo, setNftAddress, setHasChecked, setCustomBidAmount, setShowCustomInput, setManualBidValue, setSbtPurchaseCompleted, subDomainName, activeTab, updateUrlWithCurrentAuction]);

// // Обновляем handleSubDomainNameChange для синхронизации с хуком
// const handleSubDomainNameChange = useCallback((value: string) => {
//   setSubDomainName(value.toLowerCase());
//   setSubdomainName(value.toLowerCase()); // Синхронизируем с хуком

//   setAuctionInfo(null);
//   setNftAddress('');
//   setHasChecked(false);
//   setCustomBidAmount('');
//   setShowCustomInput(false);
//   setManualBidValue('');
//   setSbtPurchaseCompleted(false);

//   // ОБНОВЛЯЕМ URL ПРИ ИЗМЕНЕНИИ СУБДОМЕНА
//   if (selectedDomainZone && value && activeTab === 'proxy') {
//     updateUrlWithCurrentAuction();
//   }
// }, [setSubDomainName, setSubdomainName, setAuctionInfo, setNftAddress, setHasChecked, setCustomBidAmount, setShowCustomInput, setManualBidValue, setSbtPurchaseCompleted, selectedDomainZone, activeTab, updateUrlWithCurrentAuction]);

//   const handleBidSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     const value = e.target.value;

//     if (value === 'custom') {
//       setShowCustomInput(true);
//       setCustomBidAmount('');
//       setManualBidValue('');
//     } else {
//       setShowCustomInput(false);
//       setCustomBidAmount(value);
//       setManualBidValue('');
//     }
//   };

//   const handleManualBidChange = (value: string) => {
//     setManualBidValue(value);
//     if (value && !isNaN(Number(value))) {
//       setCustomBidAmount(value);
//     } else {
//       setCustomBidAmount('');
//     }
//   };

//   // Функция для создания или получения субдомена
// const createSubdomainIfNotExists = async (subdomainData: {
//   name: string;
//   address: string;
//   mintPrice: number;
//   links?: string[];
//   zoneId?: number;
//   owner?: string;
//   status: 'active' | 'inactive' | 'auction' | 'claimed';
//   auctionEndTime?: string;
//   collectionAddress?: string;
// }): Promise<Subdomain> => {
//   try {
//     // Устанавливаем сеть перед вызовом
//     apiService.setNetwork(isTestnet);

//     // Сначала пытаемся получить существующий субдомен
//     try {
//       const existingSubdomain = await apiService.getSubdomainByName(subdomainData.name);
//       console.log('✅ Субдомен уже существует:', existingSubdomain);
//       return existingSubdomain;
//     } catch (error) {
//       // Если субдомен не найден, создаем новый
//       console.log('📝 Создаем новый субдомен:', subdomainData.name);

//       const newSubdomain = await apiService.createSubdomain({
//         ...subdomainData
//       });

//       console.log('✅ Новый субдомен создан:', newSubdomain);
//       return newSubdomain;
//     }
//   } catch (error) {
//     console.error('❌ Ошибка в createSubdomainIfNotExists:', error);
//     throw error;
//   }
// };

// // В компоненте AuctionPage, добавьте/обновите следующие обработчики:

// // ОБРАБОТЧИК ДЛЯ НОВОГО КОМПОНЕНТА AuctionCollectionSelector
// const handleDomainZoneChangeForSelector = useCallback((value: string) => {
//   console.log(`🎯 Выбрана зона из AuctionCollectionSelector: ${value}`);

//   // Устанавливаем выбранную зону
//   setSelectedDomainZone(value);

//   // Сбрасываем флаг URL при ручном изменении
//   setOpenedViaDeeplink(false);

//   // Синхронизируем с хуком
//   setSelectedZoneName(value);

//   // Сбрасываем все состояния
//   setAuctionInfo(null);
//   setNftAddress('');
//   setHasChecked(false);
//   setCustomBidAmount('');
//   setShowCustomInput(false);
//   setManualBidValue('');
//   setSbtPurchaseCompleted(false);

//   // Устанавливаем collectionAddress
//   setupCollectionAddressForZone(value);

//   // ОБНОВЛЯЕМ URL ПРИ ИЗМЕНЕНИИ ЗОНЫ
//   if (value && subDomainName && activeTab === 'proxy') {
//     updateUrlWithCurrentAuction();
//   }
// }, [setSelectedDomainZone, setOpenedViaDeeplink, setSelectedZoneName, setupCollectionAddressForZone, setAuctionInfo, setNftAddress, setHasChecked, setCustomBidAmount, setShowCustomInput, setManualBidValue, setSbtPurchaseCompleted, subDomainName, activeTab, updateUrlWithCurrentAuction]);

// // УДАЛИТЕ СТАРЫЙ ОБРАБОТЧИК handleDomainZoneChange (если он есть)
// // Или переименуйте его, если он используется где-то еще

// // Также добавьте функцию для принудительной установки collectionAddress
// // const setupCollectionAddressForZone = useCallback((zoneName: string) => {
// //   if (!zoneName) return false;

// //   // Ищем зону в базе
// //   const zone = allZones.find(z => z.name === zoneName);

// //   if (zone?.collectionAddress) {
// //     setCollectionAddress(zone.collectionAddress);
// //     console.log(`✅ Collection адрес установлен для "${zoneName}": ${zone.collectionAddress}`);
// //     return true;
// //   }

// //   // Пробуем найти в текущей мапе
// //   const addressFromMap = currentCollectionMap[zoneName];
// //   if (addressFromMap) {
// //     setCollectionAddress(addressFromMap);
// //     console.log(`✅ Collection адрес установлен из мапы для "${zoneName}": ${addressFromMap}`);
// //     return true;
// //   }

// //   console.log(`❌ Не удалось найти collectionAddress для зоны "${zoneName}"`);
// //   return false;
// // }, [allZones, currentCollectionMap, setCollectionAddress]);

//   // Старт аукциона с интеграцией базы данных

// const handleStartAuction = async () => {
//   if (!selectedDomainZone || !subDomainName || !collectionAddress) {
//     showSnackbar(t('pleaseEnterDomainName'), "error");
//     return;
//   }

//   if (!userAddress) {
//     showSnackbar(t('walletNotConnected'), "error");
//     return;
//   }

//   try {
//     const tonWeb = new TonWeb();
//     const cell = new tonWeb.boc.Cell();
//     cell.bits.writeUint(0, 32);
//     cell.bits.writeString(`${subDomainName}`);
//     const payload = TonWeb.utils.bytesToBase64(await cell.toBoc());

//     // 1. Отправляем транзакцию в блокчейн
//     await tonConnectUI.sendTransaction({
//       validUntil: Math.floor(Date.now() / 1000) + 360,
//       messages: [{
//         amount: calculateDomainPrice.toString(),
//         address: collectionAddress,
//         payload: payload,
//       }],
//     });

//     console.log('✅ Транзакция отправлена в блокчейн');

//     // 2. Работа с базой данных
//     const fullSubDomainName = `${subDomainName}.${selectedDomainZone}`;
//     const auctionEndTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Исправлено на 24 часа

//     try {
//       // Устанавливаем сеть перед вызовом
//       apiService.setNetwork(isTestnet);

//       // Находим зону для получения zoneId
//       const zone = allZones.find(z => z.name === selectedDomainZone);

//       console.log(`📊 Создание субдомена:`, {
//         name: fullSubDomainName,
//         address: nftAddress,
//         mintPrice: calculateDomainPrice / 1_000_000_000,
//         owner: userAddress,
//         status: 'auction',
//         auctionEndTime,
//         zoneId: zone?.id,
//         collectionAddress: zone?.collectionAddress,
//         isTestnet
//       });

//       const result = await apiService.createSubdomain({
//         name: fullSubDomainName,
//         address: nftAddress,
//         mintPrice: calculateDomainPrice / 1_000_000_000,
//         owner: userAddress,
//         status: 'auction',
//         auctionEndTime: auctionEndTime,
//         zoneId: zone?.id,
//         collectionAddress: zone?.collectionAddress,
//       });

//       console.log('✅ Субдомен создан в базе:', result);

//       // 3. Обновляем зоны (чтобы ActiveAuctions увидел изменения)
//       refreshZones();

//       showSnackbar(t('startAuction'), "success");

//     } catch (dbError: any) {
//       console.error('❌ Ошибка работы с базой данных:', dbError);
//       console.error('Stack trace:', dbError.stack);

//       // Показываем предупреждение, но не ошибку, так как транзакция прошла
//       showSnackbar(t('auctionStartedBlockchainDbError'), "error");
//     }

//     // 4. Обновляем информацию об аукционе
//     setTimeout(() => {
//       handleCheckItem();
//     }, 2000);

//   } catch (error: any) {
//     console.error('❌ Ошибка транзакции:', error);

//     if (error?.message?.includes('cancelled')) {
//       showSnackbar(t('auctionStartCancelled'), "error");
//     } else if (error?.message?.includes('rejected')) {
//       showSnackbar(t('auctionStartRejected'), "error");
//     } else if (error?.message?.includes('insufficient')) {
//       showSnackbar(t('insufficientFundsForAuctionStart'), "error");
//     } else {
//       showSnackbar(t('auctionStartError'), "error");
//     }
//   }
// };

//   // Размещение ставки с интеграцией базы данных - ФИНАЛЬНАЯ ВЕРСИЯ
// const handlePlaceBid = async () => {
//   if (!auctionInfo || !selectedDomainZone || !subDomainName || !collectionAddress) {
//     showSnackbar(t('auctionDataNotLoaded'), "error");
//     return;
//   }

//   if (!userAddress) {
//     showSnackbar(t('walletNotConnected'), "error");
//     return;
//   }

//   try {
//     const tonWeb = new TonWeb();
//     const cell = new tonWeb.boc.Cell();
//     cell.bits.writeUint(1, 32); // Операция ставки
//     cell.bits.writeString(`${subDomainName}`);

//     console.log(`🎯 Размещение ставки для: ${subDomainName}.${selectedDomainZone}`);
//     console.log(`💰 Сумма: ${calculateBidPrice} нанотонов (${calculateBidPrice / 1_000_000_000} TON)`);
//     console.log(`👤 Пользователь: ${userAddress}`);
//     console.log(`🌐 Сеть: ${isTestnet ? 'testnet' : 'mainnet'}`);

//     // 1. Отправляем транзакцию в блокчейн
//     await tonConnectUI.sendTransaction({
//       validUntil: Math.floor(Date.now() / 1000) + 360,
//       messages: [{
//         amount: calculateBidPrice.toString(),
//         address: nftAddress,
//       }],
//     });

//     console.log('✅ Транзакция отправлена в блокчейн');

//     // 2. Работа с базой данных
//     const fullDomainName = `${subDomainName}.${selectedDomainZone}`;

//     try {
//       // Устанавливаем сеть перед вызовом
//       apiService.setNetwork(isTestnet);

//       // Находим зону для получения zoneId
//       const zone = allZones.find(z => z.name === selectedDomainZone);

//       // Создаем или получаем субдомен
//       const subdomain = await createSubdomainIfNotExists({
//         name: fullDomainName,
//         address: nftAddress,
//         mintPrice: calculateBidPrice / 1_000_000_000,
//         owner: userAddress,
//         status: 'auction',
//         auctionEndTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
//         zoneId: zone?.id,
//         collectionAddress: zone?.collectionAddress,
//       });

//       console.log(`✅ Субдомен готов для ставки:`, {
//         id: subdomain.id,
//         name: subdomain.name,
//         status: subdomain.status
//       });

//       // 3. Добавляем ставку в базу данных
//       console.log(`📝 Добавляем ставку для субдомена ID: ${subdomain.id}`);

//       const bidResult = await apiService.addBidToSubdomain(subdomain.id, {
//         bidder: userAddress,
//         amount: calculateBidPrice
//       });

//       console.log('✅ Ставка добавлена в базу:', bidResult);

//       // 4. Обновляем информацию о субдомене

//         await apiService.updateSubdomainStatus(subdomain.id, 'auction');

//       // 5. Обновляем список субдоменов пользователя
//       refreshSubdomains();

//       // 6. Обновляем зоны (чтобы ActiveAuctions увидел изменения)
//       refreshZones();

//     } catch (dbError:any) {
//       console.error('❌ Ошибка работы с базой данных:', dbError);
//       console.error('Stack trace:', dbError.stack);

//       // Показываем предупреждение, но не ошибку, так как транзакция прошла
//       showSnackbar(t('bidPlacedBlockchainDbError'), "error");
//     }

//     showSnackbar(t('bid'), "success");
//     setCustomBidAmount('');
//     setShowCustomInput(false);
//     setManualBidValue('');

//     // 7. Обновляем информацию об аукционе
//     setTimeout(() => {
//       console.log('🔄 Обновляем информацию об аукционе...');
//       handleCheckItem();
//     }, 2000);

//     // 8. Обновляем компонент ActiveAuctions
//     setTimeout(() => {
//       console.log('🔄 Обновляем ActiveAuctions...');
//       // Можно добавить callback для обновления ActiveAuctions
//     }, 3000);

//   } catch (error: any) {
//     console.error('❌ Ошибка при размещении ставки:', error);

//     if (error?.message?.includes('cancelled')) {
//       showSnackbar(t('bidCancelled'), "error");
//     } else if (error?.message?.includes('rejected')) {
//       showSnackbar(t('bidRejected'), "error");
//     } else if (error?.message?.includes('insufficient')) {
//       showSnackbar(t('insufficientFundsForBid'), "error");
//     } else {
//       showSnackbar(t('bidError'), "error");
//     }
//   }
// };

//   // Покупка SBT субдомена с интеграцией базы данных
// const handlePurchaseSBTSubdomain = async () => {
//   if (!selectedDomainZone || !subDomainName || !collectionAddress) {
//     showSnackbar(t('pleaseEnterDomainName'), "error");
//     return;
//   }

//   if (!wallet) {
//     showSnackbar(t('walletNotConnected'), "error");
//     return;
//   }

//   // Проверяем что субдомен еще доступен
//   if (sbtSubdomainInfo?.isTaken) {
//     showSnackbar(t('sbtSubdomainAlreadyTaken'), "error");
//     return;
//   }

//   setSbtLoading(true);

//   try {
//     // Для SBT режима отправляем простую транзакцию покупки
//     const tonWeb = new TonWeb();
//     const cell = new tonWeb.boc.Cell();
//     cell.bits.writeUint(0, 32); // Операция покупки
//     cell.bits.writeString(`${subDomainName}`);
//     const payload = TonWeb.utils.bytesToBase64(await cell.toBoc());

//     await tonConnectUI.sendTransaction({
//       validUntil: Math.floor(Date.now() / 1000) + 360,
//       messages: [{
//         amount: calculateDomainPrice.toString(), // 0.5 TON
//         address: collectionAddress,
//         payload: payload,
//       }],
//     });

//     // Создаем субдомен в базе данных
//     const fullDomainName = `${subDomainName}.${selectedDomainZone}`;
//     const startStatus = 'active';

//     // ВАЖНО: Используем nftAddress из sbtSubdomainInfo если он есть
//     // Если нет, то используем userAddress как временный адрес
//     // userAddress может быть undefined, поэтому проверяем
//     if (!userAddress) {
//       throw new Error('User address is not available');
//     }

//     const nftAddressForDb = sbtSubdomainInfo?.nftAddress || userAddress;

//     console.log(`Имя субдомена для записи в сеть: ${fullDomainName}`);
//     console.log(`Адрес субдомена для записи в сеть: ${nftAddressForDb}`);
//     console.log(`Цена субдомена для записи в сеть: ${calculateDomainPrice / 1_000_000_000}`);

//     // Устанавливаем сеть перед вызовом
//     apiService.setNetwork(isTestnet);

//     // Находим зону для получения zoneId
//     const zone = allZones.find(z => z.name === selectedDomainZone);

//     await apiService.createSubdomain({
//       name: fullDomainName,
//       address: nftAddressForDb, // Теперь это точно string
//       mintPrice: calculateDomainPrice / 1_000_000_000,
//       owner: userAddress,
//       status: startStatus,
//       collectionAddress: collectionAddress,
//       zoneId: zone?.id
//     });

//     showSnackbar(t('sbtSubdomainPurchased'), "success");
//     setSbtPurchaseCompleted(true);

//   } catch (error: any) {
//     console.error('SBT purchase error:', error);

//     if (error?.message?.includes('cancelled')) {
//       showSnackbar(t('sbtPurchaseCancelled'), "error");
//     } else {
//       showSnackbar(t('sbtPurchaseError'), "error");
//     }
//   } finally {
//     setSbtLoading(false);
//   }
// };

// // Claim субдомена с интеграцией базы данных
//   const handleClaimSubdomain = async () => {
//     if (!nftAddress) {
//       showSnackbar(t('nftAddressNotFound'), "error");
//       return;
//     }

//     if (!userAddress) {
//       showSnackbar(t('walletNotConnected'), "error");
//       return;
//     }

//     setIsClaimLoading(true);

//     try {
//       const result = await dispatch(claimSubdomain({
//         subdomain_item_address: nftAddress,
//         query_id: 0,
//         isTestnet: isTestnet
//       })).unwrap();

//       await tonConnectUI.sendTransaction({
//         validUntil: result.validUntil,
//         messages: result.messages
//       });

//       // Обновляем статус субдомена в базе данных
//       const fullDomainName = `${subDomainName}.${selectedDomainZone}`;
//       try {
//         // Устанавливаем сеть перед вызовом
//         apiService.setNetwork(isTestnet);

//         const subdomain = await apiService.getSubdomainByName(fullDomainName);

//         if (subdomain) {
//           await apiService.updateSubdomainStatus(subdomain.id, 'claimed');
//         }
//       } catch (dbError) {
//         console.error('Ошибка обновления статуса в базе:', dbError);
//       }

//       showSnackbar(t('subdomainClaimedSuccess'), "success");

//     } catch (error) {
//       console.error('Claim error:', error);
//       showSnackbar(error instanceof Error ? error.message : t('subdomainClaimError'), "error");
//     } finally {
//       setIsClaimLoading(false);
//     }
//   };

//   // Определяем URL для изображения
// const getImageUrl = () => {
//   if (!domainZoneName || !subDomainName) return '';

//   if (activeTab === 'proxy') {
//     return `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${domainZoneName}/${subDomainName}.png`;
//   } else {
//     return `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${domainZoneName}/${subDomainName}.png`;
//   }
// };

//   // Функции для определения текста, обработчика и состояния кнопки
//   const getActionButtonText = () => {
//     if (activeTab === 'sbt') {
//       if (sbtPurchaseCompleted) {
//         return `✅ ${t('purchased')}`;
//       } else if (sbtSubdomainInfo?.isTaken) {
//         return `❌ ${t('sbtSubdomainAlreadyTaken')}`;
//       } else {
//         return `${t('mintSubdomain')} (${t('buyFor1TON')})`;
//       }
//     } else {
//       if (!auctionInfo) {
//         return `${t('startAuction')} (${t('price')}: ${calculateDomainPrice / 1_000_000_000} TON)`;
//       } else if (auctionInfo.isActive) {
//         return `${t('bid')} (${customBidAmount ? customBidAmount : (calculateBidPrice / 1_000_000_000).toFixed(2)} TON)`;
//       } else if (canClaim) {
//         return isClaimLoading ? t('claiming') : `🎁 ${t('claimSubdomain')}`;
//       } else if (auctionInfo && !auctionInfo.isActive && !canClaim) {
//         return '';
//       }
//     }
//     return '';
//   };

//   const getActionButtonHandler = () => {
//     if (activeTab === 'sbt') {
//       if (sbtPurchaseCompleted || sbtSubdomainInfo?.isTaken) {
//         return undefined;
//       }
//       return handlePurchaseSBTSubdomain;
//     } else {
//       if (!auctionInfo) {
//         return handleStartAuction;
//       } else if (auctionInfo.isActive) {
//         return handlePlaceBid;
//       } else if (canClaim) {
//         return handleClaimSubdomain;
//       } else if (auctionInfo && !auctionInfo.isActive && !canClaim) {
//         return undefined;
//       }
//     }
//     return undefined;
//   };

//   const getActionButtonDisabled = () => {
//     if (activeTab === 'sbt') {
//       return sbtPurchaseCompleted || sbtLoading || !selectedDomainZone || !subDomainName || sbtSubdomainInfo?.isTaken;
//     } else {
//       if (!auctionInfo) {
//         return !selectedDomainZone || !subDomainName;
//       } else if (auctionInfo.isActive) {
//         return false;
//       } else if (canClaim) {
//         return isClaimLoading;
//       } else if (auctionInfo && !auctionInfo.isActive && !canClaim) {
//         return true;
//       }
//     }
//     return true;
//   };

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

//   const getActionButtonColor = () => {
//     if (activeTab === 'sbt') {
//       if (sbtPurchaseCompleted) {
//         return '#4ade80';
//       } else if (sbtSubdomainInfo?.isTaken) {
//         return '#888';
//       } else {
//         return sbtLoading ? '#888' : '#4a90e2';
//       }
//     } else {
//       if (!auctionInfo) {
//         return '#4ade80';
//       } else if (auctionInfo.isActive) {
//         return 'rgb(74, 144, 226)';
//       } else if (canClaim) {
//         return isClaimLoading ? '#888' : '#4ade80';
//       } else if (auctionInfo && !auctionInfo.isActive && !canClaim) {
//         return 'transparent';
//       }
//     }
//     return '#4a90e2';
//   };

//   // Загружаем субдомены пользователя при подключении кошелька
//   useEffect(() => {
//     if (userAddress) {
//       refreshSubdomains();
//     }
//   }, [userAddress, refreshSubdomains]);

//     return (
//     <Page back={true}>
//       {snackbar}

//       <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 3 }}>
//         <Tabs
//           value={activeTab}
//           onChange={handleTabChange}
//           sx={{
//             '& .MuiTab-root': {
//               color: isDark ? '#ccc' : '#666',
//               '&.Mui-selected': {
//                 color: isDark ? '#FFD700' : '#3B82F6',
//               },
//             },
//           }}
//         >
//           <Tab label={t('proxyForSale')} value="proxy" />
//           <Tab label={t('sbtNotForSale')} value="sbt" />
//         </Tabs>
//       </Box>

//       {/* Баннер для Proxy режима */}
//       {activeTab === 'proxy' && (
//         <div className="bannerWrapper" style={{display: 'flex', width: '100%', justifyContent: 'center', alignItems: 'center'}}>
//           <Banner
//             type="section"
//             header={t('proxyAuctionTitle')}
//             subheader={t('proxyAuctionDescription')}
//             style={{
//               textAlign: 'center',
//               marginBottom: '20px',
//               padding: '15px',
//               maxWidth: '425px',
//               background: isDark
//                 ? 'linear-gradient(to bottom, #1a1a1a, #2a2a2a)'
//                 : 'linear-gradient(to bottom, #f5f5f5, #e5e5e5)',
//               color: isDark ? '#fff' : '#333',
//             }}
//           >
//             <div style={{
//               textAlign: 'left',
//               marginTop: '15px',
//               fontSize: '14px',
//               display: 'flex',
//               flexDirection: 'column',
//               alignItems: 'center',
//               maxWidth: '425px'
//             }}>
//               <div style={{fontWeight: 'bold', marginBottom: '10px', textAlign: 'center'}}>
//                 {t('proxyFeatures')}
//               </div>
//               <ul style={{paddingLeft: '20px', margin: 0}}>
//                 <li style={{marginBottom: '8px'}}>{t('proxyFeature1')}</li>
//                 <li style={{marginBottom: '8px'}}>{t('proxyFeature2')}</li>
//                 <li style={{marginBottom: '8px'}}>{t('proxyFeature3')}</li>
//                 <li style={{marginBottom: '8px'}}>{t('proxyFeature4')}</li>
//                 <li style={{marginBottom: '8px'}}>{t('proxyFeature5')}</li>
//                 <li style={{marginBottom: '8px'}}>{t('proxyFeature6')}</li>
//                 <li style={{marginBottom: '8px'}}>{t('proxyFeature7')}</li>
//               </ul>
//             </div>
//           </Banner>
//         </div>
//       )}

//       {/* Баннер для SBT режима */}
//       {activeTab === 'sbt' && (
//         <div className="bannerWrapper" style={{display: 'flex', width: '100%', justifyContent: 'center', alignItems: 'center'}}>
//           <Banner
//             type="section"
//             header={t('sbtMintTitle')}
//             subheader={t('sbtMintDescription')}
//             style={{
//               textAlign: 'center',
//               marginBottom: '20px',
//               padding: '15px',
//               maxWidth: '425px',
//               background: isDark
//                 ? 'linear-gradient(to bottom, #1a1a1a, #2a2a2a)'
//                 : 'linear-gradient(to bottom, #f5f5f5, #e5e5e5)',
//               color: isDark ? '#fff' : '#333',
//             }}
//           >
//             <div style={{
//               textAlign: 'left',
//               marginTop: '15px',
//               fontSize: '14px',
//               display: 'flex',
//               flexDirection: 'column',
//               alignItems: 'center',
//               maxWidth: '425px'
//             }}>
//               <div style={{fontWeight: 'bold', marginBottom: '10px', textAlign: 'center'}}>
//                 {t('sbtFeatures')}
//               </div>
//               <ul style={{paddingLeft: '20px', margin: 0}}>
//                 <li style={{marginBottom: '8px'}}>{t('sbtFeature1')}</li>
//                 <li style={{marginBottom: '8px'}}>{t('sbtFeature2')}</li>
//                 <li style={{marginBottom: '8px'}}>{t('sbtFeature3')}</li>
//                 <li style={{marginBottom: '8px'}}>{t('sbtFeature4')}</li>
//                 <li style={{marginBottom: '8px'}}>{t('sbtFeature5')}</li>
//                 <li style={{marginBottom: '8px'}}>{t('sbtFeature6')}</li>
//                 <li style={{marginBottom: '8px'}}>{t('sbtFeature7')}</li>
//               </ul>
//             </div>
//           </Banner>
//         </div>
//       )}

//      {activeTab === 'proxy' && (
//         <ActiveAuctions
//   isTestnet={isTestnet}
//   isDark={isDark}
//   onAuctionClick={handleAuctionClickFromComponent}
// />
//      )}

//       {/* Индикатор сети */}
//       <div style={{
//         textAlign: 'center',
//         marginBottom: '10px',
//         padding: '5px 10px',
//         borderRadius: '15px',
//         background: isTestnet ? '#f59e0b' : '#10b981',
//         color: 'white',
//         fontSize: '12px',
//         fontWeight: 'bold',
//         maxWidth: '280px',
//         margin: '0 auto'
//       }}>
//         {isTestnet ? '🌐 Testnet Mode' : '🌐 Mainnet Mode'}
//       </div>

//       <List style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', paddingBottom: '150px'}}>

// {/* Шаг 1: Выбор субдоменной зоны */}
// <div style={{position: 'relative', width: '280px'}}>
//   <div style={{
//     position: 'absolute',
//     left: '-30px',
//     top: '50%',
//     transform: 'translateY(-50%)',
//     fontSize: '18px',
//     fontWeight: 'bold',
//     color: isDark ? "white" : 'black'
//   }}>
//     1
//   </div>

//   {/* ИСПОЛЬЗУЕМ ОБНОВЛЕННЫЙ КОМПОНЕНТ С ЗАГРУЗКОЙ СУБДОМЕНОВ */}
//   <AuctionCollectionSelector
//     activeTab={activeTab}
//     selectedDomainZone={selectedDomainZone}
//     onDomainZoneChange={handleDomainZoneChangeForSelector}
//     zonesLoading={zonesLoading}
//     zonesError={zonesError}
//     userAddress={userAddress}
//     isDark={isDark}
//     t={t}
//     sbtCollectionAddressesMap={sbtCollectionAddressesMap}
//     activeSbtZones={activeSbtZones}
//     proxyZones={proxyZones} // ← ПЕРЕДАЕМ ДАННЫЕ ИЗ БАЗЫ
//     isTestnet={isTestnet} // ← ПЕРЕДАЕМ ИНФОРМАЦИЮ О СЕТИ ДЛЯ ЗАГРУЗКИ СУБДОМЕНОВ
//     sbtZonesCount={sbtZonesCount}
//   />

//   {zonesError && (
//     <p style={{ color: '#f87171', fontSize: '12px', marginTop: '5px' }}>
//       {zonesError}
//     </p>
//   )}
//   {activeTab === 'sbt' && sbtZones.length === 0 && !zonesLoading && !zonesError && (
//     <p style={{ color: '#f59e0b', fontSize: '12px', marginTop: '5px', textAlign: 'center' }}>
//       {t('noSbtZones')}
//     </p>
//   )}
// </div>

//     {/* Информация о выбранной зоне */}
//     {selectedDomainZone && (
//         <div
//             style={{
//                 padding: "8px 12px",
//                 borderRadius: "8px",
//                 background: isDark ? "#2a2a2a" : "#f5f5f5",
//                 border: `1px solid ${isDark ? '#444' : '#ddd'}`,
//                 fontSize: "12px",
//                 color: isDark ? "#ccc" : "#666",
//                 maxWidth: "280px",
//                 textAlign: "center",
//             }}
//         >
//             <p style={{ margin: 0 }}>
//                 <strong>{t('zoneType')}</strong> {activeTab === 'proxy' ? t('proxyType') : t('sbtType')}
//             </p>
//             {collectionAddress ? (
//                 <p style={{ margin: "3px 0 0 0", color: "#4caf50", fontSize: "11px" }}>
//                    {t('collectionConfigured')}
//                 </p>
//             ) : (
//                 <p style={{ margin: "3px 0 0 0", color: "#f59e0b", fontSize: "11px" }}>
//                     {t('collectionNotConfigured')}
//                 </p>
//             )}
//             <p style={{ margin: "3px 0 0 0", fontSize: "11px", color: isTestnet ? "#f59e0b" : "#10b981" }}>
//                 {t('network')} {isTestnet ? t('testnet') : t('mainnet')}
//             </p>
//         </div>
//     )}

//     {/* Шаг 2: Ввод названия субдомена */}
//     <div style={{position: 'relative', width: '280px'}}>
//         <div style={{
//             position: 'absolute',
//             left: '-30px',
//             top: '50%',
//             transform: 'translateY(-50%)',
//             fontSize: '18px',
//             fontWeight: 'bold',
//             color: isDark ? "white" : 'black'
//         }}>
//             2
//         </div>
//         <Input
//             placeholder={t('enterSubdomainName')}
//             value={subDomainName}
//             onChange={(e) => {
//                 // Убираем пробелы в начале и конце, приводим к нижнему регистру
//                 const value = e.target.value.trim().toLowerCase();
//                 // Фильтруем только латиницу, цифры и дефис
//                 const filtered = value.replace(/[^a-z0-9-]/g, '');
//                 handleSubDomainNameChange(filtered);
//             }}
//             style={{
//                 width: '280px',
//                 borderRadius: '50%',
//                 padding: '0px 15px',
//                 position: 'relative'
//             }}
//             before={
//                 <div style={{
//                     position: 'absolute',
//                     left: '15px',
//                     top: '50%',
//                     transform: 'translateY(-50%)',
//                     opacity: 0.5
//                 }}>
//                     🔍
//                 </div>
//             }
//         />
//     </div>

//     {/* Шаг 2.5: Кнопка проверки итема */}
//     <div style={{position: 'relative', width: '280px'}}>
//         <div style={{
//             position: 'absolute',
//             left: '-30px',
//             top: '50%',
//             transform: 'translateY(-50%)',
//             fontSize: '18px',
//             fontWeight: 'bold',
//             color: isDark ? "white" : 'black'
//         }}>
//             2.5
//         </div>
//         <Button
//             onClick={handleCheckItem}
//             disabled={!selectedDomainZone || !subDomainName || isLoading || !collectionAddress}
//             style={{
//                 width: '280px',
//                 borderRadius: '25px',
//                 padding: '10px 15px',
//                 background: isLoading ? '#888' : colors.primary,
//                 opacity: !collectionAddress ? 0.5 : 1,
//                 cursor: !collectionAddress ? 'not-allowed' : 'pointer',
//                 color: isDark ? 'black' : 'white'
//             }}
//         >
//             {isLoading ? t('checking') : t('checkingItem')}
//         </Button>
//         {!collectionAddress && (
//             <p style={{ color: '#f59e0b', fontSize: '12px', marginTop: '5px', textAlign: 'center' }}>
//                 {t('noCollectionAddress')}
//             </p>
//         )}
//     </div>

//     {hasChecked && auctionInfo && activeTab === 'proxy' && (
//         <Card style={{
//             background: 'linear-gradient(to bottom, #1a1a1a, #2a2a2a)',
//             marginBottom: '20px',
//             padding: '15px',
//             borderRadius: '10px',
//             width: '280px',
//             border: `2px solid ${auctionInfo.isActive ? '#4ade80' : '#f87171'}`
//         }}>
//             <div style={{color: '#fff', fontSize: '14px'}}>
//                 <div style={{marginBottom: '10px', textAlign: 'center', color: auctionInfo.isActive ? '#4ade80' : '#f87171', fontWeight: 'bold'}}>
//                     {auctionInfo.isActive ? `✅  ${t('bidOnAuction')}` : `❌ ${t('subdomainAlreadyTaken')}`}
//                 </div>
//                 <div style={{width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
//                     <img
//                         style={{width:'200px', height: '200px', borderRadius: '25px', marginBottom: '15px'}}
//                         src={getImageUrl()}
//                         alt="subdomainImage"
//                     />
//                 </div>
//                 <div style={{marginBottom: '10px'}}>
//                     <strong>{t('maxBidder')}:</strong>
//                     <br/>
//                     <code style={{fontSize: '12px', wordBreak: 'break-all'}}>
//                         <a style={{color: 'white'}} href={`https://tonviewer.com/${auctionInfo.maxBidderOwner || t('domainLeftAuction')}`}>
//                             {auctionInfo.maxBidderOwner || t('domainLeftAuction')}
//                         </a>
//                     </code>
//                 </div>
//                 <div style={{marginBottom: '10px'}}>
//                     <strong>{t('maxBid')}: </strong>
//                     {(Number(auctionInfo.maxBid) === 0 ? t('hideAfterAuctionEnd') : (Number(auctionInfo.maxBid) / 1_000_000_000).toFixed(2))} TON
//                 </div>
//                 <div style={{marginBottom: '10px'}}>
//                     <strong>{t('endTime')}:</strong> {new Date(auctionInfo.timestamp * 1000).toLocaleString()}
//                 </div>
//                 <div>
//                     <strong>{t('status')}:</strong>
//                     <span style={{
//                         marginLeft: '5px',
//                         color: auctionInfo.isActive ? '#4ade80' : '#f87171'
//                     }}>
//                         {auctionInfo.isActive ? `🟢 ${t('active')}` : `🔴 ${t('ended')}`}
//                     </span>
//                 </div>

//                 {/* Блок с сетью и кнопкой Поделиться */}
//                 <div style={{
//                     marginTop: '10px',
//                     paddingTop: '10px',
//                     borderTop: '1px solid #444',
//                     display: 'flex',
//                     justifyContent: 'space-between',
//                     alignItems: 'center'
//                 }}>
//                     <div style={{fontSize: '11px', color: '#aaa'}}>
//                         <strong>{t('networkLabel')}</strong> {isTestnet ? t('testnet') : t('mainnet')}
//                     </div>
//                     {activeTab === 'proxy' && (
//                         <div style={{display: 'flex', gap: '8px'}}>
//                             {/* Кнопка Копировать ссылку */}
//                             <IconButton
//                                 size="s"
//                                 mode="outline"
//                                 onClick={handleCopyAuctionLink}
//                                 title={t('copyAuctionLink')}
//                                 style={{
//                                     backgroundColor: '#333',
//                                     borderColor: '#555',
//                                     color: 'white',
//                                     padding: '4px 8px',
//                                     fontSize: '10px'
//                                 }}
//                             >
//                                 📋
//                             </IconButton>

//                             {/* Кнопка Поделиться */}
//                             <IconButton
//                                 size="s"
//                                 mode="outline"
//                                 onClick={handleShareAuction}
//                                 title={t('shareAuction')}
//                                 style={{
//                                     backgroundColor: '#333',
//                                     borderColor: '#555',
//                                     color: 'white',
//                                     padding: '4px 8px',
//                                     fontSize: '10px'
//                                 }}
//                             >
//                                 🔗
//                             </IconButton>
//                         </div>
//                     )}
//                 </div>
//             </div>
//         </Card>
//     )}

//     {/* Отображение информации о SBT субдомене */}
//     {hasChecked && sbtSubdomainInfo && activeTab === 'sbt' && (
//         <Card style={{
//             background: sbtSubdomainInfo.isTaken
//                 ? 'linear-gradient(to bottom, #2a1a1a, #3a2a2a)'
//                 : 'linear-gradient(to bottom, #1a2a1a, #2a3a2a)',
//             marginBottom: '20px',
//             padding: '15px',
//             borderRadius: '10px',
//             width: '280px',
//             border: sbtSubdomainInfo.isTaken ? '2px solid #f87171' : '2px solid #4a90e2'
//         }}>
//             <div style={{color: '#fff', fontSize: '14px'}}>
//                 <div style={{
//                     marginBottom: '10px',
//                     textAlign: 'center',
//                     color: sbtSubdomainInfo.isTaken ? '#f87171' : '#4a90e2',
//                     fontWeight: 'bold'
//                 }}>
//                     {sbtSubdomainInfo.isTaken
//                         ? `❌ ${t('sbtSubdomainAlreadyTaken')}`
//                         : `✅ ${t('sbtSubdomainAvailable')}`
//                     }
//                 </div>

//                 <div style={{width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
//                     <img
//                         style={{width:'200px', height: '200px', borderRadius: '25px', marginBottom: '15px'}}
//                         src={getImageUrl()}
//                         alt="subdomainImage"
//                     />
//                 </div>

//                 {sbtSubdomainInfo.isTaken && sbtSubdomainInfo.ownerAddress && (
//                     <>
//                         <div style={{marginBottom: '10px'}}>
//                             <strong>{t('sbtOwner')}:</strong>
//                             <br/>
//                             <code style={{fontSize: '12px', wordBreak: 'break-all'}}>
//                                 <a
//                                     style={{color: 'white'}}
//                                     href={`https://tonviewer.com/${sbtSubdomainInfo.ownerAddress}`}
//                                     target="_blank"
//                                     rel="noopener noreferrer"
//                                 >
//                                     {sbtSubdomainInfo.ownerAddress}
//                                 </a>
//                             </code>
//                         </div>

//                         {sbtSubdomainInfo.nftAddress && (
//                             <div style={{marginBottom: '10px'}}>
//                                 <strong>NFT Address:</strong>
//                                 <br/>
//                                 <code style={{fontSize: '12px', wordBreak: 'break-all'}}>
//                                     <a
//                                         style={{color: 'white'}}
//                                         href={`https://tonviewer.com/${sbtSubdomainInfo.nftAddress}`}
//                                         target="_blank"
//                                         rel="noopener noreferrer"
//                                     >
//                                         {sbtSubdomainInfo.nftAddress}
//                                     </a>
//                                 </code>
//                             </div>
//                         )}

//                         {sbtSubdomainInfo.timestamp && (
//                             <div style={{marginBottom: '10px'}}>
//                                 <strong>{t('created')}:</strong> {new Date(sbtSubdomainInfo.timestamp * 1000).toLocaleString()}
//                             </div>
//                         )}
//                     </>
//                 )}

//                 {!sbtSubdomainInfo.isTaken && (
//                     <div style={{
//                         marginTop: '10px',
//                         padding: '8px',
//                         background: 'rgba(74, 144, 226, 0.1)',
//                         borderRadius: '5px',
//                         fontSize: '12px',
//                         color: '#ccc',
//                         textAlign: 'center'
//                     }}>
//                         {t('sbtForPersonalUse')} • {t('buyFor1TON')}
//                     </div>
//                 )}

//                 <div style={{marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #444', fontSize: '11px', color: '#aaa'}}>
//                     <strong>{t('networkLabel')}</strong> {isTestnet ? t('testnet') : t('mainnet')}
//                 </div>
//             </div>
//         </Card>
//     )}

//     {/* Отображение сообщения если субдомена нет */}
//     {hasChecked && !auctionInfo && !sbtSubdomainInfo && (
//         <Card style={{
//             background: activeTab === 'sbt'
//                 ? 'linear-gradient(to bottom, #1a2a1a, #2a2a2a)'
//                 : 'linear-gradient(to bottom, #2a1a1a, #2a2a1a)',
//             marginBottom: '20px',
//             padding: '15px',
//             borderRadius: '10px',
//             width: '280px',
//             border: activeTab === 'sbt' ? '2px solid #4a90e2' : '2px solid #4ade80'
//         }}>
//             <div style={{color: '#fff', fontSize: '14px', textAlign: 'center'}}>
//                 <div style={{marginBottom: '10px', color: activeTab === 'sbt' ? '#4a90e2' : '#4ade80', fontWeight: 'bold'}}>
//                     {activeTab === 'sbt'
//                         ? (sbtPurchaseCompleted ? `✅ ${t('sbtSubdomainPurchased')}` : `✅ ${t('sbtSubdomainAvailable')}`)
//                         : `✅ ${t('subdomainAvailable')}`
//                     }
//                 </div>
//                 <div style={{width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
//                     <img
//                         style={{width:'200px', height: '200px', borderRadius: '25px', marginBottom: '15px'}}
//                         src={getImageUrl()}
//                         alt="subdomainImage"
//                     />
//                 </div>
//                 <div style={{color: '#ccc', fontSize: '13px'}}>
//                     {activeTab === 'sbt'
//                         ? (sbtPurchaseCompleted
//                             ? t('sbtSubdomainPurchased')
//                             : t('sbtForPersonalUse')
//                         )
//                         : t('makeFirstBid')
//                     }
//                 </div>
//                 <div style={{
//                     marginTop: '10px',
//                     paddingTop: '10px',
//                     borderTop: '1px solid #444',
//                     display: 'flex',
//                     justifyContent: 'space-between',
//                     alignItems: 'center'
//                 }}>
//                     <div style={{fontSize: '11px', color: '#aaa'}}>
//                         <strong>{t('networkLabel')}</strong> {isTestnet ? t('testnet') : t('mainnet')}
//                     </div>
//                     {activeTab === 'proxy' && (
//                         <div style={{display: 'flex', gap: '8px'}}>
//                             {/* Кнопка Копировать ссылку */}
//                             <IconButton
//                                 size="s"
//                                 mode="outline"
//                                 onClick={handleCopyAuctionLink}
//                                 title={t('copyAuctionLink')}
//                                 style={{
//                                     backgroundColor: '#333',
//                                     borderColor: '#555',
//                                     color: 'white',
//                                     padding: '4px 8px',
//                                     fontSize: '10px'
//                                 }}
//                             >
//                                 📋
//                             </IconButton>

//                             {/* Кнопка Поделиться */}
//                             <IconButton
//                                 size="s"
//                                 mode="outline"
//                                 onClick={handleShareAuction}
//                                 title={t('shareAuction')}
//                                 style={{
//                                     backgroundColor: '#333',
//                                     borderColor: '#555',
//                                     color: 'white',
//                                     padding: '4px 8px',
//                                     fontSize: '10px'
//                                 }}
//                             >
//                                 🔗
//                             </IconButton>
//                         </div>
//                     )}
//                 </div>
//             </div>
//         </Card>
//     )}

//     {/* Таймер - только для Proxy режима */}
//     {activeTab === 'proxy' && (
//         <Card style={{
//             background: 'linear-gradient(to bottom, black, gray)',
//             marginBottom: '20px',
//             padding: '5px 5px 20px 5px',
//             borderRadius: '10px',
//             display: 'flex',
//             flexDirection: 'column',
//             alignItems: 'center',
//             gap: "10px",
//             width: 'min-content'
//         }}>
//             <FlipTimer
//                 auctionData={auctionInfo}
//                 defaultTime={hasChecked && !auctionInfo ? 86400 : undefined}
//                 onComplete={() => {
//                     console.log('Аукцион завершен!');
//                 }}
//             />
//             <div style={{fontSize: '11px', color: '#aaa'}}>
//                 {t('networkLabel')} {isTestnet ? t('testnet') : t('mainnet')}
//             </div>
//         </Card>
//     )}

//         {/* Селект для кастомной ставки (только для Proxy режима и активного аукциона) */}
//         {hasChecked && auctionInfo && auctionInfo.isActive && activeTab === 'proxy' && (
//           <>
//             <div style={{position: 'relative', width: '200px'}}>
//               <select
//                 value={showCustomInput ? 'custom' : customBidAmount}
//                 onChange={handleBidSelectChange}
//                 style={{
//                   width: '200px',
//                   borderRadius: '25px',
//                   padding: '10px 15px',
//                   fontSize: '14px'
//                 }}
//               >
//                 <option value="">{`${t('price')}: Min. ${(calculateBidPrice / 1_000_000_000).toFixed(2)} TON`}</option>
//                 <option value="custom">{t('enterValue')}</option>
//                 <option value="10">10 TON</option>
//                 <option value="20">20 TON</option>
//                 <option value="50">50 TON</option>
//                 <option value="100">100 TON</option>
//                 <option value="500">500 TON</option>
//               </select>
//             </div>

//             {/* Инпут для ручного ввода ставки */}
//             {showCustomInput && (
//               <div style={{position: 'relative', width: '200px'}}>
//                 <Input
//                   placeholder={t('yourBid')}
//                   value={manualBidValue}
//                   onChange={(e) => handleManualBidChange(e.target.value)}
//                   style={{
//                     width: '200px',
//                     borderRadius: '25px',
//                     padding: '10px 15px',
//                     fontSize: '24px',
//                     fontWeight: '600',
//                     marginLeft: '20px',
//                   }}
//                 />
//               </div>
//             )}
//           </>
//         )}

//         {/* Шаг 3: Основная кнопка действия */}
//         {hasChecked && getActionButtonText() && (
//           <div style={{position: 'relative', width: '280px'}}>
//             <div style={{
//               position: 'absolute',
//               left: '-30px',
//               top: '50%',
//               transform: 'translateY(-50%)',
//               fontSize: '18px',
//               fontWeight: 'bold',
//               color: isDark ? "white" : 'black'
//             }}>
//               3
//             </div>
//             <Button
//               onClick={getActionButtonHandler()}
//               disabled={getActionButtonDisabled()}
//               style={{
//                 width: '280px',
//                 borderRadius: '25px',
//                 padding: '10px 15px',
//                 backgroundColor: getActionButtonColor(),
//                 marginBottom: activeTab === 'proxy' && auctionInfo && !auctionInfo.isActive && !canClaim ? '10px' : '0',
//                 display: getActionButtonText() ? 'block' : 'none'
//               }}
//             >
//               {getActionButtonText()}
//             </Button>
//           </div>
//         )}

//         {/* Кнопка Marketplace (только для Proxy режима, если аукцион закончен и пользователь не выиграл) */}
//         {hasChecked && auctionInfo && !auctionInfo.isActive && !canClaim && activeTab === 'proxy' && (
//           <div style={{position: 'relative', width: '280px'}}>
//             <div style={{
//               position: 'absolute',
//               left: '-30px',
//               top: '50%',
//               transform: 'translateY(-50%)',
//               fontSize: '18px',
//               fontWeight: 'bold',
//               color: isDark ? "white" : 'black'
//             }}>
//               4
//             </div>

//             <a
//               href={marketplaceUrl}
//               target="_blank"
//               rel="noopener noreferrer"
//               style={{
//                 display: 'block',
//                 width: '280px',
//                 borderRadius: '25px',
//                 padding: '11.75px 15px',
//                 backgroundColor: '#6366f1',
//                 color: 'white',
//                 textDecoration: 'none',
//                 textAlign: 'center',
//                 fontWeight: 'bold',
//                 cursor: 'pointer',
//                 border: 'none'
//               }}
//             >
//               🛍️ {t('viewOnMarketplace')}
//             </a>
//           </div>
//         )}
//       </List>

//     </Page>
//   );
// };

//пробуем ончейн реалзиацию

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

// ====== ONCHAIN-ДАННЫЕ (вместо useZones) ======
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

// ====== ТИПЫ ======

type CollectionAddressMap = {
  [key: string]: string;
};

type ActiveTab = "proxy" | "sbt";

const mapPrices = {
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

// ====== ДЕДУПЛИКАЦИЯ SimpleCollection ======
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
      new Date(c.created_at || c.lastUpdated || 0) >
        new Date(exist.created_at || exist.lastUpdated || 0)
    ) {
      map.set(key, c);
    }
  }
  return [...map.values()];
};

// ====== КОНВЕРТАЦИЯ SimpleCollection → Zone ======
const collectionToZone = (col: SimpleCollection, proxy: number): Zone => ({
  id: col.address
    ? parseInt(col.address.slice(0, 8), 16) || Date.now()
    : Date.now(),
  name:
    (col.name || "")
      .replace(/ Proxy Domains/i, "")
      .replace(/ DNS Domains/i, "")
      .toLowerCase()
      .trim() + ".ton",
  address: col.address,
  collectionAddress: col.address,
  wrapperAddress: undefined,
  proxy,
  registrationDate:
    col.created_at || col.lastUpdated || new Date().toISOString(),
  subdomainsAmount: col.item_count || 0,
  owner: col.creator_address || col.owner_address,
  status: "active",
  createdAt: col.created_at || col.lastUpdated || new Date().toISOString(),
  updatedAt: col.lastUpdated || col.created_at || new Date().toISOString(),
});

// ========================================================================

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

  // ====== ONCHAIN-ДАННЫЕ (вместо useZones) ======
  const {
    proxyCollections,
    sbtCollections,
    loadAllData,
    isLoading: zonesLoading,
    error: zonesError,
  } = useBlockchainItems();

  // ====== КОНВЕРТАЦИЯ SimpleCollection[] → Zone[] ======
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

  // ── СОВМЕСТИМОСТЬ: refreshZones из старого хука больше нет в контексте.
  //    Вместо него используем loadAllData(true) из useBlockchainItems.
  const refreshZones = useCallback(() => {
    loadAllData(true);
  }, [loadAllData]);

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

  // Вспомогательные функции для определения типа зоны
  const isProxyZone = useCallback((zone: any): boolean => {
    const proxyValue = zone.proxy;

    if (typeof proxyValue === "number") {
      return proxyValue === 1;
    }

    if (typeof proxyValue === "string") {
      const lowerValue = proxyValue.toLowerCase();
      return lowerValue === "proxy" || lowerValue === "1";
    }

    return false;
  }, []);

  // Proxy коллекции - ВСЕ Proxy зоны
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

  // SBT коллекции - только зоны текущего пользователя

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

  // Добавьте этот useEffect после загрузки зон
  useEffect(() => {
    // Если есть выбранная зона, но нет collectionAddress
    if (selectedDomainZone && !collectionAddress && allZones.length > 0) {
      // Находим зону в списке
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

        // Пробуем найти в текущей мапе коллекций
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
    if (activeTab === "sbt") {
      return 500_000_000; // Фиксированная цена 0.5 TON для SBT
    }

    const domainLength = subDomainName.length;
    const basePrice = mapPrices[domainLength as keyof typeof mapPrices] || 0.5;
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
      // Проверяем, что maxBidderOwner не равен null
      if (auctionInfo.maxBidderOwner === null) return false;

      const normalizedMaxBidder = normalizeAddress(auctionInfo.maxBidderOwner);
      const normalizedUserAddress = normalizeAddress(userAddress);
      const isEqual = normalizedMaxBidder === normalizedUserAddress;

      return !auctionInfo.isActive && isEqual;
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

  // Функция для обновления URL с параметрами текущего аукциона
  const updateUrlWithCurrentAuction = useCallback(() => {
    if (selectedDomainZone && subDomainName && activeTab === "proxy") {
      console.log(
        `🔗 Обновление URL: зона=${selectedDomainZone}, субдомен=${subDomainName}`
      );
      updateAuctionUrl({
        zone: selectedDomainZone,
        subdomain: subDomainName,
      });
    }
  }, [selectedDomainZone, subDomainName, activeTab]);

  // Функция для копирования ссылки на аукцион
  const handleCopyAuctionLink = useCallback(async () => {
    if (!selectedDomainZone || !subDomainName) {
      showSnackbar(t("selectZoneAndSubdomainFirst"), "error");
      return;
    }

    const success = await copyAuctionUrlToClipboard({
      zone: selectedDomainZone,
      subdomain: subDomainName,
    });

    if (success) {
      showSnackbar(t("auctionLinkCopied"), "success");
    } else {
      showSnackbar(t("failedToCopyLink"), "error");
    }
  }, [selectedDomainZone, subDomainName, showSnackbar]);

  // Функция для поделиться аукционом
  const handleShareAuction = useCallback(async () => {
    if (!selectedDomainZone || !subDomainName) {
      showSnackbar(t("selectZoneAndSubdomainFirst"), "error");
      return;
    }

    const success = await shareAuction({
      zone: selectedDomainZone,
      subdomain: subDomainName,
    });

    if (!success) {
      // Если Web Share API не поддерживается, предлагаем копирование
      await handleCopyAuctionLink();
    }
  }, [selectedDomainZone, subDomainName, showSnackbar, handleCopyAuctionLink]);

  // Проверяем, открыто ли через deeplink при монтировании
  useEffect(() => {
    const startappParam = launchParams.startParam;
    if (startappParam) {
      console.log(`🔗 AuctionPage открыт через deeplink: ${startappParam}`);
      setOpenedViaDeeplink(true);

      // Парсим параметр для дополнительной информации
      const parts = startappParam.split("_");
      if (parts[0] === "add-subdomain") {
        console.log("✅ Пользователь перешел на аукцион из уведомления");
      }
    }
  }, [launchParams.startParam]);

  // Обновим useEffect для загрузки параметров из URL
  useEffect(() => {
    // Проверяем и URL параметры, и deeplink
    const hasUrlParams = isAuctionPage();
    const hasDeeplink = !!launchParams.startParam;

    if ((hasUrlParams || hasDeeplink) && allZones.length === 0) {
      console.log("⏳ Ждем загрузку зон...");
      return;
    }

    // Сначала проверяем deeplink (он имеет приоритет)
    if (hasDeeplink) {
      const startappParam = launchParams.startParam!;
      console.log("📥 Загружаем аукцион из deeplink:", startappParam);

      try {
        const { route, params } = MiniAppLinks.parseStartapp(startappParam);

        if (route === "/add-subdomain" && params.zone && params.subdomain) {
          console.log("✅ Найден аукцион в deeplink:", params);
          loadAuctionFromParams(params.zone, params.subdomain);
        }
      } catch (error) {
        console.error("❌ Ошибка парсинга deeplink:", error);
      }
    }
    // Затем проверяем URL параметры
    else if (hasUrlParams) {
      const params = getAuctionParamsFromUrl();

      if (params.zone && params.subdomain) {
        console.log("📥 Загружаем аукцион из URL параметров:", params);
        loadAuctionFromParams(params.zone, params.subdomain);
      }
    }
  }, [allZones, launchParams.startParam]);

  const handleCheckItem = useCallback(async () => {
    if (!selectedDomainZone || !subDomainName || !collectionAddress) {
      showSnackbar(t("pleaseEnterDomainName"), "error");
      return;
    }

    // Валидация допустимых символов для всех режимов
    const validCharsRegex = /^[a-z0-9-]+$/;
    if (!validCharsRegex.test(subDomainName)) {
      showSnackbar(t("subdomainInvalidCharsError"), "error");
      return;
    }

    setIsLoading(true);
    setHasChecked(false);
    const lowerValue = subDomainName.toLowerCase();

    console.log(`🔍 Checking item: ${lowerValue}.${selectedDomainZone}`);
    console.log(`Collection address: ${collectionAddress}`);
    console.log(`Network: ${isTestnet ? "testnet" : "mainnet"}`);

    if (activeTab === "sbt") {
      const sbtInfo = await checkSBTSubdomain(
        lowerValue,
        collectionAddress,
        isTestnet
      );

      if (sbtInfo) {
        setSbtSubdomainInfo(sbtInfo);
        setAuctionInfo(null);

        if (sbtInfo.nftAddress) {
          setNftAddress(sbtInfo.nftAddress);
          console.log("✅ SBT NFT Address:", sbtInfo.nftAddress);
        } else {
          setNftAddress("");
        }

        if (sbtInfo.isTaken) {
          console.log("❌ SBT subdomain is already taken");
          showSnackbar(t("sbtSubdomainAlreadyTaken"), "error");
        } else {
          console.log("✅ SBT subdomain is available for purchase");
          showSnackbar(t("sbtSubdomainAvailable"), "success");
        }
      } else {
        setSbtSubdomainInfo(null);
        setAuctionInfo(null);
        setNftAddress("");
        console.log("❌ Failed to check SBT subdomain");
        showSnackbar(t("checkingAvailability"), "error");
      }
    } else {
      // PROXY режим
      const info = await getAuctionInfo(
        lowerValue,
        collectionAddress,
        isTestnet
      );

      if (info) {
        // Аукцион уже существует
        setAuctionInfo(info);
        setSbtSubdomainInfo(null);

        if (info.nftAddress) {
          setNftAddress(info.nftAddress);
          console.log("✅ NFT Address from auction:", info.nftAddress);
        } else {
          console.warn("⚠️ Auction info exists but nftAddress is missing");
          setNftAddress("");
        }

        console.log("✅ Auction info loaded successfully");
        showSnackbar(t("auctionInfoLoaded"), "success");

        // Обновляем URL для proxy режима
        if (activeTab === "proxy") {
          updateUrlWithCurrentAuction();
        }
      } else {
        // Аукцион не существует - первая ставка
        setAuctionInfo(null);
        setSbtSubdomainInfo(null);

        // Используем специальную функцию для расчета адреса NFT для первой ставки
        const proxyNFTAddress = await calculateProxyNFTAddress(
          lowerValue,
          collectionAddress,
          isTestnet
        );
        console.log(`Адрес прокси субдомена из расчетов: ${proxyNFTAddress}`);

        if (proxyNFTAddress) {
          setNftAddress(proxyNFTAddress);
          console.log(
            "✅ Calculated NFT Address for first bid:",
            proxyNFTAddress
          );
          showSnackbar(t("subdomainAvailableForFirstBid"), "success");
        } else {
          setNftAddress("");
          console.log("❌ Failed to calculate NFT address");
          showSnackbar(t("failedToCalculateNFTAddress"), "error");
        }

        // Обновляем URL для proxy режима
        if (activeTab === "proxy") {
          updateUrlWithCurrentAuction();
        }
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
  ]);

  // Функция для загрузки SBT субдоменов пользователя
  const loadUserSbtSubdomainsCount = useCallback(async () => {
    if (!userAddress || activeTab !== "sbt") return;

    try {
      console.log(`🔄 Загрузка SBT субдоменов пользователя ${userAddress}...`);
      const counts = await getUserSbtSubdomainsCount(userAddress, isTestnet);
      setSbtZonesCount(counts);
      console.log("✅ SBT субдомены пользователя загружены:", counts);
    } catch (error) {
      console.error("❌ Ошибка загрузки SBT субдоменов:", error);
      setSbtZonesCount({});
    }
  }, [userAddress, isTestnet, activeTab]);

  // Загружаем SBT субдомены при изменении пользователя или таба
  useEffect(() => {
    if (activeTab === "sbt" && userAddress) {
      loadUserSbtSubdomainsCount();
    } else {
      setSbtZonesCount({});
    }
  }, [activeTab, userAddress, loadUserSbtSubdomainsCount]);

  // Функция для загрузки аукциона из параметров
  const loadAuctionFromParams = useCallback(
    (zoneName: string, subdomainName: string) => {
      console.log("🚀 Загрузка аукциона:", { zoneName, subdomainName });

      // Помечаем, что страница открыта по deeplink/URL
      setOpenedViaDeeplink(true);

      // Автоматически переключаемся на proxy таб
      setActiveTab("proxy");

      // Устанавливаем зону и субдомен
      setSelectedDomainZone(zoneName);
      setSubDomainName(subdomainName);

      // Находим collectionAddress для зоны
      const zone = allZones.find((z) => z.name === zoneName);
      if (zone?.collectionAddress) {
        setCollectionAddress(zone.collectionAddress);
      }

      // ДОБАВЛЯЕМ ОБНОВЛЕНИЕ URL
      updateUrlWithCurrentAuction();

      // Даем время для обновления UI, затем проверяем
      setTimeout(() => {
        handleCheckItem();
      }, 500);
    },
    [allZones, handleCheckItem, updateUrlWithCurrentAuction]
  );

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
    setOpenedViaDeeplink(false); // Сбрасываем флаг deeplink

    // При переключении на SBT очищаем URL параметры
    if (newValue === "sbt") {
      clearAuctionUrl();
    }
  };

  // Функция для проверки субдомена по zoneName и subdomainName
  const checkItemByName = useCallback(
    async (zoneName: string, subdomain: string) => {
      console.log(
        `🔍 Проверка субдомена: зона=${zoneName}, субдомен=${subdomain}`
      );

      // Сбрасываем предыдущие состояния
      setAuctionInfo(null);
      setNftAddress("");
      setHasChecked(false);
      setCustomBidAmount("");
      setShowCustomInput(false);
      setManualBidValue("");
      setSbtPurchaseCompleted(false);

      // Устанавливаем выбранную зону и субдомен
      setSelectedDomainZone(zoneName);
      setSubDomainName(subdomain);

      // Находим зону по имени для получения collectionAddress
      const zone = allZones.find((z) => z.name === zoneName);
      if (zone?.collectionAddress) {
        setCollectionAddress(zone.collectionAddress);
        console.log(
          `✅ Collection адрес установлен: ${zone.collectionAddress}`
        );
      } else {
        console.warn(`⚠️ У зоны "${zoneName}" нет collectionAddress`);
        setCollectionAddress("");
      }

      // Даем время для обновления UI
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Вызываем стандартную проверку
      await handleCheckItem();
    },
    [
      allZones,
      setSelectedDomainZone,
      setSubDomainName,
      setCollectionAddress,
      handleCheckItem,
    ]
  );

  // Используем исправленный хук для интеграции с ActiveAuctions
  const { handleAuctionClick, setSelectedZoneName, setSubdomainName } =
    useAuctionIntegration({
      zones: allZones,
      checkItem: checkItemByName, // Используем функцию, которая принимает имя зоны
    });

  // Функция для обработки клика из ActiveAuctions
  const handleAuctionClickFromComponent = useCallback(
    (zoneName: string, subdomainName: string) => {
      console.log(
        `🎯 Клик из ActiveAuctions: зона=${zoneName}, субдомен=${subdomainName}`
      );

      // Вызываем обработчик из исправленного хука
      handleAuctionClick(zoneName, subdomainName);

      // ДОБАВЛЯЕМ ОБНОВЛЕНИЕ URL
      if (activeTab === "proxy") {
        updateUrlWithCurrentAuction();
      }
    },
    [handleAuctionClick, activeTab, updateUrlWithCurrentAuction]
  );

  // Также добавьте функцию для принудительной установки collectionAddress
  const setupCollectionAddressForZone = useCallback(
    (zoneName: string) => {
      if (!zoneName) return false;

      // Ищем зону в базе
      const zone = allZones.find((z) => z.name === zoneName);

      if (zone?.collectionAddress) {
        setCollectionAddress(zone.collectionAddress);
        console.log(
          `✅ Collection адрес установлен для "${zoneName}": ${zone.collectionAddress}`
        );
        return true;
      }

      // Пробуем найти в текущей мапе
      const addressFromMap = currentCollectionMap[zoneName];
      if (addressFromMap) {
        setCollectionAddress(addressFromMap);
        console.log(
          `✅ Collection адрес установлен из мапы для "${zoneName}": ${addressFromMap}`
        );
        return true;
      }

      console.log(
        `❌ Не удалось найти collectionAddress для зоны "${zoneName}"`
      );
      return false;
    },
    [allZones, currentCollectionMap, setCollectionAddress]
  );

  // Обновляем handleSubDomainNameChange для синхронизации с хуком
  const handleSubDomainNameChange = useCallback(
    (value: string) => {
      setSubDomainName(value.toLowerCase());
      setSubdomainName(value.toLowerCase()); // Синхронизируем с хуком

      setAuctionInfo(null);
      setNftAddress("");
      setHasChecked(false);
      setCustomBidAmount("");
      setShowCustomInput(false);
      setManualBidValue("");
      setSbtPurchaseCompleted(false);

      // ОБНОВЛЯЕМ URL ПРИ ИЗМЕНЕНИИ СУБДОМЕНА
      if (selectedDomainZone && value && activeTab === "proxy") {
        updateUrlWithCurrentAuction();
      }
    },
    [
      setSubDomainName,
      setSubdomainName,
      setAuctionInfo,
      setNftAddress,
      setHasChecked,
      setCustomBidAmount,
      setShowCustomInput,
      setManualBidValue,
      setSbtPurchaseCompleted,
      selectedDomainZone,
      activeTab,
      updateUrlWithCurrentAuction,
    ]
  );

  const handleBidSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    if (value === "custom") {
      setShowCustomInput(true);
      setCustomBidAmount("");
      setManualBidValue("");
    } else {
      setShowCustomInput(false);
      setCustomBidAmount(value);
      setManualBidValue("");
    }
  };

  const handleManualBidChange = (value: string) => {
    setManualBidValue(value);
    if (value && !isNaN(Number(value))) {
      setCustomBidAmount(value);
    } else {
      setCustomBidAmount("");
    }
  };

  // Функция для создания или получения субдомена (БЭКЕНД)
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
      // Устанавливаем сеть перед вызовом
      apiService.setNetwork(isTestnet);

      // Сначала пытаемся получить существующий субдомен
      try {
        const existingSubdomain = await apiService.getSubdomainByName(
          subdomainData.name
        );
        console.log("✅ Субдомен уже существует:", existingSubdomain);
        return existingSubdomain;
      } catch (error) {
        // Если субдомен не найден, создаем новый
        console.log("📝 Создаем новый субдомен:", subdomainData.name);

        const newSubdomain = await apiService.createSubdomain({
          ...subdomainData,
        });

        console.log("✅ Новый субдомен создан:", newSubdomain);
        return newSubdomain;
      }
    } catch (error) {
      console.error("❌ Ошибка в createSubdomainIfNotExists:", error);
      throw error;
    }
  };

  // ОБРАБОТЧИК ДЛЯ НОВОГО КОМПОНЕНТА AuctionCollectionSelector
  const handleDomainZoneChangeForSelector = useCallback(
    (value: string) => {
      console.log(`🎯 Выбрана зона из AuctionCollectionSelector: ${value}`);

      // Устанавливаем выбранную зону
      setSelectedDomainZone(value);

      // Сбрасываем флаг URL при ручном изменении
      setOpenedViaDeeplink(false);

      // Синхронизируем с хуком
      setSelectedZoneName(value);

      // Сбрасываем все состояния
      setAuctionInfo(null);
      setNftAddress("");
      setHasChecked(false);
      setCustomBidAmount("");
      setShowCustomInput(false);
      setManualBidValue("");
      setSbtPurchaseCompleted(false);

      // Устанавливаем collectionAddress
      setupCollectionAddressForZone(value);

      // ОБНОВЛЯЕМ URL ПРИ ИЗМЕНЕНИИ ЗОНЫ
      if (value && subDomainName && activeTab === "proxy") {
        updateUrlWithCurrentAuction();
      }
    },
    [
      setSelectedDomainZone,
      setOpenedViaDeeplink,
      setSelectedZoneName,
      setupCollectionAddressForZone,
      setAuctionInfo,
      setNftAddress,
      setHasChecked,
      setCustomBidAmount,
      setShowCustomInput,
      setManualBidValue,
      setSbtPurchaseCompleted,
      subDomainName,
      activeTab,
      updateUrlWithCurrentAuction,
    ]
  );

  // Старт аукциона с интеграцией базы данных (БЭКЕНД — ВЕСЬ КОД СОХРАНЁН)
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

      // 1. Отправляем транзакцию в блокчейн
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 360,
        messages: [
          {
            amount: calculateDomainPrice.toString(),
            address: collectionAddress,
            payload: payload,
          },
        ],
      });

      console.log("✅ Транзакция отправлена в блокчейн");

      // 2. Работа с базой данных
      const fullSubDomainName = `${subDomainName}.${selectedDomainZone}`;
      const auctionEndTime = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString();

      try {
        // Устанавливаем сеть перед вызовом
        apiService.setNetwork(isTestnet);

        // Находим зону для получения zoneId
        const zone = allZones.find((z) => z.name === selectedDomainZone);

        console.log(`📊 Создание субдомена:`, {
          name: fullSubDomainName,
          address: nftAddress,
          mintPrice: calculateDomainPrice / 1_000_000_000,
          owner: userAddress,
          status: "auction",
          auctionEndTime,
          zoneId: zone?.id,
          collectionAddress: zone?.collectionAddress,
          isTestnet,
        });

        const result = await apiService.createSubdomain({
          name: fullSubDomainName,
          address: nftAddress,
          mintPrice: calculateDomainPrice / 1_000_000_000,
          owner: userAddress,
          status: "auction",
          auctionEndTime: auctionEndTime,
          zoneId: zone?.id,
          collectionAddress: zone?.collectionAddress,
        });

        console.log("✅ Субдомен создан в базе:", result);

        // 3. Обновляем зоны (чтобы ActiveAuctions увидел изменения)
        refreshZones();

        showSnackbar(t("startAuction"), "success");
      } catch (dbError: any) {
        console.error("❌ Ошибка работы с базой данных:", dbError);
        console.error("Stack trace:", dbError.stack);

        // Показываем предупреждение, но не ошибку, так как транзакция прошла
        showSnackbar(t("auctionStartedBlockchainDbError"), "error");
      }

      // 4. Обновляем информацию об аукционе
      setTimeout(() => {
        handleCheckItem();
      }, 2000);
    } catch (error: any) {
      console.error("❌ Ошибка транзакции:", error);

      if (error?.message?.includes("cancelled")) {
        showSnackbar(t("auctionStartCancelled"), "error");
      } else if (error?.message?.includes("rejected")) {
        showSnackbar(t("auctionStartRejected"), "error");
      } else if (error?.message?.includes("insufficient")) {
        showSnackbar(t("insufficientFundsForAuctionStart"), "error");
      } else {
        showSnackbar(t("auctionStartError"), "error");
      }
    }
  };

  // Размещение ставки с интеграцией базы данных (БЭКЕНД — ВЕСЬ КОД СОХРАНЁН)
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
      const tonWeb = new TonWeb();
      const cell = new tonWeb.boc.Cell();
      cell.bits.writeUint(1, 32); // Операция ставки
      cell.bits.writeString(`${subDomainName}`);

      console.log(
        `🎯 Размещение ставки для: ${subDomainName}.${selectedDomainZone}`
      );
      console.log(
        `💰 Сумма: ${calculateBidPrice} нанотонов (${
          calculateBidPrice / 1_000_000_000
        } TON)`
      );
      console.log(`👤 Пользователь: ${userAddress}`);
      console.log(`🌐 Сеть: ${isTestnet ? "testnet" : "mainnet"}`);

      // 1. Отправляем транзакцию в блокчейн
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 360,
        messages: [
          {
            amount: calculateBidPrice.toString(),
            address: nftAddress,
          },
        ],
      });

      console.log("✅ Транзакция отправлена в блокчейн");

      // 2. Работа с базой данных
      const fullDomainName = `${subDomainName}.${selectedDomainZone}`;

      try {
        // Устанавливаем сеть перед вызовом
        apiService.setNetwork(isTestnet);

        // Находим зону для получения zoneId
        const zone = allZones.find((z) => z.name === selectedDomainZone);

        // Создаем или получаем субдомен
        const subdomain = await createSubdomainIfNotExists({
          name: fullDomainName,
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

        console.log(`✅ Субдомен готов для ставки:`, {
          id: subdomain.id,
          name: subdomain.name,
          status: subdomain.status,
        });

        // 3. Добавляем ставку в базу данных
        console.log(`📝 Добавляем ставку для субдомена ID: ${subdomain.id}`);

        const bidResult = await apiService.addBidToSubdomain(subdomain.id, {
          bidder: userAddress,
          amount: calculateBidPrice,
        });

        console.log("✅ Ставка добавлена в базу:", bidResult);

        // 4. Обновляем информацию о субдомене
        await apiService.updateSubdomainStatus(subdomain.id, "auction");

        // 5. Обновляем список субдоменов пользователя
        refreshSubdomains();

        // 6. Обновляем зоны (чтобы ActiveAuctions увидел изменения)
        refreshZones();
      } catch (dbError: any) {
        console.error("❌ Ошибка работы с базой данных:", dbError);
        console.error("Stack trace:", dbError.stack);

        // Показываем предупреждение, но не ошибку, так как транзакция прошла
        showSnackbar(t("bidPlacedBlockchainDbError"), "error");
      }

      showSnackbar(t("bid"), "success");
      setCustomBidAmount("");
      setShowCustomInput(false);
      setManualBidValue("");

      // 7. Обновляем информацию об аукционе
      setTimeout(() => {
        console.log("🔄 Обновляем информацию об аукционе...");
        handleCheckItem();
      }, 2000);

      // 8. Обновляем компонент ActiveAuctions
      setTimeout(() => {
        console.log("🔄 Обновляем ActiveAuctions...");
      }, 3000);
    } catch (error: any) {
      console.error("❌ Ошибка при размещении ставки:", error);

      if (error?.message?.includes("cancelled")) {
        showSnackbar(t("bidCancelled"), "error");
      } else if (error?.message?.includes("rejected")) {
        showSnackbar(t("bidRejected"), "error");
      } else if (error?.message?.includes("insufficient")) {
        showSnackbar(t("insufficientFundsForBid"), "error");
      } else {
        showSnackbar(t("bidError"), "error");
      }
    }
  };

  // Покупка SBT субдомена с интеграцией базы данных (БЭКЕНД — ВЕСЬ КОД СОХРАНЁН)
  const handlePurchaseSBTSubdomain = async () => {
    if (!selectedDomainZone || !subDomainName || !collectionAddress) {
      showSnackbar(t("pleaseEnterDomainName"), "error");
      return;
    }

    if (!wallet) {
      showSnackbar(t("walletNotConnected"), "error");
      return;
    }

    // Проверяем что субдомен еще доступен
    if (sbtSubdomainInfo?.isTaken) {
      showSnackbar(t("sbtSubdomainAlreadyTaken"), "error");
      return;
    }

    setSbtLoading(true);

    try {
      // Для SBT режима отправляем простую транзакцию покупки
      const tonWeb = new TonWeb();
      const cell = new tonWeb.boc.Cell();
      cell.bits.writeUint(0, 32); // Операция покупки
      cell.bits.writeString(`${subDomainName}`);
      const payload = TonWeb.utils.bytesToBase64(await cell.toBoc());

      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 360,
        messages: [
          {
            amount: calculateDomainPrice.toString(), // 0.5 TON
            address: collectionAddress,
            payload: payload,
          },
        ],
      });

      // Создаем субдомен в базе данных
      const fullDomainName = `${subDomainName}.${selectedDomainZone}`;
      const startStatus = "active";

      if (!userAddress) {
        throw new Error("User address is not available");
      }

      const nftAddressForDb = sbtSubdomainInfo?.nftAddress || userAddress;

      console.log(`Имя субдомена для записи в сеть: ${fullDomainName}`);
      console.log(`Адрес субдомена для записи в сеть: ${nftAddressForDb}`);
      console.log(
        `Цена субдомена для записи в сеть: ${
          calculateDomainPrice / 1_000_000_000
        }`
      );

      // Устанавливаем сеть перед вызовом
      apiService.setNetwork(isTestnet);

      // Находим зону для получения zoneId
      const zone = allZones.find((z) => z.name === selectedDomainZone);

      await apiService.createSubdomain({
        name: fullDomainName,
        address: nftAddressForDb,
        mintPrice: calculateDomainPrice / 1_000_000_000,
        owner: userAddress,
        status: startStatus,
        collectionAddress: collectionAddress,
        zoneId: zone?.id,
      });

      showSnackbar(t("sbtSubdomainPurchased"), "success");
      setSbtPurchaseCompleted(true);
    } catch (error: any) {
      console.error("SBT purchase error:", error);

      if (error?.message?.includes("cancelled")) {
        showSnackbar(t("sbtPurchaseCancelled"), "error");
      } else {
        showSnackbar(t("sbtPurchaseError"), "error");
      }
    } finally {
      setSbtLoading(false);
    }
  };

  // Claim субдомена с интеграцией базы данных (БЭКЕНД — ВЕСЬ КОД СОХРАНЁН)
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
          isTestnet: isTestnet,
        })
      ).unwrap();

      await tonConnectUI.sendTransaction({
        validUntil: result.validUntil,
        messages: result.messages,
      });

      // Обновляем статус субдомена в базе данных
      const fullDomainName = `${subDomainName}.${selectedDomainZone}`;
      try {
        // Устанавливаем сеть перед вызовом
        apiService.setNetwork(isTestnet);

        const subdomain = await apiService.getSubdomainByName(fullDomainName);

        if (subdomain) {
          await apiService.updateSubdomainStatus(subdomain.id, "claimed");
        }
      } catch (dbError) {
        console.error("Ошибка обновления статуса в базе:", dbError);
      }

      showSnackbar(t("subdomainClaimedSuccess"), "success");
    } catch (error) {
      console.error("Claim error:", error);
      showSnackbar(
        error instanceof Error ? error.message : t("subdomainClaimError"),
        "error"
      );
    } finally {
      setIsClaimLoading(false);
    }
  };

  // Определяем URL для изображения
  const getImageUrl = () => {
    if (!domainZoneName || !subDomainName) return "";

    if (activeTab === "proxy") {
      return `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${domainZoneName}/${subDomainName}.png`;
    } else {
      return `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${domainZoneName}/${subDomainName}.png`;
    }
  };

  // Функции для определения текста, обработчика и состояния кнопки
  const getActionButtonText = () => {
    if (activeTab === "sbt") {
      if (sbtPurchaseCompleted) {
        return `✅ ${t("purchased")}`;
      } else if (sbtSubdomainInfo?.isTaken) {
        return `❌ ${t("sbtSubdomainAlreadyTaken")}`;
      } else {
        return `${t("mintSubdomain")} (${t("buyFor1TON")})`;
      }
    } else {
      if (!auctionInfo) {
        return `${t("startAuction")} (${t("price")}: ${
          calculateDomainPrice / 1_000_000_000
        } TON)`;
      } else if (auctionInfo.isActive) {
        return `${t("bid")} (${
          customBidAmount
            ? customBidAmount
            : (calculateBidPrice / 1_000_000_000).toFixed(2)
        } TON)`;
      } else if (canClaim) {
        return isClaimLoading ? t("claiming") : `🎁 ${t("claimSubdomain")}`;
      } else if (auctionInfo && !auctionInfo.isActive && !canClaim) {
        return "";
      }
    }
    return "";
  };

  const getActionButtonHandler = () => {
    if (activeTab === "sbt") {
      if (sbtPurchaseCompleted || sbtSubdomainInfo?.isTaken) {
        return undefined;
      }
      return handlePurchaseSBTSubdomain;
    } else {
      if (!auctionInfo) {
        return handleStartAuction;
      } else if (auctionInfo.isActive) {
        return handlePlaceBid;
      } else if (canClaim) {
        return handleClaimSubdomain;
      } else if (auctionInfo && !auctionInfo.isActive && !canClaim) {
        return undefined;
      }
    }
    return undefined;
  };

  const getActionButtonDisabled = () => {
    if (activeTab === "sbt") {
      return (
        sbtPurchaseCompleted ||
        sbtLoading ||
        !selectedDomainZone ||
        !subDomainName ||
        sbtSubdomainInfo?.isTaken
      );
    } else {
      if (!auctionInfo) {
        return !selectedDomainZone || !subDomainName;
      } else if (auctionInfo.isActive) {
        return false;
      } else if (canClaim) {
        return isClaimLoading;
      } else if (auctionInfo && !auctionInfo.isActive && !canClaim) {
        return true;
      }
    }
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
      if (sbtPurchaseCompleted) {
        return "#4ade80";
      } else if (sbtSubdomainInfo?.isTaken) {
        return "#888";
      } else {
        return sbtLoading ? "#888" : "#4a90e2";
      }
    } else {
      if (!auctionInfo) {
        return "#4ade80";
      } else if (auctionInfo.isActive) {
        return "rgb(74, 144, 226)";
      } else if (canClaim) {
        return isClaimLoading ? "#888" : "#4ade80";
      } else if (auctionInfo && !auctionInfo.isActive && !canClaim) {
        return "transparent";
      }
    }
    return "#4a90e2";
  };

  // Загружаем субдомены пользователя при подключении кошелька
  useEffect(() => {
    if (userAddress) {
      refreshSubdomains();
    }
  }, [userAddress, refreshSubdomains]);

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

      {/* Баннер для Proxy режима */}
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

      {/* Баннер для SBT режима */}
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
        {/* Шаг 1: Выбор субдоменной зоны */}
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

          {/* ИСПОЛЬЗУЕМ ОБНОВЛЕННЫЙ КОМПОНЕНТ С ЗАГРУЗКОЙ СУБДОМЕНОВ */}
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
            <p style={{ color: "#f87171", fontSize: "12px", marginTop: "5px" }}>
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

        {/* Информация о выбранной зоне */}
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
              // Убираем пробелы в начале и конце, приводим к нижнему регистру
              const value = e.target.value.trim().toLowerCase();
              // Фильтруем только латиницу, цифры и дефис
              const filtered = value.replace(/[^a-z0-9-]/g, "");
              handleSubDomainNameChange(filtered);
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

        {/* Шаг 2.5: Кнопка проверки итема */}
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
                <code style={{ fontSize: "12px", wordBreak: "break-all" }}>
                  <a
                    style={{ color: "white" }}
                    href={`https://tonviewer.com/${
                      auctionInfo.maxBidderOwner || t("domainLeftAuction")
                    }`}
                  >
                    {auctionInfo.maxBidderOwner || t("domainLeftAuction")}
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

              {/* Блок с сетью и кнопкой Поделиться */}
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
                    {/* Кнопка Копировать ссылку */}
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

                    {/* Кнопка Поделиться */}
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

        {/* Отображение информации о SBT субдомене */}
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

              {sbtSubdomainInfo.isTaken && sbtSubdomainInfo.ownerAddress && (
                <>
                  <div style={{ marginBottom: "10px" }}>
                    <strong>{t("sbtOwner")}:</strong>
                    <br />
                    <code style={{ fontSize: "12px", wordBreak: "break-all" }}>
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
                        style={{ fontSize: "12px", wordBreak: "break-all" }}
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

        {/* Отображение сообщения если субдомена нет */}
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
                activeTab === "sbt" ? "2px solid #4a90e2" : "2px solid #4ade80",
            }}
          >
            <div
              style={{ color: "#fff", fontSize: "14px", textAlign: "center" }}
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
                    {/* Кнопка Копировать ссылку */}
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

                    {/* Кнопка Поделиться */}
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

        {/* Таймер - только для Proxy режима */}
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
              defaultTime={hasChecked && !auctionInfo ? 86400 : undefined}
              onComplete={() => {
                console.log("Аукцион завершен!");
              }}
            />
            <div style={{ fontSize: "11px", color: "#aaa" }}>
              {t("networkLabel")} {isTestnet ? t("testnet") : t("mainnet")}
            </div>
          </Card>
        )}

        {/* Селект для кастомной ставки (только для Proxy режима и активного аукциона) */}
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
                  <option value="">{`${t("price")}: Min. ${(
                    calculateBidPrice / 1_000_000_000
                  ).toFixed(2)} TON`}</option>
                  <option value="custom">{t("enterValue")}</option>
                  <option value="10">10 TON</option>
                  <option value="20">20 TON</option>
                  <option value="50">50 TON</option>
                  <option value="100">100 TON</option>
                  <option value="500">500 TON</option>
                </select>
              </div>

              {/* Инпут для ручного ввода ставки */}
              {showCustomInput && (
                <div style={{ position: "relative", width: "200px" }}>
                  <Input
                    placeholder={t("yourBid")}
                    value={manualBidValue}
                    onChange={(e) => handleManualBidChange(e.target.value)}
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

        {/* Кнопка Marketplace (только для Proxy режима, если аукцион закончен и пользователь не выиграл) */}
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

        {/* Кнопка «Создать сайт» (после успешной покупки/claim) */}
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
              href={`https://t.me/Ton_site_builder_bot?startapp`}
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

export default AuctionPage;
