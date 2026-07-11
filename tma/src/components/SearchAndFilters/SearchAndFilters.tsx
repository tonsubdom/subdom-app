// components/SearchAndFilters/SearchAndFilters.tsx
// import React, { useState, useRef } from 'react';
// import { SearchAndFiltersProps, getSortText, getZoneTypeText } from '@/types/profile-widget-filters.types';

// // Компонент для счетчика фильтров
// const FilterCounter = ({ count, isDark, color }: { 
//   count: number; 
//   isDark: boolean; 
//   color: string;
// }) => (
//   <span style={{
//     background: isDark ? '#000' : '#fff',
//     color: color,
//     borderRadius: '50%',
//     width: '20px',
//     height: '20px',
//     display: 'flex',
//     alignItems: 'center',
//     justifyContent: 'center',
//     fontSize: '11px',
//     fontWeight: '700',
//     border: `1px solid ${color}`,
//     boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
//     marginLeft: '4px'
//   }}>
//     {count}
//   </span>
// );


// const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
//   searchQuery,
//   setSearchQuery,
//   filters,
//   setFilters,
//   sortBy,
//   setSortBy,
//   activeTab,
//   colors,
//   isDark
// }) => {
//   // Состояния для дропдаунов
//   const [showZoneFilter, setShowZoneFilter] = useState<boolean>(false);
//   const [showSubdomainFilter, setShowSubdomainFilter] = useState<boolean>(false);
//   const [showZoneTypeFilter, setShowZoneTypeFilter] = useState<boolean>(false);
//   const [showSortDropdown, setShowSortDropdown] = useState<boolean>(false);
  
//   // Refs для кликов вне дропдаунов
//   const zoneFilterRef = useRef<HTMLDivElement>(null);
//   const subdomainFilterRef = useRef<HTMLDivElement>(null);
//   const zoneTypeFilterRef = useRef<HTMLDivElement>(null);
//   const sortDropdownRef = useRef<HTMLDivElement>(null);

//   // Статические диапазоны
//   const ZONE_LENGTH_OPTIONS = [4, 5, 6, 7, 8, 9]; // От 4 до 9+
//   const SUBDOMAIN_LENGTH_OPTIONS = [1, 2, 3, 4, 5, 6]; // От 1 до 6+

//   // Обработчики фильтров
//   const toggleZoneLengthFilter = (length: number) => {
//     setFilters({
//       ...filters,
//       zoneLengths: (filters.zoneLengths || []).includes(length)
//         ? (filters.zoneLengths || []).filter(l => l !== length)
//         : [...(filters.zoneLengths || []), length]
//     });
//   };

//   const toggleSubdomainLengthFilter = (length: number) => {
//     setFilters({
//       ...filters,
//       subdomainLengths: (filters.subdomainLengths || []).includes(length)
//         ? (filters.subdomainLengths || []).filter(l => l !== length)
//         : [...(filters.subdomainLengths || []), length]
//     });
//   };

//   const toggleZoneTypeFilter = (type: 'proxy' | 'sbt') => {
//     const currentTypes = filters.zoneTypes || [];
    
//     // Если уже выбран этот тип, убираем его
//     if (currentTypes.includes(type)) {
//       setFilters({
//         ...filters,
//         zoneTypes: currentTypes.filter(t => t !== type)
//       });
//     } else {
//       // Добавляем тип
//       setFilters({
//         ...filters,
//         zoneTypes: [...currentTypes, type]
//       });
//     }
//   };

//   // Очистка фильтров
//   const clearFilters = () => {
//     setFilters({
//       zoneLengths: [],
//       subdomainLengths: [],
//       auctionStatuses: [],
//       zoneTypes: []
//     });
//     setSearchQuery('');
//   };

//   // Обработчик кликов вне дропдаунов
//   React.useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (zoneFilterRef.current && !zoneFilterRef.current.contains(event.target as Node)) {
//         setShowZoneFilter(false);
//       }
//       if (subdomainFilterRef.current && !subdomainFilterRef.current.contains(event.target as Node)) {
//         setShowSubdomainFilter(false);
//       }
//       if (zoneTypeFilterRef.current && !zoneTypeFilterRef.current.contains(event.target as Node)) {
//         setShowZoneTypeFilter(false);
//       }
//       if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
//         setShowSortDropdown(false);
//       }
//     };

//     document.addEventListener('mousedown', handleClickOutside);
//     return () => {
//       document.removeEventListener('mousedown', handleClickOutside);
//     };
//   }, []);

//   // Определяем доступные опции сортировки в зависимости от активного таба
//   const getSortOptions = () => {
//     const baseOptions = [
//       { value: 'name_asc', label: 'Имя (А-Я)' },
//       { value: 'name_desc', label: 'Имя (Я-А)' },
//       { value: 'date_asc', label: 'Дата (старые → новые)' },
//       { value: 'date_desc', label: 'Дата (новые → старые)' },
//     ];

//     switch (activeTab) {
//       case 'zones':
//         return [
//           ...baseOptions,
//           { value: 'zoneLength_asc', label: 'Длина зоны (короткие → длинные)' },
//           { value: 'zoneLength_desc', label: 'Длина зоны (длинные → короткие)' },
//         ];
//       case 'subdomains':
//         return [
//           ...baseOptions,
//           { value: 'price_asc', label: 'Цена (низкая → высокая)' },
//           { value: 'price_desc', label: 'Цена (высокая → низкая)' },
//           { value: 'zoneLength_asc', label: 'Длина зоны (короткие → длинные)' },
//           { value: 'zoneLength_desc', label: 'Длина зоны (длинные → короткие)' },
//           { value: 'subdomainLength_asc', label: 'Длина субдомена (короткие → длинные)' },
//           { value: 'subdomainLength_desc', label: 'Длина субдомена (длинные → короткие)' },
//         ];
//       case 'auctions':
//         return [
//           ...baseOptions,
//           { value: 'bid_asc', label: 'Ставка (низкая → высокая)' },
//           { value: 'bid_desc', label: 'Ставка (высокая → низкая)' },
//           { value: 'auctionEnd_asc', label: 'Аукцион (ранние → поздние)' },
//           { value: 'auctionEnd_desc', label: 'Аукцион (поздние → ранние)' },
//         ];
//       default:
//         return baseOptions;
//     }
//   };

//   // Подсчитываем количество активных фильтров
//   const activeFiltersCount = 
//     (filters.zoneLengths?.length || 0) + 
//     (filters.subdomainLengths?.length || 0) + 
//     (filters.zoneTypes?.length || 0);

//   return (
//     <div style={{ marginBottom: '4px' }}>
//       {/* Строка поиска */}
//       <div style={{ position: 'relative', marginBottom: '12px' }}>
//         <input
//           type="text"
//           placeholder={
//             activeTab === 'zones' ? 'Поиск по имени зоны...' :
//             activeTab === 'subdomains' ? 'Поиск по имени субдомена, владельцу или цене...' :
//             activeTab === 'auctions' ? 'Поиск по имени аукциона или ставщику...' :
//             'Поиск...'
//           }
//           value={searchQuery}
//           onChange={(e) => setSearchQuery(e.target.value)}
//           style={{
//             width: '100%',
//             padding: '12px 16px 12px 40px',
//             background: colors.inputBg || colors.secondaryBg,
//             border: `1px solid ${colors.inputBorder || colors.border}`,
//             borderRadius: '8px',
//             color: colors.inputText || colors.text,
//             fontSize: '14px',
//             outline: 'none',
//           }}
//         />
//         <div style={{
//           position: 'absolute',
//           left: '12px',
//           top: '50%',
//           transform: 'translateY(-50%)',
//           color: colors.text,
//           opacity: 0.7
//         }}>
//           🔍
//         </div>
//       </div>

//       {/* Кнопки фильтров и сортировки */}
//       <div style={{
//         display: 'flex',
//         gap: '8px',
//         flexWrap: 'wrap'
//       }}>
//         {/* Фильтр по типу зоны - показываем для зон и субдоменов */}
//         {(activeTab === 'zones' || activeTab === 'subdomains') && (
//           <div style={{ position: 'relative' }} ref={zoneTypeFilterRef}>
//             <button
//               onClick={() => setShowZoneTypeFilter(!showZoneTypeFilter)}
//               style={{
//                 padding: '8px 12px',
//                 background: (filters.zoneTypes?.length || 0) > 0 ? colors.primary : colors.secondaryBg,
//                 color: (filters.zoneTypes?.length || 0) > 0 ? (isDark ? '#000' : '#fff') : colors.text,
//                 border: `1px solid ${colors.border}`,
//                 borderRadius: '6px',
//                 fontSize: '12px',
//                 cursor: 'pointer',
//                 display: 'flex',
//                 alignItems: 'center',
//                 gap: '4px'
//               }}
//             >
//               <span>🏷️ Тип зоны</span>
              
//               {(filters.zoneTypes?.length || 0) > 0 && (
//   <FilterCounter 
//       count={filters.zoneTypes?.length || 0} 
//       isDark={isDark} 
//       color={isDark ? colors.accent : "black"} 
//     />
// )}
//             </button>
            
//             {/* Дропдаун фильтра типа зоны */}
//             {showZoneTypeFilter && (
//               <div style={{
//                 position: 'absolute',
//                 top: '100%',
//                 left: 0,
//                 marginTop: '4px',
//                 background: colors.dropdownBg || colors.background,
//                 border: `1px solid ${colors.dropdownBorder || colors.border}`,
//                 borderRadius: '8px',
//                 padding: '12px',
//                 zIndex: 1000,
//                 minWidth: '180px',
//                 boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
//               }}>
//                 <div style={{ 
//                   fontSize: '12px', 
//                   fontWeight: '600', 
//                   marginBottom: '8px',
//                   color: colors.text 
//                 }}>
//                   Тип зоны:
//                 </div>
//                 <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
//                   {(['proxy', 'sbt'] as const).map(type => (
//                     <label key={type} style={{
//                       display: 'flex',
//                       alignItems: 'center',
//                       gap: '8px',
//                       cursor: 'pointer',
//                       fontSize: '12px',
//                       color: colors.text
//                     }}>
//                       <input
//                         type="checkbox"
//                         checked={(filters.zoneTypes || []).includes(type)}
//                         onChange={() => toggleZoneTypeFilter(type)}
//                         style={{
//                           accentColor: colors.primary
//                         }}
//                       />
//                       <span>{getZoneTypeText(type)}</span>
//                     </label>
//                   ))}
//                 </div>
//               </div>
//             )}
//           </div>
//         )}

//         {/* Фильтр по длине зоны - показываем только для зон и субдоменов */}
//         {(activeTab === 'zones' || activeTab === 'subdomains') && (
//           <div style={{ position: 'relative' }} ref={zoneFilterRef}>
//             <button
//               onClick={() => setShowZoneFilter(!showZoneFilter)}
//               style={{
//                 padding: '8px 12px',
//                 background: (filters.zoneLengths?.length || 0) > 0 ? colors.primary : colors.secondaryBg,
//                 color: (filters.zoneLengths?.length || 0) > 0 ? (isDark ? '#000' : '#fff') : colors.text,
//                 border: `1px solid ${colors.border}`,
//                 borderRadius: '6px',
//                 fontSize: '12px',
//                 cursor: 'pointer',
//                 display: 'flex',
//                 alignItems: 'center',
//                 gap: '4px'
//               }}
//             >
//               <span>🌐 Длина зоны</span>
//               {(filters.zoneLengths?.length || 0) > 0 && (
//                 <FilterCounter 
//       count={filters.zoneLengths?.length || 0} 
//       isDark={isDark} 
//       color={isDark ? colors.accent : "black"} 
//     />
//               )}
//             </button>
            
//             {/* Дропдаун фильтра зоны */}
//             {showZoneFilter && (
//               <div style={{
//                 position: 'absolute',
//                 top: '100%',
//                 left: 0,
//                 marginTop: '4px',
//                 background: colors.dropdownBg || colors.background,
//                 border: `1px solid ${colors.dropdownBorder || colors.border}`,
//                 borderRadius: '8px',
//                 padding: '12px',
//                 zIndex: 1000,
//                 minWidth: '180px',
//                 boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
//               }}>
//                 <div style={{ 
//                   fontSize: '12px', 
//                   fontWeight: '600', 
//                   marginBottom: '8px',
//                   color: colors.text 
//                 }}>
//                   Длина зоны:
//                 </div>
//                 <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
//                   {ZONE_LENGTH_OPTIONS.map(length => (
//                     <label key={length} style={{
//                       display: 'flex',
//                       alignItems: 'center',
//                       gap: '8px',
//                       cursor: 'pointer',
//                       fontSize: '12px',
//                       color: colors.text
//                     }}>
//                       <input
//                         type="checkbox"
//                         checked={(filters.zoneLengths || []).includes(length)}
//                         onChange={() => toggleZoneLengthFilter(length)}
//                         style={{
//                           accentColor: colors.primary
//                         }}
//                       />
//                       <span>{length} {length === 9 ? '+ символов' : 'символов'}</span>
//                     </label>
//                   ))}
//                 </div>
//               </div>
//             )}
//           </div>
//         )}

//         {/* Фильтр по длине субдомена - показываем только для субдоменов */}
//         {activeTab === 'subdomains' && (
//           <div style={{ position: 'relative' }} ref={subdomainFilterRef}>
//             <button
//               onClick={() => setShowSubdomainFilter(!showSubdomainFilter)}
//               style={{
//                 padding: '8px 12px',
//                 background: (filters.subdomainLengths?.length || 0) > 0 ? colors.primary : colors.secondaryBg,
//                 color: (filters.subdomainLengths?.length || 0) > 0 ? (isDark ? '#000' : '#fff') : colors.text,
//                 border: `1px solid ${colors.border}`,
//                 borderRadius: '6px',
//                 fontSize: '12px',
//                 cursor: 'pointer',
//                 display: 'flex',
//                 alignItems: 'center',
//                 gap: '4px'
//               }}
//             >
//               <span>🔤 Длина субдомена</span>
//               {(filters.subdomainLengths?.length || 0) > 0 && (
//                 <FilterCounter 
//       count={filters.subdomainLengths?.length || 0} 
//       isDark={isDark} 
//       color={isDark ? colors.accent : "black"} 
//     />
//               )}
//             </button>
            
//             {/* Дропдаун фильтра субдомена */}
//             {showSubdomainFilter && (
//               <div style={{
//                 position: 'absolute',
//                 top: '100%',
//                 left: 0,
//                 marginTop: '4px',
//                 background: colors.dropdownBg || colors.background,
//                 border: `1px solid ${colors.dropdownBorder || colors.border}`,
//                 borderRadius: '8px',
//                 padding: '12px',
//                 zIndex: 1000,
//                 minWidth: '180px',
//                 boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
//               }}>
//                 <div style={{ 
//                   fontSize: '12px', 
//                   fontWeight: '600', 
//                   marginBottom: '8px',
//                   color: colors.text 
//                 }}>
//                   Длина субдомена:
//                 </div>
//                 <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
//                   {SUBDOMAIN_LENGTH_OPTIONS.map(length => (
//                     <label key={length} style={{
//                       display: 'flex',
//                       alignItems: 'center',
//                       gap: '8px',
//                       cursor: 'pointer',
//                       fontSize: '12px',
//                       color: colors.text
//                     }}>
//                       <input
//                         type="checkbox"
//                         checked={(filters.subdomainLengths || []).includes(length)}
//                         onChange={() => toggleSubdomainLengthFilter(length)}
//                         style={{
//                           accentColor: colors.primary
//                         }}
//                       />
//                       <span>{length} {length === 6 ? '+ символов' : 'символов'}</span>
//                     </label>
//                   ))}
//                 </div>
//               </div>
//             )}
//           </div>
//         )}

//         {/* Сортировка - показываем для всех табов кроме info */}
//         {activeTab !== 'info' && (
//           <div style={{ position: 'relative' }} ref={sortDropdownRef}>
//             <button
//               onClick={() => setShowSortDropdown(!showSortDropdown)}
//               style={{
//                 padding: '8px 12px',
//                 background: colors.secondaryBg,
//                 color: colors.text,
//                 border: `1px solid ${colors.border}`,
//                 borderRadius: '6px',
//                 fontSize: '12px',
//                 cursor: 'pointer',
//                 display: 'flex',
//                 alignItems: 'center',
//                 gap: '4px'
//               }}
//             >
//               <span>↕️ {getSortText(sortBy)}</span>
//             </button>
            
//             {/* Дропдаун сортировки */}
//             {showSortDropdown && (
//               <div style={{
//                 position: 'absolute',
//                 top: '100%',
//                 right: 0,
//                 marginTop: '4px',
//                 background: colors.dropdownBg || colors.background,
//                 border: `1px solid ${colors.dropdownBorder || colors.border}`,
//                 borderRadius: '8px',
//                 padding: '8px 0',
//                 zIndex: 1000,
//                 minWidth: '220px',
//                 boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
//               }}>
//                 {getSortOptions().map((option) => (
//                   <button
//                     key={option.value}
//                     onClick={() => {
//                       setSortBy(option.value as any);
//                       setShowSortDropdown(false);
//                     }}
//                     style={{
//                       width: '100%',
//                       padding: '8px 12px',
//                       background: 'transparent',
//                       border: 'none',
//                       textAlign: 'left',
//                       fontSize: '12px',
//                       color: sortBy === option.value ? colors.primary : colors.text,
//                       cursor: 'pointer',
//                       display: 'flex',
//                       alignItems: 'center',
//                       gap: '8px'
//                     }}
//                     onMouseEnter={(e) => {
//                       e.currentTarget.style.backgroundColor = colors.secondaryBg;
//                     }}
//                     onMouseLeave={(e) => {
//                       e.currentTarget.style.backgroundColor = 'transparent';
//                     }}
//                   >
//                     {sortBy === option.value && (
//                       <span style={{ color: colors.primary }}>✓</span>
//                     )}
//                     <span>{option.label}</span>
//                   </button>
//                 ))}
//               </div>
//             )}
//           </div>
//         )}

//         {/* Кнопка очистки фильтров */}
//         {(activeFiltersCount > 0 || searchQuery) && (
//           <button
//             onClick={clearFilters}
//             style={{
//               padding: '8px 12px',
//               background: '#f87171',
//               color: '#FFFFFF',
//               border: `1px solid ${colors.border}`,
//               borderRadius: '6px',
//               fontSize: '12px',
//               cursor: 'pointer',
//               display: 'flex',
//               alignItems: 'center',
//               gap: '4px'
//             }}
//           >
//             <span>🗑️ Очистить</span>
//           </button>
//         )}
//       </div>
//     </div>
//   );
// };

// export default SearchAndFilters;

// components/SearchAndFilters/SearchAndFilters.tsx
import React, { useState, useRef } from 'react';
import { SearchAndFiltersProps } from '@/types/profile-widget-filters.types';
import { useLanguage } from '@/contexts/LanguageContext';

// Компонент для счетчика фильтров
const FilterCounter = ({ count, isDark, color }: { 
  count: number; 
  isDark: boolean; 
  color: string;
}) => (
  <span style={{
    background: isDark ? '#000' : '#fff',
    color: color,
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: '700',
    border: `1px solid ${color}`,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginLeft: '4px'
  }}>
    {count}
  </span>
);

const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  filters,
  setFilters,
  sortBy,
  setSortBy,
  activeTab,
  colors,
  isDark
}) => {
  // Получаем функцию перевода из контекста
  const { t } = useLanguage();
  
  // Состояния для дропдаунов
  const [showZoneFilter, setShowZoneFilter] = useState<boolean>(false);
  const [showSubdomainFilter, setShowSubdomainFilter] = useState<boolean>(false);
  const [showZoneTypeFilter, setShowZoneTypeFilter] = useState<boolean>(false);
  const [showSortDropdown, setShowSortDropdown] = useState<boolean>(false);
  
  // Refs для кликов вне дропдаунов
  const zoneFilterRef = useRef<HTMLDivElement>(null);
  const subdomainFilterRef = useRef<HTMLDivElement>(null);
  const zoneTypeFilterRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Статические диапазоны
  const ZONE_LENGTH_OPTIONS = [4, 5, 6, 7, 8, 9];
  const SUBDOMAIN_LENGTH_OPTIONS = [1, 2, 3, 4, 5, 6];

  // Обработчики фильтров
  const toggleZoneLengthFilter = (length: number) => {
    setFilters({
      ...filters,
      zoneLengths: (filters.zoneLengths || []).includes(length)
        ? (filters.zoneLengths || []).filter(l => l !== length)
        : [...(filters.zoneLengths || []), length]
    });
  };

  const toggleSubdomainLengthFilter = (length: number) => {
    setFilters({
      ...filters,
      subdomainLengths: (filters.subdomainLengths || []).includes(length)
        ? (filters.subdomainLengths || []).filter(l => l !== length)
        : [...(filters.subdomainLengths || []), length]
    });
  };

  const toggleZoneTypeFilter = (type: 'proxy' | 'sbt') => {
    const currentTypes = filters.zoneTypes || [];
    
    // Если уже выбран этот тип, убираем его
    if (currentTypes.includes(type)) {
      setFilters({
        ...filters,
        zoneTypes: currentTypes.filter(t => t !== type)
      });
    } else {
      // Добавляем тип
      setFilters({
        ...filters,
        zoneTypes: [...currentTypes, type]
      });
    }
  };

  // Очистка фильтров
  const clearFilters = () => {
    setFilters({
      zoneLengths: [],
      subdomainLengths: [],
      auctionStatuses: [],
      zoneTypes: []
    });
    setSearchQuery('');
  };

  // Обработчик кликов вне дропдаунов
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (zoneFilterRef.current && !zoneFilterRef.current.contains(event.target as Node)) {
        setShowZoneFilter(false);
      }
      if (subdomainFilterRef.current && !subdomainFilterRef.current.contains(event.target as Node)) {
        setShowSubdomainFilter(false);
      }
      if (zoneTypeFilterRef.current && !zoneTypeFilterRef.current.contains(event.target as Node)) {
        setShowZoneTypeFilter(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Определяем доступные опции сортировки в зависимости от активного таба
  const getSortOptions = () => {
    const baseOptions = [
      { value: 'name_asc', label: t('sortNameAsc') },
      { value: 'name_desc', label: t('sortNameDesc') },
      { value: 'date_asc', label: t('sortDateAsc') },
      { value: 'date_desc', label: t('sortDateDesc') },
    ];

    switch (activeTab) {
      case 'zones':
        return [
          ...baseOptions,
          { value: 'zoneLength_asc', label: t('sortZoneLengthAsc') },
          { value: 'zoneLength_desc', label: t('sortZoneLengthDesc') },
        ];
      case 'subdomains':
        return [
          ...baseOptions,
          { value: 'price_asc', label: t('sortPriceAsc') },
          { value: 'price_desc', label: t('sortPriceDesc') },
          { value: 'zoneLength_asc', label: t('sortZoneLengthAsc') },
          { value: 'zoneLength_desc', label: t('sortZoneLengthDesc') },
          { value: 'subdomainLength_asc', label: t('sortSubdomainLengthAsc') },
          { value: 'subdomainLength_desc', label: t('sortSubdomainLengthDesc') },
        ];
      case 'auctions':
        return [
          ...baseOptions,
          { value: 'bid_asc', label: t('sortBidAsc') },
          { value: 'bid_desc', label: t('sortBidDesc') },
          { value: 'auctionEnd_asc', label: t('sortAuctionEndAsc') },
          { value: 'auctionEnd_desc', label: t('sortAuctionEndDesc') },
        ];
      default:
        return baseOptions;
    }
  };

  // Получаем текст плейсхолдера для поиска в зависимости от активного таба
  const getSearchPlaceholder = () => {
    switch (activeTab) {
      case 'zones':
        return t('searchZones');
      case 'subdomains':
        return t('searchSubdomains');
      case 'auctions':
        return t('searchAuctions');
      default:
        return t('searchGeneral');
    }
  };

  // Получаем текст сортировки для кнопки
  const getSortButtonText = () => {
    const sortOptions = getSortOptions();
    const currentOption = sortOptions.find(option => option.value === sortBy);
    return currentOption ? currentOption.label : t('sortBy');
  };

  // Получаем текст типа зоны
  const getZoneTypeText = (type: 'proxy' | 'sbt') => {
    return type === 'proxy' ? t('zoneTypeProxy') : t('zoneTypeSbt');
  };

  // Подсчитываем количество активных фильтров
  const activeFiltersCount = 
    (filters.zoneLengths?.length || 0) + 
    (filters.subdomainLengths?.length || 0) + 
    (filters.zoneTypes?.length || 0);

  return (
    <div style={{ marginBottom: '4px' }}>
      {/* Строка поиска */}
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <input
          type="text"
          placeholder={getSearchPlaceholder()}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px 12px 40px',
            background: colors.inputBg || colors.secondaryBg,
            border: `1px solid ${colors.inputBorder || colors.border}`,
            borderRadius: '8px',
            color: colors.inputText || colors.text,
            fontSize: '14px',
            outline: 'none',
          }}
        />
        <div style={{
          position: 'absolute',
          left: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: colors.text,
          opacity: 0.7
        }}>
          🔍
        </div>
      </div>

      {/* Кнопки фильтров и сортировки */}
      <div style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        justifyContent: 'end'
      }}>
        {/* Фильтр по типу зоны - показываем для зон и субдоменов */}
        {(activeTab === 'zones' || activeTab === 'subdomains') && (
          <div style={{ position: 'relative' }} ref={zoneTypeFilterRef}>
            <button
              onClick={() => setShowZoneTypeFilter(!showZoneTypeFilter)}
              style={{
                padding: '8px 12px',
                background: (filters.zoneTypes?.length || 0) > 0 ? colors.primary : colors.secondaryBg,
                color: (filters.zoneTypes?.length || 0) > 0 ? (isDark ? '#000' : '#fff') : colors.text,
                border: `1px solid ${colors.border}`,
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>{t('zoneTypeFilter')}</span>
              
              {(filters.zoneTypes?.length || 0) > 0 && (
                <FilterCounter 
                  count={filters.zoneTypes?.length || 0} 
                  isDark={isDark} 
                  color={isDark ? colors.accent : "black"} 
                />
              )}
            </button>
            
            {/* Дропдаун фильтра типа зоны */}
            {showZoneTypeFilter && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                background: colors.dropdownBg || colors.background,
                border: `1px solid ${colors.dropdownBorder || colors.border}`,
                borderRadius: '8px',
                padding: '12px',
                zIndex: 1000,
                minWidth: '180px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  marginBottom: '8px',
                  color: colors.text 
                }}>
                  {t('zoneTypeFilter')}:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(['proxy', 'sbt'] as const).map(type => (
                    <label key={type} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: colors.text
                    }}>
                      <input
                        type="checkbox"
                        checked={(filters.zoneTypes || []).includes(type)}
                        onChange={() => toggleZoneTypeFilter(type)}
                        style={{
                          accentColor: colors.primary
                        }}
                      />
                      <span>{getZoneTypeText(type)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Фильтр по длине зоны - показываем только для зон и субдоменов */}
        {(activeTab === 'zones' || activeTab === 'subdomains') && (
          <div style={{ position: 'relative' }} ref={zoneFilterRef}>
            <button
              onClick={() => setShowZoneFilter(!showZoneFilter)}
              style={{
                padding: '8px 12px',
                background: (filters.zoneLengths?.length || 0) > 0 ? colors.primary : colors.secondaryBg,
                color: (filters.zoneLengths?.length || 0) > 0 ? (isDark ? '#000' : '#fff') : colors.text,
                border: `1px solid ${colors.border}`,
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>{t('zoneLengthFilter')}</span>
              {(filters.zoneLengths?.length || 0) > 0 && (
                <FilterCounter 
                  count={filters.zoneLengths?.length || 0} 
                  isDark={isDark} 
                  color={isDark ? colors.accent : "black"} 
                />
              )}
            </button>
            
            {/* Дропдаун фильтра зоны */}
            {showZoneFilter && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                background: colors.dropdownBg || colors.background,
                border: `1px solid ${colors.dropdownBorder || colors.border}`,
                borderRadius: '8px',
                padding: '12px',
                zIndex: 1000,
                minWidth: '180px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  marginBottom: '8px',
                  color: colors.text 
                }}>
                  {t('zoneLengthLabel')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {ZONE_LENGTH_OPTIONS.map(length => (
                    <label key={length} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: colors.text
                    }}>
                      <input
                        type="checkbox"
                        checked={(filters.zoneLengths || []).includes(length)}
                        onChange={() => toggleZoneLengthFilter(length)}
                        style={{
                          accentColor: colors.primary
                        }}
                      />
                      <span>{length} {length === 9 ? t('charsPlus') : t('chars')}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Фильтр по длине субдомена - показываем только для субдоменов */}
        {activeTab === 'subdomains' && (
          <div style={{ position: 'relative' }} ref={subdomainFilterRef}>
            <button
              onClick={() => setShowSubdomainFilter(!showSubdomainFilter)}
              style={{
                padding: '8px 12px',
                background: (filters.subdomainLengths?.length || 0) > 0 ? colors.primary : colors.secondaryBg,
                color: (filters.subdomainLengths?.length || 0) > 0 ? (isDark ? '#000' : '#fff') : colors.text,
                border: `1px solid ${colors.border}`,
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>{t('subdomainLengthFilter')}</span>
              {(filters.subdomainLengths?.length || 0) > 0 && (
                <FilterCounter 
                  count={filters.subdomainLengths?.length || 0} 
                  isDark={isDark} 
                  color={isDark ? colors.accent : "black"} 
                />
              )}
            </button>
            
            {/* Дропдаун фильтра субдомена */}
            {showSubdomainFilter && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                background: colors.dropdownBg || colors.background,
                border: `1px solid ${colors.dropdownBorder || colors.border}`,
                borderRadius: '8px',
                padding: '12px',
                zIndex: 1000,
                minWidth: '180px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  marginBottom: '8px',
                  color: colors.text 
                }}>
                  {t('subdomainLengthLabel')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {SUBDOMAIN_LENGTH_OPTIONS.map(length => (
                    <label key={length} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: colors.text
                    }}>
                      <input
                        type="checkbox"
                        checked={(filters.subdomainLengths || []).includes(length)}
                        onChange={() => toggleSubdomainLengthFilter(length)}
                        style={{
                          accentColor: colors.primary
                        }}
                      />
                      <span>{length} {length === 6 ? t('charsPlus') : t('chars')}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Сортировка - показываем для всех табов кроме info */}
        {activeTab !== 'info' && (
          <div style={{ position: 'relative' }} ref={sortDropdownRef}>
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              style={{
                padding: '8px 12px',
                background: colors.secondaryBg,
                color: colors.text,
                border: `1px solid ${colors.border}`,
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>{getSortButtonText()}</span>
            </button>
            
            {/* Дропдаун сортировки */}
            {showSortDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                background: colors.dropdownBg || colors.background,
                border: `1px solid ${colors.dropdownBorder || colors.border}`,
                borderRadius: '8px',
                padding: '8px 0',
                zIndex: 1000,
                minWidth: '220px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
              }}>
                {getSortOptions().map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSortBy(option.value as any);
                      setShowSortDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      fontSize: '12px',
                      color: sortBy === option.value ? colors.cyberpunk : colors.text,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.secondaryBg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {sortBy === option.value && (
                      <span style={{ color: colors.primary }}>✓</span>
                    )}
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Кнопка очистки фильтров */}
        {(activeFiltersCount > 0 || searchQuery) && (
          <button
            onClick={clearFilters}
            style={{
              padding: '8px 12px',
              background: '#f87171',
              color: '#FFFFFF',
              border: `1px solid ${colors.border}`,
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>{t('clearFilters')}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchAndFilters;
