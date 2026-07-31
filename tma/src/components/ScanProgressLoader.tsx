import React from 'react';
import searchDog from '@/pages/ManageDomainPage/img/searchDog.gif';

interface ScanProgressLoaderProps {
  /** Что грузится ("Загрузка аукционов" и т.п.) */
  label: string;
  /** Процент выполнения текущего шага, если известен */
  percent?: number;
  /** Что сделано на этом шаге и что происходит сейчас (сколько найдено/проверено) */
  statusText?: string;
  textColor: string;
}

/** Лоадер с маскотом searchDog: гиф сверху, лейбл шага + процент, ниже — живой статус выборки. */
export const ScanProgressLoader: React.FC<ScanProgressLoaderProps> = ({
  label,
  percent,
  statusText,
  textColor,
}) => (
  <div
    style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      color: textColor,
      fontFamily: 'monospace',
    }}
  >
    <img src={searchDog} alt="Loading" style={{ width: 100, height: 100 }} />
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 12 }}>
      <span style={{ fontSize: 16 }}>{label}</span>
      {typeof percent === 'number' && (
        <span style={{ fontSize: 14, opacity: 0.8 }}>{percent}%</span>
      )}
    </div>
    {statusText && (
      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4, textAlign: 'center' }}>
        {statusText}
      </div>
    )}
  </div>
);
