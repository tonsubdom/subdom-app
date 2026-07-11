// // src/components/AuctionCollectionSelector/AuctionCollectionSelector.tsx
// import React, { useMemo } from 'react';
// import { useSelector } from 'react-redux';
// import { SimpleCollection } from '@/services/blockchainItems/blockchain-items-types';
// import { selectProxyCollections } from '@/services/blockchainItems/blockchain-items-slice';

// interface AuctionCollectionSelectorProps {
//   activeTab: 'proxy' | 'sbt';
//   selectedDomainZone: string;
//   onDomainZoneChange: (value: string) => void;
//   zonesLoading: boolean;
//   zonesError: string | null;
//   sbtZones: any[];
//   userAddress: string | null;
//   isDark: boolean;
//   t: (key: string) => string;
//   // Для SBT режима - старая логика
//   sbtCollectionAddressesMap?: Record<string, string>;
//   activeSbtZones?: any[];
// }

// // Утилиты для форматирования и цветов
// const getItemCountColor = (count: number): string => {
//   if (count === 0) return '#888'; // серый
//   if (count >= 1 && count <= 10) return '#10b981'; // зеленый
//   if (count >= 11 && count <= 50) return '#3b82f6'; // синий
//   if (count >= 51 && count <= 250) return '#8b5cf6'; // фиолетовый/сиреневый
//   if (count >= 251 && count <= 500) return '#f59e0b'; // золотой
//   return '#f97316'; // оранжевый (500+)
// };

// const formatZoneName = (zoneName: string): string => {
//   if (!zoneName) return '';
  
//   // Извлекаем имя зоны (без .ton)
//   const zone = zoneName.split('.')[0];
  
//   // Если длина зоны больше 9 символов, обрезаем с троеточием
//   if (zone.length > 9) {
//     return `${zone.slice(0, 3)}...${zone.slice(-3)}`;
//   }
  
//   return zone;
// };

// const formatItemCount = (count: number): string => {
//   if (count === 0) return '0 subdomains';
//   if (count === 1) return '1 subdomain';
//   return `${count} subdomains`;
// };

// export const AuctionCollectionSelector: React.FC<AuctionCollectionSelectorProps> = ({
//   activeTab,
//   selectedDomainZone,
//   onDomainZoneChange,
//   zonesLoading,
//   zonesError,
//   sbtZones,
//   userAddress,
//   isDark,
//   t,
//   sbtCollectionAddressesMap = {},
//   activeSbtZones = []
// }) => {
//   // Получаем proxy коллекции из Redux store
//   const proxyCollections = useSelector(selectProxyCollections);
  
//   // Рассчитываем общее количество итемов для всех proxy коллекций
//   const totalProxyItems = useMemo(() => {
//     return proxyCollections.reduce((total, collection) => {
//       return total + (collection.total_items || 0);
//     }, 0);
//   }, [proxyCollections]);
  
//   // Создаем опции для Proxy режима с улучшенным форматированием
//   const proxyOptions = useMemo(() => {
//     return proxyCollections.map((collection: SimpleCollection) => {
//       const zoneName = collection.name || '';
//       const formattedZone = formatZoneName(zoneName);
//       const itemCount = collection.total_items || 0;
//       const percentage = totalProxyItems > 0 
//         ? ((itemCount / totalProxyItems) * 100).toFixed(1)
//         : '0.0';
      
//       return {
//         value: zoneName,
//         label: `.${formattedZone}`,
//         itemCount,
//         percentage,
//         color: getItemCountColor(itemCount),
//         collectionAddress: collection.address
//       };
//     });
//   }, [proxyCollections, totalProxyItems]);
  
//   // Обработчик изменения выбранной зоны
//   const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     const value = e.target.value;
//     onDomainZoneChange(value);
//   };
  
//   // Для SBT режима используем старую логику
//   if (activeTab === 'sbt') {
//     return (
//       <div style={{position: 'relative', width: '280px'}}>
//         <div style={{
//           position: 'absolute', 
//           left: '-30px', 
//           top: '50%', 
//           transform: 'translateY(-50%)',
//           fontSize: '18px',
//           fontWeight: 'bold',
//           color: isDark ? "white" : 'black'          
//         }}>
//           1
//         </div>
//         <select 
//           value={selectedDomainZone}
//           onChange={handleChange}
//           disabled={zonesLoading}
//           style={{
//             width: '280px', 
//             borderRadius: '25px',
//             padding: '10px 15px',
//             background: 'white',
//             cursor: zonesLoading ? 'not-allowed' : 'pointer',
//             color: 'black'
//           }}
//         >
//           <option value="">
//             {zonesLoading 
//               ? t('loadingZones')
//               : zonesError
//               ? t('zonesLoadError')
//               : t('chooseSbtZone')
//             }
//           </option>
//           {activeSbtZones.map(zone => (
//             <option key={zone.id} value={zone.name}>
//               .{zone.name.split('.')[0]} 🔒
//             </option>
//           ))}
//         </select>
//         {zonesError && (
//           <p style={{ color: '#f87171', fontSize: '12px', marginTop: '5px' }}>
//             {zonesError}
//           </p>
//         )}
//         {sbtZones.length === 0 && !zonesLoading && !zonesError && (
//           <p style={{ color: '#f59e0b', fontSize: '12px', marginTop: '5px', textAlign: 'center' }}>
//             {t('noSbtZones')}
//           </p>
//         )}
//       </div>
//     );
//   }
  
//   // Для Proxy режима - новая логика с данными из Redux
//   return (
//     <div style={{position: 'relative', width: '280px'}}>
//       <div style={{
//         position: 'absolute', 
//         left: '-30px', 
//         top: '50%', 
//         transform: 'translateY(-50%)',
//         fontSize: '18px',
//         fontWeight: 'bold',
//         color: isDark ? "white" : 'black'          
//       }}>
//         1
//       </div>
//       <select 
//         value={selectedDomainZone}
//         onChange={handleChange}
//         disabled={zonesLoading}
//         style={{
//           width: '280px', 
//           borderRadius: '25px',
//           padding: '10px 15px',
//           background: 'white',
//           cursor: zonesLoading ? 'not-allowed' : 'pointer',
//           color: 'black',
//           fontFamily: 'monospace'
//         }}
//       >
//         <option value="">
//           {zonesLoading 
//             ? t('loadingZones')
//             : zonesError
//             ? t('zonesLoadError')
//             : t('chooseProxyZone')
//           }
//         </option>
//         {proxyOptions.map((option, index) => (
//           <option 
//             key={index} 
//             value={option.value}
//             data-collection-address={option.collectionAddress}
//             style={{
//               color: 'black',
//               padding: '8px 0'
//             }}
//           >
//             {option.label} | {formatItemCount(option.itemCount)} | {option.percentage}%
//           </option>
//         ))}
//       </select>
      
//       {/* Стили для отображения цветных меток в опциях */}
//       <style>
//         {`
//           select option {
//             position: relative;
//             padding-left: 10px;
//           }
          
//           select option::before {
//             content: '';
//             position: absolute;
//             left: 5px;
//             top: 50%;
//             transform: translateY(-50%);
//             width: 8px;
//             height: 8px;
//             border-radius: 50%;
//             background-color: var(--item-color);
//           }
          
//           ${proxyOptions.map((option, index) => `
//             select option[value="${option.value}"] {
//               --item-color: ${option.color};
//             }
//           `).join('\n')}
//         `}
//       </style>
      
//       {zonesError && (
//         <p style={{ color: '#f87171', fontSize: '12px', marginTop: '5px' }}>
//           {zonesError}
//         </p>
//       )}
      
//       {/* Статистика по proxy коллекциям */}
//       {proxyCollections.length > 0 && (
//         <div style={{
//           marginTop: '8px',
//           padding: '6px 10px',
//           borderRadius: '8px',
//           background: isDark ? '#2a2a2a' : '#f5f5f5',
//           fontSize: '11px',
//           color: isDark ? '#ccc' : '#666',
//           textAlign: 'center'
//         }}>
//           <span style={{ color: '#10b981', fontWeight: 'bold' }}>
//             {proxyCollections.length} zones
//           </span>
//           {' • '}
//           <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>
//             {totalProxyItems} total subdomains
//           </span>
//         </div>
//       )}
//     </div>
//   );
// };

// // Хук для получения collectionAddress из выбранной зоны
// export const useCollectionAddressFromZone = (
//   activeTab: 'proxy' | 'sbt',
//   selectedDomainZone: string,
//   proxyCollections: SimpleCollection[],
//   sbtCollectionAddressesMap: Record<string, string> = {}
// ): string | null => {
//   return useMemo(() => {
//     if (!selectedDomainZone) return null;
    
//     if (activeTab === 'proxy') {
//       // Ищем collection в proxy коллекциях из Redux
//       const collection = proxyCollections.find(c => 
//         c.name === selectedDomainZone || 
//         (c.name && c.name.includes(selectedDomainZone))
//       );
//       return collection?.address || null;
//     } else {
//       // Для SBT используем старую логику
//       return sbtCollectionAddressesMap[selectedDomainZone] || null;
//     }
//   }, [activeTab, selectedDomainZone, proxyCollections, sbtCollectionAddressesMap]);
// };





//////РАБОЧАЯ ВЕРСИЯ


// src/pages/AddSubdomainPage/AuctionCollectionSelector.tsx
// import React, { useMemo } from 'react';
// import { useSelector } from 'react-redux';
// import { SimpleCollection } from '@/services/blockchainItems/blockchain-items-types';
// import { selectProxyCollections } from '@/services/blockchainItems/blockchain-items-slice';

// interface AuctionCollectionSelectorProps {
//   activeTab: 'proxy' | 'sbt';
//   selectedDomainZone: string;
//   onDomainZoneChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
//   zonesLoading: boolean;
//   zonesError: string | null;
//   sbtZones: any[];
//   userAddress: string | null;
//   isDark: boolean;
//   t: (key: string) => string;
//   // Для SBT режима - старая логика
//   sbtCollectionAddressesMap?: Record<string, string>;
//   activeSbtZones?: any[];
//   // Для Proxy режима - старая логика (все Proxy зоны)
//   proxyZones?: any[];
// }

// // Утилиты для форматирования
// const formatZoneName = (zoneName: string): string => {
//   if (!zoneName) return '';
  
//   // Извлекаем имя зоны (без .ton)
//   const zone = zoneName.split('.')[0];
  
//   // Если длина зоны больше 9 символов, обрезаем с троеточием
//   if (zone.length > 9) {
//     return `${zone.slice(0, 3)}...${zone.slice(-3)}`;
//   }
  
//   return zone;
// };

// export const AuctionCollectionSelector: React.FC<AuctionCollectionSelectorProps> = ({
//   activeTab,
//   selectedDomainZone,
//   onDomainZoneChange,
//   zonesLoading,
//   zonesError,
//   sbtZones,
//   userAddress,
//   isDark,
//   t,
//   sbtCollectionAddressesMap = {},
//   activeSbtZones = [],
//   proxyZones = []
// }) => {
//   // Получаем proxy коллекции из Redux store
//   const proxyCollections = useSelector(selectProxyCollections);
  
//   // Для Proxy режима: создаем мапу из proxyCollections для быстрого поиска
//   const proxyCollectionsMap = useMemo(() => {
//     const map: Record<string, SimpleCollection> = {};
//     proxyCollections.forEach(collection => {
//       if (collection.name) {
//         map[collection.name] = collection;
//       }
//     });
//     return map;
//   }, [proxyCollections]);
  
//   // Создаем опции для Proxy режима
//   const proxyOptions = useMemo(() => {
//     return proxyZones.map((zone) => {
//       const zoneName = zone.name || '';
//       const formattedZone = formatZoneName(zoneName);
      
//       // Проверяем, есть ли информация о коллекции в Redux
//       const collectionInfo = proxyCollectionsMap[zoneName];
//       const itemCount = collectionInfo?.total_items || 0;
      
//       return {
//         value: zoneName,
//         label: `.${formattedZone}`,
//         itemCount,
//         isUserZone: zone.owner === userAddress
//       };
//     });
//   }, [proxyZones, proxyCollectionsMap, userAddress]);
  
//   // Для SBT режима используем старую логику
//   if (activeTab === 'sbt') {
//     return (
//       <div style={{position: 'relative', width: '280px'}}>
//         <div style={{
//           position: 'absolute', 
//           left: '-30px', 
//           top: '50%', 
//           transform: 'translateY(-50%)',
//           fontSize: '18px',
//           fontWeight: 'bold',
//           color: isDark ? "white" : 'black'          
//         }}>
//           1
//         </div>
//         <select 
//           value={selectedDomainZone}
//           onChange={onDomainZoneChange}
//           disabled={zonesLoading}
//           style={{
//             width: '280px', 
//             borderRadius: '25px',
//             padding: '10px 15px',
//             background: 'white',
//             cursor: zonesLoading ? 'not-allowed' : 'pointer',
//             color: 'black'
//           }}
//         >
//           <option value="">
//             {zonesLoading 
//               ? t('loadingZones')
//               : zonesError
//               ? t('zonesLoadError')
//               : t('chooseSbtZone')
//             }
//           </option>
//           {activeSbtZones.map(zone => (
//             <option key={zone.id} value={zone.name}>
//               .{zone.name.split('.')[0]} 🔒
//             </option>
//           ))}
//         </select>
//         {zonesError && (
//           <p style={{ color: '#f87171', fontSize: '12px', marginTop: '5px' }}>
//             {zonesError}
//           </p>
//         )}
//         {sbtZones.length === 0 && !zonesLoading && !zonesError && (
//           <p style={{ color: '#f59e0b', fontSize: '12px', marginTop: '5px', textAlign: 'center' }}>
//             {t('noSbtZones')}
//           </p>
//         )}
//       </div>
//     );
//   }
  
//   // Для Proxy режима - используем данные из Redux для отображения информации
//   return (
//     <div style={{position: 'relative', width: '280px'}}>
//       <div style={{
//         position: 'absolute', 
//         left: '-30px', 
//         top: '50%', 
//         transform: 'translateY(-50%)',
//         fontSize: '18px',
//         fontWeight: 'bold',
//         color: isDark ? "white" : 'black'          
//       }}>
//         1
//       </div>
//       <select 
//         value={selectedDomainZone}
//         onChange={onDomainZoneChange}
//         disabled={zonesLoading}
//         style={{
//           width: '280px', 
//           borderRadius: '25px',
//           padding: '10px 15px',
//           background: 'white',
//           cursor: zonesLoading ? 'not-allowed' : 'pointer',
//           color: 'black',
//           fontFamily: 'monospace'
//         }}
//       >
//         <option value="">
//           {zonesLoading 
//             ? t('loadingZones')
//             : zonesError
//             ? t('zonesLoadError')
//             : t('chooseProxyZone')
//           }
//         </option>
//         {proxyOptions.map((option, index) => (
//           <option 
//             key={index} 
//             value={option.value}
//             style={{
//               color: 'black',
//               padding: '8px 0'
//             }}
//           >
//             {option.label} 🌐 {option.isUserZone ? t('yourZone') : ''} 
//             {option.itemCount > 0 ? ` (${option.itemCount})` : ''}
//           </option>
//         ))}
//       </select>
      
//       {zonesError && (
//         <p style={{ color: '#f87171', fontSize: '12px', marginTop: '5px' }}>
//           {zonesError}
//         </p>
//       )}
      
//       {/* Статистика по proxy коллекциям */}
//       {proxyCollections.length > 0 && (
//         <div style={{
//           marginTop: '8px',
//           padding: '6px 10px',
//           borderRadius: '8px',
//           background: isDark ? '#2a2a2a' : '#f5f5f5',
//           fontSize: '11px',
//           color: isDark ? '#ccc' : '#666',
//           textAlign: 'center'
//         }}>
//           <span style={{ color: '#10b981', fontWeight: 'bold' }}>
//             {proxyCollections.length} collections
//           </span>
//           {' • '}
//           <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>
//             {proxyCollections.reduce((total, c) => total + (c.total_items || 0), 0)} total items
//           </span>
//         </div>
//       )}
//     </div>
//   );
// };

// // Хук для получения collectionAddress из выбранной зоны (сохраняем старую логику)
// export const useCollectionAddressFromZone = (
//   activeTab: 'proxy' | 'sbt',
//   selectedDomainZone: string,
//   proxyCollections: SimpleCollection[],
//   sbtCollectionAddressesMap: Record<string, string> = {},
//   allZones: any[] = []
// ): string | null => {
//   return useMemo(() => {
//     if (!selectedDomainZone) return null;
    
//     if (activeTab === 'proxy') {
//       // Для Proxy режима: сначала ищем в базе данных (старая логика)
//       const zoneFromDb = allZones.find(z => z.name === selectedDomainZone);
//       if (zoneFromDb?.collectionAddress) {
//         return zoneFromDb.collectionAddress;
//       }
      
//       // Если не нашли в базе, ищем в Redux коллекциях
//       const collection = proxyCollections.find(c => 
//         c.name === selectedDomainZone || 
//         (c.name && c.name.includes(selectedDomainZone))
//       );
//       return collection?.address || null;
//     } else {
//       // Для SBT используем старую логику
//       return sbtCollectionAddressesMap[selectedDomainZone] || null;
//     }
//   }, [activeTab, selectedDomainZone, proxyCollections, sbtCollectionAddressesMap, allZones]);
// };




//Рабочая версия прям хорошо
// src/components/AuctionCollectionSelector/AuctionCollectionSelector.tsx
// import React, { useMemo } from 'react';
// import { useSelector } from 'react-redux';
// import { SimpleCollection } from '@/services/blockchainItems/blockchain-items-types';
// import { selectProxyCollections } from '@/services/blockchainItems/blockchain-items-slice';
// import { Zone } from '@/services/api';

// interface AuctionCollectionSelectorProps {
//   activeTab: 'proxy' | 'sbt';
//   selectedDomainZone: string;
//   onDomainZoneChange: (value: string) => void;
//   zonesLoading: boolean;
//   zonesError: string | null;
//   sbtZones: any[];
//   userAddress: string | null;
//   isDark: boolean;
//   t: (key: string) => string;
//   // Для SBT режима - старая логика
//   sbtCollectionAddressesMap?: Record<string, string>;
//   activeSbtZones?: any[];
//   proxyZones?: Zone[];
// }

// // Утилиты для форматирования и цветов
// const getItemCountColor = (count: number): string => {
//   if (count === 0) return '#888'; // серый
//   if (count >= 1 && count <= 10) return '#10b981'; // зеленый
//   if (count >= 11 && count <= 50) return '#3b82f6'; // синий
//   if (count >= 51 && count <= 250) return '#8b5cf6'; // фиолетовый/сиреневый
//   if (count >= 251 && count <= 500) return '#f59e0b'; // золотой
//   return '#f97316'; // оранжевый (500+)
// };

// const formatZoneName = (zoneName: string): string => {
//   if (!zoneName) return '';
  
//   // Извлекаем имя зоны (без .ton)
//   const zone = zoneName.split('.')[0];
  
//   // Если длина зоны больше 9 символов, обрезаем с троеточием
//   if (zone.length > 9) {
//     return `${zone.slice(0, 3)}...${zone.slice(-3)}`;
//   }
  
//   return zone;
// };

// const formatItemCount = (count: number): string => {
//   if (count === 0) return '0 subdomains';
//   if (count === 1) return '1 subdomain';
//   return `${count} subdomains`;
// };

// // Компонент для отображения цветной метки
// const ItemCountBadge: React.FC<{ count: number }> = ({ count }) => {
//   const color = getItemCountColor(count);
  
//   return (
//     <span style={{
//       display: 'inline-block',
//       width: '8px',
//       height: '8px',
//       borderRadius: '50%',
//       backgroundColor: color,
//       marginRight: '6px',
//       verticalAlign: 'middle'
//     }} />
//   );
// };

// // Компонент для отображения информации о коллекции в селекте
// const CollectionOptionContent: React.FC<{
//   zoneName: string;
//   itemCount: number;
//   percentage: string;
// }> = ({ zoneName, itemCount, percentage }) => {
//   const formattedZone = formatZoneName(zoneName);
  
//   return (
//     <div style={{
//       display: 'flex',
//       flexDirection: 'column',
//       gap: '2px',
//       padding: '4px 0'
//     }}>
//       {/* Первая строка: название зоны */}
//       <div style={{
//         display: 'flex',
//         alignItems: 'center',
//         fontSize: '14px',
//         fontWeight: 'bold'
//       }}>
//         <ItemCountBadge count={itemCount} />
//         <span style={{ color: 'black' }}>.{formattedZone}</span>
//       </div>
      
//       {/* Вторая строка: количество субдоменов и процент */}
//       <div style={{
//         display: 'flex',
//         justifyContent: 'space-between',
//         fontSize: '11px',
//         color: '#666',
//         marginLeft: '14px' // Отступ для выравнивания с текстом зоны
//       }}>
//         <span style={{ color: getItemCountColor(itemCount) }}>
//           {formatItemCount(itemCount)}
//         </span>
//         <span style={{ fontWeight: 'bold' }}>
//           {percentage}%
//         </span>
//       </div>
//     </div>
//   );
// };

// export const AuctionCollectionSelector: React.FC<AuctionCollectionSelectorProps> = ({
//   activeTab,
//   selectedDomainZone,
//   onDomainZoneChange,
//   zonesLoading,
//   zonesError,
//   sbtZones,
//   userAddress,
//   isDark,
//   t,
//   sbtCollectionAddressesMap = {},
//   activeSbtZones = []
// }) => {
//   // Получаем proxy коллекции из Redux store
//   const proxyCollections = useSelector(selectProxyCollections);
  
//   // Рассчитываем общее количество итемов для всех proxy коллекций
//   const totalProxyItems = useMemo(() => {
//     return proxyCollections.reduce((total, collection) => {
//       return total + (collection.total_items || 0);
//     }, 0);
//   }, [proxyCollections]);
  
//   // Создаем опции для Proxy режима с улучшенным форматированием
//   const proxyOptions = useMemo(() => {
//     return proxyCollections.map((collection: SimpleCollection) => {
//       const zoneName = collection.name || '';
//       const itemCount = collection.total_items || 0;
//       const percentage = totalProxyItems > 0 
//         ? ((itemCount / totalProxyItems) * 100).toFixed(1)
//         : '0.0';
      
//       return {
//         value: zoneName,
//         label: zoneName,
//         itemCount,
//         percentage,
//         color: getItemCountColor(itemCount),
//         collectionAddress: collection.address
//       };
//     });
//   }, [proxyCollections, totalProxyItems]);
  
//   // Обработчик изменения выбранной зоны
//   const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     const value = e.target.value;
//     onDomainZoneChange(value);
//   };
  
//   // Для SBT режима используем старую логику
//   if (activeTab === 'sbt') {
//     return (
//       <div style={{position: 'relative', width: '280px'}}>
//         <div style={{
//           position: 'absolute', 
//           left: '-30px', 
//           top: '50%', 
//           transform: 'translateY(-50%)',
//           fontSize: '18px',
//           fontWeight: 'bold',
//           color: isDark ? "white" : 'black'          
//         }}>
//           1
//         </div>
//         <select 
//           value={selectedDomainZone}
//           onChange={handleChange}
//           disabled={zonesLoading}
//           style={{
//             width: '280px', 
//             borderRadius: '25px',
//             padding: '10px 15px',
//             background: 'white',
//             cursor: zonesLoading ? 'not-allowed' : 'pointer',
//             color: 'black'
//           }}
//         >
//           <option value="">
//             {zonesLoading 
//               ? t('loadingZones')
//               : zonesError
//               ? t('zonesLoadError')
//               : t('chooseSbtZone')
//             }
//           </option>
//           {activeSbtZones.map(zone => (
//             <option key={zone.id} value={zone.name}>
//               .{zone.name.split('.')[0]} 🔒
//             </option>
//           ))}
//         </select>
//         {zonesError && (
//           <p style={{ color: '#f87171', fontSize: '12px', marginTop: '5px' }}>
//             {zonesError}
//           </p>
//         )}
//         {sbtZones.length === 0 && !zonesLoading && !zonesError && (
//           <p style={{ color: '#f59e0b', fontSize: '12px', marginTop: '5px', textAlign: 'center' }}>
//             {t('noSbtZones')}
//           </p>
//         )}
//       </div>
//     );
//   }
  
//   // Для Proxy режима - новая логика с данными из Redux
//   return (
//     <div style={{position: 'relative', width: '280px'}}>
//       <div style={{
//         position: 'absolute', 
//         left: '-30px', 
//         top: '50%', 
//         transform: 'translateY(-50%)',
//         fontSize: '18px',
//         fontWeight: 'bold',
//         color: isDark ? "white" : 'black'          
//       }}>
//         1
//       </div>
//       <select 
//         value={selectedDomainZone}
//         onChange={handleChange}
//         disabled={zonesLoading}
//         style={{
//           width: '280px', 
//           borderRadius: '25px',
//           padding: '10px 15px',
//           background: 'white',
//           cursor: zonesLoading ? 'not-allowed' : 'pointer',
//           color: 'black',
//           fontFamily: 'monospace',
//           appearance: 'none',
//           WebkitAppearance: 'none',
//           MozAppearance: 'none'
//         }}
//       >
//         <option value="">
//           {zonesLoading 
//             ? t('loadingZones')
//             : zonesError
//             ? t('zonesLoadError')
//             : t('chooseProxyZone')
//           }
//         </option>
//         {proxyOptions.map((option, index) => (
//           <option 
//             key={index} 
//             value={option.value}
//             data-collection-address={option.collectionAddress}
//             style={{
//               color: 'black',
//               padding: '8px 4px',
//               fontSize: '14px'
//             }}
//           >
//             {/* Используем innerHTML для отображения форматированного контента */}
//             {`.${formatZoneName(option.label)} | ${formatItemCount(option.itemCount)} | ${option.percentage}%`}
//           </option>
//         ))}
//       </select>
      
//       {/* Стили для отображения цветных меток в опциях */}
//       <style>
//         {`
//           select option {
//             position: relative;
//             padding-left: 24px !important;
//           }
          
//           select option::before {
//             content: '';
//             position: absolute;
//             left: 8px;
//             top: 50%;
//             transform: translateY(-50%);
//             width: 8px;
//             height: 8px;
//             border-radius: 50%;
//           }
          
//           ${proxyOptions.map((option, index) => `
//             select option[value="${option.value}"]::before {
//               background-color: ${option.color};
//             }
//           `).join('\n')}
//         `}
//       </style>
      
//       {zonesError && (
//         <p style={{ color: '#f87171', fontSize: '12px', marginTop: '5px' }}>
//           {zonesError}
//         </p>
//       )}
      
//       {/* Статистика по proxy коллекциям */}
//       {proxyCollections.length > 0 && (
//         <div style={{
//           marginTop: '8px',
//           padding: '6px 10px',
//           borderRadius: '8px',
//           background: isDark ? '#2a2a2a' : '#f5f5f5',
//           fontSize: '11px',
//           color: isDark ? '#ccc' : '#666',
//           textAlign: 'center'
//         }}>
//           <span style={{ color: '#10b981', fontWeight: 'bold' }}>
//             {proxyCollections.length} zones
//           </span>
//           {' • '}
//           <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>
//             {totalProxyItems} total subdomains
//           </span>
//           {' • '}
//           <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>
//             Avg: {(totalProxyItems / proxyCollections.length).toFixed(1)} per zone
//           </span>
//         </div>
//       )}
//     </div>
//   );
// };

// // Хук для получения collectionAddress из выбранной зоны
// export const useCollectionAddressFromZone = (
//   activeTab: 'proxy' | 'sbt',
//   selectedDomainZone: string,
//   proxyCollections: SimpleCollection[],
//   sbtCollectionAddressesMap: Record<string, string> = {}
// ): string | null => {
//   return useMemo(() => {
//     if (!selectedDomainZone) return null;
    
//     if (activeTab === 'proxy') {
//       // Ищем collection в proxy коллекциях из Redux
//       const collection = proxyCollections.find(c => 
//         c.name === selectedDomainZone || 
//         (c.name && c.name.includes(selectedDomainZone))
//       );
//       return collection?.address || null;
//     } else {
//       // Для SBT используем старую логику
//       return sbtCollectionAddressesMap[selectedDomainZone] || null;
//     }
//   }, [activeTab, selectedDomainZone, proxyCollections, sbtCollectionAddressesMap]);
// };

// // Утилита для получения информации о коллекции по имени зоны
// export const getCollectionInfoByZoneName = (
//   zoneName: string,
//   proxyCollections: SimpleCollection[],
//   totalProxyItems: number
// ) => {
//   const collection = proxyCollections.find(c => c.name === zoneName);
//   if (!collection) return null;
  
//   const itemCount = collection.total_items || 0;
//   const percentage = totalProxyItems > 0 
//     ? ((itemCount / totalProxyItems) * 100).toFixed(1)
//     : '0.0';
  
//   return {
//     ...collection,
//     itemCount,
//     percentage,
//     color: getItemCountColor(itemCount)
//   };
// };









// src/components/AuctionCollectionSelector/AuctionCollectionSelector.tsx
// import React, { useMemo } from 'react';
// import { useSelector } from 'react-redux';
// import { SimpleCollection } from '@/services/blockchainItems/blockchain-items-types';
// import { selectProxyCollections } from '@/services/blockchainItems/blockchain-items-slice';
// import { Zone } from '@/services/api';

// interface AuctionCollectionSelectorProps {
//   activeTab: 'proxy' | 'sbt';
//   selectedDomainZone: string;
//   onDomainZoneChange: (value: string) => void;
//   zonesLoading: boolean;
//   zonesError: string | null;
//   sbtZones: Zone[];
//   userAddress: string | null;
//   isDark: boolean;
//   t: (key: string) => string;
//   // Для SBT режима
//   sbtCollectionAddressesMap?: Record<string, string>;
//   activeSbtZones?: Zone[];
//   // Для Proxy режима - зоны из базы данных
//   proxyZones?: Zone[];
// }

// // Утилиты для форматирования и цветов
// const getItemCountColor = (count: number): string => {
//   if (count === 0) return '#888'; // серый
//   if (count >= 1 && count <= 10) return '#10b981'; // зеленый
//   if (count >= 11 && count <= 50) return '#3b82f6'; // синий
//   if (count >= 51 && count <= 250) return '#8b5cf6'; // фиолетовый/сиреневый
//   if (count >= 251 && count <= 500) return '#f59e0b'; // золотой
//   return '#f97316'; // оранжевый (500+)
// };

// const formatZoneName = (zoneName: string): string => {
//   if (!zoneName) return '';
  
//   // Извлекаем имя зоны (без .ton)
//   const zone = zoneName.split('.')[0];
  
//   // Если длина зоны больше 9 символов, обрезаем с троеточием
//   if (zone.length > 9) {
//     return `${zone.slice(0, 3)}...${zone.slice(-3)}`;
//   }
  
//   return zone;
// };

// const formatItemCount = (count: number): string => {
//   if (count === 0) return '0 subdomains';
//   if (count === 1) return '1 subdomain';
//   return `${count} subdomains`;
// };

// export const AuctionCollectionSelector: React.FC<AuctionCollectionSelectorProps> = ({
//   activeTab,
//   selectedDomainZone,
//   onDomainZoneChange,
//   zonesLoading,
//   zonesError,
//   sbtZones,
//   userAddress,
//   isDark,
//   t,
//   sbtCollectionAddressesMap = {},
//   activeSbtZones = [],
//   proxyZones = []
// }) => {
//   // Получаем proxy коллекции из Redux store для статистики
//   const proxyCollections = useSelector(selectProxyCollections);
  
//   // Рассчитываем общее количество итемов для всех proxy коллекций
//   const totalProxyItems = useMemo(() => {
//     return proxyCollections.reduce((total, collection) => {
//       return total + (collection.total_items || 0);
//     }, 0);
//   }, [proxyCollections]);
  
//   // Создаем мапу для быстрого поиска информации о коллекциях
//   const proxyCollectionsMap = useMemo(() => {
//     const map: Record<string, SimpleCollection> = {};
//     proxyCollections.forEach(collection => {
//       if (collection.name) {
//         map[collection.name] = collection;
//       }
//     });
//     return map;
//   }, [proxyCollections]);
  
//   // Создаем опции для Proxy режима с улучшенным форматированием
//   const proxyOptions = useMemo(() => {
//     return proxyZones.map((zone) => {
//       const zoneName = zone.name || '';
//       const formattedZone = formatZoneName(zoneName);
      
//       // Проверяем, есть ли информация о коллекции в Redux
//       const collectionInfo = proxyCollectionsMap[zoneName];
//       const itemCount = collectionInfo?.total_items || 0;
//       const percentage = totalProxyItems > 0 
//         ? ((itemCount / totalProxyItems) * 100).toFixed(1)
//         : '0.0';
      
//       return {
//         value: zoneName,
//         label: `.${formattedZone}`,
//         itemCount,
//         percentage,
//         color: getItemCountColor(itemCount),
//         isUserZone: zone.owner === userAddress,
//         collectionAddress: zone.collectionAddress
//       };
//     });
//   }, [proxyZones, proxyCollectionsMap, totalProxyItems, userAddress]);
  
//   // Обработчик изменения выбранной зоны
//   const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     const value = e.target.value;
//     onDomainZoneChange(value);
//   };
  
//   // Для SBT режима используем старую логику
//   if (activeTab === 'sbt') {
//     return (
//       <div style={{position: 'relative', width: '280px'}}>
//         <div style={{
//           position: 'absolute', 
//           left: '-30px', 
//           top: '50%', 
//           transform: 'translateY(-50%)',
//           fontSize: '18px',
//           fontWeight: 'bold',
//           color: isDark ? "white" : 'black'          
//         }}>
//           1
//         </div>
//         <select 
//           value={selectedDomainZone}
//           onChange={handleChange}
//           disabled={zonesLoading}
//           style={{
//             width: '280px', 
//             borderRadius: '25px',
//             padding: '10px 15px',
//             background: 'white',
//             cursor: zonesLoading ? 'not-allowed' : 'pointer',
//             color: 'black'
//           }}
//         >
//           <option value="">
//             {zonesLoading 
//               ? t('loadingZones')
//               : zonesError
//               ? t('zonesLoadError')
//               : t('chooseSbtZone')
//             }
//           </option>
//           {activeSbtZones.map(zone => (
//             <option key={zone.id} value={zone.name}>
//               .{zone.name.split('.')[0]} 🔒
//             </option>
//           ))}
//         </select>
//         {zonesError && (
//           <p style={{ color: '#f87171', fontSize: '12px', marginTop: '5px' }}>
//             {zonesError}
//           </p>
//         )}
//         {sbtZones.length === 0 && !zonesLoading && !zonesError && (
//           <p style={{ color: '#f59e0b', fontSize: '12px', marginTop: '5px', textAlign: 'center' }}>
//             {t('noSbtZones')}
//           </p>
//         )}
//       </div>
//     );
//   }
  
//   // Для Proxy режима - используем данные из базы (proxyZones)
//   return (
//     <div style={{position: 'relative', width: '280px'}}>
//       <div style={{
//         position: 'absolute', 
//         left: '-30px', 
//         top: '50%', 
//         transform: 'translateY(-50%)',
//         fontSize: '18px',
//         fontWeight: 'bold',
//         color: isDark ? "white" : 'black'          
//       }}>
//         1
//       </div>
//       <select 
//         value={selectedDomainZone}
//         onChange={handleChange}
//         disabled={zonesLoading}
//         style={{
//           width: '280px', 
//           borderRadius: '25px',
//           padding: '10px 15px',
//           background: 'white',
//           cursor: zonesLoading ? 'not-allowed' : 'pointer',
//           color: 'black',
//           fontFamily: 'monospace',
//           appearance: 'none',
//           WebkitAppearance: 'none',
//           MozAppearance: 'none'
//         }}
//       >
//         <option value="">
//           {zonesLoading 
//             ? t('loadingZones')
//             : zonesError
//             ? t('zonesLoadError')
//             : t('chooseProxyZone')
//           }
//         </option>
//         {proxyOptions.map((option, index) => (
//           <option 
//             key={index} 
//             value={option.value}
//             data-collection-address={option.collectionAddress}
//             style={{
//               color: 'black',
//               padding: '8px 4px',
//               fontSize: '14px'
//             }}
//           >
//             {option.label} | {formatItemCount(option.itemCount)} | {option.percentage}% {option.isUserZone ? '👑' : ''}
//           </option>
//         ))}
//       </select>
      
//       {/* Стили для отображения цветных меток в опциях */}
//       <style>
//         {`
//           select option {
//             position: relative;
//             padding-left: 24px !important;
//           }
          
//           select option::before {
//             content: '';
//             position: absolute;
//             left: 8px;
//             top: 50%;
//             transform: translateY(-50%);
//             width: 8px;
//             height: 8px;
//             border-radius: 50%;
//           }
          
//           ${proxyOptions.map((option, index) => `
//             select option[value="${option.value}"]::before {
//               background-color: ${option.color};
//             }
//           `).join('\n')}
//         `}
//       </style>
      
//       {zonesError && (
//         <p style={{ color: '#f87171', fontSize: '12px', marginTop: '5px' }}>
//           {zonesError}
//         </p>
//       )}
      
//       {/* Статистика по proxy коллекциям */}
//       {proxyZones.length > 0 && (
//         <div style={{
//           marginTop: '8px',
//           padding: '6px 10px',
//           borderRadius: '8px',
//           background: isDark ? '#2a2a2a' : '#f5f5f5',
//           fontSize: '11px',
//           color: isDark ? '#ccc' : '#666',
//           textAlign: 'center'
//         }}>
//           <span style={{ color: '#10b981', fontWeight: 'bold' }}>
//             {proxyZones.length} zones
//           </span>
//           {' • '}
//           <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>
//             {totalProxyItems} total subdomains
//           </span>
//           {' • '}
//           <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>
//             Avg: {(totalProxyItems / proxyZones.length).toFixed(1)} per zone
//           </span>
//         </div>
//       )}
//     </div>
//   );
// };

// // Хук для получения collectionAddress из выбранной зоны
// export const useCollectionAddressFromZone = (
//   activeTab: 'proxy' | 'sbt',
//   selectedDomainZone: string,
//   proxyCollections: SimpleCollection[],
//   sbtCollectionAddressesMap: Record<string, string> = {},
//   proxyZones: Zone[] = []
// ): string | null => {
//   return useMemo(() => {
//     if (!selectedDomainZone) return null;
    
//     if (activeTab === 'proxy') {
//       // Сначала ищем в базе данных (proxyZones)
//       const zoneFromDb = proxyZones.find(z => z.name === selectedDomainZone);
//       if (zoneFromDb?.collectionAddress) {
//         return zoneFromDb.collectionAddress;
//       }
      
//       // Если не нашли в базе, ищем в Redux коллекциях
//       const collection = proxyCollections.find(c => 
//         c.name === selectedDomainZone || 
//         (c.name && c.name.includes(selectedDomainZone))
//       );
//       return collection?.address || null;
//     } else {
//       // Для SBT используем старую логику
//       return sbtCollectionAddressesMap[selectedDomainZone] || null;
//     }
//   }, [activeTab, selectedDomainZone, proxyCollections, sbtCollectionAddressesMap, proxyZones]);
// };

// // Утилита для получения информации о коллекции по имени зоны
// export const getCollectionInfoByZoneName = (
//   zoneName: string,
//   proxyCollections: SimpleCollection[],
//   totalProxyItems: number,
//   proxyZones: Zone[] = []
// ) => {
//   // Сначала ищем в базе данных
//   const zoneFromDb = proxyZones.find(z => z.name === zoneName);
  
//   // Затем ищем в Redux
//   const collection = proxyCollections.find(c => c.name === zoneName);
  
//   const itemCount = collection?.total_items || 0;
//   const percentage = totalProxyItems > 0 
//     ? ((itemCount / totalProxyItems) * 100).toFixed(1)
//     : '0.0';
  
//   return {
//     ...(zoneFromDb || {}),
//     itemCount,
//     percentage,
//     color: getItemCountColor(itemCount),
//     collectionAddress: zoneFromDb?.collectionAddress || collection?.address
//   };
// };

// src/components/AuctionCollectionSelector/AuctionCollectionSelector.tsx
// import React, { useMemo, useState, useEffect } from 'react';
// import { useSelector } from 'react-redux';
// import { SimpleCollection } from '@/services/blockchainItems/blockchain-items-types';
// import { selectProxyCollections } from '@/services/blockchainItems/blockchain-items-slice';
// import { Zone, Subdomain, apiService } from '@/services/api';

// interface AuctionCollectionSelectorProps {
//   activeTab: 'proxy' | 'sbt';
//   selectedDomainZone: string;
//   onDomainZoneChange: (value: string) => void;
//   zonesLoading: boolean;
//   zonesError: string | null;
//   sbtZones: Zone[];
//   userAddress: string | null;
//   isDark: boolean;
//   t: (key: string) => string;
//   // Для SBT режима
//   sbtCollectionAddressesMap?: Record<string, string>;
//   activeSbtZones?: Zone[];
//   // Для Proxy режима - зоны из базы данных
//   proxyZones?: Zone[];
//   // Для загрузки субдоменов
//   isTestnet?: boolean;
// }

// // Утилиты для форматирования и цветов
// const getItemCountColor = (count: number): string => {
//   if (count === 0) return '#888'; // серый
//   if (count >= 1 && count <= 10) return '#10b981'; // зеленый
//   if (count >= 11 && count <= 50) return '#3b82f6'; // синий
//   if (count >= 51 && count <= 250) return '#8b5cf6'; // фиолетовый/сиреневый
//   if (count >= 251 && count <= 500) return '#f59e0b'; // золотой
//   return '#f97316'; // оранжевый (500+)
// };

// const formatZoneName = (zoneName: string): string => {
//   if (!zoneName) return '';
  
//   // Извлекаем имя зоны (без .ton)
//   const zone = zoneName.split('.')[0];
  
//   // Если длина зоны больше 9 символов, обрезаем с троеточием
//   if (zone.length > 9) {
//     return `${zone.slice(0, 3)}...${zone.slice(-3)}`;
//   }
  
//   return zone;
// };

// const formatItemCount = (count: number): string => {
//   if (count === 0) return '0 subdomains';
//   if (count === 1) return '1 subdomain';
//   return `${count} subdomains`;
// };

// export const AuctionCollectionSelector: React.FC<AuctionCollectionSelectorProps> = ({
//   activeTab,
//   selectedDomainZone,
//   onDomainZoneChange,
//   zonesLoading,
//   zonesError,
//   sbtZones,
//   userAddress,
//   isDark,
//   t,
//   sbtCollectionAddressesMap = {},
//   activeSbtZones = [],
//   proxyZones = [],
//   isTestnet = false
// }) => {
//   // Получаем proxy коллекции из Redux store для статистики
//   const proxyCollections = useSelector(selectProxyCollections);
  
//   // Состояние для хранения субдоменов каждой зоны
//   const [zoneSubdomains, setZoneSubdomains] = useState<Record<number, Subdomain[]>>({});
//   const [loadingSubdomains, setLoadingSubdomains] = useState<boolean>(false);
  
//   // Загружаем субдомены для всех Proxy зон
//   useEffect(() => {
//     if (activeTab === 'proxy' && proxyZones.length > 0 && !loadingSubdomains) {
//       loadZoneSubdomains();
//     }
//   }, [activeTab, proxyZones, isTestnet]);
  
//   const loadZoneSubdomains = async () => {
//     setLoadingSubdomains(true);
    
//     try {
//       // Устанавливаем сеть перед вызовом
//       apiService.setNetwork(isTestnet);
      
//       const subdomainsMap: Record<number, Subdomain[]> = {};
      
//       // Загружаем субдомены для каждой зоны параллельно
//       await Promise.all(
//         proxyZones.map(async (zone) => {
//           try {
//             if (zone.id) {
//               const subdomains = await apiService.getZoneSubdomains(zone.id);
//               subdomainsMap[zone.id] = subdomains;
//               console.log(`✅ Загружено ${subdomains.length} субдоменов для зоны ${zone.name}`);
//             }
//           } catch (error) {
//             console.error(`❌ Ошибка загрузки субдоменов для зоны ${zone.name}:`, error);
//             subdomainsMap[zone.id] = [];
//           }
//         })
//       );
      
//       setZoneSubdomains(subdomainsMap);
//     } catch (error) {
//       console.error('❌ Ошибка загрузки субдоменов:', error);
//     } finally {
//       setLoadingSubdomains(false);
//     }
//   };
  
//   // Рассчитываем общее количество субдоменов для всех proxy зон
//   const totalProxySubdomains = useMemo(() => {
//     return Object.values(zoneSubdomains).reduce((total, subdomains) => {
//       return total + subdomains.length;
//     }, 0);
//   }, [zoneSubdomains]);
  
//   // Создаем опции для Proxy режима с информацией о субдоменах
//   const proxyOptions = useMemo(() => {
//     return proxyZones.map((zone) => {
//       const zoneName = zone.name || '';
//       const formattedZone = formatZoneName(zoneName);
      
//       // Получаем субдомены для этой зоны
//       const subdomains = zoneSubdomains[zone.id] || [];
//       const itemCount = subdomains.length;
      
//       // Рассчитываем процент от общего количества
//       const percentage = totalProxySubdomains > 0 
//         ? ((itemCount / totalProxySubdomains) * 100).toFixed(1)
//         : '0.0';
      
//       return {
//         value: zoneName,
//         label: `.${formattedZone}`,
//         itemCount,
//         percentage,
//         color: getItemCountColor(itemCount),
//         isUserZone: zone.owner === userAddress,
//         collectionAddress: zone.collectionAddress,
//         zoneId: zone.id
//       };
//     }).sort((a, b) => b.itemCount - a.itemCount); // Сортируем по количеству субдоменов
//   }, [proxyZones, zoneSubdomains, totalProxySubdomains, userAddress]);
  
//   // Обработчик изменения выбранной зоны
//   const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     const value = e.target.value;
//     onDomainZoneChange(value);
//   };
  
//   // Для SBT режима используем старую логику
//   if (activeTab === 'sbt') {
//     return (
//       <div style={{position: 'relative', width: '280px'}}>
//         <div style={{
//           position: 'absolute', 
//           left: '-30px', 
//           top: '50%', 
//           transform: 'translateY(-50%)',
//           fontSize: '18px',
//           fontWeight: 'bold',
//           color: isDark ? "white" : 'black'          
//         }}>
//           1
//         </div>
//         <select 
//           value={selectedDomainZone}
//           onChange={handleChange}
//           disabled={zonesLoading}
//           style={{
//             width: '280px', 
//             borderRadius: '25px',
//             padding: '10px 15px',
//             background: 'white',
//             cursor: zonesLoading ? 'not-allowed' : 'pointer',
//             color: 'black'
//           }}
//         >
//           <option value="">
//             {zonesLoading 
//               ? t('loadingZones')
//               : zonesError
//               ? t('zonesLoadError')
//               : t('chooseSbtZone')
//             }
//           </option>
//           {activeSbtZones.map(zone => (
//             <option key={zone.id} value={zone.name}>
//               .{zone.name.split('.')[0]} 🔒
//             </option>
//           ))}
//         </select>
//         {zonesError && (
//           <p style={{ color: '#f87171', fontSize: '12px', marginTop: '5px' }}>
//             {zonesError}
//           </p>
//         )}
//         {sbtZones.length === 0 && !zonesLoading && !zonesError && (
//           <p style={{ color: '#f59e0b', fontSize: '12px', marginTop: '5px', textAlign: 'center' }}>
//             {t('noSbtZones')}
//           </p>
//         )}
//       </div>
//     );
//   }
  
//   // Для Proxy режима - используем данные из базы с информацией о субдоменах
//   return (
//     <div style={{position: 'relative', width: '280px'}}>
//       <div style={{
//         position: 'absolute', 
//         left: '-30px', 
//         top: '50%', 
//         transform: 'translateY(-50%)',
//         fontSize: '18px',
//         fontWeight: 'bold',
//         color: isDark ? "white" : 'black'          
//       }}>
//         1
//       </div>
//       <select 
//         value={selectedDomainZone}
//         onChange={handleChange}
//         disabled={zonesLoading || loadingSubdomains}
//         style={{
//           width: '280px', 
//           borderRadius: '25px',
//           padding: '10px 15px',
//           background: 'white',
//           cursor: (zonesLoading || loadingSubdomains) ? 'not-allowed' : 'pointer',
//           color: 'black',
//           fontFamily: 'monospace',
//           appearance: 'none',
//           WebkitAppearance: 'none',
//           MozAppearance: 'none'
//         }}
//       >
//         <option value="">
//           {zonesLoading 
//             ? t('loadingZones')
//             : loadingSubdomains
//             ? t('loadingSubdomains')
//             : zonesError
//             ? t('zonesLoadError')
//             : t('chooseProxyZone')
//           }
//         </option>
//         {proxyOptions.map((option, index) => (
//           <option 
//             key={index} 
//             value={option.value}
//             data-collection-address={option.collectionAddress}
//             data-zone-id={option.zoneId}
//             style={{
//               color: 'black',
//               padding: '8px 4px',
//               fontSize: '14px'
//             }}
//           >
//             {option.label} | {formatItemCount(option.itemCount)} | {option.percentage}% {option.isUserZone ? '👑' : ''}
//           </option>
//         ))}
//       </select>
      
//       {/* Стили для отображения цветных меток в опциях */}
//       <style>
//         {`
//           select option {
//             position: relative;
//             padding-left: 24px !important;
//           }
          
//           select option::before {
//             content: '';
//             position: absolute;
//             left: 8px;
//             top: 50%;
//             transform: translateY(-50%);
//             width: 8px;
//             height: 8px;
//             border-radius: 50%;
//           }
          
//           ${proxyOptions.map((option, index) => `
//             select option[value="${option.value}"]::before {
//               background-color: ${option.color};
//             }
//           `).join('\n')}
//         `}
//       </style>
      
//       {zonesError && (
//         <p style={{ color: '#f87171', fontSize: '12px', marginTop: '5px' }}>
//           {zonesError}
//         </p>
//       )}
      
//       {/* Статистика по proxy зонам */}
//       {proxyZones.length > 0 && (
//         <div style={{
//           marginTop: '8px',
//           padding: '6px 10px',
//           borderRadius: '8px',
//           background: isDark ? '#2a2a2a' : '#f5f5f5',
//           fontSize: '11px',
//           color: isDark ? '#ccc' : '#666',
//           textAlign: 'center'
//         }}>
//           <span style={{ color: '#10b981', fontWeight: 'bold' }}>
//             {proxyZones.length} zones
//           </span>
//           {' • '}
//           <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>
//             {totalProxySubdomains} total subdomains
//           </span>
//           {' • '}
//           <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>
//             Avg: {(totalProxySubdomains / proxyZones.length).toFixed(1)} per zone
//           </span>
//           {loadingSubdomains && (
//             <span style={{ color: '#f59e0b', marginLeft: '8px' }}>
//               🔄 Loading...
//             </span>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

// // Хук для получения collectionAddress из выбранной зоны
// export const useCollectionAddressFromZone = (
//   activeTab: 'proxy' | 'sbt',
//   selectedDomainZone: string,
//   proxyCollections: SimpleCollection[],
//   sbtCollectionAddressesMap: Record<string, string> = {},
//   proxyZones: Zone[] = []
// ): string | null => {
//   return useMemo(() => {
//     if (!selectedDomainZone) return null;
    
//     if (activeTab === 'proxy') {
//       // Сначала ищем в базе данных (proxyZones)
//       const zoneFromDb = proxyZones.find(z => z.name === selectedDomainZone);
//       if (zoneFromDb?.collectionAddress) {
//         return zoneFromDb.collectionAddress;
//       }
      
//       // Если не нашли в базе, ищем в Redux коллекциях
//       const collection = proxyCollections.find(c => 
//         c.name === selectedDomainZone || 
//         (c.name && c.name.includes(selectedDomainZone))
//       );
//       return collection?.address || null;
//     } else {
//       // Для SBT используем старую логику
//       return sbtCollectionAddressesMap[selectedDomainZone] || null;
//     }
//   }, [activeTab, selectedDomainZone, proxyCollections, sbtCollectionAddressesMap, proxyZones]);
// };

// // Утилита для получения информации о коллекции по имени зоны
// export const getCollectionInfoByZoneName = (
//   zoneName: string,
//   proxyCollections: SimpleCollection[],
//   proxyZones: Zone[] = [],
//   zoneSubdomains: Record<number, Subdomain[]> = {}
// ) => {
//   // Сначала ищем в базе данных
//   const zoneFromDb = proxyZones.find(z => z.name === zoneName);
  
//   if (!zoneFromDb) return null;
  
//   // Получаем субдомены для этой зоны
//   const subdomains = zoneSubdomains[zoneFromDb.id] || [];
//   const itemCount = subdomains.length;
  
//   // Рассчитываем общее количество субдоменов для всех зон
//   const totalSubdomains = Object.values(zoneSubdomains).reduce((total, subs) => total + subs.length, 0);
//   const percentage = totalSubdomains > 0 
//     ? ((itemCount / totalSubdomains) * 100).toFixed(1)
//     : '0.0';
  
//   return {
//     ...zoneFromDb,
//     itemCount,
//     percentage,
//     color: getItemCountColor(itemCount),
//     collectionAddress: zoneFromDb.collectionAddress,
//     subdomains
//   };
// };




//без поиска
// src/components/AuctionCollectionSelector/AuctionCollectionSelector.tsx
// import React, { useMemo, useState, useEffect, useRef } from 'react';
// import { useSelector } from 'react-redux';
// import { SimpleCollection } from '@/services/blockchainItems/blockchain-items-types';
// import { selectProxyCollections } from '@/services/blockchainItems/blockchain-items-slice';
// import { Zone, Subdomain, apiService } from '@/services/api';

// interface AuctionCollectionSelectorProps {
//   activeTab: 'proxy' | 'sbt';
//   selectedDomainZone: string;
//   onDomainZoneChange: (value: string) => void;
//   zonesLoading: boolean;
//   zonesError: string | null;
//   sbtZones: Zone[];
//   userAddress: string | null;
//   isDark: boolean;
//   t: (key: string) => string;
//   // Для SBT режима
//   sbtCollectionAddressesMap?: Record<string, string>;
//   activeSbtZones?: Zone[];
//   // Для Proxy режима - зоны из базы данных
//   proxyZones?: Zone[];
//   // Для загрузки субдоменов
//   isTestnet?: boolean;
// }

// // Утилиты для форматирования и цветов
// const getItemCountColor = (count: number): string => {
//   if (count === 0) return '#888'; // серый
//   if (count >= 1 && count <= 10) return '#10b981'; // зеленый
//   if (count >= 11 && count <= 50) return '#3b82f6'; // синий
//   if (count >= 51 && count <= 250) return '#8b5cf6'; // фиолетовый/сиреневый
//   if (count >= 251 && count <= 500) return '#f59e0b'; // золотой
//   return '#f97316'; // оранжевый (500+)
// };

// const formatZoneName = (zoneName: string): string => {
//   if (!zoneName) return '';
  
//   // Извлекаем имя зоны (без .ton)
//   const zone = zoneName.split('.')[0];
  
//   // Если длина зоны больше 9 символов, обрезаем с троеточием
//   if (zone.length > 9) {
//     return `${zone.slice(0, 3)}...${zone.slice(-3)}`;
//   }
  
//   return zone;
// };

// const formatItemCount = (count: number): string => {
//   if (count === 0) return '0 subdomains';
//   if (count === 1) return '1 subdomain';
//   return `${count} subdomains`;
// };

// export const AuctionCollectionSelector: React.FC<AuctionCollectionSelectorProps> = ({
//   activeTab,
//   selectedDomainZone,
//   onDomainZoneChange,
//   zonesLoading,
//   zonesError,
//   sbtZones,
//   userAddress,
//   isDark,
//   t,
//   sbtCollectionAddressesMap = {},
//   activeSbtZones = [],
//   proxyZones = [],
//   isTestnet = false
// }) => {
//   // Получаем proxy коллекции из Redux store для статистики
//   const proxyCollections = useSelector(selectProxyCollections);
  
//   // Состояние для хранения субдоменов каждой зоны
//   const [zoneSubdomains, setZoneSubdomains] = useState<Record<number, Subdomain[]>>({});
//   const [loadingSubdomains, setLoadingSubdomains] = useState<boolean>(false);
//   const [hasLoadedSubdomains, setHasLoadedSubdomains] = useState<boolean>(false);
  
//   // Используем ref для отслеживания, загружаем ли мы уже субдомены
//   const isSubdomainsLoadingRef = useRef(false);
  
//   // Загружаем субдомены для всех Proxy зон только один раз
//   useEffect(() => {
//     // Если уже загружаем или уже загрузили - не делаем ничего
//     if (isSubdomainsLoadingRef.current || hasLoadedSubdomains) {
//       return;
//     }
    
//     // Если не Proxy режим или нет зон - не загружаем
//     if (activeTab !== 'proxy' || !proxyZones || proxyZones.length === 0) {
//       return;
//     }
    
//     // Если уже есть данные в zoneSubdomains - не загружаем снова
//     if (Object.keys(zoneSubdomains).length > 0) {
//       return;
//     }
    
//     loadZoneSubdomains();
//   }, [activeTab, proxyZones, hasLoadedSubdomains, zoneSubdomains]);
  
//   const loadZoneSubdomains = async () => {
//     // Устанавливаем флаг загрузки
//     isSubdomainsLoadingRef.current = true;
//     setLoadingSubdomains(true);
    
//     try {
//       // Устанавливаем сеть перед вызовом
//       apiService.setNetwork(isTestnet);
      
//       const subdomainsMap: Record<number, Subdomain[]> = {};
//       let loadedCount = 0;
      
//       // Загружаем субдомены для каждой зоны последовательно, чтобы не перегружать API
//       for (const zone of proxyZones) {
//         try {
//           if (zone.id) {
//             const subdomains = await apiService.getZoneSubdomains(zone.id);
//             subdomainsMap[zone.id] = subdomains;
//             loadedCount++;
//             console.log(`✅ Загружено ${subdomains.length} субдоменов для зоны ${zone.name} (${loadedCount}/${proxyZones.length})`);
//           }
//         } catch (error) {
//           console.error(`❌ Ошибка загрузки субдоменов для зоны ${zone.name}:`, error);
//           subdomainsMap[zone.id] = [];
//         }
        
//         // Небольшая задержка между запросами
//         await new Promise(resolve => setTimeout(resolve, 100));
//       }
      
//       setZoneSubdomains(subdomainsMap);
//       setHasLoadedSubdomains(true);
//       console.log(`🎉 Завершена загрузка субдоменов для ${Object.keys(subdomainsMap).length} зон`);
//     } catch (error) {
//       console.error('❌ Ошибка загрузки субдоменов:', error);
//     } finally {
//       setLoadingSubdomains(false);
//       isSubdomainsLoadingRef.current = false;
//     }
//   };
  
//   // Рассчитываем общее количество субдоменов для всех proxy зон
//   const totalProxySubdomains = useMemo(() => {
//     return Object.values(zoneSubdomains).reduce((total, subdomains) => {
//       return total + subdomains.length;
//     }, 0);
//   }, [zoneSubdomains]);
  
//   // Создаем опции для Proxy режима с информацией о субдоменах
//   const proxyOptions = useMemo(() => {
//     if (!proxyZones || proxyZones.length === 0) {
//       return [];
//     }
    
//     return proxyZones.map((zone) => {
//       const zoneName = zone.name || '';
//       const formattedZone = formatZoneName(zoneName);
      
//       // Получаем субдомены для этой зоны
//       const subdomains = zoneSubdomains[zone.id] || [];
//       const itemCount = subdomains.length;
      
//       // Рассчитываем процент от общего количества
//       const percentage = totalProxySubdomains > 0 
//         ? ((itemCount / totalProxySubdomains) * 100).toFixed(1)
//         : '0.0';
      
//       return {
//         value: zoneName,
//         label: `.${formattedZone}`,
//         itemCount,
//         percentage,
//         color: getItemCountColor(itemCount),
//         isUserZone: zone.owner === userAddress,
//         collectionAddress: zone.collectionAddress,
//         zoneId: zone.id
//       };
//     }).sort((a, b) => b.itemCount - a.itemCount); // Сортируем по количеству субдоменов
//   }, [proxyZones, zoneSubdomains, totalProxySubdomains, userAddress]);
  
//   // Обработчик изменения выбранной зоны
//   const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     const value = e.target.value;
//     onDomainZoneChange(value);
//   };
  
//   // Для SBT режима используем старую логику
//   if (activeTab === 'sbt') {
//     return (
//       <div style={{position: 'relative', width: '280px'}}>
//         <div style={{
//           position: 'absolute', 
//           left: '-30px', 
//           top: '50%', 
//           transform: 'translateY(-50%)',
//           fontSize: '18px',
//           fontWeight: 'bold',
//           color: isDark ? "white" : 'black'          
//         }}>
//           1
//         </div>
//         <select 
//           value={selectedDomainZone}
//           onChange={handleChange}
//           disabled={zonesLoading}
//           style={{
//             width: '280px', 
//             borderRadius: '25px',
//             padding: '10px 15px',
//             background: 'white',
//             cursor: zonesLoading ? 'not-allowed' : 'pointer',
//             color: 'black'
//           }}
//         >
//           <option value="">
//             {zonesLoading 
//               ? t('loadingZones')
//               : zonesError
//               ? t('zonesLoadError')
//               : t('chooseSbtZone')
//             }
//           </option>
//           {activeSbtZones.map(zone => (
//             <option key={zone.id} value={zone.name}>
//               .{zone.name.split('.')[0]} 🔒
//             </option>
//           ))}
//         </select>
//         {zonesError && (
//           <p style={{ color: '#f87171', fontSize: '12px', marginTop: '5px' }}>
//             {zonesError}
//           </p>
//         )}
//         {sbtZones.length === 0 && !zonesLoading && !zonesError && (
//           <p style={{ color: '#f59e0b', fontSize: '12px', marginTop: '5px', textAlign: 'center' }}>
//             {t('noSbtZones')}
//           </p>
//         )}
//       </div>
//     );
//   }
  
//   // Определяем текст для отображения в селекте
//   const getSelectPlaceholder = () => {
//     if (zonesLoading) {
//       return t('loadingZones');
//     }
    
//     if (zonesError) {
//       return t('zonesLoadError');
//     }
    
//     if (loadingSubdomains) {
//       return t('loadingSubdomains');
//     }
    
//     if (!proxyZones || proxyZones.length === 0) {
//       return t('noProxyZones');
//     }
    
//     return t('chooseProxyZone');
//   };
  
//   // Для Proxy режима - используем данные из базы с информацией о субдоменах
//   return (
//     <div style={{position: 'relative', width: '280px'}}>
//       <div style={{
//         position: 'absolute', 
//         left: '-30px', 
//         top: '50%', 
//         transform: 'translateY(-50%)',
//         fontSize: '18px',
//         fontWeight: 'bold',
//         color: isDark ? "white" : 'black'          
//       }}>
//         1
//       </div>
//       {/* <select 
//         value={selectedDomainZone}
//         onChange={handleChange}
//         disabled={zonesLoading || loadingSubdomains}
//         style={{
//           width: '280px', 
//           borderRadius: '25px',
//           padding: '10px 15px',
//           background: 'white',
//           cursor: (zonesLoading || loadingSubdomains) ? 'not-allowed' : 'pointer',
//           color: 'black',
//           fontFamily: 'monospace',
//           appearance: 'none',
//           WebkitAppearance: 'none',
//           MozAppearance: 'none'
//         }}
//       >
//         <option value="">
//           {getSelectPlaceholder()}
//         </option>
//         {proxyOptions.map((option, index) => (
//           <option 
//             key={index} 
//             value={option.value}
//             data-collection-address={option.collectionAddress}
//             data-zone-id={option.zoneId}
//             style={{
//               color: 'black',
//               padding: '8px 4px',
//               fontSize: '14px'
//             }}
//           >
//             {option.label} | {formatItemCount(option.itemCount)} | {option.percentage}% {option.isUserZone ? '👑' : ''}
//           </option>
//         ))}
//       </select> */}
//       // Внутри компонента, в return для Proxy режима:
// <select 
//   value={selectedDomainZone}
//   onChange={handleChange}
//   disabled={zonesLoading}
//   style={{
//     width: '280px', 
//     borderRadius: '25px',
//     padding: '10px 15px',
//     background: 'white',
//     cursor: zonesLoading ? 'not-allowed' : 'pointer',
//     color: 'black',
//     fontFamily: 'monospace',
//     appearance: 'none',
//     WebkitAppearance: 'none',
//     MozAppearance: 'none'
//   }}
// >
//   <option value="">
//     {getSelectPlaceholder()}
//   </option>
//   {proxyOptions.map((option, index) => (
//     <option 
//       key={index} 
//       value={option.value}
//       data-collection-address={option.collectionAddress}
//       data-zone-id={option.zoneId}
//       style={{
//         color: 'black',
//         padding: '8px 4px',
//         fontSize: '14px',
//         backgroundColor: isDark ? '#f0f9ff' : 'white',
//         // Добавьте эти стили:
//         whiteSpace: 'normal', // Разрешаем перенос
//         wordBreak: 'break-word', // Переносим длинные слова
//         display: 'grid', // Используем грид
//         gridTemplateColumns: '1fr auto auto', // 3 колонки
//         gap: '8px', // Отступ между колонками
//         alignItems: 'center', // Выравнивание по центру

//       }}
//     >
//       {/* Разделяем на отдельные span для лучшего контроля */}
//       <span style={{
//         textAlign: 'left',
//         overflow: 'hidden',
//         textOverflow: 'ellipsis',
//         whiteSpace: 'nowrap'
//       }}>
//         {option.label}
//       </span>
//       <span style={{
//         textAlign: 'center',
//         fontWeight: option.itemCount > 0 ? 'bold' : 'normal',
//         color: option.color
//       }}>
//         {option.itemCount}
//       </span>
//       <span style={{
//         textAlign: 'right',
//         fontStyle: option.isUserZone ? 'italic' : 'normal'
//       }}>
//         {option.percentage}% {option.isUserZone ? '👑' : ''}
//       </span>
//     </option>
//   ))}
// </select>

      
//       {/* Стили для отображения цветных меток в опциях */}
//       <style>
//         {`
//           select option {
//             position: relative;
//             padding-left: 24px !important;
//           }
          
//           select option::before {
//             content: '';
//             position: absolute;
//             left: 8px;
//             top: 50%;
//             transform: translateY(-50%);
//             width: 8px;
//             height: 8px;
//             border-radius: 50%;
//           }
          
//           ${proxyOptions.map((option, index) => `
//             select option[value="${option.value}"]::before {
//               background-color: ${option.color};
//             }
//           `).join('\n')}
//         `}
//       </style>
      
//       {zonesError && (
//         <p style={{ color: '#f87171', fontSize: '12px', marginTop: '5px' }}>
//           {zonesError}
//         </p>
//       )}
      
//       {/* Статистика по proxy зонам */}
//       {proxyZones && proxyZones.length > 0 && (
//         <div style={{
//           marginTop: '8px',
//           padding: '6px 10px',
//           borderRadius: '8px',
//           background: isDark ? '#2a2a2a' : '#f5f5f5',
//           fontSize: '11px',
//           color: isDark ? '#ccc' : '#666',
//           textAlign: 'center'
//         }}>
//           <span style={{ color: '#10b981', fontWeight: 'bold' }}>
//             {proxyZones.length} zones
//           </span>
//           {' • '}
//           <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>
//             {totalProxySubdomains} total subdomains
//           </span>
//           {' • '}
//           <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>
//             Avg: {(totalProxySubdomains / proxyZones.length).toFixed(1)} per zone
//           </span>
//           {loadingSubdomains && (
//             <span style={{ color: '#f59e0b', marginLeft: '8px' }}>
//               🔄 Loading subdomains...
//             </span>
//           )}
//           {!loadingSubdomains && hasLoadedSubdomains && (
//             <span style={{ color: '#10b981', marginLeft: '8px' }}>
//               ✅ Loaded
//             </span>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

// // Хук для получения collectionAddress из выбранной зоны
// export const useCollectionAddressFromZone = (
//   activeTab: 'proxy' | 'sbt',
//   selectedDomainZone: string,
//   proxyCollections: SimpleCollection[],
//   sbtCollectionAddressesMap: Record<string, string> = {},
//   proxyZones: Zone[] = []
// ): string | null => {
//   return useMemo(() => {
//     if (!selectedDomainZone) return null;
    
//     if (activeTab === 'proxy') {
//       // Сначала ищем в базе данных (proxyZones)
//       const zoneFromDb = proxyZones.find(z => z.name === selectedDomainZone);
//       if (zoneFromDb?.collectionAddress) {
//         return zoneFromDb.collectionAddress;
//       }
      
//       // Если не нашли в базе, ищем в Redux коллекциях
//       const collection = proxyCollections.find(c => 
//         c.name === selectedDomainZone || 
//         (c.name && c.name.includes(selectedDomainZone))
//       );
//       return collection?.address || null;
//     } else {
//       // Для SBT используем старую логику
//       return sbtCollectionAddressesMap[selectedDomainZone] || null;
//     }
//   }, [activeTab, selectedDomainZone, proxyCollections, sbtCollectionAddressesMap, proxyZones]);
// };

// // Утилита для получения информации о коллекции по имени зоны
// export const getCollectionInfoByZoneName = (
//   zoneName: string,
//   proxyCollections: SimpleCollection[],
//   proxyZones: Zone[] = [],
//   zoneSubdomains: Record<number, Subdomain[]> = {}
// ) => {
//   // Сначала ищем в базе данных
//   const zoneFromDb = proxyZones.find(z => z.name === zoneName);
  
//   if (!zoneFromDb) return null;
  
//   // Получаем субдомены для этой зоны
//   const subdomains = zoneSubdomains[zoneFromDb.id] || [];
//   const itemCount = subdomains.length;
  
//   // Рассчитываем общее количество субдоменов для всех зон
//   const totalSubdomains = Object.values(zoneSubdomains).reduce((total, subs) => total + subs.length, 0);
//   const percentage = totalSubdomains > 0 
//     ? ((itemCount / totalSubdomains) * 100).toFixed(1)
//     : '0.0';
  
//   return {
//     ...zoneFromDb,
//     itemCount,
//     percentage,
//     color: getItemCountColor(itemCount),
//     collectionAddress: zoneFromDb.collectionAddress,
//     subdomains
//   };
// };



//до поисковика в сбт
// src/components/AuctionCollectionSelector/AuctionCollectionSelector.tsx
// import React, { useMemo } from 'react';
// import { useSelector } from 'react-redux';
// import { SimpleCollection } from '@/services/blockchainItems/blockchain-items-types';
// import { selectProxyCollections } from '@/services/blockchainItems/blockchain-items-slice';
// import { Zone } from '@/services/api';
// import { CustomZoneSelector } from './CustonZoneSelector';

// interface AuctionCollectionSelectorProps {
//   activeTab: 'proxy' | 'sbt';
//   selectedDomainZone: string;
//   onDomainZoneChange: (value: string) => void;
//   zonesLoading: boolean;
//   zonesError: string | null;
//   sbtZones: Zone[];
//   userAddress: string | null;
//   isDark: boolean;
//   t: (key: string) => string;
//   // Для SBT режима
//   sbtCollectionAddressesMap?: Record<string, string>;
//   activeSbtZones?: Zone[];
//   // Для Proxy режима - зоны из базы данных
//   proxyZones?: Zone[];
//   // Для загрузки субдоменов
//   isTestnet?: boolean;
// }

// export const AuctionCollectionSelector: React.FC<AuctionCollectionSelectorProps> = ({
//   activeTab,
//   selectedDomainZone,
//   onDomainZoneChange,
//   zonesLoading,
//   zonesError,
//   sbtZones,
//   userAddress,
//   isDark,
//   t,
//   sbtCollectionAddressesMap = {},
//   activeSbtZones = [],
//   proxyZones = [],
//   isTestnet = false
// }) => {
//   // Получаем proxy коллекции из Redux store
//   const proxyCollections = useSelector(selectProxyCollections);

//   // Для SBT режима используем старый нативный select
//   if (activeTab === 'sbt') {
//     return (
//       <div style={{position: 'relative', width: '280px'}}>
//         <div style={{
//           position: 'absolute', 
//           left: '-30px', 
//           top: '50%', 
//           transform: 'translateY(-50%)',
//           fontSize: '18px',
//           fontWeight: 'bold',
//           color: isDark ? "white" : 'black'          
//         }}>
//           1
//         </div>
//         <select 
//           value={selectedDomainZone}
//           onChange={(e) => onDomainZoneChange(e.target.value)}
//           disabled={zonesLoading}
//           style={{
//             width: '280px', 
//             borderRadius: '25px',
//             padding: '10px 15px',
//             background: 'white',
//             cursor: zonesLoading ? 'not-allowed' : 'pointer',
//             color: 'black'
//           }}
//         >
//           <option value="">
//             {zonesLoading 
//               ? t('loadingZones')
//               : zonesError
//               ? t('zonesLoadError')
//               : t('chooseSbtZone')
//             }
//           </option>
//           {activeSbtZones.map(zone => (
//             <option key={zone.id} value={zone.name}>
//               .{zone.name.split('.')[0]} 🔒
//             </option>
//           ))}
//         </select>
//         {zonesError && (
//           <p style={{ color: '#f87171', fontSize: '12px', marginTop: '5px' }}>
//             {zonesError}
//           </p>
//         )}
//         {sbtZones.length === 0 && !zonesLoading && !zonesError && (
//           <p style={{ color: '#f59e0b', fontSize: '12px', marginTop: '5px', textAlign: 'center' }}>
//             {t('noSbtZones')}
//           </p>
//         )}
//       </div>
//     );
//   }

//   // Для Proxy режима используем кастомный селект
//   return (
//     <div style={{position: 'relative', width: '280px'}}>
//       <div style={{
//         position: 'absolute', 
//         left: '-30px', 
//         top: '50%', 
//         transform: 'translateY(-50%)',
//         fontSize: '18px',
//         fontWeight: 'bold',
//         color: isDark ? "white" : 'black'          
//       }}>
//         1
//       </div>
      
//       <CustomZoneSelector
//         zones={proxyZones}
//         selectedZone={selectedDomainZone}
//         onZoneChange={onDomainZoneChange}
//         userAddress={userAddress}
//         isDark={isDark}
//         placeholder={zonesLoading ? t('loadingZones') : t('chooseProxyZone')}
//         isLoading={zonesLoading}
//         isTestnet={isTestnet}
//       />
      
//       {zonesError && (
//         <p style={{ color: '#f87171', fontSize: '12px', marginTop: '5px' }}>
//           {zonesError}
//         </p>
//       )}
      
//       {proxyZones.length === 0 && !zonesLoading && !zonesError && (
//         <p style={{ color: '#f59e0b', fontSize: '12px', marginTop: '5px', textAlign: 'center' }}>
//           {t('noProxyZones')}
//         </p>
//       )}
//     </div>
//   );
// };

// // Хук для получения collectionAddress из выбранной зоны
// export const useCollectionAddressFromZone = (
//   activeTab: 'proxy' | 'sbt',
//   selectedDomainZone: string,
//   proxyCollections: SimpleCollection[],
//   sbtCollectionAddressesMap: Record<string, string> = {},
//   proxyZones: Zone[] = []
// ): string | null => {
//   return useMemo(() => {
//     if (!selectedDomainZone) return null;
    
//     if (activeTab === 'proxy') {
//       // Сначала ищем в базе данных (proxyZones)
//       const zoneFromDb = proxyZones.find(z => z.name === selectedDomainZone);
//       if (zoneFromDb?.collectionAddress) {
//         return zoneFromDb.collectionAddress;
//       }
      
//       // Если не нашли в базе, ищем в Redux коллекциях
//       const collection = proxyCollections.find(c => 
//         c.name === selectedDomainZone || 
//         (c.name && c.name.includes(selectedDomainZone))
//       );
//       return collection?.address || null;
//     } else {
//       // Для SBT используем старую логику
//       return sbtCollectionAddressesMap[selectedDomainZone] || null;
//     }
//   }, [activeTab, selectedDomainZone, proxyCollections, sbtCollectionAddressesMap, proxyZones]);
// };





// src/components/AuctionCollectionSelector/AuctionCollectionSelector.tsx
// src/components/AuctionCollectionSelector/AuctionCollectionSelector.tsx
// import React, { useMemo } from 'react';
// import { useSelector } from 'react-redux';
// import { SimpleCollection } from '@/services/blockchainItems/blockchain-items-types';
// import { selectProxyCollections } from '@/services/blockchainItems/blockchain-items-slice';
// import { Zone, apiService } from '@/services/api';
// import { CustomZoneSelector } from './CustonZoneSelector';

// interface AuctionCollectionSelectorProps {
//   activeTab: 'proxy' | 'sbt';
//   selectedDomainZone: string;
//   onDomainZoneChange: (value: string) => void;
//   zonesLoading: boolean;
//   zonesError: string | null;
//   sbtZones: Zone[];
//   userAddress: string | null;
//   isDark: boolean;
//   t: (key: string) => string;
//   // Для SBT режима
//   sbtCollectionAddressesMap?: Record<string, string>;
//   activeSbtZones?: Zone[];
//   // Для Proxy режима - зоны из базы данных
//   proxyZones?: Zone[];
//   // Для загрузки субдоменов
//   isTestnet?: boolean;
// }

// export const AuctionCollectionSelector: React.FC<AuctionCollectionSelectorProps> = ({
//   activeTab,
//   selectedDomainZone,
//   onDomainZoneChange,
//   zonesLoading,
//   zonesError,
//   sbtZones,
//   userAddress,
//   isDark,
//   t,
//   sbtCollectionAddressesMap = {},
//   activeSbtZones = [],
//   proxyZones = [],
//   isTestnet = false
// }) => {
//   // Получаем proxy коллекции из Redux store
//   const proxyCollections = useSelector(selectProxyCollections);

//   // Функция для загрузки субдоменов SBT зоны
//   const loadSbtSubdomains = async (zoneName: string): Promise<number> => {
//     try {
//       // Здесь должна быть логика загрузки субдоменов SBT зоны
//       // Например, через API или из Redux store
//       apiService.setNetwork(isTestnet);
      
//       // Временная заглушка - возвращаем 0
//       // В реальном приложении здесь будет вызов API
//       console.log(`Loading SBT subdomains for ${zoneName}`);
      
//       // Пример: можно получить из sbtCollectionAddressesMap
//       const collectionAddress = sbtCollectionAddressesMap[zoneName];
//       if (collectionAddress) {
//         // Здесь логика получения количества субдоменов для SBT коллекции
//         // Например: const count = await apiService.getSbtSubdomainsCount(collectionAddress);
//         return 0; // Заглушка
//       }
      
//       return 0;
//     } catch (error) {
//       console.error(`Error loading SBT subdomains for ${zoneName}:`, error);
//       return 0;
//     }
//   };

//   // Определяем зоны и режим в зависимости от activeTab
//   const zones = useMemo(() => {
//     return activeTab === 'proxy' ? proxyZones : activeSbtZones;
//   }, [activeTab, proxyZones, activeSbtZones]);

//   // Определяем placeholder в зависимости от режима
//   const placeholder = useMemo(() => {
//     if (zonesLoading) {
//       return t('loadingZones');
//     }
    
//     if (zonesError) {
//       return t('zonesLoadError');
//     }
    
//     return activeTab === 'proxy' ? t('chooseProxyZone') : t('chooseSbtZone');
//   }, [zonesLoading, zonesError, activeTab, t]);

//   // Определяем, есть ли зоны
//   const hasZones = zones && zones.length > 0;

//   // Используем proxyCollections для получения collectionAddress
//   const getCollectionAddress = (zoneName: string): string | null => {
//     if (activeTab === 'proxy') {
//       // Сначала ищем в базе данных (proxyZones)
//       const zoneFromDb = proxyZones.find(z => z.name === zoneName);
//       if (zoneFromDb?.collectionAddress) {
//         return zoneFromDb.collectionAddress;
//       }
      
//       // Если не нашли в базе, ищем в Redux коллекциях
//       const collection = proxyCollections.find(c => 
//         c.name === zoneName || 
//         (c.name && c.name.includes(zoneName))
//       );
//       return collection?.address || null;
//     } else {
//       // Для SBT используем sbtCollectionAddressesMap
//       return sbtCollectionAddressesMap[zoneName] || null;
//     }
//   };

//   // Обработчик изменения зоны
//   const handleZoneChange = (zoneName: string) => {
//     onDomainZoneChange(zoneName);
    
//     // Можно дополнительно получить collectionAddress если нужно
//     const collectionAddress = getCollectionAddress(zoneName);
//     if (collectionAddress) {
//       console.log(`Selected zone: ${zoneName}, collection: ${collectionAddress}`);
//     }
//   };

//   return (
//     <div style={{position: 'relative', width: '280px'}}>
//       <div style={{
//         position: 'absolute', 
//         left: '-30px', 
//         top: '50%', 
//         transform: 'translateY(-50%)',
//         fontSize: '18px',
//         fontWeight: 'bold',
//         color: isDark ? "white" : 'black'          
//       }}>
//         1
//       </div>
      
//       <CustomZoneSelector
//         zones={zones}
//         selectedZone={selectedDomainZone}
//         onZoneChange={handleZoneChange} // Исправлено: было onZoneChange, должно быть onZoneChange
//         userAddress={userAddress}
//         isDark={isDark}
//         placeholder={placeholder}
//         isLoading={zonesLoading}
//         isTestnet={isTestnet}
//         mode={activeTab}
//         loadSbtSubdomains={activeTab === 'sbt' ? loadSbtSubdomains : undefined}
//       />
      
//       {zonesError && (
//         <p style={{ color: '#f87171', fontSize: '12px', marginTop: '5px' }}>
//           {zonesError}
//         </p>
//       )}
      
//       {!hasZones && !zonesLoading && !zonesError && (
//         <p style={{ 
//           color: '#f59e0b', 
//           fontSize: '12px', 
//           marginTop: '5px', 
//           textAlign: 'center',
//           fontFamily: 'monospace'
//         }}>
//           {activeTab === 'proxy' ? t('noProxyZones') : t('noSbtZones')}
//         </p>
//       )}
//     </div>
//   );
// };

// // Хук для получения collectionAddress из выбранной зоны
// export const useCollectionAddressFromZone = (
//   activeTab: 'proxy' | 'sbt',
//   selectedDomainZone: string,
//   proxyCollections: SimpleCollection[],
//   sbtCollectionAddressesMap: Record<string, string> = {},
//   proxyZones: Zone[] = []
// ): string | null => {
//   return useMemo(() => {
//     if (!selectedDomainZone) return null;
    
//     if (activeTab === 'proxy') {
//       // Сначала ищем в базе данных (proxyZones)
//       const zoneFromDb = proxyZones.find(z => z.name === selectedDomainZone);
//       if (zoneFromDb?.collectionAddress) {
//         return zoneFromDb.collectionAddress;
//       }
      
//       // Если не нашли в базе, ищем в Redux коллекциях
//       const collection = proxyCollections.find(c => 
//         c.name === selectedDomainZone || 
//         (c.name && c.name.includes(selectedDomainZone))
//       );
//       return collection?.address || null;
//     } else {
//       // Для SBT используем старую логику
//       return sbtCollectionAddressesMap[selectedDomainZone] || null;
//     }
//   }, [activeTab, selectedDomainZone, proxyCollections, sbtCollectionAddressesMap, proxyZones]);
// };

// src/components/AuctionCollectionSelector/AuctionCollectionSelector.tsx
// import React, { useMemo } from 'react';
// import { useSelector } from 'react-redux';
// import { SimpleCollection } from '@/services/blockchainItems/blockchain-items-types';
// import { selectProxyCollections } from '@/services/blockchainItems/blockchain-items-slice';
// import { Zone, apiService } from '@/services/api';
// import { CustomZoneSelector } from './CustonZoneSelector';

// interface AuctionCollectionSelectorProps {
//   activeTab: 'proxy' | 'sbt';
//   selectedDomainZone: string;
//   onDomainZoneChange: (value: string) => void;
//   zonesLoading: boolean;
//   zonesError: string | null;
//   sbtZones: Zone[];
//   userAddress: string | null;
//   isDark: boolean;
//   t: (key: string) => string;
//   // Для SBT режима
//   sbtCollectionAddressesMap?: Record<string, string>;
//   activeSbtZones?: Zone[];
//   // Для Proxy режима - зоны из базы данных
//   proxyZones?: Zone[];
//   // Для загрузки субдоменов
//   isTestnet?: boolean;
// }

// export const AuctionCollectionSelector: React.FC<AuctionCollectionSelectorProps> = ({
//   activeTab,
//   selectedDomainZone,
//   onDomainZoneChange,
//   zonesLoading,
//   zonesError,
//   sbtZones,
//   userAddress,
//   isDark,
//   t,
//   sbtCollectionAddressesMap = {},
//   activeSbtZones = [],
//   proxyZones = [],
//   isTestnet = false
// }) => {
//   // Получаем proxy коллекции из Redux store
//   const proxyCollections = useSelector(selectProxyCollections);

//   // Функция для загрузки субдоменов SBT зоны
//   const loadSbtSubdomains = async (zoneName: string): Promise<number> => {
//     try {
//       console.log(`🔄 Loading SBT subdomains for ${zoneName}`);
      
//       // Получаем collectionAddress из sbtCollectionAddressesMap
//       const collectionAddress = sbtCollectionAddressesMap[zoneName];
//       if (!collectionAddress) {
//         console.warn(`No collection address found for SBT zone: ${zoneName}`);
//         return 0;
//       }
      
//       // Устанавливаем сеть
//       apiService.setNetwork(isTestnet);
      
//       // Здесь должна быть реальная логика получения количества субдоменов
//       // Например, вызов API или получение из Redux store
      
//       // ВРЕМЕННАЯ ЗАГЛУШКА: возвращаем случайное число для демонстрации
//       // В реальном приложении замените на реальный вызов API
//       const mockCount = Math.floor(Math.random() * 100) + 1;
//       console.log(`✅ Mock: ${mockCount} subdomains for SBT zone ${zoneName}`);
      
//       return mockCount;
      
//       // Пример реального вызова (если есть такой метод в apiService):
//       // const subdomains = await apiService.getSbtSubdomains(collectionAddress);
//       // return subdomains.length;
      
//     } catch (error) {
//       console.error(`❌ Error loading SBT subdomains for ${zoneName}:`, error);
//       return 0;
//     }
//   };

//   // Определяем зоны и режим в зависимости от activeTab
//   const zones = useMemo(() => {
//     return activeTab === 'proxy' ? proxyZones : activeSbtZones;
//   }, [activeTab, proxyZones, activeSbtZones]);

//   // Определяем placeholder в зависимости от режима
//   const placeholder = useMemo(() => {
//     if (zonesLoading) {
//       return t('loadingZones');
//     }
    
//     if (zonesError) {
//       return t('zonesLoadError');
//     }
    
//     return activeTab === 'proxy' ? t('chooseProxyZone') : t('chooseSbtZone');
//   }, [zonesLoading, zonesError, activeTab, t]);

//   // Определяем, есть ли зоны
//   const hasZones = zones && zones.length > 0;

//   // Используем proxyCollections для получения collectionAddress
//   const getCollectionAddress = (zoneName: string): string | null => {
//     if (activeTab === 'proxy') {
//       // Сначала ищем в базе данных (proxyZones)
//       const zoneFromDb = proxyZones.find(z => z.name === zoneName);
//       if (zoneFromDb?.collectionAddress) {
//         return zoneFromDb.collectionAddress;
//       }
      
//       // Если не нашли в базе, ищем в Redux коллекциях
//       const collection = proxyCollections.find(c => 
//         c.name === zoneName || 
//         (c.name && c.name.includes(zoneName))
//       );
//       return collection?.address || null;
//     } else {
//       // Для SBT используем sbtCollectionAddressesMap
//       return sbtCollectionAddressesMap[zoneName] || null;
//     }
//   };

//   // Обработчик изменения зоны
//   const handleZoneChange = (zoneName: string) => {
//     onDomainZoneChange(zoneName);
    
//     // Можно дополнительно получить collectionAddress если нужно
//     const collectionAddress = getCollectionAddress(zoneName);
//     if (collectionAddress) {
//       console.log(`Selected zone: ${zoneName}, collection: ${collectionAddress}`);
//     }
//   };

//   return (
//     <div style={{position: 'relative', width: '280px'}}>
//       <div style={{
//         position: 'absolute', 
//         left: '-30px', 
//         top: '50%', 
//         transform: 'translateY(-50%)',
//         fontSize: '18px',
//         fontWeight: 'bold',
//         color: isDark ? "white" : 'black'          
//       }}>
//         1
//       </div>
      
//       <CustomZoneSelector
//         zones={zones}
//         selectedZone={selectedDomainZone}
//         onZoneChange={handleZoneChange}
//         userAddress={userAddress}
//         isDark={isDark}
//         placeholder={placeholder}
//         isLoading={zonesLoading}
//         isTestnet={isTestnet}
//         mode={activeTab}
//         loadSbtSubdomains={activeTab === 'sbt' ? loadSbtSubdomains : undefined}
//         sbtSubdomainsMap={sbtSubdomainsMap}
//       />
      
//       {zonesError && (
//         <p style={{ color: '#f87171', fontSize: '12px', marginTop: '5px' }}>
//           {zonesError}
//         </p>
//       )}
      
//       {!hasZones && !zonesLoading && !zonesError && (
//         <p style={{ 
//           color: '#f59e0b', 
//           fontSize: '12px', 
//           marginTop: '5px', 
//           textAlign: 'center',
//           fontFamily: 'monospace'
//         }}>
//           {activeTab === 'proxy' ? t('noProxyZones') : t('noSbtZones')}
//         </p>
//       )}
//     </div>
//   );
// };

// // Хук для получения collectionAddress из выбранной зоны
// export const useCollectionAddressFromZone = (
//   activeTab: 'proxy' | 'sbt',
//   selectedDomainZone: string,
//   proxyCollections: SimpleCollection[],
//   sbtCollectionAddressesMap: Record<string, string> = {},
//   proxyZones: Zone[] = []
// ): string | null => {
//   return useMemo(() => {
//     if (!selectedDomainZone) return null;
    
//     if (activeTab === 'proxy') {
//       // Сначала ищем в базе данных (proxyZones)
//       const zoneFromDb = proxyZones.find(z => z.name === selectedDomainZone);
//       if (zoneFromDb?.collectionAddress) {
//         return zoneFromDb.collectionAddress;
//       }
      
//       // Если не нашли в базе, ищем в Redux коллекциях
//       const collection = proxyCollections.find(c => 
//         c.name === selectedDomainZone || 
//         (c.name && c.name.includes(selectedDomainZone))
//       );
//       return collection?.address || null;
//     } else {
//       // Для SBT используем старую логику
//       return sbtCollectionAddressesMap[selectedDomainZone] || null;
//     }
//   }, [activeTab, selectedDomainZone, proxyCollections, sbtCollectionAddressesMap, proxyZones]);
// };

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

  // Функция для загрузки субдоменов SBT зоны (если sbtZonesCount не предоставлен)
  // const loadSbtSubdomains = async (zoneName: string): Promise<number> => {
  //   try {
  //     console.log(`🔄 Loading SBT subdomains for ${zoneName}`);
      
  //     // Если уже есть в sbtZonesCount, используем его
  //     if (sbtZonesCount[zoneName] !== undefined) {
  //       console.log(`✅ Using sbtZonesCount for ${zoneName}: ${sbtZonesCount[zoneName]}`);
  //       return sbtZonesCount[zoneName];
  //     }
      
  //     // Получаем collectionAddress из sbtCollectionAddressesMap
  //     const collectionAddress = sbtCollectionAddressesMap[zoneName];
  //     if (!collectionAddress) {
  //       console.warn(`No collection address found for SBT zone: ${zoneName}`);
  //       return 0;
  //     }
      
  //     // Устанавливаем сеть
  //     apiService.setNetwork(isTestnet);
      
  //     // Здесь должна быть реальная логика получения количества субдоменов
  //     // В зависимости от того, как у вас реализовано API
      
  //     // Пример 1: Если есть метод getSbtSubdomains
  //     try {
  //       // @ts-ignore - если метод существует
  //       if (apiService.getSbtSubdomains) {
  //         // @ts-ignore
  //         const subdomains = await apiService.getSbtSubdomains(collectionAddress);
  //         return subdomains.length;
  //       }
  //     } catch (error) {
  //       console.warn('apiService.getSbtSubdomains not available:', error);
  //     }
      
  //     // Пример 2: Если есть метод getCollectionItems
  //     try {
  //       // @ts-ignore - если метод существует
  //       if (apiService.getCollectionItems) {
  //         // @ts-ignore
  //         const items = await apiService.getCollectionItems(collectionAddress);
  //         return items.length;
  //       }
  //     } catch (error) {
  //       console.warn('apiService.getCollectionItems not available:', error);
  //     }
      
  //     console.warn(`No SBT subdomains found for ${zoneName}, returning 0`);
  //     return 0;
      
  //   } catch (error) {
  //     console.error(`❌ Error loading SBT subdomains for ${zoneName}:`, error);
  //     return 0;
  //   }
  // };

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
