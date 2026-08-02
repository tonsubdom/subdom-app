// subdom-server/scripts/migrate-whitelist.ts
//
// Одноразовый скрипт: альфа-вайтлист (см. tma/src/utils/whitelistUtils.ts,
// mainnetWhitelistMap) тестировал платформу ещё когда доступ был закрыт —
// в благодарность выдаём им сразу ВСЕ попытки (Proxy+SBT, все 6 длин
// каждого), а не одну случайную, как обычным новым юзерам. Сам гейт снят
// отдельно (checkWhitelist теперь всегда true) — это не гейт, а разовая
// миграция этих конкретных людей в полноценных юзеров с полным доступом.
//
// Запуск (на сервере, где реально лежит nft-domains-mainnet.db):
//   npx ts-node scripts/migrate-whitelist.ts
//
// Безопасно запускать повторно — только повышает false->true, никогда не
// понижает то, что юзер уже мог honestly купить/получить раньше.

import Database from 'better-sqlite3';
import path from 'path';
import { Address } from '@ton/core';

const DB_PATH = path.join(__dirname, '..', 'nft-domains-mainnet.db');

// Те же raw-адреса, что в tma/src/utils/whitelistUtils.ts (mainnetWhitelistMap).
const RAW_ADDRESSES = [
  "0:99fc1ed733507a6520b12dc8e21958fcf174b68b7101bb0238847fef07e0602c",
  "0:2e64d1df9cfc93de48198b614b012219f86d016bc1584902257f9f85b7096680",
  "0:1cd302ea7613d26d33b267f4d0f4cd47b4f8465b1c98109c33f312213bb9faab",
  "0:2248a5c3ac64cd31a7786199a4158607ec659e1f8b2705de4887e67945edcc2d",
  "0:48672055fc53d527d16be0c07b3a85edca91990dd79a2dd0335772cc291d3ad9",
  "0:00265680beee48f012604e1b3847095b38f4620dafdfdff6510da4f20ff3bd19",
  "0:e1ff31f72472514c6925f689b3d19dd1a0e7e4b0b0b3e8ee701727e0a5de1fd1",
  "0:01251f453b76c87b0d385b61eafc1fa9984b4a682bbefa4ef8a48f83fa2d2d54",
  "0:647a32822285c70e0cbe73acd2c326d3fa32541e1300a4f30a9c0f97c2b840cb",
  "0:0db724e226e5a0a3971376b565ce94f38580f71de837b2c3e87805b674cdafea",
  "0:a3af954178b19386e3649e8cc59237135fa10a7f9b7d215446a749e5971d3612",
  "0:167dbaa2a3aefec96e2229a4ab67130f15fcc70fc4051967fe04d504b6e25175",
  "0:1f00019339e0d0a100fbb145d137510527498c05b78c9b3370044bd3c7e7aeba",
  "0:36da3a83a03ff0c6348b5af8ca4af56d9a3af197e940dc18ca8d3724c0e46b81",
  "0:4759b85b9d52b6fdbe7f84fe9f3fdcc8617c99eaef2e1da8e5fd4e348d6ba262",
  "0:098507db36d99a5a9628815a28e7db25a71c3c60bbf71e5bb138e3cf1c78549c",
  "0:26ef43bc56ba49a5a50c761df786ee9490fb39ddc40124326180a72fcd4ccbb1",
  "0:026c50942fcd25d4fa3872a872199545f369978b1dec8fba9d6fb954e68eb8e1",
  "0:42a008400b72e15fc6eddae0d65091ea4169399fef3bfcebb53702ee028d0ae2",
  "0:723ebbb4af129886eb78eb041fa5404eec4c695b6b7497e5b5ed612fe0c4f168",
  "0:f0f29bbd8a1ebe326de561375588d58944fdd05444851ed08cfd215aee343220",
  "0:83ae019a23a8162beaa5cb0ebdc56668b2eac6c6ba51808812915b206a152dc5",
  "0:ed69c9a0b2b8dcaae6ce6f053d14bb9608cc4c0ae7030ce117da39632d92ee6c",
  "0:0d4678b49c9412c36fa6172da5853b2e64282388f4f250c0b7e01047974bdf20",
  "0:ff7ca7f7414778d9315deac52bcd2436d39b462900a157315553cd77aa01a94b",
  "0:4344149e59a35350a2ba5c9bde060cc39763c9a1ce77ef06b1fbadd3dacdb4e4",
  "0:038e776a244a4997203b0cfadbfb3b01beefc0fd46a084d04b255e0858bb4d99",
  "0:474c955948409c9d2ddf81ccf4ad448de6b13c18492ce47dc223b59f3dd67f9b",
  "0:85b1573c32727a3f053a2e2f04157d6fa65cdcd1fe06444b7d52cc8a35277146",
  "0:d4e26cd9935ec8f42d5a4218c35680f65dc5eb7f7995acf1fa6073fbb3c4d415",
  "0:d2afa0c4479c68bfb8830ccbb49d676ee606e72b634f0edcf9d8349ff091e8f3",
  "0:e943613cc02b06e8e56aff90775660a4743f2046b8f5db8be1fb9ae1dda2947c",
  "0:656a36632702a953f409f7ea1fbe996f04566b910edd07c4f4e2d24a469926a6",
  "0:76f53413a83e6df92c48dfaf524490e1b0f7f07a5464af4e78e9a26a0c84d7f2",
  "0:8873c9c956f0323a97243c8db816c831f48708dc1b46a3cd67ea222a5d4d1ab2",
  "0:70cc04fa918c12a6f0b0a993f79f4eaba57b703d931ae206b5e9df03c972937f",
  "0:3f79f5e19f7922de53159299660a07c448c6bd92829d49e1e303a1a6b9fabd37",
  "0:91257b3e0eb645719c94e8961a2cb15c551a11ccd4969cb4b4c0bfde6a671a08",
  "0:e9184734f979544bf46c652c5c43746fab438b883890b43ff648ad8a171368de",
  "0:457343e6b34f59703309aaa111f99ab57b8b37969adba1e6dbb125e8fbbcf365",
  "0:7fe758085ffda574a853cf7a47b17218a9ec3f7e157c219ef2886cd46daba3c8",
  "0:871fac731a75fa665294b750d6f0a0ab1df93c642f1ff840b0f3c9b3c044c3e7",
  "0:f84feca8cba5ef45eab0fd84bcf53e325804432764945eeb892a6e0623f9bdb2",
  "0:12d1d750ecc0c4b39beb13e57536c44a3fe65f18c761326d5ccb5bb7cbaa07c5",
  "0:3b2a1a130a51bd411ec3c0dd5118091621153474da7f47c17ad79cb93e210640",
  "0:a390efc2b1170734b182a7c6e848db86bad7a0884f88961a77a24182baac8473",
  "0:231cec49ebeb350554e901f1de53cd4cf7e3ddf3113f156830f3a7c025fa8451",
  "0:b5521abd6b37c764ef773a982a0f5edacafae1b0cf4a8932b4620d3521388b1b",
  "0:62485bcb0eb67b52d9baae64b2ebc224f0ae6361cac088aefa45a03a6b7b100a",
];

const FULL_ACCESS = { proxy: { 4: true, 5: true, 6: true, 7: true, 8: true, 9: true }, sbt: { 4: true, 5: true, 6: true, 7: true, 8: true, 9: true } };
const FULL_ATTEMPTS = { proxy: { 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1 }, sbt: { 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1 } };

function main() {
  const db = new Database(DB_PATH);
  console.log(`📂 База: ${DB_PATH}`);
  console.log(`🎁 Мигрирую ${RAW_ADDRESSES.length} адресов из альфа-вайтлиста...\n`);

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const raw of RAW_ADDRESSES) {
    let friendlyAddress: string;
    try {
      // bounceable:false — сверено вживую с реальной БД (users.address там
      // хранится как "UQ...", не "EQ...").
      friendlyAddress = Address.parse(raw).toString({ bounceable: false, testOnly: false });
    } catch (e) {
      console.error(`❌ Некорректный адрес: ${raw}`);
      failed++;
      continue;
    }

    try {
      const existing = db.prepare('SELECT * FROM users WHERE address = ?').get(friendlyAddress) as any;

      if (existing) {
        const currentAccess = JSON.parse(existing.nftAccessAmount || '{}');
        const currentAttempts = JSON.parse(existing.totalPaidAttempts || '{}');
        const mergedAccess: any = { proxy: { ...currentAccess.proxy }, sbt: { ...currentAccess.sbt } };
        const mergedAttempts: any = { proxy: { ...currentAttempts.proxy }, sbt: { ...currentAttempts.sbt } };

        (['proxy', 'sbt'] as const).forEach((type) => {
          [4, 5, 6, 7, 8, 9].forEach((length) => {
            if (!mergedAccess[type]?.[length]) {
              mergedAttempts[type][length] = (mergedAttempts[type][length] || 0) + 1;
            }
            mergedAccess[type][length] = true;
          });
        });

        db.prepare(`UPDATE users SET nftAccessAmount = ?, totalPaidAttempts = ?, updatedAt = CURRENT_TIMESTAMP WHERE address = ?`)
          .run(JSON.stringify(mergedAccess), JSON.stringify(mergedAttempts), friendlyAddress);

        console.log(`🔄 Обновлён: ${friendlyAddress}`);
        updated++;
      } else {
        db.prepare(`
          INSERT INTO users (
            address, name, domains, zones, subdomains,
            proxyZones, sbtZones, proxySubdomains, sbtSubdomains,
            nftAccessAmount, totalPaidAttempts,
            totalZoneSpending, totalSubdomainSpending,
            totalProxyZoneSpending, totalSbtZoneSpending,
            totalProxySubdomainSpending, totalSbtSubdomainSpending,
            totalProfit
          )
          VALUES (?, NULL, 0, 0, 0, 0, 0, 0, 0, ?, ?, 0, 0, 0, 0, 0, 0, 0)
        `).run(friendlyAddress, JSON.stringify(FULL_ACCESS), JSON.stringify(FULL_ATTEMPTS));

        console.log(`✨ Создан: ${friendlyAddress}`);
        created++;
      }
    } catch (e: any) {
      console.error(`❌ Ошибка для ${friendlyAddress}:`, e?.message || e);
      failed++;
    }
  }

  console.log(`\n✅ Готово. Создано: ${created}, обновлено: ${updated}, ошибок: ${failed}`);
  db.close();
}

main();
