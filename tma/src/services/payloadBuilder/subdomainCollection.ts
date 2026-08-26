// Порт builder-api-master/app/api/v1/contracts/subdomain/{tlb,collection,opcodes,codes}.py
// Proxy-mode subdomain-коллекция (создаётся на шаге deploy_bundle — см. index.ts).

import { Address, beginCell, Cell, Dictionary, contractAddress } from '@ton/core';
import { SubdomainCode } from './codes';

const OpCode = {
  top_up: 0xd372158c,
  change_owner: 0x3,
  change_content: 0x4,
  return_balance: 0x5,
  change_prices: 0x6,
  change_partner_share: 0x7,
} as const;

export interface RoyaltyParams {
  address: string;
  share: number;
  denominator: number;
}

function serializeRoyaltyParams(p: RoyaltyParams): Cell {
  return beginCell().storeAddress(Address.parse(p.address)).storeUint(p.share, 16).storeUint(p.denominator, 16).endCell();
}

export interface OffchainContent {
  content: { uri: string };
  common_content: { suffix_uri: string };
}

function serializeContent(c: OffchainContent): Cell {
  const inner = beginCell().storeUint(1, 8).storeStringTail(c.content.uri).endCell();
  const common = beginCell().storeStringTail(c.common_content.suffix_uri).endCell();
  return beginCell().storeRef(inner).storeRef(common).endCell();
}

export interface PartnerShare {
  address: string;
  share: number;
  denominator: number;
}

function serializePartnerShare(p: PartnerShare): Cell {
  return beginCell().storeAddress(Address.parse(p.address)).storeUint(p.share, 16).storeUint(p.denominator, 16).endCell();
}

// Ключ "0".."6" -> цена в TON (0 — цена по умолчанию для длин вне таблицы).
function serializePrices(prices: Record<string, number>): Cell {
  const dict = Dictionary.empty(Dictionary.Keys.Uint(4), Dictionary.Values.BigVarUint(4));
  for (const [lenKey, ton] of Object.entries(prices)) {
    dict.set(Number(lenKey), BigInt(Math.round(ton * 1_000_000_000)));
  }
  return beginCell().storeDictDirect(dict).endCell();
}

export interface SubdomainCollectionConfig {
  tld: string;
  domain: string;
  prices: { prices: Record<string, number> };
  partner_share: PartnerShare;
}

function serializeConfig(c: SubdomainCollectionConfig): Cell {
  return beginCell()
    .storeRef(beginCell().storeStringTail(c.tld).endCell())
    .storeRef(beginCell().storeStringTail(c.domain).endCell())
    .storeRef(serializePrices(c.prices.prices))
    .storeRef(serializePartnerShare(c.partner_share))
    .endCell();
}

export interface SubdomainCollectionData {
  owner_address: string;
  second_owner_address: string;
  content: OffchainContent;
  royalty_params: RoyaltyParams;
  config: SubdomainCollectionConfig;
}

function serializeData(d: SubdomainCollectionData): Cell {
  const itemCode = Cell.fromBoc(Buffer.from(SubdomainCode.item, 'hex'))[0];
  return beginCell()
    .storeAddress(Address.parse(d.owner_address))
    .storeAddress(Address.parse(d.second_owner_address))
    .storeRef(serializeContent(d.content))
    .storeRef(itemCode)
    .storeRef(serializeRoyaltyParams(d.royalty_params))
    .storeRef(serializeConfig(d.config))
    .endCell();
}

let collectionCodeCell: Cell | null = null;
function getCollectionCode(): Cell {
  if (!collectionCodeCell) collectionCodeCell = Cell.fromBoc(Buffer.from(SubdomainCode.collection, 'hex'))[0];
  return collectionCodeCell;
}

export interface PreparedSubdomainCollection {
  address: Address;
  stateInit: { code: Cell; data: Cell };
}

export function prepareSubdomainCollection(data: SubdomainCollectionData): PreparedSubdomainCollection {
  const code = getCollectionCode();
  const dataCell = serializeData(data);
  const address = contractAddress(0, { code, data: dataCell });
  return { address, stateInit: { code, data: dataCell } };
}

export function buildTopUpBody(queryId = 0): Cell {
  return beginCell().storeUint(OpCode.top_up, 32).storeUint(queryId, 64).endCell();
}

export function buildChangeOwnerBody(newOwnerAddress: string, queryId = 0): Cell {
  return beginCell().storeUint(OpCode.change_owner, 32).storeUint(queryId, 64).storeAddress(Address.parse(newOwnerAddress)).endCell();
}

export function buildChangeContentBody(newContent: OffchainContent, newRoyaltyParams: RoyaltyParams, queryId = 0): Cell {
  return beginCell()
    .storeUint(OpCode.change_content, 32)
    .storeUint(queryId, 64)
    .storeRef(serializeContent(newContent))
    .storeRef(serializeRoyaltyParams(newRoyaltyParams))
    .endCell();
}

export function buildReturnBalanceBody(queryId = 0): Cell {
  return beginCell().storeUint(OpCode.return_balance, 32).storeUint(queryId, 64).endCell();
}
