/**
 * subdom-server/src/services/platformCache/crawler.ts
 *
 * Периодический (раз в 15 мин) обход платформенных сущностей — зоны, субдомены,
 * proxy-обёртки — в platform_zones_cache / platform_subdomains_cache /
 * platform_wrappers_cache. Источник истины для "список всего на платформе"
 * (Market, селектор зоны в минте, вкладка Wrappers) — см. Obsidian,
 * Задачи - Group 3 §3.3 / Group 4.
 *
 * НЕ трогает: аукционы/ставки (остаются live get_auction_info на фронте),
 * личные "что моё" запросы (остаются live per-wallet на фронте — этот кроулер
 * лишь пишет ownerAddress в кэш как быстрый первый рендер, не единственный
 * источник для персональных списков).
 */

import type Database from 'better-sqlite3';
import {
  NETWORK_CONFIGS,
  SubdomainClassifier,
  TonCenterAPI,
} from './toncenter-api-config';

type SqliteDatabase = typeof Database.prototype;

const CRAWL_INTERVAL_MS = 15 * 60 * 1000;
const COLLECTION_BATCH_CONCURRENCY = 5;
const BATCH_DELAY_MS = 500;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const nowIso = () => new Date().toISOString();

/**
 * "Реальный создатель" — отправитель deploy-транзакции адреса. 1:1 с
 * getCollectionCreatorAndTime во фронтовом universal-blockchain-service.ts.
 *
 * ДОПУЩЕНИЕ (не проверено отдельным getMethod): для proxy-зоны эта же
 * deploy-транзакция используется и как dividendOwnerAddress обёртки —
 * логика создания зоны/обёртки идёт одной связкой сообщений (см. Obsidian,
 * "Зоны SBT и Proxy"), поэтому создатель zone-коллекции = создатель обёртки.
 *
 * Валидно именно сейчас: в контрактах пока нет механизма продажи права на
 * 90%-дивиденд (админ-ручка updateZoneOwner в AdminPanelPage — задел под
 * будущий "оффер"-функционал, к текущему состоянию отношения не имеет, сама
 * фича в смартах не реализована и не в скоупе). Пока продавать нечем —
 * создатель зоны математически и есть получатель дивидендов. Когда/если
 * оффер-механизм появится ончейн — эту эвристику надо будет заменить на
 * реальное чтение состояния контракта, это отдельная будущая задача.
 */
async function getCreatorAddress(api: TonCenterAPI, address: string): Promise<string | null> {
  try {
    const response = await api.getFirstTransaction(address);
    const firstTx = response.transactions?.[0];
    return firstTx?.in_msg?.source ?? null;
  } catch {
    return null;
  }
}

async function crawlNetwork(db: SqliteDatabase, isTestnet: boolean): Promise<void> {
  const label = isTestnet ? 'testnet' : 'mainnet';
  const config = NETWORK_CONFIGS[isTestnet ? 'testnet' : 'mainnet'];

  if (!config.DEFAULT_ADDRESSES.PLATFORM_OWNER || !config.API_KEY) {
    console.warn(
      `[platformCache] ${label}: PLATFORM_OWNER или TONCENTER_API_KEY не настроены в env — пропускаю обход.`
    );
    return;
  }

  const api = new TonCenterAPI(isTestnet);
  const classifier = new SubdomainClassifier(isTestnet);

  console.log(`[platformCache] ${label}: старт обхода...`);

  const upsertZone = db.prepare(`
    INSERT INTO platform_zones_cache
      (collectionAddress, name, isProxy, wrapperAddress, ownerAddress, status, lastSyncedAt, source)
    VALUES (@collectionAddress, @name, @isProxy, @wrapperAddress, @ownerAddress, 'active', @lastSyncedAt, 'crawler')
    ON CONFLICT(collectionAddress) DO UPDATE SET
      name = excluded.name,
      isProxy = excluded.isProxy,
      ownerAddress = excluded.ownerAddress,
      status = 'active',
      lastSyncedAt = excluded.lastSyncedAt
  `);

  const upsertSubdomain = db.prepare(`
    INSERT INTO platform_subdomains_cache
      (itemAddress, name, collectionAddress, isProxy, ownerAddress, status, lastSyncedAt, source)
    VALUES (@itemAddress, @name, @collectionAddress, @isProxy, @ownerAddress, 'active', @lastSyncedAt, 'crawler')
    ON CONFLICT(itemAddress) DO UPDATE SET
      name = excluded.name,
      ownerAddress = excluded.ownerAddress,
      status = 'active',
      lastSyncedAt = excluded.lastSyncedAt
  `);

  const upsertWrapper = db.prepare(`
    INSERT INTO platform_wrappers_cache
      (wrapperAddress, domainName, collectionAddress, wrapperHolderAddress, dividendOwnerAddress, status, lastSyncedAt, source)
    VALUES (@wrapperAddress, @domainName, @collectionAddress, @wrapperHolderAddress, @dividendOwnerAddress, 'active', @lastSyncedAt, 'crawler')
    ON CONFLICT(wrapperAddress) DO UPDATE SET
      domainName = excluded.domainName,
      wrapperHolderAddress = excluded.wrapperHolderAddress,
      dividendOwnerAddress = COALESCE(excluded.dividendOwnerAddress, platform_wrappers_cache.dividendOwnerAddress),
      status = 'active',
      lastSyncedAt = excluded.lastSyncedAt
  `);

  try {
    // 1) Все коллекции платформы (зоны + сама wrapper-коллекция)
    const { nft_collections } = await api.getCollectionsByOwner(
      config.DEFAULT_ADDRESSES.PLATFORM_OWNER,
      1000
    );

    const zoneCollections = nft_collections.filter((c) => classifier.isSubdomainCollection(c));
    const wrapperCollection = nft_collections.find((c) => classifier.isNFTWrapperCollection(c));

    console.log(
      `[platformCache] ${label}: найдено зон=${zoneCollections.length}, wrapper-коллекция=${wrapperCollection ? 'да' : 'нет'}`
    );

    // 2) Зоны — по батчам, чтобы не улететь за rps-лимит
    for (let i = 0; i < zoneCollections.length; i += COLLECTION_BATCH_CONCURRENCY) {
      const batch = zoneCollections.slice(i, i + COLLECTION_BATCH_CONCURRENCY);

      await Promise.all(
        batch.map(async (col) => {
          const isProxy = classifier.isProxyCollection(col);
          const creator = await getCreatorAddress(api, col.address);
          const ownerAddress = creator || col.owner_address || null;
          const rawName: string = col.metadata?.name || col.collection_content?.name || '';

          upsertZone.run({
            collectionAddress: col.address,
            name: rawName,
            isProxy: isProxy ? 1 : 0,
            wrapperAddress: null,
            ownerAddress,
            lastSyncedAt: nowIso(),
          });

          // 3) Субдомены внутри зоны
          try {
            const { nft_items } = await api.getItemsByCollection(col.address, 1000);
            for (const item of nft_items) {
              if (!classifier.isSubdomainItem(item)) continue;
              const itemName: string = item.metadata?.name || item.content?.name || '';
              upsertSubdomain.run({
                itemAddress: item.address,
                name: itemName,
                collectionAddress: col.address,
                isProxy: isProxy ? 1 : 0,
                ownerAddress: item.owner_address || null,
                lastSyncedAt: nowIso(),
              });
            }
          } catch (err) {
            console.error(`[platformCache] ${label}: сбой чтения итемов зоны ${col.address}`, err);
          }
        })
      );

      if (i + COLLECTION_BATCH_CONCURRENCY < zoneCollections.length) {
        await delay(BATCH_DELAY_MS);
      }
    }

    // 4) Обёртки (proxy-zone wrapper NFT) — если коллекция обёрток известна
    if (wrapperCollection) {
      try {
        const { nft_items } = await api.getItemsByCollection(wrapperCollection.address, 1000);
        for (const item of nft_items) {
          if (!classifier.isNFTWrapper(item)) continue;
          const domainName: string = item.metadata?.name || item.content?.name || '';
          // dividendOwnerAddress: приближение через создателя обёрнутой зоны —
          // ищем среди только что записанных зон совпадение по имени домена.
          const matchingZone = db
            .prepare('SELECT ownerAddress FROM platform_zones_cache WHERE name = ? AND isProxy = 1')
            .get(domainName) as { ownerAddress: string | null } | undefined;

          upsertWrapper.run({
            wrapperAddress: item.address,
            domainName,
            collectionAddress: wrapperCollection.address,
            wrapperHolderAddress: item.owner_address || null,
            dividendOwnerAddress: matchingZone?.ownerAddress ?? null,
            lastSyncedAt: nowIso(),
          });
        }
      } catch (err) {
        console.error(`[platformCache] ${label}: сбой чтения обёрток`, err);
      }
    }

    console.log(`[platformCache] ${label}: обход завершён.`);
  } catch (err) {
    console.error(`[platformCache] ${label}: обход не удался`, err);
  }
}

export function startPlatformCacheCrawler(testnetDb: SqliteDatabase, mainnetDb: SqliteDatabase): void {
  const run = async () => {
    await crawlNetwork(testnetDb, true);
    await crawlNetwork(mainnetDb, false);
  };

  // Первый прогон почти сразу после старта сервера, не блокируя app.listen
  setTimeout(run, 5_000);
  setInterval(run, CRAWL_INTERVAL_MS);
}

/** Точечный апсерт одной свежесозданной зоны/субдомена/обёртки — см. upsert-on-create в §3.3. */
export function upsertSinglePlatformEntity(
  db: SqliteDatabase,
  kind: 'zone' | 'subdomain' | 'wrapper',
  payload: Record<string, any>
): void {
  const timestamp = nowIso();
  if (kind === 'zone') {
    db.prepare(
      `INSERT INTO platform_zones_cache (collectionAddress, name, isProxy, wrapperAddress, ownerAddress, status, lastSyncedAt, source)
       VALUES (@collectionAddress, @name, @isProxy, @wrapperAddress, @ownerAddress, 'active', @lastSyncedAt, 'create-trigger')
       ON CONFLICT(collectionAddress) DO UPDATE SET
         name = excluded.name, isProxy = excluded.isProxy, wrapperAddress = excluded.wrapperAddress,
         ownerAddress = excluded.ownerAddress, status = 'active', lastSyncedAt = excluded.lastSyncedAt`
    ).run({ ...payload, lastSyncedAt: timestamp });
  } else if (kind === 'subdomain') {
    db.prepare(
      `INSERT INTO platform_subdomains_cache (itemAddress, name, collectionAddress, isProxy, ownerAddress, status, lastSyncedAt, source)
       VALUES (@itemAddress, @name, @collectionAddress, @isProxy, @ownerAddress, 'active', @lastSyncedAt, 'create-trigger')
       ON CONFLICT(itemAddress) DO UPDATE SET
         name = excluded.name, ownerAddress = excluded.ownerAddress, status = 'active', lastSyncedAt = excluded.lastSyncedAt`
    ).run({ ...payload, lastSyncedAt: timestamp });
  } else {
    db.prepare(
      `INSERT INTO platform_wrappers_cache (wrapperAddress, domainName, collectionAddress, wrapperHolderAddress, dividendOwnerAddress, status, lastSyncedAt, source)
       VALUES (@wrapperAddress, @domainName, @collectionAddress, @wrapperHolderAddress, @dividendOwnerAddress, 'active', @lastSyncedAt, 'create-trigger')
       ON CONFLICT(wrapperAddress) DO UPDATE SET
         domainName = excluded.domainName, wrapperHolderAddress = excluded.wrapperHolderAddress,
         dividendOwnerAddress = COALESCE(excluded.dividendOwnerAddress, platform_wrappers_cache.dividendOwnerAddress),
         status = 'active', lastSyncedAt = excluded.lastSyncedAt`
    ).run({ ...payload, lastSyncedAt: timestamp });
  }
}
