// src/pages/MarketPage/BeneficiariesTab.tsx
//
// Market -> "Коллекции" — продажа бенефициарства (получателя 90% с аукционов)
// Proxy-зоны. Покупатель депозитит сумму в одноразовый эскроу-контракт
// (escrow.fc, см. payloadBuilder/escrow.ts) — без этого деньги уходили бы
// продавцу сразу при клике "Забрать", а смена бенефициара на зоне ждала бы
// отдельного ручного клика площадки в PendingActionsPanel; если бы площадка
// задержалась, покупатель уже заплатил бы, но ничего не получил (см. Log.md
// 2026-09-22). Площадка одним кликом одновременно высвобождает эскроу
// продавцу И меняет partner_addr (buildBeneficiaryTransferAndRelease) —
// тот же паттерн очереди, что у деактивации SBT-зоны, просто с эскроу
// вместо прямого P2P-перевода. Если площадка не отреагирует до дедлайна —
// покупатель сам возвращает депозит (claim_timeout_refund).
//
// "Продать своё"/входящие-исходящие офферы живут в ProfileWidget рядом со
// списком "мои зоны" — тут только browsing + "Забрать"/"Сделать оффер".

import React, { useEffect, useState } from 'react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { apiService } from '@/services/api';
import { TransactionService } from '@/services/transactionService';
import { computeEscrowAddress, buildEscrowDeposit } from '@/services/payloadBuilder';
import { useBlockchainItems } from '@/services/blockchainItems/blockchain-items-context.tsx';
import { convertUserFriendlyToRaw } from '@/utils/tonUtils';
import { NETWORK_CONFIGS } from '@/services/blockchainItems/toncenter-api-config';
import { LupaButton } from '@/components/LupaButton/LupaButton';

const NO_IMAGE_PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 90 90"><rect width="90" height="90" fill="%23f0f0f0"/><text x="45" y="45" font-family="Arial" font-size="10" fill="%23999" text-anchor="middle" dy=".3em">No Image</text></svg>';

// Отображаемое имя зоны без .ton — тот же приём, что и в MiniAppLinkGenerator.stripTonTld
// на бэкенде (там private, тут просто дублируем regex — сам сервис не экспортирует его).
function stripTonTld(name: string): string {
  return name.replace(/\.ton$/i, '');
}

// Рамки теста — 1 час до self-refund покупателя, если площадка не
// отреагировала. Перед продакшеном стоит увеличить (см. Log.md 2026-09-22).
const ESCROW_TIMEOUT_SECONDS = 3600;

interface BeneficiaryListing {
  id: number;
  zoneAddress: string;
  zoneName: string;
  sellerAddress: string;
  priceTon: number;
  status: string;
}

interface BeneficiariesTabProps {
  colors: Record<string, string>;
  isTestnet: boolean;
  t: (key: string) => string;
  walletAddress?: string;
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export const BeneficiariesTab: React.FC<BeneficiariesTabProps> = ({ colors, isTestnet, t, walletAddress }) => {
  const [tonConnectUI] = useTonConnectUI();
  const { proxyCollections } = useBlockchainItems();

  const [listings, setListings] = useState<BeneficiaryListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errorByKey, setErrorByKey] = useState<Record<string, string>>({});
  const [offerInputs, setOfferInputs] = useState<Record<string, string>>({});
  // Офферы, которые ТЫ сам отправил на чужую зону (не входит в
  // listingByZone — тот только про уже выставленные на продажу листинги).
  // Раньше статус "принят" + кнопка "Оплатить" жили только в ProfileWidget
  // рядом со списком "мои зоны" — но зона, на которую ты делаешь оффер,
  // ПО ОПРЕДЕЛЕНИЮ не твоя, так что та карточка там никогда не появлялась и
  // покупатель не мог найти, куда платить после того, как продавец нажимал
  // галочку "принять" (см. Log.md, живой баг с "висящим" оффером). Теперь
  // статус оффера виден прямо здесь, на той же карточке зоны, где его и
  // отправляли.
  const [myOffers, setMyOffers] = useState<any[]>([]);

  const loadListings = async () => {
    setLoading(true);
    try {
      const result = await apiService.getBeneficiaryListings({ status: 'active' });
      setListings(result.success ? result.data || [] : []);
    } finally {
      setLoading(false);
    }
  };

  const loadMyOffers = async () => {
    if (!walletAddress) {
      setMyOffers([]);
      return;
    }
    const result = await apiService.getBeneficiaryOffers({ buyerAddress: walletAddress });
    setMyOffers(result.success ? result.data || [] : []);
  };

  useEffect(() => {
    loadListings();
  }, []);

  useEffect(() => {
    loadMyOffers();
    const intervalId = setInterval(loadMyOffers, 30_000);
    return () => clearInterval(intervalId);
  }, [walletAddress]);

  const listingByZone = new Map(listings.map((l) => [l.zoneAddress.toLowerCase(), l]));
  const myOfferByZone = new Map(
    myOffers
      .filter((o) => o.status === 'pending' || o.status === 'accepted')
      .map((o) => [o.zoneAddress.toLowerCase(), o])
  );

  const setError = (key: string, message: string) => setErrorByKey((prev) => ({ ...prev, [key]: message }));
  const clearError = (key: string) => setErrorByKey((prev) => ({ ...prev, [key]: '' }));

  const handleTake = async (listing: BeneficiaryListing) => {
    if (!walletAddress) {
      setError(`take-${listing.id}`, t('marketBeneficiaryConnectWallet') || 'Подключите кошелёк');
      return;
    }
    const key = `take-${listing.id}`;
    setBusyKey(key);
    clearError(key);
    try {
      const reserveResult = await apiService.reserveBeneficiaryListing(listing.id, walletAddress);
      if (!reserveResult.success) {
        throw new Error(reserveResult.message || 'Листинг уже забронирован');
      }
      const reserved = reserveResult.data;

      const platformOwner = isTestnet
        ? NETWORK_CONFIGS.testnet.DEFAULT_ADDRESSES.PLATFORM_OWNER
        : NETWORK_CONFIGS.mainnet.DEFAULT_ADDRESSES.PLATFORM_OWNER;
      const escrowConfig = {
        owner_address: platformOwner,
        seller_address: reserved.sellerAddress,
        buyer_address: walletAddress,
        deal_id: BigInt(reserved.id),
        deadline: Math.floor(Date.now() / 1000) + ESCROW_TIMEOUT_SECONDS,
      };
      const escrowAddress = computeEscrowAddress(escrowConfig, isTestnet);
      const nanotons = BigInt(Math.round(Number(reserved.priceTon) * 1_000_000_000)).toString();
      const depositTx = buildEscrowDeposit(escrowConfig, nanotons, isTestnet);

      const sendResult = await TransactionService.sendTransaction(
        tonConnectUI,
        depositTx,
        { network: isTestnet ? 'testnet' : 'mainnet', verifyBlockchain: true, action: 'beneficiary_escrow_deposit' }
      );

      if (!sendResult.success || !sendResult.confirmedInBlock) {
        throw new Error(sendResult.error || 'Транзакция не подтверждена');
      }

      await apiService.confirmBeneficiaryListingPayment(listing.id, walletAddress, escrowAddress, sendResult.hash);
      await apiService.createPendingAction({
        actionType: 'transfer_beneficiary',
        targetType: 'zone',
        targetAddress: listing.zoneAddress,
        targetCollectionAddress: listing.zoneAddress,
        targetName: listing.zoneName,
        requestedBy: walletAddress,
        newPartnerAddress: walletAddress,
        escrowAddress,
      });

      await loadListings();
    } catch (error: any) {
      setError(key, error?.message || 'Ошибка');
    } finally {
      setBusyKey(null);
    }
  };

  const handleMakeOffer = async (zoneAddress: string, zoneName: string, sellerAddress: string) => {
    if (!walletAddress) {
      setError(`offer-${zoneAddress}`, t('marketBeneficiaryConnectWallet') || 'Подключите кошелёк');
      return;
    }
    const priceInput = offerInputs[zoneAddress];
    const price = Number(priceInput);
    const key = `offer-${zoneAddress}`;
    if (!priceInput || !Number.isFinite(price) || price <= 0) {
      setError(key, t('marketBeneficiaryInvalidPrice') || 'Укажите цену в TON');
      return;
    }
    setBusyKey(key);
    clearError(key);
    try {
      const result = await apiService.createBeneficiaryOffer({
        zoneAddress,
        zoneName,
        buyerAddress: walletAddress,
        sellerAddress,
        priceTon: price,
      });
      if (!result.success) throw new Error(result.message || 'Не удалось отправить оффер');
      setOfferInputs((prev) => ({ ...prev, [zoneAddress]: '' }));
      await loadMyOffers();
    } catch (error: any) {
      setError(key, error?.message || 'Ошибка');
    } finally {
      setBusyKey(null);
    }
  };

  // Зеркало handlePayBeneficiaryOffer из ProfileWidget.tsx — продавец уже
  // нажал "принять" на своей стороне (его зона, видно в его "мои зоны"),
  // теперь покупатель депозитит сумму в тот же одноразовый эскроу (owner =
  // площадка, deal_id = id оффера), что и при "Забрать" готовый листинг выше.
  const handlePayOffer = async (offer: any) => {
    if (!walletAddress) return;
    const key = `pay-${offer.id}`;
    setBusyKey(key);
    clearError(key);
    try {
      const platformOwner = isTestnet
        ? NETWORK_CONFIGS.testnet.DEFAULT_ADDRESSES.PLATFORM_OWNER
        : NETWORK_CONFIGS.mainnet.DEFAULT_ADDRESSES.PLATFORM_OWNER;
      const escrowConfig = {
        owner_address: platformOwner,
        seller_address: offer.sellerAddress,
        buyer_address: walletAddress,
        deal_id: BigInt(offer.id),
        deadline: Math.floor(Date.now() / 1000) + ESCROW_TIMEOUT_SECONDS,
      };
      const escrowAddress = computeEscrowAddress(escrowConfig, isTestnet);
      const nanotons = BigInt(Math.round(Number(offer.priceTon) * 1_000_000_000)).toString();
      const depositTx = buildEscrowDeposit(escrowConfig, nanotons, isTestnet);

      const sendResult = await TransactionService.sendTransaction(
        tonConnectUI,
        depositTx,
        { network: isTestnet ? 'testnet' : 'mainnet', verifyBlockchain: true, action: 'beneficiary_offer_escrow_deposit' }
      );
      if (!sendResult.success || !sendResult.confirmedInBlock) {
        throw new Error(sendResult.error || 'Транзакция не подтверждена');
      }

      await apiService.payBeneficiaryOffer(offer.id, walletAddress, escrowAddress, sendResult.hash);
      await apiService.createPendingAction({
        actionType: 'transfer_beneficiary',
        targetType: 'zone',
        targetAddress: offer.zoneAddress,
        targetCollectionAddress: offer.zoneAddress,
        targetName: offer.zoneName,
        requestedBy: walletAddress,
        newPartnerAddress: walletAddress,
        escrowAddress,
      });
      await loadMyOffers();
    } catch (error: any) {
      setError(key, error?.message || 'Ошибка');
    } finally {
      setBusyKey(null);
    }
  };

  const handleCancelOffer = async (offer: any) => {
    if (!walletAddress) return;
    const key = `cancel-${offer.id}`;
    setBusyKey(key);
    clearError(key);
    try {
      const result = await apiService.cancelBeneficiaryOffer(offer.id, walletAddress);
      if (!result.success) throw new Error(result.message || 'Не удалось отменить оффер');
      await loadMyOffers();
    } catch (error: any) {
      setError(key, error?.message || 'Ошибка');
    } finally {
      setBusyKey(null);
    }
  };

  const cardStyle: React.CSSProperties = {
    display: 'flex',
    gap: '14px',
    padding: '14px',
    borderRadius: '10px',
    background: colors.cardBg,
    border: `1px solid ${colors.border}`,
    marginBottom: '10px',
  };

  const buttonStyle = (busy: boolean): React.CSSProperties => ({
    padding: '8px 14px',
    borderRadius: '8px',
    border: 'none',
    background: busy ? colors.hover : colors.primary,
    color: '#FFFFFF',
    fontWeight: 600,
    fontSize: '13px',
    cursor: busy ? 'default' : 'pointer',
    width: '100%',
  });

  const inputStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    boxSizing: 'border-box',
    padding: '8px 10px',
    borderRadius: '8px',
    border: `1px solid ${colors.inputBorder}`,
    background: colors.inputBg,
    color: colors.inputText,
    fontSize: '13px',
  };

  if (loading) {
    return <div style={{ textAlign: 'center', color: colors.textSecondary, padding: '20px' }}>{t('marketLoading') || 'Загрузка...'}</div>;
  }

  const zones = proxyCollections || [];

  return (
    <div>
      {zones.length === 0 && (
        <div style={{ textAlign: 'center', color: colors.textSecondary, padding: '20px', fontSize: '13px' }}>
          {t('marketBeneficiaryEmpty') || 'Пока нет Proxy-зон на платформе'}
        </div>
      )}

      {zones.map((zone: any) => {
        const zoneAddressRaw = convertUserFriendlyToRaw(zone.address).toLowerCase();
        const listing = listingByZone.get(zoneAddressRaw);
        const myOffer = myOfferByZone.get(zoneAddressRaw);
        const zoneName = zone.domain || zone.name;
        const displayName = stripTonTld(zoneName);
        const presumedSeller = zone.creator_address || zone.owner_address;
        const takeKey = listing ? `take-${listing.id}` : '';
        const offerKey = `offer-${zoneAddressRaw}`;
        const payKey = myOffer ? `pay-${myOffer.id}` : '';
        const cancelOfferKey = myOffer ? `cancel-${myOffer.id}` : '';

        return (
          <div key={zone.address} style={cardStyle}>
            <div style={{ flexShrink: 0, position: 'relative' }}>
              <img
                src={zone.image || NO_IMAGE_PLACEHOLDER}
                alt={displayName}
                loading="lazy"
                decoding="async"
                style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  border: `1px solid ${colors.border}`,
                }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = NO_IMAGE_PLACEHOLDER;
                }}
              />
              <LupaButton
                domain={zoneName}
                address={zone.address}
                isTestnet={isTestnet}
                size={26}
                offset={3}
                corner="bottom-right"
                siteResolves={zone.siteResolves}
              />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: colors.text, marginBottom: '6px', wordBreak: 'break-word' }}>
                {displayName}
              </div>

              {listing ? (
                <>
                  <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '8px' }}>
                    {t('marketBeneficiaryPrice') || 'Цена'}: <strong style={{ color: colors.text }}>{listing.priceTon} TON</strong>
                    {' · '}
                    {t('marketBeneficiarySeller') || 'Продавец'}: {shortAddress(listing.sellerAddress)}
                  </div>
                  <button
                    onClick={() => handleTake(listing)}
                    disabled={busyKey === takeKey}
                    style={buttonStyle(busyKey === takeKey)}
                  >
                    {busyKey === takeKey ? (t('marketBeneficiaryProcessing') || 'Отправка...') : `🤝 ${t('marketBeneficiaryTake') || 'Забрать'}`}
                  </button>
                  {errorByKey[takeKey] && <p style={{ color: colors.error, fontSize: '12px', marginTop: '6px' }}>{errorByKey[takeKey]}</p>}
                </>
              ) : myOffer?.status === 'accepted' ? (
                <>
                  <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '8px' }}>
                    {t('marketBeneficiaryOfferAcceptedForYou') || 'Ваш оффер принят'}: <strong style={{ color: colors.text }}>{myOffer.priceTon} TON</strong>
                  </div>
                  <button
                    onClick={() => handlePayOffer(myOffer)}
                    disabled={busyKey === payKey}
                    style={buttonStyle(busyKey === payKey)}
                  >
                    {busyKey === payKey ? (t('marketBeneficiaryProcessing') || 'Отправка...') : `💰 ${t('marketBeneficiaryPayOffer') || 'Оплатить'}`}
                  </button>
                  {errorByKey[payKey] && <p style={{ color: colors.error, fontSize: '12px', marginTop: '6px' }}>{errorByKey[payKey]}</p>}
                </>
              ) : myOffer?.status === 'pending' ? (
                <>
                  <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '8px' }}>
                    {t('marketBeneficiaryOfferPending') || 'Оффер отправлен, ждём ответа продавца'}: <strong style={{ color: colors.text }}>{myOffer.priceTon} TON</strong>
                  </div>
                  <button
                    onClick={() => handleCancelOffer(myOffer)}
                    disabled={busyKey === cancelOfferKey}
                    style={{
                      ...buttonStyle(busyKey === cancelOfferKey),
                      background: 'transparent',
                      border: `1px solid ${colors.border}`,
                      color: colors.textSecondary,
                    }}
                  >
                    {busyKey === cancelOfferKey ? '...' : (t('marketBeneficiaryCancelOffer') || 'Отменить оффер')}
                  </button>
                  {errorByKey[cancelOfferKey] && <p style={{ color: colors.error, fontSize: '12px', marginTop: '6px' }}>{errorByKey[cancelOfferKey]}</p>}
                </>
              ) : (
                <>
                  <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '8px' }}>
                    {t('marketBeneficiaryNotListed') || 'Не выставлена на продажу — можно предложить свою цену'}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="TON"
                      value={offerInputs[zoneAddressRaw] || ''}
                      onChange={(e) => setOfferInputs((prev) => ({ ...prev, [zoneAddressRaw]: e.target.value }))}
                      style={inputStyle}
                    />
                    <button
                      onClick={() => handleMakeOffer(zoneAddressRaw, zoneName, presumedSeller)}
                      disabled={busyKey === offerKey}
                      style={{
                        ...buttonStyle(busyKey === offerKey),
                        width: 'auto',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                        padding: '8px 14px',
                      }}
                    >
                      {busyKey === offerKey ? '...' : `💬 ${t('marketBeneficiaryMakeOffer') || 'Оффер'}`}
                    </button>
                  </div>
                  {errorByKey[offerKey] && <p style={{ color: colors.error, fontSize: '12px', marginTop: '6px' }}>{errorByKey[offerKey]}</p>}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BeneficiariesTab;
