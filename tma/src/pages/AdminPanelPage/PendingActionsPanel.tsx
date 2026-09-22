// src/pages/AdminPanelPage/PendingActionsPanel.tsx
//
// Заявки на действия, которые может выполнить только адрес площадки
// (change_content / деактивация SBT-зоны и т.п.) — юзер их только создаёт
// (см. confirmSbtZoneToggle в ProfileWidget.tsx), а исполняет отсюда сам
// владелец площадки своим уже залогиненным в админку TonConnect-кошельком
// (см. AdminPanelPage/index.tsx — ton_proof-логин гарантирует, что это
// именно кошелёк площадки). Серверного приватного ключа сознательно нет,
// см. AskUserQuestion-решение 2026-08-03 — автоматику обсудим позже.

import React, { useEffect, useState } from 'react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { apiService } from '@/services/api';
import { buildChangeContent, buildChangePartnerShare } from '@/services/payloadBuilder';
import { getPartnerShare } from '@/utils/tonUtils';

const API_PAYLOAD_URL = import.meta.env.VITE_API_SC_PAYLOAD_URL || '';

interface PendingAction {
  id: number;
  actionType: string;
  targetType: string;
  targetAddress: string;
  targetCollectionAddress: string | null;
  targetName: string;
  requestedBy: string;
  status: string;
  requestedAt: string;
  newPartnerAddress: string | null;
}

interface PendingActionsPanelProps {
  isTestnet: boolean;
  currentTheme: string;
}

export const PendingActionsPanel: React.FC<PendingActionsPanelProps> = ({ isTestnet, currentTheme }) => {
  const [tonConnectUI] = useTonConnectUI();
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [executingId, setExecutingId] = useState<number | null>(null);
  const [errorById, setErrorById] = useState<Record<number, string>>({});

  const isDark = currentTheme === 'dark';

  const load = async () => {
    setLoading(true);
    try {
      const result = await apiService.getPendingActions('pending');
      setActions(result.success ? result.data || [] : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const tonviewerLink = (address: string) =>
    `https://${isTestnet ? 'testnet.' : ''}tonviewer.com/${address}`;

  const executeDeactivation = async (action: PendingAction) => {
    setExecutingId(action.id);
    setErrorById((prev) => ({ ...prev, [action.id]: '' }));
    try {
      const collectionAddress = action.targetCollectionAddress || action.targetAddress;
      const zoneNameWithoutTld = action.targetName.endsWith('.ton')
        ? action.targetName.slice(0, -4)
        : action.targetName;
      const metadataBase = `${API_PAYLOAD_URL}/api/v1/inactive-subdomain/metadata/ton/${zoneNameWithoutTld}`;

      const result = buildChangeContent(
        collectionAddress,
        {
          content: { uri: metadataBase },
          common_content: { suffix_uri: `${metadataBase}/` },
        },
        isTestnet
      );
      if (!result.messages || result.messages.length === 0) {
        throw new Error('empty messages from change_content');
      }

      const sendResult = await tonConnectUI.sendTransaction({
        validUntil: result.validUntil || Math.floor(Date.now() / 1000) + 240,
        messages: result.messages,
      });

      await apiService.completePendingAction(action.id, sendResult?.boc);
      setActions((prev) => prev.filter((a) => a.id !== action.id));
    } catch (error: any) {
      console.error('❌ Ошибка исполнения заявки на деактивацию:', error);
      setErrorById((prev) => ({ ...prev, [action.id]: error?.message || 'Ошибка транзакции' }));
    } finally {
      setExecutingId(null);
    }
  };

  // Продажа бенефициарства (Market -> Коллекции) — меняем только partner_addr
  // (получатель 90% с аукционов), share/denominator читаем свежими с ончейна
  // и передаём как есть, чтобы не пересмотреть процент при смене адреса.
  const executeTransferBeneficiary = async (action: PendingAction) => {
    setExecutingId(action.id);
    setErrorById((prev) => ({ ...prev, [action.id]: '' }));
    try {
      if (!action.newPartnerAddress) {
        throw new Error('newPartnerAddress отсутствует в заявке');
      }
      const collectionAddress = action.targetCollectionAddress || action.targetAddress;
      const current = await getPartnerShare(collectionAddress, isTestnet);
      if (!current) {
        throw new Error('Не удалось прочитать текущий partner_share из блокчейна');
      }

      const result = buildChangePartnerShare(
        collectionAddress,
        { address: action.newPartnerAddress, share: current.share, denominator: current.denominator },
        isTestnet
      );
      if (!result.messages || result.messages.length === 0) {
        throw new Error('empty messages from change_partner_share');
      }

      const sendResult = await tonConnectUI.sendTransaction({
        validUntil: result.validUntil || Math.floor(Date.now() / 1000) + 240,
        messages: result.messages,
      });

      await apiService.completePendingAction(action.id, sendResult?.boc);
      setActions((prev) => prev.filter((a) => a.id !== action.id));
    } catch (error: any) {
      console.error('❌ Ошибка исполнения заявки на смену бенефициара:', error);
      setErrorById((prev) => ({ ...prev, [action.id]: error?.message || 'Ошибка транзакции' }));
    } finally {
      setExecutingId(null);
    }
  };

  const cardStyle: React.CSSProperties = {
    padding: '14px',
    borderRadius: '8px',
    background: isDark ? '#1F2937' : '#FFFFFF',
    border: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
    marginBottom: '10px',
    fontSize: '13px',
    color: isDark ? '#F9FAFB' : '#1F2937',
  };

  return (
    <div>
      <div style={{ marginBottom: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
            background: 'transparent',
            color: isDark ? '#9CA3AF' : '#6B7280',
            fontSize: '12px',
            cursor: loading ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Обновление...' : '🔄 Обновить'}
        </button>
        <span style={{ fontSize: '12px', color: isDark ? '#9CA3AF' : '#6B7280' }}>
          {actions.length === 0 ? 'Нет ожидающих заявок' : `Ожидают исполнения: ${actions.length}`}
        </span>
      </div>

      {actions.map((action) => (
        <div key={action.id} style={cardStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', marginBottom: '10px' }}>
            <div><strong>Тип:</strong> {action.actionType}</div>
            <div><strong>Домен:</strong> {action.targetName}</div>
            <div>
              <strong>Адрес:</strong>{' '}
              <a href={tonviewerLink(action.targetAddress)} target="_blank" rel="noopener noreferrer" style={{ color: isDark ? '#FFD700' : '#3B82F6' }}>
                {action.targetAddress.slice(0, 6)}...{action.targetAddress.slice(-4)}
              </a>
            </div>
            <div>
              <strong>Запросил:</strong>{' '}
              <a href={tonviewerLink(action.requestedBy)} target="_blank" rel="noopener noreferrer" style={{ color: isDark ? '#FFD700' : '#3B82F6' }}>
                {action.requestedBy.slice(0, 6)}...{action.requestedBy.slice(-4)}
              </a>
            </div>
            {action.newPartnerAddress && (
              <div>
                <strong>Новый бенефициар:</strong>{' '}
                <a href={tonviewerLink(action.newPartnerAddress)} target="_blank" rel="noopener noreferrer" style={{ color: isDark ? '#FFD700' : '#3B82F6' }}>
                  {action.newPartnerAddress.slice(0, 6)}...{action.newPartnerAddress.slice(-4)}
                </a>
              </div>
            )}
            <div style={{ gridColumn: '1 / -1' }}>
              <strong>Когда:</strong> {new Date(action.requestedAt).toLocaleString('ru-RU')}
            </div>
          </div>

          {action.actionType === 'deactivate_zone' ? (
            <button
              onClick={() => executeDeactivation(action)}
              disabled={executingId === action.id}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: executingId === action.id ? '#6B7280' : '#e53935',
                color: 'white',
                fontWeight: 700,
                fontSize: '13px',
                cursor: executingId === action.id ? 'default' : 'pointer',
              }}
            >
              {executingId === action.id ? 'Отправка транзакции...' : '⚡ Исполнить деактивацию'}
            </button>
          ) : action.actionType === 'transfer_beneficiary' ? (
            <button
              onClick={() => executeTransferBeneficiary(action)}
              disabled={executingId === action.id}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: executingId === action.id ? '#6B7280' : '#e53935',
                color: 'white',
                fontWeight: 700,
                fontSize: '13px',
                cursor: executingId === action.id ? 'default' : 'pointer',
              }}
            >
              {executingId === action.id ? 'Отправка транзакции...' : '⚡ Исполнить смену бенефициара'}
            </button>
          ) : (
            <div style={{ color: isDark ? '#9CA3AF' : '#6B7280', fontSize: '12px' }}>
              Неизвестный тип заявки — исполнить можно только вручную через блокчейн-дебаг ниже.
            </div>
          )}

          {errorById[action.id] && (
            <p style={{ color: '#e53935', fontSize: '12px', marginTop: '8px' }}>{errorById[action.id]}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default PendingActionsPanel;
