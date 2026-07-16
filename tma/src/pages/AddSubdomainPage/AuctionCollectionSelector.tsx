

// src/components/AuctionCollectionSelector/AuctionCollectionSelector.tsx
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { SimpleCollection } from '@/services/blockchainItems/blockchain-items-types';
import { selectProxyCollections, selectSBTCollections } from '@/services/blockchainItems/blockchain-items-slice';
import { Zone } from '@/services/api';
import { CustomZoneSelector } from './CustonZoneSelector';
import { getUserSbtSubdomainsCount } from '@/utils/sbt-utils';

interface AuctionCollectionSelectorProps {
  activeTab: 'proxy' | 'sbt';
  selectedDomainZone: string;
  onDomainZoneChange: (value: string) => void;
  zonesLoading: boolean;
  zonesError: string | null;
  // sbtZones: Zone[];
  userAddress: string | null;
  isDark: boolean;
  t: (key: string) => string;
  // Для SBT режима
  sbtCollectionAddressesMap?: Record<string, string>;
  activeSbtZones?: Zone[];
  // Для Proxy режима - зоны из базы данных
  proxyZones?: Zone[];
  // Для загрузки субдоменов
  isTestnet?: boolean;
  // Для SBT: уже загруженные количества субдоменов
  sbtZonesCount?: Record<string, number>; // ← ДОБАВЛЯЕМ ЭТОТ ПРОПС
}

export const AuctionCollectionSelector: React.FC<AuctionCollectionSelectorProps> = ({
  activeTab,
  selectedDomainZone,
  onDomainZoneChange,
  zonesLoading,
  zonesError,
  userAddress,
  isDark,
  t,
  //_sbtCollectionAddressesMap = {},
  activeSbtZones = [],
  proxyZones = [],
  isTestnet = false,
  sbtZonesCount = {} 
}) => {
  // Получаем proxy коллекции из Redux store
  const proxyCollections = useSelector(selectProxyCollections);

  const sbtCollections = useSelector(selectSBTCollections)

  // Функция для загрузки субдоменов SBT зоны (исправленная)
  const loadSbtSubdomains = async (zoneName: string): Promise<number> => {
    try {
      console.log(`🔄 Loading SBT subdomains for ${zoneName}`);
      
      // Если уже есть в sbtZonesCount, используем его
      if (sbtZonesCount[zoneName] !== undefined) {
        console.log(`✅ Using sbtZonesCount for ${zoneName}: ${sbtZonesCount[zoneName]}`);
        return sbtZonesCount[zoneName];
      }
      
      // Если нет адреса пользователя, возвращаем 0
      if (!userAddress) {
        console.warn('No user address for SBT subdomains');
        return 0;
      }
      
      // Используем новую утилиту для получения количества SBT субдоменов
      const userSbtCounts = await getUserSbtSubdomainsCount(userAddress, isTestnet);
      
      // Возвращаем количество для конкретной зоны
      const count = userSbtCounts[zoneName] || 0;
      console.log(`✅ Found ${count} SBT subdomains for ${zoneName}`);
      
      return count;
      
    } catch (error) {
      console.error(`❌ Error loading SBT subdomains for ${zoneName}:`, error);
      return 0;
    }
  };

  // Определяем зоны и режим в зависимости от activeTab
  const zones = useMemo(() => {
    return activeTab === 'proxy' ? proxyZones : activeSbtZones;
  }, [activeTab, proxyZones, activeSbtZones]);

  // Определяем placeholder в зависимости от режима
  const placeholder = useMemo(() => {
    if (zonesLoading) {
      return t('loadingZones');
    }
    
    if (zonesError) {
      return t('zonesLoadError');
    }
    
    return activeTab === 'proxy' ? t('chooseProxyZone') : t('chooseSbtZone');
  }, [zonesLoading, zonesError, activeTab, t]);

  // Определяем, есть ли зоны
  const hasZones = zones && zones.length > 0;

  // Используем proxyCollections для получения collectionAddress
  const getCollectionAddress = (zoneName: string): string | null => {
    if (activeTab === 'proxy') {
      // Сначала ищем в базе данных (proxyZones)
      const zoneFromDb = proxyZones.find(z => z.name === zoneName);
      if (zoneFromDb?.collectionAddress) {
        return zoneFromDb.collectionAddress;
      }
      
      // Если не нашли в базе, ищем в Redux коллекциях
      const collection = proxyCollections.find(c => 
        c.name === zoneName || 
        (c.name && c.name.includes(zoneName))
      );
      return collection?.address || null;
    } else {
      // Для SBT используем sbtCollectionAddressesMap
      // return sbtCollectionAddressesMap[zoneName] || null;
      const collection = sbtCollections.find(c => 
        c.name === zoneName || 
        (c.name && c.name.includes(zoneName))
      );
      return collection?.address || null;
    }
  };

  // Обработчик изменения зоны
  const handleZoneChange = (zoneName: string) => {
    onDomainZoneChange(zoneName);
    
    // Можно дополнительно получить collectionAddress если нужно
    const collectionAddress = getCollectionAddress(zoneName);
    if (collectionAddress) {
      console.log(`Selected zone: ${zoneName}, collection: ${collectionAddress}`);
    }
  };

  return (
    <div style={{position: 'relative', width: '280px'}}>
      <div style={{
        position: 'absolute', 
        left: '-30px', 
        top: '50%', 
        transform: 'translateY(-50%)',
        fontSize: '18px',
        fontWeight: 'bold',
        color: isDark ? "white" : 'black'          
      }}>
        1
      </div>
      
      <CustomZoneSelector
        zones={zones}
        selectedZone={selectedDomainZone}
        onZoneChange={handleZoneChange}
        userAddress={userAddress}
        isDark={isDark}
        placeholder={placeholder}
        isLoading={zonesLoading}
        isTestnet={isTestnet}
        mode={activeTab}
        loadSbtSubdomains={activeTab === 'sbt' ? loadSbtSubdomains : undefined}
        sbtZonesCount={activeTab === 'sbt' ? sbtZonesCount : undefined} // ← ПЕРЕДАЕМ В CustomZoneSelector
      />
      
      {zonesError && (
        <p style={{ color: '#f87171', fontSize: '12px', marginTop: '5px' }}>
          {zonesError}
        </p>
      )}
      
      {!hasZones && !zonesLoading && !zonesError && (
        <p style={{ 
          color: '#f59e0b', 
          fontSize: '12px', 
          marginTop: '5px', 
          textAlign: 'center',
          fontFamily: 'monospace'
        }}>
          {activeTab === 'proxy' ? t('noProxyZones') : t('noSbtZones')}
        </p>
      )}
    </div>
  );
};

// Хук для получения collectionAddress из выбранной зоны
export const useCollectionAddressFromZone = (
  activeTab: 'proxy' | 'sbt',
  selectedDomainZone: string,
  proxyCollections: SimpleCollection[],
  sbtCollectionAddressesMap: Record<string, string> = {},
  proxyZones: Zone[] = [],
  sbtZones: Zone[]=[],
  sbtCollections: SimpleCollection[],
): string | null => {
  return useMemo(() => {
    if (!selectedDomainZone) return null;
    
    if (activeTab === 'proxy') {
      // Сначала ищем в базе данных (proxyZones)
      const zoneFromDb = proxyZones.find(z => z.name === selectedDomainZone);
      if (zoneFromDb?.collectionAddress) {
        return zoneFromDb.collectionAddress;
      }
      
      // Если не нашли в базе, ищем в Redux коллекциях
      const collection = proxyCollections.find(c => 
        c.name === selectedDomainZone || 
        (c.name && c.name.includes(selectedDomainZone))
      );
      return collection?.address || null;
    } else {
      // Сначала ищем в базе данных (sbtZones)
      const zoneFromDb = sbtZones.find(z => z.name === selectedDomainZone);
      if (zoneFromDb?.collectionAddress) {
        return zoneFromDb.collectionAddress;
      }
      // Для SBT используем старую логику
      // return sbtCollectionAddressesMap[selectedDomainZone] || null;
      const collection = sbtCollections.find(c => 
        c.name === selectedDomainZone || 
        (c.name && c.name.includes(selectedDomainZone))
      );
      return collection?.address || null;
    }
  }, [activeTab, selectedDomainZone, proxyCollections, sbtCollectionAddressesMap, proxyZones]);
};
