
// src/components/ModeTabs.tsx - исправленный интерфейс
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import IconLabelTabs from './Tabs';
import ServiceTabs from './ServiceTabs';
import { COLLECTIONS } from '../../store/nft/constants';

interface ModeTabsProps {
  mode?: 'other' | 'service';
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
          background: 'white',
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
              background: 'black',
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
              color: mode === 'service' ? 'white' : '#666',
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
              color: mode === 'other' ? 'white' : '#666',
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
            onTabChange={onTabChange}
            onSortChange={onSortChange}
            initialSortKey={initialSortKey as keyof typeof COLLECTIONS['ton']['details']} // Приведение типа
          />
        ) : (
          <ServiceTabs
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
          color: '#666'
        }}>
          {mode === 'other' ? (
            <>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'black' }}>{nftsCount}</div>
                <div>NFT</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'black' }}>6</div>
                <div>Collections</div>
              </div>
            </>
          ) : (
            <>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'black' }}>{zonesCount}</div>
                <div>Zones</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'black' }}>{subdomainsCount}</div>
                <div>Subdomains</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

