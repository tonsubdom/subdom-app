//для майннета
// src/hooks/useAlphaAccess.ts

import { useState, useEffect, useCallback } from 'react';
import { useTonWallet, useTonAddress } from '@tonconnect/ui-react';
import { checkWhitelist } from '@/utils/whitelistUtils';

export type AccessStatus =
  | 'disconnected'
  | 'mainnet-whitelisted'      // ✅ Mainnet + в вайтлисте
  | 'mainnet-not-whitelisted'  // ✅ Mainnet, но не в вайтлисте
  | 'testnet-whitelisted'
  | 'testnet-not-whitelisted'
  | 'loading';

interface AlphaAccessInfo {
  status: AccessStatus;
  isTestnet: boolean;
  isWhitelisted: boolean;
  telegramName?: string;
  testnetAddress?: string;
  hasAccess: boolean;            // true если whitelisted (любая сеть)
  rawAddress?: string;
  chain?: string;
}

export function useAlphaAccess(): AlphaAccessInfo {
  const wallet = useTonWallet();
  const address = useTonAddress();

  const [accessInfo, setAccessInfo] = useState<AlphaAccessInfo>({
    status: 'loading',
    isTestnet: false,
    isWhitelisted: false,
    hasAccess: false,
  });

  const checkAccess = useCallback(() => {
    console.log('🔍 useAlphaAccess — wallet:', !!wallet, 'address:', address);
    console.log('🔍 chain:', wallet?.account?.chain);
    if (!wallet || !address) {
      setAccessInfo({
        status: 'disconnected',
        isTestnet: false,
        isWhitelisted: false,
        hasAccess: false,
        rawAddress: address,
        chain: wallet?.account?.chain,
      });
      return;
    }

    const chain = wallet.account?.chain;
    const isTestnet = chain === '-3';

    console.log('🔍 isTestnet:', isTestnet);

  const whitelistCheck = checkWhitelist(address, isTestnet);
  console.log('🔍 checkWhitelist результат:', whitelistCheck);


    if (whitelistCheck.isWhitelisted) {
      // Есть в whitelist — доступ есть в любой сети
      const status: AccessStatus = isTestnet
        ? 'testnet-whitelisted'
        : 'mainnet-whitelisted';

      setAccessInfo({
        status,
        isTestnet,
        isWhitelisted: true,
        telegramName: whitelistCheck.telegramName,
        testnetAddress: whitelistCheck.testnetAddress,
        hasAccess: true,
        rawAddress: address,
        chain,
      });
    } else {
      // Нет в whitelist — доступ запрещён
      const status: AccessStatus = isTestnet
        ? 'testnet-not-whitelisted'
        : 'mainnet-not-whitelisted';

      setAccessInfo({
        status,
        isTestnet,
        isWhitelisted: false,
        testnetAddress: whitelistCheck.testnetAddress,
        hasAccess: false,
        rawAddress: address,
        chain,
      });
    }
  }, [wallet, address]);

  useEffect(() => {
    const timer = setTimeout(() => checkAccess(), 50);
    return () => clearTimeout(timer);
  }, [checkAccess]);

  return accessInfo;
}

/**
 * Хук для управления модальным окном доступа
 */
export function useAlphaAccessModal() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'mainnet' | 'not-whitelisted'>('mainnet');
  const [testnetAddress, setTestnetAddress] = useState<string>();

  const accessInfo = useAlphaAccess();

  const showModal = useCallback((type: 'mainnet' | 'not-whitelisted', address?: string) => {
    setModalType(type);
    setTestnetAddress(address);
    setModalOpen(true);
  }, []);

  const hideModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  // Автоматически показываем модалку при отсутствии доступа
  useEffect(() => {
    if (accessInfo.status === 'mainnet-not-whitelisted') {
      // Mainnet, не в вайтлисте — показываем модалку "не в списке"
      showModal('not-whitelisted', accessInfo.testnetAddress);
    } else if (accessInfo.status === 'testnet-not-whitelisted') {
      // Testnet, не в вайтлисте — та же модалка
      showModal('not-whitelisted', accessInfo.testnetAddress);
    } else if (
      accessInfo.status === 'mainnet-whitelisted' ||
      accessInfo.status === 'testnet-whitelisted'
    ) {
      // Есть доступ — скрываем модалку
      if (modalOpen) hideModal();
    }
    // Отключаем mainnet-not-whitelisted vs mainnet отдельно.
    // Раньше у тебя был статус 'mainnet' который блокировал всех.
    // Сейчас mainnet-whitelisted — это норм, mainnet-not-whitelisted — модалка.
  }, [accessInfo.status, accessInfo.testnetAddress, showModal, hideModal, modalOpen]);

  return {
    modalOpen,
    modalType,
    testnetAddress,
    hideModal,
    accessInfo,
    showModal,
  };
}
