import { NETWORK_CONFIGS, SubdomainClassifier, TonCenterAPI } from './services/platformCache/toncenter-api-config';

async function run(isTestnet: boolean) {
  const label = isTestnet ? 'testnet' : 'mainnet';
  const config = NETWORK_CONFIGS[isTestnet ? 'testnet' : 'mainnet'];
  const api = new TonCenterAPI(isTestnet);
  const classifier = new SubdomainClassifier(isTestnet);

  console.log(`\n=== ${label} ===`);
  console.log('PLATFORM_OWNER:', config.DEFAULT_ADDRESSES.PLATFORM_OWNER);
  console.log('CODE_HASHES:', config.CODE_HASHES);

  const { nft_collections } = await api.getCollectionsByOwner(config.DEFAULT_ADDRESSES.PLATFORM_OWNER, 1000);
  console.log('raw nft_collections length:', nft_collections.length);

  const sampleHashes = [...new Set(nft_collections.map((c: any) => c.code_hash))];
  console.log('distinct code_hash values seen in response:', sampleHashes);

  const zoneCollections = nft_collections.filter((c: any) => classifier.isSubdomainCollection(c));
  const wrapperCollection = nft_collections.find((c: any) => classifier.isNFTWrapperCollection(c));
  console.log('zoneCollections (proxy+sbt) length:', zoneCollections.length);
  console.log('wrapperCollection found:', !!wrapperCollection);
}

(async () => {
  await run(true);
  await run(false);
})();
