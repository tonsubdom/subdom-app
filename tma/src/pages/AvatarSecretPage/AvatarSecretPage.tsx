// tma/src/pages/AvatarSecretPage/AvatarSecretPage.tsx
//
// "Аватар / Секрет" — пишет title/description/category/picture прямо в
// dns_text#1eda записи домена (см. services/ownerMetaService.ts, портировано
// из референса вадвека). Читает это TONresistor/webdom.market — тот же
// формат, без похода на свой бэкенд.

import React, { useState, useEffect } from 'react';
import { Input } from '@telegram-apps/telegram-ui';
import { useTonWallet, useTonConnectUI } from '@tonconnect/ui-react';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { Page } from '@/components/Page';
import { ShowSnackbar } from '@/components/ShowSnackbar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  buildOwnerDnsTextPayloads,
  buildOwnerPicturePayload,
  resolveDomainNftAddress,
  ResolvedDomain,
} from '@/services/ownerMetaService';

// Простое покрытие газа на одно change_dns_record сообщение — та же величина,
// что используется в проекте для других одиночных внутренних сообщений
// (см. renewal-транзакцию в AddSubdomainPage).
const MESSAGE_AMOUNT_NANO = '20000000'; // 0.02 TON

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

  const [domainName, setDomainName] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolvedDomain, setResolvedDomain] = useState<ResolvedDomain | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [pictureUrl, setPictureUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<React.ReactElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dropNotice, setDropNotice] = useState<string | null>(null);

  const showSnackbar = (message: string, type: 'success' | 'error' = 'success') => {
    setSnackbar(
      <ShowSnackbar message={message} type={type} onClose={() => setSnackbar(null)} />
    );
  };

  const resolveDomain = async (rawDomain: string) => {
    const trimmed = rawDomain.trim().toLowerCase();
    if (!trimmed) return;
    const fullDomain = trimmed.endsWith('.ton') ? trimmed : `${trimmed}.ton`;

    setResolving(true);
    setResolveError(null);
    setResolvedDomain(null);
    try {
      const resolved = await resolveDomainNftAddress(fullDomain);
      if (!resolved) {
        setResolveError(t('avatarDomainNotFound') || 'Домен не найден');
        return;
      }
      setResolvedDomain(resolved);
    } catch (e) {
      setResolveError(t('avatarResolveError') || 'Ошибка при поиске домена');
    } finally {
      setResolving(false);
    }
  };

  const handleResolve = () => resolveDomain(domainName);

  // dns_text "picture" — просто URL картинки, не байты (см. ownerMetaService.ts).
  // Своего хостинга картинок в проекте нет, поэтому реально принимаем ссылку —
  // либо вставленную руками, либо перетащенную ИЗ БРАУЗЕРА (тогда браузер кладёт
  // в drop event её URL, не байты файла). Перетаскивание локального файла с диска
  // явно не поддерживаем (некуда его захостить) и говорим об этом прямо.
  const handlePictureDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const uri = (
      e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')
    ).trim();
    if (/^https?:\/\//i.test(uri)) {
      setPictureUrl(uri);
      setDropNotice(null);
      return;
    }
    if (e.dataTransfer.files?.length) {
      setDropNotice(
        t('avatarFileUploadUnsupported') ||
          'Загрузка локального файла пока не поддерживается — перетащи картинку прямо из браузера (как ссылку) или вставь URL вручную.'
      );
      return;
    }
    setDropNotice(t('avatarDropNotUrl') || 'Это не похоже на ссылку на картинку.');
  };

  // Приход с карточки зоны/субдомена в ProfileWidget — /#/avatar-secret?domain=X:
  // подставляем домен и сразу ищем, без ручного ввода (см. handleOpenAvatarSecret
  // в ProfileWidget.tsx).
  useEffect(() => {
    const hash = window.location.hash;
    const queryString = hash.includes('?') ? hash.split('?')[1] : '';
    const domainFromUrl = new URLSearchParams(queryString).get('domain');
    if (domainFromUrl) {
      setDomainName(domainFromUrl);
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
      if (pictureUrl.trim()) {
        payloads.push(await buildOwnerPicturePayload(pictureUrl.trim()));
      }

      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: payloads.map((payload) => ({
          address: resolvedDomain.nftAddress,
          amount: MESSAGE_AMOUNT_NANO,
          payload,
        })),
      });

      showSnackbar(t('avatarSaved') || 'Сохранено онchain', 'success');
    } catch (e: any) {
      console.error('Avatar/Secret save error:', e);
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
          🎭 {t('avatarSecretTitle') || 'Аватар / Секрет'}
        </Typography>
        <Typography sx={{ fontSize: '13px', color: colors.textSecondary, mt: 0.5 }}>
          {t('avatarSecretDescription') || 'title/description/category/picture — прямо в DNS-записях домена, читается TONresistor/webdom.market.'}
        </Typography>
      </Box>

      <Box sx={{ maxWidth: 425, mx: 'auto', px: 2, py: 1 }}>
        <Box style={cardStyle}>
          <Typography variant="body2" sx={{ mb: 1, color: colors.textSecondary, fontFamily: 'monospace' }}>
            {t('avatarEnterDomain') || 'Домен'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Input
              placeholder="example.ton"
              value={domainName}
              onChange={(e) => setDomainName(e.target.value)}
              style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
            />
            <Button sx={buttonSx} onClick={handleResolve} disabled={resolving || !domainName.trim()}>
              {resolving ? '...' : t('avatarFind') || 'Найти'}
            </Button>
          </Box>

          {resolveError && (
            <Alert severity="error" sx={{ mt: 1, fontSize: '12px' }}>
              {resolveError}
            </Alert>
          )}
          {resolvedDomain && (
            <Alert severity="success" sx={{ mt: 1, fontSize: '12px' }}>
              {(t('avatarDomainFound') || 'Домен найден') + `: ${resolvedDomain.nftAddress.slice(0, 6)}...${resolvedDomain.nftAddress.slice(-4)}`}
            </Alert>
          )}
        </Box>

        {resolvedDomain && (
          <Box style={cardStyle}>
            <Input
              placeholder={t('avatarTitlePlaceholder') || 'Заголовок'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
            />
            <Input
              placeholder={t('avatarDescriptionPlaceholder') || 'Описание'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={inputStyle}
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                ...inputStyle,
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
              sx={{
                border: `2px dashed ${dragOver ? colors.accent : colors.border}`,
                borderRadius: '14px',
                padding: '14px',
                marginBottom: '12px',
                textAlign: 'center',
                transition: 'border-color 0.2s, background 0.2s',
                background: dragOver ? `${colors.accent}14` : 'transparent',
              }}
            >
              {pictureUrl.trim() ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                  <img
                    src={pictureUrl.trim()}
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
                  {t('avatarDropHint') || '🖼️ Перетащи сюда картинку из браузера или вставь ссылку ниже'}
                </Typography>
              )}
              <Input
                placeholder={t('avatarPicturePlaceholder') || 'Ссылка на картинку (URL)'}
                value={pictureUrl}
                onChange={(e) => { setPictureUrl(e.target.value); setDropNotice(null); }}
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
    </Page>
  );
};

export default AvatarSecretPage;
