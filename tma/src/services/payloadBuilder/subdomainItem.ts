// Порт builder-api-master/app/api/v1/contracts/subdomain/item.py (ItemOpCode.claim = 0x1).
// Клейм субдомен-итема после победы в аукционе (передача NFT на кошелёк юзера).

import { Address, beginCell, Cell } from '@ton/core';

const OP_CLAIM = 0x1;

export function buildClaimBody(queryId = 0): Cell {
  return beginCell().storeUint(OP_CLAIM, 32).storeUint(queryId, 64).endCell();
}

// Стандартный TEP-62 transfer (op 0x5fcc3d14) — идентичный формат в
// transfer_ownership обоих item.fc (subdomain-contracts-main и
// proxy-contracts-main, см. Obsidian subdom_api). Для кнопки "Передать"
// (ProfileWidget) — прямой перевод итема на другой адрес, без
// Market/эскроу. forward_amount=0 — получателю не нужно уведомление
// (op::ownership_assigned), это просто обычная передача владения.
const OP_TRANSFER = 0x5fcc3d14;

export function buildTransferBody(
  newOwnerAddress: string,
  responseAddress: string,
  queryId = 0
): Cell {
  return beginCell()
    .storeUint(OP_TRANSFER, 32)
    .storeUint(queryId, 64)
    .storeAddress(Address.parse(newOwnerAddress))
    .storeAddress(Address.parse(responseAddress))
    .storeMaybeRef(null) // custom_payload
    .storeCoins(0) // forward_amount
    .storeBit(false) // forward_payload: Either Cell ^Cell, пустой inline-вариант
    .endCell();
}
