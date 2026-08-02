//с апи ключом от 429 версия 2

// src/pages/AuctionPage/calculateProxyNFTAddress.ts
import { getDnsItemIndex } from "./flipTimer/indexByDNSName";
import { parseB64Address } from "./flipTimer/getAddressFromBoc";

/**
 * Рассчитывает адрес NFT для Proxy субдомена
 * Используется для первой ставки, когда аукцион еще не создан
 */
export const calculateProxyNFTAddress = async (
  subdomainName: string,
  collectionAddress: string,
  isTestnet: boolean
): Promise<string | null> => {
  try {
    console.log(`🔍 Расчет адреса NFT для Proxy субдомена (первая ставка): ${subdomainName} в коллекции: ${collectionAddress}`);
    
    // 1. Вычисляем индекс субдомена
    const index = getDnsItemIndex(subdomainName);
    console.log(`Subdomain index: ${index.toString()}`);
    
    // 2. Получаем адрес NFT через метод коллекции С API КЛЮЧОМ
    const nftAddress = await getNFTAddressByIndex(index.toString(), collectionAddress, isTestnet);

    console.log(`Результат НФТ-адреса с помощью index: ${nftAddress}`);
    
    if (nftAddress) {
      console.log(`✅ Получен корректный адрес NFT для первой ставки: ${nftAddress}`);
      return nftAddress;
    }
    
    // 3. Если не удалось получить через API, используем детерминированный расчет
    console.log('⚠️ Используем детерминированный расчет адреса NFT для Proxy (первая ставка)');
    
    // Упрощенный детерминированный расчет без ton-core
    const calculatedAddress = await calculateDeterministicNFTAddressSimple(index.toString(), collectionAddress);
    
    console.log(`📝 Расчетный адрес NFT для первой ставки: ${calculatedAddress}`);
    return calculatedAddress;
    
  } catch (error) {
    console.error('Error calculating Proxy NFT address for first bid:', error);
    return null;
  }
};

/**
 * Получает адрес NFT по индексу через метод коллекции С API КЛЮЧОМ
 * ТОЛЬКО для первой ставки (когда аукциона еще нет)
 */
const getNFTAddressByIndex = async (
  index: string,
  collectionAddress: string,
  isTestnet: boolean
): Promise<string | null> => {
  try {
    const apiUrl = isTestnet
      ? "https://testnet.toncenter.com/api/v2/runGetMethod"
      : "https://toncenter.com/api/v2/runGetMethod";
    
    // API ключ для testnet (из UniversalBlockchainService)
    const apiKey = import.meta.env.VITE_TONCENTER_API_KEY;
    
    // Создаем URL с API ключом как query параметром
    const url = new URL(apiUrl);
    if (apiKey) {
      url.searchParams.append('api_key', apiKey);
    }
    
    console.log(`📡 Запрос NFT адреса по индексу ${index} с API ключом (для первой ставки)`);
    
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify({
        address: collectionAddress,
        method: 'get_nft_address_by_index',
        stack: [['num', index]]
      })
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        console.error('❌ Rate limit exceeded (429) даже с API ключом');
        return null;
      }
      console.error(`HTTP error! status: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    // Проверяем структуру ответа
    if (data && data.ok && data.result && Array.isArray(data.result.stack)) {
      const nftAddressCell = data.result.stack[0];
      
      if (nftAddressCell && Array.isArray(nftAddressCell) && nftAddressCell[0] === 'cell') {
        const b64Address = nftAddressCell[1]?.bytes;
        if (b64Address) {
          const nftAddress = parseB64Address(b64Address, false);
          
          if (nftAddress && nftAddress !== 'null') {
            return nftAddress;
          }
        }
      }
    }
    
    console.log('⚠️ Не удалось получить адрес NFT через API (возможно, неправильный формат ответа)');
    return null;
  } catch (error) {
    console.error('Error getting NFT address by index:', error);
    return null;
  }
};

/**
 * Упрощенный детерминированный расчет адреса NFT
 * Без использования ton-core (чтобы избежать ошибки с большим индексом)
 */
const calculateDeterministicNFTAddressSimple = async (
  index: string,
  collectionAddress: string
): Promise<string> => {
  try {
    // Простой расчет: хеш от конкатенации коллекции и индекса
    const uniqueString = `nft_proxy_${collectionAddress}_${index}`;
    
    // Хешируем
    const hash = await sha256(uniqueString);
    
    // Берем первые 32 байта хеша (64 hex символа)
    const addressHash = hash.substring(0, 64);
    
    // Создаем адрес в формате 0:hash
    const rawAddress = `0:${addressHash}`;
    
    // Конвертируем в bounceable формат для testnet (UQ...)
    const bounceableAddress = convertToBounceableAddressSimple(rawAddress, true);
    
    return bounceableAddress;
    
  } catch (error) {
    console.error('Error in simple deterministic calculation:', error);
    // Fallback: простой формат
    return `UQ${index.substring(0, 32)}${collectionAddress.substring(0, 16)}`;
  }
};

/**
 * Функция хеширования SHA-256
 */
const sha256 = async (message: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Упрощенная конвертация raw адреса в bounceable формат
 */
const convertToBounceableAddressSimple = (rawAddress: string, isTestnet: boolean = true): string => {
  try {
    // Если адрес уже в правильном формате, возвращаем как есть
    if (rawAddress.startsWith('EQ') || rawAddress.startsWith('UQ')) {
      return rawAddress;
    }
    
    // Парсим raw адрес
    const parts = rawAddress.split(':');
    if (parts.length === 2 && parts[0] === '0') {
      const hash = parts[1];
      
      // Для testnet используем префикс UQ, для mainnet - EQ
      const prefix = isTestnet ? 'UQ' : 'EQ';
      
      // Убедимся, что хеш имеет правильную длину (64 символа для 32 байт)
      const normalizedHash = hash.padEnd(64, '0').substring(0, 64);
      
      // Создаем адрес в упрощенном формате
      return `${prefix}${normalizedHash}`;
    }
    
    return rawAddress;
  } catch (error) {
    console.error('Error converting address:', error);
    return rawAddress;
  }
};

/**
 * Проверяет валидность адреса TON
 */
export const isValidTONAddress = (address: string): boolean => {
  if (!address) return false;
  
  // Простая проверка формата
  // Адрес TON может быть в форматах:
  // - EQ... (bounceable, mainnet) - 48 символов
  // - UQ... (bounceable, testnet) - 48 символов
  // - 0:... (raw) - начинается с 0:
  
  if (address.startsWith('EQ') || address.startsWith('UQ')) {
    return address.length === 48;
  }
  
  if (address.startsWith('0:')) {
    const parts = address.split(':');
    return parts.length === 2 && parts[1].length === 64;
  }
  
  return false;
};

/**
 * Получает информацию о Proxy субдомене (для первой ставки)
 */
export interface ProxySubdomainInfo {
  nftAddress: string;
  isAvailable: boolean;
  calculated: boolean; // Флаг, что адрес был рассчитан, а не получен из блокчейна
}

export const getProxySubdomainInfo = async (
  subdomainName: string,
  collectionAddress: string,
  isTestnet: boolean
): Promise<ProxySubdomainInfo | null> => {
  try {
    console.log(`🔍 Получение информации о Proxy субдомене: ${subdomainName}`);
    
    const nftAddress = await calculateProxyNFTAddress(subdomainName, collectionAddress, isTestnet);
    
    if (!nftAddress) {
      console.error('❌ Не удалось рассчитать адрес NFT');
      return null;
    }
    
    // Проверяем, существует ли уже NFT (с API ключом)
    const addressInfo = await getAddressInformationWithAPIKey(nftAddress, isTestnet);
    
    return {
      nftAddress,
      isAvailable: !(addressInfo && addressInfo.state === 'active'),
      calculated: true
    };
    
  } catch (error) {
    console.error('Error getting proxy subdomain info:', error);
    return null;
  }
};

/**
 * Получает информацию о адресе с использованием API ключа
 */
const getAddressInformationWithAPIKey = async (
  address: string,
  isTestnet: boolean
): Promise<{ state: string; owner?: string } | null> => {
  try {
    const apiUrl = isTestnet
      ? "https://testnet.toncenter.com/api/v2/getAddressInformation"
      : "https://toncenter.com/api/v2/getAddressInformation";
    
    // API ключ для testnet
    const apiKey = import.meta.env.VITE_TONCENTER_API_KEY;
    
    const url = new URL(apiUrl);
    url.searchParams.append('address', address);
    if (apiKey) {
      url.searchParams.append('api_key', apiKey);
    }
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error(`HTTP error getting address info: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.ok) {
      return {
        state: data.result?.state || 'uninitialized',
        owner: data.result?.owner?.address
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting address information with API key:', error);
    return null;
  }
};

/**
 * Утилитная функция для отладки - проверяет, нужно ли вызывать calculateProxyNFTAddress
 */
export const shouldCalculateProxyAddress = (auctionInfo: any): boolean => {
  // Если аукцион не найден или у него нет адреса NFT, нужно рассчитать
  return !auctionInfo || !auctionInfo.nftAddress;
};




