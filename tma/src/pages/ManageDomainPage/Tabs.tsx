

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CollectionKey } from '../../store/nft/constants';

import tgDNS from '/src/pages/ManageDomainPage/img/tg_logo.svg';
import getgemsDNS from '/src/pages/ManageDomainPage/img/getgemsLogo.png';
import gramDNS from '/src/pages/ManageDomainPage/img/gramLogo.png';
import tonDNS from '/src/components/Header/ton.svg';
import tonnelLogo from '/src/pages/ManageDomainPage/img/tonnelLogo.png';

import { COLLECTIONS } from '../../store/nft/constants';
import { useLanguage } from '@/contexts/LanguageContext';

interface IconLabelTabsProps {
  onTabChange?: (collectionKey: CollectionKey) => void;
  initialSortKey?: keyof typeof COLLECTIONS['ton']['details'];
  onSortChange?: (key: keyof typeof COLLECTIONS['ton']['details']) => void;
}

export default function IconLabelTabs({ 
  onTabChange, 
  initialSortKey = 'AmountOfHolders' as keyof typeof COLLECTIONS['ton']['details']
}: IconLabelTabsProps) {
  const [selectedTab, setSelectedTab] = useState<CollectionKey>('ton');
  const [selectedSortKey] = useState<keyof typeof COLLECTIONS['ton']['details']>(initialSortKey);
  const { t } = useLanguage();

  // Фиксированный порядок коллекций
  const collectionKeys: CollectionKey[] = ['ton', 'tme', 'gram', 'tonnel', 'getgems', 'other'];

  // Конфигурация табов в фиксированном порядке
  const tabConfigs = [
    { icon: tonDNS, label: t('zone.ton',) || '.ton', key: 'ton' as CollectionKey },
    { icon: tgDNS, label: t('zone.tme') || '.t.me', key: 'tme' as CollectionKey },
    { icon: gramDNS, label: t('zone.gram') || '.gram', key: 'gram' as CollectionKey },
    { icon: tonnelLogo, label: t('zone.tonnel') || '.tonnel', key: 'tonnel' as CollectionKey },
    { icon: getgemsDNS, label: t('zone.getgems') || '.getgems', key: 'getgems' as CollectionKey },
  ];

  // Вычисляем проценты и сортируем ДЛЯ ОТОБРАЖЕНИЯ (не меняя фактический порядок табов)
  const sortedPercentages = useMemo(() => {
    const sortKey = selectedSortKey;

    const totalValue = collectionKeys.reduce((sum, key) => {
      const value = COLLECTIONS[key]?.details?.[sortKey];
      return sum + (typeof value === 'number' ? value : 0);
    }, 0);

    const withPercentages = tabConfigs.map(config => {
      const value = COLLECTIONS[config.key]?.details?.[sortKey];
      const percentage = typeof value === 'number' && totalValue > 0
        ? ((value / totalValue) * 100)
        : 0;
      
      return {
        ...config,
        percentage: parseFloat(percentage.toFixed(2)),
        value
      };
    });

    // Сортируем ТОЛЬКО для визуального отображения (анимация переплывания)
    return withPercentages.sort((a, b) => b.percentage - a.percentage);
  }, [selectedSortKey]);

  const handleTabClick = (key: CollectionKey) => {
    setSelectedTab(key);
    onTabChange?.(key);
  };

  return (
    <div className="relative w-full" style={{ padding: '0 10px' }}>
      <div className="flex flex-col gap-4 p-0">
        {/* Таблицы с иконками - отображаются в порядке сортировки с анимацией */}
        <div style={{ display: 'flex', gap: '5px', marginTop: '5px' , overflow: 'scroll', alignItems: 'center'}}>
          <AnimatePresence mode="popLayout">
            {sortedPercentages.map((config, index) => (
              <motion.button
                key={config.key}
                layout
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                transition={{ 
                  duration: 0.4,
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                  delay: index * 0.05
                }}
                onClick={() => handleTabClick(config.key)}
                style={{
                  borderRadius: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  background: selectedTab === config.key 
                    ? 'black' 
                    : 'white',
                  boxShadow: selectedTab === config.key 
                    ? '0 4px 16px rgba(190, 190, 190, 1)' 
                    : '0 2px 8px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  minWidth: '85px',
                  height: 'min-content',
                  padding: '10px 10px 5px 10px'
                }}
              >
                {/* Иконка */}
                <motion.img 
                  src={config.icon} 
                  alt={config.label}
                  layout
                  transition={{ duration: 0.3 }}
                  style={{ 
                    width: '48px', 
                    height: '48px', 
                    objectFit: 'contain',
                    borderRadius: '15px',
                    background: 'white'
                  }} 
                />

                {/* Лейбл - вертикально по центру */}
                <motion.span
                  layout
                  transition={{ duration: 0.3 }}
                  style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    textAlign: 'center',
                    color: selectedTab === config.key ? 'white' : 'black',
                    maxWidth: '90px',
                    wordBreak: 'break-word',
                    lineHeight: '1.2'
                  }}
                >
                  {config.label}
                </motion.span>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
