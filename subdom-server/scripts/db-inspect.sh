#!/usr/bin/env bash
# Просмотр содержимого SQLite-баз subdom-server (testnet/mainnet) без похода в код.
#
#   ./scripts/db-inspect.sh                        — таблицы + кол-во строк в обеих базах
#   ./scripts/db-inspect.sh mainnet                — то же самое, только mainnet
#   ./scripts/db-inspect.sh mainnet zones           — дамп таблицы zones (первые 50 строк)
#   ./scripts/db-inspect.sh testnet subdomains 200  — первые 200 строк subdomains

set -euo pipefail
cd "$(dirname "$0")/.."

NETWORK="${1:-}"
TABLE="${2:-}"
LIMIT="${3:-50}"

db_path() {
  if [ "$1" = "mainnet" ]; then echo "nft-domains-mainnet.db"; else echo "nft-domains.db"; fi
}

summary() {
  local net="$1"
  local db; db="$(db_path "$net")"
  if [ ! -f "$db" ]; then
    echo "⚠️  $db не найден"
    return
  fi
  echo "=== $net ($db) ==="
  for t in $(sqlite3 "$db" ".tables"); do
    count=$(sqlite3 "$db" "SELECT COUNT(*) FROM $t;")
    printf "  %-15s %s строк\n" "$t" "$count"
  done
}

if [ -z "$NETWORK" ]; then
  summary mainnet
  summary testnet
  exit 0
fi

DB="$(db_path "$NETWORK")"
if [ ! -f "$DB" ]; then
  echo "⚠️  $DB не найден"
  exit 1
fi

if [ -z "$TABLE" ]; then
  summary "$NETWORK"
  exit 0
fi

sqlite3 -header -column "$DB" "SELECT * FROM $TABLE LIMIT $LIMIT;"
