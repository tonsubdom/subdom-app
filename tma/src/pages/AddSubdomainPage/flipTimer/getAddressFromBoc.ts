import { Cell} from "ton-core";

/**
 * Парсит B64-кодированный адрес в строковое представление
 * @param b64Address - B64-кодированный адрес (например: "te6cckEBAQEAJAAAQ4AK5JczOaYrPrGIRAvCMsxNYLp8IJq4vg1xJO7PohMB9rDru6wp")
 * @param bounceable - Если true, адрес будет в формате EQ..., если false - UQ... (по умолчанию false)
 * @returns Строковое представление адреса или null, если ошибка при парсинге
 */
export function parseB64Address(b64Address: string, bounceable: boolean = false): string | null {
  try {
    // 1. Десериализуем BOC в ячейку
    const cells = Cell.fromBoc(Buffer.from(b64Address, "base64"));
    if (cells.length === 0) {
      console.warn("No cells found in BOC data");
      return null;
    }

    // 2. Получаем первую ячейку
    const cell = cells[0];

    // 3. Начинаем парсинг ячейки
    const slice = cell.beginParse();

    // 4. Загружаем адрес из слайса
    const address = slice.loadAddress();

    if (!address) {
      console.warn("Address not found in BOC data");
      return null;
    }

    // 5. Преобразуем адрес в строку с указанным форматом
    // bounceable: true  → EQ... (bounceable address)
    // bounceable: false → UQ... (non-bounceable address)
    return address.toString({ bounceable });
  } catch (error) {
    console.error("Error parsing B64 address:", error);
    return null;
  }
}

// Примеры использования:
// const b64Address = "te6cckEBAQEAJAAAQ4AK5JczOaYrPrGIRAvCMsxNYLp8IJq4vg1xJO7PohMB9rDru6wp";

// Non-bounceable формат (UQ...)
// const nonBounceableAddress = parseB64Address(b64Address, false);
// console.log("Non-bounceable:", nonBounceableAddress); // UQBXJLmZzTFZ9YxCIF4RlmJrBdPhBNXF8GuJJ3Z9EJgPtVDf

// Bounceable формат (EQ...)
// const bounceableAddress = parseB64Address(b64Address, true);
// console.log("Bounceable:", bounceableAddress); // EQBXJLmZzTFZ9YxCIF4RlmJrBdPhBNXF8GuJJ3Z9EJgPtRKN

// По умолчанию (non-bounceable)
// const defaultAddress = parseB64Address(b64Address);
// console.log("Default:", defaultAddress); // UQBXJLmZzTFZ9YxCIF4RlmJrBdPhBNXF8GuJJ3Z9EJgPtVDf