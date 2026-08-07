// src/utils/tonUtils.ts
import { Address } from "ton-core";

const API_PAYLOAD_URL = import.meta.env.VITE_API_SC_PAYLOAD_URL;

/**
 * Конвертирует user-friendly адрес (kQ...) в raw формат (0:...)
 */
export function convertUserFriendlyToRaw(userFriendlyAddress: string): string {
  try {
    // Если адрес уже в raw формате, возвращаем как есть
    if (userFriendlyAddress.startsWith('0:')) {
      return userFriendlyAddress.toLowerCase();
    }
    
    // Парсим адрес
    const address = Address.parse(userFriendlyAddress);
    return address.toRawString();
  } catch (error) {
    console.error('Ошибка конвертации адреса:', error);
    return userFriendlyAddress;
  }
}

/**
 * Конвертирует raw адрес (0:...) в user-friendly формат (kQ...)
 */
export function convertRawToUserFriendly(rawAddress: string): string {
  try {
    if (!rawAddress.startsWith('0:')) {
      return rawAddress;
    }
    
    const address = Address.parse(rawAddress);
    return address.toString({ urlSafe: true, bounceable: true });
  } catch (error) {
    console.error('Ошибка конвертации адреса:', error);
    return rawAddress;
  }
}

export function convertRawToUserFriendlyTest(rawAddress: string): string {
  try {
    if (!rawAddress.startsWith('0:')) {
      return rawAddress;
    }
    
    const address = Address.parse(rawAddress);
    return address.toString({ urlSafe: true, bounceable: false , testOnly: true});
  } catch (error) {
    console.error('Ошибка конвертации адреса:', error);
    return rawAddress;
  }
}

/**
 * Получает owner_address NFT через toncenter API
 */
export async function getNftOwnerAddress(
  nftAddress: string, 
  isTestnet: boolean
): Promise<string | null> {
  try {
    const apiUrl = isTestnet 
      ? 'https://testnet.toncenter.com/api/v3/nft/items'
      : 'https://toncenter.com/api/v3/nft/items';
    
    // Конвертируем адрес в raw формат если нужно
    const rawAddress = convertUserFriendlyToRaw(nftAddress);
    
    const response = await fetch(
      `${apiUrl}?address=${encodeURIComponent(rawAddress)}&include_on_sale=false&limit=1&offset=0`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.nft_items && data.nft_items.length > 0) {
      const nftItem = data.nft_items[0];
      return nftItem.owner_address || null;
    }
    
    return null;
  } catch (error) {
    console.error('Ошибка получения owner_address:', error);
    return null;
  }
}

/**
 * Проверяет DNS запись домена (4 поле - resolver)
 */
export async function checkDomainDNSRecord(
  domainAddress: string, 
  isTestnet: boolean
): Promise<string | null> {
  try {
    const apiUrl = isTestnet 
      ? 'https://testnet.toncenter.com/api/v3/runGetMethod'
      : 'https://toncenter.com/api/v3/runGetMethod';
    
    const rawAddress = convertUserFriendlyToRaw(domainAddress);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: rawAddress,
        method: 'dnsresolve',
        stack: [['tvm.Slice', '']]
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.stack && data.stack.length >= 4) {
      // 4 поле - это resolver address (индекс 3)
      const resolverCell = data.stack[3];
      if (resolverCell && resolverCell[0] === 'tvm.Cell') {
        // Парсим cell чтобы получить адрес
        const parseResponse = await fetch(`${API_PAYLOAD_URL}/api/v1/parse_cell`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cell_bytes: resolverCell[1]
          })
        });
        
        if (parseResponse.ok) {
          const parseData = await parseResponse.json();
          if (parseData && parseData.address) {
            return parseData.address;
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Ошибка проверки DNS записи домена:', error);
    return null;
  }
}

/**
 * Получает информацию о NFT через toncenter API
 */
export async function getNftInfo(
  nftAddress: string,
  isTestnet: boolean
): Promise<any> {
  try {
    const apiUrl = isTestnet 
      ? 'https://testnet.toncenter.com/api/v3/nft/items'
      : 'https://toncenter.com/api/v3/nft/items';
    
    const rawAddress = convertUserFriendlyToRaw(nftAddress);
    
    const response = await fetch(
      `${apiUrl}?address=${encodeURIComponent(rawAddress)}&include_on_sale=false&limit=1&offset=0`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.nft_items && data.nft_items.length > 0) {
      return data.nft_items[0];
    }
    
    return null;
  } catch (error) {
    console.error('Ошибка загрузки NFT информации:', error);
    return null;
  }
}

/**
 * Проверяет активность SBT зоны
 */
export async function checkSbtZoneActivity(
  zone: any,
  isTestnet: boolean
): Promise<boolean> {
  try {
    if (!zone.address) return false;
    
    // Проверяем DNS запись зоны
    const resolverAddress = await checkDomainDNSRecord(zone.address, isTestnet);
    
    if (resolverAddress && zone.collectionAddress) {
      // Сравниваем resolverAddress с collectionAddress зоны
      return resolverAddress.toLowerCase() === zone.collectionAddress.toLowerCase();
    }
    
    return false;
  } catch (error) {
    console.error('Ошибка проверки активности SBT зоны:', error);
    return false;
  }
}

/**
 * Проверяет активность субдомена в SBT зоне
 */
export async function checkSbtSubdomainActivity(
  subdomain: any,
  isTestnet: boolean
): Promise<boolean> {
  try {
    if (!subdomain.zone) return false;
    
    // Проверяем активность зоны
    return await checkSbtZoneActivity(subdomain.zone, isTestnet);
  } catch (error) {
    console.error('Ошибка проверки активности субдомена:', error);
    return false;
  }
}

/**
 * Генерирует URL изображения для зоны
 */
export function getZoneImageUrl(zone: any): string {
  if (!zone.name) return '/src/pages/ManageDomainPage/img/subdom_logo.png';
  
  const zoneName = zone.name.replace('.ton', '');
  
  // Проверяем тип зоны
  const proxyValue = zone.proxy;
  const isProxy = typeof proxyValue === 'number' 
    ? proxyValue === 1 
    : proxyValue?.toLowerCase() === 'proxy' || proxyValue === '1';
  
  if (isProxy) {
    // Proxy зона
    return `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${zoneName}.png`;
  } else {
    // SBT зона
    return `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${zoneName}.png`;
  }
}

/**
 * Генерирует URL изображения для субдомена
 */
export function getSubdomainImageUrl(subdomain: any, zone?: any): string {
  if (!subdomain.name) return '/src/pages/ManageDomainPage/img/subdom_logo.png';
  
  const parts = subdomain.name.split('.');
  if (parts.length < 3) return '/src/pages/ManageDomainPage/img/subdom_logo.png';
  
  const subdomainName = parts[0];
  const domainName = parts.slice(1).join('.');
  const cleanDomainName = domainName.replace('.ton', '');
  
  // Определяем тип зоны
  const actualZone = zone || subdomain.zone;
  if (!actualZone) return '/src/pages/ManageDomainPage/img/subdom_logo.png';
  
  const proxyValue = actualZone.proxy;
  const isProxy = typeof proxyValue === 'number' 
    ? proxyValue === 1 
    : proxyValue?.toLowerCase() === 'proxy' || proxyValue === '1';
  
  if (isProxy) {
    // Proxy субдомен
    return `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${cleanDomainName}/${subdomainName}.png`;
  } else {
    // SBT субдомен
    return `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${cleanDomainName}/${subdomainName}.png`;
  }
}

/**
 * Проверяет, является ли зона Proxy зоной
 */
export function isProxyZone(zone: any): boolean {
  if (!zone) return false;
  
  const proxyValue = zone.proxy;
  
  // Если это число
  if (typeof proxyValue === 'number') {
    return proxyValue === 1;
  }
  
  // Если это строка
  if (typeof proxyValue === 'string') {
    const lowerValue = proxyValue.toLowerCase();
    return lowerValue === 'proxy' || lowerValue === '1';
  }
  
  return false;
}

/**
 * Проверяет, является ли зона SBT зоной
 */
export function isSbtZone(zone: any): boolean {
  if (!zone) return false;
  
  const proxyValue = zone.proxy;
  
  // Если это число
  if (typeof proxyValue === 'number') {
    return proxyValue === 0;
  }
  
  // Если это строка
  if (typeof proxyValue === 'string') {
    const lowerValue = proxyValue.toLowerCase();
    return lowerValue === 'sbt' || lowerValue === '0';
  }

  return false;
}

/**
 * tonsite://name.ton -> https://name.ton.run (публичный HTTP-шлюз для
 * обычного браузера — он не понимает кастомную схему tonsite:// напрямую).
 * Домен БЕЗ ".ton" на конце перед ".ton.run" — проверено вживую curl'ом:
 * https://foundation.ton.run отвечает 200, https://foundation.ton.ton.run
 * падает с TLS-ошибкой (см. server/services/platformCache/crawler.ts,
 * тот же трансформ там для пинга живости сайтов).
 */
export function tonsiteToGatewayUrl(tonsiteUrl: string): string {
  const name = tonsiteUrl.replace(/^tonsite:\/\//i, '').replace(/\.ton$/i, '');
  return `https://${name}.ton.run`;
}
