// subdom-server/src/utils/fail2banStats.ts
//
// Источник для кнопки "Кибербезопасность" (/security_stats) и для генератора
// Hall of Shame. Два независимых сервера с fail2ban (subdom-app и subdom-api)
// не имеют общей сети — subdom-app читает свою локальную базу напрямую
// (read-only bind mount, см. docker-compose.yml), а subdom-api периодически
// пушит свою сводку сюда через /api/internal/security-stats (см.
// server-sqlite.ts) — тот же паттерн, что platformCache-кроулер использует
// для локальных данных, только тут источник другой сервер, а не toncenter.

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const LOCAL_DB_PATH = process.env.FAIL2BAN_DB_PATH || '/fail2ban/fail2ban.sqlite3';
const REMOTE_STATS_PATH = process.env.SECURITY_STATS_REMOTE_PATH || path.join(process.env.DB_PATH || '/app', 'security-stats-remote.json');

// Тот же маппинг-слой jail → категория, что в scripts/generate-hall-of-shame.py
// (см. Kanban subdom Backlog, п.1) — держим синонимично в двух местах
// намеренно: бот (этот файл, Node) и Hall of Shame (отдельный Python-скрипт
// на другом сервере) не имеют общего рантайма, шарить модуль негде. Меняешь
// один — проверь, не разошёлся ли второй. Расширяемо: неизвестный jail
// просто показывается как есть, ничего не ломается при появлении нового.
const JAIL_CATEGORY: Record<string, string> = {
  sshd: 'Брутфорс (SSH)',
  'subdom-http-scanners-443': 'Сканирование уязвимостей (веб)',
  'subdom-api-scanners': 'Сканирование уязвимостей (API)',
};

export function categorizeJail(jail: string): string {
  return JAIL_CATEGORY[jail] ?? jail;
}

export interface JailPeriodCounts {
  jail: string;
  last1d: number;
  last7d: number;
  last30d: number;
}

export interface ServerSecurityStats {
  server: string; // 'subdom-app' | 'subdom-api' | ...
  jails: JailPeriodCounts[];
  currentlyBanned: number;
  updatedAt: string; // ISO — для subdom-api это время последнего пуша, не "сейчас"
}

export interface RemoteSecurityPush {
  server: string;
  jails: JailPeriodCounts[];
  currentlyBanned: number;
  recentBans?: Array<{ jail: string; ip: string; timeofban: number; country?: string; org?: string }>;
}

function countByPeriod(db: InstanceType<typeof Database>, jail: string, cutoffSeconds: number): number {
  const row = db
    .prepare('SELECT COUNT(*) as cnt FROM bans WHERE jail = ? AND timeofban >= ?')
    .get(jail, cutoffSeconds) as { cnt: number };
  return row.cnt;
}

// Локальная статистика subdom-app — читается напрямую из смонтированной базы.
// Открывается и закрывается на каждый вызов (не держим долгоживущее
// соединение к файлу, которым владеет чужой процесс на хосте).
export function getLocalSecurityStats(): ServerSecurityStats | null {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    return null;
  }

  const db = new Database(LOCAL_DB_PATH, { readonly: true, fileMustExist: true });
  try {
    const nowSec = Math.floor(Date.now() / 1000);
    const jailNames = (db.prepare('SELECT DISTINCT jail FROM bans').all() as { jail: string }[]).map((r) => r.jail);

    const jails: JailPeriodCounts[] = jailNames.map((jail) => ({
      jail,
      last1d: countByPeriod(db, jail, nowSec - 1 * 86400),
      last7d: countByPeriod(db, jail, nowSec - 7 * 86400),
      last30d: countByPeriod(db, jail, nowSec - 30 * 86400),
    }));

    // bips хранит все когда-либо забаненные IP, не только активные сейчас —
    // "текущий бан" определяется по истечению bantime (bantime=-1 — навсегда).
    const currentlyBanned = (
      db
        .prepare('SELECT COUNT(*) as cnt FROM bips WHERE bantime = -1 OR (timeofban + bantime) > ?')
        .get(nowSec) as { cnt: number } | undefined
    )?.cnt ?? 0;

    return {
      server: 'subdom-app',
      jails,
      currentlyBanned,
      updatedAt: new Date().toISOString(),
    };
  } finally {
    db.close();
  }
}

// Удалённая статистика (subdom-api) — то, что последний раз пушнул cron на
// том сервере. Файл монтируется тем же volume'ом, что и остальные .db-файлы
// backend'а (см. docker-compose.yml), чтобы переживать передеплой.
export function getRemoteSecurityStats(): ServerSecurityStats | null {
  if (!fs.existsSync(REMOTE_STATS_PATH)) {
    return null;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(REMOTE_STATS_PATH, 'utf-8')) as RemoteSecurityPush & { updatedAt: string };
    // Плейсхолдер "{}" (создаётся вручную на хосте перед первым деплоем,
    // см. docker-compose.yml) — валидный JSON, но не настоящий пуш: пока
    // cron на subdom-api ни разу не отработал, jails ещё не массив.
    if (!Array.isArray(raw.jails)) {
      return null;
    }
    return {
      server: raw.server,
      jails: raw.jails,
      currentlyBanned: raw.currentlyBanned,
      updatedAt: raw.updatedAt,
    };
  } catch {
    // Битый/недописанный файл (гонка с cron на другом сервере) — не валим
    // бота, просто считаем, что удалённых данных пока нет.
    return null;
  }
}

export function saveRemoteSecurityPush(push: RemoteSecurityPush): void {
  const payload = { ...push, updatedAt: new Date().toISOString() };
  fs.writeFileSync(REMOTE_STATS_PATH, JSON.stringify(payload, null, 2));
}

export function getAllSecurityStats(): ServerSecurityStats[] {
  return [getLocalSecurityStats(), getRemoteSecurityStats()].filter((s): s is ServerSecurityStats => s !== null);
}
