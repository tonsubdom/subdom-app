// src/pages/MarketPage/BeneficiariesTab.tsx
//
// Market -> "Коллекции" — продажа бенефициарства (получателя 90% с аукционов)
// Proxy-зоны. Без эскроу-контракта (осознанный выбор — сессия 2026-09-22):
// покупатель платит продавцу напрямую двухходовой верификацией
// (TransactionService.sendTransaction), смену partner_addr на контракте
// исполняет площадка через pending_admin_actions/PendingActionsPanel
// (actionType='transfer_beneficiary') — тот же паттерн, что у деактивации
// SBT-зоны. См. план в Obsidian Log.md той же сессии.
//
// "Продать своё"/входящие-исходящие офферы живут в ProfileWidget рядом со
// списком "мои зоны" — тут только browsing + "Забрать"/"Сделать оффер".

import React, { useEffect, useState } from 'react';
import { Address } from '@ton/core';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { apiService } from '@/services/api';
import { TransactionService } from '@/services/transactionService';
import { useBlockchainItems } from '@/services/blockchainItems/blockchain-items-context.tsx';
import { convertUserFriendlyToRaw } from '@/utils/tonUtils';

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

function friendlyAddress(raw: string, isTestnet: boolean): string {
  try {
    return Address.parse(raw).toString({ bounceable: true, testOnly: isTestnet });
  } catch {
    return raw;
  }
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

  const loadListings = async () => {
    setLoading(true);
    try {
      const result = await apiService.getBeneficiaryListings({ status: 'active' });
      setListings(result.success ? result.data || [] : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, []);

  const listingByZone = new Map(listings.map((l) => [l.zoneAddress.toLowerCase(), l]));

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

      const nanotons = BigInt(Math.round(Number(reserved.priceTon) * 1_000_000_000)).toString();
      const sendResult = await TransactionService.sendTransaction(
        tonConnectUI,
        {
          validUntil: Math.floor(Date.now() / 1000) + 300,
          messages: [{ address: friendlyAddress(reserved.sellerAddress, isTestnet), amount: nanotons }],
        },
        { network: isTestnet ? 'testnet' : 'mainnet', verifyBlockchain: true, action: 'beneficiary_listing_payment' }
      );

      if (!sendResult.success || !sendResult.confirmedInBlock) {
        throw new Error(sendResult.error || 'Транзакция не подтверждена');
      }

      await apiService.confirmBeneficiaryListingPayment(listing.id, walletAddress, sendResult.hash);
      await apiService.createPendingAction({
        actionType: 'transfer_beneficiary',
        targetType: 'zone',
        targetAddress: listing.zoneAddress,
        targetCollectionAddress: listing.zoneAddress,
        targetName: listing.zoneName,
        requestedBy: walletAddress,
        newPartnerAddress: walletAddress,
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
    } catch (error: any) {
      setError(key, error?.message || 'Ошибка');
    } finally {
      setBusyKey(null);
    }
  };

  const cardStyle: React.CSSProperties = {
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
        const zoneName = zone.domain || zone.name;
        const presumedSeller = zone.creator_address || zone.owner_address;
        const takeKey = listing ? `take-${listing.id}` : '';
        const offerKey = `offer-${zoneAddressRaw}`;

        return (
          <div key={zone.address} style={cardStyle}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: colors.text, marginBottom: '6px' }}>{zoneName}</div>

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
                    style={{ ...buttonStyle(busyKey === offerKey), width: 'auto', padding: '8px 14px' }}
                  >
                    {busyKey === offerKey ? '...' : `💬 ${t('marketBeneficiaryMakeOffer') || 'Оффер'}`}
                  </button>
                </div>
                {errorByKey[offerKey] && <p style={{ color: colors.error, fontSize: '12px', marginTop: '6px' }}>{errorByKey[offerKey]}</p>}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default BeneficiariesTab;
