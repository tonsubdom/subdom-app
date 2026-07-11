#!/bin/bash

# Скрипт для создания бэкапа базы данных SQLite с WAL
# Разместите в: ~/subdom-deployment/subdom-server/backup-database.sh

set -e

# Конфигурация
BACKUP_DIR="/root/subdom-deployment/subdom-server/wal-recovery"
DB_DIR="/root/subdom-deployment/subdom-server"
DB_NAME="nft-domains"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_backup_${TIMESTAMP}.db"

# Создаем директорию для бэкапов, если её нет
mkdir -p "${BACKUP_DIR}"

# Переходим в директорию с базой данных
cd "${DB_DIR}"

echo "Начинаем создание бэкапа базы данных ${DB_NAME}..."

# Проверяем наличие файлов БД
if [ ! -f "${DB_NAME}.db" ]; then
    echo "Ошибка: Файл ${DB_NAME}.db не найден!"
    exit 1
fi

if [ ! -f "${DB_NAME}.db-wal" ]; then
    echo "Внимание: WAL файл не найден. Создаем бэкап только из основной БД."
fi

# Останавливаем приложение (если нужно)
# systemctl stop your-application.service

# Создаем бэкап с применением WAL
echo "Создаем бэкап с применением WAL журнала..."
sqlite3 "${DB_NAME}.db" ".backup '${BACKUP_FILE}'"

# Проверяем целостность бэкапа
echo "Проверяем целостность бэкапа..."
INTEGRITY_CHECK=$(sqlite3 "${BACKUP_FILE}" "PRAGMA integrity_check;" 2>/dev/null)

if [ "$INTEGRITY_CHECK" = "ok" ]; then
    echo "✓ Бэкап успешно создан: ${BACKUP_FILE}"
    echo "✓ Целостность базы данных подтверждена"
    
    # Показываем информацию о бэкапе
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "Размер бэкапа: ${BACKUP_SIZE}"
    
    # Создаем симлинк на последний бэкап
    ln -sf "${BACKUP_FILE}" "${BACKUP_DIR}/${DB_NAME}_latest.db"
    
    # Очищаем старые бэкапы (сохраняем последние 7)
    echo "Очищаем старые бэкапы (оставляем последние 7)..."
    ls -t "${BACKUP_DIR}/${DB_NAME}_backup_"*.db 2>/dev/null | tail -n +8 | xargs -r rm -f
    
else
    echo "✗ Ошибка целостности бэкапа: ${INTEGRITY_CHECK}"
    rm -f "${BACKUP_FILE}"
    exit 1
fi

# Запускаем приложение обратно (если останавливали)
# systemctl start your-application.service

echo "Готово! Бэкап сохранен в: ${BACKUP_FILE}"
echo "Для восстановления используйте: cp '${BACKUP_FILE}' nft-domains.db"