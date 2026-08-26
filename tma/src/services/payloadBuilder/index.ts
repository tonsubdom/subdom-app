// Локальный (клиентский) построитель payload'ов — порт builder-api-master
// (Python/FastAPI) на TypeScript. Устраняет сетевую зависимость минта/DNS-
// операций от аптайма отдельного бэкенда (тот же принцип, что уже применён
// к чтению через toncenter — см. заметку "Миграция на ончейн" в Obsidian).
//
// Публичный Swagger/SDK-бэкенд (api.subdom.zone) НЕ выводится из эксплуатации
// этим модулем — он остаётся для партнёров и как справочный источник правды
// для TL-B-схем. Этот модуль — независимая, но эквивалентная реализация той
// же логики на клиенте, портированная 1:1 из его исходников (см. комментарии
// в каждом файле подпапки).
//
// ⚠️ Не проверено вживую (нет тестового кошелька в песочнице агента) —
// прежде чем подключать взамен реальных вызовов API, юзеру нужно прогнать
// каждую операцию на testnet и сверить итоговый адрес/payload с тем, что
// сейчас отдаёт бэкенд на тех же входных данных.

import { Address, beginCell, Cell, storeStateInit } from '@ton/core';
import * as Dns from './dns';
import * as ProxyItem from './proxyItem';
import * as SubdomainItem from './subdomainItem';
import { prepareSubdomainCollection, buildTopUpBody as buildSubdomainTopUpBody, type SubdomainCollectionData } from './subdomainCollection';
import { prepareSbtSubdomainCollection, buildTopUpBody as buildSbtTopUpBody, type SbtSubdomainCollectionData } from './sbtSubdomainCollection';

export interface TonConnectMessage {
  address: string;
  amount: string;
  payload: string;
  stateInit?: string;
}

export interface TransactionResponse {
  validUntil: number;
  messages: TonConnectMessage[];
}

function validUntil(): number {
  return Math.floor(Date.now() / 1000) + 360;
}

function cellToBase64(cell: Cell): string {
  return cell.toBoc().toString('base64');
}

function stateInitToBase64(stateInit: { code: Cell; data: Cell }): string {
  return beginCell().store(storeStateInit(stateInit)).endCell().toBoc().toString('base64');
}

function friendly(address: Address, isTestnet: boolean): string {
  return address.toString({ bounceable: true, testOnly: isTestnet });
}

// ============ deploy_bundle (Proxy: коллекция + next_resolver + минт) ============

export interface DeployBundlePayload {
  proxy_collection_address: string;
  user_wallet_address: string;
  dns_item_address: string;
  dns_item_name: string;
  query_id?: number;
  owner_address: string;
  second_owner_address: string;
  content: SubdomainCollectionData['content'];
  royalty_params: SubdomainCollectionData['royalty_params'];
  config: SubdomainCollectionData['config'];
}

export function buildDeployBundle(payload: DeployBundlePayload, isTestnet: boolean): TransactionResponse {
  const queryId = payload.query_id ?? 0;
  const collection = prepareSubdomainCollection({
    owner_address: payload.owner_address,
    second_owner_address: payload.second_owner_address,
    content: payload.content,
    royalty_params: payload.royalty_params,
    config: payload.config,
  });
  const collectionAddress = friendly(collection.address, isTestnet);
  const dnsItemAddress = friendly(Address.parse(payload.dns_item_address), isTestnet);
  const userWalletAddress = friendly(Address.parse(payload.user_wallet_address), isTestnet);

  return {
    validUntil: validUntil(),
    messages: [
      {
        address: collectionAddress,
        amount: '50000000', // 0.05 TON
        payload: cellToBase64(buildSubdomainTopUpBody(queryId)),
        stateInit: stateInitToBase64(collection.stateInit),
      },
      {
        address: dnsItemAddress,
        amount: '20000000', // 0.02 TON — сумма именно бандл-контекста (не 0.025, как у отдельного dns-роута)
        payload: cellToBase64(Dns.buildSetNextResolverBody(collection.address, queryId)),
      },
      {
        address: dnsItemAddress,
        amount: '1000000000', // 1 TON
        payload: cellToBase64(
          ProxyItem.buildMintItemBody(payload.dns_item_name, payload.proxy_collection_address, userWalletAddress, queryId)
        ),
      },
    ],
  };
}

// ============ sbt-subdomain/deploy_collection_and_set_dns ============

export interface DeploySBTCollectionPayload {
  owner_address: string;
  second_owner_address: string;
  partner_address: string;
  content: SbtSubdomainCollectionData['content'];
  config: SbtSubdomainCollectionData['config'];
  query_id?: number;
  dns_item_address: string;
}

export function buildDeploySbtCollectionWithDns(payload: DeploySBTCollectionPayload, isTestnet: boolean): TransactionResponse {
  const queryId = payload.query_id ?? 0;
  const collection = prepareSbtSubdomainCollection({
    owner_address: payload.owner_address,
    second_owner_address: payload.second_owner_address,
    partner_address: payload.partner_address,
    content: payload.content,
    config: payload.config,
  });
  const collectionAddress = friendly(collection.address, isTestnet);
  const dnsItemAddress = friendly(Address.parse(payload.dns_item_address), isTestnet);

  return {
    validUntil: validUntil(),
    messages: [
      {
        address: collectionAddress,
        amount: '50000000', // 0.05 TON
        payload: cellToBase64(buildSbtTopUpBody(queryId)),
        stateInit: stateInitToBase64(collection.stateInit),
      },
      {
        address: dnsItemAddress,
        amount: '25000000', // 0.025 TON
        payload: cellToBase64(Dns.buildSetNextResolverBody(collection.address, queryId)),
      },
    ],
  };
}

// ============ claim_subdomain ============

export function buildClaimSubdomain(subdomainItemAddress: string, queryId = 0, isTestnet = false): TransactionResponse {
  return {
    validUntil: validUntil(),
    messages: [
      {
        address: friendly(Address.parse(subdomainItemAddress), isTestnet),
        amount: '50000000', // 0.05 TON
        payload: cellToBase64(SubdomainItem.buildClaimBody(queryId)),
      },
    ],
  };
}

// ============ DNS-записи (dns.py — set_*/delete_* record, вызывается из ManageDomainPage) ============

const DNS_RECORD_AMOUNT = '25000000'; // 0.025 TON, единая для всех 8 операций

function dnsResponse(dnsItemAddress: string, payload: Cell): TransactionResponse {
  return {
    validUntil: validUntil(),
    messages: [{ address: dnsItemAddress, amount: DNS_RECORD_AMOUNT, payload: cellToBase64(payload) }],
  };
}

export function buildSetNextResolverRecord(dnsItemAddress: string, resolverAddress: string, queryId = 0): TransactionResponse {
  return dnsResponse(dnsItemAddress, Dns.buildSetNextResolverBody(resolverAddress, queryId));
}

export function buildSetStorageRecord(dnsItemAddress: string, bagIdHex: string, queryId = 0): TransactionResponse {
  return dnsResponse(dnsItemAddress, Dns.buildSetStorageRecordBody(bagIdHex, queryId));
}

export function buildSetWalletRecord(dnsItemAddress: string, userWalletAddress: string, queryId = 0): TransactionResponse {
  return dnsResponse(dnsItemAddress, Dns.buildSetWalletRecordBody(userWalletAddress, queryId));
}

export function buildSetSiteRecord(dnsItemAddress: string, adnlAddressHex: string, queryId = 0): TransactionResponse {
  return dnsResponse(dnsItemAddress, Dns.buildSetSiteRecordBody(adnlAddressHex, queryId));
}

export function buildDeleteNextResolverRecord(dnsItemAddress: string, queryId = 0): TransactionResponse {
  return dnsResponse(dnsItemAddress, Dns.buildDeleteRecordBody('next_resolver', queryId));
}

export function buildDeleteStorageRecord(dnsItemAddress: string, queryId = 0): TransactionResponse {
  return dnsResponse(dnsItemAddress, Dns.buildDeleteRecordBody('storage', queryId));
}

export function buildDeleteWalletRecord(dnsItemAddress: string, queryId = 0): TransactionResponse {
  return dnsResponse(dnsItemAddress, Dns.buildDeleteRecordBody('wallet', queryId));
}

export function buildDeleteSiteRecord(dnsItemAddress: string, queryId = 0): TransactionResponse {
  return dnsResponse(dnsItemAddress, Dns.buildDeleteRecordBody('site', queryId));
}
