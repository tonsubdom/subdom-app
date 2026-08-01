// subdom-server/src/utils/tonProof.ts
//
// TonConnect ton_proof verification — admin-only login. Ported from the
// official reference (ton-connect/demo-dapp-with-react-ui,
// src/server/services/ton-proof-service.ts), simplified: we only ever
// authenticate ONE fixed address (PLATFORM_OWNER_*), which is always
// already deployed on-chain — so instead of parsing state_init and
// matching against known wallet-contract codes (the reference's fallback
// path for not-yet-deployed wallets), we fetch the public key directly via
// the standard get_public_key get-method, the same runGetMethod pattern
// already used in tma/src/services/ownerMetaService.ts.
//
// Message format (TON Connect spec, address-proof-signature ton_proof):
//   message = "ton-proof-item-v2/" ++ workchain(4B BE) ++ address_hash(32B)
//             ++ domain_len(4B LE) ++ domain ++ timestamp(8B LE) ++ payload
//   signature = Ed25519Sign(privkey, sha256(0xffff ++ "ton-connect" ++ sha256(message)))

import crypto from 'crypto';
import { sign as nacl } from 'tweetnacl';
import { Address } from '@ton/core';

const TON_PROOF_PREFIX = 'ton-proof-item-v2/';
const TON_CONNECT_PREFIX = 'ton-connect';
const VALID_AUTH_TIME_SEC = 15 * 60; // 15 минут, как в референсе
const PAYLOAD_TTL_MS = 10 * 60 * 1000; // 10 минут на подпись payload'а

export interface TonProofPayload {
  timestamp: number;
  domain: { lengthBytes: number; value: string };
  payload: string;
  signature: string; // base64
}

export interface CheckProofRequest {
  address: string; // raw "0:hex"
  network: 'mainnet' | 'testnet';
  proof: TonProofPayload;
}

// Одноразовые payload'ы, которые сами выдали — in-memory достаточно (короткий
// TTL, один админ, не переживает рестарт бэкенда намеренно — рестарт просто
// потребует новый payload, это ок для админ-логина).
const issuedPayloads = new Map<string, number>(); // payload -> expiresAt

export function generatePayload(): string {
  const payload = crypto.randomBytes(32).toString('hex');
  issuedPayloads.set(payload, Date.now() + PAYLOAD_TTL_MS);
  // Заодно чистим протухшие — карта не растёт бесконечно.
  for (const [key, expiresAt] of issuedPayloads) {
    if (expiresAt < Date.now()) issuedPayloads.delete(key);
  }
  return payload;
}

function consumePayload(payload: string): boolean {
  const expiresAt = issuedPayloads.get(payload);
  if (!expiresAt || expiresAt < Date.now()) return false;
  issuedPayloads.delete(payload); // одноразовый — использованный сразу выбрасываем
  return true;
}

/** get_public_key на dns_item-подобном get-методе кошелька — тот же REST-вызов toncenter, что и в ownerMetaService.ts на фронте. */
async function fetchWalletPublicKey(rawAddress: string, isTestnet: boolean): Promise<Buffer | null> {
  const apiUrl = isTestnet
    ? 'https://testnet.toncenter.com/api/v3/runGetMethod'
    : 'https://toncenter.com/api/v3/runGetMethod';

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: rawAddress,
        method: 'get_public_key',
        stack: [],
      }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as any;
    const entry = data?.stack?.[0];
    if (!entry) return null;
    // toncenter отдаёт int как decimal-строку в hex-обёртке ('num'/'int') —
    // публичный ключ приходит как большое число, конвертируем в 32 байта BE.
    const raw: string = entry.value ?? entry[1];
    if (!raw) return null;
    const asBigInt = raw.startsWith('0x') ? BigInt(raw) : BigInt(raw);
    const hex = asBigInt.toString(16).padStart(64, '0');
    return Buffer.from(hex, 'hex');
  } catch {
    return null;
  }
}

function sha256(data: Buffer): Buffer {
  return crypto.createHash('sha256').update(data).digest();
}

/**
 * Проверяет ton_proof и что адрес — это ровно ожидаемый platformOwner.
 * Не доверяет ничему из тела запроса, кроме как для построения проверяемого
 * сообщения — публичный ключ всегда берётся с ончейна по адресу, а не из
 * тела запроса.
 */
export async function verifyAdminProof(
  body: CheckProofRequest,
  expectedOwnerRaw: string,
  appDomain: string
): Promise<boolean> {
  try {
    const address = Address.parse(body.address);
    const normalizedRaw = `${address.workChain}:${address.hash.toString('hex')}`;
    if (normalizedRaw !== expectedOwnerRaw.toLowerCase()) return false;

    if (body.proof.domain.value !== appDomain) return false;

    const now = Math.floor(Date.now() / 1000);
    if (now - VALID_AUTH_TIME_SEC > body.proof.timestamp) return false;

    if (!consumePayload(body.proof.payload)) return false;

    const isTestnet = body.network === 'testnet';
    const publicKey = await fetchWalletPublicKey(normalizedRaw, isTestnet);
    if (!publicKey) return false;

    const wc = Buffer.alloc(4);
    wc.writeUInt32BE(address.workChain >>> 0, 0);

    const ts = Buffer.alloc(8);
    ts.writeBigUInt64LE(BigInt(body.proof.timestamp), 0);

    const dl = Buffer.alloc(4);
    dl.writeUInt32LE(body.proof.domain.lengthBytes, 0);

    const msg = Buffer.concat([
      Buffer.from(TON_PROOF_PREFIX),
      wc,
      address.hash,
      dl,
      Buffer.from(body.proof.domain.value),
      ts,
      Buffer.from(body.proof.payload),
    ]);

    const msgHash = sha256(msg);
    const fullMsg = Buffer.concat([Buffer.from([0xff, 0xff]), Buffer.from(TON_CONNECT_PREFIX), msgHash]);
    const finalHash = sha256(fullMsg);

    const signature = Buffer.from(body.proof.signature, 'base64');
    return nacl.detached.verify(finalHash, signature, publicKey);
  } catch {
    return false;
  }
}
