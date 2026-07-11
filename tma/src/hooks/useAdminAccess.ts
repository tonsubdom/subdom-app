// src/hooks/useAdminAccess.ts
import { useState, useEffect, useCallback } from 'react';
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { convertUserFriendlyToRaw } from '@/utils/tonUtils';

const OWNER_TESTNET_RAW = '0:36f50914175fb02d4402bb955869d339a8f7c519d4e9ceb0bb08f48967b12d58';
const OWNER_MAINNET_RAW = '0:098507db36d99a5a9628815a28e7db25a71c3c60bbf71e5bb138e3cf1c78549c';

export const useAdminAccess = () => {
  const [clickCount, setClickCount] = useState<number>(0);
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const address = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();

  // Используем ref для отслеживания isOwner без пересоздания callback
  const chain = tonConnectUI.account?.chain;
  const isTestnet = chain === '-3';
  
  const normalizedAddress = address ? convertUserFriendlyToRaw(address) : '';
  const isOwner = isTestnet
    ? normalizedAddress === OWNER_TESTNET_RAW
    : normalizedAddress === OWNER_MAINNET_RAW;

  console.log(`[AdminAccess] Кошелёк: ${address}, chain: ${chain}, isTestnet: ${isTestnet}`);
  console.log(`[AdminAccess] normalizedAddress: ${normalizedAddress}, isOwner: ${isOwner}`);

  // Сбрасываем счётчик через 3 секунды
  useEffect(() => {
    if (clickCount > 0) {
      console.log(`[AdminAccess] Установлен таймер сброса. clickCount: ${clickCount}`);
      const timer = setTimeout(() => {
        console.log(`[AdminAccess] Таймер сработал — сброс clickCount`);
        setClickCount(0);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [clickCount]);

  const handleSubdomClick = useCallback(() => {
    const now = Date.now();

    // Если прошло больше 3 секунд с последнего клика — сбрасываем
    if (now - lastClickTime > 3000) {
      console.log(`[AdminAccess] Прошло >3с — сброс на 1`);
      setClickCount(1);
    } else {
      setClickCount(prev => {
        const newCount = prev + 1;
        console.log(`[AdminAccess] Клик! prev: ${prev}, new: ${newCount}, isOwner: ${isOwner}`);

        if (newCount >= 5 && isOwner) {
          console.log(`[AdminAccess] 🚀 5 кликов + isOwner! Переходим в админку!`);
          window.location.href = '/#/admin';
          return 0;
        }
        return newCount;
      });
    }

    setLastClickTime(now);
  }, [lastClickTime, isOwner]);

  return {
    clickCount,
    handleSubdomClick,
    isOwner,
  };
};
