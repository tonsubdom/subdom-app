
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { apiService } from '../../services/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTonAddress } from '@tonconnect/ui-react';
import TonLogo from '@/components/Header/ton.svg';
import { useBlockchainItems } from '@/services/blockchainItems/blockchain-items-context.tsx';
import { getAuctionInfo } from '@/pages/AddSubdomainPage/flipTimer/getAuctionInfo';
import { getAuctionBidHistory } from '@/pages/AddSubdomainPage/flipTimer/getAuctionBidHistory';
import { mapWithConcurrency } from '@/utils/concurrency';
import { ScanProgressLoader } from '@/components/ScanProgressLoader';

// Сколько запросов get_auction_info держим в полёте одновременно. get_auction_info
// сам по себе — это 2 последовательных v2-запроса на айтем, поэтому берём с запасом
// ниже, чем maxConcurrentRequests=5 в universal-blockchain-service.ts (тот бьёт по
// более тяжёлому v3 listing) — под тот же потолок ключа (~25 rps, см. Group 4 perf).
const AUCTION_CHECK_CONCURRENCY = 10;

// Импорт SVG иконок
import YourBidderLogo from './img/your_bidder_logo.svg';
import YourBidderWhiteLogo from './img/your_bidder_white_logo.svg';
import AnyBidderLogo from './img/any_bidder_logo.svg';
import AnyBidderWhiteLogo from './img/any_bidder_white_logo.svg';
import OnAuctionLogo from './img/on_auction_logo.svg';
import EndedAuctionAlarm from './img/ended_auction_alarm.svg';

interface Bid {
  bidder: string;
  amount: number;
  timestamp: string;
}

interface ActiveAuction {
  id: string;
  name: string;
  address: string;
  bidder?: string;
  lastBid: string;
  ends: string;
  timeLeft: string;
  lastBidAmount: number;
  zoneName?: string;
  subdomainName?: string;
  zoneId?: number;
  isEnded: boolean;
  bids?: Bid[];
  auctionEndTime: string;
}

interface ActiveAuctionsProps {
  width?: string;
  maxWidth?: string;
  onAuctionClick?: (zoneName: string, subdomainName: string) => void;
  isTestnet?: boolean;
  isDark?: boolean;
}

// Типы для сортировки
type SortField = 'subdomainLength' | 'zoneLength' | 'bid' | 'status' | 'name';
type SortDirection = 'asc' | 'desc';

// Интерфейс для домена
interface DomainInfo {
  address: string;
  domain: string | null;
}

// Компонент BidderLogo - с поддержкой доменов
const BidderLogo: React.FC<{ 
  bidder?: string; 
  userAddress?: string; 
  baseUrl: string;
  colors: any;
  size?: number;
  isDark: boolean;
  domainInfo?: DomainInfo | null;
}> = ({ 
  bidder, 
  userAddress, 
  baseUrl,
  colors,
  size = 48,
  isDark,
  domainInfo
}) => {
  const isUserBidder = bidder && userAddress && 
    bidder.toLowerCase() === userAddress.toLowerCase();
  
  const fontSize = Math.max(12, size / 6);
  const { t } = useLanguage();
  
  // Функция для форматирования отображаемого имени
  const formatDisplayName = (address: string): string => {
    if (!address) return `${t('noBidsLabel')}`;
    
    // Проверяем, есть ли домен для этого адреса
    if (domainInfo && domainInfo.address.toLowerCase() === address.toLowerCase() && domainInfo.domain) {
      const domain = domainInfo.domain.endsWith('.ton') 
        ? domainInfo.domain.slice(0, -4) 
        : domainInfo.domain;
      
      // Если домен короткий (до 11 символов), показываем полностью
      if (domain.length <= 11) {
        return domain;
      }
      // Иначе показываем с тремя точками в середине
      const firstPart = domain.slice(0, 6);
      const lastPart = domain.slice(-5);
      return `${firstPart}...${lastPart}`;
    }
    
    // Если нет домена, показываем последние 4 символа адреса
    return `.${address.slice(-4)}`;
  };
  
  // Получаем отображаемое имя
  const displayName = bidder ? formatDisplayName(bidder) : `${t('noBidsLabel')}`;
  // const isDomain = bidder && domainInfo && domainInfo.address.toLowerCase() === bidder.toLowerCase() && domainInfo.domain;
  
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px'
    }}>
      {/* Логотип - просто SVG без круглого фона */}
      <div style={{
        width: `${size}px`,
        height: `${size}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {isUserBidder ? (
          <img 
            src={isDark ? YourBidderWhiteLogo : YourBidderLogo}
            alt={t('yourBidLabel')}
            style={{
              width: `${size}px`,
              height: `${size}px`,
              transition: 'transform 0.2s ease'
            }}
          />
        ) : (
          <img 
            src={isDark ? AnyBidderWhiteLogo : AnyBidderLogo}
            alt={t('otherBidderLabel')}
            style={{
              width: `${size}px`,
              height: `${size}px`,
              transition: 'transform 0.2s ease'
            }}
          />
        )}
      </div>
      
      {/* Отображаемое имя bidder'а */}
      <div style={{ 
        textAlign: 'center',
        maxWidth: '120px'
      }}>
        {bidder ? (
          <a 
            href={`${baseUrl}/${bidder}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: colors.bidderColorText,
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: `${fontSize}px`,
              display: 'block',
              padding: '4px 8px',
              borderRadius: '4px',
              background: `${colors.bidderColorText}10`,
              transition: 'all 0.2s ease',
              wordBreak: 'break-all'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${colors.bidderColorText}20`;
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `${colors.bidderColorText}10`;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {isUserBidder ? displayName : displayName}
          </a>
        ) : (
          <div style={{
            color: colors.textSecondary,
            fontSize: `${fontSize}px`,
            padding: '4px 8px',
            background: `${colors.textSecondary}10`,
            borderRadius: '4px'
          }}>
            {t('noBidsLabel')}
          </div>
        )}
        
        {/* Подпись */}
        {bidder && (
          <div style={{
            fontSize: `${fontSize - 2}px`,
            color: colors.textSecondary,
            marginTop: '2px'
          }}>
            {isUserBidder ? t('yourBidLabel') : t('otherBidderLabel')}
          </div>
        )}
      </div>
    </div>
  );
};

// Компонент ProgressBar
const ProgressBar: React.FC<{ 
  progress: number; 
  isEnded: boolean; 
  colors: any;
  timeLeft: string;
}> = ({ progress, isEnded, colors, timeLeft }) => {
  const filledBars = Math.floor(progress / 12.5);
  const nextBarProgress = (progress % 12.5) / 12.5;
  const [blink, setBlink] = useState(false);
 
  
  useEffect(() => {
    if (filledBars < 8 && !isEnded) {
      const interval = setInterval(() => {
        setBlink(prev => !prev);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [filledBars, isEnded]);
  
  const getProgressColor = (progress: number) => {
    if (progress < 50) return colors.progressGreen;
    if (progress < 75) return colors.progressYellow;
    if (progress < 87.5) return colors.progressOrange;
    return colors.progressRed;
  };
  
  const progressColor = getProgressColor(progress);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
      <div style={{ 
        display: 'flex', 
        gap: '2px',
        height: '12px',
        width: '100%'
      }}>
        {Array.from({ length: 8 }).map((_, index) => {
          let barColor = colors.border;
          let opacity = 1;
          
          if (index < filledBars) {
            barColor = progressColor;
          } else if (index === filledBars && nextBarProgress > 0 && !isEnded) {
            barColor = progressColor;
            opacity = blink ? 0.3 : 0.7;
          }
          
          return (
            <div
              key={index}
              style={{
                flex: 1,
                background: barColor,
                borderRadius: '2px',
                opacity: opacity,
                transition: 'opacity 0.5s ease'
              }}
            />
          );
        })}
      </div>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center',
        fontSize: '16px',
        color: colors.textSecondary,
        textAlign: 'center'
      }}>
        <span>{progress.toFixed(1)}%</span>
      </div>
      <div style={{ 
        fontWeight: '600',
        color: isEnded ? colors.error : colors.text,
        fontSize: '12px',
        textAlign: 'center'
      }}>
        {isEnded ? 'Завершен' : timeLeft}
      </div>
    </div>
  );
};

// Компонент StatusWithButton - объединяет статус и кнопку
const StatusWithButton: React.FC<{ 
  auction: ActiveAuction;
  colors: any;
  isDark: boolean;
  onButtonClick: (e: React.MouseEvent) => void;
}> = ({ auction, colors, isDark, onButtonClick }) => {
  const [vibrate, setVibrate] = useState(false);
  const [pulse, setPulse] = useState(false);
  const { t } = useLanguage();
  
  // Рассчитываем прогресс аукциона
  const calculateProgress = () => {
    if (auction.isEnded) return 100;
    
    const endTime = new Date(auction.ends).getTime();
    const startTime = auction.bids && auction.bids.length > 0 
      ? new Date(auction.bids[auction.bids.length - 1].timestamp).getTime()
      : endTime - (24 * 60 * 60 * 1000);
    
    const now = Date.now();
    const totalDuration = endTime - startTime;
    const elapsed = now - startTime;
    
    if (totalDuration <= 0) return 100;
    
    const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    return progress;
  };
  
  const progress = calculateProgress();
  
  // Эффекты для анимаций
  useEffect(() => {
    if (auction.isEnded) {
      const vibrateInterval = setInterval(() => {
        setVibrate(true);
        setTimeout(() => setVibrate(false), 1000);
      }, 10000);
      
      const pulseInterval = setInterval(() => {
        setTimeout(() => setPulse(true), 1000);
        setTimeout(() => setPulse(false), 2000);
      }, 10000);
      
      return () => {
        clearInterval(vibrateInterval);
        clearInterval(pulseInterval);
      };
    }
  }, [auction.isEnded]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
      animation: vibrate ? 'vibrate 0.5s ease-in-out' : 'none',
      padding: '8px',
      borderRadius: '8px'
    }}>
      {/* Иконка статуса - просто SVG без круглого фона */}
      <div style={{
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s ease',
        animation: pulse ? 'pulse 1s ease-in-out' : 'none'
      }}>
        {auction.isEnded ? (
          <img 
            src={EndedAuctionAlarm}
            alt={t('auctionEndedLabel')}
            style={{
              width: '40px',
              height: '40px',
              transition: 'transform 0.3s ease'
            }}
          />
        ) : (
          <img 
            src={OnAuctionLogo}
            alt={t('auctionActiveLabel')}
            style={{
              width: '80px',
              height: '80px',
              transition: 'transform 0.3s ease'
            }}
          />
        )}
      </div>
      
      {/* Прогресс-бар */}
      <div style={{ width: '100%' }}>
        <ProgressBar 
          progress={progress}
          isEnded={auction.isEnded}
          colors={colors}
          timeLeft={auction.timeLeft}
        />
      </div>
      
      {/* Кнопка под прогресс-баром */}
      <button
        onClick={onButtonClick}
        style={{
          background: colors.backgroundCard,
          color: isDark ? 'black' : 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '6px',
          fontSize: '14px',
          cursor: 'pointer',
          fontWeight: '600',
          minWidth: '100px',
          whiteSpace: 'nowrap',
          width: '100%',
          animation: auction.isEnded ? 'pulse 2s infinite' : 'none',
          marginTop: '8px'
        }}
        className={auction.isEnded ? 'pulse-button' : ''}
      >
        {auction.isEnded ? `${t('take')}` : `${t('goTo')}`}
      </button>
      
    </div>
  );
};

// Компонент SubdomainImage - с правильным кэшированием
const SubdomainImage: React.FC<{ 
  auction: ActiveAuction; 
  colors: any;
  imageCache: Map<string, { url: string; loaded: boolean; error: boolean }>;
  updateImageCache: (id: string, state: { url: string; loaded: boolean; error: boolean }) => void;
}> = ({ auction, colors, imageCache, updateImageCache }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const API_PAYLOAD_URL = import.meta.env.VITE_API_SC_PAYLOAD_URL;
  
  // Используем useMemo для стабильного URL
  const imageUrl = useMemo(() => {
    if (auction.zoneName && auction.subdomainName) {
      // Убираем .ton из zoneName если есть
      const cleanZoneName = auction.zoneName.endsWith('.ton') 
        ? auction.zoneName.slice(0, -4) 
        : auction.zoneName;
      return `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${cleanZoneName}/${auction.subdomainName}.png`;
    }
    return '';
  }, [auction.zoneName, auction.subdomainName]);
  
  // Используем ref для отслеживания предыдущего состояния
  const prevStateRef = useRef<{
    id: string;
    url: string;
    loaded: boolean;
    error: boolean;
  } | null>(null);
  
  // Проверяем кэш и инициализируем состояние
  useEffect(() => {
    // Проверяем, изменились ли ключевые параметры
    const currentState = {
      id: auction.id,
      url: imageUrl,
      loaded: imageLoaded,
      error: imageError
    };
    
    const prevState = prevStateRef.current;
    
    // Если ничего не изменилось, не делаем ничего
    if (prevState && 
        prevState.id === currentState.id && 
        prevState.url === currentState.url) {
      return;
    }
    
    // Проверяем кэш
    const cached = imageCache.get(auction.id);
    if (cached && cached.url === imageUrl) {
      // Восстанавливаем из кэша
      setImageLoaded(cached.loaded);
      setImageError(cached.error);
    } else {
      // Сбрасываем состояние только если URL действительно изменился
      if (!prevState || prevState.url !== imageUrl) {
        setImageLoaded(false);
        setImageError(false);
      }
    }
    
    // Сохраняем текущее состояние
    prevStateRef.current = currentState;
  }, [auction.id, imageUrl, imageCache]);
  
  // Обновляем кэш при изменении состояния
  useEffect(() => {
    if (imageUrl) {
      updateImageCache(auction.id, {
        url: imageUrl,
        loaded: imageLoaded,
        error: imageError
      });
    }
  }, [auction.id, imageUrl, imageLoaded, imageError, updateImageCache]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px'
    }}>
      {imageUrl && !imageError && (
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: colors.cardBg,
          overflow: 'hidden'
        }}>
          <img
            src={imageUrl}
            alt={`${auction.subdomainName}.${auction.zoneName}`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: imageLoaded ? 'block' : 'none'
            }}
            onLoad={() => {
              console.log(`✅ Изображение загружено: ${auction.id} - ${imageUrl}`);
              setImageLoaded(true);
            }}
            onError={() => {
              console.log(`❌ Ошибка загрузки изображения: ${auction.id} - ${imageUrl}`);
              setImageError(true);
            }}
          />
          
          {!imageLoaded && !imageError && (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: colors.hover
            }}>
              <span style={{ color: colors.textSecondary, fontSize: '12px' }}>Загрузка...</span>
            </div>
          )}
          
          {imageError && (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `${colors.error}10`
            }}>
              <span style={{ color: colors.error, fontSize: '12px' }}>Нет изображения</span>
            </div>
          )}
        </div>
      )}
      
      {!imageUrl && (
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: colors.cardBg
        }}>
          <span style={{ color: colors.textSecondary, fontSize: '12px' }}>Нет данных</span>
        </div>
      )}
    </div>
  );
};

// Функция для правильного склонения слова "ставка"
const getBidsText = (count: number, t: any) => {
  if (count === 1) return t('bidSingular') || 'ставка';
  if (count >= 2 && count <= 4) return t('bidFew') || 'ставки';
  return t('bidMany') || 'ставок';
};

// Helper функция для получения домена с API ключом
const fetchDomain = async (address: string, isTestnet: boolean): Promise<DomainInfo | null> => {
  if (!address) return null;
  
  try {
    const modeFetchDomainUrl = isTestnet ? 'testnet.toncenter.com' : 'toncenter.com';
    const apiKey = import.meta.env.VITE_TONCENTER_API_KEY; // Добавьте mainnet ключ если нужно
    
    // Создаем URL с API ключом
    const url = new URL(`https://${modeFetchDomainUrl}/api/v3/dns/records`);
    url.searchParams.append('wallet', address);
    url.searchParams.append('limit', '100');
    url.searchParams.append('offset', '0');
    
    if (apiKey) {
      url.searchParams.append('api_key', apiKey);
    }
    
    console.log(`📡 Запрос DNS записей для адреса: ${address} с API ключом`);
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      if (response.status === 429) {
        console.error(`❌ Rate limit exceeded (429) для DNS записей адреса: ${address}`);
        return null;
      }
      throw new Error(`Failed to fetch DNS records: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Ищем домен в records
    const domainFromRecords = data.records?.find(
      (record: any) => record.nft_item_owner === address
    )?.domain;
    
    // Ищем домен в address_book
    const domainFromAddressBook = Object.values(data.address_book as Record<string, { user_friendly: string; domain?: string }> || {})
      .find((entry: any) => entry.user_friendly === address)?.domain;
    
    const domain = domainFromRecords || domainFromAddressBook || null;
    
    if (domain) {
      console.log(`✅ Найден домен для ${address}: ${domain}`);
    } else {
      console.log(`ℹ️ Домен не найден для ${address}`);
    }
    
    return domain ? { address, domain } : null;
  } catch (error) {
    console.error('Error fetching domain for address:', address, error);
    return null;
  }
};

const ActiveAuctions: React.FC<ActiveAuctionsProps> = ({
  width = '100%',
  maxWidth = '425px',
  onAuctionClick,
  isTestnet = true,
  isDark = false,
}) => {
  const [activeAuctions, setActiveAuctions] = useState<ActiveAuction[]>([]);
  const [filteredAuctions, setFilteredAuctions] = useState<ActiveAuction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [onlyMyBids, setOnlyMyBids] = useState<boolean>(false);
  const [domainsCache, setDomainsCache] = useState<Map<string, DomainInfo>>(new Map());
  const [imageCache, setImageCache] = useState<Map<string, { url: string; loaded: boolean; error: boolean }>>(new Map());

  const [scanProgress, setScanProgress] = useState<{ done: number; total: number; found: number }>({ done: 0, total: 0, found: 0 });
  const foundSoFarRef = useRef(0);

  const { t } = useLanguage();
  const userAddress = useTonAddress();
  const { proxySubdomains, isLoading: blockchainLoading } = useBlockchainItems();
  const baseUrlTonsenter = isTestnet ? 'https://testnet.tonviewer.com' : 'https://tonviewer.com';

  

  // Цветовая схема
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
    hover: '#4B5563',
    bidderColorText: 'rgb(0, 255, 255)',
    backgroundCard: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
    progressGreen: '#10B981',
    progressYellow: '#F59E0B',
    progressOrange: '#F97316',
    progressRed: '#EF4444'
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
    hover: '#F3F4F6',
    bidderColorText: '#993bf6ff',
    backgroundCard: "linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)",
    progressGreen: '#10B981',
    progressYellow: '#F59E0B',
    progressOrange: '#F97316',
    progressRed: '#EF4444'
  };

  // Функция для расчета оставшегося времени
  const calculateTimeLeft = (endTime: string): { timeLeft: string; isEnded: boolean } => {
    const end = new Date(endTime);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      return { timeLeft: 'Ended', isEnded: true };
    }
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    let timeLeft = '';
    if (diffDays > 0) timeLeft = `${diffDays}д ${diffHours}ч`;
    else if (diffHours > 0) timeLeft = `${diffHours}ч ${diffMinutes}м`;
    else if (diffMinutes > 0) timeLeft = `${diffMinutes}м ${diffSeconds}с`;
    else timeLeft = `${diffSeconds}с`;
    
    return { timeLeft, isEnded: false };
  };

  // Функция для обновления кэша изображений
  // const updateImageCache = useCallback((id: number, state: { url: string; loaded: boolean; error: boolean }) => {
  //   setImageCache(prev => new Map(prev).set(id, state));
  // }, []);

  // Функция для обновления кэша изображений - оптимизированная версия
const updateImageCache = useCallback((id: string, state: { url: string; loaded: boolean; error: boolean }) => {
  setImageCache(prev => {
    // Проверяем, нужно ли обновлять
    const current = prev.get(id);
    if (current && 
        current.url === state.url && 
        current.loaded === state.loaded && 
        current.error === state.error) {
      return prev; // Возвращаем тот же Map, если ничего не изменилось
    }
    
    // Создаем новый Map с обновлением
    const updated = new Map(prev);
    updated.set(id, state);
    return updated;
  });
}, []);

  

  // Оптимизированная функция для получения доменов для всех bidder'ов
const fetchDomainsForBidders = useCallback(async (bidders: string[]) => {
  const uniqueBidders = [...new Set(bidders.filter(b => b))];
  
  // Если нет новых bidder'ов, выходим
  const newBidders = uniqueBidders.filter(bidder => !domainsCache.has(bidder));
  if (newBidders.length === 0) {
    console.log('✅ Все домены уже в кэше');
    return;
  }
  
  console.log(`🔄 Загрузка доменов для ${newBidders.length} новых bidder'ов`);
  
  const newDomains = new Map<string, DomainInfo>();
  
  // Загружаем домены с задержкой между запросами, чтобы избежать rate limit
  for (let i = 0; i < newBidders.length; i++) {
    const bidder = newBidders[i];
    
    // Добавляем задержку между запросами (100-200ms)
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    
    try {
      const domainInfo = await fetchDomain(bidder, isTestnet);
      if (domainInfo) {
        newDomains.set(bidder, domainInfo);
        console.log(`✅ Загружен домен для ${bidder}: ${domainInfo.domain}`);
      }
    } catch (error) {
      console.error(`❌ Ошибка загрузки домена для ${bidder}:`, error);
    }
  }
  
  if (newDomains.size > 0) {
    setDomainsCache(prev => {
      const updated = new Map(prev);
      newDomains.forEach((value, key) => updated.set(key, value));
      console.log(`✅ Обновлен кэш доменов: добавлено ${newDomains.size} новых`);
      return updated;
    });
  }
}, [isTestnet, domainsCache]);

  // Оптимизированная загрузка активных аукционов
const loadActiveAuctions = useCallback(async () => {
  console.log(`🔄 Начинаем загрузку аукционов (ончейн), текущий кэш изображений: ${imageCache.size}`);
  setLoading(true);
  setError(null);
  foundSoFarRef.current = 0;
  setScanProgress({ done: 0, total: proxySubdomains.length, found: 0 });

  try {
    console.log(`📡 Загружаем активные аукционы в ${isTestnet ? 'testnet' : 'mainnet'}, кандидатов: ${proxySubdomains.length}`);

    // Дешёвого ончейн-флага "в аукционе" нет (on_sale — это флаг обычного NFT-маркетплейса,
    // к нашему аукционному механизму отношения не имеет), поэтому опрашиваем get_auction_info
    // по каждому proxy-итему платформы. Чтобы не растягивать это на десятки секунд
    // последовательными запросами, гоняем пул из AUCTION_CHECK_CONCURRENCY воркеров —
    // это максимум, который наш платный toncenter-ключ держит без 429 (см. Group 4, ~25 rps).
    const results = await mapWithConcurrency(
      proxySubdomains,
      AUCTION_CHECK_CONCURRENCY,
      async (item): Promise<ActiveAuction | null> => {
        try {
          const subName = item.domain.split('.')[0];
          const info = await getAuctionInfo(subName, item.collection_address, isTestnet);

          // Аукцион либо ещё не начат, либо уже завершён — пропускаем.
          if (!info || !info.isActive) return null;

          const bids = await getAuctionBidHistory(info.nftAddress, isTestnet);
          const lastBidAmount = Number(info.maxBid) / 1_000_000_000;
          const { timeLeft, isEnded } = calculateTimeLeft(new Date(info.timestamp * 1000).toISOString());

          const parts = item.domain.replace(/\.ton$/, '').split('.');
          const subdomainName = parts[0] || subName;
          const zoneName = item.zone;

          foundSoFarRef.current += 1;

          return {
            id: info.nftAddress,
            name: item.domain.replace(/\.ton$/, ''),
            address: info.nftAddress,
            bidder: info.maxBidderOwner || undefined,
            lastBid: lastBidAmount > 0 ? `${lastBidAmount.toFixed(1)}` : '0.0',
            ends: new Date(info.timestamp * 1000).toISOString(),
            timeLeft: timeLeft,
            lastBidAmount: lastBidAmount,
            zoneName: zoneName,
            subdomainName: subdomainName,
            isEnded: isEnded,
            bids: bids,
            auctionEndTime: new Date(info.timestamp * 1000).toISOString()
          };
        } catch (subError) {
          console.error(`❌ Ошибка при обработке субдомена ${item.domain}:`, subError);
          return null;
        }
      },
      (done, total) => setScanProgress({ done, total, found: foundSoFarRef.current })
    );

    const auctions = results.filter((a): a is ActiveAuction => a !== null);
    const biddersToFetch = auctions
      .map((a) => a.bidder)
      .filter((b): b is string => !!b);

    auctions.sort((a, b) => new Date(a.ends).getTime() - new Date(b.ends).getTime());

    console.log(`✅ Найдено активных ончейн-аукционов: ${auctions.length}`);
    console.log(`📊 Кэш изображений до обновления: ${imageCache.size}`);

    setActiveAuctions(auctions);
    setLastUpdate(new Date());

    // Загружаем домены для bidder'ов (в фоне)
    if (biddersToFetch.length > 0) {
      fetchDomainsForBidders(biddersToFetch);
    }

  } catch (error: any) {
    console.error('❌ Ошибка при загрузке активных аукционов:', error);
    setError(error.message || 'Ошибка загрузки активных аукционов');
  } finally {
    setLoading(false);
    console.log(`✅ Загрузка завершена, кэш изображений: ${imageCache.size}`);
  }
}, [isTestnet, fetchDomainsForBidders, imageCache, proxySubdomains]);

  // Фильтрация и сортировка
  useEffect(() => {
    let result = [...activeAuctions];
    
    // Фильтрация по поиску
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(auction => 
        auction.name.toLowerCase().includes(query) ||
        (auction.bidder && auction.bidder.toLowerCase().includes(query)) ||
        auction.lastBid.includes(query)
      );
    }
    
    // Фильтрация "Только мои ставки"
    if (onlyMyBids && userAddress) {
      result = result.filter(auction => 
        auction.bidder && auction.bidder.toLowerCase() === userAddress.toLowerCase()
      );
    }
    
    // Сортировка
    result.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'subdomainLength':
          aValue = a.subdomainName?.length || 0;
          bValue = b.subdomainName?.length || 0;
          break;
        case 'zoneLength':
          aValue = a.zoneName?.length || 0;
          bValue = b.zoneName?.length || 0;
          break;
        case 'bid':
          aValue = a.lastBidAmount;
          bValue = b.lastBidAmount;
          break;
        case 'status':
          aValue = a.isEnded ? 2 : (a.timeLeft.includes('д') ? 1 : 0);
          bValue = b.isEnded ? 2 : (b.timeLeft.includes('д') ? 1 : 0);
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    setFilteredAuctions(result);
  }, [activeAuctions, searchQuery, sortField, sortDirection, onlyMyBids, userAddress]);

  const loadActiveAuctionsRef = useRef<() => Promise<void>>();
loadActiveAuctionsRef.current = loadActiveAuctions;

  // Обработчик клика по аукциону
  // const handleAuctionClick = (auction: ActiveAuction) => {
  //   if (onAuctionClick && auction.zoneName && auction.subdomainName) {
  //     console.log(`🎯 Клик по аукциону: zoneName=${auction.zoneName}, subdomain=${auction.subdomainName}`);
  //     onAuctionClick(auction.zoneName, auction.subdomainName);
  //   } else {
  //     console.error('❌ Недостаточно данных для клика:', {
  //       zoneName: auction.zoneName,
  //       subdomainName: auction.subdomainName
  //     });
  //   }
  // };

  // В компоненте ActiveAuctions, в функции handleAuctionClick:
const handleAuctionClick = (auction: ActiveAuction) => {
  if (onAuctionClick && auction.zoneName && auction.subdomainName) {
    console.log(`🎯 Клик по аукциону: zoneName=${auction.zoneName}, subdomain=${auction.subdomainName}`);
    
    // Вызываем обработчик из родительского компонента
    onAuctionClick(auction.zoneName, auction.subdomainName);
    
    // Добавляем автоскролл вниз страницы
    setTimeout(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
    }, 300); // Небольшая задержка для установки значений
  } else {
    console.error('❌ Недостаточно данных для клика:', {
      zoneName: auction.zoneName,
      subdomainName: auction.subdomainName
    });
  }
};


  // Форматирование времени обновления
  const formatUpdateTime = (date: Date): string => {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  // Инициализация сети
  useEffect(() => {
    apiService.setNetwork(isTestnet);
  }, [isTestnet]);

  // Загрузка данных и интервал - оптимизированная версия
  

useEffect(() => {
  // proxySubdomains ещё пуст, пока блокчейн-контекст не подгрузил данные — раньше
  // первый прогон стартовал сразу на маунте, находил 0 кандидатов и висел так
  // до следующего тика интервала (30 сек). Ждём готовности списка итемов.
  if (blockchainLoading) return;

  loadActiveAuctions();
  const interval = setInterval(() => {
    if (loadActiveAuctionsRef.current) {
      loadActiveAuctionsRef.current();
    }
  }, 30000);
  return () => clearInterval(interval);
}, [isTestnet, blockchainLoading]);

  return (
    <div style={{ width, maxWidth, margin: '0 auto', padding: '8px' }}>
      <style>{`
        @keyframes vibrate {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .pulse-button {
          animation: pulse 0.5s ease-in-out;
        }
      `}</style>
      
      <div style={{
        background: colors.backgroundCard,
        borderRadius: '8px',
        border: `1px solid ${colors.border}`,
        overflow: 'hidden',
      }}>
        {/* Заголовок */}
        <div style={{
          padding: '10px 12px',
          borderBottom: `1px solid ${colors.border}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: isDark ? 'black' : 'white', fontWeight: '600', fontSize: '16px' }}>
              🏆 {t('activeAuctionsTitle')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                background: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)',
                color: isDark ? 'black' : 'white',
                fontSize: '14px',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: '600'
              }}>
                {isTestnet ? 'TESTNET' : 'MAINNET'}
              </span>
              <button
                onClick={loadActiveAuctions}
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
            fontSize: '14px',
            marginTop: '4px',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span style={{ color: isDark ? 'black' : 'white'}}>{t('updatedLabel')}: {formatUpdateTime(lastUpdate)}</span>
            <span style={{ color: isDark ? 'black' : 'white'}}>{t('totalLabel')}: {activeAuctions.length}</span>
          </div>
        </div>


          <div style={{
  padding: '12px',
  background: colors.headerBg,
  borderBottom: `1px solid ${colors.border}`
}}>
  {/* Строка поиска */}
  <div style={{ marginBottom: '12px', position: 'relative' }}>
    {/* SVG иконка лупы */}
    <div style={{
      position: 'absolute',
      left: '16px',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '20px',
      height: '20px',
      pointerEvents: 'none',
      zIndex: 1
    }}>
      <svg 
        width="20" 
        height="20" 
        viewBox="0 0 20 20" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          d="M14.5 14.5L18 18M16.5 9.5C16.5 13.366 13.366 16.5 9.5 16.5C5.63401 16.5 2.5 13.366 2.5 9.5C2.5 5.63401 5.63401 2.5 9.5 2.5C13.366 2.5 16.5 5.63401 16.5 9.5Z" 
          stroke={colors.textSecondary || '#666'} 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
    </div>
    
    <input
      type="text"
      placeholder={t('searchPlaceholder') || "Поиск по имени или адресу..."}
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      style={{
        width: '100%',
        padding: '8px 12px 8px 44px', // Увеличили левый padding для иконки
        borderRadius: '6px',
        border: `1px solid ${colors.border}`,
        background: colors.cardBg,
        color: colors.text,
        fontSize: '14px',
        outline: 'none',
        height: '50px',
        boxSizing: 'border-box'
      }}
    />
  </div>
  
  {/* Кнопки сортировки */}
  <div style={{ 
    display: 'flex', 
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '12px'
  }}>
            <button
              onClick={() => {
                if (sortField === 'subdomainLength') {
                  setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortField('subdomainLength');
                  setSortDirection('asc');
                }
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: `1px solid ${colors.border}`,
                background: sortField === 'subdomainLength' ? colors.primary : colors.cardBg,
                color: sortField === 'subdomainLength' ? 'white' : colors.text,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {t('sort.subdomainLength') || 'Длина субдомена'} {sortField === 'subdomainLength' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
            
            <button
              onClick={() => {
                if (sortField === 'zoneLength') {
                  setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortField('zoneLength');
                  setSortDirection('asc');
                }
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: `1px solid ${colors.border}`,
                background: sortField === 'zoneLength' ? colors.primary : colors.cardBg,
                color: sortField === 'zoneLength' ? 'white' : colors.text,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {t('sort.zoneLength') || 'Длина зоны'} {sortField === 'zoneLength' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
            
            <button
              onClick={() => {
                if (sortField === 'bid') {
                  setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortField('bid');
                  setSortDirection('desc');
                }
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: `1px solid ${colors.border}`,
                background: sortField === 'bid' ? colors.primary : colors.cardBg,
                color: sortField === 'bid' ? 'white' : colors.text,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {t('bid') || 'Ставка'} {sortField === 'bid' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
            
            <button
              onClick={() => {
                if (sortField === 'status') {
                  setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortField('status');
                  setSortDirection('asc');
                }
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: `1px solid ${colors.border}`,
                background: sortField === 'status' ? colors.primary : colors.cardBg,
                color: sortField === 'status' ? 'white' : colors.text,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {t('status') || 'Статус'} {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
          </div>
          
          {/* Чекбокс "Только мои ставки" */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="onlyMyBids"
              checked={onlyMyBids}
              onChange={(e) => setOnlyMyBids(e.target.checked)}
              disabled={!userAddress}
              style={{
                width: '16px',
                height: '16px',
                cursor: 'pointer'
              }}
            />
            <label 
              htmlFor="onlyMyBids"
              style={{
                color: colors.text,
                fontSize: '14px',
                cursor: 'pointer',
                opacity: userAddress ? 1 : 0.5
              }}
            >
              {t('onlyMyBidsLabel') || "Только мои ставки"}
              {!userAddress && ` (${t('connectWallet') || 'подключите кошелек'})`}
            </label>
          </div>
        </div>

        {/* Контент */}
        <div style={{ background: colors.cardBg, overflowX: 'auto' }}>
          {blockchainLoading ? (
            <ScanProgressLoader
              label={t('loadingAuctions') || 'Загрузка аукционов'}
              statusText={t('loadingItemsList') || 'Загружаем список итемов...'}
              textColor={colors.textSecondary}
            />
          ) : loading ? (
            <ScanProgressLoader
              label={t('loadingAuctions') || 'Загрузка аукционов'}
              percent={scanProgress.total > 0 ? Math.round((scanProgress.done / scanProgress.total) * 100) : 0}
              statusText={
                scanProgress.total > 0
                  ? `Проверено ${scanProgress.done} из ${scanProgress.total} итемов, найдено активных аукционов: ${scanProgress.found}`
                  : undefined
              }
              textColor={colors.textSecondary}
            />
          ) : error ? (
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ color: colors.error, marginBottom: '8px' }}>❌</div>
              <div style={{ color: colors.error, fontSize: '12px', marginBottom: '12px' }}>{error}</div>
              <button
                onClick={loadActiveAuctions}
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
                {t('retryButton')}
              </button>
            </div>
          ) : filteredAuctions.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: colors.textSecondary }}>
              <div style={{ fontSize: '12px' }}>📭 {t('noAuctionsText')}</div>
            </div>
          ) : (
            <div style={{ minWidth: '380px', maxHeight: '500px', overflowY: 'auto' }}>
              {/* Заголовки таблицы - теперь 4 колонки вместо 5 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.3fr 0.8fr 0.6fr 1.3fr', // 4 колонки вместо 5
                gap: '8px',
                padding: '8px 12px',
                background: colors.headerBg,
                borderBottom: `1px solid ${colors.border}`,
                fontSize: '14px',
                fontWeight: '600',
                color: colors.textSecondary,
                textTransform: 'uppercase'
              }}>
                <div style={{display: 'flex', justifyContent: 'left'}}>{t('name') || 'Name'}</div>
                <div style={{display: 'flex', justifyContent: 'left'}}>{t('bidder') || 'Bidder'}</div>
                <div style={{display: 'flex', justifyContent: 'left'}}>{t('bid') || 'Bid'}, <img 
                          src={TonLogo} 
                          alt="TON"
                          style={{
                            width: '16px',
                            height: '16px'
                          }}
                        /></div>
                <div style={{display: 'flex', justifyContent: 'left'}}>{t('status') || 'Status'}</div>
                {/* Убрали колонку Action */}
              </div>
              
              {/* Строки аукционов */}
              {filteredAuctions.map((auction) => {
                const domainInfo = auction.bidder ? domainsCache.get(auction.bidder) : null;
                
                return (
                  <div
                    key={auction.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.7fr 0.8fr 0.8fr 1.7fr', // 4 колонки вместо 5
                      gap: '8px',
                      padding: '12px',
                      borderBottom: `1px solid ${colors.border}`,
                      fontSize: '11px',
                      color: colors.text,
                      cursor: 'pointer',
                      alignItems: 'center',
                      background: auction.isEnded ? `${colors.error}10` : colors.cardBg
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.hover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = auction.isEnded ? `${colors.error}10` : colors.cardBg;
                    }}
                    onClick={() => handleAuctionClick(auction)}
                  >
                    {/* Name с изображением */}
                    <div style={{ 
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <SubdomainImage 
                        auction={auction} 
                        colors={colors}
                        imageCache={imageCache}
                        updateImageCache={updateImageCache}
                      />
                      <div style={{ 
                        wordBreak: 'break-word',
                        lineHeight: '1.3',
                        fontSize: '14px',
                        color: colors.primary,
                        textDecoration: 'underline',
                        textAlign: 'center'
                      }}>
                        <a 
                          href={`${baseUrlTonsenter}/${auction.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: colors.primary,
                            textDecoration: 'none',
                            fontWeight: '600'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {auction.name}
                        </a>
                      </div>
                      
                      {/* Количество ставок */}
                      {auction.bids && auction.bids.length > 0 && (
                        <div style={{
                          fontSize: '12px',
                          color: colors.textSecondary,
                          textAlign: 'center'
                        }}>
                          <a
                            href="#"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              console.log('Просмотр ставок для аукциона:', auction.id);
                            }}
                            style={{
                              color: colors.secondary,
                              textDecoration: 'none',
                              fontWeight: '500',
                              background: `${colors.secondary}15`,
                              padding: '2px 8px',
                              borderRadius: '12px',
                              display: 'inline-block'
                            }}
                          >
                            {auction.bids.length} {getBidsText(auction.bids.length, t)}
                          </a>
                        </div>
                      )}
                    </div>
                    
                    {/* Bidder с логотипом и доменом */}
                    <div>
                      <BidderLogo 
                        bidder={auction.bidder} 
                        userAddress={userAddress}
                        baseUrl={baseUrlTonsenter}
                        colors={colors}
                        size={40}
                        isDark={isDark}
                        domainInfo={domainInfo}
                      />
                    </div>
                    
                    {/* Bid */}
                    <div style={{ 
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <div style={{ 
                        fontWeight: '600', 
                        color: auction.lastBidAmount > 0 ? colors.text : colors.textSecondary,
                        whiteSpace: 'nowrap',
                        fontSize: '16px',
                        textAlign: 'center'
                      }}>
                        {auction.lastBid}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: colors.textSecondary
                      }}>
              
                      </div>
                    </div>
                    
                    {/* Status с иконкой, прогресс-баром и кнопкой */}
                    <div>
                      <StatusWithButton 
                        auction={auction}
                        colors={colors}
                        isDark={isDark}
                        onButtonClick={(e) => {
                          e.stopPropagation();
                          handleAuctionClick(auction);
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Футер */}
        <div style={{
          padding: '12px',
          background: colors.headerBg,
          borderTop: `1px solid ${colors.border}`,
          fontSize: '14px',
          color: colors.textSecondary
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ color: colors.text, fontWeight: '600' }}>{filteredAuctions.length}</span> {t('auctionsCountLabel') || 'аукционов'}
              {searchQuery && (
                <span style={{ marginLeft: '8px', fontSize: '12px', color: colors.primary }}>
                  (поиск: "{searchQuery}")
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: colors.progressGreen 
                }}></div>
                <span style={{ fontSize: '12px' }}>{t('activeStatusLabel') || 'Активен'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: colors.progressYellow 
                }}></div>
                <span style={{ fontSize: '12px' }}>{t('warningStatusLabel') || 'Завершается'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: colors.error 
                }}></div>
                <span style={{ fontSize: '12px' }}>{t('endedStatusLabel') || 'Завершен'}</span>
              </div>
            </div>
          </div>
          
          {/* Статистика по ставкам */}
          <div style={{ 
            marginTop: '8px', 
            fontSize: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              {t('totalBidsLabel') || 'Всего ставок'}: <span style={{ fontWeight: '600', color: colors.text }}>
                {filteredAuctions.reduce((total, auction) => total + (auction.bids?.length || 0), 0)}
              </span>
            </div>
            <div>
              {t('yourBidsLabel') || 'Ваших ставок'}: <span style={{ 
                fontWeight: '600', 
                color: userAddress ? colors.success : colors.textSecondary 
              }}>
                {userAddress 
                  ? filteredAuctions.filter(a => 
                      a.bidder && a.bidder.toLowerCase() === userAddress.toLowerCase()
                    ).length
                  : '—'
                }
              </span>
            </div>
          </div>
      
        </div>
      </div>
    </div>
  );
};

export default ActiveAuctions;