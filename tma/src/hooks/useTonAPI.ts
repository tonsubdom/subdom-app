import { useState, useCallback } from 'react';

export const useTonAPI = (is_testnet: boolean) => {
  const API_URL = is_testnet
    ? "https://testnet.toncenter.com/api/v3/"
    : "https://toncenter.com/api/v3/";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWithRetry = useCallback(async (endpoint: string, method: string = "GET", body: any = null, maxRetries = 5) => {
    let attempts = 0;

    while (attempts < maxRetries) {
      setLoading(true);
      try {
        const options: RequestInit = {
          method,
          headers: { "Content-Type": "application/json" },
          ...(body ? { body: JSON.stringify(body) } : {}),
        };

        const response = await fetch(`${API_URL}${endpoint}`, options);

        if (response.status === 429) {
          const waitTime = 1000;
          console.warn(`Rate limit exceeded. Retrying in ${waitTime / 1000} sec...`);
          await new Promise(res => setTimeout(res, waitTime));
          attempts++;
          continue;
        }

        return await response.json();
      } catch (err) {
        console.error(`Request failed (attempt ${attempts + 1}):`, err);
        return null;
      } finally {
        setLoading(false);
      }
    }

    console.error(`API failed after ${maxRetries} attempts`);
    return null;
  }, [API_URL]);

  const runGetMethod = useCallback(async (address: string, method: string, stack: any[] = []) => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchWithRetry(`runGetMethod`, "POST", { address, method, stack });

      return result?.exit_code === 2
        ? { success: true, data: result }
        : { success: false, data: result };

    } catch (err) {
      console.error("runGetMethod failed:", err);
      return { success: false, error: "Network error" };
    }
  }, [fetchWithRetry]);

  const getNftItem = useCallback(async (address: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchWithRetry(`nft/items?address=${address}&limit=1&offset=0`);

      if (!data?.nft_items?.length) {
        console.warn("NFT not found for address:", address);
        return null;
      }

      const item = data.nft_items[0];
      const itemMetadata = data.metadata?.[item.address]?.token_info?.[0] || {};
      const collectionMetadata = data.metadata?.[item.collection?.address]?.token_info?.[0] || {};

      return {
        title: item.content?.domain || itemMetadata.name || "Unknown",
        image: item.content?.image || itemMetadata.image || "",
        subtitle: collectionMetadata.name || "",
        owner_address: item?.owner_address || "",
      };
    } catch (err) {
      console.error("Error fetching NFT item:", err);
      return null;
    }
  }, [fetchWithRetry]);

  const getNftDomainItem = useCallback(async (address: string, collectionAddress: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchWithRetry(`nft/items?address=${address}&collection_address=${collectionAddress}&limit=1&offset=0`);

      if (!data?.nft_items?.length) {
        console.warn("NFT not found for address:", address);
        return null;
      }

      const item = data.nft_items[0];
      const itemMetadata = data.metadata?.[item.address]?.token_info?.[0] || {};
      const collectionMetadata = data.metadata?.[item.collection?.address]?.token_info?.[0] || {};

      return {
        title: item.content?.domain?.replace(/\.ton$/, "") || "",
        image: item.content?.image || itemMetadata.image || "",
        subtitle: collectionMetadata.name || "",
        owner_address: item?.owner_address || "",
      };
    } catch (err) {
      console.error("Error fetching NFT item:", err);
      return null;
    }
  }, [fetchWithRetry]);


  const getNftCollection = useCallback(async (collectionAddress: string) => {
    setLoading(true);
    setError(null);

    try {
      console.log(`Fetching collection for address: ${collectionAddress}`);

      const data = await fetchWithRetry(`nft/collections?collection_address=${collectionAddress}&limit=1&offset=0`);

      if (!data?.nft_collections?.length) {
        console.warn("NFT Collection not found:", collectionAddress);
        return null;
      }

      const collection = data.nft_collections[0];
      const metadata = data.metadata?.[collection.address]?.token_info?.[0] || {};
      const collectionContent = collection.collection_content || {};

      return {
        title: metadata.name || collectionContent.name || "",
        image: metadata.image || "",
        subtitle: "NFT Collection",
        owner_address: collection?.owner_address || "",
      };

    } catch (err) {
      console.error("Error fetching NFT collection:", err);
      return null;
    }
  }, [fetchWithRetry]);

  const getCodeHash = useCallback(async (address: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchWithRetry(`accountStates?address=${address}&include_boc=false`);

      if (!data?.accounts?.length) {
        console.warn("Contract not found:", address);
        return null;
      }

      return data.accounts[0]?.code_hash || null;
    } catch (err) {
      console.error("Error fetching code hash:", err);
      return null;
    }
  }, [fetchWithRetry]);

  return { fetchWithRetry, runGetMethod, getNftItem, getNftDomainItem, getNftCollection, getCodeHash, loading, error };
};
