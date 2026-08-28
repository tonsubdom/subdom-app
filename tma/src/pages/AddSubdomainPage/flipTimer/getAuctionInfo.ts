//рабочий вариант без апи ключа

// import { getDnsItemIndex } from "./indexByDNSName";
// import { parseB64Address } from "./getAddressFromBoc";

// /**
//  * Ответ API при получении информации об аукционе
//  */
// interface AuctionInfoResponse {
//   ok: boolean;
//   result?: {
//     stack: Array<[string, any]>;
//   };
//   error?: string;
// }

// /**
//  * Распарсенная информация об аукционе
//  */
// export interface ParsedAuctionInfo {
//   maxBidderOwner: string | null;
//   maxBid: bigint;
//   timestamp: number;
//   isActive: boolean;
//   nftAddress: string;
// }

// /**
//  * Получает информацию об аукционе для субдомена
//  * @param subdomainName - Название субдомена (например: "wallet")
//  * @param collectionAddress - Адрес коллекции домена
//  * @param isTestnet - Использовать ли тестнет (по умолчанию false - mainnet)
//  * @returns Распарсенная информация об аукционе или null при ошибке
//  */
// export async function getAuctionInfo(
//   subdomainName: string,
//   collectionAddress: string,
//   isTestnet: boolean = false
// ): Promise<ParsedAuctionInfo | null> {
//   try {
//     const index = getDnsItemIndex(subdomainName);
//     console.log("Subdomain index:", index.toString());

//     const apiUrl = isTestnet
//       ? "https://testnet.toncenter.com/api/v2/runGetMethod"
//       : "https://toncenter.com/api/v2/runGetMethod";

//     console.log("Fetching NFT address by index...");
//     const nftAddressResponse = await fetch(apiUrl, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         accept: "application/json"
//       },
//       body: JSON.stringify({
//         address: collectionAddress,
//         method: "get_nft_address_by_index",
//         stack: [["num", index.toString()]]
//       })
//     });

//     const nftAddressData: AuctionInfoResponse = await nftAddressResponse.json();

//     if (!nftAddressData.ok || !nftAddressData.result) {
//       console.error("Failed to get NFT address:", nftAddressData.error);
//       return null;
//     }

//     const nftAddressCell = nftAddressData.result.stack[0];
//     if (!nftAddressCell || nftAddressCell[0] !== "cell") {
//       console.error("Invalid NFT address response format");
//       return null;
//     }

//     const b64Address = nftAddressCell[1].bytes;
//     const nftAddress = parseB64Address(b64Address, false);

//     if (!nftAddress) {
//       console.error("Failed to parse NFT address");
//       return null;
//     }

//     console.log("NFT Address:", nftAddress);

//     console.log("Fetching auction info...");
//     const auctionInfoResponse = await fetch(apiUrl, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         accept: "application/json"
//       },
//       body: JSON.stringify({
//         address: nftAddress,
//         method: "get_auction_info",
//         stack: []
//       })
//     });

//     const auctionInfoData: AuctionInfoResponse = await auctionInfoResponse.json();

//     if (!auctionInfoData.ok || !auctionInfoData.result) {
//       console.error("Failed to get auction info:", auctionInfoData.error);
//       return null;
//     }

//     const stack = auctionInfoData.result.stack;

//     // Первый элемент - cell с адресом максимального бидера
//     const maxBidderCell = stack[0];
//     let maxBidderOwner: string | null = null;

//     if (maxBidderCell && maxBidderCell[0] === "cell") {
//       const maxBidderB64 = maxBidderCell[1].bytes;
//       maxBidderOwner = parseB64Address(maxBidderB64, false);
//     }

//     // Второй элемент - максимальная ставка в нанотонах (num)
//     const maxBidNum = stack[1];
//     const maxBidHex = maxBidNum[1]; // Формат: "0x..."
//     const maxBid = BigInt(parseInt(maxBidHex, 16));
//     console.log("Max Bid (hex):", maxBidHex, "-> (bigint):", maxBid.toString());

//     // Третий элемент - timestamp окончания аукциона (num)
//     const timestampNum = stack[2];
//     const timestampHex = timestampNum[1]; // Формат: "0x..."
//     const timestamp = parseInt(timestampHex, 16);
//     console.log("Timestamp (hex):", timestampHex, "-> (number):", timestamp);

//     // Проверяем, активен ли аукцион
//     const currentTimestamp = Math.floor(Date.now() / 1000);
//     const isActive = currentTimestamp < timestamp;

//     console.log("Auction Info:", {
//       maxBidderOwner,
//       maxBid: maxBid.toString(),
//       timestamp,
//       isActive
//     });
//     console.table({
//       maxBidderOwner,
//       maxBid: maxBid.toString(),
//       timestamp,
//       isActive
//     });

//     return {
//       maxBidderOwner,
//       maxBid,
//       timestamp,
//       isActive,
//       nftAddress
//     };
//   } catch (error) {
//     console.error("Error getting auction info:", error);
//     return null;
//   }
// }

//с api-ключом для исключения 429

import { getDnsItemIndex } from "./indexByDNSName";
import { parseB64Address } from "./getAddressFromBoc";

/**
 * Ответ API при получении информации об аукционе
 */
interface AuctionInfoResponse {
  ok: boolean;
  result?: {
    stack: Array<[string, any]>;
  };
  error?: string;
}

/**
 * Распарсенная информация об аукционе
 */
export interface ParsedAuctionInfo {
  maxBidderOwner: string | null;
  maxBid: bigint;
  timestamp: number;
  isActive: boolean;
  nftAddress: string;
}

/**
 * Получает информацию об аукционе для субдомена
 * @param subdomainName - Название субдомена (например: "wallet")
 * @param collectionAddress - Адрес коллекции домена
 * @param isTestnet - Использовать ли тестнет (по умолчанию false - mainnet)
 * @returns Распарсенная информация об аукционе или null при ошибке
 */
export async function getAuctionInfo(
  subdomainName: string,
  collectionAddress: string,
  isTestnet: boolean = false
): Promise<ParsedAuctionInfo | null> {
  try {
    const index = getDnsItemIndex(subdomainName);
    console.log("Subdomain index:", index.toString());

    const apiBase = import.meta.env.VITE_API_BASE_URL || '';
    const network = isTestnet ? 'testnet' : 'mainnet';
    const apiUrl = `${apiBase}/api/toncenter-proxy/${network}/api/v2/runGetMethod`;

    console.log("Fetching NFT address by index...");

    // Ключ toncenter теперь подставляется на бэкенде, не во фронте.
    const nftAddressUrl = new URL(apiUrl, window.location.origin);

    const nftAddressResponse = await fetch(nftAddressUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json"
      },
      body: JSON.stringify({
        address: collectionAddress,
        method: "get_nft_address_by_index",
        stack: [["num", index.toString()]]
      })
    });

    // Проверяем статус ответа
    if (!nftAddressResponse.ok) {
      if (nftAddressResponse.status === 429) {
        console.error("Rate limit exceeded (429) when fetching NFT address");
        return null;
      }
      console.error(`HTTP error fetching NFT address: ${nftAddressResponse.status}`);
      return null;
    }

    const nftAddressData: AuctionInfoResponse = await nftAddressResponse.json();

    if (!nftAddressData.ok || !nftAddressData.result) {
      console.error("Failed to get NFT address:", nftAddressData.error);
      return null;
    }

    const nftAddressCell = nftAddressData.result.stack[0];
    if (!nftAddressCell || nftAddressCell[0] !== "cell") {
      console.error("Invalid NFT address response format");
      return null;
    }

    const b64Address = nftAddressCell[1]?.bytes;
    if (!b64Address) {
      console.error("No bytes in NFT address cell");
      return null;
    }

    const nftAddress = parseB64Address(b64Address, false);

    if (!nftAddress) {
      console.error("Failed to parse NFT address");
      return null;
    }

    console.log("NFT Address:", nftAddress);

    console.log("Fetching auction info...");
    
    const auctionInfoUrl = new URL(apiUrl, window.location.origin);

    const auctionInfoResponse = await fetch(auctionInfoUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json"
      },
      body: JSON.stringify({
        address: nftAddress,
        method: "get_auction_info",
        stack: []
      })
    });

    // Проверяем статус ответа
    if (!auctionInfoResponse.ok) {
      if (auctionInfoResponse.status === 429) {
        console.error("Rate limit exceeded (429) when fetching auction info");
        // Возвращаем null, чтобы цепочка продолжилась с calculateProxyNFTAddress
        return null;
      }
      console.error(`HTTP error fetching auction info: ${auctionInfoResponse.status}`);
      return null;
    }

    const auctionInfoData: AuctionInfoResponse = await auctionInfoResponse.json();

    // Если метод не существует или ошибка - возвращаем null для продолжения цепочки
    if (!auctionInfoData.ok || !auctionInfoData.result) {
      console.log("Auction info not found or method doesn't exist - this is normal for first bid");
      return null;
    }

    const stack = auctionInfoData.result.stack;

    // Проверяем что stack существует и имеет достаточно элементов
    if (!stack || !Array.isArray(stack) || stack.length < 3) {
      console.log("Invalid auction info response: stack too short or undefined - normal for first bid");
      return null;
    }

    // БЕЗОПАСНЫЙ ПАРСИНГ с проверками на каждом шаге
    
    // Первый элемент - cell с адресом максимального бидера
    let maxBidderOwner: string | null = null;
    const maxBidderCell = stack[0];
    
    if (maxBidderCell && 
        Array.isArray(maxBidderCell) && 
        maxBidderCell.length >= 2 && 
        maxBidderCell[0] === "cell" && 
        maxBidderCell[1]?.bytes) {
      const maxBidderB64 = maxBidderCell[1].bytes;
      maxBidderOwner = parseB64Address(maxBidderB64, false);
    }

    // Второй элемент - максимальная ставка в нанотонах (num)
    let maxBid = BigInt(0);
    const maxBidNum = stack[1];
    
    if (maxBidNum && 
        Array.isArray(maxBidNum) && 
        maxBidNum.length >= 2 && 
        maxBidNum[0] === "num" && 
        maxBidNum[1]) {
      try {
        const maxBidHex = maxBidNum[1]; // Формат: "0x..."
        maxBid = BigInt(maxBidHex);
        console.log("Max Bid (hex):", maxBidHex, "-> (bigint):", maxBid.toString());
      } catch (error) {
        console.error("Error parsing max bid:", error);
        maxBid = BigInt(0);
      }
    }

    // Третий элемент - timestamp окончания аукциона (num)
    let timestamp = 0;
    const timestampNum = stack[2];
    
    if (timestampNum && 
        Array.isArray(timestampNum) && 
        timestampNum.length >= 2 && 
        timestampNum[0] === "num" && 
        timestampNum[1]) {
      try {
        const timestampHex = timestampNum[1]; // Формат: "0x..."
        timestamp = parseInt(timestampHex, 16);
        console.log("Timestamp (hex):", timestampHex, "-> (number):", timestamp);
      } catch (error) {
        console.error("Error parsing timestamp:", error);
        timestamp = 0;
      }
    }

    // Проверяем, активен ли аукцион
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const isActive = currentTimestamp < timestamp;

    console.log("Auction Info:", {
      maxBidderOwner,
      maxBid: maxBid.toString(),
      timestamp,
      isActive,
      nftAddress
    });

    return {
      maxBidderOwner,
      maxBid,
      timestamp,
      isActive,
      nftAddress
    };
  } catch (error) {
    console.error("Error getting auction info:", error);
    // В случае любой ошибки возвращаем null, чтобы цепочка продолжилась
    return null;
  }
}