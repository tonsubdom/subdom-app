// src/components/EscrowDeadlineBadge.tsx
//
// Показывает срок действия эскроу-депозита (Market -> Коллекции, продажа
// бенефициарства) и продавцу, и покупателю — юзер явно попросил не
// оставлять это только в консоли/БД, а показывать в приложении обеим
// сторонам, и брать данные с чейна (get_escrow_data), а не доверять
// одной только локальной записи о том, когда был отправлен депозит.

import React, { useEffect, useState } from 'react';
import { getEscrowOnchainData } from '@/utils/tonUtils';

interface EscrowDeadlineBadgeProps {
  escrowAddress: string;
  isTestnet: boolean;
  t: (key: string) => string;
  textColor: string;
}

export const EscrowDeadlineBadge: React.FC<EscrowDeadlineBadgeProps> = ({ escrowAddress, isTestnet, t, textColor }) => {
  const [data, setData] = useState<{ status: number; deadline: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getEscrowOnchainData(escrowAddress, isTestnet).then((result) => {
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [escrowAddress, isTestnet]);

  if (loading) {
    return <span style={{ fontSize: '11px', color: textColor, opacity: 0.6 }}>{t('escrowStatusLoading') || 'Проверяем статус эскроу...'}</span>;
  }
  if (!data) {
    return <span style={{ fontSize: '11px', color: textColor, opacity: 0.6 }}>{t('escrowStatusUnknown') || 'Не удалось прочитать статус эскроу'}</span>;
  }

  const deadlineStr = new Date(data.deadline * 1000).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  if (data.status === 1) {
    return <span style={{ fontSize: '11px', color: textColor, opacity: 0.8 }}>✅ {t('escrowStatusReleased') || 'Исполнено — средства переданы продавцу'}</span>;
  }
  if (data.status === 2) {
    return <span style={{ fontSize: '11px', color: textColor, opacity: 0.8 }}>↩️ {t('escrowStatusRefunded') || 'Возвращено покупателю'}</span>;
  }

  const isExpired = Date.now() / 1000 > data.deadline;
  if (isExpired) {
    return (
      <span style={{ fontSize: '11px', color: '#EF4444' }}>
        ⏰ {(t('escrowStatusExpired') || 'Срок истёк {deadline} — покупатель может вернуть депозит сам').replace('{deadline}', deadlineStr)}
      </span>
    );
  }
  return (
    <span style={{ fontSize: '11px', color: textColor, opacity: 0.8 }}>
      ⏳ {(t('escrowStatusActive') || 'Оплачено, действует до {deadline}').replace('{deadline}', deadlineStr)}
    </span>
  );
};

export default EscrowDeadlineBadge;
