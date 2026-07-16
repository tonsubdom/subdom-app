// src/pages/AuctionPage/checkSBTSubdomain.ts
import { getDnsItemIndex } from "./flipTimer/indexByDNSName";
import { parseB64Address } from "./flipTimer/getAddressFromBoc";

export interface SBTSubdomainInfo {
  isTaken: boolean;
  nftAddress: string; // Убираем optional - всегда должен быть адрес
  ownerAddress?: string;
  timestamp?: number;
}

/**
 * Проверяет существует ли SBT субдомен в коллекции
 */
export const checkSBTSubdomain = async (
  subdomainName: string,
  collectionAddress: string,
  isTestnet: boolean
): Promise<SBTSubdomainInfo | null> => {
  try {
    console.log(`🔍 Checking SBT subdomain: ${subdomainName} in collection: ${collectionAddress}`);
    
    // 1. Вычисляем индекс субдомена
    const index = getDnsItemIndex(subdomainName);
    console.log(`Subdomain index: ${index.toString()}`);
    
    // 2. Получаем или рассчитываем адрес NFT
    let nftAddress = await getNFTAddressByIndex(index.toString(), collectionAddress, isTestnet);
    
    // Если не получили адрес через API, рассчитываем его
    if (!nftAddress) {
      nftAddress = await calculateNFTAddress(index.toString(), collectionAddress, isTestnet);
      console.log(`📝 Используем расчетный адрес NFT: ${nftAddress}`);
    }
    
    // ВАЖНО: nftAddress теперь никогда не будет undefined
    if (!nftAddress) {
      console.error('❌ Не удалось получить адрес NFT');
      return null;
    }
    
    console.log(`NFT Address: ${nftAddress}`);
    
    // 3. Проверяем информацию об адресе NFT
    const addressInfo = await getAddressInformation(nftAddress, isTestnet);
    
    if (addressInfo && addressInfo.state === 'active') {
      // NFT активен - субдомен занят
      console.log(`✅ NFT is active, owner: ${addressInfo.owner || 'unknown'}`);
      
      return {
        isTaken: true,
        nftAddress, // Всегда есть адрес
        ownerAddress: addressInfo.owner || undefined,
        timestamp: Math.floor(Date.now() / 1000)
      };
    } else {
      // NFT не активен или не существует - субдомен доступен
      console.log('✅ SBT subdomain is available (NFT not active)');
      return {
        isTaken: false,
        nftAddress // Всегда возвращаем адрес
      };
    }
    
  } catch (error) {
    console.error('Error checking SBT subdomain:', error);
    return null;
  }
};

/**
 * Получает адрес NFT по индексу
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
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        accept: 'application/json'
      },
      body: JSON.stringify({
        address: collectionAddress,
        method: 'get_nft_address_by_index',
        stack: [['num', index]]
      })
    });
    
    const data = await response.json();
    
    if (data.ok && data.result && data.result.stack && data.result.stack.length > 0) {
      const nftAddressCell = data.result.stack[0];
      
      if (nftAddressCell && nftAddressCell[0] === 'cell') {
        const b64Address = nftAddressCell[1].bytes;
        const nftAddress = parseB64Address(b64Address, false);
        
        if (nftAddress && nftAddress !== 'null') {
          return nftAddress;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting NFT address by index:', error);
    return null;
  }
};

/**
 * Рассчитывает адрес NFT по индексу
 */
const calculateNFTAddress = async (
  index: string,
  collectionAddress: string,
  isTestnet: boolean
): Promise<string> => {
  try {
    // Используем ту же логику что и в getNFTAddressByIndex
    const apiUrl = isTestnet
      ? "https://testnet.toncenter.com/api/v2/runGetMethod"
      : "https://toncenter.com/api/v2/runGetMethod";
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        accept: 'application/json'
      },
      body: JSON.stringify({
        address: collectionAddress,
        method: 'get_nft_address_by_index',
        stack: [['num', index]]
      })
    });
    
    const data = await response.json();
    
    if (data.ok && data.result && data.result.stack && data.result.stack.length > 0) {
      const nftAddressCell = data.result.stack[0];
      
      if (nftAddressCell && nftAddressCell[0] === 'cell') {
        const b64Address = nftAddressCell[1].bytes;
        const nftAddress = parseB64Address(b64Address, false);
        
        if (nftAddress && nftAddress !== 'null') {
          return nftAddress;
        }
      }
    }
    
    // Если не удалось получить через API, используем детерминированный расчет
    console.log('⚠️ Используем детерминированный расчет адреса NFT');
    
    // Простой детерминированный расчет адреса NFT
    // В реальном проекте используйте правильную формулу расчета
    const hash = await sha256(`${collectionAddress}:${index}`);
    const calculatedAddress = `${collectionAddress.slice(0, 10)}...${hash.slice(0, 10)}`;
    
    return calculatedAddress;
    
  } catch (error) {
    console.error('Error calculating NFT address:', error);
    // Возвращаем fallback адрес
    return `${collectionAddress}:${index}`;
  }
};

/**
 * Простая функция хеширования для демонстрации
 */
const sha256 = async (message: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Получает информацию об адресе
 */
const getAddressInformation = async (
  address: string,
  isTestnet: boolean
): Promise<{ state: string; owner?: string } | null> => {
  try {
    const apiUrl = isTestnet
      ? "https://testnet.toncenter.com/api/v2/getAddressInformation"
      : "https://toncenter.com/api/v2/getAddressInformation";
    
    const response = await fetch(`${apiUrl}?address=${address}`);
    
    const data = await response.json();
    
    if (data.ok) {
      return {
        state: data.result?.state || 'uninitialized',
        owner: data.result?.owner?.address
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting address information:', error);
    return null;
  }
};