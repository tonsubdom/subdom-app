FROM node:20-bullseye

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN mkdir -p dist

# CMD ниже запускает собранный dist/server-sqlite.js напрямую (не ts-node) —
# сборка обязана падать вместе с образом, если tsc не прошёл, иначе получим
# контейнер без dist/ и падение уже на старте.
RUN npm run build

RUN mkdir -p /app/db

EXPOSE 3000

# ВАЖНО: node напрямую, не "npx ts-node" — npx как PID 1 в контейнере не
# форвардит SIGTERM дочернему процессу (проверено локально: обёрнутый в npx
# process.on('SIGTERM') не срабатывает вообще), из-за чего graceful-shutdown
# чекпоинт WAL (см. server-sqlite.ts) никогда не выполнялся при `docker stop`
# на деплое — все записи со времени последнего автоматического чекпоинта
# SQLite (новые подписки на уведомления и т.п.) терялись при каждом передеплое.
# Голый node сигналы ловит корректно; dist/ здесь уже собран шагом выше.
CMD ["node", "dist/server-sqlite.js"]
