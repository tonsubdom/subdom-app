// src/hooks/useZonePayment.ts
// Общая логика оплаты попытки создания зоны (proxy/SBT), вынесена из степпера
// CreateCollectionPage, чтобы её же мог использовать интерактивный
// PaymentAttemptsSection в профиле — без дублирования транзакционной логики.

import { useCallback, useMemo } from 'react';
import { useTonWallet, useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { apiService, ZoneLength } from '@/services/api';
import { TransactionService } from '@/services/transactionService';
import { TonUtilsEnhanced } from '@/utils/tonUtilsEnhanced';

export type ZoneType = 'proxy' | 'sbt';

const proxyPrices: Record<ZoneLength, number> = {
  4: 100,
  5: 50,
  6: 40,
  7: 30,
  8: 20,
  9: 10,
};

const sbtPrices: Record<ZoneLength, number> = {
  4: 5,
  5: 2.5,
  6: 2,
  7: 1.5,
  8: 1,
  9: 0.5,
};

export const getZonePrice = (zoneType: ZoneType, length: ZoneLength): number =>
  zoneType === 'proxy' ? proxyPrices[length] : sbtPrices[length];

export interface ZonePaymentResult {
  success: boolean;
  confirmedInBlock?: boolean;
  error?: string;
}

export const useZonePayment = () => {
  const wallet = useTonWallet();
  const address = useTonAddress();
  const isTestnet = wallet?.account?.chain === '-3';
  const [tonConnectUI] = useTonConnectUI();

  const ownerAddress = isTestnet
    ? (import.meta.env.VITE_PAYMENT_OWNER_TESTNET || '')
    : (import.meta.env.VITE_PAYMENT_OWNER_MAINNET || '');
  const partnerAddress = isTestnet
    ? (import.meta.env.VITE_PAYMENT_PARTNER_TESTNET || '')
    : (import.meta.env.VITE_PAYMENT_PARTNER_MAINNET || '');

  const tonUtils = useMemo(
    () => new TonUtilsEnhanced({ network: isTestnet ? 'testnet' : 'mainnet' }),
    [isTestnet]
  );

  const payForZone = useCallback(
    async (
      zoneType: ZoneType,
      length: ZoneLength,
      onStatusUpdate?: (status: string) => void
    ): Promise<ZonePaymentResult> => {
      if (!wallet || !address) {
        return { success: false, error: 'walletNotConnected' };
      }

      const price = getZonePrice(zoneType, length);

      try {
        const transaction = {
          validUntil: Math.floor(Date.now() / 1000) + 240,
          messages: [
            {
              address: ownerAddress,
              amount: ((price / 2) * 1_000_000_000).toString(),
            },
            {
              address: partnerAddress,
              amount: ((price / 2) * 1_000_000_000).toString(),
            },
          ],
        };

        onStatusUpdate?.('Отправка платежа...');
        const result = await TransactionService.sendTransaction(tonConnectUI, transaction, {
          network: isTestnet ? 'testnet' : 'mainnet',
          maxRetries: 3,
          timeout: 60000,
          verifyBlockchain: true,
        });

        if (!result.success) {
          return { success: false, error: result.error };
        }

        let confirmedInBlock = false;
        if (result.hash) {
          onStatusUpdate?.('Проверка подтверждения в блокчейне...');
          const verification = await tonUtils.checkTransactionWithRetry(result.hash, {
            maxAttempts: 5,
            timeout: 30000,
          });
          confirmedInBlock = !!verification.confirmed;
        }

        const recordResponse = await apiService.addPaymentAttempt(address, zoneType, length);
        if (!recordResponse.success) {
          return { success: false, error: 'paymentRecordError' };
        }

        return { success: true, confirmedInBlock };
      } catch (error: any) {
        return { success: false, error: error?.message || 'paymentFailed' };
      }
    },
    [wallet, address, isTestnet, tonConnectUI, ownerAddress, partnerAddress, tonUtils]
  );

  return { payForZone, isTestnet, address };
};
