FROM node:20-bullseye

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN mkdir -p dist

RUN if [ -f "src/server-sqlite.ts" ]; then \
    echo "Собираем TypeScript..."; \
    npm run build || echo "Сборка завершилась с ошибками"; \
    else \
    echo "Файл src/server-sqlite.ts не найден"; \
    echo "Доступные .ts файлы:"; \
    find src -name "*.ts"; \
    fi

RUN mkdir -p /app/db

EXPOSE 3000

CMD ["npx", "ts-node", "src/server-sqlite.ts"]
