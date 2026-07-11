// Тестовый скрипт для проверки конвертации NFT оберток

// Имитация данных из API
const apiResponse = {
  nft_items: [
    {
      address:
        "0:EC7B2908489322C07A8F3551D819D427DD55B90563A029CF00ABC041A62ECEF8",
      init: true,
      index:
        "7368264465125312681588784845758168870683177630017315254516669363916867756428",
      collection_address:
        "0:CB5877BFF6DF7699CCCF5A31D99D778491B6C99FB5EBBEDEB4F373CA7F1D341B",
      owner_address:
        "0:36F50914175FB02D4402BB955869D339A8F7C519D4E9CEB0BB08F48967B12D58",
      content: {
        uri: "https://api.subdom.zone/api/v1/proxy/metadata/ton/discovery",
      },
      last_transaction_lt: "45145946000007",
      code_hash: "aj3FhPvT0VV48/bfAa68n4FEhEcWcpKnymAwE6o4hFo=",
      data_hash: "jDynN+QGfVIGB0mSgxkTwPNezxtYELrHxU2JbfYThNc=",
      collection: {
        address:
          "0:CB5877BFF6DF7699CCCF5A31D99D778491B6C99FB5EBBEDEB4F373CA7F1D341B",
        owner_address:
          "0:2CBB9DE88C03A6448AA4263B5230FAF2AAE330FA1C75329F21A9D2270CB7B5A8",
        last_transaction_lt: "45189026000003",
        next_item_index: "-1",
        collection_content: {
          uri: "https://api.subdom.zone/api/v1/proxy/metadata/ton",
        },
        data_hash: "7pJBe/i78dtzKdrzJ3M74UR7MshhrD5Eb2KDA8FltwQ=",
        code_hash: "OgHQNsQTEUsUycNlOvM90utMWUneDnyFfI6gIFIIe4M=",
      },
      on_sale: false,
    },
  ],
  metadata: {
    "0:EC7B2908489322C07A8F3551D819D427DD55B90563A029CF00ABC041A62ECEF8": {
      is_indexed: true,
      token_info: [
        {
          valid: true,
          type: "nft_items",
          name: "Proxy discovery ton domain",
          description:
            "Proxy discovery ton domain - Security proxy granting limited access to the main domain",
          image:
            "https://api.subdom.zone/api/v1/proxy/metadata/ton/discovery.png",
          nft_index:
            "7368264465125312681588784845758168870683177630017315254516669363916867756428",
          extra: {
            uri: "https://api.subdom.zone/api/v1/proxy/metadata/ton/discovery",
          },
        },
      ],
    },
  },
};

// Упрощенный классификатор
class SubdomainClassifier {
  constructor(isTestnet) {
    this.isTestnet = isTestnet;
  }

  getItemType(item) {
    // Хеш NFT wrapper из конфига
    const NFT_WRAPPER_HASH = "aj3FhPvT0VV48/bfAa68n4FEhEcWcpKnymAwE6o4hFo=";

    if (item.code_hash === NFT_WRAPPER_HASH) {
      return "nft_wrapper";
    }
    return "unknown";
  }
}

// Функция для извлечения длины зоны и субдомена
const extractLengths = (name) => {
  if (!name || name === "") {
    return { zoneLength: 0, subdomainLength: 0 };
  }

  const parts = name.split(".");
  let subdomainLength = 0;
  let zoneLength = 0;

  if (parts.length >= 2) {
    subdomainLength = parts[0].length;
    zoneLength = parts.slice(1).join(".").length;
  } else if (parts.length === 1) {
    subdomainLength = parts[0].length;
    zoneLength = 0;
  }

  return { zoneLength, subdomainLength };
};

// Исправленная функция convertToSimpleEnrichedItems
const convertToSimpleEnrichedItems = (items, metadata, isTestnet) => {
  console.log("🔄 Конвертация в SimpleEnrichedItems");
  console.log(
    `📊 Итемов: ${items.length}, Метаданных: ${Object.keys(metadata).length}`
  );

  const classifier = new SubdomainClassifier(isTestnet);

  return items.map((item) => {
    // Определяем тип
    const type = classifier.getItemType(item);

    // Получаем метаданные для этого адреса
    const itemMetadata = metadata[item.address] || {};

    // Извлекаем домен
    let domain = "";

    if (type === "nft_wrapper") {
      // Для NFT оберток: извлекаем домен из token_info.name
      const tokenInfo = itemMetadata.token_info?.[0];
      if (tokenInfo?.name) {
        // Формат имени: "Proxy discovery ton domain"
        // Извлекаем последние слова как домен
        const nameParts = tokenInfo.name.split(" ");
        if (nameParts.length >= 3) {
          // Берем последние 2 слова и соединяем через точку
          const lastTwoWords = nameParts.slice(-2);
          domain = lastTwoWords.join(".").toLowerCase();
        } else {
          domain = tokenInfo.name.toLowerCase().replace(/ /g, ".");
        }
      }
    }

    // Если домен не найден, используем адрес
    if (!domain) {
      domain = `item-${item.address.slice(0, 8)}`;
    }

    // Создаем обогащенный итем
    const enrichedItem = {
      address: item.address,
      collection_address: item.collection_address,
      owner_address: item.owner_address,
      domain: domain,
      type: type,
      metadata: itemMetadata, // ВАЖНО: сохраняем полные метаданные!
      on_sale: item.on_sale || false,
      lastUpdated: new Date().toISOString(),
    };

    console.log(`✅ Конвертирован ${type}:`, {
      address: enrichedItem.address,
      domain: enrichedItem.domain,
      hasMetadata: !!enrichedItem.metadata,
      hasTokenInfo: !!enrichedItem.metadata?.token_info,
      tokenInfoName: enrichedItem.metadata?.token_info?.[0]?.name,
      tokenInfoImage: enrichedItem.metadata?.token_info?.[0]?.image,
    });

    return enrichedItem;
  });
};

// Исправленная функция convertToMarketItem
const convertToMarketItem = (item, isTestnet) => {
  console.log("\n🔄 Конвертация SimpleEnrichedItem в MarketItem");

  // Получаем token_info из metadata
  const tokenInfo = item.metadata?.token_info?.[0] || {};

  console.log("📊 Token info:", {
    hasTokenInfo: !!tokenInfo,
    name: tokenInfo.name,
    image: tokenInfo.image,
    description: tokenInfo.description,
  });

  const { zoneLength, subdomainLength } = extractLengths(item.domain);

  // Определяем тип для отображения
  let itemType =
    item.type === "nft_wrapper" ? "nft_wrapper" : "proxy_subdomain";

  // Определяем статус
  const status = item.on_sale ? "On Sale" : "Claimed";

  // Определяем цену
  let mintPrice = "0 TON";

  // Разделяем домен на субдомен и зону
  const parts = item.domain.split(".");
  let subdomainName = "";
  let zoneName = "";

  if (parts.length >= 2) {
    subdomainName = parts[0];
    zoneName = parts.slice(1).join(".");
  } else {
    subdomainName = item.domain;
    zoneName = "ton"; // Для NFT оберток используем 'ton' как зону
  }

  // Получаем URL для изображения
  let imgUri;

  // 1. Для NFT оберток: используем image из token_info
  if (itemType === "nft_wrapper" && tokenInfo.image) {
    imgUri = tokenInfo.image;
    console.log("✅ Изображение из token_info:", imgUri);
  }
  // 2. Fallback: цветной placeholder
  else {
    const addressHash = item.address
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = addressHash % 360;
    imgUri = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 140 140"><rect width="140" height="140" fill="hsl(${hue}, 70%, 50%)"/><text x="70" y="70" font-family="Arial" font-size="14" fill="white" text-anchor="middle" dy=".3em">${
      itemType === "nft_wrapper" ? "NFT" : "DOM"
    }</text></svg>`;
    console.log("🎨 Используем placeholder");
  }

  // Получаем имя
  let name = tokenInfo.name || item.domain || "Без названия";

  // Для NFT оберток: используем имя из token_info
  if (itemType === "nft_wrapper" && tokenInfo.name) {
    name = tokenInfo.name;
  }

  const result = {
    id: item.address,
    name: name,
    owner: item.owner_address || undefined,
    mintPrice,
    zoneName,
    subdomainName,
    imgUri,
    registrationDate: item.lastUpdated || new Date().toISOString(),
    status,
    zoneLength,
    subdomainLength,
    hasLink: !!(item.collection_address && item.address),
    type: itemType,
    address: item.address,
    collection_address: item.collection_address,
    metadata: item.metadata,
  };

  console.log(`✅ MarketItem создан (${itemType}):`, {
    name: result.name,
    hasImage: !!result.imgUri,
    zone: result.zoneName,
    subdomain: result.subdomainName,
    imgUri: result.imgUri,
  });

  return result;
};

// Тестирование
console.log("🧪 Начало тестирования конвертации NFT оберток\n");

// Шаг 1: Конвертация в SimpleEnrichedItem
const items = apiResponse.nft_items;
const metadata = apiResponse.metadata;
const enrichedItems = convertToSimpleEnrichedItems(items, metadata, true);

console.log("\n---\n");

// Шаг 2: Конвертация в MarketItem
const marketItems = enrichedItems.map((item) =>
  convertToMarketItem(item, true)
);

console.log("\n---\n");

// Шаг 3: Проверка результатов
console.log("🎯 Итоговые результаты:");
marketItems.forEach((item, index) => {
  console.log(`\n${index + 1}. ${item.name}`);
  console.log(`   Тип: ${item.type}`);
  console.log(`   Домен: ${item.subdomainName}.${item.zoneName}`);
  console.log(`   Изображение: ${item.imgUri}`);
  console.log(`   Владелец: ${item.owner}`);
  console.log(`   Статус: ${item.status}`);
  console.log(`   Метаданные: ${item.metadata ? "Есть" : "Нет"}`);
  console.log(`   Token info: ${item.metadata?.token_info ? "Есть" : "Нет"}`);
});

console.log("\n✅ Тестирование завершено");
