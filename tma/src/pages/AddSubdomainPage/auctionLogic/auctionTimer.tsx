import React, { useEffect, useState } from 'react';
import { AuctionBetButton } from './AuctionStartBtn';
import '../DomainExpirationTimer.css';

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface DomainAuctionTimerProps {
  domainName: string;
  onTimeUpdate?: (time: TimeRemaining) => void;
  auctionStartTime?: number;
  duration?: number;
}

const DomainAuctionTimer: React.FC<DomainAuctionTimerProps> = ({ 
  domainName, 
  onTimeUpdate,
  auctionStartTime,
  duration 
}) => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({ 
    days: 0, 
    hours: 0, 
    minutes: 0, 
    seconds: 0 
  });

  const [domainAddress] = useState('');

  useEffect(() => {
    console.log('DomainAuctionTimer mounted with:', { domainName, auctionStartTime, duration });

    const fetchDomainData = async () => {
      try {
        console.log('Fetching domain data for:', domainName);

        // Если переданы параметры аукциона, используем их
        if (auctionStartTime && duration) {
          console.log('Using auction timer logic');
          const updateAuctionTimer = () => {
            const now = Date.now();
            const auctionEndTime = auctionStartTime * 1000 + duration * 1000;
            const distance = auctionEndTime - now;

            console.log('Auction timer calculations:', { now, auctionEndTime, distance });

            if (distance < 0) {
              setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
              return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            const newTimeRemaining = { days, hours, minutes, seconds };
            console.log('New time remaining:', newTimeRemaining);
            setTimeRemaining(newTimeRemaining);
            
            if (onTimeUpdate) {
              onTimeUpdate(newTimeRemaining);
            }
          };

          updateAuctionTimer();
          const intervalId = setInterval(updateAuctionTimer, 1000);
          return () => clearInterval(intervalId);
        }

        // Если нужна старая логика с доменом - оставьте ее
      } catch (error) {
        console.error("Ошибка при получении данных:", error);
      }
    };

    fetchDomainData();
  }, [domainName, onTimeUpdate, auctionStartTime, duration]); 

  return (
    <div>   
      <div style={{ marginTop: '30px' }}>
        <h3 style={{ margin: '0', color: 'black' }}>The auction ends in:</h3>
        <div className="timer-container">
          <div>
            <div className="timer-digit">{String(timeRemaining.days).padStart(3, '0')}</div>
            <div className="timer-label">day</div>
          </div>
          <div>
            <div className="timer-digit">{String(timeRemaining.hours).padStart(2, '0')}</div>
            <div className="timer-label">hour</div>
          </div>
          <div>
            <div className="timer-digit">{String(timeRemaining.minutes).padStart(2, '0')}</div>
            <div className="timer-label">min</div>
          </div>
          <div>
            <div className="timer-digit">{String(timeRemaining.seconds).padStart(2, '0')}</div>
            <div className="timer-label">sec</div>
          </div>
        </div>
      </div>
      {domainAddress && (
        <AuctionBetButton 
          domainName={domainName} 
          timeRemaining={timeRemaining} 
          auctionAddress={domainAddress} 
        />
      )}
    </div>
  );
};

export default DomainAuctionTimer;
