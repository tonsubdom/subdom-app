
//до изменения базы данных плюс статус для зон и колекшнадрес для субдоменов
// src/server-sqlite.ts
import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

// Импортируем telegramBot после загрузки env
// import telegramBot from './utils/telegramBot-sqlite';
import telegramBot from './utils/tgBot-sqlite';

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
  `);
  
  // Выполняем миграцию после создания таблиц
  // migrateDatabase(db);
};


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

    const defaultNftAccessAmount = JSON.stringify({
      proxy: {4: false, 5: false, 6: false, 7: false, 8: false, 9: false},
      sbt: {4: false, 5: false, 6: false, 7: false, 8: false, 9: false}
    });
    
    const defaultTotalPaidAttempts = JSON.stringify({
      proxy: {4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0},
      sbt: {4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0}
    });
    
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

app.delete('/api/users/:id', (req, res) => {
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
app.delete('/api/zones/:id', (req, res) => {
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

app.put('/api/zones/:id/status', (req, res) => {
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
app.put('/api/zones/:name/collection', (req, res) => {
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
app.put('/api/zones/:name/wrapper', (req, res) => {
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

app.put('/api/zones/:id/address', (req, res) => {
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
app.delete('/api/subdomains/:id' , (req, res) => {
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
app.put('/api/subdomains/collection/:collectionAddress/status', (req, res) => {
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
            isTestnet
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
app.put('/api/subdomains/:id/status', (req, res) => {
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
        isTestnet
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

app.put('/api/subdomains/:id/address', (req, res) => {
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

app.put('/api/subdomains/:id/owner', (req, res) => {
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

app.delete('/api/chats/:id', (req, res) => {
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
app.delete('/api/messages/:id', (req, res) => {
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

// Получить чат по домену и адресу пользователя
app.get('/api/chats/domain/:domain', (req, res) => {
  try {
    const { domain } = req.params;
    const { userAddress } = req.query as { userAddress: string };
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
      const messageId = Math.random().toString(36).substring(2, 15);
      db.prepare('INSERT INTO messages (id, chatId, sender, text) VALUES (?, ?, ?, ?)')
        .run(messageId, chat.id, 'operator', 'Здравствуйте! 👋 Чем могу помочь?');
      
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
    const { domain, recordFormat, action } = req.body;
    const isTestnet = req.isTestnet;

    if (!domain || !['address', 'adnl', 'bagId'].includes(recordFormat) || !['set', 'delete'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Некорректные параметры уведомления'
      });
    }

    telegramBot.sendDnsRecordUpdatedNotification(domain, recordFormat, action, isTestnet);

    return res.json({ success: true });
  } catch (error) {
    console.error('❌ Ошибка при отправке уведомления о DNS-записи:', error);
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
    const { domain, winner, finalPrice } = req.body;
    const isTestnet = req.isTestnet;

    if (!domain || !winner || finalPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: 'domain, winner и finalPrice обязательны'
      });
    }

    telegramBot.sendAuctionEndedNotification(domain, winner, finalPrice, isTestnet);

    return res.json({ success: true });
  } catch (error) {
    console.error('❌ Ошибка при отправке уведомления о завершении аукциона:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
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

export default app;
