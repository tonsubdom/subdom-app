// Порт escrow.fc (subdom_api/subdomain-contracts-main/escrow) на TypeScript.
// Минимальный эскроу для сделок Market -> Коллекции (продажа бенефициарства
// Proxy-зоны) — один контракт на одну сделку. Держит депозит покупателя
// между оплатой и моментом, когда площадка исполняет change_partner_share
// на зоне и одновременно высвобождает эскроу продавцу (см. index.ts,
// buildBeneficiaryRelease). release/refund может вызвать только owner_addr
// (адрес площадки) — та же авторизация, что и у change_partner_share,
// потому что реальная "услуга" в сделке это именно тот вызов, а не
// что-то, что эскроу способен проверить сам. claim_timeout_refund —
// единственный путь, не зависящий от площадки.

import { Address, beginCell, Cell, contractAddress } from '@ton/core';
import { EscrowCode } from './codes';

// Зеркало min_deposit в imports/constants.fc — ниже этого контракт сам
// отбивает депозит (err::deposit_too_small, баунс почти всей суммы
// обратно), потому что min_tons_for_storage (0.05 TON) + forward-fee
// деплоя (~0.01-0.02 TON) съели бы непропорционально большую долю малой
// сделки (живой случай 2026-11-26: при 0.1 TON продавец получил бы
// ~35-40% от заявленной цены). Экспортируется, чтобы UI мог отсечь
// заведомо провальную сумму ДО отправки транзакции, не дожидаясь баунса.
export const MIN_ESCROW_DEPOSIT_TON = 1;

const OpCode = {
  deposit: 0x1,
  release: 0x2,
  refund: 0x3,
  claim_timeout_refund: 0x4,
  admin_sweep: 0x6,
} as const;

export interface EscrowConfig {
  owner_address: string; // адрес площадки
  seller_address: string;
  buyer_address: string;
  deal_id: bigint;
  deadline: number; // unix-время (сек)
}

function serializeEscrowData(c: EscrowConfig): Cell {
  return beginCell()
    .storeAddress(Address.parse(c.owner_address))
    .storeAddress(Address.parse(c.seller_address))
    .storeAddress(Address.parse(c.buyer_address))
    .storeUint(c.deal_id, 64)
    .storeUint(c.deadline, 32)
    .storeUint(0, 8) // status: 0 = funded
    .endCell();
}

let escrowCodeCell: Cell | null = null;
function getEscrowCode(): Cell {
  if (!escrowCodeCell) escrowCodeCell = Cell.fromBoc(Buffer.from(EscrowCode, 'hex'))[0];
  return escrowCodeCell;
}

export interface PreparedEscrow {
  address: Address;
  stateInit: { code: Cell; data: Cell };
}

export function prepareEscrow(config: EscrowConfig): PreparedEscrow {
  const code = getEscrowCode();
  const data = serializeEscrowData(config);
  const address = contractAddress(0, { code, data });
  return { address, stateInit: { code, data } };
}

export function buildDepositBody(queryId = 0): Cell {
  return beginCell().storeUint(OpCode.deposit, 32).storeUint(queryId, 64).endCell();
}

export function buildReleaseBody(queryId = 0): Cell {
  return beginCell().storeUint(OpCode.release, 32).storeUint(queryId, 64).endCell();
}

export function buildRefundBody(queryId = 0): Cell {
  return beginCell().storeUint(OpCode.refund, 32).storeUint(queryId, 64).endCell();
}

export function buildClaimTimeoutRefundBody(queryId = 0): Cell {
  return beginCell().storeUint(OpCode.claim_timeout_refund, 32).storeUint(queryId, 64).endCell();
}

// Только owner_addr (площадка), только после settle (status != 0 — уже
// release/refund/timeout) — забирает застрявший остаток (хранилищный
// резерв, случайный повторный депозит на уже исполненную сделку). Не
// работает на активной сделке — это не обход release/refund.
export function buildAdminSweepBody(queryId = 0): Cell {
  return beginCell().storeUint(OpCode.admin_sweep, 32).storeUint(queryId, 64).endCell();
}
