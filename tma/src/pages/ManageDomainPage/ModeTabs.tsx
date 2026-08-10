
// src/components/ModeTabs.tsx - исправленный интерфейс
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import IconLabelTabs from './Tabs';
import ServiceTabs from './ServiceTabs';
import { COLLECTIONS } from '../../store/nft/constants';

interface ModeTabsProps {
  mode?: 'other' | 'service';
  selectedTab?: string;
  onModeChange?: (newMode: 'other' | 'service') => void;
  onTabChange?: (collectionKey: string) => void;
  onSortChange?: (key: string) => void;
  initialSortKey?: string; // Оставляем string
  nftsCount?: number;
  zonesCount?: number;
  subdomainsCount?: number;
  defaultMode?: 'other' | 'service';
}

export const ModeTabs: React.FC<ModeTabsProps> = ({
  mode: externalMode,
  selectedTab,
  onModeChange,
  onTabChange,
  onSortChange,
  initialSortKey = 'AmountOfHolders',
  nftsCount = 0,
  zonesCount = 0,
  subdomainsCount = 0,
  defaultMode = 'service',
}) => {
  const [internalMode, setInternalMode] = useState<'other' | 'service'>(defaultMode);
  const mode = externalMode !== undefined ? externalMode : internalMode;
  const { t } = useLanguage();
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';
  const colors = {
    // Компонент раньше был жёстко светлым (белый фон, чёрный текст) — на
    // тёмной теме цифры статистики (черным по тёмному) были нечитаемы.
    cardBg: isDark ? '#1F2937' : 'white',
    text: isDark ? '#F9FAFB' : 'black',
    textMuted: isDark ? '#9CA3AF' : '#666',
    pillBg: isDark ? '#FFD700' : 'black',
    pillActiveText: isDark ? '#000000' : 'white',
  };

  const handleModeChange = (newMode: 'other' | 'service') => {
    if (externalMode === undefined) {
      setInternalMode(newMode);
    }
    
    onModeChange?.(newMode);
    
    if (onTabChange) {
      if (newMode === 'other') {
        onTabChange('ton');
      } else {
        onTabChange('zones');
      }
    }
  };

  return (
    <div className="relative w-full" style={{ padding: '0 10px' }}>
      <div className="flex flex-col gap-4 p-0">
        
        {/* Простой Tabs с бегунком */}
        <div style={{
          width: '100%',
          background: colors.cardBg,
          borderRadius: '12px',
          padding: '8px',
          display: 'flex',
          position: 'relative',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          marginBottom: '10px'
        }}>
          {/* Бегунок */}
          <motion.div
            style={{
              position: 'absolute',
              top: '8px',
              bottom: '8px',
              left: mode === 'service' ? '8px' : 'calc(50% + 4px)',
              width: 'calc(50% - 8px)',
              background: colors.pillBg,
              borderRadius: '8px',
              transition: 'left 0.3s ease'
            }}
          />

          {/* Кнопка Service */}
          <button
            onClick={() => handleModeChange('service')}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              background: 'transparent',
              color: mode === 'service' ? colors.pillActiveText : colors.textMuted,
              position: 'relative',
              zIndex: 1,
              transition: 'color 0.3s ease'
            }}
          >
            {t('mode.service') || 'Service'}
          </button>

          {/* Кнопка Other */}
          <button
            onClick={() => handleModeChange('other')}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              background: 'transparent',
              color: mode === 'other' ? colors.pillActiveText : colors.textMuted,
              position: 'relative',
              zIndex: 1,
              transition: 'color 0.3s ease'
            }}
          >
            {t('mode.other') || 'Other'}
          </button>
        </div>

        {/* Второй уровень: табы в зависимости от режима */}
        {mode === 'other' ? (
          <IconLabelTabs
            selectedTab={selectedTab as any}
            onTabChange={onTabChange}
            onSortChange={onSortChange}
            initialSortKey={initialSortKey as keyof typeof COLLECTIONS['ton']['details']} // Приведение типа
          />
        ) : (
          <ServiceTabs
            selectedTab={selectedTab}
            onTabChange={onTabChange}
            zonesCount={zonesCount}
            subdomainsCount={subdomainsCount}
          />
        )}

        {/* Статистика */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          marginTop: '10px',
          fontSize: '12px',
          color: colors.textMuted
        }}>
          {mode === 'other' ? (
            <>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>{nftsCount}</div>
                <div>NFT</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>6</div>
                <div>Collections</div>
              </div>
            </>
          ) : (
            <>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>{zonesCount}</div>
                <div>{t('serviceTabZones')}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>{subdomainsCount}</div>
                <div>{t('serviceTabSubdomains')}</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

