// Порт builder-api-master/app/api/v1/contracts/proxy/{item,opcodes}.py
// Минт Proxy-итема в платформенную Wrapper-коллекцию (3-е сообщение bundle).

import { Address, beginCell, Cell } from '@ton/core';

const OP_MINT_TRANSFER = 0x5fcc3d14;
const OP_TOP_UP = 0xd372158c;

export function buildMintItemBody(
  dnsItemName: string,
  proxyCollectionAddress: string,
  responseAddress: string,
  queryId = 0
): Cell {
  return beginCell()
    .storeUint(OP_MINT_TRANSFER, 32)
    .storeUint(queryId, 64)
    .storeAddress(Address.parse(proxyCollectionAddress))
    .storeAddress(Address.parse(responseAddress))
    .storeMaybeRef(null)
    .storeCoins(250_000_000n) // 0.25 TON, форвард на сам минт-приём
    .storeMaybeRef(beginCell().storeStringTail(dnsItemName).endCell())
    .endCell();
}

export function buildTopUpBody(queryId = 0): Cell {
  return beginCell().storeUint(OP_TOP_UP, 32).storeUint(queryId, 64).endCell();
}
