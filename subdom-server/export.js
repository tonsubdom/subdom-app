#!/usr/bin/env node

// enhanced-export-detailed.js - экспорт с детальным отображением nftAccessAmount
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

console.log("🚀 Запуск экспорта с детальным отображением nftAccessAmount...");
console.log("========================================");
console.log("📊 Проверяем обе базы данных: mainnet и testnet");
console.log("========================================");

// Пути к базам данных
const mainnetDbPath = "./nft-domains-mainnet.db";
const testnetDbPath = "./nft-domains.db";

// Проверяем наличие баз данных
const databases = [];

if (fs.existsSync(mainnetDbPath)) {
  databases.push({ path: mainnetDbPath, name: "mainnet", label: "🌐 Mainnet" });
  console.log("✅ Mainnet база найдена:", mainnetDbPath);
} else {
  console.log("⚠️ Mainnet база не найдена:", mainnetDbPath);
}

if (fs.existsSync(testnetDbPath)) {
  databases.push({ path: testnetDbPath, name: "testnet", label: "🧪 Testnet" });
  console.log("✅ Testnet база найдена:", testnetDbPath);
} else {
  console.log("⚠️ Testnet база не найдена:", testnetDbPath);
}

if (databases.length === 0) {
  console.error("❌ Базы данных не найдены!");
  console.error("💡 Убедитесь, что файлы существуют:");
  console.error("   - nft-domains-mainnet.db (mainnet)");
  console.error("   - nft-domains.db (testnet)");
  process.exit(1);
}

// Функция для парсинга nftAccessAmount с детальными данными
function parseNftAccessAmountDetailed(value) {
  try {
    const parsed = JSON.parse(value || "{}");
    const proxy = parsed.proxy || {};
    const sbt = parsed.sbt || {};

    // Создаем детальную структуру для уровней 4-9
    const detailed = {
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
      detailed.proxy[i] = proxy[i] === true;
      detailed.sbt[i] = sbt[i] === true;

      if (detailed.proxy[i]) detailed.summary.proxyTrue++;
      else detailed.summary.proxyFalse++;

      if (detailed.sbt[i]) detailed.summary.sbtTrue++;
      else detailed.summary.sbtFalse++;
    }

    return detailed;
  } catch (e) {
    return {
      error: "❌ Ошибка парсинга JSON",
      proxy: {},
      sbt: {},
      summary: { proxyTrue: 0, proxyFalse: 6, sbtTrue: 0, sbtFalse: 6 },
    };
  }
}

// Функция для форматирования nftAccessAmount в CSV
function formatNftAccessAmountForCSV(value) {
  const detailed = parseNftAccessAmountDetailed(value);

  if (detailed.error) {
    return detailed.error;
  }

  // Формируем строку с детальными данными
  let result = "Proxy: ";
  for (let i = 4; i <= 9; i++) {
    result += `${i}:${detailed.proxy[i] ? "✅" : "❌"}`;
    if (i < 9) result += ",";
  }

  result += " | SBT: ";
  for (let i = 4; i <= 9; i++) {
    result += `${i}:${detailed.sbt[i] ? "✅" : "❌"}`;
    if (i < 9) result += ",";
  }

  return result;
}

// Функция для форматирования nftAccessAmount в HTML
function formatNftAccessAmountForHTML(value) {
  const detailed = parseNftAccessAmountDetailed(value);

  if (detailed.error) {
    return `<span class="status-inactive">${detailed.error}</span>`;
  }

  let html = '<div class="nft-access-details">';

  // Proxy секция
  html += '<div class="nft-section">';
  html += "<strong>🌐 Proxy:</strong><br>";
  html += '<div class="level-grid">';
  for (let i = 4; i <= 9; i++) {
    const isTrue = detailed.proxy[i];
    html += `<span class="level-badge ${
      isTrue ? "level-true" : "level-false"
    }">${i}: ${isTrue ? "✅" : "❌"}</span>`;
  }
  html += "</div>";
  html += `</div>`;

  // SBT секция
  html += '<div class="nft-section">';
  html += "<strong>🔒 SBT:</strong><br>";
  html += '<div class="level-grid">';
  for (let i = 4; i <= 9; i++) {
    const isTrue = detailed.sbt[i];
    html += `<span class="level-badge ${
      isTrue ? "level-true" : "level-false"
    }">${i}: ${isTrue ? "✅" : "❌"}</span>`;
  }
  html += "</div>";
  html += "</div>";

  // Сводка
  html += `<div class="nft-summary">`;
  html += `<span class="summary-item">Proxy: ${detailed.summary.proxyTrue}✅ ${detailed.summary.proxyFalse}❌</span>`;
  html += `<span class="summary-item">SBT: ${detailed.summary.sbtTrue}✅ ${detailed.summary.sbtFalse}❌</span>`;
  html += `</div>`;

  html += "</div>";
  return html;
}

// Функция для создания CSV из данных
function createCSV(data, headers, filename) {
  if (!data || data.length === 0) {
    return `# ${filename}\n# Нет данных\n\n`;
  }

  let csv = `# ${filename}\n`;

  // Заголовки
  csv += headers.map((h) => h.name).join(",") + "\n";

  // Данные
  data.forEach((row) => {
    const values = headers.map((header) => {
      let value = row[header.field] || "";

      // Обработка специальных случаев
      if (typeof value === "object") {
        value = JSON.stringify(value);
      }

      // Детальный парсинг nftAccessAmount
      if (header.field === "nftAccessAmount") {
        value = formatNftAccessAmountForCSV(value);
      }

      // Форматирование boolean значений
      if (header.field === "proxy") {
        value = value === 1 ? "Proxy" : "SBT";
      }

      // Форматирование статуса зоны
      if (header.field === "status" && filename.includes("Зоны")) {
        value = value === "active" ? "Активна" : "Неактивна";
      }

      // Форматирование статуса субдомена
      if (header.field === "status" && filename.includes("Субдомены")) {
        const statusMap = {
          active: "Активен",
          inactive: "Неактивен",
          auction: "Аукцион",
          claimed: "Выкуплен",
        };
        value = statusMap[value] || value;
      }

      // Экранирование запятых и кавычек
      if (
        typeof value === "string" &&
        (value.includes(",") || value.includes('"') || value.includes("\n"))
      ) {
        value = `"${value.replace(/"/g, '""')}"`;
      }

      return value;
    });
    csv += values.join(",") + "\n";
  });

  return csv + "\n";
}

// Функция для создания HTML таблицы
function createHTMLTable(data, title, headers, fieldNames) {
  if (!data || data.length === 0) {
    return `
      <div class="table-section">
        <h3>${title}</h3>
        <p class="no-data">Нет данных</p>
      </div>
    `;
  }

  let html = `
    <div class="table-section">
      <h3>${title} (${data.length} записей)</h3>
      <div class="table-container">
        <table>
          <thead>
            <tr>
  `;

  // Заголовки
  headers.forEach((header) => {
    html += `<th>${header}</th>`;
  });

  html += `
            </tr>
          </thead>
          <tbody>
  `;

  // Данные
  data.forEach((row) => {
    html += "<tr>";
    fieldNames.forEach((fieldName) => {
      let value = row[fieldName] || "";

      // Обработка специальных случаев
      if (typeof value === "object") {
        value = JSON.stringify(value);
      }

      // Детальный парсинг nftAccessAmount для HTML
      if (fieldName === "nftAccessAmount") {
        value = formatNftAccessAmountForHTML(value);
      }

      // Обработка collectionAddress в зонах
      if (fieldName === "collectionAddress" && title.includes("Зоны")) {
        if (value) {
          value = `<span class="address" title="${value}">${value.substring(
            0,
            20
          )}...</span>`;
        } else {
          value = "<span class='no-address'>Нет адреса</span>";
        }
      }

      // Обработка collectionAddress в субдоменах
      if (fieldName === "collectionAddress" && title.includes("Субдомены")) {
        if (value) {
          value = `<span class="address" title="${value}">${value.substring(
            0,
            20
          )}...</span>`;
        } else {
          value = "<span class='no-address'>Нет адреса</span>";
        }
      }

      // Обработка статуса зоны
      if (fieldName === "status" && title.includes("Зоны")) {
        if (value === "active") {
          value = '<span class="status-active">✅ Активна</span>';
        } else if (value === "inactive") {
          value = '<span class="status-inactive">⏸️ Неактивна</span>';
        } else {
          value = `<span>${value}</span>`;
        }
      }

      // Обработка статуса субдомена
      if (fieldName === "status" && title.includes("Субдомены")) {
        const statusClasses = {
          active: "status-active",
          inactive: "status-inactive",
          auction: "status-auction",
          claimed: "status-claimed",
        };
        const statusLabels = {
          active: "✅ Активен",
          inactive: "⏸️ Неактивен",
          auction: "💰 Аукцион",
          claimed: "🏆 Выкуплен",
        };
        const className = statusClasses[value] || "";
        const label = statusLabels[value] || value;
        value = `<span class="${className}">${label}</span>`;
      }

      // Обработка links (если это JSON)
      if (fieldName === "links" && typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            value = parsed.join("<br>");
          }
        } catch (e) {
          // Если не JSON, оставляем как есть
        }
      }

      // Обработка bids (если это JSON)
      if (fieldName === "bids" && typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            value = `<strong>Всего ставок: ${parsed.length}</strong><br>`;
            value += parsed
              .map(
                (bid, i) =>
                  `${i + 1}. ${bid.bidder?.substring(0, 10)}...: ${(
                    bid.amount / 1_000_000_000
                  ).toFixed(2)} TON`
              )
              .join("<br>");
          }
        } catch (e) {
          // Если не JSON, оставляем как есть
        }
      }

      // Форматирование boolean значений
      if (fieldName === "proxy") {
        value =
          value === 1
            ? '<span class="proxy-badge">🌐 Proxy</span>'
            : '<span class="sbt-badge">🔒 SBT</span>';
      }

      // Ограничение длины для удобства просмотра
      if (
        typeof value === "string" &&
        value.length > 100 &&
        !value.includes("<br>") &&
        !value.includes("<span")
      ) {
        value = value.substring(0, 100) + "...";
      }

      html += `<td>${value}</td>`;
    });
    html += "</tr>";
  });

  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  return html;
}

// Создаем папку для экспорта
const exportDir = "./database-export-detailed";
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir, { recursive: true });
}

console.log(
  "\n📊 Начинаем экспорт с детальным отображением nftAccessAmount..."
);

// Экспортируем каждую базу данных
databases.forEach((dbInfo) => {
  console.log(`\n${dbInfo.label} Экспорт базы данных: ${dbInfo.name}`);
  console.log("=".repeat(50));

  try {
    const db = new Database(dbInfo.path);

    // Создаем подпапку для этой базы данных
    const dbExportDir = path.join(exportDir, dbInfo.name);
    if (!fs.existsSync(dbExportDir)) {
      fs.mkdirSync(dbExportDir, { recursive: true });
    }

    let allTablesContent = `# Экспорт базы данных NFT Domains (${dbInfo.label})\n`;
    allTablesContent += `# Дата экспорта: ${new Date().toLocaleString()}\n`;
    allTablesContent += `# Сеть: ${dbInfo.name.toUpperCase()}\n`;
    allTablesContent += `# Детальная проверка поля nftAccessAmount (уровни 4-9 для proxy и sbt)\n\n`;

    // 1. Проверяем структуру базы данных
    console.log("🔍 Проверяем структуру базы данных...");
    try {
      const usersColumns = db.prepare("PRAGMA table_info(users)").all();
      console.log(`📋 Колонки таблицы users (${usersColumns.length}):`);
      usersColumns.forEach((col) => {
        console.log(`   - ${col.name} (${col.type})`);
      });

      // Проверяем наличие поля nftAccessAmount
      const hasNftAccessAmount = usersColumns.some(
        (col) => col.name === "nftAccessAmount"
      );
      console.log(
        `🔍 Поле nftAccessAmount: ${
          hasNftAccessAmount ? "✅ Найдено" : "❌ Отсутствует"
        }`
      );
    } catch (error) {
      console.log("⚠️ Не удалось получить структуру таблицы users");
    }

    // 2. Пользователи (с детальной проверкой nftAccessAmount)
    console.log(
      "👥 Экспорт пользователей с детальной проверкой nftAccessAmount..."
    );
    const users = db.prepare("SELECT * FROM users").all();
    console.log(`📊 Найдено пользователей: ${users.length}`);

    // Детальная проверка nftAccessAmount у каждого пользователя
    users.forEach((user, index) => {
      try {
        const detailed = parseNftAccessAmountDetailed(user.nftAccessAmount);

        if (detailed.summary.proxyTrue > 0 || detailed.summary.sbtTrue > 0) {
          console.log(`   ${index + 1}. ${user.address.substring(0, 10)}...`);
          console.log(
            `      Proxy: ${detailed.summary.proxyTrue}✅ ${detailed.summary.proxyFalse}❌`
          );
          console.log(
            `      SBT: ${detailed.summary.sbtTrue}✅ ${detailed.summary.sbtFalse}❌`
          );

          // Показываем детали по уровням, где есть true
          if (detailed.summary.proxyTrue > 0) {
            const trueLevels = [];
            for (let i = 4; i <= 9; i++) {
              if (detailed.proxy[i]) trueLevels.push(i);
            }
            console.log(
              `      Proxy true на уровнях: ${trueLevels.join(", ")}`
            );
          }

          if (detailed.summary.sbtTrue > 0) {
            const trueLevels = [];
            for (let i = 4; i <= 9; i++) {
              if (detailed.sbt[i]) trueLevels.push(i);
            }
            console.log(`      SBT true на уровнях: ${trueLevels.join(", ")}`);
          }
        }
      } catch (e) {
        console.log(
          `   ${index + 1}. ${user.address.substring(
            0,
            10
          )}... - ❌ Ошибка парсинга nftAccessAmount`
        );
      }
    });

    const userHeaders = [
      { name: "ID", field: "id" },
      { name: "Адрес", field: "address" },
      { name: "Имя", field: "name" },
      { name: "Домены", field: "domains" },
      { name: "Зоны", field: "zones" },
      { name: "Субдомены", field: "subdomains" },
      { name: "Дата регистрации", field: "registrationDate" },
      { name: "NFT доступ (детально)", field: "nftAccessAmount" },
      { name: "Создан", field: "createdAt" },
      { name: "Обновлен", field: "updatedAt" },
    ];
    const usersCSV = createCSV(users, userHeaders, "Пользователи");
    allTablesContent += usersCSV;

    // 3. Зоны
    console.log("🌐 Экспорт зон...");
    const zones = db.prepare("SELECT * FROM zones").all();
    console.log(`📊 Найдено зон: ${zones.length}`);

    const zoneHeaders = [
      { name: "ID", field: "id" },
      { name: "Название", field: "name" },
      { name: "Адрес", field: "address" },
      { name: "Collection Address", field: "collectionAddress" },
      { name: "Wrapper Address", field: "wrapperAddress" },
      { name: "Тип", field: "proxy" },
      { name: "Дата регистрации", field: "registrationDate" },
      { name: "Кол-во субдоменов", field: "subdomainsAmount" },
      { name: "Владелец", field: "owner" },
      { name: "Статус", field: "status" },
      { name: "Цена зоны", field: "zonePrice" },
      { name: "Создана", field: "createdAt" },
      { name: "Обновлена", field: "updatedAt" },
    ];
    const zonesCSV = createCSV(zones, zoneHeaders, "Зоны");
    allTablesContent += zonesCSV;

    // 4. Субдомены
    console.log("🔗 Экспорт субдоменов...");
    const subdomains = db.prepare("SELECT * FROM subdomains").all();
    console.log(`📊 Найдено субдоменов: ${subdomains.length}`);

    // Парсим JSON поля
    subdomains.forEach((sd) => {
      try {
        sd.links = JSON.parse(sd.links || "[]");
      } catch {
        sd.links = [];
      }
    });

    const subdomainHeaders = [
      { name: "ID", field: "id" },
      { name: "Название", field: "name" },
      { name: "Адрес", field: "address" },
      { name: "Цена", field: "mintPrice" },
      { name: "Дата регистрации", field: "registrationDate" },
      { name: "Ссылки", field: "links" },
      { name: "ID зоны", field: "zoneId" },
      { name: "Владелец", field: "owner" },
      { name: "Статус", field: "status" },
      { name: "Время аукциона", field: "auctionEndTime" },
      { name: "Последняя ставка", field: "lastBid" },
      { name: "Последний участник", field: "lastBidder" },
      { name: "Ставки", field: "bids" },
      { name: "Collection Address", field: "collectionAddress" },
      { name: "Создан", field: "createdAt" },
      { name: "Обновлен", field: "updatedAt" },
    ];
    const subdomainsCSV = createCSV(subdomains, subdomainHeaders, "Субдомены");
    allTablesContent += subdomainsCSV;

    // 5. Чаты
    console.log("💬 Экспорт чатов...");
    const chats = db.prepare("SELECT * FROM chats").all();
    const chatHeaders = [
      { name: "ID", field: "id" },
      { name: "Домен", field: "domain" },
      { name: "Адрес пользователя", field: "userAddress" },
      { name: "Статус", field: "status" },
      { name: "Создан", field: "createdAt" },
      { name: "Обновлен", field: "updatedAt" },
    ];
    const chatsCSV = createCSV(chats, chatHeaders, "Чаты");
    allTablesContent += chatsCSV;

    // 6. Сообщения
    console.log("📨 Экспорт сообщений...");
    const messages = db.prepare("SELECT * FROM messages").all();
    const messageHeaders = [
      { name: "ID", field: "id" },
      { name: "ID чата", field: "chatId" },
      { name: "Отправитель", field: "sender" },
      { name: "Текст", field: "text" },
      { name: "Время", field: "timestamp" },
    ];
    const messagesCSV = createCSV(messages, messageHeaders, "Сообщения");
    allTablesContent += messagesCSV;

    // 7. Аукционы
    console.log("💰 Экспорт аукционов...");
    try {
      const auctions = db.prepare("SELECT * FROM auctions").all();
      const auctionHeaders = [
        { name: "ID", field: "id" },
        { name: "ID субдомена", field: "subdomainId" },
        { name: "Текущая ставка", field: "currentBid" },
        { name: "Текущий участник", field: "currentBidder" },
        { name: "Время окончания", field: "endTime" },
        { name: "Статус", field: "status" },
        { name: "Ставки", field: "bids" },
        { name: "Создан", field: "createdAt" },
        { name: "Обновлен", field: "updatedAt" },
      ];
      const auctionsCSV = createCSV(auctions, auctionHeaders, "Аукционы");
      allTablesContent += auctionsCSV;
      console.log(`📊 Найдено аукционов: ${auctions.length}`);
    } catch (error) {
      console.log("ℹ️ Таблица auctions не найдена, пропускаем...");
    }

    // 8. Статистика с детальной проверкой nftAccessAmount
    console.log("📈 Экспорт статистики...");

    // Подсчитываем детальную статистику по nftAccessAmount
    let usersWithTrueProxy = 0;
    let usersWithTrueSbt = 0;
    let totalProxyTrue = 0;
    let totalSbtTrue = 0;

    users.forEach((user) => {
      try {
        const detailed = parseNftAccessAmountDetailed(user.nftAccessAmount);

        if (detailed.summary.proxyTrue > 0) {
          usersWithTrueProxy++;
          totalProxyTrue += detailed.summary.proxyTrue;
        }

        if (detailed.summary.sbtTrue > 0) {
          usersWithTrueSbt++;
          totalSbtTrue += detailed.summary.sbtTrue;
        }
      } catch (e) {
        // Пропускаем ошибки парсинга
      }
    });

    const stats = {
      totalUsers: users.length,
      usersWithTrueProxy,
      usersWithTrueSbt,
      totalProxyTrue,
      totalSbtTrue,
      totalZones: db.prepare("SELECT COUNT(*) as count FROM zones").get().count,
      activeZones: db
        .prepare("SELECT COUNT(*) as count FROM zones WHERE status = 'active'")
        .get().count,
      inactiveZones: db
        .prepare(
          "SELECT COUNT(*) as count FROM zones WHERE status = 'inactive'"
        )
        .get().count,
      proxyZones: db
        .prepare("SELECT COUNT(*) as count FROM zones WHERE proxy = 1")
        .get().count,
      sbtZones: db
        .prepare("SELECT COUNT(*) as count FROM zones WHERE proxy = 0")
        .get().count,
      totalSubdomains: subdomains.length,
      subdomainsWithCollection: db
        .prepare(
          "SELECT COUNT(*) as count FROM subdomains WHERE collectionAddress IS NOT NULL"
        )
        .get().count,
      totalChats: chats.length,
      totalMessages: messages.length,
    };

    const statsCSV =
      `# Статистика (${dbInfo.name})\nПоказатель,Значение\n` +
      `Всего пользователей,${stats.totalUsers}\n` +
      `Пользователей с true в proxy,${stats.usersWithTrueProxy}\n` +
      `Пользователей с true в sbt,${stats.usersWithTrueSbt}\n` +
      `Всего true в proxy (сумма по уровням),${stats.totalProxyTrue}\n` +
      `Всего true в sbt (сумма по уровням),${stats.totalSbtTrue}\n` +
      `Всего зон,${stats.totalZones}\n` +
      `Активных зон,${stats.activeZones}\n` +
      `Неактивных зон,${stats.inactiveZones}\n` +
      `🌐 Proxy зон,${stats.proxyZones}\n` +
      `🔒 SBT зон,${stats.sbtZones}\n` +
      `Всего субдоменов,${stats.totalSubdomains}\n` +
      `Субдоменов с collectionAddress,${stats.subdomainsWithCollection}\n` +
      `Всего чатов,${stats.totalChats}\n` +
      `Всего сообщений,${stats.totalMessages}\n\n`;
    allTablesContent += statsCSV;

    // 9. Детальная информация о зонах
    console.log("🔍 Экспорт детальной информации о зонах...");
    const zoneDetails = db
      .prepare(
        `
        SELECT 
          z.id,
          z.name,
          z.address,
          z.collectionAddress,
          z.proxy,
          z.status,
          z.owner,
          z.createdAt,
          COUNT(s.id) as subdomain_count,
          GROUP_CONCAT(s.name, ', ') as subdomain_names
        FROM zones z
        LEFT JOIN subdomains s ON z.id = s.zoneId
        GROUP BY z.id
        ORDER BY z.id
      `
      )
      .all();

    const zoneDetailsCSV =
      `# Детальная информация о зонах (${dbInfo.name})\nID,Название,Адрес,Collection Address,Тип,Статус,Владелец,Создана,Кол-во субдоменов,Субдомены\n` +
      zoneDetails
        .map(
          (row) =>
            `${row.id},${row.name},${row.address},${
              row.collectionAddress || ""
            },${row.proxy === 1 ? "Proxy" : "SBT"},${
              row.status === "active" ? "Активна" : "Неактивна"
            },${row.owner || ""},${row.createdAt},${row.subdomain_count},"${
              row.subdomain_names || ""
            }"`
        )
        .join("\n") +
      "\n\n";
    allTablesContent += zoneDetailsCSV;

    // Сохраняем все таблицы в один файл
    const allTablesFile = path.join(dbExportDir, "all-tables.csv");
    fs.writeFileSync(allTablesFile, allTablesContent, "utf8");

    // Сохраняем отдельные файлы
    fs.writeFileSync(path.join(dbExportDir, "users.csv"), usersCSV, "utf8");
    fs.writeFileSync(path.join(dbExportDir, "zones.csv"), zonesCSV, "utf8");
    fs.writeFileSync(
      path.join(dbExportDir, "subdomains.csv"),
      subdomainsCSV,
      "utf8"
    );
    fs.writeFileSync(path.join(dbExportDir, "chats.csv"), chatsCSV, "utf8");
    fs.writeFileSync(
      path.join(dbExportDir, "messages.csv"),
      messagesCSV,
      "utf8"
    );
    fs.writeFileSync(
      path.join(dbExportDir, "statistics.csv"),
      statsCSV,
      "utf8"
    );
    fs.writeFileSync(
      path.join(dbExportDir, "zone-details.csv"),
      zoneDetailsCSV,
      "utf8"
    );

    // Создаем HTML файл
    console.log("🌐 Создание HTML файла с детальным отображением...");
    createHTMLFile(db, dbInfo, dbExportDir);

    db.close();

    console.log(`✅ Экспорт ${dbInfo.name} завершен!`);
    console.log(`📁 Файлы сохранены в: ${dbExportDir}`);
  } catch (error) {
    console.error(`❌ Ошибка при экспорте ${dbInfo.name}:`, error.message);
  }
});

// Функция для создания HTML файла
function createHTMLFile(db, dbInfo, exportDir) {
  // Получаем данные для HTML
  const users = db.prepare("SELECT * FROM users").all();
  const zones = db.prepare("SELECT * FROM zones ORDER BY id").all();
  const subdomains = db.prepare("SELECT * FROM subdomains").all();
  const chats = db.prepare("SELECT * FROM chats").all();
  const messages = db.prepare("SELECT * FROM messages").all();

  // Парсим JSON поля
  subdomains.forEach((sd) => {
    try {
      sd.links = JSON.parse(sd.links || "[]");
    } catch {
      sd.links = [];
    }
  });

  // Статистика
  const stats = {
    totalUsers: users.length,
    totalZones: zones.length,
    activeZones: zones.filter((z) => z.status === "active").length,
    inactiveZones: zones.filter((z) => z.status === "inactive").length,
    totalSubdomains: subdomains.length,
    subdomainsWithCollection: subdomains.filter((sd) => sd.collectionAddress)
      .length,
    totalChats: chats.length,
    totalMessages: messages.length,
    proxyZones: zones.filter((z) => z.proxy === 1).length,
    sbtZones: zones.filter((z) => z.proxy === 0).length,
  };

  // Подсчитываем детальную статистику по nftAccessAmount
  let usersWithTrueProxy = 0;
  let usersWithTrueSbt = 0;
  let totalProxyTrue = 0;
  let totalSbtTrue = 0;

  users.forEach((user) => {
    try {
      const detailed = parseNftAccessAmountDetailed(user.nftAccessAmount);

      if (detailed.summary.proxyTrue > 0) {
        usersWithTrueProxy++;
        totalProxyTrue += detailed.summary.proxyTrue;
      }

      if (detailed.summary.sbtTrue > 0) {
        usersWithTrueSbt++;
        totalSbtTrue += detailed.summary.sbtTrue;
      }
    } catch (e) {
      // Пропускаем ошибки парсинга
    }
  });

  let htmlContent = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NFT Domains Database Export (${dbInfo.name.toUpperCase()})</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1600px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #2c3e50, #34495e);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header .subtitle {
            font-size: 1.2em;
            opacity: 0.9;
        }
        
        .stats {
            background: #f8f9fa;
            padding: 20px;
            border-bottom: 1px solid #e9ecef;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 15px;
        }
        
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 5px 15px
                        rgba(0,0,0,0.1);
        }
        
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .stat-label {
            color: #7f8c8d;
            font-size: 0.9em;
        }
        
        .content {
            padding: 30px;
        }
        
        .table-section {
            margin-bottom: 40px;
        }
        
        .table-section h3 {
            color: #2c3e50;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #3498db;
            font-size: 1.5em;
        }
        
        .table-container {
            overflow-x: auto;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            background: white;
        }
        
        th {
            background: #3498db;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
            border: none;
        }
        
        td {
            padding: 12px 15px;
            border-bottom: 1px solid #ecf0f1;
            vertical-align: top;
        }
        
        tr:hover {
            background: #f8f9fa;
        }
        
        .no-data {
            text-align: center;
            color: #7f8c8d;
            font-style: italic;
            padding: 20px;
        }
        
        /* Стили для статусов */
        .status-active {
            color: #27ae60;
            font-weight: bold;
            background: #d5f4e6;
            padding: 3px 8px;
            border-radius: 4px;
            display: inline-block;
        }
        
        .status-inactive {
            color: #e74c3c;
            font-weight: bold;
            background: #fadbd8;
            padding: 3px 8px;
            border-radius: 4px;
            display: inline-block;
        }
        
        .status-auction {
            color: #f39c12;
            font-weight: bold;
            background: #fef5e7;
            padding: 3px 8px;
            border-radius: 4px;
            display: inline-block;
        }
        
        .status-claimed {
            color: #8e44ad;
            font-weight: bold;
            background: #e8daef;
            padding: 3px 8px;
            border-radius: 4px;
            display: inline-block;
        }
        
        /* Стили для адресов */
        .address {
            font-family: monospace;
            background: #f8f9fa;
            padding: 2px 5px;
            border-radius: 3px;
            font-size: 0.9em;
            cursor: pointer;
        }
        
        .address:hover {
            background: #e8f4fc;
        }
        
        .no-address {
            color: #95a5a6;
            font-style: italic;
        }
        
        /* Бейджи для типов зон */
        .proxy-badge {
            color: #3498db;
            font-weight: bold;
            background: #d6eaf8;
            padding: 3px 8px;
            border-radius: 4px;
            display: inline-block;
        }
        
        .sbt-badge {
            color: #2ecc71;
            font-weight: bold;
            background: #d5f4e6;
            padding: 3px 8px;
            border-radius: 4px;
            display: inline-block;
        }
        
        /* Стили для детального отображения nftAccessAmount */
        .nft-access-details {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 8px;
            border: 1px solid #e9ecef;
        }
        
        .nft-section {
            margin-bottom: 10px;
        }
        
        .nft-section strong {
            color: #2c3e50;
            display: block;
            margin-bottom: 5px;
        }
        
        .level-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 5px;
            margin-bottom: 5px;
        }
        
        .level-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.85em;
            text-align: center;
            font-family: monospace;
        }
        
        .level-true {
            background: #d5f4e6;
            color: #27ae60;
            border: 1px solid #27ae60;
        }
        
        .level-false {
            background: #fadbd8;
            color: #e74c3c;
            border: 1px solid #e74c3c;
        }
        
        .nft-summary {
            display: flex;
            justify-content: space-between;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px dashed #bdc3c7;
        }
        
        .summary-item {
            font-size: 0.85em;
            color: #7f8c8d;
        }
        
        .footer {
            background: #2c3e50;
            color: white;
            text-align: center;
            padding: 20px;
            margin-top: 40px;
        }
        
        @media (max-width: 768px) {
            .container {
                margin: 10px;
                border-radius: 10px;
            }
            
            th, td {
                padding: 8px 10px;
                font-size: 0.9em;
            }
            
            .level-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .nft-summary {
                flex-direction: column;
                gap: 5px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 NFT Domains Database</h1>
            <div class="subtitle">Экспорт всех таблиц базы данных (${
              dbInfo.label
            })</div>
            <div style="margin-top: 10px; font-size: 0.9em; opacity: 0.8;">
                ${
                  dbInfo.name === "mainnet"
                    ? "🌐 Mainnet сеть"
                    : "🧪 Testnet сеть"
                } | ✅ Детальная проверка nftAccessAmount
            </div>
        </div>
        
        <div class="stats">
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${stats.totalUsers}</div>
                    <div class="stat-label">👥 Пользователей</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" style="color: ${
                      usersWithTrueProxy > 0 ? "#27ae60" : "#e74c3c"
                    };">${usersWithTrueProxy}</div>
                    <div class="stat-label">✅ Пользователей с true в proxy</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" style="color: ${
                      usersWithTrueSbt > 0 ? "#27ae60" : "#e74c3c"
                    };">${usersWithTrueSbt}</div>
                    <div class="stat-label">✅ Пользователей с true в sbt</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" style="color: ${
                      totalProxyTrue > 0 ? "#27ae60" : "#e74c3c"
                    };">${totalProxyTrue}</div>
                    <div class="stat-label">📊 Всего true в proxy (сумма)</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" style="color: ${
                      totalSbtTrue > 0 ? "#27ae60" : "#e74c3c"
                    };">${totalSbtTrue}</div>
                    <div class="stat-label">📊 Всего true в sbt (сумма)</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.totalZones}</div>
                    <div class="stat-label">🌐 Всего зон</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" style="color: #27ae60;">${
                      stats.activeZones
                    }</div>
                    <div class="stat-label">✅ Активных зон</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" style="color: #e74c3c;">${
                      stats.inactiveZones
                    }</div>
                    <div class="stat-label">⏸️ Неактивных зон</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.totalSubdomains}</div>
                    <div class="stat-label">🔗 Субдоменов</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${
                      stats.subdomainsWithCollection
                    }</div>
                    <div class="stat-label">📝 С collectionAddress</div>
                </div>
            </div>
        </div>
        
        <div class="content">
`;

  // 1. Пользователи с детальным отображением nftAccessAmount
  const userHeaders = [
    "ID",
    "Адрес",
    "Имя",
    "Домены",
    "Зоны",
    "Субдомены",
    "Дата регистрации",
    "NFT доступ (детально)",
    "Создан",
    "Обновлен",
  ];
  const userFieldNames = [
    "id",
    "address",
    "name",
    "domains",
    "zones",
    "subdomains",
    "registrationDate",
    "nftAccessAmount",
    "createdAt",
    "updatedAt",
  ];
  htmlContent += createHTMLTable(
    users,
    "👥 Пользователи (детальная проверка nftAccessAmount)",
    userHeaders,
    userFieldNames
  );

  // 2. Зоны
  const zoneHeaders = [
    "ID",
    "Название",
    "Адрес",
    "Collection Address",
    "Wrapper Address",
    "Тип",
    "Дата регистрации",
    "Кол-во субдоменов",
    "Владелец",
    "Статус",
    "Цена зоны",
    "Создана",
    "Обновлена",
  ];
  const zoneFieldNames = [
    "id",
    "name",
    "address",
    "collectionAddress",
    "wrapperAddress",
    "proxy",
    "registrationDate",
    "subdomainsAmount",
    "owner",
    "status",
    "zonePrice",
    "createdAt",
    "updatedAt",
  ];
  htmlContent += createHTMLTable(zones, "🌐 Зоны", zoneHeaders, zoneFieldNames);

  // 3. Субдомены
  const subdomainHeaders = [
    "ID",
    "Название",
    "Адрес",
    "Цена",
    "Дата регистрации",
    "Ссылки",
    "ID зоны",
    "Владелец",
    "Статус",
    "Время аукциона",
    "Последняя ставка",
    "Последний участник",
    "Ставки",
    "Collection Address",
    "Создан",
    "Обновлен",
  ];
  const subdomainFieldNames = [
    "id",
    "name",
    "address",
    "mintPrice",
    "registrationDate",
    "links",
    "zoneId",
    "owner",
    "status",
    "auctionEndTime",
    "lastBid",
    "lastBidder",
    "bids",
    "collectionAddress",
    "createdAt",
    "updatedAt",
  ];
  htmlContent += createHTMLTable(
    subdomains,
    "🔗 Субдомены",
    subdomainHeaders,
    subdomainFieldNames
  );

  // 4. Чаты
  const chatHeaders = [
    "ID",
    "Домен",
    "Адрес пользователя",
    "Статус",
    "Создан",
    "Обновлен",
  ];
  const chatFieldNames = [
    "id",
    "domain",
    "userAddress",
    "status",
    "createdAt",
    "updatedAt",
  ];
  htmlContent += createHTMLTable(chats, "💬 Чаты", chatHeaders, chatFieldNames);

  // 5. Сообщения
  const messageHeaders = ["ID", "ID чата", "Отправитель", "Текст", "Время"];
  const messageFieldNames = ["id", "chatId", "sender", "text", "timestamp"];
  htmlContent += createHTMLTable(
    messages,
    "📨 Сообщения",
    messageHeaders,
    messageFieldNames
  );

  // 6. Аукционы (если есть таблица)
  try {
    const auctions = db.prepare("SELECT * FROM auctions").all();
    const auctionHeaders = [
      "ID",
      "ID субдомена",
      "Текущая ставка",
      "Текущий участник",
      "Время окончания",
      "Статус",
      "Ставки",
      "Создан",
      "Обновлен",
    ];
    const auctionFieldNames = [
      "id",
      "subdomainId",
      "currentBid",
      "currentBidder",
      "endTime",
      "status",
      "bids",
      "createdAt",
      "updatedAt",
    ];
    htmlContent += createHTMLTable(
      auctions,
      "💰 Аукционы",
      auctionHeaders,
      auctionFieldNames
    );
  } catch (error) {
    // Таблица auctions не найдена
  }

  htmlContent += `
        </div>
        
        <div class="footer">
            <p>Экспорт создан: ${new Date().toLocaleString("ru-RU")}</p>
            <p>NFT Domains Server • ${dbInfo.name.toUpperCase()} база данных</p>
            <p>✅ Пользователей с true в proxy: ${usersWithTrueProxy} из ${
    stats.totalUsers
  } (всего true: ${totalProxyTrue})</p>
            <p>✅ Пользователей с true в sbt: ${usersWithTrueSbt} из ${
    stats.totalUsers
  } (всего true: ${totalSbtTrue})</p>
            <p>🌐 Активных зон: ${stats.activeZones} | ⏸️ Неактивных зон: ${
    stats.inactiveZones
  }</p>
            <p>📝 Субдоменов с collectionAddress: ${
              stats.subdomainsWithCollection
            } из ${stats.totalSubdomains}</p>
            <p>🔍 Детальная проверка nftAccessAmount: уровни 4-9 для proxy и sbt</p>
        </div>
    </div>
</body>
</html>
`;

  // Сохраняем HTML файл
  const htmlFile = path.join(exportDir, "database-export.html");
  fs.writeFileSync(htmlFile, htmlContent, "utf8");

  console.log(`✅ HTML файл создан: ${htmlFile}`);
}

// Создаем сводный отчет с детальной статистикой
console.log("\n📋 Создаем сводный отчет с детальной статистикой...");
try {
  let summaryContent = `# Сводный отчет по базам данных NFT Domains (детальная проверка)\n`;
  summaryContent += `# Дата создания: ${new Date().toLocaleString()}\n`;
  summaryContent += `# Проверены базы данных: ${databases
    .map((d) => d.name)
    .join(", ")}\n`;
  summaryContent += `# Детальная проверка поля nftAccessAmount (уровни 4-9 для proxy и sbt)\n\n`;

  databases.forEach((dbInfo) => {
    const dbExportDir = path.join(exportDir, dbInfo.name);
    const statsFile = path.join(dbExportDir, "statistics.csv");

    if (fs.existsSync(statsFile)) {
      const statsContent = fs.readFileSync(statsFile, "utf8");
      summaryContent += `## ${dbInfo.label}\n\n`;
      summaryContent += statsContent + "\n";
    }
  });

  // Сравниваем данные из обеих баз с детальной статистикой
  summaryContent += `## Сравнение баз данных (детальная статистика)\n\n`;

  const comparisonData = [];
  databases.forEach((dbInfo) => {
    const db = new Database(dbInfo.path);

    const zones = db
      .prepare("SELECT id, name, status FROM zones ORDER BY id")
      .all();
    const users = db.prepare("SELECT * FROM users").all();

    // Подсчитываем детальную статистику по nftAccessAmount
    let usersWithTrueProxy = 0;
    let usersWithTrueSbt = 0;
    let totalProxyTrue = 0;
    let totalSbtTrue = 0;

    users.forEach((user) => {
      try {
        const detailed = parseNftAccessAmountDetailed(user.nftAccessAmount);

        if (detailed.summary.proxyTrue > 0) {
          usersWithTrueProxy++;
          totalProxyTrue += detailed.summary.proxyTrue;
        }

        if (detailed.summary.sbtTrue > 0) {
          usersWithTrueSbt++;
          totalSbtTrue += detailed.summary.sbtTrue;
        }
      } catch (e) {
        // Пропускаем ошибки парсинга
      }
    });

    comparisonData.push({
      network: dbInfo.name,
      zones: zones.length,
      users: users.length,
      usersWithTrueProxy,
      usersWithTrueSbt,
      totalProxyTrue,
      totalSbtTrue,
      zoneIds: zones.map((z) => z.id).join(", "),
      zoneNames: zones.map((z) => z.name).join(", "),
    });

    db.close();
  });

  summaryContent += `Сеть,Зон,Пользователей,Пользователей с true в proxy,Пользователей с true в sbt,Всего true в proxy,Всего true в sbt,ID зон,Названия зон\n`;
  comparisonData.forEach((data) => {
    summaryContent += `${data.network},${data.zones},${data.users},${data.usersWithTrueProxy},${data.usersWithTrueSbt},${data.totalProxyTrue},${data.totalSbtTrue},"${data.zoneIds}","${data.zoneNames}"\n`;
  });

  // Добавляем примеры пользователей с true значениями
  summaryContent += `\n## Примеры пользователей с true значениями в nftAccessAmount\n\n`;

  databases.forEach((dbInfo) => {
    summaryContent += `### ${dbInfo.label}\n\n`;

    const db = new Database(dbInfo.path);
    const users = db.prepare("SELECT * FROM users LIMIT 10").all();

    let hasExamples = false;
    users.forEach((user, index) => {
      const detailed = parseNftAccessAmountDetailed(user.nftAccessAmount);

      if (detailed.summary.proxyTrue > 0 || detailed.summary.sbtTrue > 0) {
        hasExamples = true;
        summaryContent += `**Пользователь ${
          index + 1
        }:** ${user.address.substring(0, 20)}...\n`;
        summaryContent += `- Proxy: ${detailed.summary.proxyTrue}✅ ${detailed.summary.proxyFalse}❌\n`;
        summaryContent += `- SBT: ${detailed.summary.sbtTrue}✅ ${detailed.summary.sbtFalse}❌\n`;

        // Показываем детали по уровням
        if (detailed.summary.proxyTrue > 0) {
          const trueLevels = [];
          for (let i = 4; i <= 9; i++) {
            if (detailed.proxy[i]) trueLevels.push(i);
          }
          summaryContent += `  Proxy true на уровнях: ${trueLevels.join(
            ", "
          )}\n`;
        }

        if (detailed.summary.sbtTrue > 0) {
          const trueLevels = [];
          for (let i = 4; i <= 9; i++) {
            if (detailed.sbt[i]) trueLevels.push(i);
          }
          summaryContent += `  SBT true на уровнях: ${trueLevels.join(", ")}\n`;
        }
        summaryContent += `\n`;
      }
    });

    if (!hasExamples) {
      summaryContent += `Нет пользователей с true значениями в nftAccessAmount\n\n`;
    }

    db.close();
  });

  const summaryFile = path.join(exportDir, "summary-report.csv");
  fs.writeFileSync(summaryFile, summaryContent, "utf8");

  console.log("✅ Сводный отчет создан!");
} catch (error) {
  console.error("❌ Ошибка при создании сводного отчета:", error);
}

console.log("\n" + "=".repeat(50));
console.log("🎉 ЭКСПОРТ С ДЕТАЛЬНЫМ ОТОБРАЖЕНИЕМ nftAccessAmount ЗАВЕРШЕН!");
console.log("=".repeat(50));
console.log("\n📁 Все файлы сохранены в папке:", exportDir);
console.log("\n📋 Структура папок:");
console.log(`   ${exportDir}/`);
databases.forEach((dbInfo) => {
  console.log(`   ├── ${dbInfo.name}/`);
  console.log(`   │   ├── all-tables.csv      - Все таблицы`);
  console.log(
    `   │   ├── users.csv           - Пользователи (детальная проверка nftAccessAmount)`
  );
  console.log(`   │   ├── zones.csv           - Зоны`);
  console.log(`   │   ├── subdomains.csv      - Субдомены`);
  console.log(`   │   ├── chats.csv           - Чаты`);
  console.log(`   │   ├── messages.csv        - Сообщения`);
  console.log(`   │   ├── statistics.csv      - Статистика`);
  console.log(`   │   ├── zone-details.csv    - Детали зон`);
  console.log(
    `   │   └── database-export.html - HTML отчет с детальным отображением`
  );
});
console.log(
  `   └── summary-report.csv   - Сводный отчет с детальной статистикой`
);
console.log("\n🔍 Для проверки nftAccessAmount выполните:");
console.log(`   cd ${exportDir}`);
console.log(`   cat summary-report.csv`);
console.log("\n💡 Особенности этой версии:");
console.log(
  "   1. Детальное отображение nftAccessAmount для каждого пользователя"
);
console.log(
  "   2. Показывает значения true/false для уровней 4-9 в proxy и sbt"
);
console.log("   3. Подсчет суммарного количества true значений по уровням");
console.log("   4. HTML отчет с цветовой индикацией и сеткой уровней");
console.log("   5. Экспорт для обеих баз данных (mainnet и testnet)");
console.log("\n🌐 Для просмотра HTML отчета:");
databases.forEach((dbInfo) => {
  console.log(`   open ${exportDir}/${dbInfo.name}/database-export.html`);
});
console.log("\n📊 Пример отображения в CSV:");
console.log(
  `   Proxy: 4:✅,5:❌,6:✅,7:❌,8:❌,9:❌ | SBT: 4:❌,5:✅,6:❌,7:❌,8:❌,9:❌`
);
console.log(
  "\n🎯 Цель: Проверить, на каких уровнях (4-9) установлены true значения в proxy и sbt"
);
