// Порт builder-api-master/app/api/v1/contracts/sbt_subdomain/{tlb,collection,opcodes,codes}.py
// SBT-mode subdomain-коллекция (deploy_collection_and_set_dns — см. index.ts).

import { Address, beginCell, Cell, contractAddress } from '@ton/core';
import { SbtSubdomainCode } from './codes';

const OpCode = {
  top_up: 0xd372158c,
  fill_up: 0x370fec51,
  change_owner: 0x3,
  change_content: 0x4,
  return_balance: 0x5,
} as const;

export interface SbtOffchainContent {
  content: { uri: string };
  common_content: { suffix_uri: string };
}

function serializeContent(c: SbtOffchainContent): Cell {
  const inner = beginCell().storeUint(1, 8).storeStringTail(c.content.uri).endCell();
  const common = beginCell().storeStringTail(c.common_content.suffix_uri).endCell();
  return beginCell().storeRef(inner).storeRef(common).endCell();
}

export interface SbtSubdomainCollectionConfig {
  id: number;
  tld: string;
  domain: string;
}

function serializeConfig(c: SbtSubdomainCollectionConfig): Cell {
  return beginCell()
    .storeRef(beginCell().storeStringTail(c.tld).endCell())
    .storeRef(beginCell().storeStringTail(c.domain).endCell())
    .storeUint(c.id, 16)
    .endCell();
}

export interface SbtSubdomainCollectionData {
  owner_address: string;
  second_owner_address: string;
  partner_address: string;
  content: SbtOffchainContent;
  config: SbtSubdomainCollectionConfig;
}

function serializeData(d: SbtSubdomainCollectionData): Cell {
  const itemCode = Cell.fromBoc(Buffer.from(SbtSubdomainCode.item, 'hex'))[0];
  return beginCell()
    .storeAddress(Address.parse(d.owner_address))
    .storeAddress(Address.parse(d.second_owner_address))
    .storeAddress(Address.parse(d.partner_address))
    .storeRef(serializeContent(d.content))
    .storeRef(itemCode)
    .storeRef(serializeConfig(d.config))
    .endCell();
}

let collectionCodeCell: Cell | null = null;
function getCollectionCode(): Cell {
  if (!collectionCodeCell) collectionCodeCell = Cell.fromBoc(Buffer.from(SbtSubdomainCode.collection, 'hex'))[0];
  return collectionCodeCell;
}

export interface PreparedSbtSubdomainCollection {
  address: Address;
  stateInit: { code: Cell; data: Cell };
}

export function prepareSbtSubdomainCollection(data: SbtSubdomainCollectionData): PreparedSbtSubdomainCollection {
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

export function buildChangeContentBody(newContent: SbtOffchainContent, queryId = 0): Cell {
  return beginCell().storeUint(OpCode.change_content, 32).storeUint(queryId, 64).storeRef(serializeContent(newContent)).endCell();
}

export function buildReturnBalanceBody(queryId = 0): Cell {
  return beginCell().storeUint(OpCode.return_balance, 32).storeUint(queryId, 64).endCell();
}
