// subdom-server/scripts/dedupe-platform-cache.ts
//
// Одноразовый скрипт чистки platform_zones_cache / platform_subdomains_cache /
// platform_wrappers_cache от "осиротевших" дублей — строк, которые описывают
// ОДНУ И ТУ ЖЕ ончейн-сущность, но были записаны под РАЗНЫМИ строковыми
// представлениями одного и того же адреса (userfriendly vs raw). Баг и его
// код-фикс — см. commit 27e60e3 (CreateCollectionPage.tsx слал адрес без
// convertUserFriendlyToRaw) и upsertSinglePlatformEntity в crawler.ts (теперь
// сам нормализует адрес перед INSERT). Этот скрипт лечит уже накопленные ДО
// фикса дубли — новых таких дублей фикс больше не создаёт.
//
// Группировка идёт СТРОГО по Address.parse(...).toRawString() — то есть
// только по буквальному совпадению адреса в другом формате. Это НЕ трогает
// легитимный сценарий "юзер задеплоил новую SBT-зону под тем же именем после
// деактивации старой" (см. autoInactiveSbtZoneAddresses в ProfileWidget.tsx) —
// там у зон РАЗНЫЕ реальные адреса, и этот скрипт их не тронет.
//
// Запуск (на сервере, где реально лежат nft-domains*.db):
//   npx ts-node scripts/dedupe-platform-cache.ts            — только отчёт, ничего не удаляет
//   npx ts-node scripts/dedupe-platform-cache.ts --apply     — реально удаляет найденные дубли
//
// Безопасно запускать повторно — как только дублей не останется, скрипт
// просто ничего не найдёт.

import Database from 'better-sqlite3';
import path from 'path';
import { Address } from '@ton/core';

type SqliteDatabase = InstanceType<typeof Database>;

const APPLY = process.argv.includes('--apply');

const DATABASES: Array<{ label: string; file: string }> = [
  { label: 'testnet', file: path.join(__dirname, '..', 'nft-domains.db') },
  { label: 'mainnet', file: path.join(__dirname, '..', 'nft-domains-mainnet.db') },
];

interface TableSpec {
  table: string;
  keyColumn: string;
  // Доп. поля, по которым выбираем "более полную" запись среди дублей —
  // побеждает та, где их больше заполнено.
  richnessColumns: string[];
}

const TABLES: TableSpec[] = [
  { table: 'platform_zones_cache', keyColumn: 'collectionAddress', richnessColumns: ['image', 'description', 'totalItems'] },
  { table: 'platform_subdomains_cache', keyColumn: 'itemAddress', richnessColumns: ['image', 'description'] },
  { table: 'platform_wrappers_cache', keyColumn: 'wrapperAddress', richnessColumns: ['image', 'description'] },
];

const toRaw = (address: string): string | null => {
  try {
    return Address.parse(address).toRawString();
  } catch {
    return null;
  }
};

const richnessScore = (row: Record<string, any>, columns: string[]): number =>
  columns.reduce((score, col) => score + (row[col] ? 1 : 0), 0);

function dedupeTable(db: SqliteDatabase, label: string, spec: TableSpec) {
  const rows = db.prepare(`SELECT * FROM ${spec.table}`).all() as Array<Record<string, any>>;

  const groups = new Map<string, Array<Record<string, any>>>();
  for (const row of rows) {
    const raw = toRaw(row[spec.keyColumn]);
    if (!raw) {
      console.warn(`⚠️  [${label}/${spec.table}] не смог распарсить адрес: ${row[spec.keyColumn]}`);
      continue;
    }
    const group = groups.get(raw);
    if (group) group.push(row);
    else groups.set(raw, [row]);
  }

  let duplicateGroups = 0;
  let rowsToDelete = 0;

  for (const [raw, group] of groups) {
    if (group.length < 2) continue;
    duplicateGroups++;

    // Лучшая запись: больше заполненных "богатых" полей, при равенстве —
    // та, чей ключ уже хранится в каноничном raw-формате (совпадает с raw).
    const sorted = [...group].sort((a, b) => {
      const scoreDiff = richnessScore(b, spec.richnessColumns) - richnessScore(a, spec.richnessColumns);
      if (scoreDiff !== 0) return scoreDiff;
      const aCanon = a[spec.keyColumn] === raw ? 1 : 0;
      const bCanon = b[spec.keyColumn] === raw ? 1 : 0;
      return bCanon - aCanon;
    });

    // group.length >= 2 (проверено строкой выше) => sorted.length >= 2,
    // keep гарантированно определён — но деструктуризация массива этого не
    // выражает для tsc в контейнере (там включён noUncheckedIndexedAccess).
    const keep = sorted[0]!;
    const drop = sorted.slice(1);
    console.log(`\n🔎 [${label}/${spec.table}] дубль по адресу ${raw}:`);
    console.log(`   ✅ оставляю  ${spec.keyColumn}=${keep[spec.keyColumn]} (name=${keep.name ?? keep.domainName ?? '—'})`);
    for (const row of drop) {
      console.log(`   🗑️  удаляю   ${spec.keyColumn}=${row[spec.keyColumn]} (name=${row.name ?? row.domainName ?? '—'})`);
      rowsToDelete++;
      if (APPLY) {
        db.prepare(`DELETE FROM ${spec.table} WHERE ${spec.keyColumn} = ?`).run(row[spec.keyColumn]);
      }
    }
  }

  console.log(`\n📊 [${label}/${spec.table}] групп с дублями: ${duplicateGroups}, строк к удалению: ${rowsToDelete}`);
}

function main() {
  console.log(APPLY ? '🔴 РЕЖИМ УДАЛЕНИЯ (--apply)\n' : '🟡 DRY-RUN — ничего не удаляю, только показываю найденное. Запустите с --apply, чтобы применить.\n');

  for (const { label, file } of DATABASES) {
    console.log(`\n📂 База (${label}): ${file}`);
    const db = new Database(file);
    for (const spec of TABLES) {
      dedupeTable(db, label, spec);
    }
    db.close();
  }
}

main();
