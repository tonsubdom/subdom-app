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

//стабильная но есть недоделки

// import React, {
//   useState,
//   useCallback,
//   useMemo,
//   useEffect,
//   useRef,
// } from "react";
// import {
//   Banner,
//   Button,
//   Card,
//   Input,
//   List,
//   IconButton,
// } from "@telegram-apps/telegram-ui";
// import { useTonWallet, useTonAddress } from "@tonconnect/ui-react";
// import { useTonConnectUI } from "@tonconnect/ui-react";
// import TonWeb from "tonweb";
// import { Address } from "ton-core";
// import Box from "@mui/material/Box";
// import Tabs from "@mui/material/Tabs";
// import Tab from "@mui/material/Tab";

// import { useTypedDispatch } from "../../hooks/useTypeDispatch";
// import { Page } from "@/components/Page";
// import { ShowSnackbar } from "@/components/ShowSnackbar";
// import { claimSubdomain } from "@/store/nft/actions";
// import FlipTimer from "./flipTimer/FlipTimer";
// import { getAuctionInfo, ParsedAuctionInfo } from "./flipTimer/getAuctionInfo";
// import { useLanguage } from "@/contexts/LanguageContext";
// import { useTheme } from "@/contexts/ThemeContext";
// import { useUser } from "@/contexts/UserContext";
// import { apiService, Subdomain, Zone } from "@/services/api";

// import { checkSBTSubdomain, SBTSubdomainInfo } from "./checkSBTSubdomain";
// import { calculateProxyNFTAddress } from "./CalculateProxyNFTAddress";

// // ====== ONCHAIN-ДАННЫЕ (вместо useZones) ======
// import { useBlockchainItems } from "@/services/blockchainItems/blockchain-items-context.tsx";
// import { SimpleCollection } from "@/services/blockchainItems/blockchain-items-types";

// import ActiveAuctions from "@/components/ActiveAuctions/ActiveAuctions";
// import { useAuctionIntegration } from "@/hooks/useAuctionIntegration";

// import {
//   getAuctionParamsFromUrl,
//   updateAuctionUrl,
//   copyAuctionUrlToClipboard,
//   shareAuction,
//   isAuctionPage,
//   clearAuctionUrl,
// } from "@/utils/urlParams";

// import { useLaunchParams } from "@telegram-apps/sdk-react";
// import { MiniAppLinks } from "@/utils/miniAppLinks";
// import { AuctionCollectionSelector } from "./AuctionCollectionSelector";
// import { getUserSbtSubdomainsCount } from "@/utils/sbt-utils";

// // ====== ТИПЫ ======

// type CollectionAddressMap = {
//   [key: string]: string;
// };

// type ActiveTab = "proxy" | "sbt";

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
//   if (!addr) return "";
//   try {
//     const address = Address.parse(addr);
//     return address.toString({ bounceable: true, testOnly: false });
//   } catch (error) {
//     console.error("Error parsing address:", addr, error);
//     return addr;
//   }
// };

// // ====== ДЕДУПЛИКАЦИЯ SimpleCollection ======
// const dedupeByLatest = (cols: SimpleCollection[]): SimpleCollection[] => {
//   const map = new Map<string, SimpleCollection>();
//   for (const c of cols) {
//     const key = (c.name || "")
//       .toLowerCase()
//       .replace(" proxy domains", "")
//       .replace(" dns domains", "");
//     const exist = map.get(key);
//     if (
//       !exist ||
//       new Date(c.created_at || c.lastUpdated || 0) >
//         new Date(exist.created_at || exist.lastUpdated || 0)
//     ) {
//       map.set(key, c);
//     }
//   }
//   return [...map.values()];
// };

// // ====== КОНВЕРТАЦИЯ SimpleCollection → Zone ======
// const collectionToZone = (col: SimpleCollection, proxy: number): Zone => ({
//   id: col.address
//     ? parseInt(col.address.slice(0, 8), 16) || Date.now()
//     : Date.now(),
//   name:
//     (col.name || "")
//       .replace(/ Proxy Domains/i, "")
//       .replace(/ DNS Domains/i, "")
//       .toLowerCase()
//       .trim() + ".ton",
//   address: col.address,
//   collectionAddress: col.address,
//   wrapperAddress: undefined,
//   proxy,
//   registrationDate:
//     col.created_at || col.lastUpdated || new Date().toISOString(),
//   subdomainsAmount: col.item_count || 0,
//   owner: col.creator_address || col.owner_address,
//   status: "active",
//   createdAt: col.created_at || col.lastUpdated || new Date().toISOString(),
//   updatedAt: col.lastUpdated || col.created_at || new Date().toISOString(),
// });

// // ========================================================================

// export const AuctionPage: React.FC<{}> = () => {
//   const dispatch = useTypedDispatch();
//   const wallet = useTonWallet();
//   const userAddress = useTonAddress();
//   const [tonConnectUI] = useTonConnectUI();
//   const { refreshSubdomains } = useUser();

//   const [sbtSubdomainInfo, setSbtSubdomainInfo] =
//     useState<SBTSubdomainInfo | null>(null);

//   const { currentTheme } = useTheme();
//   const isDark = currentTheme === "dark";
//   const { t } = useLanguage();

//   const [activeTab, setActiveTab] = useState<ActiveTab>("proxy");
//   const [selectedDomainZone, setSelectedDomainZone] = useState("");
//   const [subDomainName, setSubDomainName] = useState("");
//   const [collectionAddress, setCollectionAddress] = useState("");
//   const [snackbar, setSnackbar] = useState<JSX.Element | null>(null);
//   const [auctionInfo, setAuctionInfo] = useState<ParsedAuctionInfo | null>(
//     null
//   );
//   const [isLoading, setIsLoading] = useState(false);
//   const [nftAddress, setNftAddress] = useState("");
//   const [hasChecked, setHasChecked] = useState(false);
//   const [isClaimLoading, setIsClaimLoading] = useState(false);
//   const [customBidAmount, setCustomBidAmount] = useState("");
//   const [showCustomInput, setShowCustomInput] = useState(false);
//   const [manualBidValue, setManualBidValue] = useState("");
//   const [sbtPurchaseCompleted, setSbtPurchaseCompleted] = useState(false);
//   const [sbtLoading, setSbtLoading] = useState(false);
//   const [sbtZonesCount, setSbtZonesCount] = useState<Record<string, number>>(
//     {}
//   );
//   const prevSbtMapRef = useRef<{
//     cacheKey: string;
//     map: CollectionAddressMap;
//   } | null>(null);

//   const isTestnet = wallet?.account?.chain === "-3";

//   const launchParams = useLaunchParams();

//   const [, setOpenedViaDeeplink] = useState(false);

//   // ====== ONCHAIN-ДАННЫЕ (вместо useZones) ======
//   const {
//     proxyCollections,
//     sbtCollections,
//     loadAllData,
//     isLoading: zonesLoading,
//     error: zonesError,
//   } = useBlockchainItems();

//   // ====== КОНВЕРТАЦИЯ SimpleCollection[] → Zone[] ======
//   const onchainProxyZones: Zone[] = useMemo(
//     () => dedupeByLatest(proxyCollections).map((c) => collectionToZone(c, 1)),
//     [proxyCollections]
//   );
//   const onchainSbtZones: Zone[] = useMemo(
//     () => dedupeByLatest(sbtCollections).map((c) => collectionToZone(c, 0)),
//     [sbtCollections]
//   );

//   const allZones: Zone[] = useMemo(
//     () => [...onchainProxyZones, ...onchainSbtZones],
//     [onchainProxyZones, onchainSbtZones]
//   );
//   const proxyZones: Zone[] = onchainProxyZones;
//   const sbtZones: Zone[] = onchainSbtZones;

//   // ── СОВМЕСТИМОСТЬ: refreshZones из старого хука больше нет в контексте.
//   //    Вместо него используем loadAllData(true) из useBlockchainItems.
//   const refreshZones = useCallback(() => {
//     loadAllData(true);
//   }, [loadAllData]);

//   const activeSbtZones: Zone[] = useMemo(
//     () => sbtZones.filter((zone) => zone.status !== "inactive"),
//     [sbtZones]
//   );

//   // Устанавливаем сеть в apiService при изменении isTestnet
//   useEffect(() => {
//     if (wallet) {
//       apiService.setNetwork(isTestnet);
//       console.log(
//         `🌐 API сеть установлена: ${isTestnet ? "testnet" : "mainnet"}`
//       );
//     }
//   }, [wallet, isTestnet]);

//   // Вспомогательные функции для определения типа зоны
//   const isProxyZone = useCallback((zone: any): boolean => {
//     const proxyValue = zone.proxy;

//     if (typeof proxyValue === "number") {
//       return proxyValue === 1;
//     }

//     if (typeof proxyValue === "string") {
//       const lowerValue = proxyValue.toLowerCase();
//       return lowerValue === "proxy" || lowerValue === "1";
//     }

//     return false;
//   }, []);

//   // Proxy коллекции - ВСЕ Proxy зоны
//   const proxyCollectionAddressesMap = useMemo(() => {
//     const map: CollectionAddressMap = {};
//     allZones.forEach((zone) => {
//       if (isProxyZone(zone) && zone.name && zone.collectionAddress) {
//         map[zone.name] = zone.collectionAddress;
//       }
//     });

//     console.log("🌐 Proxy коллекции загружены:", Object.keys(map).length);
//     return map;
//   }, [allZones, isProxyZone]);

//   // SBT коллекции - только зоны текущего пользователя

//   const sbtCollectionAddressesMap = useMemo(() => {
//     const cacheKey = activeSbtZones
//       .map((z) => `${z.name}|${z.collectionAddress}`)
//       .sort()
//       .join(";");

//     if (prevSbtMapRef.current && prevSbtMapRef.current.cacheKey === cacheKey) {
//       return prevSbtMapRef.current.map;
//     }

//     const newMap: CollectionAddressMap = {};
//     activeSbtZones.forEach((zone) => {
//       if (zone.name && zone.collectionAddress) {
//         newMap[zone.name] = zone.collectionAddress;
//       }
//     });

//     prevSbtMapRef.current = { cacheKey, map: newMap };
//     return newMap;
//   }, [activeSbtZones]);

//   const currentCollectionMap = useMemo(() => {
//     return activeTab === "proxy"
//       ? proxyCollectionAddressesMap
//       : sbtCollectionAddressesMap;
//   }, [activeTab, proxyCollectionAddressesMap, sbtCollectionAddressesMap]);

//   // Добавьте этот useEffect после загрузки зон
//   useEffect(() => {
//     // Если есть выбранная зона, но нет collectionAddress
//     if (selectedDomainZone && !collectionAddress && allZones.length > 0) {
//       // Находим зону в списке
//       const zone = allZones.find((z) => z.name === selectedDomainZone);

//       if (zone?.collectionAddress) {
//         console.log(
//           `✅ Устанавливаем collectionAddress из базы: ${zone.collectionAddress}`
//         );
//         setCollectionAddress(zone.collectionAddress);
//       } else {
//         console.log(
//           `⚠️ У зоны "${selectedDomainZone}" нет collectionAddress в базе`
//         );

//         // Пробуем найти в текущей мапе коллекций
//         const addressFromMap = currentCollectionMap[selectedDomainZone];
//         if (addressFromMap) {
//           console.log(
//             `✅ Устанавливаем collectionAddress из мапы: ${addressFromMap}`
//           );
//           setCollectionAddress(addressFromMap);
//         }
//       }
//     }
//   }, [selectedDomainZone, collectionAddress, allZones, currentCollectionMap]);

//   const domainZoneName = useMemo(() => {
//     if (!selectedDomainZone) return "";
//     return selectedDomainZone.split(".")[0];
//   }, [selectedDomainZone]);

//   const calculateDomainPrice = useMemo(() => {
//     if (activeTab === "sbt") {
//       return 500_000_000; // Фиксированная цена 0.5 TON для SBT
//     }

//     const domainLength = subDomainName.length;
//     const basePrice = mapPrices[domainLength as keyof typeof mapPrices] || 0.5;
//     return Math.floor(basePrice * 1_000_000_000);
//   }, [subDomainName, activeTab]);

//   const calculateBidPrice = useMemo(() => {
//     if (activeTab === "sbt" || !auctionInfo) return 0;

//     if (customBidAmount && !isNaN(Number(customBidAmount))) {
//       return Math.floor(Number(customBidAmount) * 1_000_000_000);
//     }

//     const currentMaxBid = Number(auctionInfo.maxBid);
//     const bidIncrease = Math.ceil(currentMaxBid * 0.05);
//     return currentMaxBid + bidIncrease;
//   }, [auctionInfo, customBidAmount, activeTab]);

//   const canClaim = useMemo(() => {
//     if (activeTab === "sbt" || !auctionInfo || !userAddress) return false;

//     try {
//       // Проверяем, что maxBidderOwner не равен null
//       if (auctionInfo.maxBidderOwner === null) return false;

//       const normalizedMaxBidder = normalizeAddress(auctionInfo.maxBidderOwner);
//       const normalizedUserAddress = normalizeAddress(userAddress);
//       const isEqual = normalizedMaxBidder === normalizedUserAddress;

//       return !auctionInfo.isActive && isEqual;
//     } catch (error) {
//       console.error("Error in canClaim:", error);
//       return false;
//     }
//   }, [auctionInfo, userAddress, activeTab]);

//   const marketplaceUrl = useMemo(() => {
//     if (activeTab === "sbt" || !nftAddress || !collectionAddress) return "";

//     const baseUrl = isTestnet
//       ? "https://testnet.getgems.io"
//       : "https://getgems.io";

//     return `${baseUrl}/collection/${collectionAddress}/${nftAddress}`;
//   }, [nftAddress, collectionAddress, isTestnet, activeTab]);

//   const showSnackbar = useCallback(
//     (message: string, type: "success" | "error" = "success") => {
//       setSnackbar(
//         <ShowSnackbar
//           message={message}
//           type={type}
//           onClose={() => setSnackbar(null)}
//         />
//       );
//     },
//     []
//   );

//   // Функция для обновления URL с параметрами текущего аукциона
//   const updateUrlWithCurrentAuction = useCallback(() => {
//     if (selectedDomainZone && subDomainName && activeTab === "proxy") {
//       console.log(
//         `🔗 Обновление URL: зона=${selectedDomainZone}, субдомен=${subDomainName}`
//       );
//       updateAuctionUrl({
//         zone: selectedDomainZone,
//         subdomain: subDomainName,
//       });
//     }
//   }, [selectedDomainZone, subDomainName, activeTab]);

//   // Функция для копирования ссылки на аукцион
//   const handleCopyAuctionLink = useCallback(async () => {
//     if (!selectedDomainZone || !subDomainName) {
//       showSnackbar(t("selectZoneAndSubdomainFirst"), "error");
//       return;
//     }

//     const success = await copyAuctionUrlToClipboard({
//       zone: selectedDomainZone,
//       subdomain: subDomainName,
//     });

//     if (success) {
//       showSnackbar(t("auctionLinkCopied"), "success");
//     } else {
//       showSnackbar(t("failedToCopyLink"), "error");
//     }
//   }, [selectedDomainZone, subDomainName, showSnackbar]);

//   // Функция для поделиться аукционом
//   const handleShareAuction = useCallback(async () => {
//     if (!selectedDomainZone || !subDomainName) {
//       showSnackbar(t("selectZoneAndSubdomainFirst"), "error");
//       return;
//     }

//     const success = await shareAuction({
//       zone: selectedDomainZone,
//       subdomain: subDomainName,
//     });

//     if (!success) {
//       // Если Web Share API не поддерживается, предлагаем копирование
//       await handleCopyAuctionLink();
//     }
//   }, [selectedDomainZone, subDomainName, showSnackbar, handleCopyAuctionLink]);

//   // Проверяем, открыто ли через deeplink при монтировании
//   useEffect(() => {
//     const startappParam = launchParams.startParam;
//     if (startappParam) {
//       console.log(`🔗 AuctionPage открыт через deeplink: ${startappParam}`);
//       setOpenedViaDeeplink(true);

//       // Парсим параметр для дополнительной информации
//       const parts = startappParam.split("_");
//       if (parts[0] === "add-subdomain") {
//         console.log("✅ Пользователь перешел на аукцион из уведомления");
//       }
//     }
//   }, [launchParams.startParam]);

//   // Обновим useEffect для загрузки параметров из URL
//   useEffect(() => {
//     // Проверяем и URL параметры, и deeplink
//     const hasUrlParams = isAuctionPage();
//     const hasDeeplink = !!launchParams.startParam;

//     if ((hasUrlParams || hasDeeplink) && allZones.length === 0) {
//       console.log("⏳ Ждем загрузку зон...");
//       return;
//     }

//     // Сначала проверяем deeplink (он имеет приоритет)
//     if (hasDeeplink) {
//       const startappParam = launchParams.startParam!;
//       console.log("📥 Загружаем аукцион из deeplink:", startappParam);

//       try {
//         const { route, params } = MiniAppLinks.parseStartapp(startappParam);

//         if (route === "/add-subdomain" && params.zone && params.subdomain) {
//           console.log("✅ Найден аукцион в deeplink:", params);
//           loadAuctionFromParams(params.zone, params.subdomain);
//         }
//       } catch (error) {
//         console.error("❌ Ошибка парсинга deeplink:", error);
//       }
//     }
//     // Затем проверяем URL параметры
//     else if (hasUrlParams) {
//       const params = getAuctionParamsFromUrl();

//       if (params.zone && params.subdomain) {
//         console.log("📥 Загружаем аукцион из URL параметров:", params);
//         loadAuctionFromParams(params.zone, params.subdomain);
//       }
//     }
//   }, [allZones, launchParams.startParam]);

//   const handleCheckItem = useCallback(async () => {
//     if (!selectedDomainZone || !subDomainName || !collectionAddress) {
//       showSnackbar(t("pleaseEnterDomainName"), "error");
//       return;
//     }

//     // Валидация допустимых символов для всех режимов
//     const validCharsRegex = /^[a-z0-9-]+$/;
//     if (!validCharsRegex.test(subDomainName)) {
//       showSnackbar(t("subdomainInvalidCharsError"), "error");
//       return;
//     }

//     setIsLoading(true);
//     setHasChecked(false);
//     const lowerValue = subDomainName.toLowerCase();

//     console.log(`🔍 Checking item: ${lowerValue}.${selectedDomainZone}`);
//     console.log(`Collection address: ${collectionAddress}`);
//     console.log(`Network: ${isTestnet ? "testnet" : "mainnet"}`);

//     if (activeTab === "sbt") {
//       const sbtInfo = await checkSBTSubdomain(
//         lowerValue,
//         collectionAddress,
//         isTestnet
//       );

//       if (sbtInfo) {
//         setSbtSubdomainInfo(sbtInfo);
//         setAuctionInfo(null);

//         if (sbtInfo.nftAddress) {
//           setNftAddress(sbtInfo.nftAddress);
//           console.log("✅ SBT NFT Address:", sbtInfo.nftAddress);
//         } else {
//           setNftAddress("");
//         }

//         if (sbtInfo.isTaken) {
//           console.log("❌ SBT subdomain is already taken");
//           showSnackbar(t("sbtSubdomainAlreadyTaken"), "error");
//         } else {
//           console.log("✅ SBT subdomain is available for purchase");
//           showSnackbar(t("sbtSubdomainAvailable"), "success");
//         }
//       } else {
//         setSbtSubdomainInfo(null);
//         setAuctionInfo(null);
//         setNftAddress("");
//         console.log("❌ Failed to check SBT subdomain");
//         showSnackbar(t("checkingAvailability"), "error");
//       }
//     } else {
//       // PROXY режим
//       const info = await getAuctionInfo(
//         lowerValue,
//         collectionAddress,
//         isTestnet
//       );

//       if (info) {
//         // Аукцион уже существует
//         setAuctionInfo(info);
//         setSbtSubdomainInfo(null);

//         if (info.nftAddress) {
//           setNftAddress(info.nftAddress);
//           console.log("✅ NFT Address from auction:", info.nftAddress);
//         } else {
//           console.warn("⚠️ Auction info exists but nftAddress is missing");
//           setNftAddress("");
//         }

//         console.log("✅ Auction info loaded successfully");
//         showSnackbar(t("auctionInfoLoaded"), "success");

//         // Обновляем URL для proxy режима
//         if (activeTab === "proxy") {
//           updateUrlWithCurrentAuction();
//         }
//       } else {
//         // Аукцион не существует - первая ставка
//         setAuctionInfo(null);
//         setSbtSubdomainInfo(null);

//         // Используем специальную функцию для расчета адреса NFT для первой ставки
//         const proxyNFTAddress = await calculateProxyNFTAddress(
//           lowerValue,
//           collectionAddress,
//           isTestnet
//         );
//         console.log(`Адрес прокси субдомена из расчетов: ${proxyNFTAddress}`);

//         if (proxyNFTAddress) {
//           setNftAddress(proxyNFTAddress);
//           console.log(
//             "✅ Calculated NFT Address for first bid:",
//             proxyNFTAddress
//           );
//           showSnackbar(t("subdomainAvailableForFirstBid"), "success");
//         } else {
//           setNftAddress("");
//           console.log("❌ Failed to calculate NFT address");
//           showSnackbar(t("failedToCalculateNFTAddress"), "error");
//         }

//         // Обновляем URL для proxy режима
//         if (activeTab === "proxy") {
//           updateUrlWithCurrentAuction();
//         }
//       }
//     }

//     setHasChecked(true);
//     setIsLoading(false);
//   }, [
//     selectedDomainZone,
//     subDomainName,
//     collectionAddress,
//     isTestnet,
//     t,
//     activeTab,
//     updateUrlWithCurrentAuction,
//   ]);

//   // Функция для загрузки SBT субдоменов пользователя
//   const loadUserSbtSubdomainsCount = useCallback(async () => {
//     if (!userAddress || activeTab !== "sbt") return;

//     try {
//       console.log(`🔄 Загрузка SBT субдоменов пользователя ${userAddress}...`);
//       const counts = await getUserSbtSubdomainsCount(userAddress, isTestnet);
//       setSbtZonesCount(counts);
//       console.log("✅ SBT субдомены пользователя загружены:", counts);
//     } catch (error) {
//       console.error("❌ Ошибка загрузки SBT субдоменов:", error);
//       setSbtZonesCount({});
//     }
//   }, [userAddress, isTestnet, activeTab]);

//   // Загружаем SBT субдомены при изменении пользователя или таба
//   useEffect(() => {
//     if (activeTab === "sbt" && userAddress) {
//       loadUserSbtSubdomainsCount();
//     } else {
//       setSbtZonesCount({});
//     }
//   }, [activeTab, userAddress, loadUserSbtSubdomainsCount]);

//   // Функция для загрузки аукциона из параметров
//   const loadAuctionFromParams = useCallback(
//     (zoneName: string, subdomainName: string) => {
//       console.log("🚀 Загрузка аукциона:", { zoneName, subdomainName });

//       // Помечаем, что страница открыта по deeplink/URL
//       setOpenedViaDeeplink(true);

//       // Автоматически переключаемся на proxy таб
//       setActiveTab("proxy");

//       // Устанавливаем зону и субдомен
//       setSelectedDomainZone(zoneName);
//       setSubDomainName(subdomainName);

//       // Находим collectionAddress для зоны
//       const zone = allZones.find((z) => z.name === zoneName);
//       if (zone?.collectionAddress) {
//         setCollectionAddress(zone.collectionAddress);
//       }

//       // ДОБАВЛЯЕМ ОБНОВЛЕНИЕ URL
//       updateUrlWithCurrentAuction();

//       // Даем время для обновления UI, затем проверяем
//       setTimeout(() => {
//         handleCheckItem();
//       }, 500);
//     },
//     [allZones, handleCheckItem, updateUrlWithCurrentAuction]
//   );

//   const handleTabChange = (
//     _event: React.SyntheticEvent,
//     newValue: ActiveTab
//   ) => {
//     setActiveTab(newValue);
//     setSelectedDomainZone("");
//     setSubDomainName("");
//     setCollectionAddress("");
//     setAuctionInfo(null);
//     setNftAddress("");
//     setHasChecked(false);
//     setCustomBidAmount("");
//     setShowCustomInput(false);
//     setManualBidValue("");
//     setSbtPurchaseCompleted(false);
//     setOpenedViaDeeplink(false); // Сбрасываем флаг deeplink

//     // При переключении на SBT очищаем URL параметры
//     if (newValue === "sbt") {
//       clearAuctionUrl();
//     }
//   };

//   // Функция для проверки субдомена по zoneName и subdomainName
//   const checkItemByName = useCallback(
//     async (zoneName: string, subdomain: string) => {
//       console.log(
//         `🔍 Проверка субдомена: зона=${zoneName}, субдомен=${subdomain}`
//       );

//       // Сбрасываем предыдущие состояния
//       setAuctionInfo(null);
//       setNftAddress("");
//       setHasChecked(false);
//       setCustomBidAmount("");
//       setShowCustomInput(false);
//       setManualBidValue("");
//       setSbtPurchaseCompleted(false);

//       // Устанавливаем выбранную зону и субдомен
//       setSelectedDomainZone(zoneName);
//       setSubDomainName(subdomain);

//       // Находим зону по имени для получения collectionAddress
//       const zone = allZones.find((z) => z.name === zoneName);
//       if (zone?.collectionAddress) {
//         setCollectionAddress(zone.collectionAddress);
//         console.log(
//           `✅ Collection адрес установлен: ${zone.collectionAddress}`
//         );
//       } else {
//         console.warn(`⚠️ У зоны "${zoneName}" нет collectionAddress`);
//         setCollectionAddress("");
//       }

//       // Даем время для обновления UI
//       await new Promise((resolve) => setTimeout(resolve, 100));

//       // Вызываем стандартную проверку
//       await handleCheckItem();
//     },
//     [
//       allZones,
//       setSelectedDomainZone,
//       setSubDomainName,
//       setCollectionAddress,
//       handleCheckItem,
//     ]
//   );

//   // Используем исправленный хук для интеграции с ActiveAuctions
//   const { handleAuctionClick, setSelectedZoneName, setSubdomainName } =
//     useAuctionIntegration({
//       zones: allZones,
//       checkItem: checkItemByName, // Используем функцию, которая принимает имя зоны
//     });

//   // Функция для обработки клика из ActiveAuctions
//   const handleAuctionClickFromComponent = useCallback(
//     (zoneName: string, subdomainName: string) => {
//       console.log(
//         `🎯 Клик из ActiveAuctions: зона=${zoneName}, субдомен=${subdomainName}`
//       );

//       // Вызываем обработчик из исправленного хука
//       handleAuctionClick(zoneName, subdomainName);

//       // ДОБАВЛЯЕМ ОБНОВЛЕНИЕ URL
//       if (activeTab === "proxy") {
//         updateUrlWithCurrentAuction();
//       }
//     },
//     [handleAuctionClick, activeTab, updateUrlWithCurrentAuction]
//   );

//   // Также добавьте функцию для принудительной установки collectionAddress
//   const setupCollectionAddressForZone = useCallback(
//     (zoneName: string) => {
//       if (!zoneName) return false;

//       // Ищем зону в базе
//       const zone = allZones.find((z) => z.name === zoneName);

//       if (zone?.collectionAddress) {
//         setCollectionAddress(zone.collectionAddress);
//         console.log(
//           `✅ Collection адрес установлен для "${zoneName}": ${zone.collectionAddress}`
//         );
//         return true;
//       }

//       // Пробуем найти в текущей мапе
//       const addressFromMap = currentCollectionMap[zoneName];
//       if (addressFromMap) {
//         setCollectionAddress(addressFromMap);
//         console.log(
//           `✅ Collection адрес установлен из мапы для "${zoneName}": ${addressFromMap}`
//         );
//         return true;
//       }

//       console.log(
//         `❌ Не удалось найти collectionAddress для зоны "${zoneName}"`
//       );
//       return false;
//     },
//     [allZones, currentCollectionMap, setCollectionAddress]
//   );

//   // Обновляем handleSubDomainNameChange для синхронизации с хуком
//   const handleSubDomainNameChange = useCallback(
//     (value: string) => {
//       setSubDomainName(value.toLowerCase());
//       setSubdomainName(value.toLowerCase()); // Синхронизируем с хуком

//       setAuctionInfo(null);
//       setNftAddress("");
//       setHasChecked(false);
//       setCustomBidAmount("");
//       setShowCustomInput(false);
//       setManualBidValue("");
//       setSbtPurchaseCompleted(false);

//       // ОБНОВЛЯЕМ URL ПРИ ИЗМЕНЕНИИ СУБДОМЕНА
//       if (selectedDomainZone && value && activeTab === "proxy") {
//         updateUrlWithCurrentAuction();
//       }
//     },
//     [
//       setSubDomainName,
//       setSubdomainName,
//       setAuctionInfo,
//       setNftAddress,
//       setHasChecked,
//       setCustomBidAmount,
//       setShowCustomInput,
//       setManualBidValue,
//       setSbtPurchaseCompleted,
//       selectedDomainZone,
//       activeTab,
//       updateUrlWithCurrentAuction,
//     ]
//   );

//   const handleBidSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     const value = e.target.value;

//     if (value === "custom") {
//       setShowCustomInput(true);
//       setCustomBidAmount("");
//       setManualBidValue("");
//     } else {
//       setShowCustomInput(false);
//       setCustomBidAmount(value);
//       setManualBidValue("");
//     }
//   };

//   const handleManualBidChange = (value: string) => {
//     setManualBidValue(value);
//     if (value && !isNaN(Number(value))) {
//       setCustomBidAmount(value);
//     } else {
//       setCustomBidAmount("");
//     }
//   };

//   // Функция для создания или получения субдомена (БЭКЕНД)
//   const createSubdomainIfNotExists = async (subdomainData: {
//     name: string;
//     address: string;
//     mintPrice: number;
//     links?: string[];
//     zoneId?: number;
//     owner?: string;
//     status: "active" | "inactive" | "auction" | "claimed";
//     auctionEndTime?: string;
//     collectionAddress?: string;
//   }): Promise<Subdomain> => {
//     try {
//       // Устанавливаем сеть перед вызовом
//       apiService.setNetwork(isTestnet);

//       // Сначала пытаемся получить существующий субдомен
//       try {
//         const existingSubdomain = await apiService.getSubdomainByName(
//           subdomainData.name
//         );
//         console.log("✅ Субдомен уже существует:", existingSubdomain);
//         return existingSubdomain;
//       } catch (error) {
//         // Если субдомен не найден, создаем новый
//         console.log("📝 Создаем новый субдомен:", subdomainData.name);

//         const newSubdomain = await apiService.createSubdomain({
//           ...subdomainData,
//         });

//         console.log("✅ Новый субдомен создан:", newSubdomain);
//         return newSubdomain;
//       }
//     } catch (error) {
//       console.error("❌ Ошибка в createSubdomainIfNotExists:", error);
//       throw error;
//     }
//   };

//   // ОБРАБОТЧИК ДЛЯ НОВОГО КОМПОНЕНТА AuctionCollectionSelector
//   const handleDomainZoneChangeForSelector = useCallback(
//     (value: string) => {
//       console.log(`🎯 Выбрана зона из AuctionCollectionSelector: ${value}`);

//       // Устанавливаем выбранную зону
//       setSelectedDomainZone(value);

//       // Сбрасываем флаг URL при ручном изменении
//       setOpenedViaDeeplink(false);

//       // Синхронизируем с хуком
//       setSelectedZoneName(value);

//       // Сбрасываем все состояния
//       setAuctionInfo(null);
//       setNftAddress("");
//       setHasChecked(false);
//       setCustomBidAmount("");
//       setShowCustomInput(false);
//       setManualBidValue("");
//       setSbtPurchaseCompleted(false);

//       // Устанавливаем collectionAddress
//       setupCollectionAddressForZone(value);

//       // ОБНОВЛЯЕМ URL ПРИ ИЗМЕНЕНИИ ЗОНЫ
//       if (value && subDomainName && activeTab === "proxy") {
//         updateUrlWithCurrentAuction();
//       }
//     },
//     [
//       setSelectedDomainZone,
//       setOpenedViaDeeplink,
//       setSelectedZoneName,
//       setupCollectionAddressForZone,
//       setAuctionInfo,
//       setNftAddress,
//       setHasChecked,
//       setCustomBidAmount,
//       setShowCustomInput,
//       setManualBidValue,
//       setSbtPurchaseCompleted,
//       subDomainName,
//       activeTab,
//       updateUrlWithCurrentAuction,
//     ]
//   );

//   // Старт аукциона с интеграцией базы данных (БЭКЕНД — ВЕСЬ КОД СОХРАНЁН)
//   const handleStartAuction = async () => {
//     if (!selectedDomainZone || !subDomainName || !collectionAddress) {
//       showSnackbar(t("pleaseEnterDomainName"), "error");
//       return;
//     }

//     if (!userAddress) {
//       showSnackbar(t("walletNotConnected"), "error");
//       return;
//     }

//     try {
//       const tonWeb = new TonWeb();
//       const cell = new tonWeb.boc.Cell();
//       cell.bits.writeUint(0, 32);
//       cell.bits.writeString(`${subDomainName}`);
//       const payload = TonWeb.utils.bytesToBase64(await cell.toBoc());

//       // 1. Отправляем транзакцию в блокчейн
//       await tonConnectUI.sendTransaction({
//         validUntil: Math.floor(Date.now() / 1000) + 360,
//         messages: [
//           {
//             amount: calculateDomainPrice.toString(),
//             address: collectionAddress,
//             payload: payload,
//           },
//         ],
//       });

//       console.log("✅ Транзакция отправлена в блокчейн");

//       // 2. Работа с базой данных
//       const fullSubDomainName = `${subDomainName}.${selectedDomainZone}`;
//       const auctionEndTime = new Date(
//         Date.now() + 24 * 60 * 60 * 1000
//       ).toISOString();

//       try {
//         // Устанавливаем сеть перед вызовом
//         apiService.setNetwork(isTestnet);

//         // Находим зону для получения zoneId
//         const zone = allZones.find((z) => z.name === selectedDomainZone);

//         console.log(`📊 Создание субдомена:`, {
//           name: fullSubDomainName,
//           address: nftAddress,
//           mintPrice: calculateDomainPrice / 1_000_000_000,
//           owner: userAddress,
//           status: "auction",
//           auctionEndTime,
//           zoneId: zone?.id,
//           collectionAddress: zone?.collectionAddress,
//           isTestnet,
//         });

//         const result = await apiService.createSubdomain({
//           name: fullSubDomainName,
//           address: nftAddress,
//           mintPrice: calculateDomainPrice / 1_000_000_000,
//           owner: userAddress,
//           status: "auction",
//           auctionEndTime: auctionEndTime,
//           zoneId: zone?.id,
//           collectionAddress: zone?.collectionAddress,
//         });

//         console.log("✅ Субдомен создан в базе:", result);

//         // 3. Обновляем зоны (чтобы ActiveAuctions увидел изменения)
//         refreshZones();

//         showSnackbar(t("startAuction"), "success");
//       } catch (dbError: any) {
//         console.error("❌ Ошибка работы с базой данных:", dbError);
//         console.error("Stack trace:", dbError.stack);

//         // Показываем предупреждение, но не ошибку, так как транзакция прошла
//         showSnackbar(t("auctionStartedBlockchainDbError"), "error");
//       }

//       // 4. Обновляем информацию об аукционе
//       setTimeout(() => {
//         handleCheckItem();
//       }, 2000);
//     } catch (error: any) {
//       console.error("❌ Ошибка транзакции:", error);

//       if (error?.message?.includes("cancelled")) {
//         showSnackbar(t("auctionStartCancelled"), "error");
//       } else if (error?.message?.includes("rejected")) {
//         showSnackbar(t("auctionStartRejected"), "error");
//       } else if (error?.message?.includes("insufficient")) {
//         showSnackbar(t("insufficientFundsForAuctionStart"), "error");
//       } else {
//         showSnackbar(t("auctionStartError"), "error");
//       }
//     }
//   };

//   // Размещение ставки с интеграцией базы данных (БЭКЕНД — ВЕСЬ КОД СОХРАНЁН)
//   const handlePlaceBid = async () => {
//     if (
//       !auctionInfo ||
//       !selectedDomainZone ||
//       !subDomainName ||
//       !collectionAddress
//     ) {
//       showSnackbar(t("auctionDataNotLoaded"), "error");
//       return;
//     }

//     if (!userAddress) {
//       showSnackbar(t("walletNotConnected"), "error");
//       return;
//     }

//     try {
//       const tonWeb = new TonWeb();
//       const cell = new tonWeb.boc.Cell();
//       cell.bits.writeUint(1, 32); // Операция ставки
//       cell.bits.writeString(`${subDomainName}`);

//       console.log(
//         `🎯 Размещение ставки для: ${subDomainName}.${selectedDomainZone}`
//       );
//       console.log(
//         `💰 Сумма: ${calculateBidPrice} нанотонов (${
//           calculateBidPrice / 1_000_000_000
//         } TON)`
//       );
//       console.log(`👤 Пользователь: ${userAddress}`);
//       console.log(`🌐 Сеть: ${isTestnet ? "testnet" : "mainnet"}`);

//       // 1. Отправляем транзакцию в блокчейн
//       await tonConnectUI.sendTransaction({
//         validUntil: Math.floor(Date.now() / 1000) + 360,
//         messages: [
//           {
//             amount: calculateBidPrice.toString(),
//             address: nftAddress,
//           },
//         ],
//       });

//       console.log("✅ Транзакция отправлена в блокчейн");

//       // 2. Работа с базой данных
//       const fullDomainName = `${subDomainName}.${selectedDomainZone}`;

//       try {
//         // Устанавливаем сеть перед вызовом
//         apiService.setNetwork(isTestnet);

//         // Находим зону для получения zoneId
//         const zone = allZones.find((z) => z.name === selectedDomainZone);

//         // Создаем или получаем субдомен
//         const subdomain = await createSubdomainIfNotExists({
//           name: fullDomainName,
//           address: nftAddress,
//           mintPrice: calculateBidPrice / 1_000_000_000,
//           owner: userAddress,
//           status: "auction",
//           auctionEndTime: new Date(
//             Date.now() + 24 * 60 * 60 * 1000
//           ).toISOString(),
//           zoneId: zone?.id,
//           collectionAddress: zone?.collectionAddress,
//         });

//         console.log(`✅ Субдомен готов для ставки:`, {
//           id: subdomain.id,
//           name: subdomain.name,
//           status: subdomain.status,
//         });

//         // 3. Добавляем ставку в базу данных
//         console.log(`📝 Добавляем ставку для субдомена ID: ${subdomain.id}`);

//         const bidResult = await apiService.addBidToSubdomain(subdomain.id, {
//           bidder: userAddress,
//           amount: calculateBidPrice,
//         });

//         console.log("✅ Ставка добавлена в базу:", bidResult);

//         // 4. Обновляем информацию о субдомене
//         await apiService.updateSubdomainStatus(subdomain.id, "auction");

//         // 5. Обновляем список субдоменов пользователя
//         refreshSubdomains();

//         // 6. Обновляем зоны (чтобы ActiveAuctions увидел изменения)
//         refreshZones();
//       } catch (dbError: any) {
//         console.error("❌ Ошибка работы с базой данных:", dbError);
//         console.error("Stack trace:", dbError.stack);

//         // Показываем предупреждение, но не ошибку, так как транзакция прошла
//         showSnackbar(t("bidPlacedBlockchainDbError"), "error");
//       }

//       showSnackbar(t("bid"), "success");
//       setCustomBidAmount("");
//       setShowCustomInput(false);
//       setManualBidValue("");

//       // 7. Обновляем информацию об аукционе
//       setTimeout(() => {
//         console.log("🔄 Обновляем информацию об аукционе...");
//         handleCheckItem();
//       }, 2000);

//       // 8. Обновляем компонент ActiveAuctions
//       setTimeout(() => {
//         console.log("🔄 Обновляем ActiveAuctions...");
//       }, 3000);
//     } catch (error: any) {
//       console.error("❌ Ошибка при размещении ставки:", error);

//       if (error?.message?.includes("cancelled")) {
//         showSnackbar(t("bidCancelled"), "error");
//       } else if (error?.message?.includes("rejected")) {
//         showSnackbar(t("bidRejected"), "error");
//       } else if (error?.message?.includes("insufficient")) {
//         showSnackbar(t("insufficientFundsForBid"), "error");
//       } else {
//         showSnackbar(t("bidError"), "error");
//       }
//     }
//   };

//   // Покупка SBT субдомена с интеграцией базы данных (БЭКЕНД — ВЕСЬ КОД СОХРАНЁН)
//   const handlePurchaseSBTSubdomain = async () => {
//     if (!selectedDomainZone || !subDomainName || !collectionAddress) {
//       showSnackbar(t("pleaseEnterDomainName"), "error");
//       return;
//     }

//     if (!wallet) {
//       showSnackbar(t("walletNotConnected"), "error");
//       return;
//     }

//     // Проверяем что субдомен еще доступен
//     if (sbtSubdomainInfo?.isTaken) {
//       showSnackbar(t("sbtSubdomainAlreadyTaken"), "error");
//       return;
//     }

//     setSbtLoading(true);

//     try {
//       // Для SBT режима отправляем простую транзакцию покупки
//       const tonWeb = new TonWeb();
//       const cell = new tonWeb.boc.Cell();
//       cell.bits.writeUint(0, 32); // Операция покупки
//       cell.bits.writeString(`${subDomainName}`);
//       const payload = TonWeb.utils.bytesToBase64(await cell.toBoc());

//       await tonConnectUI.sendTransaction({
//         validUntil: Math.floor(Date.now() / 1000) + 360,
//         messages: [
//           {
//             amount: calculateDomainPrice.toString(), // 0.5 TON
//             address: collectionAddress,
//             payload: payload,
//           },
//         ],
//       });

//       // Создаем субдомен в базе данных
//       const fullDomainName = `${subDomainName}.${selectedDomainZone}`;
//       const startStatus = "active";

//       if (!userAddress) {
//         throw new Error("User address is not available");
//       }

//       const nftAddressForDb = sbtSubdomainInfo?.nftAddress || userAddress;

//       console.log(`Имя субдомена для записи в сеть: ${fullDomainName}`);
//       console.log(`Адрес субдомена для записи в сеть: ${nftAddressForDb}`);
//       console.log(
//         `Цена субдомена для записи в сеть: ${
//           calculateDomainPrice / 1_000_000_000
//         }`
//       );

//       // Устанавливаем сеть перед вызовом
//       apiService.setNetwork(isTestnet);

//       // Находим зону для получения zoneId
//       const zone = allZones.find((z) => z.name === selectedDomainZone);

//       await apiService.createSubdomain({
//         name: fullDomainName,
//         address: nftAddressForDb,
//         mintPrice: calculateDomainPrice / 1_000_000_000,
//         owner: userAddress,
//         status: startStatus,
//         collectionAddress: collectionAddress,
//         zoneId: zone?.id,
//       });

//       showSnackbar(t("sbtSubdomainPurchased"), "success");
//       setSbtPurchaseCompleted(true);
//     } catch (error: any) {
//       console.error("SBT purchase error:", error);

//       if (error?.message?.includes("cancelled")) {
//         showSnackbar(t("sbtPurchaseCancelled"), "error");
//       } else {
//         showSnackbar(t("sbtPurchaseError"), "error");
//       }
//     } finally {
//       setSbtLoading(false);
//     }
//   };

//   // Claim субдомена с интеграцией базы данных (БЭКЕНД — ВЕСЬ КОД СОХРАНЁН)
//   const handleClaimSubdomain = async () => {
//     if (!nftAddress) {
//       showSnackbar(t("nftAddressNotFound"), "error");
//       return;
//     }

//     if (!userAddress) {
//       showSnackbar(t("walletNotConnected"), "error");
//       return;
//     }

//     setIsClaimLoading(true);

//     try {
//       const result = await dispatch(
//         claimSubdomain({
//           subdomain_item_address: nftAddress,
//           query_id: 0,
//           isTestnet: isTestnet,
//         })
//       ).unwrap();

//       await tonConnectUI.sendTransaction({
//         validUntil: result.validUntil,
//         messages: result.messages,
//       });

//       // Обновляем статус субдомена в базе данных
//       const fullDomainName = `${subDomainName}.${selectedDomainZone}`;
//       try {
//         // Устанавливаем сеть перед вызовом
//         apiService.setNetwork(isTestnet);

//         const subdomain = await apiService.getSubdomainByName(fullDomainName);

//         if (subdomain) {
//           await apiService.updateSubdomainStatus(subdomain.id, "claimed");
//         }
//       } catch (dbError) {
//         console.error("Ошибка обновления статуса в базе:", dbError);
//       }

//       showSnackbar(t("subdomainClaimedSuccess"), "success");
//     } catch (error) {
//       console.error("Claim error:", error);
//       showSnackbar(
//         error instanceof Error ? error.message : t("subdomainClaimError"),
//         "error"
//       );
//     } finally {
//       setIsClaimLoading(false);
//     }
//   };

//   // Определяем URL для изображения
//   const getImageUrl = () => {
//     if (!domainZoneName || !subDomainName) return "";

//     if (activeTab === "proxy") {
//       return `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${domainZoneName}/${subDomainName}.png`;
//     } else {
//       return `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${domainZoneName}/${subDomainName}.png`;
//     }
//   };

//   // Функции для определения текста, обработчика и состояния кнопки
//   const getActionButtonText = () => {
//     if (activeTab === "sbt") {
//       if (sbtPurchaseCompleted) {
//         return `✅ ${t("purchased")}`;
//       } else if (sbtSubdomainInfo?.isTaken) {
//         return `❌ ${t("sbtSubdomainAlreadyTaken")}`;
//       } else {
//         return `${t("mintSubdomain")} (${t("buyFor1TON")})`;
//       }
//     } else {
//       if (!auctionInfo) {
//         return `${t("startAuction")} (${t("price")}: ${
//           calculateDomainPrice / 1_000_000_000
//         } TON)`;
//       } else if (auctionInfo.isActive) {
//         return `${t("bid")} (${
//           customBidAmount
//             ? customBidAmount
//             : (calculateBidPrice / 1_000_000_000).toFixed(2)
//         } TON)`;
//       } else if (canClaim) {
//         return isClaimLoading ? t("claiming") : `🎁 ${t("claimSubdomain")}`;
//       } else if (auctionInfo && !auctionInfo.isActive && !canClaim) {
//         return "";
//       }
//     }
//     return "";
//   };

//   const getActionButtonHandler = () => {
//     if (activeTab === "sbt") {
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
//     if (activeTab === "sbt") {
//       return (
//         sbtPurchaseCompleted ||
//         sbtLoading ||
//         !selectedDomainZone ||
//         !subDomainName ||
//         sbtSubdomainInfo?.isTaken
//       );
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

//   const getActionButtonColor = () => {
//     if (activeTab === "sbt") {
//       if (sbtPurchaseCompleted) {
//         return "#4ade80";
//       } else if (sbtSubdomainInfo?.isTaken) {
//         return "#888";
//       } else {
//         return sbtLoading ? "#888" : "#4a90e2";
//       }
//     } else {
//       if (!auctionInfo) {
//         return "#4ade80";
//       } else if (auctionInfo.isActive) {
//         return "rgb(74, 144, 226)";
//       } else if (canClaim) {
//         return isClaimLoading ? "#888" : "#4ade80";
//       } else if (auctionInfo && !auctionInfo.isActive && !canClaim) {
//         return "transparent";
//       }
//     }
//     return "#4a90e2";
//   };

//   // Загружаем субдомены пользователя при подключении кошелька
//   useEffect(() => {
//     if (userAddress) {
//       refreshSubdomains();
//     }
//   }, [userAddress, refreshSubdomains]);

//   return (
//     <Page back={true}>
//       {snackbar}

//       <Box sx={{ display: "flex", justifyContent: "center", mt: 2, mb: 3 }}>
//         <Tabs
//           value={activeTab}
//           onChange={handleTabChange}
//           sx={{
//             "& .MuiTab-root": {
//               color: isDark ? "#ccc" : "#666",
//               "&.Mui-selected": {
//                 color: isDark ? "#FFD700" : "#3B82F6",
//               },
//             },
//           }}
//         >
//           <Tab label={t("proxyForSale")} value="proxy" />
//           <Tab label={t("sbtNotForSale")} value="sbt" />
//         </Tabs>
//       </Box>

//       {/* Баннер для Proxy режима */}
//       {activeTab === "proxy" && (
//         <div
//           className="bannerWrapper"
//           style={{
//             display: "flex",
//             width: "100%",
//             justifyContent: "center",
//             alignItems: "center",
//           }}
//         >
//           <Banner
//             type="section"
//             header={t("proxyAuctionTitle")}
//             subheader={t("proxyAuctionDescription")}
//             style={{
//               textAlign: "center",
//               marginBottom: "20px",
//               padding: "15px",
//               maxWidth: "425px",
//               background: isDark
//                 ? "linear-gradient(to bottom, #1a1a1a, #2a2a2a)"
//                 : "linear-gradient(to bottom, #f5f5f5, #e5e5e5)",
//               color: isDark ? "#fff" : "#333",
//             }}
//           >
//             <div
//               style={{
//                 textAlign: "left",
//                 marginTop: "15px",
//                 fontSize: "14px",
//                 display: "flex",
//                 flexDirection: "column",
//                 alignItems: "center",
//                 maxWidth: "425px",
//               }}
//             >
//               <div
//                 style={{
//                   fontWeight: "bold",
//                   marginBottom: "10px",
//                   textAlign: "center",
//                 }}
//               >
//                 {t("proxyFeatures")}
//               </div>
//               <ul style={{ paddingLeft: "20px", margin: 0 }}>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature1")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature2")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature3")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature4")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature5")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature6")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature7")}</li>
//               </ul>
//             </div>
//           </Banner>
//         </div>
//       )}

//       {/* Баннер для SBT режима */}
//       {activeTab === "sbt" && (
//         <div
//           className="bannerWrapper"
//           style={{
//             display: "flex",
//             width: "100%",
//             justifyContent: "center",
//             alignItems: "center",
//           }}
//         >
//           <Banner
//             type="section"
//             header={t("sbtMintTitle")}
//             subheader={t("sbtMintDescription")}
//             style={{
//               textAlign: "center",
//               marginBottom: "20px",
//               padding: "15px",
//               maxWidth: "425px",
//               background: isDark
//                 ? "linear-gradient(to bottom, #1a1a1a, #2a2a2a)"
//                 : "linear-gradient(to bottom, #f5f5f5, #e5e5e5)",
//               color: isDark ? "#fff" : "#333",
//             }}
//           >
//             <div
//               style={{
//                 textAlign: "left",
//                 marginTop: "15px",
//                 fontSize: "14px",
//                 display: "flex",
//                 flexDirection: "column",
//                 alignItems: "center",
//                 maxWidth: "425px",
//               }}
//             >
//               <div
//                 style={{
//                   fontWeight: "bold",
//                   marginBottom: "10px",
//                   textAlign: "center",
//                 }}
//               >
//                 {t("sbtFeatures")}
//               </div>
//               <ul style={{ paddingLeft: "20px", margin: 0 }}>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature1")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature2")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature3")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature4")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature5")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature6")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature7")}</li>
//               </ul>
//             </div>
//           </Banner>
//         </div>
//       )}

//       {activeTab === "proxy" && (
//         <ActiveAuctions
//           isTestnet={isTestnet}
//           isDark={isDark}
//           onAuctionClick={handleAuctionClickFromComponent}
//         />
//       )}

//       {/* Индикатор сети */}
//       <div
//         style={{
//           textAlign: "center",
//           marginBottom: "10px",
//           padding: "5px 10px",
//           borderRadius: "15px",
//           background: isTestnet ? "#f59e0b" : "#10b981",
//           color: "white",
//           fontSize: "12px",
//           fontWeight: "bold",
//           maxWidth: "280px",
//           margin: "0 auto",
//         }}
//       >
//         {isTestnet ? "🌐 Testnet Mode" : "🌐 Mainnet Mode"}
//       </div>

//       <List
//         style={{
//           display: "flex",
//           flexDirection: "column",
//           alignItems: "center",
//           gap: "15px",
//           paddingBottom: "150px",
//         }}
//       >
//         {/* Шаг 1: Выбор субдоменной зоны */}
//         <div style={{ position: "relative", width: "280px" }}>
//           <div
//             style={{
//               position: "absolute",
//               left: "-30px",
//               top: "50%",
//               transform: "translateY(-50%)",
//               fontSize: "18px",
//               fontWeight: "bold",
//               color: isDark ? "white" : "black",
//             }}
//           >
//             1
//           </div>

//           {/* ИСПОЛЬЗУЕМ ОБНОВЛЕННЫЙ КОМПОНЕНТ С ЗАГРУЗКОЙ СУБДОМЕНОВ */}
//           <AuctionCollectionSelector
//             activeTab={activeTab}
//             selectedDomainZone={selectedDomainZone}
//             onDomainZoneChange={handleDomainZoneChangeForSelector}
//             zonesLoading={zonesLoading}
//             zonesError={zonesError}
//             userAddress={userAddress}
//             isDark={isDark}
//             t={t}
//             sbtCollectionAddressesMap={sbtCollectionAddressesMap}
//             activeSbtZones={activeSbtZones}
//             proxyZones={proxyZones}
//             isTestnet={isTestnet}
//             sbtZonesCount={sbtZonesCount}
//           />

//           {zonesError && (
//             <p style={{ color: "#f87171", fontSize: "12px", marginTop: "5px" }}>
//               {zonesError}
//             </p>
//           )}
//           {activeTab === "sbt" &&
//             sbtZones.length === 0 &&
//             !zonesLoading &&
//             !zonesError && (
//               <p
//                 style={{
//                   color: "#f59e0b",
//                   fontSize: "12px",
//                   marginTop: "5px",
//                   textAlign: "center",
//                 }}
//               >
//                 {t("noSbtZones")}
//               </p>
//             )}
//         </div>

//         {/* Информация о выбранной зоне */}
//         {selectedDomainZone && (
//           <div
//             style={{
//               padding: "8px 12px",
//               borderRadius: "8px",
//               background: isDark ? "#2a2a2a" : "#f5f5f5",
//               border: `1px solid ${isDark ? "#444" : "#ddd"}`,
//               fontSize: "12px",
//               color: isDark ? "#ccc" : "#666",
//               maxWidth: "280px",
//               textAlign: "center",
//             }}
//           >
//             <p style={{ margin: 0 }}>
//               <strong>{t("zoneType")}</strong>{" "}
//               {activeTab === "proxy" ? t("proxyType") : t("sbtType")}
//             </p>
//             {collectionAddress ? (
//               <p
//                 style={{
//                   margin: "3px 0 0 0",
//                   color: "#4caf50",
//                   fontSize: "11px",
//                 }}
//               >
//                 {t("collectionConfigured")}
//               </p>
//             ) : (
//               <p
//                 style={{
//                   margin: "3px 0 0 0",
//                   color: "#f59e0b",
//                   fontSize: "11px",
//                 }}
//               >
//                 {t("collectionNotConfigured")}
//               </p>
//             )}
//             <p
//               style={{
//                 margin: "3px 0 0 0",
//                 fontSize: "11px",
//                 color: isTestnet ? "#f59e0b" : "#10b981",
//               }}
//             >
//               {t("network")} {isTestnet ? t("testnet") : t("mainnet")}
//             </p>
//           </div>
//         )}

//         {/* Шаг 2: Ввод названия субдомена */}
//         <div style={{ position: "relative", width: "280px" }}>
//           <div
//             style={{
//               position: "absolute",
//               left: "-30px",
//               top: "50%",
//               transform: "translateY(-50%)",
//               fontSize: "18px",
//               fontWeight: "bold",
//               color: isDark ? "white" : "black",
//             }}
//           >
//             2
//           </div>
//           <Input
//             placeholder={t("enterSubdomainName")}
//             value={subDomainName}
//             onChange={(e) => {
//               // Убираем пробелы в начале и конце, приводим к нижнему регистру
//               const value = e.target.value.trim().toLowerCase();
//               // Фильтруем только латиницу, цифры и дефис
//               const filtered = value.replace(/[^a-z0-9-]/g, "");
//               handleSubDomainNameChange(filtered);
//             }}
//             style={{
//               width: "280px",
//               borderRadius: "50%",
//               padding: "0px 15px",
//               position: "relative",
//             }}
//             before={
//               <div
//                 style={{
//                   position: "absolute",
//                   left: "15px",
//                   top: "50%",
//                   transform: "translateY(-50%)",
//                   opacity: 0.5,
//                 }}
//               >
//                 🔍
//               </div>
//             }
//           />
//         </div>

//         {/* Шаг 2.5: Кнопка проверки итема */}
//         <div style={{ position: "relative", width: "280px" }}>
//           <div
//             style={{
//               position: "absolute",
//               left: "-30px",
//               top: "50%",
//               transform: "translateY(-50%)",
//               fontSize: "18px",
//               fontWeight: "bold",
//               color: isDark ? "white" : "black",
//             }}
//           >
//             2.5
//           </div>
//           <Button
//             onClick={handleCheckItem}
//             disabled={
//               !selectedDomainZone ||
//               !subDomainName ||
//               isLoading ||
//               !collectionAddress
//             }
//             style={{
//               width: "280px",
//               borderRadius: "25px",
//               padding: "10px 15px",
//               background: isLoading ? "#888" : colors.primary,
//               opacity: !collectionAddress ? 0.5 : 1,
//               cursor: !collectionAddress ? "not-allowed" : "pointer",
//               color: isDark ? "black" : "white",
//             }}
//           >
//             {isLoading ? t("checking") : t("checkingItem")}
//           </Button>
//           {!collectionAddress && (
//             <p
//               style={{
//                 color: "#f59e0b",
//                 fontSize: "12px",
//                 marginTop: "5px",
//                 textAlign: "center",
//               }}
//             >
//               {t("noCollectionAddress")}
//             </p>
//           )}
//         </div>

//         {hasChecked && auctionInfo && activeTab === "proxy" && (
//           <Card
//             style={{
//               background: "linear-gradient(to bottom, #1a1a1a, #2a2a2a)",
//               marginBottom: "20px",
//               padding: "15px",
//               borderRadius: "10px",
//               width: "280px",
//               border: `2px solid ${
//                 auctionInfo.isActive ? "#4ade80" : "#f87171"
//               }`,
//             }}
//           >
//             <div style={{ color: "#fff", fontSize: "14px" }}>
//               <div
//                 style={{
//                   marginBottom: "10px",
//                   textAlign: "center",
//                   color: auctionInfo.isActive ? "#4ade80" : "#f87171",
//                   fontWeight: "bold",
//                 }}
//               >
//                 {auctionInfo.isActive
//                   ? `✅  ${t("bidOnAuction")}`
//                   : `❌ ${t("subdomainAlreadyTaken")}`}
//               </div>
//               <div
//                 style={{
//                   width: "100%",
//                   display: "flex",
//                   justifyContent: "center",
//                   alignItems: "center",
//                 }}
//               >
//                 <img
//                   style={{
//                     width: "200px",
//                     height: "200px",
//                     borderRadius: "25px",
//                     marginBottom: "15px",
//                   }}
//                   src={getImageUrl()}
//                   alt="subdomainImage"
//                 />
//               </div>
//               <div style={{ marginBottom: "10px" }}>
//                 <strong>{t("maxBidder")}:</strong>
//                 <br />
//                 <code style={{ fontSize: "12px", wordBreak: "break-all" }}>
//                   <a
//                     style={{ color: "white" }}
//                     href={`https://tonviewer.com/${
//                       auctionInfo.maxBidderOwner || t("domainLeftAuction")
//                     }`}
//                   >
//                     {auctionInfo.maxBidderOwner || t("domainLeftAuction")}
//                   </a>
//                 </code>
//               </div>
//               <div style={{ marginBottom: "10px" }}>
//                 <strong>{t("maxBid")}: </strong>
//                 {Number(auctionInfo.maxBid) === 0
//                   ? t("hideAfterAuctionEnd")
//                   : (Number(auctionInfo.maxBid) / 1_000_000_000).toFixed(
//                       2
//                     )}{" "}
//                 TON
//               </div>
//               <div style={{ marginBottom: "10px" }}>
//                 <strong>{t("endTime")}:</strong>{" "}
//                 {new Date(auctionInfo.timestamp * 1000).toLocaleString()}
//               </div>
//               <div>
//                 <strong>{t("status")}:</strong>
//                 <span
//                   style={{
//                     marginLeft: "5px",
//                     color: auctionInfo.isActive ? "#4ade80" : "#f87171",
//                   }}
//                 >
//                   {auctionInfo.isActive
//                     ? `🟢 ${t("active")}`
//                     : `🔴 ${t("ended")}`}
//                 </span>
//               </div>

//               {/* Блок с сетью и кнопкой Поделиться */}
//               <div
//                 style={{
//                   marginTop: "10px",
//                   paddingTop: "10px",
//                   borderTop: "1px solid #444",
//                   display: "flex",
//                   justifyContent: "space-between",
//                   alignItems: "center",
//                 }}
//               >
//                 <div style={{ fontSize: "11px", color: "#aaa" }}>
//                   <strong>{t("networkLabel")}</strong>{" "}
//                   {isTestnet ? t("testnet") : t("mainnet")}
//                 </div>
//                 {activeTab === "proxy" && (
//                   <div style={{ display: "flex", gap: "8px" }}>
//                     {/* Кнопка Копировать ссылку */}
//                     <IconButton
//                       size="s"
//                       mode="outline"
//                       onClick={handleCopyAuctionLink}
//                       title={t("copyAuctionLink")}
//                       style={{
//                         backgroundColor: "#333",
//                         borderColor: "#555",
//                         color: "white",
//                         padding: "4px 8px",
//                         fontSize: "10px",
//                       }}
//                     >
//                       📋
//                     </IconButton>

//                     {/* Кнопка Поделиться */}
//                     <IconButton
//                       size="s"
//                       mode="outline"
//                       onClick={handleShareAuction}
//                       title={t("shareAuction")}
//                       style={{
//                         backgroundColor: "#333",
//                         borderColor: "#555",
//                         color: "white",
//                         padding: "4px 8px",
//                         fontSize: "10px",
//                       }}
//                     >
//                       🔗
//                     </IconButton>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </Card>
//         )}

//         {/* Отображение информации о SBT субдомене */}
//         {hasChecked && sbtSubdomainInfo && activeTab === "sbt" && (
//           <Card
//             style={{
//               background: sbtSubdomainInfo.isTaken
//                 ? "linear-gradient(to bottom, #2a1a1a, #3a2a2a)"
//                 : "linear-gradient(to bottom, #1a2a1a, #2a3a2a)",
//               marginBottom: "20px",
//               padding: "15px",
//               borderRadius: "10px",
//               width: "280px",
//               border: sbtSubdomainInfo.isTaken
//                 ? "2px solid #f87171"
//                 : "2px solid #4a90e2",
//             }}
//           >
//             <div style={{ color: "#fff", fontSize: "14px" }}>
//               <div
//                 style={{
//                   marginBottom: "10px",
//                   textAlign: "center",
//                   color: sbtSubdomainInfo.isTaken ? "#f87171" : "#4a90e2",
//                   fontWeight: "bold",
//                 }}
//               >
//                 {sbtSubdomainInfo.isTaken
//                   ? `❌ ${t("sbtSubdomainAlreadyTaken")}`
//                   : `✅ ${t("sbtSubdomainAvailable")}`}
//               </div>

//               <div
//                 style={{
//                   width: "100%",
//                   display: "flex",
//                   justifyContent: "center",
//                   alignItems: "center",
//                 }}
//               >
//                 <img
//                   style={{
//                     width: "200px",
//                     height: "200px",
//                     borderRadius: "25px",
//                     marginBottom: "15px",
//                   }}
//                   src={getImageUrl()}
//                   alt="subdomainImage"
//                 />
//               </div>

//               {sbtSubdomainInfo.isTaken && sbtSubdomainInfo.ownerAddress && (
//                 <>
//                   <div style={{ marginBottom: "10px" }}>
//                     <strong>{t("sbtOwner")}:</strong>
//                     <br />
//                     <code style={{ fontSize: "12px", wordBreak: "break-all" }}>
//                       <a
//                         style={{ color: "white" }}
//                         href={`https://tonviewer.com/${sbtSubdomainInfo.ownerAddress}`}
//                         target="_blank"
//                         rel="noopener noreferrer"
//                       >
//                         {sbtSubdomainInfo.ownerAddress}
//                       </a>
//                     </code>
//                   </div>

//                   {sbtSubdomainInfo.nftAddress && (
//                     <div style={{ marginBottom: "10px" }}>
//                       <strong>NFT Address:</strong>
//                       <br />
//                       <code
//                         style={{ fontSize: "12px", wordBreak: "break-all" }}
//                       >
//                         <a
//                           style={{ color: "white" }}
//                           href={`https://tonviewer.com/${sbtSubdomainInfo.nftAddress}`}
//                           target="_blank"
//                           rel="noopener noreferrer"
//                         >
//                           {sbtSubdomainInfo.nftAddress}
//                         </a>
//                       </code>
//                     </div>
//                   )}

//                   {sbtSubdomainInfo.timestamp && (
//                     <div style={{ marginBottom: "10px" }}>
//                       <strong>{t("created")}:</strong>{" "}
//                       {new Date(
//                         sbtSubdomainInfo.timestamp * 1000
//                       ).toLocaleString()}
//                     </div>
//                   )}
//                 </>
//               )}

//               {!sbtSubdomainInfo.isTaken && (
//                 <div
//                   style={{
//                     marginTop: "10px",
//                     padding: "8px",
//                     background: "rgba(74, 144, 226, 0.1)",
//                     borderRadius: "5px",
//                     fontSize: "12px",
//                     color: "#ccc",
//                     textAlign: "center",
//                   }}
//                 >
//                   {t("sbtForPersonalUse")} • {t("buyFor1TON")}
//                 </div>
//               )}

//               <div
//                 style={{
//                   marginTop: "10px",
//                   paddingTop: "10px",
//                   borderTop: "1px solid #444",
//                   fontSize: "11px",
//                   color: "#aaa",
//                 }}
//               >
//                 <strong>{t("networkLabel")}</strong>{" "}
//                 {isTestnet ? t("testnet") : t("mainnet")}
//               </div>
//             </div>
//           </Card>
//         )}

//         {/* Отображение сообщения если субдомена нет */}
//         {hasChecked && !auctionInfo && !sbtSubdomainInfo && (
//           <Card
//             style={{
//               background:
//                 activeTab === "sbt"
//                   ? "linear-gradient(to bottom, #1a2a1a, #2a2a2a)"
//                   : "linear-gradient(to bottom, #2a1a1a, #2a2a1a)",
//               marginBottom: "20px",
//               padding: "15px",
//               borderRadius: "10px",
//               width: "280px",
//               border:
//                 activeTab === "sbt" ? "2px solid #4a90e2" : "2px solid #4ade80",
//             }}
//           >
//             <div
//               style={{ color: "#fff", fontSize: "14px", textAlign: "center" }}
//             >
//               <div
//                 style={{
//                   marginBottom: "10px",
//                   color: activeTab === "sbt" ? "#4a90e2" : "#4ade80",
//                   fontWeight: "bold",
//                 }}
//               >
//                 {activeTab === "sbt"
//                   ? sbtPurchaseCompleted
//                     ? `✅ ${t("sbtSubdomainPurchased")}`
//                     : `✅ ${t("sbtSubdomainAvailable")}`
//                   : `✅ ${t("subdomainAvailable")}`}
//               </div>
//               <div
//                 style={{
//                   width: "100%",
//                   display: "flex",
//                   justifyContent: "center",
//                   alignItems: "center",
//                 }}
//               >
//                 <img
//                   style={{
//                     width: "200px",
//                     height: "200px",
//                     borderRadius: "25px",
//                     marginBottom: "15px",
//                   }}
//                   src={getImageUrl()}
//                   alt="subdomainImage"
//                 />
//               </div>
//               <div style={{ color: "#ccc", fontSize: "13px" }}>
//                 {activeTab === "sbt"
//                   ? sbtPurchaseCompleted
//                     ? t("sbtSubdomainPurchased")
//                     : t("sbtForPersonalUse")
//                   : t("makeFirstBid")}
//               </div>
//               <div
//                 style={{
//                   marginTop: "10px",
//                   paddingTop: "10px",
//                   borderTop: "1px solid #444",
//                   display: "flex",
//                   justifyContent: "space-between",
//                   alignItems: "center",
//                 }}
//               >
//                 <div style={{ fontSize: "11px", color: "#aaa" }}>
//                   <strong>{t("networkLabel")}</strong>{" "}
//                   {isTestnet ? t("testnet") : t("mainnet")}
//                 </div>
//                 {activeTab === "proxy" && (
//                   <div style={{ display: "flex", gap: "8px" }}>
//                     {/* Кнопка Копировать ссылку */}
//                     <IconButton
//                       size="s"
//                       mode="outline"
//                       onClick={handleCopyAuctionLink}
//                       title={t("copyAuctionLink")}
//                       style={{
//                         backgroundColor: "#333",
//                         borderColor: "#555",
//                         color: "white",
//                         padding: "4px 8px",
//                         fontSize: "10px",
//                       }}
//                     >
//                       📋
//                     </IconButton>

//                     {/* Кнопка Поделиться */}
//                     <IconButton
//                       size="s"
//                       mode="outline"
//                       onClick={handleShareAuction}
//                       title={t("shareAuction")}
//                       style={{
//                         backgroundColor: "#333",
//                         borderColor: "#555",
//                         color: "white",
//                         padding: "4px 8px",
//                         fontSize: "10px",
//                       }}
//                     >
//                       🔗
//                     </IconButton>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </Card>
//         )}

//         {/* Таймер - только для Proxy режима */}
//         {activeTab === "proxy" && (
//           <Card
//             style={{
//               background: "linear-gradient(to bottom, black, gray)",
//               marginBottom: "20px",
//               padding: "5px 5px 20px 5px",
//               borderRadius: "10px",
//               display: "flex",
//               flexDirection: "column",
//               alignItems: "center",
//               gap: "10px",
//               width: "min-content",
//             }}
//           >
//             <FlipTimer
//               auctionData={auctionInfo}
//               defaultTime={hasChecked && !auctionInfo ? 86400 : undefined}
//               onComplete={() => {
//                 console.log("Аукцион завершен!");
//               }}
//             />
//             <div style={{ fontSize: "11px", color: "#aaa" }}>
//               {t("networkLabel")} {isTestnet ? t("testnet") : t("mainnet")}
//             </div>
//           </Card>
//         )}

//         {/* Селект для кастомной ставки (только для Proxy режима и активного аукциона) */}
//         {hasChecked &&
//           auctionInfo &&
//           auctionInfo.isActive &&
//           activeTab === "proxy" && (
//             <>
//               <div style={{ position: "relative", width: "200px" }}>
//                 <select
//                   value={showCustomInput ? "custom" : customBidAmount}
//                   onChange={handleBidSelectChange}
//                   style={{
//                     width: "200px",
//                     borderRadius: "25px",
//                     padding: "10px 15px",
//                     fontSize: "14px",
//                   }}
//                 >
//                   <option value="">{`${t("price")}: Min. ${(
//                     calculateBidPrice / 1_000_000_000
//                   ).toFixed(2)} TON`}</option>
//                   <option value="custom">{t("enterValue")}</option>
//                   <option value="10">10 TON</option>
//                   <option value="20">20 TON</option>
//                   <option value="50">50 TON</option>
//                   <option value="100">100 TON</option>
//                   <option value="500">500 TON</option>
//                 </select>
//               </div>

//               {/* Инпут для ручного ввода ставки */}
//               {showCustomInput && (
//                 <div style={{ position: "relative", width: "200px" }}>
//                   <Input
//                     placeholder={t("yourBid")}
//                     value={manualBidValue}
//                     onChange={(e) => handleManualBidChange(e.target.value)}
//                     style={{
//                       width: "200px",
//                       borderRadius: "25px",
//                       padding: "10px 15px",
//                       fontSize: "24px",
//                       fontWeight: "600",
//                       marginLeft: "20px",
//                     }}
//                   />
//                 </div>
//               )}
//             </>
//           )}

//         {/* Шаг 3: Основная кнопка действия */}
//         {hasChecked && getActionButtonText() && (
//           <div style={{ position: "relative", width: "280px" }}>
//             <div
//               style={{
//                 position: "absolute",
//                 left: "-30px",
//                 top: "50%",
//                 transform: "translateY(-50%)",
//                 fontSize: "18px",
//                 fontWeight: "bold",
//                 color: isDark ? "white" : "black",
//               }}
//             >
//               3
//             </div>
//             <Button
//               onClick={getActionButtonHandler()}
//               disabled={getActionButtonDisabled()}
//               style={{
//                 width: "280px",
//                 borderRadius: "25px",
//                 padding: "10px 15px",
//                 backgroundColor: getActionButtonColor(),
//                 marginBottom:
//                   activeTab === "proxy" &&
//                   auctionInfo &&
//                   !auctionInfo.isActive &&
//                   !canClaim
//                     ? "10px"
//                     : "0",
//                 display: getActionButtonText() ? "block" : "none",
//               }}
//             >
//               {getActionButtonText()}
//             </Button>
//           </div>
//         )}

//         {/* Кнопка Marketplace (только для Proxy режима, если аукцион закончен и пользователь не выиграл) */}
//         {hasChecked &&
//           auctionInfo &&
//           !auctionInfo.isActive &&
//           !canClaim &&
//           activeTab === "proxy" && (
//             <div style={{ position: "relative", width: "280px" }}>
//               <div
//                 style={{
//                   position: "absolute",
//                   left: "-30px",
//                   top: "50%",
//                   transform: "translateY(-50%)",
//                   fontSize: "18px",
//                   fontWeight: "bold",
//                   color: isDark ? "white" : "black",
//                 }}
//               >
//                 4
//               </div>

//               <a
//                 href={marketplaceUrl}
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 style={{
//                   display: "block",
//                   width: "280px",
//                   borderRadius: "25px",
//                   padding: "11.75px 15px",
//                   backgroundColor: "#6366f1",
//                   color: "white",
//                   textDecoration: "none",
//                   textAlign: "center",
//                   fontWeight: "bold",
//                   cursor: "pointer",
//                   border: "none",
//                 }}
//               >
//                 🛍️ {t("viewOnMarketplace")}
//               </a>
//             </div>
//           )}

//         {/* Кнопка «Создать сайт» (после успешной покупки/claim) */}
//         {(sbtPurchaseCompleted ||
//           (auctionInfo && !auctionInfo.isActive && canClaim)) && (
//           <div style={{ position: "relative", width: "280px" }}>
//             <div
//               style={{
//                 position: "absolute",
//                 left: "-30px",
//                 top: "50%",
//                 transform: "translateY(-50%)",
//                 fontSize: "18px",
//                 fontWeight: "bold",
//                 color: isDark ? "white" : "black",
//               }}
//             >
//               4
//             </div>
//             <a
//               href={`https://t.me/Ton_site_builder_bot?startapp`}
//               target="_blank"
//               rel="noopener noreferrer"
//               style={{
//                 display: "block",
//                 width: "280px",
//                 borderRadius: "25px",
//                 padding: "11.75px 15px",
//                 background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
//                 color: "white",
//                 textDecoration: "none",
//                 textAlign: "center",
//                 fontWeight: "bold",
//                 cursor: "pointer",
//                 border: "none",
//                 fontSize: "14px",
//               }}
//             >
//               🏗️ Создать сайт на {subDomainName}.{selectedDomainZone}
//             </a>
//           </div>
//         )}
//       </List>
//     </Page>
//   );
// };

// export default AuctionPage;

// src/pages/AuctionPage/index.tsx
// ФИНАЛЬНАЯ ВЕРСИЯ: селекты зон — из useBlockchainItems (ончейн)
// Все вызовы API (createSubdomain, addBid, updateSubdomainStatus) — на бэкенд (СОХРАНЕНЫ)
// dedupe коллекций, кнопка «Создать сайт»
// src/pages/AuctionPage/index.tsx
// ФИНАЛЬНАЯ ВЕРСИЯ: селекты зон — из useBlockchainItems (ончейн)
// Все вызовы API (createSubdomain, addBid, updateSubdomainStatus) — на бэкенд (СОХРАНЕНЫ)
// dedupe с приоритетом proxy > sbt, фильтр SBT по creator_address, item_count, кнопка «Создать сайт»

// src/pages/AuctionPage/index.tsx
// ФИНАЛЬНАЯ ВЕРСИЯ (v5):
// - Дедупликация зон с приоритетом proxy над sbt
// - Фильтрация по code_hash (неизвестные коллекции не попадают в селектор)
// - creator_address как owner
// - item_count для subdomainsAmount
// - Перенос длинных имён (word-break вместо truncate)
// - collectionAddress для транзакций из SimpleCollection (редюс), а не из бэкенда
// - SBT зоны только текущего пользователя

// src/pages/AuctionPage/index.tsx
// ФИНАЛЬНАЯ ВЕРСИЯ (v6):
// Точное повторение логики ProfileWidget.getUserZones:
// - Нормализация адреса через convertUserFriendlyToRaw
// - creator_address || owner_address для фильтрации SBT-зон
// - collectionToZone из ProfileWidget (copy-paste)
// - word-break: break-word для длинных имён
// - collectionAddress для транзакций из SimpleCollection.address (ончейн)

// import React, {
//   useState,
//   useCallback,
//   useMemo,
//   useEffect,
//   useRef,
// } from "react";
// import {
//   Banner,
//   Button,
//   Card,
//   Input,
//   List,
//   IconButton,
// } from "@telegram-apps/telegram-ui";
// import { useTonWallet, useTonAddress } from "@tonconnect/ui-react";
// import { useTonConnectUI } from "@tonconnect/ui-react";
// import TonWeb from "tonweb";
// import { Address } from "ton-core";
// import Box from "@mui/material/Box";
// import Tabs from "@mui/material/Tabs";
// import Tab from "@mui/material/Tab";

// import { useTypedDispatch } from "../../hooks/useTypeDispatch";
// import { Page } from "@/components/Page";
// import { ShowSnackbar } from "@/components/ShowSnackbar";
// import { claimSubdomain } from "@/store/nft/actions";
// import FlipTimer from "./flipTimer/FlipTimer";
// import { getAuctionInfo, ParsedAuctionInfo } from "./flipTimer/getAuctionInfo";
// import { useLanguage } from "@/contexts/LanguageContext";
// import { useTheme } from "@/contexts/ThemeContext";
// import { useUser } from "@/contexts/UserContext";
// import { apiService, Subdomain, Zone } from "@/services/api";

// import { checkSBTSubdomain, SBTSubdomainInfo } from "./checkSBTSubdomain";
// import { calculateProxyNFTAddress } from "./CalculateProxyNFTAddress";

// // ====== ONCHAIN ======
// import { useBlockchainItems } from "@/services/blockchainItems/blockchain-items-context.tsx";
// import { SimpleCollection } from "@/services/blockchainItems/blockchain-items-types";

// import ActiveAuctions from "@/components/ActiveAuctions/ActiveAuctions";
// import { useAuctionIntegration } from "@/hooks/useAuctionIntegration";

// import {
//   getAuctionParamsFromUrl,
//   updateAuctionUrl,
//   copyAuctionUrlToClipboard,
//   shareAuction,
//   isAuctionPage,
//   clearAuctionUrl,
// } from "@/utils/urlParams";

// import { useLaunchParams } from "@telegram-apps/sdk-react";
// import { MiniAppLinks } from "@/utils/miniAppLinks";
// import { AuctionCollectionSelector } from "./AuctionCollectionSelector";
// import { getUserSbtSubdomainsCount } from "@/utils/sbt-utils";
// import { convertUserFriendlyToRaw } from "@/utils/tonUtils";

// // ====== ТИПЫ ======

// type CollectionAddressMap = {
//   [key: string]: string;
// };

// type ActiveTab = "proxy" | "sbt";

// const mapPrices: Record<number, number> = {
//   1: 30,
//   2: 20,
//   3: 10,
//   4: 5,
//   5: 2.5,
//   6: 1,
// };

// const API_PAYLOAD_URL = import.meta.env.VITE_API_SC_PAYLOAD_URL;

// const normalizeAddress = (addr: string): string => {
//   if (!addr) return "";
//   try {
//     const address = Address.parse(addr);
//     return address.toString({ bounceable: true, testOnly: false });
//   } catch (error) {
//     console.error("Error parsing address:", addr, error);
//     return addr;
//   }
// };

// // ====== ТОЧНАЯ КОПИЯ collectionToZone из ProfileWidget ======
// const collectionToZone = (col: SimpleCollection): Zone => {
//   const rawName = col.name || "";
//   const zoneName = rawName
//     .replace(" DNS Domains", "")
//     .replace(" Proxy Domains", "")
//     .toLowerCase();
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
// // КОМПОНЕНТ
// // ====================================================================

// export const AuctionPage: React.FC<{}> = () => {
//   const dispatch = useTypedDispatch();
//   const wallet = useTonWallet();
//   const userAddress = useTonAddress();
//   const [tonConnectUI] = useTonConnectUI();
//   const { refreshSubdomains } = useUser();

//   const [sbtSubdomainInfo, setSbtSubdomainInfo] =
//     useState<SBTSubdomainInfo | null>(null);

//   const { currentTheme } = useTheme();
//   const isDark = currentTheme === "dark";
//   const { t } = useLanguage();

//   const [activeTab, setActiveTab] = useState<ActiveTab>("proxy");
//   const [selectedDomainZone, setSelectedDomainZone] = useState("");
//   const [subDomainName, setSubDomainName] = useState("");
//   const [collectionAddress, setCollectionAddress] = useState("");
//   const [snackbar, setSnackbar] = useState<JSX.Element | null>(null);
//   const [auctionInfo, setAuctionInfo] = useState<ParsedAuctionInfo | null>(
//     null
//   );
//   const [isLoading, setIsLoading] = useState(false);
//   const [nftAddress, setNftAddress] = useState("");
//   const [hasChecked, setHasChecked] = useState(false);
//   const [isClaimLoading, setIsClaimLoading] = useState(false);
//   const [customBidAmount, setCustomBidAmount] = useState("");
//   const [showCustomInput, setShowCustomInput] = useState(false);
//   const [manualBidValue, setManualBidValue] = useState("");
//   const [sbtPurchaseCompleted, setSbtPurchaseCompleted] = useState(false);
//   const [sbtLoading, setSbtLoading] = useState(false);
//   const [sbtZonesCount, setSbtZonesCount] = useState<Record<string, number>>(
//     {}
//   );
//   const prevSbtMapRef = useRef<{
//     cacheKey: string;
//     map: CollectionAddressMap;
//   } | null>(null);

//   const isTestnet = wallet?.account?.chain === "-3";
//   const launchParams = useLaunchParams();
//   const [, setOpenedViaDeeplink] = useState(false);

//   // ====== ONCHAIN ДАННЫЕ ======
//   const {
//     proxyCollections,
//     sbtCollections,
//     loadAllData,
//     isLoading: zonesLoading,
//     error: zonesError,
//   } = useBlockchainItems();

//   // ====== ТОЧНО КАК В ProfileWidget: getUserZones ======
//   const getUserZones = useMemo((): Zone[] => {
//     if (!userAddress) return [];

//     const normalizedAddress =
//       convertUserFriendlyToRaw(userAddress).toLowerCase();

//     const proxyZones = proxyCollections
//       .filter((col) => {
//         const creator = (
//           col.creator_address ||
//           col.owner_address ||
//           ""
//         ).toLowerCase();
//         return creator === normalizedAddress;
//       })
//       .map((col) => collectionToZone(col));

//     const sbtZones = sbtCollections
//       .filter((col) => {
//         const creator = (
//           col.creator_address ||
//           col.owner_address ||
//           ""
//         ).toLowerCase();
//         return creator === normalizedAddress;
//       })
//       .map((col) => collectionToZone(col));

//     return [...proxyZones, ...sbtZones];
//   }, [userAddress, proxyCollections, sbtCollections]);

//   // proxyZones = все proxy из getUserZones (для селекта proxy)
//   // sbtZones = только sbt из getUserZones (для селекта sbt)
//   // allZones = все (для поиска collectionAddress)
//   const allZones: Zone[] = getUserZones;
//   const proxyZones: Zone[] = useMemo(
//     () => allZones.filter((z) => z.proxy === 1),
//     [allZones]
//   );
//   const sbtZones: Zone[] = useMemo(
//     () => allZones.filter((z) => z.proxy === 0),
//     [allZones]
//   );

//   const activeSbtZones: Zone[] = useMemo(
//     () => sbtZones.filter((zone) => zone.status !== "inactive"),
//     [sbtZones]
//   );

//   useEffect(() => {
//     if (wallet) {
//       apiService.setNetwork(isTestnet);
//     }
//   }, [wallet, isTestnet]);

//   const isProxyZone = useCallback((zone: any): boolean => {
//     const proxyValue = zone.proxy;
//     if (typeof proxyValue === "number") return proxyValue === 1;
//     if (typeof proxyValue === "string") {
//       const lowerValue = proxyValue.toLowerCase();
//       return lowerValue === "proxy" || lowerValue === "1";
//     }
//     return false;
//   }, []);

//   const proxyCollectionAddressesMap = useMemo(() => {
//     const map: CollectionAddressMap = {};
//     allZones.forEach((zone) => {
//       if (isProxyZone(zone) && zone.name && zone.collectionAddress) {
//         map[zone.name] = zone.collectionAddress;
//       }
//     });
//     return map;
//   }, [allZones, isProxyZone]);

//   const sbtCollectionAddressesMap = useMemo(() => {
//     const cacheKey = activeSbtZones
//       .map((z) => `${z.name}|${z.collectionAddress}`)
//       .sort()
//       .join(";");

//     if (prevSbtMapRef.current && prevSbtMapRef.current.cacheKey === cacheKey) {
//       return prevSbtMapRef.current.map;
//     }

//     const newMap: CollectionAddressMap = {};
//     activeSbtZones.forEach((zone) => {
//       if (zone.name && zone.collectionAddress) {
//         newMap[zone.name] = zone.collectionAddress;
//       }
//     });

//     prevSbtMapRef.current = { cacheKey, map: newMap };
//     return newMap;
//   }, [activeSbtZones]);

//   const currentCollectionMap = useMemo(() => {
//     return activeTab === "proxy"
//       ? proxyCollectionAddressesMap
//       : sbtCollectionAddressesMap;
//   }, [activeTab, proxyCollectionAddressesMap, sbtCollectionAddressesMap]);

//   // Устанавливаем collectionAddress из SimpleCollection при выборе зоны
//   useEffect(() => {
//     if (selectedDomainZone && !collectionAddress && allZones.length > 0) {
//       const zone = allZones.find((z) => z.name === selectedDomainZone);
//       if (zone?.collectionAddress) {
//         setCollectionAddress(zone.collectionAddress);
//       } else {
//         const addressFromMap = currentCollectionMap[selectedDomainZone];
//         if (addressFromMap) {
//           setCollectionAddress(addressFromMap);
//         }
//       }
//     }
//   }, [selectedDomainZone, collectionAddress, allZones, currentCollectionMap]);

//   const domainZoneName = useMemo(() => {
//     if (!selectedDomainZone) return "";
//     return selectedDomainZone.split(".")[0];
//   }, [selectedDomainZone]);

//   const calculateDomainPrice = useMemo(() => {
//     if (activeTab === "sbt") return 500_000_000;
//     const domainLength = subDomainName.length;
//     const basePrice = mapPrices[domainLength] || 0.5;
//     return Math.floor(basePrice * 1_000_000_000);
//   }, [subDomainName, activeTab]);

//   const calculateBidPrice = useMemo(() => {
//     if (activeTab === "sbt" || !auctionInfo) return 0;
//     if (customBidAmount && !isNaN(Number(customBidAmount))) {
//       return Math.floor(Number(customBidAmount) * 1_000_000_000);
//     }
//     const currentMaxBid = Number(auctionInfo.maxBid);
//     const bidIncrease = Math.ceil(currentMaxBid * 0.05);
//     return currentMaxBid + bidIncrease;
//   }, [auctionInfo, customBidAmount, activeTab]);

//   const canClaim = useMemo(() => {
//     if (activeTab === "sbt" || !auctionInfo || !userAddress) return false;
//     try {
//       if (auctionInfo.maxBidderOwner === null) return false;
//       const normalizedMaxBidder = normalizeAddress(auctionInfo.maxBidderOwner);
//       const normalizedUserAddress = normalizeAddress(userAddress);
//       return (
//         !auctionInfo.isActive && normalizedMaxBidder === normalizedUserAddress
//       );
//     } catch (error) {
//       console.error("Error in canClaim:", error);
//       return false;
//     }
//   }, [auctionInfo, userAddress, activeTab]);

//   const marketplaceUrl = useMemo(() => {
//     if (activeTab === "sbt" || !nftAddress || !collectionAddress) return "";
//     const baseUrl = isTestnet
//       ? "https://testnet.getgems.io"
//       : "https://getgems.io";
//     return `${baseUrl}/collection/${collectionAddress}/${nftAddress}`;
//   }, [nftAddress, collectionAddress, isTestnet, activeTab]);

//   const showSnackbar = useCallback(
//     (message: string, type: "success" | "error" = "success") => {
//       setSnackbar(
//         <ShowSnackbar
//           message={message}
//           type={type}
//           onClose={() => setSnackbar(null)}
//         />
//       );
//     },
//     []
//   );

//   const updateUrlWithCurrentAuction = useCallback(() => {
//     if (selectedDomainZone && subDomainName && activeTab === "proxy") {
//       updateAuctionUrl({
//         zone: selectedDomainZone,
//         subdomain: subDomainName,
//       });
//     }
//   }, [selectedDomainZone, subDomainName, activeTab]);

//   const handleCopyAuctionLink = useCallback(async () => {
//     if (!selectedDomainZone || !subDomainName) {
//       showSnackbar(t("selectZoneAndSubdomainFirst"), "error");
//       return;
//     }
//     const success = await copyAuctionUrlToClipboard({
//       zone: selectedDomainZone,
//       subdomain: subDomainName,
//     });
//     if (success) showSnackbar(t("auctionLinkCopied"), "success");
//     else showSnackbar(t("failedToCopyLink"), "error");
//   }, [selectedDomainZone, subDomainName, showSnackbar, t]);

//   const handleShareAuction = useCallback(async () => {
//     if (!selectedDomainZone || !subDomainName) {
//       showSnackbar(t("selectZoneAndSubdomainFirst"), "error");
//       return;
//     }
//     const success = await shareAuction({
//       zone: selectedDomainZone,
//       subdomain: subDomainName,
//     });
//     if (!success) await handleCopyAuctionLink();
//   }, [
//     selectedDomainZone,
//     subDomainName,
//     showSnackbar,
//     handleCopyAuctionLink,
//     t,
//   ]);

//   // ====== DEEPLINK / URL ======
//   useEffect(() => {
//     const startappParam = launchParams.startParam;
//     if (startappParam) {
//       setOpenedViaDeeplink(true);
//     }
//   }, [launchParams.startParam]);

//   useEffect(() => {
//     const hasUrlParams = isAuctionPage();
//     const hasDeeplink = !!launchParams.startParam;
//     if ((hasUrlParams || hasDeeplink) && allZones.length === 0) {
//       return;
//     }
//     if (hasDeeplink) {
//       const startappParam = launchParams.startParam!;
//       try {
//         const { route, params } = MiniAppLinks.parseStartapp(startappParam);
//         if (route === "/add-subdomain" && params.zone && params.subdomain) {
//           loadAuctionFromParams(params.zone, params.subdomain);
//         }
//       } catch (error) {
//         console.error("❌ Ошибка парсинга deeplink:", error);
//       }
//     } else if (hasUrlParams) {
//       const params = getAuctionParamsFromUrl();
//       if (params.zone && params.subdomain) {
//         loadAuctionFromParams(params.zone, params.subdomain);
//       }
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [allZones, launchParams.startParam]);

//   // ====== ПРОВЕРКА ИТЕМА ======
//   const handleCheckItem = useCallback(async () => {
//     if (!selectedDomainZone || !subDomainName || !collectionAddress) {
//       showSnackbar(t("pleaseEnterDomainName"), "error");
//       return;
//     }
//     const validCharsRegex = /^[a-z0-9-]+$/;
//     if (!validCharsRegex.test(subDomainName)) {
//       showSnackbar(t("subdomainInvalidCharsError"), "error");
//       return;
//     }
//     setIsLoading(true);
//     setHasChecked(false);
//     const lowerValue = subDomainName.toLowerCase();

//     if (activeTab === "sbt") {
//       const sbtInfo = await checkSBTSubdomain(
//         lowerValue,
//         collectionAddress,
//         isTestnet
//       );
//       if (sbtInfo) {
//         setSbtSubdomainInfo(sbtInfo);
//         setAuctionInfo(null);
//         setNftAddress(sbtInfo.nftAddress || "");
//         if (sbtInfo.isTaken)
//           showSnackbar(t("sbtSubdomainAlreadyTaken"), "error");
//         else showSnackbar(t("sbtSubdomainAvailable"), "success");
//       } else {
//         setSbtSubdomainInfo(null);
//         setAuctionInfo(null);
//         setNftAddress("");
//         showSnackbar(t("checkingAvailability"), "error");
//       }
//     } else {
//       const info = await getAuctionInfo(
//         lowerValue,
//         collectionAddress,
//         isTestnet
//       );
//       if (info) {
//         setAuctionInfo(info);
//         setSbtSubdomainInfo(null);
//         setNftAddress(info.nftAddress || "");
//         showSnackbar(t("auctionInfoLoaded"), "success");
//         if (activeTab === "proxy") updateUrlWithCurrentAuction();
//       } else {
//         setAuctionInfo(null);
//         setSbtSubdomainInfo(null);
//         const proxyNFTAddress = await calculateProxyNFTAddress(
//           lowerValue,
//           collectionAddress,
//           isTestnet
//         );
//         if (proxyNFTAddress) {
//           setNftAddress(proxyNFTAddress);
//           showSnackbar(t("subdomainAvailableForFirstBid"), "success");
//         } else {
//           setNftAddress("");
//           showSnackbar(t("failedToCalculateNFTAddress"), "error");
//         }
//         if (activeTab === "proxy") updateUrlWithCurrentAuction();
//       }
//     }
//     setHasChecked(true);
//     setIsLoading(false);
//   }, [
//     selectedDomainZone,
//     subDomainName,
//     collectionAddress,
//     isTestnet,
//     t,
//     activeTab,
//     updateUrlWithCurrentAuction,
//     showSnackbar,
//   ]);

//   // ====== SBT SUBDOMAINS COUNT ======
//   const loadUserSbtSubdomainsCount = useCallback(async () => {
//     if (!userAddress || activeTab !== "sbt") return;
//     try {
//       const counts = await getUserSbtSubdomainsCount(userAddress, isTestnet);
//       setSbtZonesCount(counts);
//     } catch {
//       setSbtZonesCount({});
//     }
//   }, [userAddress, isTestnet, activeTab]);

//   useEffect(() => {
//     if (activeTab === "sbt" && userAddress) loadUserSbtSubdomainsCount();
//     else setSbtZonesCount({});
//   }, [activeTab, userAddress, loadUserSbtSubdomainsCount]);

//   // ====== ЗАГРУЗКА АУКЦИОНА ИЗ ПАРАМЕТРОВ ======
//   const loadAuctionFromParams = useCallback(
//     (zoneName: string, subdomainName: string) => {
//       setOpenedViaDeeplink(true);
//       setActiveTab("proxy");
//       setSelectedDomainZone(zoneName);
//       setSubDomainName(subdomainName);
//       const zone = allZones.find((z) => z.name === zoneName);
//       if (zone?.collectionAddress) setCollectionAddress(zone.collectionAddress);
//       updateUrlWithCurrentAuction();
//       setTimeout(() => handleCheckItem(), 500);
//     },
//     [allZones, handleCheckItem, updateUrlWithCurrentAuction]
//   );

//   const handleTabChange = (
//     _event: React.SyntheticEvent,
//     newValue: ActiveTab
//   ) => {
//     setActiveTab(newValue);
//     setSelectedDomainZone("");
//     setSubDomainName("");
//     setCollectionAddress("");
//     setAuctionInfo(null);
//     setNftAddress("");
//     setHasChecked(false);
//     setCustomBidAmount("");
//     setShowCustomInput(false);
//     setManualBidValue("");
//     setSbtPurchaseCompleted(false);
//     setOpenedViaDeeplink(false);
//     if (newValue === "sbt") clearAuctionUrl();
//   };

//   const checkItemByName = useCallback(
//     async (zoneName: string, subdomain: string) => {
//       setAuctionInfo(null);
//       setNftAddress("");
//       setHasChecked(false);
//       setCustomBidAmount("");
//       setShowCustomInput(false);
//       setManualBidValue("");
//       setSbtPurchaseCompleted(false);
//       setSelectedDomainZone(zoneName);
//       setSubDomainName(subdomain);
//       const zone = allZones.find((z) => z.name === zoneName);
//       if (zone?.collectionAddress) setCollectionAddress(zone.collectionAddress);
//       else setCollectionAddress("");
//       await new Promise((resolve) => setTimeout(resolve, 100));
//       await handleCheckItem();
//     },
//     [allZones, handleCheckItem]
//   );

//   const { handleAuctionClick, setSelectedZoneName, setSubdomainName } =
//     useAuctionIntegration({ zones: allZones, checkItem: checkItemByName });

//   const handleAuctionClickFromComponent = useCallback(
//     (zoneName: string, subdomainName: string) => {
//       handleAuctionClick(zoneName, subdomainName);
//       if (activeTab === "proxy") updateUrlWithCurrentAuction();
//     },
//     [handleAuctionClick, activeTab, updateUrlWithCurrentAuction]
//   );

//   const setupCollectionAddressForZone = useCallback(
//     (zoneName: string) => {
//       if (!zoneName) return false;
//       const zone = allZones.find((z) => z.name === zoneName);
//       if (zone?.collectionAddress) {
//         setCollectionAddress(zone.collectionAddress);
//         return true;
//       }
//       const a = currentCollectionMap[zoneName];
//       if (a) {
//         setCollectionAddress(a);
//         return true;
//       }
//       return false;
//     },
//     [allZones, currentCollectionMap]
//   );

//   const handleDomainZoneChangeForSelector = useCallback(
//     (value: string) => {
//       setSelectedDomainZone(value);
//       setOpenedViaDeeplink(false);
//       setSelectedZoneName(value);
//       setAuctionInfo(null);
//       setNftAddress("");
//       setHasChecked(false);
//       setCustomBidAmount("");
//       setShowCustomInput(false);
//       setManualBidValue("");
//       setSbtPurchaseCompleted(false);
//       setupCollectionAddressForZone(value);
//       if (value && subDomainName && activeTab === "proxy")
//         updateUrlWithCurrentAuction();
//     },
//     [
//       setSelectedZoneName,
//       setupCollectionAddressForZone,
//       subDomainName,
//       activeTab,
//       updateUrlWithCurrentAuction,
//     ]
//   );

//   const handleSubDomainNameChange = useCallback(
//     (value: string) => {
//       setSubDomainName(value.toLowerCase());
//       setSubdomainName(value.toLowerCase());
//       setAuctionInfo(null);
//       setNftAddress("");
//       setHasChecked(false);
//       setCustomBidAmount("");
//       setShowCustomInput(false);
//       setManualBidValue("");
//       setSbtPurchaseCompleted(false);
//       if (selectedDomainZone && value && activeTab === "proxy")
//         updateUrlWithCurrentAuction();
//     },
//     [
//       setSubdomainName,
//       selectedDomainZone,
//       activeTab,
//       updateUrlWithCurrentAuction,
//     ]
//   );

//   const handleBidSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     const v = e.target.value;
//     if (v === "custom") {
//       setShowCustomInput(true);
//       setCustomBidAmount("");
//       setManualBidValue("");
//     } else {
//       setShowCustomInput(false);
//       setCustomBidAmount(v);
//       setManualBidValue("");
//     }
//   };

//   const handleManualBidChange = (value: string) => {
//     setManualBidValue(value);
//     setCustomBidAmount(value && !isNaN(Number(value)) ? value : "");
//   };

//   // ====== БД ======
//   const createSubdomainIfNotExists = async (subdomainData: {
//     name: string;
//     address: string;
//     mintPrice: number;
//     links?: string[];
//     zoneId?: number;
//     owner?: string;
//     status: "active" | "inactive" | "auction" | "claimed";
//     auctionEndTime?: string;
//     collectionAddress?: string;
//   }): Promise<Subdomain> => {
//     try {
//       apiService.setNetwork(isTestnet);
//       try {
//         return await apiService.getSubdomainByName(subdomainData.name);
//       } catch {
//         return await apiService.createSubdomain({ ...subdomainData });
//       }
//     } catch (error) {
//       console.error("createSubdomainIfNotExists:", error);
//       throw error;
//     }
//   };

//   // ====== СТАРТ АУКЦИОНА ======
//   const handleStartAuction = async () => {
//     if (!selectedDomainZone || !subDomainName || !collectionAddress) {
//       showSnackbar(t("pleaseEnterDomainName"), "error");
//       return;
//     }
//     if (!userAddress) {
//       showSnackbar(t("walletNotConnected"), "error");
//       return;
//     }
//     try {
//       const tonWeb = new TonWeb();
//       const cell = new tonWeb.boc.Cell();
//       cell.bits.writeUint(0, 32);
//       cell.bits.writeString(`${subDomainName}`);
//       const payload = TonWeb.utils.bytesToBase64(await cell.toBoc());
//       await tonConnectUI.sendTransaction({
//         validUntil: Math.floor(Date.now() / 1000) + 360,
//         messages: [
//           {
//             amount: calculateDomainPrice.toString(),
//             address: collectionAddress,
//             payload,
//           },
//         ],
//       });
//       const full = `${subDomainName}.${selectedDomainZone}`;
//       const auctionEndTime = new Date(
//         Date.now() + 24 * 60 * 60 * 1000
//       ).toISOString();
//       try {
//         apiService.setNetwork(isTestnet);
//         const zone = allZones.find((z) => z.name === selectedDomainZone);
//         await apiService.createSubdomain({
//           name: full,
//           address: nftAddress,
//           mintPrice: calculateDomainPrice / 1_000_000_000,
//           owner: userAddress,
//           status: "auction",
//           auctionEndTime,
//           zoneId: zone?.id,
//           collectionAddress: zone?.collectionAddress,
//         });
//         loadAllData(true);
//         showSnackbar(t("startAuction"), "success");
//       } catch (dbError: any) {
//         console.error("DB error:", dbError);
//         showSnackbar(t("auctionStartedBlockchainDbError"), "error");
//       }
//       setTimeout(() => handleCheckItem(), 2000);
//     } catch (error: any) {
//       if (error?.message?.includes("cancelled"))
//         showSnackbar(t("auctionStartCancelled"), "error");
//       else if (error?.message?.includes("rejected"))
//         showSnackbar(t("auctionStartRejected"), "error");
//       else if (error?.message?.includes("insufficient"))
//         showSnackbar(t("insufficientFundsForAuctionStart"), "error");
//       else showSnackbar(t("auctionStartError"), "error");
//     }
//   };

//   // ====== СТАВКА ======
//   const handlePlaceBid = async () => {
//     if (
//       !auctionInfo ||
//       !selectedDomainZone ||
//       !subDomainName ||
//       !collectionAddress
//     ) {
//       showSnackbar(t("auctionDataNotLoaded"), "error");
//       return;
//     }
//     if (!userAddress) {
//       showSnackbar(t("walletNotConnected"), "error");
//       return;
//     }
//     try {
//       await tonConnectUI.sendTransaction({
//         validUntil: Math.floor(Date.now() / 1000) + 360,
//         messages: [
//           { amount: calculateBidPrice.toString(), address: nftAddress },
//         ],
//       });
//       const full = `${subDomainName}.${selectedDomainZone}`;
//       try {
//         apiService.setNetwork(isTestnet);
//         const zone = allZones.find((z) => z.name === selectedDomainZone);
//         const subdomain = await createSubdomainIfNotExists({
//           name: full,
//           address: nftAddress,
//           mintPrice: calculateBidPrice / 1_000_000_000,
//           owner: userAddress,
//           status: "auction",
//           auctionEndTime: new Date(
//             Date.now() + 24 * 60 * 60 * 1000
//           ).toISOString(),
//           zoneId: zone?.id,
//           collectionAddress: zone?.collectionAddress,
//         });
//         await apiService.addBidToSubdomain(subdomain.id, {
//           bidder: userAddress,
//           amount: calculateBidPrice,
//         });
//         await apiService.updateSubdomainStatus(subdomain.id, "auction");
//         refreshSubdomains();
//         loadAllData(true);
//       } catch (dbError: any) {
//         console.error("DB error:", dbError);
//         showSnackbar(t("bidPlacedBlockchainDbError"), "error");
//       }
//       showSnackbar(t("bid"), "success");
//       setCustomBidAmount("");
//       setShowCustomInput(false);
//       setManualBidValue("");
//       setTimeout(() => handleCheckItem(), 2000);
//     } catch (error: any) {
//       if (error?.message?.includes("cancelled"))
//         showSnackbar(t("bidCancelled"), "error");
//       else if (error?.message?.includes("rejected"))
//         showSnackbar(t("bidRejected"), "error");
//       else if (error?.message?.includes("insufficient"))
//         showSnackbar(t("insufficientFundsForBid"), "error");
//       else showSnackbar(t("bidError"), "error");
//     }
//   };

//   // ====== ПОКУПКА SBT ======
//   const handlePurchaseSBTSubdomain = async () => {
//     if (!selectedDomainZone || !subDomainName || !collectionAddress) {
//       showSnackbar(t("pleaseEnterDomainName"), "error");
//       return;
//     }
//     if (!wallet) {
//       showSnackbar(t("walletNotConnected"), "error");
//       return;
//     }
//     if (sbtSubdomainInfo?.isTaken) {
//       showSnackbar(t("sbtSubdomainAlreadyTaken"), "error");
//       return;
//     }
//     setSbtLoading(true);
//     try {
//       const tonWeb = new TonWeb();
//       const cell = new tonWeb.boc.Cell();
//       cell.bits.writeUint(0, 32);
//       cell.bits.writeString(`${subDomainName}`);
//       const payload = TonWeb.utils.bytesToBase64(await cell.toBoc());
//       await tonConnectUI.sendTransaction({
//         validUntil: Math.floor(Date.now() / 1000) + 360,
//         messages: [
//           {
//             amount: calculateDomainPrice.toString(),
//             address: collectionAddress,
//             payload,
//           },
//         ],
//       });
//       const full = `${subDomainName}.${selectedDomainZone}`;
//       if (!userAddress) throw new Error("No user address");
//       const nftAddr = sbtSubdomainInfo?.nftAddress || userAddress;
//       apiService.setNetwork(isTestnet);
//       const zone = allZones.find((z) => z.name === selectedDomainZone);
//       await apiService.createSubdomain({
//         name: full,
//         address: nftAddr,
//         mintPrice: calculateDomainPrice / 1_000_000_000,
//         owner: userAddress,
//         status: "active",
//         collectionAddress,
//         zoneId: zone?.id,
//       });
//       showSnackbar(t("sbtSubdomainPurchased"), "success");
//       setSbtPurchaseCompleted(true);
//     } catch (error: any) {
//       if (error?.message?.includes("cancelled"))
//         showSnackbar(t("sbtPurchaseCancelled"), "error");
//       else showSnackbar(t("sbtPurchaseError"), "error");
//     } finally {
//       setSbtLoading(false);
//     }
//   };

//   // ====== CLAIM ======
//   const handleClaimSubdomain = async () => {
//     if (!nftAddress) {
//       showSnackbar(t("nftAddressNotFound"), "error");
//       return;
//     }
//     if (!userAddress) {
//       showSnackbar(t("walletNotConnected"), "error");
//       return;
//     }
//     setIsClaimLoading(true);
//     try {
//       const result = await dispatch(
//         claimSubdomain({
//           subdomain_item_address: nftAddress,
//           query_id: 0,
//           isTestnet,
//         })
//       ).unwrap();
//       await tonConnectUI.sendTransaction({
//         validUntil: result.validUntil,
//         messages: result.messages,
//       });
//       const full = `${subDomainName}.${selectedDomainZone}`;
//       try {
//         apiService.setNetwork(isTestnet);
//         const s = await apiService.getSubdomainByName(full);
//         if (s) await apiService.updateSubdomainStatus(s.id, "claimed");
//       } catch (e) {
//         console.error("DB claim error:", e);
//       }
//       showSnackbar(t("subdomainClaimedSuccess"), "success");
//     } catch (error) {
//       showSnackbar(
//         error instanceof Error ? error.message : t("subdomainClaimError"),
//         "error"
//       );
//     } finally {
//       setIsClaimLoading(false);
//     }
//   };

//   const getImageUrl = () => {
//     if (!domainZoneName || !subDomainName) return "";
//     if (activeTab === "proxy")
//       return `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${domainZoneName}/${subDomainName}.png`;
//     return `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${domainZoneName}/${subDomainName}.png`;
//   };

//   const getActionButtonText = (): string => {
//     if (activeTab === "sbt") {
//       if (sbtPurchaseCompleted) return `✅ ${t("purchased")}`;
//       if (sbtSubdomainInfo?.isTaken)
//         return `❌ ${t("sbtSubdomainAlreadyTaken")}`;
//       return `${t("mintSubdomain")} (${t("buyFor1TON")})`;
//     }
//     if (!auctionInfo)
//       return `${t("startAuction")} (${t("price")}: ${
//         calculateDomainPrice / 1_000_000_000
//       } TON)`;
//     if (auctionInfo.isActive)
//       return `${t("bid")} (${
//         customBidAmount || (calculateBidPrice / 1_000_000_000).toFixed(2)
//       } TON)`;
//     if (canClaim)
//       return isClaimLoading ? t("claiming") : `🎁 ${t("claimSubdomain")}`;
//     return "";
//   };

//   const getActionButtonHandler = (): (() => void) | undefined => {
//     if (activeTab === "sbt") {
//       if (sbtPurchaseCompleted || sbtSubdomainInfo?.isTaken) return undefined;
//       return handlePurchaseSBTSubdomain;
//     }
//     if (!auctionInfo) return handleStartAuction;
//     if (auctionInfo.isActive) return handlePlaceBid;
//     if (canClaim) return handleClaimSubdomain;
//     return undefined;
//   };

//   const getActionButtonDisabled = (): boolean => {
//     if (activeTab === "sbt")
//       return (
//         sbtPurchaseCompleted ||
//         sbtLoading ||
//         !selectedDomainZone ||
//         !subDomainName ||
//         !!sbtSubdomainInfo?.isTaken
//       );
//     if (!auctionInfo) return !selectedDomainZone || !subDomainName;
//     if (auctionInfo.isActive) return false;
//     if (canClaim) return isClaimLoading;
//     return true;
//   };

//   const themeColors = {
//     light: {
//       primary: "linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)",
//     },
//     dark: {
//       primary: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
//     },
//   };
//   const colors = themeColors[isDark ? "dark" : "light"];

//   const getActionButtonColor = () => {
//     if (activeTab === "sbt") {
//       if (sbtPurchaseCompleted) return "#4ade80";
//       if (sbtSubdomainInfo?.isTaken) return "#888";
//       return sbtLoading ? "#888" : "#4a90e2";
//     }
//     if (!auctionInfo) return "#4ade80";
//     if (auctionInfo.isActive) return "rgb(74, 144, 226)";
//     if (canClaim) return isClaimLoading ? "#888" : "#4ade80";
//     return "transparent";
//   };

//   useEffect(() => {
//     if (userAddress) refreshSubdomains();
//   }, [userAddress, refreshSubdomains]);

//   // ====================================================================
//   // RENDER
//   // ====================================================================
//   return (
//     <Page back={true}>
//       {snackbar}
//       <Box sx={{ display: "flex", justifyContent: "center", mt: 2, mb: 3 }}>
//         <Tabs
//           value={activeTab}
//           onChange={handleTabChange}
//           sx={{
//             "& .MuiTab-root": {
//               color: isDark ? "#ccc" : "#666",
//               "&.Mui-selected": {
//                 color: isDark ? "#FFD700" : "#3B82F6",
//               },
//             },
//           }}
//         >
//           <Tab label={t("proxyForSale")} value="proxy" />
//           <Tab label={t("sbtNotForSale")} value="sbt" />
//         </Tabs>
//       </Box>

//       {/* Proxy banner */}
//       {activeTab === "proxy" && (
//         <div
//           className="bannerWrapper"
//           style={{
//             display: "flex",
//             width: "100%",
//             justifyContent: "center",
//             alignItems: "center",
//           }}
//         >
//           <Banner
//             type="section"
//             header={t("proxyAuctionTitle")}
//             subheader={t("proxyAuctionDescription")}
//             style={{
//               textAlign: "center",
//               marginBottom: "20px",
//               padding: "15px",
//               maxWidth: "425px",
//               background: isDark
//                 ? "linear-gradient(to bottom, #1a1a1a, #2a2a2a)"
//                 : "linear-gradient(to bottom, #f5f5f5, #e5e5e5)",
//               color: isDark ? "#fff" : "#333",
//             }}
//           >
//             <div
//               style={{
//                 textAlign: "left",
//                 marginTop: "15px",
//                 fontSize: "14px",
//                 display: "flex",
//                 flexDirection: "column",
//                 alignItems: "center",
//                 maxWidth: "425px",
//               }}
//             >
//               <div
//                 style={{
//                   fontWeight: "bold",
//                   marginBottom: "10px",
//                   textAlign: "center",
//                 }}
//               >
//                 {t("proxyFeatures")}
//               </div>
//               <ul style={{ paddingLeft: "20px", margin: 0 }}>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature1")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature2")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature3")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature4")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature5")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature6")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature7")}</li>
//               </ul>
//             </div>
//           </Banner>
//         </div>
//       )}

//       {/* SBT banner */}
//       {activeTab === "sbt" && (
//         <div
//           className="bannerWrapper"
//           style={{
//             display: "flex",
//             width: "100%",
//             justifyContent: "center",
//             alignItems: "center",
//           }}
//         >
//           <Banner
//             type="section"
//             header={t("sbtMintTitle")}
//             subheader={t("sbtMintDescription")}
//             style={{
//               textAlign: "center",
//               marginBottom: "20px",
//               padding: "15px",
//               maxWidth: "425px",
//               background: isDark
//                 ? "linear-gradient(to bottom, #1a1a1a, #2a2a2a)"
//                 : "linear-gradient(to bottom, #f5f5f5, #e5e5e5)",
//               color: isDark ? "#fff" : "#333",
//             }}
//           >
//             <div
//               style={{
//                 textAlign: "left",
//                 marginTop: "15px",
//                 fontSize: "14px",
//                 display: "flex",
//                 flexDirection: "column",
//                 alignItems: "center",
//                 maxWidth: "425px",
//               }}
//             >
//               <div
//                 style={{
//                   fontWeight: "bold",
//                   marginBottom: "10px",
//                   textAlign: "center",
//                 }}
//               >
//                 {t("sbtFeatures")}
//               </div>
//               <ul style={{ paddingLeft: "20px", margin: 0 }}>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature1")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature2")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature3")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature4")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature5")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature6")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature7")}</li>
//               </ul>
//             </div>
//           </Banner>
//         </div>
//       )}

//       {activeTab === "proxy" && (
//         <ActiveAuctions
//           isTestnet={isTestnet}
//           isDark={isDark}
//           onAuctionClick={handleAuctionClickFromComponent}
//         />
//       )}

//       <div
//         style={{
//           textAlign: "center",
//           marginBottom: "10px",
//           padding: "5px 10px",
//           borderRadius: "15px",
//           background: isTestnet ? "#f59e0b" : "#10b981",
//           color: "white",
//           fontSize: "12px",
//           fontWeight: "bold",
//           maxWidth: "280px",
//           margin: "0 auto",
//         }}
//       >
//         {isTestnet ? "🌐 Testnet Mode" : "🌐 Mainnet Mode"}
//       </div>

//       <List
//         style={{
//           display: "flex",
//           flexDirection: "column",
//           alignItems: "center",
//           gap: "15px",
//           paddingBottom: "150px",
//         }}
//       >
//         {/* Шаг 1: Выбор зоны */}
//         <div style={{ position: "relative", width: "280px" }}>
//           <div
//             style={{
//               position: "absolute",
//               left: "-30px",
//               top: "50%",
//               transform: "translateY(-50%)",
//               fontSize: "18px",
//               fontWeight: "bold",
//               color: isDark ? "white" : "black",
//             }}
//           >
//             1
//           </div>
//           <AuctionCollectionSelector
//             activeTab={activeTab}
//             selectedDomainZone={selectedDomainZone}
//             onDomainZoneChange={handleDomainZoneChangeForSelector}
//             zonesLoading={zonesLoading}
//             zonesError={zonesError}
//             userAddress={userAddress}
//             isDark={isDark}
//             t={t}
//             sbtCollectionAddressesMap={sbtCollectionAddressesMap}
//             activeSbtZones={activeSbtZones}
//             proxyZones={proxyZones}
//             isTestnet={isTestnet}
//             sbtZonesCount={sbtZonesCount}
//           />
//           {zonesError && (
//             <p style={{ color: "#f87171", fontSize: "12px", marginTop: "5px" }}>
//               {zonesError}
//             </p>
//           )}
//           {activeTab === "sbt" &&
//             sbtZones.length === 0 &&
//             !zonesLoading &&
//             !zonesError && (
//               <p
//                 style={{
//                   color: "#f59e0b",
//                   fontSize: "12px",
//                   marginTop: "5px",
//                   textAlign: "center",
//                 }}
//               >
//                 {t("noSbtZones")}
//               </p>
//             )}
//         </div>

//         {/* Информация о зоне */}
//         {selectedDomainZone && (
//           <div
//             style={{
//               padding: "8px 12px",
//               borderRadius: "8px",
//               background: isDark ? "#2a2a2a" : "#f5f5f5",
//               border: `1px solid ${isDark ? "#444" : "#ddd"}`,
//               fontSize: "12px",
//               color: isDark ? "#ccc" : "#666",
//               maxWidth: "280px",
//               textAlign: "center",
//             }}
//           >
//             <p style={{ margin: 0 }}>
//               <strong>{t("zoneType")}</strong>{" "}
//               {activeTab === "proxy" ? t("proxyType") : t("sbtType")}
//             </p>
//             {collectionAddress ? (
//               <p
//                 style={{
//                   margin: "3px 0 0 0",
//                   color: "#4caf50",
//                   fontSize: "11px",
//                 }}
//               >
//                 {t("collectionConfigured")}
//               </p>
//             ) : (
//               <p
//                 style={{
//                   margin: "3px 0 0 0",
//                   color: "#f59e0b",
//                   fontSize: "11px",
//                 }}
//               >
//                 {t("collectionNotConfigured")}
//               </p>
//             )}
//             <p
//               style={{
//                 margin: "3px 0 0 0",
//                 fontSize: "11px",
//                 color: isTestnet ? "#f59e0b" : "#10b981",
//               }}
//             >
//               {t("network")} {isTestnet ? t("testnet") : t("mainnet")}
//             </p>
//           </div>
//         )}

//         {/* Шаг 2: Ввод названия субдомена */}
//         <div style={{ position: "relative", width: "280px" }}>
//           <div
//             style={{
//               position: "absolute",
//               left: "-30px",
//               top: "50%",
//               transform: "translateY(-50%)",
//               fontSize: "18px",
//               fontWeight: "bold",
//               color: isDark ? "white" : "black",
//             }}
//           >
//             2
//           </div>
//           <Input
//             placeholder={t("enterSubdomainName")}
//             value={subDomainName}
//             onChange={(e) => {
//               const val = e.target.value
//                 .trim()
//                 .toLowerCase()
//                 .replace(/[^a-z0-9-]/g, "");
//               handleSubDomainNameChange(val);
//             }}
//             style={{
//               width: "280px",
//               borderRadius: "50%",
//               padding: "0px 15px",
//               position: "relative",
//             }}
//             before={
//               <div
//                 style={{
//                   position: "absolute",
//                   left: "15px",
//                   top: "50%",
//                   transform: "translateY(-50%)",
//                   opacity: 0.5,
//                 }}
//               >
//                 🔍
//               </div>
//             }
//           />
//         </div>

//         {/* Шаг 2.5: Проверка итема */}
//         <div style={{ position: "relative", width: "280px" }}>
//           <div
//             style={{
//               position: "absolute",
//               left: "-30px",
//               top: "50%",
//               transform: "translateY(-50%)",
//               fontSize: "18px",
//               fontWeight: "bold",
//               color: isDark ? "white" : "black",
//             }}
//           >
//             2.5
//           </div>
//           <Button
//             onClick={handleCheckItem}
//             disabled={
//               !selectedDomainZone ||
//               !subDomainName ||
//               isLoading ||
//               !collectionAddress
//             }
//             style={{
//               width: "280px",
//               borderRadius: "25px",
//               padding: "10px 15px",
//               background: isLoading ? "#888" : colors.primary,
//               opacity: !collectionAddress ? 0.5 : 1,
//               cursor: !collectionAddress ? "not-allowed" : "pointer",
//               color: isDark ? "black" : "white",
//             }}
//           >
//             {isLoading ? t("checking") : t("checkingItem")}
//           </Button>
//           {!collectionAddress && (
//             <p
//               style={{
//                 color: "#f59e0b",
//                 fontSize: "12px",
//                 marginTop: "5px",
//                 textAlign: "center",
//               }}
//             >
//               {t("noCollectionAddress")}
//             </p>
//           )}
//         </div>

//         {/* КАРТОЧКА АУКЦИОНА (proxy) */}
//         {hasChecked && auctionInfo && activeTab === "proxy" && (
//           <Card
//             style={{
//               background: "linear-gradient(to bottom, #1a1a1a, #2a2a2a)",
//               marginBottom: "20px",
//               padding: "15px",
//               borderRadius: "10px",
//               width: "280px",
//               border: `2px solid ${
//                 auctionInfo.isActive ? "#4ade80" : "#f87171"
//               }`,
//             }}
//           >
//             <div style={{ color: "#fff", fontSize: "14px" }}>
//               <div
//                 style={{
//                   marginBottom: "10px",
//                   textAlign: "center",
//                   color: auctionInfo.isActive ? "#4ade80" : "#f87171",
//                   fontWeight: "bold",
//                 }}
//               >
//                 {auctionInfo.isActive
//                   ? `✅  ${t("bidOnAuction")}`
//                   : `❌ ${t("subdomainAlreadyTaken")}`}
//               </div>
//               <div
//                 style={{
//                   width: "100%",
//                   display: "flex",
//                   justifyContent: "center",
//                   alignItems: "center",
//                 }}
//               >
//                 <img
//                   style={{
//                     width: "200px",
//                     height: "200px",
//                     borderRadius: "25px",
//                     marginBottom: "15px",
//                   }}
//                   src={getImageUrl()}
//                   alt="subdomainImage"
//                 />
//               </div>
//               <div style={{ marginBottom: "10px" }}>
//                 <strong>{t("maxBidder")}:</strong>
//                 <br />
//                 <code style={{ fontSize: "12px", wordBreak: "break-all" }}>
//                   <a
//                     style={{ color: "white" }}
//                     href={`https://tonviewer.com/${
//                       auctionInfo.maxBidderOwner || t("domainLeftAuction")
//                     }`}
//                   >
//                     {auctionInfo.maxBidderOwner || t("domainLeftAuction")}
//                   </a>
//                 </code>
//               </div>
//               <div style={{ marginBottom: "10px" }}>
//                 <strong>{t("maxBid")}: </strong>
//                 {Number(auctionInfo.maxBid) === 0
//                   ? t("hideAfterAuctionEnd")
//                   : (Number(auctionInfo.maxBid) / 1_000_000_000).toFixed(
//                       2
//                     )}{" "}
//                 TON
//               </div>
//               <div style={{ marginBottom: "10px" }}>
//                 <strong>{t("endTime")}:</strong>{" "}
//                 {new Date(auctionInfo.timestamp * 1000).toLocaleString()}
//               </div>
//               <div>
//                 <strong>{t("status")}:</strong>
//                 <span
//                   style={{
//                     marginLeft: "5px",
//                     color: auctionInfo.isActive ? "#4ade80" : "#f87171",
//                   }}
//                 >
//                   {auctionInfo.isActive
//                     ? `🟢 ${t("active")}`
//                     : `🔴 ${t("ended")}`}
//                 </span>
//               </div>
//               <div
//                 style={{
//                   marginTop: "10px",
//                   paddingTop: "10px",
//                   borderTop: "1px solid #444",
//                   display: "flex",
//                   justifyContent: "space-between",
//                   alignItems: "center",
//                 }}
//               >
//                 <div style={{ fontSize: "11px", color: "#aaa" }}>
//                   <strong>{t("networkLabel")}</strong>{" "}
//                   {isTestnet ? t("testnet") : t("mainnet")}
//                 </div>
//                 {activeTab === "proxy" && (
//                   <div style={{ display: "flex", gap: "8px" }}>
//                     <IconButton
//                       size="s"
//                       mode="outline"
//                       onClick={handleCopyAuctionLink}
//                       title={t("copyAuctionLink")}
//                       style={{
//                         backgroundColor: "#333",
//                         borderColor: "#555",
//                         color: "white",
//                         padding: "4px 8px",
//                         fontSize: "10px",
//                       }}
//                     >
//                       📋
//                     </IconButton>
//                     <IconButton
//                       size="s"
//                       mode="outline"
//                       onClick={handleShareAuction}
//                       title={t("shareAuction")}
//                       style={{
//                         backgroundColor: "#333",
//                         borderColor: "#555",
//                         color: "white",
//                         padding: "4px 8px",
//                         fontSize: "10px",
//                       }}
//                     >
//                       🔗
//                     </IconButton>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </Card>
//         )}

//         {/* КАРТОЧКА SBT */}
//         {hasChecked && sbtSubdomainInfo && activeTab === "sbt" && (
//           <Card
//             style={{
//               background: sbtSubdomainInfo.isTaken
//                 ? "linear-gradient(to bottom, #2a1a1a, #3a2a2a)"
//                 : "linear-gradient(to bottom, #1a2a1a, #2a3a2a)",
//               marginBottom: "20px",
//               padding: "15px",
//               borderRadius: "10px",
//               width: "280px",
//               border: sbtSubdomainInfo.isTaken
//                 ? "2px solid #f87171"
//                 : "2px solid #4a90e2",
//             }}
//           >
//             <div style={{ color: "#fff", fontSize: "14px" }}>
//               <div
//                 style={{
//                   marginBottom: "10px",
//                   textAlign: "center",
//                   color: sbtSubdomainInfo.isTaken ? "#f87171" : "#4a90e2",
//                   fontWeight: "bold",
//                 }}
//               >
//                 {sbtSubdomainInfo.isTaken
//                   ? `❌ ${t("sbtSubdomainAlreadyTaken")}`
//                   : `✅ ${t("sbtSubdomainAvailable")}`}
//               </div>
//               <div
//                 style={{
//                   width: "100%",
//                   display: "flex",
//                   justifyContent: "center",
//                   alignItems: "center",
//                 }}
//               >
//                 <img
//                   style={{
//                     width: "200px",
//                     height: "200px",
//                     borderRadius: "25px",
//                     marginBottom: "15px",
//                   }}
//                   src={getImageUrl()}
//                   alt="subdomainImage"
//                 />
//               </div>
//               {sbtSubdomainInfo.isTaken && sbtSubdomainInfo.ownerAddress && (
//                 <>
//                   <div style={{ marginBottom: "10px" }}>
//                     <strong>{t("sbtOwner")}:</strong>
//                     <br />
//                     <code style={{ fontSize: "12px", wordBreak: "break-all" }}>
//                       <a
//                         style={{ color: "white" }}
//                         href={`https://tonviewer.com/${sbtSubdomainInfo.ownerAddress}`}
//                         target="_blank"
//                         rel="noopener noreferrer"
//                       >
//                         {sbtSubdomainInfo.ownerAddress}
//                       </a>
//                     </code>
//                   </div>
//                   {sbtSubdomainInfo.nftAddress && (
//                     <div style={{ marginBottom: "10px" }}>
//                       <strong>NFT Address:</strong>
//                       <br />
//                       <code
//                         style={{ fontSize: "12px", wordBreak: "break-all" }}
//                       >
//                         <a
//                           style={{ color: "white" }}
//                           href={`https://tonviewer.com/${sbtSubdomainInfo.nftAddress}`}
//                           target="_blank"
//                           rel="noopener noreferrer"
//                         >
//                           {sbtSubdomainInfo.nftAddress}
//                         </a>
//                       </code>
//                     </div>
//                   )}
//                   {sbtSubdomainInfo.timestamp && (
//                     <div style={{ marginBottom: "10px" }}>
//                       <strong>{t("created")}:</strong>{" "}
//                       {new Date(
//                         sbtSubdomainInfo.timestamp * 1000
//                       ).toLocaleString()}
//                     </div>
//                   )}
//                 </>
//               )}
//               {!sbtSubdomainInfo.isTaken && (
//                 <div
//                   style={{
//                     marginTop: "10px",
//                     padding: "8px",
//                     background: "rgba(74, 144, 226, 0.1)",
//                     borderRadius: "5px",
//                     fontSize: "12px",
//                     color: "#ccc",
//                     textAlign: "center",
//                   }}
//                 >
//                   {t("sbtForPersonalUse")} • {t("buyFor1TON")}
//                 </div>
//               )}
//               <div
//                 style={{
//                   marginTop: "10px",
//                   paddingTop: "10px",
//                   borderTop: "1px solid #444",
//                   fontSize: "11px",
//                   color: "#aaa",
//                 }}
//               >
//                 <strong>{t("networkLabel")}</strong>{" "}
//                 {isTestnet ? t("testnet") : t("mainnet")}
//               </div>
//             </div>
//           </Card>
//         )}

//         {/* Сообщение — субдомен свободен */}
//         {hasChecked && !auctionInfo && !sbtSubdomainInfo && (
//           <Card
//             style={{
//               background:
//                 activeTab === "sbt"
//                   ? "linear-gradient(to bottom, #1a2a1a, #2a2a2a)"
//                   : "linear-gradient(to bottom, #2a1a1a, #2a2a1a)",
//               marginBottom: "20px",
//               padding: "15px",
//               borderRadius: "10px",
//               width: "280px",
//               border:
//                 activeTab === "sbt" ? "2px solid #4a90e2" : "2px solid #4ade80",
//             }}
//           >
//             <div
//               style={{ color: "#fff", fontSize: "14px", textAlign: "center" }}
//             >
//               <div
//                 style={{
//                   marginBottom: "10px",
//                   color: activeTab === "sbt" ? "#4a90e2" : "#4ade80",
//                   fontWeight: "bold",
//                 }}
//               >
//                 {activeTab === "sbt"
//                   ? sbtPurchaseCompleted
//                     ? `✅ ${t("sbtSubdomainPurchased")}`
//                     : `✅ ${t("sbtSubdomainAvailable")}`
//                   : `✅ ${t("subdomainAvailable")}`}
//               </div>
//               <div
//                 style={{
//                   width: "100%",
//                   display: "flex",
//                   justifyContent: "center",
//                   alignItems: "center",
//                 }}
//               >
//                 <img
//                   style={{
//                     width: "200px",
//                     height: "200px",
//                     borderRadius: "25px",
//                     marginBottom: "15px",
//                   }}
//                   src={getImageUrl()}
//                   alt="subdomainImage"
//                 />
//               </div>
//               <div style={{ color: "#ccc", fontSize: "13px" }}>
//                 {activeTab === "sbt"
//                   ? sbtPurchaseCompleted
//                     ? t("sbtSubdomainPurchased")
//                     : t("sbtForPersonalUse")
//                   : t("makeFirstBid")}
//               </div>
//               <div
//                 style={{
//                   marginTop: "10px",
//                   paddingTop: "10px",
//                   borderTop: "1px solid #444",
//                   display: "flex",
//                   justifyContent: "space-between",
//                   alignItems: "center",
//                 }}
//               >
//                 <div style={{ fontSize: "11px", color: "#aaa" }}>
//                   <strong>{t("networkLabel")}</strong>{" "}
//                   {isTestnet ? t("testnet") : t("mainnet")}
//                 </div>
//                 {activeTab === "proxy" && (
//                   <div style={{ display: "flex", gap: "8px" }}>
//                     <IconButton
//                       size="s"
//                       mode="outline"
//                       onClick={handleCopyAuctionLink}
//                       title={t("copyAuctionLink")}
//                       style={{
//                         backgroundColor: "#333",
//                         borderColor: "#555",
//                         color: "white",
//                         padding: "4px 8px",
//                         fontSize: "10px",
//                       }}
//                     >
//                       📋
//                     </IconButton>
//                     <IconButton
//                       size="s"
//                       mode="outline"
//                       onClick={handleShareAuction}
//                       title={t("shareAuction")}
//                       style={{
//                         backgroundColor: "#333",
//                         borderColor: "#555",
//                         color: "white",
//                         padding: "4px 8px",
//                         fontSize: "10px",
//                       }}
//                     >
//                       🔗
//                     </IconButton>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </Card>
//         )}

//         {/* ТАЙМЕР */}
//         {activeTab === "proxy" && (
//           <Card
//             style={{
//               background: "linear-gradient(to bottom, black, gray)",
//               marginBottom: "20px",
//               padding: "5px 5px 20px 5px",
//               borderRadius: "10px",
//               display: "flex",
//               flexDirection: "column",
//               alignItems: "center",
//               gap: "10px",
//               width: "min-content",
//             }}
//           >
//             <FlipTimer
//               auctionData={auctionInfo}
//               defaultTime={hasChecked && !auctionInfo ? 86400 : undefined}
//               onComplete={() => console.log("Аукцион завершен!")}
//             />
//             <div style={{ fontSize: "11px", color: "#aaa" }}>
//               {t("networkLabel")} {isTestnet ? t("testnet") : t("mainnet")}
//             </div>
//           </Card>
//         )}

//         {/* Селект кастомной ставки */}
//         {hasChecked &&
//           auctionInfo &&
//           auctionInfo.isActive &&
//           activeTab === "proxy" && (
//             <>
//               <div style={{ position: "relative", width: "200px" }}>
//                 <select
//                   value={showCustomInput ? "custom" : customBidAmount}
//                   onChange={handleBidSelectChange}
//                   style={{
//                     width: "200px",
//                     borderRadius: "25px",
//                     padding: "10px 15px",
//                     fontSize: "14px",
//                   }}
//                 >
//                   <option value="">
//                     {`${t("price")}: Min. ${(
//                       calculateBidPrice / 1_000_000_000
//                     ).toFixed(2)} TON`}
//                   </option>
//                   <option value="custom">{t("enterValue")}</option>
//                   <option value="10">10 TON</option>
//                   <option value="20">20 TON</option>
//                   <option value="50">50 TON</option>
//                   <option value="100">100 TON</option>
//                   <option value="500">500 TON</option>
//                 </select>
//               </div>
//               {showCustomInput && (
//                 <div style={{ position: "relative", width: "200px" }}>
//                   <Input
//                     placeholder={t("yourBid")}
//                     value={manualBidValue}
//                     onChange={(e) => handleManualBidChange(e.target.value)}
//                     style={{
//                       width: "200px",
//                       borderRadius: "25px",
//                       padding: "10px 15px",
//                       fontSize: "24px",
//                       fontWeight: "600",
//                       marginLeft: "20px",
//                     }}
//                   />
//                 </div>
//               )}
//             </>
//           )}

//         {/* Шаг 3: Основная кнопка действия */}
//         {hasChecked && getActionButtonText() && (
//           <div style={{ position: "relative", width: "280px" }}>
//             <div
//               style={{
//                 position: "absolute",
//                 left: "-30px",
//                 top: "50%",
//                 transform: "translateY(-50%)",
//                 fontSize: "18px",
//                 fontWeight: "bold",
//                 color: isDark ? "white" : "black",
//               }}
//             >
//               3
//             </div>
//             <Button
//               onClick={getActionButtonHandler()}
//               disabled={getActionButtonDisabled()}
//               style={{
//                 width: "280px",
//                 borderRadius: "25px",
//                 padding: "10px 15px",
//                 backgroundColor: getActionButtonColor(),
//                 marginBottom:
//                   activeTab === "proxy" &&
//                   auctionInfo &&
//                   !auctionInfo.isActive &&
//                   !canClaim
//                     ? "10px"
//                     : "0",
//                 display: getActionButtonText() ? "block" : "none",
//               }}
//             >
//               {getActionButtonText()}
//             </Button>
//           </div>
//         )}

//         {/* Шаг 4: Marketplace (аукцион завершён, пользователь не выиграл) */}
//         {hasChecked &&
//           auctionInfo &&
//           !auctionInfo.isActive &&
//           !canClaim &&
//           activeTab === "proxy" && (
//             <div style={{ position: "relative", width: "280px" }}>
//               <div
//                 style={{
//                   position: "absolute",
//                   left: "-30px",
//                   top: "50%",
//                   transform: "translateY(-50%)",
//                   fontSize: "18px",
//                   fontWeight: "bold",
//                   color: isDark ? "white" : "black",
//                 }}
//               >
//                 4
//               </div>
//               <a
//                 href={marketplaceUrl}
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 style={{
//                   display: "block",
//                   width: "280px",
//                   borderRadius: "25px",
//                   padding: "11.75px 15px",
//                   backgroundColor: "#6366f1",
//                   color: "white",
//                   textDecoration: "none",
//                   textAlign: "center",
//                   fontWeight: "bold",
//                   cursor: "pointer",
//                   border: "none",
//                 }}
//               >
//                 🛍️ {t("viewOnMarketplace")}
//               </a>
//             </div>
//           )}

//         {/* Шаг 4: Кнопка «Создать сайт» (после покупки/claim) */}
//         {(sbtPurchaseCompleted ||
//           (auctionInfo && !auctionInfo.isActive && canClaim)) && (
//           <div style={{ position: "relative", width: "280px" }}>
//             <div
//               style={{
//                 position: "absolute",
//                 left: "-30px",
//                 top: "50%",
//                 transform: "translateY(-50%)",
//                 fontSize: "18px",
//                 fontWeight: "bold",
//                 color: isDark ? "white" : "black",
//               }}
//             >
//               4
//             </div>
//             <a
//               href="https://t.me/Ton_site_builder_bot?startapp"
//               target="_blank"
//               rel="noopener noreferrer"
//               style={{
//                 display: "block",
//                 width: "280px",
//                 borderRadius: "25px",
//                 padding: "11.75px 15px",
//                 background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
//                 color: "white",
//                 textDecoration: "none",
//                 textAlign: "center",
//                 fontWeight: "bold",
//                 cursor: "pointer",
//                 border: "none",
//                 fontSize: "14px",
//               }}
//             >
//               🏗️ Создать сайт на {subDomainName}.{selectedDomainZone}
//             </a>
//           </div>
//         )}
//       </List>
//     </Page>
//   );
// };

// src/pages/AuctionPage/index.tsx
// ============================================================
// ТОЧЕЧНЫЕ ПРАВКИ (поверх актуальной версии из файла):
// 1. dedupe зон по имени с приоритетом proxy > sbt (как в ProfileWidget)
//    + если одинаковый тип — latest по createdAt
// 2. collectionAddress всегда из SimpleCollection.address
// 3. item_count из SimpleCollection.item_count
// 4. convertUserFriendlyToRaw для фильтрации
// ВСЁ ОСТАЛЬНОЕ — БЕЗ ИЗМЕНЕНИЙ
// ============================================================

// src/pages/AuctionPage/index.tsx
// ИТОГОВАЯ ВЕРСИЯ: все правки применены.
// 1) getUserZones из ProfileWidget (convertUserFriendlyToRaw, БЕЗ dedupe)
// 2) collectionAddress из SimpleCollection.address
// 3) item_count из SimpleCollection.item_count
// 4) Логи тела транзакции при отправке
// 5) useRef для apiService.setNetwork (устранение петли)
// 6) ВСЕ обработчики и UI сохранены без сокращений

// import React, {
//   useState,
//   useCallback,
//   useMemo,
//   useEffect,
//   useRef,
// } from "react";
// import {
//   Banner,
//   Button,
//   Card,
//   Input,
//   List,
//   IconButton,
// } from "@telegram-apps/telegram-ui";
// import { useTonWallet, useTonAddress } from "@tonconnect/ui-react";
// import { useTonConnectUI } from "@tonconnect/ui-react";
// import TonWeb from "tonweb";
// import { Address } from "ton-core";
// import Box from "@mui/material/Box";
// import Tabs from "@mui/material/Tabs";
// import Tab from "@mui/material/Tab";

// import { useTypedDispatch } from "../../hooks/useTypeDispatch";
// import { Page } from "@/components/Page";
// import { ShowSnackbar } from "@/components/ShowSnackbar";
// import { claimSubdomain } from "@/store/nft/actions";
// import FlipTimer from "./flipTimer/FlipTimer";
// import { getAuctionInfo, ParsedAuctionInfo } from "./flipTimer/getAuctionInfo";
// import { useLanguage } from "@/contexts/LanguageContext";
// import { useTheme } from "@/contexts/ThemeContext";
// import { useUser } from "@/contexts/UserContext";
// import { apiService, Subdomain, Zone } from "@/services/api";

// import { checkSBTSubdomain, SBTSubdomainInfo } from "./checkSBTSubdomain";
// import { calculateProxyNFTAddress } from "./CalculateProxyNFTAddress";

// // ====== ONCHAIN ======
// import { useBlockchainItems } from "@/services/blockchainItems/blockchain-items-context.tsx";
// import { SimpleCollection } from "@/services/blockchainItems/blockchain-items-types";

// import ActiveAuctions from "@/components/ActiveAuctions/ActiveAuctions";
// import { useAuctionIntegration } from "@/hooks/useAuctionIntegration";

// import {
//   getAuctionParamsFromUrl,
//   updateAuctionUrl,
//   copyAuctionUrlToClipboard,
//   shareAuction,
//   isAuctionPage,
//   clearAuctionUrl,
// } from "@/utils/urlParams";

// import { useLaunchParams } from "@telegram-apps/sdk-react";
// import { MiniAppLinks } from "@/utils/miniAppLinks";
// import { AuctionCollectionSelector } from "./AuctionCollectionSelector";
// import { getUserSbtSubdomainsCount } from "@/utils/sbt-utils";
// import { convertUserFriendlyToRaw } from "@/utils/tonUtils";

// // ====== ТИПЫ ======

// type CollectionAddressMap = {
//   [key: string]: string;
// };

// type ActiveTab = "proxy" | "sbt";

// const mapPrices: Record<number, number> = {
//   1: 30,
//   2: 20,
//   3: 10,
//   4: 5,
//   5: 2.5,
//   6: 1,
// };

// const API_PAYLOAD_URL = import.meta.env.VITE_API_SC_PAYLOAD_URL;

// const normalizeAddress = (addr: string): string => {
//   if (!addr) return "";
//   try {
//     const address = Address.parse(addr);
//     return address.toString({ bounceable: true, testOnly: false });
//   } catch (error) {
//     console.error("Error parsing address:", addr, error);
//     return addr;
//   }
// };

// // ====== collectionToZone — ТОЧНАЯ КОПИЯ ИЗ ProfileWidget ======
// const collectionToZone = (col: SimpleCollection): Zone => {
//   const rawName = col.name || "";
//   const zoneName = rawName
//     .replace(" DNS Domains", "")
//     .replace(" Proxy Domains", "")
//     .toLowerCase();
//   return {
//     id: col.address.slice(0, 10),
//     name: zoneName.endsWith(".ton") ? zoneName : `${zoneName}.ton`,
//     address: col.address,
//     owner: col.creator_address || col.owner_address,
//     collectionAddress: col.address,
//     createdAt: col.created_at || col.lastUpdated || new Date().toISOString(),
//     subdomainsAmount: col.item_count || 0,
//     proxy: col.type === "proxy" ? 1 : 0,
//     status: "active",
//     image: col.metadata?.token_info?.[0]?.image || col.image,
//     description: col.metadata?.token_info?.[0]?.description || col.description,
//     zoneLength: zoneName.length,
//   } as any as Zone;
// };

// // ====================================================================
// // КОМПОНЕНТ
// // ====================================================================

// export const AuctionPage: React.FC<{}> = () => {
//   const dispatch = useTypedDispatch();
//   const wallet = useTonWallet();
//   const userAddress = useTonAddress();
//   const [tonConnectUI] = useTonConnectUI();
//   const { refreshSubdomains } = useUser();

//   const [sbtSubdomainInfo, setSbtSubdomainInfo] =
//     useState<SBTSubdomainInfo | null>(null);

//   const { currentTheme } = useTheme();
//   const isDark = currentTheme === "dark";
//   const { t } = useLanguage();

//   const [activeTab, setActiveTab] = useState<ActiveTab>("proxy");
//   const [selectedDomainZone, setSelectedDomainZone] = useState("");
//   const [subDomainName, setSubDomainName] = useState("");
//   const [collectionAddress, setCollectionAddress] = useState("");
//   const [snackbar, setSnackbar] = useState<JSX.Element | null>(null);
//   const [auctionInfo, setAuctionInfo] = useState<ParsedAuctionInfo | null>(
//     null
//   );
//   const [isLoading, setIsLoading] = useState(false);
//   const [nftAddress, setNftAddress] = useState("");
//   const [hasChecked, setHasChecked] = useState(false);
//   const [isClaimLoading, setIsClaimLoading] = useState(false);
//   const [customBidAmount, setCustomBidAmount] = useState("");
//   const [showCustomInput, setShowCustomInput] = useState(false);
//   const [manualBidValue, setManualBidValue] = useState("");
//   const [sbtPurchaseCompleted, setSbtPurchaseCompleted] = useState(false);
//   const [sbtLoading, setSbtLoading] = useState(false);
//   const [sbtZonesCount, setSbtZonesCount] = useState<Record<string, number>>(
//     {}
//   );
//   const prevSbtMapRef = useRef<{
//     cacheKey: string;
//     map: CollectionAddressMap;
//   } | null>(null);

//   const isTestnet = wallet?.account?.chain === "-3";
//   const launchParams = useLaunchParams();
//   const [, setOpenedViaDeeplink] = useState(false);

//   // ====== ONCHAIN ДАННЫЕ ======
//   const {
//     proxyCollections,
//     sbtCollections,
//     loadAllData,
//     isLoading: zonesLoading,
//     error: zonesError,
//   } = useBlockchainItems();

//   // ====== getUserZones — ТОЧНАЯ КОПИЯ ProfileWidget (БЕЗ dedupe) ======
//   const getUserZones = useMemo((): Zone[] => {
//     if (!userAddress) return [];

//     const normalizedAddress =
//       convertUserFriendlyToRaw(userAddress).toLowerCase();

//     const proxyZones = proxyCollections
//       .filter((col) => {
//         const creator = (
//           col.creator_address ||
//           col.owner_address ||
//           ""
//         ).toLowerCase();
//         return creator === normalizedAddress;
//       })
//       .map((col) => collectionToZone(col));

//     const sbtZones = sbtCollections
//       .filter((col) => {
//         const creator = (
//           col.creator_address ||
//           col.owner_address ||
//           ""
//         ).toLowerCase();
//         return creator === normalizedAddress;
//       })
//       .map((col) => collectionToZone(col));

//     return [...proxyZones, ...sbtZones];
//   }, [userAddress, proxyCollections, sbtCollections]);

//   // Разделяем с учётом возможных дубликатов (если proxy и sbt имеют одно имя — будут оба,
//   // как в ProfileWidget — dedupe НЕ делаем)
//   const proxyZones: Zone[] = useMemo(
//     () => getUserZones.filter((z) => z.proxy === 1),
//     [getUserZones]
//   );
//   const sbtZones: Zone[] = useMemo(
//     () => getUserZones.filter((z) => z.proxy === 0),
//     [getUserZones]
//   );
//   const allZones: Zone[] = getUserZones;

//   const activeSbtZones: Zone[] = useMemo(
//     () => sbtZones.filter((zone) => zone.status !== "inactive"),
//     [sbtZones]
//   );

//   // ====== УСТРАНЕНИЕ ПЕТЛИ: apiService.setNetwork только при реальной смене сети ======
//   const prevNetworkRef = useRef<boolean | null>(null);
//   useEffect(() => {
//     if (wallet && prevNetworkRef.current !== isTestnet) {
//       prevNetworkRef.current = isTestnet;
//       apiService.setNetwork(isTestnet);
//     }
//   }, [wallet, isTestnet]);

//   const isProxyZone = useCallback((zone: any): boolean => {
//     const proxyValue = zone.proxy;
//     if (typeof proxyValue === "number") return proxyValue === 1;
//     if (typeof proxyValue === "string") {
//       return proxyValue.toLowerCase() === "proxy" || proxyValue === "1";
//     }
//     return false;
//   }, []);

//   const proxyCollectionAddressesMap = useMemo(() => {
//     const map: CollectionAddressMap = {};
//     allZones.forEach((zone) => {
//       if (isProxyZone(zone) && zone.name && zone.collectionAddress) {
//         map[zone.name] = zone.collectionAddress;
//       }
//     });
//     return map;
//   }, [allZones, isProxyZone]);

//   const sbtCollectionAddressesMap = useMemo(() => {
//     const cacheKey = activeSbtZones
//       .map((z) => `${z.name}|${z.collectionAddress}`)
//       .sort()
//       .join(";");
//     if (prevSbtMapRef.current && prevSbtMapRef.current.cacheKey === cacheKey)
//       return prevSbtMapRef.current.map;
//     const newMap: CollectionAddressMap = {};
//     activeSbtZones.forEach((zone) => {
//       if (zone.name && zone.collectionAddress)
//         newMap[zone.name] = zone.collectionAddress;
//     });
//     prevSbtMapRef.current = { cacheKey, map: newMap };
//     return newMap;
//   }, [activeSbtZones]);

//   const currentCollectionMap = useMemo(() => {
//     return activeTab === "proxy"
//       ? proxyCollectionAddressesMap
//       : sbtCollectionAddressesMap;
//   }, [activeTab, proxyCollectionAddressesMap, sbtCollectionAddressesMap]);

//   useEffect(() => {
//     if (selectedDomainZone && !collectionAddress && allZones.length > 0) {
//       const zone = allZones.find((z) => z.name === selectedDomainZone);
//       if (zone?.collectionAddress) {
//         setCollectionAddress(zone.collectionAddress);
//       } else {
//         const addr = currentCollectionMap[selectedDomainZone];
//         if (addr) setCollectionAddress(addr);
//       }
//     }
//   }, [selectedDomainZone, collectionAddress, allZones, currentCollectionMap]);

//   const domainZoneName = useMemo(() => {
//     if (!selectedDomainZone) return "";
//     return selectedDomainZone.split(".")[0];
//   }, [selectedDomainZone]);

//   const calculateDomainPrice = useMemo(() => {
//     if (activeTab === "sbt") return 500_000_000;
//     const len = subDomainName.length;
//     return Math.floor((mapPrices[len] || 0.5) * 1_000_000_000);
//   }, [subDomainName, activeTab]);

//   const calculateBidPrice = useMemo(() => {
//     if (activeTab === "sbt" || !auctionInfo) return 0;
//     if (customBidAmount && !isNaN(Number(customBidAmount)))
//       return Math.floor(Number(customBidAmount) * 1_000_000_000);
//     const maxBid = Number(auctionInfo.maxBid);
//     return maxBid + Math.ceil(maxBid * 0.05);
//   }, [auctionInfo, customBidAmount, activeTab]);

//   const canClaim = useMemo(() => {
//     if (activeTab === "sbt" || !auctionInfo || !userAddress) return false;
//     try {
//       if (auctionInfo.maxBidderOwner === null) return false;
//       return (
//         !auctionInfo.isActive &&
//         normalizeAddress(auctionInfo.maxBidderOwner) ===
//           normalizeAddress(userAddress)
//       );
//     } catch {
//       return false;
//     }
//   }, [auctionInfo, userAddress, activeTab]);

//   const marketplaceUrl = useMemo(() => {
//     if (activeTab === "sbt" || !nftAddress || !collectionAddress) return "";
//     const base = isTestnet
//       ? "https://testnet.getgems.io"
//       : "https://getgems.io";
//     return `${base}/collection/${collectionAddress}/${nftAddress}`;
//   }, [nftAddress, collectionAddress, isTestnet, activeTab]);

//   const showSnackbar = useCallback(
//     (message: string, type: "success" | "error" = "success") => {
//       setSnackbar(
//         <ShowSnackbar
//           message={message}
//           type={type}
//           onClose={() => setSnackbar(null)}
//         />
//       );
//     },
//     []
//   );

//   const updateUrlWithCurrentAuction = useCallback(() => {
//     if (selectedDomainZone && subDomainName && activeTab === "proxy") {
//       updateAuctionUrl({ zone: selectedDomainZone, subdomain: subDomainName });
//     }
//   }, [selectedDomainZone, subDomainName, activeTab]);

//   const handleCopyAuctionLink = useCallback(async () => {
//     if (!selectedDomainZone || !subDomainName) {
//       showSnackbar(t("selectZoneAndSubdomainFirst"), "error");
//       return;
//     }
//     const success = await copyAuctionUrlToClipboard({
//       zone: selectedDomainZone,
//       subdomain: subDomainName,
//     });
//     if (success) showSnackbar(t("auctionLinkCopied"), "success");
//     else showSnackbar(t("failedToCopyLink"), "error");
//   }, [selectedDomainZone, subDomainName, showSnackbar, t]);

//   const handleShareAuction = useCallback(async () => {
//     if (!selectedDomainZone || !subDomainName) {
//       showSnackbar(t("selectZoneAndSubdomainFirst"), "error");
//       return;
//     }
//     const success = await shareAuction({
//       zone: selectedDomainZone,
//       subdomain: subDomainName,
//     });
//     if (!success) await handleCopyAuctionLink();
//   }, [
//     selectedDomainZone,
//     subDomainName,
//     showSnackbar,
//     handleCopyAuctionLink,
//     t,
//   ]);

//   useEffect(() => {
//     const sp = launchParams.startParam;
//     if (sp) setOpenedViaDeeplink(true);
//   }, [launchParams.startParam]);

//   useEffect(() => {
//     const hasUrlParams = isAuctionPage();
//     const hasDeeplink = !!launchParams.startParam;
//     if ((hasUrlParams || hasDeeplink) && allZones.length === 0) return;
//     if (hasDeeplink) {
//       const sp = launchParams.startParam!;
//       try {
//         const { route, params } = MiniAppLinks.parseStartapp(sp);
//         if (route === "/add-subdomain" && params.zone && params.subdomain) {
//           loadAuctionFromParams(params.zone, params.subdomain);
//         }
//       } catch (e) {
//         console.error("deeplink parse error:", e);
//       }
//     } else if (hasUrlParams) {
//       const p = getAuctionParamsFromUrl();
//       if (p.zone && p.subdomain) loadAuctionFromParams(p.zone, p.subdomain);
//     }
//     // eslint-disable-next-line
//   }, [allZones, launchParams.startParam]);

//   // ====== ПРОВЕРКА ИТЕМА ======
//   const handleCheckItem = useCallback(async () => {
//     if (!selectedDomainZone || !subDomainName || !collectionAddress) {
//       showSnackbar(t("pleaseEnterDomainName"), "error");
//       return;
//     }
//     if (!/^[a-z0-9-]+$/.test(subDomainName)) {
//       showSnackbar(t("subdomainInvalidCharsError"), "error");
//       return;
//     }
//     setIsLoading(true);
//     setHasChecked(false);
//     const lowerValue = subDomainName.toLowerCase();
//     if (activeTab === "sbt") {
//       const sbtInfo = await checkSBTSubdomain(
//         lowerValue,
//         collectionAddress,
//         isTestnet
//       );
//       if (sbtInfo) {
//         setSbtSubdomainInfo(sbtInfo);
//         setAuctionInfo(null);
//         setNftAddress(sbtInfo.nftAddress || "");
//         showSnackbar(
//           sbtInfo.isTaken
//             ? t("sbtSubdomainAlreadyTaken")
//             : t("sbtSubdomainAvailable"),
//           sbtInfo.isTaken ? "error" : "success"
//         );
//       } else {
//         setSbtSubdomainInfo(null);
//         setAuctionInfo(null);
//         setNftAddress("");
//         showSnackbar(t("checkingAvailability"), "error");
//       }
//     } else {
//       const info = await getAuctionInfo(
//         lowerValue,
//         collectionAddress,
//         isTestnet
//       );
//       if (info) {
//         setAuctionInfo(info);
//         setSbtSubdomainInfo(null);
//         setNftAddress(info.nftAddress || "");
//         showSnackbar(t("auctionInfoLoaded"), "success");
//         if (activeTab === "proxy") updateUrlWithCurrentAuction();
//       } else {
//         setAuctionInfo(null);
//         setSbtSubdomainInfo(null);
//         const proxyNFTAddress = await calculateProxyNFTAddress(
//           lowerValue,
//           collectionAddress,
//           isTestnet
//         );
//         if (proxyNFTAddress) {
//           setNftAddress(proxyNFTAddress);
//           showSnackbar(t("subdomainAvailableForFirstBid"), "success");
//         } else {
//           setNftAddress("");
//           showSnackbar(t("failedToCalculateNFTAddress"), "error");
//         }
//         if (activeTab === "proxy") updateUrlWithCurrentAuction();
//       }
//     }
//     setHasChecked(true);
//     setIsLoading(false);
//   }, [
//     selectedDomainZone,
//     subDomainName,
//     collectionAddress,
//     isTestnet,
//     t,
//     activeTab,
//     updateUrlWithCurrentAuction,
//     showSnackbar,
//   ]);

//   const loadUserSbtSubdomainsCount = useCallback(async () => {
//     if (!userAddress || activeTab !== "sbt") return;
//     try {
//       const counts = await getUserSbtSubdomainsCount(userAddress, isTestnet);
//       setSbtZonesCount(counts);
//     } catch {
//       setSbtZonesCount({});
//     }
//   }, [userAddress, isTestnet, activeTab]);

//   useEffect(() => {
//     if (activeTab === "sbt" && userAddress) loadUserSbtSubdomainsCount();
//     else setSbtZonesCount({});
//   }, [activeTab, userAddress, loadUserSbtSubdomainsCount]);

//   const loadAuctionFromParams = useCallback(
//     (zoneName: string, subdomainName: string) => {
//       setOpenedViaDeeplink(true);
//       setActiveTab("proxy");
//       setSelectedDomainZone(zoneName);
//       setSubDomainName(subdomainName);
//       const zone = allZones.find((z) => z.name === zoneName);
//       if (zone?.collectionAddress) setCollectionAddress(zone.collectionAddress);
//       updateUrlWithCurrentAuction();
//       setTimeout(() => handleCheckItem(), 500);
//     },
//     [allZones, handleCheckItem, updateUrlWithCurrentAuction]
//   );

//   const handleTabChange = (
//     _event: React.SyntheticEvent,
//     newValue: ActiveTab
//   ) => {
//     setActiveTab(newValue);
//     setSelectedDomainZone("");
//     setSubDomainName("");
//     setCollectionAddress("");
//     setAuctionInfo(null);
//     setNftAddress("");
//     setHasChecked(false);
//     setCustomBidAmount("");
//     setShowCustomInput(false);
//     setManualBidValue("");
//     setSbtPurchaseCompleted(false);
//     setOpenedViaDeeplink(false);
//     if (newValue === "sbt") clearAuctionUrl();
//   };

//   const checkItemByName = useCallback(
//     async (zoneName: string, subdomain: string) => {
//       setAuctionInfo(null);
//       setNftAddress("");
//       setHasChecked(false);
//       setCustomBidAmount("");
//       setShowCustomInput(false);
//       setManualBidValue("");
//       setSbtPurchaseCompleted(false);
//       setSelectedDomainZone(zoneName);
//       setSubDomainName(subdomain);
//       const zone = allZones.find((z) => z.name === zoneName);
//       setCollectionAddress(zone?.collectionAddress || "");
//       await new Promise((r) => setTimeout(r, 100));
//       await handleCheckItem();
//     },
//     [allZones, handleCheckItem]
//   );

//   const { handleAuctionClick, setSelectedZoneName, setSubdomainName } =
//     useAuctionIntegration({ zones: allZones, checkItem: checkItemByName });

//   const handleAuctionClickFromComponent = useCallback(
//     (zoneName: string, subdomainName: string) => {
//       handleAuctionClick(zoneName, subdomainName);
//       if (activeTab === "proxy") updateUrlWithCurrentAuction();
//     },
//     [handleAuctionClick, activeTab, updateUrlWithCurrentAuction]
//   );

//   const setupCollectionAddressForZone = useCallback(
//     (zoneName: string) => {
//       if (!zoneName) return false;
//       const zone = allZones.find((z) => z.name === zoneName);
//       if (zone?.collectionAddress) {
//         setCollectionAddress(zone.collectionAddress);
//         return true;
//       }
//       const a = currentCollectionMap[zoneName];
//       if (a) {
//         setCollectionAddress(a);
//         return true;
//       }
//       return false;
//     },
//     [allZones, currentCollectionMap]
//   );

//   const handleDomainZoneChangeForSelector = useCallback(
//     (value: string) => {
//       setSelectedDomainZone(value);
//       setOpenedViaDeeplink(false);
//       setSelectedZoneName(value);
//       setAuctionInfo(null);
//       setNftAddress("");
//       setHasChecked(false);
//       setCustomBidAmount("");
//       setShowCustomInput(false);
//       setManualBidValue("");
//       setSbtPurchaseCompleted(false);
//       setupCollectionAddressForZone(value);
//       if (value && subDomainName && activeTab === "proxy")
//         updateUrlWithCurrentAuction();
//     },
//     [
//       setSelectedZoneName,
//       setupCollectionAddressForZone,
//       subDomainName,
//       activeTab,
//       updateUrlWithCurrentAuction,
//     ]
//   );

//   const handleSubDomainNameChange = useCallback(
//     (value: string) => {
//       setSubDomainName(value.toLowerCase());
//       setSubdomainName(value.toLowerCase());
//       setAuctionInfo(null);
//       setNftAddress("");
//       setHasChecked(false);
//       setCustomBidAmount("");
//       setShowCustomInput(false);
//       setManualBidValue("");
//       setSbtPurchaseCompleted(false);
//       if (selectedDomainZone && value && activeTab === "proxy")
//         updateUrlWithCurrentAuction();
//     },
//     [
//       setSubdomainName,
//       selectedDomainZone,
//       activeTab,
//       updateUrlWithCurrentAuction,
//     ]
//   );

//   const handleBidSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     const v = e.target.value;
//     if (v === "custom") {
//       setShowCustomInput(true);
//       setCustomBidAmount("");
//       setManualBidValue("");
//     } else {
//       setShowCustomInput(false);
//       setCustomBidAmount(v);
//       setManualBidValue("");
//     }
//   };

//   const handleManualBidChange = (value: string) => {
//     setManualBidValue(value);
//     setCustomBidAmount(value && !isNaN(Number(value)) ? value : "");
//   };

//   // ====== ПОДГОТОВКА ПЛАТЕЖА (логирование тела транзакции) ======
//   const logTransactionBody = (label: string, messages: any[]) => {
//     console.log(
//       `📦 [${label}] Тело транзакции:`,
//       JSON.stringify(
//         {
//           validUntil: Math.floor(Date.now() / 1000) + 360,
//           messages: messages.map((m) => ({
//             amount: m.amount,
//             address: m.address,
//             payload: m.payload || "(none)",
//           })),
//         },
//         null,
//         2
//       )
//     );
//   };

//   // ====== API (БД) ======
//   const createSubdomainIfNotExists = async (subdomainData: {
//     name: string;
//     address: string;
//     mintPrice: number;
//     links?: string[];
//     zoneId?: number;
//     owner?: string;
//     status: "active" | "inactive" | "auction" | "claimed";
//     auctionEndTime?: string;
//     collectionAddress?: string;
//   }): Promise<Subdomain> => {
//     try {
//       apiService.setNetwork(isTestnet);
//       try {
//         return await apiService.getSubdomainByName(subdomainData.name);
//       } catch {
//         return await apiService.createSubdomain({ ...subdomainData });
//       }
//     } catch (error) {
//       console.error("createSubdomainIfNotExists:", error);
//       throw error;
//     }
//   };

//   // ====== СТАРТ АУКЦИОНА ======
//   const handleStartAuction = async () => {
//     if (!selectedDomainZone || !subDomainName || !collectionAddress) {
//       showSnackbar(t("pleaseEnterDomainName"), "error");
//       return;
//     }
//     if (!userAddress) {
//       showSnackbar(t("walletNotConnected"), "error");
//       return;
//     }
//     try {
//       const tonWeb = new TonWeb();
//       const cell = new tonWeb.boc.Cell();
//       cell.bits.writeUint(0, 32);
//       cell.bits.writeString(`${subDomainName}`);
//       const payload = TonWeb.utils.bytesToBase64(await cell.toBoc());

//       const messages = [
//         {
//           amount: calculateDomainPrice.toString(),
//           address: collectionAddress,
//           payload,
//         },
//       ];
//       logTransactionBody("START_AUCTION", messages);

//       await tonConnectUI.sendTransaction({
//         validUntil: Math.floor(Date.now() / 1000) + 360,
//         messages,
//       });

//       const full = `${subDomainName}.${selectedDomainZone}`;
//       const auctionEndTime = new Date(
//         Date.now() + 24 * 60 * 60 * 1000
//       ).toISOString();
//       try {
//         apiService.setNetwork(isTestnet);
//         const zone = allZones.find((z) => z.name === selectedDomainZone);
//         await apiService.createSubdomain({
//           name: full,
//           address: nftAddress,
//           mintPrice: calculateDomainPrice / 1_000_000_000,
//           owner: userAddress,
//           status: "auction",
//           auctionEndTime,
//           zoneId: zone?.id,
//           collectionAddress: zone?.collectionAddress,
//         });
//         loadAllData(true);
//         showSnackbar(t("startAuction"), "success");
//       } catch (dbError: any) {
//         console.error("DB error:", dbError);
//         showSnackbar(t("auctionStartedBlockchainDbError"), "error");
//       }
//       setTimeout(() => handleCheckItem(), 2000);
//     } catch (error: any) {
//       if (error?.message?.includes("cancelled"))
//         showSnackbar(t("auctionStartCancelled"), "error");
//       else if (error?.message?.includes("rejected"))
//         showSnackbar(t("auctionStartRejected"), "error");
//       else if (error?.message?.includes("insufficient"))
//         showSnackbar(t("insufficientFundsForAuctionStart"), "error");
//       else showSnackbar(t("auctionStartError"), "error");
//     }
//   };

//   // ====== СТАВКА ======
//   const handlePlaceBid = async () => {
//     if (
//       !auctionInfo ||
//       !selectedDomainZone ||
//       !subDomainName ||
//       !collectionAddress
//     ) {
//       showSnackbar(t("auctionDataNotLoaded"), "error");
//       return;
//     }
//     if (!userAddress) {
//       showSnackbar(t("walletNotConnected"), "error");
//       return;
//     }
//     try {
//       const messages = [
//         { amount: calculateBidPrice.toString(), address: nftAddress },
//       ];
//       logTransactionBody("PLACE_BID", messages);

//       await tonConnectUI.sendTransaction({
//         validUntil: Math.floor(Date.now() / 1000) + 360,
//         messages,
//       });

//       const full = `${subDomainName}.${selectedDomainZone}`;
//       try {
//         apiService.setNetwork(isTestnet);
//         const zone = allZones.find((z) => z.name === selectedDomainZone);
//         const subdomain = await createSubdomainIfNotExists({
//           name: full,
//           address: nftAddress,
//           mintPrice: calculateBidPrice / 1_000_000_000,
//           owner: userAddress,
//           status: "auction",
//           auctionEndTime: new Date(
//             Date.now() + 24 * 60 * 60 * 1000
//           ).toISOString(),
//           zoneId: zone?.id,
//           collectionAddress: zone?.collectionAddress,
//         });
//         await apiService.addBidToSubdomain(subdomain.id, {
//           bidder: userAddress,
//           amount: calculateBidPrice,
//         });
//         await apiService.updateSubdomainStatus(subdomain.id, "auction");
//         refreshSubdomains();
//         loadAllData(true);
//       } catch (dbError: any) {
//         console.error("DB error:", dbError);
//         showSnackbar(t("bidPlacedBlockchainDbError"), "error");
//       }
//       showSnackbar(t("bid"), "success");
//       setCustomBidAmount("");
//       setShowCustomInput(false);
//       setManualBidValue("");
//       setTimeout(() => handleCheckItem(), 2000);
//     } catch (error: any) {
//       if (error?.message?.includes("cancelled"))
//         showSnackbar(t("bidCancelled"), "error");
//       else if (error?.message?.includes("rejected"))
//         showSnackbar(t("bidRejected"), "error");
//       else if (error?.message?.includes("insufficient"))
//         showSnackbar(t("insufficientFundsForBid"), "error");
//       else showSnackbar(t("bidError"), "error");
//     }
//   };

//   // ====== ПОКУПКА SBT ======
//   const handlePurchaseSBTSubdomain = async () => {
//     if (!selectedDomainZone || !subDomainName || !collectionAddress) {
//       showSnackbar(t("pleaseEnterDomainName"), "error");
//       return;
//     }
//     if (!wallet) {
//       showSnackbar(t("walletNotConnected"), "error");
//       return;
//     }
//     if (sbtSubdomainInfo?.isTaken) {
//       showSnackbar(t("sbtSubdomainAlreadyTaken"), "error");
//       return;
//     }
//     setSbtLoading(true);
//     try {
//       const tonWeb = new TonWeb();
//       const cell = new tonWeb.boc.Cell();
//       cell.bits.writeUint(0, 32);
//       cell.bits.writeString(`${subDomainName}`);
//       const payload = TonWeb.utils.bytesToBase64(await cell.toBoc());

//       const messages = [
//         {
//           amount: calculateDomainPrice.toString(),
//           address: collectionAddress,
//           payload,
//         },
//       ];
//       logTransactionBody("PURCHASE_SBT", messages);

//       await tonConnectUI.sendTransaction({
//         validUntil: Math.floor(Date.now() / 1000) + 360,
//         messages,
//       });

//       const full = `${subDomainName}.${selectedDomainZone}`;
//       if (!userAddress) throw new Error("No user address");
//       const nftAddr = sbtSubdomainInfo?.nftAddress || userAddress;
//       apiService.setNetwork(isTestnet);
//       const zone = allZones.find((z) => z.name === selectedDomainZone);
//       await apiService.createSubdomain({
//         name: full,
//         address: nftAddr,
//         mintPrice: calculateDomainPrice / 1_000_000_000,
//         owner: userAddress,
//         status: "active",
//         collectionAddress,
//         zoneId: zone?.id,
//       });
//       showSnackbar(t("sbtSubdomainPurchased"), "success");
//       setSbtPurchaseCompleted(true);
//     } catch (error: any) {
//       if (error?.message?.includes("cancelled"))
//         showSnackbar(t("sbtPurchaseCancelled"), "error");
//       else showSnackbar(t("sbtPurchaseError"), "error");
//     } finally {
//       setSbtLoading(false);
//     }
//   };

//   // ====== CLAIM ======
//   const handleClaimSubdomain = async () => {
//     if (!nftAddress) {
//       showSnackbar(t("nftAddressNotFound"), "error");
//       return;
//     }
//     if (!userAddress) {
//       showSnackbar(t("walletNotConnected"), "error");
//       return;
//     }
//     setIsClaimLoading(true);
//     try {
//       const result = await dispatch(
//         claimSubdomain({
//           subdomain_item_address: nftAddress,
//           query_id: 0,
//           isTestnet,
//         })
//       ).unwrap();
//       await tonConnectUI.sendTransaction({
//         validUntil: result.validUntil,
//         messages: result.messages,
//       });
//       const full = `${subDomainName}.${selectedDomainZone}`;
//       try {
//         apiService.setNetwork(isTestnet);
//         const s = await apiService.getSubdomainByName(full);
//         if (s) await apiService.updateSubdomainStatus(s.id, "claimed");
//       } catch (e) {
//         console.error("DB claim error:", e);
//       }
//       showSnackbar(t("subdomainClaimedSuccess"), "success");
//     } catch (error) {
//       showSnackbar(
//         error instanceof Error ? error.message : t("subdomainClaimError"),
//         "error"
//       );
//     } finally {
//       setIsClaimLoading(false);
//     }
//   };

//   // ====== UI HELPERS ======
//   const getImageUrl = () => {
//     if (!domainZoneName || !subDomainName) return "";
//     if (activeTab === "proxy")
//       return `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${domainZoneName}/${subDomainName}.png`;
//     return `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${domainZoneName}/${subDomainName}.png`;
//   };

//   const getActionButtonText = (): string => {
//     if (activeTab === "sbt") {
//       if (sbtPurchaseCompleted) return `✅ ${t("purchased")}`;
//       if (sbtSubdomainInfo?.isTaken)
//         return `❌ ${t("sbtSubdomainAlreadyTaken")}`;
//       return `${t("mintSubdomain")} (${t("buyFor1TON")})`;
//     }
//     if (!auctionInfo)
//       return `${t("startAuction")} (${t("price")}: ${
//         calculateDomainPrice / 1_000_000_000
//       } TON)`;
//     if (auctionInfo.isActive)
//       return `${t("bid")} (${
//         customBidAmount || (calculateBidPrice / 1_000_000_000).toFixed(2)
//       } TON)`;
//     if (canClaim)
//       return isClaimLoading ? t("claiming") : `🎁 ${t("claimSubdomain")}`;
//     return "";
//   };

//   const getActionButtonHandler = (): (() => void) | undefined => {
//     if (activeTab === "sbt") {
//       if (sbtPurchaseCompleted || sbtSubdomainInfo?.isTaken) return undefined;
//       return handlePurchaseSBTSubdomain;
//     }
//     if (!auctionInfo) return handleStartAuction;
//     if (auctionInfo.isActive) return handlePlaceBid;
//     if (canClaim) return handleClaimSubdomain;
//     return undefined;
//   };

//   const getActionButtonDisabled = (): boolean => {
//     if (activeTab === "sbt")
//       return (
//         sbtPurchaseCompleted ||
//         sbtLoading ||
//         !selectedDomainZone ||
//         !subDomainName ||
//         !!sbtSubdomainInfo?.isTaken
//       );
//     if (!auctionInfo) return !selectedDomainZone || !subDomainName;
//     if (auctionInfo.isActive) return false;
//     if (canClaim) return isClaimLoading;
//     return true;
//   };

//   const themeColors = {
//     light: { primary: "linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)" },
//     dark: { primary: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)" },
//   };
//   const colors = themeColors[isDark ? "dark" : "light"];

//   const getActionButtonColor = () => {
//     if (activeTab === "sbt") {
//       if (sbtPurchaseCompleted) return "#4ade80";
//       if (sbtSubdomainInfo?.isTaken) return "#888";
//       return sbtLoading ? "#888" : "#4a90e2";
//     }
//     if (!auctionInfo) return "#4ade80";
//     if (auctionInfo.isActive) return "rgb(74, 144, 226)";
//     if (canClaim) return isClaimLoading ? "#888" : "#4ade80";
//     return "transparent";
//   };

//   useEffect(() => {
//     if (userAddress) refreshSubdomains();
//   }, [userAddress, refreshSubdomains]);

//   // ====================================================================
//   // RENDER
//   // ====================================================================
//   return (
//     <Page back={true}>
//       {snackbar}
//       <Box sx={{ display: "flex", justifyContent: "center", mt: 2, mb: 3 }}>
//         <Tabs
//           value={activeTab}
//           onChange={handleTabChange}
//           sx={{
//             "& .MuiTab-root": {
//               color: isDark ? "#ccc" : "#666",
//               "&.Mui-selected": { color: isDark ? "#FFD700" : "#3B82F6" },
//             },
//           }}
//         >
//           <Tab label={t("proxyForSale")} value="proxy" />
//           <Tab label={t("sbtNotForSale")} value="sbt" />
//         </Tabs>
//       </Box>

//       {activeTab === "proxy" && (
//         <div
//           className="bannerWrapper"
//           style={{
//             display: "flex",
//             width: "100%",
//             justifyContent: "center",
//             alignItems: "center",
//           }}
//         >
//           <Banner
//             type="section"
//             header={t("proxyAuctionTitle")}
//             subheader={t("proxyAuctionDescription")}
//             style={{
//               textAlign: "center",
//               marginBottom: "20px",
//               padding: "15px",
//               maxWidth: "425px",
//               background: isDark
//                 ? "linear-gradient(to bottom, #1a1a1a, #2a2a2a)"
//                 : "linear-gradient(to bottom, #f5f5f5, #e5e5e5)",
//               color: isDark ? "#fff" : "#333",
//             }}
//           >
//             <div
//               style={{
//                 textAlign: "left",
//                 marginTop: "15px",
//                 fontSize: "14px",
//                 display: "flex",
//                 flexDirection: "column",
//                 alignItems: "center",
//                 maxWidth: "425px",
//               }}
//             >
//               <div
//                 style={{
//                   fontWeight: "bold",
//                   marginBottom: "10px",
//                   textAlign: "center",
//                 }}
//               >
//                 {t("proxyFeatures")}
//               </div>
//               <ul style={{ paddingLeft: "20px", margin: 0 }}>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature1")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature2")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature3")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature4")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature5")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature6")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature7")}</li>
//               </ul>
//             </div>
//           </Banner>
//         </div>
//       )}

//       {activeTab === "sbt" && (
//         <div
//           className="bannerWrapper"
//           style={{
//             display: "flex",
//             width: "100%",
//             justifyContent: "center",
//             alignItems: "center",
//           }}
//         >
//           <Banner
//             type="section"
//             header={t("sbtMintTitle")}
//             subheader={t("sbtMintDescription")}
//             style={{
//               textAlign: "center",
//               marginBottom: "20px",
//               padding: "15px",
//               maxWidth: "425px",
//               background: isDark
//                 ? "linear-gradient(to bottom, #1a1a1a, #2a2a2a)"
//                 : "linear-gradient(to bottom, #f5f5f5, #e5e5e5)",
//               color: isDark ? "#fff" : "#333",
//             }}
//           >
//             <div
//               style={{
//                 textAlign: "left",
//                 marginTop: "15px",
//                 fontSize: "14px",
//                 display: "flex",
//                 flexDirection: "column",
//                 alignItems: "center",
//                 maxWidth: "425px",
//               }}
//             >
//               <div
//                 style={{
//                   fontWeight: "bold",
//                   marginBottom: "10px",
//                   textAlign: "center",
//                 }}
//               >
//                 {t("sbtFeatures")}
//               </div>
//               <ul style={{ paddingLeft: "20px", margin: 0 }}>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature1")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature2")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature3")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature4")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature5")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature6")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature7")}</li>
//               </ul>
//             </div>
//           </Banner>
//         </div>
//       )}

//       {activeTab === "proxy" && (
//         <ActiveAuctions
//           isTestnet={isTestnet}
//           isDark={isDark}
//           onAuctionClick={handleAuctionClickFromComponent}
//         />
//       )}

//       <div
//         style={{
//           textAlign: "center",
//           marginBottom: "10px",
//           padding: "5px 10px",
//           borderRadius: "15px",
//           background: isTestnet ? "#f59e0b" : "#10b981",
//           color: "white",
//           fontSize: "12px",
//           fontWeight: "bold",
//           maxWidth: "280px",
//           margin: "0 auto",
//         }}
//       >
//         {isTestnet ? "🌐 Testnet Mode" : "🌐 Mainnet Mode"}
//       </div>

//       <List
//         style={{
//           display: "flex",
//           flexDirection: "column",
//           alignItems: "center",
//           gap: "15px",
//           paddingBottom: "150px",
//         }}
//       >
//         <div style={{ position: "relative", width: "280px" }}>
//           <div
//             style={{
//               position: "absolute",
//               left: "-30px",
//               top: "50%",
//               transform: "translateY(-50%)",
//               fontSize: "18px",
//               fontWeight: "bold",
//               color: isDark ? "white" : "black",
//             }}
//           >
//             1
//           </div>
//           <AuctionCollectionSelector
//             activeTab={activeTab}
//             selectedDomainZone={selectedDomainZone}
//             onDomainZoneChange={handleDomainZoneChangeForSelector}
//             zonesLoading={zonesLoading}
//             zonesError={zonesError}
//             userAddress={userAddress}
//             isDark={isDark}
//             t={t}
//             sbtCollectionAddressesMap={sbtCollectionAddressesMap}
//             activeSbtZones={activeSbtZones}
//             proxyZones={proxyZones}
//             isTestnet={isTestnet}
//             sbtZonesCount={sbtZonesCount}
//           />
//           {zonesError && (
//             <p style={{ color: "#f87171", fontSize: "12px", marginTop: "5px" }}>
//               {zonesError}
//             </p>
//           )}
//           {activeTab === "sbt" &&
//             sbtZones.length === 0 &&
//             !zonesLoading &&
//             !zonesError && (
//               <p
//                 style={{
//                   color: "#f59e0b",
//                   fontSize: "12px",
//                   marginTop: "5px",
//                   textAlign: "center",
//                 }}
//               >
//                 {t("noSbtZones")}
//               </p>
//             )}
//         </div>

//         {selectedDomainZone && (
//           <div
//             style={{
//               padding: "8px 12px",
//               borderRadius: "8px",
//               background: isDark ? "#2a2a2a" : "#f5f5f5",
//               border: `1px solid ${isDark ? "#444" : "#ddd"}`,
//               fontSize: "12px",
//               color: isDark ? "#ccc" : "#666",
//               maxWidth: "280px",
//               textAlign: "center",
//             }}
//           >
//             <p style={{ margin: 0 }}>
//               <strong>{t("zoneType")}</strong>{" "}
//               {activeTab === "proxy" ? t("proxyType") : t("sbtType")}
//             </p>
//             {collectionAddress ? (
//               <p
//                 style={{
//                   margin: "3px 0 0 0",
//                   color: "#4caf50",
//                   fontSize: "11px",
//                 }}
//               >
//                 {t("collectionConfigured")}
//               </p>
//             ) : (
//               <p
//                 style={{
//                   margin: "3px 0 0 0",
//                   color: "#f59e0b",
//                   fontSize: "11px",
//                 }}
//               >
//                 {t("collectionNotConfigured")}
//               </p>
//             )}
//             <p
//               style={{
//                 margin: "3px 0 0 0",
//                 fontSize: "11px",
//                 color: isTestnet ? "#f59e0b" : "#10b981",
//               }}
//             >
//               {t("network")} {isTestnet ? t("testnet") : t("mainnet")}
//             </p>
//           </div>
//         )}

//         <div style={{ position: "relative", width: "280px" }}>
//           <div
//             style={{
//               position: "absolute",
//               left: "-30px",
//               top: "50%",
//               transform: "translateY(-50%)",
//               fontSize: "18px",
//               fontWeight: "bold",
//               color: isDark ? "white" : "black",
//             }}
//           >
//             2
//           </div>
//           <Input
//             placeholder={t("enterSubdomainName")}
//             value={subDomainName}
//             onChange={(e) => {
//               const val = e.target.value
//                 .trim()
//                 .toLowerCase()
//                 .replace(/[^a-z0-9-]/g, "");
//               handleSubDomainNameChange(val);
//             }}
//             style={{
//               width: "280px",
//               borderRadius: "50%",
//               padding: "0px 15px",
//               position: "relative",
//             }}
//             before={
//               <div
//                 style={{
//                   position: "absolute",
//                   left: "15px",
//                   top: "50%",
//                   transform: "translateY(-50%)",
//                   opacity: 0.5,
//                 }}
//               >
//                 🔍
//               </div>
//             }
//           />
//         </div>

//         <div style={{ position: "relative", width: "280px" }}>
//           <div
//             style={{
//               position: "absolute",
//               left: "-30px",
//               top: "50%",
//               transform: "translateY(-50%)",
//               fontSize: "18px",
//               fontWeight: "bold",
//               color: isDark ? "white" : "black",
//             }}
//           >
//             2.5
//           </div>
//           <Button
//             onClick={handleCheckItem}
//             disabled={
//               !selectedDomainZone ||
//               !subDomainName ||
//               isLoading ||
//               !collectionAddress
//             }
//             style={{
//               width: "280px",
//               borderRadius: "25px",
//               padding: "10px 15px",
//               background: isLoading ? "#888" : colors.primary,
//               opacity: !collectionAddress ? 0.5 : 1,
//               cursor: !collectionAddress ? "not-allowed" : "pointer",
//               color: isDark ? "black" : "white",
//             }}
//           >
//             {isLoading ? t("checking") : t("checkingItem")}
//           </Button>
//           {!collectionAddress && (
//             <p
//               style={{
//                 color: "#f59e0b",
//                 fontSize: "12px",
//                 marginTop: "5px",
//                 textAlign: "center",
//               }}
//             >
//               {t("noCollectionAddress")}
//             </p>
//           )}
//         </div>

//         {/* AUCTION CARD */}
//         {hasChecked && auctionInfo && activeTab === "proxy" && (
//           <Card
//             style={{
//               background: "linear-gradient(to bottom, #1a1a1a, #2a2a2a)",
//               marginBottom: "20px",
//               padding: "15px",
//               borderRadius: "10px",
//               width: "280px",
//               border: `2px solid ${
//                 auctionInfo.isActive ? "#4ade80" : "#f87171"
//               }`,
//             }}
//           >
//             <div style={{ color: "#fff", fontSize: "14px" }}>
//               <div
//                 style={{
//                   marginBottom: "10px",
//                   textAlign: "center",
//                   color: auctionInfo.isActive ? "#4ade80" : "#f87171",
//                   fontWeight: "bold",
//                 }}
//               >
//                 {auctionInfo.isActive
//                   ? `✅  ${t("bidOnAuction")}`
//                   : `❌ ${t("subdomainAlreadyTaken")}`}
//               </div>
//               <div
//                 style={{
//                   width: "100%",
//                   display: "flex",
//                   justifyContent: "center",
//                   alignItems: "center",
//                 }}
//               >
//                 <img
//                   style={{
//                     width: "200px",
//                     height: "200px",
//                     borderRadius: "25px",
//                     marginBottom: "15px",
//                   }}
//                   src={getImageUrl()}
//                   alt="subdomainImage"
//                 />
//               </div>
//               <div style={{ marginBottom: "10px" }}>
//                 <strong>{t("maxBidder")}:</strong>
//                 <br />
//                 <code style={{ fontSize: "12px", wordBreak: "break-all" }}>
//                   <a
//                     style={{ color: "white" }}
//                     href={`https://tonviewer.com/${
//                       auctionInfo.maxBidderOwner || t("domainLeftAuction")
//                     }`}
//                   >
//                     {auctionInfo.maxBidderOwner || t("domainLeftAuction")}
//                   </a>
//                 </code>
//               </div>
//               <div style={{ marginBottom: "10px" }}>
//                 <strong>{t("maxBid")}: </strong>
//                 {Number(auctionInfo.maxBid) === 0
//                   ? t("hideAfterAuctionEnd")
//                   : (Number(auctionInfo.maxBid) / 1_000_000_000).toFixed(
//                       2
//                     )}{" "}
//                 TON
//               </div>
//               <div style={{ marginBottom: "10px" }}>
//                 <strong>{t("endTime")}:</strong>{" "}
//                 {new Date(auctionInfo.timestamp * 1000).toLocaleString()}
//               </div>
//               <div>
//                 <strong>{t("status")}:</strong>
//                 <span
//                   style={{
//                     marginLeft: "5px",
//                     color: auctionInfo.isActive ? "#4ade80" : "#f87171",
//                   }}
//                 >
//                   {auctionInfo.isActive
//                     ? `🟢 ${t("active")}`
//                     : `🔴 ${t("ended")}`}
//                 </span>
//               </div>
//               <div
//                 style={{
//                   marginTop: "10px",
//                   paddingTop: "10px",
//                   borderTop: "1px solid #444",
//                   display: "flex",
//                   justifyContent: "space-between",
//                   alignItems: "center",
//                 }}
//               >
//                 <div style={{ fontSize: "11px", color: "#aaa" }}>
//                   <strong>{t("networkLabel")}</strong>{" "}
//                   {isTestnet ? t("testnet") : t("mainnet")}
//                 </div>
//                 {activeTab === "proxy" && (
//                   <div style={{ display: "flex", gap: "8px" }}>
//                     <IconButton
//                       size="s"
//                       mode="outline"
//                       onClick={handleCopyAuctionLink}
//                       title={t("copyAuctionLink")}
//                       style={{
//                         backgroundColor: "#333",
//                         borderColor: "#555",
//                         color: "white",
//                         padding: "4px 8px",
//                         fontSize: "10px",
//                       }}
//                     >
//                       📋
//                     </IconButton>
//                     <IconButton
//                       size="s"
//                       mode="outline"
//                       onClick={handleShareAuction}
//                       title={t("shareAuction")}
//                       style={{
//                         backgroundColor: "#333",
//                         borderColor: "#555",
//                         color: "white",
//                         padding: "4px 8px",
//                         fontSize: "10px",
//                       }}
//                     >
//                       🔗
//                     </IconButton>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </Card>
//         )}

//         {/* SBT CARD */}
//         {hasChecked && sbtSubdomainInfo && activeTab === "sbt" && (
//           <Card
//             style={{
//               background: sbtSubdomainInfo.isTaken
//                 ? "linear-gradient(to bottom, #2a1a1a, #3a2a2a)"
//                 : "linear-gradient(to bottom, #1a2a1a, #2a3a2a)",
//               marginBottom: "20px",
//               padding: "15px",
//               borderRadius: "10px",
//               width: "280px",
//               border: sbtSubdomainInfo.isTaken
//                 ? "2px solid #f87171"
//                 : "2px solid #4a90e2",
//             }}
//           >
//             <div style={{ color: "#fff", fontSize: "14px" }}>
//               <div
//                 style={{
//                   marginBottom: "10px",
//                   textAlign: "center",
//                   color: sbtSubdomainInfo.isTaken ? "#f87171" : "#4a90e2",
//                   fontWeight: "bold",
//                 }}
//               >
//                 {sbtSubdomainInfo.isTaken
//                   ? `❌ ${t("sbtSubdomainAlreadyTaken")}`
//                   : `✅ ${t("sbtSubdomainAvailable")}`}
//               </div>
//               <div
//                 style={{
//                   width: "100%",
//                   display: "flex",
//                   justifyContent: "center",
//                   alignItems: "center",
//                 }}
//               >
//                 <img
//                   style={{
//                     width: "200px",
//                     height: "200px",
//                     borderRadius: "25px",
//                     marginBottom: "15px",
//                   }}
//                   src={getImageUrl()}
//                   alt="subdomainImage"
//                 />
//               </div>
//               {sbtSubdomainInfo.isTaken && sbtSubdomainInfo.ownerAddress && (
//                 <>
//                   <div style={{ marginBottom: "10px" }}>
//                     <strong>{t("sbtOwner")}:</strong>
//                     <br />
//                     <code style={{ fontSize: "12px", wordBreak: "break-all" }}>
//                       <a
//                         style={{ color: "white" }}
//                         href={`https://tonviewer.com/${sbtSubdomainInfo.ownerAddress}`}
//                         target="_blank"
//                         rel="noopener noreferrer"
//                       >
//                         {sbtSubdomainInfo.ownerAddress}
//                       </a>
//                     </code>
//                   </div>
//                   {sbtSubdomainInfo.nftAddress && (
//                     <div style={{ marginBottom: "10px" }}>
//                       <strong>NFT Address:</strong>
//                       <br />
//                       <code
//                         style={{ fontSize: "12px", wordBreak: "break-all" }}
//                       >
//                         <a
//                           style={{ color: "white" }}
//                           href={`https://tonviewer.com/${sbtSubdomainInfo.nftAddress}`}
//                           target="_blank"
//                           rel="noopener noreferrer"
//                         >
//                           {sbtSubdomainInfo.nftAddress}
//                         </a>
//                       </code>
//                     </div>
//                   )}
//                   {sbtSubdomainInfo.timestamp && (
//                     <div style={{ marginBottom: "10px" }}>
//                       <strong>{t("created")}:</strong>{" "}
//                       {new Date(
//                         sbtSubdomainInfo.timestamp * 1000
//                       ).toLocaleString()}
//                     </div>
//                   )}
//                 </>
//               )}
//               {!sbtSubdomainInfo.isTaken && (
//                 <div
//                   style={{
//                     marginTop: "10px",
//                     padding: "8px",
//                     background: "rgba(74, 144, 226, 0.1)",
//                     borderRadius: "5px",
//                     fontSize: "12px",
//                     color: "#ccc",
//                     textAlign: "center",
//                   }}
//                 >
//                   {t("sbtForPersonalUse")} • {t("buyFor1TON")}
//                 </div>
//               )}
//               <div
//                 style={{
//                   marginTop: "10px",
//                   paddingTop: "10px",
//                   borderTop: "1px solid #444",
//                   fontSize: "11px",
//                   color: "#aaa",
//                 }}
//               >
//                 <strong>{t("networkLabel")}</strong>{" "}
//                 {isTestnet ? t("testnet") : t("mainnet")}
//               </div>
//             </div>
//           </Card>
//         )}

//         {/* FREE SUBDOMAIN */}
//         {hasChecked && !auctionInfo && !sbtSubdomainInfo && (
//           <Card
//             style={{
//               background:
//                 activeTab === "sbt"
//                   ? "linear-gradient(to bottom, #1a2a1a, #2a2a2a)"
//                   : "linear-gradient(to bottom, #2a1a1a, #2a2a1a)",
//               marginBottom: "20px",
//               padding: "15px",
//               borderRadius: "10px",
//               width: "280px",
//               border:
//                 activeTab === "sbt" ? "2px solid #4a90e2" : "2px solid #4ade80",
//             }}
//           >
//             <div
//               style={{ color: "#fff", fontSize: "14px", textAlign: "center" }}
//             >
//               <div
//                 style={{
//                   marginBottom: "10px",
//                   color: activeTab === "sbt" ? "#4a90e2" : "#4ade80",
//                   fontWeight: "bold",
//                 }}
//               >
//                 {activeTab === "sbt"
//                   ? sbtPurchaseCompleted
//                     ? `✅ ${t("sbtSubdomainPurchased")}`
//                     : `✅ ${t("sbtSubdomainAvailable")}`
//                   : `✅ ${t("subdomainAvailable")}`}
//               </div>
//               <div
//                 style={{
//                   width: "100%",
//                   display: "flex",
//                   justifyContent: "center",
//                   alignItems: "center",
//                 }}
//               >
//                 <img
//                   style={{
//                     width: "200px",
//                     height: "200px",
//                     borderRadius: "25px",
//                     marginBottom: "15px",
//                   }}
//                   src={getImageUrl()}
//                   alt="subdomainImage"
//                 />
//               </div>
//               <div style={{ color: "#ccc", fontSize: "13px" }}>
//                 {activeTab === "sbt"
//                   ? sbtPurchaseCompleted
//                     ? t("sbtSubdomainPurchased")
//                     : t("sbtForPersonalUse")
//                   : t("makeFirstBid")}
//               </div>
//               <div
//                 style={{
//                   marginTop: "10px",
//                   paddingTop: "10px",
//                   borderTop: "1px solid #444",
//                   display: "flex",
//                   justifyContent: "space-between",
//                   alignItems: "center",
//                 }}
//               >
//                 <div style={{ fontSize: "11px", color: "#aaa" }}>
//                   <strong>{t("networkLabel")}</strong>{" "}
//                   {isTestnet ? t("testnet") : t("mainnet")}
//                 </div>
//                 {activeTab === "proxy" && (
//                   <div style={{ display: "flex", gap: "8px" }}>
//                     <IconButton
//                       size="s"
//                       mode="outline"
//                       onClick={handleCopyAuctionLink}
//                       title={t("copyAuctionLink")}
//                       style={{
//                         backgroundColor: "#333",
//                         borderColor: "#555",
//                         color: "white",
//                         padding: "4px 8px",
//                         fontSize: "10px",
//                       }}
//                     >
//                       📋
//                     </IconButton>
//                     <IconButton
//                       size="s"
//                       mode="outline"
//                       onClick={handleShareAuction}
//                       title={t("shareAuction")}
//                       style={{
//                         backgroundColor: "#333",
//                         borderColor: "#555",
//                         color: "white",
//                         padding: "4px 8px",
//                         fontSize: "10px",
//                       }}
//                     >
//                       🔗
//                     </IconButton>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </Card>
//         )}

//         {/* TIMER */}
//         {activeTab === "proxy" && (
//           <Card
//             style={{
//               background: "linear-gradient(to bottom, black, gray)",
//               marginBottom: "20px",
//               padding: "5px 5px 20px 5px",
//               borderRadius: "10px",
//               display: "flex",
//               flexDirection: "column",
//               alignItems: "center",
//               gap: "10px",
//               width: "min-content",
//             }}
//           >
//             <FlipTimer
//               auctionData={auctionInfo}
//               defaultTime={hasChecked && !auctionInfo ? 86400 : undefined}
//               onComplete={() => console.log("Аукцион завершен!")}
//             />
//             <div style={{ fontSize: "11px", color: "#aaa" }}>
//               {t("networkLabel")} {isTestnet ? t("testnet") : t("mainnet")}
//             </div>
//           </Card>
//         )}

//         {/* BID SELECT */}
//         {hasChecked &&
//           auctionInfo &&
//           auctionInfo.isActive &&
//           activeTab === "proxy" && (
//             <>
//               <div style={{ position: "relative", width: "200px" }}>
//                 <select
//                   value={showCustomInput ? "custom" : customBidAmount}
//                   onChange={handleBidSelectChange}
//                   style={{
//                     width: "200px",
//                     borderRadius: "25px",
//                     padding: "10px 15px",
//                     fontSize: "14px",
//                   }}
//                 >
//                   <option value="">{`${t("price")}: Min. ${(
//                     calculateBidPrice / 1_000_000_000
//                   ).toFixed(2)} TON`}</option>
//                   <option value="custom">{t("enterValue")}</option>
//                   <option value="10">10 TON</option>
//                   <option value="20">20 TON</option>
//                   <option value="50">50 TON</option>
//                   <option value="100">100 TON</option>
//                   <option value="500">500 TON</option>
//                 </select>
//               </div>
//               {showCustomInput && (
//                 <div style={{ position: "relative", width: "200px" }}>
//                   <Input
//                     placeholder={t("yourBid")}
//                     value={manualBidValue}
//                     onChange={(e) => handleManualBidChange(e.target.value)}
//                     style={{
//                       width: "200px",
//                       borderRadius: "25px",
//                       padding: "10px 15px",
//                       fontSize: "24px",
//                       fontWeight: "600",
//                       marginLeft: "20px",
//                     }}
//                   />
//                 </div>
//               )}
//             </>
//           )}

//         {/* Шаг 3: ACTION BUTTON */}
//         {hasChecked && getActionButtonText() && (
//           <div style={{ position: "relative", width: "280px" }}>
//             <div
//               style={{
//                 position: "absolute",
//                 left: "-30px",
//                 top: "50%",
//                 transform: "translateY(-50%)",
//                 fontSize: "18px",
//                 fontWeight: "bold",
//                 color: isDark ? "white" : "black",
//               }}
//             >
//               3
//             </div>
//             <Button
//               onClick={getActionButtonHandler()}
//               disabled={getActionButtonDisabled()}
//               style={{
//                 width: "280px",
//                 borderRadius: "25px",
//                 padding: "10px 15px",
//                 backgroundColor: getActionButtonColor(),
//                 marginBottom:
//                   activeTab === "proxy" &&
//                   auctionInfo &&
//                   !auctionInfo.isActive &&
//                   !canClaim
//                     ? "10px"
//                     : "0",
//                 display: getActionButtonText() ? "block" : "none",
//               }}
//             >
//               {getActionButtonText()}
//             </Button>
//           </div>
//         )}

//         {/* Шаг 4: MARKETPLACE */}
//         {hasChecked &&
//           auctionInfo &&
//           !auctionInfo.isActive &&
//           !canClaim &&
//           activeTab === "proxy" && (
//             <div style={{ position: "relative", width: "280px" }}>
//               <div
//                 style={{
//                   position: "absolute",
//                   left: "-30px",
//                   top: "50%",
//                   transform: "translateY(-50%)",
//                   fontSize: "18px",
//                   fontWeight: "bold",
//                   color: isDark ? "white" : "black",
//                 }}
//               >
//                 4
//               </div>
//               <a
//                 href={marketplaceUrl}
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 style={{
//                   display: "block",
//                   width: "280px",
//                   borderRadius: "25px",
//                   padding: "11.75px 15px",
//                   backgroundColor: "#6366f1",
//                   color: "white",
//                   textDecoration: "none",
//                   textAlign: "center",
//                   fontWeight: "bold",
//                   cursor: "pointer",
//                   border: "none",
//                 }}
//               >
//                 🛍️ {t("viewOnMarketplace")}
//               </a>
//             </div>
//           )}

//         {/* Шаг 4: Создать сайт */}
//         {(sbtPurchaseCompleted ||
//           (auctionInfo && !auctionInfo.isActive && canClaim)) && (
//           <div style={{ position: "relative", width: "280px" }}>
//             <div
//               style={{
//                 position: "absolute",
//                 left: "-30px",
//                 top: "50%",
//                 transform: "translateY(-50%)",
//                 fontSize: "18px",
//                 fontWeight: "bold",
//                 color: isDark ? "white" : "black",
//               }}
//             >
//               4
//             </div>
//             <a
//               href="https://t.me/Ton_site_builder_bot?startapp"
//               target="_blank"
//               rel="noopener noreferrer"
//               style={{
//                 display: "block",
//                 width: "280px",
//                 borderRadius: "25px",
//                 padding: "11.75px 15px",
//                 background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
//                 color: "white",
//                 textDecoration: "none",
//                 textAlign: "center",
//                 fontWeight: "bold",
//                 cursor: "pointer",
//                 border: "none",
//                 fontSize: "14px",
//               }}
//             >
//               🏗️ Создать сайт на {subDomainName}.{selectedDomainZone}
//             </a>
//           </div>
//         )}
//       </List>
//     </Page>
//   );
// };

// export default AuctionPage;

// src/pages/AuctionPage/index.tsx
// === ФИНАЛЬНАЯ ВЕРСИЯ (v7) ===
// Исправления:
// 1) validUntil: +120 (2 минуты) вместо +360 (TON Connect лимит 5 мин)
// 2) apiService.setNetwork: useRef защита от повторных вызовов (убирает петлю ×256)
// 3) proxyZones для селекта: ВСЕ прокси-коллекции с платформы (proxyCollections),
//    а не только юзера. Для SBT — только юзера (как было).
// 4) collectionToZone из ProfileWidget (copy-paste, без dedupe).
// 5) Логи тела транзакции при отправке.
// 6) item_count из col.item_count.

// import React, {
//   useState,
//   useCallback,
//   useMemo,
//   useEffect,
//   useRef,
// } from "react";
// import {
//   Banner,
//   Button,
//   Card,
//   Input,
//   List,
//   IconButton,
// } from "@telegram-apps/telegram-ui";
// import { useTonWallet, useTonAddress } from "@tonconnect/ui-react";
// import { useTonConnectUI } from "@tonconnect/ui-react";
// import TonWeb from "tonweb";
// import { Address } from "ton-core";
// import Box from "@mui/material/Box";
// import Tabs from "@mui/material/Tabs";
// import Tab from "@mui/material/Tab";

// import { useTypedDispatch } from "../../hooks/useTypeDispatch";
// import { Page } from "@/components/Page";
// import { ShowSnackbar } from "@/components/ShowSnackbar";
// import { claimSubdomain } from "@/store/nft/actions";
// import FlipTimer from "./flipTimer/FlipTimer";
// import { getAuctionInfo, ParsedAuctionInfo } from "./flipTimer/getAuctionInfo";
// import { useLanguage } from "@/contexts/LanguageContext";
// import { useTheme } from "@/contexts/ThemeContext";
// import { useUser } from "@/contexts/UserContext";
// import { apiService, Subdomain, Zone } from "@/services/api";

// import { checkSBTSubdomain, SBTSubdomainInfo } from "./checkSBTSubdomain";
// import { calculateProxyNFTAddress } from "./CalculateProxyNFTAddress";

// // ====== ONCHAIN ======
// import { useBlockchainItems } from "@/services/blockchainItems/blockchain-items-context.tsx";
// import { SimpleCollection } from "@/services/blockchainItems/blockchain-items-types";

// import ActiveAuctions from "@/components/ActiveAuctions/ActiveAuctions";
// import { useAuctionIntegration } from "@/hooks/useAuctionIntegration";

// import {
//   getAuctionParamsFromUrl,
//   updateAuctionUrl,
//   copyAuctionUrlToClipboard,
//   shareAuction,
//   isAuctionPage,
//   clearAuctionUrl,
// } from "@/utils/urlParams";

// import { useLaunchParams } from "@telegram-apps/sdk-react";
// import { MiniAppLinks } from "@/utils/miniAppLinks";
// import { AuctionCollectionSelector } from "./AuctionCollectionSelector";
// import { getUserSbtSubdomainsCount } from "@/utils/sbt-utils";
// import { convertUserFriendlyToRaw } from "@/utils/tonUtils";

// // ====== ТИПЫ =====

// type CollectionAddressMap = {
//   [key: string]: string;
// };

// type ActiveTab = "proxy" | "sbt";

// const mapPrices: Record<number, number> = {
//   1: 30,
//   2: 20,
//   3: 10,
//   4: 5,
//   5: 2.5,
//   6: 1,
// };

// const API_PAYLOAD_URL = import.meta.env.VITE_API_SC_PAYLOAD_URL;

// const normalizeAddress = (addr: string): string => {
//   if (!addr) return "";
//   try {
//     const address = Address.parse(addr);
//     return address.toString({ bounceable: true, testOnly: false });
//   } catch (error) {
//     console.error("Error parsing address:", addr, error);
//     return addr;
//   }
// };
// // ====== ДЕДУПЛИКАЦИЯ С ПРИОРИТЕТОМ PROXY > SBT ======
// // Если зона есть и в proxy и в sbt — proxy выигрывает, из sbt убираем
// const dedupeSbtAgainstProxy = (
//   sbtZones: Zone[],
//   proxyZones: Zone[]
// ): Zone[] => {
//   const proxyNames = new Set(proxyZones.map((z) => z.name));
//   // Группируем sbt по имени, оставляем latest по createdAt
//   const sbtMap = new Map<string, Zone>();
//   for (const z of sbtZones) {
//     const exist = sbtMap.get(z.name);
//     if (!exist || new Date(z.createdAt) > new Date(exist.createdAt)) {
//       sbtMap.set(z.name, z);
//     }
//   }
//   // Убираем те, что уже есть в proxy
//   return [...sbtMap.values()].filter((z) => !proxyNames.has(z.name));
// };

// // ====== collectionToZone — ТОЧНАЯ КОПИЯ ИЗ ProfileWidget ======
// const collectionToZone = (col: SimpleCollection): Zone => {
//   const rawName = col.name || "";
//   const zoneName = rawName
//     .replace(" DNS Domains", "")
//     .replace(" Proxy Domains", "")
//     .toLowerCase();
//   return {
//     id: col.address.slice(0, 10),
//     name: zoneName.endsWith(".ton") ? zoneName : `${zoneName}.ton`,
//     address: col.address,
//     owner: col.creator_address || col.owner_address,
//     collectionAddress: col.address,
//     createdAt: col.created_at || col.lastUpdated || new Date().toISOString(),
//     subdomainsAmount: col.item_count || 0,
//     proxy: col.type === "proxy" ? 1 : 0,
//     status: "active",
//     image: col.metadata?.token_info?.[0]?.image || col.image,
//     description: col.metadata?.token_info?.[0]?.description || col.description,
//     zoneLength: zoneName.length,
//   } as any as Zone;
// };

// // ====== Вспомогательная: dedupe по createdAt (latest) для селекта proxy (ВСЕ зоны) ======
// const dedupeByLatest = (cols: SimpleCollection[]): SimpleCollection[] => {
//   const map = new Map<string, SimpleCollection>();
//   for (const c of cols) {
//     const key = (c.name || "").toLowerCase();
//     const exist = map.get(key);
//     if (
//       !exist ||
//       new Date(c.created_at || c.lastUpdated || 0) >
//         new Date(exist.created_at || exist.lastUpdated || 0)
//     ) {
//       map.set(key, c);
//     }
//   }
//   return [...map.values()];
// };

// // ====================================================================
// // КОМПОНЕНТ
// // ====================================================================

// export const AuctionPage: React.FC<{}> = () => {
//   const dispatch = useTypedDispatch();
//   const wallet = useTonWallet();
//   const userAddress = useTonAddress();
//   const [tonConnectUI] = useTonConnectUI();
//   const { refreshSubdomains } = useUser();

//   const [sbtSubdomainInfo, setSbtSubdomainInfo] =
//     useState<SBTSubdomainInfo | null>(null);

//   const { currentTheme } = useTheme();
//   const isDark = currentTheme === "dark";
//   const { t } = useLanguage();

//   const [activeTab, setActiveTab] = useState<ActiveTab>("proxy");
//   const [selectedDomainZone, setSelectedDomainZone] = useState("");
//   const [subDomainName, setSubDomainName] = useState("");
//   const [collectionAddress, setCollectionAddress] = useState("");
//   const [snackbar, setSnackbar] = useState<JSX.Element | null>(null);
//   const [auctionInfo, setAuctionInfo] = useState<ParsedAuctionInfo | null>(
//     null
//   );
//   const [isLoading, setIsLoading] = useState(false);
//   const [nftAddress, setNftAddress] = useState("");
//   const [hasChecked, setHasChecked] = useState(false);
//   const [isClaimLoading, setIsClaimLoading] = useState(false);
//   const [customBidAmount, setCustomBidAmount] = useState("");
//   const [showCustomInput, setShowCustomInput] = useState(false);
//   const [manualBidValue, setManualBidValue] = useState("");
//   const [sbtPurchaseCompleted, setSbtPurchaseCompleted] = useState(false);
//   const [sbtLoading, setSbtLoading] = useState(false);
//   const [sbtZonesCount, setSbtZonesCount] = useState<Record<string, number>>(
//     {}
//   );
//   const prevSbtMapRef = useRef<{
//     cacheKey: string;
//     map: CollectionAddressMap;
//   } | null>(null);

//   const isTestnet = wallet?.account?.chain === "-3";
//   const launchParams = useLaunchParams();
//   const [, setOpenedViaDeeplink] = useState(false);

//   // ====== ONCHAIN ДАННЫЕ ======
//   const {
//     proxyCollections,
//     sbtCollections,
//     loadAllData,
//     isLoading: zonesLoading,
//     error: zonesError,
//   } = useBlockchainItems();

//   // ====== ВСЕ PROXY КОЛЛЕКЦИИ (для селекта) — dedupe по имени, latest по createdAt ======
//   const allProxyZones: Zone[] = useMemo(
//     () => dedupeByLatest(proxyCollections).map((c) => collectionToZone(c)),
//     [proxyCollections]
//   );

//   // ====== SBT ЗОНЫ ТОЛЬКО ЮЗЕРА — ТОЧНО КАК В ProfileWidget ======
//   // const userSbtZones: Zone[] = useMemo(() => {
//   //   if (!userAddress) return [];
//   //   const normalizedAddress =
//   //     convertUserFriendlyToRaw(userAddress).toLowerCase();
//   //   return sbtCollections
//   //     .filter((col) => {
//   //       const creator = (
//   //         col.creator_address ||
//   //         col.owner_address ||
//   //         ""
//   //       ).toLowerCase();
//   //       return creator === normalizedAddress;
//   //     })
//   //     .map((col) => collectionToZone(col));
//   // }, [userAddress, sbtCollections]);

//   // СТАЛО:
//   const userSbtZones: Zone[] = useMemo(() => {
//     if (!userAddress) return [];
//     const normalizedAddress =
//       convertUserFriendlyToRaw(userAddress).toLowerCase();
//     const rawSbt = sbtCollections
//       .filter((col) => {
//         const creator = (
//           col.creator_address ||
//           col.owner_address ||
//           ""
//         ).toLowerCase();
//         return creator === normalizedAddress;
//       })
//       .map((col) => collectionToZone(col));
//     // Убираем SBT-зоны, которые уже есть в proxy (proxy выигрывает)
//     return dedupeSbtAgainstProxy(rawSbt, allProxyZones);
//   }, [userAddress, sbtCollections, allProxyZones]);

//   const activeSbtZones: Zone[] = useMemo(
//     () => userSbtZones.filter((zone) => zone.status !== "inactive"),
//     [userSbtZones]
//   );

//   // allZones — для поиска collectionAddress (proxy ВСЕ + sbt юзера)
//   const allZones: Zone[] = useMemo(
//     () => [...allProxyZones, ...userSbtZones],
//     [allProxyZones, userSbtZones]
//   );

//   // ====== УСТРАНЕНИЕ ПЕТЛИ apiService.setNetwork ======
//   const prevNetworkRef = useRef<boolean | null>(null);
//   useEffect(() => {
//     if (wallet && prevNetworkRef.current !== isTestnet) {
//       prevNetworkRef.current = isTestnet;
//       apiService.setNetwork(isTestnet);
//     }
//   }, [wallet, isTestnet]);

//   const isProxyZone = useCallback((zone: any): boolean => {
//     const proxyValue = zone.proxy;
//     if (typeof proxyValue === "number") return proxyValue === 1;
//     if (typeof proxyValue === "string")
//       return proxyValue.toLowerCase() === "proxy" || proxyValue === "1";
//     return false;
//   }, []);

//   const proxyCollectionAddressesMap = useMemo(() => {
//     const map: CollectionAddressMap = {};
//     allZones.forEach((zone) => {
//       if (isProxyZone(zone) && zone.name && zone.collectionAddress)
//         map[zone.name] = zone.collectionAddress;
//     });
//     return map;
//   }, [allZones, isProxyZone]);

//   const sbtCollectionAddressesMap = useMemo(() => {
//     const cacheKey = activeSbtZones
//       .map((z) => `${z.name}|${z.collectionAddress}`)
//       .sort()
//       .join(";");
//     if (prevSbtMapRef.current && prevSbtMapRef.current.cacheKey === cacheKey)
//       return prevSbtMapRef.current.map;
//     const map: CollectionAddressMap = {};
//     activeSbtZones.forEach((z) => {
//       if (z.name && z.collectionAddress) map[z.name] = z.collectionAddress;
//     });
//     prevSbtMapRef.current = { cacheKey, map };
//     return map;
//   }, [activeSbtZones]);

//   const currentCollectionMap = useMemo(
//     () =>
//       activeTab === "proxy"
//         ? proxyCollectionAddressesMap
//         : sbtCollectionAddressesMap,
//     [activeTab, proxyCollectionAddressesMap, sbtCollectionAddressesMap]
//   );

//   useEffect(() => {
//     if (selectedDomainZone && !collectionAddress && allZones.length > 0) {
//       const zone = allZones.find((z) => z.name === selectedDomainZone);
//       if (zone?.collectionAddress) {
//         setCollectionAddress(zone.collectionAddress);
//       } else {
//         const addr = currentCollectionMap[selectedDomainZone];
//         if (addr) setCollectionAddress(addr);
//       }
//     }
//   }, [selectedDomainZone, collectionAddress, allZones, currentCollectionMap]);

//   const domainZoneName = useMemo(() => {
//     if (!selectedDomainZone) return "";
//     return selectedDomainZone.split(".")[0];
//   }, [selectedDomainZone]);

//   const calculateDomainPrice = useMemo(() => {
//     if (activeTab === "sbt") return 500_000_000;
//     const len = subDomainName.length;
//     return Math.floor((mapPrices[len] || 0.5) * 1_000_000_000);
//   }, [subDomainName, activeTab]);

//   const calculateBidPrice = useMemo(() => {
//     if (activeTab === "sbt" || !auctionInfo) return 0;
//     if (customBidAmount && !isNaN(Number(customBidAmount)))
//       return Math.floor(Number(customBidAmount) * 1_000_000_000);
//     const maxBid = Number(auctionInfo.maxBid);
//     return maxBid + Math.ceil(maxBid * 0.05);
//   }, [auctionInfo, customBidAmount, activeTab]);

//   const canClaim = useMemo(() => {
//     if (activeTab === "sbt" || !auctionInfo || !userAddress) return false;
//     try {
//       if (auctionInfo.maxBidderOwner === null) return false;
//       return (
//         !auctionInfo.isActive &&
//         normalizeAddress(auctionInfo.maxBidderOwner) ===
//           normalizeAddress(userAddress)
//       );
//     } catch {
//       return false;
//     }
//   }, [auctionInfo, userAddress, activeTab]);

//   const marketplaceUrl = useMemo(() => {
//     if (activeTab === "sbt" || !nftAddress || !collectionAddress) return "";
//     const base = isTestnet
//       ? "https://testnet.getgems.io"
//       : "https://getgems.io";
//     return `${base}/collection/${collectionAddress}/${nftAddress}`;
//   }, [nftAddress, collectionAddress, isTestnet, activeTab]);

//   const showSnackbar = useCallback(
//     (message: string, type: "success" | "error" = "success") => {
//       setSnackbar(
//         <ShowSnackbar
//           message={message}
//           type={type}
//           onClose={() => setSnackbar(null)}
//         />
//       );
//     },
//     []
//   );

//   const updateUrlWithCurrentAuction = useCallback(() => {
//     if (selectedDomainZone && subDomainName && activeTab === "proxy") {
//       updateAuctionUrl({ zone: selectedDomainZone, subdomain: subDomainName });
//     }
//   }, [selectedDomainZone, subDomainName, activeTab]);

//   const handleCopyAuctionLink = useCallback(async () => {
//     if (!selectedDomainZone || !subDomainName) {
//       showSnackbar(t("selectZoneAndSubdomainFirst"), "error");
//       return;
//     }
//     const success = await copyAuctionUrlToClipboard({
//       zone: selectedDomainZone,
//       subdomain: subDomainName,
//     });
//     if (success) showSnackbar(t("auctionLinkCopied"), "success");
//     else showSnackbar(t("failedToCopyLink"), "error");
//   }, [selectedDomainZone, subDomainName, showSnackbar, t]);

//   const handleShareAuction = useCallback(async () => {
//     if (!selectedDomainZone || !subDomainName) {
//       showSnackbar(t("selectZoneAndSubdomainFirst"), "error");
//       return;
//     }
//     const success = await shareAuction({
//       zone: selectedDomainZone,
//       subdomain: subDomainName,
//     });
//     if (!success) await handleCopyAuctionLink();
//   }, [selectedDomainZone, subDomainName, showSnackbar, handleCopyAuctionLink]);

//   useEffect(() => {
//     const sp = launchParams.startParam;
//     if (sp) setOpenedViaDeeplink(true);
//   }, [launchParams.startParam]);

//   useEffect(() => {
//     const hasUrlParams = isAuctionPage();
//     const hasDeeplink = !!launchParams.startParam;
//     if ((hasUrlParams || hasDeeplink) && allZones.length === 0) return;
//     if (hasDeeplink) {
//       const sp = launchParams.startParam!;
//       try {
//         const { route, params } = MiniAppLinks.parseStartapp(sp);
//         if (route === "/add-subdomain" && params.zone && params.subdomain)
//           loadAuctionFromParams(params.zone, params.subdomain);
//       } catch (e) {
//         console.error("deeplink parse error:", e);
//       }
//     } else if (hasUrlParams) {
//       const p = getAuctionParamsFromUrl();
//       if (p.zone && p.subdomain) loadAuctionFromParams(p.zone, p.subdomain);
//     }
//     // eslint-disable-next-line
//   }, [allZones, launchParams.startParam]);

//   // ====== ПРОВЕРКА ИТЕМА =====
//   const handleCheckItem = useCallback(async () => {
//     if (!selectedDomainZone || !subDomainName || !collectionAddress) {
//       showSnackbar(t("pleaseEnterDomainName"), "error");
//       return;
//     }
//     if (!/^[a-z0-9-]+$/.test(subDomainName)) {
//       showSnackbar(t("subdomainInvalidCharsError"), "error");
//       return;
//     }
//     setIsLoading(true);
//     setHasChecked(false);
//     const lowerValue = subDomainName.toLowerCase();
//     if (activeTab === "sbt") {
//       const sbtInfo = await checkSBTSubdomain(
//         lowerValue,
//         collectionAddress,
//         isTestnet
//       );
//       if (sbtInfo) {
//         setSbtSubdomainInfo(sbtInfo);
//         setAuctionInfo(null);
//         setNftAddress(sbtInfo.nftAddress || "");
//         showSnackbar(
//           sbtInfo.isTaken
//             ? t("sbtSubdomainAlreadyTaken")
//             : t("sbtSubdomainAvailable"),
//           sbtInfo.isTaken ? "error" : "success"
//         );
//       } else {
//         setSbtSubdomainInfo(null);
//         setAuctionInfo(null);
//         setNftAddress("");
//         showSnackbar(t("checkingAvailability"), "error");
//       }
//     } else {
//       const info = await getAuctionInfo(
//         lowerValue,
//         collectionAddress,
//         isTestnet
//       );
//       if (info) {
//         setAuctionInfo(info);
//         setSbtSubdomainInfo(null);
//         setNftAddress(info.nftAddress || "");
//         showSnackbar(t("auctionInfoLoaded"), "success");
//         if (activeTab === "proxy") updateUrlWithCurrentAuction();
//       } else {
//         setAuctionInfo(null);
//         setSbtSubdomainInfo(null);
//         const proxyNFTAddress = await calculateProxyNFTAddress(
//           lowerValue,
//           collectionAddress,
//           isTestnet
//         );
//         if (proxyNFTAddress) {
//           setNftAddress(proxyNFTAddress);
//           showSnackbar(t("subdomainAvailableForFirstBid"), "success");
//         } else {
//           setNftAddress("");
//           showSnackbar(t("failedToCalculateNFTAddress"), "error");
//         }
//         if (activeTab === "proxy") updateUrlWithCurrentAuction();
//       }
//     }
//     setHasChecked(true);
//     setIsLoading(false);
//   }, [
//     selectedDomainZone,
//     subDomainName,
//     collectionAddress,
//     isTestnet,
//     t,
//     activeTab,
//     updateUrlWithCurrentAuction,
//     showSnackbar,
//   ]);

//   const loadUserSbtSubdomainsCount = useCallback(async () => {
//     if (!userAddress || activeTab !== "sbt") return;
//     try {
//       const counts = await getUserSbtSubdomainsCount(userAddress, isTestnet);
//       setSbtZonesCount(counts);
//     } catch {
//       setSbtZonesCount({});
//     }
//   }, [userAddress, isTestnet, activeTab]);

//   useEffect(() => {
//     if (activeTab === "sbt" && userAddress) loadUserSbtSubdomainsCount();
//     else setSbtZonesCount({});
//   }, [activeTab, userAddress, loadUserSbtSubdomainsCount]);

//   const loadAuctionFromParams = useCallback(
//     (zoneName: string, subdomainName: string) => {
//       setOpenedViaDeeplink(true);
//       setActiveTab("proxy");
//       setSelectedDomainZone(zoneName);
//       setSubDomainName(subdomainName);
//       const zone = allZones.find((z) => z.name === zoneName);
//       if (zone?.collectionAddress) setCollectionAddress(zone.collectionAddress);
//       updateUrlWithCurrentAuction();
//       setTimeout(() => handleCheckItem(), 500);
//     },
//     [allZones, handleCheckItem, updateUrlWithCurrentAuction]
//   );

//   const handleTabChange = (
//     _event: React.SyntheticEvent,
//     newValue: ActiveTab
//   ) => {
//     setActiveTab(newValue);
//     setSelectedDomainZone("");
//     setSubDomainName("");
//     setCollectionAddress("");
//     setAuctionInfo(null);
//     setNftAddress("");
//     setHasChecked(false);
//     setCustomBidAmount("");
//     setShowCustomInput(false);
//     setManualBidValue("");
//     setSbtPurchaseCompleted(false);
//     setOpenedViaDeeplink(false);
//     if (newValue === "sbt") clearAuctionUrl();
//   };

//   const checkItemByName = useCallback(
//     async (zoneName: string, subdomain: string) => {
//       setAuctionInfo(null);
//       setNftAddress("");
//       setHasChecked(false);
//       setCustomBidAmount("");
//       setShowCustomInput(false);
//       setManualBidValue("");
//       setSbtPurchaseCompleted(false);
//       setSelectedDomainZone(zoneName);
//       setSubDomainName(subdomain);
//       const zone = allZones.find((z) => z.name === zoneName);
//       setCollectionAddress(zone?.collectionAddress || "");
//       await new Promise((r) => setTimeout(r, 100));
//       await handleCheckItem();
//     },
//     [allZones, handleCheckItem]
//   );

//   const { handleAuctionClick, setSelectedZoneName, setSubdomainName } =
//     useAuctionIntegration({ zones: allZones, checkItem: checkItemByName });

//   const handleAuctionClickFromComponent = useCallback(
//     (zoneName: string, subdomainName: string) => {
//       handleAuctionClick(zoneName, subdomainName);
//       if (activeTab === "proxy") updateUrlWithCurrentAuction();
//     },
//     [handleAuctionClick, activeTab, updateUrlWithCurrentAuction]
//   );

//   const setupCollectionAddressForZone = useCallback(
//     (zoneName: string) => {
//       if (!zoneName) return false;
//       const zone = allZones.find((z) => z.name === zoneName);
//       if (zone?.collectionAddress) {
//         setCollectionAddress(zone.collectionAddress);
//         return true;
//       }
//       const a = currentCollectionMap[zoneName];
//       if (a) {
//         setCollectionAddress(a);
//         return true;
//       }
//       return false;
//     },
//     [allZones, currentCollectionMap]
//   );

//   const handleDomainZoneChangeForSelector = useCallback(
//     (value: string) => {
//       setSelectedDomainZone(value);
//       setOpenedViaDeeplink(false);
//       setSelectedZoneName(value);
//       setAuctionInfo(null);
//       setNftAddress("");
//       setHasChecked(false);
//       setCustomBidAmount("");
//       setShowCustomInput(false);
//       setManualBidValue("");
//       setSbtPurchaseCompleted(false);
//       setupCollectionAddressForZone(value);
//       if (value && subDomainName && activeTab === "proxy")
//         updateUrlWithCurrentAuction();
//     },
//     [
//       setSelectedZoneName,
//       setupCollectionAddressForZone,
//       subDomainName,
//       activeTab,
//       updateUrlWithCurrentAuction,
//     ]
//   );

//   const handleSubDomainNameChange = useCallback(
//     (value: string) => {
//       setSubDomainName(value.toLowerCase());
//       setSubdomainName(value.toLowerCase());
//       setAuctionInfo(null);
//       setNftAddress("");
//       setHasChecked(false);
//       setCustomBidAmount("");
//       setShowCustomInput(false);
//       setManualBidValue("");
//       setSbtPurchaseCompleted(false);
//       if (selectedDomainZone && value && activeTab === "proxy")
//         updateUrlWithCurrentAuction();
//     },
//     [
//       setSubdomainName,
//       selectedDomainZone,
//       activeTab,
//       updateUrlWithCurrentAuction,
//     ]
//   );

//   const handleBidSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     const v = e.target.value;
//     if (v === "custom") {
//       setShowCustomInput(true);
//       setCustomBidAmount("");
//       setManualBidValue("");
//     } else {
//       setShowCustomInput(false);
//       setCustomBidAmount(v);
//       setManualBidValue("");
//     }
//   };

//   const handleManualBidChange = (value: string) => {
//     setManualBidValue(value);
//     setCustomBidAmount(value && !isNaN(Number(value)) ? value : "");
//   };

//   // ====== ВЫЧИСЛЕНИЕ validUntil (2 минуты, лимит TON Connect = 5 минут) ======
//   const getValidUntil = (): number => Math.floor(Date.now() / 1000) + 120;

//   // ====== ЛОГ ТЕЛА ТРАНЗАКЦИИ ======
//   const logTx = (label: string, msgs: any[]) => {
//     console.log(
//       `📦 [${label}] Тело транзакции:`,
//       JSON.stringify(
//         {
//           validUntil: getValidUntil(),
//           messages: msgs.map((m) => ({
//             amount: m.amount,
//             address: m.address,
//             payload: m.payload || "(none)",
//           })),
//         },
//         null,
//         2
//       )
//     );
//   };

//   // ====== API (БД) ======
//   const createSubdomainIfNotExists = async (subdomainData: {
//     name: string;
//     address: string;
//     mintPrice: number;
//     links?: string[];
//     zoneId?: number;
//     owner?: string;
//     status: "active" | "inactive" | "auction" | "claimed";
//     auctionEndTime?: string;
//     collectionAddress?: string;
//   }): Promise<Subdomain> => {
//     try {
//       apiService.setNetwork(isTestnet);
//       try {
//         return await apiService.getSubdomainByName(subdomainData.name);
//       } catch {
//         return await apiService.createSubdomain({ ...subdomainData });
//       }
//     } catch (error) {
//       console.error("createSubdomainIfNotExists:", error);
//       throw error;
//     }
//   };

//   // ====== СТАРТ АУКЦИОНА ======
//   const handleStartAuction = async () => {
//     if (!selectedDomainZone || !subDomainName || !collectionAddress) {
//       showSnackbar(t("pleaseEnterDomainName"), "error");
//       return;
//     }
//     if (!userAddress) {
//       showSnackbar(t("walletNotConnected"), "error");
//       return;
//     }
//     try {
//       const tonWeb = new TonWeb();
//       const cell = new tonWeb.boc.Cell();
//       cell.bits.writeUint(0, 32);
//       cell.bits.writeString(`${subDomainName}`);
//       const payload = TonWeb.utils.bytesToBase64(await cell.toBoc());

//       const messages = [
//         {
//           amount: calculateDomainPrice.toString(),
//           address: collectionAddress,
//           payload,
//         },
//       ];
//       logTx("START_AUCTION", messages);

//       await tonConnectUI.sendTransaction({
//         validUntil: getValidUntil(),
//         messages,
//       });

//       const full = `${subDomainName}.${selectedDomainZone}`;
//       const auctionEndTime = new Date(
//         Date.now() + 24 * 60 * 60 * 1000
//       ).toISOString();
//       try {
//         apiService.setNetwork(isTestnet);
//         const zone = allZones.find((z) => z.name === selectedDomainZone);
//         await apiService.createSubdomain({
//           name: full,
//           address: nftAddress,
//           mintPrice: calculateDomainPrice / 1_000_000_000,
//           owner: userAddress,
//           status: "auction",
//           auctionEndTime,
//           zoneId: zone?.id,
//           collectionAddress: zone?.collectionAddress,
//         });
//         loadAllData(true);
//         showSnackbar(t("startAuction"), "success");
//       } catch (dbError: any) {
//         console.error("DB error:", dbError);
//         showSnackbar(t("auctionStartedBlockchainDbError"), "error");
//       }
//       setTimeout(() => handleCheckItem(), 2000);
//     } catch (error: any) {
//       if (error?.message?.includes("cancelled"))
//         showSnackbar(t("auctionStartCancelled"), "error");
//       else if (error?.message?.includes("rejected"))
//         showSnackbar(t("auctionStartRejected"), "error");
//       else if (error?.message?.includes("insufficient"))
//         showSnackbar(t("insufficientFundsForAuctionStart"), "error");
//       else showSnackbar(t("auctionStartError"), "error");
//     }
//   };

//   // ====== СТАВКА ======
//   const handlePlaceBid = async () => {
//     if (
//       !auctionInfo ||
//       !selectedDomainZone ||
//       !subDomainName ||
//       !collectionAddress
//     ) {
//       showSnackbar(t("auctionDataNotLoaded"), "error");
//       return;
//     }
//     if (!userAddress) {
//       showSnackbar(t("walletNotConnected"), "error");
//       return;
//     }
//     try {
//       const messages = [
//         { amount: calculateBidPrice.toString(), address: nftAddress },
//       ];
//       logTx("PLACE_BID", messages);

//       await tonConnectUI.sendTransaction({
//         validUntil: getValidUntil(),
//         messages,
//       });

//       const full = `${subDomainName}.${selectedDomainZone}`;
//       try {
//         apiService.setNetwork(isTestnet);
//         const zone = allZones.find((z) => z.name === selectedDomainZone);
//         const subdomain = await createSubdomainIfNotExists({
//           name: full,
//           address: nftAddress,
//           mintPrice: calculateBidPrice / 1_000_000_000,
//           owner: userAddress,
//           status: "auction",
//           auctionEndTime: new Date(
//             Date.now() + 24 * 60 * 60 * 1000
//           ).toISOString(),
//           zoneId: zone?.id,
//           collectionAddress: zone?.collectionAddress,
//         });
//         await apiService.addBidToSubdomain(subdomain.id, {
//           bidder: userAddress,
//           amount: calculateBidPrice,
//         });
//         await apiService.updateSubdomainStatus(subdomain.id, "auction");
//         refreshSubdomains();
//         loadAllData(true);
//       } catch (dbError: any) {
//         console.error("DB error:", dbError);
//         showSnackbar(t("bidPlacedBlockchainDbError"), "error");
//       }
//       showSnackbar(t("bid"), "success");
//       setCustomBidAmount("");
//       setShowCustomInput(false);
//       setManualBidValue("");
//       setTimeout(() => handleCheckItem(), 2000);
//     } catch (error: any) {
//       if (error?.message?.includes("cancelled"))
//         showSnackbar(t("bidCancelled"), "error");
//       else if (error?.message?.includes("rejected"))
//         showSnackbar(t("bidRejected"), "error");
//       else if (error?.message?.includes("insufficient"))
//         showSnackbar(t("insufficientFundsForBid"), "error");
//       else showSnackbar(t("bidError"), "error");
//     }
//   };

//   // ====== ПОКУПКА SBT ======
//   const handlePurchaseSBTSubdomain = async () => {
//     if (!selectedDomainZone || !subDomainName || !collectionAddress) {
//       showSnackbar(t("pleaseEnterDomainName"), "error");
//       return;
//     }
//     if (!wallet) {
//       showSnackbar(t("walletNotConnected"), "error");
//       return;
//     }
//     if (sbtSubdomainInfo?.isTaken) {
//       showSnackbar(t("sbtSubdomainAlreadyTaken"), "error");
//       return;
//     }
//     setSbtLoading(true);
//     try {
//       const tonWeb = new TonWeb();
//       const cell = new tonWeb.boc.Cell();
//       cell.bits.writeUint(0, 32);
//       cell.bits.writeString(`${subDomainName}`);
//       const payload = TonWeb.utils.bytesToBase64(await cell.toBoc());

//       const messages = [
//         {
//           amount: calculateDomainPrice.toString(),
//           address: collectionAddress,
//           payload,
//         },
//       ];
//       logTx("PURCHASE_SBT", messages);

//       await tonConnectUI.sendTransaction({
//         validUntil: getValidUntil(),
//         messages,
//       });

//       const full = `${subDomainName}.${selectedDomainZone}`;
//       if (!userAddress) throw new Error("No user address");
//       const nftAddr = sbtSubdomainInfo?.nftAddress || userAddress;
//       apiService.setNetwork(isTestnet);
//       const zone = allZones.find((z) => z.name === selectedDomainZone);
//       await apiService.createSubdomain({
//         name: full,
//         address: nftAddr,
//         mintPrice: calculateDomainPrice / 1_000_000_000,
//         owner: userAddress,
//         status: "active",
//         collectionAddress,
//         zoneId: zone?.id,
//       });
//       showSnackbar(t("sbtSubdomainPurchased"), "success");
//       setSbtPurchaseCompleted(true);
//     } catch (error: any) {
//       if (error?.message?.includes("cancelled"))
//         showSnackbar(t("sbtPurchaseCancelled"), "error");
//       else showSnackbar(t("sbtPurchaseError"), "error");
//     } finally {
//       setSbtLoading(false);
//     }
//   };

//   // ====== CLAIM ======
//   const handleClaimSubdomain = async () => {
//     if (!nftAddress) {
//       showSnackbar(t("nftAddressNotFound"), "error");
//       return;
//     }
//     if (!userAddress) {
//       showSnackbar(t("walletNotConnected"), "error");
//       return;
//     }
//     setIsClaimLoading(true);
//     try {
//       const result = await dispatch(
//         claimSubdomain({
//           subdomain_item_address: nftAddress,
//           query_id: 0,
//           isTestnet,
//         })
//       ).unwrap();
//       await tonConnectUI.sendTransaction({
//         validUntil: result.validUntil,
//         messages: result.messages,
//       });
//       const full = `${subDomainName}.${selectedDomainZone}`;
//       try {
//         apiService.setNetwork(isTestnet);
//         const s = await apiService.getSubdomainByName(full);
//         if (s) await apiService.updateSubdomainStatus(s.id, "claimed");
//       } catch (e) {
//         console.error("DB claim error:", e);
//       }
//       showSnackbar(t("subdomainClaimedSuccess"), "success");
//     } catch (error) {
//       showSnackbar(
//         error instanceof Error ? error.message : t("subdomainClaimError"),
//         "error"
//       );
//     } finally {
//       setIsClaimLoading(false);
//     }
//   };

//   // ====== UI HELPERS ======
//   const getImageUrl = () => {
//     if (!domainZoneName || !subDomainName) return "";
//     if (activeTab === "proxy")
//       return `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${domainZoneName}/${subDomainName}.png`;
//     return `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${domainZoneName}/${subDomainName}.png`;
//   };

//   const getActionButtonText = (): string => {
//     if (activeTab === "sbt") {
//       if (sbtPurchaseCompleted) return `✅ ${t("purchased")}`;
//       if (sbtSubdomainInfo?.isTaken)
//         return `❌ ${t("sbtSubdomainAlreadyTaken")}`;
//       return `${t("mintSubdomain")} (${t("buyFor1TON")})`;
//     }
//     if (!auctionInfo)
//       return `${t("startAuction")} (${t("price")}: ${
//         calculateDomainPrice / 1_000_000_000
//       } TON)`;
//     if (auctionInfo.isActive)
//       return `${t("bid")} (${
//         customBidAmount || (calculateBidPrice / 1_000_000_000).toFixed(2)
//       } TON)`;
//     if (canClaim)
//       return isClaimLoading ? t("claiming") : `🎁 ${t("claimSubdomain")}`;
//     return "";
//   };

//   const getActionButtonHandler = (): (() => void) | undefined => {
//     if (activeTab === "sbt") {
//       if (sbtPurchaseCompleted || sbtSubdomainInfo?.isTaken) return undefined;
//       return handlePurchaseSBTSubdomain;
//     }
//     if (!auctionInfo) return handleStartAuction;
//     if (auctionInfo.isActive) return handlePlaceBid;
//     if (canClaim) return handleClaimSubdomain;
//     return undefined;
//   };

//   const getActionButtonDisabled = (): boolean => {
//     if (activeTab === "sbt")
//       return (
//         sbtPurchaseCompleted ||
//         sbtLoading ||
//         !selectedDomainZone ||
//         !subDomainName ||
//         !!sbtSubdomainInfo?.isTaken
//       );
//     if (!auctionInfo) return !selectedDomainZone || !subDomainName;
//     if (auctionInfo.isActive) return false;
//     if (canClaim) return isClaimLoading;
//     return true;
//   };

//   const themeColors = {
//     light: { primary: "linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)" },
//     dark: { primary: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)" },
//   };
//   const colors = themeColors[isDark ? "dark" : "light"];

//   const getActionButtonColor = () => {
//     if (activeTab === "sbt") {
//       if (sbtPurchaseCompleted) return "#4ade80";
//       if (sbtSubdomainInfo?.isTaken) return "#888";
//       return sbtLoading ? "#888" : "#4a90e2";
//     }
//     if (!auctionInfo) return "#4ade80";
//     if (auctionInfo.isActive) return "rgb(74, 144, 226)";
//     if (canClaim) return isClaimLoading ? "#888" : "#4ade80";
//     return "transparent";
//   };

//   useEffect(() => {
//     if (userAddress) refreshSubdomains();
//   }, [userAddress, refreshSubdomains]);
//   // ====================================================================
//   // RENDER
//   // ====================================================================
//   return (
//     <Page back={true}>
//       {snackbar}
//       <Box sx={{ display: "flex", justifyContent: "center", mt: 2, mb: 3 }}>
//         <Tabs
//           value={activeTab}
//           onChange={handleTabChange}
//           sx={{
//             "& .MuiTab-root": {
//               color: isDark ? "#ccc" : "#666",
//               "&.Mui-selected": { color: isDark ? "#FFD700" : "#3B82F6" },
//             },
//           }}
//         >
//           <Tab label={t("proxyForSale")} value="proxy" />
//           <Tab label={t("sbtNotForSale")} value="sbt" />
//         </Tabs>
//       </Box>

//       {activeTab === "proxy" && (
//         <div
//           className="bannerWrapper"
//           style={{
//             display: "flex",
//             width: "100%",
//             justifyContent: "center",
//             alignItems: "center",
//           }}
//         >
//           <Banner
//             type="section"
//             header={t("proxyAuctionTitle")}
//             subheader={t("proxyAuctionDescription")}
//             style={{
//               textAlign: "center",
//               marginBottom: "20px",
//               padding: "15px",
//               maxWidth: "425px",
//               background: isDark
//                 ? "linear-gradient(to bottom, #1a1a1a, #2a2a2a)"
//                 : "linear-gradient(to bottom, #f5f5f5, #e5e5e5)",
//               color: isDark ? "#fff" : "#333",
//             }}
//           >
//             <div
//               style={{
//                 textAlign: "left",
//                 marginTop: "15px",
//                 fontSize: "14px",
//                 display: "flex",
//                 flexDirection: "column",
//                 alignItems: "center",
//                 maxWidth: "425px",
//               }}
//             >
//               <div
//                 style={{
//                   fontWeight: "bold",
//                   marginBottom: "10px",
//                   textAlign: "center",
//                 }}
//               >
//                 {t("proxyFeatures")}
//               </div>
//               <ul style={{ paddingLeft: "20px", margin: 0 }}>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature1")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature2")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature3")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature4")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature5")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature6")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature7")}</li>
//               </ul>
//             </div>
//           </Banner>
//         </div>
//       )}

//       {activeTab === "sbt" && (
//         <div
//           className="bannerWrapper"
//           style={{
//             display: "flex",
//             width: "100%",
//             justifyContent: "center",
//             alignItems: "center",
//           }}
//         >
//           <Banner
//             type="section"
//             header={t("sbtMintTitle")}
//             subheader={t("sbtMintDescription")}
//             style={{
//               textAlign: "center",
//               marginBottom: "20px",
//               padding: "15px",
//               maxWidth: "425px",
//               background: isDark
//                 ? "linear-gradient(to bottom, #1a1a1a, #2a2a2a)"
//                 : "linear-gradient(to bottom, #f5f5f5, #e5e5e5)",
//               color: isDark ? "#fff" : "#333",
//             }}
//           >
//             <div
//               style={{
//                 textAlign: "left",
//                 marginTop: "15px",
//                 fontSize: "14px",
//                 display: "flex",
//                 flexDirection: "column",
//                 alignItems: "center",
//                 maxWidth: "425px",
//               }}
//             >
//               <div
//                 style={{
//                   fontWeight: "bold",
//                   marginBottom: "10px",
//                   textAlign: "center",
//                 }}
//               >
//                 {t("sbtFeatures")}
//               </div>
//               <ul style={{ paddingLeft: "20px", margin: 0 }}>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature1")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature2")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature3")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature4")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature5")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature6")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature7")}</li>
//               </ul>
//             </div>
//           </Banner>
//         </div>
//       )}

//       {activeTab === "proxy" && (
//         <ActiveAuctions
//           isTestnet={isTestnet}
//           isDark={isDark}
//           onAuctionClick={handleAuctionClickFromComponent}
//         />
//       )}

//       <div
//         style={{
//           textAlign: "center",
//           marginBottom: "10px",
//           padding: "5px 10px",
//           borderRadius: "15px",
//           background: isTestnet ? "#f59e0b" : "#10b981",
//           color: "white",
//           fontSize: "12px",
//           fontWeight: "bold",
//           maxWidth: "280px",
//           margin: "0 auto",
//         }}
//       >
//         {isTestnet ? "🌐 Testnet Mode" : "🌐 Mainnet Mode"}
//       </div>

//       <List
//         style={{
//           display: "flex",
//           flexDirection: "column",
//           alignItems: "center",
//           gap: "15px",
//           paddingBottom: "150px",
//         }}
//       >
//         <div style={{ position: "relative", width: "280px" }}>
//           <div
//             style={{
//               position: "absolute",
//               left: "-30px",
//               top: "50%",
//               transform: "translateY(-50%)",
//               fontSize: "18px",
//               fontWeight: "bold",
//               color: isDark ? "white" : "black",
//             }}
//           >
//             1
//           </div>
//           <AuctionCollectionSelector
//             activeTab={activeTab}
//             selectedDomainZone={selectedDomainZone}
//             onDomainZoneChange={handleDomainZoneChangeForSelector}
//             zonesLoading={zonesLoading}
//             zonesError={zonesError}
//             userAddress={userAddress}
//             isDark={isDark}
//             t={t}
//             // sbtCollectionAddressesMap={sbtCollectionAddressesMap} .
//             activeSbtZones={activeSbtZones}
//             proxyZones={allProxyZones}
//             isTestnet={isTestnet}
//             sbtZonesCount={sbtZonesCount}
//           />
//           {zonesError && (
//             <p style={{ color: "#f87171", fontSize: "12px", marginTop: "5px" }}>
//               {zonesError}
//             </p>
//           )}
//           {activeTab === "sbt" &&
//             userSbtZones.length === 0 &&
//             !zonesLoading &&
//             !zonesError && (
//               <p
//                 style={{
//                   color: "#f59e0b",
//                   fontSize: "12px",
//                   marginTop: "5px",
//                   textAlign: "center",
//                 }}
//               >
//                 {t("noSbtZones")}
//               </p>
//             )}
//         </div>

//         {selectedDomainZone && (
//           <div
//             style={{
//               padding: "8px 12px",
//               borderRadius: "8px",
//               background: isDark ? "#2a2a2a" : "#f5f5f5",
//               border: `1px solid ${isDark ? "#444" : "#ddd"}`,
//               fontSize: "12px",
//               color: isDark ? "#ccc" : "#666",
//               maxWidth: "280px",
//               textAlign: "center",
//             }}
//           >
//             <p style={{ margin: 0 }}>
//               <strong>{t("zoneType")}</strong>{" "}
//               {activeTab === "proxy" ? t("proxyType") : t("sbtType")}
//             </p>
//             {collectionAddress ? (
//               <p
//                 style={{
//                   margin: "3px 0 0 0",
//                   color: "#4caf50",
//                   fontSize: "11px",
//                 }}
//               >
//                 {t("collectionConfigured")}
//               </p>
//             ) : (
//               <p
//                 style={{
//                   margin: "3px 0 0 0",
//                   color: "#f59e0b",
//                   fontSize: "11px",
//                 }}
//               >
//                 {t("collectionNotConfigured")}
//               </p>
//             )}
//             <p
//               style={{
//                 margin: "3px 0 0 0",
//                 fontSize: "11px",
//                 color: isTestnet ? "#f59e0b" : "#10b981",
//               }}
//             >
//               {t("network")} {isTestnet ? t("testnet") : t("mainnet")}
//             </p>
//           </div>
//         )}

//         <div style={{ position: "relative", width: "280px" }}>
//           <div
//             style={{
//               position: "absolute",
//               left: "-30px",
//               top: "50%",
//               transform: "translateY(-50%)",
//               fontSize: "18px",
//               fontWeight: "bold",
//               color: isDark ? "white" : "black",
//             }}
//           >
//             2
//           </div>
//           <Input
//             placeholder={t("enterSubdomainName")}
//             value={subDomainName}
//             onChange={(e) => {
//               const val = e.target.value
//                 .trim()
//                 .toLowerCase()
//                 .replace(/[^a-z0-9-]/g, "");
//               handleSubDomainNameChange(val);
//             }}
//             style={{
//               width: "280px",
//               borderRadius: "50%",
//               padding: "0px 15px",
//               position: "relative",
//             }}
//             before={
//               <div
//                 style={{
//                   position: "absolute",
//                   left: "15px",
//                   top: "50%",
//                   transform: "translateY(-50%)",
//                   opacity: 0.5,
//                 }}
//               >
//                 🔍
//               </div>
//             }
//           />
//         </div>

//         <div style={{ position: "relative", width: "280px" }}>
//           <div
//             style={{
//               position: "absolute",
//               left: "-30px",
//               top: "50%",
//               transform: "translateY(-50%)",
//               fontSize: "18px",
//               fontWeight: "bold",
//               color: isDark ? "white" : "black",
//             }}
//           >
//             2.5
//           </div>
//           <Button
//             onClick={handleCheckItem}
//             disabled={
//               !selectedDomainZone ||
//               !subDomainName ||
//               isLoading ||
//               !collectionAddress
//             }
//             style={{
//               width: "280px",
//               borderRadius: "25px",
//               padding: "10px 15px",
//               background: isLoading ? "#888" : colors.primary,
//               opacity: !collectionAddress ? 0.5 : 1,
//               cursor: !collectionAddress ? "not-allowed" : "pointer",
//               color: isDark ? "black" : "white",
//             }}
//           >
//             {isLoading ? t("checking") : t("checkingItem")}
//           </Button>
//           {!collectionAddress && (
//             <p
//               style={{
//                 color: "#f59e0b",
//                 fontSize: "12px",
//                 marginTop: "5px",
//                 textAlign: "center",
//               }}
//             >
//               {t("noCollectionAddress")}
//             </p>
//           )}
//         </div>

//         {/* AUCTION CARD */}
//         {hasChecked && auctionInfo && activeTab === "proxy" && (
//           <Card
//             style={{
//               background: "linear-gradient(to bottom, #1a1a1a, #2a2a2a)",
//               marginBottom: "20px",
//               padding: "15px",
//               borderRadius: "10px",
//               width: "280px",
//               border: `2px solid ${
//                 auctionInfo.isActive ? "#4ade80" : "#f87171"
//               }`,
//             }}
//           >
//             <div style={{ color: "#fff", fontSize: "14px" }}>
//               <div
//                 style={{
//                   marginBottom: "10px",
//                   textAlign: "center",
//                   color: auctionInfo.isActive ? "#4ade80" : "#f87171",
//                   fontWeight: "bold",
//                 }}
//               >
//                 {auctionInfo.isActive
//                   ? `✅  ${t("bidOnAuction")}`
//                   : `❌ ${t("subdomainAlreadyTaken")}`}
//               </div>
//               <div
//                 style={{
//                   width: "100%",
//                   display: "flex",
//                   justifyContent: "center",
//                   alignItems: "center",
//                 }}
//               >
//                 <img
//                   style={{
//                     width: "200px",
//                     height: "200px",
//                     borderRadius: "25px",
//                     marginBottom: "15px",
//                   }}
//                   src={getImageUrl()}
//                   alt="subdomainImage"
//                 />
//               </div>
//               <div style={{ marginBottom: "10px" }}>
//                 <strong>{t("maxBidder")}:</strong>
//                 <br />
//                 <code style={{ fontSize: "12px", wordBreak: "break-all" }}>
//                   <a
//                     style={{ color: "white" }}
//                     href={`https://tonviewer.com/${
//                       auctionInfo.maxBidderOwner || t("domainLeftAuction")
//                     }`}
//                   >
//                     {auctionInfo.maxBidderOwner || t("domainLeftAuction")}
//                   </a>
//                 </code>
//               </div>
//               <div style={{ marginBottom: "10px" }}>
//                 <strong>{t("maxBid")}: </strong>
//                 {Number(auctionInfo.maxBid) === 0
//                   ? t("hideAfterAuctionEnd")
//                   : (Number(auctionInfo.maxBid) / 1_000_000_000).toFixed(
//                       2
//                     )}{" "}
//                 TON
//               </div>
//               <div style={{ marginBottom: "10px" }}>
//                 <strong>{t("endTime")}:</strong>{" "}
//                 {new Date(auctionInfo.timestamp * 1000).toLocaleString()}
//               </div>
//               <div>
//                 <strong>{t("status")}:</strong>
//                 <span
//                   style={{
//                     marginLeft: "5px",
//                     color: auctionInfo.isActive ? "#4ade80" : "#f87171",
//                   }}
//                 >
//                   {auctionInfo.isActive
//                     ? `🟢 ${t("active")}`
//                     : `🔴 ${t("ended")}`}
//                 </span>
//               </div>
//               <div
//                 style={{
//                   marginTop: "10px",
//                   paddingTop: "10px",
//                   borderTop: "1px solid #444",
//                   display: "flex",
//                   justifyContent: "space-between",
//                   alignItems: "center",
//                 }}
//               >
//                 <div style={{ fontSize: "11px", color: "#aaa" }}>
//                   <strong>{t("networkLabel")}</strong>{" "}
//                   {isTestnet ? t("testnet") : t("mainnet")}
//                 </div>
//                 {activeTab === "proxy" && (
//                   <div style={{ display: "flex", gap: "8px" }}>
//                     <IconButton
//                       size="s"
//                       mode="outline"
//                       onClick={handleCopyAuctionLink}
//                       title={t("copyAuctionLink")}
//                       style={{
//                         backgroundColor: "#333",
//                         borderColor: "#555",
//                         color: "white",
//                         padding: "4px 8px",
//                         fontSize: "10px",
//                       }}
//                     >
//                       📋
//                     </IconButton>
//                     <IconButton
//                       size="s"
//                       mode="outline"
//                       onClick={handleShareAuction}
//                       title={t("shareAuction")}
//                       style={{
//                         backgroundColor: "#333",
//                         borderColor: "#555",
//                         color: "white",
//                         padding: "4px 8px",
//                         fontSize: "10px",
//                       }}
//                     >
//                       🔗
//                     </IconButton>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </Card>
//         )}

//         {/* SBT CARD */}
//         {hasChecked && sbtSubdomainInfo && activeTab === "sbt" && (
//           <Card
//             style={{
//               background: sbtSubdomainInfo.isTaken
//                 ? "linear-gradient(to bottom, #2a1a1a, #3a2a2a)"
//                 : "linear-gradient(to bottom, #1a2a1a, #2a3a2a)",
//               marginBottom: "20px",
//               padding: "15px",
//               borderRadius: "10px",
//               width: "280px",
//               border: sbtSubdomainInfo.isTaken
//                 ? "2px solid #f87171"
//                 : "2px solid #4a90e2",
//             }}
//           >
//             <div style={{ color: "#fff", fontSize: "14px" }}>
//               <div
//                 style={{
//                   marginBottom: "10px",
//                   textAlign: "center",
//                   color: sbtSubdomainInfo.isTaken ? "#f87171" : "#4a90e2",
//                   fontWeight: "bold",
//                 }}
//               >
//                 {sbtSubdomainInfo.isTaken
//                   ? `❌ ${t("sbtSubdomainAlreadyTaken")}`
//                   : `✅ ${t("sbtSubdomainAvailable")}`}
//               </div>
//               <div
//                 style={{
//                   width: "100%",
//                   display: "flex",
//                   justifyContent: "center",
//                   alignItems: "center",
//                 }}
//               >
//                 <img
//                   style={{
//                     width: "200px",
//                     height: "200px",
//                     borderRadius: "25px",
//                     marginBottom: "15px",
//                   }}
//                   src={getImageUrl()}
//                   alt="subdomainImage"
//                 />
//               </div>
//               {sbtSubdomainInfo.isTaken && sbtSubdomainInfo.ownerAddress && (
//                 <>
//                   <div style={{ marginBottom: "10px" }}>
//                     <strong>{t("sbtOwner")}:</strong>
//                     <br />
//                     <code style={{ fontSize: "12px", wordBreak: "break-all" }}>
//                       <a
//                         style={{ color: "white" }}
//                         href={`https://tonviewer.com/${sbtSubdomainInfo.ownerAddress}`}
//                         target="_blank"
//                         rel="noopener noreferrer"
//                       >
//                         {sbtSubdomainInfo.ownerAddress}
//                       </a>
//                     </code>
//                   </div>
//                   {sbtSubdomainInfo.nftAddress && (
//                     <div style={{ marginBottom: "10px" }}>
//                       <strong>NFT Address:</strong>
//                       <br />
//                       <code
//                         style={{ fontSize: "12px", wordBreak: "break-all" }}
//                       >
//                         <a
//                           style={{ color: "white" }}
//                           href={`https://tonviewer.com/${sbtSubdomainInfo.nftAddress}`}
//                           target="_blank"
//                           rel="noopener noreferrer"
//                         >
//                           {sbtSubdomainInfo.nftAddress}
//                         </a>
//                       </code>
//                     </div>
//                   )}
//                   {sbtSubdomainInfo.timestamp && (
//                     <div style={{ marginBottom: "10px" }}>
//                       <strong>{t("created")}:</strong>{" "}
//                       {new Date(
//                         sbtSubdomainInfo.timestamp * 1000
//                       ).toLocaleString()}
//                     </div>
//                   )}
//                 </>
//               )}
//               {!sbtSubdomainInfo.isTaken && (
//                 <div
//                   style={{
//                     marginTop: "10px",
//                     padding: "8px",
//                     background: "rgba(74, 144, 226, 0.1)",
//                     borderRadius: "5px",
//                     fontSize: "12px",
//                     color: "#ccc",
//                     textAlign: "center",
//                   }}
//                 >
//                   {t("sbtForPersonalUse")} • {t("buyFor1TON")}
//                 </div>
//               )}
//               <div
//                 style={{
//                   marginTop: "10px",
//                   paddingTop: "10px",
//                   borderTop: "1px solid #444",
//                   fontSize: "11px",
//                   color: "#aaa",
//                 }}
//               >
//                 <strong>{t("networkLabel")}</strong>{" "}
//                 {isTestnet ? t("testnet") : t("mainnet")}
//               </div>
//             </div>
//           </Card>
//         )}

//         {/* FREE SUBDOMAIN */}
//         {hasChecked && !auctionInfo && !sbtSubdomainInfo && (
//           <Card
//             style={{
//               background:
//                 activeTab === "sbt"
//                   ? "linear-gradient(to bottom, #1a2a1a, #2a2a2a)"
//                   : "linear-gradient(to bottom, #2a1a1a, #2a2a1a)",
//               marginBottom: "20px",
//               padding: "15px",
//               borderRadius: "10px",
//               width: "280px",
//               border:
//                 activeTab === "sbt" ? "2px solid #4a90e2" : "2px solid #4ade80",
//             }}
//           >
//             <div
//               style={{ color: "#fff", fontSize: "14px", textAlign: "center" }}
//             >
//               <div
//                 style={{
//                   marginBottom: "10px",
//                   color: activeTab === "sbt" ? "#4a90e2" : "#4ade80",
//                   fontWeight: "bold",
//                 }}
//               >
//                 {activeTab === "sbt"
//                   ? sbtPurchaseCompleted
//                     ? `✅ ${t("sbtSubdomainPurchased")}`
//                     : `✅ ${t("sbtSubdomainAvailable")}`
//                   : `✅ ${t("subdomainAvailable")}`}
//               </div>
//               <div
//                 style={{
//                   width: "100%",
//                   display: "flex",
//                   justifyContent: "center",
//                   alignItems: "center",
//                 }}
//               >
//                 <img
//                   style={{
//                     width: "200px",
//                     height: "200px",
//                     borderRadius: "25px",
//                     marginBottom: "15px",
//                   }}
//                   src={getImageUrl()}
//                   alt="subdomainImage"
//                 />
//               </div>
//               <div style={{ color: "#ccc", fontSize: "13px" }}>
//                 {activeTab === "sbt"
//                   ? sbtPurchaseCompleted
//                     ? t("sbtSubdomainPurchased")
//                     : t("sbtForPersonalUse")
//                   : t("makeFirstBid")}
//               </div>
//               <div
//                 style={{
//                   marginTop: "10px",
//                   paddingTop: "10px",
//                   borderTop: "1px solid #444",
//                   display: "flex",
//                   justifyContent: "space-between",
//                   alignItems: "center",
//                 }}
//               >
//                 <div style={{ fontSize: "11px", color: "#aaa" }}>
//                   <strong>{t("networkLabel")}</strong>{" "}
//                   {isTestnet ? t("testnet") : t("mainnet")}
//                 </div>
//                 {activeTab === "proxy" && (
//                   <div style={{ display: "flex", gap: "8px" }}>
//                     <IconButton
//                       size="s"
//                       mode="outline"
//                       onClick={handleCopyAuctionLink}
//                       title={t("copyAuctionLink")}
//                       style={{
//                         backgroundColor: "#333",
//                         borderColor: "#555",
//                         color: "white",
//                         padding: "4px 8px",
//                         fontSize: "10px",
//                       }}
//                     >
//                       📋
//                     </IconButton>
//                     <IconButton
//                       size="s"
//                       mode="outline"
//                       onClick={handleShareAuction}
//                       title={t("shareAuction")}
//                       style={{
//                         backgroundColor: "#333",
//                         borderColor: "#555",
//                         color: "white",
//                         padding: "4px 8px",
//                         fontSize: "10px",
//                       }}
//                     >
//                       🔗
//                     </IconButton>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </Card>
//         )}

//         {/* TIMER */}
//         {activeTab === "proxy" && (
//           <Card
//             style={{
//               background: "linear-gradient(to bottom, black, gray)",
//               marginBottom: "20px",
//               padding: "5px 5px 20px 5px",
//               borderRadius: "10px",
//               display: "flex",
//               flexDirection: "column",
//               alignItems: "center",
//               gap: "10px",
//               width: "min-content",
//             }}
//           >
//             <FlipTimer
//               auctionData={auctionInfo}
//               defaultTime={hasChecked && !auctionInfo ? 86400 : undefined}
//               onComplete={() => console.log("Аукцион завершен!")}
//             />
//             <div style={{ fontSize: "11px", color: "#aaa" }}>
//               {t("networkLabel")} {isTestnet ? t("testnet") : t("mainnet")}
//             </div>
//           </Card>
//         )}

//         {/* BID SELECT */}
//         {hasChecked &&
//           auctionInfo &&
//           auctionInfo.isActive &&
//           activeTab === "proxy" && (
//             <>
//               <div style={{ position: "relative", width: "200px" }}>
//                 <select
//                   value={showCustomInput ? "custom" : customBidAmount}
//                   onChange={handleBidSelectChange}
//                   style={{
//                     width: "200px",
//                     borderRadius: "25px",
//                     padding: "10px 15px",
//                     fontSize: "14px",
//                   }}
//                 >
//                   <option value="">{`${t("price")}: Min. ${(
//                     calculateBidPrice / 1_000_000_000
//                   ).toFixed(2)} TON`}</option>
//                   <option value="custom">{t("enterValue")}</option>
//                   <option value="10">10 TON</option>
//                   <option value="20">20 TON</option>
//                   <option value="50">50 TON</option>
//                   <option value="100">100 TON</option>
//                   <option value="500">500 TON</option>
//                 </select>
//               </div>
//               {showCustomInput && (
//                 <div style={{ position: "relative", width: "200px" }}>
//                   <Input
//                     placeholder={t("yourBid")}
//                     value={manualBidValue}
//                     onChange={(e) => handleManualBidChange(e.target.value)}
//                     style={{
//                       width: "200px",
//                       borderRadius: "25px",
//                       padding: "10px 15px",
//                       fontSize: "24px",
//                       fontWeight: "600",
//                       marginLeft: "20px",
//                     }}
//                   />
//                 </div>
//               )}
//             </>
//           )}

//         {/* Шаг 3: ACTION BUTTON */}
//         {hasChecked && getActionButtonText() && (
//           <div style={{ position: "relative", width: "280px" }}>
//             <div
//               style={{
//                 position: "absolute",
//                 left: "-30px",
//                 top: "50%",
//                 transform: "translateY(-50%)",
//                 fontSize: "18px",
//                 fontWeight: "bold",
//                 color: isDark ? "white" : "black",
//               }}
//             >
//               3
//             </div>
//             <Button
//               onClick={getActionButtonHandler()}
//               disabled={getActionButtonDisabled()}
//               style={{
//                 width: "280px",
//                 borderRadius: "25px",
//                 padding: "10px 15px",
//                 backgroundColor: getActionButtonColor(),
//                 marginBottom:
//                   activeTab === "proxy" &&
//                   auctionInfo &&
//                   !auctionInfo.isActive &&
//                   !canClaim
//                     ? "10px"
//                     : "0",
//                 display: getActionButtonText() ? "block" : "none",
//               }}
//             >
//               {getActionButtonText()}
//             </Button>
//           </div>
//         )}

//         {/* Шаг 4: MARKETPLACE */}
//         {hasChecked &&
//           auctionInfo &&
//           !auctionInfo.isActive &&
//           !canClaim &&
//           activeTab === "proxy" && (
//             <div style={{ position: "relative", width: "280px" }}>
//               <div
//                 style={{
//                   position: "absolute",
//                   left: "-30px",
//                   top: "50%",
//                   transform: "translateY(-50%)",
//                   fontSize: "18px",
//                   fontWeight: "bold",
//                   color: isDark ? "white" : "black",
//                 }}
//               >
//                 4
//               </div>
//               <a
//                 href={marketplaceUrl}
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 style={{
//                   display: "block",
//                   width: "280px",
//                   borderRadius: "25px",
//                   padding: "11.75px 15px",
//                   backgroundColor: "#6366f1",
//                   color: "white",
//                   textDecoration: "none",
//                   textAlign: "center",
//                   fontWeight: "bold",
//                   cursor: "pointer",
//                   border: "none",
//                 }}
//               >
//                 🛍️ {t("viewOnMarketplace")}
//               </a>
//             </div>
//           )}

//         {/* Шаг 4: Создать сайт */}
//         {(sbtPurchaseCompleted ||
//           (auctionInfo && !auctionInfo.isActive && canClaim)) && (
//           <div style={{ position: "relative", width: "280px" }}>
//             <div
//               style={{
//                 position: "absolute",
//                 left: "-30px",
//                 top: "50%",
//                 transform: "translateY(-50%)",
//                 fontSize: "18px",
//                 fontWeight: "bold",
//                 color: isDark ? "white" : "black",
//               }}
//             >
//               4
//             </div>
//             <a
//               href="https://t.me/Ton_site_builder_bot?startapp"
//               target="_blank"
//               rel="noopener noreferrer"
//               style={{
//                 display: "block",
//                 width: "280px",
//                 borderRadius: "25px",
//                 padding: "11.75px 15px",
//                 background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
//                 color: "white",
//                 textDecoration: "none",
//                 textAlign: "center",
//                 fontWeight: "bold",
//                 cursor: "pointer",
//                 border: "none",
//                 fontSize: "14px",
//               }}
//             >
//               🏗️ Создать сайт на {subDomainName}.{selectedDomainZone}
//             </a>
//           </div>
//         )}
//       </List>
//     </Page>
//   );
// };

// export default AuctionPage;

// src/pages/AuctionPage/index.tsx
// === ФИНАЛЬНАЯ ВЕРСИЯ (v8 — БЕЗ getUserSbtSubdomainsCount) ===
// Исправления:
// 1) Убраны loadUserSbtSubdomainsCount, sbtZonesCount, getUserSbtSubdomainsCount
// 2) isTestnet и sbtZonesCount убраны из передачи в AuctionCollectionSelector
// 3) Количество субдоменов берётся из zone.subdomainsAmount (item_count)

// src/pages/AuctionPage/index.tsx
// === ФИНАЛЬНАЯ ВЕРСИЯ (v9 — КОСТЫЛИ НА ЗОНЫ + subdomainsAmount) ===
// Исправления:
// 1) Костыль-фильтр в allProxyZones: выкидываем пустые, "*", "pseudonym"
// 2) subdomainsAmount из zone передаётся в CustomZoneSelector через sbtZonesCount
//    (используем существующий пропс как «предзагруженные количества»)
// 3) isTestnet и getUserSbtSubdomainsCount полностью убран

// import React, {
//   useState,
//   useCallback,
//   useMemo,
//   useEffect,
//   useRef,
// } from "react";
// import {
//   Banner,
//   Button,
//   Card,
//   Input,
//   List,
//   IconButton,
// } from "@telegram-apps/telegram-ui";
// import { useTonWallet, useTonAddress } from "@tonconnect/ui-react";
// import { useTonConnectUI } from "@tonconnect/ui-react";
// import TonWeb from "tonweb";
// import { Address } from "ton-core";
// import Box from "@mui/material/Box";
// import Tabs from "@mui/material/Tabs";
// import Tab from "@mui/material/Tab";

// import { useTypedDispatch } from "../../hooks/useTypeDispatch";
// import { Page } from "@/components/Page";
// import { ShowSnackbar } from "@/components/ShowSnackbar";
// import { claimSubdomain } from "@/store/nft/actions";
// import FlipTimer from "./flipTimer/FlipTimer";
// import { getAuctionInfo, ParsedAuctionInfo } from "./flipTimer/getAuctionInfo";
// import { useLanguage } from "@/contexts/LanguageContext";
// import { useTheme } from "@/contexts/ThemeContext";
// import { useUser } from "@/contexts/UserContext";
// import { apiService, Subdomain, Zone } from "@/services/api";

// import { checkSBTSubdomain, SBTSubdomainInfo } from "./checkSBTSubdomain";
// import { calculateProxyNFTAddress } from "./CalculateProxyNFTAddress";

// // ====== ONCHAIN ======
// import { useBlockchainItems } from "@/services/blockchainItems/blockchain-items-context.tsx";
// import { SimpleCollection } from "@/services/blockchainItems/blockchain-items-types";

// import ActiveAuctions from "@/components/ActiveAuctions/ActiveAuctions";
// import { useAuctionIntegration } from "@/hooks/useAuctionIntegration";

// import {
//   getAuctionParamsFromUrl,
//   updateAuctionUrl,
//   copyAuctionUrlToClipboard,
//   shareAuction,
//   isAuctionPage,
//   clearAuctionUrl,
// } from "@/utils/urlParams";

// import { useLaunchParams } from "@telegram-apps/sdk-react";
// import { MiniAppLinks } from "@/utils/miniAppLinks";
// import { AuctionCollectionSelector } from "./AuctionCollectionSelector";
// import { convertUserFriendlyToRaw } from "@/utils/tonUtils";

// // ====== ТИПЫ =====

// type CollectionAddressMap = {
//   [key: string]: string;
// };

// type ActiveTab = "proxy" | "sbt";

// const mapPrices: Record<number, number> = {
//   1: 30,
//   2: 20,
//   3: 10,
//   4: 5,
//   5: 2.5,
//   6: 1,
// };

// const API_PAYLOAD_URL = import.meta.env.VITE_API_SC_PAYLOAD_URL;

// const normalizeAddress = (addr: string): string => {
//   if (!addr) return "";
//   try {
//     const address = Address.parse(addr);
//     return address.toString({ bounceable: true, testOnly: false });
//   } catch (error) {
//     console.error("Error parsing address:", addr, error);
//     return addr;
//   }
// };

// // ====== ДЕДУПЛИКАЦИЯ С ПРИОРИТЕТОМ PROXY > SBT ======
// const dedupeSbtAgainstProxy = (
//   sbtZones: Zone[],
//   proxyZones: Zone[]
// ): Zone[] => {
//   const proxyNames = new Set(proxyZones.map((z) => z.name));
//   const sbtMap = new Map<string, Zone>();
//   for (const z of sbtZones) {
//     const exist = sbtMap.get(z.name);
//     if (!exist || new Date(z.createdAt) > new Date(exist.createdAt)) {
//       sbtMap.set(z.name, z);
//     }
//   }
//   return [...sbtMap.values()].filter((z) => !proxyNames.has(z.name));
// };

// // ====== collectionToZone — ТОЧНАЯ КОПИЯ ИЗ ProfileWidget =====
// const collectionToZone = (col: SimpleCollection): Zone => {
//   const rawName = col.name || "";
//   const zoneName = rawName
//     .replace(" DNS Domains", "")
//     .replace(" Proxy Domains", "")
//     .toLowerCase();
//   return {
//     id: col.address.slice(0, 10),
//     name: zoneName.endsWith(".ton") ? zoneName : `${zoneName}.ton`,
//     address: col.address,
//     owner: col.creator_address || col.owner_address,
//     collectionAddress: col.address,
//     createdAt: col.created_at || col.lastUpdated || new Date().toISOString(),
//     subdomainsAmount: col.item_count || 0,
//     proxy: col.type === "proxy" ? 1 : 0,
//     status: "active",
//     image: col.metadata?.token_info?.[0]?.image || col.image,
//     description: col.metadata?.token_info?.[0]?.description || col.description,
//     zoneLength: zoneName.length,
//   } as any as Zone;
// };

// const dedupeByLatest = (cols: SimpleCollection[]): SimpleCollection[] => {
//   const map = new Map<string, SimpleCollection>();
//   for (const c of cols) {
//     const key = (c.name || "").toLowerCase();
//     const exist = map.get(key);
//     if (
//       !exist ||
//       new Date(c.created_at || c.lastUpdated || 0) >
//         new Date(exist.created_at || exist.lastUpdated || 0)
//     ) {
//       map.set(key, c);
//     }
//   }
//   return [...map.values()];
// };

// // ====== КОСТЫЛЬ: список зон, которые НЕ показываем в селекте ======
// const EXCLUDED_ZONE_NAMES = new Set([
//   ".ton", // пустое имя → .ton
//   "*.ton", // wildcard
//   "pseudonym.ton", // нежелательная
//   "мистика.ton", // если есть кириллические
// ]);

// // ====================================================================
// // КОМПОНЕНТ
// // ====================================================================

// export const AuctionPage: React.FC<{}> = () => {
//   const dispatch = useTypedDispatch();
//   const wallet = useTonWallet();
//   const userAddress = useTonAddress();
//   const [tonConnectUI] = useTonConnectUI();
//   const { refreshSubdomains } = useUser();

//   const [sbtSubdomainInfo, setSbtSubdomainInfo] =
//     useState<SBTSubdomainInfo | null>(null);

//   const { currentTheme } = useTheme();
//   const isDark = currentTheme === "dark";
//   const { t } = useLanguage();

//   const [activeTab, setActiveTab] = useState<ActiveTab>("proxy");
//   const [selectedDomainZone, setSelectedDomainZone] = useState("");
//   const [subDomainName, setSubDomainName] = useState("");
//   const [collectionAddress, setCollectionAddress] = useState("");
//   const [snackbar, setSnackbar] = useState<JSX.Element | null>(null);
//   const [auctionInfo, setAuctionInfo] = useState<ParsedAuctionInfo | null>(
//     null
//   );
//   const [isLoading, setIsLoading] = useState(false);
//   const [nftAddress, setNftAddress] = useState("");
//   const [hasChecked, setHasChecked] = useState(false);
//   const [isClaimLoading, setIsClaimLoading] = useState(false);
//   const [customBidAmount, setCustomBidAmount] = useState("");
//   const [showCustomInput, setShowCustomInput] = useState(false);
//   const [manualBidValue, setManualBidValue] = useState("");
//   const [sbtPurchaseCompleted, setSbtPurchaseCompleted] = useState(false);
//   const [sbtLoading, setSbtLoading] = useState(false);

//   const prevSbtMapRef = useRef<{
//     cacheKey: string;
//     map: CollectionAddressMap;
//   } | null>(null);

//   const isTestnet = wallet?.account?.chain === "-3";
//   const launchParams = useLaunchParams();
//   const [, setOpenedViaDeeplink] = useState(false);

//   // ====== ONCHAIN ДАННЫЕ ======
//   const {
//     proxyCollections,
//     sbtCollections,
//     loadAllData,
//     isLoading: zonesLoading,
//     error: zonesError,
//   } = useBlockchainItems();

//   // ====== ВСЕ PROXY КОЛЛЕКЦИИ (для селекта) + КОСТЫЛЬ-ФИЛЬТР ======
//   const allProxyZones: Zone[] = useMemo(
//     () =>
//       dedupeByLatest(proxyCollections)
//         .map((c) => collectionToZone(c))
//         .filter(
//           (z) =>
//             !EXCLUDED_ZONE_NAMES.has(z.name) &&
//             z.name !== ".ton" &&
//             !z.name.startsWith("*")
//         ),
//     [proxyCollections]
//   );

//   // ====== SBT ЗОНЫ ТОЛЬКО ЮЗЕРА ======
//   const userSbtZones: Zone[] = useMemo(() => {
//     if (!userAddress) return [];
//     const normalizedAddress =
//       convertUserFriendlyToRaw(userAddress).toLowerCase();
//     const rawSbt = sbtCollections
//       .filter((col) => {
//         const creator = (
//           col.creator_address ||
//           col.owner_address ||
//           ""
//         ).toLowerCase();
//         return creator === normalizedAddress;
//       })
//       .map((col) => collectionToZone(col));
//     return dedupeSbtAgainstProxy(rawSbt, allProxyZones);
//   }, [userAddress, sbtCollections, allProxyZones]);

//   const activeSbtZones: Zone[] = useMemo(
//     () => userSbtZones.filter((zone) => zone.status !== "inactive"),
//     [userSbtZones]
//   );

//   const allZones: Zone[] = useMemo(
//     () => [...allProxyZones, ...userSbtZones],
//     [allProxyZones, userSbtZones]
//   );

//   // ====== ПРЕДЗАГРУЖЕННЫЕ КОЛИЧЕСТВА СУБДОМЕНОВ (из item_count) ======
//   // Передаём в CustomZoneSelector как sbtZonesCount — для режима SBT
//   const sbtZonesCountFromItemCount: Record<string, number> = useMemo(() => {
//     const map: Record<string, number> = {};
//     for (const z of activeSbtZones) {
//       map[z.name] = z.subdomainsAmount || 0;
//     }
//     return map;
//   }, [activeSbtZones]);

//   // ====== УСТРАНЕНИЕ ПЕТЛИ apiService.setNetwork ======
//   const prevNetworkRef = useRef<boolean | null>(null);
//   useEffect(() => {
//     if (wallet && prevNetworkRef.current !== isTestnet) {
//       prevNetworkRef.current = isTestnet;
//       apiService.setNetwork(isTestnet);
//     }
//   }, [wallet, isTestnet]);

//   const isProxyZone = useCallback((zone: any): boolean => {
//     const proxyValue = zone.proxy;
//     if (typeof proxyValue === "number") return proxyValue === 1;
//     if (typeof proxyValue === "string")
//       return proxyValue.toLowerCase() === "proxy" || proxyValue === "1";
//     return false;
//   }, []);

//   const proxyCollectionAddressesMap = useMemo(() => {
//     const map: CollectionAddressMap = {};
//     allZones.forEach((zone) => {
//       if (isProxyZone(zone) && zone.name && zone.collectionAddress)
//         map[zone.name] = zone.collectionAddress;
//     });
//     return map;
//   }, [allZones, isProxyZone]);

//   const sbtCollectionAddressesMap = useMemo(() => {
//     const cacheKey = activeSbtZones
//       .map((z) => `${z.name}|${z.collectionAddress}`)
//       .sort()
//       .join(";");
//     if (prevSbtMapRef.current && prevSbtMapRef.current.cacheKey === cacheKey)
//       return prevSbtMapRef.current.map;
//     const map: CollectionAddressMap = {};
//     activeSbtZones.forEach((z) => {
//       if (z.name && z.collectionAddress) map[z.name] = z.collectionAddress;
//     });
//     prevSbtMapRef.current = { cacheKey, map };
//     return map;
//   }, [activeSbtZones]);

//   const currentCollectionMap = useMemo(
//     () =>
//       activeTab === "proxy"
//         ? proxyCollectionAddressesMap
//         : sbtCollectionAddressesMap,
//     [activeTab, proxyCollectionAddressesMap, sbtCollectionAddressesMap]
//   );

//   useEffect(() => {
//     if (selectedDomainZone && !collectionAddress && allZones.length > 0) {
//       const zone = allZones.find((z) => z.name === selectedDomainZone);
//       if (zone?.collectionAddress) {
//         setCollectionAddress(zone.collectionAddress);
//       } else {
//         const addr = currentCollectionMap[selectedDomainZone];
//         if (addr) setCollectionAddress(addr);
//       }
//     }
//   }, [selectedDomainZone, collectionAddress, allZones, currentCollectionMap]);

//   const domainZoneName = useMemo(() => {
//     if (!selectedDomainZone) return "";
//     return selectedDomainZone.split(".")[0];
//   }, [selectedDomainZone]);

//   const calculateDomainPrice = useMemo(() => {
//     if (activeTab === "sbt") return 500_000_000;
//     const len = subDomainName.length;
//     return Math.floor((mapPrices[len] || 0.5) * 1_000_000_000);
//   }, [subDomainName, activeTab]);

//   const calculateBidPrice = useMemo(() => {
//     if (activeTab === "sbt" || !auctionInfo) return 0;
//     if (customBidAmount && !isNaN(Number(customBidAmount)))
//       return Math.floor(Number(customBidAmount) * 1_000_000_000);
//     const maxBid = Number(auctionInfo.maxBid);
//     return maxBid + Math.ceil(maxBid * 0.05);
//   }, [auctionInfo, customBidAmount, activeTab]);

//   const canClaim = useMemo(() => {
//     if (activeTab === "sbt" || !auctionInfo || !userAddress) return false;
//     try {
//       if (auctionInfo.maxBidderOwner === null) return false;
//       return (
//         !auctionInfo.isActive &&
//         normalizeAddress(auctionInfo.maxBidderOwner) ===
//           normalizeAddress(userAddress)
//       );
//     } catch {
//       return false;
//     }
//   }, [auctionInfo, userAddress, activeTab]);

//   const marketplaceUrl = useMemo(() => {
//     if (activeTab === "sbt" || !nftAddress || !collectionAddress) return "";
//     const base = isTestnet
//       ? "https://testnet.getgems.io"
//       : "https://getgems.io";
//     return `${base}/collection/${collectionAddress}/${nftAddress}`;
//   }, [nftAddress, collectionAddress, isTestnet, activeTab]);

//   const showSnackbar = useCallback(
//     (message: string, type: "success" | "error" = "success") => {
//       setSnackbar(
//         <ShowSnackbar
//           message={message}
//           type={type}
//           onClose={() => setSnackbar(null)}
//         />
//       );
//     },
//     []
//   );

//   const updateUrlWithCurrentAuction = useCallback(() => {
//     if (selectedDomainZone && subDomainName && activeTab === "proxy") {
//       updateAuctionUrl({ zone: selectedDomainZone, subdomain: subDomainName });
//     }
//   }, [selectedDomainZone, subDomainName, activeTab]);

//   const handleCopyAuctionLink = useCallback(async () => {
//     if (!selectedDomainZone || !subDomainName) {
//       showSnackbar(t("selectZoneAndSubdomainFirst"), "error");
//       return;
//     }
//     const success = await copyAuctionUrlToClipboard({
//       zone: selectedDomainZone,
//       subdomain: subDomainName,
//     });
//     if (success) showSnackbar(t("auctionLinkCopied"), "success");
//     else showSnackbar(t("failedToCopyLink"), "error");
//   }, [selectedDomainZone, subDomainName, showSnackbar, t]);

//   const handleShareAuction = useCallback(async () => {
//     if (!selectedDomainZone || !subDomainName) {
//       showSnackbar(t("selectZoneAndSubdomainFirst"), "error");
//       return;
//     }
//     const success = await shareAuction({
//       zone: selectedDomainZone,
//       subdomain: subDomainName,
//     });
//     if (!success) await handleCopyAuctionLink();
//   }, [selectedDomainZone, subDomainName, showSnackbar, handleCopyAuctionLink]);

//   useEffect(() => {
//     const sp = launchParams.startParam;
//     if (sp) setOpenedViaDeeplink(true);
//   }, [launchParams.startParam]);

//   useEffect(() => {
//     const hasUrlParams = isAuctionPage();
//     const hasDeeplink = !!launchParams.startParam;
//     if ((hasUrlParams || hasDeeplink) && allZones.length === 0) return;
//     if (hasDeeplink) {
//       const sp = launchParams.startParam!;
//       try {
//         const { route, params } = MiniAppLinks.parseStartapp(sp);
//         if (route === "/add-subdomain" && params.zone && params.subdomain)
//           loadAuctionFromParams(params.zone, params.subdomain);
//       } catch (e) {
//         console.error("deeplink parse error:", e);
//       }
//     } else if (hasUrlParams) {
//       const p = getAuctionParamsFromUrl();
//       if (p.zone && p.subdomain) loadAuctionFromParams(p.zone, p.subdomain);
//     }
//     // eslint-disable-next-line
//   }, [allZones, launchParams.startParam]);

//   // ====== ПРОВЕРКА ИТЕМА ======
//   const handleCheckItem = useCallback(async () => {
//     if (!selectedDomainZone || !subDomainName || !collectionAddress) {
//       showSnackbar(t("pleaseEnterDomainName"), "error");
//       return;
//     }
//     if (!/^[a-z0-9-]+$/.test(subDomainName)) {
//       showSnackbar(t("subdomainInvalidCharsError"), "error");
//       return;
//     }
//     setIsLoading(true);
//     setHasChecked(false);
//     const lowerValue = subDomainName.toLowerCase();
//     if (activeTab === "sbt") {
//       const sbtInfo = await checkSBTSubdomain(
//         lowerValue,
//         collectionAddress,
//         isTestnet
//       );
//       if (sbtInfo) {
//         setSbtSubdomainInfo(sbtInfo);
//         setAuctionInfo(null);
//         setNftAddress(sbtInfo.nftAddress || "");
//         showSnackbar(
//           sbtInfo.isTaken
//             ? t("sbtSubdomainAlreadyTaken")
//             : t("sbtSubdomainAvailable"),
//           sbtInfo.isTaken ? "error" : "success"
//         );
//       } else {
//         setSbtSubdomainInfo(null);
//         setAuctionInfo(null);
//         setNftAddress("");
//         showSnackbar(t("checkingAvailability"), "error");
//       }
//     } else {
//       const info = await getAuctionInfo(
//         lowerValue,
//         collectionAddress,
//         isTestnet
//       );
//       if (info) {
//         setAuctionInfo(info);
//         setSbtSubdomainInfo(null);
//         setNftAddress(info.nftAddress || "");
//         showSnackbar(t("auctionInfoLoaded"), "success");
//         if (activeTab === "proxy") updateUrlWithCurrentAuction();
//       } else {
//         setAuctionInfo(null);
//         setSbtSubdomainInfo(null);
//         const proxyNFTAddress = await calculateProxyNFTAddress(
//           lowerValue,
//           collectionAddress,
//           isTestnet
//         );
//         if (proxyNFTAddress) {
//           setNftAddress(proxyNFTAddress);
//           showSnackbar(t("subdomainAvailableForFirstBid"), "success");
//         } else {
//           setNftAddress("");
//           showSnackbar(t("failedToCalculateNFTAddress"), "error");
//         }
//         if (activeTab === "proxy") updateUrlWithCurrentAuction();
//       }
//     }
//     setHasChecked(true);
//     setIsLoading(false);
//   }, [
//     selectedDomainZone,
//     subDomainName,
//     collectionAddress,
//     isTestnet,
//     t,
//     activeTab,
//     updateUrlWithCurrentAuction,
//     showSnackbar,
//   ]);

//   const loadAuctionFromParams = useCallback(
//     (zoneName: string, subdomainName: string) => {
//       setOpenedViaDeeplink(true);
//       setActiveTab("proxy");
//       setSelectedDomainZone(zoneName);
//       setSubDomainName(subdomainName);
//       const zone = allZones.find((z) => z.name === zoneName);
//       if (zone?.collectionAddress) setCollectionAddress(zone.collectionAddress);
//       updateUrlWithCurrentAuction();
//       setTimeout(() => handleCheckItem(), 500);
//     },
//     [allZones, handleCheckItem, updateUrlWithCurrentAuction]
//   );

//   const handleTabChange = (
//     _event: React.SyntheticEvent,
//     newValue: ActiveTab
//   ) => {
//     setActiveTab(newValue);
//     setSelectedDomainZone("");
//     setSubDomainName("");
//     setCollectionAddress("");
//     setAuctionInfo(null);
//     setNftAddress("");
//     setHasChecked(false);
//     setCustomBidAmount("");
//     setShowCustomInput(false);
//     setManualBidValue("");
//     setSbtPurchaseCompleted(false);
//     setOpenedViaDeeplink(false);
//     if (newValue === "sbt") clearAuctionUrl();
//   };

//   const checkItemByName = useCallback(
//     async (zoneName: string, subdomain: string) => {
//       setAuctionInfo(null);
//       setNftAddress("");
//       setHasChecked(false);
//       setCustomBidAmount("");
//       setShowCustomInput(false);
//       setManualBidValue("");
//       setSbtPurchaseCompleted(false);
//       setSelectedDomainZone(zoneName);
//       setSubDomainName(subdomain);
//       const zone = allZones.find((z) => z.name === zoneName);
//       setCollectionAddress(zone?.collectionAddress || "");
//       await new Promise((r) => setTimeout(r, 100));
//       await handleCheckItem();
//     },
//     [allZones, handleCheckItem]
//   );

//   const { handleAuctionClick, setSelectedZoneName, setSubdomainName } =
//     useAuctionIntegration({ zones: allZones, checkItem: checkItemByName });

//   const handleAuctionClickFromComponent = useCallback(
//     (zoneName: string, subdomainName: string) => {
//       handleAuctionClick(zoneName, subdomainName);
//       if (activeTab === "proxy") updateUrlWithCurrentAuction();
//     },
//     [handleAuctionClick, activeTab, updateUrlWithCurrentAuction]
//   );

//   const setupCollectionAddressForZone = useCallback(
//     (zoneName: string) => {
//       if (!zoneName) return false;
//       const zone = allZones.find((z) => z.name === zoneName);
//       if (zone?.collectionAddress) {
//         setCollectionAddress(zone.collectionAddress);
//         return true;
//       }
//       const a = currentCollectionMap[zoneName];
//       if (a) {
//         setCollectionAddress(a);
//         return true;
//       }
//       return false;
//     },
//     [allZones, currentCollectionMap]
//   );

//   const handleDomainZoneChangeForSelector = useCallback(
//     (value: string) => {
//       setSelectedDomainZone(value);
//       setOpenedViaDeeplink(false);
//       setSelectedZoneName(value);
//       setAuctionInfo(null);
//       setNftAddress("");
//       setHasChecked(false);
//       setCustomBidAmount("");
//       setShowCustomInput(false);
//       setManualBidValue("");
//       setSbtPurchaseCompleted(false);
//       setupCollectionAddressForZone(value);
//       if (value && subDomainName && activeTab === "proxy")
//         updateUrlWithCurrentAuction();
//     },
//     [
//       setSelectedZoneName,
//       setupCollectionAddressForZone,
//       subDomainName,
//       activeTab,
//       updateUrlWithCurrentAuction,
//     ]
//   );

//   const handleSubDomainNameChange = useCallback(
//     (value: string) => {
//       setSubDomainName(value.toLowerCase());
//       setSubdomainName(value.toLowerCase());
//       setAuctionInfo(null);
//       setNftAddress("");
//       setHasChecked(false);
//       setCustomBidAmount("");
//       setShowCustomInput(false);
//       setManualBidValue("");
//       setSbtPurchaseCompleted(false);
//       if (selectedDomainZone && value && activeTab === "proxy")
//         updateUrlWithCurrentAuction();
//     },
//     [
//       setSubdomainName,
//       selectedDomainZone,
//       activeTab,
//       updateUrlWithCurrentAuction,
//     ]
//   );

//   const handleBidSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     const v = e.target.value;
//     if (v === "custom") {
//       setShowCustomInput(true);
//       setCustomBidAmount("");
//       setManualBidValue("");
//     } else {
//       setShowCustomInput(false);
//       setCustomBidAmount(v);
//       setManualBidValue("");
//     }
//   };

//   const handleManualBidChange = (value: string) => {
//     setManualBidValue(value);
//     setCustomBidAmount(value && !isNaN(Number(value)) ? value : "");
//   };

//   const getValidUntil = (): number => Math.floor(Date.now() / 1000) + 120;

//   const logTx = (label: string, msgs: any[]) => {
//     console.log(
//       `📦 [${label}] Тело транзакции:`,
//       JSON.stringify(
//         {
//           validUntil: getValidUntil(),
//           messages: msgs.map((m) => ({
//             amount: m.amount,
//             address: m.address,
//             payload: m.payload || "(none)",
//           })),
//         },
//         null,
//         2
//       )
//     );
//   };

//   // ====== API (БД) ======
//   const createSubdomainIfNotExists = async (subdomainData: {
//     name: string;
//     address: string;
//     mintPrice: number;
//     links?: string[];
//     zoneId?: number;
//     owner?: string;
//     status: "active" | "inactive" | "auction" | "claimed";
//     auctionEndTime?: string;
//     collectionAddress?: string;
//   }): Promise<Subdomain> => {
//     try {
//       apiService.setNetwork(isTestnet);
//       try {
//         return await apiService.getSubdomainByName(subdomainData.name);
//       } catch {
//         return await apiService.createSubdomain({ ...subdomainData });
//       }
//     } catch (error) {
//       console.error("createSubdomainIfNotExists:", error);
//       throw error;
//     }
//   };

//   // ====== СТАРТ АУКЦИОНА ======
//   const handleStartAuction = async () => {
//     if (!selectedDomainZone || !subDomainName || !collectionAddress) {
//       showSnackbar(t("pleaseEnterDomainName"), "error");
//       return;
//     }
//     if (!userAddress) {
//       showSnackbar(t("walletNotConnected"), "error");
//       return;
//     }
//     try {
//       const tonWeb = new TonWeb();
//       const cell = new tonWeb.boc.Cell();
//       cell.bits.writeUint(0, 32);
//       cell.bits.writeString(`${subDomainName}`);
//       const payload = TonWeb.utils.bytesToBase64(await cell.toBoc());

//       const messages = [
//         {
//           amount: calculateDomainPrice.toString(),
//           address: collectionAddress,
//           payload,
//         },
//       ];
//       logTx("START_AUCTION", messages);

//       await tonConnectUI.sendTransaction({
//         validUntil: getValidUntil(),
//         messages,
//       });

//       const full = `${subDomainName}.${selectedDomainZone}`;
//       const auctionEndTime = new Date(
//         Date.now() + 24 * 60 * 60 * 1000
//       ).toISOString();
//       try {
//         apiService.setNetwork(isTestnet);
//         const zone = allZones.find((z) => z.name === selectedDomainZone);
//         await apiService.createSubdomain({
//           name: full,
//           address: nftAddress,
//           mintPrice: calculateDomainPrice / 1_000_000_000,
//           owner: userAddress,
//           status: "auction",
//           auctionEndTime,
//           zoneId: zone?.id,
//           collectionAddress: zone?.collectionAddress,
//         });
//         loadAllData(true);
//         showSnackbar(t("startAuction"), "success");
//       } catch (dbError: any) {
//         console.error("DB error:", dbError);
//         showSnackbar(t("auctionStartedBlockchainDbError"), "error");
//       }
//       setTimeout(() => handleCheckItem(), 2000);
//     } catch (error: any) {
//       if (error?.message?.includes("cancelled"))
//         showSnackbar(t("auctionStartCancelled"), "error");
//       else if (error?.message?.includes("rejected"))
//         showSnackbar(t("auctionStartRejected"), "error");
//       else if (error?.message?.includes("insufficient"))
//         showSnackbar(t("insufficientFundsForAuctionStart"), "error");
//       else showSnackbar(t("auctionStartError"), "error");
//     }
//   };

//   // ====== СТАВКА ======
//   const handlePlaceBid = async () => {
//     if (
//       !auctionInfo ||
//       !selectedDomainZone ||
//       !subDomainName ||
//       !collectionAddress
//     ) {
//       showSnackbar(t("auctionDataNotLoaded"), "error");
//       return;
//     }
//     if (!userAddress) {
//       showSnackbar(t("walletNotConnected"), "error");
//       return;
//     }
//     try {
//       const messages = [
//         { amount: calculateBidPrice.toString(), address: nftAddress },
//       ];
//       logTx("PLACE_BID", messages);

//       await tonConnectUI.sendTransaction({
//         validUntil: getValidUntil(),
//         messages,
//       });

//       const full = `${subDomainName}.${selectedDomainZone}`;
//       try {
//         apiService.setNetwork(isTestnet);
//         const zone = allZones.find((z) => z.name === selectedDomainZone);
//         const subdomain = await createSubdomainIfNotExists({
//           name: full,
//           address: nftAddress,
//           mintPrice: calculateBidPrice / 1_000_000_000,
//           owner: userAddress,
//           status: "auction",
//           auctionEndTime: new Date(
//             Date.now() + 24 * 60 * 60 * 1000
//           ).toISOString(),
//           zoneId: zone?.id,
//           collectionAddress: zone?.collectionAddress,
//         });
//         await apiService.addBidToSubdomain(subdomain.id, {
//           bidder: userAddress,
//           amount: calculateBidPrice,
//         });
//         await apiService.updateSubdomainStatus(subdomain.id, "auction");
//         refreshSubdomains();
//         loadAllData(true);
//       } catch (dbError: any) {
//         console.error("DB error:", dbError);
//         showSnackbar(t("bidPlacedBlockchainDbError"), "error");
//       }
//       showSnackbar(t("bid"), "success");
//       setCustomBidAmount("");
//       setShowCustomInput(false);
//       setManualBidValue("");
//       setTimeout(() => handleCheckItem(), 2000);
//     } catch (error: any) {
//       if (error?.message?.includes("cancelled"))
//         showSnackbar(t("bidCancelled"), "error");
//       else if (error?.message?.includes("rejected"))
//         showSnackbar(t("bidRejected"), "error");
//       else if (error?.message?.includes("insufficient"))
//         showSnackbar(t("insufficientFundsForBid"), "error");
//       else showSnackbar(t("bidError"), "error");
//     }
//   };

//   // ====== ПОКУПКА SBT ======
//   const handlePurchaseSBTSubdomain = async () => {
//     if (!selectedDomainZone || !subDomainName || !collectionAddress) {
//       showSnackbar(t("pleaseEnterDomainName"), "error");
//       return;
//     }
//     if (!wallet) {
//       showSnackbar(t("walletNotConnected"), "error");
//       return;
//     }
//     if (sbtSubdomainInfo?.isTaken) {
//       showSnackbar(t("sbtSubdomainAlreadyTaken"), "error");
//       return;
//     }
//     setSbtLoading(true);
//     try {
//       const tonWeb = new TonWeb();
//       const cell = new tonWeb.boc.Cell();
//       cell.bits.writeUint(0, 32);
//       cell.bits.writeString(`${subDomainName}`);
//       const payload = TonWeb.utils.bytesToBase64(await cell.toBoc());

//       const messages = [
//         {
//           amount: calculateDomainPrice.toString(),
//           address: collectionAddress,
//           payload,
//         },
//       ];
//       logTx("PURCHASE_SBT", messages);

//       await tonConnectUI.sendTransaction({
//         validUntil: getValidUntil(),
//         messages,
//       });

//       const full = `${subDomainName}.${selectedDomainZone}`;
//       if (!userAddress) throw new Error("No user address");
//       const nftAddr = sbtSubdomainInfo?.nftAddress || userAddress;
//       apiService.setNetwork(isTestnet);
//       const zone = allZones.find((z) => z.name === selectedDomainZone);
//       await apiService.createSubdomain({
//         name: full,
//         address: nftAddr,
//         mintPrice: calculateDomainPrice / 1_000_000_000,
//         owner: userAddress,
//         status: "active",
//         collectionAddress,
//         zoneId: zone?.id,
//       });
//       showSnackbar(t("sbtSubdomainPurchased"), "success");
//       setSbtPurchaseCompleted(true);
//     } catch (error: any) {
//       if (error?.message?.includes("cancelled"))
//         showSnackbar(t("sbtPurchaseCancelled"), "error");
//       else showSnackbar(t("sbtPurchaseError"), "error");
//     } finally {
//       setSbtLoading(false);
//     }
//   };

//   // ====== CLAIM ======
//   const handleClaimSubdomain = async () => {
//     if (!nftAddress) {
//       showSnackbar(t("nftAddressNotFound"), "error");
//       return;
//     }
//     if (!userAddress) {
//       showSnackbar(t("walletNotConnected"), "error");
//       return;
//     }
//     setIsClaimLoading(true);
//     try {
//       const result = await dispatch(
//         claimSubdomain({
//           subdomain_item_address: nftAddress,
//           query_id: 0,
//           isTestnet,
//         })
//       ).unwrap();
//       await tonConnectUI.sendTransaction({
//         validUntil: result.validUntil,
//         messages: result.messages,
//       });
//       const full = `${subDomainName}.${selectedDomainZone}`;
//       try {
//         apiService.setNetwork(isTestnet);
//         const s = await apiService.getSubdomainByName(full);
//         if (s) await apiService.updateSubdomainStatus(s.id, "claimed");
//       } catch (e) {
//         console.error("DB claim error:", e);
//       }
//       showSnackbar(t("subdomainClaimedSuccess"), "success");
//     } catch (error) {
//       showSnackbar(
//         error instanceof Error ? error.message : t("subdomainClaimError"),
//         "error"
//       );
//     } finally {
//       setIsClaimLoading(false);
//     }
//   };

//   // ====== UI HELPERS ======
//   const getImageUrl = () => {
//     if (!domainZoneName || !subDomainName) return "";
//     if (activeTab === "proxy")
//       return `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${domainZoneName}/${subDomainName}.png`;
//     return `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${domainZoneName}/${subDomainName}.png`;
//   };

//   const getActionButtonText = (): string => {
//     if (activeTab === "sbt") {
//       if (sbtPurchaseCompleted) return `✅ ${t("purchased")}`;
//       if (sbtSubdomainInfo?.isTaken)
//         return `❌ ${t("sbtSubdomainAlreadyTaken")}`;
//       return `${t("mintSubdomain")} (${t("buyFor1TON")})`;
//     }
//     if (!auctionInfo)
//       return `${t("startAuction")} (${t("price")}: ${
//         calculateDomainPrice / 1_000_000_000
//       } TON)`;
//     if (auctionInfo.isActive)
//       return `${t("bid")} (${
//         customBidAmount || (calculateBidPrice / 1_000_000_000).toFixed(2)
//       } TON)`;
//     if (canClaim)
//       return isClaimLoading ? t("claiming") : `🎁 ${t("claimSubdomain")}`;
//     return "";
//   };

//   const getActionButtonHandler = (): (() => void) | undefined => {
//     if (activeTab === "sbt") {
//       if (sbtPurchaseCompleted || sbtSubdomainInfo?.isTaken) return undefined;
//       return handlePurchaseSBTSubdomain;
//     }
//     if (!auctionInfo) return handleStartAuction;
//     if (auctionInfo.isActive) return handlePlaceBid;
//     if (canClaim) return handleClaimSubdomain;
//     return undefined;
//   };

//   const getActionButtonDisabled = (): boolean => {
//     if (activeTab === "sbt")
//       return (
//         sbtPurchaseCompleted ||
//         sbtLoading ||
//         !selectedDomainZone ||
//         !subDomainName ||
//         !!sbtSubdomainInfo?.isTaken
//       );
//     if (!auctionInfo) return !selectedDomainZone || !subDomainName;
//     if (auctionInfo.isActive) return false;
//     if (canClaim) return isClaimLoading;
//     return true;
//   };

//   const themeColors = {
//     light: { primary: "linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)" },
//     dark: { primary: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)" },
//   };
//   const colors = themeColors[isDark ? "dark" : "light"];

//   const getActionButtonColor = () => {
//     if (activeTab === "sbt") {
//       if (sbtPurchaseCompleted) return "#4ade80";
//       if (sbtSubdomainInfo?.isTaken) return "#888";
//       return sbtLoading ? "#888" : "#4a90e2";
//     }
//     if (!auctionInfo) return "#4ade80";
//     if (auctionInfo.isActive) return "rgb(74, 144, 226)";
//     if (canClaim) return isClaimLoading ? "#888" : "#4ade80";
//     return "transparent";
//   };

//   useEffect(() => {
//     if (userAddress) refreshSubdomains();
//   }, [userAddress, refreshSubdomains]);

//   // ===================================================================
//   // RENDER
//   // ====================================================================
//   return (
//     <Page back={true}>
//       {snackbar}
//       <Box sx={{ display: "flex", justifyContent: "center", mt: 2, mb: 3 }}>
//         <Tabs
//           value={activeTab}
//           onChange={handleTabChange}
//           sx={{
//             "& .MuiTab-root": {
//               color: isDark ? "#ccc" : "#666",
//               "&.Mui-selected": { color: isDark ? "#FFD700" : "#3B82F6" },
//             },
//           }}
//         >
//           <Tab label={t("proxyForSale")} value="proxy" />
//           <Tab label={t("sbtNotForSale")} value="sbt" />
//         </Tabs>
//       </Box>

//       {activeTab === "proxy" && (
//         <div
//           className="bannerWrapper"
//           style={{
//             display: "flex",
//             width: "100%",
//             justifyContent: "center",
//             alignItems: "center",
//           }}
//         >
//           <Banner
//             type="section"
//             header={t("proxyAuctionTitle")}
//             subheader={t("proxyAuctionDescription")}
//             style={{
//               textAlign: "center",
//               marginBottom: "20px",
//               padding: "15px",
//               maxWidth: "425px",
//               background: isDark
//                 ? "linear-gradient(to bottom, #1a1a1a, #2a2a2a)"
//                 : "linear-gradient(to bottom, #f5f5f5, #e5e5e5)",
//               color: isDark ? "#fff" : "#333",
//             }}
//           >
//             <div
//               style={{
//                 textAlign: "left",
//                 marginTop: "15px",
//                 fontSize: "14px",
//                 display: "flex",
//                 flexDirection: "column",
//                 alignItems: "center",
//                 maxWidth: "425px",
//               }}
//             >
//               <div
//                 style={{
//                   fontWeight: "bold",
//                   marginBottom: "10px",
//                   textAlign: "center",
//                 }}
//               >
//                 {t("proxyFeatures")}
//               </div>
//               <ul style={{ paddingLeft: "20px", margin: 0 }}>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature1")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature2")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature3")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature4")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature5")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature6")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("proxyFeature7")}</li>
//               </ul>
//             </div>
//           </Banner>
//         </div>
//       )}

//       {activeTab === "sbt" && (
//         <div
//           className="bannerWrapper"
//           style={{
//             display: "flex",
//             width: "100%",
//             justifyContent: "center",
//             alignItems: "center",
//           }}
//         >
//           <Banner
//             type="section"
//             header={t("sbtMintTitle")}
//             subheader={t("sbtMintDescription")}
//             style={{
//               textAlign: "center",
//               marginBottom: "20px",
//               padding: "15px",
//               maxWidth: "425px",
//               background: isDark
//                 ? "linear-gradient(to bottom, #1a1a1a, #2a2a2a)"
//                 : "linear-gradient(to bottom, #f5f5f5, #e5e5e5)",
//               color: isDark ? "#fff" : "#333",
//             }}
//           >
//             <div
//               style={{
//                 textAlign: "left",
//                 marginTop: "15px",
//                 fontSize: "14px",
//                 display: "flex",
//                 flexDirection: "column",
//                 alignItems: "center",
//                 maxWidth: "425px",
//               }}
//             >
//               <div
//                 style={{
//                   fontWeight: "bold",
//                   marginBottom: "10px",
//                   textAlign: "center",
//                 }}
//               >
//                 {t("sbtFeatures")}
//               </div>
//               <ul style={{ paddingLeft: "20px", margin: 0 }}>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature1")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature2")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature3")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature4")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature5")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature6")}</li>
//                 <li style={{ marginBottom: "8px" }}>{t("sbtFeature7")}</li>
//               </ul>
//             </div>
//           </Banner>
//         </div>
//       )}

//       {activeTab === "proxy" && (
//         <ActiveAuctions
//           isTestnet={isTestnet}
//           isDark={isDark}
//           onAuctionClick={handleAuctionClickFromComponent}
//         />
//       )}

//       <div
//         style={{
//           textAlign: "center",
//           marginBottom: "10px",
//           padding: "5px 10px",
//           borderRadius: "15px",
//           background: isTestnet ? "#f59e0b" : "#10b981",
//           color: "white",
//           fontSize: "12px",
//           fontWeight: "bold",
//           maxWidth: "280px",
//           margin: "0 auto",
//         }}
//       >
//         {isTestnet ? "🌐 Testnet Mode" : "🌐 Mainnet Mode"}
//       </div>

//       <List
//         style={{
//           display: "flex",
//           flexDirection: "column",
//           alignItems: "center",
//           gap: "15px",
//           paddingBottom: "150px",
//         }}
//       >
//         <div style={{ position: "relative", width: "280px" }}>
//           <div
//             style={{
//               position: "absolute",
//               left: "-30px",
//               top: "50%",
//               transform: "translateY(-50%)",
//               fontSize: "18px",
//               fontWeight: "bold",
//               color: isDark ? "white" : "black",
//             }}
//           >
//             1
//           </div>
//           <AuctionCollectionSelector
//             activeTab={activeTab}
//             selectedDomainZone={selectedDomainZone}
//             onDomainZoneChange={handleDomainZoneChangeForSelector}
//             zonesLoading={zonesLoading}
//             zonesError={zonesError}
//             userAddress={userAddress}
//             isDark={isDark}
//             t={t}
//             activeSbtZones={activeSbtZones}
//             proxyZones={allProxyZones}
//             sbtZonesCount={
//               activeTab === "sbt" ? sbtZonesCountFromItemCount : undefined
//             }
//           />
//           {zonesError && (
//             <p style={{ color: "#f87171", fontSize: "12px", marginTop: "5px" }}>
//               {zonesError}
//             </p>
//           )}
//           {activeTab === "sbt" &&
//             userSbtZones.length === 0 &&
//             !zonesLoading &&
//             !zonesError && (
//               <p
//                 style={{
//                   color: "#f59e0b",
//                   fontSize: "12px",
//                   marginTop: "5px",
//                   textAlign: "center",
//                 }}
//               >
//                 {t("noSbtZones")}
//               </p>
//             )}
//         </div>

//         {selectedDomainZone && (
//           <div
//             style={{
//               padding: "8px 12px",
//               borderRadius: "8px",
//               background: isDark ? "#2a2a2a" : "#f5f5f5",
//               border: `1px solid ${isDark ? "#444" : "#ddd"}`,
//               fontSize: "12px",
//               color: isDark ? "#ccc" : "#666",
//               maxWidth: "280px",
//               textAlign: "center",
//             }}
//           >
//             <p style={{ margin: 0 }}>
//               <strong>{t("zoneType")}</strong>{" "}
//               {activeTab === "proxy" ? t("proxyType") : t("sbtType")}
//             </p>
//             {collectionAddress ? (
//               <p
//                 style={{
//                   margin: "3px 0 0 0",
//                   color: "#4caf50",
//                   fontSize: "11px",
//                 }}
//               >
//                 {t("collectionConfigured")}
//               </p>
//             ) : (
//               <p
//                 style={{
//                   margin: "3px 0 0 0",
//                   color: "#f59e0b",
//                   fontSize: "11px",
//                 }}
//               >
//                 {t("collectionNotConfigured")}
//               </p>
//             )}
//             <p
//               style={{
//                 margin: "3px 0 0 0",
//                 fontSize: "11px",
//                 color: isTestnet ? "#f59e0b" : "#10b981",
//               }}
//             >
//               {t("network")} {isTestnet ? t("testnet") : t("mainnet")}
//             </p>
//           </div>
//         )}

//         <div style={{ position: "relative", width: "280px" }}>
//           <div
//             style={{
//               position: "absolute",
//               left: "-30px",
//               top: "50%",
//               transform: "translateY(-50%)",
//               fontSize: "18px",
//               fontWeight: "bold",
//               color: isDark ? "white" : "black",
//             }}
//           >
//             2
//           </div>
//           <Input
//             placeholder={t("enterSubdomainName")}
//             value={subDomainName}
//             onChange={(e) => {
//               const val = e.target.value
//                 .trim()
//                 .toLowerCase()
//                 .replace(/[^a-z0-9-]/g, "");
//               handleSubDomainNameChange(val);
//             }}
//             style={{
//               width: "280px",
//               borderRadius: "50%",
//               padding: "0px 15px",
//               position: "relative",
//             }}
//             before={
//               <div
//                 style={{
//                   position: "absolute",
//                   left: "15px",
//                   top: "50%",
//                   transform: "translateY(-50%)",
//                   opacity: 0.5,
//                 }}
//               >
//                 🔍
//               </div>
//             }
//           />
//         </div>

//         <div style={{ position: "relative", width: "280px" }}>
//           <div
//             style={{
//               position: "absolute",
//               left: "-30px",
//               top: "50%",
//               transform: "translateY(-50%)",
//               fontSize: "18px",
//               fontWeight: "bold",
//               color: isDark ? "white" : "black",
//             }}
//           >
//             2.5
//           </div>
//           <Button
//             onClick={handleCheckItem}
//             disabled={
//               !selectedDomainZone ||
//               !subDomainName ||
//               isLoading ||
//               !collectionAddress
//             }
//             style={{
//               width: "280px",
//               borderRadius: "25px",
//               padding: "10px 15px",
//               background: isLoading ? "#888" : colors.primary,
//               opacity: !collectionAddress ? 0.5 : 1,
//               cursor: !collectionAddress ? "not-allowed" : "pointer",
//               color: isDark ? "black" : "white",
//             }}
//           >
//             {isLoading ? t("checking") : t("checkingItem")}
//           </Button>
//           {!collectionAddress && (
//             <p
//               style={{
//                 color: "#f59e0b",
//                 fontSize: "12px",
//                 marginTop: "5px",
//                 textAlign: "center",
//               }}
//             >
//               {t("noCollectionAddress")}
//             </p>
//           )}
//         </div>

//         {/* AUCTION CARD */}
//         {hasChecked && auctionInfo && activeTab === "proxy" && (
//           <Card
//             style={{
//               background: "linear-gradient(to bottom, #1a1a1a, #2a2a2a)",
//               marginBottom: "20px",
//               padding: "15px",
//               borderRadius: "10px",
//               width: "280px",
//               border: `2px solid ${
//                 auctionInfo.isActive ? "#4ade80" : "#f87171"
//               }`,
//             }}
//           >
//             <div style={{ color: "#fff", fontSize: "14px" }}>
//               <div
//                 style={{
//                   marginBottom: "10px",
//                   textAlign: "center",
//                   color: auctionInfo.isActive ? "#4ade80" : "#f87171",
//                   fontWeight: "bold",
//                 }}
//               >
//                 {auctionInfo.isActive
//                   ? `✅  ${t("bidOnAuction")}`
//                   : `❌ ${t("subdomainAlreadyTaken")}`}
//               </div>
//               <div
//                 style={{
//                   width: "100%",
//                   display: "flex",
//                   justifyContent: "center",
//                   alignItems: "center",
//                 }}
//               >
//                 <img
//                   style={{
//                     width: "200px",
//                     height: "200px",
//                     borderRadius: "25px",
//                     marginBottom: "15px",
//                   }}
//                   src={getImageUrl()}
//                   alt="subdomainImage"
//                 />
//               </div>
//               <div style={{ marginBottom: "10px" }}>
//                 <strong>{t("maxBidder")}:</strong>
//                 <br />
//                 <code style={{ fontSize: "12px", wordBreak: "break-all" }}>
//                   <a
//                     style={{ color: "white" }}
//                     href={`https://tonviewer.com/${
//                       auctionInfo.maxBidderOwner || t("domainLeftAuction")
//                     }`}
//                   >
//                     {auctionInfo.maxBidderOwner || t("domainLeftAuction")}
//                   </a>
//                 </code>
//               </div>
//               <div style={{ marginBottom: "10px" }}>
//                 <strong>{t("maxBid")}: </strong>
//                 {Number(auctionInfo.maxBid) === 0
//                   ? t("hideAfterAuctionEnd")
//                   : (Number(auctionInfo.maxBid) / 1_000_000_000).toFixed(
//                       2
//                     )}{" "}
//                 TON
//               </div>
//               <div style={{ marginBottom: "10px" }}>
//                 <strong>{t("endTime")}:</strong>{" "}
//                 {new Date(auctionInfo.timestamp * 1000).toLocaleString()}
//               </div>
//               <div>
//                 <strong>{t("status")}:</strong>
//                 <span
//                   style={{
//                     marginLeft: "5px",
//                     color: auctionInfo.isActive ? "#4ade80" : "#f87171",
//                   }}
//                 >
//                   {auctionInfo.isActive
//                     ? `🟢 ${t("active")}`
//                     : `🔴 ${t("ended")}`}
//                 </span>
//               </div>
//               <div
//                 style={{
//                   marginTop: "10px",
//                   paddingTop: "10px",
//                   borderTop: "1px solid #444",
//                   display: "flex",
//                   justifyContent: "space-between",
//                   alignItems: "center",
//                 }}
//               >
//                 <div style={{ fontSize: "11px", color: "#aaa" }}>
//                   <strong>{t("networkLabel")}</strong>{" "}
//                   {isTestnet ? t("testnet") : t("mainnet")}
//                 </div>
//                 {activeTab === "proxy" && (
//                   <div style={{ display: "flex", gap: "8px" }}>
//                     <IconButton
//                       size="s"
//                       mode="outline"
//                       onClick={handleCopyAuctionLink}
//                       title={t("copyAuctionLink")}
//                       style={{
//                         backgroundColor: "#333",
//                         borderColor: "#555",
//                         color: "white",
//                         padding: "4px 8px",
//                         fontSize: "10px",
//                       }}
//                     >
//                       📋
//                     </IconButton>
//                     <IconButton
//                       size="s"
//                       mode="outline"
//                       onClick={handleShareAuction}
//                       title={t("shareAuction")}
//                       style={{
//                         backgroundColor: "#333",
//                         borderColor: "#555",
//                         color: "white",
//                         padding: "4px 8px",
//                         fontSize: "10px",
//                       }}
//                     >
//                       🔗
//                     </IconButton>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </Card>
//         )}

//         {/* SBT CARD */}
//         {hasChecked && sbtSubdomainInfo && activeTab === "sbt" && (
//           <Card
//             style={{
//               background: sbtSubdomainInfo.isTaken
//                 ? "linear-gradient(to bottom, #2a1a1a, #3a2a2a)"
//                 : "linear-gradient(to bottom, #1a2a1a, #2a3a2a)",
//               marginBottom: "20px",
//               padding: "15px",
//               borderRadius: "10px",
//               width: "280px",
//               border: sbtSubdomainInfo.isTaken
//                 ? "2px solid #f87171"
//                 : "2px solid #4a90e2",
//             }}
//           >
//             <div style={{ color: "#fff", fontSize: "14px" }}>
//               <div
//                 style={{
//                   marginBottom: "10px",
//                   textAlign: "center",
//                   color: sbtSubdomainInfo.isTaken ? "#f87171" : "#4a90e2",
//                   fontWeight: "bold",
//                 }}
//               >
//                 {sbtSubdomainInfo.isTaken
//                   ? `❌ ${t("sbtSubdomainAlreadyTaken")}`
//                   : `✅ ${t("sbtSubdomainAvailable")}`}
//               </div>
//               <div
//                 style={{
//                   width: "100%",
//                   display: "flex",
//                   justifyContent: "center",
//                   alignItems: "center",
//                 }}
//               >
//                 <img
//                   style={{
//                     width: "200px",
//                     height: "200px",
//                     borderRadius: "25px",
//                     marginBottom: "15px",
//                   }}
//                   src={getImageUrl()}
//                   alt="subdomainImage"
//                 />
//               </div>
//               {sbtSubdomainInfo.isTaken && sbtSubdomainInfo.ownerAddress && (
//                 <>
//                   <div style={{ marginBottom: "10px" }}>
//                     <strong>{t("sbtOwner")}:</strong>
//                     <br />
//                     <code style={{ fontSize: "12px", wordBreak: "break-all" }}>
//                       <a
//                         style={{ color: "white" }}
//                         href={`https://tonviewer.com/${sbtSubdomainInfo.ownerAddress}`}
//                         target="_blank"
//                         rel="noopener noreferrer"
//                       >
//                         {sbtSubdomainInfo.ownerAddress}
//                       </a>
//                     </code>
//                   </div>
//                   {sbtSubdomainInfo.nftAddress && (
//                     <div style={{ marginBottom: "10px" }}>
//                       <strong>NFT Address:</strong>
//                       <br />
//                       <code
//                         style={{ fontSize: "12px", wordBreak: "break-all" }}
//                       >
//                         <a
//                           style={{ color: "white" }}
//                           href={`https://tonviewer.com/${sbtSubdomainInfo.nftAddress}`}
//                           target="_blank"
//                           rel="noopener noreferrer"
//                         >
//                           {sbtSubdomainInfo.nftAddress}
//                         </a>
//                       </code>
//                     </div>
//                   )}
//                   {sbtSubdomainInfo.timestamp && (
//                     <div style={{ marginBottom: "10px" }}>
//                       <strong>{t("created")}:</strong>{" "}
//                       {new Date(
//                         sbtSubdomainInfo.timestamp * 1000
//                       ).toLocaleString()}
//                     </div>
//                   )}
//                 </>
//               )}
//               {!sbtSubdomainInfo.isTaken && (
//                 <div
//                   style={{
//                     marginTop: "10px",
//                     padding: "8px",
//                     background: "rgba(74, 144, 226, 0.1)",
//                     borderRadius: "5px",
//                     fontSize: "12px",
//                     color: "#ccc",
//                     textAlign: "center",
//                   }}
//                 >
//                   {t("sbtForPersonalUse")} • {t("buyFor1TON")}
//                 </div>
//               )}
//               <div
//                 style={{
//                   marginTop: "10px",
//                   paddingTop: "10px",
//                   borderTop: "1px solid #444",
//                   fontSize: "11px",
//                   color: "#aaa",
//                 }}
//               >
//                 <strong>{t("networkLabel")}</strong>{" "}
//                 {isTestnet ? t("testnet") : t("mainnet")}
//               </div>
//             </div>
//           </Card>
//         )}

//         {/* FREE SUBDOMAIN */}
//         {hasChecked && !auctionInfo && !sbtSubdomainInfo && (
//           <Card
//             style={{
//               background:
//                 activeTab === "sbt"
//                   ? "linear-gradient(to bottom, #1a2a1a, #2a2a2a)"
//                   : "linear-gradient(to bottom, #2a1a1a, #2a2a1a)",
//               marginBottom: "20px",
//               padding: "15px",
//               borderRadius: "10px",
//               width: "280px",
//               border:
//                 activeTab === "sbt" ? "2px solid #4a90e2" : "2px solid #4ade80",
//             }}
//           >
//             <div
//               style={{ color: "#fff", fontSize: "14px", textAlign: "center" }}
//             >
//               <div
//                 style={{
//                   marginBottom: "10px",
//                   color: activeTab === "sbt" ? "#4a90e2" : "#4ade80",
//                   fontWeight: "bold",
//                 }}
//               >
//                 {activeTab === "sbt"
//                   ? sbtPurchaseCompleted
//                     ? `✅ ${t("sbtSubdomainPurchased")}`
//                     : `✅ ${t("sbtSubdomainAvailable")}`
//                   : `✅ ${t("subdomainAvailable")}`}
//               </div>
//               <div
//                 style={{
//                   width: "100%",
//                   display: "flex",
//                   justifyContent: "center",
//                   alignItems: "center",
//                 }}
//               >
//                 <img
//                   style={{
//                     width: "200px",
//                     height: "200px",
//                     borderRadius: "25px",
//                     marginBottom: "15px",
//                   }}
//                   src={getImageUrl()}
//                   alt="subdomainImage"
//                 />
//               </div>
//               <div style={{ color: "#ccc", fontSize: "13px" }}>
//                 {activeTab === "sbt"
//                   ? sbtPurchaseCompleted
//                     ? t("sbtSubdomainPurchased")
//                     : t("sbtForPersonalUse")
//                   : t("makeFirstBid")}
//               </div>
//               <div
//                 style={{
//                   marginTop: "10px",
//                   paddingTop: "10px",
//                   borderTop: "1px solid #444",
//                   display: "flex",
//                   justifyContent: "space-between",
//                   alignItems: "center",
//                 }}
//               >
//                 <div style={{ fontSize: "11px", color: "#aaa" }}>
//                   <strong>{t("networkLabel")}</strong>{" "}
//                   {isTestnet ? t("testnet") : t("mainnet")}
//                 </div>
//                 {activeTab === "proxy" && (
//                   <div style={{ display: "flex", gap: "8px" }}>
//                     <IconButton
//                       size="s"
//                       mode="outline"
//                       onClick={handleCopyAuctionLink}
//                       title={t("copyAuctionLink")}
//                       style={{
//                         backgroundColor: "#333",
//                         borderColor: "#555",
//                         color: "white",
//                         padding: "4px 8px",
//                         fontSize: "10px",
//                       }}
//                     >
//                       📋
//                     </IconButton>
//                     <IconButton
//                       size="s"
//                       mode="outline"
//                       onClick={handleShareAuction}
//                       title={t("shareAuction")}
//                       style={{
//                         backgroundColor: "#333",
//                         borderColor: "#555",
//                         color: "white",
//                         padding: "4px 8px",
//                         fontSize: "10px",
//                       }}
//                     >
//                       🔗
//                     </IconButton>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </Card>
//         )}

//         {/* TIMER */}
//         {activeTab === "proxy" && (
//           <Card
//             style={{
//               background: "linear-gradient(to bottom, black, gray)",
//               marginBottom: "20px",
//               padding: "5px 5px 20px 5px",
//               borderRadius: "10px",
//               display: "flex",
//               flexDirection: "column",
//               alignItems: "center",
//               gap: "10px",
//               width: "min-content",
//             }}
//           >
//             <FlipTimer
//               auctionData={auctionInfo}
//               defaultTime={hasChecked && !auctionInfo ? 86400 : undefined}
//               onComplete={() => console.log("Аукцион завершен!")}
//             />
//             <div style={{ fontSize: "11px", color: "#aaa" }}>
//               {t("networkLabel")} {isTestnet ? t("testnet") : t("mainnet")}
//             </div>
//           </Card>
//         )}

//         {/* BID SELECT */}
//         {hasChecked &&
//           auctionInfo &&
//           auctionInfo.isActive &&
//           activeTab === "proxy" && (
//             <>
//               <div style={{ position: "relative", width: "200px" }}>
//                 <select
//                   value={showCustomInput ? "custom" : customBidAmount}
//                   onChange={handleBidSelectChange}
//                   style={{
//                     width: "200px",
//                     borderRadius: "25px",
//                     padding: "10px 15px",
//                     fontSize: "14px",
//                   }}
//                 >
//                   <option value="">{`${t("price")}: Min. ${(
//                     calculateBidPrice / 1_000_000_000
//                   ).toFixed(2)} TON`}</option>
//                   <option value="custom">{t("enterValue")}</option>
//                   <option value="10">10 TON</option>
//                   <option value="20">20 TON</option>
//                   <option value="50">50 TON</option>
//                   <option value="100">100 TON</option>
//                   <option value="500">500 TON</option>
//                 </select>
//               </div>
//               {showCustomInput && (
//                 <div style={{ position: "relative", width: "200px" }}>
//                   <Input
//                     placeholder={t("yourBid")}
//                     value={manualBidValue}
//                     onChange={(e) => handleManualBidChange(e.target.value)}
//                     style={{
//                       width: "200px",
//                       borderRadius: "25px",
//                       padding: "10px 15px",
//                       fontSize: "24px",
//                       fontWeight: "600",
//                       marginLeft: "20px",
//                     }}
//                   />
//                 </div>
//               )}
//             </>
//           )}

//         {/* Шаг 3: ACTION BUTTON */}
//         {hasChecked && getActionButtonText() && (
//           <div style={{ position: "relative", width: "280px" }}>
//             <div
//               style={{
//                 position: "absolute",
//                 left: "-30px",
//                 top: "50%",
//                 transform: "translateY(-50%)",
//                 fontSize: "18px",
//                 fontWeight: "bold",
//                 color: isDark ? "white" : "black",
//               }}
//             >
//               3
//             </div>
//             <Button
//               onClick={getActionButtonHandler()}
//               disabled={getActionButtonDisabled()}
//               style={{
//                 width: "280px",
//                 borderRadius: "25px",
//                 padding: "10px 15px",
//                 backgroundColor: getActionButtonColor(),
//                 marginBottom:
//                   activeTab === "proxy" &&
//                   auctionInfo &&
//                   !auctionInfo.isActive &&
//                   !canClaim
//                     ? "10px"
//                     : "0",
//                 display: getActionButtonText() ? "block" : "none",
//               }}
//             >
//               {getActionButtonText()}
//             </Button>
//           </div>
//         )}

//         {/* Шаг 4: MARKETPLACE */}
//         {hasChecked &&
//           auctionInfo &&
//           !auctionInfo.isActive &&
//           !canClaim &&
//           activeTab === "proxy" && (
//             <div style={{ position: "relative", width: "280px" }}>
//               <div
//                 style={{
//                   position: "absolute",
//                   left: "-30px",
//                   top: "50%",
//                   transform: "translateY(-50%)",
//                   fontSize: "18px",
//                   fontWeight: "bold",
//                   color: isDark ? "white" : "black",
//                 }}
//               >
//                 4
//               </div>
//               <a
//                 href={marketplaceUrl}
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 style={{
//                   display: "block",
//                   width: "280px",
//                   borderRadius: "25px",
//                   padding: "11.75px 15px",
//                   backgroundColor: "#6366f1",
//                   color: "white",
//                   textDecoration: "none",
//                   textAlign: "center",
//                   fontWeight: "bold",
//                   cursor: "pointer",
//                   border: "none",
//                 }}
//               >
//                 🛍️ {t("viewOnMarketplace")}
//               </a>
//             </div>
//           )}

//         {/* Шаг 4: Создать сайт */}
//         {(sbtPurchaseCompleted ||
//           (auctionInfo && !auctionInfo.isActive && canClaim)) && (
//           <div style={{ position: "relative", width: "280px" }}>
//             <div
//               style={{
//                 position: "absolute",
//                 left: "-30px",
//                 top: "50%",
//                 transform: "translateY(-50%)",
//                 fontSize: "18px",
//                 fontWeight: "bold",
//                 color: isDark ? "white" : "black",
//               }}
//             >
//               4
//             </div>
//             <a
//               href="https://t.me/Ton_site_builder_bot?startapp"
//               target="_blank"
//               rel="noopener noreferrer"
//               style={{
//                 display: "block",
//                 width: "280px",
//                 borderRadius: "25px",
//                 padding: "11.75px 15px",
//                 background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
//                 color: "white",
//                 textDecoration: "none",
//                 textAlign: "center",
//                 fontWeight: "bold",
//                 cursor: "pointer",
//                 border: "none",
//                 fontSize: "14px",
//               }}
//             >
//               🏗️ Создать сайт на {subDomainName}.{selectedDomainZone}
//             </a>
//           </div>
//         )}
//       </List>
//     </Page>
//   );
// };

// export default AuctionPage;

// src/pages/AuctionPage/index.tsx
// === v10 — ФИНАЛЬНАЯ ОЧИСТКА ===
// Исправления:
// 1) Фильтр allProxyZones: выкидываем пустые, "*", "pseudonym" через zonePart
// 2) Убран sbtZonesCountFromItemCount и передача sbtZonesCount в AuctionCollectionSelector
// 3) Количество субдоменов теперь только из zone.subdomainsAmount (item_count)

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
import { useNavigate, useLocation } from "react-router-dom";
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
import { ScanProgressLoader } from "@/components/ScanProgressLoader";
import { claimSubdomain } from "@/store/nft/actions";
import FlipTimer from "./flipTimer/FlipTimer";
import { getAuctionInfo, ParsedAuctionInfo } from "./flipTimer/getAuctionInfo";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { apiService, Zone } from "@/services/api";

import { checkSBTSubdomain, SBTSubdomainInfo } from "./checkSBTSubdomain";
import { calculateProxyNFTAddress } from "./CalculateProxyNFTAddress";

// ====== ONCHAIN ======
import { useBlockchainItems } from "@/services/blockchainItems/blockchain-items-context.tsx";
import { SimpleCollection } from "@/services/blockchainItems/blockchain-items-types";
import { cleanZoneDisplayName } from "@/services/blockchainItems/blockchain-items-utils";

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
import { convertUserFriendlyToRaw, resolveAddressToDomain, getAddressLastTransaction } from "@/utils/tonUtils";
import { TutorialTooltip } from "@/components/Tutorial/TutorialTooltip";
import { useTutorial } from "@/contexts/TutorialContext";
import { track } from "@/utils/analytics";
import { sanitizeDomainLabelInput, encodeDomainLabel, decodeDomainLabel } from "@/utils/domainPunycode";
import { CopyLinkIcon, ShareArrowIcon } from "@/components/icons/CopyShareIcons";
import { fetchPlatformCache } from "@/services/blockchainItems/platformCacheClient";

// Единый акцентный стиль для копировать-ссылку/поделиться — раньше это были
// серые прямоугольные кнопки (#333 фон, #555 бордер), визуально "чопорные" на
// фоне остального приложения. Теперь — то же круглое золото/синее кольцо,
// что и у ShareButton в других местах приложения (профиль, степпер, аукционы).
const shareIconButtonStyle = (isDark: boolean): React.CSSProperties => ({
  backgroundColor: isDark ? "rgba(255, 215, 0, 0.18)" : "rgba(59, 130, 246, 0.12)",
  borderColor: isDark ? "#FFD700" : "#3B82F6",
  // IconButton mode="outline" по умолчанию рисует тонкую (1px) рамку —
  // borderColor её только красит, а не утолщает; на золотом акценте в
  // тёмной теме она терялась ("неочевидная и некрасивая"), см. ту же
  // правку в ShareButton.tsx.
  borderWidth: "2px",
  color: isDark ? "#FFD700" : "#3B82F6",
  padding: "6px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

// ====== ТИПЫ ======

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

// ====== ДЕДУПЛИКАЦИЯ С ПРИОРИТЕТОМ PROXY > SBT ======
const dedupeSbtAgainstProxy = (
  sbtZones: Zone[],
  proxyZones: Zone[]
): Zone[] => {
  const proxyNames = new Set(proxyZones.map((z) => z.name));
  const sbtMap = new Map<string, Zone>();
  for (const z of sbtZones) {
    const exist = sbtMap.get(z.name);
    if (!exist || new Date(z.createdAt) > new Date(exist.createdAt)) {
      sbtMap.set(z.name, z);
    }
  }
  return [...sbtMap.values()].filter((z) => !proxyNames.has(z.name));
};

// ====== collectionToZone ======
const collectionToZone = (col: SimpleCollection): Zone => {
  const rawName = col.name || "";
  const zoneName = rawName
    .replace(" DNS Domains", "")
    .replace(" Proxy Domains", "")
    .toLowerCase();
  return {
    id: col.address.slice(0, 10),
    name: zoneName.endsWith(".ton") ? zoneName : `${zoneName}.ton`,
    address: col.address,
    owner: col.creator_address || col.owner_address,
    collectionAddress: col.address,
    createdAt: col.created_at || col.lastUpdated || new Date().toISOString(),
    subdomainsAmount: col.item_count || 0,
    proxy: col.type === "proxy" ? 1 : 0,
    status: "active",
    image: col.metadata?.token_info?.[0]?.image || col.image,
    description: col.metadata?.token_info?.[0]?.description || col.description,
    zoneLength: zoneName.length,
  } as any as Zone;
};

const dedupeByLatest = (cols: SimpleCollection[]): SimpleCollection[] => {
  const map = new Map<string, SimpleCollection>();
  for (const c of cols) {
    const key = (c.name || "").toLowerCase();
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

// ====================================================================
// КОМПОНЕНТ
// ====================================================================

export const AuctionPage: React.FC<{}> = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useTypedDispatch();
  const wallet = useTonWallet();
  const userAddress = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();

  const [sbtSubdomainInfo, setSbtSubdomainInfo] =
    useState<SBTSubdomainInfo | null>(null);

  const { currentTheme } = useTheme();
  const isDark = currentTheme === "dark";
  const { t } = useLanguage();

  // По умолчанию SBT — обычный субдомен без аукционных рисков, чтобы юзер,
  // тыкающий не глядя, не попал сразу на Proxy-аукцион.
  const [activeTab, setActiveTab] = useState<ActiveTab>("sbt");
  const [selectedDomainZone, setSelectedDomainZone] = useState("");
  // subDomainName остаётся punycode/ASCII-формой (её же используют payload'ы
  // минта/ставки и URL); subDomainNameDisplay — то, что видит и печатает
  // юзер (юникод), только для value инпута.
  const [subDomainName, setSubDomainName] = useState("");
  const [subDomainNameDisplay, setSubDomainNameDisplay] = useState("");
  const [collectionAddress, setCollectionAddress] = useState("");
  const [snackbar, setSnackbar] = useState<JSX.Element | null>(null);
  const [auctionInfo, setAuctionInfo] = useState<ParsedAuctionInfo | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [nftAddress, setNftAddress] = useState("");
  const [hasChecked, setHasChecked] = useState(false);
  // Инфа о реальном владельце уже занятого сабдомена (proxy-путь: get_auction_info
  // отдаёт null одинаково и для "ещё не было ставок", и для "уже заклеймлен" —
  // occupiedInfo отличает второй случай через platform-cache). Домен/дата
  // резолвятся отдельным запросом после определения владельца.
  const [occupiedInfo, setOccupiedInfo] = useState<{
    ownerAddress: string;
    ownerDomain: string | null;
    timestamp: number | null;
    txHash: string | null;
  } | null>(null);
  const [isClaimLoading, setIsClaimLoading] = useState(false);
  const subdomainNameInputRef = useRef<HTMLInputElement>(null);
  const [customBidAmount, setCustomBidAmount] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [manualBidValue, setManualBidValue] = useState("");
  const [sbtPurchaseCompleted, setSbtPurchaseCompleted] = useState(false);
  const [sbtLoading, setSbtLoading] = useState(false);
  // Блок "Особенности" сворачивается по умолчанию — см. аналогичный фикс
  // в CreateCollectionPage.tsx, важный контент ниже должен быть виден сразу.
  const [proxyFeaturesExpanded, setProxyFeaturesExpanded] = useState(false);
  const [sbtFeaturesExpanded, setSbtFeaturesExpanded] = useState(false);

  const tutorial = useTutorial();
  // Блок 2 обучалки: сначала два информационных слайда (что такое SBT-
  // субдомен / кратко про Proxy-режим, локальный UI-стейт, не пишется на
  // бэкенд), потом интерактивная часть — выбор зоны и ввод имени, где уже
  // реальные действия страницы пишут прогресс.
  const [tutorialBlock2Intro, setTutorialBlock2Intro] = useState<'sbt' | 'proxy' | null>('sbt');

  // zone_selected теперь засчитывается на CreateCollectionPage (по факту
  // создания зоны, шаг блока 2 "создать зону") — к моменту, когда юзер
  // попадает на эту страницу в туре, шаг уже пройден. Здесь просто
  // фокусируем инпут имени субдомена, как только зона определена в URL.
  const tutorialBlock2Active =
    tutorial.active && tutorial.isStepDone('domain_answered') && !tutorial.isStepDone('subdomain_created');

  useEffect(() => {
    if (tutorialBlock2Active && tutorialBlock2Intro === null && selectedDomainZone) {
      window.setTimeout(() => subdomainNameInputRef.current?.focus(), 200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorialBlock2Active, tutorialBlock2Intro, selectedDomainZone]);

  const prevSbtMapRef = useRef<{
    cacheKey: string;
    map: CollectionAddressMap;
  } | null>(null);

  const isTestnet = wallet?.account?.chain === "-3";
  const launchParams = useLaunchParams();
  const [, setOpenedViaDeeplink] = useState(false);

  // ====== ONCHAIN ДАННЫЕ ======
  const {
    proxyCollections,
    sbtCollections,
    loadAllData,
    ensureData,
    isLoading: zonesLoading,
    error: zonesError,
  } = useBlockchainItems();

  // Эта страница раньше сама никогда не инициировала загрузку — полагалась
  // на то, что данные уже загрузила другая страница до неё. Если юзер
  // открывал создание субдомена первым за сессию (или сразу после создания
  // зоны в новой вкладке/после релоада), селектор зон был пуст. См. тот же
  // паттерн в CreateCollectionPage.tsx.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    ensureData();
  }, []);

  // ====== ВСЕ PROXY КОЛЛЕКЦИИ (для селекта) + ФИЛЬТР ПУСТЫХ/WILDCARD/PSEUDONYM/INACTIVE ======
  const allProxyZones: Zone[] = useMemo(
    () =>
      dedupeByLatest(proxyCollections)
        .map((c) => collectionToZone(c))
        .filter((z) => {
          const zonePart = z.name.split(".")[0];
          return (
            zonePart !== "" && zonePart !== "*" && zonePart !== "pseudonym"
          );
        })
        // Та же деактивация, что и у SBT (activeSbtZones ниже) — иначе
        // деактивированная зона всё ещё предлагается для создания субдомена.
        .filter((z) => z.status !== "inactive"),
    [proxyCollections]
  );

  // ====== SBT ЗОНЫ ТОЛЬКО ЮЗЕРА ======
  const userSbtZones: Zone[] = useMemo(() => {
    if (!userAddress) return [];
    const normalizedAddress =
      convertUserFriendlyToRaw(userAddress).toLowerCase();
    const rawSbt = sbtCollections
      .filter((col) => {
        const creator = (
          col.creator_address ||
          col.owner_address ||
          ""
        ).toLowerCase();
        return creator === normalizedAddress;
      })
      .map((col) => collectionToZone(col));
    return dedupeSbtAgainstProxy(rawSbt, allProxyZones);
  }, [userAddress, sbtCollections, allProxyZones]);

  const activeSbtZones: Zone[] = useMemo(
    () => userSbtZones.filter((zone) => zone.status !== "inactive"),
    [userSbtZones]
  );

  const allZones: Zone[] = useMemo(
    () => [...allProxyZones, ...userSbtZones],
    [allProxyZones, userSbtZones]
  );

  // ====== УСТРАНЕНИЕ ПЕТЛИ apiService.setNetwork ======
  const prevNetworkRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (wallet && prevNetworkRef.current !== isTestnet) {
      prevNetworkRef.current = isTestnet;
      apiService.setNetwork(isTestnet);
    }
  }, [wallet, isTestnet]);

  const isProxyZone = useCallback((zone: any): boolean => {
    const proxyValue = zone.proxy;
    if (typeof proxyValue === "number") return proxyValue === 1;
    if (typeof proxyValue === "string")
      return proxyValue.toLowerCase() === "proxy" || proxyValue === "1";
    return false;
  }, []);

  const proxyCollectionAddressesMap = useMemo(() => {
    const map: CollectionAddressMap = {};
    allZones.forEach((zone) => {
      if (isProxyZone(zone) && zone.name && zone.collectionAddress)
        map[zone.name] = zone.collectionAddress;
    });
    return map;
  }, [allZones, isProxyZone]);

  const sbtCollectionAddressesMap = useMemo(() => {
    const cacheKey = activeSbtZones
      .map((z) => `${z.name}|${z.collectionAddress}`)
      .sort()
      .join(";");
    if (prevSbtMapRef.current && prevSbtMapRef.current.cacheKey === cacheKey)
      return prevSbtMapRef.current.map;
    const map: CollectionAddressMap = {};
    activeSbtZones.forEach((z) => {
      if (z.name && z.collectionAddress) map[z.name] = z.collectionAddress;
    });
    prevSbtMapRef.current = { cacheKey, map };
    return map;
  }, [activeSbtZones]);

  const currentCollectionMap = useMemo(
    () =>
      activeTab === "proxy"
        ? proxyCollectionAddressesMap
        : sbtCollectionAddressesMap,
    [activeTab, proxyCollectionAddressesMap, sbtCollectionAddressesMap]
  );

  useEffect(() => {
    if (selectedDomainZone && !collectionAddress && allZones.length > 0) {
      const zone = allZones.find((z) => z.name === selectedDomainZone);
      if (zone?.collectionAddress) {
        setCollectionAddress(zone.collectionAddress);
      } else {
        const addr = currentCollectionMap[selectedDomainZone];
        if (addr) setCollectionAddress(addr);
      }
    }
  }, [selectedDomainZone, collectionAddress, allZones, currentCollectionMap]);

  const domainZoneName = useMemo(() => {
    if (!selectedDomainZone) return "";
    // selectedDomainZone === zone.name с ончейна. Для "чистых" зон это
    // "4044.ton" и .split(".")[0] честно даёт "4044" — но у зон, чьё имя
    // зарезолвилось "грязным" (например "4044 DNS Domains", без единой
    // точки), split(".")[0] возвращал ВЕСЬ грязный текст без изменений,
    // и он летел в URL картинки/метадаты сабдомена
    // (.../metadata/ton/${domainZoneName}/${subDomainName}.png) при
    // каждом добавлении/проверке сабдомена под такой зоной. cleanZoneDisplayName —
    // та же очистка, что уже применяется к тексту в карточке зоны.
    const cleaned = cleanZoneDisplayName(selectedDomainZone).replace(/\.ton$/i, "");
    if (cleaned !== selectedDomainZone.split(".")[0]) {
      console.warn("[AddSubdomainPage] domainZoneName: cleaned dirty zone name", {
        raw: selectedDomainZone,
        cleaned,
      });
    }
    return cleaned;
  }, [selectedDomainZone]);

  const calculateDomainPrice = useMemo(() => {
    if (activeTab === "sbt") return 500_000_000;
    const len = subDomainName.length;
    return Math.floor((mapPrices[len] || 0.5) * 1_000_000_000);
  }, [subDomainName, activeTab]);

  const calculateBidPrice = useMemo(() => {
    if (activeTab === "sbt" || !auctionInfo) return 0;
    if (customBidAmount && !isNaN(Number(customBidAmount)))
      return Math.floor(Number(customBidAmount) * 1_000_000_000);
    const maxBid = Number(auctionInfo.maxBid);
    return maxBid + Math.ceil(maxBid * 0.05);
  }, [auctionInfo, customBidAmount, activeTab]);

  const canClaim = useMemo(() => {
    if (activeTab === "sbt" || !auctionInfo || !userAddress) return false;
    try {
      if (auctionInfo.maxBidderOwner === null) return false;
      return (
        !auctionInfo.isActive &&
        normalizeAddress(auctionInfo.maxBidderOwner) ===
          normalizeAddress(userAddress)
      );
    } catch {
      return false;
    }
  }, [auctionInfo, userAddress, activeTab]);

  const marketplaceUrl = useMemo(() => {
    if (activeTab === "sbt" || !nftAddress || !collectionAddress) return "";
    const base = isTestnet
      ? "https://testnet.getgems.io"
      : "https://getgems.io";
    return `${base}/collection/${collectionAddress}/${nftAddress}`;
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
      updateAuctionUrl({ zone: selectedDomainZone, subdomain: subDomainName });
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
  }, [selectedDomainZone, subDomainName, showSnackbar, handleCopyAuctionLink]);

  useEffect(() => {
    const sp = launchParams.startParam;
    if (sp) setOpenedViaDeeplink(true);
  }, [launchParams.startParam]);

  useEffect(() => {
    const hasUrlParams = isAuctionPage();
    const hasDeeplink = !!launchParams.startParam;
    if ((hasUrlParams || hasDeeplink) && allZones.length === 0) return;
    // hasUrlParams ПЕРВЫМ, не hasDeeplink — иначе ссылка-"сайт" (обычный
    // https://.../#/add-subdomain?zone=...&subdomain=..., открытая вне
    // Telegram, например другом без Telegram-контекста) ломалась молча:
    // mockEnv.ts (см. mockEnvReady) вне Telegram ВСЕГДА подставляет
    // start_param: 'debug' в замоканные launchParams, поэтому hasDeeplink
    // был true всегда, MiniAppLinks.parseStartapp('debug') падал в catch
    // ничего не сделав, а ветка с реальными query-параметрами из адресной
    // строки (else if hasUrlParams) была недостижима — шаренная зона/аукцион
    // никогда не подставлялись тому, кто открыл ссылку не из Telegram.
    if (hasUrlParams) {
      const p = getAuctionParamsFromUrl();
      if (p.zone && p.subdomain) loadAuctionFromParams(p.zone, p.subdomain);
      else if (p.zone) selectZoneFromParams(p.zone);
    } else if (hasDeeplink) {
      const sp = launchParams.startParam!;
      try {
        const { route, params } = MiniAppLinks.parseStartapp(sp);
        if (route === "/add-subdomain") {
          if (params.zone && params.subdomain) {
            loadAuctionFromParams(params.zone, params.subdomain);
          } else if (params.zone) {
            selectZoneFromParams(params.zone);
          }
        }
      } catch (e) {
        console.error("deeplink parse error:", e);
      }
    }
    // location.search добавлен намеренно: без него, если юзер уже стоит на
    // этой же странице (компонент не размонтируется — тот же роут) и
    // кликает НОВУЮ карточку аукциона с других query-параметров (например,
    // из ProfileWidget/ActiveAuctions), navigate() меняет URL, но этот
    // эффект не перезапускался — allZones/launchParams.startParam не
    // менялись, а на сам location.search эффект не был подписан. Юзер видел
    // "ничего не произошло", пока не уходил со страницы и не возвращался
    // заново (полный ремонт компонента).
    // eslint-disable-next-line
  }, [allZones, launchParams.startParam, location.search]);

  // Домен владельца + время/хэш последней транзакции — для карточки уже
  // занятого сабдомена (реальная история вместо пустой "доступен"-заглушки,
  // см. Log.md 2026-08-10). Резолвится отдельно от основной проверки, чтобы
  // не блокировать показ карточки, если toncenter притормозит на этих
  // дополнительных запросах.
  const resolveOccupiedInfo = useCallback(
    async (ownerAddress: string, itemAddress: string) => {
      const [ownerDomain, txInfo] = await Promise.all([
        resolveAddressToDomain(ownerAddress, isTestnet),
        getAddressLastTransaction(itemAddress, isTestnet),
      ]);
      setOccupiedInfo({
        ownerAddress,
        ownerDomain,
        timestamp: txInfo?.timestamp ?? null,
        txHash: txInfo?.hash ?? null,
      });
    },
    [isTestnet]
  );

  // ====== ПРОВЕРКА ИТЕМА =======
  const handleCheckItem = useCallback(async () => {
    if (!selectedDomainZone || !subDomainName || !collectionAddress) {
      showSnackbar(t("pleaseEnterDomainName"), "error");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(subDomainName)) {
      showSnackbar(t("subdomainInvalidCharsError"), "error");
      return;
    }
    setIsLoading(true);
    setHasChecked(false);
    setOccupiedInfo(null);
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
        setNftAddress(sbtInfo.nftAddress || "");
        showSnackbar(
          sbtInfo.isTaken
            ? t("sbtSubdomainAlreadyTaken")
            : t("sbtSubdomainAvailable"),
          sbtInfo.isTaken ? "error" : "success"
        );
        if (sbtInfo.isTaken && sbtInfo.ownerAddress) {
          resolveOccupiedInfo(sbtInfo.ownerAddress, sbtInfo.nftAddress);
        }
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
        setNftAddress(info.nftAddress || "");
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

          // get_auction_info отдаёт null и для "ещё не было ставок", и для
          // "уже заклеймлен" — сверяемся с platform-cache (собственный кэш
          // subdomain'ов, см. Log.md 2026-08-10), чтобы понять, действительно
          // ли это первая ставка или сабдомен уже кому-то ушёл. Сравнение
          // имени в lowercase с обеих сторон — кэш пишет как на чейне,
          // регистр не гарантирован (тот же класс бага, что и в
          // ActiveAuctions, см. Log.md).
          const cachedSubdomains = await fetchPlatformCache("subdomains", isTestnet, {
            collectionAddress,
          });
          const existing = cachedSubdomains?.find(
            (row) => row.name.toLowerCase() === lowerValue && row.status === "active"
          );

          if (existing?.ownerAddress) {
            showSnackbar(t("subdomainAlreadyTaken"), "error");
            resolveOccupiedInfo(existing.ownerAddress, existing.itemAddress);
          } else {
            showSnackbar(t("subdomainAvailableForFirstBid"), "success");
          }
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
    resolveOccupiedInfo,
  ]);

  // handleCheckItem меняет identity на каждое изменение selectedDomainZone/
  // subDomainName/collectionAddress (они же в его deps). Если звать его из
  // setTimeout, замыкание держит ту версию, что была на момент СОЗДАНИЯ
  // setTimeout — то есть ДО того как synchronous setSelectedDomainZone/
  // setSubDomainName/setCollectionAddress чуть выше успеют перерендерить
  // компонент. Через 500мс срабатывала СТАРАЯ (пустая) версия — отсюда
  // "Зона не выбрана" при первом клике из ProfileWidget (карточка "Перейти"
  // в табе Аукционы), хотя в селектах уже всё стояло правильно, и повторный
  // ручной клик по "Проверить итем" (уже с актуальным handleCheckItem)
  // срабатывал нормально. Ref всегда даёт САМУЮ свежую версию на момент
  // реального вызова, а не на момент постановки в очередь.
  const handleCheckItemRef = useRef(handleCheckItem);
  useEffect(() => {
    handleCheckItemRef.current = handleCheckItem;
  }, [handleCheckItem]);

  const loadAuctionFromParams = useCallback(
    (zoneName: string, subdomainName: string) => {
      // Та же гонка кэша, что и в selectZoneFromParams ниже — если zoneName
      // ещё не попал в allZones, setSelectedDomainZone всё равно проставлял
      // значение, которого нет ни в одной option селекта (визуально пусто/
      // "не найдена"), хотя эффект-вызывающий (см. deeplink-эффект выше) и
      // так перезапустится сам на следующее обновление allZones — просто
      // выходим и ждём этого перезапуска, не портя стейт раньше времени.
      const zone = allZones.find((z) => z.name === zoneName);
      if (!zone) return;
      setOpenedViaDeeplink(true);
      setActiveTab("proxy");
      setSelectedDomainZone(zoneName);
      setSubDomainName(subdomainName);
      setSubDomainNameDisplay(decodeDomainLabel(subdomainName));
      if (zone.collectionAddress) setCollectionAddress(zone.collectionAddress);
      updateUrlWithCurrentAuction();
      setTimeout(() => {
        handleCheckItemRef.current();
        // Тот же автоскролл до таймера/кнопки "Сделать ставку", что уже
        // есть в useAuctionIntegration.ts (клик из ActiveAuctions) — тут
        // его не было вообще, юзер из уведомления бота видел заполненную
        // форму, но должен был сам скроллить вниз, чтобы увидеть результат.
        setTimeout(() => {
          window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        }, 300);
      }, 500);
    },
    [allZones, updateUrlWithCurrentAuction]
  );

  // Для перехода "Создать субдомен" с карточки зоны в профиле — известна
  // только зона, конкретное имя субдомена юзер ещё не ввёл, поэтому просто
  // предвыбираем зону (и таб proxy/sbt по типу зоны), без запуска проверки —
  // и сразу фокусируем поле имени субдомена, чтобы можно было сразу печатать.
  const selectZoneFromParams = useCallback(
    (zoneName: string) => {
      const zone = allZones.find((z) => z.name === zoneName);
      // Если зона ещё не попала в allZones (гонка кэша/редакса), не трогаем
      // таб и не подставляем имя в селект — иначе селект показывает значение,
      // которого нет в списке опций, а таб молча уезжает на proxy по умолчанию
      // ternary-фолбэка ниже.
      if (!zone) return;
      setActiveTab(zone.proxy === 0 ? "sbt" : "proxy");
      setSelectedDomainZone(zoneName);
      if (zone.collectionAddress) setCollectionAddress(zone.collectionAddress);
      setTimeout(() => subdomainNameInputRef.current?.focus(), 300);
    },
    [allZones]
  );

  const handleTabChange = (
    _event: React.SyntheticEvent,
    newValue: ActiveTab
  ) => {
    setActiveTab(newValue);
    setSelectedDomainZone("");
    setSubDomainName("");
    setSubDomainNameDisplay("");
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
      setSubDomainNameDisplay(decodeDomainLabel(subdomain));
      const zone = allZones.find((z) => z.name === zoneName);
      setCollectionAddress(zone?.collectionAddress || "");
      await new Promise((r) => setTimeout(r, 100));
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
      const encoded = encodeDomainLabel(value.toLowerCase());
      setSubDomainNameDisplay(value.toLowerCase());
      setSubDomainName(encoded);
      setSubdomainName(encoded);
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

  const handleBidSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
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

  const getValidUntil = (): number => Math.floor(Date.now() / 1000) + 120;

  const logTx = (label: string, msgs: any[]) => {
    console.log(
      `📦 [${label}] Тело транзакции:`,
      JSON.stringify(
        {
          validUntil: getValidUntil(),
          messages: msgs.map((m) => ({
            amount: m.amount,
            address: m.address,
            payload: m.payload || "(none)",
          })),
        },
        null,
        2
      )
    );
  };

  // ====== API (БД) ======
  // ====== СТАРТ АУКЦИОНА ======
  const handleStartAuction = async () => {
    console.log("🚀 handleStartAuction ВЫЗВАН", {
      selectedDomainZone,
      subDomainName,
      collectionAddress,
      userAddress,
      isTestnet,
    });
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

      const userFriendlyCollectionAddress = Address.parse(
        collectionAddress
      ).toString({
        bounceable: true,
        testOnly: isTestnet,
      });

      const messages = [
        {
          amount: calculateDomainPrice.toString(),
          address: userFriendlyCollectionAddress,
          payload,
        },
      ];
      logTx("START_AUCTION", messages);

      await tonConnectUI.sendTransaction({
        validUntil: getValidUntil(),
        messages,
      });

      const full = `${subDomainName}.${selectedDomainZone}`;
      try {
        apiService.setNetwork(isTestnet);
        await apiService.notifySubdomainCreated({
          name: full,
          address: nftAddress,
          mintPrice: calculateDomainPrice / 1_000_000_000,
          owner: userAddress,
          status: "auction",
        });
        loadAllData(true);
        track('subdomain_created', { type: 'proxy_auction_started' });
        if (tutorial.active && !tutorial.isStepDone('subdomain_created')) {
          tutorial.recordStep('subdomain_created', full);
        }
        showSnackbar(t("startAuction"), "success");
      } catch (dbError: any) {
        console.error("Notify error:", dbError);
        showSnackbar(t("auctionStartedBlockchainDbError"), "error");
      }
      setTimeout(() => handleCheckItem(), 2000);
    } catch (error: any) {
      console.error("START_AUCTION FULL ERROR:", error);
      console.error("ERROR MESSAGE:", error?.message);
      console.error("ERROR STACK:", error?.stack);
      const reason = error?.message?.includes("cancelled")
        ? 'user_cancelled'
        : error?.message?.includes("rejected")
        ? 'wallet_rejected'
        : error?.message?.includes("insufficient")
        ? 'insufficient_funds'
        : String(error?.message || 'unknown').slice(0, 120);
      track('subdomain_creation_failed', { type: 'proxy_auction_started', reason });
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
      const messages = [
        { amount: calculateBidPrice.toString(), address: nftAddress },
      ];
      logTx("PLACE_BID", messages);

      await tonConnectUI.sendTransaction({
        validUntil: getValidUntil(),
        messages,
      });

      const full = `${subDomainName}.${selectedDomainZone}`;
      try {
        apiService.setNetwork(isTestnet);
        await apiService.notifyNewBid({
          domain: full,
          bidder: userAddress,
          amount: calculateBidPrice / 1_000_000_000,
          previousBidder: auctionInfo.maxBidderOwner || undefined,
        });
        loadAllData(true);
      } catch (dbError: any) {
        console.error("Notify error:", dbError);
        showSnackbar(t("bidPlacedBlockchainDbError"), "error");
      }
      track('bid_placed');
      showSnackbar(t("bid"), "success");
      setCustomBidAmount("");
      setShowCustomInput(false);
      setManualBidValue("");
      setTimeout(() => handleCheckItem(), 2000);
    } catch (error: any) {
      const reason = error?.message?.includes("cancelled")
        ? 'user_cancelled'
        : error?.message?.includes("rejected")
        ? 'wallet_rejected'
        : error?.message?.includes("insufficient")
        ? 'insufficient_funds'
        : String(error?.message || 'unknown').slice(0, 120);
      track('bid_failed', { reason });
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

      const userFriendlyCollectionAddress = Address.parse(
        collectionAddress
      ).toString({
        bounceable: true,
        testOnly: isTestnet,
      });

      const messages = [
        {
          amount: calculateDomainPrice.toString(),
          address: userFriendlyCollectionAddress,
          payload,
        },
      ];
      logTx("PURCHASE_SBT", messages);

      await tonConnectUI.sendTransaction({
        validUntil: getValidUntil(),
        messages,
      });

      const full = `${subDomainName}.${selectedDomainZone}`;
      if (!userAddress) throw new Error("No user address");
      const nftAddr = sbtSubdomainInfo?.nftAddress || userAddress;
      // Минт на чейне уже прошёл (транзакция выше подтверждена) — запись в
      // бэкенд-БД дальше чисто для статистики (см. остальные хендлеры выше),
      // не должна валить успешный флоу, если бэкенд недоступен/ответил ошибкой.
      try {
        apiService.setNetwork(isTestnet);
        await apiService.notifySubdomainCreated({
          name: full,
          address: nftAddr,
          mintPrice: calculateDomainPrice / 1_000_000_000,
          owner: userAddress,
          status: "active",
        });
      } catch (dbError) {
        console.error("Notify error:", dbError);
      }
      track('subdomain_created', { type: 'sbt' });
      showSnackbar(t("sbtSubdomainPurchased"), "success");
      setSbtPurchaseCompleted(true);
      if (tutorial.active && !tutorial.isStepDone('subdomain_created')) {
        tutorial.recordStep('subdomain_created');
      }
    } catch (error: any) {
      const cancelled = !!error?.message?.includes("cancelled");
      track('subdomain_creation_failed', {
        type: 'sbt',
        reason: cancelled ? 'user_cancelled' : String(error?.message || 'unknown').slice(0, 120),
      });
      if (cancelled)
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
        await apiService.notifyAuctionEnded({
          domain: full,
          winner: userAddress,
          finalPrice: auctionInfo ? Number(auctionInfo.maxBid) / 1_000_000_000 : 0,
          itemAddress: nftAddress,
          collectionAddress,
        });
      } catch (e) {
        console.error("Notify claim error:", e);
      }
      track('auction_claimed');
      showSnackbar(t("subdomainClaimedSuccess"), "success");
    } catch (error) {
      track('auction_claim_failed', {
        reason: (error instanceof Error ? error.message : 'unknown').slice(0, 120),
      });
      showSnackbar(
        error instanceof Error ? error.message : t("subdomainClaimError"),
        "error"
      );
    } finally {
      setIsClaimLoading(false);
    }
  };

  // ====== UI HELPERS ======
  const getImageUrl = () => {
    if (!domainZoneName || !subDomainName) return "";
    // Бэкенд-генератор рендерит подпись буквально из пути URL — без
    // lowercase тут же ловится тот же баг с регистром в лейбле, что чинили
    // в ActiveAuctions.tsx (см. Log.md 2026-08-10).
    const zone = domainZoneName.toLowerCase();
    const sub = subDomainName.toLowerCase();
    if (activeTab === "proxy")
      return `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${zone}/${sub}.png`;
    return `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${zone}/${sub}.png`;
  };

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
        customBidAmount || (calculateBidPrice / 1_000_000_000).toFixed(2)
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
    light: { primary: "linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)" },
    dark: { primary: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)" },
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

  // ===================================================================
  // RENDER
  // ====================================================================
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
              "&.Mui-selected": { color: isDark ? "#FFD700" : "#3B82F6" },
            },
          }}
        >
          <Tab label={t("sbtNotForSale")} value="sbt" />
          <Tab label={t("proxyForSale")} value="proxy" />
        </Tabs>
      </Box>

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
                onClick={() => setProxyFeaturesExpanded((v) => !v)}
                style={{
                  fontWeight: "bold",
                  marginBottom: "10px",
                  textAlign: "center",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {t("proxyFeatures")}
                <span style={{ fontSize: "18px", lineHeight: 1 }}>{proxyFeaturesExpanded ? "−" : "+"}</span>
              </div>
              {proxyFeaturesExpanded && (
                <ul style={{ paddingLeft: "20px", margin: 0 }}>
                  <li style={{ marginBottom: "8px" }}>{t("proxyFeature1")}</li>
                  <li style={{ marginBottom: "8px" }}>{t("proxyFeature2")}</li>
                  <li style={{ marginBottom: "8px" }}>{t("proxyFeature3")}</li>
                  <li style={{ marginBottom: "8px" }}>{t("proxyFeature4")}</li>
                  <li style={{ marginBottom: "8px" }}>{t("proxyFeature5")}</li>
                  <li style={{ marginBottom: "8px" }}>{t("proxyFeature6")}</li>
                  <li style={{ marginBottom: "8px" }}>{t("proxyFeature7")}</li>
                </ul>
              )}
            </div>
          </Banner>
        </div>
      )}

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
                onClick={() => setSbtFeaturesExpanded((v) => !v)}
                style={{
                  fontWeight: "bold",
                  marginBottom: "10px",
                  textAlign: "center",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {t("sbtFeatures")}
                <span style={{ fontSize: "18px", lineHeight: 1 }}>{sbtFeaturesExpanded ? "−" : "+"}</span>
              </div>
              {sbtFeaturesExpanded && (
                <ul style={{ paddingLeft: "20px", margin: 0 }}>
                  <li style={{ marginBottom: "8px" }}>{t("sbtFeature1")}</li>
                  <li style={{ marginBottom: "8px" }}>{t("sbtFeature2")}</li>
                  <li style={{ marginBottom: "8px" }}>{t("sbtFeature3")}</li>
                  <li style={{ marginBottom: "8px" }}>{t("sbtFeature4")}</li>
                  <li style={{ marginBottom: "8px" }}>{t("sbtFeature5")}</li>
                  <li style={{ marginBottom: "8px" }}>{t("sbtFeature6")}</li>
                  <li style={{ marginBottom: "8px" }}>{t("sbtFeature7")}</li>
                </ul>
              )}
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
        <div>
          <AuctionCollectionSelector
            activeTab={activeTab}
            selectedDomainZone={selectedDomainZone}
            onDomainZoneChange={handleDomainZoneChangeForSelector}
            zonesLoading={zonesLoading}
            zonesError={zonesError}
            userAddress={userAddress}
            isDark={isDark}
            t={t}
            activeSbtZones={activeSbtZones}
            proxyZones={allProxyZones}
          />
        </div>

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
            ref={subdomainNameInputRef}
            placeholder={t("enterSubdomainName")}
            value={subDomainNameDisplay}
            onChange={(e) => {
              const val = sanitizeDomainLabelInput(e.target.value);
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
          {tutorialBlock2Active && tutorialBlock2Intro === null && tutorial.isStepDone('zone_selected') && !subDomainName && (
            <TutorialTooltip
              blockLabel={t('tutorialBlock2Label') || 'Блок 2'}
              stepLabel={t('tutorialStep2Label') || 'Шаг 2'}
              text={t('tutorialSubdomainNameHint') || 'Введите любое имя субдомена — цена для любой длины 0.5 TON, в 2 раза дешевле самого дешёвого домена.'}
              buttons={[]}
              style={{ position: 'static', width: '280px', marginTop: '8px' }}
            />
          )}
        </div>

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

        {/* AUCTION CARD */}
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
                      style={shareIconButtonStyle(isDark)}
                    >
                      <CopyLinkIcon />
                    </IconButton>
                    <IconButton
                      size="s"
                      mode="outline"
                      onClick={handleShareAuction}
                      title={t("shareAuction")}
                      style={shareIconButtonStyle(isDark)}
                    >
                      <ShareArrowIcon size={16} />
                    </IconButton>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* SBT CARD */}
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
                    <strong>{t("occupiedOwnerLabel")}:</strong>
                    <br />
                    <code style={{ fontSize: "12px", wordBreak: "break-all" }}>
                      <a
                        style={{ color: "white" }}
                        href={`https://tonviewer.com/${sbtSubdomainInfo.ownerAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {/* Домен вместо голого адреса, если у владельца есть
                            привязанный .ton — понятнее человеку; пока не
                            зарезолвился (occupiedInfo ещё грузится), просто
                            показываем адрес. Ссылка при этом всегда ведёт на
                            сам адрес — она нужна именно для проверки, а не
                            для красоты. */}
                        {occupiedInfo?.ownerDomain
                          ? `${occupiedInfo.ownerDomain}.ton`
                          : sbtSubdomainInfo.ownerAddress}
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
                  {occupiedInfo?.timestamp && (
                    <div style={{ marginBottom: "10px" }}>
                      <strong>{t("occupiedDateLabel")}:</strong>{" "}
                      {occupiedInfo.txHash ? (
                        <a
                          style={{ color: "white" }}
                          href={`https://tonviewer.com/transaction/${occupiedInfo.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {new Date(occupiedInfo.timestamp * 1000).toLocaleString()}
                        </a>
                      ) : (
                        new Date(occupiedInfo.timestamp * 1000).toLocaleString()
                      )}
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

        {/* OCCUPIED SUBDOMAIN (proxy) — get_auction_info вернул null не
            потому что ставок не было, а потому что сабдомен уже заклеймлен
            (см. resolveOccupiedInfo / handleCheckItem выше). Раньше в этом
            случае молча показывалась "доступен для первой ставки" карточка
            без имени/картинки, потому что airdrop/claim-путь не проверялся
            вообще — теперь сверяемся с platform-cache. */}
        {hasChecked && !auctionInfo && !sbtSubdomainInfo && occupiedInfo && activeTab === "proxy" && (
          <Card
            style={{
              background: "linear-gradient(to bottom, #2a1a1a, #3a2a2a)",
              marginBottom: "20px",
              padding: "15px",
              borderRadius: "10px",
              width: "280px",
              border: "2px solid #f87171",
            }}
          >
            <div style={{ color: "#fff", fontSize: "14px" }}>
              <div
                style={{
                  marginBottom: "10px",
                  textAlign: "center",
                  color: "#f87171",
                  fontWeight: "bold",
                }}
              >
                {`❌ ${t("subdomainAlreadyTaken")}`}
              </div>
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <a
                  href={`https://tonviewer.com/${nftAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
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
                </a>
              </div>
              <div style={{ marginBottom: "10px" }}>
                <strong>{t("occupiedOwnerLabel")}:</strong>
                <br />
                <code style={{ fontSize: "12px", wordBreak: "break-all" }}>
                  <a
                    style={{ color: "white" }}
                    href={`https://tonviewer.com/${occupiedInfo.ownerAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {occupiedInfo.ownerDomain
                      ? `${occupiedInfo.ownerDomain}.ton`
                      : occupiedInfo.ownerAddress}
                  </a>
                </code>
              </div>
              {occupiedInfo.timestamp && (
                <div style={{ marginBottom: "10px" }}>
                  <strong>{t("occupiedDateLabel")}:</strong>{" "}
                  {occupiedInfo.txHash ? (
                    <a
                      style={{ color: "white" }}
                      href={`https://tonviewer.com/transaction/${occupiedInfo.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {new Date(occupiedInfo.timestamp * 1000).toLocaleString()}
                    </a>
                  ) : (
                    new Date(occupiedInfo.timestamp * 1000).toLocaleString()
                  )}
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

        {/* FREE SUBDOMAIN */}
        {hasChecked && !auctionInfo && !sbtSubdomainInfo && !occupiedInfo && (
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
                    <IconButton
                      size="s"
                      mode="outline"
                      onClick={handleCopyAuctionLink}
                      title={t("copyAuctionLink")}
                      style={shareIconButtonStyle(isDark)}
                    >
                      <CopyLinkIcon />
                    </IconButton>
                    <IconButton
                      size="s"
                      mode="outline"
                      onClick={handleShareAuction}
                      title={t("shareAuction")}
                      style={shareIconButtonStyle(isDark)}
                    >
                      <ShareArrowIcon size={16} />
                    </IconButton>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* TIMER */}
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
              onComplete={() => console.log("Аукцион завершен!")}
            />
            <div style={{ fontSize: "11px", color: "#aaa" }}>
              {t("networkLabel")} {isTestnet ? t("testnet") : t("mainnet")}
            </div>
          </Card>
        )}

        {/* BID SELECT */}
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

        {/* Шаг 3: ACTION BUTTON */}
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
            {(activeTab === "sbt" ? sbtLoading : isClaimLoading) && (
              <ScanProgressLoader
                label={t("deploying") || "Деплой"}
                textColor={isDark ? "white" : "#666"}
              />
            )}
          </div>
        )}

        {/* Шаг 4: MARKETPLACE */}
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

        {/* Шаг 4: Настроить профиль — открывает AvatarSecretPage сразу с
            только что созданным/захваченным итемом. address в приоритете
            (см. тот же комментарий у handleOpenAvatarSecret в
            ProfileWidget.tsx) — резолв субдоменов по одному имени через
            tonapi.io/v2/dns/ не работает, там знают только корневые
            .ton-домены, а nftAddress уже известен из sbtSubdomainInfo/
            auctionInfo сразу после покупки/claim. */}
        {(sbtPurchaseCompleted ||
          (auctionInfo && !auctionInfo.isActive && canClaim)) && (
          <div style={{ position: "relative", width: "280px" }}>
            <button
              onClick={() => {
                const params = new URLSearchParams();
                if (nftAddress) params.set("address", nftAddress);
                params.set("domain", `${subDomainName}.${selectedDomainZone}`);
                navigate(`/avatar-secret?${params.toString()}`);
              }}
              style={{
                display: "block",
                width: "280px",
                borderRadius: "25px",
                padding: "11.75px 15px",
                background: "linear-gradient(135deg, #f59e0b, #f97316)",
                color: "white",
                textDecoration: "none",
                textAlign: "center",
                fontWeight: "bold",
                cursor: "pointer",
                border: "none",
                fontSize: "14px",
              }}
            >
              🖼️ Настроить профиль {subDomainName}.{selectedDomainZone}
            </button>
          </div>
        )}

        {/* Шаг 4: Создать торрент — сразу с привязкой к только что созданному
            субдомену (см. эффект чтения ?domain= в CreateTorrentPage). Идёт
            выше кнопки "Создать сайт" — это тоже способ занять субдомен
            контентом, не только собственный сайт-конструктор. */}
        {(sbtPurchaseCompleted ||
          (auctionInfo && !auctionInfo.isActive && canClaim)) && (
          <div style={{ position: "relative", width: "280px" }}>
            <button
              onClick={() =>
                navigate(
                  `/create-torrent?domain=${encodeURIComponent(`${subDomainName}.${selectedDomainZone}`)}`
                )
              }
              style={{
                display: "block",
                width: "280px",
                borderRadius: "25px",
                padding: "11.75px 15px",
                background: "linear-gradient(135deg, #16a34a, #22c55e)",
                color: "white",
                textDecoration: "none",
                textAlign: "center",
                fontWeight: "bold",
                cursor: "pointer",
                border: "none",
                fontSize: "14px",
              }}
            >
              📦 Создать торрент на {subDomainName}.{selectedDomainZone}
            </button>
          </div>
        )}

        {/* Шаг 4: Создать сайт */}
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
              onClick={async () => {
                if (tutorial.active && !tutorial.isStepDone('site_visited')) {
                  await tutorial.recordStep('site_visited');
                  tutorial.resumeStep();
                }
              }}
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
                border: tutorial.active && !tutorial.isStepDone('site_visited')
                  ? `3px solid ${isDark ? '#FFD700' : '#3B82F6'}`
                  : "none",
                fontSize: "14px",
              }}
            >
              🏗️ Создать сайт на {subDomainName}.{selectedDomainZone}
            </a>
            {tutorial.active && !tutorial.isStepDone('site_visited') && (
              <TutorialTooltip
                blockLabel={t('tutorialBlock4Label') || 'Блок 4'}
                stepLabel={t('tutorialStep1Label') || 'Шаг 1'}
                text={t('tutorialCreateSiteHint') || 'Создайте первый сайт — это займёт несколько минут.'}
                buttons={[]}
                style={{ position: 'static', width: '280px', marginTop: '8px' }}
              />
            )}
          </div>
        )}
      </List>

      {/* Блок 2 обучалки: два информационных слайда до интерактивной части
          (выбор зоны/ввод имени уже подсвечиваются прямо в форме выше). */}
      {tutorialBlock2Active && tutorialBlock2Intro !== null && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: '80px', display: 'flex', justifyContent: 'center', zIndex: 1002, padding: '0 16px' }}>
          {tutorialBlock2Intro === 'sbt' && (
            <TutorialTooltip
              blockLabel={t('tutorialBlock2Label') || 'Блок 2'}
              text={t('tutorialBlock2SbtIntro') || 'Здесь вы создадите SBT-субдомен, потратив вашу бесплатную попытку.'}
              buttons={[{ label: t('tutorialNext') || 'Далее', primary: true, onClick: () => setTutorialBlock2Intro('proxy') }]}
              style={{ position: 'static' }}
            />
          )}
          {tutorialBlock2Intro === 'proxy' && (
            <TutorialTooltip
              blockLabel={t('tutorialBlock2Label') || 'Блок 2'}
              text={t('tutorialBlock2ProxyIntro') || 'Кроме SBT есть режим Proxy — субдомены на нём разыгрываются на аукционе и их можно перепродавать. Об этом подробнее в другой раз, а сейчас продолжим с SBT.'}
              buttons={[{ label: t('tutorialNext') || 'Далее', primary: true, onClick: () => setTutorialBlock2Intro(null) }]}
              style={{ position: 'static' }}
            />
          )}
        </div>
      )}
    </Page>
  );
};

export default AuctionPage;
