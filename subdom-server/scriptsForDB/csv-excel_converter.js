/**
 * Скрипт для конвертации CSV файлов с доменами в Excel формат
 * Сортирует по возрастанию и создает красивые Excel файлы
 */

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

// Конфигурация
const CONFIG = {
  // Входные CSV файлы
  INPUT_CSV_5DIGIT: "5digit_domains.csv",
  INPUT_CSV_6DIGIT: "6digit_domains.csv",

  // Выходные Excel файлы
  OUTPUT_EXCEL_5DIGIT: "5-digit-domains.xlsx",
  OUTPUT_EXCEL_6DIGIT: "6-digit-domains.xlsx",

  // Дополнительные настройки
  SORT_BY_NUMERIC: true, // Сортировать по числовому значению
  ADD_STATISTICS: true, // Добавить лист со статистикой
  ADD_FORMATTING: true, // Добавить форматирование ячеек
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
      console.warn(`CSV файл пуст: ${filePath}`);
      return [];
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

    console.log(`Прочитано ${data.length} записей из ${filePath}`);
    return data;
  } catch (error) {
    console.error(`Ошибка при чтении CSV файла ${filePath}:`, error.message);
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

// Функция для сортировки данных по числовому значению
function sortDataByNumericValue(data, numericColumn = "numeric_value") {
  if (!CONFIG.SORT_BY_NUMERIC || data.length === 0) {
    return data;
  }

  return data.sort((a, b) => {
    const numA = parseInt(a[numericColumn] || 0, 10);
    const numB = parseInt(b[numericColumn] || 0, 10);
    return numA - numB;
  });
}

// Функция для создания Excel файла с доменами
function createExcelFile(data, fileName, title) {
  try {
    console.log(`Создание Excel файла: ${fileName}`);

    // Создаем новую рабочую книгу
    const wb = XLSX.utils.book_new();

    // Лист 1: Домены
    const domainsSheetName = "Домены";
    const wsData = [];

    // Добавляем заголовки
    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      wsData.push(headers);

      // Добавляем данные
      data.forEach((row) => {
        const rowData = headers.map((header) => row[header]);
        wsData.push(rowData);
      });
    } else {
      wsData.push(["Нет данных"]);
      wsData.push(["В CSV файле не найдено доменов"]);
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Настраиваем ширину колонок
    if (CONFIG.ADD_FORMATTING && data.length > 0) {
      const colWidths = [
        { wch: 20 }, // domain
        { wch: 15 }, // clean_domain
        { wch: 12 }, // numeric_value
      ];
      ws["!cols"] = colWidths;
    }

    XLSX.utils.book_append_sheet(wb, ws, domainsSheetName);

    // Лист 2: Статистика (если есть данные)
    if (CONFIG.ADD_STATISTICS && data.length > 0) {
      const statsData = createStatisticsData(data, title);
      const wsStats = XLSX.utils.aoa_to_sheet(statsData);

      // Настраиваем ширину колонок для статистики
      if (CONFIG.ADD_FORMATTING) {
        wsStats["!cols"] = [{ wch: 30 }, { wch: 20 }];
      }

      XLSX.utils.book_append_sheet(wb, wsStats, "Статистика");
    }

    // Лист 3: Примеры (первые 100 доменов)
    if (data.length > 0) {
      const examplesData = createExamplesData(data);
      const wsExamples = XLSX.utils.aoa_to_sheet(examplesData);

      // Настраиваем ширину колонок для примеров
      if (CONFIG.ADD_FORMATTING) {
        wsExamples["!cols"] = [{ wch: 10 }, { wch: 20 }, { wch: 15 }];
      }

      XLSX.utils.book_append_sheet(wb, wsExamples, "Примеры");
    }

    // Сохраняем файл
    XLSX.writeFile(wb, fileName);

    console.log(`Excel файл успешно создан: ${fileName}`);
    console.log(`Сохранено ${data.length} записей`);

    return true;
  } catch (error) {
    console.error(
      `Ошибка при создании Excel файла ${fileName}:`,
      error.message
    );
    throw error;
  }
}

// Функция для создания данных статистики
function createStatisticsData(data, title) {
  const stats = [];

  // Заголовок
  stats.push([`Статистика: ${title}`]);
  stats.push([]);

  // Основная статистика
  stats.push(["Параметр", "Значение"]);
  stats.push(["Всего доменов", data.length]);

  if (data.length > 0) {
    // Находим минимальное и максимальное значение
    const numericValues = data.map((row) =>
      parseInt(row.numeric_value || 0, 10)
    );
    const minValue = Math.min(...numericValues);
    const maxValue = Math.max(...numericValues);

    stats.push(["Минимальное значение", minValue]);
    stats.push(["Максимальное значение", maxValue]);
    stats.push(["Диапазон", `${minValue} - ${maxValue}`]);

    // Форматируем минимальное и максимальное как домены
    const minDomain =
      data.find((row) => parseInt(row.numeric_value, 10) === minValue)
        ?.domain || "";
    const maxDomain =
      data.find((row) => parseInt(row.numeric_value, 10) === maxValue)
        ?.domain || "";

    stats.push(["Первый домен", minDomain]);
    stats.push(["Последний домен", maxDomain]);

    // Вычисляем среднее значение
    const sum = numericValues.reduce((a, b) => a + b, 0);
    const average = Math.round(sum / data.length);
    stats.push(["Среднее значение", average]);

    // Находим медиану
    const sortedValues = [...numericValues].sort((a, b) => a - b);
    const median = sortedValues[Math.floor(sortedValues.length / 2)];
    stats.push(["Медиана", median]);
  }

  stats.push([]);
  stats.push(["Дата создания", new Date().toLocaleString("ru-RU")]);
  stats.push([
    "Исходный файл",
    title.includes("5") ? "5digit_domains.csv" : "6digit_domains.csv",
  ]);

  return stats;
}

// Функция для создания данных с примерами
function createExamplesData(data) {
  const examples = [];

  // Заголовок
  examples.push(["Примеры доменов (первые 100)"]);
  examples.push([]);
  examples.push(["№", "Домен", "Числовое значение"]);

  // Берем первые 100 записей или все, если меньше
  const limit = Math.min(100, data.length);
  for (let i = 0; i < limit; i++) {
    const row = data[i];
    examples.push([
      i + 1,
      row.domain || "",
      parseInt(row.numeric_value || 0, 10),
    ]);
  }

  if (data.length > 100) {
    examples.push([]);
    examples.push([`... и еще ${data.length - 100} доменов`]);
  }

  return examples;
}

// Функция для создания сводного отчета
function createSummaryReport(data5digit, data6digit) {
  try {
    const fileName = "domains-summary-report.xlsx";
    console.log(`Создание сводного отчета: ${fileName}`);

    const wb = XLSX.utils.book_new();

    // Лист 1: Сводная статистика
    const summaryData = [];
    summaryData.push(["СВОДНЫЙ ОТЧЕТ ПО ЦИФРОВЫМ ДОМЕНАМ TON"]);
    summaryData.push(["Дата создания:", new Date().toLocaleString("ru-RU")]);
    summaryData.push([]);

    summaryData.push(["ТИП ДОМЕНОВ", "КОЛИЧЕСТВО", "ПРОЦЕНТ"]);
    summaryData.push([]);

    const total5digit = data5digit.length;
    const total6digit = data6digit.length;
    const totalAll = total5digit + total6digit;

    summaryData.push([
      "5-значные домены",
      total5digit,
      totalAll > 0 ? `${((total5digit / totalAll) * 100).toFixed(2)}%` : "0%",
    ]);
    summaryData.push([
      "6-значные домены",
      total6digit,
      totalAll > 0 ? `${((total6digit / totalAll) * 100).toFixed(2)}%` : "0%",
    ]);
    summaryData.push(["ВСЕГО", totalAll, "100%"]);

    summaryData.push([]);
    summaryData.push(["ДИАПАЗОНЫ ЗНАЧЕНИЙ"]);
    summaryData.push(["Тип", "Минимальное", "Максимальное"]);

    if (total5digit > 0) {
      const values5 = data5digit.map((row) =>
        parseInt(row.numeric_value || 0, 10)
      );
      summaryData.push([
        "5-значные",
        Math.min(...values5),
        Math.max(...values5),
      ]);
    }

    if (total6digit > 0) {
      const values6 = data6digit.map((row) =>
        parseInt(row.numeric_value || 0, 10)
      );
      summaryData.push([
        "6-значные",
        Math.min(...values6),
        Math.max(...values6),
      ]);
    }

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    if (CONFIG.ADD_FORMATTING) {
      wsSummary["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }];
    }
    XLSX.utils.book_append_sheet(wb, wsSummary, "Сводка");

    // Лист 2: Топ-50 5-значных доменов
    if (total5digit > 0) {
      const top5digitData = createTopDomainsData(
        data5digit,
        "5-значные домены (первые 50)"
      );
      const wsTop5 = XLSX.utils.aoa_to_sheet(top5digitData);
      if (CONFIG.ADD_FORMATTING) {
        wsTop5["!cols"] = [{ wch: 10 }, { wch: 20 }, { wch: 15 }];
      }
      XLSX.utils.book_append_sheet(wb, wsTop5, "Топ 5-значные");
    }

    // Лист 3: Топ-50 6-значных доменов
    if (total6digit > 0) {
      const top6digitData = createTopDomainsData(
        data6digit,
        "6-значные домены (первые 50)"
      );
      const wsTop6 = XLSX.utils.aoa_to_sheet(top6digitData);
      if (CONFIG.ADD_FORMATTING) {
        wsTop6["!cols"] = [{ wch: 10 }, { wch: 20 }, { wch: 15 }];
      }
      XLSX.utils.book_append_sheet(wb, wsTop6, "Топ 6-значные");
    }

    XLSX.writeFile(wb, fileName);
    console.log(`Сводный отчет создан: ${fileName}`);

    return fileName;
  } catch (error) {
    console.error("Ошибка при создании сводного отчета:", error.message);
    return null;
  }
}

// Функция для создания данных топ доменов
function createTopDomainsData(data, title) {
  const topData = [];

  topData.push([title]);
  topData.push([]);
  topData.push(["№", "Домен", "Числовое значение"]);

  const limit = Math.min(50, data.length);
  for (let i = 0; i < limit; i++) {
    const row = data[i];
    topData.push([
      i + 1,
      row.domain || "",
      parseInt(row.numeric_value || 0, 10),
    ]);
  }

  return topData;
}

// Основная функция
async function main() {
  console.log("=== Конвертация CSV файлов в Excel формат ===");
  console.log("");

  try {
    // 1. Читаем CSV файлы
    console.log("--- Чтение CSV файлов ---");
    let data5digit = readCSVFile(CONFIG.INPUT_CSV_5DIGIT);
    let data6digit = readCSVFile(CONFIG.INPUT_CSV_6DIGIT);

    // 2. Сортируем данные по числовому значению
    console.log("\n--- Сортировка данных ---");
    data5digit = sortDataByNumericValue(data5digit);
    data6digit = sortDataByNumericValue(data6digit);

    console.log(`5-значных доменов после сортировки: ${data5digit.length}`);
    console.log(`6-значных доменов после сортировки: ${data6digit.length}`);

    // 3. Создаем Excel файлы
    console.log("\n--- Создание Excel файлов ---");

    // 3.1. 5-значные домены
    if (data5digit.length > 0) {
      await createExcelFile(
        data5digit,
        CONFIG.OUTPUT_EXCEL_5DIGIT,
        "5-значные цифровые домены"
      );
    } else {
      console.log(`Нет данных для создания ${CONFIG.OUTPUT_EXCEL_5DIGIT}`);
    }

    // 3.2. 6-значные домены
    if (data6digit.length > 0) {
      await createExcelFile(
        data6digit,
        CONFIG.OUTPUT_EXCEL_6DIGIT,
        "6-значные цифровые домены"
      );
    } else {
      console.log(`Нет данных для создания ${CONFIG.OUTPUT_EXCEL_6DIGIT}`);
    }

    // 4. Создаем сводный отчет
    console.log("\n--- Создание сводного отчета ---");
    if (data5digit.length > 0 || data6digit.length > 0) {
      const summaryFile = createSummaryReport(data5digit, data6digit);
      if (summaryFile) {
        console.log(`Сводный отчет создан: ${summaryFile}`);
      }
    }

    // 5. Выводим итоговую статистику
    console.log("\n=== ИТОГОВАЯ СТАТИСТИКА ===");
    console.log(`5-значных доменов: ${data5digit.length}`);
    console.log(`6-значных доменов: ${data6digit.length}`);
    console.log(
      `Всего цифровых доменов: ${data5digit.length + data6digit.length}`
    );

    if (data5digit.length > 0) {
      const values5 = data5digit.map((row) =>
        parseInt(row.numeric_value || 0, 10)
      );
      console.log(`\n5-значные домены:`);
      console.log(
        `  Диапазон: ${Math.min(...values5)} - ${Math.max(...values5)}`
      );
      console.log(`  Первый: ${data5digit[0]?.domain || "нет"}`);
      console.log(
        `  Последний: ${data5digit[data5digit.length - 1]?.domain || "нет"}`
      );
    }

    if (data6digit.length > 0) {
      const values6 = data6digit.map((row) =>
        parseInt(row.numeric_value || 0, 10)
      );
      console.log(`\n6-значные домены:`);
      console.log(
        `  Диапазон: ${Math.min(...values6)} - ${Math.max(...values6)}`
      );
      console.log(`  Первый: ${data6digit[0]?.domain || "нет"}`);
      console.log(
        `  Последний: ${data6digit[data6digit.length - 1]?.domain || "нет"}`
      );
    }

    console.log("\n=== СОЗДАННЫЕ ФАЙЛЫ ===");
    if (data5digit.length > 0)
      console.log(`1. ${CONFIG.OUTPUT_EXCEL_5DIGIT} - 5-значные домены`);
    if (data6digit.length > 0)
      console.log(`2. ${CONFIG.OUTPUT_EXCEL_6DIGIT} - 6-значные домены`);
    console.log(`3. domains-summary-report.xlsx - сводный отчет`);

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
  sortDataByNumericValue,
  createExcelFile,
  createStatisticsData,
  createSummaryReport,
};
