/**
 * subdom-server/src/services/platformCache/routes.ts
 *
 * Чтение платформенного read-cache (Group 3.3) + приём точечных апсертов
 * сразу после создания зоны/субдомена/обёртки на фронте (не ждать 15-мин
 * цикла кроулера). req.db/req.isTestnet выставляются глобальным
 * networkMiddleware в server-sqlite.ts — этот роутер монтируется после него.
 *
 * Приём апсерта намеренно НЕ строгий — следующий проход кроулера сверяет
 * запись с чейном и правит, если фронт передал что-то не так (см. crawler.ts).
 */

import { Router, Request, Response } from 'express';
import { upsertSinglePlatformEntity } from './crawler';

const router = Router();

router.get('/zones', (req: Request, res: Response) => {
  const { ownerAddress } = req.query;
  const rows = ownerAddress
    ? req.db.prepare('SELECT * FROM platform_zones_cache WHERE ownerAddress = ? ORDER BY lastSyncedAt DESC').all(String(ownerAddress))
    : req.db.prepare('SELECT * FROM platform_zones_cache ORDER BY lastSyncedAt DESC').all();
  res.json({ success: true, data: rows });
});

router.get('/subdomains', (req: Request, res: Response) => {
  const { ownerAddress, collectionAddress } = req.query;
  let sql = 'SELECT * FROM platform_subdomains_cache WHERE 1=1';
  const params: any[] = [];
  if (ownerAddress) {
    sql += ' AND ownerAddress = ?';
    params.push(String(ownerAddress));
  }
  if (collectionAddress) {
    sql += ' AND collectionAddress = ?';
    params.push(String(collectionAddress));
  }
  sql += ' ORDER BY lastSyncedAt DESC';
  const rows = req.db.prepare(sql).all(...params);
  res.json({ success: true, data: rows });
});

router.get('/wrappers', (req: Request, res: Response) => {
  const { ownerAddress } = req.query;
  const rows = ownerAddress
    ? req.db
        .prepare(
          'SELECT * FROM platform_wrappers_cache WHERE wrapperHolderAddress = ? OR dividendOwnerAddress = ? ORDER BY lastSyncedAt DESC'
        )
        .all(String(ownerAddress), String(ownerAddress))
    : req.db.prepare('SELECT * FROM platform_wrappers_cache ORDER BY lastSyncedAt DESC').all();
  res.json({ success: true, data: rows });
});

const REQUIRED_FIELDS: Record<'zone' | 'subdomain' | 'wrapper', string[]> = {
  zone: ['collectionAddress', 'name'],
  subdomain: ['itemAddress', 'name', 'collectionAddress'],
  wrapper: ['wrapperAddress', 'domainName'],
};

function upsertHandler(kind: 'zone' | 'subdomain' | 'wrapper') {
  return (req: Request, res: Response) => {
    const missing = REQUIRED_FIELDS[kind].filter((field) => !req.body?.[field]);
    if (missing.length > 0) {
      res.status(400).json({ success: false, message: `Missing fields: ${missing.join(', ')}` });
      return;
    }
    try {
      upsertSinglePlatformEntity(req.db, kind, req.body);
      res.json({ success: true });
    } catch (err) {
      console.error(`[platformCache] upsert ${kind} failed`, err);
      res.status(500).json({ success: false, message: 'Upsert failed' });
    }
  };
}

router.post('/zones/upsert', upsertHandler('zone'));
router.post('/subdomains/upsert', upsertHandler('subdomain'));
router.post('/wrappers/upsert', upsertHandler('wrapper'));

export default router;
