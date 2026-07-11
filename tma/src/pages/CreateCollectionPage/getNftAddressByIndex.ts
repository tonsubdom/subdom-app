// /src/pages/CreateCollectionPage/getNftAddressByIndex.ts

import { parseB64Address } from "../AddSubdomainPage/flipTimer/getAddressFromBoc";
import { getDnsItemIndex } from "../AddSubdomainPage/flipTimer/indexByDNSName";

interface AuctionInfoResponse {
  ok: boolean;
  result?: {
    stack: Array<[string, any]>;
  };
  error?: string;
}

export async function getAddressDomainByIndex( domainName: string,
  collectionAddress: string,
  isTestnet: boolean = false) {
    try {
        const index = getDnsItemIndex(domainName);
        console.log("Subdomain index:", index.toString());
    
        const apiUrl = isTestnet
          ? "https://testnet.toncenter.com/api/v2/runGetMethod"
          : "https://toncenter.com/api/v2/runGetMethod";
    
        console.log("Fetching NFT address by index...");
        const nftAddressResponse = await fetch(apiUrl, {
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
    
        const b64Address = nftAddressCell[1].bytes;
        const nftAddress = parseB64Address(b64Address, false);
    
        if (!nftAddress) {
          console.error("Failed to parse NFT address");
          return null;
        }
    
        console.log("NFT Address:", nftAddress)
        return nftAddress;
}
catch (error) {
    console.error("Error getting auction info:", error);
    return null;
  }
}