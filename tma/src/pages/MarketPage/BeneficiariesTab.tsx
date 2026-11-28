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
import { computeEscrowAddress, buildEscrowDeposit, MIN_ESCROW_DEPOSIT_TON } from '@/services/payloadBuilder';
import { useBlockchainItems } from '@/services/blockchainItems/blockchain-items-context.tsx';
import { convertUserFriendlyToRaw } from '@/utils/tonUtils';
import { NETWORK_CONFIGS } from '@/services/blockchainItems/toncenter-api-config';
import { LupaButton } from '@/components/LupaButton/LupaButton';
import { EscrowDeadlineBadge } from '@/components/EscrowDeadlineBadge';

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

function tonviewerLink(address: string, isTestnet: boolean): string {
  return `https://${isTestnet ? 'testnet.' : ''}tonviewer.com/${address}`;
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
  // Входящие офферы на ТВОИ зоны (ты — текущий бенефициар). Раньше принять/
  // отклонить можно было только в ProfileWidget рядом со списком "мои
  // зоны" — здесь, в Market, карточка твоей же зоны выглядела как любая
  // другая, с тем же "можно сделать оффер" стоковым видом, из-за чего сам
  // владелец зоны мог отправить (и затем принять) оффер самому себе.
  const [incomingOffers, setIncomingOffers] = useState<any[]>([]);
  const [offerActionBusyId, setOfferActionBusyId] = useState<number | null>(null);
  // Листинги (не офферы), которые ТЫ оплатил через "Забрать" — как и
  // myOffers выше, нужны отдельно от listingByZone (тот — только активные,
  // доступные для покупки). Без этого после оплаты листинг просто
  // пропадал из вида у покупателя (loadListings видит только активные).
  const [myPaidListings, setMyPaidListings] = useState<any[]>([]);
  // Подтверждение перед "Принять" — юзер явно попросил модалку, чтобы
  // случайным кликом не отдать зону (принятие сразу запускает эскроу-
  // расчёт с покупателем, отменить потом нельзя).
  const [confirmAcceptOffer, setConfirmAcceptOffer] = useState<any | null>(null);
  // Пагинация — без неё список всех proxy-зон рендерился целиком и
  // приложение подвисало при росте каталога (см. Kanban 2026-11-28).
  // Тот же паттерн, что в Market "Субдомены" (MarketPage.tsx).
  const [beneficiaryCurrentPage, setBeneficiaryCurrentPage] = useState<number>(0);

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

  const loadIncomingOffers = async () => {
    if (!walletAddress) {
      setIncomingOffers([]);
      return;
    }
    // Без status-фильтра на бэкенде — 'paid' (покупатель уже внёс депозит,
    // площадка ещё не исполнила) тоже должен остаться виден продавцу, не
    // только 'pending'. Фильтруем на клиенте, тем же паттерном, что
    // myOfferByZone ниже.
    const result = await apiService.getBeneficiaryOffers({ sellerAddress: walletAddress });
    setIncomingOffers(
      (result.success ? result.data || [] : []).filter((o: any) => o.status === 'pending' || o.status === 'paid')
    );
  };

  useEffect(() => {
    loadListings();
  }, []);

  // Если список зон уменьшился (например, после смены фильтра контекста)
  // и текущая страница вышла за пределы — откатываемся на первую, иначе
  // пользователь видит пустой экран без объяснения.
  useEffect(() => {
    const totalPages = Math.ceil((proxyCollections || []).length / 10);
    if (beneficiaryCurrentPage > 0 && beneficiaryCurrentPage >= totalPages) {
      setBeneficiaryCurrentPage(0);
    }
  }, [proxyCollections, beneficiaryCurrentPage]);

  const loadMyPaidListings = async () => {
    if (!walletAddress) {
      setMyPaidListings([]);
      return;
    }
    const result = await apiService.getBeneficiaryListings({ buyerAddress: walletAddress, status: 'paid' });
    setMyPaidListings(result.success ? result.data || [] : []);
  };

  useEffect(() => {
    loadMyOffers();
    loadIncomingOffers();
    loadMyPaidListings();
    const intervalId = setInterval(() => {
      loadMyOffers();
      loadIncomingOffers();
      loadMyPaidListings();
    }, 30_000);
    return () => clearInterval(intervalId);
  }, [walletAddress]);

  const listingByZone = new Map(listings.map((l) => [l.zoneAddress.toLowerCase(), l]));
  const myPaidListingByZone = new Map(myPaidListings.map((l) => [l.zoneAddress.toLowerCase(), l]));
  const myOfferByZone = new Map(
    myOffers
      .filter((o) => o.status === 'pending' || o.status === 'accepted' || o.status === 'paid')
      .map((o) => [o.zoneAddress.toLowerCase(), o])
  );
  const incomingOfferByZone = new Map(incomingOffers.map((o) => [o.zoneAddress.toLowerCase(), o]));
  const ownWalletRaw = walletAddress ? convertUserFriendlyToRaw(walletAddress).toLowerCase() : null;

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
      await loadMyPaidListings();
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
    // Ниже этого эскроу-контракт сам отбивает депозит (err::deposit_too_small,
    // см. escrow.fc) — резерв на хранение + газ деплоя съели бы
    // непропорционально большую долю сделки. Отсекаем на вводе, чтобы
    // покупатель не узнавал об этом только после баунса.
    if (price < MIN_ESCROW_DEPOSIT_TON) {
      setError(key, (t('marketBeneficiaryPriceTooLow') || 'Минимальная сумма — {min} TON').replace('{min}', String(MIN_ESCROW_DEPOSIT_TON)));
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

  // Зеркало handleAcceptBeneficiaryOffer/handleDeclineBeneficiaryOffer из
  // ProfileWidget.tsx — тот же API, только теперь доступно и здесь, прямо
  // на карточке своей зоны, а не только в списке "мои зоны".
  const handleAcceptIncomingOffer = async (offer: any) => {
    if (!walletAddress) return;
    setOfferActionBusyId(offer.id);
    try {
      const result = await apiService.acceptBeneficiaryOffer(offer.id, walletAddress);
      if (!result.success) throw new Error(result.message || 'Не удалось принять оффер');
      await loadIncomingOffers();
    } catch (error: any) {
      setError(`incoming-${offer.id}`, error?.message || 'Ошибка');
    } finally {
      setOfferActionBusyId(null);
    }
  };

  const handleDeclineIncomingOffer = async (offer: any) => {
    if (!walletAddress) return;
    setOfferActionBusyId(offer.id);
    try {
      const result = await apiService.declineBeneficiaryOffer(offer.id, walletAddress);
      if (!result.success) throw new Error(result.message || 'Не удалось отклонить оффер');
      await loadIncomingOffers();
    } catch (error: any) {
      setError(`incoming-${offer.id}`, error?.message || 'Ошибка');
    } finally {
      setOfferActionBusyId(null);
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
  const BENEFICIARY_PAGE_SIZE = 10;
  const beneficiaryTotalPages = Math.ceil(zones.length / BENEFICIARY_PAGE_SIZE);
  const pagedZones = zones.slice(
    beneficiaryCurrentPage * BENEFICIARY_PAGE_SIZE,
    beneficiaryCurrentPage * BENEFICIARY_PAGE_SIZE + BENEFICIARY_PAGE_SIZE
  );

  return (
    <div>
      {zones.length === 0 && (
        <div style={{ textAlign: 'center', color: colors.textSecondary, padding: '20px', fontSize: '13px' }}>
          {t('marketBeneficiaryEmpty') || 'Пока нет Proxy-зон на платформе'}
        </div>
      )}

      {pagedZones.map((zone: any) => {
        const zoneAddressRaw = convertUserFriendlyToRaw(zone.address).toLowerCase();
        const listing = listingByZone.get(zoneAddressRaw);
        const myOffer = myOfferByZone.get(zoneAddressRaw);
        const incomingOffer = incomingOfferByZone.get(zoneAddressRaw);
        const myPaidListing = myPaidListingByZone.get(zoneAddressRaw);
        const zoneName = zone.domain || zone.name;
        const displayName = stripTonTld(zoneName);
        const presumedSeller = zone.creator_address || zone.owner_address;
        const isOwnZone = !!(ownWalletRaw && presumedSeller && convertUserFriendlyToRaw(presumedSeller).toLowerCase() === ownWalletRaw);
        const takeKey = listing ? `take-${listing.id}` : '';
        const offerKey = `offer-${zoneAddressRaw}`;
        const payKey = myOffer ? `pay-${myOffer.id}` : '';
        const cancelOfferKey = myOffer ? `cancel-${myOffer.id}` : '';
        const incomingKey = incomingOffer ? `incoming-${incomingOffer.id}` : '';

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

              {myPaidListing ? (
                <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                  <div style={{ marginBottom: '4px' }}>
                    {t('marketBeneficiaryYouPaid') || 'Вы оплатили'}: <strong style={{ color: colors.text }}>{myPaidListing.priceTon} TON</strong>
                  </div>
                  <EscrowDeadlineBadge escrowAddress={myPaidListing.escrowAddress} isTestnet={isTestnet} t={t} textColor={colors.text} />
                </div>
              ) : listing ? (
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
              ) : isOwnZone ? (
                incomingOffer?.status === 'paid' ? (
                  <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                    <div style={{ marginBottom: '4px' }}>
                      {t('marketBeneficiaryOfferPaidBy') || 'Оплачено покупателем'}: <strong style={{ color: colors.text }}>{incomingOffer.priceTon} TON</strong> (
                      <a
                        href={tonviewerLink(incomingOffer.buyerAddress, isTestnet)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: colors.primary }}
                      >
                        {shortAddress(incomingOffer.buyerAddress)}
                      </a>
                      )
                    </div>
                    <EscrowDeadlineBadge escrowAddress={incomingOffer.escrowAddress} isTestnet={isTestnet} t={t} textColor={colors.text} />
                  </div>
                ) : incomingOffer ? (
                  <>
                    <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '8px' }}>
                      {t('marketBeneficiaryOfferFrom') || 'Оффер'}: <strong style={{ color: colors.text }}>{incomingOffer.priceTon} TON</strong> (
                      <a
                        href={tonviewerLink(incomingOffer.buyerAddress, isTestnet)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: colors.primary }}
                      >
                        {shortAddress(incomingOffer.buyerAddress)}
                      </a>
                      )
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setConfirmAcceptOffer(incomingOffer)}
                        disabled={offerActionBusyId === incomingOffer.id}
                        style={buttonStyle(offerActionBusyId === incomingOffer.id)}
                      >
                        {offerActionBusyId === incomingOffer.id ? '...' : `✓ ${t('marketBeneficiaryAcceptOffer') || 'Принять'}`}
                      </button>
                      <button
                        onClick={() => handleDeclineIncomingOffer(incomingOffer)}
                        disabled={offerActionBusyId === incomingOffer.id}
                        style={{
                          ...buttonStyle(offerActionBusyId === incomingOffer.id),
                          background: 'transparent',
                          border: `1px solid ${colors.border}`,
                          color: colors.textSecondary,
                        }}
                      >
                        {offerActionBusyId === incomingOffer.id ? '...' : `✕ ${t('marketBeneficiaryDeclineOffer') || 'Отклонить'}`}
                      </button>
                    </div>
                    {errorByKey[incomingKey] && <p style={{ color: colors.error, fontSize: '12px', marginTop: '6px' }}>{errorByKey[incomingKey]}</p>}
                  </>
                ) : (
                  <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                    {t('marketBeneficiaryYourZone') || 'Это ваша зона'}
                  </div>
                )
              ) : myOffer?.status === 'paid' ? (
                <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                  <div style={{ marginBottom: '4px' }}>
                    {t('marketBeneficiaryYouPaid') || 'Вы оплатили'}: <strong style={{ color: colors.text }}>{myOffer.priceTon} TON</strong>
                  </div>
                  <EscrowDeadlineBadge escrowAddress={myOffer.escrowAddress} isTestnet={isTestnet} t={t} textColor={colors.text} />
                </div>
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

      {beneficiaryTotalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 0',
          }}
        >
          <button
            onClick={() => setBeneficiaryCurrentPage((p) => Math.max(0, p - 1))}
            disabled={beneficiaryCurrentPage === 0}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              background: beneficiaryCurrentPage === 0 ? 'transparent' : colors.cardBg,
              color: beneficiaryCurrentPage === 0 ? colors.textSecondary : colors.text,
              cursor: beneficiaryCurrentPage === 0 ? 'default' : 'pointer',
              fontSize: '13px',
            }}
          >
            ‹ {t('marketPrev') || 'Назад'}
          </button>
          <span style={{ fontSize: '13px', color: colors.textSecondary }}>
            {beneficiaryCurrentPage + 1} / {beneficiaryTotalPages}
          </span>
          <button
            onClick={() => setBeneficiaryCurrentPage((p) => Math.min(beneficiaryTotalPages - 1, p + 1))}
            disabled={beneficiaryCurrentPage === beneficiaryTotalPages - 1}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              background: beneficiaryCurrentPage === beneficiaryTotalPages - 1 ? 'transparent' : colors.cardBg,
              color: beneficiaryCurrentPage === beneficiaryTotalPages - 1 ? colors.textSecondary : colors.text,
              cursor: beneficiaryCurrentPage === beneficiaryTotalPages - 1 ? 'default' : 'pointer',
              fontSize: '13px',
            }}
          >
            {t('marketNext') || 'Вперёд'} ›
          </button>
        </div>
      )}

      {confirmAcceptOffer && (
        <div
          onClick={() => setConfirmAcceptOffer(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: colors.cardBg,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
              padding: '18px',
              maxWidth: '360px',
              width: '100%',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '15px', color: colors.text, marginBottom: '10px' }}>
              {t('marketBeneficiaryConfirmAcceptTitle') || 'Подтвердите принятие оффера'}
            </div>
            <div style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '14px', lineHeight: 1.5 }}>
              {t('marketBeneficiaryConfirmAcceptText') || 'Вы передадите бенефициарство (90% с аукционов) этой зоны за'}{' '}
              <strong style={{ color: colors.text }}>{confirmAcceptOffer.priceTon} TON</strong>
              {' '}
              <a
                href={tonviewerLink(confirmAcceptOffer.buyerAddress, isTestnet)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: colors.primary }}
              >
                {shortAddress(confirmAcceptOffer.buyerAddress)}
              </a>
              . {t('marketBeneficiaryConfirmAcceptWarning') || 'Действие необратимо.'}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setConfirmAcceptOffer(null)}
                style={{
                  ...buttonStyle(false),
                  background: 'transparent',
                  border: `1px solid ${colors.border}`,
                  color: colors.textSecondary,
                }}
              >
                {t('cancel') || 'Отмена'}
              </button>
              <button
                onClick={() => {
                  const offer = confirmAcceptOffer;
                  setConfirmAcceptOffer(null);
                  handleAcceptIncomingOffer(offer);
                }}
                style={buttonStyle(false)}
              >
                {t('marketBeneficiaryConfirmAcceptButton') || 'Подтвердить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BeneficiariesTab;
