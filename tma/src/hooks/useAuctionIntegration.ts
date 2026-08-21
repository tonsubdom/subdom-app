// hooks/useAuctionIntegration.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { Zone } from '@/services/api';

interface UseAuctionIntegrationProps {
  zones: Zone[];
  checkItem: (zoneName: string, subdomainName: string) => Promise<void>;
}

export const useAuctionIntegration = ({
  zones,
  checkItem
}: UseAuctionIntegrationProps) => {
  const [selectedZoneName, setSelectedZoneName] = useState<string>('');
  const [subdomainName, setSubdomainName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // zonesRef всегда даёт САМЫЙ свежий список зон на момент повторной попытки
  // ниже, а не тот, что был на момент создания handleAuctionClick — та же
  // причина, по которой AddSubdomainPage.loadAuctionFromParams использует
  // handleCheckItemRef вместо прямого handleCheckItem.
  const zonesRef = useRef(zones);
  useEffect(() => {
    zonesRef.current = zones;
  }, [zones]);

  // Функция для обработки клика из ActiveAuctions
  const handleAuctionClick = useCallback(async (zoneName: string, subdomain: string) => {
    console.log(`🎯 Обработка клика из ActiveAuctions: зона=${zoneName}, субдомен=${subdomain}`);

    // Только что созданная/пересозданная зона может ещё не попасть в общий
    // список зон (тот же кэш-race, что уже чинили для loadAuctionFromParams
    // в AddSubdomainPage) — вместо мгновенного alert'а на первом промахе
    // даём списку несколько секунд догрузиться, прежде чем реально считать
    // зону отсутствующей.
    let zoneExists = zonesRef.current.some(z => z.name === zoneName);
    for (let attempt = 0; !zoneExists && attempt < 5; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      zoneExists = zonesRef.current.some(z => z.name === zoneName);
    }

    if (!zoneExists) {
      console.error(`❌ Зона "${zoneName}" не найдена в списке зон:`, zonesRef.current.map(z => z.name));
      alert(`Зона "${zoneName}" не найдена в списке доступных зон`);
      return;
    }

    console.log(`✅ Зона "${zoneName}" найдена в списке зон`);
    
    // 1. Устанавливаем значения
    setSelectedZoneName(zoneName);
    setSubdomainName(subdomain);
    
    // 2. Даем время для обновления UI
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 3. Вызываем checkItem с ИМЕНЕМ зоны
    try {
      setIsLoading(true);
      console.log(`🚀 Вызываем checkItem с zoneName=${zoneName}, subdomain=${subdomain}`);
      await checkItem(zoneName, subdomain);
      console.log('✅ checkItem успешно выполнен');
      
      // 4. Автоскролл вниз после успешной проверки
      setTimeout(() => {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: 'smooth'
        });
      }, 200);
    } catch (error) {
      console.error('❌ Ошибка при вызове checkItem:', error);
    } finally {
      setIsLoading(false);
    }
  }, [zones, checkItem]);

  // Функция для сброса формы
  const resetForm = useCallback(() => {
    setSelectedZoneName('');
    setSubdomainName('');
  }, []);

  return {
    selectedZoneName,  // Теперь это имя зоны, а не ID
    subdomainName,
    isLoading,
    handleAuctionClick,
    resetForm,
    setSelectedZoneName,
    setSubdomainName
  };
};

