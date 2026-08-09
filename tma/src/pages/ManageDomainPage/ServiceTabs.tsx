

//боллее менее рабочая
// src/components/ServiceTabs.tsx

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

// Импорт иконок
import subdomLogo from '/src/pages/ManageDomainPage/img/subdom_logo.png';
import anyMode from '/src/pages/ManageDomainPage/img/question_mark.svg';

interface ServiceTabsProps {
  onTabChange?: (collectionKey: string) => void;
  initialSortKey?: string;
  onSortChange?: (key: string) => void;
  zonesCount?: number;
  subdomainsCount?: number;
}

export default function ServiceTabs({
  onTabChange,
  zonesCount = 0,
  subdomainsCount = 0,
}: ServiceTabsProps) {
  const [selectedTab, setSelectedTab] = useState<string>('any');
  const { t } = useLanguage();

  // Конфигурация табов. "Any" — форма ручного ввода адреса, реальных элементов не хранит, счётчик всегда 0.
  const tabConfigs = [
    { icon: anyMode, label: t('serviceTabAny'), key: 'any' as string, count: 0 },
    { icon: subdomLogo, label: t('serviceTabZones'), key: 'zones' as string, count: zonesCount },
    { icon: subdomLogo, label: t('serviceTabSubdomains'), key: 'subdomains' as string, count: subdomainsCount },
  ];

  // Проценты — от реальных счётчиков элементов, с пересортировкой по убыванию (анимация переплывания)
  const sortedPercentages = useMemo(() => {
    const totalCount = tabConfigs.reduce((sum, config) => sum + config.count, 0);

    const withPercentages = tabConfigs.map(config => ({
      ...config,
      percentage: totalCount > 0 ? parseFloat(((config.count / totalCount) * 100).toFixed(2)) : 0,
    }));

    return withPercentages.sort((a, b) => b.percentage - a.percentage);
  }, [zonesCount, subdomainsCount]);

  const handleTabClick = (key: string) => {
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

                {/* Процент - черный овал с белым текстом */}
                <motion.div
                  layout
                  transition={{ duration: 0.3 }}
                  style={{
                    background: '#000000',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: '700',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    minWidth: '50px',
                    textAlign: 'center'
                  }}
                >
                  {config.percentage.toFixed(1)}%
                </motion.div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
