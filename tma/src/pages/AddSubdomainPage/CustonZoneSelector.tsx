// src/components/AuctionCollectionSelector/CustomZoneSelector.tsx
// import React, { useState, useMemo, useRef, useEffect } from 'react';
// import { Zone, Subdomain, apiService } from '@/services/api';

// interface CustomZoneSelectorProps {
//   zones: Zone[];
//   selectedZone: string;
//   onZoneChange: (zoneName: string) => void;
//   userAddress: string | null;
//   isDark: boolean;
//   placeholder?: string;
//   isLoading?: boolean;
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

// export const CustomZoneSelector: React.FC<CustomZoneSelectorProps> = ({
//   zones,
//   selectedZone,
//   onZoneChange,
//   userAddress,
//   isDark,
//   placeholder = 'Choose zone...',
//   isLoading = false,
//   isTestnet = false
// }) => {
//   const [isOpen, setIsOpen] = useState(false);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [zoneSubdomains, setZoneSubdomains] = useState<Record<number, Subdomain[]>>({});
//   const [loadingZoneId, setLoadingZoneId] = useState<number | null>(null);
//   const dropdownRef = useRef<HTMLDivElement>(null);
//   const inputRef = useRef<HTMLInputElement>(null);

//   // Закрываем dropdown при клике вне компонента
//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
//         setIsOpen(false);
//       }
//     };

//     document.addEventListener('mousedown', handleClickOutside);
//     return () => document.removeEventListener('mousedown', handleClickOutside);
//   }, []);

//   // Фокусируем инпут при открытии
//   useEffect(() => {
//     if (isOpen && inputRef.current) {
//       setTimeout(() => {
//         inputRef.current?.focus();
//       }, 100);
//     }
//   }, [isOpen]);

//   // Загружаем субдомены для выбранной зоны
//   const loadZoneSubdomains = async (zoneId: number, zoneName: string) => {
//     if (zoneSubdomains[zoneId] !== undefined) return;

//     setLoadingZoneId(zoneId);
//     try {
//       apiService.setNetwork(isTestnet);
//       const subdomains = await apiService.getZoneSubdomains(zoneId);
//       setZoneSubdomains(prev => ({ ...prev, [zoneId]: subdomains }));
//     } catch (error) {
//       console.error(`Error loading subdomains for ${zoneName}:`, error);
//       setZoneSubdomains(prev => ({ ...prev, [zoneId]: [] }));
//     } finally {
//       setLoadingZoneId(null);
//     }
//   };

//   // Загружаем субдомены для выбранной зоны
//   useEffect(() => {
//     if (selectedZone) {
//       const selectedZoneObj = zones.find(z => z.name === selectedZone);
//       if (selectedZoneObj?.id && !zoneSubdomains[selectedZoneObj.id]) {
//         loadZoneSubdomains(selectedZoneObj.id, selectedZoneObj.name);
//       }
//     }
//   }, [selectedZone, zones]);

//   // Фильтруем зоны по поисковому запросу
//   const filteredZones = useMemo(() => {
//     if (!searchQuery.trim()) return zones;

//     const query = searchQuery.toLowerCase().replace(/^\./, ''); // Убираем точку в начале если есть
//     return zones.filter(zone => {
//       const zoneName = zone.name?.toLowerCase() || '';
//       return zoneName.includes(query);
//     });
//   }, [zones, searchQuery]);

//   // Получаем информацию о выбранной зоне
//   const selectedZoneInfo = useMemo(() => {
//     if (!selectedZone) return null;
//     const zone = zones.find(z => z.name === selectedZone);
//     if (!zone) return null;

//     const subdomains = zoneSubdomains[zone.id] || [];
//     const itemCount = subdomains.length;
//     const displayCount = subdomains.length > 0 
//       ? formatItemCount(itemCount)
//       : (loadingZoneId === zone.id ? 'Loading...' : '0 subdomains');

//     return {
//       ...zone,
//       itemCount,
//       displayCount,
//       color: getItemCountColor(itemCount),
//       isUserZone: zone.owner === userAddress
//     };
//   }, [selectedZone, zones, zoneSubdomains, loadingZoneId, userAddress]);

//   // Обработчик выбора зоны
//   const handleSelectZone = (zoneName: string) => {
//     onZoneChange(zoneName);
//     setIsOpen(false);
//     setSearchQuery('');
    
//     // Загружаем субдомены для выбранной зоны
//     const zone = zones.find(z => z.name === zoneName);
//     if (zone?.id && !zoneSubdomains[zone.id]) {
//       loadZoneSubdomains(zone.id, zone.name);
//     }
//   };

//   // Обработчик ввода в поиск
//   const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const value = e.target.value;
//     // Автоматически добавляем точку в начале если её нет
//     if (value && !value.startsWith('.')) {
//       setSearchQuery(`.${value}`);
//     } else {
//       setSearchQuery(value);
//     }
//   };

//   // Обработчик клика на инпут
//   const handleInputClick = () => {
//     setIsOpen(true);
//     if (!searchQuery && selectedZone) {
//       // Показываем выбранную зону в инпуте
//       const zoneName = selectedZone.split('.')[0];
//       setSearchQuery(`.${zoneName}`);
//     }
//   };

//   // Обработчик очистки
//   const handleClear = () => {
//     onZoneChange('');
//     setSearchQuery('');
//     if (inputRef.current) {
//       inputRef.current.focus();
//     }
//   };

//   // Рассчитываем общую статистику
//   const totalSubdomains = useMemo(() => {
//     return Object.values(zoneSubdomains).reduce((total, subs) => total + subs.length, 0);
//   }, [zoneSubdomains]);

//   return (
//     <div style={{ position: 'relative', width: '280px' }} ref={dropdownRef}>
//       {/* Номер шага */}
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

//       {/* Кастомный инпут */}
//       <div
//         onClick={handleInputClick}
//         style={{
//           width: '280px',
//           borderRadius: '25px',
//           padding: '10px 15px',
//           background: 'white',
//           border: `1px solid ${isOpen ? '#3b82f6' : '#ccc'}`,
//           cursor: 'pointer',
//           color: 'black',
//           fontFamily: 'monospace',
//           display: 'flex',
//           alignItems: 'center',
//           justifyContent: 'space-between',
//           minHeight: '44px',
//           boxSizing: 'border-box'
//         }}
//       >
//         <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
//           {selectedZoneInfo ? (
//             <>
//               <span style={{ 
//                 color: selectedZoneInfo.color,
//                 fontWeight: 'bold',
//                 marginRight: '8px'
//               }}>
//                 ●
//               </span>
//               <span style={{ 
//                 color: 'black',
//                 overflow: 'hidden',
//                 textOverflow: 'ellipsis',
//                 whiteSpace: 'nowrap'
//               }}>
//                 .{formatZoneName(selectedZoneInfo.name)}
//               </span>
//               <span style={{ 
//                 marginLeft: 'auto',
//                 fontSize: '12px',
//                 color: '#666',
//                 marginRight: '8px'
//               }}>
//                 {selectedZoneInfo.displayCount}
//               </span>
//               {selectedZoneInfo.isUserZone && (
//                 <span style={{ fontSize: '12px' }}>👑</span>
//               )}
//             </>
//           ) : (
//             <span style={{ color: '#999' }}>
//               {isLoading ? 'Loading zones...' : placeholder}
//             </span>
//           )}
//         </div>
        
//         {/* Стрелочка */}
//         <span style={{ 
//           marginLeft: '8px',
//           transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
//           transition: 'transform 0.2s'
//         }}>
//           ▼
//         </span>
//       </div>

//       {/* Dropdown */}
//       {isOpen && (
//         <div style={{
//           position: 'absolute',
//           top: 'calc(100% + 4px)',
//           left: 0,
//           width: '280px',
//           background: 'white',
//           border: '1px solid #ccc',
//           borderRadius: '12px',
//           boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
//           maxHeight: '400px',
//           overflow: 'hidden',
//           zIndex: 1000,
//           display: 'flex',
//           flexDirection: 'column'
//         }}>
//           {/* Поисковая строка */}
//           <div style={{
//             padding: '12px',
//             borderBottom: '1px solid #f0f0f0',
//             background: '#f9f9f9'
//           }}>
//             <div style={{
//               position: 'relative',
//               display: 'flex',
//               alignItems: 'center'
//             }}>
//               <span style={{
//                 position: 'absolute',
//                 left: '12px',
//                 color: '#666',
//                 fontSize: '14px',
//                 pointerEvents: 'none'
//               }}>
                
//               </span>
//               <input
//                 ref={inputRef}
//                 type="text"
//                 value={searchQuery}
//                 onChange={handleSearchChange}
//                 placeholder="Search zone..."
//                 style={{
//                   width: '100%',
//                   padding: '8px 8px 8px 20px',
//                   borderRadius: '6px',
//                   border: '1px solid #ddd',
//                   fontFamily: 'monospace',
//                   fontSize: '14px',
//                   outline: 'none',
//                   color: isDark ? 'white' : 'black',
//                 }}
//                 onClick={(e) => e.stopPropagation()}
//               />
//               {searchQuery && (
//                 <button
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     setSearchQuery('');
//                   }}
//                   style={{
//                     position: 'absolute',
//                     right: '8px',
//                     background: 'none',
//                     border: 'none',
//                     color: '#999',
//                     cursor: 'pointer',
//                     fontSize: '18px'
//                   }}
//                 >
//                   ×
//                 </button>
//               )}
//             </div>
//           </div>

//           {/* Список зон */}
//           <div style={{
//             flex: 1,
//             overflowY: 'auto',
//             maxHeight: '300px'
//           }}>
//             {filteredZones.length === 0 ? (
//               <div style={{
//                 padding: '16px',
//                 textAlign: 'center',
//                 color: '#999',
//                 fontSize: '14px'
//               }}>
//                 No zones found
//               </div>
//             ) : (
//               filteredZones.map((zone) => {
//                 const subdomains = zoneSubdomains[zone.id] || [];
//                 const itemCount = subdomains.length;
//                 const displayCount = subdomains.length > 0 
//                   ? formatItemCount(itemCount)
//                   : (loadingZoneId === zone.id ? 'Loading...' : '0 subdomains');
//                 const isSelected = zone.name === selectedZone;
//                 const isUserZone = zone.owner === userAddress;

//                 return (
//                   <div
//                     key={zone.id}
//                     onClick={() => handleSelectZone(zone.name)}
//                     style={{
//                       padding: '10px 12px',
//                       cursor: 'pointer',
//                       display: 'grid',
//                       gridTemplateColumns: 'auto 1fr auto auto',
//                       gap: '8px',
//                       alignItems: 'center',
//                       borderBottom: '1px solid #f5f5f5',
//                       backgroundColor: isSelected ? '#f0f9ff' : 'white'
//                     //   ':hover': {
//                     //     backgroundColor: '#f9f9f9'
//                     //   }
//                     }}
//                   >
//                     {/* Цветная точка */}
//                     <div style={{
//                       width: '8px',
//                       height: '8px',
//                       borderRadius: '50%',
//                       backgroundColor: getItemCountColor(itemCount)
//                     }} />

//                     {/* Имя зоны */}
//                     <div style={{
//                       textAlign: 'left',
//                       overflow: 'hidden',
//                       textOverflow: 'ellipsis',
//                       whiteSpace: 'nowrap',
//                       color: 'black',
//                       fontFamily: 'monospace'
//                     }}>
//                       .{formatZoneName(zone.name)}
//                     </div>

//                     {/* Количество субдоменов */}
//                     <div style={{
//                       textAlign: 'center',
//                       fontSize: '12px',
//                       fontWeight: itemCount > 0 ? 'bold' : 'normal',
//                       color: getItemCountColor(itemCount),
//                       minWidth: '80px'
//                     }}>
//                       {displayCount}
//                     </div>

//                     {/* Процент и эмодзи */}
//                     <div style={{
//                       textAlign: 'right',
//                       fontSize: '12px',
//                       color: '#666',
//                       display: 'flex',
//                       alignItems: 'center',
//                       gap: '4px'
//                     }}>
//                       {isUserZone && <span>👑</span>}
//                     </div>
//                   </div>
//                 );
//               })
//             )}
//           </div>

//           {/* Статистика */}
//           {zones.length > 0 && (
//             <div style={{
//               padding: '8px 12px',
//               borderTop: '1px solid #f0f0f0',
//               background: '#f9f9f9',
//               fontSize: '11px',
//               color: '#666',
//               display: 'flex',
//               justifyContent: 'space-between'
//             }}>
//               <span style={{ color: '#10b981' }}>
//                 {filteredZones.length}/{zones.length} zones
//               </span>
//               <span style={{ color: '#3b82f6' }}>
//                 {totalSubdomains} subdomains
//               </span>
//               {loadingZoneId && (
//                 <span style={{ color: '#f59e0b' }}>
//                   🔄
//                 </span>
//               )}
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

// // Хук для использования в AuctionCollectionSelector
// export const useCustomZoneSelector = (props: CustomZoneSelectorProps) => {
//   return <CustomZoneSelector {...props} />;
// };

// src/components/AuctionCollectionSelector/CustomZoneSelector.tsx
// import React, { useState, useMemo, useRef, useEffect } from 'react';
// import { Zone, Subdomain, apiService } from '@/services/api';
// import { color } from 'framer-motion';
// import { useLanguage } from '@/contexts/LanguageContext';



// interface CustomZoneSelectorProps {
//   zones: Zone[];
//   selectedZone: string;
//   onZoneChange: (zoneName: string) => void;
//   userAddress: string | null;
//   isDark: boolean;
//   placeholder?: string;
//   isLoading?: boolean;
//   isTestnet?: boolean;
//   mode?: 'proxy' | 'sbt'; // Добавляем режим для SBT
//   // Для SBT: функция для загрузки субдоменов SBT зоны
//   loadSbtSubdomains?: (zoneName: string) => Promise<number>;
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

// export const CustomZoneSelector: React.FC<CustomZoneSelectorProps> = ({
//   zones,
//   selectedZone,
//   onZoneChange,
//   userAddress,
//   isDark,
//   placeholder = 'Choose zone...',
//   isLoading = false,
//   isTestnet = false,
//   mode = 'proxy',
//   loadSbtSubdomains
// }) => {
//   const [isOpen, setIsOpen] = useState(false);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [zoneSubdomains, setZoneSubdomains] = useState<Record<number, Subdomain[]>>({});
//   const [sbtZoneCounts, setSbtZoneCounts] = useState<Record<string, number>>({});
//   const [loadingZoneId, setLoadingZoneId] = useState<number | null>(null);
//   const [loadingSbtZone, setLoadingSbtZone] = useState<string | null>(null);
//   const dropdownRef = useRef<HTMLDivElement>(null);
//   const inputRef = useRef<HTMLInputElement>(null);

//   const { t } = useLanguage();

//   // Закрываем dropdown при клике вне компонента
//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
//         setIsOpen(false);
//       }
//     };

//     document.addEventListener('mousedown', handleClickOutside);
//     return () => document.removeEventListener('mousedown', handleClickOutside);
//   }, []);

//   // Фокусируем инпут при открытии
//   useEffect(() => {
//     if (isOpen && inputRef.current) {
//       setTimeout(() => {
//         inputRef.current?.focus();
//       }, 100);
//     }
//   }, [isOpen]);

//   // Загружаем субдомены для Proxy зоны
//   const loadProxySubdomains = async (zoneId: number, zoneName: string) => {
//     if (zoneSubdomains[zoneId] !== undefined) return;

//     setLoadingZoneId(zoneId);
//     try {
//       apiService.setNetwork(isTestnet);
//       const subdomains = await apiService.getZoneSubdomains(zoneId);
//       setZoneSubdomains(prev => ({ ...prev, [zoneId]: subdomains }));
//     } catch (error) {
//       console.error(`Error loading subdomains for ${zoneName}:`, error);
//       setZoneSubdomains(prev => ({ ...prev, [zoneId]: [] }));
//     } finally {
//       setLoadingZoneId(null);
//     }
//   };

//   // Загружаем количество субдоменов для SBT зоны
//   const loadSbtZoneCount = async (zoneName: string) => {
//     if (sbtZoneCounts[zoneName] !== undefined || !loadSbtSubdomains) return;

//     setLoadingSbtZone(zoneName);
//     try {
//       const count = await loadSbtSubdomains(zoneName);
//       setSbtZoneCounts(prev => ({ ...prev, [zoneName]: count }));
//     } catch (error) {
//       console.error(`Error loading SBT subdomains for ${zoneName}:`, error);
//       setSbtZoneCounts(prev => ({ ...prev, [zoneName]: 0 }));
//     } finally {
//       setLoadingSbtZone(null);
//     }
//   };

//   // Загружаем данные для выбранной зоны
//   useEffect(() => {
//     if (selectedZone) {
//       if (mode === 'proxy') {
//         const selectedZoneObj = zones.find(z => z.name === selectedZone);
//         if (selectedZoneObj?.id && !zoneSubdomains[selectedZoneObj.id]) {
//           loadProxySubdomains(selectedZoneObj.id, selectedZoneObj.name);
//         }
//       } else if (mode === 'sbt' && loadSbtSubdomains) {
//         if (sbtZoneCounts[selectedZone] === undefined) {
//           loadSbtZoneCount(selectedZone);
//         }
//       }
//     }
//   }, [selectedZone, zones, mode]);

//   // Фильтруем зоны по поисковому запросу
//   const filteredZones = useMemo(() => {
//     if (!searchQuery.trim()) return zones;

//     const query = searchQuery.toLowerCase().replace(/^\./, ''); // Убираем точку в начале если есть
//     return zones.filter(zone => {
//       const zoneName = zone.name?.toLowerCase() || '';
//       return zoneName.includes(query);
//     });
//   }, [zones, searchQuery]);

//   // Получаем информацию о выбранной зоне
//   const selectedZoneInfo = useMemo(() => {
//     if (!selectedZone) return null;
//     const zone = zones.find(z => z.name === selectedZone);
//     if (!zone) return null;

//     let itemCount = 0;
//     let isLoading = false;

//     if (mode === 'proxy') {
//       const subdomains = zoneSubdomains[zone.id] || [];
//       itemCount = subdomains.length;
//       isLoading = loadingZoneId === zone.id;
//     } else {
//       itemCount = sbtZoneCounts[zone.name] || 0;
//       isLoading = loadingSbtZone === zone.name;
//     }

//     return {
//       ...zone,
//       itemCount,
//       isLoading,
//       color: getItemCountColor(itemCount),
//       isUserZone: zone.owner === userAddress
//     };
//   }, [selectedZone, zones, mode, zoneSubdomains, sbtZoneCounts, loadingZoneId, loadingSbtZone, userAddress]);

//   // Рассчитываем проценты для всех зон
//   const zoneData = useMemo(() => {
//     let totalSubdomains = 0;
    
//     // Сначала собираем все данные
//     const data = zones.map(zone => {
//       let itemCount = 0;
      
//       if (mode === 'proxy') {
//         const subdomains = zoneSubdomains[zone.id] || [];
//         itemCount = subdomains.length;
//       } else {
//         itemCount = sbtZoneCounts[zone.name] || 0;
//       }
      
//       totalSubdomains += itemCount;
      
//       return {
//         zone,
//         itemCount,
//         isLoading: mode === 'proxy' 
//           ? loadingZoneId === zone.id 
//           : loadingSbtZone === zone.name
//       };
//     });
    
//     // Затем рассчитываем проценты
//     return data.map(item => ({
//       ...item,
//       percentage: totalSubdomains > 0 
//         ? ((item.itemCount / totalSubdomains) * 100).toFixed(1)
//         : '0.0'
//     }));
//   }, [zones, mode, zoneSubdomains, sbtZoneCounts, loadingZoneId, loadingSbtZone]);

//   // Обработчик выбора зоны
//   const handleSelectZone = (zoneName: string) => {
//     onZoneChange(zoneName);
//     setIsOpen(false);
//     setSearchQuery('');
    
//     // Загружаем данные для выбранной зоны
//     const zone = zones.find(z => z.name === zoneName);
//     if (!zone) return;

//     if (mode === 'proxy') {
//       if (zone.id && !zoneSubdomains[zone.id]) {
//         loadProxySubdomains(zone.id, zone.name);
//       }
//     } else if (mode === 'sbt' && loadSbtSubdomains) {
//       if (sbtZoneCounts[zoneName] === undefined) {
//         loadSbtZoneCount(zoneName);
//       }
//     }
//   };

//   // Обработчик ввода в поиск
//   const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const value = e.target.value;
//     // Автоматически добавляем точку в начале если её нет
//     if (value && !value.startsWith('.')) {
//       setSearchQuery(`.${value}`);
//     } else {
//       setSearchQuery(value);
//     }
//   };

//   // Обработчик клика на инпут
//   const handleInputClick = () => {
//     setIsOpen(true);
//     if (!searchQuery && selectedZone) {
//       // Показываем выбранную зону в инпуте
//       const zoneName = selectedZone.split('.')[0];
//       setSearchQuery(`.${zoneName}`);
//     }
//   };

//   // Рассчитываем общую статистику
//   const totalSubdomains = useMemo(() => {
//     if (mode === 'proxy') {
//       return Object.values(zoneSubdomains).reduce((total, subs) => total + subs.length, 0);
//     } else {
//       return Object.values(sbtZoneCounts).reduce((total, count) => total + count, 0);
//     }
//   }, [mode, zoneSubdomains, sbtZoneCounts]);

//   return (
//     <div style={{ position: 'relative', width: '280px' }} ref={dropdownRef}>
//       {/* Номер шага */}
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

//       {/* Кастомный инпут */}
//       <div
//         onClick={handleInputClick}
//         style={{
//           width: '280px',
//           borderRadius: '25px',
//           padding: '10px 15px',
//           background: 'white',
//           border: `1px solid ${isOpen ? '#3b82f6' : '#ccc'}`,
//           cursor: 'pointer',
//           color: 'black',
//           fontFamily: 'monospace',
//           display: 'flex',
//           alignItems: 'center',
//           justifyContent: 'space-between',
//           minHeight: '44px',
//           boxSizing: 'border-box'
//         }}
//       >
//         <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
//           {selectedZoneInfo ? (
//             <>
//               <span style={{ 
//                 color: selectedZoneInfo.color,
//                 fontWeight: 'bold',
//                 marginRight: '8px'
//               }}>
//                 ●
//               </span>
//               <span style={{ 
//                 color: 'black',
//                 overflow: 'hidden',
//                 textOverflow: 'ellipsis',
//                 whiteSpace: 'nowrap',
//                 fontFamily: 'monospace'
//               }}>
//                 .{formatZoneName(selectedZoneInfo.name)}
//               </span>
//               {mode === 'sbt' && (
//                 <span style={{ 
//                   marginLeft: '8px',
//                   fontSize: '12px',
//                   color: '#666'
//                 }}>
//                   🔒
//                 </span>
//               )}
//               <div style={{ 
//                 marginLeft: 'auto',
//                 display: 'flex',
//                 alignItems: 'center',
//                 gap: '8px'
//               }}>
//                 <span style={{ 
//                   fontSize: '12px',
//                   fontWeight: 'bold',
//                   color: selectedZoneInfo.color
//                 }}>
//                   {selectedZoneInfo.isLoading ? '...' : selectedZoneInfo.itemCount}
//                 </span>
//                 {selectedZoneInfo.isUserZone && (
//                   <span style={{ fontSize: '12px' }}>👑</span>
//                 )}
//               </div>
//             </>
//           ) : (
//             <span style={{ color: '#999', fontFamily: 'monospace' }}>
//               {isLoading ? 'Loading zones...' : placeholder}
//             </span>
//           )}
//         </div>
        
//         {/* Стрелочка */}
//         <span style={{ 
//           marginLeft: '8px',
//           transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
//           transition: 'transform 0.2s',
//           color: '#666'
//         }}>
//           ▼
//         </span>
//       </div>

//       {/* Dropdown */}
//       {isOpen && (
//         <div style={{
//           position: 'absolute',
//           top: 'calc(100% + 4px)',
//           left: 0,
//           width: '280px',
//           background: 'white',
//           border: '1px solid #ccc',
//           borderRadius: '12px',
//           boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
//           maxHeight: '400px',
//           overflow: 'hidden',
//           zIndex: 1000,
//           display: 'flex',
//           flexDirection: 'column'
//         }}>
//           {/* Поисковая строка */}
//           <div style={{
//             padding: '12px',
//             borderBottom: '1px solid #f0f0f0',
//             background: '#f9f9f9',
//             color: isDark ? 'white' : 'black',
//           }}>
//             <div style={{
//               position: 'relative',
//               display: 'flex',
//               alignItems: 'center'
//             }}>
//               <span style={{
//                 position: 'absolute',
//                 left: '12px',
//                 color: '#666',
//                 fontSize: '14px',
//                 pointerEvents: 'none',
//                 fontFamily: 'monospace'
//               }}>
                
//               </span>
//               <input
//                 ref={inputRef}
//                 type="text"
//                 value={searchQuery}
//                 onChange={handleSearchChange}
//                 placeholder="Search zone..."
//                 style={{
//                   width: '100%',
//                   padding: '8px 8px 8px 20px',
//                   borderRadius: '6px',
//                   border: '1px solid #ddd',
//                   fontFamily: 'monospace',
//                   fontSize: '14px',
//                   outline: 'none'
//                 }}
//                 onClick={(e) => e.stopPropagation()}
//               />
//               {searchQuery && (
//                 <button
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     setSearchQuery('');
//                   }}
//                   style={{
//                     position: 'absolute',
//                     right: '8px',
//                     background: 'none',
//                     border: 'none',
//                     color: '#999',
//                     cursor: 'pointer',
//                     fontSize: '18px'
//                   }}
//                 >
//                   ×
//                 </button>
//               )}
//             </div>
//           </div>

//           {/* Шапка с заголовками */}
//           <div style={{
//             padding: '8px 12px',
//             borderBottom: '1px solid #e0e0e0',
//             background: '#f5f5f5',
//             display: 'grid',
//             gridTemplateColumns: '1fr auto auto',
//             gap: '8px',
//             alignItems: 'center',
//             fontSize: '11px',
//             fontWeight: 'bold',
//             color: '#666',
//             textTransform: 'uppercase',
//             letterSpacing: '0.5px'
//           }}>
//             <div style={{ textAlign: 'left' }}>Zone</div>
//             <div style={{ textAlign: 'center', minWidth: '50px' }}>Subdomains</div>
//             <div style={{ textAlign: 'right', minWidth: '40px' }}>% Supply</div>
//           </div>

//           {/* Список зон */}
//           <div style={{
//             flex: 1,
//             overflowY: 'auto',
//             maxHeight: '300px'
//           }}>
//             {filteredZones.length === 0 ? (
//               <div style={{
//                 padding: '16px',
//                 textAlign: 'center',
//                 color: '#999',
//                 fontSize: '14px',
//                 fontFamily: 'monospace'
//               }}>
//                 No zones found
//               </div>
//             ) : (
//               filteredZones.map((zone) => {
//                 const zoneDataItem = zoneData.find(item => item.zone.id === zone.id);
//                 if (!zoneDataItem) return null;

//                 const { itemCount, percentage, isLoading } = zoneDataItem;
//                 const isSelected = zone.name === selectedZone;
//                 const isUserZone = zone.owner === userAddress;

//                 return (
//                   <div
//                     key={zone.id}
//                     onClick={() => handleSelectZone(zone.name)}
//                     style={{
//                       padding: '10px 12px',
//                       cursor: 'pointer',
//                       display: 'grid',
//                       gridTemplateColumns: '1fr auto auto',
//                       gap: '8px',
//                       alignItems: 'center',
//                       borderBottom: '1px solid #f5f5f5',
//                       backgroundColor: isSelected ? '#f0f9ff' : 'white'
//                     }}
//                   >
//                     {/* Имя зоны */}
//                     <div style={{
//                       textAlign: 'left',
//                       overflow: 'hidden',
//                       textOverflow: 'ellipsis',
//                       whiteSpace: 'nowrap',
//                       color: 'black',
//                       fontFamily: 'monospace',
//                       display: 'flex',
//                       alignItems: 'center',
//                       gap: '6px'
//                     }}>
//                       <span style={{
//                         width: '8px',
//                         height: '8px',
//                         borderRadius: '50%',
//                         backgroundColor: getItemCountColor(itemCount),
//                         flexShrink: 0
//                       }} />
//                       <span>
//                         .{formatZoneName(zone.name)}
//                         {mode === 'sbt' && ' 🔒'}
//                       </span>
//                       {isUserZone && mode !== 'sbt' && <div className="ownLabel" style={{display: 'flex', alignItems: 'flex-end', justifyContent: 'left'}}><p style={{color: 'blue', margin: 0}}>{t('yourZone')}</p></div>}
//                     </div>

//                     {/* Количество субдоменов */}
//                     <div style={{
//                       textAlign: 'center',
//                       fontSize: '13px',
//                       fontWeight: 'bold',
//                       color: getItemCountColor(itemCount),
//                       minWidth: '50px',
//                       fontFamily: 'monospace'
//                     }}>
//                       {isLoading ? '...' : itemCount}
//                     </div>

//                     {/* Процент */}
//                     <div style={{
//                       textAlign: 'right',
//                       fontSize: '13px',
//                       color: '#666',
//                       minWidth: '40px',
//                       fontFamily: 'monospace'
//                     }}>
//                       {percentage}%
//                     </div>
//                   </div>
//                 );
//               })
//             )}
//           </div>

//           {/* Статистика */}
//           {zones.length > 0 && (
//             <div style={{
//               padding: '8px 12px',
//               borderTop: '1px solid #f0f0f0',
//               background: '#f9f9f9',
//               fontSize: '11px',
//               color: '#666',
//               display: 'flex',
//               justifyContent: 'space-between',
//               fontFamily: 'monospace'
//             }}>
//               <span style={{ color: '#10b981' }}>
//                 {filteredZones.length}/{zones.length} zones
//               </span>
//               <span style={{ color: '#3b82f6' }}>
//                 {totalSubdomains} total
//               </span>
//               <span style={{ color: '#8b5cf6' }}>
//                 Avg: {zones.length > 0 ? (totalSubdomains / zones.length).toFixed(1) : '0'} per zone
//               </span>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

// // src/components/AuctionCollectionSelector/CustomZoneSelector.tsx
// import React, { useState, useMemo, useRef, useEffect } from 'react';
// import { Zone, Subdomain, apiService } from '@/services/api';
//  import { useLanguage } from '@/contexts/LanguageContext';
 

// interface CustomZoneSelectorProps {
//   zones: Zone[];
//   selectedZone: string;
//   onZoneChange: (zoneName: string) => void;
//   userAddress: string | null;
//   isDark: boolean;
//   placeholder?: string;
//   isLoading?: boolean;
//   isTestnet?: boolean;
//   mode?: 'proxy' | 'sbt';
//   // Для SBT: функция для загрузки субдоменов SBT зоны
//   loadSbtSubdomains?: (zoneName: string) => Promise<number>;
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

// export const CustomZoneSelector: React.FC<CustomZoneSelectorProps> = ({
//   zones,
//   selectedZone,
//   onZoneChange,
//   userAddress,
//   isDark,
//   placeholder = 'Choose zone...',
//   isLoading = false,
//   isTestnet = false,
//   mode = 'proxy',
//   loadSbtSubdomains
// }) => {
//   const [isOpen, setIsOpen] = useState(false);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [zoneSubdomains, setZoneSubdomains] = useState<Record<number, Subdomain[]>>({});
//   const [sbtZoneCounts, setSbtZoneCounts] = useState<Record<string, number>>({});
//   const [loadingZoneId, setLoadingZoneId] = useState<number | null>(null);
//   const [loadingSbtZone, setLoadingSbtZone] = useState<string | null>(null);
//   const dropdownRef = useRef<HTMLDivElement>(null);
//   const inputRef = useRef<HTMLInputElement>(null);
//   const { t } = useLanguage();
  

//   // Закрываем dropdown при клике вне компонента
//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
//         setIsOpen(false);
//       }
//     };

//     document.addEventListener('mousedown', handleClickOutside);
//     return () => document.removeEventListener('mousedown', handleClickOutside);
//   }, []);

//   // Фокусируем инпут при открытии
//   useEffect(() => {
//     if (isOpen && inputRef.current) {
//       setTimeout(() => {
//         inputRef.current?.focus();
//       }, 100);
//     }
//   }, [isOpen]);

//   // Загружаем субдомены для Proxy зоны
//   const loadProxySubdomains = async (zoneId: number, zoneName: string) => {
//     if (zoneSubdomains[zoneId] !== undefined) return;

//     setLoadingZoneId(zoneId);
//     try {
//       apiService.setNetwork(isTestnet);
//       const subdomains = await apiService.getZoneSubdomains(zoneId);
//       setZoneSubdomains(prev => ({ ...prev, [zoneId]: subdomains }));
//       console.log(`✅ Loaded ${subdomains.length} subdomains for ${zoneName}`);
//     } catch (error) {
//       console.error(`❌ Error loading subdomains for ${zoneName}:`, error);
//       setZoneSubdomains(prev => ({ ...prev, [zoneId]: [] }));
//     } finally {
//       setLoadingZoneId(null);
//     }
//   };

//   // Загружаем количество субдоменов для SBT зоны
//   const loadSbtZoneCount = async (zoneName: string) => {
//     if (sbtZoneCounts[zoneName] !== undefined || !loadSbtSubdomains) return;

//     setLoadingSbtZone(zoneName);
//     try {
//       const count = await loadSbtSubdomains(zoneName);
//       setSbtZoneCounts(prev => ({ ...prev, [zoneName]: count }));
//       console.log(`✅ Loaded ${count} SBT subdomains for ${zoneName}`);
//     } catch (error) {
//       console.error(`❌ Error loading SBT subdomains for ${zoneName}:`, error);
//       setSbtZoneCounts(prev => ({ ...prev, [zoneName]: 0 }));
//     } finally {
//       setLoadingSbtZone(null);
//     }
//   };

//   // Загружаем данные для ВСЕХ зон при открытии dropdown
//   useEffect(() => {
//     if (isOpen && zones.length > 0) {
//       console.log(`🔄 Loading data for ${zones.length} zones (mode: ${mode})`);
      
//       if (mode === 'proxy') {
//         // Для Proxy: загружаем субдомены для всех зон
//         zones.forEach(zone => {
//           if (zone.id && !zoneSubdomains[zone.id]) {
//             loadProxySubdomains(zone.id, zone.name);
//           }
//         });
//       } else if (mode === 'sbt' && loadSbtSubdomains) {
//         // Для SBT: загружаем количество для всех зон
//         zones.forEach(zone => {
//           if (sbtZoneCounts[zone.name] === undefined) {
//             loadSbtZoneCount(zone.name);
//           }
//         });
        
//       }
//     }
//   }, [isOpen, zones, mode]);

//   // Фильтруем зоны по поисковому запросу
//   const filteredZones = useMemo(() => {
//     if (!searchQuery.trim()) return zones;

//     const query = searchQuery.toLowerCase().replace(/^\./, ''); // Убираем точку в начале если есть
//     return zones.filter(zone => {
//       const zoneName = zone.name?.toLowerCase() || '';
//       return zoneName.includes(query);
//     });
//   }, [zones, searchQuery]);

//   // Получаем информацию о выбранной зоне
//   const selectedZoneInfo = useMemo(() => {
//     if (!selectedZone) return null;
//     const zone = zones.find(z => z.name === selectedZone);
//     if (!zone) return null;

//     let itemCount = 0;
//     let isLoading = false;

//     if (mode === 'proxy') {
//       const subdomains = zoneSubdomains[zone.id] || [];
//       itemCount = subdomains.length;
//       isLoading = loadingZoneId === zone.id;
//     } else {
//       itemCount = sbtZoneCounts[zone.name] || 0;
//       isLoading = loadingSbtZone === zone.name;
//     }

//     return {
//       ...zone,
//       itemCount,
//       isLoading,
//       color: getItemCountColor(itemCount)
//     };
//   }, [selectedZone, zones, mode, zoneSubdomains, sbtZoneCounts, loadingZoneId, loadingSbtZone]);

//   // Рассчитываем проценты для всех зон
//   const zoneData = useMemo(() => {
//     let totalSubdomains = 0;
    
    
//     // Сначала собираем все данные
//     const data = zones.map(zone => {
//       let itemCount = 0;
      
//       if (mode === 'proxy') {
//         const subdomains = zoneSubdomains[zone.id] || [];
//         itemCount = subdomains.length;
//       } else {
//         // itemCount = sbtZoneCounts[zone.name] || 0;
//         const subdomains = apiService.getZoneSubdomains(zone.id);
//         itemCount = subdomains.length;
//       }
      
//       totalSubdomains += itemCount;
      
//       return {
//         zone,
//         itemCount,
//         isLoading: mode === 'proxy' 
//           ? loadingZoneId === zone.id 
//           : loadingSbtZone === zone.name
//       };
//     });
    
//     // Затем рассчитываем проценты
//     return data.map(item => ({
//       ...item,
//       percentage: totalSubdomains > 0 
//         ? ((item.itemCount / totalSubdomains) * 100).toFixed(1)
//         : '0.0'
//     }));
//   }, [zones, mode, zoneSubdomains, sbtZoneCounts, loadingZoneId, loadingSbtZone]);

//   // Обработчик выбора зоны
//   const handleSelectZone = (zoneName: string) => {
//     onZoneChange(zoneName);
//     setIsOpen(false);
//     setSearchQuery('');
//   };

//   // Обработчик ввода в поиск
//   const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const value = e.target.value;
//     // Автоматически добавляем точку в начале если её нет
//     if (value && !value.startsWith('.')) {
//       setSearchQuery(`.${value}`);
//     } else {
//       setSearchQuery(value);
//     }
//   };

//   // Обработчик клика на инпут
//   const handleInputClick = () => {
//     setIsOpen(true);
//     if (!searchQuery && selectedZone) {
//       // Показываем выбранную зону в инпуте
//       const zoneName = selectedZone.split('.')[0];
//       setSearchQuery(`.${zoneName}`);
//     }
//   };

//   // Рассчитываем общую статистику
//   const totalSubdomains = useMemo(() => {
//     if (mode === 'proxy') {
//       return Object.values(zoneSubdomains).reduce((total, subs) => total + subs.length, 0);
//     } else {
//       return Object.values(sbtZoneCounts).reduce((total, count) => total + count, 0);
//     }
//   }, [mode, zoneSubdomains, sbtZoneCounts]);

//   // Рассчитываем количество загруженных зон
//   const loadedZonesCount = useMemo(() => {
//     if (mode === 'proxy') {
//       return Object.keys(zoneSubdomains).length;
//     } else {
//       return Object.keys(sbtZoneCounts).length;
//     }
//   }, [mode, zoneSubdomains, sbtZoneCounts]);

//   return (
//     <div style={{ position: 'relative', width: '280px' }} ref={dropdownRef}>
//       {/* Номер шага */}
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

//       {/* Кастомный инпут */}
//       <div
//         onClick={handleInputClick}
//         style={{
//           width: '280px',
//           borderRadius: '25px',
//           padding: '10px 15px',
//           background: 'white',
//           border: `1px solid ${isOpen ? '#3b82f6' : '#ccc'}`,
//           cursor: 'pointer',
//           color: 'black',
//           fontFamily: 'monospace',
//           display: 'flex',
//           alignItems: 'center',
//           justifyContent: 'space-between',
//           minHeight: '44px',
//           boxSizing: 'border-box'
//         }}
//       >
//         <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
//           {selectedZoneInfo ? (
//             <>
//               <span style={{ 
//                 color: selectedZoneInfo.color,
//                 fontWeight: 'bold',
//                 marginRight: '8px'
//               }}>
//                 ●
//               </span>
//               <span style={{ 
//                 color: 'black',
//                 overflow: 'hidden',
//                 textOverflow: 'ellipsis',
//                 whiteSpace: 'nowrap',
//                 fontFamily: 'monospace'
//               }}>
//                 .{formatZoneName(selectedZoneInfo.name)}
//               </span>
//               {mode === 'sbt' && (
//                 <span style={{ 
//                   marginLeft: '8px',
//                   fontSize: '12px',
//                   color: '#666'
//                 }}>
//                   🔒
//                 </span>
//               )}
//               <div style={{ 
//                 marginLeft: 'auto',
//                 display: 'flex',
//                 alignItems: 'center',
//                 gap: '8px'
//               }}>
//                 <span style={{ 
//                   fontSize: '12px',
//                   fontWeight: 'bold',
//                   color: selectedZoneInfo.color,
//                   minWidth: '20px',
//                   textAlign: 'right'
//                 }}>
//                   {selectedZoneInfo.isLoading ? '...' : selectedZoneInfo.itemCount}
//                 </span>
//               </div>
//             </>
            
//           ) : (
//             <span style={{ color: '#999', fontFamily: 'monospace' }}>
//               {isLoading ? 'Loading zones...' : placeholder}
//             </span>
//           )}
//         </div>
        
//         {/* Стрелочка */}
//         <span style={{ 
//           marginLeft: '8px',
//           transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
//           transition: 'transform 0.2s',
//           color: '#666'
//         }}>
//           ▼
//         </span>
//       </div>

//       {/* Dropdown */}
//       {isOpen && (
//         <div style={{
//           position: 'absolute',
//           top: 'calc(100% + 4px)',
//           left: 0,
//           width: '280px',
//           background: 'white',
//           border: '1px solid #ccc',
//           borderRadius: '12px',
//           boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
//           maxHeight: '400px',
//           overflow: 'hidden',
//           zIndex: 1000,
//           display: 'flex',
//           flexDirection: 'column'
//         }}>
//           {/* Поисковая строка */}
//           <div style={{
//             padding: '12px',
//             borderBottom: '1px solid #f0f0f0',
//             background: '#f9f9f9'
//           }}>
//             <div style={{
//               position: 'relative',
//               display: 'flex',
//               alignItems: 'center'
//             }}>
//               <span style={{
//                 position: 'absolute',
//                 left: '12px',
//                 color: '#666',
//                 fontSize: '14px',
//                 pointerEvents: 'none',
//                 fontFamily: 'monospace'
//               }}>
            
//               </span>
//               <input
//                 ref={inputRef}
//                 type="text"
//                 value={searchQuery}
//                 onChange={handleSearchChange}
//                 placeholder="Search zone..."
//                 style={{
//                   width: '100%',
//                   padding: '8px 8px 8px 20px',
//                   borderRadius: '6px',
//                   border: '1px solid #ddd',
//                   fontFamily: 'monospace',
//                   fontSize: '14px',
//                   outline: 'none',
//                   color: isDark ? 'white' : 'black'
//                 }}
//                 onClick={(e) => e.stopPropagation()}
//               />
//               {searchQuery && (
//                 <button
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     setSearchQuery('');
//                   }}
//                   style={{
//                     position: 'absolute',
//                     right: '8px',
//                     background: 'none',
//                     border: 'none',
//                     color: '#999',
//                     cursor: 'pointer',
//                     fontSize: '18px'
//                   }}
//                 >
//                   ×
//                 </button>
//               )}
//             </div>
//           </div>

//           {/* Шапка с заголовками */}
//           <div style={{
//             padding: '8px 12px',
//             borderBottom: '1px solid #e0e0e0',
//             background: '#f5f5f5',
//             display: 'grid',
//             gridTemplateColumns: '1fr auto auto',
//             gap: '8px',
//             alignItems: 'center',
//             fontSize: '11px',
//             fontWeight: 'bold',
//             color: '#666',
//             textTransform: 'uppercase',
//             letterSpacing: '0.5px'
//           }}>
//             <div style={{ textAlign: 'left' }}>Zone</div>
//             <div style={{ textAlign: 'center', minWidth: '50px' }}>Subdomains</div>
//             <div style={{ textAlign: 'right', minWidth: '40px' }}>% Supply</div>
//           </div>

//           {/* Список зон */}
//           <div style={{
//             flex: 1,
//             overflowY: 'auto',
//             maxHeight: '300px'
//           }}>
//             {filteredZones.length === 0 ? (
//               <div style={{
//                 padding: '16px',
//                 textAlign: 'center',
//                 color: '#999',
//                 fontSize: '14px',
//                 fontFamily: 'monospace'
//               }}>
//                 No zones found
//               </div>
//             ) : (
//               filteredZones.map((zone) => {
//                 const zoneDataItem = zoneData.find(item => item.zone.id === zone.id);
//                 if (!zoneDataItem) return null;

//                 const { itemCount, percentage, isLoading } = zoneDataItem;
//                 const isSelected = zone.name === selectedZone;
//                 const isUserZone = zone.owner === userAddress;

//                 return (
//                   <div
//                     key={zone.id}
//                     onClick={() => handleSelectZone(zone.name)}
//                     style={{
//                       padding: '10px 12px',
//                       cursor: 'pointer',
//                       display: 'grid',
//                       gridTemplateColumns: '1fr auto auto',
//                       gap: '8px',
//                       alignItems: 'center',
//                       borderBottom: '1px solid #f5f5f5',
//                       backgroundColor: isDark ? "rgb(56 56 60)" : 'white',
//                       margin: '0px 10px 0px 10px'
//                     }}
//                   >
//                     {/* Имя зоны */}
//                     <div style={{
//                       textAlign: 'left',
//                       overflow: 'hidden',
//                       textOverflow: 'ellipsis',
//                       whiteSpace: 'nowrap',
//                       color: 'black',
//                       fontFamily: 'monospace',
//                       display: 'flex',
//                       alignItems: 'center',
//                       gap: '6px'
//                     }}>
//                       <span style={{
//                         width: '8px',
//                         height: '8px',
//                         borderRadius: '50%',
//                         backgroundColor: getItemCountColor(itemCount),
//                         flexShrink: 0
//                       }} />
//                       <span style={{color: isDark ? 'white' : 'black'}}>
//                         .{formatZoneName(zone.name)}
//                         {mode === 'sbt' && ' 🔒'}
//                       </span>
//                       {isUserZone && mode !== 'sbt' && <div className="ownLabel" style={{display: 'flex', alignItems: 'flex-end', justifyContent: 'left'}}><p style={{color: isDark ? 'pink':'blue', margin: 0}}>{t('yourZone')}</p></div>}
//                     </div>

//                     {/* Количество субдоменов */}
//                     <div style={{
//                       textAlign: 'center',
//                       fontSize: '13px',
//                       fontWeight: 'bold',
//                       color: getItemCountColor(itemCount),
//                       minWidth: '50px',
//                       fontFamily: 'monospace'
//                     }}>
//                       {isLoading ? '...' : itemCount}
//                     </div>

//                     {/* Процент */}
//                     <div style={{
//                       textAlign: 'right',
//                       fontSize: '13px',
//                     //   color: '#666',
//                       minWidth: '40px',
//                       fontFamily: 'monospace',
//                       color: isDark ? 'white' : 'black'
//                     }}>
//                       {percentage}%
//                     </div>
//                   </div>
//                 );
//               })
//             )}
//           </div>

//           {/* Статистика */}
//           {zones.length > 0 && (
//             <div style={{
//               padding: '8px 12px',
//               borderTop: '1px solid #f0f0f0',
//               background: '#f9f9f9',
//               fontSize: '11px',
//               color: '#666',
//               display: 'flex',
//               justifyContent: 'space-between',
//               fontFamily: 'monospace'
//             }}>
//               <span style={{ color: '#10b981' }}>
//                 {filteredZones.length}/{zones.length} zones
//               </span>
//               <span style={{ color: '#3b82f6' }}>
//                 {totalSubdomains} total
//               </span>
//               <span style={{ color: '#8b5cf6' }}>
//                 {loadedZonesCount}/{zones.length} loaded
//               </span>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

// // src/components/AuctionCollectionSelector/CustomZoneSelector.tsx
// import React, { useState, useMemo, useRef, useEffect } from 'react';
// import { Zone, Subdomain, apiService } from '@/services/api';
// import { useLanguage } from '@/contexts/LanguageContext';



// interface CustomZoneSelectorProps {
//   zones: Zone[];
//   selectedZone: string;
//   onZoneChange: (zoneName: string) => void;
//   userAddress: string | null;
//   isDark: boolean;
//   placeholder?: string;
//   isLoading?: boolean;
//   isTestnet?: boolean;
//   mode?: 'proxy' | 'sbt';
//   // Для SBT: функция для загрузки субдоменов SBT зоны
//   loadSbtSubdomains?: (zoneName: string) => Promise<number>;
//   // Для SBT: уже загруженные количества (если есть)
//   sbtZonesCount?: Record<string, number>;
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
//   if (zone.length > 11) {
//     return `${zone.slice(0, 3)}...${zone.slice(-3)}`;
//   }
  
//   return zone;
// };

// export const CustomZoneSelector: React.FC<CustomZoneSelectorProps> = ({
//   zones,
//   selectedZone,
//   onZoneChange,
//   userAddress,
//   isDark,
//   placeholder = 'Choose zone...',
//   isLoading = false,
//   isTestnet = false,
//   mode = 'proxy',
//   loadSbtSubdomains,
//   sbtZonesCount = {}
// }) => {
//   const [isOpen, setIsOpen] = useState(false);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [zoneSubdomains, setZoneSubdomains] = useState<Record<number, Subdomain[]>>({});
//   const [sbtZoneCounts, setSbtZoneCounts] = useState<Record<string, number>>({});
//   const [loadingZoneId, setLoadingZoneId] = useState<number | null>(null);
//   const [loadingSbtZone, setLoadingSbtZone] = useState<string | null>(null);
//   const dropdownRef = useRef<HTMLDivElement>(null);
//   const inputRef = useRef<HTMLInputElement>(null);
//   const { t } = useLanguage();

//   const themeColors = {
//     light: {
//       primary: "linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)",
//       accent: "#3B82F6",
//       background: "#FFFFFF",
//       text: "#1F2937",
//       border: "#E5E7EB",
//       secondaryBg: "#F9FAFB",
//       shadow: "rgba(59, 130, 246, 0.4)",
//       cyberpunk: "#3B82F6",
//       gold: "#FFD700",
//       blue: "#3B82F6",
//       link: "#3B82F6",
//       inputBg: "#FFFFFF",
//       inputBorder: "#D1D5DB",
//       inputText: "#1F2937",
//       dropdownBg: "#FFFFFF",
//       dropdownBorder: "#E5E7EB"
//     },
//     dark: {
//       primary: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
//       accent: "#FFD700",
//       background: "#121212",
//       text: "#E5E5E5",
//       border: "#333333",
//       secondaryBg: "#1A1A1A",
//       shadow: "rgba(255, 215, 0, 0.4)",
//       cyberpunk: "#FFD700",
//       gold: "#FFD700",
//       blue: "#00FFFF",
//       link: "#00FFFF",
//       inputBg: "#1A1A1A",
//       inputBorder: "#444444",
//       inputText: "#E5E5E5",
//       dropdownBg: "#1A1A1A",
//       dropdownBorder: "#444444"
//     }
//   };

//   const colors = themeColors[isDark ? "dark" : "light"];

//   // Закрываем dropdown при клике вне компонента
//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
//         setIsOpen(false);
//       }
//     };

//     document.addEventListener('mousedown', handleClickOutside);
//     return () => document.removeEventListener('mousedown', handleClickOutside);
//   }, []);

//   // Фокусируем инпут при открытии
//   useEffect(() => {
//     if (isOpen && inputRef.current) {
//       setTimeout(() => {
//         inputRef.current?.focus();
//       }, 100);
//     }
//   }, [isOpen]);

//   // Загружаем субдомены для Proxy зоны
//   const loadProxySubdomains = async (zoneId: number, zoneName: string) => {
//     if (zoneSubdomains[zoneId] !== undefined) return;

//     setLoadingZoneId(zoneId);
//     try {
//       apiService.setNetwork(isTestnet);
//       const subdomains = await apiService.getZoneSubdomains(zoneId);
//       setZoneSubdomains(prev => ({ ...prev, [zoneId]: subdomains }));
//       console.log(`✅ Loaded ${subdomains.length} subdomains for ${zoneName}`);
//     } catch (error) {
//       console.error(`❌ Error loading subdomains for ${zoneName}:`, error);
//       setZoneSubdomains(prev => ({ ...prev, [zoneId]: [] }));
//     } finally {
//       setLoadingZoneId(null);
//     }
//   };

//   // Загружаем количество субдоменов для SBT зоны
//   const loadSbtZoneCount = async (zoneName: string) => {
//     // Сначала проверяем sbtZonesCount (если передан как пропс)
//     if (sbtZonesCount[zoneName] !== undefined) {
//       console.log(`✅ Using sbtZonesCount for ${zoneName}: ${sbtZonesCount[zoneName]}`);
//       setSbtZoneCounts(prev => ({ ...prev, [zoneName]: sbtZonesCount[zoneName] }));
//       return;
//     }
    
//     // Затем проверяем уже загруженные в состоянии
//     if (sbtZoneCounts[zoneName] !== undefined || !loadSbtSubdomains) return;

//     setLoadingSbtZone(zoneName);
//     try {
//       const count = await loadSbtSubdomains(zoneName);
//       setSbtZoneCounts(prev => ({ ...prev, [zoneName]: count }));
//       console.log(`✅ Loaded ${count} SBT subdomains for ${zoneName}`);
//     } catch (error) {
//       console.error(`❌ Error loading SBT subdomains for ${zoneName}:`, error);
//       setSbtZoneCounts(prev => ({ ...prev, [zoneName]: 0 }));
//     } finally {
//       setLoadingSbtZone(null);
//     }
//   };

//   // Загружаем данные для ВСЕХ зон при открытии dropdown
//   useEffect(() => {
//     if (isOpen && zones.length > 0) {
//       console.log(`🔄 Loading data for ${zones.length} zones (mode: ${mode})`);
      
//       if (mode === 'proxy') {
//         // Для Proxy: загружаем субдомены для всех зон
//         zones.forEach(zone => {
//           if (zone.id && !zoneSubdomains[zone.id]) {
//             loadProxySubdomains(zone.id, zone.name);
//           }
//         });
//       } else if (mode === 'sbt') {
//         // Для SBT: загружаем количество для всех зон
//         zones.forEach(zone => {
//           // Если уже есть в sbtZonesCount пропсе, используем его
//           if (sbtZonesCount && sbtZonesCount[zone.name] !== undefined) {
//             console.log(`✅ Using preloaded count for ${zone.name}: ${sbtZonesCount[zone.name]}`);
//             setSbtZoneCounts(prev => ({ 
//               ...prev, 
//               [zone.name]: sbtZonesCount[zone.name] 
//             }));
//           } 
//           // Иначе загружаем через функцию
//           else if (loadSbtSubdomains && sbtZoneCounts[zone.name] === undefined) {
//             loadSbtZoneCount(zone.name);
//           }
//         });
//       }
//     }
//   }, [isOpen, zones, mode, sbtZonesCount]);

//   // Фильтруем зоны по поисковому запросу
//   const filteredZones = useMemo(() => {
//     if (!searchQuery.trim()) return zones;

//     const query = searchQuery.toLowerCase().replace(/^\./, ''); // Убираем точку в начале если есть
//     return zones.filter(zone => {
//       const zoneName = zone.name?.toLowerCase() || '';
//       return zoneName.includes(query);
//     });
//   }, [zones, searchQuery]);

//   // Получаем информацию о выбранной зоне
//   const selectedZoneInfo = useMemo(() => {
//     if (!selectedZone) return null;
//     const zone = zones.find(z => z.name === selectedZone);
//     if (!zone) return null;

//     let itemCount = 0;
//     let isLoading = false;

//     if (mode === 'proxy') {
//       const subdomains = zoneSubdomains[zone.id] || [];
//       itemCount = subdomains.length;
//       isLoading = loadingZoneId === zone.id;
//     } else {
//       // Для SBT: используем sbtZoneCounts или sbtZonesCount пропс
//       itemCount = sbtZoneCounts[zone.name] || sbtZonesCount?.[zone.name] || 0;
//       isLoading = loadingSbtZone === zone.name;
//     }

//     return {
//       ...zone,
//       itemCount,
//       isLoading,
//       color: getItemCountColor(itemCount)
//     };
//   }, [selectedZone, zones, mode, zoneSubdomains, sbtZoneCounts, sbtZonesCount, loadingZoneId, loadingSbtZone]);

//   // Рассчитываем проценты для всех зон
//   const zoneData = useMemo(() => {
//     let totalSubdomains = 0;
    
//     // Сначала собираем все данные
//     const data = zones.map(zone => {
//       let itemCount = 0;
      
//       if (mode === 'proxy') {
//         const subdomains = zoneSubdomains[zone.id] || [];
//         itemCount = subdomains.length;
//       } else {
//         // Для SBT: используем sbtZoneCounts или sbtZonesCount пропс
//         itemCount = sbtZoneCounts[zone.name] || sbtZonesCount?.[zone.name] || 0;
//       }
      
//       totalSubdomains += itemCount;
      
//       return {
//         zone,
//         itemCount,
//         isLoading: mode === 'proxy' 
//           ? loadingZoneId === zone.id 
//           : loadingSbtZone === zone.name
//       };
//     });
    
//     // Затем рассчитываем проценты
//     return data.map(item => ({
//       ...item,
//       percentage: totalSubdomains > 0 
//         ? ((item.itemCount / totalSubdomains) * 100).toFixed(1)
//         : '0.0'
//     }));
//   }, [zones, mode, zoneSubdomains, sbtZoneCounts, sbtZonesCount, loadingZoneId, loadingSbtZone]);

//   // Обработчик выбора зоны
//   const handleSelectZone = (zoneName: string) => {
//     onZoneChange(zoneName);
//     setIsOpen(false);
//     setSearchQuery('');
//   };

//   // Обработчик ввода в поиск
//   const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const value = e.target.value;
//     // Автоматически добавляем точку в начале если её нет
//     if (value && !value.startsWith('.')) {
//       setSearchQuery(`.${value}`);
//     } else {
//       setSearchQuery(value);
//     }
//   };

//   // Обработчик клика на инпут
//   const handleInputClick = () => {
//     setIsOpen(true);
//     if (!searchQuery && selectedZone) {
//       // Показываем выбранную зону в инпуте
//       const zoneName = selectedZone.split('.')[0];
//       setSearchQuery(`.${zoneName}`);
//     }
//   };

//   // Рассчитываем общую статистику
//   const totalSubdomains = useMemo(() => {
//     if (mode === 'proxy') {
//       return Object.values(zoneSubdomains).reduce((total, subs) => total + subs.length, 0);
//     } else {
//       // Для SBT: суммируем все counts
//       const allCounts = { ...sbtZoneCounts, ...sbtZonesCount };
//       return Object.values(allCounts).reduce((total, count) => total + count, 0);
//     }
//   }, [mode, zoneSubdomains, sbtZoneCounts, sbtZonesCount]);

//   // Рассчитываем количество загруженных зон
//   const loadedZonesCount = useMemo(() => {
//     if (mode === 'proxy') {
//       return Object.keys(zoneSubdomains).length;
//     } else {
//       // Для SBT: считаем зоны с известным количеством
//       const allCounts = { ...sbtZoneCounts, ...sbtZonesCount };
//       return Object.keys(allCounts).length;
//     }
//   }, [mode, zoneSubdomains, sbtZoneCounts, sbtZonesCount]);

//   return (
//     <div style={{ position: 'relative', width: '280px' }} ref={dropdownRef}>
//       {/* Номер шага */}
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

//       {/* Кастомный инпут */}
//       <div
//         onClick={handleInputClick}
//         style={{
//           width: '280px',
//           borderRadius: '25px',
//           padding: '10px 15px',
//           background: 'white',
//           border: `1px solid ${isOpen ? '#3b82f6' : '#ccc'}`,
//           cursor: 'pointer',
//           color: 'black',
//           fontFamily: 'monospace',
//           display: 'flex',
//           alignItems: 'center',
//           justifyContent: 'space-between',
//           minHeight: '44px',
//           boxSizing: 'border-box'
//         }}
//       >
//         <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
//           {selectedZoneInfo ? (
//             <>
//               <span style={{ 
//                 color: selectedZoneInfo.color,
//                 fontWeight: 'bold',
//                 marginRight: '8px'
//               }}>
//                 ●
//               </span>
//               <span style={{ 
//                 color: 'black',
//                 overflow: 'hidden',
//                 textOverflow: 'ellipsis',
//                 whiteSpace: 'nowrap',
//                 fontFamily: 'monospace'
//               }}>
//                 .{formatZoneName(selectedZoneInfo.name)}
//               </span>
//               {mode === 'sbt' && (
//                 <span style={{ 
//                   marginLeft: '8px',
//                   fontSize: '12px',
//                   color: '#666'
//                 }}>
//                   🔒
//                 </span>
//               )}
//               <div style={{ 
//                 marginLeft: 'auto',
//                 display: 'flex',
//                 alignItems: 'center',
//                 gap: '8px'
//               }}>
//                 <span style={{ 
//                   fontSize: '12px',
//                   fontWeight: 'bold',
//                   color: selectedZoneInfo.color,
//                   minWidth: '20px',
//                   textAlign: 'right'
//                 }}>
//                   {selectedZoneInfo.isLoading ? '...' : selectedZoneInfo.itemCount}
//                 </span>
//               </div>
//             </>
            
//           ) : (
//             <span style={{ color: '#999', fontFamily: 'monospace' }}>
//               {isLoading ? 'Loading zones...' : placeholder}
//             </span>
//           )}
//         </div>
        
//         {/* Стрелочка */}
//         <span style={{ 
//           marginLeft: '8px',
//           transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
//           transition: 'transform 0.2s',
//           color: '#666'
//         }}>
//           ▼
//         </span>
//       </div>

//       {/* Dropdown */}
//       {isOpen && (
//         <div style={{
//           position: 'absolute',
//           top: 'calc(100% + 4px)',
//           left: 0,
//           width: '280px',
//           background: 'white',
//           border: '1px solid #ccc',
//           borderRadius: '12px',
//           boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
//           maxHeight: '400px',
//           overflow: 'hidden',
//           zIndex: 1000,
//           display: 'flex',
//           flexDirection: 'column'
//         }}>
//           {/* Поисковая строка */}
//           <div style={{
//             padding: '12px',
//             borderBottom: '1px solid #f0f0f0',
//             // background: '#f9f9f9'
//             // background: 'linear-gradient(135deg, rgb(255, 215, 0) 0%, rgb(255, 165, 0) 100%)'
//             background: colors.primary
//           }}>
//             <div style={{
//               position: 'relative',
//               display: 'flex',
//               alignItems: 'center'
//             }}>
//               <span style={{
//                 position: 'absolute',
//                 left: '12px',
//                 color: '#666',
//                 fontSize: '14px',
//                 pointerEvents: 'none',
//                 fontFamily: 'monospace'
//               }}>
                
//               </span>
//               <input
//                 ref={inputRef}
//                 type="text"
//                 value={searchQuery}
//                 onChange={handleSearchChange}
//                 placeholder="Search zone..."
//                 style={{
//                   width: '100%',
//                   padding: '8px 8px 8px 20px',
//                   borderRadius: '6px',
//                   border: '1px solid #ddd',
//                   fontFamily: 'monospace',
//                   fontSize: '14px',
//                   outline: 'none',
//                   color: isDark ? 'white' : 'black'
//                 }}
//                 onClick={(e) => e.stopPropagation()}
//               />
//               {searchQuery && (
//                 <button
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     setSearchQuery('');
//                   }}
//                   style={{
//                     position: 'absolute',
//                     right: '8px',
//                     background: 'none',
//                     border: 'none',
//                     color: '#999',
//                     cursor: 'pointer',
//                     fontSize: '18px'
//                   }}
//                 >
//                   ×
//                 </button>
//               )}
//             </div>
//           </div>

//           {/* Шапка с заголовками */}
//           <div style={{
//             padding: '8px 12px',
//             borderBottom: '1px solid #e0e0e0',
//             // background: '#f5f5f5',

//             background: colors.primary,
//             display: 'grid',
//             gridTemplateColumns: '1fr auto auto',
//             gap: '8px',
//             alignItems: 'center',
//             fontSize: '11px',
//             fontWeight: 'bold',
//             color: isDark ? 'black' : 'white',
//             textTransform: 'uppercase',
//             letterSpacing: '0.5px'
//           }}>
//             <div style={{ textAlign: 'left' }}>Zone</div>
//             <div style={{ textAlign: 'center', minWidth: '50px' }}>Subdomains</div>
//             <div style={{ textAlign: 'right', minWidth: '40px' }}>% Supply</div>
//           </div>

//           {/* Список зон */}
//           <div style={{
//             flex: 1,
//             overflowY: 'auto',
//             maxHeight: '300px',
//             background: colors.primary,
//           }}>
//             {filteredZones.length === 0 ? (
//               <div style={{
//                 padding: '16px',
//                 textAlign: 'center',
//                 color: '#999',
//                 fontSize: '14px',
//                 fontFamily: 'monospace'
//               }}>
//                 No zones found
//               </div>
//             ) : (
//               filteredZones.map((zone) => {
//                 const zoneDataItem = zoneData.find(item => item.zone.id === zone.id);
//                 if (!zoneDataItem) return null;

//                 const { itemCount, percentage, isLoading } = zoneDataItem;
//                 const isSelected = zone.name === selectedZone;
//                 const isUserZone = zone.owner === userAddress;

//                 return (
//                   <div
//                     key={zone.id}
//                     onClick={() => handleSelectZone(zone.name)}
//                     style={{
//                       padding: '10px 12px',
//                       cursor: 'pointer',
//                       display: 'grid',
//                       gridTemplateColumns: '1fr auto auto',
//                       gap: '8px',
//                       alignItems: 'center',
//                       borderBottom: '1px solid #f5f5f5',
//                       backgroundColor: isDark ? "rgb(56 56 60)" : 'white',
//                       margin: '0px 10px 0px 10px'
//                     }}
//                   >
//                     {/* Имя зоны */}
//                     <div style={{
//                       textAlign: 'left',
//                       overflow: 'hidden',
//                       textOverflow: 'ellipsis',
//                       whiteSpace: 'nowrap',
//                       color: 'black',
//                       fontFamily: 'monospace',
//                       display: 'flex',
//                       alignItems: 'center',
//                       gap: '6px'
//                     }}>
//                       <span style={{
//                         width: '8px',
//                         height: '8px',
//                         borderRadius: '50%',
//                         backgroundColor: getItemCountColor(itemCount),
//                         flexShrink: 0
//                       }} />
//                       <span style={{color: isDark ? 'white' : 'black'}}>
//                         .{formatZoneName(zone.name)}
//                         {mode === 'sbt' && ' 🔒'}
//                       </span>
//                       {isUserZone && mode !== 'sbt' && <div className="ownLabel" style={{display: 'flex', alignItems: 'flex-end', justifyContent: 'left'}}><p style={{color: colors.accent, margin: 0}}>{t('yourZone')}</p></div>}
//                     </div>

//                     {/* Количество субдоменов */}
//                     <div style={{
//                       textAlign: 'center',
//                       fontSize: '13px',
//                       fontWeight: 'bold',
//                       color: getItemCountColor(itemCount),
//                       minWidth: '50px',
//                       fontFamily: 'monospace'
//                     }}>
//                       {isLoading ? '...' : itemCount}
//                     </div>

//                     {/* Процент */}
//                     <div style={{
//                       textAlign: 'right',
//                       fontSize: '13px',
//                       minWidth: '40px',
//                       fontFamily: 'monospace',
//                       color: isDark ? 'white' : 'black'
//                     }}>
//                       {percentage}%
//                     </div>
//                   </div>
//                 );
//               })
//             )}
//           </div>

//           {/* Статистика */}
//           {zones.length > 0 && (
//             <div style={{
//               padding: '8px 12px',
//               borderTop: '1px solid #f0f0f0',
//               background: colors.primary,
//               fontSize: '11px',
//               color: '#666',
//               display: 'flex',
//               justifyContent: 'space-between',
//               fontFamily: 'monospace'
//             }}>
//               <span style={{ color: isDark ? 'black' : 'white' }}>
//                 {filteredZones.length}/{zones.length} zones
//               </span>
//               <span style={{ color: isDark ? 'black' : 'white' }}>
//                 {totalSubdomains} total
//               </span>
//               {/* <span style={{ color: '#8b5cf6' }}>
//                 {loadedZonesCount}/{zones.length} loaded
//               </span> */}
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };




//с сортировкой

// src/components/AuctionCollectionSelector/CustomZoneSelector.tsx
// import React, { useState, useMemo, useRef, useEffect } from 'react';
// import { Zone, Subdomain, apiService } from '@/services/api';
// import { useLanguage } from '@/contexts/LanguageContext';

// interface CustomZoneSelectorProps {
//   zones: Zone[];
//   selectedZone: string;
//   onZoneChange: (zoneName: string) => void;
//   userAddress: string | null;
//   isDark: boolean;
//   placeholder?: string;
//   isLoading?: boolean;
//   isTestnet?: boolean;
//   mode?: 'proxy' | 'sbt';
//   // Для SBT: функция для загрузки субдоменов SBT зоны
//   loadSbtSubdomains?: (zoneName: string) => Promise<number>;
//   // Для SBT: уже загруженные количества (если есть)
//   sbtZonesCount?: Record<string, number>;
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
//   if (zone.length > 11) {
//     return `${zone.slice(0, 3)}...${zone.slice(-3)}`;
//   }
  
//   return zone;
// };

// // Типы сортировки
// type SortType = 'name' | 'subdomains';

// export const CustomZoneSelector: React.FC<CustomZoneSelectorProps> = ({
//   zones,
//   selectedZone,
//   onZoneChange,
//   userAddress,
//   isDark,
//   placeholder = 'Choose zone...',
//   isLoading = false,
//   isTestnet = false,
//   mode = 'proxy',
//   loadSbtSubdomains,
//   sbtZonesCount = {}
// }) => {
//   const [isOpen, setIsOpen] = useState(false);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [zoneSubdomains, setZoneSubdomains] = useState<Record<number, Subdomain[]>>({});
//   const [sbtZoneCounts, setSbtZoneCounts] = useState<Record<string, number>>({});
//   const [loadingZoneId, setLoadingZoneId] = useState<number | null>(null);
//   const [loadingSbtZone, setLoadingSbtZone] = useState<string | null>(null);
//   const [sortType, setSortType] = useState<SortType>('name');
//   const [showOnlyMyZones, setShowOnlyMyZones] = useState(false);
//   const dropdownRef = useRef<HTMLDivElement>(null);
//   const inputRef = useRef<HTMLInputElement>(null);
//   const { t } = useLanguage();

//   const themeColors = {
//     light: {
//       primary: "linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)",
//       accent: "#3B82F6",
//       background: "#FFFFFF",
//       text: "#1F2937",
//       border: "#E5E7EB",
//       secondaryBg: "#F9FAFB",
//       shadow: "rgba(59, 130, 246, 0.4)",
//       cyberpunk: "#3B82F6",
//       gold: "#FFD700",
//       blue: "#3B82F6",
//       link: "#3B82F6",
//       inputBg: "#FFFFFF",
//       inputBorder: "#D1D5DB",
//       inputText: "#1F2937",
//       dropdownBg: "#FFFFFF",
//       dropdownBorder: "#E5E7EB"
//     },
//     dark: {
//       primary: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
//       accent: "#FFD700",
//       background: "#121212",
//       text: "#E5E5E5",
//       border: "#333333",
//       secondaryBg: "#1A1A1A",
//       shadow: "rgba(255, 215, 0, 0.4)",
//       cyberpunk: "#FFD700",
//       gold: "#FFD700",
//       blue: "#00FFFF",
//       link: "#00FFFF",
//       inputBg: "#1A1A1A",
//       inputBorder: "#444444",
//       inputText: "#E5E5E5",
//       dropdownBg: "#1A1A1A",
//       dropdownBorder: "#444444"
//     }
//   };

//   const colors = themeColors[isDark ? "dark" : "light"];

//   // Закрываем dropdown при клике вне компонента
//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
//         setIsOpen(false);
//       }
//     };

//     document.addEventListener('mousedown', handleClickOutside);
//     return () => document.removeEventListener('mousedown', handleClickOutside);
//   }, []);

//   // Фокусируем инпут при открытии
//   useEffect(() => {
//     if (isOpen && inputRef.current) {
//       setTimeout(() => {
//         inputRef.current?.focus();
//       }, 100);
//     }
//   }, [isOpen]);

//   // Загружаем субдомены для Proxy зоны
//   const loadProxySubdomains = async (zoneId: number, zoneName: string) => {
//     if (zoneSubdomains[zoneId] !== undefined) return;

//     setLoadingZoneId(zoneId);
//     try {
//       apiService.setNetwork(isTestnet);
//       const subdomains = await apiService.getZoneSubdomains(zoneId);
//       setZoneSubdomains(prev => ({ ...prev, [zoneId]: subdomains }));
//       console.log(`✅ Loaded ${subdomains.length} subdomains for ${zoneName}`);
//     } catch (error) {
//       console.error(`❌ Error loading subdomains for ${zoneName}:`, error);
//       setZoneSubdomains(prev => ({ ...prev, [zoneId]: [] }));
//     } finally {
//       setLoadingZoneId(null);
//     }
//   };

//   // Загружаем количество субдоменов для SBT зоны
//   const loadSbtZoneCount = async (zoneName: string) => {
//     // Сначала проверяем sbtZonesCount (если передан как пропс)
//     if (sbtZonesCount[zoneName] !== undefined) {
//       console.log(`✅ Using sbtZonesCount for ${zoneName}: ${sbtZonesCount[zoneName]}`);
//       setSbtZoneCounts(prev => ({ ...prev, [zoneName]: sbtZonesCount[zoneName] }));
//       return;
//     }
    
//     // Затем проверяем уже загруженные в состоянии
//     if (sbtZoneCounts[zoneName] !== undefined || !loadSbtSubdomains) return;

//     setLoadingSbtZone(zoneName);
//     try {
//       const count = await loadSbtSubdomains(zoneName);
//       setSbtZoneCounts(prev => ({ ...prev, [zoneName]: count }));
//       console.log(`✅ Loaded ${count} SBT subdomains for ${zoneName}`);
//     } catch (error) {
//       console.error(`❌ Error loading SBT subdomains for ${zoneName}:`, error);
//       setSbtZoneCounts(prev => ({ ...prev, [zoneName]: 0 }));
//     } finally {
//       setLoadingSbtZone(null);
//     }
//   };

//   // Загружаем данные для ВСЕХ зон при открытии dropdown
//   useEffect(() => {
//     if (isOpen && zones.length > 0) {
//       console.log(`🔄 Loading data for ${zones.length} zones (mode: ${mode})`);
      
//       if (mode === 'proxy') {
//         // Для Proxy: загружаем субдомены для всех зон
//         zones.forEach(zone => {
//           if (zone.id && !zoneSubdomains[zone.id]) {
//             loadProxySubdomains(zone.id, zone.name);
//           }
//         });
//       } else if (mode === 'sbt') {
//         // Для SBT: загружаем количество для всех зон
//         zones.forEach(zone => {
//           // Если уже есть в sbtZonesCount пропсе, используем его
//           if (sbtZonesCount && sbtZonesCount[zone.name] !== undefined) {
//             console.log(`✅ Using preloaded count for ${zone.name}: ${sbtZonesCount[zone.name]}`);
//             setSbtZoneCounts(prev => ({ 
//               ...prev, 
//               [zone.name]: sbtZonesCount[zone.name] 
//             }));
//           } 
//           // Иначе загружаем через функцию
//           else if (loadSbtSubdomains && sbtZoneCounts[zone.name] === undefined) {
//             loadSbtZoneCount(zone.name);
//           }
//         });
//       }
//     }
//   }, [isOpen, zones, mode, sbtZonesCount]);

//   // Получаем количество субдоменов для зоны
//   const getZoneSubdomainCount = (zone: Zone): number => {
//     if (mode === 'proxy') {
//       const subdomains = zoneSubdomains[zone.id] || [];
//       return subdomains.length;
//     } else {
//       return sbtZoneCounts[zone.name] || sbtZonesCount?.[zone.name] || 0;
//     }
//   };

//   // Фильтруем и сортируем зоны
//   const filteredAndSortedZones = useMemo(() => {
//     let result = zones;

//     // Фильтрация по поисковому запросу
//     if (searchQuery.trim()) {
//       const query = searchQuery.toLowerCase().replace(/^\./, ''); // Убираем точку в начале если есть
//       result = result.filter(zone => {
//         const zoneName = zone.name?.toLowerCase() || '';
//         return zoneName.includes(query);
//       });
//     }

//     // Фильтрация "My zones"
//     if (showOnlyMyZones && userAddress) {
//       result = result.filter(zone => zone.owner === userAddress);
//     }

//     // Сортировка
//     result = [...result].sort((a, b) => {
//       if (sortType === 'name') {
//         // Сортировка по длине имени (от коротких к длинным)
//         const nameA = a.name?.split('.')[0] || '';
//         const nameB = b.name?.split('.')[0] || '';
//         return nameA.length - nameB.length;
//       } else {
//         // Сортировка по количеству субдоменов (от большего к меньшему)
//         const countA = getZoneSubdomainCount(a);
//         const countB = getZoneSubdomainCount(b);
//         return countB - countA;
//       }
//     });

//     return result;
//   }, [zones, searchQuery, showOnlyMyZones, userAddress, sortType, mode, zoneSubdomains, sbtZoneCounts, sbtZonesCount]);

//   // Получаем информацию о выбранной зоне
//   const selectedZoneInfo = useMemo(() => {
//     if (!selectedZone) return null;
//     const zone = zones.find(z => z.name === selectedZone);
//     if (!zone) return null;

//     let itemCount = 0;
//     let isLoading = false;

//     if (mode === 'proxy') {
//       const subdomains = zoneSubdomains[zone.id] || [];
//       itemCount = subdomains.length;
//       isLoading = loadingZoneId === zone.id;
//     } else {
//       // Для SBT: используем sbtZoneCounts или sbtZonesCount пропс
//       itemCount = sbtZoneCounts[zone.name] || sbtZonesCount?.[zone.name] || 0;
//       isLoading = loadingSbtZone === zone.name;
//     }

//     return {
//       ...zone,
//       itemCount,
//       isLoading,
//       color: getItemCountColor(itemCount)
//     };
//   }, [selectedZone, zones, mode, zoneSubdomains, sbtZoneCounts, sbtZonesCount, loadingZoneId, loadingSbtZone]);

//   // Рассчитываем проценты для всех зон
//   const zoneData = useMemo(() => {
//     let totalSubdomains = 0;
    
//     // Сначала собираем все данные
//     const data = filteredAndSortedZones.map(zone => {
//       let itemCount = 0;
      
//       if (mode === 'proxy') {
//         const subdomains = zoneSubdomains[zone.id] || [];
//         itemCount = subdomains.length;
//       } else {
//         // Для SBT: используем sbtZoneCounts или sbtZonesCount пропс
//         itemCount = sbtZoneCounts[zone.name] || sbtZonesCount?.[zone.name] || 0;
//       }
      
//       totalSubdomains += itemCount;
      
//       return {
//         zone,
//         itemCount,
//         isLoading: mode === 'proxy' 
//           ? loadingZoneId === zone.id 
//           : loadingSbtZone === zone.name
//       };
//     });
    
//     // Затем рассчитываем проценты
//     return data.map(item => ({
//       ...item,
//       percentage: totalSubdomains > 0 
//         ? ((item.itemCount / totalSubdomains) * 100).toFixed(1)
//         : '0.0'
//     }));
//   }, [filteredAndSortedZones, mode, zoneSubdomains, sbtZoneCounts, sbtZonesCount, loadingZoneId, loadingSbtZone]);

//   // Обработчик выбора зоны
//   const handleSelectZone = (zoneName: string) => {
//     onZoneChange(zoneName);
//     setIsOpen(false);
//     setSearchQuery('');
//   };

//   // Обработчик ввода в поиск
//   const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const value = e.target.value;
//     // Автоматически добавляем точку в начале если её нет
//     if (value && !value.startsWith('.')) {
//       setSearchQuery(`.${value}`);
//     } else {
//       setSearchQuery(value);
//     }
//   };

//   // Обработчик клика на инпут
//   const handleInputClick = () => {
//     setIsOpen(true);
//     if (!searchQuery && selectedZone) {
//       // Показываем выбранную зону в инпуте
//       const zoneName = selectedZone.split('.')[0];
//       setSearchQuery(`.${zoneName}`);
//     }
//   };

//   // Рассчитываем общую статистику
//   const totalSubdomains = useMemo(() => {
//     if (mode === 'proxy') {
//       return Object.values(zoneSubdomains).reduce((total, subs) => total + subs.length, 0);
//     } else {
//       // Для SBT: суммируем все counts
//       const allCounts = { ...sbtZoneCounts, ...sbtZonesCount };
//       return Object.values(allCounts).reduce((total, count) => total + count, 0);
//     }
//   }, [mode, zoneSubdomains, sbtZoneCounts, sbtZonesCount]);

//   // Рассчитываем количество загруженных зон
//   const loadedZonesCount = useMemo(() => {
//     if (mode === 'proxy') {
//       return Object.keys(zoneSubdomains).length;
//     } else {
//       // Для SBT: считаем зоны с известным количеством
//       const allCounts = { ...sbtZoneCounts, ...sbtZonesCount };
//       return Object.keys(allCounts).length;
//     }
//   }, [mode, zoneSubdomains, sbtZoneCounts, sbtZonesCount]);

//   // Обработчик переключения сортировки
//   const handleSortToggle = (type: SortType) => {
//     setSortType(type);
//   };

//   // Обработчик переключения чекбокса "My"
//   const handleMyZonesToggle = () => {
//     setShowOnlyMyZones(!showOnlyMyZones);
//   };

//   return (
//     <div style={{ position: 'relative', width: '280px' }} ref={dropdownRef}>
//       {/* Номер шага */}
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

//       {/* Кастомный инпут */}
//       <div
//         onClick={handleInputClick}
//         style={{
//           width: '280px',
//           borderRadius: '25px',
//           padding: '10px 15px',
//           background: 'white',
//           border: `1px solid ${isOpen ? '#3b82f6' : '#ccc'}`,
//           cursor: 'pointer',
//           color: 'black',
//           fontFamily: 'monospace',
//           display: 'flex',
//           alignItems: 'center',
//           justifyContent: 'space-between',
//           minHeight: '44px',
//           boxSizing: 'border-box'
//         }}
//       >
//         <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
//           {selectedZoneInfo ? (
//             <>
//               <span style={{ 
//                 color: selectedZoneInfo.color,
//                 fontWeight: 'bold',
//                 marginRight: '8px'
//               }}>
//                 ●
//               </span>
//               <span style={{ 
//                 color: 'black',
//                 overflow: 'hidden',
//                 textOverflow: 'ellipsis',
//                 whiteSpace: 'nowrap',
//                 fontFamily: 'monospace'
//               }}>
//                 .{formatZoneName(selectedZoneInfo.name)}
//               </span>
//               {mode === 'sbt' && (
//                 <span style={{ 
//                   marginLeft: '8px',
//                   fontSize: '12px',
//                   color: '#666'
//                 }}>
//                   🔒
//                 </span>
//               )}
//               <div style={{ 
//                 marginLeft: 'auto',
//                 display: 'flex',
//                 alignItems: 'center',
//                 gap: '8px'
//               }}>
//                 <span style={{ 
//                   fontSize: '12px',
//                   fontWeight: 'bold',
//                   color: selectedZoneInfo.color,
//                   minWidth: '20px',
//                   textAlign: 'right'
//                 }}>
//                   {selectedZoneInfo.isLoading ? '...' : selectedZoneInfo.itemCount}
//                 </span>
//               </div>
//             </>
            
//           ) : (
//             <span style={{ color: '#999', fontFamily: 'monospace' }}>
//               {isLoading ? 'Loading zones...' : placeholder}
//             </span>
//           )}
//         </div>
        
//         {/* Стрелочка */}
//         <span style={{ 
//           marginLeft: '8px',
//           transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
//           transition: 'transform 0.2s',
//           color: '#666'
//         }}>
//           ▼
//         </span>
//       </div>

//       {/* Dropdown */}
//       {isOpen && (
//         <div style={{
//           position: 'absolute',
//           top: 'calc(100% + 4px)',
//           left: 0,
//           width: '280px',
//           background: 'white',
//           border: '1px solid #ccc',
//           borderRadius: '12px',
//           boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
//           maxHeight: '400px',
//           overflow: 'hidden',
//           zIndex: 1000,
//           display: 'flex',
//           flexDirection: 'column'
//         }}>
//           {/* Поисковая строка */}
//           <div style={{
//             padding: '12px',
//             borderBottom: '1px solid #f0f0f0',
//             background: colors.primary
//           }}>
//             <div style={{
//               position: 'relative',
//               display: 'flex',
//               alignItems: 'center'
//             }}>
//               <span style={{
//                 position: 'absolute',
//                 left: '12px',
//                 color: '#666',
//                 fontSize: '14px',
//                 pointerEvents: 'none',
//                 fontFamily: 'monospace'
//               }}>
                
//               </span>
//               <input
//                 ref={inputRef}
//                 type="text"
//                 value={searchQuery}
//                 onChange={handleSearchChange}
//                 placeholder="Search zone..."
//                 style={{
//                   width: '100%',
//                   padding: '8px 8px 8px 20px',
//                   borderRadius: '6px',
//                   border: '1px solid #ddd',
//                   fontFamily: 'monospace',
//                   fontSize: '14px',
//                   outline: 'none',
//                   color: isDark ? 'white' : 'black'
//                 }}
//                 onClick={(e) => e.stopPropagation()}
//               />
//               {searchQuery && (
//                 <button
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     setSearchQuery('');
//                   }}
//                   style={{
//                     position: 'absolute',
//                     right: '8px',
//                     background: 'none',
//                     border: 'none',
//                     color: '#999',
//                     cursor: 'pointer',
//                     fontSize: '18px'
//                   }}
//                 >
//                   ×
//                 </button>
//               )}
//             </div>

//             {/* Кнопки сортировки и чекбокс */}
//             <div style={{
//               display: 'grid',
//               gridTemplateColumns: '1fr 1fr',
//               gap: '8px',
//               marginTop: '8px'
//             }}>
//               {/* Кнопка сортировки по Name */}
//               <button
//                 onClick={() => handleSortToggle('name')}
//                 style={{
//                   padding: '6px 8px',
//                   borderRadius: '6px',
//                   border: `1px solid ${sortType === 'name' ? colors.accent : '#ddd'}`,
//                   background: sortType === 'name' ? colors.accent : 'white',
//                   color: sortType === 'name' ? 'white' : 'black',
//                   cursor: 'pointer',
//                   fontSize: '12px',
//                   fontWeight: 'bold',
//                   display: 'flex',
//                   alignItems: 'center',
//                   justifyContent: 'center',
//                   gap: '4px',
//                   fontFamily: 'monospace'
//                 }}
//               >
//                 <span>📏</span>
//                 <span>Name</span>
//               </button>

//               {/* Кнопка сортировки по Subdomains */}
//               <button
//                 onClick={() => handleSortToggle('subdomains')}
//                 style={{
//                   padding: '6px 8px',
//                   borderRadius: '6px',
//                   border: `1px solid ${sortType === 'subdomains' ? colors.accent : '#ddd'}`,
//                   background: isDark ? 'black' : 'white' ,
//                   color: isDark ? 'white' : 'black' ,
//                   cursor: 'pointer',
//                   fontSize: '12px',
//                   fontWeight: 'bold',
//                   display: 'flex',
//                   alignItems: 'center',
//                   justifyContent: 'center',
//                   gap: '4px',
//                   fontFamily: 'monospace'
//                 }}
//               >
//                 <span>🔢</span>
//                 <span>Subdomains</span>
//               </button>
//             </div>

//             {/* Чекбокс "My" */}
//             <div style={{
//               marginTop: '8px',
//               display: 'flex',
//               alignItems: 'center',
//               gap: '6px'
//             }}>
//               <input
//                 type="checkbox"
//                 id="my-zones-checkbox"
//                 checked={showOnlyMyZones}
//                 onChange={handleMyZonesToggle}
//                 style={{
//                   cursor: 'pointer'
//                 }}
//               />
//               <label 
//                 htmlFor="my-zones-checkbox"
//                 style={{
//                   fontSize: '12px',
//                   color: isDark ? 'white' : 'black',
//                   cursor: 'pointer',
//                   fontFamily: 'monospace'
//                 }}
//               >
//                 My zones only
//               </label>
//             </div>
//           </div>

//           {/* Шапка с заголовками */}
//           <div style={{
//             padding: '8px 12px',
//             borderBottom: '1px solid #e0e0e0',
//             background: colors.primary,
//             display: 'grid',
//             gridTemplateColumns: '1fr auto auto',
//             gap: '8px',
//             alignItems: 'center',
//             fontSize: '11px',
//             fontWeight: 'bold',
//             color: isDark ? 'black' : 'white',
//             textTransform: 'uppercase',
//             letterSpacing: '0.5px'
//           }}>
//             <div style={{ textAlign: 'left' }}>Zone</div>
//             <div style={{ textAlign: 'center', minWidth: '50px' }}>Subdomains</div>
//             <div style={{ textAlign: 'right', minWidth: '40px' }}>% Supply</div>
//           </div>

//           {/* Список зон */}
//           <div style={{
//             flex: 1,
//             overflowY: 'auto',
//             maxHeight: '300px',
//             background: colors.primary,
//           }}>
//             {filteredAndSortedZones.length === 0 ? (
//               <div style={{
//                 padding: '16px',
//                 textAlign: 'center',
//                 color: '#999',
//                 fontSize: '14px',
//                 fontFamily: 'monospace'
//               }}>
//                 {showOnlyMyZones && userAddress ? 'No your zones found' : 'No zones found'}
//               </div>
//             ) : (
//               filteredAndSortedZones.map((zone) => {
//                 const zoneDataItem = zoneData.find(item => item.zone.id === zone.id);
//                 if (!zoneDataItem) return null;

//                 const { itemCount, percentage, isLoading } = zoneDataItem;
//                 const isSelected = zone.name === selectedZone;
//                 const isUserZone = zone.owner === userAddress;

//                 return (
//                   <div
//                     key={zone.id}
//                     onClick={() => handleSelectZone(zone.name)}
//                     style={{
//                       padding: '10px 12px',
//                       cursor: 'pointer',
//                       display: 'grid',
//                       gridTemplateColumns: '1fr auto auto',
//                       gap: '8px',
//                       alignItems: 'center',
//                       borderBottom: '1px solid #f5f5f5',
//                       backgroundColor: isDark ? "rgb(56 56 60)" : 'white',
//                       margin: '0px 10px 0px 10px'
//                     }}
//                   >
//                     {/* Имя зоны */}
//                     <div style={{
//                       textAlign: 'left',
//                       overflow: 'hidden',
//                       textOverflow: 'ellipsis',
//                       whiteSpace: 'nowrap',
//                       color: 'black',
//                       fontFamily: 'monospace',
//                       display: 'flex',
//                       alignItems: 'center',
//                       gap: '6px'
//                     }}>
//                       <span style={{
//                         width: '8px',
//                         height: '8px',
//                         borderRadius: '50%',
//                         backgroundColor: getItemCountColor(itemCount),
//                         flexShrink: 0
//                       }} />
//                       <span style={{color: isDark ? 'white' : 'black'}}>
//                         .{formatZoneName(zone.name)}
//                         {mode === 'sbt' && ' 🔒'}
//                       </span>
//                       {isUserZone && mode !== 'sbt' && <div className="ownLabel" style={{display: 'flex', alignItems: 'flex-end', justifyContent: 'left'}}><p style={{color: colors.accent, margin: 0}}>{t('yourZone')}</p></div>}
//                     </div>

//                     {/* Количество субдоменов */}
//                     <div style={{
//                       textAlign: 'center',
//                       fontSize: '13px',
//                       fontWeight: 'bold',
//                       color: getItemCountColor(itemCount),
//                       minWidth: '50px',
//                       fontFamily: 'monospace'
//                     }}>
//                       {isLoading ? '...' : itemCount}
//                     </div>

//                     {/* Процент */}
//                     <div style={{
//                       textAlign: 'right',
//                       fontSize: '13px',
//                       minWidth: '40px',
//                       fontFamily: 'monospace',
//                       color: isDark ? 'white' : 'black'
//                     }}>
//                       {percentage}%
//                     </div>
//                   </div>
//                 );
//               })
//             )}
//           </div>

//           {/* Статистика */}
//           {zones.length > 0 && (
//             <div style={{
//               padding: '8px 12px',
//               borderTop: '1px solid #f0f0f0',
//               background: colors.primary,
//               fontSize: '11px',
//               color: '#666',
//               display: 'flex',
//               justifyContent: 'space-between',
//               fontFamily: 'monospace'
//             }}>
//               <span style={{ color: isDark ? 'black' : 'white' }}>
//                 {filteredAndSortedZones.length}/{zones.length} zones
//               </span>
//               <span style={{ color: isDark ? 'black' : 'white' }}>
//                 {totalSubdomains} total
//               </span>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

//с сортировкой туда сюда

// src/components/AuctionCollectionSelector/CustomZoneSelector.tsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Zone, Subdomain, apiService } from '@/services/api';
import { useLanguage } from '@/contexts/LanguageContext';

interface CustomZoneSelectorProps {
  zones: Zone[];
  selectedZone: string;
  onZoneChange: (zoneName: string) => void;
  userAddress: string | null;
  isDark: boolean;
  placeholder?: string;
  isLoading?: boolean;
  isTestnet?: boolean;
  mode?: 'proxy' | 'sbt';
  // Для SBT: функция для загрузки субдоменов SBT зоны
  loadSbtSubdomains?: (zoneName: string) => Promise<number>;
  // Для SBT: уже загруженные количества (если есть)
  sbtZonesCount?: Record<string, number>;
}

// Утилиты для форматирования и цветов
const getItemCountColor = (count: number): string => {
  if (count === 0) return '#888'; // серый
  if (count >= 1 && count <= 10) return '#10b981'; // зеленый
  if (count >= 11 && count <= 50) return '#3b82f6'; // синий
  if (count >= 51 && count <= 250) return '#8b5cf6'; // фиолетовый/сиреневый
  if (count >= 251 && count <= 500) return '#f59e0b'; // золотой
  return '#f97316'; // оранжевый (500+)
};

const formatZoneName = (zoneName: string): string => {
  if (!zoneName) return '';
  
  // Извлекаем имя зоны (без .ton)
  const zone = zoneName.split('.')[0];
  
  // Если длина зоны больше 9 символов, обрезаем с троеточием
  if (zone.length > 11) {
    return `${zone.slice(0, 3)}...${zone.slice(-3)}`;
  }
  
  return zone;
};

// Типы сортировки
type SortType = 'name' | 'subdomains' | 'date';
type SortDirection = 'asc' | 'desc';

interface SortState {
  type: SortType;
  direction: SortDirection;
}

export const CustomZoneSelector: React.FC<CustomZoneSelectorProps> = ({
  zones,
  selectedZone,
  onZoneChange,
  userAddress,
  isDark,
  placeholder = 'Choose zone...',
  isLoading = false,
  isTestnet = false,
  mode = 'proxy',
  loadSbtSubdomains,
  sbtZonesCount = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoneSubdomains, setZoneSubdomains] = useState<Record<number, Subdomain[]>>({});
  const [sbtZoneCounts, setSbtZoneCounts] = useState<Record<string, number>>({});
  const [loadingZoneId, setLoadingZoneId] = useState<number | null>(null);
  const [loadingSbtZone, setLoadingSbtZone] = useState<string | null>(null);
  const [sortState, setSortState] = useState<SortState>({ type: 'name', direction: 'asc' });
  const [showOnlyMyZones, setShowOnlyMyZones] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  const themeColors = {
    light: {
      primary: "linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)",
      accent: "#3B82F6",
      background: "#FFFFFF",
      text: "#1F2937",
      border: "#E5E7EB",
      secondaryBg: "#F9FAFB",
      shadow: "rgba(59, 130, 246, 0.4)",
      cyberpunk: "#3B82F6",
      gold: "#FFD700",
      blue: "#3B82F6",
      link: "#3B82F6",
      inputBg: "#FFFFFF",
      inputBorder: "#D1D5DB",
      inputText: "#1F2937",
      dropdownBg: "#FFFFFF",
      dropdownBorder: "#E5E7EB"
    },
    dark: {
      primary: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
      accent: "#FFD700",
      background: "#121212",
      text: "#E5E5E5",
      border: "#333333",
      secondaryBg: "#1A1A1A",
      shadow: "rgba(255, 215, 0, 0.4)",
      cyberpunk: "#FFD700",
      gold: "#FFD700",
      blue: "#00FFFF",
      link: "#00FFFF",
      inputBg: "#1A1A1A",
      inputBorder: "#444444",
      inputText: "#E5E5E5",
      dropdownBg: "#1A1A1A",
      dropdownBorder: "#444444"
    }
  };

  const colors = themeColors[isDark ? "dark" : "light"];

  // Закрываем dropdown при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Фокусируем инпут при открытии
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Загружаем субдомены для Proxy зоны
  const loadProxySubdomains = async (zoneId: number, zoneName: string) => {
    if (zoneSubdomains[zoneId] !== undefined) return;

    setLoadingZoneId(zoneId);
    try {
      apiService.setNetwork(isTestnet);
      const subdomains = await apiService.getZoneSubdomains(zoneId);
      setZoneSubdomains(prev => ({ ...prev, [zoneId]: subdomains }));
      console.log(`✅ Loaded ${subdomains.length} subdomains for ${zoneName}`);
    } catch (error) {
      console.error(`❌ Error loading subdomains for ${zoneName}:`, error);
      setZoneSubdomains(prev => ({ ...prev, [zoneId]: [] }));
    } finally {
      setLoadingZoneId(null);
    }
  };

  // Загружаем количество субдоменов для SBT зоны
  const loadSbtZoneCount = async (zoneName: string) => {
    // Сначала проверяем sbtZonesCount (если передан как пропс)
    if (sbtZonesCount[zoneName] !== undefined) {
      console.log(`✅ Using sbtZonesCount for ${zoneName}: ${sbtZonesCount[zoneName]}`);
      setSbtZoneCounts(prev => ({ ...prev, [zoneName]: sbtZonesCount[zoneName] }));
      return;
    }
    
    // Затем проверяем уже загруженные в состоянии
    if (sbtZoneCounts[zoneName] !== undefined || !loadSbtSubdomains) return;

    setLoadingSbtZone(zoneName);
    try {
      const count = await loadSbtSubdomains(zoneName);
      setSbtZoneCounts(prev => ({ ...prev, [zoneName]: count }));
      console.log(`✅ Loaded ${count} SBT subdomains for ${zoneName}`);
    } catch (error) {
      console.error(`❌ Error loading SBT subdomains for ${zoneName}:`, error);
      setSbtZoneCounts(prev => ({ ...prev, [zoneName]: 0 }));
    } finally {
      setLoadingSbtZone(null);
    }
  };

  // Загружаем данные для ВСЕХ зон при открытии dropdown
  useEffect(() => {
    if (isOpen && zones.length > 0) {
      console.log(`🔄 Loading data for ${zones.length} zones (mode: ${mode})`);
      
      if (mode === 'proxy') {
        // Для Proxy: загружаем субдомены для всех зон
        zones.forEach(zone => {
          if (zone.id && !zoneSubdomains[zone.id]) {
            loadProxySubdomains(zone.id, zone.name);
          }
        });
      } else if (mode === 'sbt') {
        // Для SBT: загружаем количество для всех зоны
        zones.forEach(zone => {
          // Если уже есть в sbtZonesCount пропсе, используем его
          if (sbtZonesCount && sbtZonesCount[zone.name] !== undefined) {
            console.log(`✅ Using preloaded count for ${zone.name}: ${sbtZonesCount[zone.name]}`);
            setSbtZoneCounts(prev => ({ 
              ...prev, 
              [zone.name]: sbtZonesCount[zone.name] 
            }));
          } 
          // Иначе загружаем через функцию
          else if (loadSbtSubdomains && sbtZoneCounts[zone.name] === undefined) {
            loadSbtZoneCount(zone.name);
          }
        });
      }
    }
  }, [isOpen, zones, mode, sbtZonesCount]);

  // Получаем количество субдоменов для зоны
  const getZoneSubdomainCount = (zone: Zone): number => {
    if (mode === 'proxy') {
      const subdomains = zoneSubdomains[zone.id] || [];
      return subdomains.length;
    } else {
      return sbtZoneCounts[zone.name] || sbtZonesCount?.[zone.name] || 0;
    }
  };

  // Получаем дату зоны (если есть)
  const getZoneDate = (zone: Zone): number => {
    // Используем created_at если есть, иначе используем id как timestamp
    if (zone.createdAt) {
      return new Date(zone.createdAt).getTime();
    }
    // Если нет даты, используем id как fallback
    return zone.id || 0;
  };

  // Фильтруем и сортируем зоны
  const filteredAndSortedZones = useMemo(() => {
    let result = zones;

    // Фильтрация по поисковому запросу
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().replace(/^\./, ''); // Убираем точку в начале если есть
      result = result.filter(zone => {
        const zoneName = zone.name?.toLowerCase() || '';
        return zoneName.includes(query);
      });
    }

    // Фильтрация "My zones"
    if (showOnlyMyZones && userAddress) {
      result = result.filter(zone => zone.owner === userAddress);
    }

    // Сортировка
    result = [...result].sort((a, b) => {
      const { type, direction } = sortState;
      const multiplier = direction === 'asc' ? 1 : -1;

      switch (type) {
        case 'name': {
          // Сортировка по длине имени
          const nameA = a.name?.split('.')[0] || '';
          const nameB = b.name?.split('.')[0] || '';
          return (nameA.length - nameB.length) * multiplier;
        }
        
        case 'subdomains': {
          // Сортировка по количеству субдоменов
          const countA = getZoneSubdomainCount(a);
          const countB = getZoneSubdomainCount(b);
          return (countA - countB) * multiplier;
        }
        
        case 'date': {
          // Сортировка по дате (created_at или id)
          const dateA = getZoneDate(a);
          const dateB = getZoneDate(b);
          return (dateA - dateB) * multiplier;
        }
        
        default:
          return 0;
      }
    });

    return result;
  }, [zones, searchQuery, showOnlyMyZones, userAddress, sortState, mode, zoneSubdomains, sbtZoneCounts, sbtZonesCount]);

  // Получаем информацию о выбранной зоне
  const selectedZoneInfo = useMemo(() => {
    if (!selectedZone) return null;
    const zone = zones.find(z => z.name === selectedZone);
    if (!zone) return null;

    let itemCount = 0;
    let isLoading = false;

    if (mode === 'proxy') {
      const subdomains = zoneSubdomains[zone.id] || [];
      itemCount = subdomains.length;
      isLoading = loadingZoneId === zone.id;
    } else {
      // Для SBT: используем sbtZoneCounts или sbtZonesCount пропс
      itemCount = sbtZoneCounts[zone.name] || sbtZonesCount?.[zone.name] || 0;
      isLoading = loadingSbtZone === zone.name;
    }

    return {
      ...zone,
      itemCount,
      isLoading,
      color: getItemCountColor(itemCount)
    };
  }, [selectedZone, zones, mode, zoneSubdomains, sbtZoneCounts, sbtZonesCount, loadingZoneId, loadingSbtZone]);

  // Рассчитываем проценты для всех зон
  const zoneData = useMemo(() => {
    let totalSubdomains = 0;
    
    // Сначала собираем все данные
    const data = filteredAndSortedZones.map(zone => {
      let itemCount = 0;
      
      if (mode === 'proxy') {
        const subdomains = zoneSubdomains[zone.id] || [];
        itemCount = subdomains.length;
      } else {
        // Для SBT: используем sbtZoneCounts или sbtZonesCount пропс
        itemCount = sbtZoneCounts[zone.name] || sbtZonesCount?.[zone.name] || 0;
      }
      
      totalSubdomains += itemCount;
      
      return {
        zone,
        itemCount,
        isLoading: mode === 'proxy' 
          ? loadingZoneId === zone.id 
          : loadingSbtZone === zone.name
      };
    });
    
    // Затем рассчитываем проценты
    return data.map(item => ({
      ...item,
      percentage: totalSubdomains > 0 
        ? ((item.itemCount / totalSubdomains) * 100).toFixed(1)
        : '0.0'
    }));
  }, [filteredAndSortedZones, mode, zoneSubdomains, sbtZoneCounts, sbtZonesCount, loadingZoneId, loadingSbtZone]);

  // Обработчик выбора зоны
  const handleSelectZone = (zoneName: string) => {
    onZoneChange(zoneName);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Обработчик ввода в поиск
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Автоматически добавляем точку в начале если её нет
    if (value && !value.startsWith('.')) {
      setSearchQuery(`.${value}`);
    } else {
      setSearchQuery(value);
    }
  };

  // Обработчик клика на инпут
  const handleInputClick = () => {
    setIsOpen(true);
    if (!searchQuery && selectedZone) {
      // Показываем выбранную зону в инпуте
      const zoneName = selectedZone.split('.')[0];
      setSearchQuery(`.${zoneName}`);
    }
  };

  // Рассчитываем общую статистику
  const totalSubdomains = useMemo(() => {
    if (mode === 'proxy') {
      return Object.values(zoneSubdomains).reduce((total, subs) => total + subs.length, 0);
    } else {
      // Для SBT: суммируем все counts
      const allCounts = { ...sbtZoneCounts, ...sbtZonesCount };
      return Object.values(allCounts).reduce((total, count) => total + count, 0);
    }
  }, [mode, zoneSubdomains, sbtZoneCounts, sbtZonesCount]);

  // Рассчитываем количество загруженных зон
  // const loadedZonesCount = useMemo(() => {
  //   if (mode === 'proxy') {
  //     return Object.keys(zoneSubdomains).length;
  //   } else {
  //     // Для SBT: считаем зоны с известным количеством
  //     const allCounts = { ...sbtZoneCounts, ...sbtZonesCount };
  //     return Object.keys(allCounts).length;
  //   }
  // }, [mode, zoneSubdomains, sbtZoneCounts, sbtZonesCount]);

  // Обработчик переключения сортировки
  const handleSortToggle = (type: SortType) => {
    setSortState(prev => {
      if (prev.type === type) {
        // Если кликаем на ту же кнопку - меняем направление
        return {
          type,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        };
      } else {
        // Если кликаем на другую кнопку - устанавливаем новую сортировку с asc по умолчанию
        return {
          type,
          direction: 'asc'
        };
      }
    });
  };

  // Обработчик переключения чекбокса "My"
  const handleMyZonesToggle = () => {
    setShowOnlyMyZones(!showOnlyMyZones);
  };

  // Получаем иконку для сортировки
  const getSortIcon = (type: SortType, direction: SortDirection): string => {
    if (sortState.type !== type) {
      // Если это не активная сортировка - показываем нейтральную иконку
      switch (type) {
        case 'name': return '📏';
        case 'subdomains': return '🔢';
        case 'date': return '📅';
        default: return '📏';
      }
    }
    
    // Если это активная сортировка - показываем направление
    if (direction === 'asc') {
      switch (type) {
        case 'name': return '📏↑';
        case 'subdomains': return '🔢↑';
        case 'date': return '📅↑';
        default: return '📏↑';
      }
    } else {
      switch (type) {
        case 'name': return '📏↓';
        case 'subdomains': return '🔢↓';
        case 'date': return '📅↓';
        default: return '📏↓';
      }
    }
  };

  // Получаем текст для кнопки сортировки
  const getSortButtonText = (type: SortType): string => {
    switch (type) {
      case 'name': return 'Name';
      case 'subdomains': return 'Subdomains';
      case 'date': return 'Date';
      default: return '';
    }
  };

  return (
    <div style={{ position: 'relative', width: '280px' }} ref={dropdownRef}>
      {/* Номер шага */}
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

      {/* Кастомный инпут */}
      <div
        onClick={handleInputClick}
        style={{
          width: '280px',
          borderRadius: '25px',
          padding: '10px 15px',
          background: 'white',
          border: `1px solid ${isOpen ? '#3b82f6' : '#ccc'}`,
          cursor: 'pointer',
          color: 'black',
          fontFamily: 'monospace',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: '44px',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
          {selectedZoneInfo ? (
            <>
              <span style={{ 
                color: selectedZoneInfo.color,
                fontWeight: 'bold',
                marginRight: '8px'
              }}>
                ●
              </span>
              <span style={{ 
                color: 'black',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: 'monospace'
              }}>
                .{formatZoneName(selectedZoneInfo.name)}
              </span>
              {mode === 'sbt' && (
                <span style={{ 
                  marginLeft: '8px',
                  fontSize: '12px',
                  color: '#666'
                }}>
                  🔒
                </span>
              )}
              <div style={{ 
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ 
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: selectedZoneInfo.color,
                  minWidth: '20px',
                  textAlign: 'right'
                }}>
                  {selectedZoneInfo.isLoading ? '...' : selectedZoneInfo.itemCount}
                </span>
              </div>
            </>
            
          ) : (
            <span style={{ color: '#999', fontFamily: 'monospace' }}>
              {isLoading ? 'Loading zones...' : placeholder}
            </span>
          )}
        </div>
        
        {/* Стрелочка */}
        <span style={{ 
          marginLeft: '8px',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          color: '#666'
        }}>
          ▼
        </span>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          width: '280px',
          background: 'white',
          border: '1px solid #ccc',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          maxHeight: '400px',
          overflow: 'hidden',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Поисковая строка */}
          <div style={{
            padding: '12px',
            borderBottom: '1px solid #f0f0f0',
            background: colors.primary
          }}>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{
                position: 'absolute',
                left: '12px',
                color: '#666',
                fontSize: '14px',
                pointerEvents: 'none',
                fontFamily: 'monospace'
              }}>
                
              </span>
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search zone..."
                style={{
                  width: '100%',
                  padding: '8px 8px 8px 20px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  outline: 'none',
                  color: isDark ? 'white' : 'black'
                }}
                onClick={(e) => e.stopPropagation()}
              />
              {searchQuery && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery('');
                  }}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    background: 'none',
                    border: 'none',
                    color: '#999',
                    cursor: 'pointer',
                    fontSize: '18px'
                  }}
                >
                  ×
                </button>
              )}
            </div>

            {/* Три кнопки сортировки в ряд */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '6px',
              marginTop: '8px'
            }}>
              {/* Кнопка сортировки по Name */}
              <button
                onClick={() => handleSortToggle('name')}
                style={{
                  padding: '6px 4px',
                  borderRadius: '6px',
                  border: `1px solid ${sortState.type === 'name' ? colors.accent : '#ddd'}`,
                  background: isDark ? 'black' : 'white',
                  color: isDark ? 'white' : 'black',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                  fontFamily: 'monospace',
                  minHeight: '32px'
                }}
                title={sortState.type === 'name' 
                  ? `Sort by name (${sortState.direction === 'asc' ? 'short to long' : 'long to short'})`
                  : 'Sort by name length'
                }
              >
                <span style={{ fontSize: '12px' }}>
                  {getSortIcon('name', sortState.direction)}
                </span>
                <span>{getSortButtonText('name')}</span>
              </button>

              {/* Кнопка сортировки по Subdomains */}
              <button
                onClick={() => handleSortToggle('subdomains')}
                style={{
                  padding: '6px 4px',
                  borderRadius: '6px',
                  border: `1px solid ${sortState.type === 'subdomains' ? colors.accent : '#ddd'}`,
                  // background: sortState.type === 'subdomains' ? colors.accent : 'white',
                  // color: sortState.type === 'subdomains' ? 'white' : 'black',
                  background: isDark ? 'black' : 'white',
                  color: isDark ? 'white' : 'black',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                  fontFamily: 'monospace',
                  minHeight: '32px'
                }}
                title={sortState.type === 'subdomains' 
                  ? `Sort by subdomains (${sortState.direction === 'asc' ? 'few to many' : 'many to few'})`
                  : 'Sort by subdomain count'
                }
              >
                <span style={{ fontSize: '12px' }}>
                  {getSortIcon('subdomains', sortState.direction)}
                </span>
                <span>{getSortButtonText('subdomains')}</span>
              </button>

              {/* Кнопка сортировки по Date */}
              <button
                onClick={() => handleSortToggle('date')}
                style={{
                  padding: '6px 4px',
                  borderRadius: '6px',
                  border: `1px solid ${sortState.type === 'date' ? colors.accent : '#ddd'}`,
                  // background: sortState.type === 'date' ? colors.accent : 'white',
                  // color: sortState.type === 'date' ? 'white' : 'black',
                  background: isDark ? 'black' : 'white',
                  color: isDark ? 'white' : 'black',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                  fontFamily: 'monospace',
                  minHeight: '32px'
                }}
                title={sortState.type === 'date' 
                  ? `Sort by date (${sortState.direction === 'asc' ? 'old to new' : 'new to old'})`
                  : 'Sort by creation date'
                }
              >
                <span style={{ fontSize: '12px' }}>
                  {getSortIcon('date', sortState.direction)}
                </span>
                <span>{getSortButtonText('date')}</span>
              </button>
            </div>

            {/* Чекбокс "My" */}
            <div style={{
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <input
                type="checkbox"
                id="my-zones-checkbox"
                checked={showOnlyMyZones}
                onChange={handleMyZonesToggle}
                style={{
                  cursor: 'pointer'
                }}
              />
              <label 
                htmlFor="my-zones-checkbox"
                style={{
                  fontSize: '12px',
                  color: isDark ? 'black' : 'white',
                  cursor: 'pointer',
                  fontFamily: 'monospace'
                }}
              >
                My zones only
              </label>
            </div>
          </div>

          {/* Шапка с заголовками */}
          <div style={{
            padding: '8px 12px',
            borderBottom: '1px solid #e0e0e0',
            background: colors.primary,
            display: 'grid',
            gridTemplateColumns: '1fr auto auto',
            gap: '8px',
            alignItems: 'center',
            fontSize: '11px',
            fontWeight: 'bold',
            color: isDark ? 'black' : 'white',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            <div style={{ textAlign: 'left' }}>Zone</div>
            <div style={{ textAlign: 'center', minWidth: '50px' }}>Subdomains</div>
            <div style={{ textAlign: 'right', minWidth: '40px' }}>% Supply</div>
          </div>

          {/* Список зон */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            maxHeight: '300px',
            background: colors.primary,
          }}>
            {filteredAndSortedZones.length === 0 ? (
              <div style={{
                padding: '16px',
                textAlign: 'center',
                color: '#999',
                fontSize: '14px',
                fontFamily: 'monospace'
              }}>
                {showOnlyMyZones && userAddress ? 'No your zones found' : 'No zones found'}
              </div>
            ) : (
              filteredAndSortedZones.map((zone) => {
                const zoneDataItem = zoneData.find(item => item.zone.id === zone.id);
                if (!zoneDataItem) return null;

                const { itemCount, percentage, isLoading } = zoneDataItem;
               // const isSelected = zone.name === selectedZone;
                const isUserZone = zone.owner === userAddress;

                return (
                  <div
                    key={zone.id}
                    onClick={() => handleSelectZone(zone.name)}
                    style={{
                      padding: '10px 12px',
                      cursor: 'pointer',
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto',
                      gap: '8px',
                      alignItems: 'center',
                      borderBottom: '1px solid #f5f5f5',
                      backgroundColor: isDark ? "rgb(56 56 60)" : 'white',
                      margin: '0px 10px 0px 10px'
                    }}
                  >
                    {/* Имя зоны */}
                    <div style={{
                      textAlign: 'left',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: 'black',
                      fontFamily: 'monospace',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: getItemCountColor(itemCount),
                        flexShrink: 0
                      }} />
                      <span style={{color: isDark ? 'white' : 'black'}}>
                        .{formatZoneName(zone.name)}
                        {mode === 'sbt' && ' 🔒'}
                      </span>
                      {isUserZone && mode !== 'sbt' && <div className="ownLabel" style={{display: 'flex', alignItems: 'flex-end', justifyContent: 'left'}}><p style={{color: colors.accent, margin: 0}}>{t('yourZone')}</p></div>}
                    </div>

                    {/* Количество субдоменов */}
                    <div style={{
                      textAlign: 'center',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      color: getItemCountColor(itemCount),
                      minWidth: '50px',
                      fontFamily: 'monospace'
                    }}>
                      {isLoading ? '...' : itemCount}
                    </div>

                    {/* Процент */}
                    <div style={{
                      textAlign: 'right',
                      fontSize: '13px',
                      minWidth: '40px',
                      fontFamily: 'monospace',
                      color: isDark ? 'white' : 'black'
                    }}>
                      {percentage}%
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Статистика */}
          {zones.length > 0 && (
            <div style={{
              padding: '8px 12px',
              borderTop: '1px solid #f0f0f0',
              background: colors.primary,
              fontSize: '11px',
              color: '#666',
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: 'monospace'
            }}>
              <span style={{ color: isDark ? 'black' : 'white' }}>
                {filteredAndSortedZones.length}/{zones.length} zones
              </span>
              <span style={{ color: isDark ? 'black' : 'white' }}>
                {totalSubdomains} total
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};