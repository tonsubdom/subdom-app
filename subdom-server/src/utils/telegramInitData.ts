// Проверка Telegram Mini App initData (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)
// — единственный способ доверенно узнать chat_id юзера внутри Mini App без
// отдельного TonProof-челленджа: подпись считается секретным ключом,
// производным от токена бота, подделать её снаружи нельзя.
import crypto from 'crypto';

export function verifyTelegramInitData(initDataRaw: string, botToken: string): { ok: boolean; userId?: string } {
  try {
    const params = new URLSearchParams(initDataRaw);
    const hash = params.get('hash');
    if (!hash) return { ok: false };
    params.delete('hash');

    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    if (computedHash !== hash) return { ok: false };

    const userRaw = params.get('user');
    if (!userRaw) return { ok: false };
    const user = JSON.parse(userRaw);
    if (!user?.id) return { ok: false };

    return { ok: true, userId: String(user.id) };
  } catch {
    return { ok: false };
  }
}
