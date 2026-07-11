import React, { useState, useEffect } from 'react';
import { apiService, Subdomain } from '../../services/api';

interface MarketItem {
  id: number;
  name: string;
  owner?: string;
  lastBid?: string;
  mintPrice: string;
  zoneName?: string;
  subdomainName?: string;
  imgUri?: string;
}

interface MarketProps {
  width?: string;
  maxWidth?: string;
  onItemClick?: (zoneName: string, subdomainName: string) => void;
  isTestnet?: boolean;
  isDark?: boolean;
}

const Market: React.FC<MarketProps> = ({
  width = '100%',
  maxWidth = '425px',
  onItemClick,
  isTestnet = true,
  isDark = false,
}) => {
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    apiService.setNetwork(isTestnet);
  }, [isTestnet]);

  const loadMarketItems = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`📡 Загружаем субдомены со статусом 'claimed' в ${isTestnet ? 'testnet' : 'mainnet'}`);
      
      // Загружаем все субдомены со статусом 'claimed'
      const claimedSubdomains = await apiService.getSubdomainsByStatus('claimed');
      console.log(`✅ Найдено субдоменов со статусом 'claimed': ${claimedSubdomains.length}`);
      
      // Преобразуем в формат MarketItem
      const items: MarketItem[] = claimedSubdomains.map((sub: Subdomain) => {
        // Конвертируем mintPrice из нанотонов в TON
        const mintPriceAmount = sub.mintPrice ? (sub.mintPrice *1_000_000_000) : '0.000';

        console.log(`Mint price: ${mintPriceAmount}`);
        
        // Извлекаем зону и субдомен из имени
        const fullName = sub.name;
        const parts = fullName.split('.');
        let subdomainName = '';
        let zoneName = '';
        
        if (parts.length >= 2) {
          subdomainName = parts[0];
          zoneName = parts.slice(1).join('.');
        } else {
          subdomainName = fullName;
          zoneName = 'unknown';
        }
        
        return {
          id: sub.id,
          name: sub.name,
          owner: sub.owner,
          lastBid: sub.lastBid ? `${(sub.lastBid / 1_000_000_000).toFixed(3)} TON` : undefined,
          mintPrice: `${mintPriceAmount} TON`,
          zoneName: zoneName,
          subdomainName: subdomainName,
          imgUri: `https://api.subdom.zone/api/v1/subdomain/metadata/ton/${zoneName}/${subdomainName}.png`,
        };
      });
      
      // Сортируем по имени
      items.sort((a, b) => a.name.localeCompare(b.name));
      
      console.log(`✅ Найдено субдоменов для продажи: ${items.length}`);
      console.log('📊 Пример данных первого субдомена:', items[0]);
      setMarketItems(items);
      setLastUpdate(new Date());
      
    } catch (error: any) {
      console.error('❌ Ошибка при загрузке субдоменов:', error);
      setError(error.message || 'Ошибка загрузки субдоменов');
    } finally {
      setLoading(false);
    }
  };

  // Обработчик клика по субдомену
  const handleItemClick = (item: MarketItem) => {
    if (onItemClick && item.zoneName && item.subdomainName) {
      console.log(`🎯 Клик по субдомену: zoneName=${item.zoneName}, subdomain=${item.subdomainName}`);
      onItemClick(item.zoneName, item.subdomainName);
    } else {
      console.error('❌ Недостаточно данных для клика:', {
        zoneName: item.zoneName,
        subdomainName: item.subdomainName
      });
    }
  };

  // Обработчик клика по кнопке "Сделать оффер"
  const handleMakeOfferClick = (item: MarketItem, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(`💼 Сделать оффер для: ${item.name}`);
    // Здесь можно добавить логику для создания оффера
    alert(`Создание оффера для: ${item.name}`);
  };

  useEffect(() => {
    loadMarketItems();
    const interval = setInterval(loadMarketItems, 30000);
    return () => clearInterval(interval);
  }, [isTestnet]);

  const formatUpdateTime = (date: Date): string => {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const colors = isDark ? {
    primary: '#D4AF37',
    secondary: '#B8860B',
    background: '#1F2937',
    cardBg: '#1F2937',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    border: '#374151',
    headerBg: '#374151',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    hover: '#4B5563'
  } : {
    primary: '#3B82F6',
    secondary: '#60A5FA',
    background: '#F0F9FF',
    cardBg: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    headerBg: '#F8FAFC',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    hover: '#F3F4F6'
  };

  return (
    <div style={{ width, maxWidth, margin: '0 auto', padding: '8px' }}>
      <div style={{
        background: colors.background,
        borderRadius: '8px',
        border: `1px solid ${colors.border}`,
        overflow: 'hidden'
      }}>
        {/* Заголовок */}
        <div style={{
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
          padding: '10px 12px',
          borderBottom: `1px solid ${colors.border}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: '#FFFFFF', fontWeight: '600', fontSize: '14px' }}>
              🏠 Market - Субдомены для продажи
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                background: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)',
                color: '#FFFFFF',
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: '600'
              }}>
                {isTestnet ? 'TESTNET' : 'MAINNET'}
              </span>
              <button
                onClick={loadMarketItems}
                disabled={loading}
                style={{
                  color: '#FFFFFF',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: loading ? 0.5 : 1,
                  fontSize: '12px'
                }}
              >
                {loading ? '🔄' : '🔄'}
              </button>
            </div>
          </div>
          <div style={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '10px',
            marginTop: '4px',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>Обновлено: {formatUpdateTime(lastUpdate)}</span>
            <span>Всего: {marketItems.length}</span>
          </div>
        </div>

        {/* Контент */}
        <div style={{ background: colors.cardBg, overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: colors.textSecondary }}>
              <div style={{
                border: `2px solid ${colors.primary}`,
                borderTopColor: 'transparent',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 8px'
              }}></div>
              <div style={{ fontSize: '12px' }}>Загрузка...</div>
            </div>
          ) : error ? (
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ color: colors.error, marginBottom: '8px' }}>❌</div>
              <div style={{ color: colors.error, fontSize: '12px', marginBottom: '12px' }}>{error}</div>
              <button
                onClick={loadMarketItems}
                style={{
                  background: colors.primary,
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                Повторить
              </button>
            </div>
          ) : marketItems.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: colors.textSecondary }}>
              <div style={{ fontSize: '12px' }}>📭 Нет субдоменов для продажи</div>
              <div style={{ fontSize: '10px', marginTop: '4px', color: colors.textSecondary }}>
                Создайте субдомен и установите статус 'claimed'
              </div>
            </div>
          ) : (
            <div style={{ minWidth: '380px' }}>
              {/* Заголовки таблицы */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.5fr 1fr 0.8fr 0.7fr',
                gap: '8px',
                padding: '8px 12px',
                background: colors.headerBg,
                borderBottom: `1px solid ${colors.border}`,
                fontSize: '10px',
                fontWeight: '600',
                color: colors.textSecondary,
                textTransform: 'uppercase'
              }}>
                <div>Name</div>
                <div>Owner</div>
                <div>Last Bid</div>
                <div>Action</div>
              </div>
              
              {/* Строки таблицы */}
              {marketItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.5fr 1fr 0.8fr 0.7fr',
                    gap: '8px',
                    padding: '8px 12px',
                    borderBottom: `1px solid ${colors.border}`,
                    fontSize: '11px',
                    color: colors.text,
                    cursor: 'pointer',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors.hover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = colors.cardBg;
                  }}
                  onClick={() => handleItemClick(item)}
                >
                  {/* Name */}
                  <div className="itemWrapper" style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                    <img src={item.imgUri} alt="subdomainIMG" style={{width: '80px', height: '80px'}}/>
                    <div style={{ 
                        fontWeight: '500', 
                        wordBreak: 'break-word',
                        lineHeight: '1.3'
                        }}>
                        {item.name}
                    </div>
                  </div>
                  
                  
                  {/* Owner */}
                  <div style={{ 
                    color: colors.textSecondary, 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {item.owner ? (
                      <a 
                        href={`https://tonviewer.com/${item.owner}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: colors.primary,
                          textDecoration: 'none',
                          fontWeight: '500'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {`${item.owner.slice(0, 4)}...${item.owner.slice(-4)}`}
                      </a>
                    ) : (
                      '—'
                    )}
                  </div>
                  
                  {/* Last Bid */}
                  <div style={{ 
                    fontWeight: '600', 
                    color: item.lastBid ? colors.primary : colors.textSecondary,
                    whiteSpace: 'nowrap'
                  }}>
                    {item.lastBid || '—'}
                  </div>
                  
                  {/* Action - Кнопка "Сделать оффер" */}
                  <div>
                    <button
                      onClick={(e) => handleMakeOfferClick(item, e)}
                      style={{
                        background: colors.primary,
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        cursor: 'pointer',
                        fontWeight: '500',
                        minWidth: '80px',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = `0 2px 8px ${colors.primary}40`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      Сделать оффер
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Футер */}
        <div style={{
          padding: '8px 12px',
          background: colors.headerBg,
          borderTop: `1px solid ${colors.border}`,
          fontSize: '10px',
          color: colors.textSecondary
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ color: colors.text, fontWeight: '600' }}>{marketItems.length}</span> субдоменов
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.success }}></div>
                <span>Доступны для покупки</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Market;