// subdom-server/src/utils/adminAuth.ts
//
// JWT-сессия для админ-панели, выдаётся после успешной проверки ton_proof
// (см. tonProof.ts). Токен живёт 1 час (осознанный выбор юзера — жёстче,
// чем стандартные 24ч из референса, чаще перезаходить кошельком).

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET;
const TOKEN_TTL = '1h';

export interface AdminTokenPayload {
  address: string; // raw "0:hex", всегда platformOwner на момент выдачи
  network: 'mainnet' | 'testnet';
}

function getSecret(): string {
  if (!JWT_SECRET) {
    throw new Error('ADMIN_JWT_SECRET не задан в окружении — admin-авторизация недоступна');
  }
  return JWT_SECRET;
}

export function createAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: TOKEN_TTL });
}

export interface AuthedRequest extends Request {
  admin?: AdminTokenPayload;
}

/** Вешается на все чувствительные CRUD-ручки — без валидного токена 401. */
export function requireAdminAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  if (!token) {
    res.status(401).json({ error: 'Admin auth required' });
    return;
  }
  try {
    const payload = jwt.verify(token, getSecret()) as AdminTokenPayload;
    const expectedOwner =
      payload.network === 'testnet'
        ? process.env.PLATFORM_OWNER_TESTNET
        : process.env.PLATFORM_OWNER_MAINNET;
    if (!expectedOwner || payload.address.toLowerCase() !== expectedOwner.toLowerCase()) {
      res.status(403).json({ error: 'Not platform owner' });
      return;
    }
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired admin token' });
  }
}
