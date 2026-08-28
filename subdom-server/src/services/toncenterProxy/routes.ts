/**
 * subdom-server/src/services/toncenterProxy/routes.ts
 *
 * Прозрачный прокси на toncenter — единственная причина существования:
 * ключ toncenter больше не должен покидать сервер. Раньше VITE_TONCENTER_API_KEY
 * шёл прямо в клиентский бандл (решение сессии 2026-07-31, оправдано тем, что
 * минт не должен зависеть от аптайма бэкенда) — но 2026-08-29 юзер поймал
 * реальную утечку: кто-то скопировал ключ из логов клиента и дёргал toncenter
 * напрямую, что и вызывало 429 даже при отсутствии реальной нагрузки от юзеров
 * приложения. Это чтения (runGetMethod/nft/dns и т.д.), не минт-транзакции —
 * значит проксировать их через бэкенд не нарушает исходный принцип
 * "минт не зависит от аптайма бэкенда".
 *
 * Путь один-в-один повторяет оригинальный toncenter REST API после сегмента
 * сети: /api/toncenter-proxy/<mainnet|testnet>/api/v{2,3}/<метод> — поэтому
 * на фронте достаточно заменить хост в URL, ничего больше не переписывать.
 */

import { Router, Request, Response } from 'express';

const router = Router();

const UPSTREAM_HOSTS: Record<string, string> = {
  mainnet: 'https://toncenter.com',
  testnet: 'https://testnet.toncenter.com',
};

router.all('/:network/api/*', async (req: Request, res: Response) => {
  const upstreamHost = UPSTREAM_HOSTS[req.params.network as string];
  if (!upstreamHost) {
    res.status(400).json({ success: false, error: 'unknown network, expected mainnet or testnet' });
    return;
  }

  const apiKey = process.env.TONCENTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ success: false, error: 'TONCENTER_API_KEY не настроен на сервере' });
    return;
  }

  const restPath = (req.params as unknown as Record<string, string>)['0'];
  const url = new URL(`${upstreamHost}/api/${restPath}`);
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'api_key') continue; // клиентский ключ (если есть, из старых кэшей) игнорируем — подставляем свой
    if (typeof value === 'string') url.searchParams.append(key, value);
  }
  url.searchParams.set('api_key', apiKey);

  const isBodyless = req.method === 'GET' || req.method === 'HEAD';

  try {
    const upstreamRes = await fetch(url.toString(), {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: isBodyless ? undefined : JSON.stringify(req.body ?? {}),
    });

    const text = await upstreamRes.text();
    res.status(upstreamRes.status);
    res.type(upstreamRes.headers.get('content-type') || 'application/json');
    res.send(text);
  } catch (error) {
    console.error('[toncenterProxy] upstream request failed:', error);
    res.status(502).json({ success: false, error: 'toncenter upstream request failed' });
  }
});

export default router;
