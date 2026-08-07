// tma/src/utils/domainPunycode.ts
//
// Юзер вводит и видит домен/субдомен в юникоде (кириллица, китайский и
// т.д.), ончейн уходит punycode (xn--...) — как и любой другой TON DNS
// клиент. Инпуты больше не режут non-ASCII символы на onChange — вместо
// этого лейбл кодируется в punycode непосредственно перед отправкой
// транзакции/payload-запроса, и декодируется обратно при отображении.
//
// Каждый лейбл домена (часть между точками) кодируется/декодируется
// отдельно — punycode.toASCII/toUnicode для полного "a.b.c" применяют ACE
// только к лейблам, которые уже похожи на punycode или содержат non-ASCII,
// но per-label control надёжнее и понятнее для отладки.
import punycode from 'punycode';

// Пользовательский ввод при создании зоны/субдомена — один лейбл (без точек),
// разрешаем буквы (любой юникод-скрипт), цифры, дефис. Пробелы/спецсимволы
// (в т.ч. потенциально опасные для HTML-интерполяции в уведомлениях бота)
// по-прежнему отфильтровываются.
export function sanitizeDomainLabelInput(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}-]/gu, '');
}

// Punycode-кодирование одного лейбла перед отправкой ончейн. Лейблы, уже
// состоящие только из ASCII (в т.ч. уже закодированные xn--), возвращаются
// как есть — toASCII идемпотентен для чистого ASCII.
export function encodeDomainLabel(label: string): string {
  if (!label) return label;
  try {
    return punycode.toASCII(label);
  } catch {
    return label;
  }
}

// Обратное преобразование для отображения: xn--... -> юникод. Для лейблов,
// не являющихся punycode (обычный ASCII-ввод старых доменов), возвращает
// вход без изменений — toUnicode тоже идемпотентен.
export function decodeDomainLabel(label: string): string {
  if (!label) return label;
  try {
    return punycode.toUnicode(label);
  } catch {
    return label;
  }
}

// Полное доменное имя ("sub.zone.ton") — декодирует каждый лейбл отдельно,
// не трогая структуру точек.
export function decodeDomainForDisplay(fullName: string): string {
  if (!fullName) return fullName;
  return fullName.split('.').map(decodeDomainLabel).join('.');
}

// И обратное — на случай, если где-то нужно закодировать уже полное имя
// целиком (а не один лейбл на инпуте).
export function encodeDomainForChain(fullName: string): string {
  if (!fullName) return fullName;
  return fullName.split('.').map(encodeDomainLabel).join('.');
}
