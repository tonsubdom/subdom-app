// src/pages/AdminPanelPage/index.tsx
//
// TonProof-логин перед показом админки. Быстрый клиентский чек адреса
// остаётся как UX-фильтр (не показывать форму логина случайным юзерам),
// но реальная защита — на бэкенде (requireAdminAuth, см.
// subdom-server/src/utils/adminAuth.ts) через JWT, выданный после проверки
// ton_proof (subdom-server/src/utils/tonProof.ts).
//
// TonConnect может запросить ton_proof только В МОМЕНТ подключения кошелька
// — у уже подключённой сессии (обычный кейс, юзер уже коннектнут для
// остального приложения) proof взять неоткуда. Единственный способ его
// получить — disconnect + переподключение с setConnectRequestParameters
// (tonProof). Это временно разрывает коннект кошелька для всего
// приложения, не только для админки — ожидаемо, происходит только по
// явному клику "Войти".

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTonAddress, useTonWallet, useTonConnectUI } from '@tonconnect/ui-react';
import AdminPanelPage from './AdminPanelPage';
import { apiService } from '@/services/api';
import { convertUserFriendlyToRaw } from '@/utils/tonUtils';

const OWNER_TESTNET_RAW = import.meta.env.VITE_PLATFORM_OWNER_TESTNET;
const OWNER_MAINNET_RAW = import.meta.env.VITE_PLATFORM_OWNER_MAINNET;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const ADMIN_TOKEN_STORAGE_KEY = 'subdom_admin_jwt';

type LoginState = 'idle' | 'connecting' | 'verifying' | 'error';

const ProtectedAdminPanel: React.FC = () => {
  const address = useTonAddress();
  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();
  const navigate = useNavigate();
  const isTestnet = wallet?.account?.chain === '-3';

  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [looksLikeOwner, setLooksLikeOwner] = useState<boolean>(false);

  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY));
  const [loginState, setLoginState] = useState<LoginState>('idle');
  const [loginError, setLoginError] = useState<string | null>(null);
  // Пока идёт логин, handleLogin сам disconnect()-ит кошелёк перед
  // переподключением (обязательно для ton_proof) — на это мгновение
  // address становится пустым, и без этого флага looksLikeOwner-гейт ниже
  // тут же посчитал бы юзера "не владельцем" и выкинул на главную ДО того,
  // как успевала открыться модалка переподключения. Баг был найден и
  // воспроизведён вживую 2026-08-02.
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  useEffect(() => {
    apiService.setAdminToken(token);
  }, [token]);

  // Быстрый UX-фильтр — не пропускает к форме логина случайных юзеров.
  // Не является защитой сам по себе (адрес легко подделать в devtools),
  // реальная проверка — на бэкенде при check-proof.
  useEffect(() => {
    setIsChecking(true);
    const rawAddress = address ? convertUserFriendlyToRaw(address) : '';
    const OWNER_ADDRESS = isTestnet ? OWNER_TESTNET_RAW : OWNER_MAINNET_RAW;
    setLooksLikeOwner(!!address && rawAddress === OWNER_ADDRESS);
    setIsChecking(false);
  }, [address, isTestnet]);

  // Редирект на главную для чужих — тот же хук должен вызываться всегда
  // (Rules of Hooks), условие — внутри эффекта, не вокруг вызова хука.
  // isLoggingIn гейт см. комментарий у объявления состояния выше.
  useEffect(() => {
    if (isChecking || looksLikeOwner || isLoggingIn) return;
    const t = setTimeout(() => { navigate('/'); }, 2000);
    return () => clearTimeout(t);
  }, [isChecking, looksLikeOwner, isLoggingIn, navigate]);

  const handleLogin = useCallback(async () => {
    setIsLoggingIn(true);
    setLoginState('connecting');
    setLoginError(null);
    try {
      const payloadRes = await fetch(`${API_BASE_URL}/api/admin/auth/payload`);
      if (!payloadRes.ok) throw new Error(`payload HTTP ${payloadRes.status}`);
      const { payload } = await payloadRes.json();

      // Одноразовый слушатель следующего успешного коннекта — именно он
      // придёт с запрошенным tonProof в connectItems. tonConnectUI.disconnect()
      // ниже сам триггерит onStatusChange(null) — это НЕ провал логина, а
      // ожидаемый побочный эффект отключения перед переподключением. Раньше
      // это null-событие ловилось тем же listener'ом, который тут же себя
      // отписывал и сбрасывал isLoggingIn — то есть логин падал ещё до того,
      // как открывалась модалка переподключения. Игнорируем null и ждём
      // именно следующего реального коннекта.
      const unsubscribe = tonConnectUI.onStatusChange(async (connectedWallet) => {
        if (!connectedWallet) {
          return;
        }
        unsubscribe();
        const proofReply = connectedWallet.connectItems?.tonProof;
        if (!proofReply || !('proof' in proofReply)) {
          setLoginState('error');
          setLoginError('Кошелёк не вернул ton_proof (не поддерживается или отклонено)');
          setIsLoggingIn(false);
          return;
        }

        setLoginState('verifying');
        try {
          const network = connectedWallet.account.chain === '-3' ? 'testnet' : 'mainnet';
          const checkRes = await fetch(`${API_BASE_URL}/api/admin/auth/check-proof`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: connectedWallet.account.address,
              network,
              proof: proofReply.proof,
            }),
          });
          if (!checkRes.ok) {
            const err = await checkRes.json().catch(() => ({}));
            throw new Error(err?.error || `check-proof HTTP ${checkRes.status}`);
          }
          const { token: newToken } = await checkRes.json();
          sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, newToken);
          setToken(newToken);
          setLoginState('idle');
          // isLoggingIn остаётся true — не сбрасываем специально, чтобы
          // случайная задержка обновления address/looksLikeOwner на этот
          // самый момент не выкинула только что залогиненного юзера обратно
          // на Access Denied той же гонкой, что и была изначальным багом.
        } catch (e: any) {
          setLoginState('error');
          setLoginError(e?.message || 'Ошибка проверки ton_proof');
          setIsLoggingIn(false);
        }
      });

      tonConnectUI.setConnectRequestParameters({ state: 'ready', value: { tonProof: payload } });
      await tonConnectUI.disconnect();
      await tonConnectUI.openModal();
    } catch (e: any) {
      setLoginState('error');
      setLoginError(e?.message || 'Ошибка входа');
      setIsLoggingIn(false);
    }
  }, [tonConnectUI]);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    setToken(null);
  }, []);

  const wrapperStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#111827',
    color: 'white',
    fontFamily: 'monospace',
    padding: '20px',
  };

  if (isChecking) {
    return (
      <div style={wrapperStyle}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '20px' }}>🔐</div>
          <div>Checking authorization...</div>
        </div>
      </div>
    );
  }

  // isLoggingIn: во время disconnect->reconnect адрес временно пуст — это не
  // "чужой", а середина логина, см. комментарий у объявления isLoggingIn выше.
  if (!looksLikeOwner && !isLoggingIn) {
    return (
      <div style={wrapperStyle}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🚫</div>
          <h1 style={{ marginBottom: '10px' }}>Access Denied</h1>
          <p style={{ color: '#9CA3AF' }}>This page is only accessible to the owner.</p>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '10px' }}>Redirecting to home page...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div style={wrapperStyle}>
        <div style={{ textAlign: 'center', maxWidth: '340px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔑</div>
          <h1 style={{ marginBottom: '10px', fontSize: '18px' }}>Вход в админку (TonProof)</h1>
          <p style={{ color: '#9CA3AF', fontSize: '13px', marginBottom: '20px' }}>
            Кошелёк переподключится, чтобы подписать подтверждение владения адресом — это разорвёт текущую сессию
            кошелька во всём приложении на несколько секунд.
          </p>
          <button
            onClick={handleLogin}
            disabled={loginState === 'connecting' || loginState === 'verifying'}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              background: loginState === 'idle' || loginState === 'error' ? '#FFD700' : '#374151',
              color: loginState === 'idle' || loginState === 'error' ? '#000' : '#9CA3AF',
              fontWeight: 700,
              fontSize: '14px',
              cursor: loginState === 'connecting' || loginState === 'verifying' ? 'default' : 'pointer',
            }}
          >
            {loginState === 'connecting' && 'Подключение кошелька...'}
            {loginState === 'verifying' && 'Проверка подписи...'}
            {(loginState === 'idle' || loginState === 'error') && 'Войти'}
          </button>
          {loginError && (
            <p style={{ color: '#e53935', fontSize: '12px', marginTop: '16px' }}>{loginError}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ position: 'fixed', top: 8, right: 8, zIndex: 10001 }}>
        <button
          onClick={handleLogout}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid #374151',
            background: '#111827',
            color: '#9CA3AF',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          Выйти из админки
        </button>
      </div>
      <AdminPanelPage />
    </>
  );
};

export default ProtectedAdminPanel;
