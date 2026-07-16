

import React, { useState, useEffect, useRef } from 'react';
import './flip-timer.css';
import { Typography } from 'antd';

interface TimerConfig {
  type: 'seconds' | 'minutes' | 'hours' | 'days';
  label: string;
  digitCount: number;
}

interface AuctionData {
  maxBidderOwner: string | null;
  maxBid: bigint;
  timestamp: number;
  isActive: boolean;
}

interface FlipTimerProps {
  endDate?: Date | string;
  onComplete?: () => void;
  auctionData?: AuctionData | null;
  defaultTime?: number;
}

const TIMER_CONFIG: TimerConfig[] = [
  { type: 'seconds', label: 'sec', digitCount: 2 },
  { type: 'minutes', label: 'min', digitCount: 2 },
  { type: 'hours', label: 'hour', digitCount: 2 },
  { type: 'days', label: 'day', digitCount: 3 },
];

const FlipTimer: React.FC<FlipTimerProps> = ({ endDate, onComplete, auctionData, defaultTime }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [flippingDigits, setFlippingDigits] = useState<{ [key: string]: boolean }>({});
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const prevTimeLeftRef = useRef(timeLeft);

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Определяем состояние аукциона
  const shouldShowTimer = auctionData && auctionData.isActive;
  const timerEndDate = auctionData ? new Date(auctionData.timestamp * 1000) : (endDate ? new Date(endDate) : null);
  const isAuctionEnded = auctionData && !auctionData.isActive;
  const isAuctionNotStarted = !auctionData && !timerEndDate && defaultTime !== undefined;

  useEffect(() => {
    if (wrapperRef.current) {
      wrapperRef.current.style.padding = '5px 5px 25px 5px';
    }
  }, []);

  // Простая функция для расчета времени
  const calculateTimeLeft = (endDate: Date) => {
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    
    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    const seconds = Math.floor((diff / 1000) % 60);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    return { days, hours, minutes, seconds };
  };

  // Основной эффект
  useEffect(() => {
    // Если аукцион завершен, ничего не делаем
    if (isAuctionEnded) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    // Если аукцион не начат, показываем статичное время
    if (isAuctionNotStarted && defaultTime !== undefined) {
      const seconds = defaultTime;
      const days = Math.floor(seconds / (24 * 60 * 60));
      const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((seconds % (60 * 60)) / 60);
      const secs = seconds % 60;
      
      setTimeLeft({ days, hours, minutes, seconds: secs });
      prevTimeLeftRef.current = { days, hours, minutes, seconds: secs };
      return;
    }

    if (!timerEndDate) return;

    const updateTimer = () => {
      const newTimeLeft = calculateTimeLeft(timerEndDate);
      const newFlippingDigits: { [key: string]: boolean } = {};

      // Проверяем изменения для каждой единицы времени
      if (newTimeLeft.seconds !== prevTimeLeftRef.current.seconds) {
        newFlippingDigits.seconds = true;
      }
      if (newTimeLeft.minutes !== prevTimeLeftRef.current.minutes) {
        newFlippingDigits.minutes = true;
      }
      if (newTimeLeft.hours !== prevTimeLeftRef.current.hours) {
        newFlippingDigits.hours = true;
      }
      if (newTimeLeft.days !== prevTimeLeftRef.current.days) {
        newFlippingDigits.days = true;
      }

      setTimeLeft(newTimeLeft);
      prevTimeLeftRef.current = newTimeLeft;
      setFlippingDigits(newFlippingDigits);

      // Проверка на завершение
      if (newTimeLeft.days === 0 && newTimeLeft.hours === 0 && 
          newTimeLeft.minutes === 0 && newTimeLeft.seconds === 0) {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        onComplete?.();
      }
    };

    // Очищаем предыдущий интервал
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    // Первый запуск
    updateTimer();
    
    // Запускаем интервал
    timerIntervalRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [timerEndDate, onComplete, isAuctionEnded, isAuctionNotStarted, defaultTime]);

  const renderDigits = (type: keyof typeof timeLeft, value: number, digitCount: number, showInfinity: boolean = false) => {
    if (showInfinity) {
      return (
        <>
          <div className="flip-digit infinity-digit">
            <span className="flip-digit-current" data-digit="∞"></span>
          </div>
          <div className="flip-digit-label">
            {TIMER_CONFIG.find(c => c.type === type)?.label}
          </div>
        </>
      );
    }

    const strValue = value.toString().padStart(digitCount, '0');
    const prevStrValue = prevTimeLeftRef.current[type].toString().padStart(digitCount, '0');

    return (
      <>
        {strValue.split('').map((digit, index) => {
          const prevDigit = prevStrValue[index] || '0';
          const shouldFlip = flippingDigits[type] && digit !== prevDigit;
          
          return (
            <div 
              key={`${type}-${index}`} 
              className={`flip-digit ${shouldFlip ? 'flipping' : ''}`}
            >
              <span 
                className="flip-digit-next" 
                data-digit={digit}
              ></span>
              <span 
                className="flip-digit-current" 
                data-digit={digit}
                onAnimationEnd={() => {
                  setFlippingDigits(prev => {
                    const newFlippingDigits = { ...prev };
                    delete newFlippingDigits[type];
                    return newFlippingDigits;
                  });
                }}
              ></span>
            </div>
          );
        })}
        <div className="flip-digit-label">
          {TIMER_CONFIG.find(c => c.type === type)?.label}
        </div>
      </>
    );
  };

  // Если аукцион завершен, показываем INFINITY
  if (isAuctionEnded) {
    return (
      <div ref={wrapperRef} id="busyEndTimeRow" className="flip__row" style={{padding:'5px 5px 30px'}}>
        <div id="busyEndDate" className="flip__strong">
          <Typography style={{textAlign: 'center', fontSize: '24px', color: 'white'}}>
            Auction Ended:
          </Typography>
          <ul className="flip-clock-container show" id="flip-clock-container">
            {TIMER_CONFIG.map(({ type, digitCount }) => (
              <li key={type} className={`flip-item-${type}`}>
                {renderDigits(type as keyof typeof timeLeft, timeLeft[type as keyof typeof timeLeft], digitCount, true)}
              </li>
            ))}
          </ul>
          <Typography style={{textAlign: 'center', fontSize: '14px', color: '#f87171', paddingTop: '40px'}}>
            Owner will hold forever
          </Typography>
        </div>
      </div>
    );
  }

  // Если аукцион активен, показываем обратный отсчет
  if (shouldShowTimer) {
    return (
      <div ref={wrapperRef} id="busyEndTimeRow" className="flip__row" style={{padding:'5px 5px 30px'}}>
        <div id="busyEndDate" className="flip__strong">
          <Typography style={{textAlign: 'center', fontSize: '24px', color: 'white'}}>
            Auction Ends In:
          </Typography>
          <ul className="flip-clock-container show" id="flip-clock-container">
            {TIMER_CONFIG.map(({ type, digitCount }) => (
              <li key={type} className={`flip-item-${type}`}>
                {renderDigits(type as keyof typeof timeLeft, timeLeft[type as keyof typeof timeLeft], digitCount, false)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // Если аукцион еще не начат, показываем статичное время
  if (isAuctionNotStarted) {
    return (
      <div ref={wrapperRef} id="busyEndTimeRow" className="flip__row">
        <div id="busyEndDate" className="flip__strong">
          <Typography style={{textAlign: 'center', fontSize: '24px', color: 'white'}}>
            Auction Starts In:
          </Typography>
          <ul className="flip-clock-container show" id="flip-clock-container">
            {TIMER_CONFIG.map(({ type, digitCount }) => (
              <li key={type} className={`flip-item-${type}`}>
                {renderDigits(type as keyof typeof timeLeft, timeLeft[type as keyof typeof timeLeft], digitCount, false)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // Если нет данных аукциона, показываем обычный таймер
  if (!auctionData && timerEndDate) {
    return (
      <div ref={wrapperRef} id="busyEndTimeRow" className="flip__row">
        <div id="busyEndDate" className="flip__strong">
          <Typography style={{textAlign: 'center', fontSize: '24px', color: 'white'}}>
            End in:
          </Typography>
          <ul className="flip-clock-container show" id="flip-clock-container">
            {TIMER_CONFIG.map(({ type, digitCount }) => (
              <li key={type} className={`flip-item-${type}`}>
                {renderDigits(type as keyof typeof timeLeft, timeLeft[type as keyof typeof timeLeft], digitCount, false)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return null;
};

export default FlipTimer;