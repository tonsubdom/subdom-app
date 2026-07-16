/**
 * Утилиты для преобразования SimpleEnrichedItem в MarketItem
 * Специальная логика для прокси-доменов и субдоменов
 */

import { SimpleEnrichedItem } from '@/services/blockchainItems/blockchain-items-types';

// ==================== УТИЛИТЫ ДЛЯ ИЗВЛЕЧЕНИЯ ИМЕНИ ====================

/**
 * Извлечение имени для прокси-домена из URI
 * Формат URI: /metadata/ton/domain
 * Пример: /metadata/ton/example -> example.ton
 */
export const extractProxyDomainName = (uri: string): string => {
  if (!uri) return 'Без названия';
  
  try {
    const url = new URL(uri);
    const pathParts = url.pathname.split('/');
    
    // Ищем индекс 'metadata'
    const metadataIndex = pathParts.indexOf('metadata');
    if (metadataIndex === -1) return 'Без названия';
    
    // Части после 'metadata'
    const afterMetadata = pathParts.slice(metadataIndex + 1);
    
    if (afterMetadata.length >= 2) {
      const domain = afterMetadata[1];
      return `${domain}.ton`;
    }
    
    return 'Без названия';
  } catch (error) {
    console.error('Error extracting proxy domain name from URI:', error);
    return 'Без названия';
  }
};

/**
 * Извлечение имени для субдомена из URI
 * Формат URI: /metadata/ton/zone/subdomain
 * Пример: /metadata/ton/example/test -> test.example.ton
 */
export const extractSubdomainName = (uri: string): string => {
  if (!uri) return 'Без названия';
  
  try {
    const url = new URL(uri);
    const pathParts = url.pathname.split('/');
    
    // Ищем индекс 'metadata'
    const metadataIndex = pathParts.indexOf('metadata');
    if (metadataIndex === -1) return 'Без названия';
    
    // Части после 'metadata'
    const afterMetadata = pathParts.slice(metadataIndex + 1);
    
    if (afterMetadata.length >= 3) {
      const zone = afterMetadata[1];
      const subdomain = afterMetadata[2];
      return `${subdomain}.${zone}.ton`;
    } else if (afterMetadata.length >= 2) {
      // Если только зона без субдомена
      const zone = afterMetadata[1];
      return `${zone}.ton`;
    }
    
    return 'Без названия';
  } catch (error) {
    console.error('Error extracting subdomain name from URI:', error);
    return 'Без названия';
  }
};

/**
 * Извлечение зоны из URI
 */
export const extractZoneFromUri = (uri: string): string => {
  if (!uri) return '';
  
  try {
    const url = new URL(uri);
    const pathParts = url.pathname.split('/');
    
    const metadataIndex = pathParts.indexOf('metadata');
    if (metadataIndex === -1) return '';
    
    const afterMetadata = pathParts.slice(metadataIndex + 1);
    
    if (afterMetadata.length >= 2) {
      const zone = afterMetadata[1];
      return `${zone}.ton`;
    }
    
    return '';
  } catch (error) {
    console.error('Error extracting zone from URI:', error);
    return '';
  }
};

/**
 * Извлечение субдомена из URI
 */
export const extractSubdomainFromUri = (uri: string): string => {
  if (!uri) return '';
  
  try {
    const url = new URL(uri);
    const pathParts = url.pathname.split('/');
    
    const metadataIndex = pathParts.indexOf('metadata');
    if (metadataIndex === -1) return '';
    
    const afterMetadata = pathParts.slice(metadataIndex + 1);
    
    if (afterMetadata.length >= 3) {
      return afterMetadata[2];
    }
    
    return '';
  } catch (error) {
    console.error('Error extracting subdomain from URI:', error);
    return '';
  }
};

// ==================== УТИЛИТЫ ДЛЯ РАСЧЕТА ДЛИНЫ ====================

/**
 * Расчет длины зоны из имени
 * Для прокси-доменов: example.ton -> длина "example" = 7
 * Для субдоменов: test.example.ton -> длина "example" = 7
 */
export const calculateZoneLength = (name: string): number => {
  if (!name) return 0;
  
  const parts = name.split('.');
  if (parts.length >= 2) {
    // Убираем .ton из зоны
    const zoneWithoutTon = parts.slice(1).join('.').replace('.ton', '');
    return zoneWithoutTon.length;
  }
  
  return 0;
};

/**
 * Расчет длины субдомена из имени
 * Для прокси-доменов: example.ton -> нет субдомена = 0
 * Для субдоменов: test.example.ton -> длина "test" = 4
 */
export const calculateSubdomainLength = (name: string): number => {
  if (!name) return 0;
  
  const parts = name.split('.');
  if (parts.length >= 3) {
    // Есть субдомен
    return parts[0].length;
  }
  
  return 0;
};

// ==================== УТИЛИТЫ ДЛЯ ФОРМАТИРОВАНИЯ ДАТЫ ====================

/**
 * Преобразование last_transaction_lt в дату
 * last_transaction_lt - это логическое время в TON
 * Можно преобразовать в примерную дату
 */
export const convertLtToDate = (lt: string): string => {
  if (!lt) return new Date().toISOString();
  
  try {
    // Преобразуем LT в timestamp (примерная логика)
    // В TON 1 LT ≈ 1 наносекунда, но это не точное преобразование
    // Для простоты используем текущую дату минус некоторое время
    const ltNum = BigInt(lt);
    const now = Date.now();
    
    // Примерная логика: чем больше LT, тем новее транзакция
    // Это упрощенная логика, в реальности нужно использовать API
    const timestamp = now - (Number(ltNum % 1000000n) * 1000);
    
    return new Date(timestamp).toISOString();
  } catch (error) {
    console.error('Error converting LT to date:', error);
    return new Date().toISOString();
  }
};

/**
 * Форматирование даты для отображения
 */
export const formatDisplayDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return dateString;
  }
};

// ==================== ОСНОВНАЯ ФУНКЦИЯ КОНВЕРТАЦИИ ====================

/**
 * Конвертация SimpleEnrichedItem в MarketItem с учетом типа
 */
export const convertToMarketItem = (
  item: SimpleEnrichedItem,
  _isTestnet: boolean
): MarketItem => {
  console.log('🔄 Конвертация SimpleEnrichedItem в MarketItem:', {
    address: item.address,
    type: item.type,
    uri: item.metadata?.token_info?.[0]?.extra?.uri || item.domain
  });
  
  // Получаем URI из metadata или из domain
  const uri = item.metadata?.token_info?.[0]?.extra?.uri || item.domain || '';
  
  // Определяем имя в зависимости от типа
  let name = '';
  let zoneName = '';
  let subdomainName = '';
  
  if (item.type === 'proxy_subdomain') {
    // Для прокси-доменов извлекаем имя из URI
    name = extractProxyDomainName(uri);
    zoneName = extractZoneFromUri(uri);
    // Для прокси-доменов нет субдомена
    subdomainName = '';
  } else if (item.type === 'sbt_subdomain') {
    // Для субдоменов используем стандартную логику
    name = extractSubdomainName(uri);
    zoneName = extractZoneFromUri(uri);
    subdomainName = extractSubdomainFromUri(uri);
  } else {
    // Для NFT оберток используем существующую логику
    const tokenInfo = item.metadata?.token_info?.[0] || {};
    name = tokenInfo.name || item.domain || 'Без названия';
    
    // Разделяем домен на части для NFT оберток
    const parts = name.split('.');
    if (parts.length >= 2) {
      subdomainName = parts[0];
      zoneName = parts.slice(1).join('.');
    } else {
      subdomainName = name;
      zoneName = 'unknown';
    }
  }
  
  // Рассчитываем длины
  const zoneLength = calculateZoneLength(name);
  const subdomainLength = calculateSubdomainLength(name);
  
  // Определяем статус
  const status = item.on_sale ? 'On Sale' : 'Claimed';

  const API_PAYLOAD_URL = import.meta.env.VITE_API_SC_PAYLOAD_URL;
  
  // Определяем цену
  let mintPrice = '0 TON';
  if (item.metadata?.price) {
    mintPrice = `${item.metadata.price} TON`;
  } else if (item.metadata?.sale?.price?.value) {
    const priceValue = parseFloat(item.metadata.sale.price.value);
    mintPrice = `${priceValue.toFixed(1)} TON`;
  }
  
  // Проверяем наличие ссылки
  const hasLink = !!(item.collection_address && item.address);
  
  // Получаем URL для изображения
  let imgUri: string | undefined;
  const tokenInfo = item.metadata?.token_info?.[0] || {};
  
  if (tokenInfo.image) {
    imgUri = tokenInfo.image;
  } else if (item.metadata?.image) {
    imgUri = item.metadata.image;
  } else if (item.type === 'proxy_subdomain' || item.type === 'sbt_subdomain') {
    // Для субдоменов используем стандартный URL
    const zone = zoneName.replace('.ton', '');
    const subdomain = subdomainName;
    
    if (zone && subdomain) {
      imgUri = `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${zone}/${subdomain}.png`;
    } else if (zone) {
      // Для прокси-доменов (только зона)
      imgUri = `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${zone}/placeholder.png`;
    }
  }
  
  // Используем last_transaction_lt для даты
  const registrationDate = item.last_transaction_lt 
    ? convertLtToDate(item.last_transaction_lt)
    : item.lastUpdated || new Date().toISOString();
  
  // Приводим тип к нужному формату для MarketItem
  let itemType: 'proxy_subdomain' | 'nft_wrapper';
  if (item.type === 'proxy_subdomain' || item.type === 'sbt_subdomain') {
    itemType = 'proxy_subdomain'; // Оба типа отображаем как proxy_subdomain в маркете
  } else {
    itemType = 'nft_wrapper';
  }
  
  const result: MarketItem = {
    id: item.address,
    name,
    owner: item.owner_address || undefined,
    mintPrice,
    zoneName,
    subdomainName,
    imgUri,
    registrationDate,
    status,
    zoneLength,
    subdomainLength,
    hasLink,
    type: itemType,
    address: item.address,
    collection_address: item.collection_address,
    metadata: item.metadata
  };
  
  console.log('✅ Результат MarketItem:', {
    name: result.name,
    type: result.type,
    zoneLength: result.zoneLength,
    subdomainLength: result.subdomainLength,
    registrationDate: result.registrationDate
  });
  
  return result;
};

// ==================== ТИП MarketItem ====================

export interface MarketItem {
  id: string;
  name: string;
  owner?: string;
  mintPrice: string;
  zoneName?: string;
  subdomainName?: string;
  imgUri?: string;
  registrationDate: string;
  status: string;
  zoneLength?: number;
  subdomainLength?: number;
  hasLink: boolean;
  type: 'proxy_subdomain' | 'nft_wrapper';
  address: string;
  collection_address: string;
  metadata?: {
    price?: string;
    sale?: {
      price?: {
        value: string;
        token_name: string;
      };
    };
    image?: string;
    previews?: Array<{
      url: string;
      resolution?: string;
    }>;
    token_info?: Array<{
      valid?: boolean;
      type?: string;
      name?: string;
      description?: string;
      image?: string;
      nft_index?: string;
      extra?: {
        _image_big?: string;
        _image_medium?: string;
        _image_small?: string;
        uri?: string;
        [key: string]: any;
      };
      [key: string]: any;
    }>;
    [key: string]: any;
  };
}
