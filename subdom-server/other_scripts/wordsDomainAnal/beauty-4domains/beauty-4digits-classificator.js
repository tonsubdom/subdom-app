/**
 * Фильтр красивых 4-буквенных слов для Node.js
 *
 * Установите необходимые пакеты:
 * npm install xlsx fs
 *
 * Критерии фильтрации:
 * 1. Палиндромы (слова, которые читаются одинаково слева направо и справа налево)
 * 2. Лесенки (слова с последовательным увеличением или уменьшением букв)
 * 3. 3 одинаковых символа подряд
 * 4. 4 одинаковых символа (все буквы одинаковые)
 */

const XLSX = require("xlsx");
const fs = require("fs");

// Функция для проверки, является ли слово палиндромом
function isPalindrome(word) {
  return word === word.split("").reverse().join("");
}

// Функция для проверки, является ли слово "лесенкой" (последовательное увеличение или уменьшение)
function isStaircase(word) {
  const chars = word.split("");

  // Проверка на возрастающую последовательность
  let isIncreasing = true;
  for (let i = 1; i < chars.length; i++) {
    if (chars[i].charCodeAt(0) !== chars[i - 1].charCodeAt(0) + 1) {
      isIncreasing = false;
      break;
    }
  }

  // Проверка на убывающую последовательность
  let isDecreasing = true;
  for (let i = 1; i < chars.length; i++) {
    if (chars[i].charCodeAt(0) !== chars[i - 1].charCodeAt(0) - 1) {
      isDecreasing = false;
      break;
    }
  }

  return isIncreasing || isDecreasing;
}

// Функция для проверки на 3 одинаковых символа подряд
function hasThreeSameChars(word) {
  for (let i = 0; i <= word.length - 3; i++) {
    if (word[i] === word[i + 1] && word[i] === word[i + 2]) {
      return true;
    }
  }
  return false;
}

// Функция для проверки на 4 одинаковых символа
function hasFourSameChars(word) {
  return word[0] === word[1] && word[0] === word[2] && word[0] === word[3];
}

// Основная функция фильтрации
function filterBeautifulWords(words) {
  return words.filter((word) => {
    // Проверяем, что слово состоит из 4 букв и содержит только буквы
    if (word.length !== 4 || !/^[a-zA-Z]+$/.test(word)) {
      return false;
    }

    // Приводим к нижнему регистру для единообразия
    const lowerWord = word.toLowerCase();

    // Применяем критерии фильтрации
    return (
      isPalindrome(lowerWord) ||
      isStaircase(lowerWord) ||
      hasThreeSameChars(lowerWord) ||
      hasFourSameChars(lowerWord)
    );
  });
}

// Функция для чтения Excel файла
function readExcelFile(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Конвертируем в JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Извлекаем слова из первого столбца
    const words = [];
    for (let i = 0; i < data.length; i++) {
      if (data[i] && data[i][0]) {
        words.push(String(data[i][0]).trim());
      }
    }

    return words;
  } catch (error) {
    console.error("Ошибка при чтении Excel файла:", error);
    return [];
  }
}

// Функция для сохранения результатов в новый Excel файл
function saveToExcel(words, outputPath = "beautiful-4-letter-words.xlsx") {
  try {
    // Создаем данные для записи
    const data = words.map((word) => [word]);

    // Создаем новый workbook и worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([["Beautiful Words"], ...data]);

    // Добавляем worksheet в workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Beautiful Words");

    // Записываем файл
    XLSX.writeFile(workbook, outputPath);

    console.log(`Сохранено ${words.length} слов в файл ${outputPath}`);
    return true;
  } catch (error) {
    console.error("Ошибка при сохранении Excel файла:", error);
    return false;
  }
}

// Функция для сохранения результатов в CSV файл
function saveToCSV(words, outputPath = "beautiful-4-letter-words.csv") {
  try {
    const csvContent = words.join("\n");
    fs.writeFileSync(outputPath, csvContent, "utf8");
    console.log(`Сохранено ${words.length} слов в файл ${outputPath}`);
    return true;
  } catch (error) {
    console.error("Ошибка при сохранении CSV файла:", error);
    return false;
  }
}

// Основная функция обработки
function processWords(inputFile, outputFormat = "excel") {
  console.log("Начало обработки 4-буквенных слов...");

  // Читаем слова из Excel файла
  const words = readExcelFile(inputFile);

  console.log(`Загружено ${words.length} слов из файла ${inputFile}`);

  // Фильтруем слова
  const beautifulWords = filterBeautifulWords(words);

  console.log(`Найдено ${beautifulWords.length} красивых слов`);

  // Сохраняем результат
  let outputFile;
  if (outputFormat === "excel") {
    outputFile = "beautiful-4-letter-words.xlsx";
    saveToExcel(beautifulWords, outputFile);
  } else {
    outputFile = "beautiful-4-letter-words.csv";
    saveToCSV(beautifulWords, outputFile);
  }

  // Дополнительная статистика
  const stats = {
    total: words.length,
    beautiful: beautifulWords.length,
    palindromes: beautifulWords.filter((word) =>
      isPalindrome(word.toLowerCase())
    ).length,
    staircases: beautifulWords.filter((word) => isStaircase(word.toLowerCase()))
      .length,
    threeSame: beautifulWords.filter((word) =>
      hasThreeSameChars(word.toLowerCase())
    ).length,
    fourSame: beautifulWords.filter((word) =>
      hasFourSameChars(word.toLowerCase())
    ).length,
  };

  console.log("\n=== Статистика ===");
  console.log(`Всего слов в исходном файле: ${stats.total}`);
  console.log(
    `Красивых слов найдено: ${stats.beautiful} (${(
      (stats.beautiful / stats.total) *
      100
    ).toFixed(2)}%)`
  );
  console.log("\nРаспределение по типам:");
  console.log(`  • Палиндромы: ${stats.palindromes}`);
  console.log(`  • Лестничные слова: ${stats.staircases}`);
  console.log(`  • С 3 одинаковыми символами: ${stats.threeSame}`);
  console.log(`  • С 4 одинаковыми символами: ${stats.fourSame}`);

  // Выводим примеры каждого типа
  console.log("\n=== Примеры красивых слов ===");

  const examples = {
    palindromes: beautifulWords
      .filter((word) => isPalindrome(word.toLowerCase()))
      .slice(0, 5),
    staircases: beautifulWords
      .filter((word) => isStaircase(word.toLowerCase()))
      .slice(0, 5),
    threeSame: beautifulWords
      .filter((word) => hasThreeSameChars(word.toLowerCase()))
      .slice(0, 5),
    fourSame: beautifulWords
      .filter((word) => hasFourSameChars(word.toLowerCase()))
      .slice(0, 5),
  };

  console.log("Палиндромы:", examples.palindromes.join(", "));
  console.log("Лестничные слова:", examples.staircases.join(", "));
  console.log("С 3 одинаковыми символами:", examples.threeSame.join(", "));
  console.log("С 4 одинаковыми символами:", examples.fourSame.join(", "));

  console.log(`\nРезультат сохранен в файл: ${outputFile}`);
}

// Тестовые примеры
function runTests() {
  console.log("=== Тестирование функций фильтрации ===");

  const testWords = [
    "abba", // палиндром
    "deed", // палиндром
    "abcd", // возрастающая лесенка
    "dcba", // убывающая лесенка
    "aaab", // 3 одинаковых символа
    "bbba", // 3 одинаковых символа
    "aaaa", // 4 одинаковых символа
    "test", // обычное слово
    "word", // обычное слово
    "1234", // не буквы
    "abc", // слишком короткое
    "abcde", // слишком длинное
  ];

  const filtered = filterBeautifulWords(testWords);
  console.log("Тестовые слова:", testWords);
  console.log("Отфильтрованные слова:", filtered);

  // Проверка отдельных функций
  console.log("\nПроверка отдельных функций:");
  console.log('isPalindrome("abba"):', isPalindrome("abba"));
  console.log('isPalindrome("test"):', isPalindrome("test"));
  console.log('isStaircase("abcd"):', isStaircase("abcd"));
  console.log('isStaircase("dcba"):', isStaircase("dcba"));
  console.log('isStaircase("test"):', isStaircase("test"));
  console.log('hasThreeSameChars("aaab"):', hasThreeSameChars("aaab"));
  console.log('hasThreeSameChars("test"):', hasThreeSameChars("test"));
  console.log('hasFourSameChars("aaaa"):', hasFourSameChars("aaaa"));
  console.log('hasFourSameChars("test"):', hasFourSameChars("test"));
}

// Инструкция по использованию
function showUsage() {
  console.log(`
=== Инструкция по использованию ===

1. Установите необходимые пакеты:
   npm install xlsx

2. Поместите ваш Excel файл в ту же папку, что и скрипт

3. Запустите скрипт:
   node filter-words.js available-4-letter.xlsx

4. Для сохранения в CSV формат:
   node filter-words.js available-4-letter.xlsx csv

5. Для запуска тестов:
   node filter-words.js test

Доступные команды:
  • node filter-words.js <input-file> [format] - обработка файла
  • node filter-words.js test - запуск тестов
  • node filter-words.js help - показать эту справку

Форматы вывода:
  • excel (по умолчанию) - сохраняет в Excel файл
  • csv - сохраняет в CSV файл
`);
}

// Обработка аргументов командной строки
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "help") {
    showUsage();
  } else if (args[0] === "test") {
    runTests();
  } else {
    const inputFile = args[0];
    const outputFormat = args[1] || "excel";

    if (!fs.existsSync(inputFile)) {
      console.error(`Ошибка: файл ${inputFile} не найден!`);
      process.exit(1);
    }

    processWords(inputFile, outputFormat);
  }
}

// Экспорт функций для использования в других модулях
module.exports = {
  isPalindrome,
  isStaircase,
  hasThreeSameChars,
  hasFourSameChars,
  filterBeautifulWords,
  readExcelFile,
  saveToExcel,
  saveToCSV,
  processWords,
  runTests,
};
