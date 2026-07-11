/**
 * Скрипт для обработки CSV файла с доменами и создания Excel файлов
 * 1. Конвертирует CSV в Excel
 * 2. Находит свободные 4-значные цифровые домены (0001-9999)
 */

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

// Конфигурация
const CONFIG = {
  // Входной CSV файл (результат работы предыдущего скрипта)
  INPUT_CSV: "4digit_domains.csv",

  // Выходные Excel файлы
  OUTPUT_EXCEL_ALL: "all_4digit_domains.xlsx",
  OUTPUT_EXCEL_AVAILABLE: "available_4digit_domains.xlsx",

  // Диапазон для проверки (от 0001 до 9999)
  MIN_DOMAIN: 1,
  MAX_DOMAIN: 9999,

  // Форматирование чисел (добавляем ведущие нули)
  PADDING_LENGTH: 4,
};

// Функция для чтения CSV файла
function readCSVFile(filePath) {
  try {
    console.log(`Чтение CSV файла: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Файл не найден: ${filePath}`);
    }

    const fileContent = fs.readFileSync(filePath, "utf8");
    const lines = fileContent.split("\n").filter((line) => line.trim() !== "");

    if (lines.length === 0) {
      throw new Error("CSV файл пуст");
    }

    // Парсим заголовок
    const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());

    // Парсим данные
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = parseCSVLine(line);

      if (values.length === headers.length) {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        data.push(row);
      }
    }

    console.log(`Прочитано ${data.length} записей из CSV`);
    return data;
  } catch (error) {
    console.error(`Ошибка при чтении CSV файла: ${error.message}`);
    throw error;
  }
}

// Функция для парсинга CSV строки с учетом кавычек
function parseCSVLine(line) {
  const values = [];
  let currentValue = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      // Проверяем, не экранированная ли это кавычка
      if (i + 1 < line.length && line[i + 1] === '"') {
        currentValue += '"';
        i++; // Пропускаем следующую кавычку
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(currentValue.trim());
      currentValue = "";
    } else {
      currentValue += char;
    }
  }

  // Добавляем последнее значение
  values.push(currentValue.trim());

  return values;
}

// Функция для форматирования числа с ведущими нулями
function padNumber(num, length) {
  return num.toString().padStart(length, "0");
}

// Функция для создания Excel файла
function createExcelFile(data, fileName, sheetName = "Domains") {
  try {
    console.log(`Создание Excel файла: ${fileName}`);

    // Создаем новую рабочую книгу
    const wb = XLSX.utils.book_new();

    // Преобразуем данные в формат для Excel
    const wsData = [];

    // Добавляем заголовки, если есть данные
    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      wsData.push(headers);

      // Добавляем данные
      data.forEach((row) => {
        const rowData = headers.map((header) => row[header]);
        wsData.push(rowData);
      });
    }

    // Создаем рабочий лист
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Добавляем рабочий лист в книгу
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Сохраняем файл
    XLSX.writeFile(wb, fileName);

    console.log(`Excel файл успешно создан: ${fileName}`);
    console.log(`Сохранено ${data.length} записей`);
  } catch (error) {
    console.error(`Ошибка при создании Excel файла: ${error.message}`);
    throw error;
  }
}

// Функция для получения списка занятых доменов
function getOccupiedDomains(csvData) {
  const occupied = new Set();

  csvData.forEach((row) => {
    if (row.clean_domain) {
      // Проверяем, что clean_domain состоит из 4 цифр
      if (/^\d{4}$/.test(row.clean_domain)) {
        occupied.add(row.clean_domain);
      }
    }
  });

  console.log(`Найдено занятых доменов: ${occupied.size}`);
  return occupied;
}

// Функция для генерации списка всех возможных доменов
function generateAllPossibleDomains() {
  const domains = [];

  for (let i = CONFIG.MIN_DOMAIN; i <= CONFIG.MAX_DOMAIN; i++) {
    const domain = padNumber(i, CONFIG.PADDING_LENGTH);
    domains.push({
      number: i,
      domain: `${domain}.ton`,
      clean_domain: domain,
      formatted: domain,
    });
  }

  console.log(
    `Сгенерировано всех возможных доменов: ${domains.length} (от ${padNumber(
      CONFIG.MIN_DOMAIN,
      CONFIG.PADDING_LENGTH
    )} до ${padNumber(CONFIG.MAX_DOMAIN, CONFIG.PADDING_LENGTH)})`
  );
  return domains;
}

// Функция для поиска свободных доменов
function findAvailableDomains(allDomains, occupiedDomains) {
  const available = [];

  allDomains.forEach((domain) => {
    if (!occupiedDomains.has(domain.clean_domain)) {
      available.push({
        number: domain.number,
        domain: domain.domain,
        clean_domain: domain.clean_domain,
        status: "Свободен",
        formatted: domain.formatted,
      });
    }
  });

  console.log(`Найдено свободных доменов: ${available.length}`);
  return available;
}

// Функция для создания расширенного Excel с занятыми и свободными доменами
function createEnhancedExcel(
  allDomains,
  occupiedDomains,
  availableDomains,
  fileName
) {
  try {
    console.log(`Создание расширенного Excel файла: ${fileName}`);

    const wb = XLSX.utils.book_new();

    // Лист 1: Все домены с статусом
    const allDomainsData = [];
    allDomainsData.push([
      "Номер",
      "Домен",
      "Чистый домен",
      "Статус",
      "Форматированный",
    ]);

    allDomains.forEach((domain) => {
      const status = occupiedDomains.has(domain.clean_domain)
        ? "Занят"
        : "Свободен";
      allDomainsData.push([
        domain.number,
        domain.domain,
        domain.clean_domain,
        status,
        domain.formatted,
      ]);
    });

    const wsAll = XLSX.utils.aoa_to_sheet(allDomainsData);
    XLSX.utils.book_append_sheet(wb, wsAll, "Все домены");

    // Лист 2: Только занятые домены
    const occupiedData = [];
    occupiedData.push([
      "Номер",
      "Домен",
      "Чистый домен",
      "Статус",
      "Форматированный",
    ]);

    allDomains.forEach((domain) => {
      if (occupiedDomains.has(domain.clean_domain)) {
        occupiedData.push([
          domain.number,
          domain.domain,
          domain.clean_domain,
          "Занят",
          domain.formatted,
        ]);
      }
    });

    const wsOccupied = XLSX.utils.aoa_to_sheet(occupiedData);
    XLSX.utils.book_append_sheet(wb, wsOccupied, "Занятые домены");

    // Лист 3: Только свободные домены
    const availableData = [];
    availableData.push([
      "Номер",
      "Домен",
      "Чистый домен",
      "Статус",
      "Форматированный",
    ]);

    availableDomains.forEach((domain) => {
      availableData.push([
        domain.number,
        domain.domain,
        domain.clean_domain,
        "Свободен",
        domain.formatted,
      ]);
    });

    const wsAvailable = XLSX.utils.aoa_to_sheet(availableData);
    XLSX.utils.book_append_sheet(wb, wsAvailable, "Свободные домены");

    // Лист 4: Статистика
    const statsData = [
      ["Статистика доменов", ""],
      ["", ""],
      ["Всего возможных доменов:", allDomains.length],
      ["Занятых доменов:", occupiedDomains.size],
      ["Свободных доменов:", availableDomains.length],
      [
        "Процент занятости:",
        `${((occupiedDomains.size / allDomains.length) * 100).toFixed(2)}%`,
      ],
      [
        "Процент свободных:",
        `${((availableDomains.length / allDomains.length) * 100).toFixed(2)}%`,
      ],
      ["", ""],
      [
        "Диапазон:",
        `${padNumber(CONFIG.MIN_DOMAIN, CONFIG.PADDING_LENGTH)} - ${padNumber(
          CONFIG.MAX_DOMAIN,
          CONFIG.PADDING_LENGTH
        )}`,
      ],
      ["Дата анализа:", new Date().toLocaleString("ru-RU")],
    ];

    const wsStats = XLSX.utils.aoa_to_sheet(statsData);
    XLSX.utils.book_append_sheet(wb, wsStats, "Статистика");

    // Сохраняем файл
    XLSX.writeFile(wb, fileName);

    console.log(`Расширенный Excel файл успешно создан: ${fileName}`);
    console.log(`Файл содержит 4 листа:`);
    console.log(`  1. Все домены (${allDomains.length} записей)`);
    console.log(`  2. Занятые домены (${occupiedDomains.size} записей)`);
    console.log(`  3. Свободные домены (${availableDomains.length} записей)`);
    console.log(`  4. Статистика`);
  } catch (error) {
    console.error(
      `Ошибка при создании расширенного Excel файла: ${error.message}`
    );
    throw error;
  }
}

// Основная функция
async function main() {
  console.log("=== Обработка CSV файла и создание Excel файлов ===");
  console.log("");

  try {
    // 1. Читаем CSV файл
    const csvData = readCSVFile(CONFIG.INPUT_CSV);

    if (csvData.length === 0) {
      console.log("В CSV файле нет данных. Завершаю работу.");
      return;
    }

    // 2. Создаем Excel файл со всеми доменами из CSV
    console.log("\n--- Создание Excel файла со всеми доменами из CSV ---");
    createExcelFile(csvData, CONFIG.OUTPUT_EXCEL_ALL, "4-значные домены");

    // 3. Получаем список занятых доменов
    console.log("\n--- Анализ занятых доменов ---");
    const occupiedDomains = getOccupiedDomains(csvData);

    // 4. Генерируем список всех возможных доменов (0001-9999)
    console.log("\n--- Генерация всех возможных доменов ---");
    const allPossibleDomains = generateAllPossibleDomains();

    // 5. Находим свободные домены
    console.log("\n--- Поиск свободных доменов ---");
    const availableDomains = findAvailableDomains(
      allPossibleDomains,
      occupiedDomains
    );

    // 6. Создаем Excel файл только со свободными доменами
    console.log("\n--- Создание Excel файла со свободными доменами ---");
    createExcelFile(
      availableDomains,
      CONFIG.OUTPUT_EXCEL_AVAILABLE,
      "Свободные домены"
    );

    // 7. Создаем расширенный Excel файл со всей информацией
    console.log("\n--- Создание расширенного Excel файла ---");
    const enhancedFileName = "domains_analysis_complete.xlsx";
    createEnhancedExcel(
      allPossibleDomains,
      occupiedDomains,
      availableDomains,
      enhancedFileName
    );

    // 8. Выводим итоговую статистику
    console.log("\n=== ИТОГОВАЯ СТАТИСТИКА ===");
    console.log(
      `Всего возможных 4-значных доменов: ${allPossibleDomains.length}`
    );
    console.log(`Занято доменов: ${occupiedDomains.size}`);
    console.log(`Свободно доменов: ${availableDomains.length}`);
    console.log(
      `Процент занятости: ${(
        (occupiedDomains.size / allPossibleDomains.length) *
        100
      ).toFixed(2)}%`
    );
    console.log(
      `Процент свободных: ${(
        (availableDomains.length / allPossibleDomains.length) *
        100
      ).toFixed(2)}%`
    );

    console.log("\n=== СОЗДАННЫЕ ФАЙЛЫ ===");
    console.log(`1. ${CONFIG.OUTPUT_EXCEL_ALL} - все домены из CSV`);
    console.log(
      `2. ${CONFIG.OUTPUT_EXCEL_AVAILABLE} - только свободные домены`
    );
    console.log(
      `3. ${enhancedFileName} - полный анализ (все домены + статистика)`
    );

    console.log("\n=== ПРИМЕРЫ СВОБОДНЫХ ДОМЕНОВ ===");
    if (availableDomains.length > 0) {
      const examples = availableDomains.slice(
        0,
        Math.min(10, availableDomains.length)
      );
      examples.forEach((domain) => {
        console.log(`  ${domain.clean_domain}.ton`);
      });

      if (availableDomains.length > 10) {
        console.log(
          `  ... и еще ${availableDomains.length - 10} свободных доменов`
        );
      }
    } else {
      console.log("  Свободных доменов не найдено");
    }

    console.log("\nГотово! Все файлы успешно созданы.");
  } catch (error) {
    console.error("\nОШИБКА:", error.message);
    console.error("Детали:", error.stack);
    process.exit(1);
  }
}

// Запуск скрипта
if (require.main === module) {
  // Проверяем наличие библиотеки xlsx
  try {
    require.resolve("xlsx");
  } catch (error) {
    console.error("Библиотека xlsx не установлена!");
    console.error("Установите ее командой: npm install xlsx");
    process.exit(1);
  }

  main().catch((error) => {
    console.error("Необработанная ошибка:", error);
    process.exit(1);
  });
}

module.exports = {
  readCSVFile,
  parseCSVLine,
  padNumber,
  createExcelFile,
  getOccupiedDomains,
  generateAllPossibleDomains,
  findAvailableDomains,
  createEnhancedExcel,
};
