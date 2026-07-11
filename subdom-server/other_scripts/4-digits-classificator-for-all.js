/**
 * Скрипт для классификации 4-значных цифровых доменов по Tier-ам (1-8)
 * Генерирует один Excel файл с группировкой занятых и свободных доменов
 */

const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");

// Конфигурация
const CONFIG = {
  OCCUPIED_FILE: "4digit_domains.csv", // Файл с занятыми доменами
  OUTPUT_EXCEL: "domains_classification.xlsx", // Выходной Excel файл
  GENERATE_ALL_DOMAINS: true, // Генерировать все возможные 4-значные домены
  ALL_DOMAINS_FILE: "all_4digit_domains.csv", // Файл со всеми доменами (если нужно)
};

// Вспомогательные функции для проверки паттернов (остаются те же)
function isRepdigit(num) {
  return /^(\d)\1{3}$/.test(num);
}

function isFirstTen(num) {
  return /^000[1-9]$/.test(num);
}

function isTens(num) {
  return /^00[1-9]0$/.test(num);
}

function isHundreds(num) {
  return /^0[1-9]00$/.test(num);
}

function isThousands(num) {
  return /^[1-9]000$/.test(num);
}

function isRoundRepeats(num) {
  return /^(\d)0\10$/.test(num);
}

function isRepeatsThroughZero(num) {
  return /^0(\d)0\1$/.test(num);
}

function isDoubleZeroRepeats(num) {
  return /^00(\d)\1$/.test(num);
}

function isRepeatsDoubleZero(num) {
  return /^(\d)\100$/.test(num);
}

function isStepSequence(num) {
  const digits = num.split("").map((d) => parseInt(d, 10));
  const ascending =
    digits[0] + 1 === digits[1] &&
    digits[1] + 1 === digits[2] &&
    digits[2] + 1 === digits[3];
  const descending =
    digits[0] - 1 === digits[1] &&
    digits[1] - 1 === digits[2] &&
    digits[2] - 1 === digits[3];
  return ascending || descending;
}

function isFirstHundred(num) {
  if (!/^00\d\d$/.test(num)) return false;
  const n = parseInt(num, 10);
  return n >= 12 && n <= 98;
}

function isPalindrome(num) {
  return num[0] === num[3] && num[1] === num[2];
}

function isTripleStep(num) {
  const digits = num.split("").map((d) => parseInt(d, 10));
  if (digits[0] === digits[1] && digits[1] === digits[2]) {
    const diff = Math.abs(digits[2] - digits[3]);
    return diff === 1;
  }
  if (digits[1] === digits[2] && digits[2] === digits[3]) {
    const diff = Math.abs(digits[0] - digits[1]);
    return diff === 1;
  }
  return false;
}

function isTripleXXXY(num) {
  return /^(\d)\1\1[0-9]$/.test(num) && num[0] !== num[3];
}

function isTripleYXXX(num) {
  return /^[0-9](\d)\1\1$/.test(num) && num[0] !== num[1];
}

function isTripleXYXX(num) {
  return /^(\d)([0-9])\1\1$/.test(num) && num[0] !== num[1];
}

function isTripleXXYX(num) {
  return /^(\d)\1([0-9])\1$/.test(num) && num[0] !== num[2];
}

function isDoubleRepeatStep(num) {
  if (num === "0011" || num === "1100") return false;
  const digits = num.split("").map((d) => parseInt(d, 10));
  if (digits[0] === digits[1] && digits[2] === digits[3]) {
    const diff = Math.abs(digits[1] - digits[2]);
    return diff === 1;
  }
  return false;
}

function isDoubleRepeatXXYY(num) {
  if (num.startsWith("00") || num.endsWith("00")) return false;
  if (isDoubleRepeatStep(num)) return false;
  return /^(\d)\1(\d)\2$/.test(num) && num[0] !== num[2];
}

function isRepeatXYXY(num) {
  if (num[1] === "0" && num[3] === "0") return false;
  if (num[0] === "0" && num[2] === "0") return false;
  return /^(\d)([0-9])\1\2$/.test(num) && num[0] !== num[1];
}

function isYear(num) {
  const year = parseInt(num, 10);
  if (year < 1970 || year > 2030) return false;
  const excluded = [1999, 2000, 2002, 2010, 2019, 2020, 2021, 2022, 2030];
  return !excluded.includes(year);
}

function isDoubleStep(num) {
  const excluded = [
    "0001",
    "1011",
    "1112",
    "2223",
    "3334",
    "4445",
    "5556",
    "6667",
    "7778",
    "8889",
    "9998",
    "8887",
    "7776",
    "6665",
    "5554",
    "4443",
    "3332",
    "2221",
    "1211",
    "1110",
    "0100",
  ];
  if (excluded.includes(num)) return false;
  const digits = num.split("").map((d) => parseInt(d, 10));
  const isStep =
    (digits[0] + 1 === digits[1] &&
      digits[1] + 1 === digits[2] &&
      digits[2] + 1 === digits[3]) ||
    (digits[0] - 1 === digits[1] &&
      digits[1] - 1 === digits[2] &&
      digits[2] - 1 === digits[3]);
  const isDoubleStepPattern =
    digits[0] + 1 === digits[1] &&
    digits[2] + 1 === digits[3] &&
    Math.abs(digits[1] - digits[2]) <= 2;
  return isStep || isDoubleStepPattern;
}

// Основная функция классификации
function classifyDomain(cleanDomain) {
  const num = cleanDomain.padStart(4, "0");

  if (isRepdigit(num)) return 1;
  if (
    isFirstTen(num) ||
    isTens(num) ||
    isHundreds(num) ||
    isThousands(num) ||
    isRoundRepeats(num) ||
    isRepeatsThroughZero(num) ||
    isDoubleZeroRepeats(num) ||
    isRepeatsDoubleZero(num) ||
    isStepSequence(num)
  )
    return 2;

  if (isFirstHundred(num)) {
    const tier2Patterns = [isFirstTen, isTens, isDoubleZeroRepeats];
    const isInTier2 = tier2Patterns.some((pattern) => pattern(num));
    if (!isInTier2) return 3;
  }

  if (isPalindrome(num)) return 4;
  if (
    isTripleStep(num) ||
    isTripleXXXY(num) ||
    isTripleYXXX(num) ||
    isTripleXYXX(num) ||
    isTripleXXYX(num)
  )
    return 5;
  if (isDoubleRepeatStep(num) || isDoubleRepeatXXYY(num) || isRepeatXYXY(num))
    return 6;
  if (isYear(num)) return 7;
  if (isDoubleStep(num)) return 8;

  return 0;
}

// Функция для чтения CSV файла
function readCSV(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n").filter((line) => line.trim());
    const domains = new Set();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^"([^"]+)","([^"]+)"$/);
      if (match) {
        domains.add(match[2]); // Добавляем clean_domain
      }
    }

    return domains;
  } catch (error) {
    console.error(`Ошибка чтения файла ${filePath}:`, error.message);
    return new Set();
  }
}

// Функция для генерации всех возможных 4-значных доменов
function generateAll4DigitDomains() {
  const allDomains = [];
  for (let i = 0; i < 10000; i++) {
    const domain = i.toString().padStart(4, "0");
    allDomains.push(domain);
  }
  return allDomains;
}

// Функция для создания Excel файла
async function createExcelFile(occupiedDomains, allDomains) {
  console.log("Создание Excel файла...");

  const workbook = new ExcelJS.Workbook();

  // Стили для ячеек
  const headerStyle = {
    font: { bold: true, size: 12, color: { argb: "FFFFFF" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "4472C4" } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    },
  };

  const occupiedStyle = {
    font: { bold: true, color: { argb: "000000" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFCCCC" } }, // Красный для занятых
    alignment: { horizontal: "center", vertical: "middle" },
    border: {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    },
  };

  const availableStyle = {
    font: { color: { argb: "000000" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF00" } }, // Желтый для свободных
    alignment: { horizontal: "center", vertical: "middle" },
    border: {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    },
  };

  const tierHeaderStyle = {
    font: { bold: true, size: 14, color: { argb: "FFFFFF" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "ED7D31" } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: {
      top: { style: "medium" },
      left: { style: "medium" },
      bottom: { style: "medium" },
      right: { style: "medium" },
    },
  };

  // Создаем листы для каждого Tier
  const tierNames = {
    1: "Tier 1 - Репдигиты (XXXX)",
    2: "Tier 2 - Специальные паттерны",
    3: "Tier 3 - Первая сотня",
    4: "Tier 4 - Палиндромы (XYYX)",
    5: "Tier 5 - Трёшки",
    6: "Tier 6 - Двойные репиты",
    7: "Tier 7 - Года (1970-2030)",
    8: "Tier 8 - Двойные ступеньки",
    0: "Other - Остальные домены",
  };

  const tierDescriptions = {
    1: "Все 4 цифры одинаковые: 0000, 1111, ..., 9999 (10 доменов)",
    2: "Первая десятка (000X), десятки (00X0), сотки (0X00), тысячники (X000), круглые репиты (X0X0), репиты через ноль (0X0X), два ноля повторяшки (00XX), повторяшки два ноля (XX00), ступеньки (0123...6789, 9876...3210)",
    3: "Первая сотня (0012...0098), исключая уже учтенные в Tier 2",
    4: "Палиндромы формата XYYX: 1221, 2332, 3443, ...",
    5: "Трёшки: XXXY, YXXX, XYXX, XXYX, трёшки двойной ступенькой",
    6: "Двойные репиты ступенькой (1122...8899), двойные репиты (XXYY), репиты (XYXY)",
    7: "Года от 1970 до 2030 (с исключениями)",
    8: "Двойные ступеньки: 0102...0809, 1213...9899 и т.д. (с исключениями)",
    0: "Домены, не попавшие в категории выше",
  };

  // Собираем статистику
  const tierStats = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
  const tierOccupiedStats = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
    8: 0,
  };
  const tierAvailableStats = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
    8: 0,
  };

  // Группируем домены по Tier-ам
  const tierDomains = {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
    7: [],
    8: [],
  };

  allDomains.forEach((domain) => {
    const tier = classifyDomain(domain);
    const isOccupied = occupiedDomains.has(domain);

    tierDomains[tier].push({
      domain: domain,
      occupied: isOccupied,
      status: isOccupied ? "Занят" : "Свободен",
    });

    tierStats[tier]++;
    if (isOccupied) {
      tierOccupiedStats[tier]++;
    } else {
      tierAvailableStats[tier]++;
    }
  });

  // Создаем лист со сводной статистикой
  const summarySheet = workbook.addWorksheet("Сводная статистика");

  // Заголовок
  summarySheet.mergeCells("A1:E1");
  const titleCell = summarySheet.getCell("A1");
  titleCell.value = "Классификация 4-значных цифровых доменов (.ton)";
  titleCell.font = { bold: true, size: 16, color: { argb: "000000" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE699" },
  };

  // Подзаголовок
  summarySheet.mergeCells("A2:E2");
  const subtitleCell = summarySheet.getCell("A2");
  subtitleCell.value = `Всего доменов: ${allDomains.length} | Занято: ${
    occupiedDomains.size
  } | Свободно: ${allDomains.length - occupiedDomains.size}`;
  subtitleCell.font = { bold: true, size: 12 };
  subtitleCell.alignment = { horizontal: "center", vertical: "middle" };

  // Заголовки таблицы статистики
  summarySheet.getCell("A4").value = "Tier";
  summarySheet.getCell("B4").value = "Категория";
  summarySheet.getCell("C4").value = "Всего доменов";
  summarySheet.getCell("D4").value = "Занято";
  summarySheet.getCell("E4").value = "Свободно";
  summarySheet.getCell("F4").value = "% занятости";

  // Применяем стили к заголовкам
  ["A4", "B4", "C4", "D4", "E4", "F4"].forEach((cell) => {
    summarySheet.getCell(cell).style = headerStyle;
  });

  // Заполняем статистику по Tier-ам
  let row = 5;
  for (let tier = 1; tier <= 8; tier++) {
    const total = tierStats[tier];
    const occupied = tierOccupiedStats[tier];
    const available = tierAvailableStats[tier];
    const occupancyRate =
      total > 0 ? ((occupied / total) * 100).toFixed(2) + "%" : "0%";

    summarySheet.getCell(`A${row}`).value = tier;
    summarySheet.getCell(`B${row}`).value = tierNames[tier].split(" - ")[1];
    summarySheet.getCell(`C${row}`).value = total;
    summarySheet.getCell(`D${row}`).value = occupied;
    summarySheet.getCell(`E${row}`).value = available;
    summarySheet.getCell(`F${row}`).value = occupancyRate;

    // Закрашиваем строку в зависимости от Tier
    const tierColors = {
      1: "FFCCCC",
      2: "FFE699",
      3: "C6E0B4",
      4: "BDD7EE",
      5: "D9D9D9",
      6: "F8CBAD",
      7: "E2EFDA",
      8: "FFF2CC",
    };

    ["A", "B", "C", "D", "E", "F"].forEach((col) => {
      summarySheet.getCell(`${col}${row}`).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: tierColors[tier] || "FFFFFF" },
      };
      summarySheet.getCell(`${col}${row}`).border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    row++;
  }

  // Строка для Other
  const otherTotal = tierStats[0];
  const otherOccupied = tierOccupiedStats[0];
  const otherAvailable = tierAvailableStats[0];
  const otherOccupancyRate =
    otherTotal > 0
      ? ((otherOccupied / otherTotal) * 100).toFixed(2) + "%"
      : "0%";

  summarySheet.getCell(`A${row}`).value = "Other";
  summarySheet.getCell(`B${row}`).value = tierNames[0].split(" - ")[1];
  summarySheet.getCell(`C${row}`).value = otherTotal;
  summarySheet.getCell(`D${row}`).value = otherOccupied;
  summarySheet.getCell(`E${row}`).value = otherAvailable;
  summarySheet.getCell(`F${row}`).value = otherOccupancyRate;

  ["A", "B", "C", "D", "E", "F"].forEach((col) => {
    summarySheet.getCell(`${col}${row}`).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "D9D9D9" },
    };
    summarySheet.getCell(`${col}${row}`).border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  row++;

  // Итоговая строка
  summarySheet.getCell(`A${row}`).value = "ИТОГО";
  summarySheet.getCell(`B${row}`).value = "";
  summarySheet.getCell(`C${row}`).value = allDomains.length;
  summarySheet.getCell(`D${row}`).value = occupiedDomains.size;
  summarySheet.getCell(`E${row}`).value =
    allDomains.length - occupiedDomains.size;
  summarySheet.getCell(`F${row}`).value =
    allDomains.length > 0
      ? ((occupiedDomains.size / allDomains.length) * 100).toFixed(2) + "%"
      : "0%";

  ["A", "B", "C", "D", "E", "F"].forEach((col) => {
    summarySheet.getCell(`${col}${row}`).font = { bold: true };
    summarySheet.getCell(`${col}${row}`).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "B4C6E7" },
    };
    summarySheet.getCell(`${col}${row}`).border = {
      top: { style: "medium" },
      left: { style: "medium" },
      bottom: { style: "medium" },
      right: { style: "medium" },
    };
  });

  // Настраиваем ширину колонок
  summarySheet.columns = [
    { width: 10 }, // Tier
    { width: 30 }, // Категория
    { width: 15 }, // Всего доменов
    { width: 15 }, // Занято
    { width: 15 }, // Свободно
    { width: 15 }, // % занятости
  ];

  // Создаем листы для каждого Tier
  for (let tier = 1; tier <= 8; tier++) {
    const sheetName = `Tier ${tier}`;
    const worksheet = workbook.addWorksheet(sheetName);

    // Заголовок листа
    worksheet.mergeCells("A1:D1");
    const tierTitleCell = worksheet.getCell("A1");
    tierTitleCell.value = tierNames[tier];
    tierTitleCell.style = tierHeaderStyle;

    // Описание категории
    worksheet.mergeCells("A2:D2");
    const descCell = worksheet.getCell("A2");
    descCell.value = tierDescriptions[tier];
    descCell.font = { italic: true, size: 10 };
    descCell.alignment = { horizontal: "center", vertical: "middle" };
    descCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "F2F2F2" },
    };

    // Статистика по листу
    worksheet.mergeCells("A3:D3");
    const statsCell = worksheet.getCell("A3");
    statsCell.value = `Всего в категории: ${tierStats[tier]} | Занято: ${tierOccupiedStats[tier]} | Свободно: ${tierAvailableStats[tier]}`;
    statsCell.font = { bold: true, size: 11 };
    statsCell.alignment = { horizontal: "center", vertical: "middle" };
    statsCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "E2EFDA" },
    };

    // Заголовки таблицы
    worksheet.getCell("A5").value = "№";
    worksheet.getCell("B5").value = "Домен";
    worksheet.getCell("C5").value = "Статус";
    worksheet.getCell("D5").value = "Полное имя";

    ["A5", "B5", "C5", "D5"].forEach((cell) => {
      worksheet.getCell(cell).style = headerStyle;
    });

    // Заполняем домены
    let domainRow = 6;
    let domainNumber = 1;

    // Сначала занятые домены
    const tierDomainsList = tierDomains[tier];
    const occupiedDomainsList = tierDomainsList.filter((d) => d.occupied);
    const availableDomainsList = tierDomainsList.filter((d) => !d.occupied);

    // Заголовок для занятых
    if (occupiedDomainsList.length > 0) {
      worksheet.mergeCells(`A${domainRow}:D${domainRow}`);
      const occupiedHeader = worksheet.getCell(`A${domainRow}`);
      occupiedHeader.value = "ЗАНЯТЫЕ ДОМЕНЫ";
      occupiedHeader.font = { bold: true, size: 12, color: { argb: "FF0000" } };
      occupiedHeader.alignment = { horizontal: "center", vertical: "middle" };
      occupiedHeader.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFCCCC" },
      };
      domainRow++;

      // Занятые домены
      occupiedDomainsList.forEach((domainInfo) => {
        worksheet.getCell(`A${domainRow}`).value = domainNumber++;
        worksheet.getCell(`B${domainRow}`).value = domainInfo.domain;
        worksheet.getCell(`C${domainRow}`).value = domainInfo.status;
        worksheet.getCell(`D${domainRow}`).value = `${domainInfo.domain}.ton`;

        // Применяем стиль для занятых
        ["A", "B", "C", "D"].forEach((col) => {
          worksheet.getCell(`${col}${domainRow}`).style = occupiedStyle;
        });

        domainRow++;
      });
    }

    // Заголовок для свободных
    if (availableDomainsList.length > 0) {
      worksheet.mergeCells(`A${domainRow}:D${domainRow}`);
      const availableHeader = worksheet.getCell(`A${domainRow}`);
      availableHeader.value = "СВОБОДНЫЕ ДОМЕНЫ";
      availableHeader.font = {
        bold: true,
        size: 12,
        color: { argb: "000000" },
      };
      availableHeader.alignment = { horizontal: "center", vertical: "middle" };
      availableHeader.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFF00" },
      };
      domainRow++;

      // Свободные домены
      availableDomainsList.forEach((domainInfo) => {
        worksheet.getCell(`A${domainRow}`).value = domainNumber++;
        worksheet.getCell(`B${domainRow}`).value = domainInfo.domain;
        worksheet.getCell(`C${domainRow}`).value = domainInfo.status;
        worksheet.getCell(`D${domainRow}`).value = `${domainInfo.domain}.ton`;

        // Применяем стиль для свободных
        ["A", "B", "C", "D"].forEach((col) => {
          worksheet.getCell(`${col}${domainRow}`).style = availableStyle;
        });

        domainRow++;
      });
    }

    // Настраиваем ширину колонок
    worksheet.columns = [
      { width: 8 }, // №
      { width: 15 }, // Домен
      { width: 15 }, // Статус
      { width: 20 }, // Полное имя
    ];

    // Автофильтр
    worksheet.autoFilter = {
      from: { row: 5, column: 1 },
      to: { row: domainRow - 1, column: 4 },
    };
  }

  // Лист для Other доменов
  const otherWorksheet = workbook.addWorksheet("Other");

  // Заголовок листа
  otherWorksheet.mergeCells("A1:D1");
  const otherTitleCell = otherWorksheet.getCell("A1");
  otherTitleCell.value = tierNames[0];
  otherTitleCell.style = tierHeaderStyle;

  // Описание
  otherWorksheet.mergeCells("A2:D2");
  const otherDescCell = otherWorksheet.getCell("A2");
  otherDescCell.value = tierDescriptions[0];
  otherDescCell.font = { italic: true, size: 10 };
  otherDescCell.alignment = { horizontal: "center", vertical: "middle" };
  otherDescCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "F2F2F2" },
  };

  // Статистика
  otherWorksheet.mergeCells("A3:D3");
  const otherStatsCell = otherWorksheet.getCell("A3");
  otherStatsCell.value = `Всего в категории: ${tierStats[0]} | Занято: ${tierOccupiedStats[0]} | Свободно: ${tierAvailableStats[0]}`;
  otherStatsCell.font = { bold: true, size: 11 };
  otherStatsCell.alignment = { horizontal: "center", vertical: "middle" };
  otherStatsCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "E2EFDA" },
  };

  // Заголовки таблицы
  otherWorksheet.getCell("A5").value = "№";
  otherWorksheet.getCell("B5").value = "Домен";
  otherWorksheet.getCell("C5").value = "Статус";
  otherWorksheet.getCell("D5").value = "Полное имя";

  ["A5", "B5", "C5", "D5"].forEach((cell) => {
    otherWorksheet.getCell(cell).style = headerStyle;
  });

  // Заполняем домены
  let otherRow = 6;
  let otherNumber = 1;

  // Сначала занятые
  const otherOccupiedList = tierDomains[0].filter((d) => d.occupied);
  const otherAvailableList = tierDomains[0].filter((d) => !d.occupied);

  if (otherOccupiedList.length > 0) {
    otherWorksheet.mergeCells(`A${otherRow}:D${otherRow}`);
    const otherOccupiedHeader = otherWorksheet.getCell(`A${otherRow}`);
    otherOccupiedHeader.value = "ЗАНЯТЫЕ ДОМЕНЫ";
    otherOccupiedHeader.font = {
      bold: true,
      size: 12,
      color: { argb: "FF0000" },
    };
    otherOccupiedHeader.alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    otherOccupiedHeader.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFCCCC" },
    };
    otherRow++;

    otherOccupiedList.forEach((domainInfo) => {
      otherWorksheet.getCell(`A${otherRow}`).value = otherNumber++;
      otherWorksheet.getCell(`B${otherRow}`).value = domainInfo.domain;
      otherWorksheet.getCell(`C${otherRow}`).value = domainInfo.status;
      otherWorksheet.getCell(`D${otherRow}`).value = `${domainInfo.domain}.ton`;

      ["A", "B", "C", "D"].forEach((col) => {
        otherWorksheet.getCell(`${col}${otherRow}`).style = occupiedStyle;
      });

      otherRow++;
    });
  }

  // Затем свободные
  if (otherAvailableList.length > 0) {
    otherWorksheet.mergeCells(`A${otherRow}:D${otherRow}`);
    const otherAvailableHeader = otherWorksheet.getCell(`A${otherRow}`);
    otherAvailableHeader.value = "СВОБОДНЫЕ ДОМЕНЫ";
    otherAvailableHeader.font = {
      bold: true,
      size: 12,
      color: { argb: "000000" },
    };
    otherAvailableHeader.alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    otherAvailableHeader.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFF00" },
    };
    otherRow++;

    otherAvailableList.forEach((domainInfo) => {
      otherWorksheet.getCell(`A${otherRow}`).value = otherNumber++;
      otherWorksheet.getCell(`B${otherRow}`).value = domainInfo.domain;
      otherWorksheet.getCell(`C${otherRow}`).value = domainInfo.status;
      otherWorksheet.getCell(`D${otherRow}`).value = `${domainInfo.domain}.ton`;

      ["A", "B", "C", "D"].forEach((col) => {
        otherWorksheet.getCell(`${col}${otherRow}`).style = availableStyle;
      });

      otherRow++;
    });
  }

  // Настраиваем ширину колонок
  otherWorksheet.columns = [
    { width: 8 }, // №
    { width: 15 }, // Домен
    { width: 15 }, // Статус
    { width: 20 }, // Полное имя
  ];

  // Автофильтр
  otherWorksheet.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: otherRow - 1, column: 4 },
  };

  // Сохраняем файл
  await workbook.xlsx.writeFile(CONFIG.OUTPUT_EXCEL);
  console.log(`Excel файл сохранен: ${CONFIG.OUTPUT_EXCEL}`);

  return {
    totalDomains: allDomains.length,
    occupied: occupiedDomains.size,
    available: allDomains.length - occupiedDomains.size,
    tierStats: tierStats,
    tierOccupiedStats: tierOccupiedStats,
    tierAvailableStats: tierAvailableStats,
  };
}

// Основная функция
async function main() {
  console.log("=== Классификация 4-значных доменов с генерацией Excel ===");

  // Читаем занятые домены
  console.log("Чтение файла с занятыми доменами...");
  const occupiedDomains = readCSV(CONFIG.OCCUPIED_FILE);

  if (occupiedDomains.size === 0) {
    console.warn(
      "Не удалось загрузить занятые домены, продолжаем с пустым списком"
    );
  } else {
    console.log(`Загружено ${occupiedDomains.size} занятых доменов`);
  }
  // Генерируем все возможные 4-значные домены
  console.log("Генерация всех возможных 4-значных доменов...");
  const allDomains = generateAll4DigitDomains();
  console.log(
    `Сгенерировано ${allDomains.length} возможных доменов (0000-9999)`
  );

  // Если нужно сохранить все домены в CSV
  if (CONFIG.GENERATE_ALL_DOMAINS) {
    console.log("Сохранение всех доменов в CSV файл...");
    let csvContent = "domain,clean_domain\n";
    allDomains.forEach((domain) => {
      csvContent += `"${domain}.ton","${domain}"\n`;
    });
    fs.writeFileSync(CONFIG.ALL_DOMAINS_FILE, csvContent);
    console.log(`Все домены сохранены в ${CONFIG.ALL_DOMAINS_FILE}`);
  }

  // Создаем Excel файл
  console.log("\nСоздание Excel файла с классификацией...");
  const stats = await createExcelFile(occupiedDomains, allDomains);

  // Выводим итоговую статистику
  console.log("\n=== ИТОГОВАЯ СТАТИСТИКА ===");
  console.log(`Всего возможных доменов: ${stats.totalDomains}`);
  console.log(
    `Занято доменов: ${stats.occupied} (${(
      (stats.occupied / stats.totalDomains) *
      100
    ).toFixed(2)}%)`
  );
  console.log(
    `Свободно доменов: ${stats.available} (${(
      (stats.available / stats.totalDomains) *
      100
    ).toFixed(2)}%)`
  );

  console.log("\nРаспределение по Tier-ам:");
  for (let tier = 1; tier <= 8; tier++) {
    const total = stats.tierStats[tier];
    const occupied = stats.tierOccupiedStats[tier];
    const available = stats.tierAvailableStats[tier];
    const occupancyRate =
      total > 0 ? ((occupied / total) * 100).toFixed(2) : "0.00";

    console.log(
      `Tier ${tier}: ${total} доменов (${occupied} занято, ${available} свободно, ${occupancyRate}% занятости)`
    );
  }

  const otherTotal = stats.tierStats[0];
  const otherOccupied = stats.tierOccupiedStats[0];
  const otherAvailable = stats.tierAvailableStats[0];
  const otherOccupancyRate =
    otherTotal > 0 ? ((otherOccupied / otherTotal) * 100).toFixed(2) : "0.00";

  console.log(
    `Other: ${otherTotal} доменов (${otherOccupied} занято, ${otherAvailable} свободно, ${otherOccupancyRate}% занятости)`
  );

  console.log("\n=== Готово! ===");
  console.log(`Excel файл сохранен: ${CONFIG.OUTPUT_EXCEL}`);
  console.log("\nСтруктура файла:");
  console.log(
    '1. Лист "Сводная статистика" - общая статистика по всем Tier-ам'
  );
  console.log('2. Листы "Tier 1" - "Tier 8" - детализация по каждой категории');
  console.log('3. Лист "Other" - домены, не попавшие в категории');
  console.log("\nЦветовая маркировка:");
  console.log("- Красный фон: занятые домены");
  console.log("- Желтый фон: свободные домены");
  console.log(
    "- Разные цвета для каждого Tier: визуальное разделение категорий"
  );
}

// Функция для создания инструкции по установке
function createInstallationInstructions() {
  const instructions = `
# Установка и использование Excel классификатора доменов

## Требования
1. Установите Node.js (версия 14 или выше)
2. Установите необходимые пакеты

## Установка
1. Сохраните этот скрипт как \`excel_classifier.js\`
2. Установите библиотеку ExcelJS:
\`\`\`bash
npm install exceljs
\`\`\`

3. Поместите ваш CSV файл с занятыми доменами в ту же папку
   (файл должен называться \`4digit_domains.csv\` или измените CONFIG.OCCUPIED_FILE)

## Использование
\`\`\`bash
node excel_classifier.js
\`\`\`

## Что делает скрипт:
1. Читает CSV файл с занятыми доменами
2. Генерирует все возможные 4-значные домены (0000-9999)
3. Классифицирует каждый домен по Tier-ам (1-8)
4. Создает Excel файл с:
   - Сводной статистикой
   - Отдельными листами для каждого Tier
   - Разделением на занятые и свободные домены
   - Цветовой маркировкой

## Формат входного CSV файла:
\`\`\`csv
domain,clean_domain
"1234.ton","1234"
"5678.ton","5678"
...
\`\`\`

## Выходные файлы:
1. \`domains_classification.xlsx\` - основной Excel файл
2. \`all_4digit_domains.csv\` - все возможные домены (опционально)

## Особенности:
- Занятые домены выделены красным фоном
- Свободные домены выделены желтым фоном
- Каждый Tier имеет свой цвет для визуального разделения
- В каждом листе сначала идут занятые домены, затем свободные
- Автофильтры для удобной навигации
- Подробная статистика по каждому Tier
`;

  console.log(instructions);
}

// Проверяем, установлен ли exceljs
function checkDependencies() {
  try {
    require("exceljs");
    return true;
  } catch (error) {
    console.error("Ошибка: библиотека exceljs не установлена!");
    console.error("Установите её командой: npm install exceljs");
    return false;
  }
}

// Запуск скрипта
if (require.main === module) {
  if (!checkDependencies()) {
    process.exit(1);
  }

  createInstallationInstructions();

  // Запускаем основную функцию
  main().catch((error) => {
    console.error("Ошибка выполнения:", error);
    process.exit(1);
  });
}

module.exports = {
  classifyDomain,
  readCSV,
  generateAll4DigitDomains,
  createExcelFile,
  isRepdigit,
  isFirstTen,
  isTens,
  isHundreds,
  isThousands,
  isRoundRepeats,
  isRepeatsThroughZero,
  isDoubleZeroRepeats,
  isRepeatsDoubleZero,
  isStepSequence,
  isFirstHundred,
  isPalindrome,
  isTripleStep,
  isTripleXXXY,
  isTripleYXXX,
  isTripleXYXX,
  isTripleXXYX,
  isDoubleRepeatStep,
  isDoubleRepeatXXYY,
  isRepeatXYXY,
  isYear,
  isDoubleStep,
};
