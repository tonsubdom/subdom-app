/**
 * Скрипт для выгрузки всех доменов из TON коллекции
 * Использует API toncenter.com с ограничением 10 запросов в секунду
 * Сохраняет все домены с их структурой в CSV и Excel форматы
 * Начинает всегда с offset=0 и делает запросы по 100 элементов
 */

const fs = require("fs");
const https = require("https");
const { URL } = require("url");
const ExcelJS = require("exceljs");

// Конфигурация
const CONFIG = {
  // Вставьте ваш API ключ здесь (с лимитом 10 запросов в секунду)
  API_KEY: "YOUR_TONCENTER_API_KEY",

  // Адрес коллекции (в формате из swagger)
  COLLECTION_ADDRESS: "EQC3dNlesgVD8YbAazcauIrXBPfiVhMMr5YYk2in0Mtsz0Bz",

  // Лимит на запрос (максимум 100) - как в оригинальном скрипте
  LIMIT_PER_REQUEST: 100,

  // Задержка между запросами (в миллисекундах)
  // 1000ms / 10 запросов в секунду = 100ms между запросами
  // Добавляем запас для безопасности
  REQUEST_DELAY_MS: 110,

  // Файлы для сохранения результатов
  OUTPUT_CSV_FILE: "all_ton_domains.csv",
  OUTPUT_EXCEL_FILE: "all_ton_domains.xlsx",
  PROGRESS_FILE: "scraper_progress.json",

  // Флаг для принудительного сброса прогресса
  FORCE_RESET: false, // Установите true, чтобы начать с нуля
};

// Регулятор запросов для соблюдения лимита 10 запросов в секунду
class RateLimiter {
  constructor(maxRequestsPerSecond) {
    this.maxRequestsPerSecond = maxRequestsPerSecond;
    this.minInterval = 1000 / maxRequestsPerSecond;
    this.lastRequestTime = 0;
    this.queue = [];
    this.isProcessing = false;
  }

  async request(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  async processQueue() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minInterval) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.minInterval - timeSinceLastRequest)
      );
    }

    const { fn, resolve, reject } = this.queue.shift();
    this.lastRequestTime = Date.now();

    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    }

    // Рекурсивно обрабатываем следующий запрос
    setTimeout(() => this.processQueue(), 0);
  }
}

// Создаем регулятор запросов (10 запросов в секунду)
const rateLimiter = new RateLimiter(10);

// Функция для выполнения HTTP запроса
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (error) {
            reject(new Error(`Failed to parse JSON: ${error.message}`));
          }
        } else {
          let errorData = data;
          try {
            const errorParsed = JSON.parse(data);
            if (errorParsed.error_message) {
              errorData = errorParsed.error_message;
            }
          } catch (e) {}
          reject(new Error(`HTTP ${res.statusCode}: ${errorData}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
  });
}

// Функция для получения NFT items с пагинацией
// ТОЧНО как в оригинальном скрипте: offset увеличивается на LIMIT_PER_REQUEST
async function fetchNFTItems(offset) {
  const url = new URL("https://toncenter.com/api/v3/nft/items");

  // Параметры запроса - как в swagger
  url.searchParams.append("collection_address", CONFIG.COLLECTION_ADDRESS);
  url.searchParams.append("include_on_sale", "false"); // Добавляем как в оригинале
  url.searchParams.append("limit", CONFIG.LIMIT_PER_REQUEST.toString());
  url.searchParams.append("offset", offset.toString());

  const options = {
    headers: {
      Accept: "application/json",
      "X-API-Key": CONFIG.API_KEY,
    },
  };

  console.log(`Запрос: offset=${offset}, limit=${CONFIG.LIMIT_PER_REQUEST}`);
  return rateLimiter.request(() => makeRequest(url.toString(), options));
}

// Функция для извлечения данных из NFT item
function extractDomainData(item) {
  const domain = item.content?.domain || "";
  const cleanDomain = domain.replace(/\.ton$/i, "");

  // Извлекаем owner данные
  const ownerAddress = item.owner_address || "";
  const ownerName = item.owner?.name || "";

  // Извлекаем другие важные поля из структуры API
  const address = item.address || "";
  const collectionAddress = item.collection_address || "";
  const index = item.index || "";
  const lastTransactionLt = item.last_transaction_lt || "";
  const codeHash = item.code_hash || "";
  const dataHash = item.data_hash || "";
  const init = item.init || false;
  const onSale = item.on_sale || false;

  return {
    domain,
    cleanDomain,
    ownerAddress,
    ownerName,
    address,
    collectionAddress,
    index,
    lastTransactionLt,
    codeHash,
    dataHash,
    init,
    onSale,
    // Сохраняем полный объект для возможного расширения
    fullItem: item,
  };
}

// Функция для сохранения прогресса
function saveProgress(offset, totalProcessed, foundItems) {
  const progress = {
    lastOffset: offset,
    totalProcessed: totalProcessed,
    foundItemsCount: foundItems.length,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(CONFIG.PROGRESS_FILE, JSON.stringify(progress, null, 2));
  console.log(
    `Прогресс сохранен: offset=${offset}, обработано=${totalProcessed}, найдено элементов=${foundItems.length}`
  );
}

// Функция для загрузки прогресса
function loadProgress() {
  try {
    if (fs.existsSync(CONFIG.PROGRESS_FILE)) {
      const data = fs.readFileSync(CONFIG.PROGRESS_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn("Не удалось загрузить прогресс:", error.message);
  }
  return null;
}

// Функция для сброса прогресса
function resetProgress() {
  if (fs.existsSync(CONFIG.PROGRESS_FILE)) {
    fs.unlinkSync(CONFIG.PROGRESS_FILE);
    console.log("Файл прогресса удален");
  }

  if (fs.existsSync(CONFIG.OUTPUT_CSV_FILE)) {
    fs.unlinkSync(CONFIG.OUTPUT_CSV_FILE);
    console.log("CSV файл удален");
  }

  if (fs.existsSync(CONFIG.OUTPUT_EXCEL_FILE)) {
    fs.unlinkSync(CONFIG.OUTPUT_EXCEL_FILE);
    console.log("Excel файл удален");
  }
}

// Функция для сохранения доменов в CSV
function saveDomainsToCSV(items) {
  // Создаем CSV заголовок с нужными полями
  let csvContent =
    "domain,clean_domain,owner_address,owner_name,address,collection_address,index,last_transaction_lt,code_hash,data_hash,init,on_sale\n";

  // Добавляем данные
  items.forEach((itemData) => {
    const {
      domain,
      cleanDomain,
      ownerAddress,
      ownerName,
      address,
      collectionAddress,
      index,
      lastTransactionLt,
      codeHash,
      dataHash,
      init,
      onSale,
    } = itemData;

    // Экранируем кавычки в данных
    const escapeCSV = (str) => {
      if (str === null || str === undefined) return '""';
      return `"${String(str).replace(/"/g, '""')}"`;
    };

    csvContent += `${escapeCSV(domain)},${escapeCSV(cleanDomain)},${escapeCSV(
      ownerAddress
    )},${escapeCSV(ownerName)},${escapeCSV(address)},${escapeCSV(
      collectionAddress
    )},${escapeCSV(index)},${escapeCSV(lastTransactionLt)},${escapeCSV(
      codeHash
    )},${escapeCSV(dataHash)},${escapeCSV(init)},${escapeCSV(onSale)}\n`;
  });

  fs.writeFileSync(CONFIG.OUTPUT_CSV_FILE, csvContent);
  console.log(`Сохранено ${items.length} доменов в ${CONFIG.OUTPUT_CSV_FILE}`);
}

// Функция для сохранения доменов в Excel
async function saveDomainsToExcel(items) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("TON Domains");

  // Добавляем заголовки столбцов
  worksheet.columns = [
    { header: "Domain", key: "domain", width: 30 },
    { header: "Clean Domain", key: "cleanDomain", width: 20 },
    { header: "Owner Address", key: "ownerAddress", width: 70 },
    { header: "Owner Name", key: "ownerName", width: 30 },
    { header: "Address", key: "address", width: 70 },
    { header: "Collection Address", key: "collectionAddress", width: 70 },
    { header: "Index", key: "index", width: 40 },
    { header: "Last Transaction LT", key: "lastTransactionLt", width: 25 },
    { header: "Code Hash", key: "codeHash", width: 50 },
    { header: "Data Hash", key: "dataHash", width: 50 },
    { header: "Init", key: "init", width: 10 },
    { header: "On Sale", key: "onSale", width: 10 },
  ];

  // Добавляем данные
  items.forEach((itemData) => {
    const {
      domain,
      cleanDomain,
      ownerAddress,
      ownerName,
      address,
      collectionAddress,
      index,
      lastTransactionLt,
      codeHash,
      dataHash,
      init,
      onSale,
    } = itemData;

    worksheet.addRow({
      domain,
      cleanDomain,
      ownerAddress,
      ownerName,
      address,
      collectionAddress,
      index,
      lastTransactionLt,
      codeHash,
      dataHash,
      init: init ? "true" : "false",
      onSale: onSale ? "true" : "false",
    });
  });

  // Добавляем форматирование для заголовков
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  await workbook.xlsx.writeFile(CONFIG.OUTPUT_EXCEL_FILE);
  console.log(
    `Сохранено ${items.length} доменов в ${CONFIG.OUTPUT_EXCEL_FILE}`
  );
}

// Основная функция
async function main() {
  console.log("=== Начало выгрузки всех доменов из TON коллекции ===");
  console.log(`Коллекция: ${CONFIG.COLLECTION_ADDRESS}`);
  console.log(`Лимит на запрос: ${CONFIG.LIMIT_PER_REQUEST}`);
  console.log(`Лимит запросов в секунду: 10`);
  console.log(`Задержка между запросами: ${CONFIG.REQUEST_DELAY_MS}ms`);
  console.log(
    `Формат: offset увеличивается на ${CONFIG.LIMIT_PER_REQUEST} каждый запрос`
  );
  console.log("");

  // Проверяем API ключ
  if (!CONFIG.API_KEY || CONFIG.API_KEY.includes("ВАШ_API_КЛЮЧ")) {
    console.error(
      "ОШИБКА: Укажите ваш реальный API ключ toncenter.com с лимитом 10 запросов в секунду"
    );
    process.exit(1);
  }

  // Сбрасываем прогресс если нужно
  if (CONFIG.FORCE_RESET) {
    console.log("Принудительный сброс прогресса...");
    resetProgress();
  }

  // Загружаем прогресс, если есть
  const progress = loadProgress();
  let startOffset = 0; // ВСЕГДА начинаем с 0
  let totalProcessed = 0;
  let allDomainData = [];

  // Если есть прогресс и НЕ принудительный сброс, продолжаем
  if (progress && !CONFIG.FORCE_RESET) {
    console.log(`Найден предыдущий прогресс:`);
    console.log(`  Последний offset: ${progress.lastOffset}`);
    console.log(`  Обработано элементов: ${progress.totalProcessed}`);
    console.log(`  Найдено доменов: ${progress.foundItemsCount}`);

    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise((resolve) => {
      rl.question("Продолжить с места остановки? (y/n): ", resolve);
    });
    rl.close();

    if (
      answer.toLowerCase() === "y" ||
      answer.toLowerCase() === "yes" ||
      answer === ""
    ) {
      startOffset = progress.lastOffset + CONFIG.LIMIT_PER_REQUEST;
      totalProcessed = progress.totalProcessed;
      console.log(`Продолжаем с offset=${startOffset}`);

      // Загружаем ранее найденные домены из CSV, если файл существует
      if (fs.existsSync(CONFIG.OUTPUT_CSV_FILE)) {
        try {
          const csvContent = fs.readFileSync(CONFIG.OUTPUT_CSV_FILE, "utf8");
          const lines = csvContent.split("\n").slice(1); // Пропускаем заголовок

          lines.forEach((line) => {
            if (line.trim()) {
              // Простой парсинг CSV
              const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
              if (parts.length >= 12) {
                // Убираем кавычки
                const cleanParts = parts.map((part) =>
                  part.replace(/^"|"$/g, "").replace(/""/g, '"')
                );

                allDomainData.push({
                  domain: cleanParts[0],
                  cleanDomain: cleanParts[1],
                  ownerAddress: cleanParts[2],
                  ownerName: cleanParts[3],
                  address: cleanParts[4],
                  collectionAddress: cleanParts[5],
                  index: cleanParts[6],
                  lastTransactionLt: cleanParts[7],
                  codeHash: cleanParts[8],
                  dataHash: cleanParts[9],
                  init: cleanParts[10] === "true",
                  onSale: cleanParts[11] === "true",
                });
              }
            }
          });

          console.log(
            `Загружено ${allDomainData.length} доменов из предыдущего CSV файла`
          );
        } catch (error) {
          console.warn(
            "Не удалось загрузить предыдущие домены:",
            error.message
          );
        }
      }
    } else {
      console.log("Начинаем с нуля...");
      resetProgress();
    }
  } else {
    console.log("Начинаем с нуля...");
  }

  let offset = startOffset;
  let hasMoreItems = true;
  let requestCount = 0;
  let errorCount = 0;
  const maxErrors = 10;

  console.log("\nНачинаем выгрузку...");
  console.log("---");

  try {
    while (hasMoreItems && errorCount < maxErrors) {
      try {
        requestCount++;
        console.log(
          `Запрос #${requestCount}: offset=${offset}, limit=${CONFIG.LIMIT_PER_REQUEST}`
        );

        const response = await fetchNFTItems(offset);

        if (
          !response ||
          !response.nft_items ||
          response.nft_items.length === 0
        ) {
          console.log("Больше нет элементов для обработки");
          hasMoreItems = false;
          break;
        }

        const items = response.nft_items;
        console.log(`Получено ${items.length} элементов`);

        // Обрабатываем все элементы, извлекаем данные о доменах
        const batchDomainData = [];
        items.forEach((item) => {
          if (item.content && item.content.domain) {
            const domainData = extractDomainData(item);
            batchDomainData.push(domainData);
          } else {
            // Логируем элементы без доменов для отладки
            console.log(
              `Элемент без домена: ${item.address?.substring(0, 20)}...`
            );
          }
        });

        if (batchDomainData.length > 0) {
          console.log(
            `Найдено доменов в этой партии: ${batchDomainData.length}`
          );
          allDomainData.push(...batchDomainData);

          // Сохраняем промежуточные результаты каждые 1000 найденных доменов
          if (allDomainData.length % 1000 === 0) {
            saveDomainsToCSV(allDomainData);
            console.log(
              `Промежуточное сохранение: ${allDomainData.length} доменов`
            );
          }
        }

        totalProcessed += items.length;

        // Сохраняем прогресс каждые 5000 обработанных элементов
        if (totalProcessed % 5000 === 0) {
          saveProgress(offset, totalProcessed, allDomainData);
        }

        // Если получили меньше элементов, чем запросили, значит это последняя страница
        if (items.length < CONFIG.LIMIT_PER_REQUEST) {
          console.log(
            "Получено меньше элементов, чем запрошено - это последняя страница"
          );
          hasMoreItems = false;
        } else {
          // Увеличиваем offset на LIMIT_PER_REQUEST для следующего запроса
          offset += CONFIG.LIMIT_PER_REQUEST;

          // Добавляем задержку между запросами
          if (CONFIG.REQUEST_DELAY_MS > 0) {
            await new Promise((resolve) =>
              setTimeout(resolve, CONFIG.REQUEST_DELAY_MS)
            );
          }
        }

        // Периодически выводим статистику
        if (requestCount % 10 === 0) {
          console.log(`--- Статистика ---`);
          console.log(`Всего запросов: ${requestCount}`);
          console.log(`Всего обработано: ${totalProcessed} элементов`);
          console.log(`Найдено доменов: ${allDomainData.length}`);
          console.log(`Текущий offset: ${offset}`);
          console.log(`Следующий offset: ${offset + CONFIG.LIMIT_PER_REQUEST}`);
          console.log(`---`);
        }

        errorCount = 0; // Сбрасываем счетчик ошибок при успешном запросе
      } catch (error) {
        errorCount++;
        console.error(`Ошибка при запросе offset=${offset}:`, error.message);

        if (errorCount >= maxErrors) {
          console.error(
            `Достигнуто максимальное количество ошибок (${maxErrors}). Прерываю выполнение.`
          );
          break;
        }

        // Ждем перед повторной попыткой
        console.log(
          `Повторная попытка через 5 секунд... (ошибка ${errorCount}/${maxErrors})`
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    // Финальное сохранение
    console.log("\n--- Завершение работы ---");
    console.log(`Итоговая статистика:`);
    console.log(`Всего запросов: ${requestCount}`);
    console.log(`Всего обработано элементов: ${totalProcessed}`);
    console.log(`Найдено доменов: ${allDomainData.length}`);

    // Сохраняем финальные результаты
    if (allDomainData.length > 0) {
      saveDomainsToCSV(allDomainData);
      await saveDomainsToExcel(allDomainData);
      saveProgress(offset, totalProcessed, allDomainData);

      // Выводим примеры найденных доменов
      console.log("\nПримеры найденных доменов:");
      const examples = allDomainData.slice(
        0,
        Math.min(5, allDomainData.length)
      );
      examples.forEach((domainData, i) => {
        console.log(`  ${i + 1}. ${domainData.domain}`);
        console.log(`     Владелец: ${domainData.ownerAddress}`);
        console.log(
          `     Имя владельца: ${domainData.ownerName || "не указано"}`
        );
        console.log(
          `     Адрес NFT: ${domainData.address?.substring(0, 20) || "нет"}...`
        );
        console.log(`     На продаже: ${domainData.onSale ? "да" : "нет"}`);
      });

      if (allDomainData.length > 5) {
        console.log(`  ... и еще ${allDomainData.length - 5} доменов`);
      }
    } else {
      console.log("Домены не найдены");
    }

    console.log("\nГотово! Результаты сохранены в:");
    console.log(`  - ${CONFIG.OUTPUT_CSV_FILE} (CSV с доменами)`);
    console.log(`  - ${CONFIG.OUTPUT_EXCEL_FILE} (Excel с доменами)`);
    console.log(`  - ${CONFIG.PROGRESS_FILE} (прогресс выполнения)`);
  } catch (error) {
    console.error("Критическая ошибка:", error);
    // Сохраняем прогресс даже при ошибке
    saveProgress(offset, totalProcessed, allDomainData);
    if (allDomainData.length > 0) {
      saveDomainsToCSV(allDomainData);
      try {
        await saveDomainsToExcel(allDomainData);
      } catch (excelError) {
        console.error("Ошибка при сохранении Excel:", excelError.message);
      }
    }
    process.exit(1);
  }
}

// Запуск скрипта
if (require.main === module) {
  main().catch((error) => {
    console.error("Необработанная ошибка:", error);
    process.exit(1);
  });
}

module.exports = {
  fetchNFTItems,
  makeRequest,
  extractDomainData,
};
