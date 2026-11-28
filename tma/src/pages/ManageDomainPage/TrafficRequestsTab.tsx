// src/pages/ManageDomainPage/TrafficRequestsTab.tsx
//
// Manager -> "Запросы" (SBT Top-Chart) — публичный список ВСЕХ активных
// SBT-субдоменов платформы (не только своих, в отличие от остальной
// страницы, см. "Свои"/"Запросы" переключатель в ManageDomainPage.tsx).
// Два независимых действия на карточке:
//  - "Предложить привязку" — заявка владельцу привязать конкретный
//    адрес/ADNL/bagID DNS-записью (тот же backend-путь, что у кнопки
//    "Попросить трафик" в боте, см. telegramBot.createTrafficRequest).
//  - Лайк — НЕ бесплатный клик, а подтверждённая 0.01 TON транзакция прямо
//    владельцу субдомена (так задумано юзером: "будут биться за первое
//    место в трафике" — лайк должен стоить что-то, иначе рейтинг тривиально
//    накручивается). Сортировка списка — по количеству лайков (сервер, см.
//    GET /api/traffic/subdomains).

import React, { useEffect, useMemo, useState } from 'react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { beginCell } from '@ton/core';
import { apiService } from '@/services/api';
import { TransactionService } from '@/services/transactionService';
import { convertRawToUserFriendly, convertRawToUserFriendlyTest, fetchAllDnsRecords } from '@/utils/tonUtils';
import type { DnsRecordsSnapshot } from '@/services/payloadBuilder/dns';

const NO_IMAGE_PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 90 90"><rect width="90" height="90" fill="%23f0f0f0"/><text x="45" y="45" font-family="Arial" font-size="10" fill="%23999" text-anchor="middle" dy=".3em">No Image</text></svg>';

const LIKE_AMOUNT_TON = 0.01;

interface TrafficSubdomain {
  itemAddress: string;
  name: string;
  zoneName: string | null;
  image: string | null;
  description: string | null;
  ownerAddress: string;
  likeCount: number;
  likedByMe: number;
}

interface TrafficRequestsTabProps {
  isDark: boolean;
  isTestnet: boolean;
  t: (key: string) => string;
  walletAddress?: string;
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// op=0 (простой текстовый комментарий) — стандартный формат, который
// кошельки/эксплореры показывают как memo транзакции.
function buildLikeComment(domain: string): string {
  const cell = beginCell().storeUint(0, 32).storeStringTail(`Like for ${domain} in SBT Top-Chart via @subdom`).endCell();
  return cell.toBoc().toString('base64');
}

export const TrafficRequestsTab: React.FC<TrafficRequestsTabProps> = ({ isDark, isTestnet, t, walletAddress }) => {
  const [tonConnectUI] = useTonConnectUI();

  const [items, setItems] = useState<TrafficSubdomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [proposeTarget, setProposeTarget] = useState<TrafficSubdomain | null>(null);
  // ADNL и bagID — оба ровно 64 символа, одним полем с плейсхолдером
  // "address, либо adnl, либо bagID" юзер не мог понять, что именно от
  // него хотят — три отдельных поля, по одному на тип DNS-записи, заполнять
  // нужно ровно одно (запись бывает только одного типа за раз).
  const [proposeAddress, setProposeAddress] = useState('');
  const [proposeAdnl, setProposeAdnl] = useState('');
  const [proposeBagId, setProposeBagId] = useState('');
  const proposeValue = proposeAddress.trim() || proposeAdnl.trim() || proposeBagId.trim();
  const [proposeBusy, setProposeBusy] = useState(false);
  const [proposeResult, setProposeResult] = useState<string | null>(null);
  // Точечный (по клику, без краулера) показ уже существующих записей айтема
  // перед тем, как предлагать новую — см. Kanban/Log 2026-11-28.
  const [existingRecords, setExistingRecords] = useState<DnsRecordsSnapshot | null>(null);
  const [existingRecordsLoading, setExistingRecordsLoading] = useState(false);

  const openProposeModal = (item: TrafficSubdomain) => {
    setProposeTarget(item);
    setExistingRecords(null);
    setExistingRecordsLoading(true);
    fetchAllDnsRecords(item.itemAddress, isTestnet)
      .then(setExistingRecords)
      .finally(() => setExistingRecordsLoading(false));
  };

  const [likeTarget, setLikeTarget] = useState<TrafficSubdomain | null>(null);
  const [likeBusy, setLikeBusy] = useState(false);
  const [likeError, setLikeError] = useState<string | null>(null);

  // Пагинация — без неё список ВСЕХ активных SBT-субдоменов платформы
  // рендерился целиком и приложение подвисало при росте каталога (см.
  // Kanban 2026-11-28). Тот же паттерн, что в Market "Субдомены".
  const TRAFFIC_PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState<number>(0);

  const loadItems = async () => {
    setLoading(true);
    try {
      const result = await apiService.getTrafficSubdomains(walletAddress);
      setItems(result.success ? (result.data as TrafficSubdomain[]) || [] : []);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadItems();
  }, [walletAddress, isTestnet]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => item.name.toLowerCase().includes(query));
  }, [items, searchQuery]);

  // Сброс на первую страницу при смене поиска/перезагрузке списка — иначе
  // после фильтрации пользователь может застрять на пустой странице N.
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, items]);

  const totalPages = Math.ceil(filteredItems.length / TRAFFIC_PAGE_SIZE);
  const pagedItems = filteredItems.slice(
    currentPage * TRAFFIC_PAGE_SIZE,
    currentPage * TRAFFIC_PAGE_SIZE + TRAFFIC_PAGE_SIZE
  );

  const closeProposeModal = () => {
    setProposeTarget(null);
    setProposeAddress('');
    setProposeAdnl('');
    setProposeBagId('');
    setProposeResult(null);
    setExistingRecords(null);
  };

  const handleSubmitPropose = async () => {
    if (!proposeTarget || !proposeValue) return;
    setProposeBusy(true);
    setProposeResult(null);
    try {
      const result = await apiService.createTrafficRequest({
        domain: proposeTarget.name,
        requestedValue: proposeValue,
        requesterAddress: walletAddress,
      });
      if (!result.success) {
        setProposeResult(result.message || t('trafficRequestError') || 'Не удалось отправить заявку');
      } else if (result.ownerNotified) {
        setProposeResult(t('trafficRequestSentWeb') || '✅ Ваша просьба отправлена владельцу субдомена');
      } else {
        setProposeResult(t('trafficRequestOwnerNotLinkedWeb') || '⚠️ Заявка сохранена, но владелец ещё не подтвердил Telegram — уведомление не доставлено');
      }
    } catch (error: any) {
      setProposeResult(error?.message || t('trafficRequestError') || 'Не удалось отправить заявку');
    } finally {
      setProposeBusy(false);
    }
  };

  const closeLikeModal = () => {
    if (likeBusy) return;
    setLikeTarget(null);
    setLikeError(null);
  };

  const handleConfirmLike = async () => {
    if (!likeTarget || !walletAddress) return;
    setLikeBusy(true);
    setLikeError(null);
    try {
      const ownerFriendly = isTestnet
        ? convertRawToUserFriendlyTest(likeTarget.ownerAddress)
        : convertRawToUserFriendly(likeTarget.ownerAddress);

      const nanotons = BigInt(Math.round(LIKE_AMOUNT_TON * 1_000_000_000)).toString();
      const tx = {
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [{ address: ownerFriendly, amount: nanotons, payload: buildLikeComment(likeTarget.name) }],
      };

      const sendResult = await TransactionService.sendTransaction(tonConnectUI, tx, {
        network: isTestnet ? 'testnet' : 'mainnet',
        verifyBlockchain: true,
        action: 'traffic_like',
      });
      if (!sendResult.success || !sendResult.confirmedInBlock || !sendResult.hash) {
        throw new Error(sendResult.error || t('trafficLikeError') || 'Не удалось отправить лайк');
      }

      const likeResult = await apiService.likeTrafficSubdomain({
        domain: likeTarget.name,
        likerAddress: walletAddress,
        txHash: sendResult.hash,
      });
      if (!likeResult.success) {
        throw new Error(likeResult.message || t('trafficLikeError') || 'Не удалось отправить лайк');
      }

      setItems((prev) =>
        prev
          .map((item) =>
            item.name === likeTarget.name
              ? { ...item, likeCount: likeResult.likeCount ?? item.likeCount + 1, likedByMe: 1 }
              : item
          )
          .sort((a, b) => b.likeCount - a.likeCount)
      );
      setLikeTarget(null);
    } catch (error: any) {
      setLikeError(error?.message || t('trafficLikeError') || 'Не удалось отправить лайк');
    } finally {
      setLikeBusy(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    display: 'flex',
    gap: '14px',
    padding: '14px',
    borderRadius: '10px',
    background: isDark ? '#2d2d2d' : '#f5f5f5',
    border: `1px solid ${isDark ? '#3d3d3d' : '#e5e5e5'}`,
    marginBottom: '10px',
  };

  const smallButtonStyle = (busy: boolean, primary = true): React.CSSProperties => ({
    padding: '7px 12px',
    borderRadius: '8px',
    border: primary ? 'none' : `1px solid ${isDark ? '#3d3d3d' : '#e5e5e5'}`,
    background: primary ? (busy ? (isDark ? '#555' : '#ccc') : (isDark ? '#FFD700' : '#3B82F6')) : 'transparent',
    color: primary ? (isDark ? '#000' : '#fff') : (isDark ? '#aaa' : '#666'),
    fontWeight: 600,
    fontSize: '12px',
    cursor: busy ? 'default' : 'pointer',
  });

  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  };

  const modalCardStyle: React.CSSProperties = {
    background: isDark ? '#1a1a1a' : '#fff',
    borderRadius: '12px',
    padding: '20px',
    maxWidth: '400px',
    width: '100%',
    border: `1px solid ${isDark ? '#3d3d3d' : '#e5e5e5'}`,
  };

  return (
    <div>
      <div
        style={{
          fontSize: '15px',
          fontWeight: 700,
          marginBottom: '10px',
          color: isDark ? '#fff' : '#111',
        }}
      >
        🏆 {t('trafficTopChartTitle') || 'SBT Top-Chart'}
      </div>

      <input
        type="text"
        placeholder={t('trafficSearchPlaceholder') || 'Поиск по имени субдомена'}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '10px 12px',
          borderRadius: '8px',
          border: `1px solid ${isDark ? '#3d3d3d' : '#e5e5e5'}`,
          background: isDark ? '#2d2d2d' : '#fff',
          color: isDark ? '#fff' : '#111',
          fontSize: '13px',
          marginBottom: '12px',
        }}
      />

      {loading ? (
        <div style={{ textAlign: 'center', color: isDark ? '#aaa' : '#666', padding: '20px' }}>{t('loading') || 'Загрузка...'}</div>
      ) : filteredItems.length === 0 ? (
        <div style={{ textAlign: 'center', color: isDark ? '#aaa' : '#666', padding: '20px', fontSize: '13px' }}>
          {t('trafficEmpty') || 'Пока нет SBT-субдоменов на платформе'}
        </div>
      ) : (
        pagedItems.map((item) => (
          <div key={item.itemAddress} style={cardStyle}>
            <img
              src={item.image || NO_IMAGE_PLACEHOLDER}
              alt={item.name}
              loading="lazy"
              decoding="async"
              style={{
                width: '70px',
                height: '70px',
                borderRadius: '8px',
                objectFit: 'cover',
                flexShrink: 0,
                border: `1px solid ${isDark ? '#3d3d3d' : '#e5e5e5'}`,
              }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = NO_IMAGE_PLACEHOLDER;
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: isDark ? '#fff' : '#111', wordBreak: 'break-word' }}>
                {item.name}
              </div>
              <div style={{ fontSize: '11px', color: isDark ? '#aaa' : '#666', marginBottom: '8px' }}>
                {t('trafficOwner') || 'Владелец'}: {shortAddress(item.ownerAddress)}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => !item.likedByMe && walletAddress && setLikeTarget(item)}
                  disabled={!!item.likedByMe || !walletAddress}
                  style={{
                    ...smallButtonStyle(false, false),
                    cursor: item.likedByMe || !walletAddress ? 'default' : 'pointer',
                    opacity: item.likedByMe ? 0.6 : 1,
                  }}
                >
                  {item.likedByMe ? '❤️' : '🤍'} {item.likeCount}
                </button>
                <button onClick={() => openProposeModal(item)} style={smallButtonStyle(false, true)}>
                  📡 {t('trafficProposeButton') || 'Предложить привязку'}
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      {totalPages > 1 && (
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
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: `1px solid ${isDark ? '#3d3d3d' : '#e5e5e5'}`,
              background: currentPage === 0 ? 'transparent' : (isDark ? '#2d2d2d' : '#fff'),
              color: currentPage === 0 ? (isDark ? '#aaa' : '#666') : (isDark ? '#fff' : '#111'),
              cursor: currentPage === 0 ? 'default' : 'pointer',
              fontSize: '13px',
            }}
          >
            ‹ {t('marketPrev') || 'Назад'}
          </button>
          <span style={{ fontSize: '13px', color: isDark ? '#aaa' : '#666' }}>
            {currentPage + 1} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: `1px solid ${isDark ? '#3d3d3d' : '#e5e5e5'}`,
              background: currentPage === totalPages - 1 ? 'transparent' : (isDark ? '#2d2d2d' : '#fff'),
              color: currentPage === totalPages - 1 ? (isDark ? '#aaa' : '#666') : (isDark ? '#fff' : '#111'),
              cursor: currentPage === totalPages - 1 ? 'default' : 'pointer',
              fontSize: '13px',
            }}
          >
            {t('marketNext') || 'Вперёд'} ›
          </button>
        </div>
      )}

      {/* Модалка "Предложить привязку" */}
      {proposeTarget && (
        <div style={modalOverlayStyle} onClick={closeProposeModal}>
          <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '10px', color: isDark ? '#fff' : '#111' }}>
              {(t('trafficProposeTitle') || 'Предложить запись для {domain}').replace('{domain}', proposeTarget.name)}
            </div>
            <div style={{ fontSize: '11px', color: isDark ? '#aaa' : '#666', marginBottom: '8px' }}>
              {t('trafficProposeHint') || 'Заполните ровно одно поле — запись бывает только одного типа'}
            </div>

            {existingRecordsLoading ? (
              <div style={{ fontSize: '11px', color: isDark ? '#aaa' : '#666', marginBottom: '10px' }}>
                {t('trafficExistingRecordsLoading') || 'Проверяем текущие записи…'}
              </div>
            ) : existingRecords && (existingRecords.wallet || existingRecords.site || existingRecords.storage) ? (
              <div
                style={{
                  fontSize: '11px',
                  color: isDark ? '#ddd' : '#333',
                  background: isDark ? '#2d2d2d' : '#f0f0f0',
                  border: `1px solid ${isDark ? '#3d3d3d' : '#e5e5e5'}`,
                  borderRadius: '8px',
                  padding: '8px 10px',
                  marginBottom: '10px',
                  wordBreak: 'break-all',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                  {t('trafficExistingRecordsTitle') || 'Уже привязано:'}
                </div>
                {existingRecords.wallet && <div>Address: {existingRecords.wallet}</div>}
                {existingRecords.site && <div>ADNL: {existingRecords.site}</div>}
                {existingRecords.storage && <div>bagID: {existingRecords.storage}</div>}
              </div>
            ) : null}

            {([
              { value: proposeAddress, setValue: setProposeAddress, placeholder: t('trafficProposePlaceholderAddress') || 'Address' },
              { value: proposeAdnl, setValue: setProposeAdnl, placeholder: t('trafficProposePlaceholderAdnl') || 'ADNL' },
              { value: proposeBagId, setValue: setProposeBagId, placeholder: t('trafficProposePlaceholderBagId') || 'bagID' },
            ] as const).map((field, i) => (
              <input
                key={i}
                type="text"
                placeholder={field.placeholder}
                value={field.value}
                onChange={(e) => field.setValue(e.target.value)}
                disabled={proposeBusy}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${isDark ? '#3d3d3d' : '#e5e5e5'}`,
                  background: isDark ? '#2d2d2d' : '#fff',
                  color: isDark ? '#fff' : '#111',
                  fontSize: '13px',
                  marginBottom: '8px',
                }}
              />
            ))}
            <div style={{ height: '4px' }} />
            {proposeResult && (
              <div style={{ fontSize: '12px', color: isDark ? '#ddd' : '#333', marginBottom: '12px' }}>{proposeResult}</div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleSubmitPropose}
                disabled={proposeBusy || !proposeValue}
                style={{ ...smallButtonStyle(proposeBusy, true), flex: 1, padding: '10px' }}
              >
                {proposeBusy ? (t('processing') || 'Обработка...') : (t('trafficProposeSubmit') || 'Отправить')}
              </button>
              <button onClick={closeProposeModal} style={{ ...smallButtonStyle(false, false), flex: 1, padding: '10px' }}>
                {t('close') || 'Закрыть'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка лайка */}
      {likeTarget && (
        <div style={modalOverlayStyle} onClick={closeLikeModal}>
          <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '10px', color: isDark ? '#fff' : '#111' }}>
              ❤️ {t('trafficLikeConfirmTitle') || 'Поддержать субдомен'}
            </div>
            <div style={{ fontSize: '13px', color: isDark ? '#ddd' : '#333', marginBottom: '14px', lineHeight: 1.5 }}>
              {(t('trafficLikeConfirmText') || 'Будет отправлено {amount} TON владельцу {domain}. Подтверждение в блокчейне засчитывается как лайк.')
                .replace('{amount}', String(LIKE_AMOUNT_TON))
                .replace('{domain}', likeTarget.name)}
            </div>
            {likeError && <div style={{ fontSize: '12px', color: '#EF4444', marginBottom: '12px' }}>{likeError}</div>}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleConfirmLike}
                disabled={likeBusy}
                style={{ ...smallButtonStyle(likeBusy, true), flex: 1, padding: '10px' }}
              >
                {likeBusy ? (t('processing') || 'Обработка...') : (t('trafficLikeConfirmButton') || 'Подтвердить и отправить')}
              </button>
              <button onClick={closeLikeModal} disabled={likeBusy} style={{ ...smallButtonStyle(false, false), flex: 1, padding: '10px' }}>
                {t('cancel') || 'Отмена'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrafficRequestsTab;
