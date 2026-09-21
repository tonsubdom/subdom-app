#!/usr/bin/env python3
"""
Hall of Shame — публичная страница со списком забаненных сканеров/ботов.
Заменяет поток per-ban сообщений в Telegram (см. Kanban subdom, 2026-09-12):
источник правды теперь эта страница + кнопка "Кибербезопасность" в боте,
а не поток отдельных сообщений в чат владельца.

Читает:
  - /var/lib/fail2ban/fail2ban.sqlite3 (bans subdom-app, локально)
  - /root/subdom-deployment/subdom-server/security-stats-remote.json
    (последний пуш с subdom-api — recentBans оттуда, см. fail2banStats.ts)

Geo (страна/провайдер) — best-effort через ipinfo.io, с диск-кэшем по IP
(GEO_CACHE_PATH), чтобы не жечь бесплатный лимит повторными запросами на
один и тот же IP при каждом прогоне cron'а.

Пишет статический index.html в OUTPUT_DIR, который nginx отдаёт по /security
(см. conf.d/subdom.conf + docker-compose.yml volume для nginx-сервиса).
"""
import json
import os
import sqlite3
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

FAIL2BAN_DB = "/var/lib/fail2ban/fail2ban.sqlite3"
REMOTE_STATS_PATH = "/root/subdom-deployment/subdom-server/security-stats-remote.json"
GEO_CACHE_PATH = "/root/subdom-deployment/scripts/.hall-of-shame-geo-cache.json"
OUTPUT_DIR = "/root/subdom-deployment/hall-of-shame"
MAX_ROWS = 300


def load_geo_cache():
    if os.path.exists(GEO_CACHE_PATH):
        try:
            with open(GEO_CACHE_PATH, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return {}
    return {}


def save_geo_cache(cache):
    with open(GEO_CACHE_PATH, "w") as f:
        json.dump(cache, f)


def lookup_geo(ip, cache):
    if ip in cache:
        return cache[ip]
    try:
        with urllib.request.urlopen(f"https://ipinfo.io/{ip}/json", timeout=3) as resp:
            data = json.loads(resp.read().decode())
            result = {"country": data.get("country", "н/д"), "org": data.get("org", "н/д")}
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        result = {"country": "н/д", "org": "н/д"}
    cache[ip] = result
    return result


def local_bans():
    if not os.path.exists(FAIL2BAN_DB):
        return []
    conn = sqlite3.connect(f"file:{FAIL2BAN_DB}?mode=ro", uri=True)
    cur = conn.cursor()
    cur.execute(
        "SELECT jail, ip, timeofban FROM bans ORDER BY timeofban DESC LIMIT ?",
        (MAX_ROWS,),
    )
    rows = [{"jail": r[0], "ip": r[1], "timeofban": r[2]} for r in cur.fetchall()]
    conn.close()
    return rows


def remote_bans():
    if not os.path.exists(REMOTE_STATS_PATH):
        return []
    try:
        with open(REMOTE_STATS_PATH, "r") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError):
        return []
    recent = data.get("recentBans", []) or []
    return [
        {
            "jail": b.get("jail", "?"),
            "ip": b.get("ip", "?"),
            "timeofban": b.get("timeofban", 0),
        }
        for b in recent
    ]


def render_html(rows, geo_cache):
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    total = len(rows)
    unique_ips = len({r["ip"] for r in rows})

    body_rows = []
    for r in rows:
        geo = lookup_geo(r["ip"], geo_cache)
        ts = datetime.fromtimestamp(r["timeofban"], tz=timezone.utc).strftime("%Y-%m-%d %H:%M")
        body_rows.append(
            f"<tr><td>{ts}</td><td>{r['jail']}</td>"
            f"<td>{r['ip']}</td><td>{geo['country']}</td><td>{geo['org']}</td></tr>"
        )

    html = f"""<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Hall of Shame — subdom.zone security log</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<style>
  body {{ font-family: -apple-system, sans-serif; background:#0b0e14; color:#d8dee9; margin:0; padding:24px; }}
  h1 {{ font-size: 1.4rem; }}
  .stats {{ margin-bottom: 16px; color:#9aa5b1; }}
  table {{ width:100%; border-collapse: collapse; font-size: 0.85rem; }}
  th, td {{ text-align:left; padding:6px 10px; border-bottom:1px solid #232833; }}
  th {{ color:#7ee787; position: sticky; top:0; background:#0b0e14; }}
  tr:hover {{ background:#151a23; }}
  footer {{ margin-top: 20px; color:#5b6472; font-size:0.75rem; }}
</style>
</head>
<body>
<h1>🛡 Hall of Shame — subdom.zone</h1>
<div class="stats">Публичный лог IP, забаненных системой защиты на инфраструктуре subdom (сканеры, брутфорс, подозрительные запросы). Всего записей: {total}, уникальных IP: {unique_ips}. Обновлено: {now}</div>
<table>
<thead><tr><th>Время (UTC)</th><th>Тип</th><th>IP</th><th>Страна</th><th>Провайдер</th></tr></thead>
<tbody>
{''.join(body_rows)}
</tbody>
</table>
<footer>Автоматически обновляется каждые 15 минут. Не персональные данные легитимных пользователей — только IP атакующих ботов/сканеров.</footer>
</body>
</html>
"""
    return html


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    geo_cache = load_geo_cache()

    rows = local_bans() + remote_bans()
    rows.sort(key=lambda r: r["timeofban"], reverse=True)
    rows = rows[:MAX_ROWS]

    html = render_html(rows, geo_cache)
    save_geo_cache(geo_cache)

    tmp_path = os.path.join(OUTPUT_DIR, "index.html.tmp")
    final_path = os.path.join(OUTPUT_DIR, "index.html")
    with open(tmp_path, "w") as f:
        f.write(html)
    os.replace(tmp_path, final_path)  # atomic — nginx никогда не отдаст недописанный файл


if __name__ == "__main__":
    main()
