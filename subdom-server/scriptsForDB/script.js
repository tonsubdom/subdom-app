/**
 * Скрипт для экспорта NFT из коллекции TON DNS в CSV файл
 *
 * Функционал:
 * 1. Получает все NFT с указанного адреса кошелька
 * 2. Фильтрует по целевой коллекции TON DNS
 * 3. Сортирует от коротких к длинным
 * 4. Преобразует punycode формата --xn (если есть)
 * 5. Экспортирует в CSV файл
 */

// Конфигурация
const CONFIG = {
  WALLET_ADDRESS: "EQDZxrPG_fXAtBwOZ6Cwd0kLD0BVh6GwtE6XdyW3fMxc08gH",
  TARGET_COLLECTION: "EQC3dNlesgVD8YbAazcauIrXBPfiVhMMr5YYk2in0Mtsz0Bz",
  TARGET_COLLECTION_RAW:
    "0:b774d95eb20543f186c06b371ab88ad704f7e256130caf96189368a7d0cb6ccf",
  API_URL: "https://tonapi.io/v2", // mainnet
  IS_TESTNET: false,
  API_DELAY: 1000, // задержка между запросами в мс
  LIMIT: 100, // лимит на запрос
};

/**
 * Функция для получения всех NFT с адреса кошелька
 */
async function fetchAllNFTs(walletAddress) {
  let offset = 0;
  let allNFTs = [];

  console.log(`📡 Загружаем NFT с ${CONFIG.API_URL} для ${walletAddress}`);

  try {
    while (true) {
      const url = `${CONFIG.API_URL}/accounts/${walletAddress}/nfts?limit=${CONFIG.LIMIT}&offset=${offset}&indirect_ownership=false`;
      console.log(`Запрос: ${url}`);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.nft_items || data.nft_items.length === 0) {
        console.log("Больше NFT не найдено");
        break;
      }

      console.log(`Получено ${data.nft_items.length} NFT в текущем запросе`);

      // Логируем информацию о первых нескольких NFT для отладки
      if (offset === 0 && data.nft_items.length > 0) {
        console.log("Пример NFT (первый в списке):", {
          address: data.nft_items[0].address,
          collection: data.nft_items[0].collection,
          title: data.nft_items[0].title,
          dns: data.nft_items[0].dns,
          metadata: data.nft_items[0].metadata,
        });
      }

      allNFTs = allNFTs.concat(data.nft_items);
      offset += CONFIG.LIMIT;

      // Задержка для избежания rate limiting
      await new Promise((resolve) => setTimeout(resolve, CONFIG.API_DELAY));
    }

    console.log(`✅ Всего загружено ${allNFTs.length} NFT`);
    return allNFTs;
  } catch (error) {
    console.error("❌ Ошибка загрузки NFT:", error);
    throw error;
  }
}

/**
 * Функция для фильтрации NFT по коллекции
 */
function filterNFTsByCollection(nfts, targetCollection) {
  console.log(`🔍 Фильтруем NFT по коллекции: ${targetCollection}`);

  const filteredNFTs = nfts.filter((nft) => {
    // Проверяем оба формата адреса коллекции
    const collectionAddress = nft.collection?.address;
    if (!collectionAddress) return false;

    // Сравниваем с целевой коллекцией (оба формата)
    return (
      collectionAddress === targetCollection ||
      collectionAddress === CONFIG.TARGET_COLLECTION_RAW
    );
  });

  console.log(`✅ Найдено ${filteredNFTs.length} NFT в целевой коллекции`);
  return filteredNFTs;
}

/**
 * Функция для извлечения DNS имени из NFT
 */
function extractDNSName(nft) {
  // Пробуем разные способы извлечения DNS имени
  let dnsName = "";

  // 1. Прямое поле dns
  if (nft.dns) {
    dnsName = nft.dns;
  }
  // 2. Из metadata
  else if (nft.metadata && nft.metadata.name) {
    dnsName = nft.metadata.name;
  }
  // 3. Из поля name в metadata
  else if (nft.metadata && nft.metadata.dns) {
    dnsName = nft.metadata.dns;
  }
  // 4. Из поля title
  else if (nft.title) {
    dnsName = nft.title;
  }

  return dnsName;
}

/**
 * Функция для преобразования punycode формата --xn
 */
function decodePunycodeIfNeeded(dnsName) {
  if (!dnsName) return dnsName;

  // Проверяем, содержит ли имя префикс --xn (punycode)
  if (dnsName.startsWith("--xn--")) {
    try {
      // Убираем префикс --xn--
      const punycodePart = dnsName.substring(6);
      // Используем встроенный decodeURIComponent для декодирования
      // Punycode обычно представлен в виде xn--xxxx
      const decoded = decodeURIComponent(punycodePart);
      return decoded;
    } catch (error) {
      console.warn(`Не удалось декодировать punycode: ${dnsName}`, error);
      return dnsName;
    }
  }

  return dnsName;
}

/**
 * Функция для сортировки NFT по длине DNS имени (от коротких к длинным)
 */
function sortNFTsByDNSLength(nfts) {
  return nfts.sort((a, b) => {
    const dnsA = extractDNSName(a);
    const dnsB = extractDNSName(b);

    const lengthA = dnsA ? dnsA.length : 0;
    const lengthB = dnsB ? dnsB.length : 0;

    return lengthA - lengthB;
  });
}

/**
 * Функция для преобразования данных в CSV формат
 */
function convertToCSV(nfts) {
  console.log("📊 Подготавливаем данные для CSV...");

  // Заголовки CSV
  const headers = [
    "№",
    "NFT Адрес",
    "DNS Имя",
    "DNS Имя (декодированное)",
    "Длина имени",
    "Коллекция",
    "Metadata URL",
    "Image URL",
  ];

  // Данные
  const rows = nfts.map((nft, index) => {
    const dnsName = extractDNSName(nft);
    const decodedDNSName = decodePunycodeIfNeeded(dnsName);
    const dnsLength = dnsName ? dnsName.length : 0;

    // Получаем URL изображения
    let imageUrl = "";
    if (nft.previews && nft.previews.length > 0) {
      imageUrl = nft.previews[0].url || "";
    } else if (nft.metadata && nft.metadata.image) {
      imageUrl = nft.metadata.image;
    }

    // Получаем URL metadata
    let metadataUrl = "";
    if (nft.metadata && nft.metadata.uri) {
      metadataUrl = nft.metadata.uri;
    }

    return [
      index + 1,
      nft.address || "",
      dnsName || "",
      decodedDNSName || "",
      dnsLength,
      nft.collection?.address || "",
      metadataUrl,
      imageUrl,
    ];
  });

  // Создаем CSV строку
  let csvContent = headers.join(",") + "\n";

  rows.forEach((row) => {
    // Экранируем значения (особенно запятые и кавычки)
    const escapedRow = row.map((value) => {
      if (typeof value === "string") {
        // Если строка содержит запятые, кавычки или переносы строк, заключаем в кавычки
        if (
          value.includes(",") ||
          value.includes('"') ||
          value.includes("\n")
        ) {
          return '"' + value.replace(/"/g, '""') + '"';
        }
        return value;
      }
      return value;
    });

    csvContent += escapedRow.join(",") + "\n";
  });

  console.log(`✅ CSV подготовлен: ${rows.length} строк`);
  return csvContent;
}

/**
 * Функция для скачивания CSV файла
 */
function downloadCSV(csvContent, filename = "ton-dns-nfts.csv") {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);

  console.log(`💾 Файл ${filename} успешно скачан`);
}

/**
 * Основная функция выполнения скрипта
 */
async function main() {
  console.log("🚀 Запуск скрипта экспорта NFT TON DNS...");
  console.log("Конфигурация:", CONFIG);

  try {
    // 1. Получаем все NFT с кошелька
    const allNFTs = await fetchAllNFTs(CONFIG.WALLET_ADDRESS);

    // 2. Фильтруем по целевой коллекции
    const filteredNFTs = filterNFTsByCollection(
      allNFTs,
      CONFIG.TARGET_COLLECTION
    );

    if (filteredNFTs.length === 0) {
      console.log("❌ NFT в целевой коллекции не найдены");
      return;
    }

    // 3. Сортируем от коротких к длинным
    const sortedNFTs = sortNFTsByDNSLength(filteredNFTs);

    // 4. Выводим информацию о найденных NFT
    console.log("\n📋 Найденные NFT TON DNS:");
    sortedNFTs.forEach((nft, index) => {
      const dnsName = extractDNSName(nft);
      const decodedDNSName = decodePunycodeIfNeeded(dnsName);

      console.log(
        `${index + 1}. ${dnsName || "Без имени"} (${
          decodedDNSName !== dnsName
            ? "декодировано: " + decodedDNSName
            : "без декодирования"
        })`
      );
    });

    // 5. Конвертируем в CSV
    const csvContent = convertToCSV(sortedNFTs);

    // 6. Скачиваем CSV файл
    downloadCSV(csvContent);

    console.log("\n✅ Скрипт успешно выполнен!");
    console.log(`📊 Экспортировано ${sortedNFTs.length} NFT`);
  } catch (error) {
    console.error("❌ Критическая ошибка выполнения скрипта:", error);
  }
}

/**
 * Альтернативная версия для использования в Node.js
 */
async function mainNodeJS() {
  console.log("🚀 Запуск скрипта для Node.js...");

  // Для Node.js потребуется установить node-fetch
  // npm install node-fetch

  const fetch = (await import("node-fetch")).default;
  const fs = require("fs");

  try {
    const allNFTs = await fetchAllNFTs(CONFIG.WALLET_ADDRESS);
    const filteredNFTs = filterNFTsByCollection(
      allNFTs,
      CONFIG.TARGET_COLLECTION
    );

    if (filteredNFTs.length === 0) {
      console.log("❌ NFT в целевой коллекции не найдены");
      return;
    }

    const sortedNFTs = sortNFTsByDNSLength(filteredNFTs);
    const csvContent = convertToCSV(sortedNFTs);

    // Сохраняем в файл
    const filename = "ton-dns-nfts.csv";
    fs.writeFileSync(filename, csvContent, "utf-8");

    console.log(`✅ Файл ${filename} успешно сохранен`);
    console.log(`📊 Экспортировано ${sortedNFTs.length} NFT`);
  } catch (error) {
    console.error("❌ Ошибка:", error);
  }
}

// Проверяем, в какой среде выполняется скрипт
if (typeof window !== "undefined" && window.document) {
  // Браузерная среда
  console.log("🌐 Обнаружена браузерная среда");

  // Создаем кнопку для запуска скрипта
  const button = document.createElement("button");
  button.textContent = "🚀 Экспортировать NFT TON DNS";
  button.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    background: linear-gradient(135deg, #007bff, #0056b3);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    z-index: 10000;
    box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
    transition: all 0.3s ease;
  `;

  button.onmouseover = () => {
    button.style.transform = "translateY(-2px)";
    button.style.boxShadow = "0 6px 20px rgba(0, 123, 255, 0.4)";
  };

  button.onmouseout = () => {
    button.style.transform = "translateY(0)";
    button.style.boxShadow = "0 4px 15px rgba(0, 123, 255, 0.3)";
  };

  button.onclick = main;

  document.body.appendChild(button);

  console.log("✅ Кнопка экспорта добавлена на страницу");
  console.log("👉 Нажмите кнопку в правом верхнем углу для запуска экспорта");
} else {
  // Node.js среда
  console.log("🖥️ Обнаружена Node.js среда");
  console.log("Для запуска выполните: node script.js");
  console.log("Убедитесь, что установлен node-fetch: npm install node-fetch");

  // Экспортируем функции для использования в Node.js
  module.exports = {
    fetchAllNFTs,
    filterNFTsByCollection,
    sortNFTsByDNSLength,
    convertToCSV,
    main: mainNodeJS,
  };
}
