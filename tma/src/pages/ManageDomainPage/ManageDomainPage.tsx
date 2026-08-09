// src/pages/ManageDomainPage/ManageDomainPage.tsx с фильтром
// import { FC, useState, useEffect, useCallback, useRef } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { useLocation } from "react-router-dom";
// import { Address } from "ton-core";
// import { useTonWallet, useTonConnectUI } from "@tonconnect/ui-react";

// import { ModeTabs } from "@/pages/ManageDomainPage/ModeTabs";
// import {
//   fetchNfts,
//   setSelectedCollection,
//   filterNftsByCollection,
//   fetchZonesFromDB,
//   fetchSubdomainsFromDB,
//   resetNetworkState,
// } from "../../store/nft/actions";

// import { getNFTCollections, CollectionKey } from "../../store/nft/constants";
// import { RootState } from "../../store/rootReducer";

// import {
//   Banner,
//   Button,
//   Cell,
//   Image,
//   Input,
//   List,
//   Placeholder,
// } from "@telegram-apps/telegram-ui";

// import { Page } from "@/components/Page";
// import { ShowSnackbar } from "@/components/ShowSnackbar";
// import { useTonAPI } from "@/hooks/useTonAPI";
// import { shortenAddress } from "@/utils/address";
// import { AppDispatch } from "@/store/store";

// import searchDog from "/src/pages/ManageDomainPage/img/searchDog.gif";

// import {
//   fetchDNSRecords,
//   setWalletRecord,
//   setSiteRecord,
//   setStorageRecord,
//   setNextResolverRecord,
//   deleteWalletRecord,
//   deleteSiteRecord,
//   deleteStorageRecord,
//   deleteNextResolverRecord,
//   resetDNSState,
//   fetchTestnetDNSRecords,
// } from "../../store/dns/dnsRecordsSlice";

// import { useLanguage } from "@/contexts/LanguageContext";
// import { useTheme } from "@/contexts/ThemeContext";
// import { convertRawToUserFriendlyTest } from "@/utils/tonUtils";
// import { apiService } from "@/services/api";

// import { DomainExpirationInfo } from "@/utils/domainExpiredAtFetchConvert";

// import { useBlockchainItems } from "@/services/blockchainItems/blockchain-items-context";
// import { SimpleEnrichedItem } from "@/services/blockchainItems/blockchain-items-types";

// // Интерфейсы
// interface FormData {
//   tonSite: string;
//   isChecked: boolean;
//   tonStorage: string;
//   walletAddress: string;
//   subdomains: string;
// }

// interface DisplayItem {
//   id: string | number;
//   title: string;
//   name?: string;
//   address: string;
//   image?: string;
//   isZone?: boolean;
//   isSubdomain?: boolean;
//   zoneData?: any;
//   subdomainData?: any;
//   metadata?: any;
//   dns?: string;
//   previews?: any[];
//   collection?: any;
//   proxy?: number;
//   subdomainsAmount?: number;
//   mintPrice?: number;
//   status?: string;
//   lastBid?: number;
//   lastBidder?: string;
//   bids?: any[];
//   links?: any[];
//   wrapperAddress?: string;
// }

// export const ManageDomainPage: FC = () => {
//   const dispatch = useDispatch<AppDispatch>();
//   const wallet = useTonWallet();
//   const [tonConnectUI] = useTonConnectUI();
//   const location = useLocation();

//   const { t } = useLanguage();
//   const { currentTheme } = useTheme();
//   const isDark = currentTheme === "dark";

//   const API_PAYLOAD_URL = import.meta.env.VITE_API_SC_PAYLOAD_URL;

//   const isTestnet = wallet?.account?.chain === "-3";

//   // Redux state
//   const nftState = useSelector((state: RootState) => state.nft);

//   // Используем вашу структуру данных
//   const allNfts = isTestnet
//     ? nftState.testnet.allNfts
//     : nftState.mainnet.allNfts;
//   const filteredItems = isTestnet
//     ? nftState.testnet.filteredItems
//     : nftState.mainnet.filteredItems;
//   const selectedCollection = isTestnet
//     ? nftState.testnet.selectedCollection
//     : nftState.mainnet.selectedCollection;
//   const zones = isTestnet ? nftState.testnet.zones : nftState.mainnet.zones;
//   const subdomains = isTestnet
//     ? nftState.testnet.subdomains
//     : nftState.mainnet.subdomains;

//   const isLoading = nftState.loading || false;

//   const dnsState = useSelector((state: RootState) => state.dnsRecords);
//   const dnsLoading = dnsState?.loading || false;
//   const dnsOperationLoading = dnsState?.operationLoading || false;
//   const parsedRecords = dnsState?.parsedRecords || {};
//   const currentDomain = dnsState?.currentDomain || null;

//   const { getNftItem, getNftCollection } = useTonAPI(isTestnet);

//   // Local state
//   const [snackbar, setSnackbar] = useState<JSX.Element | null>(null);
//   const [resolverAddress, setResolverAddress] = useState("");
//   const [isVerified, setIsVerified] = useState(false);
//   const [checkingResolver, setCheckingResolver] = useState(false);
//   const [isAutoCheckTriggered, setIsAutoCheckTriggered] = useState(false);
//   const [editingItem, setEditingItem] = useState<any>(null);
//   const [mode, setMode] = useState<"other" | "service">("service");
//   const [manualCollectionAddress, setManualCollectionAddress] = useState("");
//   const [showInfoBlock, setShowInfoBlock] = useState(false);
//   const [showDNSBlock, setShowDNSBlock] = useState(false);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
//   const [minLength, setMinLength] = useState<number>(0);
//   const [maxLength, setMaxLength] = useState<number>(100);

//   const [formData, setFormData] = useState<FormData>({
//     tonSite: "",
//     isChecked: false,
//     tonStorage: "",
//     walletAddress: "",
//     subdomains: "",
//   });

//   const [originalFormData, setOriginalFormData] = useState<FormData>({
//     tonSite: "",
//     isChecked: false,
//     tonStorage: "",
//     walletAddress: "",
//     subdomains: "",
//   });

//   // Refs
//   const infoBlockRef = useRef<HTMLDivElement>(null);
//   const dnsBlockRef = useRef<HTMLDivElement>(null);
//   const hasLoadedData = useRef(false);
//   const prevMode = useRef(mode);
//   const prevSelectedCollection = useRef(selectedCollection);
//   const prevIsTestnet = useRef(isTestnet);

//   // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
//   const showSnackbar = (
//     message: string,
//     type: "success" | "error" | "sent" = "success"
//   ) => {
//     setSnackbar(
//       <ShowSnackbar
//         message={message}
//         type={type}
//         onClose={() => setSnackbar(null)}
//       />
//     );
//   };

//   const handleInputChange = (
//     field: keyof FormData,
//     value: string | boolean
//   ) => {
//     setFormData((prev) => ({
//       ...prev,
//       [field]: value,
//     }));
//   };

//   const { userProxySubdomains, userSBTSubdomains, userNFTWrappers } =
//     useBlockchainItems();

//   // ====== АДАПТЕР (НОВОЕ) ======
//   const enrichedItemToDisplayItem = useCallback(
//     (item: SimpleEnrichedItem, isZone: boolean): DisplayItem => {
//       const name =
//         item.metadata?.token_info?.[0]?.name || item.domain || "Без названия";

//       const image =
//         item.metadata?.image ||
//         item.metadata?.token_info?.[0]?.image ||
//         item.metadata?.token_info?.[0]?.extra?._image_small;

//       return {
//         id: item.address,
//         title: name,
//         address: item.address,
//         isZone,
//         isSubdomain: !isZone,
//         image: image || "",
//         metadata: item.metadata,
//       };
//     },
//     []
//   );

//   // ========== Функция для получения URL изображения ==========
//   const getItemImageUrl = (item: DisplayItem): string => {
//     if (item.isZone) {
//       const zone = item.zoneData || item;
//       const zoneName = zone.name?.replace(".ton", "") || "";

//       if (zone.proxy === 0) {
//         return `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${zoneName}.png`;
//       } else {
//         return `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${zoneName}.png`;
//       }
//     }

//     if (item.isSubdomain) {
//       const subdomain = item.subdomainData || item;
//       const fullName = subdomain.name || "";
//       const isProxy = item.status === "claimed" ? true : false;

//       const parts = fullName.split(".");
//       if (parts.length >= 3) {
//         const subdomainName = parts[0];
//         const domainName = parts.slice(1).join(".");
//         const cleanDomainName = domainName.replace(".ton", "");

//         const zone = subdomain.zone || item.zoneData;
//         console.log(
//           `Структура зоны для getImgUrl для субдомена: ${subdomainName}.${cleanDomainName}.ton = ${JSON.stringify(
//             zone
//           )}, статус из перменной isProxy = ${isProxy}`
//         );

//         if (isProxy) {
//           return `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${cleanDomainName}/${subdomainName}.png`;
//         } else {
//           return `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${cleanDomainName}/${subdomainName}.png`;
//         }
//       }
//     }

//     if (item.previews?.[1]?.url) {
//       return item.previews[1].url;
//     }

//     if (item.metadata?.image) {
//       return item.metadata.image;
//     }

//     return searchDog;
//   };

//   // ========== Очистка формы ==========
//   const resetFormData = () => {
//     const emptyForm: FormData = {
//       tonSite: "",
//       isChecked: false,
//       tonStorage: "",
//       walletAddress: "",
//       subdomains: "",
//     };
//     setFormData(emptyForm);
//     setOriginalFormData(emptyForm);
//   };

//   // ========== Эффект 1: Загрузка данных при подключении кошелька и смене режима ==========
//   useEffect(() => {
//     if (!wallet?.account?.address) {
//       console.log("⚠️ Кошелек не подключен");
//       return;
//     }

//     const cleanAddress = wallet.account.address.startsWith("0x")
//       ? wallet.account.address.slice(2)
//       : wallet.account.address;

//     console.log("📡 Проверка загрузки данных:", {
//       mode,
//       isTestnet,
//       walletAddress: cleanAddress,
//       hasLoadedData: hasLoadedData.current,
//       selectedCollection,
//     });

//     // Всегда сбрасываем данные при смене режима
//     if (prevMode.current !== mode) {
//       console.log("🔄 Смена режима, сбрасываем данные");
//       hasLoadedData.current = false;
//       prevMode.current = mode;
//       dispatch(resetNetworkState(isTestnet));
//     }

//     if (!hasLoadedData.current) {
//       console.log("📥 Начинаем загрузку данных для режима:", mode);
//       hasLoadedData.current = true;

//       if (mode === "other") {
//         console.log("📥 Загружаем NFT...");
//         dispatch(fetchNfts({ walletAddress: cleanAddress, isTestnet }));
//       } else {
//         console.log("📥 Загружаем зоны и субдомены...");

//         let userAddressForDB = cleanAddress;

//         if (isTestnet) {
//           userAddressForDB = convertRawToUserFriendlyTest(cleanAddress);

//           // Если функции нет, используем raw адрес (но это может быть проблемой)
//           console.log(
//             "⚠️ Для testnet может потребоваться преобразование адреса"
//           );
//         }

//         console.log("📥 Загружаем зоны для адреса:", userAddressForDB);
//         console.log("📥 Загружаем субдомены для адреса:", userAddressForDB);

//         dispatch(
//           fetchZonesFromDB({ userAddress: userAddressForDB, isTestnet })
//         );
//         dispatch(
//           fetchSubdomainsFromDB({ userAddress: userAddressForDB, isTestnet })
//         );
//       }
//     }
//   }, [dispatch, wallet, isTestnet, mode, selectedCollection]);

//   // ========== Эффект 2: Фильтрация данных при изменении коллекции или данных ==========
//   useEffect(() => {
//     if (
//       prevSelectedCollection.current !== selectedCollection ||
//       prevIsTestnet.current !== isTestnet
//     ) {
//       console.log("🔄 Обновление фильтрации:", {
//         selectedCollection,
//         isTestnet,
//         allNftsLength: allNfts.length,
//         zonesLength: zones.length,
//         subdomainsLength: subdomains.length,
//       });

//       // Фильтруем данные в зависимости от режима и коллекции
//       if (mode === "other") {
//         // Для NFT режима
//         if (allNfts.length > 0 && selectedCollection !== "any") {
//           dispatch(
//             filterNftsByCollection({
//               nfts: allNfts,
//               collectionKey: selectedCollection as CollectionKey,
//               isTestnet,
//             })
//           );
//         }
//       }

//       // Обновляем refs
//       prevSelectedCollection.current = selectedCollection;
//       prevIsTestnet.current = isTestnet;
//     }
//   }, [
//     dispatch,
//     mode,
//     selectedCollection,
//     isTestnet,
//     allNfts,
//     zones,
//     subdomains,
//   ]);

//   // ========== Эффект 4: Обработка параметра адреса из URL ==========
//   useEffect(() => {
//     const params = new URLSearchParams(location.search);
//     const address = params.get("address");
//     if (address) {
//       try {
//         setResolverAddress(Address.parse(address).toString());
//         setIsAutoCheckTriggered(true);
//       } catch (error) {
//         console.error("Invalid address from URL:", error);
//       }
//     }
//   }, [location]);

//   // ========== Эффект 5: Автоматическая проверка адреса из URL ==========
//   useEffect(() => {
//     if (isAutoCheckTriggered && resolverAddress) {
//       handleCheckResolverAddress();
//       setIsAutoCheckTriggered(false);
//     }
//   }, [resolverAddress, isAutoCheckTriggered]);

//   // ========== Эффект 6: Обновление формы при получении DNS записей ==========
//   useEffect(() => {
//     if (currentDomain && parsedRecords[currentDomain] && editingItem) {
//       const record = parsedRecords[currentDomain];
//       const newFormData: FormData = {
//         tonSite: record.siteAdnl || "",
//         isChecked: false,
//         tonStorage: record.storageBagId || "",
//         walletAddress: record.walletAddress || "",
//         subdomains: record.nextResolver || "",
//       };

//       console.log("📝 Обновляем форму с DNS записями:", newFormData);
//       setFormData(newFormData);
//       setOriginalFormData(newFormData);
//     }
//   }, [currentDomain, parsedRecords, editingItem]);

//   // ========== Функция проверки resolver address ==========
//   const handleCheckResolverAddress = async () => {
//     try {
//       if (!resolverAddress) {
//         showSnackbar(t("addressPlaceholder"), "error");
//         return;
//       }

//       setCheckingResolver(true);

//       // Проверяем, является ли это валидным адресом
//       const address = Address.parse(resolverAddress).toString();

//       // Для режима Other проверяем NFT
//       if (mode === "other") {
//         const nftInfo = await getNftItem(address);
//         if (nftInfo) {
//           setIsVerified(true);
//           showSnackbar(t("nftVerifiedSuccessfully"), "success");
//         } else {
//           showSnackbar(t("nftNotFound"), "error");
//         }
//       } else {
//         // Для режима Service проверяем зону или субдомен
//         setIsVerified(true);
//         showSnackbar(t("itemVerifiedSuccessfully"), "success");
//       }
//     } catch (error: any) {
//       console.error("Error checking resolver address:", error);
//       showSnackbar(error.message || "Ошибка проверки адреса", "error");
//     } finally {
//       setCheckingResolver(false);
//     }
//   };

//   // ========== Обработчик клика на итем ==========
//   const handleItemClick = useCallback(
//     async (item: any) => {
//       console.log("🔍 Клик на итем:", item);

//       resetFormData();
//       setShowInfoBlock(true);
//       setShowDNSBlock(false);
//       setEditingItem(item);

//       // Для режима Other запускаем проверку NFT
//       if (mode === "other") {
//         try {
//           const nftInfo = await getNftItem(item.address);
//           if (nftInfo) {
//             console.log("✅ NFT найден:", nftInfo);

//             // Получаем DNS имя
//             const dnsName = item.dns || item.metadata?.name || item.title;
//             if (dnsName) {
//               // Загружаем DNS записи для t.me и .ton коллекций
//               if (
//                 selectedCollection === "tme" ||
//                 selectedCollection === "ton"
//               ) {
//                 if (isTestnet) {
//                   dispatch(fetchTestnetDNSRecords(dnsName));
//                 } else {
//                   dispatch(fetchDNSRecords(dnsName));
//                 }
//                 // dispatch(fetchDNSRecords(dnsName));
//               }
//             }
//           }
//         } catch (error) {
//           console.error("❌ Ошибка проверки NFT:", error);
//         }
//       }

//       // Автоскролл к информационному блоку
//       setTimeout(() => {
//         infoBlockRef.current?.scrollIntoView({
//           behavior: "smooth",
//           block: "start",
//         });
//       }, 100);
//     },
//     [mode, getNftItem, selectedCollection, dispatch]
//   );

//   // ========== Обработчик кнопки "Управлять" ==========
//   const handleManageClick = useCallback(async () => {
//     if (!editingItem) return;

//     setShowDNSBlock(true);

//     // Устанавливаем адрес для редактирования
//     let itemAddress = "";

//     if (mode === "other") {
//       itemAddress = editingItem.address;
//     } else {
//       if (editingItem.isZone) {
//         // Проверяем, является ли это proxy зоной (proxy === 1)
//         // ВАЖНО: editingItem.proxy может быть строкой или числом
//         const proxyValue = editingItem.proxy;
//         const isProxyZone = proxyValue === 1 || proxyValue === "1";

//         if (isProxyZone) {
//           // Если есть wrapperAddress - используем его
//           if (editingItem.wrapperAddress) {
//             itemAddress = editingItem.wrapperAddress;
//           } else {
//             // Получаем адрес владельца NFT через TON API
//             try {
//               const baseTONApiUri = isTestnet
//                 ? "testnet.tonapi.io"
//                 : "tonapi.io";
//               const response = await fetch(
//                 `https://${baseTONApiUri}/v2/nfts/${editingItem.address}`
//               );

//               if (!response.ok) {
//                 throw new Error(`TON API error: ${response.status}`);
//               }

//               const nftData = await response.json();

//               if (nftData.owner?.address) {
//                 itemAddress = nftData.owner.address;
//                 console.log(
//                   `Для прокси зоны с доменом ${editingItem.name} и адрессом домена ${editingItem.address} - адрес NFT Wrapper найден: ${itemAddress}`
//                 );

//                 // Сохраняем wrapperAddress в базу данных
//                 try {
//                   await apiService.updateZoneWrapper(
//                     editingItem.name,
//                     itemAddress
//                   );
//                   console.log(
//                     `✅ Wrapper адрес сохранен для зоны ${editingItem.name}: ${itemAddress}`
//                   );
//                 } catch (error) {
//                   console.error("❌ Ошибка сохранения wrapper адреса:", error);
//                   // Не прерываем выполнение, просто логируем ошибку
//                 }
//               } else {
//                 throw new Error("Не удалось получить адрес владельца NFT");
//               }
//             } catch (error) {
//               console.error("❌ Ошибка получения адреса владельца:", error);
//               // В случае ошибки используем оригинальный адрес
//               itemAddress = editingItem.address;
//               showSnackbar(
//                 "Не удалось получить адрес враппера, используем оригинальный адрес",
//                 "error"
//               );
//             }
//           }
//         } else {
//           // Для не-proxy зон используем оригинальный адрес
//           itemAddress = editingItem.address;
//         }
//       } else {
//         // Для субдоменов используем оригинальный адрес
//         itemAddress = editingItem.address;
//       }
//     }

//     setResolverAddress(itemAddress);
//     setIsVerified(true);

//     // Загружаем DNS записи ТОЛЬКО если их еще нет
//     const itemName =
//       mode === "other"
//         ? editingItem.dns || editingItem.metadata?.name || editingItem.title
//         : editingItem.name || editingItem.title;

//     // Проверяем, не загружены ли уже записи для этого домена
//     const hasRecords =
//       currentDomain === itemName && Object.keys(parsedRecords).length > 0;

//     if (itemName && !dnsLoading && !hasRecords) {
//       console.log("📡 Загружаем DNS записи для:", itemName);
//       if (isTestnet) {
//         dispatch(fetchTestnetDNSRecords(itemName));
//       } else {
//         dispatch(fetchDNSRecords(itemName));
//       }
//     } else if (hasRecords) {
//       console.log("✅ DNS записи уже загружены для:", itemName);
//     }

//     // Автоскролл к блоку DNS записей
//     setTimeout(() => {
//       dnsBlockRef.current?.scrollIntoView({
//         behavior: "smooth",
//         block: "start",
//       });
//     }, 100);
//   }, [editingItem, mode, isTestnet, dispatch, showSnackbar]);

//   // ========== Обработчик для таба "Any" ==========
//   const handleAnyTabSubmit = async () => {
//     if (!manualCollectionAddress) {
//       showSnackbar(t("pleaseEnterDomainName"), "error");
//       return;
//     }

//     try {
//       setCheckingResolver(true);

//       // Проверяем, является ли это валидным адресом
//       const address = Address.parse(manualCollectionAddress).toString();

//       // Пытаемся получить информацию об NFT
//       let nftInfo = await getNftItem(address);
//       if (!nftInfo || nftInfo.title === "") {
//         nftInfo = await getNftCollection(address);
//       }

//       if (nftInfo && nftInfo.title) {
//         // Создаем временный итем для отображения
//         const tempItem = {
//           id: `any_${Date.now()}`,
//           title: nftInfo.title,
//           address: address,
//           metadata: nftInfo,
//           previews: nftInfo.image ? [{ url: nftInfo.image }] : [],
//         };

//         setEditingItem(tempItem);
//         setShowInfoBlock(true);
//         setShowDNSBlock(false);

//         // Автоскролл
//         setTimeout(() => {
//           infoBlockRef.current?.scrollIntoView({
//             behavior: "smooth",
//             block: "start",
//           });
//         }, 100);

//         showSnackbar(t("itemFoundSuccessfully"), "success");
//       } else {
//         showSnackbar(t("itemNotFound"), "error");
//       }
//     } catch (error: any) {
//       console.error("Error checking address:", error);
//       showSnackbar(error.message || "Ошибка проверки адреса", "error");
//     } finally {
//       setCheckingResolver(false);
//     }
//   };

//   // ========== Функции для работы с DNS записями ==========
//   const handleSaveWalletAddress = async () => {
//     try {
//       if (!resolverAddress) throw new Error(t("addressPlaceholder"));
//       if (!tonConnectUI) throw new Error(t("walletNotConnected"));

//       if (
//         formData.walletAddress &&
//         formData.walletAddress !== originalFormData.walletAddress
//       ) {
//         const result = await dispatch(
//           setWalletRecord({
//             dnsItemAddress: resolverAddress,
//             userWalletAddress: formData.walletAddress,
//             tonConnectUI: tonConnectUI,
//           })
//         );

//         if (result.payload) {
//           showSnackbar(
//             t("walletAddress") + " " + t("proxyDeployedSuccessfully"),
//             "success"
//           );
//           setOriginalFormData({ ...formData });
//         }
//       } else if (!formData.walletAddress && originalFormData.walletAddress) {
//         const result = await dispatch(
//           deleteWalletRecord({
//             dnsItemAddress: resolverAddress,
//             tonConnectUI: tonConnectUI,
//           })
//         );

//         if (result.payload) {
//           showSnackbar(
//             t("walletAddress") + " " + t("transactionNotConfirmed"),
//             "success"
//           );
//           setOriginalFormData({ ...formData });
//         }
//       }
//     } catch (error: any) {
//       console.error(error);
//       showSnackbar(error.message, "error");
//     }
//   };

//   const handleSaveTonSite = async () => {
//     try {
//       if (!resolverAddress) throw new Error(t("addressPlaceholder"));
//       if (!tonConnectUI) throw new Error(t("walletNotConnected"));

//       if (formData.tonSite && formData.tonSite !== originalFormData.tonSite) {
//         const result = await dispatch(
//           setSiteRecord({
//             dnsItemAddress: resolverAddress,
//             adnlAddressHex: formData.tonSite,
//             tonConnectUI: tonConnectUI,
//           })
//         );

//         if (result.payload) {
//           showSnackbar(
//             t("tonSites") + " " + t("proxyDeployedSuccessfully"),
//             "success"
//           );
//           setOriginalFormData({ ...formData });
//         }
//       } else if (!formData.tonSite && originalFormData.tonSite) {
//         const result = await dispatch(
//           deleteSiteRecord({
//             dnsItemAddress: resolverAddress,
//             tonConnectUI: tonConnectUI,
//           })
//         );

//         if (result.payload) {
//           showSnackbar(
//             t("tonSites") + " " + t("transactionNotConfirmed"),
//             "success"
//           );
//           setOriginalFormData({ ...formData });
//         }
//       }
//     } catch (error: any) {
//       console.error(error);
//       showSnackbar(error.message, "error");
//     }
//   };

//   const handleSaveTonStorage = async () => {
//     try {
//       if (!resolverAddress) throw new Error(t("addressPlaceholder"));
//       if (!tonConnectUI) throw new Error(t("walletNotConnected"));

//       if (
//         formData.tonStorage &&
//         formData.tonStorage !== originalFormData.tonStorage
//       ) {
//         const result = await dispatch(
//           setStorageRecord({
//             dnsItemAddress: resolverAddress,
//             bagIdHex: formData.tonStorage,
//             tonConnectUI: tonConnectUI,
//           })
//         );

//         if (result.payload) {
//           showSnackbar(
//             t("tonStorage") + " " + t("proxyDeployedSuccessfully"),
//             "success"
//           );
//           setOriginalFormData({ ...formData });
//         }
//       } else if (!formData.tonStorage && originalFormData.tonStorage) {
//         const result = await dispatch(
//           deleteStorageRecord({
//             dnsItemAddress: resolverAddress,
//             tonConnectUI: tonConnectUI,
//           })
//         );

//         if (result.payload) {
//           showSnackbar(
//             t("tonStorage") + " " + t("transactionNotConfirmed"),
//             "success"
//           );
//           setOriginalFormData({ ...formData });
//         }
//       }
//     } catch (error: any) {
//       console.error(error);
//       showSnackbar(error.message, "error");
//     }
//   };

//   const handleSaveSubdomains = async () => {
//     try {
//       if (!resolverAddress) throw new Error(t("addressPlaceholder"));
//       if (!tonConnectUI) throw new Error(t("walletNotConnected"));

//       if (
//         formData.subdomains &&
//         formData.subdomains !== originalFormData.subdomains
//       ) {
//         const result = await dispatch(
//           setNextResolverRecord({
//             dnsItemAddress: resolverAddress,
//             resolverAddress: formData.subdomains,
//             tonConnectUI: tonConnectUI,
//           })
//         );

//         if (result.payload) {
//           showSnackbar(
//             t("subdomainsNextResolver") + " " + t("proxyDeployedSuccessfully"),
//             "success"
//           );
//           setOriginalFormData({ ...formData });
//         }
//       } else if (!formData.subdomains && originalFormData.subdomains) {
//         const result = await dispatch(
//           deleteNextResolverRecord({
//             dnsItemAddress: resolverAddress,
//             tonConnectUI: tonConnectUI,
//           })
//         );

//         if (result.payload) {
//           showSnackbar(
//             t("subdomainsNextResolver") + " " + t("transactionNotConfirmed"),
//             "success"
//           );
//           setOriginalFormData({ ...formData });
//         }
//       }
//     } catch (error: any) {
//       console.error(error);
//       showSnackbar(error.message, "error");
//     }
//   };

//   // ========== Функция продления домена ==========
//   const handleRenewDomain = async () => {
//     if (!editingItem || !tonConnectUI) {
//       showSnackbar(t("walletNotConnected"), "error");
//       return;
//     }

//     try {
//       let targetAddress = "";
//       let domainName = "";

//       if (mode === "other") {
//         // Для NFT доменов
//         targetAddress = editingItem.address;
//         domainName =
//           editingItem.dns || editingItem.metadata?.name || editingItem.title;
//       } else {
//         // Для зон и субдоменов
//         if (editingItem.isZone) {
//           // Проверяем, является ли это proxy зоной
//           const proxyValue = editingItem.proxy;
//           const isProxyZone = proxyValue === 1 || proxyValue === "1";

//           if (isProxyZone) {
//             // Если есть wrapperAddress - используем его
//             if (editingItem.wrapperAddress) {
//               targetAddress = editingItem.wrapperAddress;
//             } else {
//               // Получаем адрес владельца NFT через TON API
//               const baseTONApiUri = isTestnet
//                 ? "testnet.tonapi.io"
//                 : "tonapi.io";
//               const response = await fetch(
//                 `https://${baseTONApiUri}/v2/nfts/${editingItem.address}`
//               );

//               if (!response.ok) {
//                 throw new Error(`TON API error: ${response.status}`);
//               }

//               const nftData = await response.json();

//               if (nftData.owner?.address) {
//                 targetAddress = nftData.owner.address;

//                 console.log(
//                   `Для прокси зоны с доменом ${editingItem.name} и адрессом домена ${editingItem.address} - адрес NFT Wrapper найден: ${targetAddress}`
//                 );

//                 // Сохраняем wrapperAddress в базу данных
//                 try {
//                   await apiService.updateZoneWrapper(
//                     editingItem.name,
//                     targetAddress
//                   );
//                   console.log(
//                     `✅ Wrapper адрес сохранен для зоны ${editingItem.name}: ${targetAddress}`
//                   );
//                 } catch (error) {
//                   console.error("❌ Ошибка сохранения wrapper адреса:", error);
//                   // Не прерываем выполнение, просто логируем ошибку
//                 }
//               } else {
//                 throw new Error("Не удалось получить адрес владельца NFT");
//               }
//             }
//           } else {
//             // Для не-proxy зон используем оригинальный адрес
//             targetAddress = editingItem.address;
//           }
//         } else {
//           // Для субдоменов используем оригинальный адрес
//           targetAddress = editingItem.address;
//         }

//         domainName = editingItem.name || editingItem.title;
//       }

//       if (!targetAddress) {
//         showSnackbar("Не удалось определить адрес для продления", "error");
//         return;
//       }

//       // Сумма для продления (0.02 TON в нанотонах)
//       const amountInNano = 0.05 * 1_000_000_000;

//       const userFriendlyAddress = convertRawToUserFriendlyTest(targetAddress);
//       console.log(`Адрес враппера для продления: ${userFriendlyAddress}`);
//       // Создаем транзакцию
//       const transaction = {
//         validUntil: Math.floor(Date.now() / 1000) + 600, // 10 минут
//         messages: [
//           {
//             address: userFriendlyAddress,
//             amount: amountInNano.toString(),
//           },
//         ],
//       };

//       // Отправляем транзакцию
//       const result = await tonConnectUI.sendTransaction(transaction);

//       showSnackbar(
//         `Транзакция на продление домена ${domainName} отправлена`,
//         "success"
//       );

//       // Можно добавить логику проверки статуса транзакции
//       console.log("✅ Транзакция отправлена:", result);
//     } catch (error: any) {
//       console.error("❌ Ошибка продления домена:", error);
//       showSnackbar(error.message || "Ошибка отправки транзакции", "error");
//     }
//   };

//   // ========== Обработчик смены режима ==========
//   const handleModeChange = (newMode: "other" | "service") => {
//     console.log("🔄 Смена режима:", newMode);
//     setMode(newMode);
//     setShowInfoBlock(false);
//     setShowDNSBlock(false);
//     setEditingItem(null);
//     resetFormData();
//     dispatch(resetDNSState());

//     const defaultCollection = newMode === "service" ? "zones" : "ton";
//     console.log("🎯 Устанавливаем коллекцию по умолчанию:", defaultCollection);

//     // Сбрасываем флаг загрузки данных
//     hasLoadedData.current = false;

//     dispatch(
//       setSelectedCollection({
//         collectionKey: defaultCollection as CollectionKey,
//         isTestnet,
//       })
//     );
//   };

//   // ========== Обработчик смены таба ==========
//   const handleTabChange = useCallback(
//     (collectionKey: string) => {
//       console.log("🎯 Смена таба:", collectionKey);

//       dispatch(
//         setSelectedCollection({
//           collectionKey: collectionKey as CollectionKey,
//           isTestnet,
//         })
//       );

//       setShowInfoBlock(false);
//       setShowDNSBlock(false);
//       setEditingItem(null);
//       dispatch(resetDNSState());
//       resetFormData();

//       // Для таба "any" очищаем поле ручного ввода
//       if (collectionKey === "any") {
//         setManualCollectionAddress("");
//       }
//     },
//     [dispatch, isTestnet]
//   );

//   // ========== Получение отфильтрованных элементов с учетом поиска и фильтров ==========
//   // const getFilteredItemsForMode = useCallback(() => {
//   //   console.log("🔍 getFilteredItemsForMode вызван:", {
//   //     mode,
//   //     selectedCollection,
//   //     isTestnet,
//   //     allNftsLength: allNfts.length,
//   //     zonesLength: zones.length,
//   //     subdomainsLength: subdomains.length,
//   //     filteredItemsLength: filteredItems.length,
//   //     searchQuery,
//   //     minLength,
//   //     maxLength,
//   //     sortOrder,
//   //   });

//   //   let items = [];

//   //   // Если есть отфильтрованные элементы из Redux, используем их
//   //   if (filteredItems.length > 0 && mode === "other") {
//   //     items = filteredItems;
//   //   } else if (mode === "other") {
//   //     // Для режима Other фильтруем NFT по адресам коллекций
//   //     const nftCollections = getNFTCollections(isTestnet);
//   //     const collectionInfo =
//   //       nftCollections[selectedCollection as keyof typeof nftCollections];

//   //     if (!collectionInfo || selectedCollection === "any") {
//   //       // Для таба "any" показываем пустой массив
//   //       if (selectedCollection === "any") {
//   //         return [];
//   //       }
//   //       // Для других табов показываем все NFT
//   //       items = allNfts;
//   //     } else {
//   //       // Фильтруем NFT по адресу коллекции
//   //       const collectionAddress = collectionInfo.address;
//   //       items = allNfts.filter((nft: any) => {
//   //         const nftCollectionAddress = nft.collection?.address;
//   //         if (!nftCollectionAddress) return false;
//   //         return (
//   //           nftCollectionAddress.toLowerCase() ===
//   //           collectionAddress.toLowerCase()
//   //         );
//   //       });
//   //     }
//   //   } else {
//   //     // Для режима Service фильтруем зоны и субдомены
//   //     if (selectedCollection === "zones") {
//   //       // Фильтруем зоны по статусу (только active или claimed)

//   //       if (!Array.isArray(zones)) {
//   //         console.error("❌ zones не является массивом:", zones);
//   //         return [];
//   //       }

//   //       items = zones.filter((zone: any) => {
//   //         const status = zone.status?.toLowerCase();
//   //         const isActive = status === "active" || status === "claimed";
//   //         return isActive;
//   //       });
//   //       console.log(`✅ Отфильтровано зон: ${items.length} из ${zones.length}`);
//   //     } else if (selectedCollection === "subdomains") {
//   //       // Фильтруем субдомены по статусу (только active или claimed)

//   //       if (!Array.isArray(subdomains)) {
//   //         console.error("❌ subdomains не является массивом:", subdomains);
//   //         return [];
//   //       }

//   //       items = subdomains.filter((subdomain: any) => {
//   //         const status = subdomain.status?.toLowerCase();
//   //         const isActive = status === "active" || status === "claimed";
//   //         return isActive;
//   //       });
//   //       console.log(
//   //         `✅ Отфильтровано субдоменов: ${items.length} из ${subdomains.length}`
//   //       );
//   //     } else if (selectedCollection === "any") {
//   //       return [];
//   //     }
//   //   }

//   //   // Применяем поиск по названию
//   //   if (searchQuery.trim() !== "") {
//   //     const query = searchQuery.toLowerCase();
//   //     items = items.filter((item: any) => {
//   //       const title =
//   //         item.title || item.dns || item.metadata?.name || item.name || "";
//   //       return title.toLowerCase().includes(query);
//   //     });
//   //   }

//   //   // Применяем фильтр по длине
//   //   items = items.filter((item: any) => {
//   //     const title =
//   //       item.title || item.dns || item.metadata?.name || item.name || "";
//   //     const length = title.length;
//   //     return length >= minLength && length <= maxLength;
//   //   });

//   //   // Применяем сортировку
//   //   items.sort((a: any, b: any) => {
//   //     const titleA = a.title || a.dns || a.metadata?.name || a.name || "";
//   //     const titleB = b.title || b.dns || b.metadata?.name || b.name || "";

//   //     if (sortOrder === "asc") {
//   //       return titleA.length - titleB.length;
//   //     } else {
//   //       return titleB.length - titleA.length;
//   //     }
//   //   });

//   //   // Преобразуем в формат DisplayItem
//   //   return items
//   //     .map((item: any, index: number) => {
//   //       if (!item) return null;

//   //       return {
//   //         ...item,
//   //         title:
//   //           item.title ||
//   //           item.dns ||
//   //           item.metadata?.name ||
//   //           item.name ||
//   //           "Unnamed",
//   //         address:
//   //           item.address || item.wrapperAddress || `item_${item.id || index}`,
//   //         id: item.id || item.address || `item_${Date.now()}_${index}`,
//   //         isZone: mode === "service" && selectedCollection === "zones",
//   //         isSubdomain:
//   //           mode === "service" && selectedCollection === "subdomains",
//   //       };
//   //     })
//   //     .filter(Boolean); // Удаляем null значения
//   // }, [
//   //   mode,
//   //   selectedCollection,
//   //   isTestnet,
//   //   allNfts,
//   //   zones,
//   //   subdomains,
//   //   filteredItems,
//   //   searchQuery,
//   //   minLength,
//   //   maxLength,
//   //   sortOrder,
//   // ]);

//   const getFilteredItemsForMode = useCallback(() => {
//     let items: any[] = [];

//     // ===== MODE: service → ончейн-данные =====
//     if (mode === "service") {
//       switch (selectedCollection) {
//         case "subdomains":
//           items = [
//             ...userProxySubdomains.map((item) =>
//               enrichedItemToDisplayItem(item, false)
//             ),
//             ...userSBTSubdomains.map((item) =>
//               enrichedItemToDisplayItem(item, false)
//             ),
//           ];
//           break;
//         case "zones":
//           items = userNFTWrappers.map((item) =>
//             enrichedItemToDisplayItem(item, true)
//           );
//           break;
//         case "any":
//         default:
//           return [];
//       }
//     }

//     // ===== MODE: other → старый Redux (NFT) =====
//     if (mode === "other") {
//       if (filteredItems.length > 0) {
//         items = filteredItems as any[];
//       } else {
//         const nftCollections = getNFTCollections(isTestnet);
//         const collectionInfo =
//           nftCollections[selectedCollection as keyof typeof nftCollections];

//         if (!collectionInfo || selectedCollection === "any") {
//           if (selectedCollection === "any") return [];
//           items = allNfts;
//         } else {
//           const collectionAddress = collectionInfo.address;
//           items = allNfts.filter((nft: any) => {
//             const nftCollectionAddress = nft.collection?.address;
//             if (!nftCollectionAddress) return false;
//             return (
//               nftCollectionAddress.toLowerCase() ===
//               collectionAddress.toLowerCase()
//             );
//           });
//         }
//       }
//     }

//     // ===== Общие фильтры =====

//     // Поиск по названию
//     if (searchQuery.trim() !== "") {
//       const query = searchQuery.toLowerCase();
//       items = items.filter((item: any) => {
//         const title =
//           item.title || item.dns || item.metadata?.name || item.name || "";
//         return title.toLowerCase().includes(query);
//       });
//     }

//     // Фильтр по длине
//     items = items.filter((item: any) => {
//       const title =
//         item.title || item.dns || item.metadata?.name || item.name || "";
//       const length = title.length;
//       return length >= minLength && length <= maxLength;
//     });

//     // Сортировка
//     items.sort((a: any, b: any) => {
//       const titleA = a.title || a.dns || a.metadata?.name || a.name || "";
//       const titleB = b.title || b.dns || b.metadata?.name || b.name || "";
//       if (sortOrder === "asc") return titleA.length - titleB.length;
//       return titleB.length - titleA.length;
//     });

//     // Преобразование в DisplayItem
//     return items
//       .map((item: any, index: number) => {
//         if (!item) return null;
//         return {
//           ...item,
//           title:
//             item.title ||
//             item.dns ||
//             item.metadata?.name ||
//             item.name ||
//             "Unnamed",
//           address:
//             item.address || item.wrapperAddress || `item_${item.id || index}`,
//           id: item.id || item.address || `item_${Date.now()}_${index}`,
//           isZone:
//             item.isZone ??
//             (mode === "service" && selectedCollection === "zones"),
//           isSubdomain:
//             item.isSubdomain ??
//             (mode === "service" && selectedCollection === "subdomains"),
//         };
//       })
//       .filter(Boolean);
//   }, [
//     mode,
//     selectedCollection,
//     isTestnet,
//     allNfts,
//     filteredItems,
//     searchQuery,
//     minLength,
//     maxLength,
//     sortOrder,
//     userProxySubdomains,
//     userSBTSubdomains,
//     userNFTWrappers,
//     enrichedItemToDisplayItem,
//   ]);

//   // ========== Компонент поиска и фильтрации ==========
//   const SearchAndFilterSection = () => {
//     const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);

//     return (
//       <div
//         style={{
//           background: isDark ? "#2d2d2d" : "#f5f5f5",
//           borderRadius: "12px",
//           padding: "15px",
//           margin: "10px",
//           display: "flex",
//           flexDirection: "column",
//           gap: "12px",
//         }}
//       >
//         {/* Заголовок и кнопка расширенного фильтра */}
//         <div
//           style={{
//             display: "flex",
//             justifyContent: "space-between",
//             alignItems: "center",
//           }}
//         >
//           <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//             <svg
//               width="20"
//               height="20"
//               viewBox="0 0 24 24"
//               fill="none"
//               stroke={isDark ? "white" : "black"}
//               strokeWidth="2"
//             >
//               <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
//             </svg>
//             <span
//               style={{
//                 fontSize: "14px",
//                 fontWeight: "600",
//                 color: isDark ? "white" : "black",
//               }}
//             >
//               Поиск и фильтрация
//             </span>
//           </div>

//           <Button
//             size="s"
//             mode="outline"
//             onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
//             style={{
//               padding: "6px 12px",
//               fontSize: "12px",
//             }}
//           >
//             {showAdvancedFilter ? "Скрыть фильтры" : "Расширенные фильтры"}
//           </Button>
//         </div>

//         {/* Поле поиска */}
//         <Input
//           placeholder="Поиск по названию..."
//           value={searchQuery}
//           onChange={(e) => setSearchQuery(e.target.value)}
//           style={{
//             background: isDark ? "#3d3d3d" : "white",
//             color: isDark ? "white" : "black",
//           }}
//         />

//         {/* Базовые фильтры */}
//         <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
//           <Button
//             onClick={() => setSortOrder("asc")}
//             style={{
//               padding: "8px 12px",
//               borderRadius: "8px",
//               fontSize: "12px",
//               fontWeight: "600",
//               background:
//                 sortOrder === "asc"
//                   ? isDark
//                     ? "#4CAF50"
//                     : "#4CAF50"
//                   : isDark
//                   ? "#3d3d3d"
//                   : "#e0e0e0",
//               color:
//                 sortOrder === "asc" ? "white" : isDark ? "#cccccc" : "#666666",
//             }}
//           >
//             Короткие → Длинные
//           </Button>
//           <Button
//             onClick={() => setSortOrder("desc")}
//             style={{
//               padding: "8px 12px",
//               borderRadius: "8px",
//               fontSize: "12px",
//               fontWeight: "600",
//               background:
//                 sortOrder === "desc"
//                   ? isDark
//                     ? "#4CAF50"
//                     : "#4CAF50"
//                   : isDark
//                   ? "#3d3d3d"
//                   : "#e0e0e0",
//               color:
//                 sortOrder === "desc" ? "white" : isDark ? "#cccccc" : "#666666",
//             }}
//           >
//             Длинные → Короткие
//           </Button>
//         </div>

//         {/* Расширенные фильтры */}
//         {showAdvancedFilter && (
//           <div
//             style={{
//               display: "flex",
//               flexDirection: "column",
//               gap: "10px",
//               padding: "10px",
//               background: isDark ? "#3d3d3d" : "#e8e8e8",
//               borderRadius: "8px",
//             }}
//           >
//             <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
//               <span
//                 style={{
//                   color: isDark ? "white" : "#666",
//                   fontSize: "12px",
//                   minWidth: "60px",
//                 }}
//               >
//                 Длина:
//               </span>
//               <Input
//                 type="number"
//                 placeholder="Мин"
//                 value={minLength}
//                 onChange={(e) => setMinLength(parseInt(e.target.value) || 0)}
//                 style={{
//                   width: "80px",
//                   background: isDark ? "#2d2d2d" : "white",
//                   color: isDark ? "white" : "black",
//                 }}
//               />
//               <span style={{ color: isDark ? "white" : "#666" }}>-</span>
//               <Input
//                 type="number"
//                 placeholder="Макс"
//                 value={maxLength}
//                 onChange={(e) => setMaxLength(parseInt(e.target.value) || 100)}
//                 style={{
//                   width: "80px",
//                   background: isDark ? "#2d2d2d" : "white",
//                   color: isDark ? "white" : "black",
//                 }}
//               />
//             </div>

//             {/* Дополнительные фильтры для Service Mode */}
//             {mode === "service" && (
//               <>
//                 <div
//                   style={{ display: "flex", gap: "8px", alignItems: "center" }}
//                 >
//                   <span
//                     style={{
//                       color: isDark ? "white" : "#666",
//                       fontSize: "12px",
//                       minWidth: "60px",
//                     }}
//                   >
//                     Статус:
//                   </span>
//                   <Button
//                     size="s"
//                     style={{
//                       padding: "6px 12px",
//                       fontSize: "11px",
//                       background: isDark ? "#3d3d3d" : "#e0e0e0",
//                       color: isDark ? "white" : "#666",
//                     }}
//                   >
//                     Active
//                   </Button>
//                   <Button
//                     size="s"
//                     style={{
//                       padding: "6px 12px",
//                       fontSize: "11px",
//                       background: isDark ? "#3d3d3d" : "#e0e0e0",
//                       color: isDark ? "white" : "#666",
//                     }}
//                   >
//                     Claimed
//                   </Button>
//                 </div>

//                 {selectedCollection === "zones" && (
//                   <div
//                     style={{
//                       display: "flex",
//                       gap: "8px",
//                       alignItems: "center",
//                     }}
//                   >
//                     <span
//                       style={{
//                         color: isDark ? "white" : "#666",
//                         fontSize: "12px",
//                         minWidth: "60px",
//                       }}
//                     >
//                       Тип:
//                     </span>
//                     <Button
//                       size="s"
//                       style={{
//                         padding: "6px 12px",
//                         fontSize: "11px",
//                         background: isDark ? "#3d3d3d" : "#e0e0e0",
//                         color: isDark ? "white" : "#666",
//                       }}
//                     >
//                       SBT
//                     </Button>
//                     <Button
//                       size="s"
//                       style={{
//                         padding: "6px 12px",
//                         fontSize: "11px",
//                         background: isDark ? "#3d3d3d" : "#e0e0e0",
//                         color: isDark ? "white" : "#666",
//                       }}
//                     >
//                       Proxy
//                     </Button>
//                   </div>
//                 )}
//               </>
//             )}

//             {/* Дополнительные фильтры для Other Mode */}
//             {mode === "other" && (
//               <div
//                 style={{ display: "flex", gap: "8px", alignItems: "center" }}
//               >
//                 <span
//                   style={{
//                     color: isDark ? "white" : "#666",
//                     fontSize: "12px",
//                     minWidth: "60px",
//                   }}
//                 >
//                   Коллекция:
//                 </span>
//                 <Button
//                   size="s"
//                   style={{
//                     padding: "6px 12px",
//                     fontSize: "11px",
//                     background: isDark ? "#3d3d3d" : "#e0e0e0",
//                     color: isDark ? "white" : "#666",
//                   }}
//                 >
//                   Все
//                 </Button>
//                 <Button
//                   size="s"
//                   style={{
//                     padding: "6px 12px",
//                     fontSize: "11px",
//                     background: isDark ? "#3d3d3d" : "#e0e0e0",
//                     color: isDark ? "white" : "#666",
//                   }}
//                 >
//                   .ton
//                 </Button>
//                 <Button
//                   size="s"
//                   style={{
//                     padding: "6px 12px",
//                     fontSize: "11px",
//                     background: isDark ? "#3d3d3d" : "#e0e0e0",
//                     color: isDark ? "white" : "#666",
//                   }}
//                 >
//                   t.me
//                 </Button>
//               </div>
//             )}
//           </div>
//         )}
//       </div>
//     );
//   };

//   // Получаем отфильтрованные элементы для отображения
//   const displayItems = getFilteredItemsForMode();

//   console.log("🎯 displayItems для рендера:", {
//     mode,
//     selectedCollection,
//     count: displayItems.length,
//     zonesCount: zones.length,
//     subdomainsCount: subdomains.length,
//     allNftsCount: allNfts.length,
//     filteredItemsCount: filteredItems.length,
//   });

//   // Если zones или subdomains пустые, проверьте:
//   if (mode === "service" && (zones.length === 0 || subdomains.length === 0)) {
//     console.log("⚠️ zones или subdomains пустые:", {
//       zones: zones,
//       subdomains: subdomains,
//       isTestnet,
//       walletAddress: wallet?.account?.address,
//     });
//   }

//   // ========== РЕНДЕРИНГ КОМПОНЕНТА ==========
//   return (
//     <Page>
//       <div style={{ padding: "10px" }}>
//         {/* Баннер с информацией о сети */}
//         <Banner
//           header={isTestnet ? "Testnet" : "Mainnet"}
//           subheader={isTestnet ? "Вы в тестовой сети" : "Вы в основной сети"}
//           style={{
//             marginBottom: "10px",
//             background: isDark ? "#2d2d2d" : "#f0f0f0",
//             color: isDark ? "white" : "black",
//           }}
//         />

//         {/* Переключатель режимов */}
//         <ModeTabs
//           mode={mode}
//           onModeChange={handleModeChange}
//           // isTestnet={isTestnet}
//           // selectedCollection={selectedCollection}
//           onTabChange={handleTabChange}
//           // collections={displayItems}
//           nftsCount={mode === "other" ? allNfts.length : 0}
//           zonesCount={mode === "service" ? zones.length : 0}
//           subdomainsCount={mode === "service" ? subdomains.length : 0}
//         />

//         {/* Поле для ручного ввода (только для таба "any") */}
//         {selectedCollection === "any" && (
//           <div
//             style={{
//               marginBottom: "15px",
//               padding: "15px",
//               background: isDark ? "#2d2d2d" : "#f5f5f5",
//               borderRadius: "12px",
//             }}
//           >
//             <div
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 gap: "10px",
//                 marginBottom: "10px",
//               }}
//             >
//               <svg
//                 width="20"
//                 height="20"
//                 viewBox="0 0 24 24"
//                 fill="none"
//                 stroke={isDark ? "white" : "black"}
//                 strokeWidth="2"
//               >
//                 <circle cx="11" cy="11" r="8"></circle>
//                 <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
//               </svg>
//               <span
//                 style={{
//                   fontSize: "14px",
//                   fontWeight: "600",
//                   color: isDark ? "white" : "black",
//                 }}
//               >
//                 Ручной ввод адреса
//               </span>
//             </div>

//             <div style={{ display: "flex", gap: "10px" }}>
//               <Input
//                 placeholder="Введите адрес NFT или коллекции..."
//                 value={manualCollectionAddress}
//                 onChange={(e) => setManualCollectionAddress(e.target.value)}
//                 style={{
//                   flex: 1,
//                   background: isDark ? "#3d3d3d" : "white",
//                   color: isDark ? "white" : "black",
//                 }}
//               />
//               <Button
//                 onClick={handleAnyTabSubmit}
//                 loading={checkingResolver}
//                 style={{
//                   padding: "10px 20px",
//                   background: isDark ? "#4CAF50" : "#4CAF50",
//                   color: "white",
//                 }}
//               >
//                 Проверить
//               </Button>
//             </div>

//             <div
//               style={{
//                 marginTop: "10px",
//                 fontSize: "12px",
//                 color: isDark ? "#aaaaaa" : "#666666",
//               }}
//             >
//               Введите адрес NFT (.ton, t.me) или коллекции для проверки
//             </div>
//           </div>
//         )}

//         {/* Компонент поиска и фильтрации */}
//         {selectedCollection !== "any" && displayItems.length > 0 && (
//           <SearchAndFilterSection />
//         )}

//         {/* Состояние загрузки */}
//         {isLoading && (
//           <div
//             style={{
//               textAlign: "center",
//               padding: "40px 20px",
//               color: isDark ? "white" : "#666",
//             }}
//           >
//             <Image
//               src={searchDog}
//               style={{ width: "100px", height: "100px", margin: "0 auto" }}
//             />
//             <div style={{ fontSize: "16px", marginBottom: "10px" }}>
//               Загрузка данных...
//             </div>
//             <div style={{ fontSize: "12px" }}>Пожалуйста, подождите</div>
//           </div>
//         )}

//         {/* Список элементов */}
//         {!isLoading && displayItems.length > 0 ? (
//           <List style={{ background: "transparent", marginBottom: "120px" }}>
//             {displayItems.map((item: DisplayItem) => (
//               <Cell
//                 key={item.id}
//                 before={
//                   <Image
//                     src={getItemImageUrl(item)}
//                     style={{
//                       width: "120px",
//                       height: "120px",
//                       borderRadius: "8px",
//                     }}
//                   />
//                 }
//                 after={
//                   <Button
//                     size="s"
//                     onClick={() => handleItemClick(item)}
//                     style={{
//                       padding: "6px 12px",
//                       fontSize: "12px",
//                       background: isDark ? "#4CAF50" : "#4CAF50",
//                       color: "white",
//                     }}
//                   >
//                     Выбрать
//                   </Button>
//                 }
//                 subtitle={shortenAddress(item.address)}
//                 style={{
//                   marginBottom: "8px",
//                   background: isDark ? "#2d2d2d" : "white",
//                   borderRadius: "12px",
//                   cursor: "pointer",
//                 }}
//                 onClick={() => handleItemClick(item)}
//               >
//                 <div
//                   style={{
//                     fontSize: "14px",
//                     fontWeight: "600",
//                     color: isDark ? "white" : "black",
//                   }}
//                 >
//                   {item.title}
//                 </div>
//                 {item.isZone && (
//                   <div
//                     style={{
//                       fontSize: "12px",
//                       color: isDark ? "#aaaaaa" : "#666666",
//                       marginTop: "2px",
//                     }}
//                   >
//                     {item.proxy === 0 ? "SBT Zone" : "Proxy Zone"} •{" "}
//                     {item.subdomainsAmount || 0} субдоменов
//                   </div>
//                 )}
//                 {item.isSubdomain && (
//                   <div
//                     style={{
//                       fontSize: "12px",
//                       color: isDark ? "#aaaaaa" : "#666666",
//                       marginTop: "2px",
//                     }}
//                   >
//                     Субдомен •{" "}
//                     {item.mintPrice ? `${item.mintPrice} TON` : "Free"}
//                   </div>
//                 )}
//               </Cell>
//             ))}
//           </List>
//         ) : !isLoading && selectedCollection !== "any" ? (
//           <Placeholder
//             header="Нет элементов"
//             description="У вас нет элементов в этой категории"
//             style={{
//               margin: "40px 20px",
//               color: isDark ? "white" : "#666",
//             }}
//           >
//             <Image
//               src={searchDog}
//               style={{ width: "100px", height: "100px", margin: "0 auto" }}
//             />
//           </Placeholder>
//         ) : null}

//         {/* Информационный блок (показывается при выборе элемента) */}
//         {showInfoBlock && editingItem && (
//           <div
//             ref={infoBlockRef}
//             style={{
//               marginTop: "20px",
//               padding: "15px",
//               background: isDark ? "#2d2d2d" : "#f5f5f5",
//               borderRadius: "12px",
//               marginBottom: "120px",
//             }}
//           >
//             <div
//               style={{
//                 display: "flex",
//                 justifyContent: "space-between",
//                 alignItems: "center",
//                 marginBottom: "15px",
//               }}
//             >
//               <div
//                 style={{ display: "flex", alignItems: "center", gap: "10px" }}
//               >
//                 <Image
//                   src={getItemImageUrl(editingItem)}
//                   style={{
//                     width: "120px",
//                     height: "120px",
//                     borderRadius: "8px",
//                   }}
//                 />
//                 <div>
//                   <div
//                     style={{
//                       fontSize: "16px",
//                       fontWeight: "600",
//                       color: isDark ? "white" : "black",
//                     }}
//                   >
//                     {editingItem.title}
//                   </div>
//                   <div
//                     style={{
//                       fontSize: "12px",
//                       color: isDark ? "#aaaaaa" : "#666666",
//                     }}
//                   >
//                     {shortenAddress(editingItem.address)}
//                   </div>
//                 </div>
//               </div>

//               <Button
//                 size="s"
//                 onClick={handleManageClick}
//                 style={{
//                   padding: "8px 16px",
//                   background: isDark ? "#4CAF50" : "#4CAF50",
//                   color: "white",
//                 }}
//               >
//                 Управлять
//               </Button>
//             </div>

//             {/* Дополнительная информация */}
//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
//                 gap: "10px",
//                 marginBottom: "15px",
//               }}
//             >
//               {editingItem.isZone && (
//                 <>
//                   <div
//                     style={{
//                       padding: "10px",
//                       background: isDark ? "#3d3d3d" : "#e8e8e8",
//                       borderRadius: "8px",
//                       textAlign: "center",
//                     }}
//                   >
//                     <div
//                       style={{
//                         fontSize: "12px",
//                         color: isDark ? "#aaaaaa" : "#666666",
//                         marginBottom: "4px",
//                       }}
//                     >
//                       Тип
//                     </div>
//                     <div
//                       style={{
//                         fontSize: "14px",
//                         fontWeight: "600",
//                         color: isDark ? "white" : "black",
//                       }}
//                     >
//                       {editingItem.proxy === 0 ? "SBT Zone" : "Proxy Zone"}
//                     </div>
//                   </div>

//                   <div
//                     style={{
//                       padding: "10px",
//                       background: isDark ? "#3d3d3d" : "#e8e8e8",
//                       borderRadius: "8px",
//                       textAlign: "center",
//                     }}
//                   >
//                     <div
//                       style={{
//                         fontSize: "12px",
//                         color: isDark ? "#aaaaaa" : "#666666",
//                         marginBottom: "4px",
//                       }}
//                     >
//                       Субдомены
//                     </div>
//                     <div
//                       style={{
//                         fontSize: "14px",
//                         fontWeight: "600",
//                         color: isDark ? "white" : "black",
//                       }}
//                     >
//                       {editingItem.subdomainsAmount || 0}
//                     </div>
//                   </div>
//                 </>
//               )}

//               {editingItem.isSubdomain && (
//                 <>
//                   <div
//                     style={{
//                       padding: "10px",
//                       background: isDark ? "#3d3d3d" : "#e8e8e8",
//                       borderRadius: "8px",
//                       textAlign: "center",
//                     }}
//                   >
//                     <div
//                       style={{
//                         fontSize: "12px",
//                         color: isDark ? "#aaaaaa" : "#666666",
//                         marginBottom: "4px",
//                       }}
//                     >
//                       Цена минта
//                     </div>
//                     <div
//                       style={{
//                         fontSize: "14px",
//                         fontWeight: "600",
//                         color: isDark ? "white" : "black",
//                       }}
//                     >
//                       {editingItem.mintPrice
//                         ? `${editingItem.mintPrice} TON`
//                         : "Free"}
//                     </div>
//                   </div>

//                   <div
//                     style={{
//                       padding: "10px",
//                       background: isDark ? "#3d3d3d" : "#e8e8e8",
//                       borderRadius: "8px",
//                       textAlign: "center",
//                     }}
//                   >
//                     <div
//                       style={{
//                         fontSize: "12px",
//                         color: isDark ? "#aaaaaa" : "#666666",
//                         marginBottom: "4px",
//                       }}
//                     >
//                       Статус
//                     </div>
//                     <div
//                       style={{
//                         fontSize: "14px",
//                         fontWeight: "600",
//                         color: isDark ? "white" : "black",
//                       }}
//                     >
//                       {editingItem.status || "Unknown"}
//                     </div>
//                   </div>
//                 </>
//               )}

//               {mode === "other" && editingItem.collection && (
//                 <div
//                   style={{
//                     padding: "10px",
//                     background: isDark ? "#3d3d3d" : "#e8e8e8",
//                     borderRadius: "8px",
//                     textAlign: "center",
//                   }}
//                 >
//                   <div
//                     style={{
//                       fontSize: "12px",
//                       color: isDark ? "#aaaaaa" : "#666666",
//                       marginBottom: "4px",
//                     }}
//                   >
//                     Коллекция
//                   </div>
//                   <div
//                     style={{
//                       fontSize: "14px",
//                       fontWeight: "600",
//                       color: isDark ? "white" : "black",
//                     }}
//                   >
//                     {editingItem.collection.name || "Unknown"}
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* Кнопка продления (только для Service Mode) */}
//             {mode === "service" && editingItem && (
//               <div className="renewWrapper" style={{ marginTop: "15px" }}>
//                 {/* Информация об истечении домена */}
//                 <DomainExpirationInfo
//                   domainName={editingItem.name || editingItem.title}
//                   isTestnet={isTestnet}
//                 />

//                 <Button
//                   onClick={handleRenewDomain}
//                   style={{
//                     width: "100%",
//                     padding: "12px",
//                     background: isDark ? "#2196F3" : "#2196F3",
//                     color: "white",
//                     marginTop: "10px",
//                   }}
//                 >
//                   Продлить домен (0.02 TON)
//                 </Button>
//               </div>
//             )}
//           </div>
//         )}

//         {/* Блок DNS записей (показывается при нажатии "Управлять") */}
//         {showDNSBlock && isVerified && (
//           <div
//             ref={dnsBlockRef}
//             style={{
//               marginTop: "20px",
//               padding: "15px",
//               background: isDark ? "#2d2d2d" : "#f5f5f5",
//               borderRadius: "12px",
//               marginBottom: "120px",
//             }}
//           >
//             <div
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 gap: "10px",
//                 marginBottom: "15px",
//               }}
//             >
//               <svg
//                 width="20"
//                 height="20"
//                 viewBox="0 0 24 24"
//                 fill="none"
//                 stroke={isDark ? "white" : "black"}
//                 strokeWidth="2"
//               >
//                 <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
//               </svg>
//               <span
//                 style={{
//                   fontSize: "16px",
//                   fontWeight: "600",
//                   color: isDark ? "white" : "black",
//                 }}
//               >
//                 Управление DNS записями
//               </span>
//             </div>

//             {/* Поле для адреса */}
//             <div style={{ marginBottom: "15px" }}>
//               <div
//                 style={{
//                   fontSize: "12px",
//                   color: isDark ? "#aaaaaa" : "#666666",
//                   marginBottom: "5px",
//                 }}
//               >
//                 Адрес для управления:
//               </div>
//               <Input
//                 value={resolverAddress}
//                 onChange={(e) => setResolverAddress(e.target.value)}
//                 style={{
//                   background: isDark ? "#3d3d3d" : "white",
//                   color: isDark ? "white" : "black",
//                 }}
//               />
//             </div>

//             {/* DNS записи */}
//             <div
//               style={{ display: "flex", flexDirection: "column", gap: "15px" }}
//             >
//               {/* Кошелек */}
//               <div>
//                 <div
//                   style={{
//                     display: "flex",
//                     justifyContent: "space-between",
//                     alignItems: "center",
//                     marginBottom: "8px",
//                   }}
//                 >
//                   <span
//                     style={{
//                       fontSize: "14px",
//                       fontWeight: "600",
//                       color: isDark ? "white" : "black",
//                     }}
//                   >
//                     Кошелек
//                   </span>
//                   <Button
//                     size="s"
//                     onClick={handleSaveWalletAddress}
//                     loading={dnsOperationLoading}
//                     style={{
//                       padding: "6px 12px",
//                       fontSize: "12px",
//                       background: isDark ? "#4CAF50" : "#4CAF50",
//                       color: "white",
//                     }}
//                   >
//                     Сохранить
//                   </Button>
//                 </div>
//                 <Input
//                   placeholder="Введите адрес кошелька..."
//                   value={formData.walletAddress}
//                   onChange={(e) =>
//                     handleInputChange("walletAddress", e.target.value)
//                   }
//                   style={{
//                     background: isDark ? "#3d3d3d" : "white",
//                     color: isDark ? "white" : "black",
//                   }}
//                 />
//               </div>

//               {/* TON Сайт */}
//               <div>
//                 <div
//                   style={{
//                     display: "flex",
//                     justifyContent: "space-between",
//                     alignItems: "center",
//                     marginBottom: "8px",
//                   }}
//                 >
//                   <span
//                     style={{
//                       fontSize: "14px",
//                       fontWeight: "600",
//                       color: isDark ? "white" : "black",
//                     }}
//                   >
//                     TON Сайт
//                   </span>
//                   <Button
//                     size="s"
//                     onClick={handleSaveTonSite}
//                     loading={dnsOperationLoading}
//                     style={{
//                       padding: "6px 12px",
//                       fontSize: "12px",
//                       background: isDark ? "#4CAF50" : "#4CAF50",
//                       color: "white",
//                     }}
//                   >
//                     Сохранить
//                   </Button>
//                 </div>
//                 <Input
//                   placeholder="Введите ADNL адрес..."
//                   value={formData.tonSite}
//                   onChange={(e) => handleInputChange("tonSite", e.target.value)}
//                   style={{
//                     background: isDark ? "#3d3d3d" : "white",
//                     color: isDark ? "white" : "black",
//                   }}
//                 />
//               </div>

//               {/* TON Хранилище */}
//               <div>
//                 <div
//                   style={{
//                     display: "flex",
//                     justifyContent: "space-between",
//                     alignItems: "center",
//                     marginBottom: "8px",
//                   }}
//                 >
//                   <span
//                     style={{
//                       fontSize: "14px",
//                       fontWeight: "600",
//                       color: isDark ? "white" : "black",
//                     }}
//                   >
//                     TON Хранилище
//                   </span>
//                   <Button
//                     size="s"
//                     onClick={handleSaveTonStorage}
//                     loading={dnsOperationLoading}
//                     style={{
//                       padding: "6px 12px",
//                       fontSize: "12px",
//                       background: isDark ? "#4CAF50" : "#4CAF50",
//                       color: "white",
//                     }}
//                   >
//                     Сохранить
//                   </Button>
//                 </div>
//                 <Input
//                   placeholder="Введите Bag ID..."
//                   value={formData.tonStorage}
//                   onChange={(e) =>
//                     handleInputChange("tonStorage", e.target.value)
//                   }
//                   style={{
//                     background: isDark ? "#3d3d3d" : "white",
//                     color: isDark ? "white" : "black",
//                   }}
//                 />
//               </div>

//               {/* Субдомены */}
//               <div>
//                 <div
//                   style={{
//                     display: "flex",
//                     justifyContent: "space-between",
//                     alignItems: "center",
//                     marginBottom: "8px",
//                   }}
//                 >
//                   <span
//                     style={{
//                       fontSize: "14px",
//                       fontWeight: "600",
//                       color: isDark ? "white" : "black",
//                     }}
//                   >
//                     Субдомены (Next Resolver)
//                   </span>
//                   <Button
//                     size="s"
//                     onClick={handleSaveSubdomains}
//                     loading={dnsOperationLoading}
//                     style={{
//                       padding: "6px 12px",
//                       fontSize: "12px",
//                       background: isDark ? "#4CAF50" : "#4CAF50",
//                       color: "white",
//                     }}
//                   >
//                     Сохранить
//                   </Button>
//                 </div>
//                 <Input
//                   placeholder="Введите адрес резолвера..."
//                   value={formData.subdomains}
//                   onChange={(e) =>
//                     handleInputChange("subdomains", e.target.value)
//                   }
//                   style={{
//                     background: isDark ? "#3d3d3d" : "white",
//                     color: isDark ? "white" : "black",
//                   }}
//                 />
//               </div>
//             </div>

//             {/* Информация о статусе */}
//             <div
//               style={{
//                 marginTop: "15px",
//                 padding: "10px",
//                 background: isDark ? "#3d3d3d" : "#e8e8e8",
//                 borderRadius: "8px",
//                 fontSize: "12px",
//                 color: isDark ? "#aaaaaa" : "#666666",
//               }}
//             >
//               <div
//                 style={{
//                   display: "flex",
//                   alignItems: "center",
//                   gap: "5px",
//                   marginBottom: "5px",
//                 }}
//               >
//                 <svg
//                   width="14"
//                   height="14"
//                   viewBox="0 0 24 24"
//                   fill="none"
//                   stroke="currentColor"
//                   strokeWidth="2"
//                 >
//                   <circle cx="12" cy="12" r="10"></circle>
//                   <line x1="12" y1="16" x2="12" y2="12"></line>
//                   <line x1="12" y1="8" x2="12.01" y2="8"></line>
//                 </svg>
//                 <span>Информация</span>
//               </div>
//               <div>
//                 • Изменения вступят в силу после подтверждения транзакции
//               </div>
//               <div>
//                 • Для удаления записи очистите поле и нажмите "Сохранить"
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Snackbar для уведомлений */}
//         {snackbar}
//       </div>
//     </Page>
//   );
// };

// export default ManageDomainPage;

// src/pages/ManageDomainPage/ManageDomainPage.tsx
// Версия с ончейн-сервисом, пагинацией (по 10), изображениями из ProfileWidget/MarketPage,
// переработанными карточками и полной интернационализацией.

// import { FC, useState, useEffect, useCallback, useRef } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { useLocation } from "react-router-dom";
// import { Address } from "ton-core";
// import { useTonWallet, useTonConnectUI } from "@tonconnect/ui-react";

// import { ModeTabs } from "@/pages/ManageDomainPage/ModeTabs";
// import {
//   fetchNfts,
//   setSelectedCollection,
//   filterNftsByCollection,
//   fetchZonesFromDB,
//   fetchSubdomainsFromDB,
//   resetNetworkState,
// } from "../../store/nft/actions";

// import { getNFTCollections, CollectionKey } from "../../store/nft/constants";
// import { RootState } from "../../store/rootReducer";

// import {
//   Banner,
//   Button,
//   Image,
//   Input,
//   List,
//   Placeholder,
// } from "@telegram-apps/telegram-ui";

// import { Page } from "@/components/Page";
// import { ShowSnackbar } from "@/components/ShowSnackbar";
// import { useTonAPI } from "@/hooks/useTonAPI";
// import { shortenAddress } from "@/utils/address";
// import { AppDispatch } from "@/store/store";

// import searchDog from "/src/pages/ManageDomainPage/img/searchDog.gif";

// import {
//   fetchDNSRecords,
//   setWalletRecord,
//   setSiteRecord,
//   setStorageRecord,
//   setNextResolverRecord,
//   deleteWalletRecord,
//   deleteSiteRecord,
//   deleteStorageRecord,
//   deleteNextResolverRecord,
//   resetDNSState,
//   fetchTestnetDNSRecords,
// } from "../../store/dns/dnsRecordsSlice";

// import { useLanguage } from "@/contexts/LanguageContext";
// import { useTheme } from "@/contexts/ThemeContext";
// import { convertRawToUserFriendlyTest } from "@/utils/tonUtils";
// import { apiService } from "@/services/api";

// import { DomainExpirationInfo } from "@/utils/domainExpiredAtFetchConvert";

// import { useBlockchainItems } from "@/services/blockchainItems/blockchain-items-context";
// import { SimpleEnrichedItem } from "@/services/blockchainItems/blockchain-items-types";

// // Интерфейсы
// interface FormData {
//   tonSite: string;
//   isChecked: boolean;
//   tonStorage: string;
//   walletAddress: string;
//   subdomains: string;
// }

// interface DisplayItem {
//   id: string | number;
//   title: string;
//   name?: string;
//   address: string;
//   image?: string;
//   isZone?: boolean;
//   isSubdomain?: boolean;
//   zoneData?: any;
//   subdomainData?: any;
//   metadata?: any;
//   dns?: string;
//   previews?: any[];
//   collection?: any;
//   proxy?: number;
//   subdomainsAmount?: number;
//   mintPrice?: number;
//   status?: string;
//   lastBid?: number;
//   lastBidder?: string;
//   bids?: any[];
//   links?: any[];
//   wrapperAddress?: string;
//   type?: string; // "proxy_subdomain" | "sbt_subdomain" | "nft_wrapper"
// }

// export const ManageDomainPage: FC = () => {
//   const dispatch = useDispatch<AppDispatch>();
//   const wallet = useTonWallet();
//   const [tonConnectUI] = useTonConnectUI();
//   const location = useLocation();

//   const { t } = useLanguage();
//   const { currentTheme } = useTheme();
//   const isDark = currentTheme === "dark";

//   const API_PAYLOAD_URL = import.meta.env.VITE_API_SC_PAYLOAD_URL;

//   const isTestnet = wallet?.account?.chain === "-3";

//   // Redux state
//   const nftState = useSelector((state: RootState) => state.nft);

//   const allNfts = isTestnet
//     ? nftState.testnet.allNfts
//     : nftState.mainnet.allNfts;
//   const filteredItems = isTestnet
//     ? nftState.testnet.filteredItems
//     : nftState.mainnet.filteredItems;
//   const selectedCollection = isTestnet
//     ? nftState.testnet.selectedCollection
//     : nftState.mainnet.selectedCollection;
//   const zones = isTestnet ? nftState.testnet.zones : nftState.mainnet.zones;
//   const subdomains = isTestnet
//     ? nftState.testnet.subdomains
//     : nftState.mainnet.subdomains;

//   const isLoading = nftState.loading || false;

//   const dnsState = useSelector((state: RootState) => state.dnsRecords);
//   const dnsLoading = dnsState?.loading || false;
//   const dnsOperationLoading = dnsState?.operationLoading || false;
//   const parsedRecords = dnsState?.parsedRecords || {};
//   const currentDomain = dnsState?.currentDomain || null;

//   const { getNftItem, getNftCollection } = useTonAPI(isTestnet);

//   // Local state
//   const [snackbar, setSnackbar] = useState<JSX.Element | null>(null);
//   const [resolverAddress, setResolverAddress] = useState("");
//   const [isVerified, setIsVerified] = useState(false);
//   const [checkingResolver, setCheckingResolver] = useState(false);
//   const [isAutoCheckTriggered, setIsAutoCheckTriggered] = useState(false);
//   const [editingItem, setEditingItem] = useState<any>(null);
//   const [mode, setMode] = useState<"other" | "service">("service");
//   const [manualCollectionAddress, setManualCollectionAddress] = useState("");
//   const [showInfoBlock, setShowInfoBlock] = useState(false);
//   const [showDNSBlock, setShowDNSBlock] = useState(false);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
//   const [minLength, setMinLength] = useState<number>(0);
//   const [maxLength, setMaxLength] = useState<number>(100);

//   // === NEW: Пагинация и лоадер ===
//   const [visibleCount, setVisibleCount] = useState<number>(10);
//   const [loadingText, setLoadingText] = useState<string>("");

//   const [formData, setFormData] = useState<FormData>({
//     tonSite: "",
//     isChecked: false,
//     tonStorage: "",
//     walletAddress: "",
//     subdomains: "",
//   });

//   const [originalFormData, setOriginalFormData] = useState<FormData>({
//     tonSite: "",
//     isChecked: false,
//     tonStorage: "",
//     walletAddress: "",
//     subdomains: "",
//   });

//   // Refs
//   const infoBlockRef = useRef<HTMLDivElement>(null);
//   const dnsBlockRef = useRef<HTMLDivElement>(null);
//   const hasLoadedData = useRef(false);
//   const prevMode = useRef(mode);
//   const prevSelectedCollection = useRef(selectedCollection);
//   const prevIsTestnet = useRef(isTestnet);

//   // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
//   const showSnackbar = (
//     message: string,
//     type: "success" | "error" | "sent" = "success"
//   ) => {
//     setSnackbar(
//       <ShowSnackbar
//         message={message}
//         type={type}
//         onClose={() => setSnackbar(null)}
//       />
//     );
//   };

//   const handleInputChange = (
//     field: keyof FormData,
//     value: string | boolean
//   ) => {
//     setFormData((prev) => ({
//       ...prev,
//       [field]: value,
//     }));
//   };

//   const { userProxySubdomains, userSBTSubdomains, userNFTWrappers } =
//     useBlockchainItems();

//   // ====== АДАПТЕР ======
//   const enrichedItemToDisplayItem = useCallback(
//     (item: SimpleEnrichedItem, isZone: boolean): DisplayItem => {
//       const name =
//         item.metadata?.token_info?.[0]?.name || item.domain || "Без названия";

//       const image =
//         item.metadata?.image ||
//         item.metadata?.token_info?.[0]?.image ||
//         item.metadata?.token_info?.[0]?.extra?._image_small;

//       return {
//         id: item.address,
//         title: name,
//         address: item.address,
//         isZone,
//         isSubdomain: !isZone,
//         image: image || "",
//         metadata: item.metadata,
//         type: item.type,
//       };
//     },
//     []
//   );

//   // ========== Функция для получения URL изображения ==========
//   const getItemImageUrl = (item: DisplayItem): string => {
//     // Если уже есть сгенерированное изображение — используем его
//     if (item.image && item.image !== "") {
//       return item.image;
//     }

//     // Proxy-обертки (зоны) — как в MarketPage
//     if (item.isZone) {
//       const zoneName = (item.title || "").replace(".ton", "");
//       return `${API_PAYLOAD_URL}/api/v1/proxy/metadata/ton/${zoneName}.png`;
//     }

//     // Субдомены — как в ProfileWidget (getSubdomainImage)
//     if (item.isSubdomain) {
//       const fullName = item.title || "";
//       const parts = fullName.split(".");
//       const itemType = (item as any).type || "proxy_subdomain";

//       if (parts.length >= 3) {
//         const subdomainName = parts[0];
//         const domainName = parts.slice(1).join(".").replace(".ton", "");
//         if (itemType === "sbt_subdomain") {
//           return `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${domainName}/${subdomainName}.png`;
//         }
//         return `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${domainName}/${subdomainName}.png`;
//       }

//       if (parts.length === 2) {
//         const subdomainName = parts[0];
//         const domainName = parts[1].replace(".ton", "");
//         if (itemType === "sbt_subdomain") {
//           return `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${domainName}/${subdomainName}.png`;
//         }
//         return `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${domainName}/${subdomainName}.png`;
//       }
//     }

//     // Фоллбэк
//     if (item.metadata?.image) {
//       return item.metadata.image;
//     }

//     return searchDog;
//   };

//   // ========== Очистка формы ==========
//   const resetFormData = () => {
//     const emptyForm: FormData = {
//       tonSite: "",
//       isChecked: false,
//       tonStorage: "",
//       walletAddress: "",
//       subdomains: "",
//     };
//     setFormData(emptyForm);
//     setOriginalFormData(emptyForm);
//   };

//   // ========== Эффект 1: Загрузка данных при подключении кошелька и смене режима ==========
//   useEffect(() => {
//     if (!wallet?.account?.address) {
//       console.log("⚠️ Кошелек не подключен");
//       return;
//     }

//     const cleanAddress = wallet.account.address.startsWith("0x")
//       ? wallet.account.address.slice(2)
//       : wallet.account.address;

//     // Всегда сбрасываем данные при смене режима
//     if (prevMode.current !== mode) {
//       console.log("🔄 Смена режима, сбрасываем данные");
//       hasLoadedData.current = false;
//       prevMode.current = mode;
//       dispatch(resetNetworkState(isTestnet));
//     }

//     if (!hasLoadedData.current) {
//       console.log("📥 Начинаем загрузку данных для режима:", mode);
//       hasLoadedData.current = true;

//       if (mode === "other") {
//         console.log("📥 Загружаем NFT...");
//         setLoadingText("");
//         dispatch(fetchNfts({ walletAddress: cleanAddress, isTestnet }));
//       } else {
//         console.log("📥 Загружаем зоны и субдомены...");

//         // === NEW: loadingText по табу ===
//         if (selectedCollection === "subdomains") {
//           setLoadingText(t("loadingSubdomains"));
//         } else if (selectedCollection === "zones") {
//           setLoadingText(t("loadingProxyDomains"));
//         }

//         let userAddressForDB = cleanAddress;

//         if (isTestnet) {
//           userAddressForDB = convertRawToUserFriendlyTest(cleanAddress);
//         }

//         dispatch(
//           fetchZonesFromDB({ userAddress: userAddressForDB, isTestnet })
//         );
//         dispatch(
//           fetchSubdomainsFromDB({ userAddress: userAddressForDB, isTestnet })
//         );
//       }
//     }
//   }, [dispatch, wallet, isTestnet, mode, selectedCollection, t]);

//   // ========== Эффект 2: Фильтрация данных при изменении коллекции или данных ==========
//   useEffect(() => {
//     if (
//       prevSelectedCollection.current !== selectedCollection ||
//       prevIsTestnet.current !== isTestnet
//     ) {
//       if (mode === "other") {
//         if (allNfts.length > 0 && selectedCollection !== "any") {
//           dispatch(
//             filterNftsByCollection({
//               nfts: allNfts,
//               collectionKey: selectedCollection as CollectionKey,
//               isTestnet,
//             })
//           );
//         }
//       }

//       // === NEW: Сброс пагинации ===
//       setVisibleCount(10);

//       prevSelectedCollection.current = selectedCollection;
//       prevIsTestnet.current = isTestnet;
//     }
//   }, [dispatch, mode, selectedCollection, isTestnet, allNfts]);

//   // ========== Эффект 3: Обработка параметра адреса из URL ==========
//   useEffect(() => {
//     const params = new URLSearchParams(location.search);
//     const address = params.get("address");
//     if (address) {
//       try {
//         setResolverAddress(Address.parse(address).toString());
//         setIsAutoCheckTriggered(true);
//       } catch (error) {
//         console.error("Invalid address from URL:", error);
//       }
//     }
//   }, [location]);

//   // ========== Эффект 4: Автоматическая проверка адреса из URL ==========
//   useEffect(() => {
//     if (isAutoCheckTriggered && resolverAddress) {
//       handleCheckResolverAddress();
//       setIsAutoCheckTriggered(false);
//     }
//   }, [resolverAddress, isAutoCheckTriggered]);

//   // ========== Эффект 5: Обновление формы при получении DNS записей ==========
//   useEffect(() => {
//     if (currentDomain && parsedRecords[currentDomain] && editingItem) {
//       const record = parsedRecords[currentDomain];
//       const newFormData: FormData = {
//         tonSite: record.siteAdnl || "",
//         isChecked: false,
//         tonStorage: record.storageBagId || "",
//         walletAddress: record.walletAddress || "",
//         subdomains: record.nextResolver || "",
//       };

//       console.log("📝 Обновляем форму с DNS записями:", newFormData);
//       setFormData(newFormData);
//       setOriginalFormData(newFormData);
//     }
//   }, [currentDomain, parsedRecords, editingItem]);

//   // ========== Функция проверки resolver address ==========
//   const handleCheckResolverAddress = async () => {
//     try {
//       if (!resolverAddress) {
//         showSnackbar(t("addressPlaceholder"), "error");
//         return;
//       }

//       setCheckingResolver(true);

//       const address = Address.parse(resolverAddress).toString();

//       if (mode === "other") {
//         const nftInfo = await getNftItem(address);
//         if (nftInfo) {
//           setIsVerified(true);
//           showSnackbar(t("nftVerifiedSuccessfully"), "success");
//         } else {
//           showSnackbar(t("nftNotFound"), "error");
//         }
//       } else {
//         setIsVerified(true);
//         showSnackbar(t("itemVerifiedSuccessfully"), "success");
//       }
//     } catch (error: any) {
//       console.error("Error checking resolver address:", error);
//       showSnackbar(error.message || "Ошибка проверки адреса", "error");
//     } finally {
//       setCheckingResolver(false);
//     }
//   };

//   // ========== Обработчик клика на итем ==========
//   const handleItemClick = useCallback(
//     async (item: any) => {
//       console.log("🔍 Клик на итем:", item);

//       resetFormData();
//       setShowInfoBlock(true);
//       setShowDNSBlock(false);
//       setEditingItem(item);

//       if (mode === "other") {
//         try {
//           const nftInfo = await getNftItem(item.address);
//           if (nftInfo) {
//             console.log("✅ NFT найден:", nftInfo);

//             const dnsName = item.dns || item.metadata?.name || item.title;
//             if (dnsName) {
//               if (
//                 selectedCollection === "tme" ||
//                 selectedCollection === "ton"
//               ) {
//                 if (isTestnet) {
//                   dispatch(fetchTestnetDNSRecords(dnsName));
//                 } else {
//                   dispatch(fetchDNSRecords(dnsName));
//                 }
//               }
//             }
//           }
//         } catch (error) {
//           console.error("❌ Ошибка проверки NFT:", error);
//         }
//       }

//       setTimeout(() => {
//         infoBlockRef.current?.scrollIntoView({
//           behavior: "smooth",
//           block: "start",
//         });
//       }, 100);
//     },
//     [mode, getNftItem, selectedCollection, dispatch, isTestnet]
//   );

//   // ========== Обработчик кнопки "Управлять" ==========
//   const handleManageClick = useCallback(async () => {
//     if (!editingItem) return;

//     setShowDNSBlock(true);

//     let itemAddress = "";

//     if (mode === "other") {
//       itemAddress = editingItem.address;
//     } else {
//       if (editingItem.isZone) {
//         const proxyValue = editingItem.proxy;
//         const isProxyZone = proxyValue === 1 || proxyValue === "1";

//         if (isProxyZone) {
//           if (editingItem.wrapperAddress) {
//             itemAddress = editingItem.wrapperAddress;
//           } else {
//             try {
//               const baseTONApiUri = isTestnet
//                 ? "testnet.tonapi.io"
//                 : "tonapi.io";
//               const response = await fetch(
//                 `https://${baseTONApiUri}/v2/nfts/${editingItem.address}`
//               );

//               if (!response.ok) {
//                 throw new Error(`TON API error: ${response.status}`);
//               }

//               const nftData = await response.json();

//               if (nftData.owner?.address) {
//                 itemAddress = nftData.owner.address;

//                 try {
//                   await apiService.updateZoneWrapper(
//                     editingItem.name,
//                     itemAddress
//                   );
//                 } catch (error) {
//                   console.error("❌ Ошибка сохранения wrapper адреса:", error);
//                 }
//               } else {
//                 throw new Error("Не удалось получить адрес владельца NFT");
//               }
//             } catch (error) {
//               console.error("❌ Ошибка получения адреса владельца:", error);
//               itemAddress = editingItem.address;
//               showSnackbar(
//                 "Не удалось получить адрес враппера, используем оригинальный адрес",
//                 "error"
//               );
//             }
//           }
//         } else {
//           itemAddress = editingItem.address;
//         }
//       } else {
//         itemAddress = editingItem.address;
//       }
//     }

//     setResolverAddress(itemAddress);
//     setIsVerified(true);

//     const itemName =
//       mode === "other"
//         ? editingItem.dns || editingItem.metadata?.name || editingItem.title
//         : editingItem.name || editingItem.title;

//     const hasRecords =
//       currentDomain === itemName && Object.keys(parsedRecords).length > 0;

//     if (itemName && !dnsLoading && !hasRecords) {
//       if (isTestnet) {
//         dispatch(fetchTestnetDNSRecords(itemName));
//       } else {
//         dispatch(fetchDNSRecords(itemName));
//       }
//     }

//     setTimeout(() => {
//       dnsBlockRef.current?.scrollIntoView({
//         behavior: "smooth",
//         block: "start",
//       });
//     }, 100);
//   }, [
//     editingItem,
//     mode,
//     isTestnet,
//     dispatch,
//     showSnackbar,
//     currentDomain,
//     parsedRecords,
//     dnsLoading,
//   ]);

//   // ========== Обработчик для таба "Any" ==========
//   const handleAnyTabSubmit = async () => {
//     if (!manualCollectionAddress) {
//       showSnackbar(t("pleaseEnterDomainName"), "error");
//       return;
//     }

//     try {
//       setCheckingResolver(true);

//       const address = Address.parse(manualCollectionAddress).toString();

//       let nftInfo = await getNftItem(address);
//       if (!nftInfo || nftInfo.title === "") {
//         nftInfo = await getNftCollection(address);
//       }

//       if (nftInfo && nftInfo.title) {
//         const tempItem = {
//           id: `any_${Date.now()}`,
//           title: nftInfo.title,
//           address: address,
//           metadata: nftInfo,
//           previews: nftInfo.image ? [{ url: nftInfo.image }] : [],
//         };

//         setEditingItem(tempItem);
//         setShowInfoBlock(true);
//         setShowDNSBlock(false);

//         setTimeout(() => {
//           infoBlockRef.current?.scrollIntoView({
//             behavior: "smooth",
//             block: "start",
//           });
//         }, 100);

//         showSnackbar(t("itemFoundSuccessfully"), "success");
//       } else {
//         showSnackbar(t("itemNotFound"), "error");
//       }
//     } catch (error: any) {
//       console.error("Error checking address:", error);
//       showSnackbar(error.message || "Ошибка проверки адреса", "error");
//     } finally {
//       setCheckingResolver(false);
//     }
//   };

//   // ========== Функции для работы с DNS записями ==========
//   const handleSaveWalletAddress = async () => {
//     try {
//       if (!resolverAddress) throw new Error(t("addressPlaceholder"));
//       if (!tonConnectUI) throw new Error(t("walletNotConnected"));

//       if (
//         formData.walletAddress &&
//         formData.walletAddress !== originalFormData.walletAddress
//       ) {
//         const result = await dispatch(
//           setWalletRecord({
//             dnsItemAddress: resolverAddress,
//             userWalletAddress: formData.walletAddress,
//             tonConnectUI: tonConnectUI,
//           })
//         );

//         if (result.payload) {
//           showSnackbar(
//             t("walletAddress") + " " + t("proxyDeployedSuccessfully"),
//             "success"
//           );
//           setOriginalFormData({ ...formData });
//         }
//       } else if (!formData.walletAddress && originalFormData.walletAddress) {
//         const result = await dispatch(
//           deleteWalletRecord({
//             dnsItemAddress: resolverAddress,
//             tonConnectUI: tonConnectUI,
//           })
//         );

//         if (result.payload) {
//           showSnackbar(
//             t("walletAddress") + " " + t("transactionNotConfirmed"),
//             "success"
//           );
//           setOriginalFormData({ ...formData });
//         }
//       }
//     } catch (error: any) {
//       console.error(error);
//       showSnackbar(error.message, "error");
//     }
//   };

//   const handleSaveTonSite = async () => {
//     try {
//       if (!resolverAddress) throw new Error(t("addressPlaceholder"));
//       if (!tonConnectUI) throw new Error(t("walletNotConnected"));

//       if (formData.tonSite && formData.tonSite !== originalFormData.tonSite) {
//         const result = await dispatch(
//           setSiteRecord({
//             dnsItemAddress: resolverAddress,
//             adnlAddressHex: formData.tonSite,
//             tonConnectUI: tonConnectUI,
//           })
//         );

//         if (result.payload) {
//           showSnackbar(
//             t("tonSites") + " " + t("proxyDeployedSuccessfully"),
//             "success"
//           );
//           setOriginalFormData({ ...formData });
//         }
//       } else if (!formData.tonSite && originalFormData.tonSite) {
//         const result = await dispatch(
//           deleteSiteRecord({
//             dnsItemAddress: resolverAddress,
//             tonConnectUI: tonConnectUI,
//           })
//         );

//         if (result.payload) {
//           showSnackbar(
//             t("tonSites") + " " + t("transactionNotConfirmed"),
//             "success"
//           );
//           setOriginalFormData({ ...formData });
//         }
//       }
//     } catch (error: any) {
//       console.error(error);
//       showSnackbar(error.message, "error");
//     }
//   };

//   const handleSaveTonStorage = async () => {
//     try {
//       if (!resolverAddress) throw new Error(t("addressPlaceholder"));
//       if (!tonConnectUI) throw new Error(t("walletNotConnected"));

//       if (
//         formData.tonStorage &&
//         formData.tonStorage !== originalFormData.tonStorage
//       ) {
//         const result = await dispatch(
//           setStorageRecord({
//             dnsItemAddress: resolverAddress,
//             bagIdHex: formData.tonStorage,
//             tonConnectUI: tonConnectUI,
//           })
//         );

//         if (result.payload) {
//           showSnackbar(
//             t("tonStorage") + " " + t("proxyDeployedSuccessfully"),
//             "success"
//           );
//           setOriginalFormData({ ...formData });
//         }
//       } else if (!formData.tonStorage && originalFormData.tonStorage) {
//         const result = await dispatch(
//           deleteStorageRecord({
//             dnsItemAddress: resolverAddress,
//             tonConnectUI: tonConnectUI,
//           })
//         );

//         if (result.payload) {
//           showSnackbar(
//             t("tonStorage") + " " + t("transactionNotConfirmed"),
//             "success"
//           );
//           setOriginalFormData({ ...formData });
//         }
//       }
//     } catch (error: any) {
//       console.error(error);
//       showSnackbar(error.message, "error");
//     }
//   };

//   const handleSaveSubdomains = async () => {
//     try {
//       if (!resolverAddress) throw new Error(t("addressPlaceholder"));
//       if (!tonConnectUI) throw new Error(t("walletNotConnected"));

//       if (
//         formData.subdomains &&
//         formData.subdomains !== originalFormData.subdomains
//       ) {
//         const result = await dispatch(
//           setNextResolverRecord({
//             dnsItemAddress: resolverAddress,
//             resolverAddress: formData.subdomains,
//             tonConnectUI: tonConnectUI,
//           })
//         );

//         if (result.payload) {
//           showSnackbar(
//             t("subdomainsNextResolver") + " " + t("proxyDeployedSuccessfully"),
//             "success"
//           );
//           setOriginalFormData({ ...formData });
//         }
//       } else if (!formData.subdomains && originalFormData.subdomains) {
//         const result = await dispatch(
//           deleteNextResolverRecord({
//             dnsItemAddress: resolverAddress,
//             tonConnectUI: tonConnectUI,
//           })
//         );

//         if (result.payload) {
//           showSnackbar(
//             t("subdomainsNextResolver") + " " + t("transactionNotConfirmed"),
//             "success"
//           );
//           setOriginalFormData({ ...formData });
//         }
//       }
//     } catch (error: any) {
//       console.error(error);
//       showSnackbar(error.message, "error");
//     }
//   };

//   // ========== Функция продления домена ==========
//   const handleRenewDomain = async () => {
//     if (!editingItem || !tonConnectUI) {
//       showSnackbar(t("walletNotConnected"), "error");
//       return;
//     }

//     try {
//       let targetAddress = "";
//       let domainName = "";

//       if (mode === "other") {
//         targetAddress = editingItem.address;
//         domainName =
//           editingItem.dns || editingItem.metadata?.name || editingItem.title;
//       } else {
//         if (editingItem.isZone) {
//           const proxyValue = editingItem.proxy;
//           const isProxyZone = proxyValue === 1 || proxyValue === "1";

//           if (isProxyZone) {
//             if (editingItem.wrapperAddress) {
//               targetAddress = editingItem.wrapperAddress;
//             } else {
//               const baseTONApiUri = isTestnet
//                 ? "testnet.tonapi.io"
//                 : "tonapi.io";
//               const response = await fetch(
//                 `https://${baseTONApiUri}/v2/nfts/${editingItem.address}`
//               );

//               if (!response.ok) {
//                 throw new Error(`TON API error: ${response.status}`);
//               }

//               const nftData = await response.json();

//               if (nftData.owner?.address) {
//                 targetAddress = nftData.owner.address;

//                 try {
//                   await apiService.updateZoneWrapper(
//                     editingItem.name,
//                     targetAddress
//                   );
//                 } catch (error) {
//                   console.error("❌ Ошибка сохранения wrapper адреса:", error);
//                 }
//               } else {
//                 throw new Error("Не удалось получить адрес владельца NFT");
//               }
//             }
//           } else {
//             targetAddress = editingItem.address;
//           }
//         } else {
//           targetAddress = editingItem.address;
//         }

//         domainName = editingItem.name || editingItem.title;
//       }

//       if (!targetAddress) {
//         showSnackbar("Не удалось определить адрес для продления", "error");
//         return;
//       }

//       const amountInNano = 0.05 * 1_000_000_000;

//       const userFriendlyAddress = convertRawToUserFriendlyTest(targetAddress);
//       const transaction = {
//         validUntil: Math.floor(Date.now() / 1000) + 600,
//         messages: [
//           {
//             address: userFriendlyAddress,
//             amount: amountInNano.toString(),
//           },
//         ],
//       };

//       const result = await tonConnectUI.sendTransaction(transaction);

//       showSnackbar(
//         `Транзакция на продление домена ${domainName} отправлена`,
//         "success"
//       );

//       console.log("✅ Транзакция отправлена:", result);
//     } catch (error: any) {
//       console.error("❌ Ошибка продления домена:", error);
//       showSnackbar(error.message || "Ошибка отправки транзакции", "error");
//     }
//   };

//   // ========== Обработчик смены режима ==========
//   const handleModeChange = (newMode: "other" | "service") => {
//     setMode(newMode);
//     setShowInfoBlock(false);
//     setShowDNSBlock(false);
//     setEditingItem(null);
//     resetFormData();
//     dispatch(resetDNSState());
//     setVisibleCount(10); // сброс пагинации

//     const defaultCollection = newMode === "service" ? "zones" : "ton";
//     hasLoadedData.current = false;

//     dispatch(
//       setSelectedCollection({
//         collectionKey: defaultCollection as CollectionKey,
//         isTestnet,
//       })
//     );
//   };

//   // ========== Обработчик смены таба ==========
//   const handleTabChange = useCallback(
//     (collectionKey: string) => {
//       dispatch(
//         setSelectedCollection({
//           collectionKey: collectionKey as CollectionKey,
//           isTestnet,
//         })
//       );

//       setShowInfoBlock(false);
//       setShowDNSBlock(false);
//       setEditingItem(null);
//       dispatch(resetDNSState());
//       resetFormData();
//       setVisibleCount(10); // сброс пагинации

//       if (collectionKey === "any") {
//         setManualCollectionAddress("");
//       }
//     },
//     [dispatch, isTestnet]
//   );

//   // ========== Получение отфильтрованных элементов ==========
//   const getFilteredItemsForMode = useCallback(() => {
//     let items: any[] = [];

//     // ===== MODE: service → ончейн-данные =====
//     if (mode === "service") {
//       switch (selectedCollection) {
//         case "subdomains":
//           items = [
//             ...userProxySubdomains.map((item) =>
//               enrichedItemToDisplayItem(item, false)
//             ),
//             ...userSBTSubdomains.map((item) =>
//               enrichedItemToDisplayItem(item, false)
//             ),
//           ];
//           break;
//         case "zones":
//           items = userNFTWrappers.map((item) =>
//             enrichedItemToDisplayItem(item, true)
//           );
//           break;
//         case "any":
//         default:
//           return [];
//       }
//     }

//     // ===== MODE: other → старый Redux (NFT) =====
//     if (mode === "other") {
//       if (filteredItems.length > 0) {
//         items = filteredItems as any[];
//       } else {
//         const nftCollections = getNFTCollections(isTestnet);
//         const collectionInfo =
//           nftCollections[selectedCollection as keyof typeof nftCollections];

//         if (!collectionInfo || selectedCollection === "any") {
//           if (selectedCollection === "any") return [];
//           items = allNfts;
//         } else {
//           const collectionAddress = collectionInfo.address;
//           items = allNfts.filter((nft: any) => {
//             const nftCollectionAddress = nft.collection?.address;
//             if (!nftCollectionAddress) return false;
//             return (
//               nftCollectionAddress.toLowerCase() ===
//               collectionAddress.toLowerCase()
//             );
//           });
//         }
//       }
//     }

//     // ===== Общие фильтры =====
//     if (searchQuery.trim() !== "") {
//       const query = searchQuery.toLowerCase();
//       items = items.filter((item: any) => {
//         const title =
//           item.title || item.dns || item.metadata?.name || item.name || "";
//         return title.toLowerCase().includes(query);
//       });
//     }

//     items = items.filter((item: any) => {
//       const title =
//         item.title || item.dns || item.metadata?.name || item.name || "";
//       const length = title.length;
//       return length >= minLength && length <= maxLength;
//     });

//     items.sort((a: any, b: any) => {
//       const titleA = a.title || a.dns || a.metadata?.name || a.name || "";
//       const titleB = b.title || b.dns || b.metadata?.name || b.name || "";
//       if (sortOrder === "asc") return titleA.length - titleB.length;
//       return titleB.length - titleA.length;
//     });

//     return items
//       .map((item: any, index: number) => {
//         if (!item) return null;
//         return {
//           ...item,
//           title:
//             item.title ||
//             item.dns ||
//             item.metadata?.name ||
//             item.name ||
//             "Unnamed",
//           address:
//             item.address || item.wrapperAddress || `item_${item.id || index}`,
//           id: item.id || item.address || `item_${Date.now()}_${index}`,
//           isZone:
//             item.isZone ??
//             (mode === "service" && selectedCollection === "zones"),
//           isSubdomain:
//             item.isSubdomain ??
//             (mode === "service" && selectedCollection === "subdomains"),
//         };
//       })
//       .filter(Boolean);
//   }, [
//     mode,
//     selectedCollection,
//     isTestnet,
//     allNfts,
//     filteredItems,
//     searchQuery,
//     minLength,
//     maxLength,
//     sortOrder,
//     userProxySubdomains,
//     userSBTSubdomains,
//     userNFTWrappers,
//     enrichedItemToDisplayItem,
//   ]);

//   // Пагинация
//   const allFilteredItems = getFilteredItemsForMode();
//   const displayItems = allFilteredItems.slice(0, visibleCount);
//   const hasMoreItems = visibleCount < allFilteredItems.length;

//   // ========== Компонент поиска и фильтрации ==========
//   const SearchAndFilterSection = () => {
//     const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);

//     return (
//       <div
//         style={{
//           background: isDark ? "#2d2d2d" : "#f5f5f5",
//           borderRadius: "12px",
//           padding: "15px",
//           margin: "10px",
//           display: "flex",
//           flexDirection: "column",
//           gap: "12px",
//         }}
//       >
//         <div
//           style={{
//             display: "flex",
//             justifyContent: "space-between",
//             alignItems: "center",
//           }}
//         >
//           <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//             <svg
//               width="20"
//               height="20"
//               viewBox="0 0 24 24"
//               fill="none"
//               stroke={isDark ? "white" : "black"}
//               strokeWidth="2"
//             >
//               <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
//             </svg>
//             <span
//               style={{
//                 fontSize: "14px",
//                 fontWeight: "600",
//                 color: isDark ? "white" : "black",
//               }}
//             >
//               {t("searchAndFilter")}
//             </span>
//           </div>

//           <Button
//             size="s"
//             mode="outline"
//             onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
//             style={{
//               padding: "6px 12px",
//               fontSize: "12px",
//             }}
//           >
//             {showAdvancedFilter ? t("hideFilters") : t("showFilters")}
//           </Button>
//         </div>

//         <Input
//           placeholder={t("searchByName")}
//           value={searchQuery}
//           onChange={(e) => {
//             setSearchQuery(e.target.value);
//             setVisibleCount(10);
//           }}
//           style={{
//             background: isDark ? "#3d3d3d" : "white",
//             color: isDark ? "white" : "black",
//           }}
//         />

//         <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
//           <Button
//             onClick={() => setSortOrder("asc")}
//             style={{
//               padding: "8px 12px",
//               borderRadius: "8px",
//               fontSize: "12px",
//               fontWeight: "600",
//               background:
//                 sortOrder === "asc"
//                   ? isDark
//                     ? "#4CAF50"
//                     : "#4CAF50"
//                   : isDark
//                   ? "#3d3d3d"
//                   : "#e0e0e0",
//               color:
//                 sortOrder === "asc" ? "white" : isDark ? "#cccccc" : "#666666",
//             }}
//           >
//             {t("shortToLong")}
//           </Button>
//           <Button
//             onClick={() => setSortOrder("desc")}
//             style={{
//               padding: "8px 12px",
//               borderRadius: "8px",
//               fontSize: "12px",
//               fontWeight: "600",
//               background:
//                 sortOrder === "desc"
//                   ? isDark
//                     ? "#4CAF50"
//                     : "#4CAF50"
//                   : isDark
//                   ? "#3d3d3d"
//                   : "#e0e0e0",
//               color:
//                 sortOrder === "desc" ? "white" : isDark ? "#cccccc" : "#666666",
//             }}
//           >
//             {t("longToShort")}
//           </Button>
//         </div>

//         {showAdvancedFilter && (
//           <div
//             style={{
//               display: "flex",
//               flexDirection: "column",
//               gap: "10px",
//               padding: "10px",
//               background: isDark ? "#3d3d3d" : "#e8e8e8",
//               borderRadius: "8px",
//             }}
//           >
//             <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
//               <span
//                 style={{
//                   color: isDark ? "white" : "#666",
//                   fontSize: "12px",
//                   minWidth: "60px",
//                 }}
//               >
//                 {t("length")}:
//               </span>
//               <Input
//                 type="number"
//                 placeholder={t("min")}
//                 value={minLength}
//                 onChange={(e) => {
//                   setMinLength(parseInt(e.target.value) || 0);
//                   setVisibleCount(10);
//                 }}
//                 style={{
//                   width: "80px",
//                   background: isDark ? "#2d2d2d" : "white",
//                   color: isDark ? "white" : "black",
//                 }}
//               />
//               <span style={{ color: isDark ? "white" : "#666" }}>-</span>
//               <Input
//                 type="number"
//                 placeholder={t("max")}
//                 value={maxLength}
//                 onChange={(e) => {
//                   setMaxLength(parseInt(e.target.value) || 100);
//                   setVisibleCount(10);
//                 }}
//                 style={{
//                   width: "80px",
//                   background: isDark ? "#2d2d2d" : "white",
//                   color: isDark ? "white" : "black",
//                 }}
//               />
//             </div>
//           </div>
//         )}
//       </div>
//     );
//   };

//   // ========== РЕНДЕРИНГ КОМПОНЕНТА ==========
//   return (
//     <Page>
//       <div style={{ padding: "10px" }}>
//         {/* Баннер с информацией о сети */}
//         <Banner
//           header={isTestnet ? "Testnet" : "Mainnet"}
//           subheader={isTestnet ? "Вы в тестовой сети" : "Вы в основной сети"}
//           style={{
//             marginBottom: "10px",
//             background: isDark ? "#2d2d2d" : "#f0f0f0",
//             color: isDark ? "white" : "black",
//           }}
//         />

//         {/* Переключатель режимов */}
//         <ModeTabs
//           mode={mode}
//           onModeChange={handleModeChange}
//           onTabChange={handleTabChange}
//           nftsCount={mode === "other" ? allNfts.length : 0}
//           zonesCount={mode === "service" ? zones.length : 0}
//           subdomainsCount={mode === "service" ? subdomains.length : 0}
//         />

//         {/* Поле для ручного ввода (только для таба "any") */}
//         {selectedCollection === "any" && (
//           <div
//             style={{
//               marginBottom: "15px",
//               padding: "15px",
//               background: isDark ? "#2d2d2d" : "#f5f5f5",
//               borderRadius: "12px",
//             }}
//           >
//             <div
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 gap: "10px",
//                 marginBottom: "10px",
//               }}
//             >
//               <svg
//                 width="20"
//                 height="20"
//                 viewBox="0 0 24 24"
//                 fill="none"
//                 stroke={isDark ? "white" : "black"}
//                 strokeWidth="2"
//               >
//                 <circle cx="11" cy="11" r="8"></circle>
//                 <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
//               </svg>
//               <span
//                 style={{
//                   fontSize: "14px",
//                   fontWeight: "600",
//                   color: isDark ? "white" : "black",
//                 }}
//               >
//                 {t("manualAddressInput")}
//               </span>
//             </div>

//             <div style={{ display: "flex", gap: "10px" }}>
//               <Input
//                 placeholder={t("enterNFTOrCollectionAddress")}
//                 value={manualCollectionAddress}
//                 onChange={(e) => setManualCollectionAddress(e.target.value)}
//                 style={{
//                   flex: 1,
//                   background: isDark ? "#3d3d3d" : "white",
//                   color: isDark ? "white" : "black",
//                 }}
//               />
//               <Button
//                 onClick={handleAnyTabSubmit}
//                 loading={checkingResolver}
//                 style={{
//                   padding: "10px 20px",
//                   background: isDark ? "#4CAF50" : "#4CAF50",
//                   color: "white",
//                 }}
//               >
//                 {t("check")}
//               </Button>
//             </div>

//             <div
//               style={{
//                 marginTop: "10px",
//                 fontSize: "12px",
//                 color: isDark ? "#aaaaaa" : "#666666",
//               }}
//             >
//               {t("addressHint")}
//             </div>
//           </div>
//         )}

//         {/* Компонент поиска и фильтрации */}
//         {selectedCollection !== "any" && displayItems.length > 0 && (
//           <SearchAndFilterSection />
//         )}

//         {/* Состояние загрузки */}
//         {isLoading && (
//           <div
//             style={{
//               textAlign: "center",
//               padding: "40px 20px",
//               color: isDark ? "white" : "#666",
//             }}
//           >
//             <Image
//               src={searchDog}
//               style={{ width: "100px", height: "100px", margin: "0 auto" }}
//             />
//             <div style={{ fontSize: "16px", marginBottom: "10px" }}>
//               {loadingText || t("loadingSubdomains")}
//             </div>
//             <div style={{ fontSize: "12px" }}>
//               {t("pleaseWait") || "Пожалуйста, подождите"}
//             </div>
//           </div>
//         )}

//         {/* Список элементов */}
//         {!isLoading && displayItems.length > 0 ? (
//           <List style={{ background: "transparent", marginBottom: "120px" }}>
//             {displayItems.map((item: DisplayItem) => (
//               <div
//                 key={item.id}
//                 style={{
//                   marginBottom: "8px",
//                   background: isDark ? "#2d2d2d" : "white",
//                   borderRadius: "12px",
//                   cursor: "pointer",
//                   overflow: "hidden",
//                   border: `1px solid ${isDark ? "#444" : "#e0e0e0"}`,
//                   transition: "all 0.2s ease",
//                 }}
//               >
//                 {/* Картинка с отступами */}
//                 <div style={{ padding: "12px 12px 0 12px" }}>
//                   <img
//                     src={getItemImageUrl(item)}
//                     alt={item.title}
//                     style={{
//                       width: "100%",
//                       height: "200px",
//                       objectFit: "contain",
//                       borderRadius: "8px",
//                       background: isDark ? "#1a1a1a" : "#f9f9f9",
//                     }}
//                     onError={(e) => {
//                       (e.currentTarget as HTMLImageElement).src = searchDog;
//                     }}
//                   />
//                 </div>

//                 {/* Текстовая часть */}
//                 <div style={{ padding: "12px" }}>
//                   <div
//                     style={{
//                       fontSize: "14px",
//                       fontWeight: "600",
//                       color: isDark ? "white" : "black",
//                       marginBottom: "4px",
//                     }}
//                   >
//                     {item.title}
//                   </div>
//                   <div
//                     style={{
//                       fontSize: "12px",
//                       color: isDark ? "#aaaaaa" : "#666666",
//                       marginBottom: "4px",
//                     }}
//                   >
//                     {shortenAddress(item.address)}
//                   </div>
//                   {item.isZone && (
//                     <div
//                       style={{
//                         fontSize: "12px",
//                         color: isDark ? "#aaaaaa" : "#666666",
//                         marginBottom: "8px",
//                       }}
//                     >
//                       {item.proxy === 0 ? t("sbtZone") : t("proxyZone")} •{" "}
//                       {item.subdomainsAmount || 0} {t("subdomains")}
//                     </div>
//                   )}
//                   {item.isSubdomain && (
//                     <div
//                       style={{
//                         fontSize: "12px",
//                         color: isDark ? "#aaaaaa" : "#666666",
//                         marginBottom: "8px",
//                       }}
//                     >
//                       {t("subdomainLabel")} •{" "}
//                       {item.mintPrice ? `${item.mintPrice} TON` : "Free"}
//                     </div>
//                   )}

//                   {/* Кнопка снизу */}
//                   <button
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       handleItemClick(item);
//                     }}
//                     style={{
//                       width: "100%",
//                       padding: "10px",
//                       background: isDark ? "#4CAF50" : "#4CAF50",
//                       color: "white",
//                       border: "none",
//                       borderRadius: "8px",
//                       fontSize: "14px",
//                       fontWeight: "600",
//                       cursor: "pointer",
//                       transition: "all 0.2s ease",
//                     }}
//                     onMouseEnter={(e) => {
//                       e.currentTarget.style.opacity = "0.9";
//                     }}
//                     onMouseLeave={(e) => {
//                       e.currentTarget.style.opacity = "1";
//                     }}
//                   >
//                     {t("choose")}
//                   </button>
//                 </div>
//               </div>
//             ))}

//             {/* Кнопка "Показать ещё" */}
//             {hasMoreItems && (
//               <div style={{ textAlign: "center", padding: "12px 0" }}>
//                 <Button
//                   size="s"
//                   onClick={() => setVisibleCount((prev) => prev + 10)}
//                   style={{
//                     padding: "10px 24px",
//                     background: isDark ? "#3d3d3d" : "#e0e0e0",
//                     color: isDark ? "white" : "black",
//                     fontSize: "14px",
//                   }}
//                 >
//                   {t("listLoadMore")} ({allFilteredItems.length - visibleCount}{" "}
//                   {t("listOf")} {allFilteredItems.length})
//                 </Button>
//               </div>
//             )}

//             {/* Счётчик */}
//             <div
//               style={{
//                 textAlign: "center",
//                 fontSize: "12px",
//                 color: isDark ? "#aaaaaa" : "#666666",
//                 marginTop: "8px",
//                 marginBottom: "8px",
//               }}
//             >
//               {t("listShowing")} {displayItems.length} {t("listOf")}{" "}
//               {allFilteredItems.length}
//             </div>
//           </List>
//         ) : !isLoading && selectedCollection !== "any" ? (
//           <Placeholder
//             header={t("noElements")}
//             description={t("noElementsDescription")}
//             style={{
//               margin: "40px 20px",
//               color: isDark ? "white" : "#666",
//             }}
//           >
//             <Image
//               src={searchDog}
//               style={{ width: "100px", height: "100px", margin: "0 auto" }}
//             />
//           </Placeholder>
//         ) : null}

//         {/* Информационный блок (показывается при выборе элемента) */}
//         {showInfoBlock && editingItem && (
//           <div
//             ref={infoBlockRef}
//             style={{
//               marginTop: "20px",
//               padding: "15px",
//               background: isDark ? "#2d2d2d" : "#f5f5f5",
//               borderRadius: "12px",
//               marginBottom: "120px",
//             }}
//           >
//             <div
//               style={{
//                 display: "flex",
//                 justifyContent: "space-between",
//                 alignItems: "center",
//                 marginBottom: "15px",
//               }}
//             >
//               <div
//                 style={{ display: "flex", alignItems: "center", gap: "10px" }}
//               >
//                 <Image
//                   src={getItemImageUrl(editingItem)}
//                   style={{
//                     width: "120px",
//                     height: "120px",
//                     borderRadius: "8px",
//                   }}
//                 />
//                 <div>
//                   <div
//                     style={{
//                       fontSize: "16px",
//                       fontWeight: "600",
//                       color: isDark ? "white" : "black",
//                     }}
//                   >
//                     {editingItem.title}
//                   </div>
//                   <div
//                     style={{
//                       fontSize: "12px",
//                       color: isDark ? "#aaaaaa" : "#666666",
//                     }}
//                   >
//                     {shortenAddress(editingItem.address)}
//                   </div>
//                 </div>
//               </div>

//               <Button
//                 size="s"
//                 onClick={handleManageClick}
//                 style={{
//                   padding: "8px 16px",
//                   background: isDark ? "#4CAF50" : "#4CAF50",
//                   color: "white",
//                 }}
//               >
//                 {t("manage")}
//               </Button>
//             </div>

//             {/* Дополнительная информацияя */}
//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
//                 gap: "10px",
//                 marginBottom: "15px",
//               }}
//             >
//               {editingItem.isZone && (
//                 <>
//                   <div
//                     style={{
//                       padding: "10px",
//                       background: isDark ? "#3d3d3d" : "#e8e8e8",
//                       borderRadius: "8px",
//                       textAlign: "center",
//                     }}
//                   >
//                     <div
//                       style={{
//                         fontSize: "12px",
//                         color: isDark ? "#aaaaaa" : "#666666",
//                         marginBottom: "4px",
//                       }}
//                     >
//                       {t("typeFilter")}
//                     </div>
//                     <div
//                       style={{
//                         fontSize: "14px",
//                         fontWeight: "600",
//                         color: isDark ? "white" : "black",
//                       }}
//                     >
//                       {editingItem.proxy === 0 ? t("sbtZone") : t("proxyZone")}
//                     </div>
//                   </div>

//                   <div
//                     style={{
//                       padding: "10px",
//                       background: isDark ? "#3d3d3d" : "#e8e8e8",
//                       borderRadius: "8px",
//                       textAlign: "center",
//                     }}
//                   >
//                     <div
//                       style={{
//                         fontSize: "12px",
//                         color: isDark ? "#aaaaaa" : "#666666",
//                         marginBottom: "4px",
//                       }}
//                     >
//                       {t("subdomains")}
//                     </div>
//                     <div
//                       style={{
//                         fontSize: "14px",
//                         fontWeight: "600",
//                         color: isDark ? "white" : "black",
//                       }}
//                     >
//                       {editingItem.subdomainsAmount || 0}
//                     </div>
//                   </div>
//                 </>
//               )}

//               {editingItem.isSubdomain && (
//                 <>
//                   <div
//                     style={{
//                       padding: "10px",
//                       background: isDark ? "#3d3d3d" : "#e8e8e8",
//                       borderRadius: "8px",
//                       textAlign: "center",
//                     }}
//                   >
//                     <div
//                       style={{
//                         fontSize: "12px",
//                         color: isDark ? "#aaaaaa" : "#666666",
//                         marginBottom: "4px",
//                       }}
//                     >
//                       {t("price")}
//                     </div>
//                     <div
//                       style={{
//                         fontSize: "14px",
//                         fontWeight: "600",
//                         color: isDark ? "white" : "black",
//                       }}
//                     >
//                       {editingItem.mintPrice
//                         ? `${editingItem.mintPrice} TON`
//                         : "Free"}
//                     </div>
//                   </div>

//                   <div
//                     style={{
//                       padding: "10px",
//                       background: isDark ? "#3d3d3d" : "#e8e8e8",
//                       borderRadius: "8px",
//                       textAlign: "center",
//                     }}
//                   >
//                     <div
//                       style={{
//                         fontSize: "12px",
//                         color: isDark ? "#aaaaaa" : "#666666",
//                         marginBottom: "4px",
//                       }}
//                     >
//                       {t("status")}
//                     </div>
//                     <div
//                       style={{
//                         fontSize: "14px",
//                         fontWeight: "600",
//                         color: isDark ? "white" : "black",
//                       }}
//                     >
//                       {editingItem.status || t("unknown")}
//                     </div>
//                   </div>
//                 </>
//               )}

//               {mode === "other" && editingItem.collection && (
//                 <div
//                   style={{
//                     padding: "10px",
//                     background: isDark ? "#3d3d3d" : "#e8e8e8",
//                     borderRadius: "8px",
//                     textAlign: "center",
//                   }}
//                 >
//                   <div
//                     style={{
//                       fontSize: "12px",
//                       color: isDark ? "#aaaaaa" : "#666666",
//                       marginBottom: "4px",
//                     }}
//                   >
//                     {t("collection")}
//                   </div>
//                   <div
//                     style={{
//                       fontSize: "14px",
//                       fontWeight: "600",
//                       color: isDark ? "white" : "black",
//                     }}
//                   >
//                     {editingItem.collection.name || t("unknown")}
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* Кнопка продления (только для Service Mode) */}
//             {mode === "service" && editingItem && (
//               <div className="renewWrapper" style={{ marginTop: "15px" }}>
//                 <DomainExpirationInfo
//                   domainName={editingItem.name || editingItem.title}
//                   isTestnet={isTestnet}
//                 />

//                 <Button
//                   onClick={handleRenewDomain}
//                   style={{
//                     width: "100%",
//                     padding: "12px",
//                     background: isDark ? "#2196F3" : "#2196F3",
//                     color: "white",
//                     marginTop: "10px",
//                   }}
//                 >
//                   {t("renew")} ({t("renewPrice")})
//                 </Button>
//               </div>
//             )}
//           </div>
//         )}

//         {/* Блок DNS записей (показывается при нажатии "Управлять") */}
//         {showDNSBlock && isVerified && (
//           <div
//             ref={dnsBlockRef}
//             style={{
//               marginTop: "20px",
//               padding: "15px",
//               background: isDark ? "#2d2d2d" : "#f5f5f5",
//               borderRadius: "12px",
//               marginBottom: "120px",
//             }}
//           >
//             <div
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 gap: "10px",
//                 marginBottom: "15px",
//               }}
//             >
//               <svg
//                 width="20"
//                 height="20"
//                 viewBox="0 0 24 24"
//                 fill="none"
//                 stroke={isDark ? "white" : "black"}
//                 strokeWidth="2"
//               >
//                 <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
//               </svg>
//               <span
//                 style={{
//                   fontSize: "16px",
//                   fontWeight: "600",
//                   color: isDark ? "white" : "black",
//                 }}
//               >
//                 {t("manageDNSRecords")}
//               </span>
//             </div>

//             {/* Поле для адреса */}
//             <div style={{ marginBottom: "15px" }}>
//               <div
//                 style={{
//                   fontSize: "12px",
//                   color: isDark ? "#aaaaaa" : "#666666",
//                   marginBottom: "5px",
//                 }}
//               >
//                 {t("addressForManage")}
//               </div>
//               <Input
//                 value={resolverAddress}
//                 onChange={(e) => setResolverAddress(e.target.value)}
//                 style={{
//                   background: isDark ? "#3d3d3d" : "white",
//                   color: isDark ? "white" : "black",
//                 }}
//               />
//             </div>

//             {/* DNS записи */}
//             <div
//               style={{ display: "flex", flexDirection: "column", gap: "15px" }}
//             >
//               {/* Кошелек */}
//               <div>
//                 <div
//                   style={{
//                     display: "flex",
//                     justifyContent: "space-between",
//                     alignItems: "center",
//                     marginBottom: "8px",
//                   }}
//                 >
//                   <span
//                     style={{
//                       fontSize: "14px",
//                       fontWeight: "600",
//                       color: isDark ? "white" : "black",
//                     }}
//                   >
//                     {t("walletAddress")}
//                   </span>
//                   <Button
//                     size="s"
//                     onClick={handleSaveWalletAddress}
//                     loading={dnsOperationLoading}
//                     style={{
//                       padding: "6px 12px",
//                       fontSize: "12px",
//                       background: isDark ? "#4CAF50" : "#4CAF50",
//                       color: "white",
//                     }}
//                   >
//                     {t("save")}
//                   </Button>
//                 </div>
//                 <Input
//                   placeholder={
//                     t("addressPlaceholder") || "Введите адрес кошелька..."
//                   }
//                   value={formData.walletAddress}
//                   onChange={(e) =>
//                     handleInputChange("walletAddress", e.target.value)
//                   }
//                   style={{
//                     background: isDark ? "#3d3d3d" : "white",
//                     color: isDark ? "white" : "black",
//                   }}
//                 />
//               </div>

//               {/* TON Сайт */}
//               <div>
//                 <div
//                   style={{
//                     display: "flex",
//                     justifyContent: "space-between",
//                     alignItems: "center",
//                     marginBottom: "8px",
//                   }}
//                 >
//                   <span
//                     style={{
//                       fontSize: "14px",
//                       fontWeight: "600",
//                       color: isDark ? "white" : "black",
//                     }}
//                   >
//                     {t("tonSites")}
//                   </span>
//                   <Button
//                     size="s"
//                     onClick={handleSaveTonSite}
//                     loading={dnsOperationLoading}
//                     style={{
//                       padding: "6px 12px",
//                       fontSize: "12px",
//                       background: isDark ? "#4CAF50" : "#4CAF50",
//                       color: "white",
//                     }}
//                   >
//                     {t("save")}
//                   </Button>
//                 </div>
//                 <Input
//                   placeholder={t("adnlAddressHex") || "Введите ADNL адрес..."}
//                   value={formData.tonSite}
//                   onChange={(e) => handleInputChange("tonSite", e.target.value)}
//                   style={{
//                     background: isDark ? "#3d3d3d" : "white",
//                     color: isDark ? "white" : "black",
//                   }}
//                 />
//               </div>

//               {/* TON Хранилище */}
//               <div>
//                 <div
//                   style={{
//                     display: "flex",
//                     justifyContent: "space-between",
//                     alignItems: "center",
//                     marginBottom: "8px",
//                   }}
//                 >
//                   <span
//                     style={{
//                       fontSize: "14px",
//                       fontWeight: "600",
//                       color: isDark ? "white" : "black",
//                     }}
//                   >
//                     {t("tonStorage")}
//                   </span>
//                   <Button
//                     size="s"
//                     onClick={handleSaveTonStorage}
//                     loading={dnsOperationLoading}
//                     style={{
//                       padding: "6px 12px",
//                       fontSize: "12px",
//                       background: isDark ? "#4CAF50" : "#4CAF50",
//                       color: "white",
//                     }}
//                   >
//                     {t("save")}
//                   </Button>
//                 </div>
//                 <Input
//                   placeholder={t("hex") || "Введите Bag ID..."}
//                   value={formData.tonStorage}
//                   onChange={(e) =>
//                     handleInputChange("tonStorage", e.target.value)
//                   }
//                   style={{
//                     background: isDark ? "#3d3d3d" : "white",
//                     color: isDark ? "white" : "black",
//                   }}
//                 />
//               </div>

//               {/* Субдомены */}
//               <div>
//                 <div
//                   style={{
//                     display: "flex",
//                     justifyContent: "space-between",
//                     alignItems: "center",
//                     marginBottom: "8px",
//                   }}
//                 >
//                   <span
//                     style={{
//                       fontSize: "14px",
//                       fontWeight: "600",
//                       color: isDark ? "white" : "black",
//                     }}
//                   >
//                     {t("subdomainsNextResolver")}
//                   </span>
//                   <Button
//                     size="s"
//                     onClick={handleSaveSubdomains}
//                     loading={dnsOperationLoading}
//                     style={{
//                       padding: "6px 12px",
//                       fontSize: "12px",
//                       background: isDark ? "#4CAF50" : "#4CAF50",
//                       color: "white",
//                     }}
//                   >
//                     {t("save")}
//                   </Button>
//                 </div>
//                 <Input
//                   placeholder={
//                     t("addressPlaceholderEQC") || "Введите адрес резолвера..."
//                   }
//                   value={formData.subdomains}
//                   onChange={(e) =>
//                     handleInputChange("subdomains", e.target.value)
//                   }
//                   style={{
//                     background: isDark ? "#3d3d3d" : "white",
//                     color: isDark ? "white" : "black",
//                   }}
//                 />
//               </div>
//             </div>

//             {/* Информация о статусе */}
//             <div
//               style={{
//                 marginTop: "15px",
//                 padding: "10px",
//                 background: isDark ? "#3d3d3d" : "#e8e8e8",
//                 borderRadius: "8px",
//                 fontSize: "12px",
//                 color: isDark ? "#aaaaaa" : "#666666",
//               }}
//             >
//               <div
//                 style={{
//                   display: "flex",
//                   alignItems: "center",
//                   gap: "5px",
//                   marginBottom: "5px",
//                 }}
//               >
//                 <svg
//                   width="14"
//                   height="14"
//                   viewBox="0 0 24 24"
//                   fill="none"
//                   stroke="currentColor"
//                   strokeWidth="2"
//                 >
//                   <circle cx="12" cy="12" r="10"></circle>
//                   <line x1="12" y1="16" x2="12" y2="12"></line>
//                   <line x1="12" y1="8" x2="12.01" y2="8"></line>
//                 </svg>
//                 <span>{t("info")}</span>
//               </div>
//               <div>
//                 • Изменения вступят в силу после подтверждения транзакции
//               </div>
//               <div>
//                 • Для удаления записи очистите поле и нажмите "{t("save")}"
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Snackbar для уведомлений */}
//         {snackbar}
//       </div>
//     </Page>
//   );
// };

// export default ManageDomainPage;

// src/pages/ManageDomainPage/ManageDomainPage.tsx
// Версия с пагинацией точками, Site/Tonviewer-ссылками в карточках, паддингами,
// лоадером для blockchain + Redux, интернационализацией.

import { FC, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { Address } from "ton-core";
import { useTonWallet, useTonConnectUI } from "@tonconnect/ui-react";

import { ModeTabs } from "@/pages/ManageDomainPage/ModeTabs";
import {
  fetchNfts,
  setSelectedCollection,
  filterNftsByCollection,
  fetchZonesFromDB,
  fetchSubdomainsFromDB,
  resetNetworkState,
} from "../../store/nft/actions";

import { getNFTCollections, CollectionKey } from "../../store/nft/constants";
import { RootState } from "../../store/rootReducer";

import {
  Button,
  Image,
  Input,
  List,
  Placeholder,
} from "@telegram-apps/telegram-ui";

import { Page } from "@/components/Page";
import { ShowSnackbar } from "@/components/ShowSnackbar";
import { ScanProgressLoader } from "@/components/ScanProgressLoader";
import { useTonAPI } from "@/hooks/useTonAPI";
import { useBlockchainScanUi } from "@/hooks/useBlockchainLoadProgress";
import { shortenAddress } from "@/utils/address";
import { AppDispatch } from "@/store/store";

import searchDog from "/src/pages/ManageDomainPage/img/searchDog.gif";

import {
  fetchDNSRecords,
  setWalletRecord,
  setSiteRecord,
  setStorageRecord,
  setNextResolverRecord,
  deleteWalletRecord,
  deleteSiteRecord,
  deleteStorageRecord,
  deleteNextResolverRecord,
  resetDNSState,
  fetchTestnetDNSRecords,
} from "../../store/dns/dnsRecordsSlice";

import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { convertRawToUserFriendlyTest } from "@/utils/tonUtils";
import { decodeDomainForDisplay, isPunycodeEncoded } from "@/utils/domainPunycode";
import { apiService } from "@/services/api";

import { DomainExpirationInfo } from "@/utils/domainExpiredAtFetchConvert";

import { useBlockchainItems } from "@/services/blockchainItems/blockchain-items-context";
import { SimpleEnrichedItem } from "@/services/blockchainItems/blockchain-items-types";
import { getInactiveZoneAddresses, cleanZoneDisplayName } from "@/services/blockchainItems/blockchain-items-utils";
import { LupaButton } from "@/components/LupaButton/LupaButton";
import { TutorialTooltip } from "@/components/Tutorial/TutorialTooltip";
import { useTutorial } from "@/contexts/TutorialContext";
import { track } from "@/utils/analytics";
import { TransactionService } from "@/services/transactionService";

// ====================================================================
// ИНТЕРФЕЙСЫ
// ====================================================================

interface FormData {
  tonSite: string;
  isChecked: boolean;
  tonStorage: string;
  walletAddress: string;
  subdomains: string;
}

interface DisplayItem {
  id: string | number;
  title: string;
  name?: string;
  address: string;
  image?: string;
  isZone?: boolean;
  isSubdomain?: boolean;
  zoneData?: any;
  subdomainData?: any;
  metadata?: any;
  dns?: string;
  previews?: any[];
  collection?: any;
  proxy?: number;
  subdomainsAmount?: number;
  mintPrice?: number;
  status?: string;
  lastBid?: number;
  lastBidder?: string;
  bids?: any[];
  links?: any[];
  wrapperAddress?: string;
  type?: string;
  isInactiveDuplicate?: boolean;
  siteResolves?: boolean | null;
}

const ITEMS_PER_PAGE = 10;

// Оконный список номеров страниц: первая/последняя + соседи текущей, остальное — "ellipsis".
// Нужен, чтобы при десятках/сотнях страниц (много NFT в кошельке) пейджер не уезжал за экран сплошным рядом точек.
const getVisiblePageNumbers = (
  totalPages: number,
  currentPage: number
): (number | "ellipsis")[] => {
  const maxVisible = 7;
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  const pages: (number | "ellipsis")[] = [0];
  const start = Math.max(1, currentPage - 1);
  const end = Math.min(totalPages - 2, currentPage + 1);

  if (start > 1) pages.push("ellipsis");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages - 2) pages.push("ellipsis");

  pages.push(totalPages - 1);
  return pages;
};

export const ManageDomainPage: FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();
  const location = useLocation();
  const tutorial = useTutorial();

  const { t } = useLanguage();
  const { currentTheme } = useTheme();
  const isDark = currentTheme === "dark";

  const API_PAYLOAD_URL = import.meta.env.VITE_API_SC_PAYLOAD_URL;
  const isTestnet = wallet?.account?.chain === "-3";

  // ====== REDUX ======
  const nftState = useSelector((state: RootState) => state.nft);
  const allNfts = isTestnet
    ? nftState.testnet.allNfts
    : nftState.mainnet.allNfts;
  const filteredItems = isTestnet
    ? nftState.testnet.filteredItems
    : nftState.mainnet.filteredItems;
  const selectedCollection = isTestnet
    ? nftState.testnet.selectedCollection
    : nftState.mainnet.selectedCollection;
  const zones = isTestnet ? nftState.testnet.zones : nftState.mainnet.zones;
  const subdomains = isTestnet
    ? nftState.testnet.subdomains
    : nftState.mainnet.subdomains;
  const reduxLoading = nftState.loading || false;

  const dnsState = useSelector((state: RootState) => state.dnsRecords);
  const dnsLoading = dnsState?.loading || false;
  const dnsOperationLoading = dnsState?.operationLoading || false;
  const parsedRecords = dnsState?.parsedRecords || {};
  const currentDomain = dnsState?.currentDomain || null;

  const { getNftItem, getNftCollection } = useTonAPI(isTestnet);

  // ====== BLOCKCHAIN-СЕРВИС ======
  const {
    userProxySubdomains,
    userSBTSubdomains,
    userNFTWrappers,
    isLoading: blockchainLoading,
    ensureData,
  } = useBlockchainItems();

  // Вкладки Zones/Subdomains этой страницы читают userProxySubdomains/
  // userSBTSubdomains/userNFTWrappers напрямую из общего стора, но страница
  // сама никогда не инициировала его загрузку — как и AddSubdomainPage до
  // этого, полагалась на то, что данные уже загрузила другая страница. На
  // холодном заходе сразу в менеджер эти вкладки были пусты.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    ensureData();
  }, []);

  // Детект дублей зон (пересозданные onchain с тем же именем) — чисто по
  // ончейн last_transaction_lt, не по backend-статусу (см. A5' в плане).
  // "Zones" здесь строится из userNFTWrappers — структурно только proxy —
  // поэтому это ТОЛЬКО автоматический визуальный бейдж "INACTIVE" (для
  // старых proxy-коллекций-артефактов вроде недокатившихся бандлов), без
  // кнопки ручной деактивации: юзер подтвердил, что вручную деактивировать
  // можно только SBT-дубли, и это делается в ProfileWidget.tsx, не здесь.
  const inactiveZoneAddresses = useMemo(
    () => getInactiveZoneAddresses(userNFTWrappers),
    [userNFTWrappers]
  );

  // Живой прогресс первичной загрузки (коллекции -> итемы), см. loading-progress-bus.ts.
  const blockchainScanUi = useBlockchainScanUi();

  // ====== LOCAL STATE ======
  const [snackbar, setSnackbar] = useState<JSX.Element | null>(null);
  const [resolverAddress, setResolverAddress] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [checkingResolver, setCheckingResolver] = useState(false);
  const [isAutoCheckTriggered, setIsAutoCheckTriggered] = useState(false);
  // Триггер для deep-link'а из ProfileWidget (?address=...) — см. ЭФФЕКТ 3/3.1
  // ниже: старый isAutoCheckTriggered гонит по ветке mode==="other" в
  // handleCheckResolverAddress, которая просто ставит isVerified=true и не
  // поднимает editingItem/showInfoBlock — итем реально не открывался.
  const [autoAnyLookupTriggered, setAutoAnyLookupTriggered] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [mode, setMode] = useState<"other" | "service">("service");
  const [manualCollectionAddress, setManualCollectionAddress] = useState("");
  const [showInfoBlock, setShowInfoBlock] = useState(false);
  const [showDNSBlock, setShowDNSBlock] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Тумблер "показывать сырой punycode вместо юникода" — влияет только на
  // отображение title карточек (enrichedItemToDisplayItem ниже), не на поиск.
  const [showPunycode, setShowPunycode] = useState(false);
  // Раньше это было useState ВНУТРИ SearchAndFilterSection — вложенная
  // функция-компонент, объявленная прямо в теле рендера ManageDomainPage,
  // получает новую identity на каждый ре-рендер родителя (например, клик по
  // punycode выше), React считает её другим компонентом и полностью
  // перемонтирует, стирая внутренний showAdvancedFilter в false — снаружи
  // это выглядело как "при выборе punycode блок фильтров исчезает, помогает
  // только перезагрузка страницы". Подняли стейт на уровень родителя, где
  // он переживает любые ре-рендеры.
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [minLength, setMinLength] = useState<number>(0);
  const [maxLength, setMaxLength] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [loadingText, setLoadingText] = useState<string>("");

  const [formData, setFormData] = useState<FormData>({
    tonSite: "",
    isChecked: false,
    tonStorage: "",
    walletAddress: "",
    subdomains: "",
  });

  const [originalFormData, setOriginalFormData] = useState<FormData>({
    tonSite: "",
    isChecked: false,
    tonStorage: "",
    walletAddress: "",
    subdomains: "",
  });

  // ====== REFS ======
  const infoBlockRef = useRef<HTMLDivElement>(null);
  const dnsBlockRef = useRef<HTMLDivElement>(null);
  const hasLoadedData = useRef(false);
  const prevMode = useRef(mode);
  const prevSelectedCollection = useRef(selectedCollection);
  const prevIsTestnet = useRef(isTestnet);

  // ====== ОБЪЕДИНЁННЫЙ ЛОАДЕР ======
  // blockchainLoading (useBlockchainItems, медленный ончейн-агрегатор всех
  // платформенных коллекций) нужен только для mode==="service" —
  // getFilteredItemsForMode в режиме "other" его вообще не читает. Раньше
  // спиннер держался, пока не досчитается несвязанный service-пайплайн,
  // даже если юзер сидит в "Other" и ждёт только fetchNfts (reduxLoading).
  const isLoading = reduxLoading || (mode === "service" && blockchainLoading);

  // ====== SNACKBAR ======
  const showSnackbar = (
    message: string,
    type: "success" | "error" | "sent" = "success"
  ) => {
    setSnackbar(
      <ShowSnackbar
        message={message}
        type={type}
        onClose={() => setSnackbar(null)}
      />
    );
  };

  const handleInputChange = (
    field: keyof FormData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ====== АДАПТЕР ======
  const enrichedItemToDisplayItem = useCallback(
    (item: SimpleEnrichedItem, isZone: boolean): DisplayItem => {
      const rawName =
        item.metadata?.token_info?.[0]?.name || item.domain || "Без названия";
      // Только у зон сырое имя коллекции бывает замусорено "Proxy .../Domain" —
      // у субдоменов такого не встречается, чистка не нужна и не трогает их.
      const cleaned = isZone ? cleanZoneDisplayName(rawName) : rawName;
      // xn--... -> юникод (если не включён тумблер "punycode") — единая
      // точка для всех карточек этой страницы.
      const name = showPunycode ? cleaned : decodeDomainForDisplay(cleaned);
      const image =
        item.metadata?.image ||
        item.metadata?.token_info?.[0]?.image ||
        item.metadata?.token_info?.[0]?.extra?._image_small;
      return {
        id: item.address,
        title: name,
        address: item.address,
        isZone,
        isSubdomain: !isZone,
        image: image || "",
        metadata: item.metadata,
        type: item.type,
        isInactiveDuplicate: isZone && inactiveZoneAddresses.has(item.address),
        siteResolves: item.siteResolves,
      };
    },
    [inactiveZoneAddresses, showPunycode]
  );

  // ====== КАРТИНКИ ======
  const getItemImageUrl = (item: DisplayItem): string => {
    if (item.image && item.image !== "") return item.image;

    if (item.isZone) {
      const zoneName = (item.title || "").replace(".ton", "");
      return `${API_PAYLOAD_URL}/api/v1/proxy/metadata/ton/${zoneName}.png`;
    }

    if (item.isSubdomain) {
      const fullName = item.title || "";
      const parts = fullName.split(".");
      const itemType = (item as any).type || "proxy_subdomain";
      if (parts.length >= 3) {
        const subdomainName = parts[0];
        const domainName = parts.slice(1).join(".").replace(".ton", "");
        if (itemType === "sbt_subdomain") {
          return `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${domainName}/${subdomainName}.png`;
        }
        return `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${domainName}/${subdomainName}.png`;
      }
      if (parts.length === 2) {
        const subdomainName = parts[0];
        const domainName = parts[1].replace(".ton", "");
        if (itemType === "sbt_subdomain") {
          return `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${domainName}/${subdomainName}.png`;
        }
        return `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${domainName}/${subdomainName}.png`;
      }
    }

    if (item.metadata?.image) return item.metadata.image;

    const previews = (item as any).previews as
      | Array<{ resolution?: string; url: string }>
      | undefined;
    if (previews && previews.length > 0) {
      const preferred =
        previews.find((p) => p.resolution === "500x500") ||
        previews[previews.length - 1];
      if (preferred?.url) return preferred.url;
    }

    return searchDog;
  };

  // ====== TONVIEWER-ССЫЛКА ======
  // const createTonViewerLink = (addr: string): string => {
  //   const baseUrl = isTestnet
  //     ? "https://testnet.tonviewer.com"
  //     : "https://tonviewer.com";
  //   return `${baseUrl}/${addr}`;
  // };

  // ====== ФОРМА ======
  const resetFormData = () => {
    const empty: FormData = {
      tonSite: "",
      isChecked: false,
      tonStorage: "",
      walletAddress: "",
      subdomains: "",
    };
    setFormData(empty);
    setOriginalFormData(empty);
  };

  // ====== ЭФФЕКТ 1: Загрузка данных ======
  useEffect(() => {
    if (!wallet?.account?.address) return;

    const cleanAddress = wallet.account.address.startsWith("0x")
      ? wallet.account.address.slice(2)
      : wallet.account.address;

    if (prevMode.current !== mode) {
      hasLoadedData.current = false;
      prevMode.current = mode;
      dispatch(resetNetworkState(isTestnet));
    }

    if (!hasLoadedData.current) {
      hasLoadedData.current = true;

      if (mode === "other") {
        setLoadingText("");
        dispatch(fetchNfts({ walletAddress: cleanAddress, isTestnet }));
      } else {
        if (selectedCollection === "subdomains")
          setLoadingText(t("loadingSubdomains"));
        else if (selectedCollection === "zones")
          setLoadingText(t("loadingProxyDomains"));
        else setLoadingText("");

        let userAddressForDB = cleanAddress;
        if (isTestnet)
          userAddressForDB = convertRawToUserFriendlyTest(cleanAddress);

        dispatch(
          fetchZonesFromDB({ userAddress: userAddressForDB, isTestnet })
        );
        dispatch(
          fetchSubdomainsFromDB({ userAddress: userAddressForDB, isTestnet })
        );
      }
    }
  }, [dispatch, wallet, isTestnet, mode, selectedCollection, t]);

  // ====== ЭФФЕКТ 2: Фильтрация ======
  useEffect(() => {
    if (
      prevSelectedCollection.current !== selectedCollection ||
      prevIsTestnet.current !== isTestnet
    ) {
      if (
        mode === "other" &&
        allNfts.length > 0 &&
        selectedCollection !== "any"
      ) {
        dispatch(
          filterNftsByCollection({
            nfts: allNfts,
            collectionKey: selectedCollection as CollectionKey,
            isTestnet,
          })
        );
      }
      setCurrentPage(0);
      prevSelectedCollection.current = selectedCollection;
      prevIsTestnet.current = isTestnet;
    }
  }, [dispatch, mode, selectedCollection, isTestnet, allNfts]);

  // ====== ЭФФЕКТ 3: URL-параметр ======
  // Ведёт через тот же путь, что и ручной ввод в табе "Any" (handleAnyTabSubmit)
  // — единственный, который реально поднимает editingItem/showInfoBlock и
  // открывает итем в обход полного списка. Раньше сюда шёл mode==="other" +
  // resolverAddress (handleCheckResolverAddress) — режим по умолчанию
  // "service", а даже в "other" эта ветка просто ставила isVerified=true и
  // ничего не открывала: deep-link из ProfileWidget'а (handleManage) не
  // работал вообще, юзер видел общий список, а не конкретный итем.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const address = params.get("address");
    if (address) {
      try {
        const normalized = Address.parse(address).toString();
        handleModeChange("other");
        handleTabChange("any");
        setManualCollectionAddress(normalized);
        setAutoAnyLookupTriggered(true);
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  // ====== ЭФФЕКТ 3.1: Авто-запуск поиска по адресу из deep-link'а ======
  useEffect(() => {
    if (autoAnyLookupTriggered && manualCollectionAddress) {
      handleAnyTabSubmit();
      setAutoAnyLookupTriggered(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualCollectionAddress, autoAnyLookupTriggered]);

  // ====== ЭФФЕКТ 4: Авто-проверка (старый путь "Other"-режима, вне Any-таба) ======
  useEffect(() => {
    if (isAutoCheckTriggered && resolverAddress) {
      handleCheckResolverAddress();
      setIsAutoCheckTriggered(false);
    }
  }, [resolverAddress, isAutoCheckTriggered]);

  // ====== ЭФФЕКТ 5: Обновление формы из DNS ======
  useEffect(() => {
    if (currentDomain && parsedRecords[currentDomain] && editingItem) {
      const record = parsedRecords[currentDomain];
      const newFormData: FormData = {
        tonSite: record.siteAdnl || "",
        isChecked: false,
        tonStorage: record.storageBagId || "",
        walletAddress: record.walletAddress || "",
        subdomains: record.nextResolver || "",
      };
      setFormData(newFormData);
      setOriginalFormData(newFormData);
    }
  }, [currentDomain, parsedRecords, editingItem]);

  // ====== ЭФФЕКТ 5.1: Обучалка — предзаполнение адреса кошелька ======
  // Блок 1, ветка "есть домен → привязать" — юзер попал сюда через
  // AvatarSecretPage (?address=...), подставляем его же подключённый
  // кошелёк в поле привязки, чтобы оставалось только нажать "Сохранить".
  // Только в туре и только если поле реально пустое — не перезаписываем
  // существующую on-chain запись вне обучалки.
  useEffect(() => {
    if (
      tutorial.active &&
      !tutorial.isStepDone('domain_answered') &&
      editingItem &&
      !formData.walletAddress &&
      wallet?.account?.address
    ) {
      setFormData((prev) => ({ ...prev, walletAddress: wallet.account!.address }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorial.active, editingItem, wallet?.account?.address]);

  // ====== ПРОВЕРКА АДРЕСА ======
  const handleCheckResolverAddress = async () => {
    try {
      if (!resolverAddress) {
        showSnackbar(t("addressPlaceholder"), "error");
        return;
      }
      setCheckingResolver(true);
      const address = Address.parse(resolverAddress).toString();
      if (mode === "other") {
        const nftInfo = await getNftItem(address);
        if (nftInfo) {
          setIsVerified(true);
          showSnackbar(t("nftVerifiedSuccessfully"), "success");
        } else showSnackbar(t("nftNotFound"), "error");
      } else {
        setIsVerified(true);
        showSnackbar(t("itemVerifiedSuccessfully"), "success");
      }
    } catch (error: any) {
      showSnackbar(error.message || "Ошибка", "error");
    } finally {
      setCheckingResolver(false);
    }
  };

  // ====== КЛИК ПО ИТЕМУ ======
  const handleItemClick = useCallback(
    async (item: any) => {
      resetFormData();
      setShowInfoBlock(true);
      setShowDNSBlock(false);
      setEditingItem(item);

      if (mode === "other") {
        try {
          const nftInfo = await getNftItem(item.address);
          if (nftInfo) {
            const dnsName = item.dns || item.metadata?.name || item.title;
            if (
              dnsName &&
              (selectedCollection === "tme" || selectedCollection === "ton")
            ) {
              if (isTestnet) dispatch(fetchTestnetDNSRecords(dnsName));
              else dispatch(fetchDNSRecords(dnsName));
            }
          }
        } catch {
          /* ignore */
        }
      }

      setTimeout(
        () =>
          infoBlockRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        100
      );
    },
    [mode, getNftItem, selectedCollection, dispatch, isTestnet]
  );

  // ====== КНОПКА "УПРАВЛЯТЬ" ======
  const handleManageClick = useCallback(async () => {
    if (!editingItem) return;
    setShowDNSBlock(true);

    let itemAddress = "";
    if (mode === "other") {
      itemAddress = editingItem.address;
    } else {
      if (editingItem.isZone) {
        const isProxyZone =
          editingItem.proxy === 1 || editingItem.proxy === "1";
        if (isProxyZone) {
          if (editingItem.wrapperAddress) {
            itemAddress = editingItem.wrapperAddress;
          } else {
            try {
              const baseTONApiUri = isTestnet
                ? "testnet.tonapi.io"
                : "tonapi.io";
              const resp = await fetch(
                `https://${baseTONApiUri}/v2/nfts/${editingItem.address}`
              );
              if (!resp.ok) throw new Error(`TON API: ${resp.status}`);
              const nftData = await resp.json();
              if (nftData.owner?.address) {
                itemAddress = nftData.owner.address;
                try {
                  await apiService.updateZoneWrapper(
                    editingItem.name,
                    itemAddress
                  );
                } catch {
                  /* ignore */
                }
              } else throw new Error("Нет owner");
            } catch {
              itemAddress = editingItem.address;
              showSnackbar("Не удалось получить адрес враппера", "error");
            }
          }
        } else {
          itemAddress = editingItem.address;
        }
      } else {
        itemAddress = editingItem.address;
      }
    }

    setResolverAddress(itemAddress);
    setIsVerified(true);

    const itemName =
      mode === "other"
        ? editingItem.dns || editingItem.metadata?.name || editingItem.title
        : editingItem.name || editingItem.title;

    if (
      itemName &&
      !dnsLoading &&
      !(currentDomain === itemName && Object.keys(parsedRecords).length > 0)
    ) {
      if (isTestnet) dispatch(fetchTestnetDNSRecords(itemName));
      else dispatch(fetchDNSRecords(itemName));
    }

    setTimeout(
      () =>
        dnsBlockRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      100
    );
  }, [
    editingItem,
    mode,
    isTestnet,
    dispatch,
    showSnackbar,
    currentDomain,
    parsedRecords,
    dnsLoading,
  ]);

  // ====== ANY-TAB ======
  const handleAnyTabSubmit = async () => {
    if (!manualCollectionAddress) {
      showSnackbar(t("pleaseEnterDomainName"), "error");
      return;
    }
    try {
      setCheckingResolver(true);
      const address = Address.parse(manualCollectionAddress).toString();
      let nftInfo = await getNftItem(address);
      if (!nftInfo || nftInfo.title === "")
        nftInfo = await getNftCollection(address);
      if (nftInfo && nftInfo.title) {
        const tempItem = {
          id: `any_${Date.now()}`,
          title: nftInfo.title,
          address,
          metadata: nftInfo,
          previews: nftInfo.image ? [{ url: nftInfo.image }] : [],
        };
        setEditingItem(tempItem);
        setShowInfoBlock(true);
        setShowDNSBlock(false);
        setTimeout(
          () =>
            infoBlockRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            }),
          100
        );
        showSnackbar(t("itemFoundSuccessfully"), "success");
      } else showSnackbar(t("itemNotFound"), "error");
    } catch (error: any) {
      showSnackbar(error.message || "Ошибка", "error");
    } finally {
      setCheckingResolver(false);
    }
  };

  // ====== DNS-ЗАПИСИ (сохранение) ======
  const handleSaveWalletAddress = async () => {
    /* без изменений */
    try {
      if (!resolverAddress) throw new Error(t("addressPlaceholder"));
      if (!tonConnectUI) throw new Error(t("walletNotConnected"));
      if (
        formData.walletAddress &&
        formData.walletAddress !== originalFormData.walletAddress
      ) {
        const result = await dispatch(
          setWalletRecord({
            dnsItemAddress: resolverAddress,
            userWalletAddress: formData.walletAddress,
            tonConnectUI,
            isTestnet,
          })
        );
        // setWalletRecord.fulfilled.match(result), не `if (result.payload)` —
        // rejectWithValue тоже кладёт значение в action.payload, так что
        // старая проверка показывала "успех" и на реальной ошибке/неподтверждённой
        // транзакции (см. коммент в dnsRecordsSlice.ts).
        if (setWalletRecord.fulfilled.match(result)) {
          showSnackbar(
            t("walletAddress") + " " + t("proxyDeployedSuccessfully"),
            "success"
          );
          setOriginalFormData({ ...formData });
          if (editingItem?.title) {
            apiService.notifyDnsRecordUpdated(editingItem.title, "address", "set");
          }
          if (tutorial.active && !tutorial.isStepDone('domain_answered')) {
            await tutorial.recordStep('domain_answered');
            tutorial.resumeStep();
          }
        } else {
          showSnackbar(String(result.payload || t("transactionNotConfirmed")), "error");
        }
      } else if (!formData.walletAddress && originalFormData.walletAddress) {
        const result = await dispatch(
          deleteWalletRecord({ dnsItemAddress: resolverAddress, tonConnectUI, isTestnet })
        );
        if (deleteWalletRecord.fulfilled.match(result)) {
          showSnackbar(
            t("walletAddress") + " " + t("transactionNotConfirmed"),
            "success"
          );
          setOriginalFormData({ ...formData });
          if (editingItem?.title) {
            apiService.notifyDnsRecordUpdated(editingItem.title, "address", "delete");
          }
        } else {
          showSnackbar(String(result.payload || t("transactionNotConfirmed")), "error");
        }
      }
    } catch (error: any) {
      showSnackbar(error.message, "error");
    }
  };

  const handleSaveTonSite = async () => {
    /* без изменений */
    try {
      if (!resolverAddress) throw new Error(t("addressPlaceholder"));
      if (!tonConnectUI) throw new Error(t("walletNotConnected"));
      if (formData.tonSite && formData.tonSite !== originalFormData.tonSite) {
        const result = await dispatch(
          setSiteRecord({
            dnsItemAddress: resolverAddress,
            adnlAddressHex: formData.tonSite,
            tonConnectUI,
            isTestnet,
          })
        );
        if (setSiteRecord.fulfilled.match(result)) {
          showSnackbar(
            t("tonSites") + " " + t("proxyDeployedSuccessfully"),
            "success"
          );
          setOriginalFormData({ ...formData });
          if (editingItem?.title) {
            apiService.notifyDnsRecordUpdated(editingItem.title, "adnl", "set");
          }
        } else {
          showSnackbar(String(result.payload || t("transactionNotConfirmed")), "error");
        }
      } else if (!formData.tonSite && originalFormData.tonSite) {
        const result = await dispatch(
          deleteSiteRecord({ dnsItemAddress: resolverAddress, tonConnectUI, isTestnet })
        );
        if (deleteSiteRecord.fulfilled.match(result)) {
          showSnackbar(
            t("tonSites") + " " + t("transactionNotConfirmed"),
            "success"
          );
          setOriginalFormData({ ...formData });
          if (editingItem?.title) {
            apiService.notifyDnsRecordUpdated(editingItem.title, "adnl", "delete");
          }
        } else {
          showSnackbar(String(result.payload || t("transactionNotConfirmed")), "error");
        }
      }
    } catch (error: any) {
      showSnackbar(error.message, "error");
    }
  };

  const handleSaveTonStorage = async () => {
    /* без изменений */
    try {
      if (!resolverAddress) throw new Error(t("addressPlaceholder"));
      if (!tonConnectUI) throw new Error(t("walletNotConnected"));
      if (
        formData.tonStorage &&
        formData.tonStorage !== originalFormData.tonStorage
      ) {
        const result = await dispatch(
          setStorageRecord({
            dnsItemAddress: resolverAddress,
            bagIdHex: formData.tonStorage,
            tonConnectUI,
            isTestnet,
          })
        );
        if (setStorageRecord.fulfilled.match(result)) {
          showSnackbar(
            t("tonStorage") + " " + t("proxyDeployedSuccessfully"),
            "success"
          );
          setOriginalFormData({ ...formData });
          if (editingItem?.title) {
            apiService.notifyDnsRecordUpdated(editingItem.title, "bagId", "set");
          }
        } else {
          showSnackbar(String(result.payload || t("transactionNotConfirmed")), "error");
        }
      } else if (!formData.tonStorage && originalFormData.tonStorage) {
        const result = await dispatch(
          deleteStorageRecord({ dnsItemAddress: resolverAddress, tonConnectUI, isTestnet })
        );
        if (deleteStorageRecord.fulfilled.match(result)) {
          showSnackbar(
            t("tonStorage") + " " + t("transactionNotConfirmed"),
            "success"
          );
          setOriginalFormData({ ...formData });
          if (editingItem?.title) {
            apiService.notifyDnsRecordUpdated(editingItem.title, "bagId", "delete");
          }
        } else {
          showSnackbar(String(result.payload || t("transactionNotConfirmed")), "error");
        }
      }
    } catch (error: any) {
      showSnackbar(error.message, "error");
    }
  };

  const handleSaveSubdomains = async () => {
    /* без изменений */
    try {
      if (!resolverAddress) throw new Error(t("addressPlaceholder"));
      if (!tonConnectUI) throw new Error(t("walletNotConnected"));
      if (
        formData.subdomains &&
        formData.subdomains !== originalFormData.subdomains
      ) {
        const result = await dispatch(
          setNextResolverRecord({
            dnsItemAddress: resolverAddress,
            resolverAddress: formData.subdomains,
            tonConnectUI,
            isTestnet,
          })
        );
        if (setNextResolverRecord.fulfilled.match(result)) {
          showSnackbar(
            t("subdomainsNextResolver") + " " + t("proxyDeployedSuccessfully"),
            "success"
          );
          setOriginalFormData({ ...formData });
          if (editingItem?.title) {
            apiService.notifyDnsRecordUpdated(editingItem.title, "address", "set");
          }
        } else {
          showSnackbar(String(result.payload || t("transactionNotConfirmed")), "error");
        }
      } else if (!formData.subdomains && originalFormData.subdomains) {
        const result = await dispatch(
          deleteNextResolverRecord({
            dnsItemAddress: resolverAddress,
            tonConnectUI,
            isTestnet,
          })
        );
        if (deleteNextResolverRecord.fulfilled.match(result)) {
          showSnackbar(
            t("subdomainsNextResolver") + " " + t("transactionNotConfirmed"),
            "success"
          );
          setOriginalFormData({ ...formData });
          if (editingItem?.title) {
            apiService.notifyDnsRecordUpdated(editingItem.title, "address", "delete");
          }
        } else {
          showSnackbar(String(result.payload || t("transactionNotConfirmed")), "error");
        }
      }
    } catch (error: any) {
      showSnackbar(error.message, "error");
    }
  };

  // ====== ПРОДЛЕНИЕ ДОМЕНА ======
  const handleRenewDomain = async () => {
    if (!editingItem || !tonConnectUI) {
      showSnackbar(t("walletNotConnected"), "error");
      return;
    }
    try {
      let targetAddress = "";
      let domainName = "";
      if (mode === "other") {
        targetAddress = editingItem.address;
        domainName =
          editingItem.dns || editingItem.metadata?.name || editingItem.title;
      } else {
        if (editingItem.isZone) {
          const isProxyZone =
            editingItem.proxy === 1 || editingItem.proxy === "1";
          if (isProxyZone) {
            if (editingItem.wrapperAddress) {
              targetAddress = editingItem.wrapperAddress;
            } else {
              const baseTONApiUri = isTestnet
                ? "testnet.tonapi.io"
                : "tonapi.io";
              const resp = await fetch(
                `https://${baseTONApiUri}/v2/nfts/${editingItem.address}`
              );
              if (!resp.ok) throw new Error(`TON API: ${resp.status}`);
              const nftData = await resp.json();
              if (nftData.owner?.address) {
                targetAddress = nftData.owner.address;
                try {
                  await apiService.updateZoneWrapper(
                    editingItem.name,
                    targetAddress
                  );
                } catch {
                  /* ignore */
                }
              } else throw new Error("Нет owner");
            }
          } else targetAddress = editingItem.address;
        } else targetAddress = editingItem.address;
        domainName = editingItem.name || editingItem.title;
      }
      if (!targetAddress) {
        showSnackbar("Не удалось определить адрес", "error");
        return;
      }
      const amountInNano = 0.05 * 1_000_000_000;
      const userFriendlyAddress = convertRawToUserFriendlyTest(targetAddress);
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
          { address: userFriendlyAddress, amount: amountInNano.toString() },
        ],
      };
      const result = await TransactionService.sendTransaction(tonConnectUI, transaction, {
        network: isTestnet ? "testnet" : "mainnet",
        verifyBlockchain: true,
        action: "renew_domain",
      });
      if (!result.success) {
        track("domain_renewal_failed", { reason: (result.error || "not_confirmed").slice(0, 120) });
        showSnackbar(result.error || t("transactionNotConfirmed"), "error");
        return;
      }
      track("domain_renewed");
      showSnackbar(
        `Транзакция на продление ${domainName} подтверждена`,
        "success"
      );
    } catch (error: any) {
      track("domain_renewal_failed", { reason: String(error?.message || "unknown").slice(0, 120) });
      showSnackbar(error.message || "Ошибка", "error");
    }
  };

  // ====== СМЕНА РЕЖИМА ======
  const handleModeChange = (newMode: "other" | "service") => {
    setMode(newMode);
    setShowInfoBlock(false);
    setShowDNSBlock(false);
    setEditingItem(null);
    resetFormData();
    dispatch(resetDNSState());
    setCurrentPage(0);
    hasLoadedData.current = false;
    const defaultCollection = newMode === "service" ? "any" : "ton";
    dispatch(
      setSelectedCollection({
        collectionKey: defaultCollection as CollectionKey,
        isTestnet,
      })
    );
  };

  // ====== СМЕНА ТАБА ======
  const handleTabChange = useCallback(
    (collectionKey: string) => {
      dispatch(
        setSelectedCollection({
          collectionKey: collectionKey as CollectionKey,
          isTestnet,
        })
      );
      setShowInfoBlock(false);
      setShowDNSBlock(false);
      setEditingItem(null);
      dispatch(resetDNSState());
      resetFormData();
      setCurrentPage(0);
      if (collectionKey === "any") setManualCollectionAddress("");
    },
    [dispatch, isTestnet]
  );

  // ====== ФИЛЬТРАЦИЯ ======
  const getFilteredItemsForMode = useCallback(() => {
    let items: any[] = [];

    if (mode === "service") {
      switch (selectedCollection) {
        case "subdomains":
          items = [
            ...userProxySubdomains.map((item) =>
              enrichedItemToDisplayItem(item, false)
            ),
            ...userSBTSubdomains.map((item) =>
              enrichedItemToDisplayItem(item, false)
            ),
          ];
          break;
        case "zones":
          items = userNFTWrappers.map((item) =>
            enrichedItemToDisplayItem(item, true)
          );
          break;
        default:
          return [];
      }
    }

    if (mode === "other") {
      if (filteredItems.length > 0) {
        items = filteredItems as any[];
      } else {
        const nftCollections = getNFTCollections(isTestnet);
        const collectionInfo =
          nftCollections[selectedCollection as keyof typeof nftCollections];
        if (!collectionInfo || selectedCollection === "any") {
          if (selectedCollection === "any") return [];
          items = allNfts;
        } else {
          const collectionAddress = collectionInfo.address;
          items = allNfts.filter(
            (nft: any) =>
              nft.collection?.address?.toLowerCase() ===
              collectionAddress.toLowerCase()
          );
        }
      }
    }

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      items = items.filter((item: any) => {
        const rawName = (item.title || item.dns || item.metadata?.name || item.name || "").toLowerCase();
        // Сравниваем и с сырым (punycode) именем, и с декодированным юникодом
        // — юзер может искать и как "xn--...", и как реальное написание.
        return rawName.includes(q) || decodeDomainForDisplay(rawName).includes(q);
      });
    }

    // Тумблер "punycode" — фильтр, не просто форма отображения: показывает
    // только реально punycode-закодированные имена, скрывая обычные ASCII.
    if (showPunycode) {
      items = items.filter((item: any) => {
        const rawName = item.title || item.dns || item.metadata?.name || item.name || "";
        return isPunycodeEncoded(rawName);
      });
    }

    items = items.filter((item: any) => {
      const length = (
        item.title ||
        item.dns ||
        item.metadata?.name ||
        item.name ||
        ""
      ).length;
      return length >= minLength && length <= maxLength;
    });

    items.sort((a: any, b: any) => {
      const aLen = (a.title || a.dns || a.metadata?.name || a.name || "")
        .length;
      const bLen = (b.title || b.dns || b.metadata?.name || b.name || "")
        .length;
      return sortOrder === "asc" ? aLen - bLen : bLen - aLen;
    });

    return items
      .map((item: any, index: number) => {
        if (!item) return null;
        return {
          ...item,
          title:
            item.title ||
            item.dns ||
            item.metadata?.name ||
            item.name ||
            "Unnamed",
          address:
            item.address || item.wrapperAddress || `item_${item.id || index}`,
          id: item.id || item.address || `item_${Date.now()}_${index}`,
          isZone:
            item.isZone ??
            (mode === "service" && selectedCollection === "zones"),
          isSubdomain:
            item.isSubdomain ??
            (mode === "service" && selectedCollection === "subdomains"),
        };
      })
      .filter(Boolean) as DisplayItem[];
  }, [
    mode,
    selectedCollection,
    isTestnet,
    allNfts,
    filteredItems,
    searchQuery,
    minLength,
    maxLength,
    sortOrder,
    userProxySubdomains,
    userSBTSubdomains,
    userNFTWrappers,
    enrichedItemToDisplayItem,
    showPunycode,
  ]);

  // ====== ПАГИНАЦИЯ ======
  const allFilteredItems = getFilteredItemsForMode();
  const totalPages = Math.ceil(allFilteredItems.length / ITEMS_PER_PAGE);
  const startIdx = currentPage * ITEMS_PER_PAGE;
  const displayItems = allFilteredItems.slice(
    startIdx,
    startIdx + ITEMS_PER_PAGE
  );

  // ====== SEARCH & FILTER ======
  const SearchAndFilterSection = () => {
    return (
      <div
        style={{
          background: isDark ? "#2d2d2d" : "#f5f5f5",
          borderRadius: "12px",
          padding: "15px",
          margin: "10px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke={isDark ? "white" : "black"}
              strokeWidth="2"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            <span
              style={{
                fontSize: "14px",
                fontWeight: "600",
                color: isDark ? "white" : "black",
              }}
            >
              {t("searchAndFilter")}
            </span>
          </div>
          {/* Раньше "punycode" и "Расширенный поиск" были двумя отдельными
              кнопками с полным текстом — не помещались рядом с заголовком.
              Одна кнопка-иконка, оба переключателя — внутри общей панели
              (тот же приём, что и в MarketPage). */}
          <button
            onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
            title={t("showFilters")}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              border: `1px solid ${isDark ? "#FFD700" : "#3B82F6"}`,
              background: showAdvancedFilter ? (isDark ? "#FFD700" : "#3B82F6") : "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={showAdvancedFilter ? (isDark ? "#000000" : "#FFFFFF") : (isDark ? "#FFD700" : "#3B82F6")} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
          </button>
        </div>
        <Input
          placeholder={t("searchByName")}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(0);
          }}
          style={{
            background: isDark ? "#3d3d3d" : "white",
            color: isDark ? "white" : "black",
          }}
        />
        {showPunycode && (
          <div style={{
            background: isDark ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.1)",
            border: "1px solid #ef4444",
            borderRadius: "8px",
            padding: "8px 12px",
            marginBottom: "8px",
            fontSize: "12px",
            color: isDark ? "white" : "black",
          }}>
            ⚠️ {t("marketPunycodeWarning") || "Punycode (xn--...) официально не поддерживается большинством сервисов и отображается в нечитаемом формате — здесь показаны только домены с реальным punycode-именем."}
          </div>
        )}
        {/* Сортировка + мин/макс длина раньше были отдельным всегда-видимым
            рядом кнопок над картой NFT — первая карточка списка обрезалась
            снизу. Свёрнуты внутрь той же панели "Фильтры", что и было. */}
        {showAdvancedFilter && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              padding: "10px",
              background: isDark ? "#3d3d3d" : "#e8e8e8",
              borderRadius: "8px",
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12px", fontFamily: "monospace", color: isDark ? "white" : "black" }}>
              <input
                type="checkbox"
                checked={showPunycode}
                onChange={() => setShowPunycode(!showPunycode)}
                style={{ cursor: "pointer" }}
              />
              <span>punycode</span>
            </label>
            <div
              style={{
                display: "flex",
                borderRadius: "8px",
                overflow: "hidden",
                border: `1px solid ${isDark ? "#FFD700" : "#3B82F6"}`,
              }}
            >
              <button
                onClick={() => setSortOrder("asc")}
                title={t("shortToLong")}
                style={{
                  flex: 1,
                  padding: "9px 10px",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  background: sortOrder === "asc" ? (isDark ? "#FFD700" : "#3B82F6") : "transparent",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Столбики по возрастанию — компактная замена длинному
                    переводному тексту ("Короткие → Длинные" не влезал в
                    узкую кнопку ни на одном языке). Перевод остался в title. */}
                <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
                  <rect x="0" y="9" width="4" height="5" rx="1" fill={sortOrder === "asc" ? (isDark ? "#000000" : "#FFFFFF") : (isDark ? "#FFD700" : "#3B82F6")} />
                  <rect x="6" y="6" width="4" height="8" rx="1" fill={sortOrder === "asc" ? (isDark ? "#000000" : "#FFFFFF") : (isDark ? "#FFD700" : "#3B82F6")} />
                  <rect x="12" y="3" width="4" height="11" rx="1" fill={sortOrder === "asc" ? (isDark ? "#000000" : "#FFFFFF") : (isDark ? "#FFD700" : "#3B82F6")} />
                  <path d="M17 1 L20 4 L14 4 Z" fill={sortOrder === "asc" ? (isDark ? "#000000" : "#FFFFFF") : (isDark ? "#FFD700" : "#3B82F6")} />
                </svg>
              </button>
              <button
                onClick={() => setSortOrder("desc")}
                title={t("longToShort")}
                style={{
                  flex: 1,
                  padding: "9px 10px",
                  border: "none",
                  borderLeft: `1px solid ${isDark ? "#FFD700" : "#3B82F6"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  background: sortOrder === "desc" ? (isDark ? "#FFD700" : "#3B82F6") : "transparent",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Столбики по убыванию — зеркало иконки выше. */}
                <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
                  <rect x="0" y="3" width="4" height="11" rx="1" fill={sortOrder === "desc" ? (isDark ? "#000000" : "#FFFFFF") : (isDark ? "#FFD700" : "#3B82F6")} />
                  <rect x="6" y="6" width="4" height="8" rx="1" fill={sortOrder === "desc" ? (isDark ? "#000000" : "#FFFFFF") : (isDark ? "#FFD700" : "#3B82F6")} />
                  <rect x="12" y="9" width="4" height="5" rx="1" fill={sortOrder === "desc" ? (isDark ? "#000000" : "#FFFFFF") : (isDark ? "#FFD700" : "#3B82F6")} />
                  <path d="M17 13 L20 10 L14 10 Z" fill={sortOrder === "desc" ? (isDark ? "#000000" : "#FFFFFF") : (isDark ? "#FFD700" : "#3B82F6")} />
                </svg>
              </button>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span
                style={{
                  color: isDark ? "white" : "#666",
                  fontSize: "12px",
                  minWidth: "60px",
                }}
              >
                {t("length")}:
              </span>
              <Input
                type="number"
                placeholder={t("min")}
                value={minLength}
                onChange={(e) => {
                  setMinLength(parseInt(e.target.value) || 0);
                  setCurrentPage(0);
                }}
                style={{
                  width: "80px",
                  background: isDark ? "#2d2d2d" : "white",
                  color: isDark ? "white" : "black",
                }}
              />
              <span style={{ color: isDark ? "white" : "#666" }}>-</span>
              <Input
                type="number"
                placeholder={t("max")}
                value={maxLength}
                onChange={(e) => {
                  setMaxLength(parseInt(e.target.value) || 100);
                  setCurrentPage(0);
                }}
                style={{
                  width: "80px",
                  background: isDark ? "#2d2d2d" : "white",
                  color: isDark ? "white" : "black",
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  // ====================================================================
  // RENDER
  // ====================================================================
  return (
    <Page>
      <div style={{ padding: "10px 10px 180px 10px" }}>
        {/* Неоновая метка сети — раньше здесь был большой Banner на всю
            ширину с тем же самым фактом (mainnet/testnet), который занимал
            место, но не несёт действия. */}
        <div
          style={{
            position: "fixed",
            top: "64px",
            left: "20px",
            zIndex: 850,
            padding: "3px 10px",
            borderRadius: "8px",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            fontFamily: "monospace",
            pointerEvents: "none",
            color: isDark ? "#FFD700" : "#3B82F6",
            textShadow: isDark
              ? "0 0 6px rgba(255, 215, 0, 0.8), 0 0 12px rgba(255, 215, 0, 0.4)"
              : "0 0 6px rgba(59, 130, 246, 0.6), 0 0 12px rgba(59, 130, 246, 0.3)",
          }}
        >
          {isTestnet ? "Testnet" : "Mainnet"}
        </div>

        {/* ModeTabs */}
        <ModeTabs
          mode={mode}
          onModeChange={handleModeChange}
          onTabChange={handleTabChange}
          nftsCount={mode === "other" ? allNfts.length : 0}
          zonesCount={mode === "service" ? zones.length : 0}
          subdomainsCount={mode === "service" ? subdomains.length : 0}
        />

        {/* Any tab */}
        {selectedCollection === "any" && (
          <div
            style={{
              marginBottom: "15px",
              padding: "15px",
              background: isDark ? "#2d2d2d" : "#f5f5f5",
              borderRadius: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isDark ? "white" : "black"}
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: isDark ? "white" : "black",
                }}
              >
                {t("manualAddressInput")}
              </span>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <Input
                placeholder={t("enterNFTOrCollectionAddress")}
                value={manualCollectionAddress}
                onChange={(e) => setManualCollectionAddress(e.target.value)}
                style={{
                  flex: 1,
                  background: isDark ? "#3d3d3d" : "white",
                  color: isDark ? "white" : "black",
                }}
              />
              <Button
                onClick={handleAnyTabSubmit}
                loading={checkingResolver}
                style={{
                  padding: "10px 20px",
                  background: "#4CAF50",
                  color: "white",
                }}
              >
                {t("check")}
              </Button>
            </div>
            <div
              style={{
                marginTop: "10px",
                fontSize: "12px",
                color: isDark ? "#aaaaaa" : "#666666",
              }}
            >
              {t("addressHint")}
            </div>
          </div>
        )}

        {/* Search & Filter */}
        {selectedCollection !== "any" && allFilteredItems.length > 0 && (
          <SearchAndFilterSection />
        )}

        {/* ====== ЛОАДЕР (объединённый) ====== */}
        {isLoading && (
          <ScanProgressLoader
            label={loadingText || t("loadingSubdomains")}
            percent={blockchainScanUi.percent}
            statusText={blockchainScanUi.statusText}
            textColor={isDark ? "white" : "#666"}
          />
        )}

        {/* ====== СПИСОК ====== */}
        {!isLoading && displayItems.length > 0 && (
          <List style={{ background: "transparent", marginBottom: "120px" }}>
            {/* {displayItems.map((item: DisplayItem) => (
              <div
                key={item.id}
                style={{
                  marginBottom: "8px",
                  background: isDark ? "#2d2d2d" : "white",
                  borderRadius: "12px",
                  cursor: "pointer",
                  overflow: "hidden",
                  border: `1px solid ${isDark ? "#444" : "#e0e0e0"}`,
                  transition: "all 0.2s ease",
                  padding: "12px",
                }}
              >
                <div style={{ paddingBottom: "12px" }}>
                  <img
                    src={getItemImageUrl(item)}
                    alt={item.title}
                    style={{
                      width: "100%",
                      height: "200px",
                      objectFit: "contain",
                      borderRadius: "8px",
                      background: isDark ? "#1a1a1a" : "#f9f9f9",
                    }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = searchDog;
                    }}
                  />
                </div>

                <div style={{ paddingBottom: "12px" }}>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: isDark ? "white" : "black",
                      marginBottom: "6px",
                    }}
                  >
                    <span
                      style={{
                        color: isDark ? "#aaaaaa" : "#888",
                        fontWeight: "400",
                      }}
                    >
                      Site:{" "}
                    </span>
                    <a
                      href={`tonsite://${item.title}`}
                      style={{
                        color: isDark ? "#4CAF50" : "#4CAF50",
                        textDecoration: "none",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.title}
                    </a>
                  </div>

                  <div
                    style={{
                      fontSize: "12px",
                      color: isDark ? "#aaaaaa" : "#666666",
                      marginBottom: "6px",
                    }}
                  >
                    <span style={{ fontWeight: "400" }}>Address: </span>
                    <a
                      href={createTonViewerLink(item.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: isDark ? "#64B5F6" : "#1976D2",
                        textDecoration: "none",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.address}
                    </a>
                  </div>

                  {item.isZone && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: isDark ? "#aaaaaa" : "#666666",
                        marginBottom: "8px",
                      }}
                    >
                      {item.proxy === 0 ? t("sbtZone") : t("proxyZone")} ·{" "}
                      {item.subdomainsAmount || 0} {t("subdomains")}
                    </div>
                  )}
                  {item.isSubdomain && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: isDark ? "#aaaaaa" : "#666666",
                        marginBottom: "8px",
                      }}
                    >
                      {t("subdomainLabel")} ·{" "}
                      {item.mintPrice ? `${item.mintPrice} TON` : "Free"}
                    </div>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleItemClick(item);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "#4CAF50",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                >
                  {t("choose")}
                </button>
              </div>
            ))} */}

            {displayItems.map((item: DisplayItem) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                style={{
                  marginBottom: "8px",
                  background: isDark ? "#2d2d2d" : "white",
                  borderRadius: "12px",
                  cursor: "pointer",
                  overflow: "hidden",
                  border: `1px solid ${isDark ? "#444" : "#e0e0e0"}`,
                  transition: "all 0.2s ease",
                  padding: "12px",
                  display: "flex",
                  gap: "12px",
                  alignItems: "stretch",
                }}
              >
                {/* Колонка 1: картинка 140×140 */}
                <div
                  style={{
                    position: "relative",
                    width: "140px",
                    height: "140px",
                    flexShrink: 0,
                    borderRadius: "8px",
                    overflow: "hidden",
                    background: isDark ? "#1a1a1a" : "#f9f9f9",
                  }}
                >
                  <img
                    src={getItemImageUrl(item)}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      opacity: item.isInactiveDuplicate ? 0.5 : 1,
                    }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = searchDog;
                    }}
                  />
                  {item.isInactiveDuplicate && (
                    <div
                      style={{
                        position: "absolute",
                        top: "6px",
                        left: "6px",
                        background: "#e53935",
                        color: "white",
                        fontSize: "10px",
                        fontWeight: "700",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        letterSpacing: "0.5px",
                      }}
                    >
                      INACTIVE
                    </div>
                  )}
                  <LupaButton
                    domain={item.title}
                    address={item.address}
                    isTestnet={isTestnet}
                    size={32}
                    offset={4}
                    corner="bottom-right"
                    siteResolves={item.siteResolves}
                  />
                </div>
                {/* Колонка 2: текст + кнопка */}
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  {/* Текстовый блок */}
                  <div>
                    {/* Site: ссылка */}
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: isDark ? "white" : "black",
                        marginBottom: "6px",
                        wordBreak: "break-word",
                      }}
                    >
                      <span
                        style={{
                          color: isDark ? "#aaaaaa" : "#888",
                          fontWeight: "400",
                        }}
                      >
                        Site:{" "}
                      </span>
                      <a
                        href={`/#/manage?address=${item.address}`}
                        style={{
                          color: isDark ? "#4CAF50" : "#4CAF50",
                          textDecoration: "none",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.title}
                      </a>
                    </div>

                    {/* Tonviewer: адрес с shorten */}
                    <div
                      style={{
                        fontSize: "12px",
                        color: isDark ? "#aaaaaa" : "#666666",
                        marginBottom: "6px",
                        wordBreak: "break-all",
                      }}
                    >
                      <span style={{ fontWeight: "400" }}>Address: </span>
                      <a
                        href={`${
                          isTestnet
                            ? "https://testnet.tonviewer.com"
                            : "https://tonviewer.com"
                        }/${item.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: isDark ? "#64B5F6" : "#1976D2",
                          textDecoration: "none",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {shortenAddress(item.address)}
                      </a>
                    </div>

                    {item.isZone && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: isDark ? "#aaaaaa" : "#666666",
                          marginBottom: "6px",
                        }}
                      >
                        {item.proxy === 0 ? t("sbtZone") : t("proxyZone")} ·{" "}
                        {item.subdomainsAmount || 0} {t("subdomains")}
                      </div>
                    )}
                    {item.isSubdomain && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: isDark ? "#aaaaaa" : "#666666",
                          marginBottom: "6px",
                        }}
                      >
                        {t("subdomainLabel")} ·{" "}
                        {item.mintPrice ? `${item.mintPrice} TON` : "Free"}
                      </div>
                    )}
                  </div>

                  {/* Кнопка */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleItemClick(item);
                    }}
                    style={{
                      width: "100%",
                      padding: "10px",
                      background: "#4CAF50",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      marginTop: "8px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "0.9";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                  >
                    {t("choose")}
                  </button>
                </div>
              </div>
            ))}

            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "8px",
                  padding: "16px 0",
                }}
              >
                <button
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    border: "none",
                    background:
                      currentPage === 0
                        ? "transparent"
                        : isDark
                        ? "#3d3d3d"
                        : "#e0e0e0",
                    color:
                      currentPage === 0
                        ? isDark
                          ? "#555"
                          : "#ccc"
                        : isDark
                        ? "white"
                        : "black",
                    fontSize: "18px",
                    cursor: currentPage === 0 ? "default" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                  }}
                >
                  ‹
                </button>

                {getVisiblePageNumbers(totalPages, currentPage).map((page, idx) =>
                  page === "ellipsis" ? (
                    <span
                      key={`ellipsis-${idx}`}
                      style={{
                        color: isDark ? "#777" : "#aaa",
                        fontSize: "12px",
                        width: "10px",
                        textAlign: "center",
                      }}
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      style={{
                        width: page === currentPage ? "14px" : "10px",
                        height: page === currentPage ? "14px" : "10px",
                        borderRadius: "50%",
                        border: "none",
                        background:
                          page === currentPage
                            ? "#4CAF50"
                            : isDark
                            ? "#555"
                            : "#ccc",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        padding: 0,
                        flexShrink: 0,
                      }}
                      aria-label={`Страница ${page + 1}`}
                    />
                  )
                )}

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={currentPage === totalPages - 1}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    border: "none",
                    background:
                      currentPage === totalPages - 1
                        ? "transparent"
                        : isDark
                        ? "#3d3d3d"
                        : "#e0e0e0",
                    color:
                      currentPage === totalPages - 1
                        ? isDark
                          ? "#555"
                          : "#ccc"
                        : isDark
                        ? "white"
                        : "black",
                    fontSize: "18px",
                    cursor:
                      currentPage === totalPages - 1 ? "default" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                  }}
                >
                  ›
                </button>
              </div>
            )}

            <div
              style={{
                textAlign: "center",
                fontSize: "12px",
                color: isDark ? "#aaaaaa" : "#666666",
                marginTop: "4px",
                marginBottom: "8px",
              }}
            >
              {t("page") || "Стр."} {currentPage + 1} / {totalPages} ·{" "}
              {allFilteredItems.length} {t("items") || "элементов"}
            </div>
          </List>
        )}

        {/* ====== PLACEHOLDER (нет элементов) ====== */}
        {!isLoading &&
          displayItems.length === 0 &&
          selectedCollection !== "any" && (
            <Placeholder
              header={t("noElements")}
              description={t("noElementsDescription")}
              style={{ margin: "40px 20px", color: isDark ? "white" : "#666" }}
            >
              <Image
                src={searchDog}
                style={{ width: "100px", height: "100px", margin: "0 auto" }}
              />
            </Placeholder>
          )}

        {/* ====== INFO BLOCK ====== */}
        {showInfoBlock && editingItem && (
          <div
            ref={infoBlockRef}
            style={{
              marginTop: "20px",
              padding: "15px",
              background: isDark ? "#2d2d2d" : "#f5f5f5",
              borderRadius: "12px",
              marginBottom: "120px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "15px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <Image
                  src={getItemImageUrl(editingItem)}
                  style={{
                    width: "120px",
                    height: "120px",
                    borderRadius: "8px",
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: "600",
                      color: isDark ? "white" : "black",
                    }}
                  >
                    {editingItem.title}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: isDark ? "#aaaaaa" : "#666666",
                    }}
                  >
                    {shortenAddress(editingItem.address)}
                  </div>
                </div>
              </div>
              <Button
                size="s"
                onClick={handleManageClick}
                style={{
                  padding: "8px 16px",
                  background: "#4CAF50",
                  color: "white",
                }}
              >
                {t("manage")}
              </Button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "10px",
                marginBottom: "15px",
              }}
            >
              {editingItem.isZone && (
                <>
                  <div
                    style={{
                      padding: "10px",
                      background: isDark ? "#3d3d3d" : "#e8e8e8",
                      borderRadius: "8px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        color: isDark ? "#aaaaaa" : "#666666",
                        marginBottom: "4px",
                      }}
                    >
                      {t("typeFilter")}
                    </div>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: isDark ? "white" : "black",
                      }}
                    >
                      {editingItem.proxy === 0 ? t("sbtZone") : t("proxyZone")}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "10px",
                      background: isDark ? "#3d3d3d" : "#e8e8e8",
                      borderRadius: "8px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        color: isDark ? "#aaaaaa" : "#666666",
                        marginBottom: "4px",
                      }}
                    >
                      {t("subdomains")}
                    </div>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: isDark ? "white" : "black",
                      }}
                    >
                      {editingItem.subdomainsAmount || 0}
                    </div>
                  </div>
                </>
              )}
              {editingItem.isSubdomain && (
                <>
                  <div
                    style={{
                      padding: "10px",
                      background: isDark ? "#3d3d3d" : "#e8e8e8",
                      borderRadius: "8px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        color: isDark ? "#aaaaaa" : "#666666",
                        marginBottom: "4px",
                      }}
                    >
                      {t("price")}
                    </div>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: isDark ? "white" : "black",
                      }}
                    >
                      {editingItem.mintPrice
                        ? `${editingItem.mintPrice} TON`
                        : "Free"}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "10px",
                      background: isDark ? "#3d3d3d" : "#e8e8e8",
                      borderRadius: "8px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        color: isDark ? "#aaaaaa" : "#666666",
                        marginBottom: "4px",
                      }}
                    >
                      {t("status")}
                    </div>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: isDark ? "white" : "black",
                      }}
                    >
                      {editingItem.status || t("unknown")}
                    </div>
                  </div>
                </>
              )}
              {mode === "other" && editingItem.collection && (
                <div
                  style={{
                    padding: "10px",
                    background: isDark ? "#3d3d3d" : "#e8e8e8",
                    borderRadius: "8px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      color: isDark ? "#aaaaaa" : "#666666",
                      marginBottom: "4px",
                    }}
                  >
                    {t("collection")}
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: isDark ? "white" : "black",
                    }}
                  >
                    {editingItem.collection.name || t("unknown")}
                  </div>
                </div>
              )}
            </div>

            {mode === "service" && editingItem && (
              <div style={{ marginTop: "15px" }}>
                <DomainExpirationInfo
                  domainName={editingItem.name || editingItem.title}
                  isTestnet={isTestnet}
                />
                <Button
                  onClick={handleRenewDomain}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "#2196F3",
                    color: "white",
                    marginTop: "10px",
                  }}
                >
                  {t("renew")} ({t("renewPrice")})
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ====== DNS BLOCK ====== */}
        {showDNSBlock && isVerified && (
          <div
            ref={dnsBlockRef}
            style={{
              marginTop: "20px",
              padding: "15px",
              background: isDark ? "#2d2d2d" : "#f5f5f5",
              borderRadius: "12px",
              marginBottom: "120px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "15px",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isDark ? "white" : "black"}
                strokeWidth="2"
              >
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
              </svg>
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  color: isDark ? "white" : "black",
                }}
              >
                {t("manageDNSRecords") || "Управление DNS записями"}
              </span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <div
                style={{
                  fontSize: "12px",
                  color: isDark ? "#aaaaaa" : "#666666",
                  marginBottom: "5px",
                }}
              >
                {t("addressForManage")}:
              </div>
              <Input
                value={resolverAddress}
                onChange={(e) => setResolverAddress(e.target.value)}
                style={{
                  background: isDark ? "#3d3d3d" : "white",
                  color: isDark ? "white" : "black",
                }}
              />
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "15px" }}
            >
              <div
                style={
                  tutorial.active && !tutorial.isStepDone('domain_answered')
                    ? {
                        border: `2px solid ${isDark ? '#FFD700' : '#3B82F6'}`,
                        borderRadius: '10px',
                        padding: '10px',
                        margin: '-10px',
                      }
                    : undefined
                }
              >
                <div style={{ marginBottom: "8px" }}>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: isDark ? "white" : "black",
                    }}
                  >
                    {t("walletAddress")}
                  </span>
                </div>
                <Input
                  placeholder={
                    t("addressPlaceholder") || "Введите адрес кошелька..."
                  }
                  value={formData.walletAddress}
                  onChange={(e) =>
                    handleInputChange("walletAddress", e.target.value)
                  }
                  style={{
                    background: isDark ? "#3d3d3d" : "white",
                    color: isDark ? "white" : "black",
                  }}
                />
                {tutorial.active && !tutorial.isStepDone('domain_answered') && (
                  <TutorialTooltip
                    blockLabel={t('tutorialBlock1Label') || 'Блок 1'}
                    stepLabel={t('tutorialStep2Label') || 'Шаг 2'}
                    text={t('tutorialDomainBindHint') || 'Привяжите адрес своего кошелька к домену и нажмите «Сохранить» — это подтвердит, что домен ваш.'}
                    buttons={[]}
                    style={{ position: 'static', marginTop: '8px' }}
                  />
                )}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: "8px",
                  }}
                >
                  <Button
                    size="s"
                    onClick={handleSaveWalletAddress}
                    loading={dnsOperationLoading}
                    style={{
                      padding: "6px 12px",
                      fontSize: "12px",
                      background: "#4CAF50",
                      color: "white",
                    }}
                  >
                    {t("save")}
                  </Button>
                </div>
              </div>

              <div>
                <div style={{ marginBottom: "8px" }}>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: isDark ? "white" : "black",
                    }}
                  >
                    {t("tonSites")}
                  </span>
                </div>
                <Input
                  placeholder={t("adnlAddressHex") || "Введите ADNL адрес..."}
                  value={formData.tonSite}
                  onChange={(e) => handleInputChange("tonSite", e.target.value)}
                  style={{
                    background: isDark ? "#3d3d3d" : "white",
                    color: isDark ? "white" : "black",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: "8px",
                  }}
                >
                  <Button
                    size="s"
                    onClick={handleSaveTonSite}
                    loading={dnsOperationLoading}
                    style={{
                      padding: "6px 12px",
                      fontSize: "12px",
                      background: "#4CAF50",
                      color: "white",
                    }}
                  >
                    {t("save")}
                  </Button>
                </div>
              </div>

              <div>
                <div style={{ marginBottom: "8px" }}>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: isDark ? "white" : "black",
                    }}
                  >
                    {t("tonStorage")}
                  </span>
                </div>
                <Input
                  placeholder={t("hex") || "Введите Bag ID..."}
                  value={formData.tonStorage}
                  onChange={(e) =>
                    handleInputChange("tonStorage", e.target.value)
                  }
                  style={{
                    background: isDark ? "#3d3d3d" : "white",
                    color: isDark ? "white" : "black",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: "8px",
                  }}
                >
                  <Button
                    size="s"
                    onClick={handleSaveTonStorage}
                    loading={dnsOperationLoading}
                    style={{
                      padding: "6px 12px",
                      fontSize: "12px",
                      background: "#4CAF50",
                      color: "white",
                    }}
                  >
                    {t("save")}
                  </Button>
                </div>
              </div>

              <div>
                <div style={{ marginBottom: "8px" }}>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: isDark ? "white" : "black",
                    }}
                  >
                    {t("subdomainsNextResolver")}
                  </span>
                </div>
                <Input
                  placeholder={
                    t("addressPlaceholderEQC") || "Введите адрес резолвера..."
                  }
                  value={formData.subdomains}
                  onChange={(e) =>
                    handleInputChange("subdomains", e.target.value)
                  }
                  style={{
                    background: isDark ? "#3d3d3d" : "white",
                    color: isDark ? "white" : "black",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: "8px",
                  }}
                >
                  <Button
                    size="s"
                    onClick={handleSaveSubdomains}
                    loading={dnsOperationLoading}
                    style={{
                      padding: "6px 12px",
                      fontSize: "12px",
                      background: "#4CAF50",
                      color: "white",
                    }}
                  >
                    {t("save")}
                  </Button>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: "15px",
                padding: "10px",
                background: isDark ? "#3d3d3d" : "#e8e8e8",
                borderRadius: "8px",
                fontSize: "12px",
                color: isDark ? "#aaaaaa" : "#666666",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  marginBottom: "5px",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span>{t("info")}</span>
              </div>
              <div>
                · Изменения вступят в силу после подтверждения транзакции
              </div>
              <div>
                · Для удаления записи очистите поле и нажмите "{t("save")}"
              </div>
            </div>
          </div>
        )}

        {snackbar}
      </div>
    </Page>
  );
};

export default ManageDomainPage;
