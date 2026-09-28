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

# Маппинг-слой jail → человекочитаемая категория атаки (см. Kanban subdom
# Backlog, п.1). Расширяемый по конструкции: новый jail, появившийся на
# сервере, не требует правки этого файла — просто отображается под своим
# именем (categorize() отдаёт jail как есть, если его нет в словаре), но
# как только у нас появляется более точное название — добавляем сюда одну
# строку. Реальная гранулярность ограничена тем, что fail2ban хранит в
# `bans` только (jail, ip, timeofban) — какой конкретно паттерн внутри
# jail'а сработал (путь/UA/сигнатура конкретного сканера), не пишется, так
# что деление до уровня "IDOR/SQLi/XSS" сейчас невозможно без отдельного
# изменения в тем, что пишется в базу при бане — это отдельная, более
# крупная задача, не в этом скрипте.
JAIL_CATEGORY = {
    "sshd": "Брутфорс (SSH)",
    "subdom-http-scanners-443": "Сканирование уязвимостей (веб)",
    "subdom-api-scanners": "Сканирование уязвимостей (API)",
}


def categorize(jail):
    return JAIL_CATEGORY.get(jail, jail)


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


# Без LIMIT — реальный итог по всей истории, что лежит в базе subdom-app
# (не то же самое, что "с самого начала работы fail2ban": до 2026-09-12
# dbpurgeage был дефолтным — 1 день, старые записи уже физически не вернуть,
# см. Kanban subdom/Log.md 2026-09-10 и 2026-09-12).
def local_totals():
    if not os.path.exists(FAIL2BAN_DB):
        return {"total": 0, "unique_ips": 0, "last30d": 0}
    conn = sqlite3.connect(f"file:{FAIL2BAN_DB}?mode=ro", uri=True)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*), COUNT(DISTINCT ip) FROM bans")
    total, unique_ips = cur.fetchone()
    cutoff = int(time.time()) - 30 * 86400
    cur.execute("SELECT COUNT(*) FROM bans WHERE timeofban >= ?", (cutoff,))
    last30d = cur.fetchone()[0]
    conn.close()
    return {"total": total, "unique_ips": unique_ips, "last30d": last30d}


DAILY_CHART_DAYS = 14


# Дневная разбивка за DAILY_CHART_DAYS — независимо от MAX_ROWS-окна таблицы
# (то есть не страдает от той же обрезки, ради которой всё это затевалось).
# Только subdom-app — у subdom-api нет по-дневной агрегации в том, что он
# пушит (только скользящие 1д/7д/30д, см. fail2banStats.ts), это явно
# подписано в UI, а не подмешивается молча.
def local_daily_counts(days=DAILY_CHART_DAYS):
    now = int(time.time())
    by_day = {}
    if os.path.exists(FAIL2BAN_DB):
        conn = sqlite3.connect(f"file:{FAIL2BAN_DB}?mode=ro", uri=True)
        cur = conn.cursor()
        cutoff = now - days * 86400
        cur.execute(
            "SELECT date(timeofban, 'unixepoch') as d, COUNT(*) FROM bans "
            "WHERE timeofban >= ? GROUP BY d",
            (cutoff,),
        )
        by_day = dict(cur.fetchall())
        conn.close()

    result = []
    for i in range(days - 1, -1, -1):
        day = datetime.fromtimestamp(now - i * 86400, tz=timezone.utc).strftime("%Y-%m-%d")
        result.append((day, by_day.get(day, 0)))
    return result


# subdom-api не даёт нам прямого доступа к своей базе — только то, что сам
# запушил cron'ом (security-stats-remote.json). Оттуда доступна только
# рамка 1д/7д/30д по jail'ам (см. fail2banStats.ts), не честный all-time
# счётчик — поэтому в общий "всего" эта площадка не подмешивается, только
# в "за 30 дней" (см. render_html).
def remote_last30d_total():
    if not os.path.exists(REMOTE_STATS_PATH):
        return 0
    try:
        with open(REMOTE_STATS_PATH, "r") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError):
        return 0
    jails = data.get("jails")
    if not isinstance(jails, list):
        return 0
    return sum(j.get("last30d", 0) for j in jails if isinstance(j, dict))


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


def render_html(rows, geo_cache, totals, last30d_combined, daily):
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    shown = len(rows)
    unique_ips_shown = len({r["ip"] for r in rows})

    daily_max = max((c for _, c in daily), default=0)
    chart_cols = []
    chart_labels = []
    for day, count in daily:
        pct = round(100 * count / daily_max) if daily_max else 0
        day_dt = datetime.strptime(day, "%Y-%m-%d")
        short_label = day_dt.strftime("%d.%m")
        chart_cols.append(
            f'<div class="chart-col" tabindex="0">'
            f'<span class="tooltip">{day}: {count}</span>'
            f'<div class="chart-bar" style="height:{pct}%"></div>'
            f"</div>"
        )
        chart_labels.append(f"<span>{short_label}</span>")

    if rows:
        earliest = datetime.fromtimestamp(rows[-1]["timeofban"], tz=timezone.utc).strftime("%Y-%m-%d %H:%M")
        latest = datetime.fromtimestamp(rows[0]["timeofban"], tz=timezone.utc).strftime("%Y-%m-%d %H:%M")
        range_str = f"{earliest} — {latest} UTC"
    else:
        range_str = "нет данных"

    # Разбивка по типам в пределах показанного окна (rows) — сколько раз
    # каждая категория встретилась, отсортировано по убыванию. Заменяет
    # плоский список одним взглядом на распределение, до детальной таблицы.
    category_counts = {}
    for r in rows:
        cat = categorize(r["jail"])
        category_counts[cat] = category_counts.get(cat, 0) + 1
    ranked_categories = sorted(category_counts.items(), key=lambda kv: kv[1], reverse=True)
    max_count = ranked_categories[0][1] if ranked_categories else 0

    category_rows = []
    for cat, count in ranked_categories:
        pct = round(100 * count / shown) if shown else 0
        bar_pct = round(100 * count / max_count) if max_count else 0
        category_rows.append(
            f'<div class="cat-row">'
            f'<span class="cat-name">{cat}</span>'
            f'<span class="cat-bar-track"><span class="cat-bar" style="width:{bar_pct}%"></span></span>'
            f'<span class="cat-count">{count} ({pct}%)</span>'
            f"</div>"
        )

    body_rows = []
    for r in rows:
        geo = lookup_geo(r["ip"], geo_cache)
        ts = datetime.fromtimestamp(r["timeofban"], tz=timezone.utc).strftime("%Y-%m-%d %H:%M")
        body_rows.append(
            f"<tr><td>{ts}</td><td>{categorize(r['jail'])}</td>"
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
  .chart {{ margin: 4px 0 24px; }}
  .chart h2 {{ font-size: 0.85rem; text-transform:uppercase; letter-spacing:0.04em; color:#9aa5b1; margin:0 0 2px; font-weight:600; }}
  .chart .chart-sub {{ font-size:0.72rem; color:#5b6472; margin:0 0 14px; }}
  .chart-track {{ display:flex; align-items:flex-end; gap:4px; height:130px; }}
  .chart-col {{ flex:1 1 0; height:100%; display:flex; align-items:flex-end; justify-content:center; position:relative; outline:none; }}
  .chart-bar {{
    width:100%; max-width:26px; min-height:2px; border-radius:4px 4px 0 0;
    background: linear-gradient(180deg, #a8f5b4 0%, #46b868 55%, #2f8f4d 100%);
    transition: filter .15s ease, box-shadow .15s ease;
  }}
  .chart-col:hover .chart-bar, .chart-col:focus .chart-bar {{
    filter: brightness(1.15);
    box-shadow: 0 0 10px rgba(126,231,135,0.45);
  }}
  .chart-col:focus-visible {{ box-shadow: 0 0 0 2px #7ee787; border-radius:4px; }}
  .chart-track + .chart-labels {{ margin-top:6px; }}
  .chart-labels {{ display:flex; gap:4px; }}
  .chart-labels span {{ flex:1 1 0; text-align:center; font-size:0.65rem; color:#5b6472; }}
  .tooltip {{
    position:absolute; bottom:100%; left:50%;
    transform:translateX(-50%) translateY(-4px);
    background:#151a23; border:1px solid #232833; color:#d8dee9;
    padding:4px 8px; border-radius:6px; font-size:0.72rem; white-space:nowrap;
    opacity:0; pointer-events:none; transition: opacity .15s ease, transform .15s ease;
  }}
  .chart-col:hover .tooltip, .chart-col:focus .tooltip {{ opacity:1; transform:translateX(-50%) translateY(-8px); }}
  @media (prefers-reduced-motion: reduce) {{
    .chart-bar, .tooltip {{ transition: none; }}
  }}
  .summary {{ display:flex; flex-wrap:wrap; gap:12px; margin-bottom:16px; }}
  .summary-item {{ background:#151a23; border:1px solid #232833; border-radius:8px; padding:10px 16px; min-width:140px; }}
  .summary-item .num {{ display:block; font-size:1.3rem; font-weight:600; color:#7ee787; }}
  .summary-item .label {{ display:block; font-size:0.75rem; color:#9aa5b1; margin-top:2px; }}
  .categories {{ margin-bottom: 20px; }}
  .categories h2 {{ font-size: 0.85rem; text-transform:uppercase; letter-spacing:0.04em; color:#9aa5b1; margin:0 0 10px; font-weight:600; }}
  .cat-row {{ display:grid; grid-template-columns: 220px 1fr 110px; align-items:center; gap:12px; padding:4px 0; font-size:0.85rem; }}
  .cat-name {{ color:#d8dee9; }}
  .cat-bar-track {{ background:#151a23; border-radius:4px; height:8px; overflow:hidden; }}
  .cat-bar {{ display:block; height:100%; background:#7ee787; border-radius:4px; }}
  .cat-count {{ color:#9aa5b1; text-align:right; font-variant-numeric: tabular-nums; }}
  .table-wrap {{ overflow-x: auto; }}
  table {{ width:100%; border-collapse: collapse; font-size: 0.85rem; }}
  th, td {{ text-align:left; padding:6px 10px; border-bottom:1px solid #232833; }}
  th {{ color:#7ee787; position: sticky; top:0; background:#0b0e14; }}
  tr:hover {{ background:#151a23; }}
  footer {{ margin-top: 20px; color:#5b6472; font-size:0.75rem; }}
  footer p {{ margin: 4px 0; }}
</style>
</head>
<body>
<h1>🛡 Hall of Shame — subdom.zone</h1>
<div class="chart">
  <h2>Банов в день, последние {len(daily)} дней</h2>
  <p class="chart-sub">Только subdom-app — у subdom-api нет посуточной разбивки в данных, которые он присылает.</p>
  <div class="chart-track">
{''.join(chart_cols)}
  </div>
  <div class="chart-labels">
{''.join(chart_labels)}
  </div>
</div>
<div class="summary">
  <div class="summary-item"><span class="num">{totals['total']}</span><span class="label">банов всего в базе (subdom-app)</span></div>
  <div class="summary-item"><span class="num">{totals['unique_ips']}</span><span class="label">уникальных IP всего (subdom-app)</span></div>
  <div class="summary-item"><span class="num">{last30d_combined}</span><span class="label">банов за 30 дней (все площадки)</span></div>
</div>
<div class="categories">
  <h2>Разбивка по типам (в показанной таблице ниже)</h2>
{''.join(category_rows)}
</div>
<div class="stats">Публичный лог IP, забаненных системой защиты на инфраструктуре subdom (сканеры, брутфорс, подозрительные запросы). Ниже — последние {shown} записей (таблица ограничена {MAX_ROWS} строками), диапазон дат: {range_str}. Уникальных IP в этой таблице: {unique_ips_shown}. Обновлено: {now}</div>
<div class="table-wrap">
<table>
<thead><tr><th>Время (UTC)</th><th>Тип</th><th>IP</th><th>Страна</th><th>Провайдер</th></tr></thead>
<tbody>
{''.join(body_rows)}
</tbody>
</table>
</div>
<footer>
<p>Автоматически обновляется каждые 15 минут. Не персональные данные легитимных пользователей — только IP атакующих ботов/сканеров.</p>
<p>Если ваш адрес попал в список и вы с этим не согласны — напишите через баг-репорт в боте/мини-приложении subdom или в техподдержку на сайте, разберём.</p>
</footer>
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

    totals = local_totals()
    last30d_combined = totals["last30d"] + remote_last30d_total()
    daily = local_daily_counts()

    html = render_html(rows, geo_cache, totals, last30d_combined, daily)
    save_geo_cache(geo_cache)

    tmp_path = os.path.join(OUTPUT_DIR, "index.html.tmp")
    final_path = os.path.join(OUTPUT_DIR, "index.html")
    with open(tmp_path, "w") as f:
        f.write(html)
    os.replace(tmp_path, final_path)  # atomic — nginx никогда не отдаст недописанный файл


if __name__ == "__main__":
    main()
