/**
 * Скрипт для выгрузки 5-значных и 6-значных цифровых доменов из TON коллекции
 * Использует API toncenter.com с ограничением 25 запросов в секунду
 */

const fs = require("fs");
const https = require("https");
const { URL } = require("url");

// Конфигурация
const CONFIG = {
  // Вставьте ваш API ключ здесь
  API_KEY: "129c5dfcac700a20e4905ee453be6e2406f941e12c128a738497d5dfc80bdf5d",

  // Адрес коллекции
  COLLECTION_ADDRESS: "EQC3dNlesgVD8YbAazcauIrXBPfiVhMMr5YYk2in0Mtsz0Bz",

  // Лимит на запрос (максимум 100)
  LIMIT_PER_REQUEST: 100,

  // Задержка между запросами (в миллисекундах)
  // 1000ms / 25 запросов в секунду = 40ms между запросами
  // Добавляем запас для безопасности
  REQUEST_DELAY_MS: 50,

  // Файлы для сохранения результатов
  OUTPUT_FILE_5DIGIT: "5digit_domains.csv",
  OUTPUT_FILE_6DIGIT: "6digit_domains.csv",

  // Файл для сохранения прогресса (чтобы можно было продолжить)
  PROGRESS_FILE: "scraper_progress_multi.json",
};

// Регулятор запросов для соблюдения лимита 25 запросов в секунду
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

// Создаем регулятор запросов (25 запросов в секунду)
const rateLimiter = new RateLimiter(25);

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
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
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
async function fetchNFTItems(offset) {
  const url = new URL("https://toncenter.com/api/v3/nft/items");

  // Параметры запроса
  url.searchParams.append("collection_address", CONFIG.COLLECTION_ADDRESS);
  url.searchParams.append("include_on_sale", "false");
  url.searchParams.append("limit", CONFIG.LIMIT_PER_REQUEST.toString());
  url.searchParams.append("offset", offset.toString());

  const options = {
    headers: {
      Accept: "application/json",
      "X-API-Key": CONFIG.API_KEY,
    },
  };

  return rateLimiter.request(() => makeRequest(url.toString(), options));
}

// Функция для проверки, является ли домен N-значным цифровым
function isNDigitNumericDomain(domain, length) {
  if (!domain || typeof domain !== "string") {
    return false;
  }

  // Убираем .ton в конце
  const cleanDomain = domain.replace(/\.ton$/i, "");

  // Проверяем, что строка состоит ровно из N цифр
  const regex = new RegExp(`^\\d{${length}}$`);
  return regex.test(cleanDomain);
}

// Функция для сортировки доменов по возрастанию числового значения
function sortDomainsNumerically(domains) {
  return domains.sort((a, b) => {
    // Извлекаем числовую часть (убираем .ton)
    const numA = parseInt(a.replace(/\.ton$/i, ""), 10);
    const numB = parseInt(b.replace(/\.ton$/i, ""), 10);
    return numA - numB;
  });
}

// Функция для сохранения прогресса
function saveProgress(
  offset,
  totalProcessed,
  found5DigitDomains,
  found6DigitDomains
) {
  const progress = {
    lastOffset: offset,
    totalProcessed: totalProcessed,
    found5DigitDomainsCount: found5DigitDomains.length,
    found6DigitDomainsCount: found6DigitDomains.length,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(CONFIG.PROGRESS_FILE, JSON.stringify(progress, null, 2));
  console.log(
    `Прогресс сохранен: offset=${offset}, обработано=${totalProcessed}, ` +
      `5-значных=${found5DigitDomains.length}, 6-значных=${found6DigitDomains.length}`
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

// Функция для сохранения доменов в CSV с сортировкой
function saveDomainsToCSV(domains, filename) {
  if (domains.length === 0) {
    console.log(`Нет доменов для сохранения в ${filename}`);
    return;
  }

  // Сортируем домены по возрастанию
  const sortedDomains = sortDomainsNumerically([...domains]);

  // Создаем CSV заголовок
  let csvContent = "domain,clean_domain,numeric_value\n";

  // Добавляем данные
  sortedDomains.forEach((domain) => {
    const cleanDomain = domain.replace(/\.ton$/i, "");
    const numericValue = parseInt(cleanDomain, 10);
    csvContent += `"${domain}","${cleanDomain}",${numericValue}\n`;
  });

  fs.writeFileSync(filename, csvContent);
  console.log(`Сохранено ${sortedDomains.length} доменов в ${filename}`);

  // Выводим примеры
  console.log(`Примеры из ${filename}:`);
  const examples = sortedDomains.slice(0, Math.min(5, sortedDomains.length));
  examples.forEach((domain) => {
    console.log(`  ${domain}`);
  });
  if (sortedDomains.length > 5) {
    console.log(`  ... и еще ${sortedDomains.length - 5} доменов`);
  }
}

// Функция для загрузки ранее найденных доменов из CSV
function loadDomainsFromCSV(filename) {
  const domains = [];
  try {
    if (fs.existsSync(filename)) {
      const csvContent = fs.readFileSync(filename, "utf8");
      const lines = csvContent.split("\n").slice(1); // Пропускаем заголовок
      lines.forEach((line) => {
        if (line.trim()) {
          const match = line.match(/^"([^"]+)"/);
          if (match) {
            domains.push(match[1]);
          }
        }
      });
      console.log(`Загружено ${domains.length} доменов из ${filename}`);
    }
  } catch (error) {
    console.warn(`Не удалось загрузить домены из ${filename}:`, error.message);
  }
  return domains;
}

// Основная функция
async function main() {
  console.log("=== Начало выгрузки 5-значных и 6-значных цифровых доменов ===");
  console.log(`Коллекция: ${CONFIG.COLLECTION_ADDRESS}`);
  console.log(`Лимит на запрос: ${CONFIG.LIMIT_PER_REQUEST}`);
  console.log(`Задержка между запросами: ${CONFIG.REQUEST_DELAY_MS}ms`);
  console.log("");

  // Проверяем API ключ
  if (CONFIG.API_KEY === "ВАШ_API_КЛЮЧ_ЗДЕСЬ") {
    console.error(
      'ОШИБКА: Замените "ВАШ_API_КЛЮЧ_ЗДЕСЬ" на ваш реальный API ключ toncenter.com'
    );
    process.exit(1);
  }

  // Загружаем прогресс, если есть
  const progress = loadProgress();
  let startOffset = progress
    ? progress.lastOffset + CONFIG.LIMIT_PER_REQUEST
    : 0;
  let totalProcessed = progress ? progress.totalProcessed : 0;

  // Загружаем ранее найденные домены из CSV файлов
  let found5DigitDomains = loadDomainsFromCSV(CONFIG.OUTPUT_FILE_5DIGIT);
  let found6DigitDomains = loadDomainsFromCSV(CONFIG.OUTPUT_FILE_6DIGIT);

  if (progress) {
    console.log(`Продолжаем с offset=${startOffset}`);
    console.log(`Ранее обработано: ${totalProcessed} доменов`);
    console.log(
      `Ранее найдено: ${progress.found5DigitDomainsCount} 5-значных, ${progress.found6DigitDomainsCount} 6-значных доменов`
    );
    console.log("");
  }

  let offset = startOffset;
  let hasMoreItems = true;
  let requestCount = 0;
  let errorCount = 0;
  const maxErrors = 10;

  console.log("Начинаем выгрузку...");
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

        // Фильтруем и собираем 5-значные и 6-значные цифровые домены
        const batch5DigitDomains = [];
        const batch6DigitDomains = [];

        items.forEach((item) => {
          if (item.content && item.content.domain) {
            const domain = item.content.domain;

            // Проверяем на 5-значные домены
            if (isNDigitNumericDomain(domain, 5)) {
              batch5DigitDomains.push(domain);
            }

            // Проверяем на 6-значные домены
            if (isNDigitNumericDomain(domain, 6)) {
              batch6DigitDomains.push(domain);
            }
          }
        });

        if (batch5DigitDomains.length > 0) {
          console.log(
            `Найдено 5-значных доменов в этой партии: ${batch5DigitDomains.length}`
          );
          found5DigitDomains.push(...batch5DigitDomains);
        }

        if (batch6DigitDomains.length > 0) {
          console.log(
            `Найдено 6-значных доменов в этой партии: ${batch6DigitDomains.length}`
          );
          found6DigitDomains.push(...batch6DigitDomains);
        }

        totalProcessed += items.length;

        // Сохраняем промежуточные результаты каждые 500 найденных доменов
        if (
          found5DigitDomains.length % 500 === 0 ||
          found6DigitDomains.length % 500 === 0
        ) {
          saveDomainsToCSV(found5DigitDomains, CONFIG.OUTPUT_FILE_5DIGIT);
          saveDomainsToCSV(found6DigitDomains, CONFIG.OUTPUT_FILE_6DIGIT);
        }

        // Сохраняем прогресс каждые 5000 обработанных элементов
        if (totalProcessed % 5000 === 0) {
          saveProgress(
            offset,
            totalProcessed,
            found5DigitDomains,
            found6DigitDomains
          );
        }

        // Если получили меньше элементов, чем запросили, значит это последняя страница
        if (items.length < CONFIG.LIMIT_PER_REQUEST) {
          console.log(
            "Получено меньше элементов, чем запрошено - это последняя страница"
          );
          hasMoreItems = false;
        } else {
          offset += CONFIG.LIMIT_PER_REQUEST;

          // Добавляем небольшую задержку между запросами
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
          console.log(
            `Найдено 5-значных доменов: ${found5DigitDomains.length}`
          );
          console.log(
            `Найдено 6-значных доменов: ${found6DigitDomains.length}`
          );
          console.log(`Текущий offset: ${offset}`);
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
    console.log("--- Завершение работы ---");
    console.log(`Итоговая статистика:`);
    console.log(`Всего запросов: ${requestCount}`);
    console.log(`Всего обработано элементов: ${totalProcessed}`);
    console.log(
      `Найдено 5-значных цифровых доменов: ${found5DigitDomains.length}`
    );
    console.log(
      `Найдено 6-значных цифровых доменов: ${found6DigitDomains.length}`
    );

    // Сохраняем финальные результаты с сортировкой
    saveDomainsToCSV(found5DigitDomains, CONFIG.OUTPUT_FILE_5DIGIT);
    saveDomainsToCSV(found6DigitDomains, CONFIG.OUTPUT_FILE_6DIGIT);
    saveProgress(
      offset,
      totalProcessed,
      found5DigitDomains,
      found6DigitDomains
    );

    // Выводим примеры найденных доменов
    if (found5DigitDomains.length > 0) {
      const sorted5Digit = sortDomainsNumerically([...found5DigitDomains]);
      console.log("\nПримеры 5-значных доменов (первые 10 по возрастанию):");
      const examples5 = sorted5Digit.slice(
        0,
        Math.min(10, sorted5Digit.length)
      );
      examples5.forEach((domain) => {
        console.log(`  ${domain}`);
      });
    }

    if (found6DigitDomains.length > 0) {
      const sorted6Digit = sortDomainsNumerically([...found6DigitDomains]);
      console.log("\nПримеры 6-значных доменов (первые 10 по возрастанию):");
      const examples6 = sorted6Digit.slice(
        0,
        Math.min(10, sorted6Digit.length)
      );
      examples6.forEach((domain) => {
        console.log(`  ${domain}`);
      });
    }

    console.log("\nГотово! Результаты сохранены в:");
    console.log(`  - ${CONFIG.OUTPUT_FILE_5DIGIT} (CSV с 5-значными доменами)`);
    console.log(`  - ${CONFIG.OUTPUT_FILE_6DIGIT} (CSV с 6-значными доменами)`);
    console.log(`  - ${CONFIG.PROGRESS_FILE} (прогресс выполнения)`);
  } catch (error) {
    console.error("Критическая ошибка:", error);
    // Сохраняем прогресс даже при ошибке
    saveProgress(
      offset,
      totalProcessed,
      found5DigitDomains,
      found6DigitDomains
    );
    if (found5DigitDomains.length > 0) {
      saveDomainsToCSV(found5DigitDomains, CONFIG.OUTPUT_FILE_5DIGIT);
    }
    if (found6DigitDomains.length > 0) {
      saveDomainsToCSV(found6DigitDomains, CONFIG.OUTPUT_FILE_6DIGIT);
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
  isNDigitNumericDomain,
  sortDomainsNumerically,
  fetchNFTItems,
  makeRequest,
};
