// src/pages/CreateCollectionPage/CreateCollectionPageEnhanced.tsx
// Обновленная версия с интегрированным сервисом проверки транзакций

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ScanProgressLoader } from '@/components/ScanProgressLoader';
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
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

import { RootState } from '@/store/rootReducer';
import { useTypedDispatch } from '../../hooks/useTypeDispatch';
import {
  deployBundle,
  DeployBundlePayload,
  deploySBTCollectionWithDns,
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
import { track } from '@/utils/analytics';
import { createAuctionUrl } from '@/utils/urlParams';
import { sanitizeDomainLabelInput, encodeDomainLabel } from '@/utils/domainPunycode';
import { CustomDomainSelector } from './CustomDomainSelector';
import { ShareButton } from '@/components/ShareButton/ShareButton';
import { useTutorial } from '@/contexts/TutorialContext';
import { addOptimisticCollection } from '@/services/blockchainItems/blockchain-items-slice';
import { cleanZoneDisplayName } from '@/services/blockchainItems/blockchain-items-utils';
import { upsertPlatformCacheEntity } from '@/services/blockchainItems/platformCacheClient';
import { TutorialTooltip } from '@/components/Tutorial/TutorialTooltip';

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

// Компонент модального окна подтверждения отвязки — кастомный оверлей вместо
// голого MUI Dialog (визуально не сочетался с остальным приложением, где
// модалки — свой overlay+card в стиле AlphaTestModal.tsx/ProfileWidget.tsx).
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

  const colors = {
    background: isDark ? '#121212' : '#FFFFFF',
    text: isDark ? '#E5E5E5' : '#1F2937',
    textSecondary: isDark ? '#9CA3AF' : '#6B7280',
    border: isDark ? '#333333' : '#E5E7EB',
    shadow: isDark ? 'rgba(255, 215, 0, 0.35)' : 'rgba(59, 130, 246, 0.35)',
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={() => { if (!loading) onClose(); }}
    >
      <div
        style={{
          backgroundColor: colors.background,
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '400px',
          width: '100%',
          border: `1px solid ${colors.border}`,
          boxShadow: `0 10px 40px ${colors.shadow}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: '40px', textAlign: 'center', marginBottom: '12px' }}>⚠️</div>
        <h3
          style={{
            margin: '0 0 12px 0',
            fontSize: '17px',
            fontWeight: 700,
            color: colors.text,
            textAlign: 'center',
            fontFamily: 'monospace',
          }}
        >
          {t('attention')}
        </h3>
        <p
          style={{
            margin: '0 0 8px 0',
            fontSize: '13px',
            color: colors.text,
            lineHeight: 1.5,
            textAlign: 'center',
          }}
        >
          <strong>{domainName}.ton</strong>
          {' '}{t('collectionAlreadyAttached')}
        </p>
        <p
          style={{
            margin: '0 0 12px 0',
            fontSize: '13px',
            color: colors.text,
            opacity: 0.85,
            lineHeight: 1.5,
            textAlign: 'center',
          }}
        >
          {t('unlinkConfirmationQuestion')}
        </p>
        <p
          style={{
            margin: '0 0 20px 0',
            fontSize: '12px',
            color: '#ff9800',
            lineHeight: 1.4,
            textAlign: 'center',
          }}
        >
          ⚠️ {t('unlinkWarning')}
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.text,
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            {t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: loading ? colors.border : '#f44336',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 700,
              cursor: loading ? 'default' : 'pointer',
            }}
          >
            {loading ? t('processing') : t('unlinkAndCreateNew')}
          </button>
        </div>
      </div>
    </div>
  );
};

// Модалка про нюансы Proxy-зоны — показывается КАЖДЫЙ раз при выборе таба
// Proxy (не только один раз на кошелёк, юзер явно попросил не прятать её
// после первого раза), в самом начале флоу, до всякой оплаты. Тот же
// overlay+card паттерн, что и UnlinkConfirmationModal выше.
interface ProxyRiskModalProps {
  open: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

const ProxyRiskModal: React.FC<ProxyRiskModalProps> = ({ open, onBack, onConfirm }) => {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';
  const { t } = useLanguage();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (open) setChecked(false);
  }, [open]);

  const colors = {
    background: isDark ? '#121212' : '#FFFFFF',
    text: isDark ? '#E5E5E5' : '#1F2937',
    border: isDark ? '#333333' : '#E5E7EB',
    shadow: isDark ? 'rgba(255, 215, 0, 0.35)' : 'rgba(59, 130, 246, 0.35)',
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: colors.background,
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '420px',
          width: '100%',
          border: `1px solid ${colors.border}`,
          boxShadow: `0 10px 40px ${colors.shadow}`,
        }}
      >
        <div style={{ fontSize: '36px', textAlign: 'center', marginBottom: '8px' }}>🌐</div>
        <h3
          style={{
            margin: '0 0 14px 0',
            fontSize: '17px',
            fontWeight: 700,
            color: colors.text,
            textAlign: 'center',
            fontFamily: 'monospace',
          }}
        >
          {t('proxyRiskModalTitle')}
        </h3>

        <ul style={{ margin: '0 0 16px 0', padding: '0 0 0 18px', fontSize: '13px', color: colors.text, lineHeight: 1.6 }}>
          <li>{t('proxyRiskModalPointWrapper')}</li>
          <li>{t('proxyRiskModalPointMarket')}</li>
          <li>{t('proxyRiskModalPointTonviewer')}</li>
        </ul>

        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            fontSize: '12px',
            color: colors.text,
            marginBottom: '20px',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            style={{ marginTop: '2px', flexShrink: 0, cursor: 'pointer' }}
          />
          {t('proxyRiskModalCheckbox')}
        </label>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onBack}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.text,
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t('back')}
          </button>
          <button
            onClick={onConfirm}
            disabled={!checked}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: checked ? '#4a90e2' : colors.border,
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 700,
              cursor: checked ? 'pointer' : 'default',
            }}
          >
            {t('proxyRiskModalNext')}
          </button>
        </div>
      </div>
    </div>
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
  // Те же полные имена ("name.ton"), что использует checkDomainExists ниже —
  // нужен набор для O(1)-подсветки в CustomDomainSelector.
  const domainsWithSbtZone = React.useMemo(
    () => new Set(sbtCollections.map((c) => c.domain).filter((d): d is string => !!d)),
    [sbtCollections]
  );

  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';
  const { t } = useLanguage();

  // Переключатель "ввести домен вручную" / "выбрать из своих доменов" на шаге 1
  const [domainInputMode, setDomainInputMode] = useState<'manual' | 'select'>('manual');

  const API_PAYLOAD_URL=import.meta.env.VITE_API_SC_PAYLOAD_URL;

  // Состояния
  // По умолчанию SBT — безопасный обратимый режим, чтобы юзер, тыкающий не глядя,
  // не попал сразу на необратимый Proxy.
  const [activeTab, setActiveTab] = useState<ActiveTab>('sbt');
  const [proxyRiskModalOpen, setProxyRiskModalOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  // Блок "Особенности" сворачивается по умолчанию — раньше длинный список
  // из 12 пунктов занимал весь экран, и важный контент ниже (форма ввода
  // домена и т.д.) был виден только после скролла мимо него.
  const [proxyFeaturesExpanded, setProxyFeaturesExpanded] = useState(false);
  const [sbtFeaturesExpanded, setSbtFeaturesExpanded] = useState(false);
  const [paymentAttemptsExpanded, setPaymentAttemptsExpanded] = useState(false);
  // domainName остаётся punycode/ASCII-формой — так его используют все
  // остальные места этого файла (ончейн-лукапы, payload'ы, metadata URI).
  // domainNameDisplay — то, что реально видит и печатает юзер (юникод),
  // отдельное состояние только для value инпута.
  const [domainName, setDomainName] = useState('');
  const [domainNameDisplay, setDomainNameDisplay] = useState('');
  const domainInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const tutorial = useTutorial();

  // Переход сюда из промо-модалки (PromoRevealModal, "Создать SBT-зону" после
  // подарка при регистрации) — ?promo=sbt: убеждаемся, что открыта именно
  // SBT-вкладка (и так дефолт, но явно на случай будущих изменений), и сразу
  // фокусируем ввод домена, чтобы юзеру не пришлось самому тыкать в поле.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const promo = params.get('promo');
    if (promo === 'sbt' || promo === 'proxy') {
      setActiveTab(promo);
      const id = window.setTimeout(() => domainInputRef.current?.focus(), 300);
      return () => window.clearTimeout(id);
    }
  }, [location.search]);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- строго один раз на
  // маунт, см. тот же комментарий в ActiveAuctions.tsx: ensureData меняет
  // идентичность после каждого fetch, зависимость от неё самой вызывала
  // повторные срабатывания эффекта.
  useEffect(() => {
    ensureData();
  }, []);

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
      action?: string;
      onStatusUpdate?: (status: string) => void;
    } = {}
  ): Promise<TransactionResult> => {
    const { description = 'Транзакция', action = 'unknown', onStatusUpdate } = options;

    try {
      onStatusUpdate?.(`Отправка ${description}...`);

      const result = await TransactionService.sendTransaction(
        tonConnectUI,
        transaction,
        {
          network: isTestnet ? 'testnet' : 'mainnet',
          maxRetries: 3,
          timeout: 60000,
          verifyBlockchain: true,
          action
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
  // Возвращает найденную зону напрямую (не только через setExistingZone) —
  // вызывающий код не может полагаться на state сразу после await: React не
  // гарантирует, что setExistingZone успеет примениться до следующей строки
  // в той же функции, из-за чего проверка "domainExists && existingZone" в
  // handleCheckDomain работала со сдвигом на один рендер (срабатывала только
  // на следующей попытке, когда state уже был из прошлого вызова).
  const checkDomainExists = useCallback(async (
    domain: string
  ): Promise<{ collectionAddress: string; name: string; currentId: number } | null> => {
    try {
      const fullDomainName = `${domain}.ton`;
      console.log(`🔍 Проверяем существование SBT-зоны ончейн: ${fullDomainName}`);

      const candidates = sbtCollections.filter((c) => c.domain === fullDomainName);

      if (candidates.length === 0) {
        console.log(`✅ SBT-зона на ${fullDomainName} не найдена ончейн, можно создавать`);
        return null;
      }

      let latest: { collectionAddress: string; id: number } | null = null;
      for (const candidate of candidates) {
        const id = await getCollectionId(candidate.address, isTestnet);
        if (!latest || id > latest.id) {
          latest = { collectionAddress: candidate.address, id };
        }
      }

      if (!latest) return null;

      console.log(`⚠️ Найдена текущая SBT-зона на домене ончейн:`, latest);
      const zoneInfo = {
        collectionAddress: latest.collectionAddress,
        name: fullDomainName,
        currentId: latest.id,
      };
      setExistingZone(zoneInfo);
      return zoneInfo;
    } catch (error: any) {
      console.error('❌ Ошибка при ончейн-проверке домена:', error);
      showSnackbar(t('zoneNotInDatabase'), "error");
      return null;
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

    const existing = await checkDomainExists(domainName);

    if (existing) {
      setUnlinkModalOpen(true);
      return;
    }

    setActiveStep(1);
  }, [domainName, checkDomainExists, showSnackbar, t]);

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
        // 3. Уведомляем бота о деактивации — relay-only, не требует DB-id.
        // Плюс легаси-путь: если это старая зона с реальным DB-id, заодно
        // обновляем её статус в базе (для админ-панели и т.п. читателей).
        try {
          await apiService.notifyZoneDeactivated({
            name: zone.name,
            address: zone.collectionAddress,
          });

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
          action: 'deploy_proxy_zone',
          onStatusUpdate: (status) => {
            setTransactionStatus(prev => ({ ...prev, message: status }));
          }
        });

        if (txResult.success && txResult.hash) {
          // Raw-формат обязателен: platform_zones_cache ключуется по
          // collectionAddress строкой "как есть" (ON CONFLICT), а краулер
          // пишет туда адрес в raw-формате (in_msg.source тонцентра). Если
          // сюда попадёт userfriendly-строка того же адреса — в кэше
          // появится вторая "осиротевшая" строка для той же коллекции,
          // которую краулер никогда не сможет domatch'ить и долечить.
          const collectionAddr = convertUserFriendlyToRaw(result.messages[0]?.address || '');
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

            // Кэш платформы (бэкенд) обновляется кроулером раз в 15 мин — без
            // этого только что созданная зона не видна в селекторе на странице
            // создания субдомена, пока не пройдёт следующий цикл. Апсертим
            // сразу (fire-and-forget) + кладём в Redux оптимистично, чтобы
            // селектор увидел зону немедленно, без ожидания даже этого запроса.
            dispatch(addOptimisticCollection({
              address: collectionAddr,
              name: `${domainName}.ton`,
              type: 'proxy',
              // Реальные (пришедшие с ончейна) записи хранят creator_address в
              // raw-формате (из in_msg.source тонцентра) — если положить сюда
              // friendly-адрес из useTonAddress(), фильтр по владельцу (сравнение
              // с convertUserFriendlyToRaw(userAddress)) никогда не совпадёт и
              // только что созданная зона не найдётся в селекторе.
              owner_address: convertUserFriendlyToRaw(address),
              creator_address: convertUserFriendlyToRaw(address),
            }));
            upsertPlatformCacheEntity('zones', isTestnet, {
              collectionAddress: collectionAddr,
              name: `${domainName}.ton`,
              isProxy: 1,
              wrapperAddress: null,
              // Бэкенд-кэш при чтении маппит creator_address = ownerAddress
              // (platformCacheClient.ts) — та же raw/friendly нестыковка, что и
              // в оптимистичной Redux-вставке выше, поэтому конвертируем и тут.
              ownerAddress: convertUserFriendlyToRaw(address),
            });

            // СПИСЫВАЕМ оплаченную попытку ПОСЛЕ успешного деплоя
            const lengthKey = getZoneLengthKey(domainLength);
            if (lengthKey) {
              await consumePaymentAttempt('proxy', lengthKey);
              console.log('✅ Оплаченная попытка для Proxy зоны списана');
            }

            if (txResult.confirmedInBlock) {
              track('zone_created', { type: 'proxy' });
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
          track('zone_creation_failed', { type: 'proxy', reason: (txResult.error || 'not_confirmed').slice(0, 120) });
          showSnackbar(txResult.error || t('transactionNotConfirmed'), "error");
        }
      }
    } catch (error) {
      console.error('Deploy bundle error:', error);
      track('zone_creation_failed', { type: 'proxy', reason: (error instanceof Error ? error.message : 'unknown').slice(0, 120) });
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

      // deploySBTCollectionWithDns деплоит коллекцию И проставляет next_resolver
      // домена на неё одной транзакцией (2 сообщения) — раньше SBT-зона
      // деплоилась без привязки резолвера вообще (в отличие от Proxy, где это
      // уже часть deployBundle).
      const result = await dispatch(
        deploySBTCollectionWithDns({ ...sbtPayload, dns_item_address: domainAddress })
      ).unwrap();

      if (result.messages && result.messages.length > 0) {
        console.log('🔄 Отправляю транзакцию SBT в TonConnect...');

        const transaction = {
          validUntil: result.validUntil || Math.floor(Date.now() / 1000) + 240,
          messages: result.messages
        };

                const txResult = await sendTransactionWithVerification(transaction, {
          description: 'Деплой SBT коллекции',
          action: 'deploy_sbt_zone',
          onStatusUpdate: (status) => {
            setTransactionStatus(prev => ({ ...prev, message: status }));
          }
        });

        if (txResult.success && txResult.hash) {
          try {
            // Создаем SBT зону в базе данных
            // Raw-формат — см. аналогичный комментарий в Proxy-ветке выше.
            const sbtCollectionAddr = convertUserFriendlyToRaw(result.messages[0]?.address || '');
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

            // См. аналогичный комментарий в Proxy-ветке выше — апсерт в
            // бэкенд-кэш + оптимистичная вставка в Redux сразу после деплоя.
            dispatch(addOptimisticCollection({
              address: sbtCollectionAddr,
              name: `${domainName}.ton`,
              type: 'sbt',
              // См. аналогичный комментарий в Proxy-ветке выше — creator_address
              // должен быть в raw-формате, как у реальных ончейн-записей.
              owner_address: convertUserFriendlyToRaw(address),
              creator_address: convertUserFriendlyToRaw(address),
            }));
            upsertPlatformCacheEntity('zones', isTestnet, {
              collectionAddress: sbtCollectionAddr,
              name: `${domainName}.ton`,
              isProxy: 0,
              wrapperAddress: null,
              // Бэкенд-кэш при чтении маппит creator_address = ownerAddress
              // (platformCacheClient.ts) — та же raw/friendly нестыковка, что и
              // в оптимистичной Redux-вставке выше, поэтому конвертируем и тут.
              ownerAddress: convertUserFriendlyToRaw(address),
            });

            // Шаг обучалки "создать зону" (Блок 2, использует бесплатную
            // промо-попытку) — засчитывается по факту успешного деплоя.
            if (tutorial.active && !tutorial.isStepDone('zone_selected')) {
              tutorial.recordStep('zone_selected');
            }

            // СПИСЫВАЕМ оплаченную попытку ПОСЛЕ успешного создания зоны
            const lengthKey = getZoneLengthKey(domainLength);
            if (lengthKey) {
              await consumePaymentAttempt('sbt', lengthKey);
              console.log('✅ Оплаченная попытка для SBT зоны списана');
            }

            if (txResult.confirmedInBlock) {
              track('zone_created', { type: 'sbt' });
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
          track('zone_creation_failed', { type: 'sbt', reason: (txResult.error || 'not_confirmed').slice(0, 120) });
          showSnackbar(txResult.error || t('transactionNotConfirmed'), "error");
        }
      }
    } catch (error: any) {
      console.error('❌ Deploy SBT error:', error);
      const errorMessage = error?.detail?.[0]?.msg || error?.message || t('sbtDeploymentFailed');
      track('zone_creation_failed', { type: 'sbt', reason: String(errorMessage).slice(0, 120) });
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
    setDomainNameDisplay('');
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

  const handleGoToCreateSubdomain = () => {
    const hashUrl = createAuctionUrl({ zone: `${domainName}.ton` }).replace(/^\/?#/, '');
    navigate(hashUrl);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: ActiveTab) => {
    // Proxy — необратимый режим (см. модалку ниже), перед входом в него
    // всегда показываем нюансы, даже если юзер уже видел их раньше на
    // предыдущей zone. SBT выбирается сразу, без модалки.
    if (newValue === 'proxy' && activeTab !== 'proxy') {
      setProxyRiskModalOpen(true);
      return;
    }
    setActiveTab(newValue);
    handleReset();
  };

  const handleProxyRiskConfirm = () => {
    setProxyRiskModalOpen(false);
    setActiveTab('proxy');
    handleReset();
    if (address) {
      apiService.acknowledgeProxyRisk(address).catch(() => {});
    }
  };

  // Проверяем URL параметры для предзаполнения
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const domainParam = params.get('domain');

    if (domainParam) {
      // domainParam может прийти "грязным" (например, из уже зарезолвленного
      // on-chain имени коллекции вида "4044 DNS Domains") — .replace('.ton', '')
      // такой суффикс не ловит, и грязное имя намертво прошивалось в suffix_uri
      // новой коллекции (баг от 2026-08-08: картинки/id зоны показывали
      // "... DNS Domains" вместо "....ton"). cleanZoneDisplayName — та же
      // очистка, что уже применяется при отображении имени в карточке.
      const cleanedDomainParam = cleanZoneDisplayName(domainParam).replace(/\.ton$/i, '');
      console.log('[CreateCollectionPage] domainParam prefill:', { raw: domainParam, cleaned: cleanedDomainParam });
      setDomainName(cleanedDomainParam);
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

            {tutorial.active && tutorial.isStepDone('domain_answered') && !tutorial.isStepDone('zone_selected') && (
              <TutorialTooltip
                blockLabel={t('tutorialBlock2Label') || 'Блок 2'}
                stepLabel={t('tutorialStep1Label') || 'Шаг 1'}
                text={t('tutorialCreateZoneIntro') || 'Здесь вы создадите SBT-зону на своём домене, потратив бесплатную попытку.'}
                buttons={[]}
                style={{ position: 'static', width: '100%', maxWidth: 'none', marginBottom: '14px' }}
              />
            )}

            <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              {/* Ручной ввод */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', width: '280px' }}>
                <span
                  style={{
                    flexShrink: 0,
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    border: `2px solid ${isDark ? '#FFD700' : '#3B82F6'}`,
                    background: domainInputMode === 'manual' ? (isDark ? '#FFD700' : '#3B82F6') : 'transparent',
                    transition: 'background 0.15s ease',
                  }}
                />
                <Input
                  ref={domainInputRef}
                  placeholder={t('enterDomainName')}
                  value={domainNameDisplay}
                  readOnly={domainInputMode !== 'manual'}
                  onClick={() => setDomainInputMode('manual')}
                  onChange={(e) => {
                    const sanitized = sanitizeDomainLabelInput(e.target.value);
                    setDomainNameDisplay(sanitized);
                    setDomainName(encodeDomainLabel(sanitized));
                  }}
                  style={{
                    width: '100%',
                    borderRadius: '25px',
                    padding: '10px 15px',
                    opacity: domainInputMode === 'manual' ? 1 : 0.5,
                  }}
                />
              </Box>

              {/* Выбор из своих доменов */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', width: '280px' }}>
                <span
                  style={{
                    flexShrink: 0,
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    border: `2px solid ${isDark ? '#FFD700' : '#3B82F6'}`,
                    background: domainInputMode === 'select' ? (isDark ? '#FFD700' : '#3B82F6') : 'transparent',
                    transition: 'background 0.15s ease',
                  }}
                />
                <CustomDomainSelector
                  dnsCollectionAddress={TonDnsAddress}
                  ownerAddress={address || null}
                  isTestnet={isTestnet}
                  domainsWithSbtZone={domainsWithSbtZone}
                  selectedDomain={domainInputMode === 'select' ? domainNameDisplay : ''}
                  onDomainChange={(name) => {
                    setDomainNameDisplay(name);
                    setDomainName(encodeDomainLabel(name));
                  }}
                  isDark={isDark}
                  disabled={domainInputMode !== 'select'}
                  onActivate={() => setDomainInputMode('select')}
                />
              </Box>
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

                {(loading || bundleDeployment.loading) && (
                  <ScanProgressLoader label={t('deploying') || 'Деплой'} textColor="#666" />
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

                {(sbtCollectionDeployment.loading || loading) && (
                  <ScanProgressLoader label={t('deploying') || 'Деплой'} textColor="#666" />
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

      {/* Нюансы Proxy-зоны — перед входом в необратимый режим, до всякой оплаты */}
      <ProxyRiskModal
        open={proxyRiskModalOpen}
        onBack={() => setProxyRiskModalOpen(false)}
        onConfirm={handleProxyRiskConfirm}
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
          <Tab label={t('sbtNotForSale')} value="sbt" />
          <Tab label={t('proxyForSale')} value="proxy" />
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
            width: '100%',
          }}>
            {/* Раньше "Особенности" и "Оплаченные попытки" были двумя
                отдельными полноширинными карточками друг под другом —
                вместе занимали много места ещё до того, как их открыли.
                Теперь это ряд из двух компактных заголовков-кнопок; клик
                разворачивает контент на всю ширину этой карточки, а не в
                узкую половину. PaymentAttemptsSection получил hideHeader/
                forceExpanded, чтобы её тогл управлялся отсюда же. */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setProxyFeaturesExpanded((v) => !v)}
                style={{
                  flex: 1,
                  fontWeight: 'bold',
                  color: isDark ? '#fff' : '#333',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 6px',
                  borderRadius: '8px',
                  border: `1px solid ${isDark ? '#FFD700' : '#3B82F6'}`,
                  background: 'transparent',
                  minWidth: 0,
                }}
              >
                <span style={{ textAlign: 'center', wordBreak: 'break-word', minWidth: 0 }}>{t('proxyZoneFeatures')}</span>
                <span style={{ fontSize: '16px', lineHeight: 1, flexShrink: 0 }}>{proxyFeaturesExpanded ? '−' : '+'}</span>
              </button>
              <button
                onClick={() => setPaymentAttemptsExpanded((v) => !v)}
                style={{
                  flex: 1,
                  fontWeight: 'bold',
                  color: isDark ? '#fff' : '#333',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 6px',
                  borderRadius: '8px',
                  border: `1px solid ${isDark ? '#FFD700' : '#3B82F6'}`,
                  background: 'transparent',
                  minWidth: 0,
                }}
              >
                {/* Длиннее, чем "Особенности" — без break-word текст толкал
                    бы плюсик за границу узкой половины кнопки. */}
                <span style={{ textAlign: 'center', wordBreak: 'break-word', minWidth: 0 }}>{t('paymentAttemptsTitle')}</span>
                <span style={{ fontSize: '16px', lineHeight: 1, flexShrink: 0 }}>{paymentAttemptsExpanded ? '−' : '+'}</span>
              </button>
            </div>

            {proxyFeaturesExpanded && (
              <div style={{
                color: isDark ? '#fff' : '#333',
                fontSize: '14px',
                textAlign: 'left',
                marginTop: '12px',
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
            )}
            {paymentAttemptsExpanded && (
              <div style={{ marginTop: '12px' }}>
                <PaymentAttemptsSection
                  address={address}
                  colors={colors}
                  isDark={isDark}
                  hideHeader
                  forceExpanded
                />
              </div>
            )}
          </Card>
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
            maxWidth: '425px',
            width: '100%',
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setSbtFeaturesExpanded((v) => !v)}
                style={{
                  flex: 1,
                  fontWeight: 'bold',
                  color: isDark ? '#fff' : '#333',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 6px',
                  borderRadius: '8px',
                  border: `1px solid ${isDark ? '#FFD700' : '#3B82F6'}`,
                  background: 'transparent',
                  minWidth: 0,
                }}
              >
                <span style={{ textAlign: 'center', wordBreak: 'break-word', minWidth: 0 }}>{t('sbtZoneFeatures')}</span>
                <span style={{ fontSize: '16px', lineHeight: 1, flexShrink: 0 }}>{sbtFeaturesExpanded ? '−' : '+'}</span>
              </button>
              <button
                onClick={() => setPaymentAttemptsExpanded((v) => !v)}
                style={{
                  flex: 1,
                  fontWeight: 'bold',
                  color: isDark ? '#fff' : '#333',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 6px',
                  borderRadius: '8px',
                  border: `1px solid ${isDark ? '#FFD700' : '#3B82F6'}`,
                  background: 'transparent',
                  minWidth: 0,
                }}
              >
                <span style={{ textAlign: 'center', wordBreak: 'break-word', minWidth: 0 }}>{t('paymentAttemptsTitle')}</span>
                <span style={{ fontSize: '16px', lineHeight: 1, flexShrink: 0 }}>{paymentAttemptsExpanded ? '−' : '+'}</span>
              </button>
            </div>

            {sbtFeaturesExpanded && (
              <div style={{
                color: isDark ? '#fff' : '#333',
                fontSize: '14px',
                textAlign: 'left',
                marginTop: '12px',
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
            )}
            {paymentAttemptsExpanded && (
              <div style={{ marginTop: '12px' }}>
                <PaymentAttemptsSection
                  address={address}
                  colors={colors}
                  isDark={isDark}
                  hideHeader
                  forceExpanded
                />
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Основной контент страницы */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        py: 2,
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

              <Box sx={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  onClick={handleGoToCreateSubdomain}
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
                  {t('createSubdomain')}
                </Button>
                <Button
                  onClick={handleReset}
                  sx={{
                    borderRadius: '25px',
                    textTransform: 'none',
                    border: '1px solid #4ade80',
                    color: '#4ade80',
                    '&:hover': {
                      background: 'rgba(74, 222, 128, 0.1)'
                    }
                  }}
                >
                  {t('startOver')}
                </Button>
                {activeTab === 'proxy' && (
                  <ShareButton
                    params={{ zone: `${domainName}.ton` }}
                    isDark={isDark}
                    size={44}
                    shareTitle={`Зона ${domainName}.ton на TON`}
                    shareText={`Только что создал(а) зону ${domainName}.ton — создавайте субдомены и участвуйте в аукционах!`}
                  />
                )}
              </Box>
            </Paper>
          )}
        </Box>
      </Box>
    </Page>
  );
};

export { CreateCollectionPage };
