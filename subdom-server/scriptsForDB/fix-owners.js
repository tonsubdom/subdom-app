const Database = require("better-sqlite3");
const path = require("path");

// Путь к вашей базе данных
const dbPath = path.join(__dirname, "nft-domains.db");

// Подключаемся к базе данных
const db = new Database(dbPath, { verbose: console.log });

console.log("🔍 Подключение к базе данных...");
console.log(`📁 Путь к базе: ${dbPath}`);

try {
  // Получаем информацию о субдоменах с ID 37 и 39
  console.log("\n📊 Получаем информацию о субдоменах 37 и 39...");

  const subdomain37 = db
    .prepare("SELECT * FROM subdomains WHERE id = ?")
    .get(37);
  const subdomain39 = db
    .prepare("SELECT * FROM subdomains WHERE id = ?")
    .get(39);

  console.log("\n=== Субдомен ID 37 (coin.generator.ton) ===");
  console.log(`Название: ${subdomain37.name}`);
  console.log(`Текущий owner: ${subdomain37.owner}`);
  console.log(`Текущий lastBidder: ${subdomain37.lastBidder}`);
  console.log(`Статус: ${subdomain37.status}`);
  console.log(
    `Последняя ставка: ${subdomain37.lastBid} нанотонов (${
      subdomain37.lastBid / 1000000000
    } TON)`
  );

  console.log("\n=== Субдомен ID 39 (testimsubdomen.0l0lol0l0.ton) ===");
  console.log(`Название: ${subdomain39.name}`);
  console.log(`Текущий owner: ${subdomain39.owner}`);
  console.log(`Текущий lastBidder: ${subdomain39.lastBidder}`);
  console.log(`Статус: ${subdomain39.status}`);
  console.log(
    `Последняя ставка: ${subdomain39.lastBid} нанотонов (${
      subdomain39.lastBid / 1000000000
    } TON)`
  );

  // Проверяем, нужно ли обновлять
  const needUpdate37 = subdomain37.owner !== subdomain37.lastBidder;
  const needUpdate39 = subdomain39.owner !== subdomain39.lastBidder;

  console.log("\n🔧 Проверка необходимости обновления:");
  console.log(
    `Субдомен 37: owner !== lastBidder? ${needUpdate37 ? "ДА" : "НЕТ"}`
  );
  console.log(
    `Субдомен 39: owner !== lastBidder? ${needUpdate39 ? "ДА" : "НЕТ"}`
  );

  if (needUpdate37 || needUpdate39) {
    console.log("\n🔄 Начинаем обновление...");

    // Начинаем транзакцию
    const update = db.transaction(() => {
      if (needUpdate37) {
        console.log(`\n🔄 Обновляем субдомен 37:`);
        console.log(`   Старый owner: ${subdomain37.owner}`);
        console.log(`   Новый owner: ${subdomain37.lastBidder}`);

        const stmt37 = db.prepare(`
          UPDATE subdomains 
          SET owner = ?, updatedAt = CURRENT_TIMESTAMP 
          WHERE id = ?
        `);

        const result37 = stmt37.run(subdomain37.lastBidder, 37);
        console.log(`   Результат: ${result37.changes} строк обновлено`);
      }

      if (needUpdate39) {
        console.log(`\n🔄 Обновляем субдомен 39:`);
        console.log(`   Старый owner: ${subdomain39.owner}`);
        console.log(`   Новый owner: ${subdomain39.lastBidder}`);

        const stmt39 = db.prepare(`
          UPDATE subdomains 
          SET owner = ?, updatedAt = CURRENT_TIMESTAMP 
          WHERE id = ?
        `);

        const result39 = stmt39.run(subdomain39.lastBidder, 39);
        console.log(`   Результат: ${result39.changes} строк обновлено`);
      }
    });

    // Выполняем транзакцию
    update();

    console.log("\n✅ Обновление завершено!");

    // Проверяем результат
    console.log("\n📋 Проверяем обновленные данные:");

    const updated37 = db
      .prepare("SELECT * FROM subdomains WHERE id = ?")
      .get(37);
    const updated39 = db
      .prepare("SELECT * FROM subdomains WHERE id = ?")
      .get(39);

    console.log("\n=== Обновленный субдомен ID 37 ===");
    console.log(`Название: ${updated37.name}`);
    console.log(`Owner: ${updated37.owner}`);
    console.log(`LastBidder: ${updated37.lastBidder}`);
    console.log(
      `Owner === LastBidder? ${
        updated37.owner === updated37.lastBidder ? "✅ ДА" : "❌ НЕТ"
      }`
    );

    console.log("\n=== Обновленный субдомен ID 39 ===");
    console.log(`Название: ${updated39.name}`);
    console.log(`Owner: ${updated39.owner}`);
    console.log(`LastBidder: ${updated39.lastBidder}`);
    console.log(
      `Owner === LastBidder? ${
        updated39.owner === updated39.lastBidder ? "✅ ДА" : "❌ НЕТ"
      }`
    );
  } else {
    console.log(
      "\n✅ Обновление не требуется. Поля owner уже соответствуют lastBidder."
    );
  }
} catch (error) {
  console.error("❌ Ошибка при выполнении скрипта:", error);
} finally {
  // Закрываем соединение с базой данных
  db.close();
  console.log("\n🔒 Соединение с базой данных закрыто.");
}

console.log("\n🎉 Скрипт завершен!");
