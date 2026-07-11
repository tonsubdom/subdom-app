// // update-subdomain-addresses.js
// // Скрипт для обновления адресов субдоменов в базе данных SQLite

// const Database = require("better-sqlite3");

// // Подключаемся к базе данных
// const db = new Database("nft-domains.db");

// // Маппинг ID -> правильные адреса
// const addressMapping = {
//   1: "kQCzsYHG96KRxDC-NRsFK3PAmUwp-vmmebVFpAAyGtd75Vq4",
//   2: "kQD4jlRQJRMIpQzPOacgMk4Zdz1XwnMEiy1EP9NEGwyFA1BS",
//   3: "kQAkmFn17X8Vsh_EoM325iRX65oPEC9S65amXwwh5DNVxzqY",
//   4: "kQB0zKkPaBRsPbnh1uHdQK9D2tEG4qxMgOONMSvK0RJumEZw",
//   5: "kQAalHQD5Icxj_hyRd9kGBQvnEbZPlaPCu57usi0-UE7kOaE",
//   6: "kQA8SOp9djj8w-LcaOL7Ra8H_F18sSFmLwSNgLYH2r17de_l",
//   7: "kQBsCyemOHdjYxaNKp-qFru-6mBJh_fuDehSIv70HOQGmWC-",
//   8: "kQB0BrtmshiapgMN5a_gMXPhFygqAvFw5Yasef1ntZ_Jsmj-",
//   9: "kQCzudYwoNrBmhw_mScS1yFDpc-_FwXfIQTX-orivAK6jXq4",
//   10: "kQC_q9vRPXtVFhUqMMGcfl7cY2Uw475oxclHdwTofaVy01xp",
//   11: "kQAt1eQZ3xZ3IszPzVjCcgFKiO0aqsBXipYiHuXsYc1MWmuk",
//   12: "kQDUNGQmzlTs0OHxt-mmKCUiRrih-9wd3PAWn3-Ds5qkJFaD",
//   13: "kQDRGxVrJ_QCpUyPbkgxswnNh_XFsnfFrYFITSpmRBQR3fNY",
//   14: "kQCuxEyK2Q54LEeGv6LQ6IDmli_ds_65g_CKwJQrhZZS_DUf",
//   15: "kQBsHagejg00E5Q8piziYDVyypC-dTpahU5RJyC8bn3cCPIF",
//   16: "kQCMjZf-HaSpeN8sIdM4dTMqPPXkpi59iUUzE-6zLXh263yY",
//   17: "kQAeLYCLWWxs2mCxfniqvyutXKPDNB6guImYrkuVotC_YEnZ",
//   18: "kQCKrha-F8XWJFpUag0LJ9G_MVEyTDhlfFaccvsSDLZnNt8v",
// };

// console.log("🔄 Начинаем обновление адресов субдоменов...");

// // Сначала посмотрим текущие данные
// console.log("\n📊 Текущие данные субдоменов:");
// const currentData = db
//   .prepare("SELECT id, name, address FROM subdomains WHERE status = ?")
//   .all("claimed");
// currentData.forEach((row) => {
//   console.log(`ID: ${row.id}, Name: ${row.name}, Address: ${row.address}`);
// });

// // Обновляем адреса
// console.log("\n🔄 Обновляем адреса...");
// const updateStmt = db.prepare("UPDATE subdomains SET address = ? WHERE id = ?");

// let updatedCount = 0;
// for (const [id, newAddress] of Object.entries(addressMapping)) {
//   try {
//     const result = updateStmt.run(newAddress, parseInt(id));
//     if (result.changes > 0) {
//       console.log(`✅ Обновлен субдомен ID ${id}: ${newAddress}`);
//       updatedCount++;
//     } else {
//       console.log(`⚠️ Субдомен ID ${id} не найден или не обновлен`);
//     }
//   } catch (error) {
//     console.error(
//       `❌ Ошибка при обновлении субдомена ID ${id}:`,
//       error.message
//     );
//   }
// }

// // Проверяем результат
// console.log("\n✅ Результат обновления:");
// const updatedData = db
//   .prepare(
//     "SELECT id, name, address FROM subdomains WHERE id IN (1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18)"
//   )
//   .all();
// updatedData.forEach((row) => {
//   console.log(`ID: ${row.id}, Name: ${row.name}, Address: ${row.address}`);
// });

// console.log(
//   `\n🎉 Обновлено ${updatedCount} субдоменов из ${
//     Object.keys(addressMapping).length
//   }`
// );

// // Закрываем соединение с базой данных
// db.close();

// console.log("\n✅ Скрипт завершен!");
// console.log("📝 Теперь адреса субдоменов должны быть правильными.");
// console.log("🔗 Ссылки в MarketPage будут работать корректно.");

// update-subdomain-addresses.js
// Скрипт для обновления адресов субдоменов в базе данных SQLite

const Database = require("better-sqlite3");

// Подключаемся к базе данных
const db = new Database("nft-domains.db");

// Маппинг ID -> правильные адреса (обновленные адреса для ID 73-96)
const addressMapping = {
  94: "kQC6-Pre7KLarRKUvV2wImzlJ1N59ZQO5K8OJVX-JVNmBkji",
  93: "kQDdbfV6_fM-uF_U6lQPX7OBqO4M4VfHjaujAPzGP9UGksyW",
  88: "kQAMnI0EuXZ42fBS8_WNxlnBk3emn-OTtwfPKzdJdPQAc2pP",
  87: "kQDPFj10-9G2rnnNC6CCExBcqAP_uoXPot47SHGFut-QQvmA",
  96: "kQB99Hs4tvspn7ae1VGnU7jNMJ6MLrH27Gfo_2uSQI4gYP0j",
  85: "kQA4f9wsYmpYsmLVCSTwUMQj5iovdHsjlNkg4I9O42O7ezda",
  84: "kQAnyS5GC29hkHmFp8UjQEeT_J6ip30OKdS7SBv5YPZLJOMq",
  83: "kQAplQJJga4zMcPzenP4BIfeMegbcIi9uQXhGSDuLIp5WBvp",
  81: "kQCPF629Y2CjhQohceXWDewl0jrtGQ6brSU5ZT_6dbfQVyal",
  78: "kQBtZ_4019_3Ryrb0nIB8cP0EhUwYh3OEw8SrvtJ57Ql9HLR",
  77: "kQD3GEPDkM3xQhP_yEHUukBq_XuGZ8GBdrrlGaVpdaMJpgnA",
  74: "kQCSyjreihx8erTkP9UAB9hETLe_0ryXbEbIWibLGwWPTTIG",
  73: "kQDx41aJEZaOjtegnjy_5AzCxI3v9yiWU3VipoUkd60PD8NN",
};

console.log("🔄 Начинаем обновление адресов субдоменов...");

// Сначала посмотрим текущие данные для указанных ID
console.log("\n📊 Текущие данные субдоменов (ID 73-96):");
const currentData = db
  .prepare(
    "SELECT id, name, address FROM subdomains WHERE id IN (73,74,77,78,81,83,84,85,87,88,93,94,96)"
  )
  .all();

if (currentData.length === 0) {
  console.log(
    "⚠️ Не найдено субдоменов с указанными ID. Проверьте базу данных."
  );
} else {
  currentData.forEach((row) => {
    console.log(`ID: ${row.id}, Name: ${row.name}, Address: ${row.address}`);
  });
}

// Обновляем адреса
console.log("\n🔄 Обновляем адреса...");
const updateStmt = db.prepare("UPDATE subdomains SET address = ? WHERE id = ?");

let updatedCount = 0;
let notFoundCount = 0;
let errorCount = 0;

for (const [id, newAddress] of Object.entries(addressMapping)) {
  try {
    const result = updateStmt.run(newAddress, parseInt(id));
    if (result.changes > 0) {
      console.log(`✅ Обновлен субдомен ID ${id}: ${newAddress}`);
      updatedCount++;
    } else {
      console.log(`⚠️ Субдомен ID ${id} не найден в базе данных`);
      notFoundCount++;
    }
  } catch (error) {
    console.error(
      `❌ Ошибка при обновлении субдомена ID ${id}:`,
      error.message
    );
    errorCount++;
  }
}

// Проверяем результат
console.log("\n✅ Результат обновления:");
const updatedData = db
  .prepare(
    "SELECT id, name, address FROM subdomains WHERE id IN (73,74,77,78,81,83,84,85,87,88,93,94,96)"
  )
  .all();

if (updatedData.length === 0) {
  console.log("⚠️ После обновления не найдено субдоменов с указанными ID.");
} else {
  updatedData.forEach((row) => {
    console.log(`ID: ${row.id}, Name: ${row.name}, Address: ${row.address}`);
  });
}

console.log("\n📊 Статистика обновления:");
console.log(`✅ Успешно обновлено: ${updatedCount}`);
console.log(`⚠️ Не найдено в базе: ${notFoundCount}`);
console.log(`❌ Ошибок при обновлении: ${errorCount}`);
console.log(
  `📋 Всего записей для обновления: ${Object.keys(addressMapping).length}`
);

// Закрываем соединение с базой данных
db.close();

console.log("\n✅ Скрипт завершен!");
console.log("📝 Теперь адреса субдоменов должны быть правильными.");
console.log("🔗 Ссылки в MarketPage будут работать корректно.");
