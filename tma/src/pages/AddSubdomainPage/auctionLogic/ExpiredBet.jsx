
import React, { useEffect, useState } from 'react';
import '../DomainExpirationTimer.css'; 
import { useLanguage } from "../contexts/LanguageContext.jsx"; 
import { BetBtn } from './ExpiredBetBtn.jsx';

const DomainExpirationTimer = ({ domainName, onTimeUpdate }) => {
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const { language, translations } = useLanguage();
  const [domainAddress, setDomainAddress] = useState('');

  useEffect(() => {
    const fetchDomainData = async () => {
      try {
        const response = await fetch(`https://tonapi.io/v2/dns/${domainName}`);
        const data = await response.json();
        setDomainAddress(data.item.address);
        
        
        if (data && data.expiring_at) {
          const expiringAt = data.expiring_at * 1000; // преобразуем в миллисекунды

          const updateTimer = () => {
            const now = Date.now();
            const distance = expiringAt - now;

            if (distance < 0) {
              clearInterval(intervalId);
              setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
              if (typeof onTimeUpdate === 'function') {
                onTimeUpdate({ days: 0, hours: 0, minutes: 0, seconds: 0 });
              }
              console.log(`Адрес домена передаваемый в диплинк: ${domainAddress}`);
              return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            setTimeRemaining({ days, hours, minutes, seconds });
          };

          updateTimer(); // Сначала обновляем таймер сразу после загрузки
          const intervalId = setInterval(updateTimer, 1000); // Обновляем таймер каждую секунду

          return () => clearInterval(intervalId); // очищаем интервал при размонтировании компонента
        }
      } catch (error) {
        console.error("Ошибка при получении данных домена:", error);
      }
    };

    fetchDomainData();
  }, [domainName, onTimeUpdate]); // onTimeUpdate добавлен в зависимости

  return (
    <div>   
      <div style={{ marginTop: '30px' }}>
        <h3 style={{ margin: '0', color: 'white' }}>{translations[language].expiresheader}</h3>
        <div className="timer-container">
          <div>
            <div className="timer-digit">{String(timeRemaining.days).padStart(3, '0')}</div>
            <div className="timer-label">{translations[language].daytimer}</div>
          </div>
          <div>
            <div className="timer-digit">{String(timeRemaining.hours).padStart(2, '0')}</div>
            <div className="timer-label">{translations[language].hourtimer}</div>
          </div>
          <div>
            <div className="timer-digit">{String(timeRemaining.minutes).padStart(2, '0')}</div>
            <div className="timer-label">{translations[language].mintimer}</div>
          </div>
          <div>
            <div className="timer-digit">{String(timeRemaining.seconds).padStart(2, '0')}</div>
            <div className="timer-label">{translations[language].sectimer}</div>
          </div>
        </div>
      </div>
      <BetBtn domainName={domainName} timeRemaining={timeRemaining} domainAddress={domainAddress} />
    </div>
  );
};

export default DomainExpirationTimer;


