// Правильный ESM шим для tweetnacl-util
import { Buffer } from "buffer";

// Именованные экспорты
export function encodeBase64(arr) {
  return Buffer.from(arr).toString("base64");
}

export function decodeBase64(s) {
  return new Uint8Array(Buffer.from(s, "base64"));
}

export function encodeUTF8(arr) {
  return Buffer.from(arr).toString("utf8");
}

export function decodeUTF8(s) {
  return new Uint8Array(Buffer.from(s, "utf8"));
}

// Экспорт по умолчанию для совместимости
export default {
  encodeBase64,
  decodeBase64,
  encodeUTF8,
  decodeUTF8,
};
