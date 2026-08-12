// subdom-server/src/services/storageDealsChecker.ts
//
// Периодически проверяет ончейн storage-contract'ы (см. tma/src/utils/
// storageContract.ts, storage-contract.fc из xssnick/tonutils-contracts)
// созданных сделок и, как только ВСЕ выбранные при деплое провайдеры
// подтвердили хотя бы один цикл proof_storage, снимает bag с раздачи
// локальным демоном tonutils-storage и чистит диск.
//
// Почему last_proof_time, а не сам факт "провайдер добавлен в контракт":
// modify_providers выставляет last_proof_time=0 именно "потому что мы хотим
// получить proof, когда провайдер скачает наш bag" (комментарий в контракте).
// last_proof_time становится non-zero только после первого успешного
// proof_storage — а он ончейн проверяется через check_proof() по реальной
// merkle-ветке конкретного байтового смещения, подделать это без обладания
// полными данными bag'а невозможно. Это единственный надёжный сигнал "провайдер
// реально скачал bag и может дальше раздавать его сам, без нашего узла".
//
// Если хотя бы один из требуемых провайдеров ещё не подтвердил — сделка
// целиком пропускается в этом цикле (не половинчатая очистка).

import { Address } from '@ton/core';
import fs from 'fs';
import Database from 'better-sqlite3';
import { removeBag } from '../utils/storageDaemon';

type SqliteDatabase = InstanceType<typeof Database>;

interface DealProvider {
  pubkey: string;
  address: string; // TON-адрес провайдера — по нему же строится dict-key в контракте (см. prepareStorageDeal)
}

interface StorageDealRow {
  bagId: string;
  uploadDir: string;
  contractAddress: string;
  providers: string; // JSON DealProvider[]
}

const CHECK_INTERVAL_MS = 15 * 60 * 1000; // proof-циклы провайдеров растянуты на часы — незачем опрашивать чаще
const STARTUP_DELAY_MS = 60 * 1000;

function providerDictKey(providerAddress: string): string {
  // Тот же ключ, что modify_providers кладёт в HashmapE 256 — hash адреса
  // провайдера (см. prepareStorageDeal в tma/src/utils/storageContract.ts).
  return BigInt('0x' + Address.parse(providerAddress).hash.toString('hex')).toString();
}

/**
 * get_provider_info(key) -> (nonce, last_proof_time, next_proof_byte,
 * max_span, rate_per_mb_day, available_balance) — см. storage-contract.fc.
 * Возвращает null, если провайдер не найден в контракте или запрос не удался
 * (сетевая ошибка) — в обоих случаях НЕ считаем провайдера подтверждённым
 * (fail-safe: лучше не почистить лишний раз, чем почистить раньше времени).
 */
async function fetchLastProofTime(
  contractAddress: string,
  key: string,
  isTestnet: boolean
): Promise<number | null> {
  const apiUrl = isTestnet
    ? 'https://testnet.toncenter.com/api/v3/runGetMethod'
    : 'https://toncenter.com/api/v3/runGetMethod';
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: contractAddress,
        method: 'get_provider_info',
        stack: [{ type: 'num', value: key }],
      }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as any;
    if (data?.exit_code !== 0) return null;
    const entry = data?.stack?.[1]; // индекс 1 = last_proof_time
    const raw: string | undefined = entry?.value;
    if (!raw) return null;
    return Number(BigInt(raw));
  } catch {
    return null;
  }
}

async function checkDeal(db: SqliteDatabase, row: StorageDealRow, isTestnet: boolean): Promise<void> {
  let providers: DealProvider[];
  try {
    providers = JSON.parse(row.providers);
  } catch {
    console.error(`❌ [storageDeals] Битый providers JSON у bag ${row.bagId}, пропускаю`);
    return;
  }
  if (!providers.length) return;

  for (const p of providers) {
    const key = providerDictKey(p.address);
    const lastProofTime = await fetchLastProofTime(row.contractAddress, key, isTestnet);
    if (!lastProofTime) return; // хотя бы один не подтвердил — сделка ждёт следующего цикла целиком
  }

  try {
    await removeBag(row.bagId);
  } catch (error) {
    console.error(`❌ [storageDeals] Демон не снял bag ${row.bagId} с раздачи, диск не чищу:`, error);
    return;
  }
  fs.rm(row.uploadDir, { recursive: true, force: true }, (err) => {
    if (err) console.error(`❌ [storageDeals] Не удалось удалить ${row.uploadDir}:`, err);
  });
  db.prepare(`UPDATE storage_deals SET releasedAt = CURRENT_TIMESTAMP WHERE bagId = ?`).run(row.bagId);
  console.log(`✅ [storageDeals] bag ${row.bagId}: все провайдеры подтвердили хранение, локальная копия освобождена`);
}

async function checkPendingDeals(db: SqliteDatabase, isTestnet: boolean): Promise<void> {
  const rows = db
    .prepare(
      `SELECT bagId, uploadDir, contractAddress, providers
       FROM storage_deals
       WHERE contractAddress IS NOT NULL AND releasedAt IS NULL`
    )
    .all() as StorageDealRow[];

  for (const row of rows) {
    try {
      await checkDeal(db, row, isTestnet);
    } catch (error) {
      console.error(`❌ [storageDeals] Ошибка проверки сделки ${row.bagId}:`, error);
    }
  }
}

export function startStorageDealsChecker(testnetDb: SqliteDatabase, mainnetDb: SqliteDatabase): void {
  const runOnce = () => {
    checkPendingDeals(testnetDb, true).catch((e) => console.error('❌ [storageDeals] testnet цикл:', e));
    checkPendingDeals(mainnetDb, false).catch((e) => console.error('❌ [storageDeals] mainnet цикл:', e));
  };
  setTimeout(runOnce, STARTUP_DELAY_MS);
  setInterval(runOnce, CHECK_INTERVAL_MS);
}
