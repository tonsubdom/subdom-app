// src/utils/collectionUtils.ts
import { SimpleCollection } from '@/services/blockchainItems/blockchain-items-types';
import { useMemo } from 'react';

/**
 * Цветовая градация для количества субдоменов
 */
export const getItemCountColor = (count: number): string => {
  if (count === 0) return '#888'; // серый
  if (count >= 1 && count <= 10) return '#10b981'; // зеленый
  if (count >= 11 && count <= 50) return '#3b82f6'; // синий
  if (count >= 51 && count <= 250) return '#8b5cf6'; // фиолетовый/сиреневый
  if (count >= 251 && count <= 500) return '#f59e0b'; // золотой
  return '#f97316'; // оранжевый (500+)
};

/**
 * Форматирование имени зоны с обрезкой длинных названий
 */
export const formatZoneName = (zoneName: string): string => {
  if (!zoneName) return '';
  
  // Извлекаем имя зоны (без .ton)
  const zone = zoneName.split('.')[0];
  
  // Если длина зоны больше 9 символов, обрезаем с троеточием
  if (zone.length > 9) {
    return `${zone.slice(0, 3)}...${zone.slice(-3)}`;
  }
  
  return zone;
};

/**
 * Форматирование количества субдоменов
 */
export const formatItemCount = (count: number): string => {
  if (count === 0) return '0 subdomains';
  if (count === 1) return '1 subdomain';
  return `${count} subdomains`;
};

/**
 * Рассчитывает общее количество субдоменов во всех коллекциях
 */
export const calculateTotalItems = (collections: SimpleCollection[]): number => {
  return collections.reduce((total, collection) => {
    return total + (collection.total_items || 0);
  }, 0);
};

/**
 * Рассчитывает процентное соотношение количества субдоменов в коллекции
 */
export const calculatePercentage = (
  itemCount: number, 
  totalItems: number
): string => {
  if (totalItems === 0) return '0.0';
  return ((itemCount / totalItems) * 100).toFixed(1);
};

/**
 * Создает опции для селекта с информацией о коллекциях
 */
export interface CollectionOption {
  value: string;
  label: string;
  itemCount: number;
  percentage: string;
  color: string;
  collectionAddress: string;
}

export const createCollectionOptions = (
  collections: SimpleCollection[]
): CollectionOption[] => {
  const totalItems = calculateTotalItems(collections);
  
  return collections.map((collection) => {
    const zoneName = collection.name || '';
    const itemCount = collection.total_items || 0;
    const percentage = calculatePercentage(itemCount, totalItems);
    
    return {
      value: zoneName,
      label: zoneName,
      itemCount,
      percentage,
      color: getItemCountColor(itemCount),
      collectionAddress: collection.address
    };
  });
};

/**
 * Получает информацию о коллекции по имени зоны
 */
export const getCollectionInfoByZoneName = (
  zoneName: string,
  collections: SimpleCollection[],
  totalItems?: number
) => {
  const collection = collections.find(c => c.name === zoneName);
  if (!collection) return null;
  
  const itemCount = collection.total_items || 0;
  const calculatedTotalItems = totalItems || calculateTotalItems(collections);
  const percentage = calculatePercentage(itemCount, calculatedTotalItems);
  
  return {
    ...collection,
    itemCount,
    percentage,
    color: getItemCountColor(itemCount),
    formattedZone: formatZoneName(zoneName),
    formattedCount: formatItemCount(itemCount)
  };
};

/**
 * Генерирует CSS стили для цветных меток в селекте
 */
export const generateSelectStyles = (options: CollectionOption[]): string => {
  return `
    select option {
      position: relative;
      padding-left: 24px !important;
    }
    
    select option::before {
      content: '';
      position: absolute;
      left: 8px;
      top: 50%;
      transform: translateY(-50%);
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    
    ${options.map((option) => `
      select option[value="${option.value}"]::before {
        background-color: ${option.color};
      }
    `).join('\n')}
  `;
};

/**
 * Компонент для отображения статистики коллекций
 */
export const CollectionStats: React.FC<{
  collections: SimpleCollection[];
  isDark: boolean;
}> = ({ collections, isDark }) => {
  const totalItems = calculateTotalItems(collections);
  const avgPerZone = collections.length > 0 
    ? (totalItems / collections.length).toFixed(1) 
    : '0.0';
  
  const zonesWithItems = collections.filter(c => (c.total_items || 0) > 0).length;
  const emptyZones = collections.length - zonesWithItems;
  
  return (
    <div style={{
      marginTop: '8px',
      padding: '6px 10px',
      borderRadius: '8px',
      background: isDark ? '#2a2a2a' : '#f5f5f5',
      fontSize: '11px',
      color: isDark ? '#ccc' : '#666',
      textAlign: 'center'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ color: '#10b981', fontWeight: 'bold' }}>
          {collections.length} zones
        </span>
        <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>
          {totalItems} total
        </span>
        <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>
          Avg: {avgPerZone}
        </span>
      </div>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        fontSize: '10px',
        opacity: 0.8
      }}>
        <span style={{ color: '#10b981' }}>
          {zonesWithItems} with items
        </span>
        <span style={{ color: '#888' }}>
          {emptyZones} empty
        </span>
      </div>
    </div>
  );
};

/**
 * Хук для получения информации о распределении субдоменов
 */
export const useCollectionDistribution = (collections: SimpleCollection[]) => {
  return useMemo(() => {
    const totalItems = calculateTotalItems(collections);
    
    const distribution = collections.map(collection => {
      const itemCount = collection.total_items || 0;
      const percentage = calculatePercentage(itemCount, totalItems);
      
      return {
        name: collection.name,
        itemCount,
        percentage: parseFloat(percentage),
        color: getItemCountColor(itemCount)
      };
    });
    
    // Сортируем по количеству субдоменов (по убыванию)
    const sortedDistribution = [...distribution].sort((a, b) => b.itemCount - a.itemCount);
    
    // Находим топ-3 коллекции
    const topCollections = sortedDistribution.slice(0, 3);
    
    return {
      totalItems,
      distribution,
      sortedDistribution,
      topCollections,
      averagePerZone: collections.length > 0 ? totalItems / collections.length : 0
    };
  }, [collections]);
};