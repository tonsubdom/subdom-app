/**
 * subdom-server/src/services/platformCache/crawler.ts
 *
 * Периодический (раз в 15 мин) обход платформенных сущностей — зоны, субдомены,
 * proxy-обёртки — в platform_zones_cache / platform_subdomains_cache /
 * platform_wrappers_cache. Источник истины для "список всего на платформе"
 * (Market, селектор зоны в минте, вкладка Wrappers, и центральный
 * BlockchainItemsProvider/loadAllAppData на фронте) — см. Obsidian,
 * Задачи - Group 3 §3.3 / Group 4.
 *
 * НЕ трогает: аукционы/ставки (остаются live get_auction_info на фронте).
 * Персональные "что моё" списки — обычный фильтр по ownerAddress поверх ЭТИХ
 * ЖЕ данных на фронте (как и раньше делал ончейн-путь), отдельного
 * персонального запроса тут нет и не нужно.
 *
 * ВАЖНО про формат ответа toncenter (проверено вживую 2026-08-05, см. Log.md):
 * ни у коллекций (/nft/collections), ни у айтемов (/nft/items) имя/картинка/
 * описание НЕ лежат инлайново на самом объекте — они в отдельной top-level
 * карте `metadata`, ключ — адрес (тот же, что у коллекции/айтема). Инлайновые
 * col.collection_content/item.content — это сырой ончейн-контент (чаще uri на
 * off-chain JSON, который toncenter сам резолвит в ту самую карту metadata).
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
const SITE_PING_CONCURRENCY = 10;
const SITE_PING_TIMEOUT_MS = 3000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Пул воркеров без внешней зависимости — тот же принцип, что и
// mapWithConcurrency на фронте (tma/src/utils/concurrency.ts), но бэкенду
// незачем тянуть фронтовый модуль ради одного применения здесь.
async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index]!);
    }
  });
  await Promise.all(runners);
}

const nowIso = () => new Date().toISOString();

const metaFor = (metadataByAddress: Record<string, any>, address: string) =>
  metadataByAddress[address]?.token_info?.[0];

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
async function getCollectionCreatorAndTime(
  api: TonCenterAPI,
  address: string
): Promise<{ creator: string | null; chainCreatedAt: string | null }> {
  try {
    const response = await api.getFirstTransaction(address);
    const firstTx = response.transactions?.[0];
    const creator = firstTx?.in_msg?.source ?? null;
    const chainCreatedAt = firstTx?.now ? new Date(firstTx.now * 1000).toISOString() : null;
    return { creator, chainCreatedAt };
  } catch {
    return { creator: null, chainCreatedAt: null };
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
      (collectionAddress, name, isProxy, wrapperAddress, ownerAddress, image, description, totalItems, status, lastSyncedAt, chainCreatedAt, source)
    VALUES (@collectionAddress, @name, @isProxy, @wrapperAddress, @ownerAddress, @image, @description, @totalItems, 'active', @lastSyncedAt, @chainCreatedAt, 'crawler')
    ON CONFLICT(collectionAddress) DO UPDATE SET
      name = excluded.name,
      isProxy = excluded.isProxy,
      ownerAddress = excluded.ownerAddress,
      image = excluded.image,
      description = excluded.description,
      totalItems = excluded.totalItems,
      status = 'active',
      lastSyncedAt = excluded.lastSyncedAt,
      chainCreatedAt = COALESCE(platform_zones_cache.chainCreatedAt, excluded.chainCreatedAt)
  `);

  const upsertSubdomain = db.prepare(`
    INSERT INTO platform_subdomains_cache
      (itemAddress, name, collectionAddress, zoneName, isProxy, itemType, ownerAddress, image, description, onSale, lastTransactionLt, status, lastSyncedAt, source)
    VALUES (@itemAddress, @name, @collectionAddress, @zoneName, @isProxy, @itemType, @ownerAddress, @image, @description, @onSale, @lastTransactionLt, 'active', @lastSyncedAt, 'crawler')
    ON CONFLICT(itemAddress) DO UPDATE SET
      name = excluded.name,
      zoneName = excluded.zoneName,
      itemType = excluded.itemType,
      ownerAddress = excluded.ownerAddress,
      image = excluded.image,
      description = excluded.description,
      onSale = excluded.onSale,
      lastTransactionLt = excluded.lastTransactionLt,
      status = 'active',
      lastSyncedAt = excluded.lastSyncedAt
  `);

  const upsertWrapper = db.prepare(`
    INSERT INTO platform_wrappers_cache
      (wrapperAddress, domainName, collectionAddress, wrapperHolderAddress, dividendOwnerAddress, image, description, lastTransactionLt, status, lastSyncedAt, source)
    VALUES (@wrapperAddress, @domainName, @collectionAddress, @wrapperHolderAddress, @dividendOwnerAddress, @image, @description, @lastTransactionLt, 'active', @lastSyncedAt, 'crawler')
    ON CONFLICT(wrapperAddress) DO UPDATE SET
      domainName = excluded.domainName,
      wrapperHolderAddress = excluded.wrapperHolderAddress,
      dividendOwnerAddress = COALESCE(excluded.dividendOwnerAddress, platform_wrappers_cache.dividendOwnerAddress),
      image = excluded.image,
      description = excluded.description,
      lastTransactionLt = excluded.lastTransactionLt,
      status = 'active',
      lastSyncedAt = excluded.lastSyncedAt
  `);

  try {
    // 1) Все коллекции платформы (зоны + сама wrapper-коллекция)
    const { nft_collections, metadata: collectionsMetadata = {} } = await api.getCollectionsByOwner(
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
          const { creator, chainCreatedAt } = await getCollectionCreatorAndTime(api, col.address);
          const ownerAddress = creator || col.owner_address || null;
          const colMeta = metaFor(collectionsMetadata, col.address);
          const zoneName: string = colMeta?.name || '';

          // 3) Субдомены внутри зоны — считаем заодно totalItems для зоны
          let itemsCount = 0;
          try {
            const { nft_items, metadata: itemsMetadata = {} } = await api.getItemsByCollection(col.address, 1000);
            for (const item of nft_items) {
              if (!classifier.isSubdomainItem(item)) continue;
              itemsCount++;
              const itemMeta = metaFor(itemsMetadata, item.address);
              upsertSubdomain.run({
                itemAddress: item.address,
                name: itemMeta?.name || '',
                collectionAddress: col.address,
                zoneName,
                isProxy: isProxy ? 1 : 0,
                itemType: classifier.isProxySubdomain(item) ? 'proxy_subdomain' : 'sbt_subdomain',
                ownerAddress: item.owner_address || null,
                image: itemMeta?.image || itemMeta?.extra?._image_medium || null,
                description: itemMeta?.description || null,
                onSale: item.on_sale ? 1 : 0,
                lastTransactionLt: item.last_transaction_lt || null,
                lastSyncedAt: nowIso(),
              });
            }
          } catch (err) {
            console.error(`[platformCache] ${label}: сбой чтения итемов зоны ${col.address}`, err);
          }

          upsertZone.run({
            collectionAddress: col.address,
            name: zoneName,
            isProxy: isProxy ? 1 : 0,
            wrapperAddress: null,
            ownerAddress,
            image: colMeta?.image || colMeta?.extra?._image_medium || null,
            description: colMeta?.description || null,
            totalItems: itemsCount,
            lastSyncedAt: nowIso(),
            chainCreatedAt,
          });
        })
      );

      if (i + COLLECTION_BATCH_CONCURRENCY < zoneCollections.length) {
        await delay(BATCH_DELAY_MS);
      }
    }

    // 4) Обёртки (proxy-zone wrapper NFT) — если коллекция обёрток известна
    if (wrapperCollection) {
      try {
        const { nft_items, metadata: wrapperItemsMetadata = {} } = await api.getItemsByCollection(
          wrapperCollection.address,
          1000
        );
        for (const item of nft_items) {
          if (!classifier.isNFTWrapper(item)) continue;
          const itemMeta = metaFor(wrapperItemsMetadata, item.address);
          const domainName: string = itemMeta?.name || '';
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
            image: itemMeta?.image || itemMeta?.extra?._image_medium || null,
            description: itemMeta?.description || null,
            lastTransactionLt: item.last_transaction_lt || null,
            lastSyncedAt: nowIso(),
          });
        }
      } catch (err) {
        console.error(`[platformCache] ${label}: сбой чтения обёрток`, err);
      }
    }

    console.log(`[platformCache] ${label}: обход завершён.`);

    await pingAllSites(db, label);
  } catch (err) {
    console.error(`[platformCache] ${label}: обход не удался`, err);
  }
}

/**
 * Проверяет, отвечает ли сайт на домене через публичный шлюз *.ton.run —
 * тот же гейтвей, что теперь используется для открытия tonsite:// вне
 * Telegram (браузер не понимает кастомную схему напрямую). Успешный ответ
 * шлюза И ЕСТЬ проверка "есть ли реально сайт" — отдельно резолвить
 * DNS site-запись не нужно, шлюз сам вернёт ошибку/таймаут, если сайта нет.
 */
async function pingSiteResolves(name: string): Promise<boolean> {
  if (!name) return false;
  // Гейтвей ton.run ожидает домен БЕЗ ".ton" на конце — "foo.ton" -> "foo.ton.run",
  // не "foo.ton.ton.run" (проверено вживую: последнее падает с TLS-ошибкой,
  // первое отвечает 200). Тот же трансформ нужен и на фронте при построении
  // ссылки для браузера вне Telegram (см. LupaButton.tsx).
  const gatewayLabel = name.replace(/\.ton$/i, '');
  if (!gatewayLabel) return false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SITE_PING_TIMEOUT_MS);
    const response = await fetch(`https://${gatewayLabel}.ton.run`, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response.status >= 200 && response.status < 400;
  } catch {
    return false;
  }
}

async function pingAllSites(db: SqliteDatabase, label: string): Promise<void> {
  const updateZoneSite = db.prepare(
    `UPDATE platform_zones_cache SET siteResolves = @siteResolves, siteCheckedAt = @siteCheckedAt WHERE collectionAddress = @collectionAddress`
  );
  const updateSubdomainSite = db.prepare(
    `UPDATE platform_subdomains_cache SET siteResolves = @siteResolves, siteCheckedAt = @siteCheckedAt WHERE itemAddress = @itemAddress`
  );

  const zones = db.prepare(`SELECT collectionAddress, name FROM platform_zones_cache WHERE status = 'active'`).all() as
    Array<{ collectionAddress: string; name: string }>;
  const subdomains = db
    .prepare(`SELECT itemAddress, name FROM platform_subdomains_cache WHERE status = 'active'`)
    .all() as Array<{ itemAddress: string; name: string }>;

  console.log(`[platformCache] ${label}: проверка живости сайтов — зон=${zones.length}, субдоменов=${subdomains.length}`);

  await runWithConcurrency(zones, SITE_PING_CONCURRENCY, async (zone) => {
    const siteResolves = await pingSiteResolves(zone.name);
    updateZoneSite.run({ collectionAddress: zone.collectionAddress, siteResolves: siteResolves ? 1 : 0, siteCheckedAt: nowIso() });
  });

  await runWithConcurrency(subdomains, SITE_PING_CONCURRENCY, async (subdomain) => {
    const siteResolves = await pingSiteResolves(subdomain.name);
    updateSubdomainSite.run({ itemAddress: subdomain.itemAddress, siteResolves: siteResolves ? 1 : 0, siteCheckedAt: nowIso() });
  });

  console.log(`[platformCache] ${label}: проверка живости сайтов завершена.`);
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

/**
 * Точечный апсерт одной свежесозданной зоны/субдомена/обёртки — см.
 * upsert-on-create в §3.3. Принимает только то, что фронт реально знает сразу
 * после создания (не все колонки схемы) — остальное (image/description/
 * totalItems/onSale/...) доедет на следующем проходе кроулера.
 */
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
