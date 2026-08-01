import React, { useEffect, useState } from 'react';
import searchDog from '@/pages/ManageDomainPage/img/searchDog.gif';

interface SegmentedProgressBarProps {
  percent: number;
  color: string;
  trackColor: string;
}

/** Полоска из 8 заполняющихся сегментов, как в ActiveAuctions — текущий частично заполненный сегмент моргает. */
export const SegmentedProgressBar: React.FC<SegmentedProgressBarProps> = ({
  percent,
  color,
  trackColor,
}) => {
  const clamped = Math.min(100, Math.max(0, percent));
  const filledBars = Math.floor(clamped / 12.5);
  const nextBarProgress = (clamped % 12.5) / 12.5;
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (filledBars < 8) {
      const interval = setInterval(() => setBlink((prev) => !prev), 1000);
      return () => clearInterval(interval);
    }
  }, [filledBars]);

  return (
    <div style={{ display: 'flex', gap: 2, height: 12, width: '100%', maxWidth: 200 }}>
      {Array.from({ length: 8 }).map((_, index) => {
        let barColor = trackColor;
        let opacity = 1;

        if (index < filledBars) {
          barColor = color;
        } else if (index === filledBars && nextBarProgress > 0) {
          barColor = color;
          opacity = blink ? 0.3 : 0.7;
        }

        return (
          <div
            key={index}
            style={{ flex: 1, background: barColor, borderRadius: 2, opacity, transition: 'opacity 0.5s ease' }}
          />
        );
      })}
    </div>
  );
};

interface ScanProgressLoaderProps {
  /** Что грузится ("Загрузка аукционов" и т.п.) */
  label: string;
  /** Процент выполнения текущего шага, если известен */
  percent?: number;
  /** Что сделано на этом шаге и что происходит сейчас (сколько найдено/проверено) */
  statusText?: string;
  textColor: string;
}

/** Лоадер с маскотом searchDog: гиф сверху, лейбл шага, полоска сегментов + процент, ниже — живой статус выборки. */
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
    <div style={{ fontSize: 16, marginTop: 12 }}>{label}</div>
    {typeof percent === 'number' && (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 8, width: '100%' }}>
        <SegmentedProgressBar percent={percent} color="#4CAF50" trackColor={textColor === '#666' ? '#e0e0e0' : '#444'} />
        <span style={{ fontSize: 14, opacity: 0.8 }}>{percent}%</span>
      </div>
    )}
    {statusText && (
      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4, textAlign: 'center' }}>
        {statusText}
      </div>
    )}
  </div>
);
