// src/utils/storageContract.ts
//
// Storage-contract (xssnick/tonutils-storage-provider) v1 — деплой "заказа"
// на хранение bag'а у выбранного провайдера с mytonprovider.org. Портировано
// bit-for-bit из pkg/contract/v1.go (PrepareV1DeployData) того же репозитория:
// https://github.com/xssnick/tonutils-storage-provider/blob/master/pkg/contract/v1.go
// Контракт сам по себе (storage-contract.fc) общий для всех провайдеров и
// деплоится клиентом — источник:
// https://github.com/xssnick/tonutils-contracts/blob/master/contracts/storage/storage-contract.fc
//
// TL-B (из комментария в .fc):
//   storage#_ torrent_hash:uint256 active_providers:(HashmapE 256 Provider)
//             owner:MsgAddress file_size:uint64 chunk_size:uint32
//             merkle_hash:uint256 = Storage;
//   (+ key_len:uint8 в хвосте — читается contract-ом после merkle_hash,
//   в Go-структуре StorageV1 это отдельное поле KeyLen, при деплое всегда 0 —
//   контракт сам досчитывает key_len при первом modify_providers, если 0)
//   provider_info#_ payment_max_span:uint32 rate_per_mb_day:Coins = ProviderInfo;
//   modify_providers#3dc680ae query_id:uint64 providers:(HashmapE 256 ProviderInfo) = InternalMsgBody;
//
// Цена: mytonprovider.org отдаёт `price` — стоимость (nanoTON) хранения
// ЗА 200 ГБ ЗА 30 ДНЕЙ (подтверждено в status.priceHint/i18n референсного
// фронта nessshon/mytonprovider-frontend, а не "за МБ*день" буквально, как
// можно было бы подумать по названию поля в API). Реальный per-MB-per-day
// rate для контракта — обратное восстановление по этой же формуле.

import { Address, beginCell, Cell, Dictionary, contractAddress as computeContractAddress, storeStateInit } from '@ton/core';

const V1_CODE_HEX =
  'b5ee9c7241021101000362000114ff00f4a413f4bcf2c80b01020162090202014804030089b8d31ed44d0d3ff31f404306f007f8e2a228307f47c6fa5208e1b02d33fd31fd33fd430d0d31ffa00302550554414036f06136f8c029132e201b3e630318201247ded43d880201580605005db006bb513434ffcc7d010c20c1fd039be87cb86534cff4c7f4cff5d33434c7fe800c3e09dbc420821312d028440d6002014808070026a87df8276f1082084c4b40a120c100923070de002aa9e9ed44d0d3ff71d721fa40d33fd31fd3ff304130039ed001d0d3030171b0925f04e0fa403020fa4430c000f2e06f21c700925f04e001d31f21c000925f05e0d33f22821048f548cebae3023133332282103dc680aeba9131e30d01821061fff683bae302300e0b0a007eed44d0d3ff71d721fa40305122c705f2e19182084c4b4070fb02f8258210b6236d63708010c8cb055005cf1624fa0214cb6a13cb1f12cb3fcbffc98306fb0002fced44d0d3fff404fa40d33fd31fd3ffd307305374c705f2e19120c00099955320ac24b991a4e8de08f404307f8e3a268307f47c6fa5208e2b53138307f40e6fa1b399303252088307f45b308e1403d74cd05003c705b39852088307f45b3007de07e2079132e201b3e630708ae6318308bef2d19605c8cbff14f40058cf160d0c0018cb3fcb1fcbff12cb07c9ed5400a8018307f4966fa5208e4404a453198307f40e6fa131b38e3102d31ffa00d121c000f2d19720c000f2d19801c8cb1f01fa02c9843ff8117029f811c8cb3fcb1fcb3fcc40198307f44307926c21e202926c21e2b31201fe6c12d3ff8308d71820f901541023f910f2e191d33fed44d0d3fff404fa40d33fd31fd3ffd3073053958307f40e6fa1f2e191d33fd31fd33f0cbaf2e1910ad74c20d0d31ffa0030111082084c4b40a001111101a120c100923070def823500ca1205611bc9130925710e2525fa8500f8102a3aa1aa9845390b9923028de19a10f01fe82084c4b40a070fb0206d74c5446d054530052a011103302d739b3f24dd30701c303f24e20d70bff5005bdf24f03d5315023a904219b01a55cad71b013d748d059e45bd7498307baf290f823843ff81122f811c8cb3f12cb1fcb3f1acc50628307f4438210a91baf56708010c8cb055009cf1628fa0218cb6a17cb1f15cb3f100038c98306fb0003c8cbff14f40001cf1613cb3f13cb1fcbffcb07c9ed54a985f39e';

let v1CodeCell: Cell | null = null;
function getV1Code(): Cell {
  if (!v1CodeCell) {
    v1CodeCell = Cell.fromBoc(Buffer.from(V1_CODE_HEX, 'hex'))[0];
  }
  return v1CodeCell;
}

const OP_MODIFY_PROVIDERS = 0x3dc680ae;
// fee::storage в контракте — 0.005 TON, резервируется на каждый proof-цикл;
// плюс газ на сам деплой/первый modify_providers. Берём с запасом.
const DEPLOY_GAS_BUFFER_NANOTON = 100_000_000n; // 0.1 TON

export interface StorageProviderDeal {
  pubkey: string; // hex, 32 байта — ключ провайдера (НЕ его TON-адрес)
  address: string; // TON-адрес провайдера (кошелёк, куда идут выплаты)
  maxSpanSeconds: number;
  ratePerMbDayNanoTon: bigint;
}

export interface BagStorageParams {
  bagIdHex: string; // = torrent_hash
  merkleHashHex: string;
  fileSizeBytes: number;
  pieceSizeBytes: number;
}

/** Восстанавливает реальный on-chain rate_per_mb_day из price mytonprovider.org (см. комментарий выше). */
export function ratePerMbDayFromMyTonProviderPrice(priceNanoTon: number): bigint {
  const REFERENCE_MIB = 200 * 1024; // 200 ГБ в МиБ
  const REFERENCE_DAYS = 30;
  const denom = BigInt(REFERENCE_MIB) * BigInt(REFERENCE_DAYS);
  // Округляем вверх — недоплата провайдеру означает недополученный bounty
  // за span и риск, что он раньше остановит раздачу/пруфы.
  return (BigInt(Math.round(priceNanoTon)) + denom - 1n) / denom;
}

/** Стоимость (nanoTON) хранения sizeBytes в течение days дней у провайдера с данным price. */
export function calculateStorageCostNanoTon(priceNanoTon: number, sizeBytes: number, days: number): bigint {
  const rate = ratePerMbDayFromMyTonProviderPrice(priceNanoTon);
  const sizeMiB = BigInt(Math.ceil(sizeBytes / (1024 * 1024)));
  return rate * sizeMiB * BigInt(Math.max(1, Math.round(days)));
}

function buildStorageDataCell(bag: BagStorageParams, ownerAddress: Address): Cell {
  const torrentHash = Buffer.from(bag.bagIdHex, 'hex');
  const merkleHash = Buffer.from(bag.merkleHashHex, 'hex');
  if (torrentHash.length !== 32) throw new Error('bagIdHex must be 32 bytes (64 hex chars)');
  if (merkleHash.length !== 32) throw new Error('merkleHashHex must be 32 bytes (64 hex chars)');

  return beginCell()
    .storeBuffer(torrentHash) // torrent_hash:uint256
    .storeBit(0) // active_providers:(HashmapE 256 Provider) — пусто при деплое
    .storeAddress(ownerAddress) // owner:MsgAddress
    .storeUint(bag.fileSizeBytes, 64) // file_size:uint64
    .storeUint(bag.pieceSizeBytes, 32) // chunk_size:uint32
    .storeBuffer(merkleHash) // merkle_hash:uint256
    .storeUint(0, 8) // key_len:uint8 — контракт сам досчитает при первом modify_providers
    .endCell();
}

export interface PreparedStorageDeal {
  contractAddress: Address;
  stateInit: { code: Cell; data: Cell };
  body: Cell;
  totalValueNanoTon: bigint;
}

/**
 * Готовит деплой storage-contract'а + первый modify_providers одним
 * сообщением (стандартный TON-паттерн: state_init + body на ещё не
 * задеплоенный адрес). Провайдер сам увидит контракт по (owner, bag) и
 * начнёт раздавать/проверять хранение.
 */
export function prepareStorageDeal(
  bag: BagStorageParams,
  ownerAddress: Address,
  providers: StorageProviderDeal[],
  fundNanoTon: bigint
): PreparedStorageDeal {
  const data = buildStorageDataCell(bag, ownerAddress);
  const code = getV1Code();

  const providersDict = Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());
  for (const p of providers) {
    const providerAddr = Address.parse(p.address);
    const key = BigInt('0x' + providerAddr.hash.toString('hex'));
    const infoCell = beginCell()
      .storeUint(p.maxSpanSeconds, 32)
      .storeCoins(p.ratePerMbDayNanoTon)
      .endCell();
    providersDict.set(key, infoCell);
  }

  const body = beginCell()
    .storeUint(OP_MODIFY_PROVIDERS, 32)
    .storeUint(Math.floor(Math.random() * 0xffffffff), 64)
    .storeDict(providersDict)
    .endCell();

  const addr = computeContractAddress(0, { code, data });

  return {
    contractAddress: addr,
    stateInit: { code, data },
    body,
    totalValueNanoTon: fundNanoTon + DEPLOY_GAS_BUFFER_NANOTON,
  };
}

export function tonscanAddressUrl(address: Address, isTestnet: boolean): string {
  const base = isTestnet ? 'https://testnet.tonscan.org' : 'https://tonscan.org';
  return `${base}/address/${address.toString({ bounceable: true, testOnly: isTestnet })}`;
}

/** Готовое сообщение для tonConnectUI.sendTransaction({messages: [this]}). */
export function toTonConnectMessage(deal: PreparedStorageDeal, isTestnet: boolean) {
  const stateInitCell = beginCell().store(storeStateInit(deal.stateInit)).endCell();
  return {
    address: deal.contractAddress.toString({ bounceable: true, testOnly: isTestnet }),
    amount: deal.totalValueNanoTon.toString(),
    payload: deal.body.toBoc().toString('base64'),
    stateInit: stateInitCell.toBoc().toString('base64'),
  };
}
