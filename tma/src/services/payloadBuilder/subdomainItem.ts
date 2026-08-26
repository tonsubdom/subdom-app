// Порт builder-api-master/app/api/v1/contracts/subdomain/item.py (ItemOpCode.claim = 0x1).
// Клейм субдомен-итема после победы в аукционе (передача NFT на кошелёк юзера).

import { beginCell, Cell } from '@ton/core';

const OP_CLAIM = 0x1;

export function buildClaimBody(queryId = 0): Cell {
  return beginCell().storeUint(OP_CLAIM, 32).storeUint(queryId, 64).endCell();
}
