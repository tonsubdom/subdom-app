// src/utils/sbt-utils.ts
import { apiService } from '@/services/api';
import { SimpleEnrichedItem } from '@/services/blockchainItems/blockchain-items-types';

/**
 * Получить количество SBT субдоменов пользователя в каждой зоне
 */
export const getUserSbtSubdomainsCount = async (
  userAddress: string,
  isTestnet: boolean
): Promise<Record<string, number>> => {
  try {
    // Устанавливаем сеть
    apiService.setNetwork(isTestnet);
    
    // Получаем ВСЕ субдомены с статусом 'active'
    const allActiveSubdomains = await apiService.getSubdomainsByStatus('active');
    
    console.log(`📊 Всего активных субдоменов: ${allActiveSubdomains.length}`);
    
    // Фильтруем только SBT субдомены пользователя
    const userSbtSubdomains = allActiveSubdomains.filter(subdomain => {
      // Проверяем, что субдомен принадлежит пользователю
      const isUserSubdomain = subdomain.owner === userAddress;
      
      // Проверяем, что это SBT субдомен (по имени или другим признакам)
      // Например, если в имени есть .ton и это не proxy зона
      const isSbtSubdomain = subdomain.name.includes('.ton') && 
                            !subdomain.name.includes('.proxy');
      
      return isUserSubdomain && isSbtSubdomain;
    });
    
    console.log(`👤 SBT субдоменов пользователя ${userAddress}: ${userSbtSubdomains.length}`);
    
    // Группируем по зонам
    const zoneCounts: Record<string, number> = {};
    
    userSbtSubdomains.forEach(subdomain => {
      // Извлекаем имя зоны из имени субдомена
      // Формат: subdomain.zone.ton
      const parts = subdomain.name.split('.');
      if (parts.length >= 2) {
        const zoneName = `${parts[parts.length - 2]}.ton`;
        zoneCounts[zoneName] = (zoneCounts[zoneName] || 0) + 1;
      }
    });
    
    console.log('📊 Количество SBT субдоменов по зонам:', zoneCounts);
    
    return zoneCounts;
    
  } catch (error) {
    console.error('❌ Ошибка получения SBT субдоменов пользователя:', error);
    return {};
  }
};

/**
 * Получить SBT субдомены пользователя для конкретной зоны
 */
export const getUserSbtSubdomainsForZone = async (
  userAddress: string,
  zoneName: string,
  isTestnet: boolean
): Promise<SimpleEnrichedItem[]> => {
  try {
    // Устанавливаем сеть
    apiService.setNetwork(isTestnet);
    
    // Получаем ВСЕ субдомены с статусом 'active'
    const allActiveSubdomains = await apiService.getSubdomainsByStatus('active');
    
    // Фильтруем субдомены пользователя для конкретной зоны
    const userSubdomains = allActiveSubdomains.filter(subdomain => {
      // Проверяем, что субдомен принадлежит пользователю
      const isUserSubdomain = subdomain.owner === userAddress;
      
      // Проверяем, что субдомен относится к указанной зоне
      const isZoneSubdomain = subdomain.name.includes(`.${zoneName.replace('.ton', '')}.`);
      
      return isUserSubdomain && isZoneSubdomain;
    });
    
    // Конвертируем в SimpleEnrichedItem
    const result: SimpleEnrichedItem[] = userSubdomains.map(subdomain => ({
      address: subdomain.address,
      domain: subdomain.name,
      zone: zoneName,
      type: 'sbt_subdomain',
      owner_address: subdomain.owner || null,
      collection_address: subdomain.collectionsAddress || '',
      on_sale: false,
      lastUpdated: subdomain.updatedAt,
      last_transaction_lt: '',
      metadata: {}
    }));
    
    return result;
    
  } catch (error) {
    console.error(`❌ Ошибка получения SBT субдоменов для зоны ${zoneName}:`, error);
    return [];
  }
};
