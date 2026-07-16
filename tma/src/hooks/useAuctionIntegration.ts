// hooks/useAuctionIntegration.ts
import { useCallback, useState } from 'react';
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

  // Функция для обработки клика из ActiveAuctions
  const handleAuctionClick = useCallback(async (zoneName: string, subdomain: string) => {
    console.log(`🎯 Обработка клика из ActiveAuctions: зона=${zoneName}, субдомен=${subdomain}`);
    
    // Проверяем, существует ли такая зона
    const zoneExists = zones.some(z => z.name === zoneName);
    
    if (!zoneExists) {
      console.error(`❌ Зона "${zoneName}" не найдена в списке зон:`, zones.map(z => z.name));
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

