/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_PUBLIC_URL: string;
  readonly VITE_TONCENTER_API_URL: string;
  readonly VITE_PLATFORM_OWNER_TESTNET: string;
  readonly VITE_NFT_WRAPPER_COLLECTION_TESTNET: string;
  readonly VITE_PROXY_COLLECTION_TESTNET: string;
  readonly VITE_PAYMENT_OWNER_TESTNET: string;
  readonly VITE_PAYMENT_PARTNER_TESTNET: string;
  readonly VITE_PLATFORM_OWNER_MAINNET: string;
  readonly VITE_NFT_WRAPPER_COLLECTION_MAINNET: string;
  readonly VITE_PROXY_COLLECTION_MAINNET: string;
  readonly VITE_PAYMENT_OWNER_MAINNET: string;
  readonly VITE_PAYMENT_PARTNER_MAINNET: string;
  readonly VITE_HASH_PROXY_COLLECTION_TESTNET: string;
  readonly VITE_HASH_SBT_COLLECTION_TESTNET: string;
  readonly VITE_HASH_NFT_WRAPPER_COLLECTION_TESTNET: string;
  readonly VITE_HASH_PROXY_SUBDOMAIN_TESTNET: string;
  readonly VITE_HASH_PROXY_SUBDOMAIN_NEW_TESTNET: string;
  readonly VITE_HASH_SBT_SUBDOMAIN_TESTNET: string;
  readonly VITE_HASH_NFT_WRAPPER_TESTNET: string;
  readonly VITE_HASH_PROXY_COLLECTION_MAINNET: string;
  readonly VITE_HASH_SBT_COLLECTION_MAINNET: string;
  readonly VITE_HASH_NFT_WRAPPER_COLLECTION_MAINNET: string;
  readonly VITE_HASH_PROXY_SUBDOMAIN_MAINNET: string;
  readonly VITE_HASH_PROXY_SUBDOMAIN_NEW_MAINNET: string;
  readonly VITE_HASH_SBT_SUBDOMAIN_MAINNET: string;
  readonly VITE_HASH_NFT_WRAPPER_MAINNET: string;
  readonly VITE_API_SC_PAYLOAD_URL: string;
  readonly VITE_OLD_WRAPPER_COLLECTION_MAINNET: string;
  readonly VITE_OLD_HASH_WRAPPER_COLLECTION_MAINNET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}