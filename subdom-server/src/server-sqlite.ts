
//до изменения базы данных плюс статус для зон и колекшнадрес для субдоменов
// src/server-sqlite.ts
import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Joi from 'joi';
import { Address } from '@ton/core';

// Загружаем переменные окружения
dotenv.config();

// Импортируем telegramBot после загрузки env
// import telegramBot from './utils/telegramBot-sqlite';
import telegramBot from './utils/tgBot-sqlite';
import { generatePayload, verifyAdminProof, CheckProofRequest } from './utils/tonProof';
import { createAdminToken, requireAdminAuth } from './utils/adminAuth';
import { createBag, getBagDetails, addBag } from './utils/storageDaemon';
import { startStorageDealsChecker } from './services/storageDealsChecker';
import platformCacheRouter from './services/platformCache/routes';
import { startPlatformCacheCrawler } from './services/platformCache/crawler';
// Flat JSON tool manifest for LLM/MCP tool-use (same file as
// agent-manifest/subdom-tools.json in the subdom-sdk repo, copied here so it
// ships with the backend deploy) — imported (not fs.readFileSync'd) so
// resolveJsonModule makes tsc copy it into dist/ automatically.
import subdomToolsManifest from './mcp/subdom-tools.json';

// Валидация имени зоны/субдомена на роутах создания и notify-релеях.
// К моменту, когда имя доходит сюда, фронт уже punycode-кодирует не-ASCII
// лейблы (см. tma/src/utils/domainPunycode.ts) — оно всегда чистый ASCII
// вида "label" или "label.label(.label...)". Отклоняем всё остальное:
// защита от HTML/скрипт-инъекции в текст telegram-уведомлений (домен
// интерполируется без экранирования в <a href="tonsite://${domain}">) и от
// мусора в БД. domainNameSchema — просто required().pattern(...), без max()
// на длину лейбла — платформенные лимиты по длине зоны проверяются в другом
// месте (ценообразование), тут только защита от небезопасных символов.
const domainNameSchema = Joi.string()
  .pattern(/^[a-z0-9-]+(\.[a-z0-9-]+)*$/)
  .required();

function validateDomainName(name: unknown): { valid: true } | { valid: false; message: string } {
  const { error } = domainNameSchema.validate(name);
  if (error) {
    return { valid: false, message: `Некорректное имя домена: ${error.message}` };
  }
  return { valid: true };
}

const APP_DOMAIN = 'subdom.zone';
const STORAGE_UPLOADS_PATH = process.env.STORAGE_UPLOADS_PATH || '/app/storage-uploads';

const app = express();
const PORT = process.env.PORT || 3000;

// Инициализация SQLite баз данных для testnet и mainnet
const testnetDb = new Database('nft-domains.db');
const mainnetDb = new Database('nft-domains-mainnet.db');

// Тип для Database
type SqliteDatabase = typeof Database.prototype;

// Функция для получения нужной базы данных
const getDatabase = (isTestnet: boolean): SqliteDatabase => {
  return isTestnet ? testnetDb : mainnetDb;
};

// Интерфейсы для типизации
// interface User {
//   id: number;
//   address: string;
//   name?: string;
//   domains: string;
//   zones: string;
//   subdomains: string;
//   registrationDate: string;
//   nftAccessAmount: string;
//   createdAt: string;
//   updatedAt: string;
// }

// interface User {
//   id: number;
//   address: string;
//   name?: string;
//   domains: number; // Изменено: теперь число вместо строки
//   zones: number;   // Изменено: теперь число вместо строки
//   subdomains: number; // Изменено: теперь число вместо строки
//   registrationDate: string;
//   nftAccessAmount: string;
//   totalPaidAttempts: string; // Новое поле
//   totalZoneSpending: number; // Новое поле
//   totalSubdomainSpending: number; // Новое поле
//   totalProxyZoneSpending: number; // Новое поле
//   totalSbtZoneSpending: number; // Новое поле
//   totalProxySubdomainSpending: number; // Новое поле
//   totalSbtSubdomainSpending: number; // Новое поле
//   totalProfit: number; // Новое поле
//   createdAt: string;
//   updatedAt: string;
// }

interface User {
  id: number;
  address: string;
  name?: string;
  domains: number;
  zones: number;
  subdomains: number;
  proxyZones: number; 
  sbtZones: number;   
  proxySubdomains: number; 
  sbtSubdomains: number;   
  registrationDate: string;
  nftAccessAmount: string;
  totalPaidAttempts: string;
  totalZoneSpending: number;
  totalSubdomainSpending: number;
  totalProxyZoneSpending: number;
  totalSbtZoneSpending: number;
  totalProxySubdomainSpending: number;
  totalSbtSubdomainSpending: number;
  totalProfit: number;
  createdAt: string;
  updatedAt: string;
}


interface Zone {
  id: number;
  name: string;
  address: string;
  collectionAddress?: string;
  wrapperAddress?: string;
  proxy: number;
  registrationDate: string;
  subdomainsAmount: number;
  owner?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Subdomain {
  id: number;
  name: string;
  address: string;
  mintPrice: number;
  registrationDate: string;
  links: string;
  zoneId?: number;
  owner?: string;
  status: string;
  auctionEndTime?: string;
  lastBid?: number;
  lastBidder?: string;
  bids: string;
  collectionAddress?: string;
  createdAt: string;
  updatedAt: string;
}

interface Chat {
  id: number;
  domain: string;
  userAddress: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  chatId: number;
  sender: string;
  text: string;
  timestamp: string;
}

interface Auction {
  id: number;
  subdomainId: number;
  currentBid: number;
  currentBidder?: string;
  endTime: string;
  status: string;
  bids: string;
  createdAt: string;
  updatedAt: string;
}

// 1. Добавьте типы вверху файла:
type ZoneLength = 4 | 5 | 6 | 7 | 8 | 9;

interface PaymentAttempts {
  proxy: Record<ZoneLength, boolean>;
  sbt: Record<ZoneLength, boolean>;
}

interface PaymentAttemptsCount {
  proxy: Record<ZoneLength, number>;
  sbt: Record<ZoneLength, number>;
}

// 2. Добавьте вспомогательные функции:
const isValidZoneLength = (length: number): length is ZoneLength => {
  return [4, 5, 6, 7, 8, 9].includes(length);
};

const getZoneLengthKey = (length: number): ZoneLength | null => {
  if (isValidZoneLength(length)) {
    return length;
  }
  return null;
};

// Расширяем интерфейс Request для добавления кастомных полей
declare global {
  namespace Express {
    interface Request {
      db: SqliteDatabase;
      isTestnet: boolean;
    }
  }
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

function parseNftAccessAmount(nftAccessAmount: string | PaymentAttempts): PaymentAttempts {
  console.log('🔄 [PARSE NFT] Начало парсинга nftAccessAmount');
  console.log('🔄 [PARSE NFT] Тип входных данных:', typeof nftAccessAmount);
  
  if (typeof nftAccessAmount === 'string') {
    try {
      console.log('🔄 [PARSE NFT] Пытаемся распарсить строку:', nftAccessAmount);
      const parsed = JSON.parse(nftAccessAmount);
      console.log('🔄 [PARSE NFT] Распарсенный результат:', parsed);
      
      // Убедимся, что структура правильная
      const result: PaymentAttempts = {
        proxy: {4: false, 5: false, 6: false, 7: false, 8: false, 9: false},
        sbt: {4: false, 5: false, 6: false, 7: false, 8: false, 9: false}
      };
      
      // Копируем значения из распарсенного объекта
      if (parsed.proxy) {
        for (let i = 4; i <= 9; i++) {
          if (parsed.proxy[i] !== undefined) {
            result.proxy[i as ZoneLength] = Boolean(parsed.proxy[i]);
          }
        }
      }
      
      if (parsed.sbt) {
        for (let i = 4; i <= 9; i++) {
          if (parsed.sbt[i] !== undefined) {
            result.sbt[i as ZoneLength] = Boolean(parsed.sbt[i]);
          }
        }
      }
      
      console.log('🔄 [PARSE NFT] Итоговый результат:', result);
      return result;
    } catch (error) {
      console.error('❌ [PARSE NFT] Ошибка парсинга JSON:', error);
      return {
        proxy: {4: false, 5: false, 6: false, 7: false, 8: false, 9: false},
        sbt: {4: false, 5: false, 6: false, 7: false, 8: false, 9: false}
      };
    }
  }
  
  // Если это уже объект, возвращаем как есть
  console.log('🔄 [PARSE NFT] Уже объект:', nftAccessAmount);
  return nftAccessAmount;
}

// Функция для парсинга totalPaidAttempts
const parsePaymentAttemptsCount = (data: string | any): PaymentAttemptsCount => {
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      const result: PaymentAttemptsCount = {
        proxy: {4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0},
        sbt: {4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0}
      };
      
      if (parsed.proxy) {
        for (let i = 4; i <= 9; i++) {
          if (parsed.proxy[i] !== undefined) {
            result.proxy[i as ZoneLength] = Number(parsed.proxy[i]) || 0;
          }
        }
      }
      
      if (parsed.sbt) {
        for (let i = 4; i <= 9; i++) {
          if (parsed.sbt[i] !== undefined) {
            result.sbt[i as ZoneLength] = Number(parsed.sbt[i]) || 0;
          }
        }
      }
      
      return result;
    } catch (error) {
      return {
        proxy: {4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0},
        sbt: {4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0}
      };
    }
  }
  
  return data;
};


// Функция для парсинга пользователя
const parseUser = (user: User) => {
  return {
    ...user,
    domains: user.domains,
    zones: user.zones,
    subdomains: user.subdomains,
    proxyZones: user.proxyZones || 0,
    sbtZones: user.sbtZones || 0,
    proxySubdomains: user.proxySubdomains || 0,
    sbtSubdomains: user.sbtSubdomains || 0,
    nftAccessAmount: parseNftAccessAmount(user.nftAccessAmount),
    totalPaidAttempts: parsePaymentAttemptsCount(user.totalPaidAttempts || '{"proxy":{"4":0,"5":0,"6":0,"7":0,"8":0,"9":0},"sbt":{"4":0,"5":0,"6":0,"7":0,"8":0,"9":0}}'),
    totalZoneSpending: Number(user.totalZoneSpending) || 0,
    totalSubdomainSpending: Number(user.totalSubdomainSpending) || 0,
    totalProxyZoneSpending: Number(user.totalProxyZoneSpending) || 0,
    totalSbtZoneSpending: Number(user.totalSbtZoneSpending) || 0,
    totalProxySubdomainSpending: Number(user.totalProxySubdomainSpending) || 0,
    totalSbtSubdomainSpending: Number(user.totalSbtSubdomainSpending) || 0,
    totalProfit: Number(user.totalProfit) || 0
  };
};

// Функция для расчета цены зоны на основе маппинга
const calculateZonePrice = (domain: string, isProxy: boolean): number => {
  const length = domain.length;
  if (isProxy) {
    if (length === 4) return 100;
    if (length === 5) return 50;
    if (length === 6) return 40;
    if (length === 7) return 30;
    if (length === 8) return 20;
    return 10;
  } else {
    if (length === 4) return 5;
    if (length === 5) return 2.5;
    if (length === 6) return 2;
    if (length === 7) return 1.5;
    if (length === 8) return 1;
    return 0.5;
  }
};


// Функция для инициализации таблиц в базе данных
// Функция для инициализации таблиц в базе данных
const initializeDatabase = (db: SqliteDatabase) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT UNIQUE NOT NULL,
      name TEXT,
      domains INTEGER DEFAULT 0,
      zones INTEGER DEFAULT 0,
      subdomains INTEGER DEFAULT 0,
      proxyZones INTEGER DEFAULT 0,
      sbtZones INTEGER DEFAULT 0,
      proxySubdomains INTEGER DEFAULT 0,
      sbtSubdomains INTEGER DEFAULT 0,
      registrationDate TEXT DEFAULT CURRENT_TIMESTAMP,
      nftAccessAmount TEXT DEFAULT '{"proxy":{"4":false,"5":false,"6":false,"7":false,"8":false,"9":false},"sbt":{"4":false,"5":false,"6":false,"7":false,"8":false,"9":false}}',
      totalPaidAttempts TEXT DEFAULT '{"proxy":{"4":0,"5":0,"6":0,"7":0,"8":0,"9":0},"sbt":{"4":0,"5":0,"6":0,"7":0,"8":0,"9":0}}',
      totalZoneSpending REAL DEFAULT 0,
      totalSubdomainSpending REAL DEFAULT 0,
      totalProxyZoneSpending REAL DEFAULT 0,
      totalSbtZoneSpending REAL DEFAULT 0,
      totalProxySubdomainSpending REAL DEFAULT 0,
      totalSbtSubdomainSpending REAL DEFAULT 0,
      totalProfit REAL DEFAULT 0,
      proxyRiskAcknowledged INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      address TEXT NOT NULL,
      collectionAddress TEXT,
      wrapperAddress TEXT,
      proxy INTEGER DEFAULT 0,
      registrationDate TEXT DEFAULT CURRENT_TIMESTAMP,
      subdomainsAmount INTEGER DEFAULT 0,
      owner TEXT,
      status TEXT DEFAULT 'active',
      zonePrice REAL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subdomains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      address TEXT NOT NULL,
      mintPrice REAL NOT NULL,
      registrationDate TEXT DEFAULT CURRENT_TIMESTAMP,
      links TEXT DEFAULT '[]',
      zoneId INTEGER,
      owner TEXT,
      status TEXT DEFAULT 'active',
      auctionEndTime TEXT,
      lastBid REAL,
      lastBidder TEXT,
      bids TEXT DEFAULT '[]',
      collectionAddress TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (zoneId) REFERENCES zones(id)
    );

    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT NOT NULL,
      userAddress TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(domain, userAddress)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chatId INTEGER NOT NULL,
      sender TEXT NOT NULL,
      text TEXT NOT NULL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chatId) REFERENCES chats(id)
    );

    CREATE TABLE IF NOT EXISTS auctions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subdomainId INTEGER NOT NULL,
      currentBid REAL DEFAULT 0,
      currentBidder TEXT,
      endTime TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      bids TEXT DEFAULT '[]',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subdomainId) REFERENCES subdomains(id)
    );

    -- Заявки на действия, которые может выполнить только адрес площадки
    -- (change_content/деактивация SBT-зоны, смена владельца и т.п.) —
    -- ончейн-зоны, найденные через сканирование, не имеют id в таблице zones,
    -- поэтому ключ тут — сам ончейн-адрес (targetAddress), а не FK.
    CREATE TABLE IF NOT EXISTS pending_admin_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actionType TEXT NOT NULL,
      targetType TEXT NOT NULL,
      targetAddress TEXT NOT NULL,
      targetCollectionAddress TEXT,
      targetName TEXT NOT NULL,
      requestedBy TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      executedTxHash TEXT,
      requestedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      executedAt TEXT
    );

    -- Прогресс пошаговой обучалки. completedSteps — JSON string[] id шагов
    -- из TUTORIAL_STEPS. rewardGranted гарантирует, что вторая (за обучение,
    -- отдельно от промо-попытки при регистрации) SBT-награда выдаётся не
    -- больше одного раза на адрес.
    CREATE TABLE IF NOT EXISTS tutorial_progress (
      address TEXT PRIMARY KEY,
      completedSteps TEXT NOT NULL DEFAULT '[]',
      -- JSON-объект { [stepId]: string } — конкретное имя/значение, с которым
      -- юзер прошёл шаг (название зоны/субдомена/домена/торрента), для
      -- модалки завершения и уведомления бота. Не все шаги его имеют
      -- (навигационные шаги вроде market_toured — просто отсутствуют в объекте).
      stepDetails TEXT NOT NULL DEFAULT '{}',
      rewardGranted INTEGER NOT NULL DEFAULT 0,
      rewardLength TEXT,
      startedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      completedAt TEXT
    );

    -- Платформенный read-cache (Group 3.3, 2026-08-05) — источник для "список всего
    -- на платформе" (Market, селектор зоны в минте, вкладка Wrappers в DNS-менеджере).
    -- Отдельно от легаси zones/subdomains выше (те с 2026-08-01 для новых записей не
    -- пишутся, см. Group 3.2) — здесь ключ collectionAddress/itemAddress, а не
    -- FK-integer id, потому что источник истины — периодический ончейн-кроулер
    -- (subdom-server/src/services/platformCache), а не создание через сам бэкенд.
    -- Персональные запросы ("что моё") тоже читаются отсюда, фильтром по ownerAddress —
    -- живой per-wallet ончейн-запрос (universal-blockchain-service на фронте) остаётся
    -- как фолбэк/кнопка принудительного рефреша, не убирается.
    CREATE TABLE IF NOT EXISTS platform_zones_cache (
      collectionAddress TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      domain TEXT,
      isProxy INTEGER NOT NULL DEFAULT 0,
      wrapperAddress TEXT,
      ownerAddress TEXT,
      image TEXT,
      description TEXT,
      totalItems INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      firstSeenAt TEXT DEFAULT CURRENT_TIMESTAMP,
      lastSyncedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      chainCreatedAt TEXT,
      source TEXT DEFAULT 'crawler'
    );
    CREATE INDEX IF NOT EXISTS idx_platform_zones_owner ON platform_zones_cache(ownerAddress);

    CREATE TABLE IF NOT EXISTS platform_subdomains_cache (
      itemAddress TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      collectionAddress TEXT NOT NULL,
      zoneName TEXT,
      isProxy INTEGER NOT NULL DEFAULT 0,
      itemType TEXT,
      ownerAddress TEXT,
      image TEXT,
      description TEXT,
      onSale INTEGER DEFAULT 0,
      lastTransactionLt TEXT,
      status TEXT DEFAULT 'active',
      firstSeenAt TEXT DEFAULT CURRENT_TIMESTAMP,
      lastSyncedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      source TEXT DEFAULT 'crawler'
    );
    CREATE INDEX IF NOT EXISTS idx_platform_subdomains_owner ON platform_subdomains_cache(ownerAddress);
    CREATE INDEX IF NOT EXISTS idx_platform_subdomains_collection ON platform_subdomains_cache(collectionAddress);

    -- wrapperHolderAddress и dividendOwnerAddress — намеренно разные поля, не
    -- один "owner". По дизайну контракта номинальный ончейн-владелец обёртки
    -- после wrap — сам адрес платформы (нужно для индексации), а держатель/
    -- продавец обёртки и получатель 90% с аукционов на зоне — два отдельных
    -- адреса (см. Задачи - Group 3 §3.3 в Obsidian). Путать их в одно поле нельзя.
    CREATE TABLE IF NOT EXISTS platform_wrappers_cache (
      wrapperAddress TEXT PRIMARY KEY,
      domainName TEXT NOT NULL,
      collectionAddress TEXT,
      wrapperHolderAddress TEXT,
      dividendOwnerAddress TEXT,
      image TEXT,
      description TEXT,
      lastTransactionLt TEXT,
      status TEXT DEFAULT 'active',
      firstSeenAt TEXT DEFAULT CURRENT_TIMESTAMP,
      lastSyncedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      source TEXT DEFAULT 'crawler'
    );
    CREATE INDEX IF NOT EXISTS idx_platform_wrappers_holder ON platform_wrappers_cache(wrapperHolderAddress);
    CREATE INDEX IF NOT EXISTS idx_platform_wrappers_dividend ON platform_wrappers_cache(dividendOwnerAddress);

    -- Отслеживает жизненный цикл bag'а TON Storage от заливки на наш диск
    -- (см. POST /api/storage/create) до момента, когда все выбранные при
    -- деплое storage-contract'а провайдеры подтвердят ончейн хотя бы один
    -- цикл proof_storage — только тогда наш узел безопасно перестаёт быть
    -- единственным сидом и чистит uploadDir (см. services/storageDealsChecker.ts).
    -- Строка создаётся сразу при заливке (contractAddress ещё NULL, до
    -- оплаты провайдеру) — если сделка так и не оплачена, строка просто
    -- висит нерелизнутой навсегда, это ожидаемо (TODO квот пока не решает).
    CREATE TABLE IF NOT EXISTS storage_deals (
      bagId TEXT PRIMARY KEY,
      uploadDir TEXT NOT NULL,
      contractAddress TEXT,
      providers TEXT,
      requiredProviders INTEGER,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      dealSentAt TEXT,
      releasedAt TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_storage_deals_pending ON storage_deals(contractAddress, releasedAt);
  `);

  // Выполняем миграцию после создания таблиц
  // migrateDatabase(db);

  migratePlatformCacheColumns(db);
  backfillTutorialStepDetails(db);
};

// CREATE TABLE IF NOT EXISTS не добавляет новые колонки, если таблица уже
// существовала (например, локально после более раннего запуска до этой
// правки схемы) — досыпаем недостающие колонки вручную. Безопасно повторять:
// ALTER TABLE ADD COLUMN гоняем только для того, чего ещё нет в PRAGMA table_info.
const migratePlatformCacheColumns = (db: SqliteDatabase) => {
  const addColumnIfMissing = (table: string, column: string, ddl: string) => {
    const existing = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    if (!existing.some((col) => col.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
      console.log(`🔧 Миграция: добавлена колонка ${table}.${column}`);
    }
  };

  // Согласие на риски proxy-зоны (см. модалку при создании proxy в
  // CreateCollectionPage) — 1 раз на юзера, не на зону, чтобы не показывать
  // повторно при создании второй/третьей proxy-зоны тем же кошельком.
  addColumnIfMissing('users', 'proxyRiskAcknowledged', 'proxyRiskAcknowledged INTEGER DEFAULT 0');

  addColumnIfMissing('platform_zones_cache', 'image', 'image TEXT');
  addColumnIfMissing('platform_zones_cache', 'description', 'description TEXT');
  addColumnIfMissing('platform_zones_cache', 'totalItems', 'totalItems INTEGER DEFAULT 0');
  // siteResolves: NULL = кроулер ещё не проверял (не скрываем 🌐-иконку —
  // оптимистично, как раньше), 1/0 = реально запинговали через *.ton.run
  // gateway на последнем проходе. См. services/platformCache/crawler.ts.
  addColumnIfMissing('platform_zones_cache', 'siteResolves', 'siteResolves INTEGER');
  addColumnIfMissing('platform_zones_cache', 'siteCheckedAt', 'siteCheckedAt TEXT');
  // Реальное время создания зоны (timestamp первой/deploy-транзакции коллекции
  // в toncenter, поле `now`) — отдельно от firstSeenAt (момент INSERT в SQLite)
  // и lastSyncedAt (обновляется каждый краул). См. Log.md 2026-08-09.
  addColumnIfMissing('platform_zones_cache', 'chainCreatedAt', 'chainCreatedAt TEXT');
  // `name` — отображаемое имя коллекции из её метадаты (например "Song DNS
  // Domains"), НЕ домен. Фронт (SBT-бейдж в CustomDomainSelector) сравнивал
  // юзерские домены именно с этим полем через platformZoneToSimpleCollection
  // (domain: row.name) — сравнение всегда проваливалось, бейдж не показывался
  // никогда и ни у кого. `domain` — реальное имя ("song.ton"), распарсенное
  // из collection_content.uri той же логикой, что и на медленном ончейн-
  // фоллбэке (extractDomainAndZone на фронте).
  addColumnIfMissing('platform_zones_cache', 'domain', 'domain TEXT');

  addColumnIfMissing('platform_subdomains_cache', 'zoneName', 'zoneName TEXT');
  addColumnIfMissing('platform_subdomains_cache', 'itemType', 'itemType TEXT');
  addColumnIfMissing('platform_subdomains_cache', 'image', 'image TEXT');
  addColumnIfMissing('platform_subdomains_cache', 'description', 'description TEXT');
  addColumnIfMissing('platform_subdomains_cache', 'onSale', 'onSale INTEGER DEFAULT 0');
  addColumnIfMissing('platform_subdomains_cache', 'lastTransactionLt', 'lastTransactionLt TEXT');
  addColumnIfMissing('platform_subdomains_cache', 'siteResolves', 'siteResolves INTEGER');
  addColumnIfMissing('platform_subdomains_cache', 'siteCheckedAt', 'siteCheckedAt TEXT');

  addColumnIfMissing('platform_wrappers_cache', 'image', 'image TEXT');
  addColumnIfMissing('platform_wrappers_cache', 'description', 'description TEXT');
  addColumnIfMissing('platform_wrappers_cache', 'lastTransactionLt', 'lastTransactionLt TEXT');
  // wrapperHolderAddress/dividendOwnerAddress добавлены в CREATE TABLE позже,
  // чем таблица могла быть впервые создана на проде (volume с nft-domains*.db
  // переживает редеплой) — crawler.ts ссылается на них в upsertWrapper без
  // этой миграции, из-за чего апсерт молча падал на "no such column" и
  // platform_wrappers_cache никогда не наполнялась.
  addColumnIfMissing('platform_wrappers_cache', 'wrapperHolderAddress', 'wrapperHolderAddress TEXT');
  addColumnIfMissing('platform_wrappers_cache', 'dividendOwnerAddress', 'dividendOwnerAddress TEXT');

  addColumnIfMissing('tutorial_progress', 'stepDetails', "stepDetails TEXT NOT NULL DEFAULT '{}'");
};

// Юзеры, прошедшие обучалку ДО того, как появился stepDetails, никогда не
// присылали конкретные имена зон/субдоменов через /api/tutorial/step —
// восстанавливаем то, что можно достоверно восстановить из уже
// существующих данных (platform_*_cache, ownerAddress), а не гадаем.
//
// ВАЖНО: firstSeenAt в platform_zones_cache — момент, когда краулер
// ВПЕРВЫЕ проиндексировал строку в SQLite, а не момент реального создания
// зоны ончейн — для кошельков с историей (у которых крауler делал
// массовый бэкфилл разом) все старые зоны получают ОДИНАКОВЫЙ firstSeenAt
// того бэкфилла, а не свою реальную дату. "ORDER BY firstSeenAt ASC" на
// таком кошельке подставил бы случайную древнюю зону, а не ту, что юзер
// реально создал во время тура. Правильный источник реальной хронологии —
// chainCreatedAt (timestamp транзакции деплоя коллекции с чейна). Берём
// зону с ближайшим (но не позже) completedAt — это и есть та, что юзер
// создал прямо во время тура. Для субдоменов chainCreatedAt не хранится
// (только firstSeenAt) — но их не бэкфиллили массово одним пакетом так же,
// как зоны, потому берём просто самый ранний firstSeenAt в окне
// [момент создания найденной зоны; completedAt].
// domain_answered/profile_saved/torrent_created источника не имеют
// (storage_deals не хранит ownerAddress, а какой именно домен юзер привязывал/
// редактировал нигде отдельно не сохранено) — для них просто остаётся пусто,
// сообщение/модалка покажут шаг без уточнения имени.
const backfillTutorialStepDetails = (db: SqliteDatabase) => {
  const rows = db.prepare(`
    SELECT address, stepDetails, completedAt FROM tutorial_progress
    WHERE rewardGranted = 1 AND (stepDetails IS NULL OR stepDetails = '{}') AND completedAt IS NOT NULL
  `).all() as Array<{ address: string; stepDetails: string; completedAt: string }>;

  if (rows.length === 0) return;

  // chainCreatedAt приходит с чейна в ISO8601 ('...T...Z'), а firstSeenAt/
  // completedAt — в SQLite CURRENT_TIMESTAMP формате ('YYYY-MM-DD HH:MM:SS').
  // Сырое строковое сравнение двух разных форматов даёт неверный порядок
  // ('T' > ' ' лексикографически, так что ISO-таймстемп внутри суток всегда
  // "больше" SQLite-таймстемпа того же дня, даже если по факту раньше) —
  // прогоняем оба через datetime() для приведения к общему виду перед сравнением.
  const findZone = db.prepare(`
    SELECT COALESCE(domain, name) as label, COALESCE(chainCreatedAt, firstSeenAt) as ts
    FROM platform_zones_cache
    WHERE ownerAddress = ? AND datetime(COALESCE(chainCreatedAt, firstSeenAt)) <= datetime(?)
    ORDER BY datetime(ts) DESC LIMIT 1
  `);
  const findSubdomain = db.prepare(`
    SELECT name as label FROM platform_subdomains_cache
    WHERE ownerAddress = ? AND datetime(firstSeenAt) >= datetime(?) AND datetime(firstSeenAt) <= datetime(?)
    ORDER BY datetime(firstSeenAt) ASC LIMIT 1
  `);
  const update = db.prepare(`UPDATE tutorial_progress SET stepDetails = ? WHERE address = ?`);

  let backfilled = 0;
  for (const row of rows) {
    const details: Record<string, string> = {};
    const zone = findZone.get(row.address, row.completedAt) as { label: string; ts: string } | undefined;
    if (zone?.label) {
      details['zone_selected'] = zone.label;
      const subdomain = findSubdomain.get(row.address, zone.ts, row.completedAt) as { label: string } | undefined;
      if (subdomain?.label) details['subdomain_created'] = subdomain.label;
    }
    if (Object.keys(details).length > 0) {
      update.run(JSON.stringify(details), row.address);
      backfilled++;
    }
  }
  if (backfilled > 0) {
    console.log(`🔧 Миграция: backfill stepDetails для ${backfilled} юзеров, завершивших обучалку ранее`);
  }
};

// Все шаги обучалки по всем 5 блокам (см. Log.md/подраздел "обучалка" —
// блоки: профиль → sbt-зона/субдомен → сайт+торрент → маркет → вкладки
// профиля). Награда выдаётся только когда completedSteps содержит их все —
// блок 1 ветвится (domain_answered закрывает и "нет домена", и "привязали
// домен" — сама привязка/инфо про регистрацию не хранятся как разные шаги,
// потому что для награды важен сам факт прохождения ветки, а не какая
// именно). Блоки 2-5 пока не подключены на фронте (следующие сессии), но
// список объявлен целиком сразу, чтобы /api/tutorial/complete не переписывать.
// Порядок пересмотрен (см. TutorialContext.tsx на фронте — оба массива
// обязаны совпадать 1-в-1): сначала домен → зона → субдомен, профиль — после.
const TUTORIAL_STEPS = [
  'domain_answered', // блок 1 — есть ли домен?
  'zone_selected', 'subdomain_created', // блок 2 — создание зоны (промо-попытка) + субдомена
  'profile_saved', // блок 3 — профиль/аватарка
  'site_visited', 'torrent_created', // блок 4 — сайт + торрент
  'market_toured', 'catalog_focused', // блок 5 — маркет
  'profile_tabs_toured', // блок 6 — вкладки профиля
] as const;
type TutorialStep = typeof TUTORIAL_STEPS[number];


// Инициализируем обе базы данных
initializeDatabase(testnetDb);
initializeDatabase(mainnetDb);


console.log('✅ SQLite базы данных инициализированы');
console.log('📊 Testnet база: nft-domains.db');
console.log('📊 Mainnet база: nft-domains-mainnet.db');
console.log('🔧 Переменные окружения:', {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ? '✅ Установлен' : '❌ Отсутствует',
  TELEGRAM_OWNER_ID: process.env.TELEGRAM_OWNER_ID ? '✅ Установлен' : '❌ Отсутствует'
});

// Middleware
app.use(cors());
app.use(express.json());

// Agent/MCP tool manifest — MVP path per release checklist: not a full MCP
// WebSocket server, just the flat JSON tool list (27 curated builder-api
// endpoints, admin/owner params hardcoded server-side) that any Function
// Calling / MCP client can load directly. No auth, no network context needed.
app.get('/mcp/manifest', (req, res) => {
  res.json(subdomToolsManifest);
});

// Middleware для определения сети
// const networkMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
//   // const isTestnet = req.query.isTestnet === 'true' || req.body.isTestnet === true; // меняем чтоб работал майннет
//   const isTestnet = req.query.isTestnet || req.body.isTestnet || false;
//   req.db = getDatabase(isTestnet);
//   req.isTestnet = isTestnet;
//   next();
// };

const networkMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const raw = req.query.isTestnet ?? req.body?.isTestnet ?? false;
  // Если raw — строка ("true"/"false"), парсим; если булево — используем
  const isTestnet = typeof raw === 'string' ? raw === 'true' || raw === '1' : Boolean(raw);
  
  req.db = getDatabase(isTestnet);
  req.isTestnet = isTestnet;
  next();
};

// Применяем middleware ко всем API роутам
app.use('/api/*', networkMiddleware);

// Платформенный read-cache (Group 3.3) — монтируется после networkMiddleware,
// чтобы req.db/req.isTestnet были уже выставлены.
app.use('/api/platform', platformCacheRouter);
startPlatformCacheCrawler(testnetDb, mainnetDb);
startStorageDealsChecker(testnetDb, mainnetDb);

// ==================== ADMIN AUTH (TonProof) ====================
// Единственный способ получить доступ к чувствительным CRUD-ручкам ниже —
// подписать ton_proof кошельком platformOwner. См. заметку
// "Admin-авторизация (TonProof)" в Obsidian-графе проекта за 2026-08-01.

app.get('/api/admin/auth/payload', (req, res) => {
  res.json({ payload: generatePayload() });
});

app.post('/api/admin/auth/check-proof', async (req, res) => {
  try {
    const body = req.body as CheckProofRequest;
    if (!body?.address || !body?.network || !body?.proof) {
      res.status(400).json({ error: 'Invalid request body' });
      return;
    }

    const expectedOwner =
      body.network === 'testnet' ? process.env.PLATFORM_OWNER_TESTNET : process.env.PLATFORM_OWNER_MAINNET;
    if (!expectedOwner) {
      res.status(500).json({ error: 'Platform owner address not configured on backend' });
      return;
    }

    const isValid = await verifyAdminProof(body, expectedOwner, APP_DOMAIN);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid proof' });
      return;
    }

    const token = createAdminToken({ address: body.address, network: body.network });
    res.json({ token });
  } catch (error) {
    console.error('❌ Ошибка проверки admin ton_proof:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ==================== TON STORAGE (создание bag'а) ====================
// tonutils-storage (см. storage-daemon/, utils/storageDaemon.ts) читает
// файлы по пути на диске — сохраняем загруженные файлы во временную
// поддиректорию общего volume, зовём /api/v1/create, затем чистим за собой
// вне зависимости от результата (неудачные загрузки не должны копиться).
//
// Заливка идёт чанками (см. CreateTorrentPage.tsx), а не одним fetch —
// при 2GB/файл обрыв сети на 90-й секунде означал бы начинать всё заново.
// sessionId — sha256 от списка (имя+размер+lastModified) выбранных файлов,
// считается на фронте: если юзер после обрыва/релоада заново выбирает те
// же файлы, sessionId совпадает сам по себе, без localStorage — GET
// upload-status просто сообщает, сколько байт каждого файла уже лежит на
// диске, и фронт продолжает с этого места (с небольшим откатом на один
// чанк назад — на случай, если последняя запись была не завершена).

const SESSION_ID_RE = /^[0-9a-fA-F]{64}$/;
const CHUNK_UPLOAD_MAX_BYTES = 8 * 1024 * 1024; // с запасом над чанком в 5MB на фронте

function sessionDirFor(sessionId: string): string {
  return path.join(STORAGE_UPLOADS_PATH, sessionId);
}

const chunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: CHUNK_UPLOAD_MAX_BYTES },
});

app.get('/api/storage/details', async (req, res) => {
  try {
    const bagId = typeof req.query?.bag_id === 'string' ? req.query.bag_id : '';
    if (!bagId) {
      res.status(400).json({ error: 'bag_id is required' });
      return;
    }
    const details = await getBagDetails(bagId);

    // Демон помечает bag completed:true на уровне торрента (все пиры/куски
    // известны) РАНЬШЕ, чем реально дописывает файлы на диск в
    // DOWNLOADS_DIR/bagId — фронт по этому флагу сразу показывал кнопку
    // "Скачать" (см. вкладку "Загрузить" в CreateTorrentPage), а
    // GET /api/storage/download-file ещё не находил файл (404 "Файл ещё не
    // скачан на диск"). Актуально только для bag'ов, добавленных через
    // POST /api/storage/download (папка в DOWNLOADS_DIR существует) — для
    // собственных только что созданных bag'ов (вкладка "Создать") files/
    // completed от демона не про то же самое, их не трогаем.
    if (details.completed && Array.isArray(details.files)) {
      const bagDownloadDir = path.join(DOWNLOADS_DIR, bagId);
      if (fs.existsSync(bagDownloadDir)) {
        const allFilesOnDisk = details.files.every((f) => fs.existsSync(path.join(bagDownloadDir, f.name)));
        if (!allFilesOnDisk) {
          details.completed = false;
        }
      }
    }

    res.json(details);
  } catch (error: any) {
    console.error('❌ Ошибка получения деталей bag:', error);
    res.status(500).json({ error: error?.message || 'Failed to get bag details' });
  }
});

// Сколько байт каждого файла сессии уже принято на диск — фронт зовёт это
// перед стартом (и после каждого обрыва), чтобы знать, откуда продолжать.
// Пустой объект для незнакомого/нового sessionId — не ошибка, это старт с нуля.
app.get('/api/storage/upload-status', (req, res) => {
  const sessionId = typeof req.query?.sessionId === 'string' ? req.query.sessionId : '';
  if (!SESSION_ID_RE.test(sessionId)) {
    return res.status(400).json({ error: 'sessionId должен быть 64-символьной hex-строкой' });
  }
  const dir = sessionDirFor(sessionId);
  const received: Record<string, number> = {};
  try {
    if (fs.existsSync(dir)) {
      for (const entry of fs.readdirSync(dir)) {
        if (!entry.endsWith('.part')) continue;
        const name = entry.slice(0, -'.part'.length);
        received[name] = fs.statSync(path.join(dir, entry)).size;
      }
    }
  } catch (error) {
    console.error('❌ Ошибка чтения статуса заливки:', error);
  }
  res.json({ received });
  return;
});

// Принимает один чанк файла и дозаписывает его строго по указанному offset
// (не append) — повторная отправка того же чанка после обрыва идемпотентна,
// просто перезаписывает те же байты на то же место.
app.post('/api/storage/upload-chunk', chunkUpload.single('chunk'), async (req, res) => {
  try {
    const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId : '';
    const offset = Number(req.body?.offset);
    const fileName = typeof req.body?.fileName === 'string' ? path.basename(req.body.fileName) : '';
    const chunk = req.file;

    if (!SESSION_ID_RE.test(sessionId)) {
      return res.status(400).json({ error: 'sessionId должен быть 64-символьной hex-строкой' });
    }
    if (!fileName) {
      return res.status(400).json({ error: 'fileName обязателен' });
    }
    if (!Number.isInteger(offset) || offset < 0) {
      return res.status(400).json({ error: 'offset должен быть целым неотрицательным числом' });
    }
    if (!chunk || !chunk.buffer.length) {
      return res.status(400).json({ error: 'chunk обязателен и не может быть пустым' });
    }

    const dir = sessionDirFor(sessionId);
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `${fileName}.part`);

    const handle = await fs.promises.open(filePath, 'a+');
    try {
      await handle.write(chunk.buffer, 0, chunk.buffer.length, offset);
    } finally {
      await handle.close();
    }

    const receivedBytes = (await fs.promises.stat(filePath)).size;
    res.json({ receivedBytes });
  } catch (error: any) {
    console.error('❌ Ошибка записи чанка заливки:', error);
    res.status(500).json({ error: error?.message || 'Failed to write chunk' });
  }
  return;
});

// Финализация: все файлы сессии должны быть полностью на диске (размер
// каждого .part совпадает с ожидаемым) — иначе 409 со списком того, чего не
// хватает, фронт дозаливает недостающее и зовёт finalize снова.
app.post('/api/storage/finalize', async (req, res) => {
  const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId : '';
  const description = typeof req.body?.description === 'string' ? req.body.description : '';
  const files = Array.isArray(req.body?.files) ? req.body.files : [];

  if (!SESSION_ID_RE.test(sessionId)) {
    return res.status(400).json({ error: 'sessionId должен быть 64-символьной hex-строкой' });
  }
  if (files.length === 0) {
    return res.status(400).json({ error: 'files обязателен и не может быть пустым' });
  }

  const dir = sessionDirFor(sessionId);
  const incomplete: Array<{ name: string; receivedBytes: number; expectedBytes: number }> = [];

  for (const f of files) {
    const name = typeof f?.name === 'string' ? path.basename(f.name) : '';
    const expectedBytes = Number(f?.size);
    if (!name || !Number.isInteger(expectedBytes) || expectedBytes < 0) {
      return res.status(400).json({ error: 'Каждый элемент files должен содержать name и size' });
    }
    const partPath = path.join(dir, `${name}.part`);
    let receivedBytes = 0;
    try {
      receivedBytes = (await fs.promises.stat(partPath)).size;
    } catch {
      receivedBytes = 0;
    }
    if (receivedBytes !== expectedBytes) {
      incomplete.push({ name, receivedBytes, expectedBytes });
    }
  }

  if (incomplete.length > 0) {
    return res.status(409).json({ error: 'Не все файлы докачаны', incomplete });
  }

  try {
    for (const f of files) {
      const name = path.basename(f.name);
      await fs.promises.rename(path.join(dir, `${name}.part`), path.join(dir, name));
    }
    // ВАЖНО: файлы НЕ удаляются сразу после finalize — tonutils-storage
    // продолжает раздавать bag пирам/провайдеру с этого же пути, это не
    // одноразовое хеширование. Место на диске освобождается позже,
    // автоматически, только после того как юзер оплатит storage-contract
    // и ВСЕ выбранные провайдеры подтвердят ончейн реальное владение
    // данными (см. POST /api/storage/deals и services/storageDealsChecker.ts).
    // Если сделка так и не будет оплачена — эта строка просто остаётся
    // нерелизнутой навсегда (квоты на такие висящие заливки — TODO).
    const bagId = await createBag(dir, description);
    req.db.prepare(
      `INSERT OR REPLACE INTO storage_deals (bagId, uploadDir) VALUES (?, ?)`
    ).run(bagId, dir);
    res.json({ bagId });
  } catch (error: any) {
    console.error('❌ Ошибка создания bag через tonutils-storage:', error);
    fs.rm(dir, { recursive: true, force: true }, () => {}); // при ошибке — не копим мусор
    res.status(500).json({ error: error?.message || 'Failed to create bag' });
  }
  return;
});

// bagID — 64 hex-символа (sha256 корня Merkle-дерева) — только этот формат
// пускаем дальше в диск-путь, чтобы chuжой ввод не мог сделать path traversal.
const BAG_ID_RE = /^[0-9a-fA-F]{64}$/;

// Фронт зовёт это сразу после успешной отправки транзакции деплоя
// storage-contract'а (см. CreateTorrentPage.tsx, handleDeploy) — привязывает
// уже существующую (созданную в /api/storage/finalize) строку storage_deals
// к адресу контракта и списку выбранных провайдеров, чтобы
// storageDealsChecker знал, что и у кого проверять перед очисткой диска.
app.post('/api/storage/deals', (req, res) => {
  try {
    const bagId = typeof req.body?.bagId === 'string' ? req.body.bagId.trim().toLowerCase() : '';
    const contractAddress = typeof req.body?.contractAddress === 'string' ? req.body.contractAddress.trim() : '';
    const providers = req.body?.providers;

    if (!BAG_ID_RE.test(bagId)) {
      return res.status(400).json({ error: 'bagId должен быть 64-символьной hex-строкой' });
    }
    try {
      Address.parse(contractAddress);
    } catch {
      return res.status(400).json({ error: 'Некорректный contractAddress' });
    }
    if (!Array.isArray(providers) || providers.length === 0 || providers.length > 10) {
      return res.status(400).json({ error: 'providers должен быть непустым массивом (до 10 элементов)' });
    }
    for (const p of providers) {
      if (typeof p?.pubkey !== 'string' || typeof p?.address !== 'string') {
        return res.status(400).json({ error: 'Каждый provider должен содержать pubkey и address' });
      }
      try {
        Address.parse(p.address);
      } catch {
        return res.status(400).json({ error: `Некорректный address у провайдера: ${p.address}` });
      }
    }

    const result = req.db
      .prepare(
        `UPDATE storage_deals
         SET contractAddress = ?, providers = ?, requiredProviders = ?, dealSentAt = CURRENT_TIMESTAMP
         WHERE bagId = ?`
      )
      .run(contractAddress, JSON.stringify(providers), providers.length, bagId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'bag не найден — сначала вызови /api/storage/finalize' });
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error('❌ Ошибка регистрации storage-сделки:', error);
    res.status(500).json({ error: error?.message || 'Failed to register storage deal' });
  }
  return;
});

const DOWNLOADS_DIR = path.join(STORAGE_UPLOADS_PATH, 'downloads');

// Скачивание УЖЕ СУЩЕСТВУЮЩЕГО bag'а по bagID (не создание нового) — для
// вкладки "Загрузить" в CreateTorrentPage. Не блокирует запрос до завершения
// скачивания (может быть долгим) — просто запускает его на демоне, прогресс
// фронт опрашивает через уже существующий GET /api/storage/details.
app.post('/api/storage/download', async (req, res) => {
  try {
    const bagId = typeof req.body?.bagId === 'string' ? req.body.bagId.trim() : '';
    if (!BAG_ID_RE.test(bagId)) {
      return res.status(400).json({ error: 'bagId должен быть 64-символьной hex-строкой' });
    }
    const diskPath = path.join(DOWNLOADS_DIR, bagId);
    fs.mkdirSync(diskPath, { recursive: true });
    await addBag(bagId, diskPath);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('❌ Ошибка запуска скачивания bag через tonutils-storage:', error);
    return res.status(500).json({ error: error?.message || 'Failed to start bag download' });
  }
});

// Отдаёт содержимое одного файла из уже скачанного bag'а. Имя файла сверяется
// со списком files из getBagDetails (а не берётся из query как есть) — иначе
// произвольная строка в query стала бы path traversal через диск-путь.
app.get('/api/storage/download-file', async (req, res) => {
  try {
    const bagId = typeof req.query?.bag_id === 'string' ? req.query.bag_id : '';
    const fileName = typeof req.query?.file === 'string' ? req.query.file : '';
    if (!BAG_ID_RE.test(bagId) || !fileName) {
      return res.status(400).json({ error: 'bag_id и file обязательны' });
    }

    const details = await getBagDetails(bagId);
    const fileInfo = details.files?.find((f) => f.name === fileName);
    if (!fileInfo) {
      return res.status(404).json({ error: 'Файл не найден в этом bag' });
    }

    const filePath = path.join(DOWNLOADS_DIR, bagId, fileInfo.name);
    if (!filePath.startsWith(path.join(DOWNLOADS_DIR, bagId))) {
      return res.status(400).json({ error: 'Некорректный путь файла' });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Файл ещё не скачан на диск' });
    }

    return res.download(filePath, path.basename(fileInfo.name));
  } catch (error: any) {
    console.error('❌ Ошибка отдачи файла из bag:', error);
    return res.status(500).json({ error: error?.message || 'Failed to serve file' });
  }
});

// 1. Проверить наличие оплаченной попытки
app.get('/api/users/:address/payments/check', (req, res) => {
  try {
    const { address } = req.params;
    const { zoneType, length } = req.query as { zoneType: string; length: string };
    const db = req.db;
    
    console.log('🔍 [CHECK PAYMENT] Запрос на проверку оплаченной попытки:');
    console.log('📝 Адрес:', address);
    console.log('📝 Тип зоны:', zoneType);
    console.log('📝 Длина (строка):', length);
    console.log('📝 Длина (число):', parseInt(length, 10));
    
    if (!address || !zoneType || !length) {
      return res.status(400).json({
        success: false,
        message: 'Адрес, тип зоны и длина обязательны'
      });
    }

    if (!['proxy', 'sbt'].includes(zoneType)) {
      return res.status(400).json({
        success: false,
        message: 'Тип зоны должен быть "proxy" или "sbt"'
      });
    }

    const lengthNum = parseInt(length, 10);
    const lengthKey = getZoneLengthKey(lengthNum);
    
    console.log('🔑 [CHECK PAYMENT] Полученный lengthKey:', lengthKey);
    
    if (!lengthKey) {
      return res.status(400).json({
        success: false,
        message: 'Длина должна быть от 4 до 9 символов'
      });
    }

    // Получаем пользователя
    const user = db.prepare('SELECT nftAccessAmount FROM users WHERE address = ?').get(address) as User;
    
    if (!user) {
      console.log('👤 [CHECK PAYMENT] Пользователь не найден');
      return res.json({
        success: true,
        data: {
          hasPayment: false,
          zoneType,
          length: lengthNum
        }
      });
    }

    console.log('📊 [CHECK PAYMENT] Текущий nftAccessAmount (строка):', user.nftAccessAmount);
    
    const nftAccessAmount = parseNftAccessAmount(user.nftAccessAmount);
    
    console.log('📊 [CHECK PAYMENT] Парсированный nftAccessAmount:', JSON.stringify(nftAccessAmount));
    
    // Безопасное получение значения
    let hasPayment = false;
    if (zoneType === 'proxy') {
      hasPayment = nftAccessAmount.proxy[lengthKey] === true;
      console.log(`💰 [CHECK PAYMENT] Проверка proxy[${lengthKey}]:`, nftAccessAmount.proxy[lengthKey]);
    } else if (zoneType === 'sbt') {
      hasPayment = nftAccessAmount.sbt[lengthKey] === true;
      console.log(`💰 [CHECK PAYMENT] Проверка sbt[${lengthKey}]:`, nftAccessAmount.sbt[lengthKey]);
    }
    
    console.log(`✅ [CHECK PAYMENT] Результат: hasPayment = ${hasPayment}`);
    
    return res.json({
      success: true,
      data: {
        hasPayment,
        zoneType,
        length: lengthNum
      }
    });
  } catch (error) {
    console.error('❌ Ошибка при проверке оплаченной попытки:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

app.post('/api/users/:address/payments', (req, res) => {
  try {
    const { address } = req.params;
    const { zoneType, length } = req.body; // amountInTON больше не нужен
    const db = req.db;
    const isTestnet = req.isTestnet;
    
    console.log('➕ [ADD PAYMENT] Запрос на добавление оплаченной попытки:');
    console.log('📝 Адрес:', address);
    console.log('📝 Тип зоны:', zoneType);
    console.log('📝 Длина (число):', length);
    console.log('📝 Тестнет:', isTestnet);
    
    if (!address || !zoneType || !length) {
      return res.status(400).json({
        success: false,
        message: 'Адрес, тип зоны и длина обязательны'
      });
    }

    if (!['proxy', 'sbt'].includes(zoneType)) {
      return res.status(400).json({
        success: false,
        message: 'Тип зоны должен быть "proxy" или "sbt"'
      });
    }

    const lengthNum = parseInt(length, 10);
    const lengthKey = getZoneLengthKey(lengthNum);
    
    if (!lengthKey) {
      return res.status(400).json({
        success: false,
        message: 'Длина должна быть от 4 до 9 символов'
      });
    }

    // Получаем пользователя
    const user = db.prepare('SELECT * FROM users WHERE address = ?').get(address) as User;
    
    if (!user) {
      console.log('👤 [ADD PAYMENT] Пользователь не найден');
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    // Парсим текущие данные
    const nftAccessAmount = parseNftAccessAmount(user.nftAccessAmount);
    const totalPaidAttempts = parsePaymentAttemptsCount(user.totalPaidAttempts);
    
    // Устанавливаем оплаченную попытку в true
    if (zoneType === 'proxy') {
      nftAccessAmount.proxy[lengthKey] = true;
      totalPaidAttempts.proxy[lengthKey] = (totalPaidAttempts.proxy[lengthKey] || 0) + 1;
    } else if (zoneType === 'sbt') {
      nftAccessAmount.sbt[lengthKey] = true;
      totalPaidAttempts.sbt[lengthKey] = (totalPaidAttempts.sbt[lengthKey] || 0) + 1;
    }

    // Рассчитываем сумму оплаты на основе маппинга
    // Для расчета нужен домен, но у нас есть только длина
    // Создаем фиктивный домен нужной длины для расчета цены
    const dummyDomain = 'x'.repeat(lengthNum);
    const amount = calculateZonePrice(dummyDomain, zoneType === 'proxy');
    
    console.log(`💰 [ADD PAYMENT] Рассчитанная сумма: ${amount} TON для ${zoneType} зоны (${lengthNum} символов)`);

    // Обновляем траты на зоны
    let totalZoneSpending = Number(user.totalZoneSpending) || 0;
    let totalProxyZoneSpending = Number(user.totalProxyZoneSpending) || 0;
    let totalSbtZoneSpending = Number(user.totalSbtZoneSpending) || 0;
    
    // Обновляем прибыль (10% от суммы)
    let totalProfit = Number(user.totalProfit) || 0;
    const profit = amount * 0.1;
    totalProfit += profit;
    
    if (zoneType === 'proxy') {
      totalZoneSpending += amount;
      totalProxyZoneSpending += amount;
    } else if (zoneType === 'sbt') {
      totalZoneSpending += amount;
      totalSbtZoneSpending += amount;
    }
    
    // Обновляем пользователя
    const stmt = db.prepare(`
      UPDATE users 
      SET 
        nftAccessAmount = ?, 
        totalPaidAttempts = ?,
        totalZoneSpending = ?,
        totalProxyZoneSpending = ?,
        totalSbtZoneSpending = ?,
        totalProfit = ?,
        updatedAt = CURRENT_TIMESTAMP 
      WHERE address = ?
      RETURNING *
    `);
    
    const updatedUser = stmt.get(
      JSON.stringify(nftAccessAmount),
      JSON.stringify(totalPaidAttempts),
      totalZoneSpending,
      totalProxyZoneSpending,
      totalSbtZoneSpending,
      totalProfit,
      address
    ) as User;
    
    console.log('✅ [ADD PAYMENT] Пользователь обновлен:', updatedUser.address);
    
    // Отправляем уведомление в Telegram
    if (telegramBot && telegramBot.sendPaymentRecordedNotification) {
      telegramBot.sendPaymentRecordedNotification(address, zoneType, lengthNum, isTestnet);
    }
    
    return res.json({
      success: true,
      message: `Оплаченная попытка для ${zoneType} зоны (${lengthNum} символов) успешно добавлена`,
      data: parseUser(updatedUser)
    });
  } catch (error) {
    console.error('❌ Ошибка при добавлении оплаченной попытки:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Лог согласия с рисками proxy-зоны — пишется при КАЖДОМ создании proxy-зоны
// (не разовый флаг "больше не показывать"), модалка на фронте всё равно
// показывается каждый раз перед деплоем; это просто аудиторская отметка.
app.post('/api/users/:address/proxy-risk-ack', (req, res) => {
  try {
    const { address } = req.params;
    const db = req.db;

    if (!address) {
      return res.status(400).json({ success: false, message: 'Адрес обязателен' });
    }

    const result = db
      .prepare('UPDATE users SET proxyRiskAcknowledged = 1, updatedAt = CURRENT_TIMESTAMP WHERE address = ?')
      .run(address);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('❌ Ошибка при логировании согласия с рисками proxy-зоны:', error);
    return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
});

// Получить статистику пользователя
app.get('/api/users/:address/stats', (req, res) => {
  try {
    const { address } = req.params;
    const db = req.db;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Адрес обязателен'
      });
    }

    const user = db.prepare('SELECT * FROM users WHERE address = ?').get(address) as User;
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    const parsedUser = parseUser(user);
    
    // Получаем зоны пользователя
    const zones = db.prepare('SELECT * FROM zones WHERE owner = ?').all(address) as Zone[];
    
    // Получаем субдомены пользователя
    const subdomains = db.prepare('SELECT * FROM subdomains WHERE owner = ?').all(address) as Subdomain[];
    
    // Рассчитываем дополнительные метрики
    const proxyZones = zones.filter(z => z.proxy === 1).length;
    const sbtZones = zones.filter(z => z.proxy === 0).length;
    
    const activeSubdomains = subdomains.filter(s => s.status === 'active').length;
    const auctionSubdomains = subdomains.filter(s => s.status === 'auction').length;
    
    // Рассчитываем общий объем торгов
    const totalBidVolume = subdomains.reduce((sum, s) => sum + (s.lastBid || 0), 0);
    
    const stats = {
      user: {
        address: parsedUser.address,
        name: parsedUser.name,
        registrationDate: parsedUser.registrationDate
      },
      counts: {
        domains: parsedUser.domains,
        zones: parsedUser.zones,
        subdomains: parsedUser.subdomains,
        proxyZones,
        sbtZones,
        activeSubdomains,
        auctionSubdomains
      },
      financial: {
        totalZoneSpending: parsedUser.totalZoneSpending,
        totalSubdomainSpending: parsedUser.totalSubdomainSpending,
        totalProxyZoneSpending: parsedUser.totalProxyZoneSpending,
        totalSbtZoneSpending: parsedUser.totalSbtZoneSpending,
        totalProxySubdomainSpending: parsedUser.totalProxySubdomainSpending,
        totalSbtSubdomainSpending: parsedUser.totalSbtSubdomainSpending,
        totalProfit: parsedUser.totalProfit,
        totalBidVolume: totalBidVolume / 1_000_000_000 // Конвертируем в TON
      },
      paymentAttempts: parsedUser.totalPaidAttempts,
      nftAccess: parsedUser.nftAccessAmount,
      zones: zones.map(z => ({
        name: z.name,
        type: z.proxy === 1 ? 'proxy' : 'sbt',
        status: z.status,
        subdomainsAmount: z.subdomainsAmount,
        createdAt: z.createdAt
      }))
    };
    
    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Ошибка при получении статистики пользователя:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});



// 3. Списать оплаченную попытку (НОВЫЙ РОУТ)
app.delete('/api/users/:address/payments', (req, res) => {
  try {
    const { address } = req.params;
    const { zoneType, length } = req.body;
    const db = req.db;
    const isTestnet = req.isTestnet;
    
    console.log('➖ [CONSUME PAYMENT] Запрос на списание оплаченной попытки:');
    console.log('📝 Адрес:', address);
    console.log('📝 Тип зоны:', zoneType);
    console.log('📝 Длина (число):', length);
    console.log('📝 Тестнет:', isTestnet);
    
    if (!address || !zoneType || !length) {
      return res.status(400).json({
        success: false,
        message: 'Адрес, тип зоны и длина обязательны'
      });
    }

    if (!['proxy', 'sbt'].includes(zoneType)) {
      return res.status(400).json({
        success: false,
        message: 'Тип зоны должен быть "proxy" или "sbt"'
      });
    }

    const lengthNum = parseInt(length, 10);
    const lengthKey = getZoneLengthKey(lengthNum);
    
    console.log('🔑 [CONSUME PAYMENT] Полученный lengthKey:', lengthKey);
    
    if (!lengthKey) {
      return res.status(400).json({
        success: false,
        message: 'Длина должна быть от 4 до 9 символов'
      });
    }

    // Получаем пользователя
    const user = db.prepare('SELECT * FROM users WHERE address = ?').get(address) as User;
    
    if (!user) {
      console.log('👤 [CONSUME PAYMENT] Пользователь не найден');
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    console.log('📊 [CONSUME PAYMENT] Текущий nftAccessAmount (строка):', user.nftAccessAmount);
    
    // Парсим текущие оплаченные попытки
    const nftAccessAmount = parseNftAccessAmount(user.nftAccessAmount);
    
    console.log('📊 [CONSUME PAYMENT] Парсированный nftAccessAmount до изменения:', JSON.stringify(nftAccessAmount));
    
    // Проверяем, есть ли оплаченная попытка
    let hasAttempt = false;
    if (zoneType === 'proxy') {
      hasAttempt = nftAccessAmount.proxy[lengthKey];
      console.log(`💰 [CONSUME PAYMENT] Проверка proxy[${lengthKey}]:`, nftAccessAmount.proxy[lengthKey]);
    } else if (zoneType === 'sbt') {
      hasAttempt = nftAccessAmount.sbt[lengthKey];
      console.log(`💰 [CONSUME PAYMENT] Проверка sbt[${lengthKey}]:`, nftAccessAmount.sbt[lengthKey]);
    }

    if (!hasAttempt) {
      console.log(`❌ [CONSUME PAYMENT] Нет оплаченной попытки для ${zoneType} зоны (${lengthNum} символов)`);
      return res.status(400).json({
        success: false,
        message: `Нет оплаченной попытки для ${zoneType} зоны (${lengthNum} символов)`
      });
    }

    // Устанавливаем оплаченную попытку в false
    if (zoneType === 'proxy') {
      console.log(`💰 [CONSUME PAYMENT] Устанавливаем proxy[${lengthKey}] = false`);
      nftAccessAmount.proxy[lengthKey] = false;
    } else if (zoneType === 'sbt') {
      console.log(`💰 [CONSUME PAYMENT] Устанавливаем sbt[${lengthKey}] = false`);
      nftAccessAmount.sbt[lengthKey] = false;
    }

    console.log('📊 [CONSUME PAYMENT] nftAccessAmount после изменения:', JSON.stringify(nftAccessAmount));
    
    // Обновляем пользователя
    const stmt = db.prepare(`
      UPDATE users 
      SET nftAccessAmount = ?, updatedAt = CURRENT_TIMESTAMP 
      WHERE address = ?
      RETURNING *
    `);
    
    const updatedUser = stmt.get(JSON.stringify(nftAccessAmount), address) as User;
    
    console.log('✅ [CONSUME PAYMENT] Пользователь обновлен:', updatedUser.address);
    
    // Отправляем уведомление в Telegram
    if (telegramBot && telegramBot.sendPaymentConsumedNotification) {
      telegramBot.sendPaymentConsumedNotification(address, zoneType, lengthNum, isTestnet);
    }
    
    return res.json({
      success: true,
      message: `Оплаченная попытка для ${zoneType} зоны (${lengthNum} символов) успешно списана`,
      data: parseUser(updatedUser)
    });
  } catch (error) {
    console.error('❌ Ошибка при списании оплаченной попытки:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// 4. Получить все оплаченные попытки пользователя (НОВЫЙ РОУТ)
app.get('/api/users/:address/payments', (req, res) => {
  try {
    const { address } = req.params;
    const db = req.db;
    
    console.log('📋 [GET ALL PAYMENTS] Запрос всех оплаченных попыток:');
    console.log('📝 Адрес:', address);
    
    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Адрес обязателен'
      });
    }

    // Получаем пользователя
    const user = db.prepare('SELECT * FROM users WHERE address = ?').get(address) as User;
    
    // if (!user) {
    //   console.log('👤 [GET ALL PAYMENTS] Пользователь не найден');
    //   return res.status(404).json({
    //     success: false,
    //     message: 'Пользователь не найден'
    //   });
    // }

    if (!user) {
      return res.json({
        success: true,
        data: {
          proxy: {4: false, 5: false, 6: false, 7: false, 8: false, 9: false},
          sbt: {4: false, 5: false, 6: false, 7: false, 8: false, 9: false}
        }
      });
    }

    console.log('📊 [GET ALL PAYMENTS] Текущий nftAccessAmount (строка):', user.nftAccessAmount);
    
    // Парсим оплаченные попытки
    const nftAccessAmount = parseNftAccessAmount(user.nftAccessAmount);
    
    console.log('📊 [GET ALL PAYMENTS] Парсированный nftAccessAmount:', JSON.stringify(nftAccessAmount));
    
    return res.json({
      success: true,
      data: nftAccessAmount
    });
  } catch (error) {
    console.error('❌ Ошибка при получении оплаченных попыток:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});


app.post('/api/users', (req, res) => {
  try {
    const { address, name } = req.body;
    const db = req.db;
    const isTestnet = req.isTestnet;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Адрес обязателен'
      });
    }

    const existingUser = db.prepare('SELECT * FROM users WHERE address = ?').get(address) as User;
    
    if (existingUser) {
      return res.json({
        success: true,
        message: 'Пользователь уже существует',
        data: parseUser(existingUser)
      });
    }

    // Промо-акция "Зарегайся и получи SBT-зону бесплатно" — каждому новому
    // юзеру сразу выдаём одну бесплатную попытку на SBT-зону случайной длины
    // (4-9), тем же способом, которым обычно выдаётся платная попытка
    // (см. recordPayment ниже: nftAccessAmount.sbt[length]=true +
    // totalPaidAttempts.sbt[length]++ — checkPaymentAttempts/hasPaidAttempt
    // на фронте её увидит как обычную доступную попытку).
    const promoLength = String(4 + Math.floor(Math.random() * 6)); // '4'..'9'

    const nftAccessAmountObj = {
      proxy: {4: false, 5: false, 6: false, 7: false, 8: false, 9: false},
      sbt: {4: false, 5: false, 6: false, 7: false, 8: false, 9: false}
    } as Record<'proxy' | 'sbt', Record<string, boolean>>;
    nftAccessAmountObj.sbt[promoLength] = true;
    const defaultNftAccessAmount = JSON.stringify(nftAccessAmountObj);

    const totalPaidAttemptsObj = {
      proxy: {4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0},
      sbt: {4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0}
    } as Record<'proxy' | 'sbt', Record<string, number>>;
    totalPaidAttemptsObj.sbt[promoLength] = 1;
    const defaultTotalPaidAttempts = JSON.stringify(totalPaidAttemptsObj);

    console.log(`🎁 [PROMO] Новому юзеру ${address} выдана бесплатная SBT-попытка длины ${promoLength}`);
    
    const stmt = db.prepare(`
      INSERT INTO users (
        address, name, domains, zones, subdomains, 
        proxyZones, sbtZones, proxySubdomains, sbtSubdomains,
        nftAccessAmount, totalPaidAttempts,
        totalZoneSpending, totalSubdomainSpending,
        totalProxyZoneSpending, totalSbtZoneSpending,
        totalProxySubdomainSpending, totalSbtSubdomainSpending,
        totalProfit
      ) 
      VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0, ?, ?, 0, 0, 0, 0, 0, 0, 0)
      RETURNING *
    `);
    
    const user = stmt.get(
      address, 
      name || null,
      defaultNftAccessAmount,
      defaultTotalPaidAttempts
    ) as User;
    
    telegramBot.sendNewUserNotification(address, isTestnet);
    telegramBot.sendPublicPromoGrantedNotification(address, promoLength, isTestnet);

    return res.status(201).json({
      success: true,
      message: 'Пользователь успешно создан',
      data: parseUser(user)
    });
  } catch (error: any) {
    console.error('❌ Ошибка при создании пользователя:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// ========== УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЯ ПО ID ==========

app.delete('/api/users/:id', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    const isTestnet = req.isTestnet;
    
    console.log('🗑️ [DELETE USER] Запрос на удаление пользователя:');
    console.log('📝 ID пользователя:', id);
    console.log('🌐 Network:', isTestnet ? 'testnet' : 'mainnet');
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID пользователя обязателен'
      });
    }

    // Проверяем существование пользователя
    const existingUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User;
    
    if (!existingUser) {
      console.log('❌ [DELETE USER] Пользователь не найден');
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    // Проверяем, есть ли связанные зоны
    const zonesCount = db.prepare('SELECT COUNT(*) as count FROM zones WHERE owner = ?')
      .get(existingUser.address) as { count: number };
    
    if (zonesCount.count > 0) {
      console.log(`⚠️ [DELETE USER] У пользователя есть ${zonesCount.count} связанных зон`);
      return res.status(400).json({
        success: false,
        message: `Невозможно удалить пользователя. У него есть ${zonesCount.count} связанных зон.`
      });
    }

    // Проверяем, есть ли связанные субдомены
    const subdomainsCount = db.prepare('SELECT COUNT(*) as count FROM subdomains WHERE owner = ?')
      .get(existingUser.address) as { count: number };
    
    if (subdomainsCount.count > 0) {
      console.log(`⚠️ [DELETE USER] У пользователя есть ${subdomainsCount.count} связанных субдоменов`);
      return res.status(400).json({
        success: false,
        message: `Невозможно удалить пользователя. У него есть ${subdomainsCount.count} связанных субдоменов.`
      });
    }

    // Проверяем, есть ли связанные оплаченные попытки
    const paymentsCount = db.prepare('SELECT COUNT(*) as count FROM payment_attempts WHERE address = ?')
      .get(existingUser.address) as { count: number };
    
    if (paymentsCount.count > 0) {
      console.log(`⚠️ [DELETE USER] У пользователя есть ${paymentsCount.count} оплаченных попыток`);
      return res.status(400).json({
        success: false,
        message: `Невозможно удалить пользователя. У него есть ${paymentsCount.count} оплаченных попыток.`
      });
    }

    // Удаляем пользователя
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);
    
    console.log(`✅ [DELETE USER] Пользователь ${existingUser.address} (${existingUser.name}) удален. Затронуто строк: ${result.changes}`);
    
    // Отправляем уведомление в Telegram
    // if (telegramBot && telegramBot.sendUserDeletedNotification) {
    //   telegramBot.sendUserDeletedNotification(
    //     existingUser.address,
    //     existingUser.name,
    //     isTestnet
    //   );
    // }
    
    return res.json({
      success: true,
      message: `Пользователь "${existingUser.name}" (${existingUser.address}) успешно удален`,
      data: {
        deletedUser: existingUser,
        affectedRows: result.changes
      }
    });
  } catch (error) {
    console.error('❌ Ошибка при удалении пользователя:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Список всех юзеров — только для админки (тот же паттерн защиты, что и
// deleteUser ниже: список адресов/промо-данных чувствителен).
app.get('/api/users', requireAdminAuth, (req, res) => {
  try {
    const db = req.db;
    const users = db.prepare('SELECT * FROM users ORDER BY registrationDate DESC').all() as User[];

    return res.json({
      success: true,
      data: users.map(parseUser)
    });
  } catch (error) {
    console.error('❌ Ошибка при получении списка пользователей:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

app.get('/api/users/:address', (req, res) => {
  try {
    const { address } = req.params;
    const db = req.db;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Адрес обязателен'
      });
    }

    const user = db.prepare('SELECT * FROM users WHERE address = ?').get(address) as User;
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    console.log('✅ [GET USER] Пользователь найден:', user.address);
    return res.json({
      success: true,
      data: parseUser(user)
    });
  } catch (error) {
    console.error('❌ Ошибка при получении пользователя:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// ========== ЗОНЫ ==========

app.post('/api/zones', (req, res) => {
  try {
    const { name, address, collectionAddress, wrapperAddress, proxy, owner, zonePrice, currentID } = req.body;
    const db = req.db;
    const isTestnet = req.isTestnet;
    
    console.log(`Пришел запрос по созданию зоны (${isTestnet ? 'testnet' : 'mainnet'}):`, req.body);

    if (!name || !address || !owner) {
      return res.status(400).json({
        success: false,
        message: 'Название зоны, владелец и адрес обязательны'
      });
    }

    const nameCheck = validateDomainName(name);
    if (!nameCheck.valid) {
      return res.status(400).json({ success: false, message: nameCheck.message });
    }

    // Проверяем, существует ли уже зона с таким именем и активным статусом
    const existingActiveZone = db.prepare(`
      SELECT * FROM zones 
      WHERE name = ? AND status = 'active'
    `).get(name) as Zone;

    if (existingActiveZone) {
      console.log(`⚠️ Активная зона с именем ${name} уже существует. Создаем новую зону.`);
    }

    // Создаем новую зону со статусом active
    const stmt = db.prepare(`
      INSERT INTO zones (name, address, collectionAddress, wrapperAddress, proxy, owner, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);

    const result = stmt.run(
      name, 
      address, 
      collectionAddress || null,
      wrapperAddress || null,
      proxy ? 1 : 0,
      owner,
      'active'
    );

    const zone = db.prepare('SELECT * FROM zones WHERE id = ?').get(result.lastInsertRowid) as Zone;

    // Инкрементируем счетчики зон у пользователя
    if (owner) {
      const userAddress = owner;
      
      // Определяем, какие счетчики обновлять
      if (proxy) {
        // Proxy зона
        db.prepare(`
          UPDATE users 
          SET 
            zones = zones + 1, 
            proxyZones = proxyZones + 1,
            updatedAt = CURRENT_TIMESTAMP 
          WHERE address = ?
        `).run(userAddress);
      } else {
        // SBT зона
        db.prepare(`
          UPDATE users 
          SET 
            zones = zones + 1, 
            sbtZones = sbtZones + 1,
            updatedAt = CURRENT_TIMESTAMP 
          WHERE address = ?
        `).run(userAddress);
      }
      
      console.log(`📊 [CREATE ZONE] Счетчики зон увеличены для пользователя ${userAddress}`);
    }

    // Отправляем уведомление в Telegram о новой зоне
    if (proxy) {
      telegramBot.sendProxyZoneCreatedNotification(name, address, owner || address, zonePrice, isTestnet);
    } else {
      telegramBot.sendSBTZoneCreatedNotification(name, address, owner || address, zonePrice, collectionAddress || address, currentID, isTestnet);
    }

    return res.status(201).json({
      success: true,
      message: 'Зона успешно создана',
      data: zone
    });
  } catch (error: any) {
    console.error('❌ Ошибка при создании зоны:', error);
    
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({
        success: false,
        message: 'Зона с таким названием уже существует (возможно, с другим статусом)'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Удалить зону по ID
app.delete('/api/zones/:id', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    const isTestnet = req.isTestnet;
    
    console.log('🗑️ [DELETE ZONE] Запрос на удаление зоны:');
    console.log('📝 ID зоны:', id);
    console.log('🌐 Network:', isTestnet ? 'testnet' : 'mainnet');
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID зоны обязателен'
      });
    }

    // Проверяем существование зоны
    const existingZone = db.prepare('SELECT * FROM zones WHERE id = ?').get(id) as Zone;
    
    if (!existingZone) {
      console.log('❌ [DELETE ZONE] Зона не найдена');
      return res.status(404).json({
        success: false,
        message: 'Зона не найдена'
      });
    }

    // Проверяем, есть ли связанные субдомены
    const subdomainsCount = db.prepare('SELECT COUNT(*) as count FROM subdomains WHERE zoneId = ?')
      .get(id) as { count: number };
    
    if (subdomainsCount.count > 0) {
      console.log(`⚠️ [DELETE ZONE] У зоны есть ${subdomainsCount.count} связанных субдоменов`);
      return res.status(400).json({
        success: false,
        message: `Невозможно удалить зону. У нее есть ${subdomainsCount.count} связанных субдоменов.`
      });
    }

    // Удаляем зону
    const stmt = db.prepare('DELETE FROM zones WHERE id = ?');
    const result = stmt.run(id);
    
    console.log(`✅ [DELETE ZONE] Зона ${existingZone.name} удалена. Затронуто строк: ${result.changes}`);
    
    // Отправляем уведомление в Telegram
    // if (telegramBot && telegramBot.sendZoneDeletedNotification) {
    //   telegramBot.sendZoneDeletedNotification(
    //     existingZone.name,
    //     existingZone.address,
    //     isTestnet
    //   );
    // }
    
    return res.json({
      success: true,
      message: `Зона "${existingZone.name}" успешно удалена`,
      data: {
        deletedZone: existingZone,
        affectedRows: result.changes
      }
    });
  } catch (error) {
    console.error('❌ Ошибка при удалении зоны:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

app.put('/api/zones/:id/status', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const db = req.db;
    const isTestnet = req.isTestnet;
    
    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Некорректный статус. Допустимые значения: active, inactive'
      });
    }

    // Проверяем существование зоны
    const existingZone = db.prepare('SELECT * FROM zones WHERE id = ?').get(id) as Zone;
    
    if (!existingZone) {
      return res.status(404).json({
        success: false,
        message: 'Зона не найдена'
      });
    }

    // Обновляем статус зоны
    const stmt = db.prepare(`
      UPDATE zones 
      SET status = ?, updatedAt = CURRENT_TIMESTAMP 
      WHERE id = ?
      RETURNING *
    `);
    
    const updatedZone = stmt.get(status, id) as Zone;
    
    // Если статус меняется на inactive, обновляем статус всех связанных субдоменов
    if (status === 'inactive' && existingZone.status === 'active') {
      const collectionAddress = existingZone.collectionAddress;
      
      if (collectionAddress) {
        // Находим все субдомены с таким collectionAddress и обновляем их статус
        const updateSubdomainsStmt = db.prepare(`
          UPDATE subdomains 
          SET status = 'inactive', updatedAt = CURRENT_TIMESTAMP 
          WHERE collectionAddress = ? AND status != 'claimed'
        `);
        
        const result = updateSubdomainsStmt.run(collectionAddress);
        console.log(`✅ Обновлено ${result.changes} субдоменов для зоны ${existingZone.name}`);
      }
      
      // Отправляем уведомление в Telegram
      telegramBot.sendZoneStatusChangedNotification(
        existingZone.name,
        existingZone.address,
        'inactive',
        isTestnet
      );
    }
    
    return res.json({
      success: true,
      message: `Статус зоны успешно обновлен на '${status}'`,
      data: updatedZone
    });
  } catch (error: any) {
    console.error('❌ Ошибка при обновлении статуса зоны:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// НОВЫЙ ЭНДПОИНТ: Получить зоны по статусу
app.get('/api/zones/status/:status', (req, res) => {
  try {
    const { status } = req.params;
    const db = req.db;
    
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Некорректный статус. Допустимые значения: active, inactive'
      });
    }
    
    const zones = db.prepare(`
      SELECT * FROM zones 
      WHERE status = ? 
      ORDER BY createdAt DESC
    `).all(status) as Zone[];
    
    return res.json({
      success: true,
      data: {
        count: zones.length,
        zones
      }
    });
  } catch (error) {
    console.error('❌ Ошибка при получении зон по статусу:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// НОВЫЙ ЭНДПОИНТ: Получить активные зоны по имени (для проверки существования)
app.get('/api/zones/name/:name/active', (req, res) => {
  try {
    const { name } = req.params;
    const db = req.db;
    
    const zone = db.prepare(`
      SELECT * FROM zones 
      WHERE name = ? AND status = 'active'
    `).get(name) as Zone;
    
    if (!zone) {
      return res.status(404).json({
        success: false,
        message: 'Активная зона с таким именем не найдена'
      });
    }
    
    return res.json({
      success: true,
      data: zone
    });
  } catch (error) {
    console.error('❌ Ошибка при получении активной зоны по имени:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Обновить collectionAddress зоны
app.put('/api/zones/:name/collection', requireAdminAuth, (req, res) => {
  try {
    const { name } = req.params;
    const { collectionAddress } = req.body;
    const db = req.db;
    const isTestnet = req.isTestnet;

    if (!collectionAddress) {
      return res.status(400).json({
        success: false,
        message: 'Collection address обязателен'
      });
    }

    // Проверяем существование зоны
    const existingZone = db.prepare('SELECT * FROM zones WHERE name = ?').get(name) as Zone;

    if (!existingZone) {
      return res.status(404).json({
        success: false,
        message: 'Зона не найдена'
      });
    }

    // Обновляем зону с collectionAddress
    const stmt = db.prepare(`
      UPDATE zones 
      SET collectionAddress = ?, updatedAt = CURRENT_TIMESTAMP 
      WHERE name = ?
      RETURNING *
    `);

    const updatedZone = stmt.get(collectionAddress, name) as Zone;

    // Отправляем уведомление в Telegram
    // telegramBot.sendBundleDeployedNotification(name, existingZone?.owner as string, collectionAddress, isTestnet);

    console.log(`✅ Collection адрес ${collectionAddress} добавлен к зоне ${name} (${isTestnet ? 'testnet' : 'mainnet'})`);

    return res.json({
      success: true,
      message: 'Collection адрес успешно добавлен к зоне',
      data: updatedZone
    });
  } catch (error: any) {
    console.error('❌ Ошибка при обновлении зоны с collection:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Обновить wrapperAddress зоны
app.put('/api/zones/:name/wrapper', requireAdminAuth, (req, res) => {
  try {
    const { name } = req.params;
    const { wrapperAddress } = req.body;
    const db = req.db;
    const isTestnet = req.isTestnet;
    
    if (!wrapperAddress) {
      return res.status(400).json({
        success: false,
        message: 'Wrapper address обязателен'
      });
    }

    // Проверяем существование зоны
    const existingZone = db.prepare('SELECT * FROM zones WHERE name = ?').get(name) as Zone;

    if (!existingZone) {
      return res.status(404).json({
        success: false,
        message: 'Зона не найдена'
      });
    }

    // Обновляем зону с wrapperAddress
    const stmt = db.prepare(`
      UPDATE zones 
      SET wrapperAddress = ?, updatedAt = CURRENT_TIMESTAMP 
      WHERE name = ?
      RETURNING *
    `);

    const updatedZone = stmt.get(wrapperAddress, name) as Zone;

    console.log(`✅ Wrapper адрес ${wrapperAddress} добавлен к зоне ${name} (${isTestnet ? 'testnet' : 'mainnet'})`);

    return res.json({
      success: true,
      message: 'Wrapper адрес успешно добавлен к зоне',
      data: updatedZone
    });
  } catch (error: any) {
    console.error('❌ Ошибка при обновлении зоны с wrapper:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Получить все зоны
app.get('/api/zones', (req, res) => {
  try {
    const db = req.db;
    const zones = db.prepare('SELECT * FROM zones ORDER BY createdAt DESC').all() as Zone[];
    
    res.json({
      success: true,
      data: {
        count: zones.length,
        zones
      }
    });
  } catch (error) {
    console.error('❌ Ошибка при получении зон:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});



// Получить зоны пользователя
app.get('/api/zones/user/:address', (req, res) => {
  try {
    const { address } = req.params;
    const db = req.db;
    
    const zones = db.prepare('SELECT * FROM zones WHERE owner = ? ORDER BY createdAt DESC').all(address) as Zone[];

    res.json({
      success: true,
      data: {
        count: zones.length,
        zones
      }
    });
  } catch (error) {
    console.error('❌ Ошибка при получении зон пользователя:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Получить зону по имени
app.get('/api/zones/name/:name', (req, res) => {
  try {
    const { name } = req.params;
    const db = req.db;
    
    const zone = db.prepare('SELECT * FROM zones WHERE name = ?').get(name) as Zone;

    if (!zone) {
      return res.status(404).json({
        success: false,
        message: 'Зона не найдена'
      });
    }

    return res.json({
      success: true,
      data: zone
    });
  } catch (error) {
    console.error('❌ Ошибка при получении зоны по имени:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Поиск зон по имени
app.get('/api/zones/search/:query', (req, res) => {
  try {
    const { query } = req.params;
    const db = req.db;
    
    const zones = db.prepare(`
      SELECT * FROM zones 
      WHERE name LIKE ? 
      ORDER BY createdAt DESC
      LIMIT 20
    `).all(`%${query}%`) as Zone[];

    return res.json({
      success: true,
      data: {
        count: zones.length,
        zones
      }
    });
  } catch (error) {
    console.error('❌ Ошибка при поиске зон:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Получить зоны по типу (proxy или sbt)
app.get('/api/zones/type/:type', (req, res) => {
  try {
    const { type } = req.params;
    const db = req.db;
    
    if (type !== 'proxy' && type !== 'sbt') {
      return res.status(400).json({
        success: false,
        message: 'Тип должен быть "proxy" или "sbt"'
      });
    }

    const proxyValue = type === 'proxy' ? 1 : 0;
    const zones = db.prepare(`
      SELECT * FROM zones 
      WHERE proxy = ? 
      ORDER BY createdAt DESC
    `).all(proxyValue) as Zone[];

    return res.json({
      success: true,
      data: {
        count: zones.length,
        zones
      }
    });
  } catch (error) {
    console.error('❌ Ошибка при получении зон по типу:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Получить зоны владельца (для SBT зон)
app.get('/api/zones/owner/:owner', (req, res) => {
  try {
    const { owner } = req.params;
    const db = req.db;
    
    const zones = db.prepare(`
      SELECT * FROM zones 
      WHERE owner = ? AND proxy = 0
      ORDER BY createdAt DESC
    `).all(owner) as Zone[];

    res.json({
      success: true,
      data: {
        count: zones.length,
        zones
      }
    });
  } catch (error) {
    console.error('❌ Ошибка при получении зон владельца:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// ========== ОБНОВЛЕНИЕ АДРЕСА ЗОНЫ ПО ID ==========

app.put('/api/zones/:id/address', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { address } = req.body;
    const db = req.db;
    const isTestnet = req.isTestnet;
    
    console.log('🔄 [UPDATE ZONE ADDRESS] Запрос на обновление адреса зоны:');
    console.log('📝 ID зоны:', id);
    console.log('📝 Новый адрес:', address);
    console.log('🌐 Network:', isTestnet ? 'testnet' : 'mainnet');
    
    if (!id || !address) {
      return res.status(400).json({
        success: false,
        message: 'ID зоны и новый адрес обязательны'
      });
    }

    // Проверяем существование зоны
    const existingZone = db.prepare('SELECT * FROM zones WHERE id = ?').get(id) as Zone;
    
    if (!existingZone) {
      console.log('❌ [UPDATE ZONE ADDRESS] Зона не найдена');
      return res.status(404).json({
        success: false,
        message: 'Зона не найдена'
      });
    }

    // Обновляем адрес зоны
    const stmt = db.prepare(`
      UPDATE zones 
      SET address = ?, updatedAt = CURRENT_TIMESTAMP 
      WHERE id = ?
      RETURNING *
    `);
    
    const updatedZone = stmt.get(address, id) as Zone;
    
    console.log(`✅ [UPDATE ZONE ADDRESS] Адрес зоны ${existingZone.name} обновлен с ${existingZone.address} на ${address}`);
    
    return res.json({
      success: true,
      message: `Адрес зоны "${existingZone.name}" успешно обновлен`,
      data: updatedZone
    });
  } catch (error) {
    console.error('❌ Ошибка при обновлении адреса зоны:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// ========== ОБНОВЛЕНИЕ OWNER ЗОНЫ ПО ID ==========
//
// Пока чисто ручная бухгалтерия в БД — реального смартконтракта офферов
// на покупку/продажу Proxy-коллекций ещё нет (третий таб в MarketPage,
// планируется отдельно). До него — админ вручную сверяет офчейн-договорённость
// об оффере и правит владельца тут же, как уже делает updateSubdomainOwner.
app.put('/api/zones/:id/owner', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { owner } = req.body;
    const db = req.db;
    const isTestnet = req.isTestnet;

    console.log('🔄 [UPDATE ZONE OWNER] Запрос на обновление владельца зоны:');
    console.log('📝 ID зоны:', id);
    console.log('📝 Новый владелец:', owner);
    console.log('🌐 Network:', isTestnet ? 'testnet' : 'mainnet');

    if (!id || !owner) {
      return res.status(400).json({
        success: false,
        message: 'ID зоны и новый владелец обязательны'
      });
    }

    const existingZone = db.prepare('SELECT * FROM zones WHERE id = ?').get(id) as Zone;

    if (!existingZone) {
      console.log('❌ [UPDATE ZONE OWNER] Зона не найдена');
      return res.status(404).json({
        success: false,
        message: 'Зона не найдена'
      });
    }

    const stmt = db.prepare(`
      UPDATE zones
      SET owner = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);

    const updatedZone = stmt.get(owner, id) as Zone;

    console.log(`✅ [UPDATE ZONE OWNER] Владелец зоны ${existingZone.name} обновлен с ${existingZone.owner || 'нет'} на ${owner}`);

    return res.json({
      success: true,
      message: `Владелец зоны "${existingZone.name}" успешно обновлен`,
      data: updatedZone
    });
  } catch (error) {
    console.error('❌ Ошибка при обновлении владельца зоны:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// ========== СУБДОМЕНЫ ==========

app.post('/api/subdomains', (req, res) => {
  try {
    const { 
      name, 
      address, 
      mintPrice, 
      links, 
      zoneId, 
      owner, 
      status, 
      auctionEndTime,
      collectionAddress 
    } = req.body;
    const db = req.db;
    const isTestnet = req.isTestnet;

   console.log(`Полученный name для создания субдомена: ${name}`);    
    console.log(`Полученный address для создания субдомена: ${address}`);
    console.log(`Полученный mintPrice для создания субдомена: ${mintPrice}`);
    console.log(`Полученный links для создания субдомена: ${links}`);
    console.log(`Полученный zoneId для создания субдомена: ${zoneId}`);
    console.log(`Полученный owner для создания субдомена: ${owner}`);
    console.log(`Полученный status для создания субдомена: ${status}`);
    console.log(`Полученный auctionEndTime для создания субдомена: ${auctionEndTime}`);
    console.log(`Полученный collectionAddress для создания субдомена: ${collectionAddress}`);

    if (!name || !address || mintPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Название субдомена, адрес и цена обязательны'
      });
    }

    const nameCheck = validateDomainName(name);
    if (!nameCheck.valid) {
      return res.status(400).json({ success: false, message: nameCheck.message });
    }

    // Если передан zoneId, получаем collectionAddress из зоны
    let finalCollectionAddress = collectionAddress;
    let zoneType = 'sbt'; // По умолчанию SBT
    if (zoneId) {
      const zone = db.prepare('SELECT * FROM zones WHERE id = ?').get(zoneId) as Zone;
      if (zone) {
        if (!finalCollectionAddress && zone.collectionAddress) {
          finalCollectionAddress = zone.collectionAddress;
        }
        // Определяем тип зоны
        zoneType = zone.proxy === 1 ? 'proxy' : 'sbt';
      }
    }

    // Определяем начальные значения для lastBid и lastBidder
    const initialLastBid = mintPrice * 1000000000;
    const initialLastBidder = owner;
    
    // Создаем начальную ставку в массиве bids
    const initialBid = {
      bidder: owner,
      amount: mintPrice * 1000000000,
      timestamp: new Date().toISOString()
    };
    const initialBidsArray = [initialBid];

    const stmt = db.prepare(`
      INSERT INTO subdomains (
        name, address, mintPrice, links, zoneId, owner, status, 
        auctionEndTime, lastBid, lastBidder, bids, collectionAddress
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);
    
    const result = stmt.run(
      name, 
      address, 
      mintPrice, 
      JSON.stringify(links || []), 
      zoneId || null,
      owner,
      status,
      auctionEndTime || null,
      initialLastBid,
      initialLastBidder,
      JSON.stringify(initialBidsArray),
      finalCollectionAddress || null
    );
    
    // Обновляем количество субдоменов в зоне
    if (zoneId) {
      const subdomainsCount = db.prepare('SELECT COUNT(*) as count FROM subdomains WHERE zoneId = ?')
        .get(zoneId) as { count: number };
      
      db.prepare('UPDATE zones SET subdomainsAmount = ? WHERE id = ?')
        .run(subdomainsCount.count, zoneId);
    }
    
    const subdomain = db.prepare('SELECT * FROM subdomains WHERE id = ?').get(result.lastInsertRowid) as Subdomain;
    
    // Парсим JSON поля
    const parsedSubdomain = {
      ...subdomain,
      links: JSON.parse(subdomain.links || '[]'),
      bids: JSON.parse(subdomain.bids || '[]')
    };
    
    // Если статус active (SBT минт) - обновляем счетчики пользователя
    if (status === 'active' && owner) {
      // Обновляем общие счетчики
      db.prepare(`
        UPDATE users 
        SET 
          subdomains = subdomains + 1,
          sbtSubdomains = sbtSubdomains + 1,
          totalSubdomainSpending = totalSubdomainSpending + ?,
          totalSbtSubdomainSpending = totalSbtSubdomainSpending + ?,
          updatedAt = CURRENT_TIMESTAMP 
        WHERE address = ?
      `).run(mintPrice, mintPrice, owner);
      
      console.log(`📊 [CREATE SUBDOMAIN] Счетчики SBT субдоменов увеличены для пользователя ${owner}`);
    }
    
    // Отправляем уведомление в Telegram
    const priceInTON = mintPrice;
    
    if (status === 'auction') {
      telegramBot.sendAuctionStartedNotification(name, address, priceInTON, isTestnet);
    } else if (status === 'active') {
      telegramBot.sendSBTSubdomainMintedNotification(name, address, owner, priceInTON, isTestnet);
    }
    
    return res.status(201).json({
      success: true,
      message: 'Субдомен успешно создан',
      data: parsedSubdomain
    });
  } catch (error: any) {
    console.error('❌ Ошибка при создании субдомена:', error);
    
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({
        success: false,
        message: 'Субдомен с таким названием уже существует'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Удалить субдомен по ID
app.delete('/api/subdomains/:id' , requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    const isTestnet = req.isTestnet;
    
    console.log('🗑️ [DELETE SUBDOMAIN] Запрос на удаление субдомена:');
    console.log('📝 ID субдомена:', id);
    console.log('🌐 Network:', isTestnet ? 'testnet' : 'mainnet');
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID субдомена обязателен'
      });
    }

    // Проверяем существование субдомена
    const existingSubdomain = db.prepare('SELECT * FROM subdomains WHERE id = ?').get(id) as Subdomain;
    
    if (!existingSubdomain) {
      console.log('❌ [DELETE SUBDOMAIN] Субдомен не найден');
      return res.status(404).json({
        success: false,
        message: 'Субдомен не найден'
      });
    }

    // Проверяем, есть ли связанные аукционы
    const auctionsCount = db.prepare('SELECT COUNT(*) as count FROM auctions WHERE subdomainId = ?')
      .get(id) as { count: number };
    
    if (auctionsCount.count > 0) {
      console.log(`⚠️ [DELETE SUBDOMAIN] У субдомена есть ${auctionsCount.count} связанных аукционов`);
      return res.status(400).json({
        success: false,
        message: `Невозможно удалить субдомен. У него есть ${auctionsCount.count} связанных аукционов.`
      });
    }

    // Удаляем субдомен
    const stmt = db.prepare('DELETE FROM subdomains WHERE id = ?');
    const result = stmt.run(id);
    
    console.log(`✅ [DELETE SUBDOMAIN] Субдомен ${existingSubdomain.name} удален. Затронуто строк: ${result.changes}`);
    
    // Обновляем количество субдоменов в зоне, если есть zoneId
    if (existingSubdomain.zoneId) {
      const subdomainsCount = db.prepare('SELECT COUNT(*) as count FROM subdomains WHERE zoneId = ?')
        .get(existingSubdomain.zoneId) as { count: number };
      
      db.prepare('UPDATE zones SET subdomainsAmount = ? WHERE id = ?')
        .run(subdomainsCount.count, existingSubdomain.zoneId);
      
      console.log(`📊 [DELETE SUBDOMAIN] Обновлено количество субдоменов в зоне ${existingSubdomain.zoneId}: ${subdomainsCount.count}`);
    }
    
    return res.json({
      success: true,
      message: `Субдомен "${existingSubdomain.name}" успешно удален`,
      data: {
        deletedSubdomain: existingSubdomain,
        affectedRows: result.changes
      }
    });
  } catch (error) {
    console.error('❌ Ошибка при удалении субдомена:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});


// НОВЫЙ ЭНДПОИНТ: Получить субдомены по collectionAddress
app.get('/api/subdomains/collection/:collectionAddress', (req, res) => {
  try {
    const { collectionAddress } = req.params;
    const db = req.db;
    
    const subdomains = db.prepare(`
      SELECT * FROM subdomains 
      WHERE collectionAddress = ? 
      ORDER BY createdAt DESC
    `).all(collectionAddress) as Subdomain[];
    
    const parsedSubdomains = subdomains.map((subdomain) => ({
      ...subdomain,
      links: JSON.parse(subdomain.links || '[]'),
      bids: JSON.parse(subdomain.bids || '[]')
    }));
    
    res.json({
      success: true,
      data: {
        count: parsedSubdomains.length,
        subdomains: parsedSubdomains
      }
    });
  } catch (error) {
    console.error('❌ Ошибка при получении субдоменов по collectionAddress:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// НОВЫЙ ЭНДПОИНТ: Обновить статус субдоменов по collectionAddress
app.put('/api/subdomains/collection/:collectionAddress/status', requireAdminAuth, (req, res) => {
  try {
    const { collectionAddress } = req.params;
    const { status } = req.body;
    const db = req.db;
    
    if (!status || !['active', 'inactive', 'auction', 'claimed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Некорректный статус'
      });
    }

    // Обновляем статус всех субдоменов с указанным collectionAddress
    const stmt = db.prepare(`
      UPDATE subdomains 
      SET status = ?, updatedAt = CURRENT_TIMESTAMP 
      WHERE collectionAddress = ?
      RETURNING COUNT(*) as updatedCount
    `);
    
    const result = stmt.get(status, collectionAddress) as { updatedCount: number };
    
    return res.json({
      success: true,
      message: `Статус ${result.updatedCount} субдоменов обновлен на '${status}'`,
      data: {
        updatedCount: result.updatedCount,
        collectionAddress,
        status
      }
    });
  } catch (error: any) {
    console.error('❌ Ошибка при обновлении статуса субдоменов по collectionAddress:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});


// Исправленная версия функции добавления ставки
app.post('/api/subdomains/:id/bid', (req, res) => {
  try {
    const { id } = req.params;
    const { bidder, amount } = req.body;
    const db = req.db;
    const isTestnet = req.isTestnet;
    
    if (!bidder || !amount) {
      return res.status(400).json({
        success: false,
        message: 'bidder и amount обязательны'
      });
    }

    console.log(`📝 Добавление ставки для субдомена ${id}:`);
    console.log(`👤 Bidder: ${bidder}`);
    console.log(`💰 Amount: ${amount} нанотонов`);
    console.log(`🌐 Network: ${isTestnet ? 'testnet' : 'mainnet'}`);

    // Получаем текущий субдомен
    const subdomain = db.prepare('SELECT * FROM subdomains WHERE id = ?').get(id) as Subdomain;
    
    if (!subdomain) {
      console.log(`❌ Субдомен с ID ${id} не найден`);
      return res.status(404).json({
        success: false,
        message: 'Субдомен не найден'
      });
    }

    console.log(`✅ Субдомен найден: ${subdomain.name}`);
    console.log(`📊 Текущий статус: ${subdomain.status}`);
    console.log(`📊 Текущий owner: ${subdomain.owner || 'не установлен'}`);
    console.log(`📊 Текущий lastBid: ${subdomain.lastBid}`);
    console.log(`📊 Текущий lastBidder: ${subdomain.lastBidder}`);
    console.log(`📊 Текущие bids: ${subdomain.bids}`);

    // Проверяем, что ставка выше текущей
    if (amount <= (subdomain.lastBid || 0)) {
      console.log(`❌ Ставка ${amount} не выше текущей ${subdomain.lastBid || 0}`);
      return res.status(400).json({
        success: false,
        message: 'Ставка должна быть выше текущей'
      });
    }

    // Проверяем, не истекло ли время аукциона
    if (subdomain.auctionEndTime) {
      const auctionEndTime = new Date(subdomain.auctionEndTime);
      const now = new Date();
      
      if (now > auctionEndTime) {
        console.log(`⏰ Время аукциона истекло: ${subdomain.auctionEndTime}`);
        
        // Если аукцион завершен, присваиваем субдомен текущему победителю
        if (subdomain.lastBidder && subdomain.status === 'auction') {
          console.log(`🎉 Аукцион завершен! Присваиваем субдомен ${subdomain.name} победителю: ${subdomain.lastBidder}`);

          // Получаем зону для определения типа
          let zoneType = 'proxy'; // По умолчанию proxy для аукционов
          if (subdomain.zoneId) {
            const zone = db.prepare('SELECT * FROM zones WHERE id = ?').get(subdomain.zoneId) as Zone;
            if (zone) {
              zoneType = zone.proxy === 1 ? 'proxy' : 'sbt';
            }
          }
          
          // Обновляем субдомен: присваиваем owner и меняем статус
          const updateStmt = db.prepare(`
            UPDATE subdomains 
            SET owner = ?, status = 'active', updatedAt = CURRENT_TIMESTAMP 
            WHERE id = ?
            RETURNING *
          `);
          
          const updatedSubdomain = updateStmt.get(subdomain.lastBidder, id) as Subdomain;

          // Обновляем счетчики пользователя (нового владельца)
          if (subdomain.lastBidder) {
            // Определяем, какие счетчики обновлять
            if (zoneType === 'proxy') {
              db.prepare(`
                UPDATE users 
                SET 
                  subdomains = subdomains + 1,
                  proxySubdomains = proxySubdomains + 1,
                  totalSubdomainSpending = totalSubdomainSpending + ?,
                  totalProxySubdomainSpending = totalProxySubdomainSpending + ?,
                  updatedAt = CURRENT_TIMESTAMP 
                WHERE address = ?
              `).run(
                Number(subdomain.lastBid) / 1_000_000_000, // Конвертируем в TON
                Number(subdomain.lastBid) / 1_000_000_000,
                subdomain.lastBidder
              );
            } else {
              db.prepare(`
                UPDATE users 
                SET 
                  subdomains = subdomains + 1,
                  sbtSubdomains = sbtSubdomains + 1,
                  totalSubdomainSpending = totalSubdomainSpending + ?,
                  totalSbtSubdomainSpending = totalSbtSubdomainSpending + ?,
                  updatedAt = CURRENT_TIMESTAMP 
                WHERE address = ?
              `).run(
                Number(subdomain.lastBid) / 1_000_000_000,
                Number(subdomain.lastBid) / 1_000_000_000,
                subdomain.lastBidder
              );
            }
            
            console.log(`📊 [BID] Счетчики субдоменов увеличены для пользователя ${subdomain.lastBidder}`);
          }
          
          // Обновляем прибыль владельца зоны (если есть)
          if (subdomain.zoneId) {
            const zone = db.prepare('SELECT * FROM zones WHERE id = ?').get(subdomain.zoneId) as Zone;
            if (zone && zone.owner) {
              const profit = (subdomain.lastBid || 0) * 0.9 / 1_000_000_000; // 90% от ставки в TON
              db.prepare(`
                UPDATE users 
                SET 
                  totalProfit = totalProfit + ?,
                  updatedAt = CURRENT_TIMESTAMP 
                WHERE address = ?
              `).run(profit, zone.owner);
              
              console.log(`💰 [BID] Прибыль ${profit} TON добавлена владельцу зоны ${zone.owner}`);
            }
          }
          
          console.log(`✅ Субдомен присвоен новому владельцу: ${updatedSubdomain.owner}`);
          
          return res.status(400).json({
            success: false,
            message: 'Аукцион завершен. Субдомен уже присвоен победителю',
            data: {
              ...updatedSubdomain,
              links: JSON.parse(updatedSubdomain.links || '[]'),
              bids: JSON.parse(updatedSubdomain.bids || '[]')
            }
          });
        }
      }
    }

    // Если субдомен не на аукционе, обновляем статус
    if (subdomain.status !== 'auction') {
      console.log(`⚠️ Субдомен не на аукционе, обновляем статус на 'auction'`);
      
      // Обновляем статус на 'auction'
      db.prepare('UPDATE subdomains SET status = ? WHERE id = ?').run('auction', id);
    }

    // Добавляем ставку в массив
    let bids = [];
    try {
      bids = JSON.parse(subdomain.bids || '[]');
      console.log(`📊 Загружено ставок: ${bids.length}`);
    } catch (parseError) {
      console.log('⚠️ Ошибка парсинга bids, создаем новый массив');
      bids = [];
    }

    const newBid = {
      bidder,
      amount,
      timestamp: new Date().toISOString()
    };
    
    bids.push(newBid);
    console.log(`✅ Новая ставка добавлена в массив, всего ставок: ${bids.length}`);

    // Обновляем субдомен с новой ставкой
    const stmt = db.prepare(`
      UPDATE subdomains 
      SET 
        lastBid = ?, 
        lastBidder = ?, 
        owner = ?,  
        bids = ?, 
        updatedAt = CURRENT_TIMESTAMP 
      WHERE id = ?
      RETURNING *
    `);
    
    const updatedSubdomain = stmt.get(amount, bidder, bidder, JSON.stringify(bids), id) as Subdomain;
    
    console.log(`✅ Субдомен обновлен:`);
    console.log(`   lastBid: ${updatedSubdomain.lastBid}`);
    console.log(`   lastBidder: ${updatedSubdomain.lastBidder}`);
    console.log(`   owner: ${updatedSubdomain.owner}`);
    console.log(`   bids: ${updatedSubdomain.bids?.length || 0} символов`);

    // Проверяем, не истекло ли время аукциона после обновления ставки
    if (updatedSubdomain.auctionEndTime) {
      const auctionEndTime = new Date(updatedSubdomain.auctionEndTime);
      const now = new Date();
      
      if (now > auctionEndTime) {
        console.log(`⏰ Время аукциона истекло после обновления ставки`);
        console.log(`🎉 Присваиваем субдомен ${updatedSubdomain.name} победителю: ${updatedSubdomain.lastBidder}`);

        // Получаем зону для определения типа
        let zoneType = 'proxy';
        if (updatedSubdomain.zoneId) {
          const zone = db.prepare('SELECT * FROM zones WHERE id = ?').get(updatedSubdomain.zoneId) as Zone;
          if (zone) {
            zoneType = zone.proxy === 1 ? 'proxy' : 'sbt';
          }
        }
        
        // Присваиваем субдомен победителю
        const assignStmt = db.prepare(`
          UPDATE subdomains 
          SET owner = ?, status = 'active', updatedAt = CURRENT_TIMESTAMP 
          WHERE id = ?
          RETURNING *
        `);
        
        const finalSubdomain = assignStmt.get(updatedSubdomain.lastBidder, id) as Subdomain;

        // Обновляем счетчики пользователя (нового владельца)
        if (finalSubdomain.owner) {
          if (zoneType === 'proxy') {
            db.prepare(`
              UPDATE users 
              SET 
                subdomains = subdomains + 1,
                proxySubdomains = proxySubdomains + 1,
                totalSubdomainSpending = totalSubdomainSpending + ?,
                totalProxySubdomainSpending = totalProxySubdomainSpending + ?,
                updatedAt = CURRENT_TIMESTAMP 
              WHERE address = ?
            `).run(
              amount / 1_000_000_000,
              amount / 1_000_000_000,
              finalSubdomain.owner
            );
          } else {
            db.prepare(`
              UPDATE users 
              SET 
                subdomains = subdomains + 1,
                sbtSubdomains = sbtSubdomains + 1,
                totalSubdomainSpending = totalSubdomainSpending + ?,
                totalSbtSubdomainSpending = totalSbtSubdomainSpending + ?,
                updatedAt = CURRENT_TIMESTAMP 
              WHERE address = ?
            `).run(
              amount / 1_000_000_000,
              amount / 1_000_000_000,
              finalSubdomain.owner
            );
          }
        }
        
        // Обновляем прибыль владельца зоны (если есть)
        if (finalSubdomain.zoneId) {
          const zone = db.prepare('SELECT * FROM zones WHERE id = ?').get(finalSubdomain.zoneId) as Zone;
          if (zone && zone.owner) {
            const profit = amount * 0.9 / 1_000_000_000; // 90% от ставки в TON
            db.prepare(`
              UPDATE users 
              SET 
                totalProfit = totalProfit + ?,
                updatedAt = CURRENT_TIMESTAMP 
              WHERE address = ?
            `).run(profit, zone.owner);
          }
        }
        
        console.log(`✅ Субдомен присвоен победителю аукциона:`);
        console.log(`   owner: ${finalSubdomain.owner}`);
        console.log(`   status: ${finalSubdomain.status}`);
        

        if (finalSubdomain.owner !== undefined) {
          // Отправляем уведомление в Telegram о завершении аукциона
          const priceInTON = amount / 1_000_000_000;
          telegramBot.sendAuctionEndedNotification(
            finalSubdomain.name,
            finalSubdomain.owner,
            priceInTON,
            isTestnet,
            finalSubdomain.address
          );
        }
        
        // Парсим JSON поля для ответа
        const parsedSubdomain = {
          ...finalSubdomain,
          links: JSON.parse(finalSubdomain.links || '[]'),
          bids: bids
        };
        
        return res.json({
          success: true,
          message: 'Ставка добавлена и аукцион завершен. Субдомен присвоен победителю',
          data: parsedSubdomain
        });
      }
    }

    // Отправляем уведомление в Telegram о новой ставке
    const priceInTON = amount / 1_000_000_000;
    const previousBidder = subdomain.lastBidder || '';
    telegramBot.sendNewBidNotification(
      subdomain.name, 
      bidder, 
      priceInTON, 
      previousBidder,
      isTestnet
    );
    
    // Парсим JSON поля для ответа
    const parsedSubdomain = {
      ...updatedSubdomain,
      links: JSON.parse(updatedSubdomain.links || '[]'),
      bids: bids
    };
    
    return res.json({
      success: true,
      message: 'Ставка успешно добавлена',
      data: parsedSubdomain
    });
    
  } catch (error: any) {
    console.error('❌ Ошибка при добавлении ставки:', error);
    // ДОБАВЛЯЕМ ВОЗВРАТ ОШИБКИ
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера',
      error: error.message
    });
  }
});

// Обновляем статус субдомена
app.put('/api/subdomains/:id/status', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const db = req.db;
    const isTestnet = req.isTestnet;
    
    if (!status || !['active', 'inactive', 'auction', 'claimed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Некорректный статус'
      });
    }

    // Проверяем существование субдомена
    const existingSubdomain = db.prepare('SELECT * FROM subdomains WHERE id = ?').get(id) as Subdomain;
    
    if (!existingSubdomain) {
      return res.status(404).json({
        success: false,
        message: 'Субдомен не найден'
      });
    }

    // Обновляем статус
    const stmt = db.prepare(`
      UPDATE subdomains 
      SET status = ?, updatedAt = CURRENT_TIMESTAMP 
      WHERE id = ?
      RETURNING *
    `);
    
    const updatedSubdomain = stmt.get(status, id) as Subdomain;
    
    // Отправляем уведомление в Telegram при завершении аукциона
    if (status === 'claimed' && existingSubdomain.status === 'auction') {
      const finalPrice = (existingSubdomain.lastBid || 0) / 1_000_000_000;
      telegramBot.sendAuctionEndedNotification(
        existingSubdomain.name,
        existingSubdomain.lastBidder || existingSubdomain.owner || '',
        finalPrice,
        isTestnet,
        existingSubdomain.address
      );
    }
    
    // Парсим JSON поля
    const parsedSubdomain = {
      ...updatedSubdomain,
      links: JSON.parse(updatedSubdomain.links || '[]'),
      bids: JSON.parse(updatedSubdomain.bids || '[]')
    };
    
    return res.json({
      success: true,
      message: 'Статус успешно обновлен',
      data: parsedSubdomain
    });
  } catch (error: any) {
    console.error('❌ Ошибка при обновлении статуса:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});    

// Получить все субдомены
app.get('/api/subdomains', (req, res) => {
  try {
    const db = req.db;
    const subdomains = db.prepare('SELECT * FROM subdomains ORDER BY createdAt DESC').all() as Subdomain[];
    
    // Парсим JSON поля
    const parsedSubdomains = subdomains.map((subdomain) => ({
      ...subdomain,
      links: JSON.parse(subdomain.links || '[]'),
      bids: JSON.parse(subdomain.bids || '[]')
    }));
    
    res.json({
      success: true,
      data: {
        count: parsedSubdomains.length,
        subdomains: parsedSubdomains
      }
    });
  } catch (error) {
    console.error('❌ Ошибка при получении субдоменов:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Получить субдомены пользователя
app.get('/api/subdomains/user/:address', (req, res) => {
  try {
    const { address } = req.params;
    const db = req.db;
    
    const subdomains = db.prepare('SELECT * FROM subdomains WHERE owner = ? ORDER BY createdAt DESC').all(address) as Subdomain[];
    
    // Парсим JSON поля
    const parsedSubdomains = subdomains.map((subdomain) => ({
      ...subdomain,
      links: JSON.parse(subdomain.links || '[]'),
      bids: JSON.parse(subdomain.bids || '[]')
    }));
    
    res.json({
      success: true,
      data: {
        count: parsedSubdomains.length,
        subdomains: parsedSubdomains
      }
    });
  } catch (error) {
    console.error('❌ Ошибка при получении субдоменов пользователя:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Получить субдомены зоны
app.get('/api/subdomains/zone/:zoneId', (req, res) => {
  try {
    const { zoneId } = req.params;
    const db = req.db;
    
    const subdomains = db.prepare('SELECT * FROM subdomains WHERE zoneId = ? ORDER BY createdAt DESC').all(zoneId) as Subdomain[];
    
    // Парсим JSON поля
    const parsedSubdomains = subdomains.map((subdomain) => ({
      ...subdomain,
      links: JSON.parse(subdomain.links || '[]'),
      bids: JSON.parse(subdomain.bids || '[]')
    }));
    
    res.json({
      success: true,
      data: {
        count: parsedSubdomains.length,
        subdomains: parsedSubdomains
      }
    });
  } catch (error) {
    console.error('❌ Ошибка при получении субдоменов зоны:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Получить субдомен по имени
app.get('/api/subdomains/name/:name', (req, res) => {
  try {
    const { name } = req.params;
    const db = req.db;
    
    const subdomain = db.prepare('SELECT * FROM subdomains WHERE name = ?').get(name) as Subdomain;
    
    if (!subdomain) {
      return res.status(404).json({
        success: false,
        message: 'Субдомен не найден'
      });
    }
    
    // Парсим JSON поле
    const parsedSubdomain = {
      ...subdomain,
      links: JSON.parse(subdomain.links || '[]'),
      bids: JSON.parse(subdomain.bids || '[]')
    };
    
    return res.json({
      success: true,
      data: parsedSubdomain
    });
  } catch (error) {
    console.error('❌ Ошибка при получении субдомена по имени:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Получить субдомены по статусу
app.get('/api/subdomains/status/:status', (req, res) => {
  try {
    const { status } = req.params;
    const db = req.db;
    
    if (!['active', 'inactive', 'auction', 'claimed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Некорректный статус'
      });
    }
    
    const subdomains = db.prepare(`
      SELECT * FROM subdomains 
      WHERE status = ? 
      ORDER BY createdAt DESC
    `).all(status) as Subdomain[];
    
    const parsedSubdomains = subdomains.map((subdomain) => ({
      ...subdomain,
      links: JSON.parse(subdomain.links || '[]'),
      bids: JSON.parse(subdomain.bids || '[]')
    }));
    
    return res.json({
      success: true,
      data: {
        count: parsedSubdomains.length,
        subdomains: parsedSubdomains
      }
    });
  } catch (error) {
    console.error('❌ Ошибка при получении субдоменов по статусу:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Поиск субдоменов по имени
app.get('/api/subdomains/search/:query', (req, res) => {
  try {
    const { query } = req.params;
    const db = req.db;
    
    const subdomains = db.prepare(`
      SELECT * FROM subdomains 
      WHERE name LIKE ? 
      ORDER BY createdAt DESC
      LIMIT 20
    `).all(`%${query}%`) as Subdomain[];
    
    const parsedSubdomains = subdomains.map((subdomain) => ({
      ...subdomain,
      links: JSON.parse(subdomain.links || '[]'),
      bids: JSON.parse(subdomain.bids || '[]')
    }));
    
    res.json({
      success: true,
      data: {
        count: parsedSubdomains.length,
        subdomains: parsedSubdomains
      }
    });
  } catch (error) {
    console.error('❌ Ошибка при поиске субдоменов:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// ========== ОБНОВЛЕНИЕ АДРЕСА СУБДОМЕНА ПО ID ==========

app.put('/api/subdomains/:id/address', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { address } = req.body;
    const db = req.db;
    const isTestnet = req.isTestnet;
    
    console.log('🔄 [UPDATE SUBDOMAIN ADDRESS] Запрос на обновление адреса:');
    console.log('📝 ID субдомена:', id);
    console.log('📝 Новый адрес:', address);
    console.log('🌐 Network:', isTestnet ? 'testnet' : 'mainnet');
    
    if (!id || !address) {
      return res.status(400).json({
        success: false,
        message: 'ID субдомена и новый адрес обязательны'
      });
    }

    // Проверяем существование субдомена
    const existingSubdomain = db.prepare('SELECT * FROM subdomains WHERE id = ?').get(id) as Subdomain;
    
    if (!existingSubdomain) {
      console.log('❌ [UPDATE SUBDOMAIN ADDRESS] Субдомен не найден');
      return res.status(404).json({
        success: false,
        message: 'Субдомен не найден'
      });
    }

    // Обновляем адрес субдомена
    const stmt = db.prepare(`
      UPDATE subdomains 
      SET address = ?, updatedAt = CURRENT_TIMESTAMP 
      WHERE id = ?
      RETURNING *
    `);
    
    const updatedSubdomain = stmt.get(address, id) as Subdomain;
    
    console.log(`✅ [UPDATE SUBDOMAIN ADDRESS] Адрес субдомена ${existingSubdomain.name} обновлен с ${existingSubdomain.address} на ${address}`);
    
    // Парсим JSON поля для ответа
    const parsedSubdomain = {
      ...updatedSubdomain,
      links: JSON.parse(updatedSubdomain.links || '[]'),
      bids: JSON.parse(updatedSubdomain.bids || '[]')
    };
    
    return res.json({
      success: true,
      message: `Адрес субдомена "${existingSubdomain.name}" успешно обновлен`,
      data: parsedSubdomain
    });
  } catch (error) {
    console.error('❌ Ошибка при обновлении адреса субдомена:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// ========== ОБНОВЛЕНИЕ OWNER ADDRESS СУБДОМЕНА ПО ID ==========

app.put('/api/subdomains/:id/owner', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { ownerAddress } = req.body;
    const db = req.db;
    const isTestnet = req.isTestnet;
    
    console.log('🔄 [UPDATE SUBDOMAIN OWNER] Запрос на обновление владельца субдомена:');
    console.log('📝 ID субдомена:', id);
    console.log('📝 Новый владелец:', ownerAddress);
    console.log('🌐 Network:', isTestnet ? 'testnet' : 'mainnet');
    
    if (!id || !ownerAddress) {
      return res.status(400).json({
        success: false,
        message: 'ID субдомена и новый адрес владельца обязательны'
      });
    }

    // Проверяем существование субдомена
    const existingSubdomain = db.prepare('SELECT * FROM subdomains WHERE id = ?').get(id) as Subdomain;
    
    if (!existingSubdomain) {
      console.log('❌ [UPDATE SUBDOMAIN OWNER] Субдомен не найден');
      return res.status(404).json({
        success: false,
        message: 'Субдомен не найден'
      });
    }

    // Обновляем владельца субдомена
    const stmt = db.prepare(`
      UPDATE subdomains 
      SET owner = ?, updatedAt = CURRENT_TIMESTAMP 
      WHERE id = ?
      RETURNING *
    `);
    
    const updatedSubdomain = stmt.get(ownerAddress, id) as Subdomain;
    
    console.log(`✅ [UPDATE SUBDOMAIN OWNER] Владелец субдомена ${existingSubdomain.name} обновлен с ${existingSubdomain.owner || 'нет'} на ${ownerAddress}`);
    
    // Парсим JSON поля для ответа
    const parsedSubdomain = {
      ...updatedSubdomain,
      links: JSON.parse(updatedSubdomain.links || '[]'),
      bids: JSON.parse(updatedSubdomain.bids || '[]')
    };
    
    return res.json({
      success: true,
      message: `Владелец субдомена "${existingSubdomain.name}" успешно обновлен`,
      data: parsedSubdomain
    });
  } catch (error) {
    console.error('❌ Ошибка при обновлении владельца субдомена:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});


// ========== ЧАТЫ ==========

// Создать или получить чат
app.post('/api/chats', (req, res) => {
  try {
    const { domain, userAddress } = req.body;
    const db = req.db;
    const isTestnet = req.isTestnet;
    
    if (!domain || !userAddress) {
      return res.status(400).json({
        success: false,
        message: 'Домен и адрес пользователя обязательны'
      });
    }

    // Проверяем существование чата
    let chat = db.prepare('SELECT * FROM chats WHERE domain = ? AND userAddress = ?').get(domain, userAddress) as Chat;
    
    if (!chat) {
      // Создаем новый чат
      const stmt = db.prepare(`
        INSERT INTO chats (domain, userAddress) 
        VALUES (?, ?)
        RETURNING *
      `);
      
      chat = stmt.get(domain, userAddress) as Chat;
      
      // Отправляем уведомление в Telegram
      telegramBot.sendNewChatNotification(domain, userAddress, isTestnet);
    }
    
    return res.json({
      success: true,
      message: chat.id ? 'Чат уже существует' : 'Чат успешно создан',
      data: chat
    });
  } catch (error: any) {
    console.error('❌ Ошибка при создании чата:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

app.delete('/api/chats/:id', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    const isTestnet = req.isTestnet;
    
    console.log('🗑️ [DELETE CHAT] Запрос на удаление чата:');
    console.log('📝 ID чата:', id);
    console.log('🌐 Network:', isTestnet ? 'testnet' : 'mainnet');
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID чата обязателен'
      });
    }

    // Проверяем существование чата
    const existingChat = db.prepare('SELECT * FROM chats WHERE id = ?').get(id) as Chat;
    
    if (!existingChat) {
      console.log('❌ [DELETE CHAT] Чат не найден');
      return res.status(404).json({
        success: false,
        message: 'Чат не найден'
      });
    }

    // Проверяем, есть ли связанные сообщения
    const messagesCount = db.prepare('SELECT COUNT(*) as count FROM messages WHERE chatId = ?')
      .get(id) as { count: number };
    
    if (messagesCount.count > 0) {
      console.log(`⚠️ [DELETE CHAT] У чата есть ${messagesCount.count} связанных сообщений`);
      return res.status(400).json({
        success: false,
        message: `Невозможно удалить чат. У него есть ${messagesCount.count} связанных сообщений.`
      });
    }

    // Удаляем чат
    const stmt = db.prepare('DELETE FROM chats WHERE id = ?');
    const result = stmt.run(id);
    
    console.log(`✅ [DELETE CHAT] Чат ${existingChat.domain} (пользователь: ${existingChat.userAddress}) удален. Затронуто строк: ${result.changes}`);
    
    return res.json({
      success: true,
      message: `Чат для домена "${existingChat.domain}" успешно удален`,
      data: {
        deletedChat: existingChat,
        affectedRows: result.changes
      }
    });
  } catch (error) {
    console.error('❌ Ошибка при удалении чата:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// ========== УДАЛЕНИЕ СООБЩЕНИЯ ПО ID ==========
// (опционально, если нужно)
app.delete('/api/messages/:id', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    const isTestnet = req.isTestnet;
    
    console.log('🗑️ [DELETE MESSAGE] Запрос на удаление сообщения:');
    console.log('📝 ID сообщения:', id);
    console.log('🌐 Network:', isTestnet ? 'testnet' : 'mainnet');
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID сообщения обязателен'
      });
    }

    // Проверяем существование сообщения
    const existingMessage = db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as Message;
    
    if (!existingMessage) {
      console.log('❌ [DELETE MESSAGE] Сообщение не найден');
      return res.status(404).json({
        success: false,
        message: 'Сообщение не найдено'
      });
    }

    // Удаляем сообщение
    const stmt = db.prepare('DELETE FROM messages WHERE id = ?');
    const result = stmt.run(id);
    
    console.log(`✅ [DELETE MESSAGE] Сообщение от ${existingMessage.sender} удалено. Затронуто строк: ${result.changes}`);
    
    return res.json({
      success: true,
      message: `Сообщение успешно удалено`,
      data: {
        deletedMessage: existingMessage,
        affectedRows: result.changes
      }
    });
  } catch (error) {
    console.error('❌ Ошибка при удалении сообщения:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Отправить сообщение в чат
app.post('/api/chats/:domain/messages', (req, res) => {
  try {
    const { domain } = req.params;
    const { text, sender, userAddress } = req.body;
    const db = req.db;
    const isTestnet = req.isTestnet;
    
    if (!text || !sender || !userAddress) {
      return res.status(400).json({
        success: false,
        message: 'Текст, отправитель и адрес пользователя обязательны'
      });
    }

    // Находим или создаем чат
    let chat = db.prepare('SELECT * FROM chats WHERE domain = ? AND userAddress = ?').get(domain, userAddress) as Chat;
    
    if (!chat) {
      const stmt = db.prepare(`
        INSERT INTO chats (domain, userAddress) 
        VALUES (?, ?)
        RETURNING *
      `);
      
      chat = stmt.get(domain, userAddress) as Chat;
      
      // Отправляем уведомление в Telegram о новом чате
      telegramBot.sendNewChatNotification(domain, userAddress, isTestnet);
    }

    // Добавляем сообщение
    const messageId = Math.random().toString(36).substring(2, 15);
    db.prepare('INSERT INTO messages (id, chatId, sender, text) VALUES (?, ?, ?, ?)')
      .run(messageId, chat.id, sender, text);
    
    // Обновляем время чата
    db.prepare('UPDATE chats SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?')
      .run(chat.id);

    // Отправляем уведомление в Telegram если сообщение от пользователя
    if (sender === 'user') {
      telegramBot.sendNewMessageNotification(domain, userAddress, text, isTestnet);
    }
    
    // Получаем все сообщения чата
    const messages = db.prepare('SELECT * FROM messages WHERE chatId = ? ORDER BY timestamp').all(chat.id) as Message[];
    
    return res.json({
      success: true,
      message: 'Сообщение успешно отправлено',
      data: {
        chat,
        messages: messages.map((msg) => ({
          id: msg.id,
          sender: msg.sender as 'user' | 'operator',
          text: msg.text,
          timestamp: new Date(msg.timestamp)
        }))
      }
    });
  } catch (error: any) {
    console.error('❌ Ошибка при отправке сообщения:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Приветственное сообщение оператора при автосоздании чата — на языке юзера
// (иначе юзер получал текст только на русском, независимо от выбранного в апке языка).
const CHAT_WELCOME_MESSAGES: Record<string, string> = {
  ru: 'Здравствуйте! 👋 Чем могу помочь?',
  en: 'Hello! 👋 How can I help you?',
  zh: '您好！👋 有什么可以帮您的吗？',
  ja: 'こんにちは！👋 どのようなご用件でしょうか？',
  hi: 'नमस्ते! 👋 मैं आपकी क्या मदद कर सकता हूँ?',
  ar: 'مرحبًا! 👋 كيف يمكنني مساعدتك؟',
  es: '¡Hola! 👋 ¿En qué puedo ayudarte?',
  it: 'Ciao! 👋 Come posso aiutarti?',
  de: 'Hallo! 👋 Wie kann ich Ihnen helfen?',
  fr: 'Bonjour ! 👋 Comment puis-je vous aider ?',
};

// Получить чат по домену и адресу пользователя
app.get('/api/chats/domain/:domain', (req, res) => {
  try {
    const { domain } = req.params;
    const { userAddress, lang } = req.query as { userAddress: string; lang?: string };
    const db = req.db;
    const isTestnet = req.isTestnet;

    if (!domain || !userAddress) {
      return res.status(400).json({
        success: false,
        message: 'Домен и адрес пользователя обязательны'
      });
    }

    let stmt = db.prepare('SELECT * FROM chats WHERE domain = ? AND userAddress = ?');
    let chat = stmt.get(domain, userAddress) as Chat;

    if (!chat) {
      stmt = db.prepare('INSERT INTO chats (domain, userAddress) VALUES (?, ?) RETURNING *');
      chat = stmt.get(domain, userAddress) as Chat;

      // Добавляем приветственное сообщение
      const welcomeText = CHAT_WELCOME_MESSAGES[lang || ''] || CHAT_WELCOME_MESSAGES.ru;
      const messageId = Math.random().toString(36).substring(2, 15);
      db.prepare('INSERT INTO messages (id, chatId, sender, text) VALUES (?, ?, ?, ?)')
        .run(messageId, chat.id, 'operator', welcomeText);
      
      // Отправляем уведомление в Telegram о новом чате
      telegramBot.sendNewChatNotification(domain, userAddress, isTestnet);
    }
    
    // Получаем сообщения
    stmt = db.prepare('SELECT * FROM messages WHERE chatId = ? ORDER BY timestamp');
    const messages = stmt.all(chat.id) as Message[];
    
    const parsedChat = {
      ...chat,
      messages: messages.map(msg => ({
        id: msg.id,
        sender: msg.sender as 'user' | 'operator',
        text: msg.text,
        timestamp: new Date(msg.timestamp)
      }))
    };
    
    return res.json({
      success: true,
      data: parsedChat
    });
  } catch (error) {
    console.error('❌ Ошибка при получении чата по домену:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// ========== УВЕДОМЛЕНИЯ (relay-only, без записи в БД) ==========

// Уведомление о привязке/отвязке DNS-записи. Значение записи (адрес, ADNL,
// bagID) сюда сознательно не передаётся и в БД не пишется — сообщение
// в бота просто пролетает насквозь, как и договорено для decentralization-миграции.
app.post('/api/notifications/dns-record', (req, res) => {
  try {
    const { domain, nftAddress, recordFormat, action, silent } = req.body;
    const isTestnet = req.isTestnet;

    if (!domain || !['address', 'adnl', 'bagId'].includes(recordFormat) || !['set', 'delete'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Некорректные параметры уведомления'
      });
    }

    telegramBot.sendDnsRecordUpdatedNotification(domain, nftAddress, recordFormat, action, isTestnet, !!silent);

    return res.json({ success: true });
  } catch (error) {
    console.error('❌ Ошибка при отправке уведомления о DNS-записи:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Оплата хранения торрента (storage-contract задеплоен и профинансирован
// провайдерам, см. CreateTorrentPage.handleDeploy) — relay-only, ничего не
// пишет в БД. Регистрация сделки для storageDealsChecker идёт отдельным
// POST /api/storage/deals, этот эндпоинт только про уведомление боту.
app.post('/api/notifications/storage-deal-created', (req, res) => {
  try {
    const { bagId, contractAddress, providerCount, fileSizeBytes, storageDays, totalCostTon, ownerAddress, boundTo } = req.body;
    const isTestnet = req.isTestnet;

    if (!bagId || !contractAddress || !providerCount || !fileSizeBytes || !storageDays || !totalCostTon || !ownerAddress) {
      return res.status(400).json({
        success: false,
        message: 'bagId, contractAddress, providerCount, fileSizeBytes, storageDays, totalCostTon и ownerAddress обязательны'
      });
    }

    telegramBot.sendStorageDealCreatedNotification(bagId, contractAddress, providerCount, fileSizeBytes, storageDays, totalCostTon, ownerAddress, boundTo, isTestnet);

    return res.json({ success: true });
  } catch (error) {
    console.error('❌ Ошибка при отправке уведомления об оплате хранения торрента:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Relay-only: сообщает боту факт обновления ончейн-контента домена (title/
// description/category/picture, см. AvatarSecretPage) — ничего не пишет в БД.
// В отличие от dns-record выше (там значение осознанно скрыто — это то, что
// юзер прячет за доменом), title/description/category — публичный профиль,
// и так видимый в dApp-приложениях, поэтому изменившиеся значения передаются.
app.post('/api/notifications/content-updated', (req, res) => {
  try {
    const { domain, nftAddress, editorAddress, pictureUrl, title, description, category, silent } = req.body;
    const isTestnet = req.isTestnet;

    if (!domain || !nftAddress || !editorAddress) {
      return res.status(400).json({
        success: false,
        message: 'domain, nftAddress и editorAddress обязательны'
      });
    }

    telegramBot.sendContentUpdatedNotification(domain, nftAddress, editorAddress, isTestnet, pictureUrl, { title, description, category }, !!silent);

    return res.json({ success: true });
  } catch (error) {
    console.error('❌ Ошибка при отправке уведомления об обновлении контента:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Зона создана (proxy или SBT). Старый POST /api/zones (пишет в zones + счётчики
// users) намеренно не трогаем и не убираем — это отдельный, всё ещё рабочий путь
// для легаси-читателей (админ-панель и т.п.). Новый флоу создания зоны на фронте
// зовёт этот эндпоинт вместо него — данные летят прямо в бота, без персиста.
app.post('/api/notifications/zone-created', (req, res) => {
  try {
    const { name, address, collectionAddress, proxy, owner, zonePrice, currentID } = req.body;
    const isTestnet = req.isTestnet;

    if (!name || !address || !owner) {
      return res.status(400).json({
        success: false,
        message: 'Название зоны, владелец и адрес обязательны'
      });
    }

    const nameCheck = validateDomainName(name);
    if (!nameCheck.valid) {
      return res.status(400).json({ success: false, message: nameCheck.message });
    }

    if (proxy) {
      telegramBot.sendProxyZoneCreatedNotification(name, address, owner, zonePrice, isTestnet);
    } else {
      telegramBot.sendSBTZoneCreatedNotification(name, address, owner, zonePrice, collectionAddress || address, currentID, isTestnet);
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('❌ Ошибка при отправке уведомления о создании зоны:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Субдомен создан: SBT-минт (status=active) или старт proxy-аукциона (status=auction).
// Старый POST /api/subdomains аналогично не трогаем — тот же принцип, что и выше.
app.post('/api/notifications/subdomain-created', (req, res) => {
  try {
    const { name, address, mintPrice, owner, status } = req.body;
    const isTestnet = req.isTestnet;

    if (!name || !address || mintPrice === undefined || !['auction', 'active'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Некорректные параметры уведомления'
      });
    }

    const nameCheck = validateDomainName(name);
    if (!nameCheck.valid) {
      return res.status(400).json({ success: false, message: nameCheck.message });
    }

    if (status === 'auction') {
      telegramBot.sendAuctionStartedNotification(name, address, mintPrice, isTestnet);
    } else {
      telegramBot.sendSBTSubdomainMintedNotification(name, address, owner, mintPrice, isTestnet);
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('❌ Ошибка при отправке уведомления о создании субдомена:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Новая ставка на proxy-аукционе. Полная история ставок теперь читается ончейн
// (getAuctionBidHistory), поэтому бэкенду для этого уведомления не нужен ни
// DB-id субдомена, ни запись в subdomains — только сам факт ставки для бота.
app.post('/api/notifications/bid', (req, res) => {
  try {
    const { domain, bidder, amount, previousBidder } = req.body;
    const isTestnet = req.isTestnet;

    if (!domain || !bidder || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'domain, bidder и amount обязательны'
      });
    }

    telegramBot.sendNewBidNotification(domain, bidder, amount, previousBidder || '', isTestnet);

    return res.json({ success: true });
  } catch (error) {
    console.error('❌ Ошибка при отправке уведомления о ставке:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Аукцион завершён клеймом. Финальную цену фронт берёт из уже загруженного
// on-chain auctionInfo.maxBid — бэкенду тут искать/обновлять нечего.
app.post('/api/notifications/auction-ended', (req, res) => {
  try {
    const { domain, winner, finalPrice, itemAddress, collectionAddress } = req.body;
    const isTestnet = req.isTestnet;

    if (!domain || !winner || finalPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: 'domain, winner и finalPrice обязательны'
      });
    }

    telegramBot.sendAuctionEndedNotification(domain, winner, finalPrice, isTestnet, itemAddress, collectionAddress);

    return res.json({ success: true });
  } catch (error) {
    console.error('❌ Ошибка при отправке уведомления о завершении аукциона:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// SBT-зона деактивирована при пересоздании (change_content-транзакция уже
// прошла ончейн). Зоны, найденные через ончейн-проверку в CreateCollectionPage,
// не имеют DB-id — старый PUT /api/zones/:id/status тут не подходит.
app.post('/api/notifications/zone-deactivated', (req, res) => {
  try {
    const { name, address } = req.body;
    const isTestnet = req.isTestnet;

    if (!name || !address) {
      return res.status(400).json({
        success: false,
        message: 'name и address обязательны'
      });
    }

    telegramBot.sendZoneStatusChangedNotification(name, address, 'inactive', isTestnet);

    return res.json({ success: true });
  } catch (error) {
    console.error('❌ Ошибка при отправке уведомления о деактивации зоны:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// ========== ЗАЯВКИ НА ДЕЙСТВИЯ АДРЕСА ПЛОЩАДКИ ==========
//
// change_content (деактивация SBT-зоны) и подобные привилегированные вызовы
// на контракте может исполнить только сам адрес площадки — обычный юзер
// физически не может отправить такую транзакцию своим кошельком (см.
// confirmSbtZoneToggle в ProfileWidget.tsx). Вместо того чтобы притворяться,
// что клик что-то сделал, юзерский клик пишет заявку сюда, владельцу летит
// уведомление в бота, а исполняет он сам из админки своим же TonConnect —
// без серверного приватного ключа (осознанное решение, автоматику обсудим
// позже).

// Юзер создаёт заявку кликом "Деактивировать" — не требует админ-авторизации,
// это же обычное действие обычного юзера над своей же зоной.
app.post('/api/admin/pending-actions', (req, res) => {
  try {
    const { actionType, targetType, targetAddress, targetCollectionAddress, targetName, requestedBy } = req.body;
    const db = req.db;
    const isTestnet = req.isTestnet;

    if (!actionType || !targetType || !targetAddress || !targetName || !requestedBy) {
      return res.status(400).json({
        success: false,
        message: 'actionType, targetType, targetAddress, targetName и requestedBy обязательны'
      });
    }

    // Не плодим дубликаты — если по этому адресу уже есть необработанная заявка
    // того же типа, просто возвращаем её.
    const existing = db.prepare(`
      SELECT * FROM pending_admin_actions
      WHERE targetAddress = ? AND actionType = ? AND status = 'pending'
    `).get(targetAddress, actionType);

    if (existing) {
      return res.json({ success: true, data: existing, alreadyPending: true });
    }

    const stmt = db.prepare(`
      INSERT INTO pending_admin_actions (actionType, targetType, targetAddress, targetCollectionAddress, targetName, requestedBy)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `);
    const created = stmt.get(actionType, targetType, targetAddress, targetCollectionAddress || null, targetName, requestedBy);

    if (actionType === 'deactivate_zone') {
      telegramBot.sendPendingDeactivationNotification(targetName, targetAddress, requestedBy, isTestnet);
    }

    return res.json({ success: true, data: created });
  } catch (error) {
    console.error('❌ Ошибка при создании заявки на действие площадки:', error);
    return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
});

// Список заявок для админки — только владелец площадки.
app.get('/api/admin/pending-actions', requireAdminAuth, (req, res) => {
  try {
    const db = req.db;
    const status = typeof req.query.status === 'string' ? req.query.status : null;

    const rows = status
      ? db.prepare('SELECT * FROM pending_admin_actions WHERE status = ? ORDER BY requestedAt DESC').all(status)
      : db.prepare('SELECT * FROM pending_admin_actions ORDER BY requestedAt DESC').all();

    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Ошибка при получении заявок на действия площадки:', error);
    return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
});

// Читаемый HTML-слепок всей БД для админки — быстрая ручная сверка
// состояния без похода в sqlite3 CLI. Список таблиц статичный (не
// PRAGMA table_list) — так проще держать порядок вывода осмысленным
// (сперва актуальный platform_*_cache, потом легаси zones/subdomains) и не
// светить служебные sqlite_* таблицы.
const DB_SNAPSHOT_TABLES = [
  'platform_zones_cache',
  'platform_subdomains_cache',
  'platform_wrappers_cache',
  'users',
  'zones',
  'subdomains',
  'chats',
  'messages',
  'auctions',
  'pending_admin_actions',
  'tutorial_progress',
] as const;

function escapeHtml(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

app.get('/api/admin/db-snapshot', requireAdminAuth, (req, res) => {
  try {
    const db = req.db;
    const sections = DB_SNAPSHOT_TABLES.map((table) => {
      let rows: Record<string, unknown>[];
      try {
        rows = db.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
      } catch (err: any) {
        return `<section><h2>${table} — ошибка</h2><p class="err">${escapeHtml(err?.message)}</p></section>`;
      }
      if (rows.length === 0) {
        return `<section><h2>${table} <span class="count">(0)</span></h2><p class="empty">пусто</p></section>`;
      }
      const columns = Object.keys(rows[0] ?? {});
      const head = columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('');
      const body = rows
        .map(
          (row) =>
            `<tr>${columns
              .map((c) => {
                const v = row[c];
                const text = typeof v === 'object' && v !== null ? JSON.stringify(v) : v;
                return `<td>${escapeHtml(text)}</td>`;
              })
              .join('')}</tr>`
        )
        .join('');
      return `<section><h2>${table} <span class="count">(${rows.length})</span></h2><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></section>`;
    });

    const html = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>DB snapshot — ${req.isTestnet ? 'testnet' : 'mainnet'}</title>
<style>
  body { font-family: ui-monospace, monospace; background: #111; color: #e5e5e5; margin: 0; padding: 20px; }
  h1 { color: #ffd700; }
  h2 { color: #ffd700; border-bottom: 1px solid #333; padding-bottom: 4px; margin-top: 32px; }
  .count { color: #888; font-weight: normal; font-size: 14px; }
  .empty { color: #666; }
  .err { color: #e74c3c; }
  table { border-collapse: collapse; width: 100%; font-size: 12px; margin-top: 8px; }
  th, td { border: 1px solid #333; padding: 4px 8px; text-align: left; white-space: nowrap; max-width: 320px; overflow: hidden; text-overflow: ellipsis; }
  th { background: #1a1a1a; position: sticky; top: 0; }
  tr:nth-child(even) { background: #191919; }
  td:hover { white-space: normal; overflow: visible; }
</style></head>
<body>
  <h1>DB snapshot — ${req.isTestnet ? 'testnet' : 'mainnet'}</h1>
  <p>Сгенерировано: ${escapeHtml(new Date().toISOString())}</p>
  ${sections.join('\n')}
</body></html>`;

    res.type('html').send(html);
  } catch (error: any) {
    console.error('❌ Ошибка при формировании DB-снапшота:', error);
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
});

// Публичная карта "какие targetAddress сейчас в очереди на деактивацию" —
// нужна фронту (ProfileWidget), чтобы показать юзеру "в процессе" вместо
// того, чтобы врать, что зона уже неактивна. Не приватная информация —
// просто факт наличия заявки, без деталей.
app.get('/api/admin/pending-actions/pending-map', (req, res) => {
  try {
    const db = req.db;
    const actionType = typeof req.query.actionType === 'string' ? req.query.actionType : 'deactivate_zone';

    const rows = db.prepare(`
      SELECT targetAddress FROM pending_admin_actions WHERE actionType = ? AND status = 'pending'
    `).all(actionType) as { targetAddress: string }[];

    const map: Record<string, boolean> = {};
    rows.forEach((r) => { map[r.targetAddress] = true; });

    return res.json({ success: true, data: map });
  } catch (error) {
    console.error('❌ Ошибка при получении карты ожидающих заявок:', error);
    return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
});

// Админ сам подписал транзакцию своим TonConnect в AdminPanelPage — тут
// только фиксируем факт исполнения, саму транзакцию сервер не отправляет.
app.post('/api/admin/pending-actions/:id/complete', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { txHash } = req.body;
    const db = req.db;

    const existing = db.prepare('SELECT * FROM pending_admin_actions WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Заявка не найдена' });
    }

    const stmt = db.prepare(`
      UPDATE pending_admin_actions
      SET status = 'executed', executedTxHash = ?, executedAt = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);
    const updated = stmt.get(txHash || null, id) as any;

    // Отмечаем зону неактивной в platform_zones_cache сразу, не дожидаясь
    // следующего прохода кроулера (~15 мин) — до этого фикса Market/Manager
    // и другие юзеры видели зону как активную ещё четверть часа после
    // реальной ончейн-деактивации (см. Log.md 2026-08-11). Список "мои
    // зоны" в самом ProfileWidget читает ончейн напрямую (не эту таблицу),
    // это не трогает.
    if (existing.actionType === 'deactivate_zone') {
      const collectionAddress = existing.targetCollectionAddress || existing.targetAddress;
      db.prepare(`UPDATE platform_zones_cache SET status = 'inactive' WHERE collectionAddress = ?`).run(collectionAddress);
      telegramBot.sendZoneStatusChangedNotification(existing.targetName, existing.targetAddress, 'inactive', req.isTestnet);
    }

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('❌ Ошибка при подтверждении исполнения заявки:', error);
    return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
});

// ========== ОБУЧАЛКА (пошаговый онбординг) ==========

// Публичный, по address — как /api/users. Без записи в БД, если юзер ещё
// не начинал обучение (дефолт, не 404), чтобы фронту не пришлось отдельно
// обрабатывать "ещё нет строки" как ошибку.
app.get('/api/tutorial/progress/:address', (req, res) => {
  try {
    const { address } = req.params;
    const db = req.db;

    const row = db.prepare('SELECT * FROM tutorial_progress WHERE address = ?').get(address) as
      { address: string; completedSteps: string; stepDetails: string; rewardGranted: number; rewardLength: string | null; startedAt: string; completedAt: string | null }
      | undefined;

    if (!row) {
      return res.json({ success: true, data: { started: false, completedSteps: [], stepDetails: {}, rewardGranted: false, rewardLength: null } });
    }

    return res.json({
      success: true,
      data: {
        started: true,
        completedSteps: JSON.parse(row.completedSteps || '[]'),
        stepDetails: JSON.parse(row.stepDetails || '{}'),
        rewardGranted: !!row.rewardGranted,
        rewardLength: row.rewardLength
      }
    });
  } catch (error) {
    console.error('❌ Ошибка при получении прогресса обучалки:', error);
    return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
});

app.post('/api/tutorial/start', (req, res) => {
  try {
    const { address } = req.body;
    const db = req.db;

    if (!address) {
      return res.status(400).json({ success: false, message: 'address обязателен' });
    }

    const existing = db.prepare('SELECT * FROM tutorial_progress WHERE address = ?').get(address);
    if (existing) {
      return res.json({ success: true, data: existing, alreadyStarted: true });
    }

    const stmt = db.prepare(`
      INSERT INTO tutorial_progress (address)
      VALUES (?)
      RETURNING *
    `);
    const created = stmt.get(address);

    return res.json({ success: true, data: created });
  } catch (error) {
    console.error('❌ Ошибка при старте обучалки:', error);
    return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
});

// Записывает прохождение одного шага. Дедуп — повторный вызов с уже
// пройденным шагом просто возвращает текущий список, не дублирует.
// Реальную защиту от читерства даёт не этот эндпоинт сам по себе, а то,
// ОТКУДА он вызывается на фронте: для шагов с настоящим онchain/бэкенд-
// действием (сохранение профиля, привязка DNS, создание субдомена, торрента)
// вызов стоит в хендлере успеха этого действия, а не по клику "Далее".
app.post('/api/tutorial/step', (req, res) => {
  try {
    const { address, step, detail } = req.body;
    const db = req.db;

    if (!address || !step) {
      return res.status(400).json({ success: false, message: 'address и step обязательны' });
    }

    if (!TUTORIAL_STEPS.includes(step)) {
      return res.status(400).json({ success: false, message: `Неизвестный шаг обучалки: ${step}` });
    }

    let row = db.prepare('SELECT * FROM tutorial_progress WHERE address = ?').get(address) as
      { address: string; completedSteps: string; stepDetails: string } | undefined;

    if (!row) {
      row = db.prepare('INSERT INTO tutorial_progress (address) VALUES (?) RETURNING *').get(address) as
        { address: string; completedSteps: string; stepDetails: string };
    }

    const completedSteps: string[] = JSON.parse(row.completedSteps || '[]');
    if (!completedSteps.includes(step)) {
      completedSteps.push(step);
    }

    // detail — конкретное имя (зоны/субдомена/домена/торрента), с которым
    // юзер прошёл шаг, опционально: не у каждого шага есть что показать
    // (навигационные шаги вроде market_toured его не присылают).
    const stepDetails: Record<string, string> = JSON.parse(row.stepDetails || '{}');
    if (typeof detail === 'string' && detail.trim()) {
      stepDetails[step] = detail.trim();
    }

    const updated = db.prepare(`
      UPDATE tutorial_progress SET completedSteps = ?, stepDetails = ? WHERE address = ?
      RETURNING *
    `).get(JSON.stringify(completedSteps), JSON.stringify(stepDetails), address) as
      { completedSteps: string; stepDetails: string; rewardGranted: number; rewardLength: string | null };

    return res.json({
      success: true,
      data: {
        completedSteps: JSON.parse(updated.completedSteps),
        stepDetails: JSON.parse(updated.stepDetails),
        rewardGranted: !!updated.rewardGranted,
        rewardLength: updated.rewardLength
      }
    });
  } catch (error) {
    console.error('❌ Ошибка при записи шага обучалки:', error);
    return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
});

// Выдаёт награду (случайная бесплатная SBT-попытка, 4-9 символов — не proxy,
// слишком ценно раздавать бесплатно), только если пройдены ВСЕ шаги
// TUTORIAL_STEPS. Идемпотентно: повторный вызов при уже выданной награде
// просто возвращает ранее выданную длину, повторно не начисляет — иначе
// это была бы бесконечная печать бесплатных попыток одним и тем же юзером.
app.post('/api/tutorial/complete', (req, res) => {
  try {
    const { address } = req.body;
    const db = req.db;
    const isTestnet = req.isTestnet;

    if (!address) {
      return res.status(400).json({ success: false, message: 'address обязателен' });
    }

    const progress = db.prepare('SELECT * FROM tutorial_progress WHERE address = ?').get(address) as
      { completedSteps: string; stepDetails: string; rewardGranted: number; rewardLength: string | null } | undefined;

    if (!progress) {
      return res.status(400).json({ success: false, message: 'Обучалка ещё не начата' });
    }

    if (progress.rewardGranted) {
      return res.json({ success: true, data: { rewardGranted: true, rewardLength: progress.rewardLength } });
    }

    const completedSteps: string[] = JSON.parse(progress.completedSteps || '[]');
    const allDone = TUTORIAL_STEPS.every((step) => completedSteps.includes(step));

    if (!allDone) {
      return res.status(400).json({
        success: false,
        message: 'Не все шаги обучалки пройдены',
        data: { completedSteps, missing: TUTORIAL_STEPS.filter((s) => !completedSteps.includes(s)) }
      });
    }

    // Живой фронт нигде не вызывает POST /api/users (createUser/createUserWithMeta
    // из api.ts используются только из AdminPanelPage) — обычный юзер, дошедший
    // досюда через весь тур, до этого момента мог вообще не иметь строки в
    // users. Раньше это било 404 и тихо ничего не делало (см. Log.md) —
    // самовосстанавливаемся, создавая пустую строку без промо-бонуса (тот
    // промо — отдельная механика для POST /api/users, тут не место её тоже
    // выдавать) вместо того, чтобы блокировать заслуженную награду за тур.
    let user = db.prepare('SELECT * FROM users WHERE address = ?').get(address) as User | undefined;
    if (!user) {
      const emptyNftAccessAmount = JSON.stringify({
        proxy: {4: false, 5: false, 6: false, 7: false, 8: false, 9: false},
        sbt: {4: false, 5: false, 6: false, 7: false, 8: false, 9: false}
      });
      const emptyTotalPaidAttempts = JSON.stringify({
        proxy: {4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0},
        sbt: {4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0}
      });
      user = db.prepare(`
        INSERT INTO users (
          address, name, domains, zones, subdomains,
          proxyZones, sbtZones, proxySubdomains, sbtSubdomains,
          nftAccessAmount, totalPaidAttempts,
          totalZoneSpending, totalSubdomainSpending,
          totalProxyZoneSpending, totalSbtZoneSpending,
          totalProxySubdomainSpending, totalSbtSubdomainSpending,
          totalProfit
        )
        VALUES (?, NULL, 0, 0, 0, 0, 0, 0, 0, ?, ?, 0, 0, 0, 0, 0, 0, 0)
        RETURNING *
      `).get(address, emptyNftAccessAmount, emptyTotalPaidAttempts) as User;
    }

    const nftAccessAmount = parseNftAccessAmount(user.nftAccessAmount);
    const totalPaidAttempts = parsePaymentAttemptsCount(user.totalPaidAttempts);

    // Рандомная длина не должна выдавать то, что у юзера уже есть (сознательно
    // не делаем стек из 2 попыток одной длины) — выбираем среди ещё не занятых
    // длин, и только если заняты вообще все 6 (маловероятный крайний случай) —
    // откатываемся на полностью случайный выбор.
    const ALL_ZONE_LENGTHS: ZoneLength[] = [4, 5, 6, 7, 8, 9];
    const availableLengths = ALL_ZONE_LENGTHS.filter((len) => !nftAccessAmount.sbt[len]);
    const candidateLengths = availableLengths.length > 0 ? availableLengths : ALL_ZONE_LENGTHS;
    const rewardLengthNum = candidateLengths[Math.floor(Math.random() * candidateLengths.length)] as ZoneLength;
    const rewardLength = String(rewardLengthNum);
    nftAccessAmount.sbt[rewardLengthNum] = true;
    totalPaidAttempts.sbt[rewardLengthNum] = (totalPaidAttempts.sbt[rewardLengthNum] || 0) + 1;

    db.prepare(`
      UPDATE users SET nftAccessAmount = ?, totalPaidAttempts = ?, updatedAt = CURRENT_TIMESTAMP WHERE address = ?
    `).run(JSON.stringify(nftAccessAmount), JSON.stringify(totalPaidAttempts), address);

    db.prepare(`
      UPDATE tutorial_progress SET rewardGranted = 1, rewardLength = ?, completedAt = CURRENT_TIMESTAMP WHERE address = ?
    `).run(rewardLength, address);

    console.log(`🎓 [TUTORIAL] Юзер ${address} завершил обучалку, выдана SBT-попытка длины ${rewardLength}`);

    if (telegramBot && telegramBot.sendTutorialCompletedNotification) {
      // Переупорядочиваем под TUTORIAL_STEPS — bot'у передаём только
      // готовый позиционный массив, у него нет доступа к самим ID шагов,
      // только к их отображаемым названиям (LANG.tutorialStepNames) в этом
      // же порядке, так что позиция в массиве обязана совпадать 1-в-1.
      const orderedSteps = TUTORIAL_STEPS.filter((step) => completedSteps.includes(step));
      const stepDetails: Record<string, string> = JSON.parse(progress.stepDetails || '{}');
      telegramBot.sendTutorialCompletedNotification(address, rewardLength, isTestnet, orderedSteps, stepDetails);
    }

    return res.json({ success: true, data: { rewardGranted: true, rewardLength } });
  } catch (error) {
    console.error('❌ Ошибка при завершении обучалки:', error);
    return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
});

// ========== СТАТИСТИКА ==========

// Получить статистику
app.get('/api/stats', (req, res) => {
  try {
    const db = req.db;
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const totalChats = db.prepare('SELECT COUNT(*) as count FROM chats').get() as { count: number };
    const totalMessages = db.prepare('SELECT COUNT(*) as count FROM messages').get() as { count: number };
    const totalZones = db.prepare('SELECT COUNT(*) as count FROM zones').get() as { count: number };
    const totalSubdomains = db.prepare('SELECT COUNT(*) as count FROM subdomains').get() as { count: number };
    
    const stats = {
      totalUsers: totalUsers.count,
      totalChats: totalChats.count,
      totalMessages: totalMessages.count,
      activeChats: totalChats.count,
      totalZones: totalZones.count,
      totalSubdomains: totalSubdomains.count
    };
    
    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Ошибка при получении статистики:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Получить расширенную статистику
app.get('/api/stats/extended', (req, res) => {
  try {
    const db = req.db;
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const totalZones = db.prepare('SELECT COUNT(*) as count FROM zones').get() as { count: number };
    const totalSubdomains = db.prepare('SELECT COUNT(*) as count FROM subdomains').get() as { count: number };
    const activeAuctions = db.prepare('SELECT COUNT(*) as count FROM auctions WHERE status = ?').get('active') as { count: number };
    const totalVolume = db.prepare('SELECT SUM(lastBid) as volume FROM subdomains WHERE lastBid IS NOT NULL').get() as { volume: number };
    
    // Статистика по типам зон
    const proxyZones = db.prepare('SELECT COUNT(*) as count FROM zones WHERE proxy = ?').get(1) as { count: number };
    const sbtZones = db.prepare('SELECT COUNT(*) as count FROM zones WHERE proxy = ?').get(0) as { count: number };
    
    // Статистика по статусам зон (НОВОЕ)
    const activeZones = db.prepare('SELECT COUNT(*) as count FROM zones WHERE status = ?').get('active') as { count: number };
    const inactiveZones = db.prepare('SELECT COUNT(*) as count FROM zones WHERE status = ?').get('inactive') as { count: number };
    
    // Статистика по статусам субдоменов
    const activeSubdomains = db.prepare('SELECT COUNT(*) as count FROM subdomains WHERE status = ?').get('active') as { count: number };
    const auctionSubdomains = db.prepare('SELECT COUNT(*) as count FROM subdomains WHERE status = ?').get('auction') as { count: number };
    const claimedSubdomains = db.prepare('SELECT COUNT(*) as count FROM subdomains WHERE status = ?').get('claimed') as { count: number };
    const inactiveSubdomains = db.prepare('SELECT COUNT(*) as count FROM subdomains WHERE status = ?').get('inactive') as { count: number };
    
    const stats = {
      totalUsers: totalUsers.count,
      totalZones: totalZones.count,
      totalSubdomains: totalSubdomains.count,
      activeAuctions: activeAuctions.count,
      totalVolume: totalVolume.volume || 0,
      zoneTypes: {
        proxy: proxyZones.count,
        sbt: sbtZones.count
      },
      zoneStatuses: { // НОВАЯ СТАТИСТИКА
        active: activeZones.count,
        inactive: inactiveZones.count
      },
      subdomainStatuses: {
        active: activeSubdomains.count,
        auction: auctionSubdomains.count,
        claimed: claimedSubdomains.count,
        inactive: inactiveSubdomains.count
      }
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Ошибка при получении расширенной статистики:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// ========== ОСНОВНЫЕ ЭНДПОИНТЫ ==========

// Health check
app.get('/api/health', (req, res) => {
  const isTestnet = req.isTestnet;
  res.json({
    success: true,
    message: `SQLite сервер работает! (${isTestnet ? 'testnet' : 'mainnet'})`,
    database: 'SQLite',
    network: isTestnet ? 'testnet' : 'mainnet',
    timestamp: new Date().toISOString()
  });
});

// Обработка несуществующих роутов
// app.use('*', (req, res) => {
//   res.status(404).json({
//     success: false,
//     message: 'Роут не найден'
//   });
// });
// Обработка несуществующих роутов
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({
    success: false,
    message: 'Роут не найден'
  });
});


// // Обработка ошибок
// app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
//   console.error('❌ Необработанная ошибка:', error);
//   res.status(500).json({
//     success: false,
//     message: 'Внутренняя ошибка сервера'
//   });
// });

// Обработка ошибок
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Необработанная ошибка:', error);
  res.status(500).json({
    success: false,
    message: 'Внутренняя ошибка сервера'
  });
});


// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 SQLite сервер запущен на порту ${PORT}`);
  console.log(`📊 Testnet база: nft-domains-testnet.db`);
  console.log(`📊 Mainnet база: nft-domains-mainnet.db`);
  console.log(`🌐 Доступен по адресу: http://localhost:${PORT}`);
  console.log(`🤖 Telegram Bot: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ Включен' : '❌ Отключен'}`);
  console.log(`👤 Telegram Owner ID: ${process.env.TELEGRAM_OWNER_ID ? '✅ Установлен' : '❌ Отсутствует'}`);
  console.log(`\n📋 ДОСТУПНЫЕ ЭНДПОИНТЫ:`);
  console.log(`🌐  СЕТЬ: Все эндпоинты поддерживают параметр ?isTestnet=true/false`);
  console.log(`👥  GET  /api/users/:address - Получить профиль`);
  console.log(`👥  POST /api/users - Создать пользователя`);
  console.log(`💬  GET  /api/chats/domain/:domain?userAddress=... - Чат`);
  console.log(`💬  POST /api/chats - Создать чат`);
  console.log(`📨  POST /api/chats/domain/:domain/messages - Сообщение`);
  console.log(`🌐  POST /api/zones - Создать зону`);
  console.log(`🌐  PUT  /api/zones/:name/collection - Обновить collection зоны`);
  console.log(`🌐  PUT  /api/zones/:name/wrapper - Обновить wrapper зоны`);
  console.log(`🌐  GET  /api/zones - Все зоны`);
  console.log(`🌐  GET  /api/zones/user/:address - Зоны пользователя`);
  console.log(`🌐  GET  /api/zones/name/:name - Зона по имени`);
  console.log(`🌐  GET  /api/zones/search/:query - Поиск зон`);
  console.log(`🔗  POST /api/subdomains - Создать субдомен`);
  console.log(`🔗  POST /api/subdomains/:id/bid - Добавить ставку`);
  console.log(`🔗  PUT  /api/subdomains/:id/status - Обновить статус`);
  console.log(`🔗  GET  /api/subdomains - Все субдомены`);
  console.log(`🔗  GET  /api/subdomains/user/:address - Субдомены пользователя`);
  console.log(`🔗  GET  /api/subdomains/zone/:zoneId - Субдомены зоны`);
  console.log(`🔗  GET  /api/subdomains/name/:name - Субдомен по имени`);
  console.log(`🔗  GET  /api/subdomains/status/:status - Субдомены по статусу`);
  console.log(`🔗  GET  /api/subdomains/search/:query - Поиск субдоменов`);
  console.log(`📊  GET  /api/health - Проверка`);
  console.log(`📈  GET  /api/stats - Статистика`);
  console.log(`📈  GET  /api/stats/extended - Расширенная статистика`);
  console.log(`🤖  POST /api/telegram/notification - Уведомление в Telegram`);
});

// Graceful shutdown: обе базы в WAL-режиме держат недавние записи в отдельном
// .db-wal файле, который НЕ примонтирован как volume в docker-compose.yml
// (там смонтированы только сами .db-файлы) — без явного чекпоинта здесь
// `docker stop` (SIGTERM) может убить контейнер раньше, чем WAL сольётся в
// основной файл сам по себе, и все записи с последнего автоматического
// чекпоинта теряются при пересборке/передеплое. wal_checkpoint(TRUNCATE)
// сливает WAL в основной .db-файл принудительно перед закрытием — тогда
// даже без монтирования .db-wal/.db-shm данные переживают передеплой.
const shutdown = (signal: string) => {
  console.log(`\n🛑 Получен ${signal}, чекпоиню WAL и закрываю базы...`);
  try {
    testnetDb.pragma('wal_checkpoint(TRUNCATE)');
    mainnetDb.pragma('wal_checkpoint(TRUNCATE)');
    testnetDb.close();
    mainnetDb.close();
    // telegramBot держит свои независимые коннекшны к тем же файлам
    telegramBot.checkpointAndClose();
    console.log('✅ Базы данных закрыты корректно (WAL сброшен в основной файл)');
  } catch (error) {
    console.error('❌ Ошибка при закрытии баз данных:', error);
  }
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
