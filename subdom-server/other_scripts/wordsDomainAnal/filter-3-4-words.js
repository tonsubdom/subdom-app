/**
 * Скрипт для фильтрации общего словаря на 3-значные и 4-значные слова
 *
 * Использование:
 * 1. Поместите файл words.txt в папку проекта
 * 2. Запустите: node filterWords.js
 * 3. Получите файлы: 3-letter-words.txt и 4-letter-words.txt
 */

const fs = require("fs");
const path = require("path");

class WordFilter {
  constructor() {
    this.threeLetterWords = new Set();
    this.fourLetterWords = new Set();
    this.stats = {
      totalLines: 0,
      threeLetterCount: 0,
      fourLetterCount: 0,
      skippedLines: 0,
    };
  }

  /**
   * Проверяет, является ли строка допустимым словом
   * @param {string} word - слово для проверки
   * @returns {boolean}
   */
  isValidWord(word) {
    // Проверяем, что слово состоит только из букв (латиница)
    return /^[a-zA-Z]+$/.test(word);
  }

  /**
   * Фильтрует слова по длине
   * @param {string} word - слово для фильтрации
   */
  filterWord(word) {
    const cleanWord = word.trim().toLowerCase();

    if (!this.isValidWord(cleanWord)) {
      this.stats.skippedLines++;
      return;
    }

    const length = cleanWord.length;

    if (length === 3) {
      this.threeLetterWords.add(cleanWord);
      this.stats.threeLetterCount++;
    } else if (length === 4) {
      this.fourLetterWords.add(cleanWord);
      this.stats.fourLetterCount++;
    }
  }

  /**
   * Загружает и фильтрует слова из файла
   * @param {string} filePath - путь к файлу со словами
   */
  async loadAndFilter(filePath) {
    try {
      console.log(`Загрузка файла: ${filePath}`);

      const data = fs.readFileSync(filePath, "utf8");
      const lines = data.split("\n");

      this.stats.totalLines = lines.length;
      console.log(`Всего строк в файле: ${this.stats.totalLines}`);

      // Фильтруем слова
      console.log("Фильтрация слов...");
      for (const line of lines) {
        this.filterWord(line);
      }

      console.log("Фильтрация завершена!");
      this.printStats();

      return true;
    } catch (error) {
      console.error(`Ошибка при загрузке файла: ${error.message}`);
      return false;
    }
  }

  /**
   * Выводит статистику
   */
  printStats() {
    console.log("\n=== СТАТИСТИКА ===");
    console.log(`Всего строк обработано: ${this.stats.totalLines}`);
    console.log(`3-значных слов найдено: ${this.stats.threeLetterCount}`);
    console.log(`4-значных слов найдено: ${this.stats.fourLetterCount}`);
    console.log(`Строк пропущено (невалидные): ${this.stats.skippedLines}`);
    console.log(`Уникальных 3-значных слов: ${this.threeLetterWords.size}`);
    console.log(`Уникальных 4-значных слов: ${this.fourLetterWords.size}`);
  }

  /**
   * Сохраняет отфильтрованные слова в файлы
   */
  saveFilteredWords() {
    try {
      // Сортируем слова по алфавиту
      const sortedThreeLetter = Array.from(this.threeLetterWords).sort();
      const sortedFourLetter = Array.from(this.fourLetterWords).sort();

      // Сохраняем 3-значные слова
      const threeLetterContent = sortedThreeLetter.join("\n");
      fs.writeFileSync("3-letter-words.txt", threeLetterContent, "utf8");
      console.log(
        `Файл сохранен: 3-letter-words.txt (${sortedThreeLetter.length} слов)`
      );

      // Сохраняем 4-значные слова
      const fourLetterContent = sortedFourLetter.join("\n");
      fs.writeFileSync("4-letter-words.txt", fourLetterContent, "utf8");
      console.log(
        `Файл сохранен: 4-letter-words.txt (${sortedFourLetter.length} слов)`
      );

      // Создаем файл с примерами для проверки
      this.createSampleFile(sortedThreeLetter, sortedFourLetter);

      return true;
    } catch (error) {
      console.error(`Ошибка при сохранении файлов: ${error.message}`);
      return false;
    }
  }

  /**
   * Создает файл с примерами для проверки
   * @param {Array} threeLetter - 3-значные слова
   * @param {Array} fourLetter - 4-значные слова
   */
  createSampleFile(threeLetter, fourLetter) {
    try {
      const sampleContent = `# Примеры отфильтрованных слов
# Создано: ${new Date().toISOString()}

## 3-значные слова (первые 50 из ${threeLetter.length}):
${threeLetter.slice(0, 50).join(", ")}

## 4-значные слова (первые 50 из ${fourLetter.length}):
${fourLetter.slice(0, 50).join(", ")}

## Статистика:
- Всего 3-значных слов: ${threeLetter.length}
- Всего 4-значных слов: ${fourLetter.length}
- Всего уникальных слов: ${threeLetter.length + fourLetter.length}

Файлы готовы для использования в скрипте анализа доменов.`;

      fs.writeFileSync("filtered-words-sample.txt", sampleContent, "utf8");
      console.log(`Файл с примерами создан: filtered-words-sample.txt`);
    } catch (error) {
      console.error(`Ошибка при создании файла с примерами: ${error.message}`);
    }
  }

  /**
   * Основной метод запуска
   */
  async run() {
    console.log("=== ФИЛЬТРАЦИЯ СЛОВАРЯ ===\n");

    const inputFile = "words.txt";

    // Проверяем существование файла
    if (!fs.existsSync(inputFile)) {
      console.error(`Файл ${inputFile} не найден!`);
      console.log("Поместите файл words.txt в текущую директорию.");
      return;
    }

    // Загружаем и фильтруем
    const success = await this.loadAndFilter(inputFile);

    if (success) {
      // Сохраняем результаты
      this.saveFilteredWords();

      console.log("\n=== ФИЛЬТРАЦИЯ ЗАВЕРШЕНА ===");
      console.log("Созданы файлы:");
      console.log("- 3-letter-words.txt - для 3-значных слов");
      console.log("- 4-letter-words.txt - для 4-значных слов");
      console.log("- filtered-words-sample.txt - примеры для проверки");

      console.log(
        "\nТеперь вы можете использовать эти файлы в скрипте анализа доменов."
      );
    }
  }
}

// Вспомогательная функция для быстрой проверки файла
function checkFileInfo() {
  const inputFile = "words.txt";

  if (!fs.existsSync(inputFile)) {
    console.log(`Файл ${inputFile} не найден.`);
    return;
  }

  try {
    const stats = fs.statSync(inputFile);
    const fileSize = (stats.size / 1024 / 1024).toFixed(2); // в MB

    // Читаем первые 5 строк для примера
    const data = fs.readFileSync(inputFile, "utf8");
    const lines = data.split("\n");
    const sampleLines = lines
      .slice(0, 5)
      .map((line, i) => `${i + 1}. "${line.trim()}"`)
      .join("\n");

    console.log(`Информация о файле ${inputFile}:`);
    console.log(`Размер: ${fileSize} MB`);
    console.log(`Примеры первых 5 строк:\n${sampleLines}`);
  } catch (error) {
    console.error(`Ошибка при проверке файла: ${error.message}`);
  }
}

// Основная функция
async function main() {
  const filter = new WordFilter();
  await filter.run();
}

// Запуск скрипта
if (require.main === module) {
  // Проверяем аргументы командной строки
  if (process.argv.includes("--check")) {
    checkFileInfo();
  } else {
    main().catch(console.error);
  }
}

module.exports = WordFilter;
