// // utils/tgBot-sqlite.ts
// import TelegramBot from 'node-telegram-bot-api';
// import dotenv from 'dotenv';
// import Database from 'better-sqlite3';


// // Загружаем переменные окружения
// dotenv.config();

// // Интерфейсы для типизации
// interface TelegramMessage {
//   chat: {
//     id: number;
//   };
//   text?: string;
//   reply_to_message?: {
//     from?: {
//       id: number;
//     };
//   };
// }

// interface TelegramCallbackQuery {
//   id: string;
//   data?: string;
//   message?: {
//     chat: {
//       id: number;
//     };
//     message_id: number;
//   };
// }

// interface MessageContext {
//   domain: string;
//   userAddress: string;
//   isTestnet: boolean;
// }

// declare module 'node-telegram-bot-api' {
//   interface TelegramBot {
//     getMe(): Promise<{ id: number; username: string }>;
//   }
// }

// // Утилита для генерации deeplink ссылок
// // class DeeplinkUtils {
// //   // Имя вашего бота (без @)
// //   private static readonly BOT_USERNAME = 'subdom'; // Замените на имя вашего бота
  
// //   /**
// //    * Генерирует ссылку для мини-апп Telegram
// //    * @param action - действие (auction, market, add-subdomain и т.д.)
// //    * @param params - параметры для действия
// //    * @returns Ссылка для открытия в мини-апп
// //    */
// //   static generateMiniAppLink(action: string, params: Record<string, string> = {}): string {
// //     // Формируем параметр startapp
// //     let startappParam = action;
    
// //     if (Object.keys(params).length > 0) {
// //       // Преобразуем параметры в строку формата action_key1_value1_key2_value2
// //       const paramString = Object.entries(params)
// //         .map(([key, value]) => `${key}_${value}`)
// //         .join('_');
// //       startappParam = `${action}_${paramString}`;
// //     }
    
// //     // Кодируем параметр для URL
// //     const encodedParam = encodeURIComponent(startappParam);
    
// //     // Формируем ссылку для мини-апп
// //     return `https://t.me/${this.BOT_USERNAME}?startapp=${encodedParam}`;
// //   }
  
// //   /**
// //    * Генерирует ссылку для создания субдомена в мини-апп
// //    * @param zoneName - имя зоны
// //    * @param subdomainName - имя субдомена
// //    * @returns Ссылка для открытия в мини-апп
// //    */
// //   static generateAddSubdomainLink(zoneName: string, subdomainName: string): string {
// //     return this.generateMiniAppLink('add-subdomain', {
// //       zone: zoneName,
// //       subdomain: subdomainName
// //     });
// //   }

// //     /**
// //    * Генерирует ссылку для маркета в мини-апп
// //    * @returns Ссылка для открытия в мини-апп
// //    */
// //   static generateMarketLink(): string {
// //     return this.generateMiniAppLink('market');
// //   }
  
// //   /**
// //    * Генерирует ссылку для главной страницы в мини-апп
// //    * @returns Ссылка для открытия в мини-апп
// //    */
// //   static generateHomeLink(): string {
// //     return this.generateMiniAppLink('#');
// //   }
// // }

// // utils/tgBot-sqlite.ts - обновленный класс DeeplinkUtils

// // utils/tgBot-sqlite.ts - исправленный класс DeeplinkUtils

// class DeeplinkUtils {
//   // Имя вашего бота (без @)
//   private static readonly BOT_USERNAME = 'subdom';
  
//   /**
//    * Генерирует deeplink для Telegram мини-апп
//    * @param route - роут приложения
//    * @param params - параметры для роута
//    * @returns Deeplink для Telegram
//    */
//   static generateTelegramDeeplink(route: string, params: Record<string, string> = {}): string {
//     // Формируем startapp параметр
//     let startappParam = route.replace(/^\/+/, ''); // Убираем начальный слеш
    
//     if (Object.keys(params).length > 0) {
//       // Преобразуем параметры в строку формата key_value
//       const paramString = Object.entries(params)
//         .filter(([_, value]) => value) // Фильтруем пустые значения
//         .map(([key, value]) => `${key}_${value}`)
//         .join('_');
      
//       if (paramString) {
//         startappParam = `${startappParam}_${paramString}`;
//       }
//     }
    
//     // Кодируем параметр для URL
//     const encodedParam = encodeURIComponent(startappParam);
    
//     // Формируем deeplink
//     return `https://t.me/${this.BOT_USERNAME}?startapp=${encodedParam}`;
//   }
  
//   /**
//    * Генерирует ссылку для создания субдомена в мини-апп (роут 1)
//    * Используется когда разворачивается Bundle
//    * @param zoneName - имя зоны (например, "polymarket.ton")
//    * @param subdomainName - опциональное имя субдомена
//    * @returns Deeplink для Telegram
//    */
//   static generateAddSubdomainLink(zoneName: string, subdomainName?: string): string {
//     const params: Record<string, string> = { zone: zoneName };
//     if (subdomainName) {
//       params.subdomain = subdomainName;
//     }
    
//     return this.generateTelegramDeeplink('/add-subdomain', params);
//   }
  
//   /**
//    * Генерирует ссылку для маркета в мини-апп (роут 2)
//    * Используется когда аукцион завершен
//    * @returns Deeplink для Telegram
//    */
//   static generateMarketLink(): string {
//     return this.generateTelegramDeeplink('/market');
//   }
  
//   /**
//    * Генерирует ссылку для аукциона в мини-апп (роут 3)
//    * Используется для нового аукциона или новой ставки
//    * @param zoneName - имя зоны
//    * @param subdomainName - имя субдомена
//    * @returns Deeplink для Telegram
//    */
//   static generateAuctionLink(zoneName: string, subdomainName: string): string {
//     return this.generateTelegramDeeplink('/add-subdomain', {
//       zone: zoneName,
//       subdomain: subdomainName
//     });
//   }
  
//   /**
//    * Генерирует ссылку для главной страницы в мини-апп
//    * @returns Deeplink для Telegram
//    */
//   static generateHomeLink(): string {
//     return this.generateTelegramDeeplink('/');
//   }
  
//   /**
//    * Парсит startapp параметр из Telegram deeplink
//    * @param startappParam - параметр startapp из URL
//    * @returns Объект с роутом и параметрами
//    */
//   static parseStartappParam(startappParam: string): { route: string; params: Record<string, string> } {
//     const parts = startappParam.split('_');
    
//     if (parts.length === 0) {
//       return { route: '/', params: {} };
//     }
    
//     // Первая часть - это роут
//     const firstPart = parts[0]!;
//     const route = firstPart.startsWith('/') ? firstPart : `/${firstPart}`;
//     const params: Record<string, string> = {};
    
//     // Остальные части - это параметры в формате key_value
//     for (let i = 1; i < parts.length; i += 2) {
//       if (i + 1 < parts.length) {
//         const key = parts[i];
//         const value = parts[i + 1];
        
//         // Проверяем что key и value определены
//         if (key !== undefined && value !== undefined) {
//           params[key] = value;
//         }
//       }
//     }
    
//     return { route, params };
//   }
  
//   /**
//    * Форматирует домен для использования в URL
//    * @param domain - полный домен (например, "test.polymarket.ton")
//    * @returns Кортеж [subdomainName, zoneName]
//    */
//   static formatDomainForUrl(domain: string): [string, string] {
//     if (!domain) return ['', ''];
//     const parts = domain.split('.');
    
//     if (parts.length >= 2) {
//       const subdomainName = parts[0] || '';
//       const zoneName = parts.slice(1).join('.') || '';
//       // Возвращаем [subdomainName, zoneName]
//       return [subdomainName, zoneName];
//     }
    
//     // Если формат неверный, возвращаем пустые строки
//     return ['', ''];
//   }
  
//   /**
//    * Генерирует ссылку на основе типа уведомления
//    * @param type - тип уведомления
//    * @param domain - домен (опционально)
//    * @returns Deeplink для Telegram
//    */
//   static generateLinkForNotification(type: 'bundle' | 'auction' | 'bid' | 'market', domain?: string): string {
//     switch (type) {
//       case 'bundle':
//         // Для Bundle развертывания - ссылка на создание субдомена
//         if (!domain) {
//           throw new Error('Domain is required for bundle notification');
//         }
//         const [_, zoneName] = this.formatDomainForUrl(domain);
//         if (!zoneName) {
//           throw new Error(`Invalid domain format: ${domain}`);
//         }
//         return this.generateAddSubdomainLink(zoneName);
        
//       case 'auction':
//       case 'bid':
//         // Для аукциона или ставки - ссылка на конкретный аукцион
//         if (!domain) {
//           throw new Error('Domain is required for auction/bid notification');
//         }
//         const [subdomainName, zoneName2] = this.formatDomainForUrl(domain);
//         if (!zoneName2 || !subdomainName) {
//           throw new Error(`Invalid domain format for auction: ${domain}`);
//         }
//         return this.generateAuctionLink(zoneName2, subdomainName);
        
//       case 'market':
//         // Для завершенного аукциона - ссылка на маркет
//         return this.generateMarketLink();
        
//       default:
//         throw new Error(`Unknown notification type: ${type}`);
//     }
//   }
// }


// class TelegramBotService {
//   private bot: TelegramBot | null = null;
//   private ownerId: string = process.env.TELEGRAM_OWNER_ID || '';
//   private groupId: string = process.env.TELEGRAM_GROUP_ID || '';
//   private replyContext = new Map<number, MessageContext>();
//   private messageContexts = new Map<string, MessageContext>();
  
//   // Базы данных
//   private testnetDb: Database.Database;
//   private mainnetDb: Database.Database;

//   private replyContextTimeouts = new Map<number, NodeJS.Timeout>();

//   constructor() {
//     console.log('🔧 Инициализация Telegram Bot...');
//     console.log('📝 TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? '✅ Установлен' : '❌ Отсутствует');
//     console.log('👤 TELEGRAM_OWNER_ID:', process.env.TELEGRAM_OWNER_ID ? '✅ Установлен' : '❌ Отсутствует');
//     console.log('👥 TELEGRAM_GROUP_ID:', process.env.TELEGRAM_GROUP_ID ? '✅ Установлен' : '❌ Отсутствует');
    
//     // Инициализируем базы данных
//     this.testnetDb = new Database('nft-domains.db');
//     this.mainnetDb = new Database('nft-domains-mainnet.db');

//      console.log(`💾 Базы данных инициализированы: testnet=${!!this.testnetDb}, mainnet=${!!this.mainnetDb}`);

//     this.testnetDb.pragma('journal_mode = WAL');
//     this.mainnetDb.pragma('journal_mode = WAL');
    
//     // Инициализируем таблицы чатов (если их нет)
//     this.initializeChatTables();
    
//     this.initializeBot();
//   }

// private initializeChatTables(): void {
//   const initializeDb = (db: Database.Database, dbName: string) => {
//     console.log(`💾 Инициализация таблиц в БД: ${dbName}`);
    
//     // Проверяем существование таблиц чатов
//     const chatsTableExists = db.prepare(`
//       SELECT name FROM sqlite_master 
//       WHERE type='table' AND name='chats'
//     `).get();
    
//     const messagesTableExists = db.prepare(`
//       SELECT name FROM sqlite_master 
//       WHERE type='table' AND name='messages'
//     `).get();
    
//     console.log(`💾 Таблица chats существует: ${!!chatsTableExists}`);
//     console.log(`💾 Таблица messages существует: ${!!messagesTableExists}`);
    
//     if (!chatsTableExists) {
//       db.exec(`
//         CREATE TABLE IF NOT EXISTS chats (
//           id INTEGER PRIMARY KEY AUTOINCREMENT,
//           domain TEXT NOT NULL,
//           userAddress TEXT NOT NULL,
//           status TEXT DEFAULT 'active',
//           createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
//           updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
//           UNIQUE(domain, userAddress)
//         );
//       `);
//       console.log('✅ Таблица chats создана');
//     }
    
//     if (!messagesTableExists) {
//       db.exec(`
//         CREATE TABLE IF NOT EXISTS messages (
//           id TEXT PRIMARY KEY,
//           chatId INTEGER NOT NULL,
//           sender TEXT NOT NULL,
//           text TEXT NOT NULL,
//           timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
//           FOREIGN KEY (chatId) REFERENCES chats(id)
//         );
//       `);
//       console.log('✅ Таблица messages создана');
//     }

//       // Проверяем структуру таблиц
//     console.log(`💾 Проверяем структуру таблиц...`);
//     try {
//       const chatsColumns = db.prepare('PRAGMA table_info(chats)').all();
//       console.log(`💾 Столбцы таблицы chats:`, chatsColumns.map((c: any) => c.name));
      
//       const messagesColumns = db.prepare('PRAGMA table_info(messages)').all();
//       console.log(`💾 Столбцы таблицы messages:`, messagesColumns.map((c: any) => c.name));
//     } catch (error) {
//       console.error(`❌ Ошибка при проверке структуры таблиц:`, error);
//     }
//   };


  
  
//   initializeDb(this.testnetDb, 'testnet');
//   initializeDb(this.mainnetDb, 'mainnet');
// }


//   private getDatabase(isTestnet: boolean): Database.Database {
//     return isTestnet ? this.testnetDb : this.mainnetDb;
//   }

//   private initializeBot(): void {
//   const token = process.env.TELEGRAM_BOT_TOKEN;
  
//   if (!token) {
//     console.warn('⚠️ TELEGRAM_BOT_TOKEN не установлен. Telegram бот отключен.');
//     return;
//   }

//   if (!this.ownerId) {
//     console.warn('⚠️ TELEGRAM_OWNER_ID не установлен. Уведомления не будут отправляться.');
//     return;
//   }

//   try {
//     // ИСПРАВЛЕННЫЙ КОНСТРУКТОР - используем только polling: true
//     this.bot = new TelegramBot(token, { 
//       polling: true
//     });
    
//     this.setupHandlers();
//     console.log('✅ Telegram Bot инициализирован и запущен');
    
//     // Отправляем тестовое сообщение при запуске
//     this.sendTestNotification();
//   } catch (error) {
//     console.error('❌ Ошибка инициализации Telegram бота:', error);
//   }
// }

//   private async sendTestNotification(): Promise<void> {
//     if (!this.isBotAvailable()) return;
    
//     try {
//       await this.bot!.sendMessage(
//         this.ownerId,
//         `🤖 <b>Бот поддержки Subdom (TON DNS Subdomains) запущен!</b>\n\nСтатус: <b>✅ Активен</b>\nВремя: ${new Date().toLocaleString('ru-RU')}\nБазы данных: ✅ Testnet, ✅ Mainnet`,
//         { parse_mode: 'HTML' }
//       );
//       console.log('✅ Тестовое уведомление отправлено');
//     } catch (error: unknown) {
//   if (error instanceof Error && 'response' in error) {
//     const axiosError = error as { response: { data: any; status: number } };
//     console.error(axiosError.response.data);
//   } else if (error instanceof Error) {
//     console.error(error.message);
//   } else {
//     console.error('Unknown error:', error);
//   }
// }

//   }

//   private setupHandlers(): void {
//     if (!this.bot) return;

//     // Простой обработчик для всех сообщений (для отладки)
//   this.bot.on('message', (msg: TelegramMessage) => {
//     console.log(`📨 [DEBUG] Сообщение получено: chatId=${msg.chat.id}, text=${msg.text?.substring(0, 50)}`);
//   });

//     // Обработчик команды /start
//     this.bot.onText(/\/start/, (msg: TelegramMessage) => {
//       const chatId = msg.chat.id;
//       this.bot!.sendMessage(
//         chatId,
//         `🤖 <b>Бот поддержки Subdom (TON DNS Subdomains) </b>\n\nЭтот бот отправляет уведомления о:\n• Новых чатах\n• Сообщениях от пользователей\n• Новых зонах\n• Сминченных субдоменах\n• Новых пользователях\n• Аукционах\n• Ставках\n\nСтатус: <b>✅ Активен</b>`,
//         { parse_mode: 'HTML' }
//       );
//     });

//     // Обработчик команды /status
//     this.bot.onText(/\/status/, (msg: TelegramMessage) => {
//       const chatId = msg.chat.id;
//       this.bot!.sendMessage(
//         chatId,
//         `📊 <b>Статус системы</b>\n\nБот: <b>✅ Активен</b>\nВладелец: <code>${this.ownerId}</code>\nЧат ID: <code>${chatId}</code>\nВремя: ${new Date().toLocaleString('ru-RU')}`,
//         { parse_mode: 'HTML' }
//       );
//     });

//     // Обработчик команды /network
//     this.bot.onText(/\/network/, (msg: TelegramMessage) => {
//       const chatId = msg.chat.id;
//       this.bot!.sendMessage(
//         chatId,
//         `🌐 <b>Информация о сетях</b>\n\nБот поддерживает уведомления для:\n• <b>Testnet</b> (тестовая сеть)\n• <b>Mainnet</b> (основная сеть)\n\nВсе уведомления содержат информацию о сети.`,
//         { parse_mode: 'HTML' }
//       );
//     });

//     // Обработчик callback-запросов
//     this.bot.on('callback_query', async (callbackQuery: TelegramCallbackQuery) => {
//       try {
//         const data = callbackQuery.data;
//         const chatId = callbackQuery.message?.chat.id;
//         const messageId = callbackQuery.message?.message_id;
        
//         if (!data || !chatId || !messageId) return;
        
//         console.log(`📨 Callback получен: ${data}`);
        
//         // Обработка кнопки "Ответить"
//         if (data.startsWith('reply_')) {
//           await this.handleReplyCallback(callbackQuery);
//         }
        
//         // Подтверждаем получение callback
//         await this.bot!.answerCallbackQuery(callbackQuery.id);
//       } catch (error) {
//         console.error('❌ Ошибка при обработке callback:', error);
//       }
//     });

// // Обработчик текстовых сообщений (для ответов техподдержки)
// this.bot.on('message', async (msg: any) => {
//   try {
//     console.log(`📨 Получено сообщение в чате ${msg.chat.id}: ${msg.text?.substring(0, 50)}...`);
//     console.log(`📨 reply_to_message:`, msg.reply_to_message);
    
//     // Проверяем, есть ли активный контекст для этого чата
//     const context = this.replyContext.get(msg.chat.id);
//     console.log(`📨 Активный контекст для чата ${msg.chat.id}:`, context);
    
//     if (context && msg.text) {
//       console.log(`✅ Найден активный контекст! Обрабатываем как ответ техподдержки...`);
//       await this.handleSupportReply(msg);
//     } else if (msg.reply_to_message && msg.text) {
//       console.log(`📨 Это ответ на сообщение ${msg.reply_to_message.message_id}`);
//       console.log(`📨 Отправитель ответа:`, msg.reply_to_message.from);
      
//       // Если есть reply_to_message, сохраняем контекст и обрабатываем
//       await this.handleSupportReply(msg);
//     } else {
//       console.log(`❌ Нет активного контекста и не ответ на сообщение`);
      
//       // Если сообщение от владельца и есть текст, но нет контекста
//       if (msg.chat.id.toString() === this.ownerId && msg.text) {
//         console.log(`ℹ️ Сообщение от владельца без контекста: ${msg.text}`);
//         if (this.bot) {
//           await this.bot.sendMessage(msg.chat.id, 
//             'ℹ️ Чтобы ответить клиенту, сначала нажмите кнопку "Ответить" под уведомлением о сообщении.'
//           );
//         }
//       }
//     }
//   } catch (error) {
//     console.error('❌ Ошибка при обработке сообщения:', error);
//   }
// });

//     this.bot.on('polling_error', (error: Error) => {
//   // Игнорируем только таймауты
//   if (error.message.includes('ESOCKETTIMEDOUT') || error.message.includes('ETIMEDOUT')) {
//     // Не выводим таймауты
//     return;
//   }
  
//   // Другие ошибки выводим
//   console.error('❌ Ошибка Telegram polling:', error);
// });

//     // this.bot.on('error', (error: Error) => {
//     //   console.error('❌ Общая ошибка Telegram бота:', error);
//     // });
//   }


// private async handleReplyCallback(callbackQuery: TelegramCallbackQuery): Promise<void> {
//   try {
//     const data = callbackQuery.data;
//     const chatId = callbackQuery.message?.chat.id;
//     const messageId = callbackQuery.message?.message_id;
    
//     if (!data || !chatId || !messageId) return;
    
//     console.log(`📨 Callback получен: ${data}`);
    
//     // Обработка кнопки "Ответить"
//     if (data.startsWith('reply_')) {
//       await this.handleReplyCallbackData(data, chatId, messageId);
//     }
    
//     // Подтверждаем получение callback
//     if (this.bot) {
//       await this.bot.answerCallbackQuery(callbackQuery.id);
//     }
//   } catch (error) {
//     console.error('❌ Ошибка при обработке callback:', error);
//   }
// }

// private async handleReplyCallbackData(data: string, chatId: number, messageId: number): Promise<void> {
//   // Парсим данные: reply_messageId
//   const parts = data.split('_');
//   if (parts.length !== 2 || parts[0] !== 'reply') {
//     console.error('❌ Неверный формат callback_data:', data);
//     return;
//   }
  
//   const contextId = parts[1];
//   if (!contextId) {  // ← ДОБАВЬТЕ ЭТУ ПРОВЕРКУ
//     console.error('❌ contextId не определен');
//     return;
//   }
//   const context = this.messageContexts.get(contextId);
  
//   if (!context) {
//     console.error('❌ Контекст не найден для ID:', contextId);
//     console.error('❌ Все доступные контексты:', Array.from(this.messageContexts.entries()));
//     if (this.bot) {
//       await this.bot.sendMessage(chatId, '❌ Контекст сообщения устарел или не найден.', {
//         parse_mode: 'HTML'
//       });
//     }
//     return;
//   }
  
//   const { domain, userAddress, isTestnet } = context;
  
//   console.log(`💬 Обработка ответа для: ${domain} - ${userAddress} (${isTestnet ? 'testnet' : 'mainnet'})`);
//   console.log(`💬 Сохраняем контекст для чата ${chatId}:`, context);
  
//   // Сохраняем контекст для будущего ответа
//   this.replyContext.set(chatId, { 
//     domain, 
//     userAddress, 
//     isTestnet 
//   });
  
//   console.log(`💬 Контекст сохранен. Все контексты:`, Array.from(this.replyContext.entries()));

//   // Устанавливаем таймаут на 10 минут для очистки контекста
//   if (this.replyContextTimeouts.has(chatId)) {
//     clearTimeout(this.replyContextTimeouts.get(chatId)!);
//   }
  
//   const timeout = setTimeout(() => {
//     console.log(`⏰ Таймаут контекста для чата ${chatId}`);
//     this.replyContext.delete(chatId);
//     this.replyContextTimeouts.delete(chatId);
    
//     if (this.bot) {
//       this.bot.sendMessage(chatId, 
//         '⏰ Контекст ответа истек. Чтобы ответить клиенту, нажмите кнопку "Ответить" заново.'
//       );
//     }
//   }, 10 * 60 * 1000); // 10 минут
  
//   this.replyContextTimeouts.set(chatId, timeout);
  
//   console.log(`💬 Контекст сохранен с таймаутом 10 минут. Все контексты:`, Array.from(this.replyContext.entries()));
  
//   // Отправляем сообщение с инструкцией
//   const instruction = `
// ✍️ <b>ОТВЕТИТЬ КЛИЕНТУ</b>

// 🌐 Домен: <code>${domain}</code>
// 👤 Адрес: <code>${userAddress}</code>
// 🌐 Сеть: ${isTestnet ? 'Testnet' : 'Mainnet'}

// 📝 <b>Напишите ответ ниже этим сообщением:</b>
// (Просто ответьте на это сообщение текстом)
//   `.trim();
  
//   if (this.bot) {
//     await this.bot.sendMessage(chatId, instruction, {
//       parse_mode: 'HTML',
//       reply_to_message_id: messageId
//     });
//   }
// }

// private async handleSupportReply(msg: any): Promise<void> {
//   try {
//     const chatId = msg.chat.id;
//     const replyText = msg.text;
    
//     console.log(`📤 Получен ответ от оператора в чате ${chatId}: ${replyText}`);
//     console.log(`📤 Контекст для чата ${chatId}:`, this.replyContext.get(chatId));
    
//     if (!replyText) {
//       console.log('❌ Сообщение не содержит текста');
//       if (this.bot) {
//         await this.bot.sendMessage(chatId, '❌ Сообщение не содержит текста');
//       }
//       return;
//     }
    
//     // Получаем контекст из памяти
//     const context = this.replyContext.get(chatId);
//     if (!context) {
//       console.log('❌ Контекст ответа не найден для чата:', chatId);
//       console.log('❌ Все контексты:', Array.from(this.replyContext.entries()));
      
//       // Попробуем создать контекст из reply_to_message
//       if (msg.reply_to_message && msg.reply_to_message.text) {
//         console.log('ℹ️ Пытаемся извлечь контекст из reply_to_message...');
//         // Здесь можно попробовать парсить текст сообщения бота
//         // Но лучше просто сказать пользователю использовать кнопку
//       }
      
//       if (this.bot) {
//         await this.bot.sendMessage(chatId, 
//           '❌ Контекст ответа не найден. Используйте кнопку "Ответить" под уведомлением о сообщении.'
//         );
//       }
//       return;
//     }
    
//     const { domain, userAddress, isTestnet } = context;
    
//     console.log(`📤 Отправка ответа техподдержки: ${domain} - ${userAddress} (${isTestnet ? 'testnet' : 'mainnet'})`);
    
//     // Сохраняем ответ оператора в базу данных
//     const success = await this.saveOperatorReplyToDatabase(domain, userAddress, replyText, isTestnet);
    
//     if (success) {
//       console.log(`✅ Ответ оператора сохранен в БД для ${domain}`);
      
//       // Уведомляем техподдержку
//       if (this.bot) {
//         await this.bot.sendMessage(chatId, `
// ✅ <b>ОТВЕТ ОТПРАВЛЕН КЛИЕНТУ И СОХРАНЕН В БАЗУ</b>

// 🌐 Домен: <code>${domain}</code>
// 👤 Адрес: <code>${userAddress}</code>
// 🌐 Сеть: ${isTestnet ? 'Testnet' : 'Mainnet'}

// 💬 Ваш ответ:
// ${replyText}

// ⏰ Сохранено: ${new Date().toLocaleString('ru-RU')}
//         `.trim(), { parse_mode: 'HTML' });
//       }
      
//       // Удаляем контекст после успешной отправки
//     this.replyContext.delete(chatId);
    
//     // Очищаем таймаут
//     if (this.replyContextTimeouts.has(chatId)) {
//       clearTimeout(this.replyContextTimeouts.get(chatId)!);
//       this.replyContextTimeouts.delete(chatId);
//     }
    
//     console.log(`✅ Контекст и таймаут удалены для чата ${chatId}`);
      
//       console.log(`✅ Ответ оператора сохранен в базу (${isTestnet ? 'testnet' : 'mainnet'}): ${domain} - ${userAddress}`);
//     } else {
//       console.log('❌ Ошибка при сохранении ответа в базу данных');
//       if (this.bot) {
//         await this.bot.sendMessage(chatId, '❌ Ошибка при сохранении ответа в базу данных');
//       }
//     }
    
//   } catch (error) {
//     console.error('❌ Ошибка при обработке ответа техподдержки:', error);
//     if (this.bot && msg.chat.id) {
//       await this.bot.sendMessage(msg.chat.id, '❌ Произошла ошибка при обработке ответа');
//     }
//   }
// }

// private async saveOperatorReplyToDatabase(
//   domain: string, 
//   userAddress: string, 
//   replyText: string, 
//   isTestnet: boolean
// ): Promise<boolean> {
//   try {
//     console.log(`💾 Попытка сохранения ответа оператора в БД: ${domain}, ${userAddress}, ${isTestnet ? 'testnet' : 'mainnet'}`);
    
//     const db = this.getDatabase(isTestnet);
    
//     // Находим или создаем чат
//     let chat = db.prepare('SELECT * FROM chats WHERE domain = ? AND userAddress = ?').get(domain, userAddress) as any;
    
//     console.log(`💾 Найден чат:`, chat);
    
//     if (!chat) {
//       console.log(`💾 Чат не найден, создаем новый для ${domain} - ${userAddress}`);
//       const stmt = db.prepare(`
//         INSERT INTO chats (domain, userAddress) 
//         VALUES (?, ?)
//         RETURNING *
//       `);
      
//       chat = stmt.get(domain, userAddress);
//       console.log(`💾 Создан новый чат:`, chat);
//     }
    
//     // Добавляем сообщение оператора
//     const messageId = Math.random().toString(36).substring(2, 15);
//     console.log(`💾 Добавляем сообщение оператора с ID: ${messageId}`);
    
//     const result = db.prepare('INSERT INTO messages (id, chatId, sender, text) VALUES (?, ?, ?, ?)')
//       .run(messageId, chat.id, 'operator', replyText);
    
//     console.log(`💾 Результат вставки сообщения:`, result);
    
//     // Обновляем время чата
//     db.prepare('UPDATE chats SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?')
//       .run(chat.id);

//     console.log(`✅ Ответ оператора сохранен в БД для чата ${domain} (${isTestnet ? 'testnet' : 'mainnet'})`);
//     return true;
//   } catch (error) {
//     console.error('❌ Ошибка при сохранении ответа оператора в БД:', error);
//     return false;
//   }
// }


//   // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

//   private generateMessageId(domain: string, userAddress: string): string {
//     const combined = `${domain}_${userAddress}`;
//     let hash = 0;
//     for (let i = 0; i < combined.length; i++) {
//       hash = ((hash << 5) - hash) + combined.charCodeAt(i);
//       hash = hash & hash;
//     }
//     return Math.abs(hash).toString(36).substring(0, 8);
//   }

//   private isBotAvailable(): boolean {
//     return !!(this.bot && this.ownerId);
//   }

//   private isGroupAvailable(): boolean {
//     return !!(this.bot && this.groupId);
//   }

//   private formatNetwork(isTestnet: boolean): string {
//     return isTestnet ? '🔬 <b>Сеть:</b> Testnet' : '🌐 <b>Сеть:</b> Mainnet';
//   }

// //   private formatDomainForUrl(domain: string): string {
// //     const parts = domain.split('.');
// //     return parts.length > 0 ? parts[0] : domain;
// //   }

// // private formatDomainForUrl(domain: string): string[] | string {
// //   if (!domain) return '';
// //   const parts = domain.split('.');
// //   return parts.length > 0 ? parts : domain;
// // }

// private formatDomainForUrl(domain: string): string[] {
//   if (!domain) return [];
//   const parts = domain.split('.');
//   return parts;
// }
//   // ========== МЕТОДЫ УВЕДОМЛЕНИЙ ДЛЯ ВЛАДЕЛЬЦА ==========

//   async sendNewMessageNotification(domain: string, userAddress: string, messageText: string, isTestnet: boolean = true): Promise<void> {
//     if (!this.isBotAvailable()) {
//       console.warn('⚠️ Telegram не настроен. Пропускаем отправку уведомления.');
//       return;
//     }

//     try {
//       const network = this.formatNetwork(isTestnet);
      
//       // Генерируем короткий уникальный ID для этого сообщения
//       const messageId = this.generateMessageId(domain, userAddress);
      
//       // Сохраняем полные данные по этому ID
//       this.messageContexts.set(messageId, { 
//         domain, 
//         userAddress,
//         isTestnet
//       });
      
//       // Очищаем старые записи
//       // if (this.messageContexts.size > 100) {
//       //   const keys = Array.from(this.messageContexts.keys());
//       //   for (let i = 0; i < 50; i++) {
//       //     this.messageContexts.delete(keys[i]);
//       //   }
//       // }
//       if (this.messageContexts.size > 100) {
//   const keys = Array.from(this.messageContexts.keys());
//   for (let i = 0; i < 50; i++) {
//     const key = keys[i];
//     if (key) {  // ← ДОБАВЬТЕ ЭТУ ПРОВЕРКУ
//       this.messageContexts.delete(key);
//     }
//   }
// }

//       const message = `
// 📨 <b>НОВОЕ СООБЩЕНИЕ ОТ КЛИЕНТА</b>

// ${network}
// 🌐 Домен: <code>${domain}</code>
// 👤 Адрес: <code>${userAddress}</code>

// 💬 Сообщение:
// ${messageText.substring(0, 500)}${messageText.length > 500 ? '...' : ''}
//       `.trim();

//       // Добавляем инлайн кнопки с коротким callback_data
//       const inlineKeyboard = [
//         [
//           {
//             text: '↩️ Ответить',
//             callback_data: `reply_${messageId}`
//           }
//         ]
//       ];

//       await this.bot!.sendMessage(this.ownerId, message, {
//         parse_mode: 'HTML',
//         reply_markup: { inline_keyboard: inlineKeyboard }
//       });

//       console.log(`✅ Уведомление о сообщении отправлено в Telegram (${isTestnet ? 'testnet' : 'mainnet'})`);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке уведомления в Telegram:', error);
//     }
//   }

//   async sendNewChatNotification(domain: string, userAddress: string, isTestnet: boolean = true): Promise<void> {
//     if (!this.isBotAvailable()) {
//       console.warn('⚠️ Telegram не настроен. Пропускаем отправку уведомления.');
//       return;
//     }

//     try {
//       const network = this.formatNetwork(isTestnet);
      
//       // Генерируем короткий уникальный ID для этого чата
//       const chatIdHash = this.generateMessageId(domain, userAddress);
      
//       // Сохраняем полные данные по этому ID
//       this.messageContexts.set(`chat_${chatIdHash}`, { 
//         domain, 
//         userAddress,
//         isTestnet
//       });

//       const message = `
// 🔔 <b>НОВЫЙ ЧАТ!</b>

// ${network}
// 🌐 Домен: <code>${domain}</code>
// 👤 Адрес: <code>${userAddress}</code>

// ⏰ Время создания: ${new Date().toLocaleString('ru-RU')}
//       `.trim();

//       // Добавляем инлайн кнопки с коротким callback_data
//       const inlineKeyboard = [
//         [
//           {
//             text: '↩️ Ответить',
//             callback_data: `reply_${chatIdHash}`
//           }
//         ]
//       ];

//       await this.bot!.sendMessage(this.ownerId, message, {
//         parse_mode: 'HTML',
//         reply_markup: { inline_keyboard: inlineKeyboard }
//       });

//       console.log(`✅ Уведомление о новом чате отправлено в Telegram (${isTestnet ? 'testnet' : 'mainnet'})`);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке уведомления в Telegram:', error);
//     }
//   }

//   // ========== МЕТОДЫ УВЕДОМЛЕНИЙ ДЛЯ ГРУППЫ ==========

//   private async sendGroupNotification(message: string, inlineKeyboard?: any): Promise<boolean> {
//     if (!this.isGroupAvailable()) {
//       console.warn('⚠️ Telegram группа не настроена. Пропускаем отправку уведомления.');
//       return false;
//     }
    
//     try {
//       const options: any = {
//         parse_mode: 'HTML'
//       };
      
//       if (inlineKeyboard) {
//         options.reply_markup = { inline_keyboard: inlineKeyboard };
//       }
      
//       await this.bot!.sendMessage(this.groupId, message, options);
//       console.log('✅ Уведомление отправлено в группу');
//       return true;
//     } catch (error: any) {
//       console.error('❌ Ошибка при отправке уведомления в группу:', error);
//       return false;
//     }
//   }

//   // Отправка уведомления о создании Proxy зоны (в группу)
//   async sendPublicProxyZoneCreatedNotification(name: string, address: string, owner: string, price: number, isTestnet: boolean = true): Promise<boolean> {

//     // if (!this.isBotAvailable()) {
//     //   console.warn('⚠️ Telegram не настроен. Пропускаем отправку уведомления.');
//     //   return;
//     // }

//     try {
//       const network = this.formatNetwork(isTestnet);
//       const message = `
// 🌐 <b>НОВАЯ PROXY ЗОНА СОЗДАНА!</b>

// ${network}
// 🏷️ Название: *.<code>${name}</code>
// 📍 Адрес домена: <code>${address}</code>
// 👤 Владелец: <code>${owner}</code>
// 💰 Цена: ${price} TON
// 🛡️ Тип: Proxy (для продажи)
// ⏰ Время создания: ${new Date().toLocaleString('ru-RU')}

// 💡 Теперь можно создавать субдомены в этой Proxy-зоне!
//       `.trim();

//       // Генерируем ссылку для мини-апп
//     const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(name, '');

//     console.log(`Сгенерирована ссылка для перехода в miniapp для proxy-зоны: ${miniAppLink}`);

//       // Кнопка "Создать субдомен"
//       const inlineKeyboard = [
//         [
//           {
//             text: '🔗 Создать субдомен',
//             url: miniAppLink
//           }
//         ]
//       ];

//       // await this.bot!.sendMessage(this.ownerId, message, {
//       //   parse_mode: 'HTML',
//       //   reply_markup: { inline_keyboard: inlineKeyboard }
//       // });

//       return await this.sendGroupNotification(message, inlineKeyboard);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке публичного уведомления о Proxy зоне:', error);
//       return false;
//     }
//   }

//   // Отправка уведомления о развертывании Bundle
// //   async sendBundleDeployedNotification(domain: string, address: string, bundleAddress: string, isTestnet: boolean = true): Promise<void> {

// //     if (!this.isBotAvailable()) {
// //       console.warn('⚠️ Telegram не настроен. Пропускаем отправку уведомления.');
// //       return;
// //     }

// //     try {
// //       const network = this.formatNetwork(isTestnet);
// //       const message = `
// // 🌐 <b>НОВАЯ PROXY ЗОНА СОЗДАНА!</b>

// // ${network}
// // 🌐 Название: *.<code>${domain}</code>
// // 👤 Владелец: <code>${address}</code>
// // 📍 Адрес коллекции: <code>${bundleAddress}</code>
// // 🛡️ Тип: Proxy (для продажи)

// // ⏰ Время создания: ${new Date().toLocaleString('ru-RU')}
// // 💡 Теперь можно создавать субдомены в этой Proxy-зоне!
// //       `.trim();

// //         // Генерируем ссылку для мини-апп
// //     const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(domain, '');

// //     console.log(`Сгенерирована ссылка для перехода в miniapp для proxy-зоны: ${miniAppLink}`);

// //       // Кнопка "Создать субдомен"
// //       const inlineKeyboard = [
// //         [
// //           {
// //             text: '🔗 Создать субдомен',
// //             url: miniAppLink
// //           }
// //         ]
// //       ];

// //       await this.bot!.sendMessage(this.ownerId, message, {
// //         parse_mode: 'HTML',
// //         reply_markup: { inline_keyboard: inlineKeyboard }
// //       });

// //       console.log(`✅ Уведомление о новой ставке отправлено в Telegram (${isTestnet ? 'testnet' : 'mainnet'})`);

// //       await this.sendPublicBundleDeployedNotification(domain,address,bundleAddress,isTestnet);
      
// //     } catch (error) {
// //       console.error('❌ Ошибка при отправке уведомления о Bundle:', error);
// //     }
// //   }

//   // Отправка уведомления о развертывании Bundle
//   async sendPublicBundleDeployedNotification(domain: string, address: string, bundleAddress: string, isTestnet: boolean = true): Promise<boolean> {

//     try {
//       const network = this.formatNetwork(isTestnet);
//       const message = `
// 📦 <b>Создание PROXY-зоны завершено!</b>

// ${network}
// 🌐 Домен: <code>${domain}</code>
// 👤 Владелец: <code>${address}</code>
// 📍 Адрес коллекции: <code>${bundleAddress}</code>

// ⏰ Время развертывания: ${new Date().toLocaleString('ru-RU')}
// 💡 Теперь можно создавать субдомены в этой Proxy-зоне!
//       `.trim();

//         // Генерируем ссылку для мини-апп
//     const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(domain, '');

//     console.log(`Сгенерирована ссылка для перехода в miniapp для proxy-зоны: ${miniAppLink}`);

//       // Кнопка "Создать субдомен"
//       const inlineKeyboard = [
//         [
//           {
//             text: '🔗 Создать субдомен',
//             url: miniAppLink
//           }
//         ]
//       ];

//       return await this.sendGroupNotification(message,inlineKeyboard);
      
//     } catch (error) {
//       console.error('❌ Ошибка при отправке уведомления о Bundle:', error);
//        return false;
//     }
//   }

//   // Отправка уведомления о создании SBT зона (в группу)
//   async sendPublicSBTZoneCreatedNotification(name: string, address: string, owner: string, price: number, bundleAddress: string, currentID: number, isTestnet: boolean = true): Promise<boolean> {
//     try {
//        const network = this.formatNetwork(isTestnet);
//       const subdomainName = this.formatDomainForUrl(name)[0];
//       const zoneName = this.formatDomainForUrl(name)[1];
//       const message = `
// 🔒 <b>НОВАЯ SBT ЗОНА СОЗДАНА!</b>

// ${network}
// 🏷️ Название: <code>${name}</code>
// 📍 Адрес домена: <code>${address}</code>
// 👤 Владелец: <code>${owner}</code>
// 💰 Цена: ${price} TON
// 🎫 Тип: SBT (не для продажи)
// 📦 Адрес коллекции: <code>${bundleAddress}</code>

// Это <code>${currentID + 1}</code> по счету зона на этом домене.
//       `.trim();

//      // Генерируем ссылку для мини-апп
//     const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(zoneName as string,subdomainName as string);

//     console.log(`Сгенерирована ссылка для перехода в miniapp для аукциона на proxy-субдомен: ${miniAppLink}`);

//       // Кнопка "Сделать ставку" с динамической ссылкой
//       const inlineKeyboard = [
//         [
//           {
//             text: '💰 Сделать ставку',
//             url: miniAppLink
//           }
//         ]
//       ];

//       return await this.sendGroupNotification(message, inlineKeyboard);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке публичного уведомления о SBT зоне:', error);
//       return false;
//     }
//   }

//   //смена статуса sbt-зоны на inactive
//   async sendZoneStatusChangedNotification(name: string, address: string, status: string, isTestnet: boolean = true): Promise<void> {
//     if (!this.isBotAvailable()) {
//       console.warn('⚠️ Telegram не настроен. Пропускаем отправку уведомления.');
//       return;
//     }

//     try {
//       const network = this.formatNetwork(isTestnet);
//       const message = `
// 🔒 <b>SBT ЗОНА ПРЕКРАТИЛА АКТИВНОСТЬ!</b>

// ${network}
// 🏷️ Название: <code>${name}</code>
// 📍 Адрес: <code>${address}</code>
// 🎫 Статус изменён на: <code>${status}</code>

// ⏰ Время завершения работы: ${new Date().toLocaleString('ru-RU')}
//       `.trim();

//       await this.bot!.sendMessage(this.ownerId, message, {
//         parse_mode: 'HTML'
//       });

//       console.log(`✅ Уведомление о SBT зоне отправлено в Telegram (${isTestnet ? 'testnet' : 'mainnet'})`);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке уведомления о SBT зоне:', error);
//     }
//   }

//   // Отправка уведомления о старте аукциона (в группу)
//   async sendPublicAuctionStartedNotification(domain: string, address: string, price: number, isTestnet: boolean = true): Promise<boolean> {
//     try {
//       const network = this.formatNetwork(isTestnet);
//       const subdomainName = this.formatDomainForUrl(domain)[0];
//       const zoneName = this.formatDomainForUrl(domain)[1];
//       const message = `
// ⚡ <b>НОВЫЙ АУКЦИОН!</b>

// ${network}
// 🌐 Домен: <code>${domain}</code>
// 👤 Адресс: <code>${address}</code>
// 💰 Стартовая цена: ${price} TON
// 🎯 Тип: Proxy аукцион

// ⏰ Время старта: ${new Date().toLocaleString('ru-RU')}
// ⏰ Завершится через: 59 минут

// 🎯 Успейте сделать ставку!
//       `.trim();

//        // Генерируем ссылку для мини-апп
//     const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(zoneName as string,subdomainName as string);

//     console.log(`Сгенерирована ссылка для перехода в miniapp для аукциона на proxy-субдомен: ${miniAppLink}`);

//       // Кнопка "Сделать ставку" с динамической ссылкой
//       const inlineKeyboard = [
//         [
//           {
//             text: '💰 Сделать ставку',
//             url: miniAppLink
//           }
//         ]
//       ];

//       return await this.sendGroupNotification(message, inlineKeyboard);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке публичного уведомления об аукционе:', error);
//       return false;
//     }
//   }

//   // Отправка уведомления о новой ставке (в группу)
//   async sendPublicNewBidNotification(domain: string, bidder: string, amount: number, previousBidder: string, isTestnet: boolean = true): Promise<boolean> {
//     try {
//       const network = this.formatNetwork(isTestnet);
//       const subdomainName = this.formatDomainForUrl(domain)[0];
//       const zoneName = this.formatDomainForUrl(domain)[1];
//       const previousBidderInfo = previousBidder ? `\n👤 Предыдущий ставщик: <code>${previousBidder}</code>` : '';

//       const message = `
// 💰 <b>НОВАЯ СТАВКА НА АУКЦИОНЕ!</b>

// ${network}
// 🌐 Домен: <code>${domain}</code>
// 👤 Ставщик: <code>${bidder}</code>
// 💵 Сумма: ${amount} TON${previousBidderInfo}
// 🎯 Тип: Proxy аукцион

// ⏰ Время ставки: ${new Date().toLocaleString('ru-RU')}
//       `.trim();

//       // Генерируем ссылку для мини-апп
//     const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(zoneName as string,subdomainName as string);

//     console.log(`Сгенерирована ссылка для перехода в miniapp для аукциона на proxy-субдомен: ${miniAppLink}`);

//       // Кнопка "Сделать ставку" с динамической ссылкой
//       const inlineKeyboard = [
//         [
//           {
//             text: '💰 Сделать ставку',
//             url: miniAppLink
//           }
//         ]
//       ];

//       return await this.sendGroupNotification(message, inlineKeyboard);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке публичного уведомления о ставке:', error);
//       return false;
//     }
//   }

//   // Отправка уведомления о минте SBT субдомена (в группу)
//   async sendPublicSBTSubdomainMintedNotification(domain: string, address: string, owner: string, price: number, isTestnet: boolean = true): Promise<boolean> {
//     try {
//       const network = this.formatNetwork(isTestnet);
//       const message = `
// 🎫 <b>НОВЫЙ SBT СУБДОМЕН СМИНЧЕН!</b>

// ${network}
// 🌐 Домен: <code>${domain}</code>
// 📍 Адрес: <code>${address}</code>
// 👤 Владелец: <code>${owner}</code>
// 💰 Цена: ${price} TON
// 🔒 Тип: SBT (не для продажи)
// ⏰ Время минта: ${new Date().toLocaleString('ru-RU')}

// 🎊 Поздравляем нового владельца!
//       `.trim();

//       return await this.sendGroupNotification(message);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке публичного уведомления о SBT субдомене:', error);
//       return false;
//     }
//   }

//   // Отправка уведомления о завершении аукциона (в группу)
//   async sendPublicAuctionEndedNotification(domain: string, winner: string, finalPrice: number, isTestnet: boolean = true): Promise<boolean> {
//     try {
//       const network = this.formatNetwork(isTestnet);
//       const message = `
// 🎉 <b>АУКЦИОН ЗАВЕРШЕН!</b>

// ${network}
// 🌐 Домен: <code>${domain}</code>
// 👑 Победитель: <code>${winner}</code>
// 🏆 Финальная цена: ${finalPrice} TON

// ⏰ Время завершения: ${new Date().toLocaleString('ru-RU')}

// Поздравляем победителя! 🎊
//       `.trim();

//         // Генерируем ссылку для мини-апп
//     const miniAppLink = DeeplinkUtils.generateMarketLink();

//     console.log(`Сгенерирована ссылка для перехода в miniapp для аукциона на proxy-субдомен: ${miniAppLink}`);

//       // Кнопка "Сделать ставку" с динамической ссылкой
//       const inlineKeyboard = [
//         [
//           {
//             text: '💰 Посмотреть в маркете',
//             url: miniAppLink
//           }
//         ]
//       ];

//       return await this.sendGroupNotification(message, inlineKeyboard);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке публичного уведомления о завершении аукциона:', error);
//       return false;
//     }
//   }

//   // Отправка уведомления о новом пользователе (в группу)
//   async sendPublicNewUserNotification(address: string, isTestnet: boolean = true): Promise<boolean> {
//     try {
//       const network = this.formatNetwork(isTestnet);
//       const message = `
// 👤 <b>НОВЫЙ ПОЛЬЗОВАТЕЛЬ ЗАРЕГИСТРИРОВАН!</b>

// ${network}
// 📍 Адрес: <code>${address}</code>

// ⏰ Время регистрации: ${new Date().toLocaleString('ru-RU')}
//       `.trim();

//       return await this.sendGroupNotification(message);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке публичного уведомления о пользователе:', error);
//       return false;
//     }
//   }

//   // ========== СОВМЕСТИМОСТЬ СО СТАРЫМИ МЕТОДАМИ ==========

//   // Отправка уведомления о создании Proxy зоны (для владельца + группа)
//   async sendProxyZoneCreatedNotification(name: string, address: string, owner: string, price: number, isTestnet: boolean = true): Promise<void> {
//     if (!this.isBotAvailable()) {
//       console.warn('⚠️ Telegram не настроен. Пропускаем отправку уведомления.');
//       return;
//     }

//     try {
//       const network = this.formatNetwork(isTestnet);
//       const message = `
// 🌐 <b>НОВАЯ PROXY ЗОНА СОЗДАНА!</b>

// ${network}
// 🏷️ Название: <code>${name}</code>
// 📍 Адрес: <code>${address}</code>
// 👤 Владелец: <code>${owner}</code>
// 💰 Цена: ${price} TON
// 🛡️ Тип: Proxy (для продажи)


// ⏰ Время создания: ${new Date().toLocaleString('ru-RU')}

// 💡 Теперь можно создавать субдомены в этой Proxy-зоне!
//       `.trim();

//       // Генерируем ссылку для мини-апп
//     const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(name, '');

//     console.log(`Сгенерирована ссылка для перехода в miniapp для proxy-зоны: ${miniAppLink}`);

//       // Кнопка "Создать субдомен"
//       const inlineKeyboard = [
//         [
//           {
//             text: '🔗 Создать субдомен',
//             url: miniAppLink
//           }
//         ]
//       ];

//       await this.bot!.sendMessage(this.ownerId, message, {
//         parse_mode: 'HTML',
//         reply_markup: { inline_keyboard: inlineKeyboard }
//       });
      
//       // Также отправляем в группу
//       await this.sendPublicProxyZoneCreatedNotification(name, address, owner, price, isTestnet);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке уведомления о Proxy зоне:', error);
//     }
//   }

//   // Отправка уведомления о создании SBT зоны (для владельца + группа)
//   async sendSBTZoneCreatedNotification(name: string, address: string, owner: string, price: number, bundleAddress: string, currentID: number, isTestnet: boolean = true): Promise<void> {
//     if (!this.isBotAvailable()) {
//       console.warn('⚠️ Telegram не настроен. Пропускаем отправку уведомления.');
//       return;
//     }

//     try {
//        const network = this.formatNetwork(isTestnet);
//       const subdomainName = this.formatDomainForUrl(name)[0];
//       const zoneName = this.formatDomainForUrl(name)[1];
//       const message = `
// 🔒 <b>НОВАЯ SBT ЗОНА СОЗДАНА!</b>

// ${network}
// 🏷️ Название: <code>${name}</code>
// 📍 Адрес домена: <code>${address}</code>
// 👤 Владелец: <code>${owner}</code>
// 💰 Цена: ${price} TON
// 🎫 Тип: SBT (не для продажи)
// 📦 Адрес коллекции: <code>${bundleAddress}</code>

// Это <code>${currentID + 1}</code> по счету зона на этом домене.

// ⏰ Время создания: ${new Date().toLocaleString('ru-RU')}
//       `.trim();

      

//       // Кнопка "Создать субдомен"
//       const inlineKeyboard = [
//         [
//           {
//             text: '🔗 Создать субдомен',
//             url: 'https://subdom.zone/#/add-subdomain'
//           }
//         ]
//       ];

//       await this.bot!.sendMessage(this.ownerId, message, {
//         parse_mode: 'HTML',
//         reply_markup: { inline_keyboard: inlineKeyboard }
//       });

//       console.log(`✅ Уведомление о SBT зоне отправлено в Telegram (${isTestnet ? 'testnet' : 'mainnet'})`);
      
//       // Также отправляем в группу
//       await this.sendPublicSBTZoneCreatedNotification(name, address, owner, price, bundleAddress, currentID, isTestnet);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке уведомления о SBT зоне:', error);
//     }
//   }

//   // Отправка уведомления о старте аукциона (для владельца + группа)
//   async sendAuctionStartedNotification(domain: string, address: string, price: number, isTestnet: boolean = true): Promise<void> {
//     if (!this.isBotAvailable()) {
//       console.warn('⚠️ Telegram не настроен. Пропускаем отправку уведомления.');
//       return;
//     }

//     try {
//      const network = this.formatNetwork(isTestnet);
//       const subdomainName = this.formatDomainForUrl(domain)[0];
//       const zoneName = this.formatDomainForUrl(domain)[1];
//       const message = `
// ⚡ <b>НОВЫЙ АУКЦИОН!</b>

// ${network}
// 🌐 Домен: <code>${domain}</code>
// 👤 Владелец: <code>${address}</code>
// 💰 Стартовая цена: ${price} TON
// 🎯 Тип: Proxy аукцион

// ⏰ Время старта: ${new Date().toLocaleString('ru-RU')}
// ⏰ Завершится через: 59 минут

// 🎯 Успейте сделать ставку!
//       `.trim();

//        // Генерируем ссылку для мини-апп
//     const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(zoneName as string,subdomainName as string);

//       // Кнопка "Сделать ставку" с динамической ссылкой
//       const inlineKeyboard = [
//         [
//           {
//             text: '💰 Сделать ставку',
//             url: miniAppLink,
//           }
//         ]
//       ];

//       await this.bot!.sendMessage(this.ownerId, message, {
//         parse_mode: 'HTML',
//         reply_markup: { inline_keyboard: inlineKeyboard }
//       });

//       console.log(`✅ Уведомление о старте аукциона отправлено в Telegram (${isTestnet ? 'testnet' : 'mainnet'})`);
      
//       // Также отправляем в группу
//       await this.sendPublicAuctionStartedNotification(domain, address, price, isTestnet);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке уведомления о старте аукциона:', error);
//     }
//   }

//   // Отправка уведомления о новой ставке (для владельца + группа)
//   async sendNewBidNotification(domain: string, bidder: string, amount: number, previousBidder: string, isTestnet: boolean = true): Promise<void> {
//     if (!this.isBotAvailable()) {
//       console.warn('⚠️ Telegram не настроен. Пропускаем отправку уведомления.');
//       return;
//     }

//     try {
//       const network = this.formatNetwork(isTestnet);
//       const subdomainName = this.formatDomainForUrl(domain)[0];
//       const zoneName = this.formatDomainForUrl(domain)[1];
//       const previousBidderInfo = previousBidder ? `\n👤 Предыдущий ставщик: <code>${previousBidder}</code>` : '';

//       const message = `
// 💰 <b>НОВАЯ СТАВКА НА АУКЦИОНЕ!</b>

// ${network}
// 🌐 Домен: <code>${domain}</code>
// 👤 Ставщик: <code>${bidder}</code>
// 💵 Сумма: ${amount} TON${previousBidderInfo}

// ⏰ Время ставки: ${new Date().toLocaleString('ru-RU')}
//       `.trim();

//           // Генерируем ссылку для мини-апп
//     const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(zoneName as string,subdomainName as string);

//     console.log(`Сгенерирована ссылка для перехода в miniapp для аукциона на proxy-субдомен: ${miniAppLink}`);

//       // Кнопка "Сделать ставку" с динамической ссылкой
//       const inlineKeyboard = [
//         [
//           {
//             text: '💰 Сделать ставку',
//             url: miniAppLink
//           }
//         ]
//       ];

//       await this.bot!.sendMessage(this.ownerId, message, {
//         parse_mode: 'HTML',
//         reply_markup: { inline_keyboard: inlineKeyboard }
//       });

//       console.log(`✅ Уведомление о новой ставке отправлено в Telegram (${isTestnet ? 'testnet' : 'mainnet'})`);
      
//       // Также отправляем в группу
//       await this.sendPublicNewBidNotification(domain, bidder, amount, previousBidder, isTestnet);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке уведомления о ставке:', error);
//     }
//   }

//   // Отправка уведомления о минте SBT субдомена (для владельца + группа)
//   async sendSBTSubdomainMintedNotification(domain: string, address: string, owner: string, price: number, isTestnet: boolean = true): Promise<void> {
//     if (!this.isBotAvailable()) {
//       console.warn('⚠️ Telegram не настроен. Пропускаем отправку уведомления.');
//       return;
//     }

//     try {
//       const network = this.formatNetwork(isTestnet);
//       const message = `
// 🎫 <b>НОВЫЙ SBT СУБДОМЕН СМИНЧЕН!</b>

// ${network}
// 🌐 Домен: <code>${domain}</code>
// 📍 Адрес: <code>${address}</code>
// 👤 Владелец: <code>${owner}</code>
// 💰 Цена: ${price} TON

// ⏰ Время минта: ${new Date().toLocaleString('ru-RU')}
//       `.trim();

//       await this.bot!.sendMessage(this.ownerId, message, {
//         parse_mode: 'HTML'
//       });

//       console.log(`✅ Уведомление о SBT субдомене отправлено в Telegram (${isTestnet ? 'testnet' : 'mainnet'})`);
      
//       // Также отправляем в группу
//       await this.sendPublicSBTSubdomainMintedNotification(domain, address, owner, price, isTestnet);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке уведомления о SBT субдомене:', error);
//     }
//   }

//   // Отправка уведомления о завершении аукциона (для владельца + группа)
//   async sendAuctionEndedNotification(domain: string, winner: string, finalPrice: number, isTestnet: boolean = true): Promise<void> {
//     if (!this.isBotAvailable()) {
//       console.warn('⚠️ Telegram не настроен. Пропускаем отправку уведомления.');
//       return;
//     }

//     try {
//       const network = this.formatNetwork(isTestnet);
//       const message = `
// 🎉 <b>АУКЦИОН ЗАВЕРШЕН!</b>

// ${network}
// 🌐 Домен: <code>${domain}</code>
// 👑 Победитель: <code>${winner}</code>
// 🏆 Финальная цена: ${finalPrice} TON

// ⏰ Время завершения: ${new Date().toLocaleString('ru-RU')}
//       `.trim();

//         const miniAppLink = DeeplinkUtils.generateMarketLink();

//     console.log(`Сгенерирована ссылка для перехода в miniapp для аукциона на proxy-субдомен: ${miniAppLink}`);

//       // Кнопка "Сделать ставку" с динамической ссылкой
//       const inlineKeyboard = [
//         [
//           {
//             text: '💰 Посмотреть в маркете',
//             url: miniAppLink
//           }
//         ]
//       ];

//       await this.bot!.sendMessage(this.ownerId, message, {
//         parse_mode: 'HTML',
//         reply_markup: { inline_keyboard: inlineKeyboard }
//       });

//       console.log(`✅ Уведомление о завершении аукциона отправлено в Telegram (${isTestnet ? 'testnet' : 'mainnet'})`);
      
//       // Также отправляем в группу
//       await this.sendPublicAuctionEndedNotification(domain, winner, finalPrice, isTestnet);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке уведомления о завершении аукциона:', error);
//     }
//   }

//   // Отправка уведомления о новом пользователе (для владельца + группа)
//   async sendNewUserNotification(address: string, isTestnet: boolean = true): Promise<void> {
//     if (!this.isBotAvailable()) {
//       console.warn('⚠️ Telegram не настроен. Пропускаем отправку уведомления.');
//       return;
//     }

//     try {
//       const network = this.formatNetwork(isTestnet);
//       const message = `
// 👤 <b>НОВЫЙ ПОЛЬЗОВАТЕЛЬ ЗАРЕГИСТРИРОВАН!</b>

// ${network}
// 📍 Адрес: <code>${address}</code>

// ⏰ Время регистрации: ${new Date().toLocaleString('ru-RU')}
//       `.trim();

//       await this.bot!.sendMessage(this.ownerId, message, {
//         parse_mode: 'HTML'
//       });

//       console.log(`✅ Уведомление о новом пользователе отправлено в Telegram (${isTestnet ? 'testnet' : 'mainnet'})`);
      
//       // Также отправляем в группу
//       await this.sendPublicNewUserNotification(address, isTestnet);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке уведомления о пользователе:', error);
//     }
//   }

//   // ========== МЕТОДЫ ДЛЯ РАБОТЫ С ЧАТАМИ ==========

//   // Получение истории чата из базы данных
//   getChatHistory(domain: string, userAddress: string, isTestnet: boolean = true): any[] {
//     try {
//       const db = this.getDatabase(isTestnet);
      
//       // Находим чат
//       const chat = db.prepare('SELECT * FROM chats WHERE domain = ? AND userAddress = ?').get(domain, userAddress) as any;
      
//       if (!chat) {
//         return [];
//       }
      
//       // Получаем все сообщения чата
//       const messages = db.prepare('SELECT * FROM messages WHERE chatId = ? ORDER BY timestamp ASC').all(chat.id) as any[];
      
//       return messages;
//     } catch (error) {
//       console.error('❌ Ошибка при получении истории чата:', error);
//       return [];
//     }
//   }

//   // Сохранение сообщения пользователя в базу данных
//   saveUserMessage(domain: string, userAddress: string, messageText: string, isTestnet: boolean = true): boolean {
//     try {
//       const db = this.getDatabase(isTestnet);
      
//       // Находим или создаем чат
//       let chat = db.prepare('SELECT * FROM chats WHERE domain = ? AND userAddress = ?').get(domain, userAddress) as any;
      
//       if (!chat) {
//         const stmt = db.prepare(`
//           INSERT INTO chats (domain, userAddress) 
//           VALUES (?, ?)
//           RETURNING *
//         `);
        
//         chat = stmt.get(domain, userAddress);
//       }
      
//       // Добавляем сообщение пользователя
//       const messageId = Math.random().toString(36).substring(2, 15);
//       db.prepare('INSERT INTO messages (id, chatId, sender, text) VALUES (?, ?, ?, ?)')
//         .run(messageId, chat.id, 'user', messageText);
      
//       // Обновляем время чата
//       db.prepare('UPDATE chats SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?')
//         .run(chat.id);

//       console.log(`✅ Сообщение пользователя сохранено в БД для чата ${domain} (${isTestnet ? 'testnet' : 'mainnet'})`);
//       return true;
//     } catch (error) {
//       console.error('❌ Ошибка при сохранении сообщения пользователя в БД:', error);
//       return false;
//     }
//   }

//   // Получение списка активных чатов
//   getActiveChats(isTestnet: boolean = true): any[] {
//     try {
//       const db = this.getDatabase(isTestnet);
      
//       const chats = db.prepare(`
//         SELECT c.*, 
//                (SELECT COUNT(*) FROM messages m WHERE m.chatId = c.id) as messageCount,
//                (SELECT MAX(timestamp) FROM messages m WHERE m.chatId = c.id) as lastMessageTime
//         FROM chats c
//         WHERE c.status = 'active'
//         ORDER BY c.updatedAt DESC
//       `).all() as any[];
      
//       return chats;
//     } catch (error) {
//       console.error('❌ Ошибка при получении активных чатов:', error);
//       return [];
//     }
//   }

//   // Закрытие чата
//   closeChat(domain: string, userAddress: string, isTestnet: boolean = true): boolean {
//     try {
//       const db = this.getDatabase(isTestnet);
      
//       const result = db.prepare('UPDATE chats SET status = "closed", updatedAt = CURRENT_TIMESTAMP WHERE domain = ? AND userAddress = ?')
//         .run(domain, userAddress);
      
//       if (result.changes > 0) {
//         console.log(`✅ Чат ${domain} - ${userAddress} закрыт (${isTestnet ? 'testnet' : 'mainnet'})`);
//         return true;
//       }
      
//       return false;
//     } catch (error) {
//       console.error('❌ Ошибка при закрытии чата:', error);
//       return false;
//     }
//   }

//   // Добавьте эти методы в класс TelegramBotService в файле tgBot-sqlite.ts

// // ========== УВЕДОМЛЕНИЯ О ПЛАТЕЖАХ ==========

// /**
//  * Отправка уведомления о добавлении оплаченной попытки (для владельца)
//  */
// async sendPaymentRecordedNotification(
//   address: string, 
//   zoneType: string, 
//   length: number, 
//   isTestnet: boolean = true
// ): Promise<void> {
//   if (!this.isBotAvailable()) {
//     console.warn('⚠️ Telegram не настроен. Пропускаем отправку уведомления.');
//     return;
//   }

//   try {
//     const network = this.formatNetwork(isTestnet);
//     const zoneTypeText = zoneType === 'proxy' ? 'Proxy' : 'SBT';
//     const formattedLength = length === 9 ? '9+' : String(length);
    
//     const message = `
// 💰 <b>ОПЛАЧЕННАЯ ПОПЫТКА ДОБАВЛЕНА!</b>

// ${network}
// 👤 Адрес: <code>${address}</code>
// 🏷️ Тип зоны: ${zoneTypeText}
// 📏 Длина: ${formattedLength} символов

// ⏰ Время: ${new Date().toLocaleString('ru-RU')}

// 💡 Пользователь оплатил создание ${zoneTypeText.toLowerCase()}-зоны длиной ${formattedLength} символов.
// Теперь он может создать зону без повторной оплаты.
//     `.trim();

//     await this.bot!.sendMessage(this.ownerId, message, {
//       parse_mode: 'HTML'
//     });

//     console.log(`✅ Уведомление об оплаченной попытке отправлено владельцу (${isTestnet ? 'testnet' : 'mainnet'})`);
    
//     // Также отправляем в группу
//     await this.sendPublicPaymentRecordedNotification(address, zoneType, length, isTestnet);
//   } catch (error) {
//     console.error('❌ Ошибка при отправке уведомления об оплаченной попытке:', error);
//   }
// }

// /**
//  * Отправка публичного уведомления о добавлении оплаченной попытки (в группу)
//  */
// async sendPublicPaymentRecordedNotification(
//   address: string, 
//   zoneType: string, 
//   length: number, 
//   isTestnet: boolean = true
// ): Promise<boolean> {
//   try {
//     const network = this.formatNetwork(isTestnet);
//     const zoneTypeText = zoneType === 'proxy' ? 'Proxy' : 'SBT';
//     const formattedLength = length === 9 ? '9+' : String(length);
    
//     const message = `
// 💰 <b>НОВАЯ ОПЛАЧЕННАЯ ПОПЫТКА!</b>

// ${network}
// 👤 Адрес: <code>${address}</code>
// 🏷️ Тип зоны: ${zoneTypeText}
// 📏 Длина: ${formattedLength} символов

// ⏰ Время: ${new Date().toLocaleString('ru-RU')}

// 🎯 Пользователь оплатил создание ${zoneTypeText.toLowerCase()}-зоны!
//     `.trim();

//     return await this.sendGroupNotification(message);
//   } catch (error) {
//     console.error('❌ Ошибка при отправке публичного уведомления об оплаченной попытке:', error);
//     return false;
//   }
// }

// /**
//  * Отправка уведомления о списании оплаченной попытки (для владельца)
//  */
// async sendPaymentConsumedNotification(
//   address: string, 
//   zoneType: string, 
//   length: number, 
//   isTestnet: boolean = true
// ): Promise<void> {
//   if (!this.isBotAvailable()) {
//     console.warn('⚠️ Telegram не настроен. Пропускаем отправку уведомления.');
//     return;
//   }

//   try {
//     const network = this.formatNetwork(isTestnet);
//     const zoneTypeText = zoneType === 'proxy' ? 'Proxy' : 'SBT';
//     const formattedLength = length === 9 ? '9+' : String(length);
    
//     const message = `
// 💸 <b>ОПЛАЧЕННАЯ ПОПЫТКА ИСПОЛЬЗОВАНА!</b>

// ${network}
// 👤 Адрес: <code>${address}</code>
// 🏷️ Тип зоны: ${zoneTypeText}
// 📏 Длина: ${formattedLength} символов

// ⏰ Время: ${new Date().toLocaleString('ru-RU')}

// ✅ Пользователь использовал оплаченную попытку для создания ${zoneTypeText.toLowerCase()}-зоны.
//     `.trim();

//     await this.bot!.sendMessage(this.ownerId, message, {
//       parse_mode: 'HTML'
//     });

//     console.log(`✅ Уведомление об использовании оплаченной попытки отправлено владельцу (${isTestnet ? 'testnet' : 'mainnet'})`);
    
//     // Также отправляем в группу
//     await this.sendPublicPaymentConsumedNotification(address, zoneType, length, isTestnet);
//   } catch (error) {
//     console.error('❌ Ошибка при отправке уведомления об использовании оплаченной попытки:', error);
//   }
// }

// /**
//  * Отправка публичного уведомления о списании оплаченной попытки (в группу)
//  */
// async sendPublicPaymentConsumedNotification(
//   address: string, 
//   zoneType: string, 
//   length: number, 
//   isTestnet: boolean = true
// ): Promise<boolean> {
//   try {
//     const network = this.formatNetwork(isTestnet);
//     const zoneTypeText = zoneType === 'proxy' ? 'Proxy' : 'SBT';
    
//     const message = `
// 💸 <b>ОПЛАЧЕННАЯ ПОПЫТКА ИСПОЛЬЗОВАНА!</b>

// ${network}
// 👤 Адрес: <code>${address}</code>
// 🏷️ Тип зоны: ${zoneTypeText}
// 📏 Длина: ${length} символов

// ⏰ Время: ${new Date().toLocaleString('ru-RU')}

// ✅ Пользователь создал ${zoneTypeText.toLowerCase()}-зону используя оплаченную попытку!
//     `.trim();

//     return await this.sendGroupNotification(message);
//   } catch (error) {
//     console.error('❌ Ошибка при отправке публичного уведомления об использовании оплаченной попытки:', error);
//     return false;
//   }
// }

// /**
//  * Отправка уведомления об ошибке оплаты (для владельца)
//  */
// async sendPaymentErrorNotification(
//   address: string, 
//   zoneType: string, 
//   length: number, 
//   errorMessage: string,
//   isTestnet: boolean = true
// ): Promise<void> {
//   if (!this.isBotAvailable()) {
//     console.warn('⚠️ Telegram не настроен. Пропускаем отправку уведомления.');
//     return;
//   }

//   try {
//     const network = this.formatNetwork(isTestnet);
//     const zoneTypeText = zoneType === 'proxy' ? 'Proxy' : 'SBT';
    
//     const message = `
// ❌ <b>ОШИБКА ПРИ ОПЛАТЕ ПОПЫТКИ!</b>

// ${network}
// 👤 Адрес: <code>${address}</code>
// 🏷️ Тип зоны: ${zoneTypeText}
// 📏 Длина: ${length} символов

// ⚠️ Ошибка: ${errorMessage}

// ⏰ Время: ${new Date().toLocaleString('ru-RU')}
//     `.trim();

//     await this.bot!.sendMessage(this.ownerId, message, {
//       parse_mode: 'HTML'
//     });

//     console.log(`✅ Уведомление об ошибке оплаты отправлено владельцу (${isTestnet ? 'testnet' : 'mainnet'})`);
//   } catch (error) {
//     console.error('❌ Ошибка при отправке уведомления об ошибке оплаты:', error);
//   }
// }


//   // ========== МЕТОДЫ ДЛЯ СТАТИСТИКИ ==========

//   // Получение статистики чатов
//   getChatStats(isTestnet: boolean = true): any {
//     try {
//       const db = this.getDatabase(isTestnet);
      
//       const stats = db.prepare(`
//         SELECT 
//           COUNT(*) as totalChats,
//           SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeChats,
//           SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closedChats,
//           (SELECT COUNT(*) FROM messages) as totalMessages,
//           (SELECT COUNT(*) FROM messages WHERE sender = 'user') as userMessages,
//           (SELECT COUNT(*) FROM messages WHERE sender = 'operator') as operatorMessages
//         FROM chats
//       `).get() as any;
      
//       return stats;
//     } catch (error) {
//       console.error('❌ Ошибка при получении статистики чатов:', error);
//       return {
//         totalChats: 0,
//         activeChats: 0,
//         closedChats: 0,
//         totalMessages: 0,
//         userMessages: 0,
//         operatorMessages: 0
//       };
//     }
//   }

//   // ========== ЗАКРЫТИЕ РЕСУРСОВ ==========

//   // stop(): void {
//   //   if (this.bot) {
//   //     this.bot.stopPolling();
//   //     console.log('🛑 Telegram Bot остановлен');
//   //   }
    
//   //   // Закрываем соединения с базами данных
//   //   this.testnetDb.close();
//   //   this.mainnetDb.close();
//   //   console.log('🔒 Соединения с базами данных закрыты');
//   // }
// }

// // Создаем и экспортируем экземпляр бота
// const telegramBotService = new TelegramBotService();
// export default telegramBotService;

// utils/tgBot-sqlite.ts
// import TelegramBot from 'node-telegram-bot-api';
// import dotenv from 'dotenv';
// import Database from 'better-sqlite3';

// // Загружаем переменные окружения
// dotenv.config();

// // Интерфейсы для типизации
// interface TelegramMessage {
//   chat: {
//     id: number;
//     type?: string;
//   };
//   text?: string;
//   reply_to_message?: {
//     from?: {
//       id: number;
//     };
//     message_id?: number;
//     text?: string;
//   };
// }

// interface TelegramCallbackQuery {
//   id: string;
//   data?: string;
//   message?: {
//     chat: {
//       id: number;
//     };
//     message_id: number;
//   };
// }

// interface MessageContext {
//   domain: string;
//   userAddress: string;
//   isTestnet: boolean;
// }

// interface BotSubscription {
//   id: number;
//   chatId: string;
//   chatType: string;
//   subscriptionType: string;
//   isActive: number;
// }

// declare module 'node-telegram-bot-api' {
//   interface TelegramBot {
//     getMe(): Promise<{ id: number; username: string }>;
//   }
// }

// const API_PAYLOAD_URL = process.env.VITE_API_SC_PAYLOAD_URL || 'https://api.subdom.zone';

// // ==================== DEEPLINK UTILS ====================

// class DeeplinkUtils {
//   private static readonly BOT_USERNAME = 'subdom';

//   static generateTelegramDeeplink(route: string, params: Record<string, string> = {}): string {
//     let startappParam = route.replace(/^\/+/, '');

//     if (Object.keys(params).length > 0) {
//       const paramString = Object.entries(params)
//         .filter(([_, value]) => value)
//         .map(([key, value]) => `${key}_${value}`)
//         .join('_');

//       if (paramString) {
//         startappParam = `${startappParam}_${paramString}`;
//       }
//     }

//     const encodedParam = encodeURIComponent(startappParam);
//     return `https://t.me/${this.BOT_USERNAME}?startapp=${encodedParam}`;
//   }

//   static generateAddSubdomainLink(zoneName: string, subdomainName?: string): string {
//     const params: Record<string, string> = { zone: zoneName };
//     if (subdomainName) {
//       params.subdomain = subdomainName;
//     }
//     return this.generateTelegramDeeplink('/add-subdomain', params);
//   }

//   static generateMarketLink(): string {
//     return this.generateTelegramDeeplink('/market');
//   }

//   static generateAuctionLink(zoneName: string, subdomainName: string): string {
//     return this.generateTelegramDeeplink('/add-subdomain', {
//       zone: zoneName,
//       subdomain: subdomainName
//     });
//   }

//   static generateHomeLink(): string {
//     return this.generateTelegramDeeplink('/');
//   }

//   static parseStartappParam(startappParam: string): { route: string; params: Record<string, string> } {
//     const parts = startappParam.split('_');

//     if (parts.length === 0) {
//       return { route: '/', params: {} };
//     }

//     const firstPart = parts[0]!;
//     const route = firstPart.startsWith('/') ? firstPart : `/${firstPart}`;
//     const params: Record<string, string> = {};

//     for (let i = 1; i < parts.length; i += 2) {
//       if (i + 1 < parts.length) {
//         const key = parts[i];
//         const value = parts[i + 1];
//         if (key !== undefined && value !== undefined) {
//           params[key] = value;
//         }
//       }
//     }

//     return { route, params };
//   }

//   static formatDomainForUrl(domain: string): [string, string] {
//     if (!domain) return ['', ''];
//     const parts = domain.split('.');

//     if (parts.length >= 2) {
//       const subdomainName = parts[0] || '';
//       const zoneName = parts.slice(1).join('.') || '';
//       return [subdomainName, zoneName];
//     }

//     return ['', ''];
//   }

//   static generateLinkForNotification(type: 'bundle' | 'auction' | 'bid' | 'market', domain?: string): string {
//     switch (type) {
//       case 'bundle':
//         if (!domain) throw new Error('Domain is required for bundle notification');
//         const [_, zoneName] = this.formatDomainForUrl(domain);
//         if (!zoneName) throw new Error(`Invalid domain format: ${domain}`);
//         return this.generateAddSubdomainLink(zoneName);

//       case 'auction':
//       case 'bid':
//         if (!domain) throw new Error('Domain is required for auction/bid notification');
//         const [subdomainName, zoneName2] = this.formatDomainForUrl(domain);
//         if (!zoneName2 || !subdomainName) throw new Error(`Invalid domain format for auction: ${domain}`);
//         return this.generateAuctionLink(zoneName2, subdomainName);

//       case 'market':
//         return this.generateMarketLink();

//       default:
//         throw new Error(`Unknown notification type: ${type}`);
//     }
//   }
// }

// // ==================== TELEGRAM BOT SERVICE ====================

// class TelegramBotService {
//   private bot: TelegramBot | null = null;
//   private ownerId: string = process.env.TELEGRAM_OWNER_ID || '';
//   private groupId: string = process.env.TELEGRAM_GROUP_ID || '';
//   private replyContext = new Map<number, MessageContext>();
//   private messageContexts = new Map<string, MessageContext>();
//   private replyContextTimeouts = new Map<number, NodeJS.Timeout>();

//   private testnetDb: Database.Database;
//   private mainnetDb: Database.Database;
//   private commonDb: Database.Database; // общая БД для подписок

//   constructor() {
//     console.log('🔧 Инициализация Telegram Bot...');
//     console.log('📝 TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? '✅ Установлен' : '❌ Отсутствует');
//     console.log('👤 TELEGRAM_OWNER_ID:', process.env.TELEGRAM_OWNER_ID ? '✅ Установлен' : '❌ Отсутствует');
//     console.log('👥 TELEGRAM_GROUP_ID:', process.env.TELEGRAM_GROUP_ID ? '✅ Установлен' : '❌ Отсутствует');

//     this.testnetDb = new Database('nft-domains.db');
//     this.mainnetDb = new Database('nft-domains-mainnet.db');
//     this.commonDb = new Database('nft-domains.db'); // используем testnet-БД для общих данных

//     this.testnetDb.pragma('journal_mode = WAL');
//     this.mainnetDb.pragma('journal_mode = WAL');
//     this.commonDb.pragma('journal_mode = WAL');

//     this.initializeChatTables();
//     this.initializeSubscriptionTable();
//     this.loadSubscriptions();
//     this.initializeBot();
//   }

//   // ==================== ТАБЛИЦА ПОДПИСОК ====================

//   private initializeSubscriptionTable(): void {
//     this.commonDb.exec(`
//       CREATE TABLE IF NOT EXISTS bot_subscriptions (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         chatId TEXT NOT NULL,
//         chatType TEXT NOT NULL DEFAULT 'private',
//         subscriptionType TEXT NOT NULL,
//         isActive INTEGER DEFAULT 1,
//         createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
//         UNIQUE(chatId, subscriptionType)
//       );
//     `);
//     console.log('✅ Таблица bot_subscriptions инициализирована');
//   }

//   private loadSubscriptions(): void {
//     const subs = this.commonDb.prepare(
//       'SELECT * FROM bot_subscriptions WHERE isActive = 1'
//     ).all() as BotSubscription[];

//     for (const s of subs) {
//       if (s.subscriptionType === 'owner') {
//         this.ownerId = s.chatId;
//         console.log(`📋 Загружена owner-подписка: ${s.chatId}`);
//       }
//       if (s.subscriptionType === 'public') {
//         this.groupId = s.chatId;
//         console.log(`📋 Загружена public-подписка: ${s.chatId}`);
//       }
//     }
//     console.log(`📋 Загружено ${subs.length} активных подписок`);
//   }

//   private addSubscription(chatId: string, chatType: string, subType: string): void {
//     this.commonDb.prepare(`
//       INSERT OR REPLACE INTO bot_subscriptions (chatId, chatType, subscriptionType, isActive)
//       VALUES (?, ?, ?, 1)
//     `).run(chatId, chatType, subType);

//     if (subType === 'owner') this.ownerId = chatId;
//     if (subType === 'public') this.groupId = chatId;

//     console.log(`✅ Добавлена подписка: ${chatId} (${subType})`);
//   }

//   private removeSubscription(chatId: string): void {
//     this.commonDb.prepare(
//       'UPDATE bot_subscriptions SET isActive = 0 WHERE chatId = ?'
//     ).run(chatId);

//     if (chatId === this.ownerId) this.ownerId = '';
//     if (chatId === this.groupId) this.groupId = '';

//     console.log(`❌ Удалена подписка: ${chatId}`);
//   }

//   // ==================== ТАБЛИЦЫ ЧАТОВ ====================

//   private initializeChatTables(): void {
//     const initializeDb = (db: Database.Database, dbName: string) => {
//       console.log(`💾 Инициализация таблиц в БД: ${dbName}`);

//       const chatsTableExists = db.prepare(`
//         SELECT name FROM sqlite_master
//         WHERE type='table' AND name='chats'
//       `).get();

//       const messagesTableExists = db.prepare(`
//         SELECT name FROM sqlite_master
//         WHERE type='table' AND name='messages'
//       `).get();

//       if (!chatsTableExists) {
//         db.exec(`
//           CREATE TABLE IF NOT EXISTS chats (
//             id INTEGER PRIMARY KEY AUTOINCREMENT,
//             domain TEXT NOT NULL,
//             userAddress TEXT NOT NULL,
//             status TEXT DEFAULT 'active',
//             createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
//             updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
//             UNIQUE(domain, userAddress)
//           );
//         `);
//       }

//       if (!messagesTableExists) {
//         db.exec(`
//           CREATE TABLE IF NOT EXISTS messages (
//             id TEXT PRIMARY KEY,
//             chatId INTEGER NOT NULL,
//             sender TEXT NOT NULL,
//             text TEXT NOT NULL,
//             timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
//             FOREIGN KEY (chatId) REFERENCES chats(id)
//           );
//         `);
//       }
//     };

//     initializeDb(this.testnetDb, 'testnet');
//     initializeDb(this.mainnetDb, 'mainnet');
//   }

//   private getDatabase(isTestnet: boolean): Database.Database {
//     return isTestnet ? this.testnetDb : this.mainnetDb;
//   }

//   // ==================== ИНИЦИАЛИЗАЦИЯ БОТА ====================

//   private initializeBot(): void {
//     const token = process.env.TELEGRAM_BOT_TOKEN;

//     if (!token) {
//       console.warn('⚠️ TELEGRAM_BOT_TOKEN не установлен. Telegram бот отключен.');
//       return;
//     }

//     if (!this.ownerId) {
//       console.warn('⚠️ TELEGRAM_OWNER_ID не установлен. Уведомления не будут отправляться.');
//     }

//     try {
//       this.bot = new TelegramBot(token, { polling: true });
//       this.setupHandlers();
//       console.log('✅ Telegram Bot инициализирован и запущен');
//       this.sendTestNotification();
//     } catch (error) {
//       console.error('❌ Ошибка инициализации Telegram бота:', error);
//     }
//   }

//   private async sendTestNotification(): Promise<void> {
//     if (!this.isBotAvailable()) return;

//     try {
//       await this.bot!.sendMessage(
//         this.ownerId,
//         `🤖 <b>Бот поддержки Subdom (TON DNS Subdomains) запущен!</b>\n\nСтатус: <b>✅ Активен</b>\nВремя: ${new Date().toLocaleString('ru-RU')}\nБазы данных: ✅ Testnet, ✅ Mainnet`,
//         { parse_mode: 'HTML' }
//       );
//       console.log('✅ Тестовое уведомление отправлено');
//     } catch (error: unknown) {
//       if (error instanceof Error && 'response' in error) {
//         const axiosError = error as { response: { data: any; status: number } };
//         console.error(axiosError.response.data);
//       } else if (error instanceof Error) {
//         console.error(error.message);
//       } else {
//         console.error('Unknown error:', error);
//       }
//     }
//   }

//   // ==================== ОБРАБОТЧИКИ КОМАНД ====================

//   private setupHandlers(): void {
//     if (!this.bot) return;

//     this.bot.on('message', (msg: TelegramMessage) => {
//       console.log(`📨 [DEBUG] Сообщение получено: chatId=${msg.chat.id}, text=${msg.text?.substring(0, 50)}`);
//     });

//     // /start
//     this.bot.onText(/\/start/, (msg: TelegramMessage) => {
//       const chatId = msg.chat.id;
//       this.bot!.sendMessage(
//         chatId,
//         `🤖 <b>Бот поддержки Subdom (TON DNS Subdomains)</b>\n\nЭтот бот отправляет уведомления о:\n• Новых чатах\n• Сообщениях от пользователей\n• Новых зонах\n• Сминченных субдоменах\n• Новых пользователях\n• Аукционах\n• Ставках\n\nДоступные команды:\n/subscribe — подписаться на уведомления\n/unsubscribe — отписаться\n/status — статус системы`,
//         { parse_mode: 'HTML' }
//       );
//     });

//     // /subscribe
//     this.bot.onText(/\/subscribe/, (msg: TelegramMessage) => {
//       const chatId = msg.chat.id.toString();
//       const chatType = msg.chat.type || 'private';
//       const subType = chatId === this.ownerId ? 'owner' : 'public';
//       this.addSubscription(chatId, chatType, subType);
//       this.bot!.sendMessage(msg.chat.id, `✅ Вы подписаны на уведомления (${subType})`);
//     });

//     // /unsubscribe
//     this.bot.onText(/\/unsubscribe/, (msg: TelegramMessage) => {
//       this.removeSubscription(msg.chat.id.toString());
//       this.bot!.sendMessage(msg.chat.id, '❌ Вы отписались от уведомлений');
//     });

//     // /status
//     this.bot.onText(/\/status/, (msg: TelegramMessage) => {
//       const chatId = msg.chat.id;
//       const subs = this.commonDb.prepare(
//         'SELECT * FROM bot_subscriptions WHERE isActive = 1'
//       ).all() as BotSubscription[];
//       const subsList = subs.map(s => `• ${s.chatId} (${s.subscriptionType})`).join('\n');

//       this.bot!.sendMessage(
//         chatId,
//         `📊 <b>Статус системы</b>\n\nБот: <b>✅ Активен</b>\nВладелец: <code>${this.ownerId || 'не установлен'}</code>\nЧат ID: <code>${chatId}</code>\n\n<b>Активные подписки:</b>\n${subsList || 'нет'}\n\nВремя: ${new Date().toLocaleString('ru-RU')}`,
//         { parse_mode: 'HTML' }
//       );
//     });

//     // /network
//     this.bot.onText(/\/network/, (msg: TelegramMessage) => {
//       this.bot!.sendMessage(
//         msg.chat.id,
//         `🌐 <b>Информация о сетях</b>\n\nБот поддерживает уведомления для:\n• <b>Testnet</b> (тестовая сеть)\n• <b>Mainnet</b> (основная сеть)\n\nВсе уведомления содержат информацию о сети.`,
//         { parse_mode: 'HTML' }
//       );
//     });

//     // Callback query
//     this.bot.on('callback_query', async (callbackQuery: TelegramCallbackQuery) => {
//       try {
//         const data = callbackQuery.data;
//         const chatId = callbackQuery.message?.chat.id;
//         const messageId = callbackQuery.message?.message_id;

//         if (!data || !chatId || !messageId) return;

//         if (data.startsWith('reply_')) {
//           await this.handleReplyCallback(callbackQuery);
//         }

//         await this.bot!.answerCallbackQuery(callbackQuery.id);
//       } catch (error) {
//         console.error('❌ Ошибка при обработке callback:', error);
//       }
//     });

//     // Обработчик текстовых сообщений (ответы техподдержки)
//     this.bot.on('message', async (msg: any) => {
//       try {
//         const context = this.replyContext.get(msg.chat.id);

//         if (context && msg.text) {
//           await this.handleSupportReply(msg);
//         } else if (msg.reply_to_message && msg.text) {
//           await this.handleSupportReply(msg);
//         } else {
//           if (msg.chat.id.toString() === this.ownerId && msg.text && !msg.text.startsWith('/')) {
//             if (this.bot) {
//               await this.bot.sendMessage(msg.chat.id,
//                 'ℹ️ Чтобы ответить клиенту, сначала нажмите кнопку "Ответить" под уведомлением о сообщении.'
//               );
//             }
//           }
//         }
//       } catch (error) {
//         console.error('❌ Ошибка при обработке сообщения:', error);
//       }
//     });

//     this.bot.on('polling_error', (error: Error) => {
//       if (error.message.includes('ESOCKETTIMEDOUT') || error.message.includes('ETIMEDOUT')) {
//         return;
//       }
//       console.error('❌ Ошибка Telegram polling:', error);
//     });
//   }

//   // ==================== REPLY CALLBACK ====================

//   private async handleReplyCallback(callbackQuery: TelegramCallbackQuery): Promise<void> {
//     try {
//       const data = callbackQuery.data;
//       const chatId = callbackQuery.message?.chat.id;
//       const messageId = callbackQuery.message?.message_id;

//       if (!data || !chatId || !messageId) return;

//       if (data.startsWith('reply_')) {
//         await this.handleReplyCallbackData(data, chatId, messageId);
//       }

//       if (this.bot) {
//         await this.bot.answerCallbackQuery(callbackQuery.id);
//       }
//     } catch (error) {
//       console.error('❌ Ошибка при обработке callback:', error);
//     }
//   }

//   private async handleReplyCallbackData(data: string, chatId: number, messageId: number): Promise<void> {
//     const parts = data.split('_');
//     if (parts.length !== 2 || parts[0] !== 'reply') return;

//     const contextId = parts[1];
//     if (!contextId) return;

//     const context = this.messageContexts.get(contextId);

//     if (!context) {
//       if (this.bot) {
//         await this.bot.sendMessage(chatId, '❌ Контекст сообщения устарел или не найден.', { parse_mode: 'HTML' });
//       }
//       return;
//     }

//     const { domain, userAddress, isTestnet } = context;

//     this.replyContext.set(chatId, { domain, userAddress, isTestnet });

//     if (this.replyContextTimeouts.has(chatId)) {
//       clearTimeout(this.replyContextTimeouts.get(chatId)!);
//     }

//     const timeout = setTimeout(() => {
//       this.replyContext.delete(chatId);
//       this.replyContextTimeouts.delete(chatId);
//       if (this.bot) {
//         this.bot.sendMessage(chatId, '⏰ Контекст ответа истек. Чтобы ответить клиенту, нажмите кнопку "Ответить" заново.');
//       }
//     }, 10 * 60 * 1000);

//     this.replyContextTimeouts.set(chatId, timeout);

//     const instruction = `
// ✍️ <b>ОТВЕТИТЬ КЛИЕНТУ</b>

// 🌐 Домен: <code>${domain}</code>
// 👤 Адрес: <code>${userAddress}</code>
// 🌐 Сеть: ${isTestnet ? 'Testnet' : 'Mainnet'}

// 📝 <b>Напишите ответ ниже этим сообщением:</b>
// (Просто ответьте на это сообщение текстом)
//     `.trim();

//     if (this.bot) {
//       await this.bot.sendMessage(chatId, instruction, {
//         parse_mode: 'HTML',
//         reply_to_message_id: messageId
//       });
//     }
//   }

//   // ==================== SUPPORT REPLY ====================

//   private async handleSupportReply(msg: any): Promise<void> {
//     try {
//       const chatId = msg.chat.id;
//       const replyText = msg.text;

//       if (!replyText) return;

//       const context = this.replyContext.get(chatId);
//       if (!context) {
//         if (this.bot) {
//           await this.bot.sendMessage(chatId,
//             '❌ Контекст ответа не найден. Используйте кнопку "Ответить" под уведомлением о сообщении.'
//           );
//         }
//         return;
//       }

//       const { domain, userAddress, isTestnet } = context;

//       const success = await this.saveOperatorReplyToDatabase(domain, userAddress, replyText, isTestnet);

//       if (success) {
//         if (this.bot) {
//           await this.bot.sendMessage(chatId, `
// ✅ <b>ОТВЕТ ОТПРАВЛЕН КЛИЕНТУ И СОХРАНЕН В БАЗУ</b>

// 🌐 Домен: <code>${domain}</code>
// 👤 Адрес: <code>${userAddress}</code>
// 🌐 Сеть: ${isTestnet ? 'Testnet' : 'Mainnet'}

// 💬 Ваш ответ:
// ${replyText}

// ⏰ Сохранено: ${new Date().toLocaleString('ru-RU')}
//           `.trim(), { parse_mode: 'HTML' });
//         }

//         this.replyContext.delete(chatId);
//         if (this.replyContextTimeouts.has(chatId)) {
//           clearTimeout(this.replyContextTimeouts.get(chatId)!);
//           this.replyContextTimeouts.delete(chatId);
//         }
//       } else {
//         if (this.bot) {
//           await this.bot.sendMessage(chatId, '❌ Ошибка при сохранении ответа в базу данных');
//         }
//       }

//     } catch (error) {
//       console.error('❌ Ошибка при обработке ответа техподдержки:', error);
//       if (this.bot && msg.chat.id) {
//         await this.bot.sendMessage(msg.chat.id, '❌ Произошла ошибка при обработке ответа');
//       }
//     }
//   }

//   private async saveOperatorReplyToDatabase(
//     domain: string,
//     userAddress: string,
//     replyText: string,
//     isTestnet: boolean
//   ): Promise<boolean> {
//     try {
//       const db = this.getDatabase(isTestnet);

//       let chat = db.prepare('SELECT * FROM chats WHERE domain = ? AND userAddress = ?').get(domain, userAddress) as any;

//       if (!chat) {
//         const stmt = db.prepare(`INSERT INTO chats (domain, userAddress) VALUES (?, ?) RETURNING *`);
//         chat = stmt.get(domain, userAddress);
//       }

//       const messageId = Math.random().toString(36).substring(2, 15);
//       db.prepare('INSERT INTO messages (id, chatId, sender, text) VALUES (?, ?, ?, ?)')
//         .run(messageId, chat.id, 'operator', replyText);

//       db.prepare('UPDATE chats SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(chat.id);

//       return true;
//     } catch (error) {
//       console.error('❌ Ошибка при сохранении ответа оператора в БД:', error);
//       return false;
//     }
//   }

//   // ==================== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ====================

//   private generateMessageId(domain: string, userAddress: string): string {
//     const combined = `${domain}_${userAddress}`;
//     let hash = 0;
//     for (let i = 0; i < combined.length; i++) {
//       hash = ((hash << 5) - hash) + combined.charCodeAt(i);
//       hash = hash & hash;
//     }
//     return Math.abs(hash).toString(36).substring(0, 8);
//   }

//   private isBotAvailable(): boolean {
//     return !!(this.bot && this.ownerId);
//   }

//   private isGroupAvailable(): boolean {
//     return !!(this.bot && this.groupId);
//   }

//   private formatNetwork(isTestnet: boolean): string {
//     return isTestnet ? '🔬 <b>Сеть:</b> Testnet' : '🌐 <b>Сеть:</b> Mainnet';
//   }

//   private getTonviewerBaseUrl(isTestnet: boolean): string {
//     return isTestnet ? 'https://testnet.tonviewer.com' : 'https://tonviewer.com';
//   }

//   /**
//    * Форматирует адрес как HTML-ссылку на tonviewer.
//    */
//   private formatAddressLink(address: string, isTestnet: boolean): string {
//     if (!address) return '<code>неизвестно</code>';
//     const baseUrl = this.getTonviewerBaseUrl(isTestnet);
//     const short = `${address.slice(0, 6)}...${address.slice(-4)}`;
//     return `<a href="${baseUrl}/${address}">${short}</a>`;
//   }

//   private formatDomainForUrl(domain: string): string[] {
//     if (!domain) return [];
//     return domain.split('.');
//   }

//   /**
//    * Определяет URL картинки для уведомления.
//    *
//    * Логика:
//    * - proxy зона:       ${API}/api/v1/proxy/metadata/ton/${zoneName}.png
//    * - SBT зона:         ${API}/api/v1/sbt-subdomain/metadata/ton/${zoneName}.png
//    * - proxy субдомен:   ${API}/api/v1/subdomain/metadata/ton/${zoneName}/${subName}.png
//    * - SBT субдомен:     ${API}/api/v1/sbt-subdomain/metadata/ton/${zoneName}/${subName}.png
//    */
//   private getNotificationImageUrl(
//     name: string,
//     proxy: number,
//     isZone: boolean
//   ): string | null {
//     const parts = name.split('.');
//     if (parts.length < 2) return null;

//     if (isZone) {
//       // Зона
//       const zoneName = name; // "passports.ton"
//       if (proxy === 1) {
//         return `${API_PAYLOAD_URL}/api/v1/proxy/metadata/ton/${zoneName}.png`;
//       } else {
//         return `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${zoneName}.png`;
//       }
//     } else {
//       // Субдомен
//       const subName = parts[0];       // "test"
//       const zoneName = parts.slice(1).join('.'); // "passports.ton"
//       if (proxy === 1) {
//         return `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${zoneName}/${subName}.png`;
//       } else {
//         return `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${zoneName}/${subName}.png`;
//       }
//     }
//   }

//   /**
//    * Отправляет фото с подписью в чат. При ошибке — fallback на текст.
//    */
//   private async sendPhotoWithCaption(
//     chatId: string,
//     photoUrl: string,
//     caption: string,
//     inlineKeyboard?: any
//   ): Promise<void> {
//     if (!this.bot) return;

//     try {
//       await this.bot.sendPhoto(chatId, photoUrl, {
//         caption,
//         parse_mode: 'HTML',
//         ...(inlineKeyboard ? { reply_markup: { inline_keyboard: inlineKeyboard } } : {})
//       });
//     } catch (e) {
//       console.warn('⚠️ Не удалось отправить фото, fallback на текст:', (e as Error).message);
//       try {
//         await this.bot.sendMessage(chatId, caption, {
//           parse_mode: 'HTML',
//           ...(inlineKeyboard ? { reply_markup: { inline_keyboard: inlineKeyboard } } : {})
//         });
//       } catch (e2) {
//         console.error('❌ Не удалось отправить даже текст:', (e2 as Error).message);
//       }
//     }
//   }

//   // ==================== ГРУППОВАЯ РАССЫЛКА ====================

//   /**
//    * Отправляет уведомление всем активным public-подписчикам.
//    * При наличии photoUrl — отправляет фото с подписью, иначе — текст.
//    */
//   private async sendGroupNotification(
//     message: string,
//     inlineKeyboard?: any,
//     photoUrl?: string
//   ): Promise<boolean> {
//     const subs = this.commonDb.prepare(
//       "SELECT chatId FROM bot_subscriptions WHERE subscriptionType = 'public' AND isActive = 1"
//     ).all() as { chatId: string }[];

//     if (subs.length === 0) {
//       console.warn('⚠️ Нет активных public-подписчиков');
//       return false;
//     }

//     let sent = false;
//     for (const sub of subs) {
//       try {
//         if (photoUrl && this.bot) {
//           await this.sendPhotoWithCaption(sub.chatId, photoUrl, message, inlineKeyboard);
//         } else if (this.bot) {
//           await this.bot.sendMessage(sub.chatId, message, {
//             parse_mode: 'HTML',
//             ...(inlineKeyboard ? { reply_markup: { inline_keyboard: inlineKeyboard } } : {})
//           });
//         }
//         sent = true;
//       } catch (e) {
//         console.error(`❌ Не удалось отправить в чат ${sub.chatId}:`, (e as Error).message);
//       }
//     }
//     return sent;
//   }

//   // ==================== УВЕДОМЛЕНИЯ ВЛАДЕЛЬЦУ ====================

//   async sendNewMessageNotification(domain: string, userAddress: string, messageText: string, isTestnet: boolean = true): Promise<void> {
//     if (!this.isBotAvailable()) return;

//     try {
//       const network = this.formatNetwork(isTestnet);
//       const messageId = this.generateMessageId(domain, userAddress);

//       this.messageContexts.set(messageId, { domain, userAddress, isTestnet });

//       if (this.messageContexts.size > 100) {
//         const keys = Array.from(this.messageContexts.keys());
//         for (let i = 0; i < 50; i++) {
//           const key = keys[i];
//           if (key) this.messageContexts.delete(key);
//         }
//       }

//       const message = `
// 📨 <b>НОВОЕ СООБЩЕНИЕ ОТ КЛИЕНТА</b>

// ${network}
// 🌐 Домен: <code>${domain}</code>
// 👤 Адрес: ${this.formatAddressLink(userAddress, isTestnet)}

// 💬 Сообщение:
// ${messageText.substring(0, 500)}${messageText.length > 500 ? '...' : ''}
//       `.trim();

//       const inlineKeyboard = [[{ text: '↩️ Ответить', callback_data: `reply_${messageId}` }]];

//       await this.bot!.sendMessage(this.ownerId, message, {
//         parse_mode: 'HTML',
//         reply_markup: { inline_keyboard: inlineKeyboard }
//       });
//     } catch (error) {
//       console.error('❌ Ошибка при отправке уведомления в Telegram:', error);
//     }
//   }

//   async sendNewChatNotification(domain: string, userAddress: string, isTestnet: boolean = true): Promise<void> {
//     if (!this.isBotAvailable()) return;

//     try {
//       const network = this.formatNetwork(isTestnet);
//       const chatIdHash = this.generateMessageId(domain, userAddress);
//       this.messageContexts.set(`chat_${chatIdHash}`, { domain, userAddress, isTestnet });

//       const message = `
// 🔔 <b>НОВЫЙ ЧАТ!</b>

// ${network}
// 🌐 Домен: <code>${domain}</code>
// 👤 Адрес: ${this.formatAddressLink(userAddress, isTestnet)}

// ⏰ Время создания: ${new Date().toLocaleString('ru-RU')}
//       `.trim();

//       const inlineKeyboard = [[{ text: '↩️ Ответить', callback_data: `reply_${chatIdHash}` }]];

//       await this.bot!.sendMessage(this.ownerId, message, {
//         parse_mode: 'HTML',
//         reply_markup: { inline_keyboard: inlineKeyboard }
//       });
//     } catch (error) {
//       console.error('❌ Ошибка при отправке уведомления в Telegram:', error);
//     }
//   }

//   // ==================== УВЕДОМЛЕНИЯ ВЛАДЕЛЬЦУ О ЗОНАХ ====================

//   async sendProxyZoneCreatedNotification(name: string, address: string, owner: string, price: number, isTestnet: boolean = true): Promise<void> {
//     if (!this.isBotAvailable()) return;

//     try {
//       const network = this.formatNetwork(isTestnet);
//       const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(name, '');

//       const message = `
// 🌐 <b>НОВАЯ PROXY ЗОНА СОЗДАНА!</b>

// ${network}
// 🏷️ Название: <code>${name}</code>
// 📍 Адрес домена: ${this.formatAddressLink(address, isTestnet)}
// 👤 Владелец: ${this.formatAddressLink(owner, isTestnet)}
// 💰 Цена: ${price} TON
// 🛡️ Тип: Proxy (для продажи)

// ⏰ Время создания: ${new Date().toLocaleString('ru-RU')}
// 💡 Теперь можно создавать субдомены в этой Proxy-зоне!
//       `.trim();

//       const inlineKeyboard = [[{ text: '🔗 Создать субдомен', url: miniAppLink }]];

//       await this.bot!.sendMessage(this.ownerId, message, {
//         parse_mode: 'HTML',
//         reply_markup: { inline_keyboard: inlineKeyboard }
//       });

//       // Также отправляем в группу
//       await this.sendPublicProxyZoneCreatedNotification(name, address, owner, price, isTestnet);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке уведомления о Proxy зоне:', error);
//     }
//   }

//   async sendSBTZoneCreatedNotification(name: string, address: string, owner: string, price: number, bundleAddress: string, currentID: number, isTestnet: boolean = true): Promise<void> {
//     if (!this.isBotAvailable()) return;

//     try {
//       const network = this.formatNetwork(isTestnet);
//       const subdomainName = this.formatDomainForUrl(name)[0];
//       const zoneName = this.formatDomainForUrl(name)[1];

//       const message = `
// 🔒 <b>НОВАЯ SBT ЗОНА СОЗДАНА!</b>

// ${network}
// 🏷️ Название: <code>${name}</code>
// 📍 Адрес домена: ${this.formatAddressLink(address, isTestnet)}
// 👤 Владелец: ${this.formatAddressLink(owner, isTestnet)}
// 💰 Цена: ${price} TON
// 🎫 Тип: SBT (не для продажи)
// 📦 Адрес коллекции: ${this.formatAddressLink(bundleAddress, isTestnet)}

// Это <code>${currentID + 1}</code> по счету зона на этом домене.

// ⏰ Время создания: ${new Date().toLocaleString('ru-RU')}
//       `.trim();

//       const inlineKeyboard = [[{ text: '🔗 Создать субдомен', url: 'https://subdom.zone/#/add-subdomain' }]];

//       await this.bot!.sendMessage(this.ownerId, message, {
//         parse_mode: 'HTML',
//         reply_markup: { inline_keyboard: inlineKeyboard }
//       });

//       // Также отправляем в группу
//       await this.sendPublicSBTZoneCreatedNotification(name, address, owner, price, bundleAddress, currentID, isTestnet);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке уведомления о SBT зоне:', error);
//     }
//   }

//   // ==================== ПУБЛИЧНЫЕ УВЕДОМЛЕНИЯ — PROXY ЗОНА ====================

//   async sendPublicProxyZoneCreatedNotification(name: string, address: string, owner: string, price: number, isTestnet: boolean = true): Promise<boolean> {
//     try {
//       const network = this.formatNetwork(isTestnet);
//       const photoUrl = this.getNotificationImageUrl(name, 1, true); // proxy=1, isZone=true

//       const message = `
// 🌐 <b>НОВАЯ PROXY ЗОНА СОЗДАНА!</b>

// ${network}
// 🏷️ Название: *.<code>${name}</code>
// 📍 Адрес домена: ${this.formatAddressLink(address, isTestnet)}
// 👤 Владелец: ${this.formatAddressLink(owner, isTestnet)}
// 💰 Цена: ${price} TON
// 🛡️ Тип: Proxy (для продажи)
// ⏰ Время создания: ${new Date().toLocaleString('ru-RU')}

// 💡 Теперь можно создавать субдомены в этой Proxy-зоне!
//       `.trim();

//       const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(name, '');
//       const inlineKeyboard = [[{ text: '🔗 Создать субдомен', url: miniAppLink }]];

//       return await this.sendGroupNotification(message, inlineKeyboard, photoUrl || undefined);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке публичного уведомления о Proxy зоне:', error);
//       return false;
//     }
//   }

//   // ==================== ПУБЛИЧНЫЕ УВЕДОМЛЕНИЯ — SBT ЗОНА ====================

//   async sendPublicSBTZoneCreatedNotification(name: string, address: string, owner: string, price: number, bundleAddress: string, currentID: number, isTestnet: boolean = true): Promise<boolean> {
//     try {
//       const network = this.formatNetwork(isTestnet);
//       const subdomainName = this.formatDomainForUrl(name)[0];
//       const zoneName = this.formatDomainForUrl(name)[1];
//       const photoUrl = this.getNotificationImageUrl(name, 0, true); // proxy=0, isZone=true

//       const message = `
// 🔒 <b>НОВАЯ SBT ЗОНА СОЗДАНА!</b>

// ${network}
// 🏷️ Название: <code>${name}</code>
// 📍 Адрес домена: ${this.formatAddressLink(address, isTestnet)}
// 👤 Владелец: ${this.formatAddressLink(owner, isTestnet)}
// 💰 Цена: ${price} TON
// 🎫 Тип: SBT (не для продажи)
// 📦 Адрес коллекции: ${this.formatAddressLink(bundleAddress, isTestnet)}

// Это <code>${currentID + 1}</code> по счету зона на этом домене.
//       `.trim();

//       const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(zoneName as string, subdomainName as string);
//       const inlineKeyboard = [[{ text: '💰 Сделать ставку', url: miniAppLink }]];

//       return await this.sendGroupNotification(message, inlineKeyboard, photoUrl || undefined);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке публичного уведомления о SBT зоне:', error);
//       return false;
//     }
//   }

//   // ==================== ПУБЛИЧНЫЕ УВЕДОМЛЕНИЯ — BUNDLE ====================

//   async sendPublicBundleDeployedNotification(domain: string, address: string, bundleAddress: string, isTestnet: boolean = true): Promise<boolean> {
//     try {
//       const network = this.formatNetwork(isTestnet);
//       const photoUrl = this.getNotificationImageUrl(domain, 1, true); // proxy=1, isZone=true

//       const message = `
// 📦 <b>Создание PROXY-зоны завершено!</b>

// ${network}
// 🌐 Домен: <code>${domain}</code>
// 👤 Владелец: ${this.formatAddressLink(address, isTestnet)}
// 📍 Адрес коллекции: ${this.formatAddressLink(bundleAddress, isTestnet)}

// ⏰ Время развертывания: ${new Date().toLocaleString('ru-RU')}
// 💡 Теперь можно создавать субдомены в этой Proxy-зоне!
//       `.trim();
//       const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(domain, '');
//       const inlineKeyboard = [[{ text: '🔗 Создать субдомен', url: miniAppLink }]];

//       return await this.sendGroupNotification(message, inlineKeyboard, photoUrl || undefined);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке уведомления о Bundle:', error);
//       return false;
//     }
//   }

//   // ==================== ПУБЛИЧНЫЕ УВЕДОМЛЕНИЯ — АУКЦИОН ====================

//   async sendPublicAuctionStartedNotification(domain: string, address: string, price: number, isTestnet: boolean = true): Promise<boolean> {
//     try {
//       const network = this.formatNetwork(isTestnet);
//       const subdomainName = this.formatDomainForUrl(domain)[0];
//       const zoneName = this.formatDomainForUrl(domain)[1];
//       const photoUrl = this.getNotificationImageUrl(domain, 1, false); // proxy=1, isZone=false (субдомен)

//       const message = `
// ⚡ <b>НОВЫЙ АУКЦИОН!</b>

// ${network}
// 🌐 Домен: <code>${domain}</code>
// 👤 Адрес: ${this.formatAddressLink(address, isTestnet)}
// 💰 Стартовая цена: ${price} TON
// 🎯 Тип: Proxy аукцион

// ⏰ Время старта: ${new Date().toLocaleString('ru-RU')}
// ⏰ Завершится через: 59 минут

// 🎯 Успейте сделать ставку!
//       `.trim();

//       const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(zoneName as string, subdomainName as string);
//       const inlineKeyboard = [[{ text: '💰 Сделать ставку', url: miniAppLink }]];

//       return await this.sendGroupNotification(message, inlineKeyboard, photoUrl || undefined);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке публичного уведомления об аукционе:', error);
//       return false;
//     }
//   }

//   // ==================== ПУБЛИЧНЫЕ УВЕДОМЛЕНИЯ — СТАВКА ====================

//   async sendPublicNewBidNotification(domain: string, bidder: string, amount: number, previousBidder: string, isTestnet: boolean = true): Promise<boolean> {
//     try {
//       const network = this.formatNetwork(isTestnet);
//       const subdomainName = this.formatDomainForUrl(domain)[0];
//       const zoneName = this.formatDomainForUrl(domain)[1];
//       const photoUrl = this.getNotificationImageUrl(domain, 1, false); // proxy=1, isZone=false

//       const previousBidderInfo = previousBidder ? `\n👤 Предыдущий ставщик: ${this.formatAddressLink(previousBidder, isTestnet)}` : '';

//       const message = `
// 💰 <b>НОВАЯ СТАВКА НА АУКЦИОНЕ!</b>

// ${network}
// 🌐 Домен: <code>${domain}</code>
// 👤 Ставщик: ${this.formatAddressLink(bidder, isTestnet)}
// 💵 Сумма: ${amount} TON${previousBidderInfo}
// 🎯 Тип: Proxy аукцион

// ⏰ Время ставки: ${new Date().toLocaleString('ru-RU')}
//       `.trim();

//       const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(zoneName as string, subdomainName as string);
//       const inlineKeyboard = [[{ text: '💰 Сделать ставку', url: miniAppLink }]];

//       return await this.sendGroupNotification(message, inlineKeyboard, photoUrl || undefined);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке публичного уведомления о ставке:', error);
//       return false;
//     }
//   }

//   // ==================== ПУБЛИЧНЫЕ УВЕДОМЛЕНИЯ — SBT СУБДОМЕН ====================

//   async sendPublicSBTSubdomainMintedNotification(domain: string, address: string, owner: string, price: number, isTestnet: boolean = true): Promise<boolean> {
//     try {
//       const network = this.formatNetwork(isTestnet);
//       const photoUrl = this.getNotificationImageUrl(domain, 0, false); // proxy=0, isZone=false

//       const message = `
// 🎫 <b>НОВЫЙ SBT СУБДОМЕН СМИНЧЕН!</b>

// ${network}
// 🌐 Домен: <code>${domain}</code>
// 📍 Адрес: ${this.formatAddressLink(address, isTestnet)}
// 👤 Владелец: ${this.formatAddressLink(owner, isTestnet)}
// 💰 Цена: ${price} TON
// 🔒 Тип: SBT (не для продажи)
// ⏰ Время минта: ${new Date().toLocaleString('ru-RU')}

// 🎊 Поздравляем нового владельца!
//       `.trim();

//       return await this.sendGroupNotification(message, undefined, photoUrl || undefined);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке публичного уведомления о SBT субдомене:', error);
//       return false;
//     }
//   }

//   // ==================== ПУБЛИЧНЫЕ УВЕДОМЛЕНИЯ — ЗАВЕРШЕНИЕ АУКЦИОНА ====================

//   async sendPublicAuctionEndedNotification(domain: string, winner: string, finalPrice: number, isTestnet: boolean = true): Promise<boolean> {
//     try {
//       const network = this.formatNetwork(isTestnet);

//       const message = `
// 🎉 <b>АУКЦИОН ЗАВЕРШЕН!</b>

// ${network}
// 🌐 Домен: <code>${domain}</code>
// 👑 Победитель: ${this.formatAddressLink(winner, isTestnet)}
// 🏆 Финальная цена: ${finalPrice} TON

// ⏰ Время завершения: ${new Date().toLocaleString('ru-RU')}

// Поздравляем победителя! 🎊
//       `.trim();

//       const miniAppLink = DeeplinkUtils.generateMarketLink();
//       const inlineKeyboard = [[{ text: '💰 Посмотреть в маркете', url: miniAppLink }]];

//       return await this.sendGroupNotification(message, inlineKeyboard);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке публичного уведомления о завершении аукциона:', error);
//       return false;
//     }
//   }

//   // ==================== ПУБЛИЧНЫЕ УВЕДОМЛЕНИЯ — НОВЫЙ ПОЛЬЗОВАТЕЛЬ ====================

//   async sendPublicNewUserNotification(address: string, isTestnet: boolean = true): Promise<boolean> {
//     try {
//       const network = this.formatNetwork(isTestnet);

//       const message = `
// 👤 <b>НОВЫЙ ПОЛЬЗОВАТЕЛЬ ЗАРЕГИСТРИРОВАН!</b>

// ${network}
// 📍 Адрес: ${this.formatAddressLink(address, isTestnet)}

// ⏰ Время регистрации: ${new Date().toLocaleString('ru-RU')}
//       `.trim();

//       return await this.sendGroupNotification(message);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке публичного уведомления о пользователе:', error);
//       return false;
//     }
//   }

//   // ==================== УВЕДОМЛЕНИЯ ВЛАДЕЛЬЦУ — АУКЦИОНЫ/СТАВКИ ====================

//   async sendAuctionStartedNotification(domain: string, address: string, price: number, isTestnet: boolean = true): Promise<void> {
//     if (!this.isBotAvailable()) return;

//     try {
//       const network = this.formatNetwork(isTestnet);
//       const subdomainName = this.formatDomainForUrl(domain)[0];
//       const zoneName = this.formatDomainForUrl(domain)[1];

//       const message = `
// ⚡ <b>НОВЫЙ АУКЦИОН!</b>

// ${network}
// 🌐 Домен: <code>${domain}</code>
// 👤 Владелец: ${this.formatAddressLink(address, isTestnet)}
// 💰 Стартовая цена: ${price} TON
// 🎯 Тип: Proxy аукцион

// ⏰ Время старта: ${new Date().toLocaleString('ru-RU')}
// ⏰ Завершится через: 59 минут

// 🎯 Успейте сделать ставку!
//       `.trim();

//       const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(zoneName as string, subdomainName as string);
//       const inlineKeyboard = [[{ text: '💰 Сделать ставку', url: miniAppLink }]];

//       await this.bot!.sendMessage(this.ownerId, message, {
//         parse_mode: 'HTML',
//         reply_markup: { inline_keyboard: inlineKeyboard }
//       });

//       await this.sendPublicAuctionStartedNotification(domain, address, price, isTestnet);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке уведомления о старте аукциона:', error);
//     }
//   }

//   async sendNewBidNotification(domain: string, bidder: string, amount: number, previousBidder: string, isTestnet: boolean = true): Promise<void> {
//     if (!this.isBotAvailable()) return;

//     try {
//       const network = this.formatNetwork(isTestnet);
//       const subdomainName = this.formatDomainForUrl(domain)[0];
//       const zoneName = this.formatDomainForUrl(domain)[1];
//       const previousBidderInfo = previousBidder ? `\n👤 Предыдущий ставщик: ${this.formatAddressLink(previousBidder, isTestnet)}` : '';

//       const message = `
// 💰 <b>НОВАЯ СТАВКА НА АУКЦИОНЕ!</b>

// ${network}
// 🌐 Домен: <code>${domain}</code>
// 👤 Ставщик: ${this.formatAddressLink(bidder, isTestnet)}
// 💵 Сумма: ${amount} TON${previousBidderInfo}

// ⏰ Время ставки: ${new Date().toLocaleString('ru-RU')}
//       `.trim();

//       const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(zoneName as string, subdomainName as string);
//       const inlineKeyboard = [[{ text: '💰 Сделать ставку', url: miniAppLink }]];

//       await this.bot!.sendMessage(this.ownerId, message, {
//         parse_mode: 'HTML',
//         reply_markup: { inline_keyboard: inlineKeyboard }
//       });

//       await this.sendPublicNewBidNotification(domain, bidder, amount, previousBidder, isTestnet);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке уведомления о ставке:', error);
//     }
//   }

//   async sendSBTSubdomainMintedNotification(domain: string, address: string, owner: string, price: number, isTestnet: boolean = true): Promise<void> {
//     if (!this.isBotAvailable()) return;

//     try {
//       const network = this.formatNetwork(isTestnet);

//       const message = `
// 🎫 <b>НОВЫЙ SBT СУБДОМЕН СМИНЧЕН!</b>

// ${network}
// 🌐 Домен: <code>${domain}</code>
// 📍 Адрес: ${this.formatAddressLink(address, isTestnet)}
// 👤 Владелец: ${this.formatAddressLink(owner, isTestnet)}
// 💰 Цена: ${price} TON

// ⏰ Время минта: ${new Date().toLocaleString('ru-RU')}
//       `.trim();

//       await this.bot!.sendMessage(this.ownerId, message, { parse_mode: 'HTML' });

//       await this.sendPublicSBTSubdomainMintedNotification(domain, address, owner, price, isTestnet);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке уведомления о SBT субдомене:', error);
//     }
//   }

//   async sendAuctionEndedNotification(domain: string, winner: string, finalPrice: number, isTestnet: boolean = true): Promise<void> {
//     if (!this.isBotAvailable()) return;

//     try {
//       const network = this.formatNetwork(isTestnet);

//       const message = `
// 🎉 <b>АУКЦИОН ЗАВЕРШЕН!</b>

// ${network}
// 🌐 Домен: <code>${domain}</code>
// 👑 Победитель: ${this.formatAddressLink(winner, isTestnet)}
// 🏆 Финальная цена: ${finalPrice} TON

// ⏰ Время завершения: ${new Date().toLocaleString('ru-RU')}
//       `.trim();

//       const miniAppLink = DeeplinkUtils.generateMarketLink();
//       const inlineKeyboard = [[{ text: '💰 Посмотреть в маркете', url: miniAppLink }]];

//       await this.bot!.sendMessage(this.ownerId, message, {
//         parse_mode: 'HTML',
//         reply_markup: { inline_keyboard: inlineKeyboard }
//       });

//       await this.sendPublicAuctionEndedNotification(domain, winner, finalPrice, isTestnet);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке уведомления о завершении аукциона:', error);
//     }
//   }

//   async sendNewUserNotification(address: string, isTestnet: boolean = true): Promise<void> {
//     if (!this.isBotAvailable()) return;

//     try {
//       const network = this.formatNetwork(isTestnet);

//       const message = `
// 👤 <b>НОВЫЙ ПОЛЬЗОВАТЕЛЬ ЗАРЕГИСТРИРОВАН!</b>

// ${network}
// 📍 Адрес: ${this.formatAddressLink(address, isTestnet)}

// ⏰ Время регистрации: ${new Date().toLocaleString('ru-RU')}
//       `.trim();

//       await this.bot!.sendMessage(this.ownerId, message, { parse_mode: 'HTML' });

//       await this.sendPublicNewUserNotification(address, isTestnet);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке уведомления о пользователе:', error);
//     }
//   }

//   async sendZoneStatusChangedNotification(name: string, address: string, status: string, isTestnet: boolean = true): Promise<void> {
//     if (!this.isBotAvailable()) return;

//     try {
//       const network = this.formatNetwork(isTestnet);

//       const message = `
// 🔒 <b>SBT ЗОНА ПРЕКРАТИЛА АКТИВНОСТЬ!</b>

// ${network}
// 🏷️ Название: <code>${name}</code>
// 📍 Адрес: ${this.formatAddressLink(address, isTestnet)}
// 🎫 Статус изменён на: <code>${status}</code>

// ⏰ Время завершения работы: ${new Date().toLocaleString('ru-RU')}
//       `.trim();

//       await this.bot!.sendMessage(this.ownerId, message, { parse_mode: 'HTML' });
//     } catch (error) {
//       console.error('❌ Ошибка при отправке уведомления о SBT зоне:', error);
//     }
//   }

//   // ==================== УВЕДОМЛЕНИЯ О ПЛАТЕЖАХ ====================

//   async sendPaymentRecordedNotification(address: string, zoneType: string, length: number, isTestnet: boolean = true): Promise<void> {
//     if (!this.isBotAvailable()) return;

//     try {
//       const network = this.formatNetwork(isTestnet);
//       const zoneTypeText = zoneType === 'proxy' ? 'Proxy' : 'SBT';
//       const formattedLength = length === 9 ? '9+' : String(length);

//       const message = `
// 💰 <b>ОПЛАЧЕННАЯ ПОПЫТКА ДОБАВЛЕНА!</b>

// ${network}
// 👤 Адрес: ${this.formatAddressLink(address, isTestnet)}
// 🏷️ Тип зоны: ${zoneTypeText}
// 📏 Длина: ${formattedLength} символов

// ⏰ Время: ${new Date().toLocaleString('ru-RU')}

// 💡 Пользователь оплатил создание ${zoneTypeText.toLowerCase()}-зоны длиной ${formattedLength} символов.
//       `.trim();

//       await this.bot!.sendMessage(this.ownerId, message, { parse_mode: 'HTML' });

//       await this.sendPublicPaymentRecordedNotification(address, zoneType, length, isTestnet);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке уведомления об оплаченной попытке:', error);
//     }
//   }

//   async sendPublicPaymentRecordedNotification(address: string, zoneType: string, length: number, isTestnet: boolean = true): Promise<boolean> {
//     try {
//       const network = this.formatNetwork(isTestnet);
//       const zoneTypeText = zoneType === 'proxy' ? 'Proxy' : 'SBT';
//       const formattedLength = length === 9 ? '9+' : String(length);

//       const message = `
// 💰 <b>НОВАЯ ОПЛАЧЕННАЯ ПОПЫТКА!</b>

// ${network}
// 👤 Адрес: ${this.formatAddressLink(address, isTestnet)}
// 🏷️ Тип зоны: ${zoneTypeText}
// 📏 Длина: ${formattedLength} символов

// ⏰ Время: ${new Date().toLocaleString('ru-RU')}

// 🎯 Пользователь оплатил создание ${zoneTypeText.toLowerCase()}-зоны!
//       `.trim();

//       return await this.sendGroupNotification(message);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке публичного уведомления об оплаченной попытке:', error);
//       return false;
//     }
//   }

//   async sendPaymentConsumedNotification(address: string, zoneType: string, length: number, isTestnet: boolean = true): Promise<void> {
//     if (!this.isBotAvailable()) return;

//     try {
//       const network = this.formatNetwork(isTestnet);
//       const zoneTypeText = zoneType === 'proxy' ? 'Proxy' : 'SBT';
//       const formattedLength = length === 9 ? '9+' : String(length);

//       const message = `
// 💸 <b>ОПЛАЧЕННАЯ ПОПЫТКА ИСПОЛЬЗОВАНА!</b>

// ${network}
// 👤 Адрес: ${this.formatAddressLink(address, isTestnet)}
// 🏷️ Тип зоны: ${zoneTypeText}
// 📏 Длина: ${formattedLength} символов

// ⏰ Время: ${new Date().toLocaleString('ru-RU')}

// ✅ Пользователь использовал оплаченную попытку для создания ${zoneTypeText.toLowerCase()}-зоны.
//       `.trim();

//       await this.bot!.sendMessage(this.ownerId, message, { parse_mode: 'HTML' });

//       await this.sendPublicPaymentConsumedNotification(address, zoneType, length, isTestnet);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке уведомления об использовании оплаченной попытки:', error);
//     }
//   }

//   async sendPublicPaymentConsumedNotification(address: string, zoneType: string, length: number, isTestnet: boolean = true): Promise<boolean> {
//     try {
//       const network = this.formatNetwork(isTestnet);
//       const zoneTypeText = zoneType === 'proxy' ? 'Proxy' : 'SBT';

//       const message = `
// 💸 <b>ОПЛАЧЕННАЯ ПОПЫТКА ИСПОЛЬЗОВАНА!</b>

// ${network}
// 👤 Адрес: ${this.formatAddressLink(address, isTestnet)}
// 🏷️ Тип зоны: ${zoneTypeText}
// 📏 Длина: ${length} символов

// ⏰ Время: ${new Date().toLocaleString('ru-RU')}

// ✅ Пользователь создал ${zoneTypeText.toLowerCase()}-зону используя оплаченную попытку!
//       `.trim();

//       return await this.sendGroupNotification(message);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке публичного уведомления об использовании оплаченной попытки:', error);
//       return false;
//     }
//   }

//   async sendPaymentErrorNotification(address: string, zoneType: string, length: number, errorMessage: string, isTestnet: boolean = true): Promise<void> {
//     if (!this.isBotAvailable()) return;

//     try {
//       const network = this.formatNetwork(isTestnet);
//       const zoneTypeText = zoneType === 'proxy' ? 'Proxy' : 'SBT';

//       const message = `
// ❌ <b>ОШИБКА ПРИ ОПЛАТЕ ПОПЫТКИ!</b>

// ${network}
// 👤 Адрес: ${this.formatAddressLink(address, isTestnet)}
// 🏷️ Тип зоны: ${zoneTypeText}
// 📏 Длина: ${length} символов

// ⚠️ Ошибка: ${errorMessage}

// ⏰ Время: ${new Date().toLocaleString('ru-RU')}
//       `.trim();

//       await this.bot!.sendMessage(this.ownerId, message, { parse_mode: 'HTML' });
//     } catch (error) {
//       console.error('❌ Ошибка при отправке уведомления об ошибке оплаты:', error);
//     }
//   }

//   // ==================== ЧАТЫ ====================

//   getChatHistory(domain: string, userAddress: string, isTestnet: boolean = true): any[] {
//     try {
//       const db = this.getDatabase(isTestnet);
//       const chat = db.prepare('SELECT * FROM chats WHERE domain = ? AND userAddress = ?').get(domain, userAddress) as any;
//       if (!chat) return [];
//       return db.prepare('SELECT * FROM messages WHERE chatId = ? ORDER BY timestamp ASC').all(chat.id) as any[];
//     } catch (error) {
//       console.error('❌ Ошибка при получении истории чата:', error);
//       return [];
//     }
//   }

//   saveUserMessage(domain: string, userAddress: string, messageText: string, isTestnet: boolean = true): boolean {
//     try {
//       const db = this.getDatabase(isTestnet);
//       let chat = db.prepare('SELECT * FROM chats WHERE domain = ? AND userAddress = ?').get(domain, userAddress) as any;

//       if (!chat) {
//         const stmt = db.prepare(`INSERT INTO chats (domain, userAddress) VALUES (?, ?) RETURNING *`);
//         chat = stmt.get(domain, userAddress);
//       }

//       const messageId = Math.random().toString(36).substring(2, 15);
//       db.prepare('INSERT INTO messages (id, chatId, sender, text) VALUES (?, ?, ?, ?)')
//         .run(messageId, chat.id, 'user', messageText);
//       db.prepare('UPDATE chats SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(chat.id);

//       return true;
//     } catch (error) {
//       console.error('❌ Ошибка при сохранении сообщения пользователя в БД:', error);
//       return false;
//     }
//   }

//   getActiveChats(isTestnet: boolean = true): any[] {
//     try {
//       const db = this.getDatabase(isTestnet);
//       return db.prepare(`
//         SELECT c.*,
//                (SELECT COUNT(*) FROM messages m WHERE m.chatId = c.id) as messageCount,
//                (SELECT MAX(timestamp) FROM messages m WHERE m.chatId = c.id) as lastMessageTime
//         FROM chats c
//         WHERE c.status = 'active'
//         ORDER BY c.updatedAt DESC
//       `).all() as any[];
//     } catch (error) {
//       console.error('❌ Ошибка при получении активных чатов:', error);
//       return [];
//     }
//   }

//   closeChat(domain: string, userAddress: string, isTestnet: boolean = true): boolean {
//     try {
//       const db = this.getDatabase(isTestnet);
//       const result = db.prepare(
//         'UPDATE chats SET status = "closed", updatedAt = CURRENT_TIMESTAMP WHERE domain = ? AND userAddress = ?'
//       ).run(domain, userAddress);
//       return result.changes > 0;
//     } catch (error) {
//       console.error('❌ Ошибка при закрытии чата:', error);
//       return false;
//     }
//   }

//   getChatStats(isTestnet: boolean = true): any {
//     try {
//       const db = this.getDatabase(isTestnet);
//       return db.prepare(`
//         SELECT
//           COUNT(*) as totalChats,
//           SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeChats,
//           SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closedChats,
//           (SELECT COUNT(*) FROM messages) as totalMessages,
//           (SELECT COUNT(*) FROM messages WHERE sender = 'user') as userMessages,
//           (SELECT COUNT(*) FROM messages WHERE sender = 'operator') as operatorMessages
//         FROM chats
//       `).get() as any;
//     } catch (error) {
//       console.error('❌ Ошибка при получении статистики чатов:', error);
//       return { totalChats: 0, activeChats: 0, closedChats: 0, totalMessages: 0, userMessages: 0, operatorMessages: 0 };
//     }
//   }
// }

// // ==================== ЭКСПОРТ ====================

// const telegramBotService = new TelegramBotService();
// export default telegramBotService;

// utils/tgBot-sqlite.ts
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import Database from 'better-sqlite3';

// Загружаем переменные окружения
dotenv.config();

// Интерфейсы для типизации
interface TelegramMessage {
  chat: {
    id: number;
    type?: string;
  };
  text?: string;
  reply_to_message?: {
    from?: {
      id: number;
    };
    message_id?: number;
    text?: string;
  };
}

interface TelegramCallbackQuery {
  id: string;
  data?: string;
  message?: {
    chat: {
      id: number;
    };
    message_id: number;
  };
}

interface MessageContext {
  domain: string;
  userAddress: string;
  isTestnet: boolean;
}

interface BotSubscription {
  id: number;
  chatId: string;
  chatType: string;
  subscriptionType: string;
  isActive: number;
}

declare module 'node-telegram-bot-api' {
  interface TelegramBot {
    getMe(): Promise<{ id: number; username: string }>;
  }
}

const API_PAYLOAD_URL = process.env.VITE_API_SC_PAYLOAD_URL || 'https://api.subdom.zone';

// ==================== DEEPLINK UTILS ====================

class DeeplinkUtils {
  private static readonly BOT_USERNAME = 'subdom';

  static generateTelegramDeeplink(route: string, params: Record<string, string> = {}): string {
    let startappParam = route.replace(/^\/+/, '');

    if (Object.keys(params).length > 0) {
      const paramString = Object.entries(params)
        .filter(([_, value]) => value)
        .map(([key, value]) => `${key}_${value}`)
        .join('_');

      if (paramString) {
        startappParam = `${startappParam}_${paramString}`;
      }
    }

    const encodedParam = encodeURIComponent(startappParam);
    return `https://t.me/${this.BOT_USERNAME}?startapp=${encodedParam}`;
  }

  static generateAddSubdomainLink(zoneName: string, subdomainName?: string): string {
    const params: Record<string, string> = { zone: zoneName };
    if (subdomainName) {
      params.subdomain = subdomainName;
    }
    return this.generateTelegramDeeplink('/add-subdomain', params);
  }

  static generateMarketLink(): string {
    return this.generateTelegramDeeplink('/market');
  }

  static generateAuctionLink(zoneName: string, subdomainName: string): string {
    return this.generateTelegramDeeplink('/add-subdomain', {
      zone: zoneName,
      subdomain: subdomainName
    });
  }

  static generateHomeLink(): string {
    return this.generateTelegramDeeplink('/');
  }

  static parseStartappParam(startappParam: string): { route: string; params: Record<string, string> } {
    const parts = startappParam.split('_');

    if (parts.length === 0) {
      return { route: '/', params: {} };
    }

    const firstPart = parts[0]!;
    const route = firstPart.startsWith('/') ? firstPart : `/${firstPart}`;
    const params: Record<string, string> = {};

    for (let i = 1; i < parts.length; i += 2) {
      if (i + 1 < parts.length) {
        const key = parts[i];
        const value = parts[i + 1];
        if (key !== undefined && value !== undefined) {
          params[key] = value;
        }
      }
    }

    return { route, params };
  }

  static formatDomainForUrl(domain: string): [string, string] {
    if (!domain) return ['', ''];
    const parts = domain.split('.');

    if (parts.length >= 2) {
      const subdomainName = parts[0] || '';
      const zoneName = parts.slice(1).join('.') || '';
      return [subdomainName, zoneName];
    }

    return ['', ''];
  }

  static generateLinkForNotification(type: 'bundle' | 'auction' | 'bid' | 'market', domain?: string): string {
    switch (type) {
      case 'bundle':
        if (!domain) throw new Error('Domain is required for bundle notification');
        const [_, zoneName] = this.formatDomainForUrl(domain);
        if (!zoneName) throw new Error(`Invalid domain format: ${domain}`);
        return this.generateAddSubdomainLink(zoneName);

      case 'auction':
      case 'bid':
        if (!domain) throw new Error('Domain is required for auction/bid notification');
        const [subdomainName, zoneName2] = this.formatDomainForUrl(domain);
        if (!zoneName2 || !subdomainName) throw new Error(`Invalid domain format for auction: ${domain}`);
        return this.generateAuctionLink(zoneName2, subdomainName);

      case 'market':
        return this.generateMarketLink();

      default:
        throw new Error(`Unknown notification type: ${type}`);
    }
  }
}

// ==================== TELEGRAM BOT SERVICE ====================

class TelegramBotService {
  private bot: TelegramBot | null = null;
  private ownerId: string = process.env.TELEGRAM_OWNER_ID || '';
  private groupId: string = process.env.TELEGRAM_GROUP_ID || '';
  private replyContext = new Map<number, MessageContext>();
  private messageContexts = new Map<string, MessageContext>();

  // Базы данных
  private testnetDb: Database.Database;
  private mainnetDb: Database.Database;

  private replyContextTimeouts = new Map<number, NodeJS.Timeout>();

  // Кэш подписок (загружается из БД при старте)
  private subscriptions: BotSubscription[] = [];

  constructor() {
    console.log('🔧 Инициализация Telegram Bot...');
    console.log('📝 TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? '✅ Установлен' : '❌ Отсутствует');
    console.log('👤 TELEGRAM_OWNER_ID:', process.env.TELEGRAM_OWNER_ID ? '✅ Установлен' : '❌ Отсутствует');
    console.log('👥 TELEGRAM_GROUP_ID:', process.env.TELEGRAM_GROUP_ID ? '✅ Установлен' : '❌ Отсутствует');

    // Инициализируем базы данных
    this.testnetDb = new Database('nft-domains.db');
    this.mainnetDb = new Database('nft-domains-mainnet.db');

    console.log(`💾 Базы данных инициализированы: testnet=${!!this.testnetDb}, mainnet=${!!this.mainnetDb}`);

    this.testnetDb.pragma('journal_mode = WAL');
    this.mainnetDb.pragma('journal_mode = WAL');

    // Инициализируем таблицы чатов
    this.initializeChatTables();

    // Инициализируем таблицу подписок
    this.initializeSubscriptionTable();

    // Загружаем подписки из БД
    this.loadSubscriptions();

    this.initializeBot();
  }

  // ==================== ПОДПИСКИ (МУЛЬТИ-ЧАТ) ====================

  private initializeSubscriptionTable(): void {
    const dbs = [this.testnetDb, this.mainnetDb];
    for (const db of dbs) {
      const exists = db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='bot_subscriptions'`
      ).get();

      if (!exists) {
        db.exec(`
          CREATE TABLE IF NOT EXISTS bot_subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chatId TEXT NOT NULL,
            chatType TEXT NOT NULL DEFAULT 'private',
            subscriptionType TEXT NOT NULL,
            isActive INTEGER DEFAULT 1,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(chatId, subscriptionType)
          );
        `);
        console.log('✅ Таблица bot_subscriptions создана');
      }
    }
  }

  private loadSubscriptions(): void {
    const db = this.testnetDb;
    const subs = db.prepare(`SELECT * FROM bot_subscriptions WHERE isActive = 1`).all() as BotSubscription[];
    this.subscriptions = subs;
    console.log(`📋 Загружено ${subs.length} активных подписок`);

    // Восстанавливаем ownerId и groupId из подписок (если не заданы в env)
    for (const s of subs) {
      if (s.subscriptionType === 'owner' && !this.ownerId) {
        this.ownerId = s.chatId;
      }
      if (s.subscriptionType === 'public' && !this.groupId) {
        this.groupId = s.chatId;
      }
    }
  }

  private addSubscription(chatId: string, chatType: string, subscriptionType: string): void {
    const db = this.testnetDb;
    db.prepare(`
      INSERT OR REPLACE INTO bot_subscriptions (chatId, chatType, subscriptionType, isActive)
      VALUES (?, ?, ?, 1)
    `).run(chatId, chatType, subscriptionType);

    this.loadSubscriptions();
  }

  private removeSubscription(chatId: string): void {
    const db = this.testnetDb;
    db.prepare(`UPDATE bot_subscriptions SET isActive = 0 WHERE chatId = ?`).run(chatId);
    this.loadSubscriptions();
  }

  // ==================== ИНИЦИАЛИЗАЦИЯ ТАБЛИЦ ЧАТОВ ====================

  private initializeChatTables(): void {
    const initializeDb = (db: Database.Database, dbName: string) => {
      console.log(`💾 Инициализация таблиц в БД: ${dbName}`);

      const chatsTableExists = db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='chats'`
      ).get();

      const messagesTableExists = db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='messages'`
      ).get();

      console.log(`💾 Таблица chats существует: ${!!chatsTableExists}`);
      console.log(`💾 Таблица messages существует: ${!!messagesTableExists}`);

      if (!chatsTableExists) {
        db.exec(`
          CREATE TABLE IF NOT EXISTS chats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            domain TEXT NOT NULL,
            userAddress TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(domain, userAddress)
          );
        `);
        console.log('✅ Таблица chats создана');
      }

      if (!messagesTableExists) {
        db.exec(`
          CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            chatId INTEGER NOT NULL,
            sender TEXT NOT NULL,
            text TEXT NOT NULL,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (chatId) REFERENCES chats(id)
          );
        `);
        console.log('✅ Таблица messages создана');
      }
    };

    initializeDb(this.testnetDb, 'testnet');
    initializeDb(this.mainnetDb, 'mainnet');
  }

  // ==================== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ====================

  private getDatabase(isTestnet: boolean): Database.Database {
    return isTestnet ? this.testnetDb : this.mainnetDb;
  }

  private generateMessageId(domain: string, userAddress: string): string {
    const combined = `${domain}_${userAddress}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash) + combined.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).substring(0, 8);
  }

  private isBotAvailable(): boolean {
    return !!(this.bot && this.ownerId);
  }

  private isGroupAvailable(): boolean {
    // Проверяем: если есть подписки типа 'public', группа доступна
    return !!(this.bot && this.subscriptions.some(s => s.subscriptionType === 'public' && s.isActive));
  }

  private formatNetwork(isTestnet: boolean): string {
    return isTestnet ? '🔬 <b>Сеть:</b> Testnet' : '🌐 <b>Сеть:</b> Mainnet';
  }

  private getTonviewerAddress(address: string): string {
    return `<a href="https://tonviewer.com/${address}">${address.slice(0, 6)}...${address.slice(-4)}</a>`;
  }

  private getTonviewerUrl(isTestnet: boolean): string {
    return isTestnet ? 'https://testnet.tonviewer.com' : 'https://tonviewer.com';
  }

  private formatTonviewerLink(address: string, isTestnet: boolean): string {
    const base = this.getTonviewerUrl(isTestnet);
    return `<a href="${base}/${address}">${address.slice(0, 6)}...${address.slice(-4)}</a>`;
  }

  private formatDomainForUrl(domain: string): string[] {
    if (!domain) return [];
    const parts = domain.split('.');
    return parts;
  }

  /**
   * Определяет URL картинки для уведомления.
   * - Для SBT-зоны (имя из 2 частей, proxy=0): /api/v1/sbt-subdomain/metadata/ton/{zoneName}.png
   * - Для Proxy-зоны (имя из 2 частей, proxy=1): /api/v1/proxy/metadata/ton/{zoneName}.png
   * - Для SBT-субдомена (имя из 3+ частей, proxy=0): /api/v1/sbt-subdomain/metadata/ton/{zoneName}/{subName}.png
   * - Для Proxy-субдомена (имя из 3+ частей, proxy=1): /api/v1/subdomain/metadata/ton/{zoneName}/{subName}.png
   */
  private getNotificationImageUrl(name: string, isProxy: boolean): string | null {
    const parts = name.split('.');
    const isZone = parts.length === 2;

    if (isZone) {
      // Это зона
      if (isProxy) {
        return `${API_PAYLOAD_URL}/api/v1/proxy/metadata/ton/${name}.png`;
      } else {
        return `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${name}.png`;
      }
    }

    // Это субдомен
    const subName = parts[0];
    const zoneName = parts.slice(1).join('.');

    if (isProxy) {
      return `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${zoneName}/${subName}.png`;
    } else {
      return `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${zoneName}/${subName}.png`;
    }
  }

  /**
   * Отправляет фото с подписью. Если фото не грузится — fallback на текст.
   */
  private async sendPhotoWithCaption(
    chatId: string,
    photoUrl: string,
    caption: string,
    inlineKeyboard?: any
  ): Promise<void> {
    try {
      await this.bot!.sendPhoto(chatId, photoUrl, {
        caption,
        parse_mode: 'HTML',
        ...(inlineKeyboard ? { reply_markup: { inline_keyboard: inlineKeyboard } } : {})
      });
    } catch (e) {
      console.warn(`⚠️ Не удалось отправить фото (${photoUrl}), fallback на текст`);
      await this.bot!.sendMessage(chatId, caption, {
        parse_mode: 'HTML',
        ...(inlineKeyboard ? { reply_markup: { inline_keyboard: inlineKeyboard } } : {})
      });
    }
  }

  // ==================== ИНИЦИАЛИЗАЦИЯ БОТА ====================

  private initializeBot(): void {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      console.warn('⚠️ TELEGRAM_BOT_TOKEN не установлен. Telegram бот отключен.');
      return;
    }

    try {
      this.bot = new TelegramBot(token, {
        polling: true
      });

      this.setupHandlers();
      console.log('✅ Telegram Bot инициализирован и запущен');

      this.sendTestNotification();
    } catch (error) {
      console.error('❌ Ошибка инициализации Telegram бота:', error);
    }
  }

  private async sendTestNotification(): Promise<void> {
    if (!this.isBotAvailable()) return;

    try {
      await this.bot!.sendMessage(
        this.ownerId,
        `🤖 <b>Бот поддержки Subdom (TON DNS Subdomains) запущен!</b>\n\nСтатус: <b>✅ Активен</b>\nВремя: ${new Date().toLocaleString('ru-RU')}\nБазы данных: ✅ Testnet, ✅ Mainnet\nПодписок: ${this.subscriptions.length}`,
        { parse_mode: 'HTML' }
      );
      console.log('✅ Тестовое уведомление отправлено');
    } catch (error: unknown) {
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as { response: { data: any; status: number } };
        console.error(axiosError.response.data);
      } else if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error('Unknown error:', error);
      }
    }
  }

  // ==================== ОБРАБОТЧИКИ КОМАНД ====================

  private setupHandlers(): void {
    if (!this.bot) return;

    // Отладка всех сообщений
    this.bot.on('message', (msg: TelegramMessage) => {
      console.log(`📨 [DEBUG] Сообщение получено: chatId=${msg.chat.id}, text=${msg.text?.substring(0, 50)}`);
    });

    // /start
    this.bot.onText(/\/start/, (msg: TelegramMessage) => {
      const chatId = msg.chat.id;
      this.bot!.sendMessage(
        chatId,
        `🤖 <b>Бот поддержки Subdom (TON DNS Subdomains)</b>\n\nЭтот бот отправляет уведомления о:\n• Новых чатах\n• Сообщениях от пользователей\n• Новых зонах\n• Сминченных субдоменах\n• Новых пользователях\n• Аукционах\n• Ставках\n\nСтатус: <b>✅ Активен</b>`,
        { parse_mode: 'HTML' }
      );
    });

    // /status
    this.bot.onText(/\/status/, (msg: TelegramMessage) => {
      const chatId = msg.chat.id;
      const subs = this.subscriptions.filter(s => s.chatId === chatId.toString());
      this.bot!.sendMessage(
        chatId,
        `📊 <b>Статус системы</b>\n\nБот: <b>✅ Активен</b>\nВладелец: <code>${this.ownerId}</code>\nЧат ID: <code>${chatId}</code>\nПодписан: ${subs.length > 0 ? '✅ Да' : '❌ Нет'}\nВремя: ${new Date().toLocaleString('ru-RU')}`,
        { parse_mode: 'HTML' }
      );
    });

    // /network
    this.bot.onText(/\/network/, (msg: TelegramMessage) => {
      const chatId = msg.chat.id;
      this.bot!.sendMessage(
        chatId,
        `🌐 <b>Информация о сетях</b>\n\nБот поддерживает уведомления для:\n• <b>Testnet</b> (тестовая сеть)\n• <b>Mainnet</b> (основная сеть)\n\nВсе уведомления содержат информацию о сети.`,
        { parse_mode: 'HTML' }
      );
    });

    // /subscribe — подписаться на уведомления
    this.bot.onText(/\/subscribe/, (msg: TelegramMessage) => {
      const chatId = msg.chat.id.toString();
      const chatType = msg.chat.type || 'private';
      const subType = msg.chat.id === parseInt(this.ownerId) ? 'owner' : 'public';
      this.addSubscription(chatId, chatType, subType);
      this.bot!.sendMessage(msg.chat.id, '✅ Вы подписаны на уведомления');
    });

    // /unsubscribe — отписаться
    this.bot.onText(/\/unsubscribe/, (msg: TelegramMessage) => {
      this.removeSubscription(msg.chat.id.toString());
      this.bot!.sendMessage(msg.chat.id, '❌ Вы отписались от уведомлений');
    });

    // callback_query
    this.bot.on('callback_query', async (callbackQuery: TelegramCallbackQuery) => {
      try {
        const data = callbackQuery.data;
        const chatId = callbackQuery.message?.chat.id;
        const messageId = callbackQuery.message?.message_id;

        if (!data || !chatId || !messageId) return;

        console.log(`📨 Callback получен: ${data}`);

        if (data.startsWith('reply_')) {
          await this.handleReplyCallback(callbackQuery);
        }

        await this.bot!.answerCallbackQuery(callbackQuery.id);
      } catch (error) {
        console.error('❌ Ошибка при обработке callback:', error);
      }
    });

    // Обработчик текстовых сообщений (для ответов техподдержки)
    this.bot.on('message', async (msg: any) => {
      try {
        console.log(`📨 Получено сообщение в чате ${msg.chat.id}: ${msg.text?.substring(0, 50)}...`);
        console.log(`📨 reply_to_message:`, msg.reply_to_message);

        const context = this.replyContext.get(msg.chat.id);
        console.log(`📨 Активный контекст для чата ${msg.chat.id}:`, context);

        if (context && msg.text) {
          console.log(`✅ Найден активный контекст! Обрабатываем как ответ техподдержки...`);
          await this.handleSupportReply(msg);
        } else if (msg.reply_to_message && msg.text) {
          console.log(`📨 Это ответ на сообщение ${msg.reply_to_message.message_id}`);
          console.log(`📨 Отправитель ответа:`, msg.reply_to_message.from);
          await this.handleSupportReply(msg);
        } else {
          console.log(`❌ Нет активного контекста и не ответ на сообщение`);

          if (msg.chat.id.toString() === this.ownerId && msg.text) {
            console.log(`ℹ️ Сообщение от владельца без контекста: ${msg.text}`);
            if (this.bot) {
              await this.bot.sendMessage(msg.chat.id,
                'ℹ️ Чтобы ответить клиенту, сначала нажмите кнопку "Ответить" под уведомлением о сообщении.'
              );
            }
          }
        }
      } catch (error) {
        console.error('❌ Ошибка при обработке сообщения:', error);
      }
    });

    this.bot.on('polling_error', (error: Error) => {
      if (error.message.includes('ESOCKETTIMEDOUT') || error.message.includes('ETIMEDOUT')) {
        return;
      }
      console.error('❌ Ошибка Telegram polling:', error);
    });
  }

  // ==================== ОБРАБОТКА REPLY / SUPPORT ====================

  private async handleReplyCallback(callbackQuery: TelegramCallbackQuery): Promise<void> {
    try {
      const data = callbackQuery.data;
      const chatId = callbackQuery.message?.chat.id;
      const messageId = callbackQuery.message?.message_id;

      if (!data || !chatId || !messageId) return;

      console.log(`📨 Callback получен: ${data}`);

      if (data.startsWith('reply_')) {
        await this.handleReplyCallbackData(data, chatId, messageId);
      }

      if (this.bot) {
        await this.bot.answerCallbackQuery(callbackQuery.id);
      }
    } catch (error) {
      console.error('❌ Ошибка при обработке callback:', error);
    }
  }

  private async handleReplyCallbackData(data: string, chatId: number, messageId: number): Promise<void> {
    const parts = data.split('_');
    if (parts.length !== 2 || parts[0] !== 'reply') {
      console.error('❌ Неверный формат callback_data:', data);
      return;
    }

    const contextId = parts[1];
    if (!contextId) {
      console.error('❌ contextId не определен');
      return;
    }
    const context = this.messageContexts.get(contextId);

    if (!context) {
      console.error('❌ Контекст не найден для ID:', contextId);
      console.error('❌ Все доступные контексты:', Array.from(this.messageContexts.entries()));
      if (this.bot) {
        await this.bot.sendMessage(chatId, '❌ Контекст сообщения устарел или не найден.', {
          parse_mode: 'HTML'
        });
      }
      return;
    }

    const { domain, userAddress, isTestnet } = context;

    console.log(`💬 Обработка ответа для: ${domain} - ${userAddress} (${isTestnet ? 'testnet' : 'mainnet'})`);
    console.log(`💬 Сохраняем контекст для чата ${chatId}:`, context);

    this.replyContext.set(chatId, {
      domain,
      userAddress,
      isTestnet
    });

    console.log(`💬 Контекст сохранен. Все контексты:`, Array.from(this.replyContext.entries()));

    if (this.replyContextTimeouts.has(chatId)) {
      clearTimeout(this.replyContextTimeouts.get(chatId)!);
    }

    const timeout = setTimeout(() => {
      console.log(`⏰ Таймаут контекста для чата ${chatId}`);
      this.replyContext.delete(chatId);
      this.replyContextTimeouts.delete(chatId);

      if (this.bot) {
        this.bot.sendMessage(chatId,
          '⏰ Контекст ответа истек. Чтобы ответить клиенту, нажмите кнопку "Ответить" заново.'
        );
      }
    }, 10 * 60 * 1000);

    this.replyContextTimeouts.set(chatId, timeout);

    console.log(`💬 Контекст сохранен с таймаутом 10 минут. Все контексты:`, Array.from(this.replyContext.entries()));

    const instruction = `
✍️ <b>ОТВЕТИТЬ КЛИЕНТУ</b>

🌐 Домен: <code>${domain}</code>
👤 Адрес: <code>${userAddress}</code>
🌐 Сеть: ${isTestnet ? 'Testnet' : 'Mainnet'}

📝 <b>Напишите ответ ниже этим сообщением:</b>
(Просто ответьте на это сообщение текстом)
  `.trim();

    if (this.bot) {
      await this.bot.sendMessage(chatId, instruction, {
        parse_mode: 'HTML',
        reply_to_message_id: messageId
      });
    }
  }

  private async handleSupportReply(msg: any): Promise<void> {
    try {
      const chatId = msg.chat.id;
      const replyText = msg.text;

      console.log(`📤 Получен ответ от оператора в чате ${chatId}: ${replyText}`);
      console.log(`📤 Контекст для чата ${chatId}:`, this.replyContext.get(chatId));

      if (!replyText) {
        console.log('❌ Сообщение не содержит текста');
        if (this.bot) {
          await this.bot.sendMessage(chatId, '❌ Сообщение не содержит текста');
        }
        return;
      }

      const context = this.replyContext.get(chatId);
      if (!context) {
        console.log('❌ Контекст ответа не найден для чата:', chatId);
        console.log('❌ Все контексты:', Array.from(this.replyContext.entries()));

        if (msg.reply_to_message && msg.reply_to_message.text) {
          console.log('ℹ️ Пытаемся извлечь контекст из reply_to_message...');
        }

        if (this.bot) {
          await this.bot.sendMessage(chatId,
            '❌ Контекст ответа не найден. Используйте кнопку "Ответить" под уведомлением о сообщении.'
          );
        }
        return;
      }

      const { domain, userAddress, isTestnet } = context;

      console.log(`📤 Отправка ответа техподдержки: ${domain} - ${userAddress} (${isTestnet ? 'testnet' : 'mainnet'})`);

      const success = await this.saveOperatorReplyToDatabase(domain, userAddress, replyText, isTestnet);

      if (success) {
        console.log(`✅ Ответ оператора сохранен в БД для ${domain}`);

        if (this.bot) {
          await this.bot.sendMessage(chatId, `
✅ <b>ОТВЕТ ОТПРАВЛЕН КЛИЕНТУ И СОХРАНЕН В БАЗУ</b>

🌐 Домен: <code>${domain}</code>
👤 Адрес: <code>${userAddress}</code>
🌐 Сеть: ${isTestnet ? 'Testnet' : 'Mainnet'}

💬 Ваш ответ:
${replyText}

⏰ Сохранено: ${new Date().toLocaleString('ru-RU')}
        `.trim(), { parse_mode: 'HTML' });
        }

        this.replyContext.delete(chatId);

        if (this.replyContextTimeouts.has(chatId)) {
          clearTimeout(this.replyContextTimeouts.get(chatId)!);
          this.replyContextTimeouts.delete(chatId);
        }

        console.log(`✅ Контекст и таймаут удалены для чата ${chatId}`);
        console.log(`✅ Ответ оператора сохранен в базу (${isTestnet ? 'testnet' : 'mainnet'}): ${domain} - ${userAddress}`);
      } else {
        console.log('❌ Ошибка при сохранении ответа в базу данных');
        if (this.bot) {
          await this.bot.sendMessage(chatId, '❌ Ошибка при сохранении ответа в базу данных');
        }
      }

    } catch (error) {
      console.error('❌ Ошибка при обработке ответа техподдержки:', error);
      if (this.bot && msg.chat.id) {
        await this.bot.sendMessage(msg.chat.id, '❌ Произошла ошибка при обработке ответа');
      }
    }
  }

  // ==================== РАБОТА С БД (ЧАТЫ) ====================

  private async saveOperatorReplyToDatabase(
    domain: string,
    userAddress: string,
    replyText: string,
    isTestnet: boolean
  ): Promise<boolean> {
    try {
      console.log(`💾 Попытка сохранения ответа оператора в БД: ${domain}, ${userAddress}, ${isTestnet ? 'testnet' : 'mainnet'}`);

      const db = this.getDatabase(isTestnet);

      let chat = db.prepare('SELECT * FROM chats WHERE domain = ? AND userAddress = ?').get(domain, userAddress) as any;

      console.log(`💾 Найден чат:`, chat);

      if (!chat) {
        console.log(`💾 Чат не найден, создаем новый для ${domain} - ${userAddress}`);
        const stmt = db.prepare(`
          INSERT INTO chats (domain, userAddress)
          VALUES (?, ?)
          RETURNING *
        `);

        chat = stmt.get(domain, userAddress);
        console.log(`💾 Создан новый чат:`, chat);
      }

      const messageId = Math.random().toString(36).substring(2, 15);
      console.log(`💾 Добавляем сообщение оператора с ID: ${messageId}`);

      const result = db.prepare('INSERT INTO messages (id, chatId, sender, text) VALUES (?, ?, ?, ?)')
        .run(messageId, chat.id, 'operator', replyText);

      console.log(`💾 Результат вставки сообщения:`, result);

      db.prepare('UPDATE chats SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?')
        .run(chat.id);

      console.log(`✅ Ответ оператора сохранен в БД для чата ${domain} (${isTestnet ? 'testnet' : 'mainnet'})`);
      return true;
    } catch (error) {
      console.error('❌ Ошибка при сохранении ответа оператора в БД:', error);
      return false;
    }
  }

  // ==================== УВЕДОМЛЕНИЯ ДЛЯ ВЛАДЕЛЬЦА ====================

  async sendNewMessageNotification(domain: string, userAddress: string, messageText: string, isTestnet: boolean = true): Promise<void> {
    if (!this.isBotAvailable()) {
      console.warn('⚠️ Telegram не настроен. Пропускаем отправку уведомления.');
      return;
    }

    try {
      const network = this.formatNetwork(isTestnet);

      const messageId = this.generateMessageId(domain, userAddress);

      this.messageContexts.set(messageId, {
        domain,
        userAddress,
        isTestnet
      });

      if (this.messageContexts.size > 100) {
        const keys = Array.from(this.messageContexts.keys());
        for (let i = 0; i < 50; i++) {
          const key = keys[i];
          if (key) {
            this.messageContexts.delete(key);
          }
        }
      }

      const message = `
📨 <b>НОВОЕ СООБЩЕНИЕ ОТ КЛИЕНТА</b>

${network}
🌐 Домен: <code>${domain}</code>
👤 Адрес: ${this.formatTonviewerLink(userAddress, isTestnet)}

💬 Сообщение:
${messageText.substring(0, 500)}${messageText.length > 500 ? '...' : ''}
      `.trim();

      const inlineKeyboard = [
        [
          {
            text: '↩️ Ответить',
            callback_data: `reply_${messageId}`
          }
        ]
      ];

      await this.bot!.sendMessage(this.ownerId, message, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: inlineKeyboard }
      });

      console.log(`✅ Уведомление о сообщении отправлено в Telegram (${isTestnet ? 'testnet' : 'mainnet'})`);
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления в Telegram:', error);
    }
  }

  async sendNewChatNotification(domain: string, userAddress: string, isTestnet: boolean = true): Promise<void> {
    if (!this.isBotAvailable()) {
      console.warn('⚠️ Telegram не настроен. Пропускаем отправку уведомления.');
      return;
    }

    try {
      const network = this.formatNetwork(isTestnet);

      const chatIdHash = this.generateMessageId(domain, userAddress);

      this.messageContexts.set(`chat_${chatIdHash}`, {
        domain,
        userAddress,
        isTestnet
      });

      const message = `
🔔 <b>НОВЫЙ ЧАТ!</b>

${network}
🌐 Домен: <code>${domain}</code>
👤 Адрес: ${this.formatTonviewerLink(userAddress, isTestnet)}

⏰ Время создания: ${new Date().toLocaleString('ru-RU')}
      `.trim();

      const inlineKeyboard = [
        [
          {
            text: '↩️ Ответить',
            callback_data: `reply_${chatIdHash}`
          }
        ]
      ];

      await this.bot!.sendMessage(this.ownerId, message, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: inlineKeyboard }
      });

      console.log(`✅ Уведомление о новом чате отправлено в Telegram (${isTestnet ? 'testnet' : 'mainnet'})`);
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления в Telegram:', error);
    }
  }

  // ==================== ОТПРАВКА В ГРУППУ (ВСЕМ PUBLIC-ПОДПИСЧИКАМ) ====================

  private async sendGroupNotification(message: string, inlineKeyboard?: any, photoUrl?: string): Promise<boolean> {
    const publicSubs = this.subscriptions.filter(s => s.subscriptionType === 'public' && s.isActive);

    if (publicSubs.length === 0) {
      console.warn('⚠️ Нет активных public-подписок. Пропускаем отправку.');
      return false;
    }

    let sent = false;
    for (const sub of publicSubs) {
      try {
        if (photoUrl) {
          await this.sendPhotoWithCaption(sub.chatId, photoUrl, message, inlineKeyboard);
        } else {
          const options: any = { parse_mode: 'HTML' };
          if (inlineKeyboard) {
            options.reply_markup = { inline_keyboard: inlineKeyboard };
          }
          await this.bot!.sendMessage(sub.chatId, message, options);
        }
        sent = true;
      } catch (e) {
        console.error(`❌ Не удалось отправить в чат ${sub.chatId}`);
      }
    }
    return sent;
  }

  // ==================== PUBLIC УВЕДОМЛЕНИЯ (С ТОНВЬЮВЕРОМ И КАРТИНКАМИ) ====================

  // --- PROXY ЗОНА ---
  async sendPublicProxyZoneCreatedNotification(name: string, address: string, owner: string, price: number, isTestnet: boolean = true): Promise<boolean> {
    try {
      const network = this.formatNetwork(isTestnet);
      const tonviewerBase = this.getTonviewerUrl(isTestnet);

      const message = `
🌐 <b>НОВАЯ PROXY ЗОНА СОЗДАНА!</b>

${network}
🏷️ Название: *.<code>${name}</code>
📍 Адрес домена: <a href="${tonviewerBase}/${address}">${address.slice(0, 6)}...${address.slice(-4)}</a>
👤 Владелец: <a href="${tonviewerBase}/${owner}">${owner.slice(0, 6)}...${owner.slice(-4)}</a>
💰 Цена: ${price} TON
🛡️ Тип: Proxy (для продажи)
⏰ Время создания: ${new Date().toLocaleString('ru-RU')}

💡 Теперь можно создавать субдомены в этой Proxy-зоне!
      `.trim();

      const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(name, '');
      console.log(`Сгенерирована ссылка для перехода в miniapp для proxy-зоны: ${miniAppLink}`);

      const inlineKeyboard = [
        [
          {
            text: '🔗 Создать субдомен',
            url: miniAppLink
          }
        ]
      ];

      const photoUrl = this.getNotificationImageUrl(name, true);

      return await this.sendGroupNotification(message, inlineKeyboard, photoUrl);
    } catch (error) {
      console.error('❌ Ошибка при отправке публичного уведомления о Proxy зоне:', error);
      return false;
    }
  }

  // --- BUNDLE DEPLOYED ---
  async sendPublicBundleDeployedNotification(domain: string, address: string, bundleAddress: string, isTestnet: boolean = true): Promise<boolean> {
    try {
      const network = this.formatNetwork(isTestnet);
      const tonviewerBase = this.getTonviewerUrl(isTestnet);

      const message = `
📦 <b>Создание PROXY-зоны завершено!</b>

${network}
🌐 Домен: <code>${domain}</code>
👤 Владелец: <a href="${tonviewerBase}/${address}">${address.slice(0, 6)}...${address.slice(-4)}</a>
📍 Адрес коллекции: <a href="${tonviewerBase}/${bundleAddress}">${bundleAddress.slice(0, 6)}...${bundleAddress.slice(-4)}</a>

⏰ Время развертывания: ${new Date().toLocaleString('ru-RU')}
💡 Теперь можно создавать субдомены в этой Proxy-зоне!
      `.trim();

      const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(domain, '');
      console.log(`Сгенерирована ссылка для перехода в miniapp для proxy-зоны: ${miniAppLink}`);

      const inlineKeyboard = [
        [
          {
            text: '🔗 Создать субдомен',
            url: miniAppLink
          }
        ]
      ];

      const photoUrl = this.getNotificationImageUrl(domain, true);

      return await this.sendGroupNotification(message, inlineKeyboard, photoUrl);
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления о Bundle:', error);
      return false;
    }
  }

  // --- SBT ЗОНА ---
  async sendPublicSBTZoneCreatedNotification(name: string, address: string, owner: string, price: number, bundleAddress: string, currentID: number, isTestnet: boolean = true): Promise<boolean> {
    try {
      const network = this.formatNetwork(isTestnet);
      const tonviewerBase = this.getTonviewerUrl(isTestnet);
      const [subdomainName, zoneName] = DeeplinkUtils.formatDomainForUrl(name);

      const message = `
🔒 <b>НОВАЯ SBT ЗОНА СОЗДАНА!</b>

${network}
🏷️ Название: <code>${name}</code>
📍 Адрес домена: <a href="${tonviewerBase}/${address}">${address.slice(0, 6)}...${address.slice(-4)}</a>
👤 Владелец: <a href="${tonviewerBase}/${owner}">${owner.slice(0, 6)}...${owner.slice(-4)}</a>
💰 Цена: ${price} TON
🎫 Тип: SBT (не для продажи)
📦 Адрес коллекции: <a href="${tonviewerBase}/${bundleAddress}">${bundleAddress.slice(0, 6)}...${bundleAddress.slice(-4)}</a>

Это <code>${currentID + 1}</code> по счету зона на этом домене.
      `.trim();

      const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(zoneName as string, subdomainName as string);
      console.log(`Сгенерирована ссылка для перехода в miniapp для SBT-зоны: ${miniAppLink}`);

      const inlineKeyboard = [
        [
          {
            text: '💰 Сделать ставку',
            url: miniAppLink
          }
        ]
      ];

      const photoUrl = this.getNotificationImageUrl(name, false); // SBT-зона: /api/v1/sbt-subdomain/metadata/ton/{name}.png

      return await this.sendGroupNotification(message, inlineKeyboard, photoUrl);
    } catch (error) {
      console.error('❌ Ошибка при отправке публичного уведомления о SBT зоне:', error);
      return false;
    }
  }

  // --- ZONE STATUS CHANGED (только владельцу) ---
  async sendZoneStatusChangedNotification(name: string, address: string, status: string, isTestnet: boolean = true): Promise<void> {
    if (!this.isBotAvailable()) {
      console.warn('⚠️ Telegram не настроен. Пропускаем отправку уведомления.');
      return;
    }

    try {
      const network = this.formatNetwork(isTestnet);
      const tonviewerBase = this.getTonviewerUrl(isTestnet);

      const message = `
🔒 <b>SBT ЗОНА ПРЕКРАТИЛА АКТИВНОСТЬ!</b>

${network}
🏷️ Название: <code>${name}</code>
📍 Адрес: <a href="${tonviewerBase}/${address}">${address.slice(0, 6)}...${address.slice(-4)}</a>
🎫 Статус изменён на: <code>${status}</code>

⏰ Время завершения работы: ${new Date().toLocaleString('ru-RU')}
      `.trim();

      await this.bot!.sendMessage(this.ownerId, message, {
        parse_mode: 'HTML'
      });

      console.log(`✅ Уведомление о SBT зоне отправлено в Telegram (${isTestnet ? 'testnet' : 'mainnet'})`);
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления о SBT зоне:', error);
    }
  }

  // --- АУКЦИОН ---
  async sendPublicAuctionStartedNotification(domain: string, address: string, price: number, isTestnet: boolean = true): Promise<boolean> {
    try {
      const network = this.formatNetwork(isTestnet);
      const tonviewerBase = this.getTonviewerUrl(isTestnet);
      const [subdomainName, zoneName] = DeeplinkUtils.formatDomainForUrl(domain);

      const message = `
⚡ <b>НОВЫЙ АУКЦИОН!</b>

${network}
🌐 Домен: <code>${domain}</code>
👤 Адрес: <a href="${tonviewerBase}/${address}">${address.slice(0, 6)}...${address.slice(-4)}</a>
💰 Стартовая цена: ${price} TON
🎯 Тип: Proxy аукцион

⏰ Время старта: ${new Date().toLocaleString('ru-RU')}
⏰ Завершится через: 59 минут

🎯 Успейте сделать ставку!
      `.trim();

      const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(zoneName as string, subdomainName as string);
      console.log(`Сгенерирована ссылка для перехода в miniapp для аукциона на proxy-субдомен: ${miniAppLink}`);

      const inlineKeyboard = [
        [
          {
            text: '💰 Сделать ставку',
            url: miniAppLink
          }
        ]
      ];

      const photoUrl = this.getNotificationImageUrl(domain, true); // Proxy-субдомен

      return await this.sendGroupNotification(message, inlineKeyboard, photoUrl);
    } catch (error) {
      console.error('❌ Ошибка при отправке публичного уведомления об аукционе:', error);
      return false;
    }
  }

  // --- НОВАЯ СТАВКА ---
  async sendPublicNewBidNotification(domain: string, bidder: string, amount: number, previousBidder: string, isTestnet: boolean = true): Promise<boolean> {
    try {
      const network = this.formatNetwork(isTestnet);
      const tonviewerBase = this.getTonviewerUrl(isTestnet);
      const [subdomainName, zoneName] = DeeplinkUtils.formatDomainForUrl(domain);
      const previousBidderInfo = previousBidder
        ? `\n👤 Предыдущий ставщик: <a href="${tonviewerBase}/${previousBidder}">${previousBidder.slice(0, 6)}...${previousBidder.slice(-4)}</a>`
        : '';

      const message = `
💰 <b>НОВАЯ СТАВКА НА АУКЦИОНЕ!</b>

${network}
🌐 Домен: <code>${domain}</code>
👤 Ставщик: <a href="${tonviewerBase}/${bidder}">${bidder.slice(0, 6)}...${bidder.slice(-4)}</a>
💵 Сумма: ${amount} TON${previousBidderInfo}
🎯 Тип: Proxy аукцион

⏰ Время ставки: ${new Date().toLocaleString('ru-RU')}
      `.trim();

      const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(zoneName as string, subdomainName as string);
      console.log(`Сгенерирована ссылка для перехода в miniapp для аукциона на proxy-субдомен: ${miniAppLink}`);

      const inlineKeyboard = [
        [
          {
            text: '💰 Сделать ставку',
            url: miniAppLink
          }
        ]
      ];

      const photoUrl = this.getNotificationImageUrl(domain, true);

      return await this.sendGroupNotification(message, inlineKeyboard, photoUrl);
    } catch (error) {
      console.error('❌ Ошибка при отправке публичного уведомления о ставке:', error);
      return false;
    }
  }

  // --- SBT СУБДОМЕН СМИНЧЕН ---
  async sendPublicSBTSubdomainMintedNotification(domain: string, address: string, owner: string, price: number, isTestnet: boolean = true): Promise<boolean> {
    try {
      const network = this.formatNetwork(isTestnet);
      const tonviewerBase = this.getTonviewerUrl(isTestnet);

      const message = `
🎫 <b>НОВЫЙ SBT СУБДОМЕН СМИНЧЕН!</b>

${network}
🌐 Домен: <code>${domain}</code>
📍 Адрес: <a href="${tonviewerBase}/${address}">${address.slice(0, 6)}...${address.slice(-4)}</a>
👤 Владелец: <a href="${tonviewerBase}/${owner}">${owner.slice(0, 6)}...${owner.slice(-4)}</a>
💰 Цена: ${price} TON
🔒 Тип: SBT (не для продажи)
⏰ Время минта: ${new Date().toLocaleString('ru-RU')}

🎊 Поздравляем нового владельца!
      `.trim();

      const photoUrl = this.getNotificationImageUrl(domain, false); // SBT-субдомен

      return await this.sendGroupNotification(message, undefined, photoUrl);
    } catch (error) {
      console.error('❌ Ошибка при отправке публичного уведомления о SBT субдомене:', error);
      return false;
    }
  }

  // --- АУКЦИОН ЗАВЕРШЕН ---
  async sendPublicAuctionEndedNotification(domain: string, winner: string, finalPrice: number, isTestnet: boolean = true): Promise<boolean> {
    try {
      const network = this.formatNetwork(isTestnet);
      const tonviewerBase = this.getTonviewerUrl(isTestnet);

      const message = `
🎉 <b>АУКЦИОН ЗАВЕРШЕН!</b>

${network}
🌐 Домен: <code>${domain}</code>
👑 Победитель: <a href="${tonviewerBase}/${winner}">${winner.slice(0, 6)}...${winner.slice(-4)}</a>
🏆 Финальная цена: ${finalPrice} TON

⏰ Время завершения: ${new Date().toLocaleString('ru-RU')}

Поздравляем победителя! 🎊
      `.trim();

      const miniAppLink = DeeplinkUtils.generateMarketLink();
      console.log(`Сгенерирована ссылка для перехода в miniapp для маркета: ${miniAppLink}`);

      const inlineKeyboard = [
        [
          {
            text: '💰 Посмотреть в маркете',
            url: miniAppLink
          }
        ]
      ];

      const photoUrl = this.getNotificationImageUrl(domain, true);

      return await this.sendGroupNotification(message, inlineKeyboard, photoUrl);
    } catch (error) {
      console.error('❌ Ошибка при отправке публичного уведомления о завершении аукциона:', error);
      return false;
    }
  }

  // --- НОВЫЙ ПОЛЬЗОВАТЕЛЬ ---
  async sendPublicNewUserNotification(address: string, isTestnet: boolean = true): Promise<boolean> {
    try {
      const network = this.formatNetwork(isTestnet);
      const tonviewerBase = this.getTonviewerUrl(isTestnet);

      const message = `
👤 <b>НОВЫЙ ПОЛЬЗОВАТЕЛЬ ЗАРЕГИСТРИРОВАН!</b>

${network}
📍 Адрес: <a href="${tonviewerBase}/${address}">${address.slice(0, 6)}...${address.slice(-4)}</a>

⏰ Время регистрации: ${new Date().toLocaleString('ru-RU')}
      `.trim();

      return await this.sendGroupNotification(message);
    } catch (error) {
      console.error('❌ Ошибка при отправке публичного уведомления о пользователе:', error);
      return false;
    }
  }

  // ==================== СТАРЫЕ МЕТОДЫ (ВЛАДЕЛЕЦ + ГРУППА) ====================

  async sendProxyZoneCreatedNotification(name: string, address: string, owner: string, price: number, isTestnet: boolean = true): Promise<void> {
    if (!this.isBotAvailable()) {
      console.warn('⚠️ Telegram не настроен. Пропускаем отправку уведомления.');
      return;
    }

    try {
      const network = this.formatNetwork(isTestnet);
      const tonviewerBase = this.getTonviewerUrl(isTestnet);

      const message = `
🌐 <b>НОВАЯ PROXY ЗОНА СОЗДАНА!</b>

${network}
🏷️ Название: <code>${name}</code>
📍 Адрес: <a href="${tonviewerBase}/${address}">${address.slice(0, 6)}...${address.slice(-4)}</a>
👤 Владелец: <a href="${tonviewerBase}/${owner}">${owner.slice(0, 6)}...${owner.slice(-4)}</a>
💰 Цена: ${price} TON
🛡️ Тип: Proxy (для продажи)


⏰ Время создания: ${new Date().toLocaleString('ru-RU')}

💡 Теперь можно создавать субдомены в этой Proxy-зоне!
      `.trim();

      const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(name, '');
      console.log(`Сгенерирована ссылка для перехода в miniapp для proxy-зоны: ${miniAppLink}`);

      const inlineKeyboard = [
        [
          {
            text: '🔗 Создать субдомен',
            url: miniAppLink
          }
        ]
      ];

      await this.bot!.sendMessage(this.ownerId, message, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: inlineKeyboard }
      });

      await this.sendPublicProxyZoneCreatedNotification(name, address, owner, price, isTestnet);
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления о Proxy зоне:', error);
    }
  }

  async sendSBTZoneCreatedNotification(name: string, address: string, owner: string, price: number, bundleAddress: string, currentID: number, isTestnet: boolean = true): Promise<void> {
    if (!this.isBotAvailable()) {
      console.warn('⚠️ Telegram не настроен. Пропускаем отправку уведомления.');
      return;
    }

    try {
      const network = this.formatNetwork(isTestnet);
      const tonviewerBase = this.getTonviewerUrl(isTestnet);
      const [subdomainName, zoneName] = DeeplinkUtils.formatDomainForUrl(name);

      const message = `
🔒 <b>НОВАЯ SBT ЗОНА СОЗДАНА!</b>

${network}
🏷️ Название: <code>${name}</code>
📍 Адрес домена: <a href="${tonviewerBase}/${address}">${address.slice(0, 6)}...${address.slice(-4)}</a>
👤 Владелец: <a href="${tonviewerBase}/${owner}">${owner.slice(0, 6)}...${owner.slice(-4)}</a>
💰 Цена: ${price} TON
🎫 Тип: SBT (не для продажи)
📦 Адрес коллекции: <a href="${tonviewerBase}/${bundleAddress}">${bundleAddress.slice(0, 6)}...${bundleAddress.slice(-4)}</a>

Это <code>${currentID + 1}</code> по счету зона на этом домене.

⏰ Время создания: ${new Date().toLocaleString('ru-RU')}
      `.trim();

      const inlineKeyboard = [
        [
          {
            text: '🔗 Создать субдомен',
            url: 'https://subdom.zone/#/add-subdomain'
          }
        ]
      ];

      await this.bot!.sendMessage(this.ownerId, message, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: inlineKeyboard }
      });

      console.log(`✅ Уведомление о SBT зоне отправлено в Telegram (${isTestnet ? 'testnet' : 'mainnet'})`);

      await this.sendPublicSBTZoneCreatedNotification(name, address, owner, price, bundleAddress, currentID, isTestnet);
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления о SBT зоне:', error);
    }
  }

  async sendAuctionStartedNotification(domain: string, address: string, price: number, isTestnet: boolean = true): Promise<void> {
    if (!this.isBotAvailable()) {
      console.warn('⚠️ Telegram не настроен. Пропускаем отправку уведомления.');
      return;
    }

    try {
      const network = this.formatNetwork(isTestnet);
      const tonviewerBase = this.getTonviewerUrl(isTestnet);
      const [subdomainName, zoneName] = DeeplinkUtils.formatDomainForUrl(domain);

      const message = `
⚡ <b>НОВЫЙ АУКЦИОН!</b>

${network}
🌐 Домен: <code>${domain}</code>
👤 Владелец: <a href="${tonviewerBase}/${address}">${address.slice(0, 6)}...${address.slice(-4)}</a>
💰 Стартовая цена: ${price} TON
🎯 Тип: Proxy аукцион

⏰ Время старта: ${new Date().toLocaleString('ru-RU')}
⏰ Завершится через: 59 минут

🎯 Успейте сделать ставку!
      `.trim();

      const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(zoneName as string, subdomainName as string);

      const inlineKeyboard = [
        [
          {
            text: '💰 Сделать ставку',
            url: miniAppLink,
          }
        ]
      ];

      await this.bot!.sendMessage(this.ownerId, message, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: inlineKeyboard }
      });

      console.log(`✅ Уведомление о старте аукциона отправлено в Telegram (${isTestnet ? 'testnet' : 'mainnet'})`);

      await this.sendPublicAuctionStartedNotification(domain, address, price, isTestnet);
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления о старте аукциона:', error);
    }
  }

  async sendNewBidNotification(domain: string, bidder: string, amount: number, previousBidder: string, isTestnet: boolean = true): Promise<void> {
    if (!this.isBotAvailable()) {
      console.warn('⚠️ Telegram не настроен. Пропускаем отправку уведомления.');
      return;
    }

    try {
      const network = this.formatNetwork(isTestnet);
      const tonviewerBase = this.getTonviewerUrl(isTestnet);
      const [subdomainName, zoneName] = DeeplinkUtils.formatDomainForUrl(domain);
      const previousBidderInfo = previousBidder
        ? `\n👤 Предыдущий ставщик: <a href="${tonviewerBase}/${previousBidder}">${previousBidder.slice(0, 6)}...${previousBidder.slice(-4)}</a>`
        : '';

      const message = `
💰 <b>НОВАЯ СТАВКА НА АУКЦИОНЕ!</b>

${network}
🌐 Домен: <code>${domain}</code>
👤 Ставщик: <a href="${tonviewerBase}/${bidder}">${bidder.slice(0, 6)}...${bidder.slice(-4)}</a>
💵 Сумма: ${amount} TON${previousBidderInfo}

⏰ Время ставки: ${new Date().toLocaleString('ru-RU')}
      `.trim();

      const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(zoneName as string, subdomainName as string);
      console.log(`Сгенерирована ссылка для перехода в miniapp для аукциона на proxy-субдомен: ${miniAppLink}`);

      const inlineKeyboard = [
        [
          {
            text: '💰 Сделать ставку',
            url: miniAppLink
          }
        ]
      ];

      await this.bot!.sendMessage(this.ownerId, message, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: inlineKeyboard }
      });

      console.log(`✅ Уведомление о новой ставке отправлено в Telegram (${isTestnet ? 'testnet' : 'mainnet'})`);

      await this.sendPublicNewBidNotification(domain, bidder, amount, previousBidder, isTestnet);
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления о ставке:', error);
    }
  }

  async sendSBTSubdomainMintedNotification(domain: string, address: string, owner: string, price: number, isTestnet: boolean = true): Promise<void> {
    if (!this.isBotAvailable()) {
      console.warn('⚠️ Telegram не настроен. Пропускаем отправку уведомления.');
      return;
    }

    try {
      const network = this.formatNetwork(isTestnet);
      const tonviewerBase = this.getTonviewerUrl(isTestnet);

      const message = `
🎫 <b>НОВЫЙ SBT СУБДОМЕН СМИНЧЕН!</b>

${network}
🌐 Домен: <code>${domain}</code>
📍 Адрес: <a href="${tonviewerBase}/${address}">${address.slice(0, 6)}...${address.slice(-4)}</a>
👤 Владелец: <a href="${tonviewerBase}/${owner}">${owner.slice(0, 6)}...${owner.slice(-4)}</a>
💰 Цена: ${price} TON

⏰ Время минта: ${new Date().toLocaleString('ru-RU')}
      `.trim();

      await this.bot!.sendMessage(this.ownerId, message, {
        parse_mode: 'HTML'
      });

      console.log(`✅ Уведомление о SBT субдомене отправлено в Telegram (${isTestnet ? 'testnet' : 'mainnet'})`);

      await this.sendPublicSBTSubdomainMintedNotification(domain, address, owner, price, isTestnet);
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления о SBT субдомене:', error);
    }
  }

  async sendAuctionEndedNotification(domain: string, winner: string, finalPrice: number, isTestnet: boolean = true): Promise<void> {
    if (!this.isBotAvailable()) {
      console.warn('⚠️ Telegram не настроен. Пропускаем отправку уведомления.');
      return;
    }

    try {
      const network = this.formatNetwork(isTestnet);
      const tonviewerBase = this.getTonviewerUrl(isTestnet);

      const message = `
🎉 <b>АУКЦИОН ЗАВЕРШЕН!</b>

${network}
🌐 Домен: <code>${domain}</code>
👑 Победитель: <a href="${tonviewerBase}/${winner}">${winner.slice(0, 6)}...${winner.slice(-4)}</a>
🏆 Финальная цена: ${finalPrice} TON

⏰ Время завершения: ${new Date().toLocaleString('ru-RU')}
      `.trim();

      const miniAppLink = DeeplinkUtils.generateMarketLink();
      console.log(`Сгенерирована ссылка для перехода в miniapp для маркета: ${miniAppLink}`);

      const inlineKeyboard = [
        [
          {
            text: '💰 Посмотреть в маркете',
            url: miniAppLink
          }
        ]
      ];

      await this.bot!.sendMessage(this.ownerId, message, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: inlineKeyboard }
      });

      console.log(`✅ Уведомление о завершении аукциона отправлено в Telegram (${isTestnet ? 'testnet' : 'mainnet'})`);

      await this.sendPublicAuctionEndedNotification(domain, winner, finalPrice, isTestnet);
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления о завершении аукциона:', error);
    }
  }

  async sendNewUserNotification(address: string, isTestnet: boolean = true): Promise<void> {
    if (!this.isBotAvailable()) {
      console.warn('⚠️ Telegram не настроен. Пропускаем отправку уведомления.');
      return;
    }

    try {
      const network = this.formatNetwork(isTestnet);
      const tonviewerBase = this.getTonviewerUrl(isTestnet);

      const message = `
👤 <b>НОВЫЙ ПОЛЬЗОВАТЕЛЬ ЗАРЕГИСТРИРОВАН!</b>

${network}
📍 Адрес: <a href="${tonviewerBase}/${address}">${address.slice(0, 6)}...${address.slice(-4)}</a>

⏰ Время регистрации: ${new Date().toLocaleString('ru-RU')}
      `.trim();

      await this.bot!.sendMessage(this.ownerId, message, {
        parse_mode: 'HTML'
      });

      console.log(`✅ Уведомление о новом пользователе отправлено в Telegram (${isTestnet ? 'testnet' : 'mainnet'})`);

      await this.sendPublicNewUserNotification(address, isTestnet);
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления о пользователе:', error);
    }
  }

  // ==================== МЕТОДЫ ДЛЯ РАБОТЫ С ЧАТАМИ ====================

  getChatHistory(domain: string, userAddress: string, isTestnet: boolean = true): any[] {
    try {
      const db = this.getDatabase(isTestnet);

      const chat = db.prepare('SELECT * FROM chats WHERE domain = ? AND userAddress = ?').get(domain, userAddress) as any;

      if (!chat) {
        return [];
      }

      const messages = db.prepare('SELECT * FROM messages WHERE chatId = ? ORDER BY timestamp ASC').all(chat.id) as any[];

      return messages;
    } catch (error) {
      console.error('❌ Ошибка при получении истории чата:', error);
      return [];
    }
  }

  saveUserMessage(domain: string, userAddress: string, messageText: string, isTestnet: boolean = true): boolean {
    try {
      const db = this.getDatabase(isTestnet);

      let chat = db.prepare('SELECT * FROM chats WHERE domain = ? AND userAddress = ?').get(domain, userAddress) as any;

      if (!chat) {
        const stmt = db.prepare(`
          INSERT INTO chats (domain, userAddress)
          VALUES (?, ?)
          RETURNING *
        `);

        chat = stmt.get(domain, userAddress);
      }

      const messageId = Math.random().toString(36).substring(2, 15);
      db.prepare('INSERT INTO messages (id, chatId, sender, text) VALUES (?, ?, ?, ?)')
        .run(messageId, chat.id, 'user', messageText);

      db.prepare('UPDATE chats SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?')
        .run(chat.id);

      console.log(`✅ Сообщение пользователя сохранено в БД для чата ${domain} (${isTestnet ? 'testnet' : 'mainnet'})`);
      return true;
    } catch (error) {
      console.error('❌ Ошибка при сохранении сообщения пользователя в БД:', error);
      return false;
    }
  }

  getActiveChats(isTestnet: boolean = true): any[] {
    try {
      const db = this.getDatabase(isTestnet);

      const chats = db.prepare(`
        SELECT c.*,
               (SELECT COUNT(*) FROM messages m WHERE m.chatId = c.id) as messageCount,
               (SELECT MAX(timestamp) FROM messages m WHERE m.chatId = c.id) as lastMessageTime
        FROM chats c
        WHERE c.status = 'active'
        ORDER BY c.updatedAt DESC
      `).all() as any[];

      return chats;
    } catch (error) {
      console.error('❌ Ошибка при получении активных чатов:', error);
      return [];
    }
  }

  closeChat(domain: string, userAddress: string, isTestnet: boolean = true): boolean {
    try {
      const db = this.getDatabase(isTestnet);

      const result = db.prepare('UPDATE chats SET status = "closed", updatedAt = CURRENT_TIMESTAMP WHERE domain = ? AND userAddress = ?')
        .run(domain, userAddress);

      if (result.changes > 0) {
        console.log(`✅ Чат ${domain} - ${userAddress} закрыт (${isTestnet ? 'testnet' : 'mainnet'})`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Ошибка при закрытии чата:', error);
      return false;
    }
  }

  // ==================== УВЕДОМЛЕНИЯ О ПЛАТЕЖАХ ====================

  async sendPaymentRecordedNotification(
    address: string,
    zoneType: string,
    length: number,
    isTestnet: boolean = true
  ): Promise<void> {
    if (!this.isBotAvailable()) {
      console.warn('⚠️ Telegram не настроен. Пропускаем отправку уведомления.');
      return;
    }

    try {
      const network = this.formatNetwork(isTestnet);
      const tonviewerBase = this.getTonviewerUrl(isTestnet);
      const zoneTypeText = zoneType === 'proxy' ? 'Proxy' : 'SBT';
      const formattedLength = length === 9 ? '9+' : String(length);

      const message = `
💰 <b>ОПЛАЧЕННАЯ ПОПЫТКА ДОБАВЛЕНА!</b>

${network}
👤 Адрес: <a href="${tonviewerBase}/${address}">${address.slice(0, 6)}...${address.slice(-4)}</a>
🏷️ Тип зоны: ${zoneTypeText}
📏 Длина: ${formattedLength} символов

⏰ Время: ${new Date().toLocaleString('ru-RU')}

💡 Пользователь оплатил создание ${zoneTypeText.toLowerCase()}-зоны длиной ${formattedLength} символов.
Теперь он может создать зону без повторной оплаты.
    `.trim();

      await this.bot!.sendMessage(this.ownerId, message, {
        parse_mode: 'HTML'
      });

      console.log(`✅ Уведомление об оплаченной попытке отправлено владельцу (${isTestnet ? 'testnet' : 'mainnet'})`);

      await this.sendPublicPaymentRecordedNotification(address, zoneType, length, isTestnet);
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления об оплаченной попытке:', error);
    }
  }

  async sendPublicPaymentRecordedNotification(
    address: string,
    zoneType: string,
    length: number,
    isTestnet: boolean = true
  ): Promise<boolean> {
    try {
      const network = this.formatNetwork(isTestnet);
      const tonviewerBase = this.getTonviewerUrl(isTestnet);
      const zoneTypeText = zoneType === 'proxy' ? 'Proxy' : 'SBT';
      const formattedLength = length === 9 ? '9+' : String(length);

      const message = `
💰 <b>НОВАЯ ОПЛАЧЕННАЯ ПОПЫТКА!</b>

${network}
👤 Адрес: <a href="${tonviewerBase}/${address}">${address.slice(0, 6)}...${address.slice(-4)}</a>
🏷️ Тип зоны: ${zoneTypeText}
📏 Длина: ${formattedLength} символов

⏰ Время: ${new Date().toLocaleString('ru-RU')}

🎯 Пользователь оплатил создание ${zoneTypeText.toLowerCase()}-зоны!
    `.trim();

      return await this.sendGroupNotification(message);
    } catch (error) {
      console.error('❌ Ошибка при отправке публичного уведомления об оплаченной попытке:', error);
      return false;
    }
  }

  async sendPaymentConsumedNotification(
    address: string,
    zoneType: string,
    length: number,
    isTestnet: boolean = true
  ): Promise<void> {
    if (!this.isBotAvailable()) {
      console.warn('⚠️ Telegram не настроен. Пропускаем отправку уведомления.');
      return;
    }

    try {
      const network = this.formatNetwork(isTestnet);
      const tonviewerBase = this.getTonviewerUrl(isTestnet);
      const zoneTypeText = zoneType === 'proxy' ? 'Proxy' : 'SBT';
      const formattedLength = length === 9 ? '9+' : String(length);

      const message = `
💸 <b>ОПЛАЧЕННАЯ ПОПЫТКА ИСПОЛЬЗОВАНА!</b>

${network}
👤 Адрес: <a href="${tonviewerBase}/${address}">${address.slice(0, 6)}...${address.slice(-4)}</a>
🏷️ Тип зоны: ${zoneTypeText}
📏 Длина: ${formattedLength} символов

⏰ Время: ${new Date().toLocaleString('ru-RU')}

✅ Пользователь использовал оплаченную попытку для создания ${zoneTypeText.toLowerCase()}-зоны.
    `.trim();

      await this.bot!.sendMessage(this.ownerId, message, {
        parse_mode: 'HTML'
      });

      console.log(`✅ Уведомление об использовании оплаченной попытки отправлено владельцу (${isTestnet ? 'testnet' : 'mainnet'})`);

      await this.sendPublicPaymentConsumedNotification(address, zoneType, length, isTestnet);
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления об использовании оплаченной попытки:', error);
    }
  }

  async sendPublicPaymentConsumedNotification(
    address: string,
    zoneType: string,
    length: number,
    isTestnet: boolean = true
  ): Promise<boolean> {
    try {
      const network = this.formatNetwork(isTestnet);
      const tonviewerBase = this.getTonviewerUrl(isTestnet);
      const zoneTypeText = zoneType === 'proxy' ? 'Proxy' : 'SBT';

      const message = `
💸 <b>ОПЛАЧЕННАЯ ПОПЫТКА ИСПОЛЬЗОВАНА!</b>

${network}
👤 Адрес: <a href="${tonviewerBase}/${address}">${address.slice(0, 6)}...${address.slice(-4)}</a>
🏷️ Тип зоны: ${zoneTypeText}
📏 Длина: ${length} символов

⏰ Время: ${new Date().toLocaleString('ru-RU')}

✅ Пользователь создал ${zoneTypeText.toLowerCase()}-зону используя оплаченную попытку!
    `.trim();

      return await this.sendGroupNotification(message);
    } catch (error) {
      console.error('❌ Ошибка при отправке публичного уведомления об использовании оплаченной попытки:', error);
      return false;
    }
  }

  async sendPaymentErrorNotification(
    address: string,
    zoneType: string,
    length: number,
    errorMessage: string,
    isTestnet: boolean = true
  ): Promise<void> {
    if (!this.isBotAvailable()) {
      console.warn('⚠️ Telegram не настроен. Пропускаем отправку уведомления.');
      return;
    }

    try {
      const network = this.formatNetwork(isTestnet);
      const tonviewerBase = this.getTonviewerUrl(isTestnet);
      const zoneTypeText = zoneType === 'proxy' ? 'Proxy' : 'SBT';

      const message = `
❌ <b>ОШИБКА ПРИ ОПЛАТЕ ПОПЫТКИ!</b>

${network}
👤 Адрес: <a href="${tonviewerBase}/${address}">${address.slice(0, 6)}...${address.slice(-4)}</a>
🏷️ Тип зоны: ${zoneTypeText}
📏 Длина: ${length} символов

⚠️ Ошибка: ${errorMessage}

⏰ Время: ${new Date().toLocaleString('ru-RU')}
    `.trim();

      await this.bot!.sendMessage(this.ownerId, message, {
        parse_mode: 'HTML'
      });

      console.log(`✅ Уведомление об ошибке оплаты отправлено владельцу (${isTestnet ? 'testnet' : 'mainnet'})`);
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления об ошибке оплаты:', error);
    }
  }

  // ==================== СТАТИСТИКА ====================

  getChatStats(isTestnet: boolean = true): any {
    try {
      const db = this.getDatabase(isTestnet);

      const stats = db.prepare(`
        SELECT
          COUNT(*) as totalChats,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeChats,
          SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closedChats,
          (SELECT COUNT(*) FROM messages) as totalMessages,
          (SELECT COUNT(*) FROM messages WHERE sender = 'user') as userMessages,
          (SELECT COUNT(*) FROM messages WHERE sender = 'operator') as operatorMessages
        FROM chats
      `).get() as any;

      return stats;
    } catch (error) {
      console.error('❌ Ошибка при получении статистики чатов:', error);
      return {
        totalChats: 0,
        activeChats: 0,
        closedChats: 0,
        totalMessages: 0,
        userMessages: 0,
        operatorMessages: 0
      };
    }
  }
}

// Создаем и экспортируем экземпляр бота
const telegramBotService = new TelegramBotService();
export default telegramBotService;
