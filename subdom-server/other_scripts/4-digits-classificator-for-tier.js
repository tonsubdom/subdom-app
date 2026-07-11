/**
 * Скрипт для классификации 4-значных цифровых доменов по Tier-ам (1-8)
 * Согласно градации элитных чисел
 */

const fs = require("fs");
const path = require("path");

// Конфигурация
const CONFIG = {
  INPUT_FILE: "4digit_domains.csv", // Входной CSV файл
  OUTPUT_PREFIX: "classified_", // Префикс для выходных файлов
  TIER_FILES: {
    1: "tier1_repidigits.csv",
    2: "tier2_special.csv",
    3: "tier3_first_hundred.csv",
    4: "tier4_palindromes.csv",
    5: "tier5_triples.csv",
    6: "tier6_double_repeats.csv",
    7: "tier7_years.csv",
    8: "tier8_double_steps.csv",
    OTHER: "other_domains.csv",
  },
};

// Вспомогательные функции для проверки паттернов
function isRepdigit(num) {
  // XXXX - все цифры одинаковые
  return /^(\d)\1{3}$/.test(num);
}

function isFirstTen(num) {
  // 000X - первая десятка
  return /^000[1-9]$/.test(num);
}

function isTens(num) {
  // 00X0 - десятки
  return /^00[1-9]0$/.test(num);
}

function isHundreds(num) {
  // 0X00 - сотки
  return /^0[1-9]00$/.test(num);
}

function isThousands(num) {
  // X000 - тысячники
  return /^[1-9]000$/.test(num);
}

function isRoundRepeats(num) {
  // X0X0 - круглые репиты
  return /^(\d)0\10$/.test(num);
}

function isRepeatsThroughZero(num) {
  // 0X0X - репиты через ноль
  return /^0(\d)0\1$/.test(num);
}

function isDoubleZeroRepeats(num) {
  // 00XX - два ноля повторяшки
  return /^00(\d)\1$/.test(num);
}

function isRepeatsDoubleZero(num) {
  // XX00 - повторяшки два ноля
  return /^(\d)\100$/.test(num);
}

function isStepSequence(num) {
  // 0123, 1234...6789, 9876...3210 - ступеньки
  const n = parseInt(num, 10);
  const digits = num.split("").map((d) => parseInt(d, 10));

  // Восходящая последовательность
  const ascending =
    digits[0] + 1 === digits[1] &&
    digits[1] + 1 === digits[2] &&
    digits[2] + 1 === digits[3];

  // Нисходящая последовательность
  const descending =
    digits[0] - 1 === digits[1] &&
    digits[1] - 1 === digits[2] &&
    digits[2] - 1 === digits[3];

  return ascending || descending;
}

function isFirstHundred(num) {
  // 0012...0098 - первая сотня (исключая уже учтенные в Tier-2)
  if (!/^00\d\d$/.test(num)) return false;

  const n = parseInt(num, 10);
  return n >= 12 && n <= 98;
}

function isPalindrome(num) {
  // XYYX - палиндромы
  return num[0] === num[3] && num[1] === num[2];
}

function isTripleStep(num) {
  // 1112, 2223...8889, 9998...1110 - трёшки двойной ступенькой
  const digits = num.split("").map((d) => parseInt(d, 10));

  // Паттерн: XXXY где Y = X+1 или X-1
  if (digits[0] === digits[1] && digits[1] === digits[2]) {
    const diff = Math.abs(digits[2] - digits[3]);
    return diff === 1;
  }

  // Паттерн: YXXX где Y = X+1 или X-1
  if (digits[1] === digits[2] && digits[2] === digits[3]) {
    const diff = Math.abs(digits[0] - digits[1]);
    return diff === 1;
  }

  return false;
}

function isTripleXXXY(num) {
  // XXXY - трёшки 3-1
  return /^(\d)\1\1[0-9]$/.test(num) && num[0] !== num[3];
}

function isTripleYXXX(num) {
  // YXXX - трёшки 1-3
  return /^[0-9](\d)\1\1$/.test(num) && num[0] !== num[1];
}

function isTripleXYXX(num) {
  // XYXX - трёшки 1-2
  return /^(\d)([0-9])\1\1$/.test(num) && num[0] !== num[1];
}

function isTripleXXYX(num) {
  // XXYX - трёшки 2-1
  return /^(\d)\1([0-9])\1$/.test(num) && num[0] !== num[2];
}

function isDoubleRepeatStep(num) {
  // 1122...8899, 9988...2211 - двойные репиты ступенькой
  const digits = num.split("").map((d) => parseInt(d, 10));

  // Исключаем 0011, 1100
  if (num === "0011" || num === "1100") return false;

  // Паттерн: AABB где B = A+1 или A-1
  if (digits[0] === digits[1] && digits[2] === digits[3]) {
    const diff = Math.abs(digits[1] - digits[2]);
    return diff === 1;
  }

  return false;
}

function isDoubleRepeatXXYY(num) {
  // XXYY - двойные репиты (исключая 00XX, XX00 и ступеньки)
  if (num.startsWith("00") || num.endsWith("00")) return false;
  if (isDoubleRepeatStep(num)) return false;

  return /^(\d)\1(\d)\2$/.test(num) && num[0] !== num[2];
}

function isRepeatXYXY(num) {
  // XYXY - репиты (исключая 0X0X, X0X0)
  if (num[1] === "0" && num[3] === "0") return false; // X0X0
  if (num[0] === "0" && num[2] === "0") return false; // 0X0X

  return /^(\d)([0-9])\1\2$/.test(num) && num[0] !== num[1];
}

function isYear(num) {
  // 1970 - 2030 - года (с исключениями)
  const year = parseInt(num, 10);
  if (year < 1970 || year > 2030) return false;

  // Исключения (они в более высоких категориях)
  const excluded = [1999, 2000, 2002, 2010, 2019, 2020, 2021, 2022, 2030];

  return !excluded.includes(year);
}

function isDoubleStep(num) {
  // 0102...0809, 0910, 1213...9899, 9897...1312, 0908...0201
  // с исключениями
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

  // Проверяем последовательность с шагом 1
  const isStep =
    (digits[0] + 1 === digits[1] &&
      digits[1] + 1 === digits[2] &&
      digits[2] + 1 === digits[3]) ||
    (digits[0] - 1 === digits[1] &&
      digits[1] - 1 === digits[2] &&
      digits[2] - 1 === digits[3]);

  // Проверяем двойные ступеньки: AB где B = A+1, затем CD где D = C+1
  const isDoubleStepPattern =
    digits[0] + 1 === digits[1] &&
    digits[2] + 1 === digits[3] &&
    Math.abs(digits[1] - digits[2]) <= 2;

  return isStep || isDoubleStepPattern;
}

// Основная функция классификации
function classifyDomain(cleanDomain) {
  const num = cleanDomain.padStart(4, "0");

  // Tier 1: Репдигиты XXXX (10 шт)
  if (isRepdigit(num)) {
    return 1;
  }

  // Tier 2: Специальные паттерны
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
  ) {
    return 2;
  }

  // Tier 3: Первая сотня (исключая уже учтенные)
  if (isFirstHundred(num)) {
    // Проверяем, не попал ли уже в Tier 2
    const tier2Patterns = [isFirstTen, isTens, isDoubleZeroRepeats];

    const isInTier2 = tier2Patterns.some((pattern) => pattern(num));
    if (!isInTier2) {
      return 3;
    }
  }

  // Tier 4: Палиндромы XYYX
  if (isPalindrome(num)) {
    return 4;
  }

  // Tier 5: Трёшки
  if (
    isTripleStep(num) ||
    isTripleXXXY(num) ||
    isTripleYXXX(num) ||
    isTripleXYXX(num) ||
    isTripleXXYX(num)
  ) {
    return 5;
  }

  // Tier 6: Двойные репиты и репиты
  if (isDoubleRepeatStep(num) || isDoubleRepeatXXYY(num) || isRepeatXYXY(num)) {
    return 6;
  }

  // Tier 7: Года
  if (isYear(num)) {
    return 7;
  }

  // Tier 8: Двойные ступеньки
  if (isDoubleStep(num)) {
    return 8;
  }

  // Не классифицировано
  return 0;
}

// Функция для чтения CSV файла
function readCSV(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n").filter((line) => line.trim());

    const domains = [];
    for (let i = 1; i < lines.length; i++) {
      // Пропускаем заголовок
      const line = lines[i];
      const match = line.match(/^"([^"]+)","([^"]+)"$/);
      if (match) {
        domains.push({
          domain: match[1],
          clean: match[2],
        });
      }
    }

    return domains;
  } catch (error) {
    console.error(`Ошибка чтения файла ${filePath}:`, error.message);
    return [];
  }
}

// Функция для записи результатов в CSV
function writeCSV(filePath, domains, tier) {
  try {
    let csvContent = "domain,clean_domain,tier\n";

    domains.forEach((item) => {
      csvContent += `"${item.domain}","${item.clean}",${tier}\n`;
    });

    fs.writeFileSync(filePath, csvContent);
    console.log(
      `Сохранено ${domains.length} доменов в ${filePath} (Tier ${tier})`
    );
  } catch (error) {
    console.error(`Ошибка записи файла ${filePath}:`, error.message);
  }
}

// Функция для группировки доменов по Tier-ам
function groupDomainsByTier(domains) {
  const tiers = {
    1: [], // Repdigits
    2: [], // Special patterns
    3: [], // First hundred
    4: [], // Palindromes
    5: [], // Triples
    6: [], // Double repeats
    7: [], // Years
    8: [], // Double steps
    0: [], // Other
  };

  const classified = new Set(); // Для отслеживания уже классифицированных

  domains.forEach((item) => {
    const tier = classifyDomain(item.clean);

    // Проверяем, не классифицирован ли уже этот домен
    if (!classified.has(item.clean)) {
      tiers[tier].push(item);
      classified.add(item.clean);
    } else {
      console.warn(
        `Домен ${item.clean} уже классифицирован, пропускаем дубликат`
      );
    }
  });

  return tiers;
}

// Основная функция
function main() {
  console.log("=== Классификация 4-значных доменов по Tier-ам ===");
  console.log("Чтение входного файла...");

  // Читаем домены из CSV
  const domains = readCSV(CONFIG.INPUT_FILE);

  if (domains.length === 0) {
    console.error("Не удалось загрузить домены из файла");
    return;
  }

  console.log(`Загружено ${domains.length} доменов`);
  console.log("Начинаем классификацию...");

  // Группируем домены по Tier-ам
  const tiers = groupDomainsByTier(domains);

  // Выводим статистику
  console.log("\n=== Статистика классификации ===");
  let totalClassified = 0;

  for (let tier = 1; tier <= 8; tier++) {
    const count = tiers[tier].length;
    totalClassified += count;
    console.log(`Tier ${tier}: ${count} доменов`);
  }

  console.log(`Other (не классифицировано): ${tiers[0].length} доменов`);
  console.log(`Всего классифицировано: ${totalClassified} доменов`);
  console.log(`Всего в исходном файле: ${domains.length} доменов`);

  // Сохраняем результаты по Tier-ам
  console.log("\n=== Сохранение результатов ===");

  for (let tier = 1; tier <= 8; tier++) {
    if (tiers[tier].length > 0) {
      const outputFile = `${CONFIG.OUTPUT_PREFIX}${CONFIG.TIER_FILES[tier]}`;
      writeCSV(outputFile, tiers[tier], tier);
    }
  }

  // Сохраняем неклассифицированные домены
  if (tiers[0].length > 0) {
    const outputFile = `${CONFIG.OUTPUT_PREFIX}${CONFIG.TIER_FILES.OTHER}`;
    writeCSV(outputFile, tiers[0], 0);
  }

  // Создаем сводный файл
  console.log("\n=== Создание сводного файла ===");
  createSummaryFile(tiers, domains.length);

  console.log("\n=== Готово! ===");
  console.log(
    "Результаты сохранены в файлах с префиксом:",
    CONFIG.OUTPUT_PREFIX
  );
}

// Функция для создания сводного файла
function createSummaryFile(tiers, totalDomains) {
  try {
    let summaryContent = "Tier,Количество доменов,Процент от общего\n";

    for (let tier = 1; tier <= 8; tier++) {
      const count = tiers[tier].length;
      const percentage = ((count / totalDomains) * 100).toFixed(2);
      summaryContent += `${tier},${count},${percentage}%\n`;
    }

    const otherCount = tiers[0].length;
    const otherPercentage = ((otherCount / totalDomains) * 100).toFixed(2);
    summaryContent += `Other,${otherCount},${otherPercentage}%\n`;
    summaryContent += `Total,${totalDomains},100.00%\n`;

    const summaryFile = `${CONFIG.OUTPUT_PREFIX}summary.csv`;
    fs.writeFileSync(summaryFile, summaryContent);
    console.log(`Сводный файл сохранен: ${summaryFile}`);

    // Также создаем README с описанием
    createReadmeFile(tiers);
  } catch (error) {
    console.error("Ошибка создания сводного файла:", error.message);
  }
}

// Функция для создания README файла
function createReadmeFile(tiers) {
  const readmeContent = `# Классификация 4-значных цифровых доменов

## Описание категорий (Tier-ов)

### Tier 1: Репдигиты
- Паттерн: XXXX (все цифры одинаковые)
- Примеры: 0000, 1111, 2222, ..., 9999
- Всего: 10 доменов
- Найдено: ${tiers[1].length} доменов

### Tier 2: Специальные паттерны
Включает:
1. Первая десятка: 000X (9 шт)
2. Десятки: 00X0 (9 шт)
3. Сотки: 0X00 (9 шт)
4. Тысячники: X000 (9 шт)
5. Круглые репиты: X0X0 (9 шт)
6. Репиты через ноль: 0X0X (9 шт)
7. Два ноля повторяшки: 00XX (9 шт)
8. Повторяшки два ноля: XX00 (9 шт)
9. Ступеньки: 0123,1234...6789, 9876...3210 (14 шт)
- Всего в категории: 86 шт
- Найдено: ${tiers[2].length} доменов

### Tier 3: Первая сотня
- Паттерн: 0012...0098
- Исключения: "Первая десятка", "Десятки" и "Два ноля повторяшки"
- Всего в категории: 72 шт
- Найдено: ${tiers[3].length} доменов

### Tier 4: Палиндромы
- Паттерн: XYYX
- Всего в категории: 90 шт
- Найдено: ${tiers[4].length} доменов

### Tier 5: Трёшки
Включает:
1. Трёшки двойной ступенькой: 1112, 2223...8889, 9998...1110 (17 шт)
2. Трёшки 3-1: XXXY (82 шт)
3. Трёшки 1-3: YXXX (81 шт)
4. Трёшки 1-2: XYXX (81 шт)
5. Трёшки 2-1: XXYX (81 шт)
- Всего в категории: 342 шт
- Найдено: ${tiers[5].length} доменов

### Tier 6: Двойные репиты и репиты
Включает:
1. Двойные репиты ступенькой: 1122...8899, 9988...2211 (16 шт)
   * Исключая 0011, 1100
2. Двойные репиты: XXYY (56 шт)
   * Исключая 00XX, XX00, двойных репитов ступенькой
3. Репиты: XYXY (72 шт)
   * Исключая 0X0X, X0X0
- Всего в категории: 144 шт
- Найдено: ${tiers[6].length} доменов

### Tier 7: Года
- Диапазон: 1970 - 2030
- Исключения: 1999, 2000, 2002, 2010, 2019, 2020, 2021, 2022, 2030
- Всего в категории: 51 шт
- Найдено: ${tiers[7].length} доменов

### Tier 8: Двойные ступеньки
- Паттерн: 0102...0809, 0910, 1213...9899, 9897...1312, 0908...0201
- Исключения: 0001, 1011, 1112, 2223, 3334, 4445, 5556, 6667, 7778, 8889, 9998, 8887, 7776, 6665, 5554, 4443, 3332, 2221, 1211, 1110, 0100
- Всего в категории: 175 шт
- Найдено: ${tiers[8].length} доменов

### Other: Не классифицировано
- Домены, не попавшие ни в одну из вышеперечисленных категорий
- Найдено: ${tiers[0].length} доменов

## Примечания
1. Один и тот же домен НЕ указывается/не дублируется сразу в нескольких категориях
2. Домен всегда попадает в более ТОПовую и дорогую категорию
3. Категории расположены в порядке уменьшения ценности от наиболее дорогой (1) к менее дорогой (8)

## Использование
Запустите скрипт: \`node classify_domains.js\`

Скрипт прочитает файл \`4digit_domains.csv\`, классифицирует домены и сохранит результаты в отдельные CSV файлы для каждого Tier-а.
`;

  const readmeFile = `${CONFIG.OUTPUT_PREFIX}README.md`;
  fs.writeFileSync(readmeFile, readmeContent);
  console.log(`README файл создан: ${readmeFile}`);
}

// Запуск скрипта
if (require.main === module) {
  main();
}

module.exports = {
  classifyDomain,
  readCSV,
  groupDomainsByTier,
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
