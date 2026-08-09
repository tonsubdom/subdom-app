// tma/src/pages/AvatarSecretPage/AvatarSecretPage.tsx
//
// "Аватар / Секрет" — пишет title/description/category/picture прямо в
// dns_text#1eda записи домена (см. services/ownerMetaService.ts, портировано
// из референса вадвека). Читает это TONresistor/webdom.market — тот же
// формат, без похода на свой бэкенд.

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@telegram-apps/telegram-ui';
import { Address } from '@ton/core';
import { useTonWallet, useTonConnectUI } from '@tonconnect/ui-react';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { Page } from '@/components/Page';
import { ShowSnackbar } from '@/components/ShowSnackbar';
import { apiService } from '@/services/api';
import { TutorialTooltip } from '@/components/Tutorial/TutorialTooltip';
import { useTutorial } from '@/contexts/TutorialContext';
import { useBlockchainItems } from '@/services/blockchainItems/blockchain-items-context.tsx';
import { cleanZoneDisplayName } from '@/services/blockchainItems/blockchain-items-utils';
import { convertUserFriendlyToRaw } from '@/utils/tonUtils';
import { TransactionService } from '@/services/transactionService';
import { track } from '@/utils/analytics';
import { encodeDomainForChain, decodeDomainForDisplay } from '@/utils/domainPunycode';
import { isRealTelegramEnv } from '@/mockEnv';
import { tonsiteToGatewayUrl } from '@/utils/tonUtils';
import webdomLogo from '@/assets/webdom_logo.svg';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  buildOwnerDnsTextPayloads,
  buildOwnerPicturePayload,
  buildOwnerIconPayload,
  resolveDomainNftAddress,
  fetchAllOwnerDnsText,
  ResolvedDomain,
} from '@/services/ownerMetaService';

// Простое покрытие газа на одно change_dns_record сообщение — та же величина,
// что используется в проекте для других одиночных внутренних сообщений
// (см. renewal-транзакцию в AddSubdomainPage).
const MESSAGE_AMOUNT_NANO = '20000000'; // 0.02 TON

// tsi_icon (сырые байты, см. ownerMetaService.ts) хранит их той же
// ref-цепочкой ячеек, что и dns_text — практический потолок ~30 КБ. Берём
// с запасом; бюджет теперь считается по реальным байтам файла, а не по
// раздутой base64-строке (как было, пока картинка кодировалась в "picture").
const MAX_ICON_BYTES = 25 * 1024; // 25 КБ

// Те же категории, что в форме вадвека (Ton Site Index) — общий словарь для
// совместимости, а не свой список с нуля.
const AVATAR_CATEGORIES = [
  'DeFi',
  'NFT',
  'Mini App',
  'Media/Blog',
  'Community/Forum',
  'Tools/Infrastructure',
  'Commerce/Shop',
  'Organization',
  'Personal',
  'Other',
];

// Палитра проекта (см. ProfileWidget.tsx themeColors): тёмная тема — золото
// на чёрном, светлая — голубой на белом.
const themeColors = {
  light: {
    accent: '#3B82F6',
    accentGradient: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
    background: '#FFFFFF',
    cardBg: '#F9FAFB',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    shadow: 'rgba(59, 130, 246, 0.35)',
  },
  dark: {
    accent: '#FFD700',
    accentGradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
    background: '#121212',
    cardBg: '#1A1A1A',
    text: '#E5E5E5',
    textSecondary: '#9CA3AF',
    border: '#333333',
    shadow: 'rgba(255, 215, 0, 0.35)',
  },
};

export const AvatarSecretPage: React.FC = () => {
  const { t } = useLanguage();
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';
  const colors = themeColors[isDark ? 'dark' : 'light'];
  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();
  const isTestnet = wallet?.account?.chain === '-3';
  const navigate = useNavigate();
  const tutorial = useTutorial();
  const { proxyCollections, sbtCollections } = useBlockchainItems();

  // Блок 1 обучалки, ветка "у вас есть домен?" — Да/Нет, локальный UI-стейт,
  // сама персистится только через tutorial.recordStep('domain_answered')
  // по факту завершения выбранной ветки.
  const [tutorialDomainAnswer, setTutorialDomainAnswer] = useState<'yes' | 'no' | null>(null);

  // Список доменов юзера для мини-пикера на ветке "Да" — переиспользует ту
  // же фильтрацию по creator_address/owner_address, что и getUserZones в
  // ProfileWidget.tsx (~2875-2923), без завязки на его локальный тип Zone —
  // тут нужны только name+address для кнопок пикера.
  const tutorialUserDomains = useMemo(() => {
    const myAddress = wallet?.account?.address;
    if (!myAddress) return [];
    const normalized = convertUserFriendlyToRaw(myAddress).toLowerCase();
    const fromCollections = (cols: any[]) =>
      cols
        .filter((col) => (col.creator_address || col.owner_address || '').toLowerCase() === normalized)
        .map((col) => ({
          name: cleanZoneDisplayName(col.name || '').toLowerCase(),
          address: col.address as string,
        }));
    return [...fromCollections(proxyCollections), ...fromCollections(sbtCollections)];
  }, [wallet?.account?.address, proxyCollections, sbtCollections]);

  const [domainName, setDomainName] = useState('');
  // Домен через tonapi.io /v2/dns/ находит только корневые .ton-домены —
  // кастомные субдомены платформы (и вообще любой сторонний NFT со
  // стандартом dnsresolve) там не резолвятся. Переключатель даёт обойти
  // резолв по имени и адресовать NFT-item напрямую по адресу.
  const [resolveByAddress, setResolveByAddress] = useState(false);
  const [nftAddressInput, setNftAddressInput] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolvedDomain, setResolvedDomain] = useState<ResolvedDomain | null>(null);
  // Имя, которым реально нашли resolvedDomain (с учётом ".ton", который мог
  // подставиться фолбэком в resolveDomain) — отдельно от domainName-инпута,
  // чтобы бейдж зона/субдомен не сбивался, если юзер потом поправит инпут,
  // не нажимая "Найти" заново. При резолве по адресу остаётся null — по
  // одному лишь адресу NFT уровень (зона/субдомен) не определить.
  const [resolvedDomainName, setResolvedDomainName] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  // "picture" (URL, читаемо всей экосистемой как ссылка) и локальный файл
  // (пишется отдельно в tsi_icon, сырыми байтами) — взаимоисключающие: выбор
  // одного очищает другое, шлётся ровно одно сообщение из двух на save.
  const [pictureUrl, setPictureUrl] = useState('');
  const [iconBytes, setIconBytes] = useState<Uint8Array | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  // Что из этого реально уже прописано ончейн (для значка "уже есть запись" —
  // не проверено вживую, см. ownerMetaService.ts).
  const [hasExisting, setHasExisting] = useState({
    title: false,
    description: false,
    category: false,
    picture: false,
    icon: false,
  });
  // Значения title/description/category, прочитанные ончейн ДО правки —
  // чтобы на save понять, что из этого реально изменилось (для уведомления
  // боту, см. handleSave/notifyContentUpdated).
  const previousValuesRef = useRef({ title: '', description: '', category: '' });
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<React.ReactElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dropNotice, setDropNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Превью локального файла — либо сам файл (свежий выбор, object URL,
  // отзывается при замене/размонтировании), либо уже существующая ончейн
  // tsi_icon-запись (data:-URI из fetchAllOwnerDnsText, отзывать не нужно).
  const iconObjectUrlRef = useRef<string | null>(null);
  const displayImage = pictureUrl.trim() || iconPreview;

  useEffect(() => {
    return () => {
      if (iconObjectUrlRef.current) URL.revokeObjectURL(iconObjectUrlRef.current);
    };
  }, []);

  const showSnackbar = (message: string, type: 'success' | 'error' = 'success') => {
    setSnackbar(
      <ShowSnackbar message={message} type={type} onClose={() => setSnackbar(null)} />
    );
  };

  const resetResolvedState = () => {
    setResolveError(null);
    setResolvedDomain(null);
    setResolvedDomainName(null);
    setTitle('');
    setDescription('');
    setCategory('');
    setPictureUrl('');
    if (iconObjectUrlRef.current) {
      URL.revokeObjectURL(iconObjectUrlRef.current);
      iconObjectUrlRef.current = null;
    }
    setIconBytes(null);
    setIconPreview(null);
    setHasExisting({ title: false, description: false, category: false, picture: false, icon: false });
    previousValuesRef.current = { title: '', description: '', category: '' };
  };

  const resolveDomain = async (rawDomain: string) => {
    const trimmed = rawDomain.trim().toLowerCase();
    if (!trimmed) return;

    setResolving(true);
    resetResolvedState();
    try {
      // Раньше тут слепо приклеивался ".ton" к любому вводу без него — ломало
      // t.me-юзернеймы (ifyes.t.me) и другие не-.ton TLD (.gram и т.п.),
      // для которых ".ton" на конце в принципе не нужен. Вместо угадывания
      // TLD пробуем ввод как есть (покрывает t.me/.gram/уже полный ".ton"-
      // домен/поддомен), и только если это не нашлось — пробуем с ".ton" на
      // конце (удобство: можно писать "7707" или "sub.zone" без суффикса).
      // Юзер может печатать юникодом (кириллица, китайский и т.д.) — ончейн
      // резолвер знает только punycode-форму лейблов, кодируем перед поиском.
      const encoded = encodeDomainForChain(trimmed);
      let resolved = await resolveDomainNftAddress(encoded, isTestnet);
      let matchedName = encoded;
      if (!resolved && !encoded.endsWith('.ton')) {
        matchedName = `${encoded}.ton`;
        resolved = await resolveDomainNftAddress(matchedName, isTestnet);
      }
      if (!resolved) {
        setResolveError(t('avatarDomainNotFound') || 'Домен не найден');
        return;
      }
      setResolvedDomain(resolved);
      setResolvedDomainName(matchedName);
      loadExistingRecords(resolved.nftAddress);
    } catch (e) {
      setResolveError(t('avatarResolveError') || 'Ошибка при поиске домена');
    } finally {
      setResolving(false);
    }
  };

  // Резолв напрямую по адресу NFT-item — в обход поиска по имени, поэтому
  // работает для ЛЮБОГО NFT со стандартным get-методом dnsresolve (не только
  // корневых .ton-доменов, которых достаёт resolveDomainNftAddress через
  // tonapi.io): субдоменов платформы, чужих коллекций и т.д. Своего похода в
  // сеть не требует — сам адрес уже и есть nftAddress, дальше читает то же
  // loadExistingRecords, что и резолв по имени.
  const resolveByAddressValue = async (rawAddress: string) => {
    const trimmed = rawAddress.trim();
    if (!trimmed) return;

    setResolving(true);
    resetResolvedState();
    try {
      const nftAddress = Address.parse(trimmed).toString({ bounceable: true });
      setResolvedDomain({ nftAddress, ownerAddress: '' });
      loadExistingRecords(nftAddress);
    } catch (e) {
      setResolveError(t('avatarInvalidAddress') || 'Некорректный адрес');
    } finally {
      setResolving(false);
    }
  };

  // Подтягиваем то, что уже прописано ончейн для этого домена, чтобы юзер видел
  // текущую запись до того, как начнёт её менять (а не гадал, есть там что-то
  // или нет). Не блокирует форму — если чтение упадёт, просто останется пусто.
  const loadExistingRecords = async (nftAddress: string) => {
    setLoadingExisting(true);
    try {
      const {
        title: existingTitle,
        description: existingDescription,
        category: existingCategory,
        picture: existingPicture,
        icon: existingIcon,
      } = await fetchAllOwnerDnsText(nftAddress, isTestnet);
      if (existingTitle) setTitle(existingTitle);
      if (existingDescription) setDescription(existingDescription);
      if (existingCategory) setCategory(existingCategory);
      if (existingPicture) {
        setPictureUrl(existingPicture);
      } else if (existingIcon) {
        // picture (URL) в приоритете; tsi_icon — только фолбэк для превью,
        // не переносим его в iconBytes — пересылать нечего, пока юзер сам
        // не выберет новый файл.
        setIconPreview(existingIcon);
      }
      setHasExisting({
        title: !!existingTitle,
        description: !!existingDescription,
        category: !!existingCategory,
        picture: !!existingPicture,
        icon: !!existingIcon,
      });
      previousValuesRef.current = {
        title: existingTitle || '',
        description: existingDescription || '',
        category: existingCategory || '',
      };
    } catch {
      // Тихо игнорируем — форма просто останется пустой, юзер заполнит с нуля.
    } finally {
      setLoadingExisting(false);
    }
  };

  const handleResolve = () =>
    resolveByAddress ? resolveByAddressValue(nftAddressInput) : resolveDomain(domainName);

  // "sub.zone.ton" (3+ части) — субдомен, "zone.ton" (2 части) — корневая
  // зона. При резолве по адресу имени нет вообще — уровень не показываем.
  const resolvedLevelLabel = (): string | null => {
    if (!resolvedDomainName) return null;
    const parts = resolvedDomainName.split('.').filter(Boolean);
    if (parts.length >= 3) return t('avatarFoundSubdomain') || 'Субдомен';
    if (parts.length === 2) return t('avatarFoundZone') || 'Зона';
    return null;
  };

  // dns_text "picture" по общему стандарту (см. ownerMetaService.ts) — ЧИСТЫЙ
  // URL картинки, ничего кроме ссылки (так его читают TONresistor/
  // webdom.market/Ton Site Index). Своего хостинга у subdom нет — для
  // локального файла с диска шлём сырые байты отдельно, в легаси-категорию
  // tsi_icon (buildOwnerIconPayload), а не data:-URI внутрь "picture" (это
  // ломало бы конвенцию для внешних читателей). Выбор файла и ввод URL
  // взаимоисключающие — см. onChange инпута URL ниже.
  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setDropNotice(t('avatarDropNotUrl') || 'Это не похоже на картинку.');
      return;
    }
    if (file.size > MAX_ICON_BYTES) {
      setDropNotice(
        t('avatarFileTooBig') ||
          `Файл слишком большой для ончейн-записи (лимит ~${Math.floor(MAX_ICON_BYTES / 1024)} КБ) — сожми картинку или используй прямую ссылку (URL) на уже захостенный файл.`
      );
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      setIconBytes(new Uint8Array(buffer));
      setPictureUrl('');
      if (iconObjectUrlRef.current) URL.revokeObjectURL(iconObjectUrlRef.current);
      const objectUrl = URL.createObjectURL(file);
      iconObjectUrlRef.current = objectUrl;
      setIconPreview(objectUrl);
      setDropNotice(null);
    } catch {
      setDropNotice(t('avatarFileReadError') || 'Не удалось прочитать файл.');
    }
  };

  const handlePictureDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const uri = (
      e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')
    ).trim();
    if (/^https?:\/\//i.test(uri)) {
      setPictureUrl(uri);
      if (iconObjectUrlRef.current) {
        URL.revokeObjectURL(iconObjectUrlRef.current);
        iconObjectUrlRef.current = null;
      }
      setIconBytes(null);
      setIconPreview(null);
      setDropNotice(null);
      return;
    }
    if (e.dataTransfer.files?.length) {
      handleFile(e.dataTransfer.files[0]);
      return;
    }
    setDropNotice(t('avatarDropNotUrl') || 'Это не похоже на ссылку на картинку.');
  };

  // Приход с карточки зоны/субдомена в ProfileWidget —
  // /#/avatar-secret?address=X&domain=Y (см. handleOpenAvatarSecret в
  // ProfileWidget.tsx). address в приоритете: resolveDomain() по имени бьёт в
  // tonapi.io/v2/dns/, который знает только корневые .ton-домены — для
  // субдоменов платформы (отдельные NFT-итемы, не в индексе tonapi) это
  // всегда падало в "домен не найден". Когда адрес уже известен с карточки,
  // резолвим им напрямую (resolveByAddressValue, в обход tonapi); domain
  // используется только для отображения имени в поле поиска.
  useEffect(() => {
    const hash = window.location.hash;
    const queryString = hash.includes('?') ? hash.split('?')[1] : '';
    const params = new URLSearchParams(queryString);
    const addressFromUrl = params.get('address');
    const domainFromUrl = params.get('domain');
    if (domainFromUrl) setDomainName(domainFromUrl);
    if (addressFromUrl) {
      resolveByAddressValue(addressFromUrl);
    } else if (domainFromUrl) {
      resolveDomain(domainFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!wallet) {
      showSnackbar(t('walletNotConnected') || 'Подключите кошелёк', 'error');
      return;
    }
    if (!resolvedDomain) {
      showSnackbar(t('avatarDomainNotFound') || 'Сначала найдите домен', 'error');
      return;
    }

    setSaving(true);
    try {
      const textPayloads = await buildOwnerDnsTextPayloads({ title, description, category });
      const payloads = [...textPayloads];
      // Максимум одно из двух — иначе выйдет за лимит 4 сообщений на
      // транзакцию для v3/v4-кошельков (см. ownerMetaService.ts).
      if (pictureUrl.trim()) {
        payloads.push(await buildOwnerPicturePayload(pictureUrl.trim()));
      } else if (iconBytes) {
        payloads.push(await buildOwnerIconPayload(iconBytes));
      }

      const result = await TransactionService.sendTransaction(
        tonConnectUI,
        {
          validUntil: Math.floor(Date.now() / 1000) + 300,
          messages: payloads.map((payload) => ({
            address: resolvedDomain.nftAddress,
            amount: MESSAGE_AMOUNT_NANO,
            payload,
          })),
        },
        {
          network: isTestnet ? 'testnet' : 'mainnet',
          verifyBlockchain: true,
          action: 'save_avatar_secret',
        }
      );

      if (!result.success) {
        track('avatar_save_failed', { reason: (result.error || 'not_confirmed').slice(0, 120) });
        showSnackbar(result.error || t('avatarSaveError') || 'Транзакция не подтверждена', 'error');
        return;
      }

      track('avatar_saved');
      showSnackbar(t('avatarSaved') || 'Сохранено онchain', 'success');
      // resolvedDomainName — уже punycode-кодированная и дополненная (.ton)
      // форма, реально сматченная резолвером; domainName — сырой ввод
      // юзера, фолбэк только для пути "резолв по адресу" (там имя не сматчено).
      const notifyDomain = resolvedDomainName || domainName;
      if (notifyDomain) {
        apiService.setNetwork(isTestnet);
        const prev = previousValuesRef.current;
        apiService.notifyContentUpdated(notifyDomain, {
          pictureUrl: pictureUrl.trim() || undefined,
          title: title.trim() && title.trim() !== prev.title ? title.trim() : undefined,
          description: description.trim() && description.trim() !== prev.description ? description.trim() : undefined,
          category: category.trim() && category.trim() !== prev.category ? category.trim() : undefined,
        });
      }
      if (tutorial.active && !tutorial.isStepDone('profile_saved')) {
        tutorial.recordStep('profile_saved');
      }
    } catch (e: any) {
      console.error('Avatar/Secret save error:', e);
      track('avatar_save_failed', { reason: String(e?.message || 'unknown').slice(0, 120) });
      showSnackbar(e?.message || t('avatarSaveError') || 'Ошибка сохранения', 'error');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: '12px',
    padding: '10px 15px',
    marginBottom: '12px',
    background: isDark ? '#0D0D0D' : '#FFFFFF',
    border: `1px solid ${colors.border}`,
    color: colors.text,
  };

  const cardStyle: React.CSSProperties = {
    padding: '16px',
    borderRadius: '14px',
    marginBottom: '15px',
    background: colors.cardBg,
    border: `1px solid ${colors.border}`,
    boxShadow: `0 0 16px ${colors.shadow}`,
  };

  const buttonSx = {
    borderRadius: '25px',
    textTransform: 'none' as const,
    fontWeight: 700,
    background: colors.accentGradient,
    color: isDark ? '#000000' : '#FFFFFF',
    boxShadow: `0 4px 14px ${colors.shadow}`,
    '&:hover': { background: colors.accentGradient, opacity: 0.9 },
    '&.Mui-disabled': { background: colors.border, color: colors.textSecondary },
  };

  return (
    <Page back={true}>
      {snackbar}
      <Box
        sx={{
          maxWidth: 425,
          mx: 'auto',
          px: 2,
          pt: 2,
          pb: 1,
          textAlign: 'center',
        }}
      >
        <Typography
          sx={{
            fontFamily: 'monospace',
            fontSize: '22px',
            fontWeight: 700,
            letterSpacing: '1px',
            color: colors.accent,
            textShadow: `0 0 12px ${colors.shadow}`,
          }}
        >
          🎭 {t('avatarSecretTitle') || 'Блокчейн-Профиль'}
        </Typography>
        <Typography sx={{ fontSize: '13px', color: colors.textSecondary, mt: 0.5 }}>
          {t('avatarSecretDescription') || 'Avatar, title, description, category — теги для индексации в tonsitecatalog.ton. (Поддерживается: @ton_site_builder_bot, tonsitecatalog.ton, TONresistor, webdom.market)'}
        </Typography>
      </Box>

      <Box sx={{ maxWidth: 425, mx: 'auto', px: 2, pt: 1, pb: '180px' }}>
        <Box style={cardStyle}>
          <Typography variant="body2" sx={{ mb: 1, color: colors.textSecondary, fontFamily: 'monospace' }}>
            {t('avatarEnterDomain') || 'Домен/Субдомен'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Input
              placeholder="nft.minter.ton"
              value={domainName}
              disabled={resolveByAddress}
              onChange={(e) => setDomainName(e.target.value)}
              style={{ ...inputStyle, marginBottom: 0, flex: 1, opacity: resolveByAddress ? 0.5 : 1 }}
            />
            <Button
              sx={buttonSx}
              onClick={handleResolve}
              disabled={resolving || (resolveByAddress ? !nftAddressInput.trim() : !domainName.trim())}
            >
              {resolving ? '...' : t('avatarFind') || 'Найти'}
            </Button>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <input
              type="checkbox"
              id="avatarResolveByAddress"
              checked={resolveByAddress}
              onChange={(e) => setResolveByAddress(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <label
              htmlFor="avatarResolveByAddress"
              style={{ fontSize: '12px', color: colors.textSecondary, cursor: 'pointer' }}
            >
              {t('avatarResolveByAddressLabel') || 'Искать по адресу NFT (любой dnsresolve-стандарт: субдомены, чужие коллекции)'}
            </label>
          </Box>
          {resolveByAddress && (
            <Input
              placeholder={t('avatarNftAddressPlaceholder') || 'Адрес NFT (EQ.../UQ...)'}
              value={nftAddressInput}
              onChange={(e) => setNftAddressInput(e.target.value)}
              style={{ ...inputStyle, marginTop: '8px', marginBottom: 0 }}
            />
          )}

          {resolveError && (
            <Alert severity="error" sx={{ mt: 1, fontSize: '12px' }}>
              {resolveError}
            </Alert>
          )}
          {resolvedDomain && (
            <Alert severity="success" sx={{ mt: 1, fontSize: '12px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {displayImage && (
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      flexShrink: 0,
                      background: isDark ? '#0D0D0D' : '#FFFFFF',
                    }}
                  >
                    <img
                      src={displayImage}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  </Box>
                )}
                <span>
                  {resolvedLevelLabel() ? `${resolvedLevelLabel()} ` : ''}
                  {(t('avatarDomainFound') || 'Домен найден') + `: ${resolvedDomain.nftAddress.slice(0, 6)}...${resolvedDomain.nftAddress.slice(-4)}`}
                </span>
              </Box>
            </Alert>
          )}
        </Box>

        {resolvedDomain && (
          <Box style={cardStyle}>
            {loadingExisting && (
              <Typography sx={{ fontSize: '11px', color: colors.textSecondary, mb: 1, textAlign: 'center' }}>
                {t('avatarLoadingExisting') || 'Проверяю, что уже записано ончейн…'}
              </Typography>
            )}

            <Typography
              sx={{
                fontSize: '12px',
                color: colors.accent,
                textAlign: 'center',
                mb: 2,
                lineHeight: 1.5,
              }}
            >
              {t('avatarSetupIntro') || 'Загрузите картинку до 45кБ в png формате в качестве ончейн-аватарки вашего домена. Добавьте описание, чтобы другие пользователи могли найти ваш сайт в тонбраузере.'}
            </Typography>

            {tutorial.active &&
              tutorial.isStepDone('domain_answered') &&
              tutorial.isStepDone('zone_selected') &&
              tutorial.isStepDone('subdomain_created') &&
              !tutorial.isStepDone('profile_saved') && (
                <TutorialTooltip
                  blockLabel={t('tutorialBlock3Label') || 'Блок 3'}
                  stepLabel={t('tutorialStep1Label') || 'Шаг 1'}
                  text={t('tutorialStep1Text') || 'Настройте on-chain профиль. Этот аватар и имя с описанием будет видно в других dApp-приложениях.'}
                  buttons={[]}
                  style={{ position: 'static', width: '100%', maxWidth: 'none', marginBottom: '14px' }}
                />
              )}

            {/* Круглый аватар — видно с первого взгляда, что запись уже есть, до того как что-то менять */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Box
                sx={{
                  width: 84,
                  height: 84,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: `2px solid ${displayImage ? colors.accent : colors.border}`,
                  boxShadow: displayImage ? `0 0 12px ${colors.shadow}` : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isDark ? '#0D0D0D' : '#FFFFFF',
                  fontSize: 32,
                }}
              >
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt="avatar"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : '🎭'}
              </Box>
            </Box>

            <Box sx={{ position: 'relative' }}>
              <Input
                placeholder={t('avatarTitlePlaceholder') || 'Заголовок'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={inputStyle}
              />
              {hasExisting.title && (
                <span style={{ position: 'absolute', right: 12, top: 10, fontSize: 14, pointerEvents: 'none' }}>✏️</span>
              )}
            </Box>
            <Box sx={{ position: 'relative' }}>
              <Input
                placeholder={t('avatarDescriptionPlaceholder') || 'Описание'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={inputStyle}
              />
              {hasExisting.description && (
                <span style={{ position: 'absolute', right: 12, top: 10, fontSize: 14, pointerEvents: 'none' }}>✏️</span>
              )}
            </Box>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                ...inputStyle,
                marginTop: '4px',
                appearance: 'none' as const,
                cursor: 'pointer',
              }}
            >
              <option value="">{t('avatarCategoryPlaceholder') || 'Категория…'}</option>
              {AVATAR_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <Box
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handlePictureDrop}
              onClick={() => fileInputRef.current?.click()}
              sx={{
                border: `2px dashed ${dragOver ? colors.accent : colors.border}`,
                borderRadius: '14px',
                padding: '14px',
                marginBottom: '12px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'border-color 0.2s, background 0.2s',
                background: dragOver ? `${colors.accent}14` : 'transparent',
              }}
            >
              {/* display:none может тихо блокировать programmatic .click() в некоторых
                  WebKit-окружениях (в т.ч. встроенный WebView Telegram) — визуально прячем
                  через off-screen позиционирование вместо display:none, это надёжнее. */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{
                  position: 'absolute',
                  width: 1,
                  height: 1,
                  padding: 0,
                  margin: -1,
                  overflow: 'hidden',
                  clip: 'rect(0, 0, 0, 0)',
                  whiteSpace: 'nowrap',
                  border: 0,
                }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = '';
                }}
              />
              {displayImage ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                  <img
                    src={displayImage}
                    alt="preview"
                    style={{
                      maxWidth: 120,
                      maxHeight: 120,
                      borderRadius: 12,
                      objectFit: 'contain',
                      border: `1px solid ${colors.border}`,
                      boxShadow: `0 0 10px ${colors.shadow}`,
                    }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                </Box>
              ) : (
                <Typography sx={{ fontSize: '12px', color: colors.textSecondary, mb: 1 }}>
                  {t('avatarDropHint') || '🖼️ Нажми, чтобы выбрать файл, перетащи картинку из браузера или вставь ссылку ниже'}
                </Typography>
              )}
              <Input
                placeholder={t('avatarPicturePlaceholder') || 'Ссылка на картинку (URL)'}
                value={pictureUrl}
                onChange={(e) => {
                  setPictureUrl(e.target.value);
                  setDropNotice(null);
                  if (iconObjectUrlRef.current) {
                    URL.revokeObjectURL(iconObjectUrlRef.current);
                    iconObjectUrlRef.current = null;
                  }
                  setIconBytes(null);
                  setIconPreview(null);
                }}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                style={{ ...inputStyle, marginBottom: 0 }}
              />
              {dropNotice && (
                <Alert severity="warning" sx={{ mt: 1, fontSize: '11px', textAlign: 'left' }}>
                  {dropNotice}
                </Alert>
              )}
            </Box>

            <Button
              fullWidth
              onClick={handleSave}
              disabled={saving}
              sx={buttonSx}
            >
              {saving ? (t('avatarSaving') || 'Сохранение...') : (t('avatarSave') || 'Сохранить onchain')}
            </Button>
          </Box>
        )}
      </Box>

      {/* Блок 1 обучалки: первый шаг тура — спрашиваем "есть ли домен" сразу,
          до заполнения аватарки (которая теперь в блоке 4) — оверлей внизу
          экрана, не завязан на скролл формы выше. */}
      {tutorial.active && !tutorial.isStepDone('domain_answered') && (
        <Box sx={{ position: 'fixed', left: 0, right: 0, bottom: '80px', display: 'flex', justifyContent: 'center', zIndex: 1002, px: 2 }}>
          {tutorialDomainAnswer === null && (
            <TutorialTooltip
              blockLabel={t('tutorialBlock1Label') || 'Блок 1'}
              stepLabel={t('tutorialStep2Label') || 'Шаг 2'}
              text={t('tutorialDomainQuestion') || 'У вас есть домен?'}
              buttons={[
                { label: t('tutorialDomainYes') || 'Да', primary: true, onClick: () => setTutorialDomainAnswer('yes') },
                { label: t('tutorialDomainNo') || 'Нет', onClick: () => setTutorialDomainAnswer('no') },
              ]}
              style={{ position: 'static' }}
            />
          )}

          {tutorialDomainAnswer === 'no' && (
            <TutorialTooltip
              blockLabel={t('tutorialBlock1Label') || 'Блок 1'}
              stepLabel={t('tutorialStep2Label') || 'Шаг 2'}
              icon={<img src={webdomLogo} alt="" style={{ width: '22px', height: '22px', flexShrink: 0 }} />}
              text={t('tutorialNoDomainInfo') || 'Зарегистрируйте домен или купите его на вторичном рынке.'}
              buttons={[
                {
                  label: t('tutorialNext') || 'Далее',
                  primary: true,
                  onClick: async () => {
                    window.open(
                      isRealTelegramEnv ? 'tonsite://domain.minter.ton' : tonsiteToGatewayUrl('tonsite://domain.minter.ton'),
                      '_blank'
                    );
                    await tutorial.recordStep('domain_answered');
                    tutorial.resumeStep();
                    setTutorialDomainAnswer(null);
                  },
                },
              ]}
              style={{ position: 'static' }}
            />
          )}

          {tutorialDomainAnswer === 'yes' && (
            <TutorialTooltip
              blockLabel={t('tutorialBlock1Label') || 'Блок 1'}
              stepLabel={t('tutorialStep2Label') || 'Шаг 2'}
              text={
                tutorialUserDomains.length === 0
                  ? t('tutorialNoDomainsFound') || 'Домены не найдены на этом кошельке — обновите страницу или попробуйте позже.'
                  : t('tutorialDomainPickHint') || 'Выберите домен, чтобы привязать его к кошельку:'
              }
              buttons={tutorialUserDomains.slice(0, 5).map((d) => ({
                label: decodeDomainForDisplay(d.name),
                onClick: () => navigate(`/manage?address=${d.address}`),
              }))}
              style={{ position: 'static' }}
            />
          )}
        </Box>
      )}
    </Page>
  );
};

export default AvatarSecretPage;
