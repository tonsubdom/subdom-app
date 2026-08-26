// Порт builder-api-master/app/api/v1/contracts/dns/{item,opcodes}.py +
// .../routers/dns.py. Один DNS-итем (домен/субдомен), 4 категории записи:
// next_resolver / storage / wallet / site. Каждая операция — ОДНО сообщение
// на сам dns_item_address, без state_init (итем уже существует).

import { Address, beginCell, Cell } from '@ton/core';

const OP_CHANGE_DNS_RECORD = 0x4eb1f0f9;

const CategoryPrefix = {
  next_resolver: 0xba93,
  storage: 0x7473,
  wallet: 0x9fd3,
  site: 0xad01,
} as const;

// sha256("...") ключи категорий — 1:1 с DNSItemCategoryKey (dns/opcodes.py).
const CategoryKey = {
  next_resolve: 0x19f02441ee588fdb26ee24b2568dd035c3c9206e11ab979be62e55558a1d17ffn,
  storage: 0x49a25f9feefaffecad0fcd30c50dc9331cff8b55ece53def6285c09e17e6f5d7n,
  wallet: 0xe8d44050873dba865aa7c170ab4cce64d90839a34dcfd6cf71d14e0205443b1bn,
  site: 0xfbae041b02c41ed0fd8a4efb039bc780dd6af4a1f0c420f42561ae705dda43fen,
} as const;

function buildChangeDnsRecordBody(key: bigint, val: Cell | null, queryId: number): Cell {
  const b = beginCell().storeUint(OP_CHANGE_DNS_RECORD, 32).storeUint(queryId, 64).storeUint(key, 256);
  if (val) b.storeRef(val);
  return b.endCell();
}

export function buildSetNextResolverBody(resolverAddress: Address | string, queryId = 0): Cell {
  const val = beginCell()
    .storeUint(CategoryPrefix.next_resolver, 16)
    .storeAddress(typeof resolverAddress === 'string' ? Address.parse(resolverAddress) : resolverAddress)
    .storeUint(0, 8)
    .endCell();
  return buildChangeDnsRecordBody(CategoryKey.next_resolve, val, queryId);
}

export function buildSetStorageRecordBody(bagIdHex: string, queryId = 0): Cell {
  const val = beginCell()
    .storeUint(CategoryPrefix.storage, 16)
    .storeBuffer(Buffer.from(bagIdHex, 'hex'))
    .storeUint(0, 8)
    .endCell();
  return buildChangeDnsRecordBody(CategoryKey.storage, val, queryId);
}

export function buildSetWalletRecordBody(walletAddress: Address | string, queryId = 0): Cell {
  const val = beginCell()
    .storeUint(CategoryPrefix.wallet, 16)
    .storeAddress(typeof walletAddress === 'string' ? Address.parse(walletAddress) : walletAddress)
    .storeUint(0, 8)
    .endCell();
  return buildChangeDnsRecordBody(CategoryKey.wallet, val, queryId);
}

export function buildSetSiteRecordBody(adnlAddressHex: string, queryId = 0): Cell {
  const val = beginCell()
    .storeUint(CategoryPrefix.site, 16)
    .storeBuffer(Buffer.from(adnlAddressHex, 'hex'))
    .storeUint(0, 8)
    .endCell();
  return buildChangeDnsRecordBody(CategoryKey.site, val, queryId);
}

export type DnsRecordKind = 'next_resolver' | 'storage' | 'wallet' | 'site';

export function buildDeleteRecordBody(kind: DnsRecordKind, queryId = 0): Cell {
  const keyMap: Record<DnsRecordKind, bigint> = {
    next_resolver: CategoryKey.next_resolve,
    storage: CategoryKey.storage,
    wallet: CategoryKey.wallet,
    site: CategoryKey.site,
  };
  return buildChangeDnsRecordBody(keyMap[kind], null, queryId);
}
