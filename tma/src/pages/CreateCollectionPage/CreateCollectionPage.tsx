// src/pages/CreateCollectionPage/CreateCollectionPageEnhanced.tsx
// Обновленная версия с интегрированным сервисом проверки транзакций

import React, { useState, useCallback, useEffect } from 'react';
import {
  Banner,
  Card,
  Input
} from "@telegram-apps/telegram-ui";
import { useTonWallet, useTonAddress, useTonConnectUI } from "@tonconnect/ui-react";
import { useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import StepContent from '@mui/material/StepContent';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContentText from '@mui/material/DialogContentText';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

import { RootState } from '@/store/rootReducer';
import { useTypedDispatch } from '../../hooks/useTypeDispatch';
import {
  deployBundle,
  DeployBundlePayload,
  deploySBTCollection,
  DeploySBTCollectionPayload
} from '@/store/nft/actions';
import {
  resetAllDeployments
} from '@/store/nft/blockchainReducer';
import { Page } from "@/components/Page";
import { ShowSnackbar } from "@/components/ShowSnackbar";
import { getProxyParams } from '@/helpers/constants';
import { getAddressDomainByIndex } from './getNftAddressByIndex';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getCollectionId } from './getCollectionId';
import { useBlockchainItems } from '@/services/blockchainItems/blockchain-items-context.tsx';
// import { Address } from 'ton-core';

// Импортируем API service
import { apiService, getZoneLengthKey, ZoneLength, PaymentAttempts } from '@/services/api';
import PaymentAttemptsSection from '@/components/PaymentAttemptsSection';
import { convertUserFriendlyToRaw, getNftOwnerAddress } from '@/utils/tonUtils';

// Импортируем новый сервис транзакций
import { TransactionService, TransactionResult } from '@/services/transactionService';
import { TonUtilsEnhanced } from '@/utils/tonUtilsEnhanced';

// Тип для активной вкладки
type ActiveTab = 'proxy' | 'sbt';

// Интерфейс для модального окна подтверждения отвязки
interface UnlinkConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  domainName: string;
  loading: boolean;
}

// Компонент модального окна подтверждения отвязки
const UnlinkConfirmationModal: React.FC<UnlinkConfirmationModalProps> = ({
  open,
  onClose,
  onConfirm,
  domainName,
  loading
}) => {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';
  const { t } = useLanguage();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="unlink-confirmation-title"
      aria-describedby="unlink-confirmation-description"
    >
      <DialogTitle id="unlink-confirmation-title" sx={{ color: isDark ? 'white' : 'black' }}>
        {t('attention')}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="unlink-confirmation-description" sx={{ color: isDark ? '#ccc' : '#666' }}>
          <strong>{domainName}.ton</strong>
          {t('collectionAlreadyAttached')}
          <br /><br />
          {t('unlinkConfirmationQuestion')}
          <br /><br />
          <small style={{ color: '#ff9800' }}>
            ⚠️ {t('unlinkWarning')}
          </small>
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          disabled={loading}
          sx={{ color: isDark ? '#ccc' : '#666' }}
        >
          {t('cancel')}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          variant="contained"
          sx={{
            background: loading ? '#888' : '#f44336',
            '&:hover': {
              background: loading ? '#888' : '#d32f2f'
            }
          }}
        >
          {loading ? t('processing') : t('unlinkAndCreateNew')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const CreateCollectionPage: React.FC = () => {
  const dispatch = useTypedDispatch();
  const wallet = useTonWallet();
  const isTestnet = wallet?.account?.chain === "-3";
  const ProxyParams = getProxyParams(isTestnet);
  const TonDnsAddress = ProxyParams["dns_collection_address"];

  const address = useTonAddress();

  const ownerAddress = isTestnet
    ? (import.meta.env.VITE_PAYMENT_OWNER_TESTNET || '')
    : (import.meta.env.VITE_PAYMENT_OWNER_MAINNET || '');
const partnerAddress = isTestnet
    ? (import.meta.env.VITE_PAYMENT_PARTNER_TESTNET || '')
    : (import.meta.env.VITE_PAYMENT_PARTNER_MAINNET || '');
  const [tonConnectUI] = useTonConnectUI();

  // Используем состояние из Redux
  const {
    bundleDeployment,
    sbtCollectionDeployment
  } = useSelector((state: RootState) => state.blockchain);

  // Ончейн-коллекции текущей сети (для проверки "уже есть SBT-зона на этом домене" без бэкенда)
  const { sbtCollections, ensureData } = useBlockchainItems();

  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';
  const { t } = useLanguage();

  const API_PAYLOAD_URL=import.meta.env.VITE_API_SC_PAYLOAD_URL;

  // Состояния
  const [activeTab, setActiveTab] = useState<ActiveTab>('proxy');
  const [activeStep, setActiveStep] = useState(0);
  const [domainName, setDomainName] = useState('');
  const [snackbar, setSnackbar] = useState<JSX.Element | null>(null);
  const [, setDnsMainDomainAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [, setCreatedZoneId] = useState<number | null>(null);
  const [, setCollectionAddress] = useState<string>('');

  // Новые состояния для проверки домена
  const [unlinkModalOpen, setUnlinkModalOpen] = useState(false);
  const [existingZone, setExistingZone] = useState<any>(null);
  const [unlinkingInProgress, setUnlinkingInProgress] = useState(false);

  // Новые состояния для оплаченных попыток
  const [paymentAttempts, setPaymentAttempts] = useState<PaymentAttempts>({
    proxy: { 4: false, 5: false, 6: false, 7: false, 8: false, 9: false },
    sbt: { 4: false, 5: false, 6: false, 7: false, 8: false, 9: false }
  });
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [hasPaidAttempt, setHasPaidAttempt] = useState(false);

  // Состояние для отслеживания транзакций
  const [transactionStatus, setTransactionStatus] = useState<{
    hash?: string;
    status?: 'pending' | 'confirmed' | 'failed';
    message?: string;
  }>({});

  // Инициализируем утилиты TON
  const tonUtils = React.useMemo(() => {
    return new TonUtilsEnhanced({
      network: isTestnet ? 'testnet' : 'mainnet'
    });
  }, [isTestnet]);

  // Устанавливаем сеть в API service
  useEffect(() => {
    apiService.setNetwork(isTestnet);
  }, [isTestnet]);

  // checkDomainExists ниже читает sbtCollections напрямую из стора — эта
  // страница раньше сама никогда не инициировала загрузку блокчейн-данных
  // и полагалась на то, что их загрузит какая-то другая страница до неё.
  // Если юзер открывал создание зоны первым за сессию, sbtCollections был
  // пуст, и проверка существующей зоны молча не находила ничего.
  useEffect(() => {
    ensureData();
  }, [ensureData]);

  // Загружаем оплаченные попытки при изменении адреса
  useEffect(() => {
    if (address) {
      loadPaymentAttempts();
    }
  }, [address, isTestnet]);

  // Функция для загрузки оплаченных попыток
  const loadPaymentAttempts = useCallback(async () => {
    if (!address) return;

    try {
      setCheckingPayment(true);
      const response = await apiService.getUserPaymentAttempts(address);
      if (response.success && response.data) {
        setPaymentAttempts(response.data);
      }
    } catch (error) {
      console.error('Ошибка при загрузке оплаченных попыток:', error);
    } finally {
      setCheckingPayment(false);
    }
  }, [address]);

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
      dropdownBorder: "#E5E7EB"
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
      dropdownBorder: "#444444"
    }
  };

  const colors = themeColors[isDark ? "dark" : "light"];

  // Функция для расчета цены
  const calculateZonePrice = (domain: string, isProxy: boolean): number => {
    const length = domain.length;
    if (isProxy) {
      if (length === 4) return 100;
      if (length === 5) return 50;
      if (length === 6) return 40;
      if (length === 7) return 30;
      if (length === 8) return 20;
      return 10;
    } else {
      if (length === 4) return 5;
      if (length === 5) return 2.5;
      if (length === 6) return 2;
      if (length === 7) return 1.5;
      if (length === 8) return 1;
      return 0.5;
    }
  };

  const zonePrice = domainName ? calculateZonePrice(domainName, activeTab === 'proxy') : 0;
  const domainLength = domainName.length;

  // Проверяем, есть ли оплаченная попытка для текущего домена
  useEffect(() => {
    console.log('🔍 Проверка hasPaidAttempt запущена');
    console.log('🔍 Длина домена:', domainLength);
    console.log('🔍 Активная вкладка:', activeTab);
    console.log('🔍 paymentAttempts:', paymentAttempts);

    if (domainName.length >= 4) {
      const lengthKey = getZoneLengthKey(domainLength);
      console.log('🔍 Полученный lengthKey:', lengthKey);

      if (lengthKey) {
        let hasPaid = false;

        if (activeTab === 'proxy') {
          hasPaid = paymentAttempts.proxy[lengthKey] === true;
          console.log(`🔍 Проверка proxy[${lengthKey}]:`, paymentAttempts.proxy[lengthKey], 'Результат:', hasPaid);
        } else if (activeTab === 'sbt') {
          hasPaid = paymentAttempts.sbt[lengthKey] === true;
          console.log(`🔍 Проверка sbt[${lengthKey}]:`, paymentAttempts.sbt[lengthKey], 'Результат:', hasPaid);
        } else {
          hasPaid = false;
        }

        console.log('🔍 Устанавливаем hasPaidAttempt:', hasPaid);
        setHasPaidAttempt(hasPaid);
      } else {
        console.log('❌ Некорректный lengthKey');
        setHasPaidAttempt(false);
      }
    } else {
      console.log('❌ Длина домена меньше 4 символов');
      setHasPaidAttempt(false);
    }
  }, [domainName, activeTab, paymentAttempts, domainLength]);

  // Шаги
  const proxySteps = [
    { label: t('enterDomainName'), description: t('fromDomainCreated') },
    { label: t('confirmPayment'), description: t('confirmZoneCreation') },
    { label: t('deployBundle'), description: t('createSubdomainCollection') },
  ];

  const sbtSteps = [
    { label: t('enterDomainName'), description: t('fromDomainCreated') },
    { label: t('confirmPayment'), description: t('confirmZoneCreation') },
    { label: t('deployCollection'), description: t('createSBTSubdomainCollection') },
  ];

  const steps = activeTab === 'proxy' ? proxySteps : sbtSteps;

  const showSnackbar = useCallback((message: string, type: "success" | "error" = "success") => {
    setSnackbar(<ShowSnackbar message={message} type={type} onClose={() => setSnackbar(null)} />);
  }, []);

  // ========== УЛУЧШЕННЫЕ ФУНКЦИИ ДЛЯ ТРАНЗАКЦИЙ ==========

  /**
   * Улучшенная отправка транзакции с проверкой статуса
   */
  const sendTransactionWithVerification = useCallback(async (
    transaction: any,
    options: {
      description?: string;
      onStatusUpdate?: (status: string) => void;
    } = {}
  ): Promise<TransactionResult> => {
    const { description = 'Транзакция', onStatusUpdate } = options;

    try {
      onStatusUpdate?.(`Отправка ${description}...`);
      
      const result = await TransactionService.sendTransaction(
        tonConnectUI,
        transaction,
        {
          network: isTestnet ? 'testnet' : 'mainnet',
          maxRetries: 3,
          timeout: 60000,
          verifyBlockchain: true
        }
      );

      if (result.success && result.hash) {
        onStatusUpdate?.(`${description} отправлена, проверка статуса...`);
        setTransactionStatus({
          hash: result.hash,
          status: 'pending',
          message: 'Проверка подтверждения в блокчейне...'
        });

        // Дополнительная проверка через утилиты TON
        const verification = await tonUtils.checkTransactionWithRetry(result.hash, {
          maxAttempts: 5,
          timeout: 30000
        });

        if (verification.confirmed) {
          onStatusUpdate?.(`✅ ${description} подтверждена в блокчейне`);
          setTransactionStatus({
            hash: result.hash,
            status: 'confirmed',
            message: 'Транзакция подтверждена'
          });
          return { ...result, confirmedInBlock: true };
        } else {
          onStatusUpdate?.(`⚠️ ${description} отправлена, но не подтверждена`);
          setTransactionStatus({
            hash: result.hash,
            status: 'failed',
            message: verification.error || 'Не удалось подтвердить транзакцию'
          });
          return { ...result, confirmedInBlock: false, error: verification.error };
        }
      }

      return result;

    } catch (error: any) {
      const errorMsg = error.message || 'Ошибка отправки транзакции';
      onStatusUpdate?.(`❌ ${errorMsg}`);
      setTransactionStatus({
        status: 'failed',
        message: errorMsg
      });
      return {
        success: false,
        error: errorMsg
      };
    }
  }, [tonConnectUI, isTestnet, tonUtils]);

  // Функция для записи оплаченной попытки
  const recordPaymentAttempt = useCallback(async (zoneType: ActiveTab, length: ZoneLength): Promise<boolean> => {
    try {
      const response = await apiService.addPaymentAttempt(address!, zoneType, length);
      if (response.success) {
        setPaymentAttempts(prev => ({
          ...prev,
          [zoneType]: {
            ...prev[zoneType],
            [length]: true
          }
        }));
        await loadPaymentAttempts();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Ошибка при записи оплаченной попытки:', error);
      return false;
    }
  }, [address]);

  // Функция для списания оплаченной попытки
  const consumePaymentAttempt = useCallback(async (zoneType: ActiveTab, length: ZoneLength): Promise<boolean> => {
    try {
      const response = await apiService.consumePaymentAttempt(address!, zoneType, length);
      if (response.success) {
        setPaymentAttempts(prev => ({
          ...prev,
          [zoneType]: {
            ...prev[zoneType],
            [length]: false
          }
        }));
        await loadPaymentAttempts();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Ошибка при списании оплаченной попытки:', error);
      return false;
    }
  }, [address]);

  // Relay-only уведомление бота о создании зоны — в БД больше не пишем
  // (не убрано совсем, апи ниже просто больше не вызывает createZone()).
  const createZoneInDatabase = useCallback(async (zoneData: {
    name: string;
    address: string;
    collectionAddress?: string;
    wrapperAddress?: string;
    proxy?: boolean;
    owner?: string;
    status: string;
    zonePrice: number;
    currentID: number;
  }) => {
    try {
      await apiService.notifyZoneCreated({
        name: zoneData.name,
        address: zoneData.address,
        collectionAddress: zoneData.collectionAddress,
        proxy: !!zoneData.proxy,
        owner: zoneData.owner || address,
        zonePrice: zoneData.zonePrice,
        currentID: zoneData.currentID,
      });
      console.log('✅ Уведомление о создании зоны отправлено боту');
    } catch (error) {
      console.error('❌ Ошибка отправки уведомления о создании зоны:', error);
      throw error;
    }
  }, [address]);

  // ========== УЛУЧШЕННАЯ ОПЛАТА ==========

  const handlePaymentTransaction = useCallback(async (): Promise<boolean> => {
    if (!wallet) {
      showSnackbar(t('walletNotConnected'), "error");
      return false;
    }

    setLoading(true);
    setTransactionStatus({ status: 'pending', message: 'Подготовка платежа...' });

    try {
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 240,
        messages: [
          {
            address: ownerAddress,
            amount: ((zonePrice / 2) * 1000000000).toString(),
          },
          {
            address: partnerAddress,
            amount: ((zonePrice / 2) * 1000000000).toString(),
          }
        ]
      };

      const result = await sendTransactionWithVerification(transaction, {
        description: 'Платеж за зону',
        onStatusUpdate: (status) => {
          setTransactionStatus(prev => ({ ...prev, message: status }));
        }
      });

      if (result.success) {
        // Получаем ZoneLength ключ
        const lengthKey = getZoneLengthKey(domainLength);

        console.log(`🔍 Длина домена: ${domainLength}, lengthKey: ${lengthKey}`);

        if (lengthKey) {
          console.log(`📝 Записываем оплаченную попытку: ${activeTab}, ${lengthKey}`);
          const recordSuccess = await recordPaymentAttempt(activeTab, lengthKey);

          if (recordSuccess) {
            if (result.confirmedInBlock) {
              showSnackbar(t('paymentSuccessfulConfirmed'), "success");
            } else {
              showSnackbar(t('paymentSentNotConfirmed'), "error");
            }
            return true;
          } else {
            showSnackbar(t('paymentRecordError'), "error");
            return false;
          }
        } else {
          console.error(`❌ Некорректная длина домена: ${domainLength}`);
          showSnackbar(`${domainLength} - ${t('invalidDomainLength')} `, "error");
          return false;
        }
      } else {
        showSnackbar(result.error || t('paymentFailed'), "error");
        return false;
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      showSnackbar(error?.message || t('paymentFailed'), "error");
      return false;
    } finally {
      setLoading(false);
      setTransactionStatus({});
    }
  }, [wallet, zonePrice, domainLength, activeTab, sendTransactionWithVerification, recordPaymentAttempt, showSnackbar, t]);

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

  // Проверка владельца домена
  const checkOwnerDomainExists = useCallback(async (domainName: string): Promise<boolean> => {
    try {
      const nftAddress = await getAddressDomainByIndex(
        domainName,
        TonDnsAddress, 
        isTestnet
      );

      if (!nftAddress) {
        console.log("NFT адрес не найден для домена:", domainName);
        return false;
      }

      const ownerAddress = await getNftOwnerAddress(nftAddress, isTestnet);
      
      if (!ownerAddress) {
        console.log("Владелец не найден для NFT:", nftAddress);
        return false;
      }

      const currentUserAddress = convertUserFriendlyToRaw(address);
      console.log(`изначальный ownerAddress: ${ownerAddress}`)
      // const nftOwnerAddress = normalizeAddress(ownerAddress);
      const nftOwnerAddress = convertUserFriendlyToRaw(ownerAddress);

      console.log("Сравнение адресов:", {
        currentUserAddress,
        nftOwnerAddress,
        domainName,
        nftAddress
      });

      return currentUserAddress === nftOwnerAddress;
    } catch (error) {
      console.error("Ошибка проверки владельца домена:", error);
      return false;
    }
  }, [address, isTestnet]);

  // Проверка существования SBT-зоны на домене — ончейн, а не через бэкенд-БД
  // (после миграции на ончейн-данные бэкенд может не знать о зоне вовсе).
  // На домене может накопиться несколько исторических SBT-коллекций (id 0,1,2...) —
  // берём ту, у которой максимальный on-chain id, это и есть текущая/актуальная.
  const checkDomainExists = useCallback(async (domain: string): Promise<boolean> => {
    try {
      const fullDomainName = `${domain}.ton`;
      console.log(`🔍 Проверяем существование SBT-зоны ончейн: ${fullDomainName}`);

      const candidates = sbtCollections.filter((c) => c.domain === fullDomainName);

      if (candidates.length === 0) {
        console.log(`✅ SBT-зона на ${fullDomainName} не найдена ончейн, можно создавать`);
        return false;
      }

      let latest: { collectionAddress: string; id: number } | null = null;
      for (const candidate of candidates) {
        const id = await getCollectionId(candidate.address, isTestnet);
        if (!latest || id > latest.id) {
          latest = { collectionAddress: candidate.address, id };
        }
      }

      if (!latest) return false;

      console.log(`⚠️ Найдена текущая SBT-зона на домене ончейн:`, latest);
      setExistingZone({
        collectionAddress: latest.collectionAddress,
        name: fullDomainName,
        currentId: latest.id,
      });
      return true;
    } catch (error: any) {
      console.error('❌ Ошибка при ончейн-проверке домена:', error);
      showSnackbar(t('zoneNotInDatabase'), "error");
      return false;
    }
  }, [sbtCollections, isTestnet, showSnackbar, t]);

  // ========== ОСНОВНЫЕ ОБРАБОТЧИКИ ==========

  // Шаг 0: Ввод домена и проверка
  const handleCheckDomain = useCallback(async () => {
    if (!domainName.trim()) {
      showSnackbar(t('pleaseEnterDomainName'), "error");
      return;
    }

    if (domainName.length < 4) {
      showSnackbar(t('domainMinLengthError'), "error");
      return;
    }

    const validCharsRegex = /^[a-z0-9-]+$/;
      if (!validCharsRegex.test(domainName)) {
        showSnackbar(t('domainInvalidCharsError'), "error");
      return;
    }

    const isOwner = await checkOwnerDomainExists(domainName);
    if (!isOwner) {
      showSnackbar(t('domainNotOwnerError'), "error");
    return;
    }

    const domainExists = await checkDomainExists(domainName);

    if (domainExists && existingZone) {
      setUnlinkModalOpen(true);
      return;
    }

    setActiveStep(1);
  }, [domainName, checkDomainExists, existingZone, showSnackbar, t]);

  const handleConfirmPayment = useCallback(async () => {
    if (!domainName.trim()) {
      showSnackbar(t('pleaseEnterDomainName'), "error");
      return;
    }

    console.log('💰 handleConfirmPayment вызван');
    console.log('💰 hasPaidAttempt:', hasPaidAttempt);

    if (hasPaidAttempt) {
      console.log('✅ Используем ранее оплаченную попытку');
      setPaymentCompleted(true);
      setActiveStep(activeTab === 'proxy' ? 2 : 2);
      showSnackbar(t('usingPaidAttempt'), "success");
      return;
    }

    console.log('💰 Нет оплаченной попытки, выполняем оплату');
    setLoading(true);
    try {
      const success = await handlePaymentTransaction();
      if (success) {
        setPaymentCompleted(true);
        setActiveStep(activeTab === 'proxy' ? 2 : 2);
      }
    } finally {
      setLoading(false);
    }
  }, [domainName, hasPaidAttempt, activeTab, handlePaymentTransaction, showSnackbar, t, paymentAttempts, domainLength]);


    // Функция для отвязки старой коллекции с использованием нового сервиса транзакций
const unlinkExistingCollection = useCallback(async (zone: any): Promise<boolean> => {
  if (!zone.collectionAddress) {
    console.log('❌ У существующей зоны нет collectionAddress');
    return false;
  }

  setUnlinkingInProgress(true);
  setTransactionStatus({ status: 'pending', message: 'Начинаем отвязку коллекции...' });

  const zoneNameWithoutTonArr = (zone.name).slice(0, -4);

  try {
    // 1. Отправляем транзакцию на смену контента
    const changeContentUrl = `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/${zone.collectionAddress}/change_content?query_id=0`;

    const changeContentData = {
      new_content: {
        content: {
          uri: `${API_PAYLOAD_URL}/api/v1/inactive-subdomain/metadata/ton/${zoneNameWithoutTonArr}`
        },
        common_content: {
          suffix_uri: `${API_PAYLOAD_URL}/api/v1/inactive-subdomain/metadata/ton/${zoneNameWithoutTonArr}/`
        }
      }
    };

    console.log('📤 Отправляем запрос на смену контента:', changeContentUrl);

    const response = await fetch(changeContentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(changeContentData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Ответ от API смены контента:', result);

    if (result.messages && result.messages.length > 0) {
      // 2. Подписываем транзакцию через TonConnect с проверкой
      console.log('📝 Подписываем транзакцию через TonConnect...');

      const transaction = {
        validUntil: result.validUntil || Math.floor(Date.now() / 1000) + 240,
        messages: result.messages
      };

      const txResult = await sendTransactionWithVerification(transaction, {
        description: 'Отвязка коллекции',
        onStatusUpdate: (status) => {
          setTransactionStatus(prev => ({ ...prev, message: status }));
        }
      });

      console.log('✅ Результат транзакции:', txResult);

      if (txResult.success && txResult.hash) {
        // 3. Обновляем статус зоны в базе данных, если это старая зона с реальным
        // DB-id (легаси-путь). Зоны, найденные через ончейн-проверку выше, не
        // имеют DB-id — ончейн-транзакция деактивации (шаг 1) уже сделала
        // главное, дальше обновлять нечего.
        try {
          if (zone.id != null) {
            const res = await apiService.updateZoneStatusToInactive(zone.id);
            console.log(`Ответ о смене статуса для зоны с таким же доменом: ${res}`);
          }

          if (txResult.confirmedInBlock) {
            showSnackbar(t('collectionUnlinkedSuccessConfirmed'), "success");
          } else {
            showSnackbar(t('collectionUnlinkedSentNotConfirmed'), "error");
          }
          
          return true;
        } catch (dbError) {
          console.error('❌ Ошибка обновления базы данных:', dbError);
          showSnackbar(t('collectionUnlinkedDbError'), "error");
          return true; // Транзакция прошла, даже если база не обновилась
        }
      } else {
        showSnackbar(txResult.error || t('unlinkTransactionFailed'), "error");
        return false;
      }
    }

    return false;
  } catch (error: any) {
    console.error('❌ Ошибка при отвязке коллекции:', error);
    showSnackbar(`${t('unlinkError')}: ${error.message}`, "error");
    return false;
  } finally {
    setUnlinkingInProgress(false);
  }}, [tonConnectUI, showSnackbar, sendTransactionWithVerification, t]);
  
    // Обработчик подтверждения отвязки
    const handleUnlinkConfirm = useCallback(async () => {
      if (!existingZone) {
        setUnlinkModalOpen(false);
        return;
      }
  
      setUnlinkingInProgress(true);
  
      try {
        // Отвязываем старую коллекцию
        const unlinkSuccess = await unlinkExistingCollection(existingZone);
  
        if (unlinkSuccess) {
          setUnlinkModalOpen(false);
          // После отвязки переходим к следующему шагу
          setActiveStep(1);
        }
      } catch (error) {
        console.error('Ошибка при отвязке:', error);
        showSnackbar(`${t('unlinkError')}`, "error");
      } finally {
        setUnlinkingInProgress(false);
      }
    }, [existingZone, unlinkExistingCollection, showSnackbar]);

  // ========== УЛУЧШЕННЫЙ ДЕПЛОЙ BUNDLE ==========

  const handleDeployBundleWithTransaction = useCallback(async () => {
    if (!wallet) {
      showSnackbar(t('walletNotConnected'), "error");
      return;
    }

    if (!domainName.trim()) {
      showSnackbar(t('pleaseEnterDomainName'), "error");
      return;
    }

    setLoading(true);
    setTransactionStatus({ status: 'pending', message: 'Подготовка деплоя Bundle...' });

    try {
      const domainAddress = await getAddressDomainByIndex(domainName, TonDnsAddress, isTestnet);

      if (!domainAddress) {
        showSnackbar(t('failedToGetDomainAddress'), "error");
        setLoading(false);
        return;
      }

      console.log(`${t('domainAddressFound')}: ${domainAddress}`);
      setDnsMainDomainAddress(domainAddress);

      const bundlePayload: DeployBundlePayload = {
        proxy_collection_address: isTestnet
          ? (import.meta.env.VITE_PROXY_COLLECTION_TESTNET || "")
          : (import.meta.env.VITE_PROXY_COLLECTION_MAINNET || ""),
        user_wallet_address: address,
        dns_item_address: domainAddress,
        dns_item_name: domainName,
        owner_address: ownerAddress,
        second_owner_address: partnerAddress,
        content: {
          content: {
            uri: `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${domainName}`
          },
          common_content: {
            suffix_uri: `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${domainName}/`
          }
        },
        royalty_params: {
          address: ownerAddress,
          share: 30,
          denominator: 1000
        },
        config: {
          tld: "ton",
          domain: domainName,
          prices: {
            prices: {
              "0": 0.5,
              "1": 30,
              "2": 20,
              "3": 10,
              "4": 5,
              "5": 2.5,
              "6": 1
            }
          },
          partner_share: {
            address: address,
            share: 900,
            denominator: 1000
          }
        }
      };

      const result = await dispatch(deployBundle(bundlePayload)).unwrap();

      if (result.messages && result.messages.length > 0) {
        console.log('Отправляю транзакцию Bundle в TonConnect...');

        const transaction = {
          validUntil: result.validUntil || Math.floor(Date.now() / 1000) + 240,
          messages: result.messages
        };

        const txResult = await sendTransactionWithVerification(transaction, {
          description: 'Деплой Bundle коллекции',
          onStatusUpdate: (status) => {
            setTransactionStatus(prev => ({ ...prev, message: status }));
          }
        });

        if (txResult.success && txResult.hash) {
          const collectionAddr = result.messages[0]?.address || '';
          setCollectionAddress(collectionAddr);
          console.log(`Адрес бандла: ${collectionAddr}`);

          // Создаем зону в базе данных
          try {
            const zoneData = {
              name: `${domainName}.ton`,
              address: domainAddress,
              collectionAddress: collectionAddr,
              proxy: true,
              owner: address,
              status: 'active',
              zonePrice: zonePrice,
              currentID: 1
            };

            await createZoneInDatabase(zoneData);

            // СПИСЫВАЕМ оплаченную попытку ПОСЛЕ успешного деплоя
            const lengthKey = getZoneLengthKey(domainLength);
            if (lengthKey) {
              await consumePaymentAttempt('proxy', lengthKey);
              console.log('✅ Оплаченная попытка для Proxy зоны списана');
            }

            if (txResult.confirmedInBlock) {
              showSnackbar(t('bundleDeployedSuccessfullyConfirmed'), "success");
            } else {
              showSnackbar(t('bundleDeployedSentNotConfirmed'), "error");
            }
            
            setActiveStep(3);

          } catch (dbError) {
            console.error('Ошибка создания зоны в базе:', dbError);
            showSnackbar(t('bundleDeployedDbError'), "error");
            setActiveStep(3);
          }
        } else {
          showSnackbar(txResult.error || t('transactionNotConfirmed'), "error");
        }
      }
    } catch (error) {
      console.error('Deploy bundle error:', error);
      showSnackbar(error instanceof Error ? error.message : t('bundleDeploymentFailed'), "error");
    } finally {
      setLoading(false);
      setTransactionStatus({});
    }
  }, [
    wallet, address, dispatch, showSnackbar, domainName, tonConnectUI, 
    TonDnsAddress, isTestnet, zonePrice, createZoneInDatabase, 
    domainLength, consumePaymentAttempt, sendTransactionWithVerification, t
  ]);

  // ========== УЛУЧШЕННЫЙ ДЕПЛОЙ SBT ==========

  const handleDeploySBTCollection = useCallback(async () => {
    if (!wallet) {
      showSnackbar(t('walletNotConnected'), "error");
      return;
    }

    if (!domainName.trim()) {
      showSnackbar(t('pleaseEnterDomainName'), "error");
      return;
    }

    if (!paymentCompleted && !hasPaidAttempt) {
      showSnackbar(t('payForZoneFirst'), "error");
      return;
    }

    setLoading(true);
    setTransactionStatus({ status: 'pending', message: 'Подготовка деплоя SBT...' });

    try {
      const domainAddress = await getAddressDomainByIndex(domainName, TonDnsAddress, isTestnet);

      if (!domainAddress) {
        showSnackbar(t('failedToGetDomainAddress'), "error");
        setLoading(false);
        return;
      }

      // Логика ID: если на домене уже была SBT-зона, она уже обнаружена и
      // деактивирована на шаге 0 (handleCheckDomain -> unlinkExistingCollection),
      // её текущий id лежит в existingZone.currentId — просто инкрементируем.
      // Повторный ончейн-запрос здесь не нужен.
      const idValue = existingZone?.currentId != null ? existingZone.currentId + 1 : 0;
      console.log(`📤 SBT ID для деплоя: ${idValue} (existingZone:`, existingZone, ')');

      // Формируем payload
      const sbtPayload: DeploySBTCollectionPayload = {
        owner_address: ownerAddress,
        second_owner_address: partnerAddress,
        partner_address: address,
        content: {
          content: {
            uri: `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${domainName}`
          },
          common_content: {
            suffix_uri: `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${domainName}/`
          }
        },
        config: {
          id: idValue,
          tld: "ton",
          domain: domainName
        },
        query_id: 0
      };

      console.log('📤 Sending SBT payload with ID:', idValue);

      const result = await dispatch(deploySBTCollection(sbtPayload)).unwrap();

      if (result.messages && result.messages.length > 0) {
        console.log('🔄 Отправляю транзакцию SBT в TonConnect...');

        const transaction = {
          validUntil: result.validUntil || Math.floor(Date.now() / 1000) + 240,
          messages: result.messages
        };

                const txResult = await sendTransactionWithVerification(transaction, {
          description: 'Деплой SBT коллекции',
          onStatusUpdate: (status) => {
            setTransactionStatus(prev => ({ ...prev, message: status }));
          }
        });

        if (txResult.success && txResult.hash) {
          try {
            // Создаем SBT зону в базе данных
            const sbtCollectionAddr = result.messages[0]?.address || '';
            const zonePrice = calculateZonePrice(domainName, false);

            const zoneData = {
              name: `${domainName}.ton`,
              address: domainAddress,
              collectionAddress: sbtCollectionAddr,
              proxy: false,
              owner: address,
              status: 'active',
              zonePrice: zonePrice,
              currentID: idValue
            };

            await createZoneInDatabase(zoneData);

            // СПИСЫВАЕМ оплаченную попытку ПОСЛЕ успешного создания зоны
            const lengthKey = getZoneLengthKey(domainLength);
            if (lengthKey) {
              await consumePaymentAttempt('sbt', lengthKey);
              console.log('✅ Оплаченная попытка для SBT зоны списана');
            }

            if (txResult.confirmedInBlock) {
              showSnackbar(t('sbtCollectionDeployedSuccessfullyConfirmed'), "success");
            } else {
              showSnackbar(t('sbtDeployedSentNotConfirmed'), "error");
            }
            
            setActiveStep(3);

          } catch (dbError: any) {
            console.error('❌ Database error:', dbError);
            showSnackbar(t('sbtDeployedDbError'), "error");
            setActiveStep(3);
          }
        } else {
          showSnackbar(txResult.error || t('transactionNotConfirmed'), "error");
        }
      }
    } catch (error: any) {
      console.error('❌ Deploy SBT error:', error);
      const errorMessage = error?.detail?.[0]?.msg || error?.message || t('sbtDeploymentFailed');
      showSnackbar(errorMessage, "error");
    } finally {
      setLoading(false);
      setTransactionStatus({});
    }
  }, [
    wallet, address, dispatch, showSnackbar, tonConnectUI,
    TonDnsAddress, domainName, isTestnet, paymentCompleted,
    hasPaidAttempt, createZoneInDatabase, consumePaymentAttempt,
    existingZone, domainLength, sendTransactionWithVerification, t
  ]);

  // ========== ОСТАЛЬНЫЕ ОБРАБОТЧИКИ ==========

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setDomainName('');
    setDnsMainDomainAddress('');
    setPaymentCompleted(false);
    setCreatedZoneId(null);
    setCollectionAddress('');
    setLoading(false);
    setExistingZone(null);
    setUnlinkModalOpen(false);
    setHasPaidAttempt(false);
    setTransactionStatus({});
    dispatch(resetAllDeployments());
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: ActiveTab) => {
    setActiveTab(newValue);
    handleReset();
  };

  // Проверяем URL параметры для предзаполнения
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const domainParam = params.get('domain');

    if (domainParam) {
      setDomainName(domainParam.replace('.ton', ''));
    }
  }, [activeTab]);

  // Функция для рендеринга кнопки в зависимости от шага
  const renderStepButton = (stepIndex: number) => {
    switch (stepIndex) {
      case 0:
        return (
          <Button
            variant="contained"
            onClick={handleCheckDomain}
            disabled={!domainName.trim() || domainName.length < 4 || loading}
            sx={{
              mt: 1,
              borderRadius: '25px',
              textTransform: 'none',
              minWidth: '120px',
              background: loading ? '#888' : '#4a90e2'
            }}
          >
            {loading ? t('processing') : t('continue')}
          </Button>
        );

      case 1:
        return (
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
            {hasPaidAttempt ? (
              <Button
                variant="contained"
                onClick={handleConfirmPayment}
                disabled={loading}
                sx={{
                  mt: 1,
                  borderRadius: '25px',
                  textTransform: 'none',
                  minWidth: '120px',
                  background: loading ? '#888' : '#4a90e2'
                }}
              >
                {loading ? t('processing') : t('usePaidAttempt')}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleConfirmPayment}
                disabled={loading}
                sx={{
                  mt: 1,
                  borderRadius: '25px',
                  textTransform: 'none',
                  minWidth: '120px',
                  background: loading ? '#888' : '#4a90e2'
                }}
              >
                {loading ? t('processing') : `${t('payAmount')} ${zonePrice} TON` }
              </Button>
            )}
            <Button
              onClick={handleBack}
              sx={{
                mt: 1,
                borderRadius: '25px',
                textTransform: 'none',
                minWidth: '80px'
              }}
            >
              {t('back')}
            </Button>
          </Box>
        );

      case 2:
        return activeTab === 'proxy' ? (
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
            <Button
              variant="contained"
              onClick={handleDeployBundleWithTransaction}
              disabled={loading || bundleDeployment.loading}
              sx={{
                mt: 1,
                borderRadius: '25px',
                textTransform: 'none',
                minWidth: '120px',
                background: (loading || bundleDeployment.loading) ? '#888' : '#4a90e2'
              }}
            >
              {(loading || bundleDeployment.loading) ? `⏳ ${t('deploying')}` : t('deployBundle')}
            </Button>
            <Button
              onClick={handleBack}
              sx={{
                mt: 1,
                borderRadius: '25px',
                textTransform: 'none',
                minWidth: '80px'
              }}
            >
              {t('back')}
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
            <Button
              variant="contained"
              onClick={handleDeploySBTCollection}
              disabled={!domainName.trim() || sbtCollectionDeployment.loading || loading}
              sx={{
                mt: 1,
                borderRadius: '25px',
                textTransform: 'none',
                minWidth: '120px',
                background: (sbtCollectionDeployment.loading || loading) ? '#888' : '#4a90e2'
              }}
            >
              {(sbtCollectionDeployment.loading || loading) ? t('deploying') : t('createZone')}
            </Button>
            <Button
              onClick={handleBack}
              sx={{
                mt: 1,
                borderRadius: '25px',
                textTransform: 'none',
                minWidth: '80px'
              }}
            >
              {t('back')}
            </Button>
          </Box>
        );

      default:
        return null;
    }
  };

  // Функция для рендеринга контента шага
  const renderStepContent = (stepIndex: number) => {
    switch (stepIndex) {
      case 0:
        return (
          <>
            <Typography variant="body2" sx={{ mb: 2, color: '#999' }}>
              {steps[0].description}
            </Typography>

            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
              <Input
                placeholder={t('enterDomainName')}
                value={domainName}
                onChange={(e) => {
                  const value = e.target.value.trim().toLowerCase();
                  const filtered = value.replace(/[^a-z0-9-]/g, '');
                  setDomainName(filtered);
                }}
                style={{
                  width: '280px',
                  borderRadius: '25px',
                  padding: '10px 15px'
                }}
              />
            </Box>

            {/* Отображение цены */}
            {domainName && (
              <Box sx={{ mb: 2, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: '#4a90e2', fontWeight: 'bold' }}>
                  {t('zonePrice')}: {zonePrice} TON
                </Typography>
                <Typography variant="caption" sx={{ color: '#999', fontSize: '12px' }}>
                  {activeTab === 'proxy' ? 'Proxy' : 'SBT'}
                </Typography>

                {/* Валидация длины */}
                {domainName.length > 0 && domainName.length < 4 && (
                  <Alert severity="error" sx={{ mt: 1, fontSize: '12px' }}>
                    {t('domainMinLengthError')}
                  </Alert>
                )}
              </Box>
            )}
          </>
        );

      case 1:
        return (
          <>
            <Typography variant="body2" sx={{ mb: 2, color: '#999' }}>
              {steps[1].description}
            </Typography>

            <Card className="themed-card" style={{
              marginBottom: '15px',
              padding: '15px',
              borderRadius: '10px',
              border: '2px solid #4a90e2'
            }}>
              <div style={{ marginBottom: '10px', fontWeight: 'bold', color: '#4a90e2' }}>
                {t('zoneCreationInfo')}
              </div>
              <div style={{ marginBottom: '5px' }}>
                <strong>{t('domain')}:</strong> {domainName}.ton
              </div>
              <div style={{ marginBottom: '5px' }}>
                <strong>{t('zoneType')}:</strong> {activeTab === 'proxy' ? t('proxyZone') : t('sbtZone')}
              </div>
              <div style={{ marginBottom: '5px' }}>
                <strong>{t('price')}:</strong> {zonePrice} TON
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>{t('domainLength')}:</strong> {domainLength} {t('chars')}
              </div>

              {hasPaidAttempt && (
                <Alert severity="success" sx={{ mt: 1, fontSize: '12px' }}>
                  ✅ {t('paidAttemptAvailable')}
                </Alert>
              )}

              {/* Статус транзакции */}
              {transactionStatus.message && (
                <Alert 
                  severity={transactionStatus.status === 'confirmed' ? 'success' : 
                           transactionStatus.status === 'failed' ? 'error' : 'info'}
                  sx={{ mt: 1, fontSize: '12px' }}
                >
                  {transactionStatus.message}
                  {transactionStatus.hash && (
                    <div style={{ fontSize: '10px', marginTop: '4px', wordBreak: 'break-all' }}>
                      Hash: {transactionStatus.hash.substring(0, 16)}...
                    </div>
                  )}
                </Alert>
              )}

              {checkingPayment && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <CircularProgress size={20} />
                  <Typography variant="caption" sx={{ ml: 1 }}>
                    {t('checkingPaymentAttempts')}
                  </Typography>
                </Box>
              )}
            </Card>
          </>
        );

      case 2:
        return activeTab === 'proxy' ? (
          <>
            <Typography variant="body2" sx={{ mb: 2, color: '#999' }}>
              {steps[2].description}
            </Typography>

            <Card className="themed-card" style={{
              marginBottom: '15px',
              padding: '15px',
              borderRadius: '10px',
              border: '2px solid #4a90e2'
            }}>
              <div className="themed-text" style={{ fontSize: '14px', textAlign: 'center' }}>
                <div style={{ marginBottom: '10px', fontWeight: 'bold', color: '#4a90e2' }}>
                  {t('deployingBundleCollection')}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  {t('creatingBundleForDomain')} <strong>{domainName}.ton</strong>
                </div>
                <div style={{ marginBottom: '10px', color: '#666', fontSize: '12px' }}>
                  {t('bundleWillCreateSubdomainCollection')}
                </div>
                
                {/* Статус транзакции деплоя */}
                {transactionStatus.message && (
                  <Alert 
                    severity={transactionStatus.status === 'confirmed' ? 'success' : 
                             transactionStatus.status === 'failed' ? 'error' : 'info'}
                    sx={{ mt: 1, mb: 2, fontSize: '12px' }}
                  >
                    {transactionStatus.message}
                  </Alert>
                )}

                <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <img
                    style={{ width: '150px', height: '150px', borderRadius: '15px', marginBottom: '10px' }}
                    src={`https://api.subdom.zone/api/v1/subdomain/metadata/ton/${domainName}.png`}
                    alt="subdomainPreview"
                  />
                </div>
              </div>
            </Card>
          </>
        ) : (
          <>
            <Typography variant="body2" sx={{ mb: 2, color: '#999' }}>
              {steps[2].description}
            </Typography>

            <Card className="themed-card" style={{
              marginBottom: '15px',
              padding: '15px',
              borderRadius: '10px',
              border: '2px solid #4a90e2'
            }}>
              <div className="themed-text" style={{ fontSize: '14px', textAlign: 'center' }}>
                <div style={{ marginBottom: '10px', fontWeight: 'bold', color: '#4a90e2' }}>
                  {t('creatingSbtZone')}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  {t('zonePaidConfirmation')}<strong> {domainName}.ton</strong>
                </div>
                <div style={{ marginBottom: '10px', color: '#666', fontSize: '12px' }}>
                  {t('paidAttemptWillBeConsumed')}
                </div>

                {/* Статус транзакции деплоя */}
                {transactionStatus.message && (
                  <Alert 
                    severity={transactionStatus.status === 'confirmed' ? 'success' : 
                             transactionStatus.status === 'failed' ? 'error' : 'info'}
                    sx={{ mt: 1, mb: 2, fontSize: '12px' }}
                  >
                    {transactionStatus.message}
                  </Alert>
                )}
              </div>
            </Card>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Page back={true}>
      {snackbar}

      {/* Модальное окно подтверждения отвязки */}
      <UnlinkConfirmationModal
        open={unlinkModalOpen}
        onClose={() => setUnlinkModalOpen(false)}
        onConfirm={handleUnlinkConfirm}
        domainName={domainName}
        loading={unlinkingInProgress}
      />

      <Banner
        type="section"
        header={t('createSubdomZone')}
        subheader={t('updateTONDNSUtility')}
        description={t('enterDomainNameSteps')}
        style={{ textAlign: 'center', marginRight: '20px', marginLeft: '20px' }}
      />

      {/* Tabs для выбора режима */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              color: isDark ? '#ccc' : '#666',
              '&.Mui-selected': {
                color: isDark ? '#FFD700' : '#3B82F6',
              },
            },
          }}
        >
          <Tab label={t('proxyForSale')} value="proxy" />
          <Tab label={t('sbtNotForSale')} value="sbt" />
        </Tabs>
      </Box>

      {/* Баннер с особенностями для Proxy режима */}
      {activeTab === 'proxy' && (
        <div className="bannerWrapper" style={{ display: 'flex', width: '100%', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
          <Card style={{
            margin: '10px',
            padding: '15px',
            borderRadius: '10px',
            background: isDark
              ? 'linear-gradient(to bottom, #1a1a1a, #2a2a2a)'
              : 'linear-gradient(to bottom, #f5f5f5, #e5e5e5)',
            border: isDark ? '2px solid #FFD700' : '2px solid #3B82F6',
            maxWidth: '425px',
          }}>
            <div style={{
              color: isDark ? '#fff' : '#333',
              fontSize: '14px',
              textAlign: 'left'
            }}>
              <div style={{
                fontWeight: 'bold',
                marginBottom: '15px',
                textAlign: 'center',
                color: isDark ? '2px solid #FFD700' : '2px solid #3B82F6',
                fontSize: '16px'
              }}>
                {t('proxyZoneFeatures')}
              </div>
              <div style={{
                maxHeight: '300px',
                overflowY: 'auto',
                paddingRight: '10px'
              }}>
                <ul style={{
                  paddingLeft: '20px',
                  margin: 0,
                  listStyleType: 'decimal'
                }}>
                  <li style={{ marginBottom: '10px' }}>{t('proxyZoneFeature9')}</li>
                  <li style={{ marginBottom: '10px' }}>{t('proxyZoneFeature7')}</li>
                  <li style={{ marginBottom: '10px' }}>{t('proxyZoneFeature5')}</li>
                  <li style={{ marginBottom: '10px' }}>{t('proxyZoneFeature6')}</li>
                  <li style={{ marginBottom: '10px' }}>{t('proxyZoneFeature8')}</li>
                  <li style={{ marginBottom: '10px' }}>{t('proxyZoneFeature11')}</li>
                  <li style={{ marginBottom: '10px' }}>{t('proxyZoneFeature12')}</li>
                  <li style={{ marginBottom: '10px' }}>{t('proxyZoneFeature1')}</li>
                  <li style={{ marginBottom: '10px' }}>{t('proxyZoneFeature2')}</li>
                  <li style={{ marginBottom: '10px' }}>{t('proxyZoneFeature3')}</li>
                  <li style={{ marginBottom: '10px' }}>{t('proxyZoneFeature4')}</li>
                  <li style={{ marginBottom: '10px' }}>{t('proxyZoneFeature10')}</li>
                </ul>
              </div>
            </div>
          </Card>
          <div className="bannerWrapper" style={{ display: 'flex', width: '100%', justifyContent: 'center', alignItems: 'center' }}>
            <Card style={{
              margin: '10px',
              padding: '15px',
              borderRadius: '10px',
              background: isDark
                ? 'linear-gradient(to bottom, #1a1a1a, #2a2a2a)'
                : 'linear-gradient(to bottom, #f5f5f5, #e5e5e5)',
              border: isDark ? '2px solid #FFD700' : '2px solid #3B82F6',
              maxWidth: '425px',
            }}>
              <PaymentAttemptsSection
                address={address}
                colors={colors}
                isDark={isDark}
              />
            </Card>
          </div>
        </div>
      )}

      {/* Баннер с особенностями для SBT режима */}
      {activeTab === 'sbt' && (
        <div className="bannerWrapper" style={{ display: 'flex', width: '100%', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
          <Card style={{
            margin: '20px',
            padding: '15px',
            borderRadius: '10px',
            background: isDark
              ? 'linear-gradient(to bottom, #1a1a1a, #2a2a2a)'
              : 'linear-gradient(to bottom, #f5f5f5, #e5e5e5)',
            border: isDark ? '2px solid #FFD700' : '2px solid #3B82F6',
            maxWidth: '425px'
          }}>
            <div style={{
              color: isDark ? '#fff' : '#333',
              fontSize: '14px',
              textAlign: 'left'
            }}>
              <div style={{
                fontWeight: 'bold',
                marginBottom: '15px',
                textAlign: 'center',
                color: isDark ? '2px solid #FFD700' : '2px solid #3B82F6',
                fontSize: '16px'
              }}>
                {t('sbtZoneFeatures')}
              </div>
              <div style={{
                maxHeight: '300px',
                overflowY: 'auto',
                paddingRight: '10px'
              }}>
                <ul style={{
                  paddingLeft: '20px',
                  margin: 0,
                  listStyleType: 'decimal'
                }}>
                  <li style={{ marginBottom: '10px' }}>{t('sbtZoneFeature9')}</li>
                  <li style={{ marginBottom: '10px' }}>{t('sbtZoneFeature8')}</li>
                  <li style={{ marginBottom: '10px' }}>{t('sbtZoneFeature6')}</li>
                  <li style={{ marginBottom: '10px' }}>{t('sbtZoneFeature7')}</li>
                  <li style={{ marginBottom: '10px' }}>{t('sbtZoneFeature11')}</li>
                  <li style={{ marginBottom: '10px' }}>{t('sbtZoneFeature12')}</li>
                  <li style={{ marginBottom: '10px' }}>{t('sbtZoneFeature1')}</li>
                  <li style={{ marginBottom: '10px' }}>{t('sbtZoneFeature3')}</li>
                  <li style={{ marginBottom: '10px' }}>{t('sbtZoneFeature2')}</li>
                  <li style={{ marginBottom: '10px' }}>{t('sbtZoneFeature5')}</li>
                  <li style={{ marginBottom: '10px' }}>{t('sbtZoneFeature4')}</li>
                  <li style={{ marginBottom: '10px' }}>{t('sbtZoneFeature10')}</li>
                </ul>
              </div>
            </div>
          </Card>
          <div className="bannerWrapper" style={{ display: 'flex', width: '100%', justifyContent: 'center', alignItems: 'center' }}>
            <Card style={{
              margin: '10px',
              padding: '0px 15px 15px 15px',
              borderRadius: '10px',
              background: isDark
                ? 'linear-gradient(to bottom, #1a1a1a, #2a2a2a)'
                : 'linear-gradient(to bottom, #f5f5f5, #e5e5e5)',
              border: isDark ? '2px solid #FFD700' : '2px solid #3B82F6',
              maxWidth: '425px',
            }}>
              <PaymentAttemptsSection
                address={address}
                colors={colors}
                isDark={isDark}
              />
            </Card>
          </div>
        </div>
      )}

      {/* Основной контент страницы */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        py: 4,
        px: 2,
        marginBottom: '120px'
      }}>
        <Box sx={{ maxWidth: 425, width: '100%' }}>
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel><div style={{ color: isDark ? "white" : 'black' }}>{step.label}</div></StepLabel>
                <StepContent>
                  {renderStepContent(index)}
                  {renderStepButton(index)}
                </StepContent>
              </Step>
            ))}
          </Stepper>

          {/* Completion message */}
          {activeStep === steps.length && (
            <Paper square elevation={0} sx={{
              p: 3,
              mt: 2,
              textAlign: 'center',
              background: 'linear-gradient(to bottom, #1a1a1a, #2a2a2a)',
              border: '2px solid #4ade80',
              borderRadius: '10px'
            }}>
              <Typography sx={{ mb: 2, color: '#4ade80', fontWeight: 'bold' }}>
                🎉 {t('allStepsCompleted')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: '#ccc' }}>
                {activeTab === 'proxy' ? t('proxyBundleDeployed') : t('sbtCollectionDeployed')}
              </Typography>

              {(bundleDeployment?.address || sbtCollectionDeployment.address) && (
                <Card className="themed-card" style={{
                  marginBottom: '15px',
                  padding: '15px',
                  borderRadius: '10px',
                  border: '2px solid #4ade80'
                }}>
                  <div className="themed-text" style={{ fontSize: '14px' }}>
                    <div style={{ marginBottom: '10px', textAlign: 'center', color: '#4ade80', fontWeight: 'bold' }}>
                      ✅ {activeTab === 'proxy' ? t('bundleDeployedSuccessfully') : t('sbtCollectionDeployedSuccessfully')}
                    </div>

                    {activeTab === 'proxy' && bundleDeployment?.address && (
                      <div style={{ marginBottom: '10px', wordBreak: 'break-all', fontSize: '12px' }}>
                        <strong>{t('address')}:</strong>
                        <br />
                        <a
                          href={`${isTestnet ? "https://testnet.tonviewer.com/" : "https://tonviewer.com/"}${bundleDeployment.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#4a90e2', textDecoration: 'none' }}
                        >
                          {bundleDeployment.address}
                        </a>
                      </div>
                    )}

                    {activeTab === 'sbt' && sbtCollectionDeployment.address && (
                      <div style={{ marginBottom: '10px', wordBreak: 'break-all', fontSize: '12px' }}>
                        <strong>{t('address')}:</strong>
                        <br />
                        <a
                          href={`${isTestnet ? "https://testnet.tonviewer.com/" : "https://tonviewer.com/"}${sbtCollectionDeployment.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#4a90e2', textDecoration: 'none' }}
                        >
                          {sbtCollectionDeployment.address}
                        </a>
                      </div>
                    )}

                    <div style={{ marginBottom: '10px', textAlign: 'center', color: '#4ade80', fontWeight: 'bold' }}>
                      ✅ {t('subdomainCollectionCreated')}
                    </div>
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <img
                        style={{ width: '200px', height: '200px', borderRadius: '25px', marginBottom: '15px' }}
                        src={activeTab === 'proxy'
                          ? `https://api.subdom.zone/api/v1/subdomain/metadata/ton/${domainName}.png`
                          : `https://api.subdom.zone/api/v1/sbt-subdomain/metadata/ton/${domainName}.png`
                        }
                        alt="subdomainImage"
                      />
                    </div>
                  </div>
                </Card>
              )}

              <Button
                onClick={handleReset}
                sx={{
                  borderRadius: '25px',
                  textTransform: 'none',
                  background: '#4ade80',
                  color: '#000',
                  '&:hover': {
                    background: '#3ec970'
                  }
                }}
              >
                {t('startOver')}
              </Button>
            </Paper>
          )}
        </Box>
      </Box>
    </Page>
  );
};

export { CreateCollectionPage };
