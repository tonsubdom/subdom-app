// ESM шим для tweetnacl
import nacl from "tweetnacl";

export default nacl;

// Именованные экспорты для совместимости
export const secretbox = nacl.secretbox;
export const box = nacl.box;
export const sign = nacl.sign;
export const hash = nacl.hash;
export const verify = nacl.verify;
export const randomBytes = nacl.randomBytes;
