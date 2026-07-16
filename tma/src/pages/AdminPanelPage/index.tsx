// src/pages/AdminPanelPage/index.tsx
import React, { useState, useEffect } from 'react';
import { useTonAddress, useTonWallet } from "@tonconnect/ui-react";
import AdminPanelPage from './AdminPanelPage';
import { convertUserFriendlyToRaw } from '@/utils/tonUtils';


const OWNER_TESTNET_RAW = import.meta.env.VITE_PLATFORM_OWNER_TESTNET;
const OWNER_MAINNET_RAW = import.meta.env.VITE_PLATFORM_OWNER_MAINNET;


const ProtectedAdminPanel: React.FC = () => {
  const address = useTonAddress();
  const wallet = useTonWallet();
  const isTestnet = wallet?.account?.chain === '-3';
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  useEffect(() => {
    // Проверяем авторизацию
    const checkAuthorization = () => {
      setIsChecking(true);

      const rawAddress = address ? convertUserFriendlyToRaw(address) : '';
      const OWNER_ADDRESS = isTestnet ? OWNER_TESTNET_RAW : OWNER_MAINNET_RAW;
      

      // Если нет адреса или адрес не совпадает с владельцем
      if (!address || rawAddress !== OWNER_ADDRESS) {
        setIsAuthorized(false);
        // Перенаправляем на главную страницу через 2 секунды
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        setIsAuthorized(true);
      }
      
      setIsChecking(false);
    };

    checkAuthorization();
  }, [address]);

  // Показываем загрузку
  if (isChecking) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#111827',
        color: 'white',
        fontFamily: 'monospace'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '20px' }}>🔐</div>
          <div>Checking authorization...</div>
        </div>
      </div>
    );
  }

  // Если не авторизован, показываем сообщение
  if (!isAuthorized) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#111827',
        color: 'white',
        fontFamily: 'monospace'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🚫</div>
          <h1 style={{ marginBottom: '10px' }}>Access Denied</h1>
          <p style={{ color: '#9CA3AF' }}>
            This page is only accessible to the owner.
          </p>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '10px' }}>
            Redirecting to home page...
          </p>
        </div>
      </div>
    );
  }

  // Если авторизован, показываем админ-панель
  return <AdminPanelPage />;
};

export default ProtectedAdminPanel;
