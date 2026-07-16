// src/pages/ManageDomainPage/ManageDomainPage.tsx с фильтром
import { FC, useState, useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector } from 'react-redux';
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
  resetNetworkState
} from '../../store/nft/actions';

import { getNFTCollections, CollectionKey } from '../../store/nft/constants';
import { RootState } from '../../store/rootReducer';

import {
  Banner,
  Button,
  Cell,
  Image,
  Input,
  List,
  Placeholder,
} from "@telegram-apps/telegram-ui";

import { Page } from "@/components/Page";
import { ShowSnackbar } from "@/components/ShowSnackbar";
import { useTonAPI } from "@/hooks/useTonAPI";
import { shortenAddress } from "@/utils/address";
import { AppDispatch } from "@/store/store";

import searchDog from '/src/pages/ManageDomainPage/img/searchDog.gif';

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
} from '../../store/dns/dnsRecordsSlice';

import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { convertRawToUserFriendlyTest } from "@/utils/tonUtils";
import { apiService } from "@/services/api";

import { DomainExpirationInfo } from '@/utils/domainExpiredAtFetchConvert';

// Интерфейсы
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
}

export const ManageDomainPage: FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();
  const location = useLocation();
  
  const { t } = useLanguage();
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';

  const API_PAYLOAD_URL=import.meta.env.VITE_API_SC_PAYLOAD_URL;

  const isTestnet = wallet?.account?.chain === "-3";
  
  // Redux state
  const nftState = useSelector((state: RootState) => state.nft);
    
  // Используем вашу структуру данных
  const allNfts = isTestnet ? nftState.testnet.allNfts : nftState.mainnet.allNfts;
  const filteredItems = isTestnet ? nftState.testnet.filteredItems : nftState.mainnet.filteredItems;
  const selectedCollection = isTestnet ? nftState.testnet.selectedCollection : nftState.mainnet.selectedCollection;
  const zones = isTestnet ? nftState.testnet.zones : nftState.mainnet.zones;
  const subdomains = isTestnet ? nftState.testnet.subdomains : nftState.mainnet.subdomains;
  
  const isLoading = nftState.loading || false;
  
  const dnsState = useSelector((state: RootState) => state.dnsRecords);
  const dnsLoading = dnsState?.loading || false;
  const dnsOperationLoading = dnsState?.operationLoading || false;
  const parsedRecords = dnsState?.parsedRecords || {};
  const currentDomain = dnsState?.currentDomain || null;

  const { getNftItem, getNftCollection } = useTonAPI(isTestnet);

  // Local state
  const [snackbar, setSnackbar] = useState<JSX.Element | null>(null);
  const [resolverAddress, setResolverAddress] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [checkingResolver, setCheckingResolver] = useState(false);
  const [isAutoCheckTriggered, setIsAutoCheckTriggered] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [mode, setMode] = useState<'other' | 'service'>('service');
  const [manualCollectionAddress, setManualCollectionAddress] = useState("");
  const [showInfoBlock, setShowInfoBlock] = useState(false);
  const [showDNSBlock, setShowDNSBlock] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [minLength, setMinLength] = useState<number>(0);
  const [maxLength, setMaxLength] = useState<number>(100);

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

  // Refs
  const infoBlockRef = useRef<HTMLDivElement>(null);
  const dnsBlockRef = useRef<HTMLDivElement>(null);
  const hasLoadedData = useRef(false);
  const prevMode = useRef(mode);
  const prevSelectedCollection = useRef(selectedCollection);
  const prevIsTestnet = useRef(isTestnet);

  // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
  const showSnackbar = (message: string, type: "success" | "error" | "sent" = "success") => {
    setSnackbar(<ShowSnackbar message={message} type={type} onClose={() => setSnackbar(null)} />);
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // ========== Функция для получения URL изображения ==========
  const getItemImageUrl = (item: DisplayItem): string => {
    if (item.isZone) {
      const zone = item.zoneData || item;
      const zoneName = zone.name?.replace('.ton', '') || '';
      
      if (zone.proxy === 0) {
        return `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${zoneName}.png`;
      } else {
        return `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${zoneName}.png`;
      }
    }
    
    if (item.isSubdomain) {
      const subdomain = item.subdomainData || item;
      const fullName = subdomain.name || '';
      const isProxy = item.status === 'claimed' ? true : false;
      
      const parts = fullName.split('.');
      if (parts.length >= 3) {
        const subdomainName = parts[0];
        const domainName = parts.slice(1).join('.');
        const cleanDomainName = domainName.replace('.ton', '');
        
        const zone = subdomain.zone || item.zoneData;
        console.log(`Структура зоны для getImgUrl для субдомена: ${subdomainName}.${cleanDomainName}.ton = ${JSON.stringify(zone)}, статус из перменной isProxy = ${isProxy}`);
  
        if (isProxy) {
          return `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${cleanDomainName}/${subdomainName}.png`;
          
        } else {
          return `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${cleanDomainName}/${subdomainName}.png`;
        }
      }
    }
    
    if (item.previews?.[1]?.url) {
      return item.previews[1].url;
    }
    
    if (item.metadata?.image) {
      return item.metadata.image;
    }
    
    return searchDog;
  };

  // ========== Очистка формы ==========
  const resetFormData = () => {
    const emptyForm: FormData = {
      tonSite: "",
      isChecked: false,
      tonStorage: "",
      walletAddress: "",
      subdomains: "",
    };
    setFormData(emptyForm);
    setOriginalFormData(emptyForm);
  };

  // ========== Эффект 1: Загрузка данных при подключении кошелька и смене режима ==========
  useEffect(() => {
    if (!wallet?.account?.address) {
      console.log('⚠️ Кошелек не подключен');
      return;
    }

    const cleanAddress = wallet.account.address.startsWith('0x') 
      ? wallet.account.address.slice(2) 
      : wallet.account.address;

    console.log('📡 Проверка загрузки данных:', {
      mode,
      isTestnet,
      walletAddress: cleanAddress,
      hasLoadedData: hasLoadedData.current,
      selectedCollection
    });

    // Всегда сбрасываем данные при смене режима
    if (prevMode.current !== mode) {
      console.log('🔄 Смена режима, сбрасываем данные');
      hasLoadedData.current = false;
      prevMode.current = mode;
      dispatch(resetNetworkState(isTestnet));
    }

    if (!hasLoadedData.current) {
      console.log('📥 Начинаем загрузку данных для режима:', mode);
      hasLoadedData.current = true;
      
      if (mode === 'other') {
        console.log('📥 Загружаем NFT...');
        dispatch(fetchNfts({ walletAddress: cleanAddress, isTestnet }));
      } else {
        console.log('📥 Загружаем зоны и субдомены...');

        let userAddressForDB = cleanAddress;
      
      if (isTestnet) {
        userAddressForDB = convertRawToUserFriendlyTest(cleanAddress);
        
        // Если функции нет, используем raw адрес (но это может быть проблемой)
        console.log('⚠️ Для testnet может потребоваться преобразование адреса');
      }
      
      console.log('📥 Загружаем зоны для адреса:', userAddressForDB);
      console.log('📥 Загружаем субдомены для адреса:', userAddressForDB);

        dispatch(fetchZonesFromDB({ userAddress: userAddressForDB, isTestnet }));
        dispatch(fetchSubdomainsFromDB({ userAddress: userAddressForDB, isTestnet }));
      }
    }
  }, [dispatch, wallet, isTestnet, mode, selectedCollection]);

  // ========== Эффект 2: Фильтрация данных при изменении коллекции или данных ==========
  useEffect(() => {
    if (prevSelectedCollection.current !== selectedCollection || 
        prevIsTestnet.current !== isTestnet) {
      
      console.log('🔄 Обновление фильтрации:', {
        selectedCollection,
        isTestnet,
        allNftsLength: allNfts.length,
        zonesLength: zones.length,
        subdomainsLength: subdomains.length
      });
      
      // Фильтруем данные в зависимости от режима и коллекции
      if (mode === 'other') {
        // Для NFT режима
        if (allNfts.length > 0 && selectedCollection !== 'any') {
          dispatch(filterNftsByCollection({ 
            nfts: allNfts,
            collectionKey: selectedCollection as CollectionKey, 
            isTestnet 
          }));
        }
      }
      
      // Обновляем refs
      prevSelectedCollection.current = selectedCollection;
      prevIsTestnet.current = isTestnet;
    }
  }, [dispatch, mode, selectedCollection, isTestnet, allNfts, zones, subdomains]);


  // ========== Эффект 4: Обработка параметра адреса из URL ==========
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const address = params.get("address");
    if (address) {
      try {
        setResolverAddress(Address.parse(address).toString());
        setIsAutoCheckTriggered(true);
      } catch (error) {
        console.error("Invalid address from URL:", error);
      }
    }
  }, [location]);

  // ========== Эффект 5: Автоматическая проверка адреса из URL ==========
  useEffect(() => {
    if (isAutoCheckTriggered && resolverAddress) {
      handleCheckResolverAddress();
      setIsAutoCheckTriggered(false);
    }
  }, [resolverAddress, isAutoCheckTriggered]);

  // ========== Эффект 6: Обновление формы при получении DNS записей ==========
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
      
      console.log('📝 Обновляем форму с DNS записями:', newFormData);
      setFormData(newFormData);
      setOriginalFormData(newFormData);
    }
  }, [currentDomain, parsedRecords, editingItem]);

  // ========== Функция проверки resolver address ==========
  const handleCheckResolverAddress = async () => {
    try {
      if (!resolverAddress) {
        showSnackbar(t('addressPlaceholder'), "error");
        return;
      }

      setCheckingResolver(true);
      
      // Проверяем, является ли это валидным адресом
      const address = Address.parse(resolverAddress).toString();
      
      // Для режима Other проверяем NFT
      if (mode === 'other') {
        const nftInfo = await getNftItem(address);
        if (nftInfo) {
          setIsVerified(true);
          showSnackbar(t('nftVerifiedSuccessfully'), "success");
        } else {
          showSnackbar(t('nftNotFound'), "error");
        }
      } else {
        // Для режима Service проверяем зону или субдомен
        setIsVerified(true);
        showSnackbar(t('itemVerifiedSuccessfully'), "success");
      }
    } catch (error: any) {
      console.error("Error checking resolver address:", error);
      showSnackbar(error.message || "Ошибка проверки адреса", "error");
    } finally {
      setCheckingResolver(false);
    }
  };

  // ========== Обработчик клика на итем ==========
  const handleItemClick = useCallback(async (item: any) => {
    console.log('🔍 Клик на итем:', item);
    
    resetFormData();
    setShowInfoBlock(true);
    setShowDNSBlock(false);
    setEditingItem(item);
    
    // Для режима Other запускаем проверку NFT
    if (mode === 'other') {
      try {
        const nftInfo = await getNftItem(item.address);
        if (nftInfo) {
          console.log('✅ NFT найден:', nftInfo);
          
          // Получаем DNS имя
          const dnsName = item.dns || item.metadata?.name || item.title;
          if (dnsName) {
            // Загружаем DNS записи для t.me и .ton коллекций
            if (selectedCollection === 'tme' || selectedCollection === 'ton') {
               if (isTestnet){
                 dispatch(fetchTestnetDNSRecords(dnsName));
               } else {
                 dispatch(fetchDNSRecords(dnsName));
               }
              // dispatch(fetchDNSRecords(dnsName));
            }
          }
        }
      } catch (error) {
        console.error('❌ Ошибка проверки NFT:', error);
      }
    }
    
    // Автоскролл к информационному блоку
    setTimeout(() => {
      infoBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, [mode, getNftItem, selectedCollection, dispatch]);

  // ========== Обработчик кнопки "Управлять" ==========
const handleManageClick = useCallback(async () => {
  if (!editingItem) return;
  
  setShowDNSBlock(true);
  
  // Устанавливаем адрес для редактирования
  let itemAddress = '';
  
  if (mode === 'other') {
    itemAddress = editingItem.address;
  } else {
    if (editingItem.isZone) {
      // Проверяем, является ли это proxy зоной (proxy === 1)
      // ВАЖНО: editingItem.proxy может быть строкой или числом
      const proxyValue = editingItem.proxy;
      const isProxyZone = proxyValue === 1 || proxyValue === '1';
      
      if (isProxyZone) {
        // Если есть wrapperAddress - используем его
        if (editingItem.wrapperAddress) {
          itemAddress = editingItem.wrapperAddress;
        } else {
          // Получаем адрес владельца NFT через TON API
          try {
            const baseTONApiUri = isTestnet ? 'testnet.tonapi.io' : 'tonapi.io';
            const response = await fetch(`https://${baseTONApiUri}/v2/nfts/${editingItem.address}`);
            
            if (!response.ok) {
              throw new Error(`TON API error: ${response.status}`);
            }
            
            const nftData = await response.json();
            
            if (nftData.owner?.address) {
              itemAddress = nftData.owner.address;
              console.log(`Для прокси зоны с доменом ${editingItem.name} и адрессом домена ${editingItem.address} - адрес NFT Wrapper найден: ${itemAddress}`);
              
              // Сохраняем wrapperAddress в базу данных
              try {
                await apiService.updateZoneWrapper(editingItem.name, itemAddress);
                console.log(`✅ Wrapper адрес сохранен для зоны ${editingItem.name}: ${itemAddress}`);
              } catch (error) {
                console.error("❌ Ошибка сохранения wrapper адреса:", error);
                // Не прерываем выполнение, просто логируем ошибку
              }
            } else {
              throw new Error("Не удалось получить адрес владельца NFT");
            }
          } catch (error) {
            console.error("❌ Ошибка получения адреса владельца:", error);
            // В случае ошибки используем оригинальный адрес
            itemAddress = editingItem.address;
            showSnackbar("Не удалось получить адрес враппера, используем оригинальный адрес", "error");
          }
        }
      } else {
        // Для не-proxy зон используем оригинальный адрес
        itemAddress = editingItem.address;
      }
    } else {
      // Для субдоменов используем оригинальный адрес
      itemAddress = editingItem.address;
    }
  }
  
  setResolverAddress(itemAddress);
  setIsVerified(true);

   // Загружаем DNS записи ТОЛЬКО если их еще нет
  const itemName = mode === 'other' 
    ? editingItem.dns || editingItem.metadata?.name || editingItem.title
    : editingItem.name || editingItem.title;
  
  // Проверяем, не загружены ли уже записи для этого домена
  const hasRecords = currentDomain === itemName && Object.keys(parsedRecords).length > 0;
  
  if (itemName && !dnsLoading && !hasRecords) {
    console.log('📡 Загружаем DNS записи для:', itemName);
    if (isTestnet) {
      dispatch(fetchTestnetDNSRecords(itemName));
    } else {
      dispatch(fetchDNSRecords(itemName));
    }
  } else if (hasRecords) {
    console.log('✅ DNS записи уже загружены для:', itemName);
  }
  
  // Автоскролл к блоку DNS записей
  setTimeout(() => {
    dnsBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}, [editingItem, mode, isTestnet, dispatch, showSnackbar]);

  // ========== Обработчик для таба "Any" ==========
  const handleAnyTabSubmit = async () => {
    if (!manualCollectionAddress) {
      showSnackbar(t('pleaseEnterDomainName'), "error");
      return;
    }
    
    try {
      setCheckingResolver(true);
      
      // Проверяем, является ли это валидным адресом
      const address = Address.parse(manualCollectionAddress).toString();
      
      // Пытаемся получить информацию об NFT
      let nftInfo = await getNftItem(address);
      if (!nftInfo || nftInfo.title === "") {
        nftInfo = await getNftCollection(address);
      }
      
      if (nftInfo && nftInfo.title) {
        // Создаем временный итем для отображения
        const tempItem = {
          id: `any_${Date.now()}`,
          title: nftInfo.title,
          address: address,
          metadata: nftInfo,
          previews: nftInfo.image ? [{ url: nftInfo.image }] : []
        };
        
        setEditingItem(tempItem);
        setShowInfoBlock(true);
        setShowDNSBlock(false);
        
        // Автоскролл
        setTimeout(() => {
          infoBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
        
        showSnackbar(t('itemFoundSuccessfully'), "success");
      } else {
        showSnackbar(t('itemNotFound'), "error");
      }
    } catch (error: any) {
      console.error("Error checking address:", error);
      showSnackbar(error.message || "Ошибка проверки адреса", "error");
    } finally {
      setCheckingResolver(false);
    }
  };

  // ========== Функции для работы с DNS записями ==========
  const handleSaveWalletAddress = async () => {
    try {
      if (!resolverAddress) throw new Error(t('addressPlaceholder'));
      if (!tonConnectUI) throw new Error(t('walletNotConnected'));

      if (formData.walletAddress && formData.walletAddress !== originalFormData.walletAddress) {
        const result = await dispatch(setWalletRecord({
          dnsItemAddress: resolverAddress,
          userWalletAddress: formData.walletAddress,
          tonConnectUI: tonConnectUI,
        }));

        if (result.payload) {
          showSnackbar(t('walletAddress') + ' ' + t('proxyDeployedSuccessfully'), "success");
          setOriginalFormData({ ...formData });
        }
      } else if (!formData.walletAddress && originalFormData.walletAddress) {
        const result = await dispatch(deleteWalletRecord({
          dnsItemAddress: resolverAddress,
          tonConnectUI: tonConnectUI,
        }));

        if (result.payload) {
          showSnackbar(t('walletAddress') + ' ' + t('transactionNotConfirmed'), "success");
          setOriginalFormData({ ...formData });
        }
      }
    } catch (error: any) {
      console.error(error);
      showSnackbar(error.message, "error");
    }
  };

  const handleSaveTonSite = async () => {
    try {
      if (!resolverAddress) throw new Error(t('addressPlaceholder'));
      if (!tonConnectUI) throw new Error(t('walletNotConnected'));

      if (formData.tonSite && formData.tonSite !== originalFormData.tonSite) {
        const result = await dispatch(setSiteRecord({
          dnsItemAddress: resolverAddress,
          adnlAddressHex: formData.tonSite,
          tonConnectUI: tonConnectUI,
        }));

        if (result.payload) {
          showSnackbar(t('tonSites') + ' ' + t('proxyDeployedSuccessfully'), "success");
          setOriginalFormData({ ...formData });
        }
      } else if (!formData.tonSite && originalFormData.tonSite) {
        const result = await dispatch(deleteSiteRecord({
          dnsItemAddress: resolverAddress,
          tonConnectUI: tonConnectUI,
        }));

        if (result.payload) {
          showSnackbar(t('tonSites') + ' ' + t('transactionNotConfirmed'), "success");
          setOriginalFormData({ ...formData });
        }
      }
    } catch (error: any) {
      console.error(error);
      showSnackbar(error.message, "error");
    }
  };

  const handleSaveTonStorage = async () => {
    try {
      if (!resolverAddress) throw new Error(t('addressPlaceholder'));
      if (!tonConnectUI) throw new Error(t('walletNotConnected'));

      if (formData.tonStorage && formData.tonStorage !== originalFormData.tonStorage) {
        const result = await dispatch(setStorageRecord({
          dnsItemAddress: resolverAddress,
          bagIdHex: formData.tonStorage,
          tonConnectUI: tonConnectUI,
        }));

        if (result.payload) {
          showSnackbar(t('tonStorage') + ' ' + t('proxyDeployedSuccessfully'), "success");
          setOriginalFormData({ ...formData });
        }
      } else if (!formData.tonStorage && originalFormData.tonStorage) {
        const result = await dispatch(deleteStorageRecord({
          dnsItemAddress: resolverAddress,
          tonConnectUI: tonConnectUI,
        }));

        if (result.payload) {
          showSnackbar(t('tonStorage') + ' ' + t('transactionNotConfirmed'), "success");
          setOriginalFormData({ ...formData });
        }
      }
    } catch (error: any) {
      console.error(error);
      showSnackbar(error.message, "error");
    }
  };

  const handleSaveSubdomains = async () => {
    try {
      if (!resolverAddress) throw new Error(t('addressPlaceholder'));
      if (!tonConnectUI) throw new Error(t('walletNotConnected'));

      if (formData.subdomains && formData.subdomains !== originalFormData.subdomains) {
        const result = await dispatch(setNextResolverRecord({
          dnsItemAddress: resolverAddress,
          resolverAddress: formData.subdomains,
          tonConnectUI: tonConnectUI,
        }));

        if (result.payload) {
          showSnackbar(t('subdomainsNextResolver') + ' ' + t('proxyDeployedSuccessfully'), "success");
          setOriginalFormData({ ...formData });
        }
      } else if (!formData.subdomains && originalFormData.subdomains) {
        const result = await dispatch(deleteNextResolverRecord({
          dnsItemAddress: resolverAddress,
          tonConnectUI: tonConnectUI,
        }));

        if (result.payload) {
          showSnackbar(t('subdomainsNextResolver') + ' ' + t('transactionNotConfirmed'), "success");
          setOriginalFormData({ ...formData });
        }
      }
    } catch (error: any) {
      console.error(error);
      showSnackbar(error.message, "error");
    }
  };

  // ========== Функция продления домена ==========
const handleRenewDomain = async () => {
  if (!editingItem || !tonConnectUI) {
    showSnackbar(t('walletNotConnected'), "error");
    return;
  }
  
  try {
    let targetAddress = '';
    let domainName = '';
    
    if (mode === 'other') {
      // Для NFT доменов
      targetAddress = editingItem.address;
      domainName = editingItem.dns || editingItem.metadata?.name || editingItem.title;
    } else {
      // Для зон и субдоменов
      if (editingItem.isZone) {
        // Проверяем, является ли это proxy зоной
        const proxyValue = editingItem.proxy;
        const isProxyZone = proxyValue === 1 || proxyValue === '1';
        
        if (isProxyZone) {
          // Если есть wrapperAddress - используем его
          if (editingItem.wrapperAddress) {
            targetAddress = editingItem.wrapperAddress;
          } else {
            // Получаем адрес владельца NFT через TON API
            const baseTONApiUri = isTestnet ? 'testnet.tonapi.io' : 'tonapi.io';
            const response = await fetch(`https://${baseTONApiUri}/v2/nfts/${editingItem.address}`);
            
            if (!response.ok) {
              throw new Error(`TON API error: ${response.status}`);
            }
            
            const nftData = await response.json();
            
            if (nftData.owner?.address) {
              targetAddress = nftData.owner.address;

               console.log(`Для прокси зоны с доменом ${editingItem.name} и адрессом домена ${editingItem.address} - адрес NFT Wrapper найден: ${targetAddress}`);
              
              // Сохраняем wrapperAddress в базу данных
              try {
                await apiService.updateZoneWrapper(editingItem.name, targetAddress);
                console.log(`✅ Wrapper адрес сохранен для зоны ${editingItem.name}: ${targetAddress}`);
              } catch (error) {
                console.error("❌ Ошибка сохранения wrapper адреса:", error);
                // Не прерываем выполнение, просто логируем ошибку
              }
            } else {
              throw new Error("Не удалось получить адрес владельца NFT");
            }
          }
        } else {
          // Для не-proxy зон используем оригинальный адрес
          targetAddress = editingItem.address;
        }
      } else {
        // Для субдоменов используем оригинальный адрес
        targetAddress = editingItem.address;
      }
      
      domainName = editingItem.name || editingItem.title;
    }
    
    if (!targetAddress) {
      showSnackbar("Не удалось определить адрес для продления", "error");
      return;
    }
    
    // Сумма для продления (0.02 TON в нанотонах)
    const amountInNano = 0.05 * 1_000_000_000;

    const userFriendlyAddress = convertRawToUserFriendlyTest(targetAddress);
    console.log(`Адрес враппера для продления: ${userFriendlyAddress}`);
    // Создаем транзакцию
    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 600, // 10 минут
      messages: [
        {
          address: userFriendlyAddress,
          amount: amountInNano.toString(),
        }
      ]
    };
    
    // Отправляем транзакцию
    const result = await tonConnectUI.sendTransaction(transaction);
    
    showSnackbar(`Транзакция на продление домена ${domainName} отправлена`, "success");
    
    // Можно добавить логику проверки статуса транзакции
    console.log('✅ Транзакция отправлена:', result);
    
  } catch (error: any) {
    console.error('❌ Ошибка продления домена:', error);
    showSnackbar(error.message || "Ошибка отправки транзакции", "error");
  }
};

  // ========== Обработчик смены режима ==========
  const handleModeChange = (newMode: 'other' | 'service') => {
    console.log('🔄 Смена режима:', newMode);
    setMode(newMode);
    setShowInfoBlock(false);
    setShowDNSBlock(false);
    setEditingItem(null);
    resetFormData();
    dispatch(resetDNSState());
    
    const defaultCollection = newMode === 'service' ? 'zones' : 'ton';
    console.log('🎯 Устанавливаем коллекцию по умолчанию:', defaultCollection);
    
    // Сбрасываем флаг загрузки данных
    hasLoadedData.current = false;
    
    dispatch(setSelectedCollection({ 
      collectionKey: defaultCollection as CollectionKey, 
      isTestnet 
    }));
  };

  // ========== Обработчик смены таба ==========
  const handleTabChange = useCallback((collectionKey: string) => {
    console.log('🎯 Смена таба:', collectionKey);
    
    dispatch(setSelectedCollection({ 
      collectionKey: collectionKey as CollectionKey, 
      isTestnet 
    }));
    
    setShowInfoBlock(false);
    setShowDNSBlock(false);
    setEditingItem(null);
    dispatch(resetDNSState());
    resetFormData();
    
    // Для таба "any" очищаем поле ручного ввода
    if (collectionKey === 'any') {
      setManualCollectionAddress("");
    }
  }, [dispatch, isTestnet]);

  // ========== Получение отфильтрованных элементов с учетом поиска и фильтров ==========
  const getFilteredItemsForMode = useCallback(() => {
    console.log('🔍 getFilteredItemsForMode вызван:', { 
      mode, 
      selectedCollection, 
      isTestnet,
      allNftsLength: allNfts.length,
      zonesLength: zones.length,
      subdomainsLength: subdomains.length,
      filteredItemsLength: filteredItems.length,
      searchQuery,
      minLength,
      maxLength,
      sortOrder
    });
    
    let items = [];
    
    // Если есть отфильтрованные элементы из Redux, используем их
    if (filteredItems.length > 0 && mode === 'other') {
      items = filteredItems;
    } else if (mode === 'other') {
      // Для режима Other фильтруем NFT по адресам коллекций
      const nftCollections = getNFTCollections(isTestnet);
      const collectionInfo = nftCollections[selectedCollection as keyof typeof nftCollections];
      
      if (!collectionInfo || selectedCollection === 'any') {
        // Для таба "any" показываем пустой массив
        if (selectedCollection === 'any') {
          return [];
        }
        // Для других табов показываем все NFT
        items = allNfts;
      } else {
        // Фильтруем NFT по адресу коллекции
        const collectionAddress = collectionInfo.address;
        items = allNfts.filter((nft: any) => {
          const nftCollectionAddress = nft.collection?.address;
          if (!nftCollectionAddress) return false;
          return nftCollectionAddress.toLowerCase() === collectionAddress.toLowerCase();
        });
      }
    } else {
      // Для режима Service фильтруем зоны и субдомены
      if (selectedCollection === 'zones') {
        // Фильтруем зоны по статусу (только active или claimed)

        if (!Array.isArray(zones)) {
        console.error('❌ zones не является массивом:', zones);
        return [];
      }

        items = zones.filter((zone: any) => {
          const status = zone.status?.toLowerCase();
          const isActive = status === 'active' || status === 'claimed';
          return isActive;
        });
        console.log(`✅ Отфильтровано зон: ${items.length} из ${zones.length}`);
      } else if (selectedCollection === 'subdomains') {
        // Фильтруем субдомены по статусу (только active или claimed)

        if (!Array.isArray(subdomains)) {
        console.error('❌ subdomains не является массивом:', subdomains);
        return [];
      }
        
        items = subdomains.filter((subdomain: any) => {
          const status = subdomain.status?.toLowerCase();
          const isActive = status === 'active' || status === 'claimed';
          return isActive;
        });
        console.log(`✅ Отфильтровано субдоменов: ${items.length} из ${subdomains.length}`);
      } else if (selectedCollection === 'any') {
        return [];
      }
    }
    
    // Применяем поиск по названию
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      items = items.filter((item: any) => {
        const title = item.title || item.dns || item.metadata?.name || item.name || '';
        return title.toLowerCase().includes(query);
      });
    }
    
    // Применяем фильтр по длине
    items = items.filter((item: any) => {
      const title = item.title || item.dns || item.metadata?.name || item.name || '';
      const length = title.length;
      return length >= minLength && length <= maxLength;
    });
    
    // Применяем сортировку
    items.sort((a: any, b: any) => {
      const titleA = a.title || a.dns || a.metadata?.name || a.name || '';
      const titleB = b.title || b.dns || b.metadata?.name || b.name || '';
      
      if (sortOrder === 'asc') {
        return titleA.length - titleB.length;
      } else {
        return titleB.length - titleA.length;
      }
    });
    
  // Преобразуем в формат DisplayItem
  return items.map((item: any, index: number) => {
    if (!item) return null;
    
    return {
      ...item,
      title: item.title || item.dns || item.metadata?.name || item.name || 'Unnamed',
      address: item.address || item.wrapperAddress || `item_${item.id || index}`,
      id: item.id || item.address || `item_${Date.now()}_${index}`,
      isZone: mode === 'service' && selectedCollection === 'zones',
      isSubdomain: mode === 'service' && selectedCollection === 'subdomains'
    };
  }).filter(Boolean); // Удаляем null значения
}, [mode, selectedCollection, isTestnet, allNfts, zones, subdomains, filteredItems, searchQuery, minLength, maxLength, sortOrder]);

  // ========== Компонент поиска и фильтрации ==========
  const SearchAndFilterSection = () => {
    const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
    
    return (
      <div style={{
        background: isDark ? '#2d2d2d' : '#f5f5f5',
        borderRadius: '12px',
        padding: '15px',
        margin: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {/* Заголовок и кнопка расширенного фильтра */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke={isDark ? 'white' : 'black'} 
              strokeWidth="2"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            <span style={{ 
              fontSize: '14px', 
              fontWeight: '600', 
              color: isDark ? 'white' : 'black' 
            }}>
              Поиск и фильтрация
            </span>
          </div>
          
          <Button
            size="s"
            mode="outline"
            onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
            style={{
              padding: '6px 12px',
              fontSize: '12px'
            }}
          >
            {showAdvancedFilter ? 'Скрыть фильтры' : 'Расширенные фильтры'}
          </Button>
        </div>

        {/* Поле поиска */}
        <Input
          placeholder="Поиск по названию..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ 
            background: isDark ? '#3d3d3d' : 'white',
            color: isDark ? 'white' : 'black'
          }}
        />

        {/* Базовые фильтры */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            onClick={() => setSortOrder('asc')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              background: sortOrder === 'asc' ? (isDark ? '#4CAF50' : '#4CAF50') : (isDark ? '#3d3d3d' : '#e0e0e0'),
              color: sortOrder === 'asc' ? 'white' : (isDark ? '#cccccc' : '#666666'),
            }}
          >
            Короткие → Длинные
          </Button>
          <Button
            onClick={() => setSortOrder('desc')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              background: sortOrder === 'desc' ? (isDark ? '#4CAF50' : '#4CAF50') : (isDark ? '#3d3d3d' : '#e0e0e0'),
              color: sortOrder === 'desc' ? 'white' : (isDark ? '#cccccc' : '#666666'),
            }}
          >
            Длинные → Короткие
          </Button>
        </div>

        {/* Расширенные фильтры */}
        {showAdvancedFilter && (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px',
            padding: '10px',
            background: isDark ? '#3d3d3d' : '#e8e8e8',
            borderRadius: '8px'
          }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ 
                color: isDark ? 'white' : '#666', 
                fontSize: '12px',
                minWidth: '60px'
              }}>
                Длина:
              </span>
              <Input
                type="number"
                placeholder="Мин"
                value={minLength}
                onChange={(e) => setMinLength(parseInt(e.target.value) || 0)}
                style={{ 
                  width: '80px', 
                  background: isDark ? '#2d2d2d' : 'white',
                  color: isDark ? 'white' : 'black'
                }}
              />
              <span style={{ color: isDark ? 'white' : '#666' }}>-</span>
              <Input
                type="number"
                placeholder="Макс"
                value={maxLength}
                onChange={(e) => setMaxLength(parseInt(e.target.value) || 100)}
                style={{ 
                  width: '80px', 
                  background: isDark ? '#2d2d2d' : 'white',
                  color: isDark ? 'white' : 'black'
                }}
              />
            </div>
            
            {/* Дополнительные фильтры для Service Mode */}
            {mode === 'service' && (
              <>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ 
                    color: isDark ? 'white' : '#666', 
                    fontSize: '12px',
                    minWidth: '60px'
                  }}>
                    Статус:
                  </span>
                  <Button
                    size="s"
                    style={{
                      padding: '6px 12px',
                      fontSize: '11px',
                      background: isDark ? '#3d3d3d' : '#e0e0e0',
                      color: isDark ? 'white' : '#666'
                    }}
                  >
                    Active
                  </Button>
                  <Button
                    size="s"
                    style={{
                      padding: '6px 12px',
                      fontSize: '11px',
                      background: isDark ? '#3d3d3d' : '#e0e0e0',
                      color: isDark ? 'white' : '#666'
                    }}
                  >
                    Claimed
                  </Button>
                </div>
                
                {selectedCollection === 'zones' && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ 
                      color: isDark ? 'white' : '#666', 
                      fontSize: '12px',
                      minWidth: '60px'
                    }}>
                      Тип:
                    </span>
                    <Button
                      size="s"
                      style={{
                        padding: '6px 12px',
                        fontSize: '11px',
                        background: isDark ? '#3d3d3d' : '#e0e0e0',
                        color: isDark ? 'white' : '#666'
                      }}
                    >
                      SBT
                    </Button>
                    <Button
                      size="s"
                      style={{
                        padding: '6px 12px',
                        fontSize: '11px',
                        background: isDark ? '#3d3d3d' : '#e0e0e0',
                        color: isDark ? 'white' : '#666'
                      }}
                    >
                      Proxy
                    </Button>
                  </div>
                )}
              </>
            )}
            
            {/* Дополнительные фильтры для Other Mode */}
            {mode === 'other' && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ 
                  color: isDark ? 'white' : '#666', 
                  fontSize: '12px',
                  minWidth: '60px'
                }}>
                  Коллекция:
                </span>
                <Button
                  size="s"
                  style={{
                    padding: '6px 12px',
                    fontSize: '11px',
                    background: isDark ? '#3d3d3d' : '#e0e0e0',
                    color: isDark ? 'white' : '#666'
                  }}
                >
                  Все
                </Button>
                <Button
                  size="s"
                  style={{
                    padding: '6px 12px',
                    fontSize: '11px',
                    background: isDark ? '#3d3d3d' : '#e0e0e0',
                    color: isDark ? 'white' : '#666'
                  }}
                >
                  .ton
                </Button>
                <Button
                  size="s"
                  style={{
                    padding: '6px 12px',
                    fontSize: '11px',
                    background: isDark ? '#3d3d3d' : '#e0e0e0',
                    color: isDark ? 'white' : '#666'
                  }}
                >
                  t.me
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Получаем отфильтрованные элементы для отображения
  const displayItems = getFilteredItemsForMode();

  console.log('🎯 displayItems для рендера:', {
  mode,
  selectedCollection,
  count: displayItems.length,
  zonesCount: zones.length,
  subdomainsCount: subdomains.length,
  allNftsCount: allNfts.length,
  filteredItemsCount: filteredItems.length
});

// Если zones или subdomains пустые, проверьте:
if (mode === 'service' && (zones.length === 0 || subdomains.length === 0)) {
  console.log('⚠️ zones или subdomains пустые:', {
    zones: zones,
    subdomains: subdomains,
    isTestnet,
    walletAddress: wallet?.account?.address
  });
}

  // ========== РЕНДЕРИНГ КОМПОНЕНТА ==========
  return (
    <Page>
      <div style={{ padding: '10px' }}>
        {/* Баннер с информацией о сети */}
        <Banner
          header={isTestnet ? "Testnet" : "Mainnet"}
          subheader={isTestnet ? "Вы в тестовой сети" : "Вы в основной сети"}
          style={{
            marginBottom: '10px',
            background: isDark ? '#2d2d2d' : '#f0f0f0',
            color: isDark ? 'white' : 'black'
          }}
        />

        {/* Переключатель режимов */}
        <ModeTabs 
           mode={mode} 
        onModeChange={handleModeChange} 
        // isTestnet={isTestnet}
        // selectedCollection={selectedCollection}
        onTabChange={handleTabChange}
        // collections={displayItems}
        nftsCount={mode === 'other' ? allNfts.length : 0}
        zonesCount={mode === 'service' ? zones.length : 0}
        subdomainsCount={mode === 'service' ? subdomains.length : 0}
        />

        {/* Поле для ручного ввода (только для таба "any") */}
        {selectedCollection === 'any' && (
          <div style={{ 
            marginBottom: '15px',
            padding: '15px',
            background: isDark ? '#2d2d2d' : '#f5f5f5',
            borderRadius: '12px'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px',
              marginBottom: '10px'
            }}>
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke={isDark ? 'white' : 'black'} 
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: isDark ? 'white' : 'black' 
              }}>
                Ручной ввод адреса
              </span>
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <Input
                placeholder="Введите адрес NFT или коллекции..."
                value={manualCollectionAddress}
                onChange={(e) => setManualCollectionAddress(e.target.value)}
                style={{ 
                  flex: 1,
                  background: isDark ? '#3d3d3d' : 'white',
                  color: isDark ? 'white' : 'black'
                }}
              />
              <Button
                onClick={handleAnyTabSubmit}
                loading={checkingResolver}
                style={{
                  padding: '10px 20px',
                  background: isDark ? '#4CAF50' : '#4CAF50',
                  color: 'white'
                }}
              >
                Проверить
              </Button>
            </div>
            
            <div style={{ 
              marginTop: '10px', 
              fontSize: '12px', 
              color: isDark ? '#aaaaaa' : '#666666' 
            }}>
              Введите адрес NFT (.ton, t.me) или коллекции для проверки
            </div>
          </div>
        )}

        {/* Компонент поиска и фильтрации */}
        {selectedCollection !== 'any' && displayItems.length > 0 && (
          <SearchAndFilterSection />
        )}

        {/* Состояние загрузки */}
        {isLoading && (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px',
            color: isDark ? 'white' : '#666'
          }}>
            <Image
              src={searchDog}
              style={{ width: '100px', height: '100px', margin: '0 auto' }}
            />
            <div style={{ fontSize: '16px', marginBottom: '10px' }}>
              Загрузка данных...
            </div>
            <div style={{ fontSize: '12px' }}>
              Пожалуйста, подождите
            </div>
          </div>
        )}

        {/* Список элементов */}
        {!isLoading && displayItems.length > 0 ? (
          <List style={{ background: 'transparent', marginBottom: '120px' }}>
            {displayItems.map((item: DisplayItem) => (
              <Cell
                key={item.id}
                before={
                  <Image
                    src={getItemImageUrl(item)}
                    style={{ width: '120px', height: '120px', borderRadius: '8px' }}
                  />
                }
                after={
                  <Button
                    size="s"
                    onClick={() => handleItemClick(item)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      background: isDark ? '#4CAF50' : '#4CAF50',
                      color: 'white'
                    }}
                  >
                    Выбрать
                  </Button>
                }
                subtitle={shortenAddress(item.address)}
                style={{
                  marginBottom: '8px',
                  background: isDark ? '#2d2d2d' : 'white',
                  borderRadius: '12px',
                  cursor: 'pointer'
                }}
                onClick={() => handleItemClick(item)}
              >
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: '600',
                  color: isDark ? 'white' : 'black'
                }}>
                  {item.title}
                </div>
                {item.isZone && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: isDark ? '#aaaaaa' : '#666666',
                    marginTop: '2px'
                  }}>
                    {item.proxy === 0 ? 'SBT Zone' : 'Proxy Zone'} • {item.subdomainsAmount || 0} субдоменов
                  </div>
                )}
                {item.isSubdomain && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: isDark ? '#aaaaaa' : '#666666',
                    marginTop: '2px'
                  }}>
                    Субдомен • {item.mintPrice ? `${item.mintPrice} TON` : 'Free'}
                  </div>
                )}
              </Cell>
            ))}
          </List>
        ) : !isLoading && selectedCollection !== 'any' ? (
          <Placeholder
            header="Нет элементов"
            description="У вас нет элементов в этой категории"
            style={{ 
              margin: '40px 20px',
              color: isDark ? 'white' : '#666'
            }}
          >
            <Image
              src={searchDog}
              style={{ width: '100px', height: '100px', margin: '0 auto' }}
            />
          </Placeholder>
        ) : null}

        {/* Информационный блок (показывается при выборе элемента) */}
        {showInfoBlock && editingItem && (
          <div 
            ref={infoBlockRef}
            style={{ 
              marginTop: '20px',
              padding: '15px',
              background: isDark ? '#2d2d2d' : '#f5f5f5',
              borderRadius: '12px',
              marginBottom: '120px'
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Image
                  src={getItemImageUrl(editingItem)}
                  style={{ width: '120px', height: '120px', borderRadius: '8px' }}
                />
                <div>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: '600',
                    color: isDark ? 'white' : 'black'
                  }}>
                    {editingItem.title}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: isDark ? '#aaaaaa' : '#666666'
                  }}>
                    {shortenAddress(editingItem.address)}
                  </div>
                </div>
              </div>
              
              <Button
                size="s"
                onClick={handleManageClick}
                style={{
                  padding: '8px 16px',
                  background: isDark ? '#4CAF50' : '#4CAF50',
                  color: 'white'
                }}
              >
                Управлять
              </Button>
            </div>

            {/* Дополнительная информация */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
              gap: '10px',
              marginBottom: '15px'
            }}>
              {editingItem.isZone && (
                <>
                  <div style={{ 
                    padding: '10px',
                    background: isDark ? '#3d3d3d' : '#e8e8e8',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ 
                      fontSize: '12px', 
                      color: isDark ? '#aaaaaa' : '#666666',
                      marginBottom: '4px'
                    }}>
                      Тип
                    </div>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: '600',
                      color: isDark ? 'white' : 'black'
                    }}>
                      {editingItem.proxy === 0 ? 'SBT Zone' : 'Proxy Zone'}
                    </div>
                  </div>
                  
                  <div style={{ 
                    padding: '10px',
                    background: isDark ? '#3d3d3d' : '#e8e8e8',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ 
                      fontSize: '12px', 
                      color: isDark ? '#aaaaaa' : '#666666',
                      marginBottom: '4px'
                    }}>
                      Субдомены
                    </div>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: '600',
                      color: isDark ? 'white' : 'black'
                    }}>
                      {editingItem.subdomainsAmount || 0}
                    </div>
                  </div>
                </>
              )}
              
              {editingItem.isSubdomain && (
                <>
                  <div style={{ 
                    padding: '10px',
                    background: isDark ? '#3d3d3d' : '#e8e8e8',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ 
                      fontSize: '12px', 
                      color: isDark ? '#aaaaaa' : '#666666',
                      marginBottom: '4px'
                    }}>
                      Цена минта
                    </div>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: '600',
                      color: isDark ? 'white' : 'black'
                    }}>
                      {editingItem.mintPrice ? `${editingItem.mintPrice} TON` : 'Free'}
                    </div>
                  </div>
                  
                  <div style={{ 
                    padding: '10px',
                    background: isDark ? '#3d3d3d' : '#e8e8e8',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ 
                      fontSize: '12px', 
                      color: isDark ? '#aaaaaa' : '#666666',
                      marginBottom: '4px'
                    }}>
                      Статус
                    </div>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: '600',
                      color: isDark ? 'white' : 'black'
                    }}>
                      {editingItem.status || 'Unknown'}
                    </div>
                  </div>
                </>
              )}
              
              {mode === 'other' && editingItem.collection && (
                <div style={{ 
                  padding: '10px',
                  background: isDark ? '#3d3d3d' : '#e8e8e8',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ 
                    fontSize: '12px', 
                    color: isDark ? '#aaaaaa' : '#666666',
                    marginBottom: '4px'
                  }}>
                    Коллекция
                  </div>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: isDark ? 'white' : 'black'
                  }}>
                    {editingItem.collection.name || 'Unknown'}
                  </div>
                </div>
              )}
            </div>

            {/* Кнопка продления (только для Service Mode) */}
            {mode === 'service' && editingItem && (
                <div className="renewWrapper" style={{ marginTop: '15px' }}>
                  {/* Информация об истечении домена */}
                  <DomainExpirationInfo 
                    domainName={editingItem.name || editingItem.title}
                    isTestnet={isTestnet}
                  />
                  
                  <Button
                    onClick={handleRenewDomain}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: isDark ? '#2196F3' : '#2196F3',
                      color: 'white',
                      marginTop: '10px'
                    }}
                  >
                    Продлить домен (0.02 TON)
                  </Button>
                </div>
)}
          </div>
        )}

        {/* Блок DNS записей (показывается при нажатии "Управлять") */}
        {showDNSBlock && isVerified && (
          <div 
            ref={dnsBlockRef}
            style={{ 
              marginTop: '20px',
              padding: '15px',
              background: isDark ? '#2d2d2d' : '#f5f5f5',
              borderRadius: '12px',
              marginBottom: '120px'
            }}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px',
              marginBottom: '15px'
            }}>
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke={isDark ? 'white' : 'black'} 
                strokeWidth="2"
              >
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
              </svg>
              <span style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: isDark ? 'white' : 'black' 
              }}>
                Управление DNS записями
              </span>
            </div>

            {/* Поле для адреса */}
            <div style={{ marginBottom: '15px' }}>
              <div style={{ 
                fontSize: '12px', 
                color: isDark ? '#aaaaaa' : '#666666',
                marginBottom: '5px'
              }}>
                Адрес для управления:
              </div>
              <Input
                value={resolverAddress}
                onChange={(e) => setResolverAddress(e.target.value)}
                style={{ 
                  background: isDark ? '#3d3d3d' : 'white',
                  color: isDark ? 'white' : 'black'
                }}
              />
            </div>

            {/* DNS записи */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {/* Кошелек */}
              <div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: isDark ? 'white' : 'black'
                  }}>
                    Кошелек
                  </span>
                  <Button
                    size="s"
                    onClick={handleSaveWalletAddress}
                    loading={dnsOperationLoading}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      background: isDark ? '#4CAF50' : '#4CAF50',
                      color: 'white'
                    }}
                  >
                    Сохранить
                  </Button>
                </div>
                <Input
                  placeholder="Введите адрес кошелька..."
                  value={formData.walletAddress}
                  onChange={(e) => handleInputChange('walletAddress', e.target.value)}
                  style={{ 
                    background: isDark ? '#3d3d3d' : 'white',
                    color: isDark ? 'white' : 'black'
                  }}
                />
              </div>

              {/* TON Сайт */}
              <div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: isDark ? 'white' : 'black'
                  }}>
                    TON Сайт
                  </span>
                  <Button
                    size="s"
                    onClick={handleSaveTonSite}
                    loading={dnsOperationLoading}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      background: isDark ? '#4CAF50' : '#4CAF50',
                      color: 'white'
                    }}
                  >
                    Сохранить
                  </Button>
                </div>
                <Input
                  placeholder="Введите ADNL адрес..."
                  value={formData.tonSite}
                  onChange={(e) => handleInputChange('tonSite', e.target.value)}
                  style={{ 
                    background: isDark ? '#3d3d3d' : 'white',
                    color: isDark ? 'white' : 'black'
                  }}
                />
              </div>

              {/* TON Хранилище */}
              <div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: isDark ? 'white' : 'black'
                  }}>
                    TON Хранилище
                  </span>
                  <Button
                    size="s"
                    onClick={handleSaveTonStorage}
                    loading={dnsOperationLoading}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      background: isDark ? '#4CAF50' : '#4CAF50',
                      color: 'white'
                    }}
                  >
                    Сохранить
                  </Button>
                </div>
                <Input
                  placeholder="Введите Bag ID..."
                  value={formData.tonStorage}
                  onChange={(e) => handleInputChange('tonStorage', e.target.value)}
                  style={{ 
                    background: isDark ? '#3d3d3d' : 'white',
                    color: isDark ? 'white' : 'black'
                  }}
                />
              </div>

              {/* Субдомены */}
              <div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: isDark ? 'white' : 'black'
                  }}>
                    Субдомены (Next Resolver)
                  </span>
                  <Button
                    size="s"
                    onClick={handleSaveSubdomains}
                    loading={dnsOperationLoading}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      background: isDark ? '#4CAF50' : '#4CAF50',
                      color: 'white'
                    }}
                  >
                    Сохранить
                  </Button>
                </div>
                <Input
                  placeholder="Введите адрес резолвера..."
                  value={formData.subdomains}
                  onChange={(e) => handleInputChange('subdomains', e.target.value)}
                  style={{ 
                    background: isDark ? '#3d3d3d' : 'white',
                    color: isDark ? 'white' : 'black'
                  }}
                />
              </div>
            </div>

            {/* Информация о статусе */}
            <div style={{ 
              marginTop: '15px',
              padding: '10px',
              background: isDark ? '#3d3d3d' : '#e8e8e8',
              borderRadius: '8px',
              fontSize: '12px',
              color: isDark ? '#aaaaaa' : '#666666'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
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
                <span>Информация</span>
              </div>
              <div>
                • Изменения вступят в силу после подтверждения транзакции
              </div>
              <div>
                • Для удаления записи очистите поле и нажмите "Сохранить"
              </div>
            </div>
          </div>
        )}

        {/* Snackbar для уведомлений */}
        {snackbar}
      </div>
    </Page>
  );
};

export default ManageDomainPage;