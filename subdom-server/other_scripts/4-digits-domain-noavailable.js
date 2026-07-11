/**
 * Скрипт для выгрузки 4-значных цифровых доменов из TON коллекции
 * Использует API toncenter.com с ограничением 25 запросов в секунду
 */

// const fs = require("fs");
// const https = require("https");
// const { URL } = require("url");

// // Конфигурация
// const CONFIG = {
//   // Вставьте ваш API ключ здесь
//   API_KEY: "129c5dfcac700a20e4905ee453be6e2406f941e12c128a738497d5dfc80bdf5d",

//   // Адрес коллекции
//   COLLECTION_ADDRESS: "EQC3dNlesgVD8YbAazcauIrXBPfiVhMMr5YYk2in0Mtsz0Bz",

//   // Лимит на запрос (максимум 100)
//   LIMIT_PER_REQUEST: 100,

//   // Задержка между запросами (в миллисекундах)
//   // 1000ms / 25 запросов в секунду = 40ms между запросами
//   // Добавляем запас для безопасности
//   REQUEST_DELAY_MS: 50,

//   // Файл для сохранения результатов
//   OUTPUT_FILE: "4digit_domains.csv",

//   // Файл для сохранения прогресса (чтобы можно было продолжить)
//   PROGRESS_FILE: "scraper_progress.json",
//   // Флаг для принудительного сброса прогресса
//   FORCE_RESET: true, // Установите true, чтобы начать с нуля
// };

// // Регулятор запросов для соблюдения лимита 25 запросов в секунду
// class RateLimiter {
//   constructor(maxRequestsPerSecond) {
//     this.maxRequestsPerSecond = maxRequestsPerSecond;
//     this.minInterval = 1000 / maxRequestsPerSecond;
//     this.lastRequestTime = 0;
//     this.queue = [];
//     this.isProcessing = false;
//   }

//   async request(fn) {
//     return new Promise((resolve, reject) => {
//       this.queue.push({ fn, resolve, reject });
//       if (!this.isProcessing) {
//         this.processQueue();
//       }
//     });
//   }

//   async processQueue() {
//     if (this.queue.length === 0) {
//       this.isProcessing = false;
//       return;
//     }

//     this.isProcessing = true;
//     const now = Date.now();
//     const timeSinceLastRequest = now - this.lastRequestTime;

//     if (timeSinceLastRequest < this.minInterval) {
//       await new Promise((resolve) =>
//         setTimeout(resolve, this.minInterval - timeSinceLastRequest)
//       );
//     }

//     const { fn, resolve, reject } = this.queue.shift();
//     this.lastRequestTime = Date.now();

//     try {
//       const result = await fn();
//       resolve(result);
//     } catch (error) {
//       reject(error);
//     }

//     // Рекурсивно обрабатываем следующий запрос
//     setTimeout(() => this.processQueue(), 0);
//   }
// }

// // Создаем регулятор запросов (25 запросов в секунду)
// const rateLimiter = new RateLimiter(25);

// // Функция для выполнения HTTP запроса
// function makeRequest(url, options = {}) {
//   return new Promise((resolve, reject) => {
//     const req = https.get(url, options, (res) => {
//       let data = "";

//       res.on("data", (chunk) => {
//         data += chunk;
//       });

//       res.on("end", () => {
//         if (res.statusCode >= 200 && res.statusCode < 300) {
//           try {
//             const parsed = JSON.parse(data);
//             resolve(parsed);
//           } catch (error) {
//             reject(new Error(`Failed to parse JSON: ${error.message}`));
//           }
//         } else {
//           reject(new Error(`HTTP ${res.statusCode}: ${data}`));
//         }
//       });
//     });

//     req.on("error", (error) => {
//       reject(error);
//     });

//     req.setTimeout(30000, () => {
//       req.destroy();
//       reject(new Error("Request timeout"));
//     });
//   });
// }

// // Функция для получения NFT items с пагинацией
// async function fetchNFTItems(offset) {
//   const url = new URL("https://toncenter.com/api/v3/nft/items");

//   // Параметры запроса
//   url.searchParams.append("collection_address", CONFIG.COLLECTION_ADDRESS);
//   url.searchParams.append("include_on_sale", "false");
//   url.searchParams.append("limit", CONFIG.LIMIT_PER_REQUEST.toString());
//   url.searchParams.append("offset", offset.toString());

//   const options = {
//     headers: {
//       Accept: "application/json",
//       "X-API-Key": CONFIG.API_KEY,
//     },
//   };

//   return rateLimiter.request(() => makeRequest(url.toString(), options));
// }

// // Функция для проверки, является ли домен 4-значным цифровым
// function is4DigitNumericDomain(domain) {
//   if (!domain || typeof domain !== "string") {
//     return false;
//   }

//   // Убираем .ton в конце
//   const cleanDomain = domain.replace(/\.ton$/i, "");

//   // Проверяем, что строка состоит ровно из 4 цифр
//   return /^\d{4}$/.test(cleanDomain);
// }

// // Функция для сохранения прогресса
// function saveProgress(offset, totalProcessed, foundDomains) {
//   const progress = {
//     lastOffset: offset,
//     totalProcessed: totalProcessed,
//     foundDomainsCount: foundDomains.length,
//     timestamp: new Date().toISOString(),
//   };

//   fs.writeFileSync(CONFIG.PROGRESS_FILE, JSON.stringify(progress, null, 2));
//   console.log(
//     `Прогресс сохранен: offset=${offset}, обработано=${totalProcessed}, найдено доменов=${foundDomains.length}`
//   );
// }

// // Функция для загрузки прогресса
// function loadProgress() {
//   try {
//     if (fs.existsSync(CONFIG.PROGRESS_FILE)) {
//       const data = fs.readFileSync(CONFIG.PROGRESS_FILE, "utf8");
//       return JSON.parse(data);
//     }
//   } catch (error) {
//     console.warn("Не удалось загрузить прогресс:", error.message);
//   }
//   return null;
// }

// // Функция для сохранения доменов в CSV
// function saveDomainsToCSV(domains) {
//   // Создаем CSV заголовок
//   let csvContent = "domain,clean_domain\n";

//   // Добавляем данные
//   domains.forEach((domain) => {
//     const cleanDomain = domain.replace(/\.ton$/i, "");
//     csvContent += `"${domain}","${cleanDomain}"\n`;
//   });

//   fs.writeFileSync(CONFIG.OUTPUT_FILE, csvContent);
//   console.log(`Сохранено ${domains.length} доменов в ${CONFIG.OUTPUT_FILE}`);
// }

// // Основная функция
// async function main() {
//   console.log("=== Начало выгрузки 4-значных цифровых доменов ===");
//   console.log(`Коллекция: ${CONFIG.COLLECTION_ADDRESS}`);
//   console.log(`Лимит на запрос: ${CONFIG.LIMIT_PER_REQUEST}`);
//   console.log(`Задержка между запросами: ${CONFIG.REQUEST_DELAY_MS}ms`);
//   console.log("");

//   // Проверяем API ключ
//   if (CONFIG.API_KEY === "ВАШ_API_КЛЮЧ_ЗДЕСЬ") {
//     console.error(
//       'ОШИБКА: Замените "ВАШ_API_КЛЮЧ_ЗДЕСЬ" на ваш реальный API ключ toncenter.com'
//     );
//     process.exit(1);
//   }

//   let offset = startOffset;
//   let hasMoreItems = true;
//   let requestCount = 0;
//   let errorCount = 0;
//   const maxErrors = 10;

//   if (CONFIG.FORCE_RESET) {
//     console.log("Принудительный сброс прогресса...");

//     // if (fs.existsSync(CONFIG.PROGRESS_FILE)) {
//     //   fs.unlinkSync(CONFIG.PROGRESS_FILE);
//     //   console.log(`Удален файл прогресса: ${CONFIG.PROGRESS_FILE}`);
//     // }

//     if (fs.existsSync(CONFIG.OUTPUT_FILE)) {
//       fs.unlinkSync(CONFIG.OUTPUT_FILE);
//       console.log(`Удален файл результатов: ${CONFIG.OUTPUT_FILE}`);
//     }

//     // Устанавливаем флаг, что нужно начать с нуля
//     startOffset = 0;
//     totalProcessed = 0;
//     foundDomains = [];
//     console.log("Начинаем с нуля");
//   }

//   // Загружаем прогресс, если есть
//   const progress = loadProgress();
//   let startOffset = progress
//     ? progress.lastOffset + CONFIG.LIMIT_PER_REQUEST
//     : 0;
//   let totalProcessed = progress ? progress.totalProcessed : 0;
//   let foundDomains = [];

//   if (progress) {
//     console.log(`Продолжаем с offset=${startOffset}`);
//     console.log(`Ранее обработано: ${totalProcessed} доменов`);
//     console.log(
//       `Ранее найдено: ${progress.foundDomainsCount} 4-значных доменов`
//     );
//     console.log("");

//     // Загружаем ранее найденные домены из CSV, если файл существует
//     if (fs.existsSync(CONFIG.OUTPUT_FILE)) {
//       try {
//         const csvContent = fs.readFileSync(CONFIG.OUTPUT_FILE, "utf8");
//         const lines = csvContent.split("\n").slice(1); // Пропускаем заголовок
//         lines.forEach((line) => {
//           if (line.trim()) {
//             const match = line.match(/^"([^"]+)"/);
//             if (match) {
//               foundDomains.push(match[1]);
//             }
//           }
//         });
//         console.log(
//           `Загружено ${foundDomains.length} доменов из предыдущего CSV файла`
//         );
//       } catch (error) {
//         console.warn("Не удалось загрузить предыдущие домены:", error.message);
//       }
//     }
//   }

//   console.log("Начинаем выгрузку...");
//   console.log("---");

//   try {
//     while (hasMoreItems && errorCount < maxErrors) {
//       try {
//         requestCount++;
//         console.log(
//           `Запрос #${requestCount}: offset=${offset}, limit=${CONFIG.LIMIT_PER_REQUEST}`
//         );

//         const response = await fetchNFTItems(offset);

//         if (
//           !response ||
//           !response.nft_items ||
//           response.nft_items.length === 0
//         ) {
//           console.log("Больше нет элементов для обработки");
//           hasMoreItems = false;
//           break;
//         }

//         const items = response.nft_items;
//         console.log(`Получено ${items.length} элементов`);

//         // Фильтруем и собираем 4-значные цифровые домены
//         const batchDomains = [];
//         items.forEach((item) => {
//           if (item.content && item.content.domain) {
//             const domain = item.content.domain;
//             if (is4DigitNumericDomain(domain)) {
//               batchDomains.push(domain);
//             }
//           }
//         });

//         if (batchDomains.length > 0) {
//           console.log(
//             `Найдено 4-значных доменов в этой партии: ${batchDomains.length}`
//           );
//           foundDomains.push(...batchDomains);

//           // Сохраняем промежуточные результаты каждые 1000 найденных доменов
//           if (foundDomains.length % 1000 === 0) {
//             saveDomainsToCSV(foundDomains);
//           }
//         }

//         totalProcessed += items.length;

//         // Сохраняем прогресс каждые 10000 обработанных элементов
//         if (totalProcessed % 10000 === 0) {
//           saveProgress(offset, totalProcessed, foundDomains);
//         }

//         // Если получили меньше элементов, чем запросили, значит это последняя страница
//         if (items.length < CONFIG.LIMIT_PER_REQUEST) {
//           console.log(
//             "Получено меньше элементов, чем запрошено - это последняя страница"
//           );
//           hasMoreItems = false;
//         } else {
//           offset += CONFIG.LIMIT_PER_REQUEST;

//           // Добавляем небольшую задержку между запросами
//           if (CONFIG.REQUEST_DELAY_MS > 0) {
//             await new Promise((resolve) =>
//               setTimeout(resolve, CONFIG.REQUEST_DELAY_MS)
//             );
//           }
//         }

//         // Периодически выводим статистику
//         if (requestCount % 10 === 0) {
//           console.log(`--- Статистика ---`);
//           console.log(`Всего запросов: ${requestCount}`);
//           console.log(`Всего обработано: ${totalProcessed} элементов`);
//           console.log(`Найдено 4-значных доменов: ${foundDomains.length}`);
//           console.log(`Текущий offset: ${offset}`);
//           console.log(`---`);
//         }

//         errorCount = 0; // Сбрасываем счетчик ошибок при успешном запросе
//       } catch (error) {
//         errorCount++;
//         console.error(`Ошибка при запросе offset=${offset}:`, error.message);

//         if (errorCount >= maxErrors) {
//           console.error(
//             `Достигнуто максимальное количество ошибок (${maxErrors}). Прерываю выполнение.`
//           );
//           break;
//         }

//         // Ждем перед повторной попыткой
//         console.log(
//           `Повторная попытка через 5 секунд... (ошибка ${errorCount}/${maxErrors})`
//         );
//         await new Promise((resolve) => setTimeout(resolve, 5000));
//       }
//     }

//     // Финальное сохранение
//     console.log("--- Завершение работы ---");
//     console.log(`Итоговая статистика:`);
//     console.log(`Всего запросов: ${requestCount}`);
//     console.log(`Всего обработано элементов: ${totalProcessed}`);
//     console.log(`Найдено 4-значных цифровых доменов: ${foundDomains.length}`);

//     // Сохраняем финальные результаты
//     saveDomainsToCSV(foundDomains);
//     saveProgress(offset, totalProcessed, foundDomains);

//     // Выводим примеры найденных доменов
//     if (foundDomains.length > 0) {
//       console.log("\nПримеры найденных доменов:");
//       const examples = foundDomains.slice(0, Math.min(10, foundDomains.length));
//       examples.forEach((domain) => {
//         console.log(`  ${domain}`);
//       });

//       if (foundDomains.length > 10) {
//         console.log(`  ... и еще ${foundDomains.length - 10} доменов`);
//       }
//     }

//     console.log("\nГотово! Результаты сохранены в:");
//     console.log(`  - ${CONFIG.OUTPUT_FILE} (CSV с доменами)`);
//     console.log(`  - ${CONFIG.PROGRESS_FILE} (прогресс выполнения)`);
//   } catch (error) {
//     console.error("Критическая ошибка:", error);
//     // Сохраняем прогресс даже при ошибке
//     saveProgress(offset, totalProcessed, foundDomains);
//     if (foundDomains.length > 0) {
//       saveDomainsToCSV(foundDomains);
//     }
//     process.exit(1);
//   }
// }

// // Запуск скрипта
// if (require.main === module) {
//   main().catch((error) => {
//     console.error("Необработанная ошибка:", error);
//     process.exit(1);
//   });
// }

// module.exports = {
//   is4DigitNumericDomain,
//   fetchNFTItems,
//   makeRequest,
// };

//new version with restart

/**
 * Скрипт для выгрузки 4-значных цифровых доменов из TON коллекции
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

  // Файл для сохранения результатов
  OUTPUT_FILE: "4digit_domains.csv",

  // Файл для сохранения прогресса (чтобы можно было продолжить)
  PROGRESS_FILE: "scraper_progress.json",
  // Флаг для принудительного сброса прогресса
  FORCE_RESET: true, // Установите true, чтобы начать с нуля
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

// Функция для проверки, является ли домен 4-значным цифровым
function is4DigitNumericDomain(domain) {
  if (!domain || typeof domain !== "string") {
    return false;
  }

  // Убираем .ton в конце
  const cleanDomain = domain.replace(/\.ton$/i, "");

  // Проверяем, что строка состоит ровно из 4 цифр
  return /^\d{4}$/.test(cleanDomain);
}

// Функция для сохранения прогресса
function saveProgress(offset, totalProcessed, foundDomains) {
  const progress = {
    lastOffset: offset,
    totalProcessed: totalProcessed,
    foundDomainsCount: foundDomains.length,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(CONFIG.PROGRESS_FILE, JSON.stringify(progress, null, 2));
  console.log(
    `Прогресс сохранен: offset=${offset}, обработано=${totalProcessed}, найдено доменов=${foundDomains.length}`
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

// Функция для сохранения доменов в CSV
function saveDomainsToCSV(domains) {
  // Создаем CSV заголовок
  let csvContent = "domain,clean_domain\n";

  // Добавляем данные
  domains.forEach((domain) => {
    const cleanDomain = domain.replace(/\.ton$/i, "");
    csvContent += `"${domain}","${cleanDomain}"\n`;
  });

  fs.writeFileSync(CONFIG.OUTPUT_FILE, csvContent);
  console.log(`Сохранено ${domains.length} доменов в ${CONFIG.OUTPUT_FILE}`);
}

// Основная функция
async function main() {
  console.log("=== Начало выгрузки 4-значных цифровых доменов ===");
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

  // Обрабатываем принудительный сброс прогресса
  if (CONFIG.FORCE_RESET) {
    console.log("Принудительный сброс прогресса...");

    if (fs.existsSync(CONFIG.PROGRESS_FILE)) {
      fs.unlinkSync(CONFIG.PROGRESS_FILE);
      console.log(`Удален файл прогресса: ${CONFIG.PROGRESS_FILE}`);
    }

    if (fs.existsSync(CONFIG.OUTPUT_FILE)) {
      fs.unlinkSync(CONFIG.OUTPUT_FILE);
      console.log(`Удален файл результатов: ${CONFIG.OUTPUT_FILE}`);
    }

    console.log("Начинаем с нуля");
  }

  // Загружаем прогресс, если есть
  const progress = loadProgress();
  let startOffset = progress
    ? progress.lastOffset + CONFIG.LIMIT_PER_REQUEST
    : 0;
  let totalProcessed = progress ? progress.totalProcessed : 0;
  let foundDomains = [];

  if (progress) {
    console.log(`Продолжаем с offset=${startOffset}`);
    console.log(`Ранее обработано: ${totalProcessed} доменов`);
    console.log(
      `Ранее найдено: ${progress.foundDomainsCount} 4-значных доменов`
    );
    console.log("");

    // Загружаем ранее найденные домены из CSV, если файл существует
    if (fs.existsSync(CONFIG.OUTPUT_FILE)) {
      try {
        const csvContent = fs.readFileSync(CONFIG.OUTPUT_FILE, "utf8");
        const lines = csvContent.split("\n").slice(1); // Пропускаем заголовок
        lines.forEach((line) => {
          if (line.trim()) {
            const match = line.match(/^"([^"]+)"/);
            if (match) {
              foundDomains.push(match[1]);
            }
          }
        });
        console.log(
          `Загружено ${foundDomains.length} доменов из предыдущего CSV файла`
        );
      } catch (error) {
        console.warn("Не удалось загрузить предыдущие домены:", error.message);
      }
    }
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

        // Фильтруем и собираем 4-значные цифровые домены
        const batchDomains = [];
        items.forEach((item) => {
          if (item.content && item.content.domain) {
            const domain = item.content.domain;
            if (is4DigitNumericDomain(domain)) {
              batchDomains.push(domain);
            }
          }
        });

        if (batchDomains.length > 0) {
          console.log(
            `Найдено 4-значных доменов в этой партии: ${batchDomains.length}`
          );
          foundDomains.push(...batchDomains);

          // Сохраняем промежуточные результаты каждые 1000 найденных доменов
          if (foundDomains.length % 1000 === 0) {
            saveDomainsToCSV(foundDomains);
          }
        }

        totalProcessed += items.length;

        // Сохраняем прогресс каждые 10000 обработанных элементов
        if (totalProcessed % 10000 === 0) {
          saveProgress(offset, totalProcessed, foundDomains);
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
          console.log(`Найдено 4-значных доменов: ${foundDomains.length}`);
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
    console.log(`Найдено 4-значных цифровых доменов: ${foundDomains.length}`);

    // Сохраняем финальные результаты
    saveDomainsToCSV(foundDomains);
    saveProgress(offset, totalProcessed, foundDomains);

    // Выводим примеры найденных доменов
    if (foundDomains.length > 0) {
      console.log("\nПримеры найденных доменов:");
      const examples = foundDomains.slice(0, Math.min(10, foundDomains.length));
      examples.forEach((domain) => {
        console.log(`  ${domain}`);
      });

      if (foundDomains.length > 10) {
        console.log(`  ... и еще ${foundDomains.length - 10} доменов`);
      }
    }

    console.log("\nГотово! Результаты сохранены в:");
    console.log(`  - ${CONFIG.OUTPUT_FILE} (CSV с доменами)`);
    console.log(`  - ${CONFIG.PROGRESS_FILE} (прогресс выполнения)`);
  } catch (error) {
    console.error("Критическая ошибка:", error);
    // Сохраняем прогресс даже при ошибке
    saveProgress(offset, totalProcessed, foundDomains);
    if (foundDomains.length > 0) {
      saveDomainsToCSV(foundDomains);
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
  is4DigitNumericDomain,
  fetchNFTItems,
  makeRequest,
};
