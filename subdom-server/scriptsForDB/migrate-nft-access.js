#!/usr/bin/env node

/**
 * Скрипт миграции для обновления поля nftAccessAmount в базе данных nft-domains.db
 *
 * Этот скрипт:
 * 1. Проверяет существование базы данных
 * 2. Создает резервную копию базы данных
 * 3. Обновляет структуру таблицы users
 * 4. Конвертирует существующие данные в новый формат
 * 5. Сохраняет изменения
 *
 * Запуск: node migrate-nft-access.js
 */

const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

// Конфигурация
const DB_FILE = "nft-domains.db";
const BACKUP_FILE = `nft-domains-backup-${Date.now()}.db`;
const DEFAULT_NFT_ACCESS = JSON.stringify({
  proxy: { 4: false, 5: false, 6: false, 7: false, 8: false, 9: false },
  sbt: { 4: false, 5: false, 6: false, 7: false, 8: false, 9: false },
});

// Цвета для консоли
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function logInfo(message) {
  console.log(`${colors.cyan}[INFO]${colors.reset} ${message}`);
}

function logSuccess(message) {
  console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}[WARNING]${colors.reset} ${message}`);
}

function logError(message) {
  console.log(`${colors.red}[ERROR]${colors.reset} ${message}`);
}

function logStep(step, message) {
  console.log(`\n${colors.magenta}=== Шаг ${step} ===${colors.reset}`);
  console.log(`${colors.blue}${message}${colors.reset}`);
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runMigration() {
  logStep(1, "Проверка наличия базы данных");

  // Проверяем существование файла базы данных
  if (!fs.existsSync(DB_FILE)) {
    logError(`Файл базы данных "${DB_FILE}" не найден!`);
    logInfo("Убедитесь, что скрипт запускается из директории с базой данных");
    process.exit(1);
  }

  logSuccess(`База данных "${DB_FILE}" найдена`);

  // Создаем резервную копию
  logStep(2, "Создание резервной копии базы данных");

  try {
    fs.copyFileSync(DB_FILE, BACKUP_FILE);
    logSuccess(`Резервная копия создана: ${BACKUP_FILE}`);
  } catch (error) {
    logError(`Не удалось создать резервную копию: ${error.message}`);
    process.exit(1);
  }

  // Подключаемся к базе данных
  logStep(3, "Подключение к базе данных");

  let db;
  try {
    db = new sqlite3.Database(DB_FILE, sqlite3.OPEN_READWRITE);
    logSuccess("Подключение к базе данных успешно");
  } catch (error) {
    logError(`Не удалось подключиться к базе данных: ${error.message}`);
    process.exit(1);
  }

  // Функция для выполнения SQL запросов с промисами
  function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  try {
    // Проверяем структуру таблицы users
    logStep(4, "Проверка структуры таблицы users");

    const tableInfo = await dbAll("PRAGMA table_info(users)");

    // Находим информацию о поле nftAccessAmount
    const nftAccessAmountField = tableInfo.find(
      (col) => col.name === "nftAccessAmount"
    );

    if (!nftAccessAmountField) {
      logWarning("Поле nftAccessAmount не найдено в таблице users");
      logInfo("Создаем новое поле с дефолтным значением");

      // Добавляем новое поле
      await dbRun(
        `ALTER TABLE users ADD COLUMN nftAccessAmount TEXT DEFAULT '${DEFAULT_NFT_ACCESS}'`
      );
      logSuccess("Поле nftAccessAmount добавлено с дефолтным значением");

      // Закрываем соединение
      db.close();
      logStep(5, "Миграция завершена");
      logSuccess("База данных успешно обновлена!");
      return;
    }

    logInfo(`Текущий тип поля nftAccessAmount: ${nftAccessAmountField.type}`);
    logInfo(`Текущий дефолт: ${nftAccessAmountField.dflt_value}`);

    // Получаем количество пользователей
    const userCount = await dbGet("SELECT COUNT(*) as count FROM users");
    logInfo(`Всего пользователей в базе: ${userCount.count}`);

    // Получаем всех пользователей с текущим значением nftAccessAmount
    const users = await dbAll("SELECT id, address, nftAccessAmount FROM users");

    logStep(5, "Конвертация данных пользователей");

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        const oldValue = user.nftAccessAmount;

        // Если значение пустое или null, устанавливаем дефолт
        if (!oldValue || oldValue === "null" || oldValue === "NULL") {
          await dbRun("UPDATE users SET nftAccessAmount = ? WHERE id = ?", [
            DEFAULT_NFT_ACCESS,
            user.id,
          ]);
          updatedCount++;
          continue;
        }

        // Пытаемся распарсить старое значение
        let parsedValue;
        try {
          parsedValue = JSON.parse(oldValue);
        } catch (parseError) {
          // Если не JSON, устанавливаем дефолт
          logWarning(
            `Невалидный JSON у пользователя ${user.address}: ${oldValue}`
          );
          await dbRun("UPDATE users SET nftAccessAmount = ? WHERE id = ?", [
            DEFAULT_NFT_ACCESS,
            user.id,
          ]);
          updatedCount++;
          continue;
        }

        // Проверяем структуру старого значения
        if (typeof parsedValue === "number") {
          // Старое значение было числом (старый формат)
          // Конвертируем в новый формат
          const newValue = {
            proxy: {
              4: false,
              5: false,
              6: false,
              7: false,
              8: false,
              9: false,
            },
            sbt: { 4: false, 5: false, 6: false, 7: false, 8: false, 9: false },
          };

          // Если было какое-то число, можно попробовать сохранить логику
          // Например, если было 1, то устанавливаем все в true (но это зависит от вашей логики)
          // Здесь просто устанавливаем дефолт
          await dbRun("UPDATE users SET nftAccessAmount = ? WHERE id = ?", [
            JSON.stringify(newValue),
            user.id,
          ]);
          updatedCount++;
        } else if (typeof parsedValue === "object" && parsedValue !== null) {
          // Уже объект, проверяем структуру
          const hasProxy = "proxy" in parsedValue;
          const hasSbt = "sbt" in parsedValue;

          if (hasProxy && hasSbt) {
            // Проверяем структуру proxy и sbt
            const proxyValid =
              typeof parsedValue.proxy === "object" &&
              [4, 5, 6, 7, 8, 9].every((key) => key in parsedValue.proxy);
            const sbtValid =
              typeof parsedValue.sbt === "object" &&
              [4, 5, 6, 7, 8, 9].every((key) => key in parsedValue.sbt);

            if (proxyValid && sbtValid) {
              // Структура уже правильная, пропускаем
              skippedCount++;
            } else {
              // Структура неправильная, исправляем
              const fixedValue = {
                proxy: {
                  4: false,
                  5: false,
                  6: false,
                  7: false,
                  8: false,
                  9: false,
                },
                sbt: {
                  4: false,
                  5: false,
                  6: false,
                  7: false,
                  8: false,
                  9: false,
                },
              };

              // Сохраняем существующие true значения, если они есть
              if (parsedValue.proxy && typeof parsedValue.proxy === "object") {
                Object.keys(parsedValue.proxy).forEach((key) => {
                  const numKey = parseInt(key);
                  if (
                    [4, 5, 6, 7, 8, 9].includes(numKey) &&
                    parsedValue.proxy[key] === true
                  ) {
                    fixedValue.proxy[numKey] = true;
                  }
                });
              }

              if (parsedValue.sbt && typeof parsedValue.sbt === "object") {
                Object.keys(parsedValue.sbt).forEach((key) => {
                  const numKey = parseInt(key);
                  if (
                    [4, 5, 6, 7, 8, 9].includes(numKey) &&
                    parsedValue.sbt[key] === true
                  ) {
                    fixedValue.sbt[numKey] = true;
                  }
                });
              }

              await dbRun("UPDATE users SET nftAccessAmount = ? WHERE id = ?", [
                JSON.stringify(fixedValue),
                user.id,
              ]);
              updatedCount++;
            }
          } else {
            // Не хватает полей, исправляем
            const fixedValue = {
              proxy: {
                4: false,
                5: false,
                6: false,
                7: false,
                8: false,
                9: false,
              },
              sbt: {
                4: false,
                5: false,
                6: false,
                7: false,
                8: false,
                9: false,
              },
            };

            // Пытаемся сохранить существующие данные
            if (parsedValue.proxy && typeof parsedValue.proxy === "object") {
              Object.keys(parsedValue.proxy).forEach((key) => {
                const numKey = parseInt(key);
                if (
                  [4, 5, 6, 7, 8, 9].includes(numKey) &&
                  parsedValue.proxy[key] === true
                ) {
                  fixedValue.proxy[numKey] = true;
                }
              });
            }

            if (parsedValue.sbt && typeof parsedValue.sbt === "object") {
              Object.keys(parsedValue.sbt).forEach((key) => {
                const numKey = parseInt(key);
                if (
                  [4, 5, 6, 7, 8, 9].includes(numKey) &&
                  parsedValue.sbt[key] === true
                ) {
                  fixedValue.sbt[numKey] = true;
                }
              });
            }

            await dbRun("UPDATE users SET nftAccessAmount = ? WHERE id = ?", [
              JSON.stringify(fixedValue),
              user.id,
            ]);
            updatedCount++;
          }
        } else {
          // Неизвестный формат, устанавливаем дефолт
          await dbRun("UPDATE users SET nftAccessAmount = ? WHERE id = ?", [
            DEFAULT_NFT_ACCESS,
            user.id,
          ]);
          updatedCount++;
        }
      } catch (userError) {
        errorCount++;
        logError(
          `Ошибка при обработке пользователя ${user.id} (${user.address}): ${userError.message}`
        );
      }
    }

    logSuccess(`Обработано пользователей: ${users.length}`);
    logSuccess(`Обновлено: ${updatedCount}`);
    logSuccess(`Пропущено (уже правильный формат): ${skippedCount}`);
    logSuccess(`Ошибок: ${errorCount}`);

    // Проверяем результат
    logStep(6, "Проверка результатов миграции");

    const sampleUsers = await dbAll(
      "SELECT address, nftAccessAmount FROM users LIMIT 5"
    );

    logInfo("Примеры обновленных записей:");
    sampleUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.address}:`);
      try {
        const parsed = JSON.parse(user.nftAccessAmount);
        console.log(`   Proxy: ${JSON.stringify(parsed.proxy)}`);
        console.log(`   SBT: ${JSON.stringify(parsed.sbt)}`);
      } catch (e) {
        console.log(`   Ошибка парсинга: ${user.nftAccessAmount}`);
      }
    });

    // Закрываем соединение
    db.close();

    logStep(7, "Миграция завершена");
    logSuccess("База данных успешно обновлена!");
    logInfo(`Резервная копия сохранена как: ${BACKUP_FILE}`);
    logInfo(
      "Вы можете удалить резервную копию после проверки работы приложения"
    );
  } catch (error) {
    logError(`Ошибка во время миграции: ${error.message}`);
    logError(error.stack);

    // Восстанавливаем из резервной копии при ошибке
    logStep("Восстановление", "Восстановление из резервной копии из-за ошибки");

    try {
      if (fs.existsSync(BACKUP_FILE)) {
        fs.copyFileSync(BACKUP_FILE, DB_FILE);
        logSuccess("База данных восстановлена из резервной копии");
      }
    } catch (restoreError) {
      logError(
        `Не удалось восстановить из резервной копии: ${restoreError.message}`
      );
    }

    if (db) db.close();
    process.exit(1);
  }
}

// Запуск миграции
console.log(`
${colors.magenta}╔══════════════════════════════════════════════════════════════╗
║           МИГРАЦИЯ БАЗЫ ДАННЫХ NFT-DOMAINS.DB            ║
║         Обновление поля nftAccessAmount                 ║
╚══════════════════════════════════════════════════════════════╝${colors.reset}
`);

logInfo("Начинаем процесс миграции...");
logInfo(`База данных: ${DB_FILE}`);
logInfo(`Новый формат: ${DEFAULT_NFT_ACCESS}`);

// Проверяем аргументы командной строки
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(`
Использование: node migrate-nft-access.js [опции]

Опции:
  --help, -h     Показать эту справку
  --force        Пропустить подтверждение
  
Описание:
  Этот скрипт обновляет поле nftAccessAmount в таблице users
  из старого формата в новый:
  
  Старый формат: число (например, 0, 1, 2)
  Новый формат: JSON объект с полями proxy и sbt
  
  Пример нового формата:
  {
    "proxy": {"4":false,"5":false,"6":false,"7":false,"8":false,"9":false},
    "sbt": {"4":false,"5":false,"6":false,"7":false,"8":false,"9":false}
  }
  
  Скрипт автоматически создает резервную копию базы данных.
  `);
  process.exit(0);
}

// Запрашиваем подтверждение, если не указан флаг --force
if (!args.includes("--force")) {
  const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  readline.question(
    `${colors.yellow}Вы уверены, что хотите выполнить миграцию? (y/N): ${colors.reset}`,
    (answer) => {
      if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
        readline.close();
        runMigration().catch((error) => {
          logError(`Неожиданная ошибка: ${error.message}`);
          process.exit(1);
        });
      } else {
        logInfo("Миграция отменена");
        readline.close();
        process.exit(0);
      }
    }
  );
} else {
  runMigration().catch((error) => {
    logError(`Неожиданная ошибка: ${error.message}`);
    process.exit(1);
  });
}
