// Функция для получения информации об истечении домена через TON API
// Добавить в начало файла с импортами

import { useState, useEffect } from "react";

// Интерфейс для данных о домене
interface DomainExpirationData {
  name: string;
  expiringAt: number; // timestamp в секундах
  item?: {
    address: string;
    owner?: {
      address: string;
      name?: string;
    };
    collection?: {
      name: string;
    };
  };
}

// Хук для получения информации об истечении домена
export const useDomainExpiration = (domainName: string | null, isTestnet: boolean) => {
  const [expirationData, setExpirationData] = useState<DomainExpirationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log(`Переданное имя домена в функцию получчения истечения домена: ${domainName}`);

  useEffect(() => {
    const fetchDomainExpiration = async () => {
      if (!domainName) {
        setExpirationData(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Определяем базовый URL в зависимости от сети
        const baseTONApiUri = isTestnet ? 'testnet.tonapi.io' : 'tonapi.io';
        
        // Формируем URL для запроса
        const url = `https://${baseTONApiUri}/v2/dns/${domainName}`;
        
        console.log(`📡 Запрашиваем информацию о домене: ${url}`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Ошибка TON API: ${response.status}`);
        }
        
        const data: DomainExpirationData = await response.json();
        
        console.log('✅ Получены данные о домене:', data);
        setExpirationData(data);
      } catch (err: any) {
        console.error('❌ Ошибка получения данных о домене:', err);
        setError(err.message || 'Не удалось получить информацию о домене');
        setExpirationData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDomainExpiration();
  }, [domainName, isTestnet]);

  return { expirationData, loading, error };
};

// Функция для форматирования timestamp в читаемую дату
export const formatExpirationDate = (timestamp: number): string => {
  // TON API возвращает timestamp в секундах, а Date работает с миллисекундами
  const date = new Date(timestamp * 1000);
  
  // Форматируем дату в формате "дд.мм.гггг чч:мм:сс"
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
};

// Компонент для отображения информации об истечении домена
export const DomainExpirationInfo: React.FC<{
  domainName: string | null;
  isTestnet: boolean;
  className?: string;
}> = ({ domainName, isTestnet, className }) => {
  const { expirationData, loading, error } = useDomainExpiration(domainName, isTestnet);

  if (!domainName) {
    return null;
  }

  if (loading) {
    return (
      <div className={className} style={{ 
        padding: '8px', 
        background: '#fff3cd', 
        borderRadius: '6px',
        marginBottom: '10px',
        fontSize: '12px',
        color: '#856404'
      }}>
        ⏳ Загрузка информации об истечении домена...
      </div>
    );
  }

  if (error) {
    return (
      <div className={className} style={{ 
        padding: '8px', 
        background: '#f8d7da', 
        borderRadius: '6px',
        marginBottom: '10px',
        fontSize: '12px',
        color: '#721c24'
      }}>
        ⚠️ Не удалось загрузить информацию об истечении домена
      </div>
    );
  }

  if (!expirationData || !expirationData.expiringAt) {
    return null;
  }

  const formattedDate = formatExpirationDate(expirationData.expiringAt);
  
  return (
    <div className={className} style={{ 
      padding: '8px', 
      background: '#d1ecf1', 
      borderRadius: '6px',
      marginBottom: '10px',
      fontSize: '12px',
      color: '#0c5460'
    }}>
      ⏰ <strong>Корневой домен зоны истекает:</strong> {formattedDate}
    </div>
  );
};