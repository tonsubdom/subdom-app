/**
 * Скрипт для анализа свободных 4-значных словесных доменов
 *
 * Установка зависимостей:
 * npm install xlsx fs path
 *
 * Использование:
 * 1. Поместите Excel файл с доменами в папку проекта
 * 2. Скачайте готовые словари (см. инструкцию ниже)
 * 3. Запустите: node domainAnalyzer.js
 */

const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

class DomainAnalyzer {
  constructor() {
    this.occupiedDomains = new Set();
    this.fourLetterWords = new Set();
    this.threeLetterWordsS = new Set();
    this.availableDomains = [];
  }

  /**
   * Загружает Excel файл и извлекает домены
   * @param {string} filePath - путь к Excel файлу
   */
  loadExcelFile(filePath) {
    try {
      console.log(`Загрузка Excel файла: ${filePath}`);

      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Конвертируем в JSON
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Извлекаем домены из второго столбца (индекс 1)
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row && row[1]) {
          const domain = row[1].toString().trim().toLowerCase();
          this.occupiedDomains.add(domain);
        }
      }

      console.log(`Загружено ${this.occupiedDomains.size} занятых доменов`);
      return true;
    } catch (error) {
      console.error(`Ошибка при загрузке Excel файла: ${error.message}`);
      return false;
    }
  }

  /**
   * Загружает словарь 4-значных слов
   * @param {string} filePath - путь к файлу словаря
   */
  loadFourLetterDictionary(filePath) {
    try {
      console.log(`Загрузка словаря 4-значных слов: ${filePath}`);

      const content = fs.readFileSync(filePath, "utf8");
      const words = content
        .split("\n")
        .map((word) => word.trim().toLowerCase())
        .filter((word) => word.length === 4 && /^[a-z]+$/.test(word));

      words.forEach((word) => this.fourLetterWords.add(word));

      console.log(`Загружено ${this.fourLetterWords.size} 4-значных слов`);
      return true;
    } catch (error) {
      console.error(
        `Ошибка при загрузке словаря 4-значных слов: ${error.message}`
      );
      return false;
    }
  }

  /**
   * Загружает словарь 3-значных слов и добавляет 's' на конце
   * @param {string} filePath - путь к файлу словаря
   */
  loadThreeLetterDictionary(filePath) {
    try {
      console.log(`Загрузка словаря 3-значных слов: ${filePath}`);

      const content = fs.readFileSync(filePath, "utf8");
      const words = content
        .split("\n")
        .map((word) => word.trim().toLowerCase())
        .filter((word) => word.length === 3 && /^[a-z]+$/.test(word))
        .map((word) => word + "s"); // Добавляем 's' на конце

      words.forEach((word) => this.threeLetterWordsS.add(word));

      console.log(
        `Загружено ${this.threeLetterWordsS.size} 3-значных слов с 's' на конце`
      );
      return true;
    } catch (error) {
      console.error(
        `Ошибка при загрузке словаря 3-значных слов: ${error.message}`
      );
      return false;
    }
  }

  /**
   * Проверяет, является ли домен 4-значным словесным
   * @param {string} domain - домен для проверки
   * @returns {boolean}
   */
  isFourLetterWordDomain(domain) {
    return (
      domain.length === 4 && /^[a-z]+$/.test(domain) && !/^\d+$/.test(domain)
    ); // не только цифры
  }

  /**
   * Находит свободные домены
   */
  findAvailableDomains() {
    console.log("Поиск свободных доменов...");

    // Объединяем все слова из словарей
    const allWords = new Set([
      ...this.fourLetterWords,
      ...this.threeLetterWordsS,
    ]);

    // Фильтруем свободные домены
    this.availableDomains = Array.from(allWords)
      .filter((word) => !this.occupiedDomains.has(word))
      .sort();

    console.log(`Найдено ${this.availableDomains.length} свободных доменов`);

    // Разделяем на категории
    const fourLetterAvailable = this.availableDomains.filter(
      (word) => word.length === 4 && !word.endsWith("s")
    );
    const threeLetterSAvailable = this.availableDomains.filter((word) =>
      word.endsWith("s")
    );

    console.log(`- 4-значные слова: ${fourLetterAvailable.length}`);
    console.log(`- 3-значные слова с 's': ${threeLetterSAvailable.length}`);

    return {
      all: this.availableDomains,
      fourLetter: fourLetterAvailable,
      threeLetterS: threeLetterSAvailable,
    };
  }

  /**
   * Сохраняет результаты в Excel файл
   * @param {string} outputPath - путь для сохранения
   * @param {Array} domains - список доменов
   */
  saveToExcel(outputPath, domains) {
    try {
      console.log(`Сохранение результатов в: ${outputPath}`);

      // Создаем данные для Excel
      const data = [
        ["Домен", "Тип", "Длина", "Особенности", "Ценность"],
        ...domains.map((domain) => [
          domain,
          domain.endsWith("s") ? "3-значное + s" : "4-значное",
          domain.length,
          domain.endsWith("s") ? "3 буквы + s" : "4 буквы",
          domain.endsWith("s") ? "ВЫСОКАЯ" : "Средняя",
        ]),
      ];

      // Создаем рабочую книгу
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Свободные домены");

      // Настраиваем ширину колонок
      const colWidths = [
        { wch: 15 }, // Домен
        { wch: 15 }, // Тип
        { wch: 10 }, // Длина
        { wch: 15 }, // Особенности
        { wch: 12 }, // Ценность
      ];
      worksheet["!cols"] = colWidths;

      // Сохраняем файл
      XLSX.writeFile(workbook, outputPath);

      console.log(`Файл успешно сохранен: ${outputPath}`);
      return true;
    } catch (error) {
      console.error(`Ошибка при сохранении Excel файла: ${error.message}`);
      return false;
    }
  }

  /**
   * Основной метод запуска анализа
   */
  async analyze() {
    console.log("=== АНАЛИЗ СВОБОДНЫХ ДОМЕНОВ ===\n");

    // Загружаем данные
    const excelLoaded = this.loadExcelFile("domains.xlsx");
    const dict4Loaded = this.loadFourLetterDictionary("4-letter-words.txt");
    const dict3Loaded = this.loadThreeLetterDictionary("3-letter-words.txt");

    if (!excelLoaded || !dict4Loaded || !dict3Loaded) {
      console.error("Не удалось загрузить все необходимые файлы");
      return;
    }

    // Находим свободные домены
    const results = this.findAvailableDomains();

    // Сохраняем результаты
    this.saveToExcel("available-domains.xlsx", results.all);

    // Дополнительные файлы по категориям
    this.saveToExcel("available-4-letter.xlsx", results.fourLetter);
    this.saveToExcel("available-3-letter-s.xlsx", results.threeLetterS);

    console.log("\n=== АНАЛИЗ ЗАВЕРШЕН ===");
    console.log(`Итого найдено: ${results.all.length} свободных доменов`);
    console.log(`Файлы сохранены в текущей директории`);
  }
}

// Основная функция
async function main() {
  const analyzer = new DomainAnalyzer();
  await analyzer.analyze();
}

// Запуск скрипта
if (require.main === module) {
  main().catch(console.error);
}

module.exports = DomainAnalyzer;
