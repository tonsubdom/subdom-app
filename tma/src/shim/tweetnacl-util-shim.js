// src/shim/tweetnacl-util-shim.js
// Правильный shim для tweetnacl-util который решает проблему с default экспортом

import { Buffer } from "buffer";

// Создаем объект с функциями как в оригинальной библиотеке
const tweetnaclUtil = {
  encodeBase64: function (arr) {
    return Buffer.from(arr).toString("base64");
  },

  decodeBase64: function (s) {
    return new Uint8Array(Buffer.from(s, "base64"));
  },

  encodeUTF8: function (arr) {
    return Buffer.from(arr).toString("utf8");
  },

  decodeUTF8: function (s) {
    return new Uint8Array(Buffer.from(s, "utf8"));
  },
};

// Экспортируем как именованные экспорты
export const encodeBase64 = tweetnaclUtil.encodeBase64;
export const decodeBase64 = tweetnaclUtil.decodeBase64;
export const encodeUTF8 = tweetnaclUtil.encodeUTF8;
export const decodeUTF8 = tweetnaclUtil.decodeUTF8;

// Экспортируем как default для ES модулей
export default tweetnaclUtil;

// Для CommonJS совместимости
if (typeof module !== "undefined" && module.exports) {
  module.exports = tweetnaclUtil;
  module.exports.encodeBase64 = encodeBase64;
  module.exports.decodeBase64 = decodeBase64;
  module.exports.encodeUTF8 = encodeUTF8;
  module.exports.decodeUTF8 = decodeUTF8;
  module.exports.default = tweetnaclUtil;
}
