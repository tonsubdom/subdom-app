// update-subdomain-addresses.js
// Скрипт для обновления адресов субдоменов в базе данных SQLite

const Database = require("better-sqlite3");

// Подключаемся к базе данных
const db = new Database("nft-domains.db");

// Маппинг ID -> правильные адреса
const addressMapping = {
  1: "kQCzsYHG96KRxDC-NRsFK3PAmUwp-vmmebVFpAAyGtd75Vq4",
  2: "kQD4jlRQJRMIpQzPOacgMk4Zdz1XwnMEiy1EP9NEGwyFA1BS",
  3: "kQAkmFn17X8Vsh_EoM325iRX65oPEC9S65amXwwh5DNVxzqY",
  4: "kQB0zKkPaBRsPbnh1uHdQK9D2tEG4qxMgOONMSvK0RJumEZw",
  5: "kQAalHQD5Icxj_hyRd9kGBQvnEbZPlaPCu57usi0-UE7kOaE",
  6: "kQA8SOp9djj8w-LcaOL7Ra8H_F18sSFmLwSNgLYH2r17de_l",
  7: "kQBsCyemOHdjYxaNKp-qFru-6mBJh_fuDehSIv70HOQGmWC-",
  8: "kQB0BrtmshiapgMN5a_gMXPhFygqAvFw5Yasef1ntZ_Jsmj-",
  9: "kQCzudYwoNrBmhw_mScS1yFDpc-_FwXfIQTX-orivAK6jXq4",
  10: "kQC_q9vRPXtVFhUqMMGcfl7cY2Uw475oxclHdwTofaVy01xp",
  11: "kQAt1eQZ3xZ3IszPzVjCcgFKiO0aqsBXipYiHuXsYc1MWmuk",
  12: "kQDUNGQmzlTs0OHxt-mmKCUiRrih-9wd3PAWn3-Ds5qkJFaD",
  13: "kQDRGxVrJ_QCpUyPbkgxswnNh_XFsnfFrYFITSpmRBQR3fNY",
  14: "kQCuxEyK2Q54LEeGv6LQ6IDmli_ds_65g_CKwJQrhZZS_DUf",
  15: "kQBsHagejg00E5Q8piziYDVyypC-dTpahU5RJyC8bn3cCPIF",
  16: "kQCMjZf-HaSpeN8sIdM4dTMqPPXkpi59iUUzE-6zLXh263yY",
  17: "kQAeLYCLWWxs2mCxfniqvyutXKPDNB6guImYrkuVotC_YEnZ",
  18: "kQCKrha-F8XWJFpUag0LJ9G_MVEyTDhlfFaccvsSDLZnNt8v",
};

console.log("🔄 Начинаем обновление адресов субдоменов...");

// Сначала посмотрим текущие данные
console.log("\n📊 Текущие данные субдоменов:");
const currentData = db
  .prepare("SELECT id, name, address FROM subdomains WHERE status = ?")
  .all("claimed");
currentData.forEach((row) => {
  console.log(`ID: ${row.id}, Name: ${row.name}, Address: ${row.address}`);
});

// Обновляем адреса
console.log("\n🔄 Обновляем адреса...");
const updateStmt = db.prepare("UPDATE subdomains SET address = ? WHERE id = ?");

let updatedCount = 0;
for (const [id, newAddress] of Object.entries(addressMapping)) {
  try {
    const result = updateStmt.run(newAddress, parseInt(id));
    if (result.changes > 0) {
      console.log(`✅ Обновлен субдомен ID ${id}: ${newAddress}`);
      updatedCount++;
    } else {
      console.log(`⚠️ Субдомен ID ${id} не найден или не обновлен`);
    }
  } catch (error) {
    console.error(
      `❌ Ошибка при обновлении субдомена ID ${id}:`,
      error.message
    );
  }
}

// Проверяем результат
console.log("\n✅ Результат обновления:");
const updatedData = db
  .prepare(
    "SELECT id, name, address FROM subdomains WHERE id IN (1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18)"
  )
  .all();
updatedData.forEach((row) => {
  console.log(`ID: ${row.id}, Name: ${row.name}, Address: ${row.address}`);
});

console.log(
  `\n🎉 Обновлено ${updatedCount} субдоменов из ${
    Object.keys(addressMapping).length
  }`
);

// Закрываем соединение с базой данных
db.close();

console.log("\n✅ Скрипт завершен!");
console.log("📝 Теперь адреса субдоменов должны быть правильными.");
console.log("🔗 Ссылки в MarketPage будут работать корректно.");
