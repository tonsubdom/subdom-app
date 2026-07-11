#!/usr/bin/env node

// database-migration.js - миграция данных для SQLite базы данных NFT Domains
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

console.log("🚀 Запуск миграции базы данных NFT Domains...");
console.log("========================================");
console.log("📊 Анализ существующих данных и расчет финансовых показателей");
console.log("========================================");

// Пути к базам данных
const testnetDbPath = "./nft-domains.db";
const mainnetDbPath = "./nft-domains-mainnet.db";

// Проверяем наличие баз данных
const databases = [];

if (fs.existsSync(testnetDbPath)) {
  databases.push({ path: testnetDbPath, name: "testnet", label: "🧪 Testnet" });
  console.log("✅ Testnet база найдена:", testnetDbPath);
} else {
  console.log("⚠️ Testnet база не найдена:", testnetDbPath);
}

if (fs.existsSync(mainnetDbPath)) {
  databases.push({ path: mainnetDbPath, name: "mainnet", label: "🌐 Mainnet" });
  console.log("✅ Mainnet база найдена:", mainnetDbPath);
} else {
  console.log("⚠️ Mainnet база не найдена:", mainnetDbPath);
}

if (databases.length === 0) {
  console.error("❌ Базы данных не найдены!");
  console.error("💡 Убедитесь, что файлы существуют:");
  console.error("   - nft-domains.db (testnet)");
  console.error("   - nft-domains-mainnet.db (mainnet)");
  process.exit(1);
}

// Функция для парсинга nftAccessAmount
function parseNftAccessAmount(value) {
  try {
    const parsed = JSON.parse(value || "{}");
    const proxy = parsed.proxy || {};
    const sbt = parsed.sbt || {};

    const result = {
      proxy: {},
      sbt: {},
      summary: {
        proxyTrue: 0,
        proxyFalse: 0,
        sbtTrue: 0,
        sbtFalse: 0,
      },
    };

    // Заполняем данные для уровней 4-9
    for (let i = 4; i <= 9; i++) {
      result.proxy[i] = proxy[i] === true;
      result.sbt[i] = sbt[i] === true;

      if (result.proxy[i]) result.summary.proxyTrue++;
      else result.summary.proxyFalse++;

      if (result.sbt[i]) result.summary.sbtTrue++;
      else result.summary.sbtFalse++;
    }

    return result;
  } catch (e) {
    return {
      error: "❌ Ошибка парсинга JSON",
      proxy: {},
      sbt: {},
      summary: { proxyTrue: 0, proxyFalse: 6, sbtTrue: 0, sbtFalse: 6 },
    };
  }
}

// Функция для расчета цены зоны на основе маппинга из server-sqlite.ts
function calculateZonePrice(domain, isProxy) {
  const length = domain.length;
  if (isProxy) {
    if (length === 4) return 100;
    if (length === 5) return 50;
    if (length === 6) return 40;
    if (length === 7) return 30;
    if (length === 8) return 20;
    return 10;
  } else {
    if (length === 4) return 5;
    if (length === 5) return 2.5;
    if (length === 6) return 2;
    if (length === 7) return 1.5;
    if (length === 8) return 1;
    return 0.5;
  }
}

// Функция для расчета стоимости оплаченных попыток пользователя
function calculatePaymentAttemptsCost(user, zones, subdomains) {
  console.log(
    `\n💰 Расчет трат для пользователя: ${user.address.substring(0, 10)}...`
  );

  const nftAccess = parseNftAccessAmount(user.nftAccessAmount);
  let totalZoneSpending = 0;
  let totalProxyZoneSpending = 0;
  let totalSbtZoneSpending = 0;
  let totalSubdomainSpending = 0;
  let totalProxySubdomainSpending = 0;
  let totalSbtSubdomainSpending = 0;
  let totalProfit = 0;

  const paymentAttempts = {
    proxy: { 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
    sbt: { 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
  };

  // 1. Расчет трат на оплаченные попытки (зоны)
  console.log("  📊 Анализ оплаченных попыток:");

  // Proxy попытки
  for (let i = 4; i <= 9; i++) {
    if (nftAccess.proxy[i]) {
      // Создаем фиктивный домен нужной длины для расчета цены
      const dummyDomain = "x".repeat(i);
      const price = calculateZonePrice(dummyDomain, true);
      paymentAttempts.proxy[i] = 1;
      totalZoneSpending += price;
      totalProxyZoneSpending += price;

      // Прибыль (10% от суммы)
      const profit = price * 0.1;
      totalProfit += profit;

      console.log(
        `    ✅ Proxy уровень ${i}: ${price} TON (прибыль: ${profit.toFixed(
          2
        )} TON)`
      );
    }
  }

  // SBT попытки
  for (let i = 4; i <= 9; i++) {
    if (nftAccess.sbt[i]) {
      const dummyDomain = "x".repeat(i);
      const price = calculateZonePrice(dummyDomain, false);
      paymentAttempts.sbt[i] = 1;
      totalZoneSpending += price;
      totalSbtZoneSpending += price;

      const profit = price * 0.1;
      totalProfit += profit;

      console.log(
        `    ✅ SBT уровень ${i}: ${price} TON (прибыль: ${profit.toFixed(
          2
        )} TON)`
      );
    }
  }

  // 2. Расчет трат на субдомены пользователя
  console.log("  📊 Анализ субдоменов пользователя:");

  const userSubdomains = subdomains.filter((sd) => sd.owner === user.address);
  let proxySubdomainsCount = 0;
  let sbtSubdomainsCount = 0;

  userSubdomains.forEach((subdomain) => {
    // Находим зону субдомена
    const zone = zones.find((z) => z.id === subdomain.zoneId);
    if (zone) {
      const isProxy = zone.proxy === 1;
      const price = subdomain.mintPrice || 0;

      totalSubdomainSpending += price;

      if (isProxy) {
        totalProxySubdomainSpending += price;
        proxySubdomainsCount++;
        console.log(`    🌐 Proxy субдомен "${subdomain.name}": ${price} TON`);
      } else {
        totalSbtSubdomainSpending += price;
        sbtSubdomainsCount++;
        console.log(`    🔒 SBT субдомен "${subdomain.name}": ${price} TON`);
      }

      // Прибыль владельца зоны (90% от стоимости субдомена)
      if (zone.owner && zone.owner !== user.address) {
        const profit = price * 0.9;
        // Эта прибыль будет учтена при расчете для владельца зоны
      }
    }
  });

  // 3. Расчет прибыли от зон пользователя
  console.log("  📊 Анализ прибыли от зон пользователя:");

  const userZones = zones.filter((z) => z.owner === user.address);
  let proxyZonesCount = 0;
  let sbtZonesCount = 0;

  userZones.forEach((zone) => {
    const isProxy = zone.proxy === 1;

    if (isProxy) {
      proxyZonesCount++;
    } else {
      sbtZonesCount++;
    }

    // Находим все субдомены этой зоны
    const zoneSubdomains = subdomains.filter((sd) => sd.zoneId === zone.id);

    zoneSubdomains.forEach((subdomain) => {
      // Если субдомен принадлежит не владельцу зоны, добавляем прибыль
      if (subdomain.owner && subdomain.owner !== user.address) {
        const price = subdomain.mintPrice || 0;
        const profit = price * 0.9; // 90% от стоимости субдомена
        totalProfit += profit;

        console.log(
          `    💰 Прибыль от субдомена "${subdomain.name}" (зона ${
            zone.name
          }): ${profit.toFixed(2)} TON`
        );
      }
    });
  });

  return {
    paymentAttempts,
    totalZoneSpending,
    totalSubdomainSpending,
    totalProxyZoneSpending,
    totalSbtZoneSpending,
    totalProxySubdomainSpending,
    totalSbtSubdomainSpending,
    totalProfit,
    proxyZonesCount,
    sbtZonesCount,
    proxySubdomainsCount,
    sbtSubdomainsCount,
    zonesCount: userZones.length,
    subdomainsCount: userSubdomains.length,
  };
}

// Основная функция миграции
async function migrateDatabase(dbInfo) {
  console.log(`\n${dbInfo.label} Миграция базы данных: ${dbInfo.name}`);
  console.log("=".repeat(50));

  try {
    const db = new Database(dbInfo.path);

    // Создаем резервную копию базы данных
    const backupPath = `${dbInfo.path}.backup.${Date.now()}`;
    fs.copyFileSync(dbInfo.path, backupPath);
    console.log(`✅ Создана резервная копия: ${backupPath}`);

    // 1. Получаем текущие данные
    console.log("📊 Получение текущих данных...");

    const oldUsers = db.prepare("SELECT * FROM users").all();
    const zones = db.prepare("SELECT * FROM zones").all();
    const subdomains = db.prepare("SELECT * FROM subdomains").all();

    console.log(`👥 Найдено пользователей: ${oldUsers.length}`);
    console.log(`🌐 Найдено зон: ${zones.length}`);
    console.log(`🔗 Найдено субдоменов: ${subdomains.length}`);

    // 2. Создаем временную таблицу с новой структурой
    console.log("\n🔄 Создание временной таблицы users_new...");

    db.exec(`
      CREATE TABLE IF NOT EXISTS users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        address TEXT UNIQUE NOT NULL,
        name TEXT,
        domains INTEGER DEFAULT 0,
        zones INTEGER DEFAULT 0,
        subdomains INTEGER DEFAULT 0,
        proxyZones INTEGER DEFAULT 0,
        sbtZones INTEGER DEFAULT 0,
        proxySubdomains INTEGER DEFAULT 0,
        sbtSubdomains INTEGER DEFAULT 0,
        registrationDate TEXT DEFAULT CURRENT_TIMESTAMP,
        nftAccessAmount TEXT DEFAULT '{"proxy":{"4":false,"5":false,"6":false,"7":false,"8":false,"9":false},"sbt":{"4":false,"5":false,"6":false,"7":false,"8":false,"9":false}}',
        totalPaidAttempts TEXT DEFAULT '{"proxy":{"4":0,"5":0,"6":0,"7":0,"8":0,"9":0},"sbt":{"4":0,"5":0,"6":0,"7":0,"8":0,"9":0}}',
        totalZoneSpending REAL DEFAULT 0,
        totalSubdomainSpending REAL DEFAULT 0,
        totalProxyZoneSpending REAL DEFAULT 0,
        totalSbtZoneSpending REAL DEFAULT 0,
        totalProxySubdomainSpending REAL DEFAULT 0,
        totalSbtSubdomainSpending REAL DEFAULT 0,
        totalProfit REAL DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Мигрируем данные пользователей
    console.log("\n🔄 Миграция данных пользователей...");

    const insertStmt = db.prepare(`
      INSERT INTO users_new (
        id, address, name, domains, zones, subdomains,
        proxyZones, sbtZones, proxySubdomains, sbtSubdomains,
        registrationDate, nftAccessAmount, totalPaidAttempts,
        totalZoneSpending, totalSubdomainSpending,
        totalProxyZoneSpending, totalSbtZoneSpending,
        totalProxySubdomainSpending, totalSbtSubdomainSpending,
        totalProfit, createdAt, updatedAt
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
        ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    let migratedCount = 0;

    for (const oldUser of oldUsers) {
      console.log(
        `\n👤 Миграция пользователя ${oldUser.id}: ${oldUser.address.substring(
          0,
          10
        )}...`
      );

      // Рассчитываем финансовые показатели
      const financials = calculatePaymentAttemptsCost(
        oldUser,
        zones,
        subdomains
      );

      // Конвертируем старые поля
      const domains = parseInt(oldUser.domains) || 0;
      const zonesCount = parseInt(oldUser.zones) || 0;
      const subdomainsCount = parseInt(oldUser.subdomains) || 0;

      // Вставляем данные в новую таблицу
      insertStmt.run(
        oldUser.id,
        oldUser.address,
        oldUser.name || null,
        domains,
        financials.zonesCount,
        financials.subdomainsCount,
        financials.proxyZonesCount,
        financials.sbtZonesCount,
        financials.proxySubdomainsCount,
        financials.sbtSubdomainsCount,
        oldUser.registrationDate || oldUser.createdAt,
        oldUser.nftAccessAmount ||
          '{"proxy":{"4":false,"5":false,"6":false,"7":false,"8":false,"9":false},"sbt":{"4":false,"5":false,"6":false,"7":false,"8":false,"9":false}}',
        JSON.stringify(financials.paymentAttempts),
        financials.totalZoneSpending,
        financials.totalSubdomainSpending,
        financials.totalProxyZoneSpending,
        financials.totalSbtZoneSpending,
        financials.totalProxySubdomainSpending,
        financials.totalSbtSubdomainSpending,
        financials.totalProfit,
        oldUser.createdAt,
        oldUser.updatedAt || oldUser.createdAt
      );

      migratedCount++;
      console.log(`✅ Пользователь мигрирован:`);
      console.log(
        `   Зоны: ${financials.zonesCount} (Proxy: ${financials.proxyZonesCount}, SBT: ${financials.sbtZonesCount})`
      );
      console.log(
        `   Субдомены: ${financials.subdomainsCount} (Proxy: ${financials.proxySubdomainsCount}, SBT: ${financials.sbtSubdomainsCount})`
      );
      console.log(
        `   Траты на зоны: ${financials.totalZoneSpending.toFixed(2)} TON`
      );
      console.log(
        `   Траты на субдомены: ${financials.totalSubdomainSpending.toFixed(
          2
        )} TON`
      );
      console.log(`   Общая прибыль: ${financials.totalProfit.toFixed(2)} TON`);
    }

    // 4. Заменяем старую таблицу новой
    console.log("\n🔄 Замена таблицы users...");

    db.exec("DROP TABLE IF EXISTS users_old");
    db.exec("ALTER TABLE users RENAME TO users_old");
    db.exec("ALTER TABLE users_new RENAME TO users");

    // 5. Проверяем результат миграции
    console.log("\n✅ Проверка результатов миграции...");

    const newUsers = db.prepare("SELECT COUNT(*) as count FROM users").get();
    console.log(`📊 Пользователей в новой таблице: ${newUsers.count}`);

    // Выводим статистику по миграции
    const stats = db
      .prepare(
        `
      SELECT 
        COUNT(*) as totalUsers,
        SUM(proxyZones) as totalProxyZones,
        SUM(sbtZones) as totalSbtZones,
        SUM(proxySubdomains) as totalProxySubdomains,
        SUM(sbtSubdomains) as totalSbtSubdomains,
        SUM(totalZoneSpending) as totalZoneSpending,
        SUM(totalSubdomainSpending) as totalSubdomainSpending,
        SUM(totalProfit) as totalProfit
      FROM users
    `
      )
      .get();

    console.log("\n📈 ИТОГОВАЯ СТАТИСТИКА:");
    console.log("=".repeat(40));
    console.log(`👥 Всего пользователей: ${stats.totalUsers}`);
    console.log(`🌐 Proxy зон: ${stats.totalProxyZones}`);
    console.log(`🔒 SBT зон: ${stats.totalSbtZones}`);
    console.log(`🌐 Proxy субдоменов: ${stats.totalProxySubdomains}`);
    console.log(`🔒 SBT субдоменов: ${stats.totalSbtSubdomains}`);
    console.log(
      `💰 Общие траты на зоны: ${stats.totalZoneSpending.toFixed(2)} TON`
    );
    console.log(
      `💰 Общие траты на субдомены: ${stats.totalSubdomainSpending.toFixed(
        2
      )} TON`
    );
    console.log(`💵 Общая прибыль: ${stats.totalProfit.toFixed(2)} TON`);

    // 6. Выводим пример данных для проверки
    console.log("\n🔍 ПРИМЕР ДАННЫХ ПОСЛЕ МИГРАЦИИ:");
    console.log("=".repeat(40));

    const sampleUsers = db
      .prepare(
        `
      SELECT 
        address, 
        proxyZones, 
        sbtZones,
        proxySubdomains,
        sbtSubdomains,
        totalZoneSpending,
        totalSubdomainSpending,
        totalProfit
      FROM users 
      LIMIT 3
    `
      )
      .all();

    sampleUsers.forEach((user, index) => {
      console.log(
        `\n👤 Пользователь ${index + 1}: ${user.address.substring(0, 10)}...`
      );
      console.log(
        `   Proxy зон: ${user.proxyZones}, SBT зон: ${user.sbtZones}`
      );
      console.log(
        `   Proxy субдоменов: ${user.proxySubdomains}, SBT субдоменов: ${user.sbtSubdomains}`
      );
      console.log(`   Траты на зоны: ${user.totalZoneSpending.toFixed(2)} TON`);
      console.log(
        `   Траты на субдомены: ${user.totalSubdomainSpending.toFixed(2)} TON`
      );
      console.log(`   Прибыль: ${user.totalProfit.toFixed(2)} TON`);
    });

    db.close();

    console.log(`\n✅ Миграция ${dbInfo.name} завершена успешно!`);
    console.log(`💾 Резервная копия сохранена как: ${backupPath}`);

    return {
      success: true,
      migratedCount,
      backupPath,
      stats,
    };
  } catch (error) {
    console.error(`❌ Ошибка при миграции ${dbInfo.name}:`, error.message);
    console.error("💡 Подробности:", error.stack);

    return {
      success: false,
      error: error.message,
    };
  }
}

// Запуск миграции для всех баз данных
async function runMigration() {
  console.log("\n🚀 НАЧАЛО МИГРАЦИИ БАЗЫ ДАННЫХ");
  console.log("=".repeat(50));

  const results = [];

  for (const dbInfo of databases) {
    const result = await migrateDatabase(dbInfo);
    results.push({
      database: dbInfo.name,
      ...result,
    });
  }

  // Выводим сводный отчет
  console.log("\n📋 СВОДНЫЙ ОТЧЕТ ПО МИГРАЦИИ");
  console.log("=".repeat(50));

  let totalMigrated = 0;
  let totalErrors = 0;

  results.forEach((result) => {
    if (result.success) {
      console.log(
        `✅ ${result.database.toUpperCase()}: Успешно мигрировано ${
          result.migratedCount
        } пользователей`
      );
      console.log(`   💾 Резервная копия: ${result.backupPath}`);
      console.log(`   📊 Proxy зон: ${result.stats.totalProxyZones}`);
      console.log(`   📊 SBT зон: ${result.stats.totalSbtZones}`);
      console.log(
        `   💰 Общая прибыль: ${result.stats.totalProfit.toFixed(2)} TON`
      );
      totalMigrated += result.migratedCount;
    } else {
      console.log(
        `❌ ${result.database.toUpperCase()}: Ошибка - ${result.error}`
      );
      totalErrors++;
    }
  });

  console.log("\n🎯 ИТОГИ:");
  console.log(`   ✅ Успешно мигрировано баз: ${results.length - totalErrors}`);
  console.log(`   ❌ Ошибок: ${totalErrors}`);
  console.log(`   👥 Всего пользователей: ${totalMigrated}`);

  if (totalErrors === 0) {
    console.log("\n🎉 ВСЕ МИГРАЦИИ ЗАВЕРШЕНЫ УСПЕШНО!");
    console.log("\n📋 СЛЕДУЮЩИЕ ШАГИ:");
    console.log("1. Проверьте данные в базе с помощью скрипта экспорта");
    console.log("2. Обновите скрипт экспорта для работы с новой структурой");
    console.log("3. Протестируйте работу сервера с обновленной базой");
    console.log("\n⚠️ ВАЖНО: Не удаляйте резервные копии до полной проверки!");
  } else {
    console.log("\n⚠️ ВНИМАНИЕ: Были ошибки при миграции!");
    console.log(
      "💡 Проверьте резервные копии и исправьте ошибки перед продолжением."
    );
  }
}

// Запускаем миграцию
runMigration().catch((error) => {
  console.error("❌ Критическая ошибка при выполнении миграции:", error);
  process.exit(1);
});
