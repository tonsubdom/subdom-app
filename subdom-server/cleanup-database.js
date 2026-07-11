const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

function cleanupDatabase() {
  const dbPath = path.join(__dirname, "nft-domains.db");

  console.log("=== ОЧИСТКА БАЗЫ ДАННЫХ NFT DOMAINS ===\n");

  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Файл базы данных не найден: ${dbPath}`);
    process.exit(1);
  }

  // Создаем backup
  const backupPath = `${dbPath}.backup.${Date.now()}`;
  fs.copyFileSync(dbPath, backupPath);
  console.log(`✓ Backup создан: ${backupPath}\n`);

  // Подключаемся к базе
  const db = new Database(dbPath);

  try {
    // Начинаем транзакцию
    console.log("Начинаю транзакцию...");
    db.prepare("BEGIN TRANSACTION").run();

    // Проверяем текущее состояние
    console.log("\n📊 ТЕКУЩЕЕ СОСТОЯНИЕ:");

    const zonesBefore = db
      .prepare("SELECT COUNT(*) as count FROM zones")
      .get().count;
    const subdomainsBefore = db
      .prepare("SELECT COUNT(*) as count FROM subdomains")
      .get().count;

    console.log(`  Зон: ${zonesBefore}`);
    console.log(`  Субдоменов: ${subdomainsBefore}`);

    // Показываем все зоны перед удалением
    console.log("\n📋 ВСЕ ЗОНЫ ПЕРЕД ОЧИСТКОЙ:");
    const allZones = db
      .prepare(
        `
      SELECT id, name, proxy, status, subdomainsAmount
      FROM zones 
      ORDER BY id
    `
      )
      .all();

    allZones.forEach((zone) => {
      const type = zone.proxy === 1 ? "Proxy" : "SBT";
      console.log(
        `  ID ${zone.id}: ${zone.name} (${type}) - ${
          zone.status
        }, субдоменов: ${zone.subdomainsAmount || 0}`
      );
    });

    // Показываем все субдомены перед удалением
    console.log("\n📋 ВСЕ СУБДОМЕНЫ ПЕРЕД ОЧИСТКОЙ:");
    const allSubdomains = db
      .prepare(
        `
      SELECT s.id, s.name, z.name as zoneName, s.status, s.mintPrice
      FROM subdomains s
      LEFT JOIN zones z ON s.zoneId = z.id
      ORDER BY s.id
    `
      )
      .all();

    allSubdomains.forEach((subdomain) => {
      console.log(
        `  ID ${subdomain.id}: ${subdomain.name} (${
          subdomain.zoneName || "N/A"
        }) - ${subdomain.status}, цена: ${subdomain.mintPrice || "0"}`
      );
    });

    // Удаляем субдомены 1-26 (если они есть)
    console.log("\n🗑️  УДАЛЯЮ СУБДОМЕНЫ С ID 1-26...");

    // Сначала проверим, какие субдомены с ID 1-26 существуют
    const subdomainsToDelete = db
      .prepare(
        `
      SELECT id, name FROM subdomains 
      WHERE id BETWEEN 1 AND 26
      ORDER BY id
    `
      )
      .all();

    if (subdomainsToDelete.length > 0) {
      console.log(
        `  Найдено субдоменов для удаления: ${subdomainsToDelete.length}`
      );
      subdomainsToDelete.forEach((sd) => {
        console.log(`    ID ${sd.id}: ${sd.name}`);
      });

      const deleteSubdomains = db.prepare(
        "DELETE FROM subdomains WHERE id BETWEEN ? AND ?"
      );
      const subdomainsDeleted = deleteSubdomains.run(1, 26).changes;
      console.log(`✓ Удалено субдоменов: ${subdomainsDeleted}`);
    } else {
      console.log("  Нет субдоменов с ID 1-26 для удаления");
    }

    // Удаляем зоны 1-14, 19, 21 (если они есть)
    console.log("\n🗑️  УДАЛЯЮ ЗОНЫ С ID 1-14, 19, 21...");

    const zonesToDeleteIds = [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 19, 21,
    ];

    // Проверим, какие зоны существуют
    const zonesToDelete = db
      .prepare(
        `
      SELECT id, name FROM zones 
      WHERE id IN (${zonesToDeleteIds.map(() => "?").join(",")})
      ORDER BY id
    `
      )
      .all(...zonesToDeleteIds);

    if (zonesToDelete.length > 0) {
      console.log(`  Найдено зон для удаления: ${zonesToDelete.length}`);
      zonesToDelete.forEach((zone) => {
        console.log(`    ID ${zone.id}: ${zone.name}`);
      });

      const deleteZones = db.prepare(`
        DELETE FROM zones 
        WHERE id IN (${zonesToDeleteIds.map(() => "?").join(",")})
      `);
      const zonesDeleted = deleteZones.run(...zonesToDeleteIds).changes;
      console.log(`✓ Удалено зон: ${zonesDeleted}`);
    } else {
      console.log("  Нет зон с указанными ID для удаления");
    }

    // Фиксируем транзакцию
    console.log("\n💾 Фиксирую транзакцию...");
    db.prepare("COMMIT").run();
    console.log("✓ Транзакция зафиксирована");

    // Проверяем результаты
    console.log("\n📊 РЕЗУЛЬТАТЫ ОЧИСТКИ:");

    const zonesAfter = db
      .prepare("SELECT COUNT(*) as count FROM zones")
      .get().count;
    const subdomainsAfter = db
      .prepare("SELECT COUNT(*) as count FROM subdomains")
      .get().count;

    console.log(`  Осталось зон: ${zonesAfter}`);
    console.log(`  Осталось субдоменов: ${subdomainsAfter}`);

    // Показываем оставшиеся зоны
    console.log("\n🏷️  ОСТАВШИЕСЯ ЗОНЫ:");
    const remainingZones = db
      .prepare(
        `
      SELECT id, name, proxy, status, subdomainsAmount, createdAt
      FROM zones 
      ORDER BY id
    `
      )
      .all();

    if (remainingZones.length > 0) {
      remainingZones.forEach((zone) => {
        const type = zone.proxy === 1 ? "Proxy" : "SBT";
        // Считаем реальное количество субдоменов
        const actualSubdomains = db
          .prepare(
            `
          SELECT COUNT(*) as count 
          FROM subdomains 
          WHERE zoneId = ?
        `
          )
          .get(zone.id).count;

        console.log(`  ID ${zone.id}: ${zone.name}`);
        console.log(`    Тип: ${type}, Статус: ${zone.status}`);
        console.log(
          `    В базе: ${
            zone.subdomainsAmount || 0
          } субдоменов, Реально: ${actualSubdomains}`
        );
        console.log(`    Создана: ${zone.createdAt}`);
        console.log("");
      });
    } else {
      console.log("  Нет оставшихся зон");
    }

    // Показываем оставшиеся субдомены
    console.log("\n🔗 ОСТАВШИЕСЯ СУБДОМЕНЫ:");
    const remainingSubdomains = db
      .prepare(
        `
      SELECT s.id, s.name, z.name as zoneName, s.status, s.mintPrice, s.registrationDate
      FROM subdomains s
      LEFT JOIN zones z ON s.zoneId = z.id
      ORDER BY s.id
    `
      )
      .all();

    if (remainingSubdomains.length > 0) {
      remainingSubdomains.forEach((subdomain) => {
        console.log(`  ID ${subdomain.id}: ${subdomain.name}`);
        console.log(
          `    Зона: ${subdomain.zoneName || "N/A"}, Статус: ${
            subdomain.status
          }`
        );
        console.log(
          `    Цена: ${subdomain.mintPrice || "0"}, Дата регистрации: ${
            subdomain.registrationDate
          }`
        );
        console.log("");
      });
    } else {
      console.log("  Нет оставшихся субдоменов");
    }

    // Обновляем счетчики субдоменов в зонах
    console.log("\n🔄 ОБНОВЛЯЮ СЧЕТЧИКИ СУБДОМЕНОВ В ЗОНАХ...");

    const updateCounts = db.prepare(`
      UPDATE zones 
      SET subdomainsAmount = (
        SELECT COUNT(*) 
        FROM subdomains 
        WHERE zoneId = zones.id
      )
    `);

    const updatedZones = updateCounts.run().changes;
    console.log(`✓ Обновлено зон: ${updatedZones}`);

    // Оптимизируем базу
    console.log("\n⚡ Оптимизирую базу данных...");
    db.prepare("VACUUM").run();
    console.log("✓ База данных оптимизирована");

    console.log("\n✅ ОЧИСТКА ЗАВЕРШЕНА УСПЕШНО!");
  } catch (error) {
    console.error("\n❌ Ошибка:", error.message);
    console.error(error.stack);

    // Пытаемся откатить
    try {
      db.prepare("ROLLBACK").run();
      console.log("Транзакция откатана");
    } catch (rollbackError) {
      console.error("Ошибка при откате:", rollbackError.message);
    }

    process.exit(1);
  } finally {
    db.close();
  }
}

// Запуск
if (require.main === module) {
  cleanupDatabase();
}

module.exports = cleanupDatabase;
