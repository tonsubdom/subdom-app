
// /src/pages/AddSubdomainPage/flipTimer/indexByDNSName.ts
import { beginCell } from "ton-core";

/**
 * Конвертирует DNS имя в индекс
 * @param dnsItemName - Название домена (например: "minter.ton")
 * @returns BigInt индекс домена
 */
export function getDnsItemIndex(dnsItemName: string): bigint {
  // 1. Создаём ячейку и сохраняем строку
  const cell = beginCell().storeStringTail(dnsItemName).endCell();

  // 2. Получаем хэш ячейки (Buffer длиной 32 байта)
  const hash = cell.hash();

  // 3. Преобразуем хэш в BigInt
  const index = BigInt("0x" + hash.toString("hex"));

  return index;
}

// Примеры использования:
// const index = getDnsItemIndex("minter.ton");
// console.log("index:", index.toString());
// console.log("index (bigint):", index);