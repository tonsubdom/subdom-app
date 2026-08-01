

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
//       type?: string;  
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

//   // Базы данных
//   private testnetDb: Database.Database;
//   private mainnetDb: Database.Database;

//   private replyContextTimeouts = new Map<number, NodeJS.Timeout>();

//   // Кэш подписок (загружается из БД при старте)
//   private subscriptions: BotSubscription[] = [];

//   constructor() {
//     console.log('🔧 Инициализация Telegram Bot...');
//     console.log('📝 TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? '✅ Установлен' : '❌ Отсутствует');
//     console.log('👤 TELEGRAM_OWNER_ID:', process.env.TELEGRAM_OWNER_ID ? '✅ Установлен' : '❌ Отсутствует');
//     console.log('👥 TELEGRAM_GROUP_ID:', process.env.TELEGRAM_GROUP_ID ? '✅ Установлен' : '❌ Отсутствует');

//     // Инициализируем базы данных
//     this.testnetDb = new Database('nft-domains.db');
//     this.mainnetDb = new Database('nft-domains-mainnet.db');

//     console.log(`💾 Базы данных инициализированы: testnet=${!!this.testnetDb}, mainnet=${!!this.mainnetDb}`);

//     this.testnetDb.pragma('journal_mode = WAL');
//     this.mainnetDb.pragma('journal_mode = WAL');

//     // Инициализируем таблицы чатов
//     this.initializeChatTables();

//     // Инициализируем таблицу подписок
//     this.initializeSubscriptionTable();

//     // Загружаем подписки из БД
//     this.loadSubscriptions();

//     this.initializeBot();
//   }

//   // ==================== ПОДПИСКИ (МУЛЬТИ-ЧАТ) ====================

//   private initializeSubscriptionTable(): void {
//     const dbs = [this.testnetDb, this.mainnetDb];
//     for (const db of dbs) {
//       const exists = db.prepare(
//         `SELECT name FROM sqlite_master WHERE type='table' AND name='bot_subscriptions'`
//       ).get();

//       if (!exists) {
//         db.exec(`
//           CREATE TABLE IF NOT EXISTS bot_subscriptions (
//             id INTEGER PRIMARY KEY AUTOINCREMENT,
//             chatId TEXT NOT NULL,
//             chatType TEXT NOT NULL DEFAULT 'private',
//             subscriptionType TEXT NOT NULL,
//             isActive INTEGER DEFAULT 1,
//             createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
//             UNIQUE(chatId, subscriptionType)
//           );
//         `);
//         console.log('✅ Таблица bot_subscriptions создана');
//       }
//     }
//   }

//   private loadSubscriptions(): void {
//     const db = this.testnetDb;
//     const subs = db.prepare(`SELECT * FROM bot_subscriptions WHERE isActive = 1`).all() as BotSubscription[];
//     this.subscriptions = subs;
//     console.log(`📋 Загружено ${subs.length} активных подписок`);

//     // Восстанавливаем ownerId и groupId из подписок (если не заданы в env)
//     for (const s of subs) {
//       if (s.subscriptionType === 'owner' && !this.ownerId) {
//         this.ownerId = s.chatId;
//       }
//       if (s.subscriptionType === 'public' && !this.groupId) {
//         this.groupId = s.chatId;
//       }
//     }
//   }

//   private addSubscription(chatId: string, chatType: string, subscriptionType: string): void {
//     const db = this.testnetDb;
//     db.prepare(`
//       INSERT OR REPLACE INTO bot_subscriptions (chatId, chatType, subscriptionType, isActive)
//       VALUES (?, ?, ?, 1)
//     `).run(chatId, chatType, subscriptionType);

//     this.loadSubscriptions();
//   }

//   private removeSubscription(chatId: string): void {
//     const db = this.testnetDb;
//     db.prepare(`UPDATE bot_subscriptions SET isActive = 0 WHERE chatId = ?`).run(chatId);
//     this.loadSubscriptions();
//   }

//   // ==================== ИНИЦИАЛИЗАЦИЯ ТАБЛИЦ ЧАТОВ ====================

//   private initializeChatTables(): void {
//     const initializeDb = (db: Database.Database, dbName: string) => {
//       console.log(`💾 Инициализация таблиц в БД: ${dbName}`);

//       const chatsTableExists = db.prepare(
//         `SELECT name FROM sqlite_master WHERE type='table' AND name='chats'`
//       ).get();

//       const messagesTableExists = db.prepare(
//         `SELECT name FROM sqlite_master WHERE type='table' AND name='messages'`
//       ).get();

//       console.log(`💾 Таблица chats существует: ${!!chatsTableExists}`);
//       console.log(`💾 Таблица messages существует: ${!!messagesTableExists}`);

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
//         console.log('✅ Таблица chats создана');
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
//         console.log('✅ Таблица messages создана');
//       }
//     };

//     initializeDb(this.testnetDb, 'testnet');
//     initializeDb(this.mainnetDb, 'mainnet');
//   }

//   // ==================== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ====================

//   private getDatabase(isTestnet: boolean): Database.Database {
//     return isTestnet ? this.testnetDb : this.mainnetDb;
//   }

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
//     return !!(this.bot && this.subscriptions.some(s => s.subscriptionType === 'public' && s.isActive));
//   }

//   private formatNetwork(isTestnet: boolean): string {
//     return isTestnet ? '🔬 <b>Сеть:</b> Testnet' : '🌐 <b>Сеть:</b> Mainnet';
//   }

//   private getTonviewerUrl(isTestnet: boolean): string {
//     return isTestnet ? 'https://testnet.tonviewer.com' : 'https://tonviewer.com';
//   }

//   private formatTonviewerLink(address: string, isTestnet: boolean): string {
//     const base = this.getTonviewerUrl(isTestnet);
//     return `<a href="${base}/${address}">${address.slice(0, 6)}...${address.slice(-4)}</a>`;
//   }

//   private formatDomainForUrl(domain: string): string[] {
//     if (!domain) return [];
//     const parts = domain.split('.');
//     return parts;
//   }

//   /**
//    * Определяет URL картинки для уведомления.
//    * - Для SBT-зоны (имя из 2 частей, proxy=0): /api/v1/sbt-subdomain/metadata/ton/{zoneName}.png
//    * - Для Proxy-зоны (имя из 2 частей, proxy=1): /api/v1/proxy/metadata/ton/{zoneName}.png
//    * - Для SBT-субдомена (имя из 3+ частей, proxy=0): /api/v1/sbt-subdomain/metadata/ton/{zoneName}/{subName}.png
//    * - Для Proxy-субдомена (имя из 3+ частей, proxy=1): /api/v1/subdomain/metadata/ton/{zoneName}/{subName}.png
//    */
//   // private getNotificationImageUrl(name: string, isProxy: boolean): string | null {
//   //   const parts = name.split('.');
//   //   const isZone = parts.length === 2;

//   //   if (isZone) {
//   //     if (isProxy) {
//   //       return `${API_PAYLOAD_URL}/api/v1/proxy/metadata/ton/${name}.png`;
//   //     } else {
//   //       return `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${name}.png`;
//   //     }
//   //   }

//   //   const subName = parts[0];
//   //   const zoneName = parts.slice(1).join('.');

//   //   if (isProxy) {
//   //     return `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${zoneName}/${subName}.png`;
//   //   } else {
//   //     return `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${zoneName}/${subName}.png`;
//   //   }
//   // }

//   private getNotificationImageUrl(name: string, isProxy: boolean): string | null {
//   const parts = name.split('.');
//   const isZone = parts.length === 2;

//   if (isZone) {
//     // Для зоны: убираем .ton из имени, т.к. /ton/ в пути уже это обозначает
//     const zoneNameWithoutTld = parts[0]!; // "pension" из "pension.ton"
//     if (isProxy) {
//       return `${API_PAYLOAD_URL}/api/v1/proxy/metadata/ton/${zoneNameWithoutTld}.png`;
//     } else {
//       return `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${zoneNameWithoutTld}.png`;
//     }
//   }

//   // Для субдомена (3+ частей): sub.zone.ton
//   const subName = parts[0];                        // "mysub"
//   const zoneName = parts.slice(1, -1).join('.');   // "zone" (без .ton!)
//   // Если zoneName пустой (sub.ton), берём subName как зону
//   const effectiveZone = zoneName || parts[0]!;

//   if (isProxy) {
//     return `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${effectiveZone}/${subName}.png`;
//   } else {
//     return `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${effectiveZone}/${subName}.png`;
//   }
// }


//   /**
//    * Отправляет фото с подписью. Если фото не грузится — fallback на текст.
//    */
//   // private async sendPhotoWithCaption(
//   //   chatId: string,
//   //   photoUrl: string,
//   //   caption: string,
//   //   inlineKeyboard?: any
//   // ): Promise<void> {
//   //   try {
//   //     await this.bot!.sendPhoto(chatId, photoUrl, {
//   //       caption,
//   //       parse_mode: 'HTML',
//   //       ...(inlineKeyboard ? { reply_markup: { inline_keyboard: inlineKeyboard } } : {})
//   //     });
//   //   } catch (e) {
//   //     console.warn(`⚠️ Не удалось отправить фото (${photoUrl}), fallback на текст`);
//   //     await this.bot!.sendMessage(chatId, caption, {
//   //       parse_mode: 'HTML',
//   //       ...(inlineKeyboard ? { reply_markup: { inline_keyboard: inlineKeyboard } } : {})
//   //     });
//   //   }
//   // }

//   private async sendPhotoWithCaption(
//   chatId: string,
//   photoUrl: string,
//   caption: string,
//   inlineKeyboard?: any
// ): Promise<void> {
//   try {
//     await (this.bot! as any).sendPhoto(chatId, photoUrl, {
//       caption,
//       parse_mode: 'HTML',
//       ...(inlineKeyboard ? { reply_markup: { inline_keyboard: inlineKeyboard } } : {})
//     });
//   } catch (e) {
//     console.warn(`⚠️ Не удалось отправить фото (${photoUrl}), fallback на текст`);
//     await this.bot!.sendMessage(chatId, caption, {
//       parse_mode: 'HTML',
//       ...(inlineKeyboard ? { reply_markup: { inline_keyboard: inlineKeyboard } } : {})
//     });
//   }
// }


//   // ==================== ИНИЦИАЛИЗАЦИЯ БОТА ====================

//   private initializeBot(): void {
//     const token = process.env.TELEGRAM_BOT_TOKEN;

//     if (!token) {
//       console.warn('⚠️ TELEGRAM_BOT_TOKEN не установлен. Telegram бот отключен.');
//       return;
//     }

//     try {
//       this.bot = new TelegramBot(token, {
//         polling: true
//       });

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
//         `🤖 <b>Бот поддержки Subdom (TON DNS Subdomains) запущен!</b>\n\nСтатус: <b>✅ Активен</b>\nВремя: ${new Date().toLocaleString('ru-RU')}\nБазы данных: ✅ Testnet, ✅ Mainnet\nПодписок: ${this.subscriptions.length}`,
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

//     // Отладка всех сообщений
//     this.bot.on('message', (msg: TelegramMessage) => {
//       console.log(`📨 [DEBUG] Сообщение получено: chatId=${msg.chat.id}, text=${msg.text?.substring(0, 50)}`);
//     });

//     // /start — с меню команд и инструкцией по подписке
// //     this.bot.onText(/\/start/, (msg: TelegramMessage) => {
// //       const chatId = msg.chat.id;
// //       const isSubscribed = this.subscriptions.some(s => s.chatId === chatId.toString() && s.isActive);

// //       const startMessage = `
// // 🤖 <b>Subdom Bot — TON DNS Subdomains</b>

// // Этот бот отправляет уведомления о:
// // • Новых Proxy-зонах и SBT-зонах
// // • Сминченных субдоменах
// // • Аукционах и ставках
// // • Новых пользователях
// // • Сообщениях от клиентов (для техподдержки)

// // <b>📋 Доступные команды:</b>
// // /subscribe — подписаться на уведомления
// // /unsubscribe — отписаться
// // /status — статус подписки и системы
// // /network — информация о сетях

// // 📌 <b>Как подписаться:</b>
// // 1. Нажмите /subscribe или кнопку «✅ Подписаться» ниже
// // 2. Для владельца: бот сам определит вас как owner (если ваш ID совпадает с TELEGRAM_OWNER_ID)
// // 3. Для каналов: добавьте бота в канал, дайте права админа и нажмите /subscribe

// // 🔗 <b>Веб-приложение:</b> ${DeeplinkUtils.generateHomeLink()}

// // <b>Статус подписки:</b> ${isSubscribed ? '✅ Активна' : '❌ Не подписан'}
// //       `.trim();

// //       const inlineKeyboard = [
// //         [
// //           { text: '✅ Подписаться', callback_data: 'cmd_subscribe' },
// //           { text: '❌ Отписаться', callback_data: 'cmd_unsubscribe' }
// //         ],
// //         [
// //           { text: '📊 Статус', callback_data: 'cmd_status' },
// //           { text: '🌐 Сеть', callback_data: 'cmd_network' }
// //         ],
// //         [
// //           { text: '🔗 Открыть Subdom', url: DeeplinkUtils.generateHomeLink() }
// //         ]
// //       ];

// //       this.bot!.sendMessage(chatId, startMessage, {
// //         parse_mode: 'HTML',
// //         reply_markup: { inline_keyboard: inlineKeyboard }
// //       });
// //     });
// this.bot.onText(/\/start/, (msg: TelegramMessage) => {
//   const chatId = msg.chat.id;
//   const isSubscribed = this.subscriptions.some(s => s.chatId === chatId.toString() && s.isActive);

//   const startMessage = `
// 🤖 <b>Subdom Bot — TON DNS Subdomains</b>

// Этот бот отправляет уведомления о:
// • Новых Proxy-зонах и SBT-зонах
// • Сминченных субдоменах
// • Аукционах и ставках
// • Новых пользователях
// • Сообщениях от клиентов (для техподдержки)

// <b>📋 Доступные команды:</b>
// /subscribe — подписаться на уведомления
// /unsubscribe — отписаться
// /status — статус подписки и системы


// 📌 <b>Как подписаться:</b>
// Нажмите /subscribe или кнопку «✅ Подписаться» ниже

// 🔗 <b>Веб-приложение:</b> ${DeeplinkUtils.generateHomeLink()}

// <b>Статус подписки:</b> ${isSubscribed ? '✅ Активна' : '❌ Не подписан'}
//       `.trim();

//   const inlineKeyboard = [
//     [
//       { text: '🔗 Открыть Subdom', url: DeeplinkUtils.generateHomeLink() }
//     ],
//     [
//       { text: '🔌 Подключить к чату', callback_data: 'cmd_connect_chat' }
//     ],
//     [
//       { text: '✅ Подписаться', callback_data: 'cmd_subscribe' },
//       { text: '❌ Отписаться', callback_data: 'cmd_unsubscribe' }
//     ],
//     [
//       { text: '📊 Статус', callback_data: 'cmd_status' },
//     ],
    
//   ];

//   this.bot!.sendMessage(chatId, startMessage, {
//     parse_mode: 'HTML',
//     reply_markup: { inline_keyboard: inlineKeyboard }
//   });
// });


//     // /subscribe
//     this.bot.onText(/\/subscribe/, (msg: TelegramMessage) => {
//       const chatId = msg.chat.id.toString();
//       const chatType = (msg.chat as any).type || 'private';
//       const subType = chatId === this.ownerId ? 'owner' : 'public';
//       this.addSubscription(chatId, chatType, subType);
//       this.bot!.sendMessage(msg.chat.id, `✅ Вы подписаны на уведомления как <b>${subType}</b>.\n\nТеперь вы будете получать:\n• Уведомления о новых зонах\n• Уведомления о субдоменах\n• Уведомления об аукционах и ставках\n• Уведомления о новых пользователях`, { parse_mode: 'HTML' });
//     });

//     // /unsubscribe
//     this.bot.onText(/\/unsubscribe/, (msg: TelegramMessage) => {
//       this.removeSubscription(msg.chat.id.toString());
//       this.bot!.sendMessage(msg.chat.id, '❌ Вы отписались от уведомлений. Чтобы снова подписаться, используйте /subscribe');
//     });

//     // /statuss
//     this.bot.onText(/\/status/, (msg: TelegramMessage) => {
//       const chatId = msg.chat.id.toString();
//       const subs = this.subscriptions.filter(s => s.chatId === chatId);
//       const allSubs = this.subscriptions.map(s => `• <code>${s.chatId}</code> (${s.chatType}, ${s.subscriptionType})`).join('\n');

//       this.bot!.sendMessage(
//         msg.chat.id,
//         `📊 <b>Статус системы</b>\n\nБот: <b>✅ Активен</b>\nВладелец: <code>${this.ownerId || 'не установлен'}</code>\nВаш ID: <code>${chatId}</code>\nПодписан: ${subs.length > 0 ? '✅ Да' : '❌ Нет'}\n\n<b>Все активные подписки (${this.subscriptions.length}):</b>\n${allSubs || 'нет'}\n\nВремя: ${new Date().toLocaleString('ru-RU')}`,
//         { parse_mode: 'HTML' }
//       );
//     });


//     // callback_query — обрабатываем кнопки меню
//     this.bot.on('callback_query', async (callbackQuery: TelegramCallbackQuery) => {
//       try {
//         const data = callbackQuery.data;
//         const chatId = callbackQuery.message?.chat.id;
//         const messageId = callbackQuery.message?.message_id;

//         if (!data || !chatId || !messageId) return;

//         console.log(`📨 Callback получен: ${data}`);

//         // Кнопки меню
//         if (data === 'cmd_subscribe') {
//           const chatType = callbackQuery.message?.chat.type || 'private';
//           // const chatType = (callbackQuery.message?.chat as any)?.type || 'private';
//           const subType = chatId.toString() === this.ownerId ? 'owner' : 'public';
//           this.addSubscription(chatId.toString(), chatType, subType);
//           await this.bot!.sendMessage(chatId, `✅ Вы подписаны на уведомления как <b>${subType}</b>.\n\nТеперь вы будете получать:\n• Уведомления о новых зонах\n• Уведомления о субдоменах\n• Уведомления об аукционах и ставках\n• Уведомления о новых пользователях`, { parse_mode: 'HTML' });
//         } else if (data === 'cmd_unsubscribe') {
//           this.removeSubscription(chatId.toString());
//           await this.bot!.sendMessage(chatId, '❌ Вы отписались от уведомлений. Используйте /subscribe чтобы подписаться снова.');
//         } else if (data === 'cmd_status') {
//           const subs = this.subscriptions.filter(s => s.chatId === chatId.toString());
//           const allSubs = this.subscriptions.map(s => `• <code>${s.chatId}</code> (${s.chatType}, ${s.subscriptionType})`).join('\n');
//           await this.bot!.sendMessage(chatId, `📊 <b>Статус</b>\n\nВаш ID: <code>${chatId}</code>\nПодписан: ${subs.length > 0 ? '✅ Да' : '❌ Нет'}\n\n<b>Все подписки (${this.subscriptions.length}):</b>\n${allSubs || 'нет'}\n\nВремя: ${new Date().toLocaleString('ru-RU')}`, { parse_mode: 'HTML' });
//         } else if (data === 'cmd_connect_chat') {
//   const instructions = `
// 🔌 <b>Как подключить бота к чату/каналу</b>

// 1️⃣ <b>Добавьте бота в чат:</b>
//    • Откройте чат/канал → «Управление» → «Администраторы»
//    • Нажмите «Добавить администратора»
//    • Найдите @subdom

// 2️⃣ <b>Выдайте права:</b>
//    • ✅ Отправка сообщений
//    • ✅ Закрепление сообщений (опционально)

// 3️⃣ <b>Активируйте подписку:</b>
//    • В чате/канале напишите /subscribe
//    • Бот начнёт отправлять уведомления в этот чат

// 4️⃣ <b>Проверьте:</b>
//    • Команда /status покажет все активные подписки

// ⚠️ <b>Важно:</b> Бот должен быть администратором для отправки сообщений в чат/канал.
//   `.trim();
//   await this.bot!.sendMessage(chatId, instructions, { parse_mode: 'HTML' });
// }

        
//         else if (data.startsWith('reply_')) {
//           await this.handleReplyCallback(callbackQuery);
//         }

//         await this.bot!.answerCallbackQuery(callbackQuery.id);
//       } catch (error) {
//         console.error('❌ Ошибка при обработке callback:', error);
//       }
//     });

//     // Обработчик текстовых сообщений (для ответов техподдержки)
//     this.bot.on('message', async (msg: any) => {
//       try {
//         // Пропускаем команды — их обрабатывают onText-обработчики
//         if (msg.text && msg.text.startsWith('/')) return;

//         console.log(`📨 Получено сообщение в чате ${msg.chat.id}: ${msg.text?.substring(0, 50)}...`);

//         const context = this.replyContext.get(msg.chat.id);

//         if (context && msg.text) {
//           console.log(`✅ Найден активный контекст! Обрабатываем как ответ техподдержки...`);
//           await this.handleSupportReply(msg);
//         } else if (msg.reply_to_message && msg.text) {
//           console.log(`📨 Это ответ на сообщение ${msg.reply_to_message.message_id}`);
//           await this.handleSupportReply(msg);
//         } else {
//           console.log(`❌ Нет активного контекста и не ответ на сообщение`);

//           if (msg.chat.id.toString() === this.ownerId && msg.text) {
//             console.log(`ℹ️ Сообщение от владельца без контекста: ${msg.text}`);
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

//   // ==================== ОБРАБОТКА REPLY / SUPPORT ====================

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
//     if (parts.length !== 2 || parts[0] !== 'reply') {
//       console.error('❌ Неверный формат callback_data:', data);
//       return;
//     }

//     const contextId = parts[1];
//     if (!contextId) {
//       console.error('❌ contextId не определен');
//       return;
//     }
//     const context = this.messageContexts.get(contextId);

//     if (!context) {
//       console.error('❌ Контекст не найден для ID:', contextId);
//       if (this.bot) {
//         await this.bot.sendMessage(chatId, '❌ Контекст сообщения устарел или не найден.', {
//           parse_mode: 'HTML'
//         });
//       }
//       return;
//     }

//     const { domain, userAddress, isTestnet } = context;

//     console.log(`💬 Обработка ответа для: ${domain} - ${userAddress} (${isTestnet ? 'testnet' : 'mainnet'})`);

//     this.replyContext.set(chatId, { domain, userAddress, isTestnet });

//     if (this.replyContextTimeouts.has(chatId)) {
//       clearTimeout(this.replyContextTimeouts.get(chatId)!);
//     }

//     const timeout = setTimeout(() => {
//       console.log(`⏰ Таймаут контекста для чата ${chatId}`);
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
//   `.trim();

//     if (this.bot) {
//       await this.bot.sendMessage(chatId, instruction, {
//         parse_mode: 'HTML',
//         reply_to_message_id: messageId
//       });
//     }
//   }

//   private async handleSupportReply(msg: any): Promise<void> {
//     try {
//       const chatId = msg.chat.id;
//       const replyText = msg.text;

//       if (!replyText) {
//         if (this.bot) await this.bot.sendMessage(chatId, '❌ Сообщение не содержит текста');
//         return;
//       }

//       const context = this.replyContext.get(chatId);
//       if (!context) {
//         if (this.bot) {
//           await this.bot.sendMessage(chatId, '❌ Контекст ответа не найден. Используйте кнопку "Ответить" под уведомлением о сообщении.');
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
//         `.trim(), { parse_mode: 'HTML' });
//         }

//         this.replyContext.delete(chatId);
//         if (this.replyContextTimeouts.has(chatId)) {
//           clearTimeout(this.replyContextTimeouts.get(chatId)!);
//           this.replyContextTimeouts.delete(chatId);
//         }
//       } else {
//         if (this.bot) await this.bot.sendMessage(chatId, '❌ Ошибка при сохранении ответа в базу данных');
//       }

//     } catch (error) {
//       console.error('❌ Ошибка при обработке ответа техподдержки:', error);
//     }
//   }

//   // ==================== РАБОТА С БД (ЧАТЫ) ====================

//   private async saveOperatorReplyToDatabase(
//     domain: string, userAddress: string, replyText: string, isTestnet: boolean
//   ): Promise<boolean> {
//     try {
//       const db = this.getDatabase(isTestnet);
//       let chat = db.prepare('SELECT * FROM chats WHERE domain = ? AND userAddress = ?').get(domain, userAddress) as any;

//       if (!chat) {
//         const stmt = db.prepare(`INSERT INTO chats (domain, userAddress) VALUES (?, ?) RETURNING *`);
//         chat = stmt.get(domain, userAddress);
//       }

//       const messageId = Math.random().toString(36).substring(2, 15);
//       db.prepare('INSERT INTO messages (id, chatId, sender, text) VALUES (?, ?, ?, ?)').run(messageId, chat.id, 'operator', replyText);
//       db.prepare('UPDATE chats SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(chat.id);
//       return true;
//     } catch (error) {
//       console.error('❌ Ошибка при сохранении ответа оператора в БД:', error);
//       return false;
//     }
//   }

//   // ==================== УВЕДОМЛЕНИЯ ДЛЯ ВЛАДЕЛЬЦА ====================

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
// 👤 Адрес: ${this.formatTonviewerLink(userAddress, isTestnet)}

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
// 👤 Адрес: ${this.formatTonviewerLink(userAddress, isTestnet)}

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

//   // ==================== ОТПРАВКА В ГРУППУ (ВСЕМ PUBLIC-ПОДПИСЧИКАМ) ====================

//   private async sendGroupNotification(message: string, inlineKeyboard?: any, photoUrl?: string): Promise<boolean> {
//     const publicSubs = this.subscriptions.filter(s => s.subscriptionType === 'public' && s.isActive);

//     if (publicSubs.length === 0) {
//       console.warn('⚠️ Нет активных public-подписок. Пропускаем отправку.');
//       return false;
//     }

//     let sent = false;
//     for (const sub of publicSubs) {
//       try {
//         if (photoUrl) {
//           await this.sendPhotoWithCaption(sub.chatId, photoUrl, message, inlineKeyboard);
//         } else {
//           const options: any = { parse_mode: 'HTML' };
//           if (inlineKeyboard) options.reply_markup = { inline_keyboard: inlineKeyboard };
//           await this.bot!.sendMessage(sub.chatId, message, options);
//         }
//         sent = true;
//       } catch (e) {
//         console.error(`❌ Не удалось отправить в чат ${sub.chatId}`);
//       }
//     }
//     return sent;
//   }

//   // ==================== PUBLIC УВЕДОМЛЕНИЯ (С ТОНВЬЮВЕРОМ И КАРТИНКАМИ) ====================

//   // --- PROXY ЗОНА ---
//   async sendPublicProxyZoneCreatedNotification(name: string, address: string, owner: string, price: number, isTestnet: boolean = true): Promise<boolean> {
//     try {
//       const network = this.formatNetwork(isTestnet);
//       const message = `
// 🌐 <b>НОВАЯ PROXY ЗОНА СОЗДАНА!</b>

// ${network}
// 🏷️ Название: *.<code>${name}</code>
// 📍 Адрес домена: ${this.formatTonviewerLink(address, isTestnet)}
// 👤 Владелец: ${this.formatTonviewerLink(owner, isTestnet)}
// 💰 Цена: ${price} TON
// 🛡️ Тип: Proxy (для продажи)
// ⏰ Время создания: ${new Date().toLocaleString('ru-RU')}

// 💡 Теперь можно создавать субдомены в этой Proxy-зоне!
//       `.trim();

//       const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(name, '');
//       const inlineKeyboard = [[{ text: '🔗 Создать субдомен', url: miniAppLink }]];
//       // const photoUrl = this.getNotificationImageUrl(name, true);
//       const photoUrl = this.getNotificationImageUrl(name, true) ?? undefined;

//       return await this.sendGroupNotification(message, inlineKeyboard, photoUrl);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке публичного уведомления о Proxy зоне:', error);
//       return false;
//     }
//   }

//   // --- BUNDLE DEPLOYED ---
//   async sendPublicBundleDeployedNotification(domain: string, address: string, bundleAddress: string, isTestnet: boolean = true): Promise<boolean> {
//     try {
//       const network = this.formatNetwork(isTestnet);
//       const message = `
// 📦 <b>Создание PROXY-зоны завершено!</b>

// ${network}
// 🌐 Домен: <code>${domain}</code>
// 📍 Адрес коллекции: ${this.formatTonviewerLink(bundleAddress, isTestnet)}
// 👤 Владелец: ${this.formatTonviewerLink(address, isTestnet)}

// ⏰ Время развертывания: ${new Date().toLocaleString('ru-RU')}
// 💡 Теперь можно создавать субдомены в этой Proxy-зоне!
//       `.trim();

//       const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(domain, '');
//       const inlineKeyboard = [[{ text: '🔗 Создать субдомен', url: miniAppLink }]];
//       // const photoUrl = this.getNotificationImageUrl(domain, true);
//       const photoUrl = this.getNotificationImageUrl(domain, true) ?? undefined;

//       return await this.sendGroupNotification(message, inlineKeyboard, photoUrl);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке уведомления о Bundle:', error);
//       return false;
//     }
//   }

//   // --- SBT ЗОНА ---
//   async sendPublicSBTZoneCreatedNotification(name: string, address: string, owner: string, price: number, bundleAddress: string, currentID: number, isTestnet: boolean = true): Promise<boolean> {
//     try {
//       const network = this.formatNetwork(isTestnet);
//       const [subdomainName, zoneName] = DeeplinkUtils.formatDomainForUrl(name);

//       const message = `
// 🔒 <b>НОВАЯ SBT ЗОНА СОЗДАНА!</b>

// ${network}
// 🏷️ Название: <code>${name}</code>
// 📦 Адрес коллекции: ${this.formatTonviewerLink(bundleAddress, isTestnet)}
// 📍 Адрес домена: ${this.formatTonviewerLink(address, isTestnet)}
// 👤 Владелец: ${this.formatTonviewerLink(owner, isTestnet)}
// 💰 Цена: ${price} TON
// 🎫 Тип: SBT (не для продажи)

// Это <code>${currentID + 1}</code> по счету зона на этом домене.
//       `.trim();

//       const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(zoneName as string, subdomainName as string);
//       const inlineKeyboard = [[{ text: '💰 Сделать ставку', url: miniAppLink }]];
//       // const photoUrl = this.getNotificationImageUrl(name, false);
//       const photoUrl = this.getNotificationImageUrl(name, true) ?? undefined;

//       return await this.sendGroupNotification(message, inlineKeyboard, photoUrl);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке публичного уведомления о SBT зоне:', error);
//       return false;
//     }
//   }

//   // --- ZONE STATUS CHANGED (только владельцу) ---
//   async sendZoneStatusChangedNotification(name: string, address: string, status: string, isTestnet: boolean = true): Promise<void> {
//     if (!this.isBotAvailable()) return;

//     try {
//       const network = this.formatNetwork(isTestnet);
//       const message = `
// 🔒 <b>SBT ЗОНА ПРЕКРАТИЛА АКТИВНОСТЬ!</b>

// ${network}
// 🏷️ Название: <code>${name}</code>
// 📍 Адрес: ${this.formatTonviewerLink(address, isTestnet)}
// 🎫 Статус изменён на: <code>${status}</code>

// ⏰ Время завершения работы: ${new Date().toLocaleString('ru-RU')}
//       `.trim();

//       await this.bot!.sendMessage(this.ownerId, message, { parse_mode: 'HTML' });
//     } catch (error) {
//       console.error('❌ Ошибка при отправке уведомления о SBT зоне:', error);
//     }
//   }

//   // --- АУКЦИОН ---
//   async sendPublicAuctionStartedNotification(domain: string, address: string, price: number, isTestnet: boolean = true): Promise<boolean> {
//     try {
//       const network = this.formatNetwork(isTestnet);
//       const [subdomainName, zoneName] = DeeplinkUtils.formatDomainForUrl(domain);

//       const message = `
// ⚡ <b>НОВЫЙ АУКЦИОН!</b>

// ${network}
// 🌐 Домен: <code>${domain}</code>
// 👤 Адрес: ${this.formatTonviewerLink(address, isTestnet)}
// 💰 Стартовая цена: ${price} TON
// 🎯 Тип: Proxy аукцион

// ⏰ Время старта: ${new Date().toLocaleString('ru-RU')}
// ⏰ Завершится через: 59 минут

// 🎯 Успейте сделать ставку!
//       `.trim();

//       const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(zoneName as string, subdomainName as string);
//       const inlineKeyboard = [[{ text: '💰 Сделать ставку', url: miniAppLink }]];
//       // const photoUrl = this.getNotificationImageUrl(domain, true);
//       const photoUrl = this.getNotificationImageUrl(domain, true) ?? undefined;

//       return await this.sendGroupNotification(message, inlineKeyboard, photoUrl);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке публичного уведомления об аукционе:', error);
//       return false;
//     }
//   }

//   // --- НОВАЯ СТАВКА ---
//   async sendPublicNewBidNotification(domain: string, bidder: string, amount: number, previousBidder: string, isTestnet: boolean = true): Promise<boolean> {
//     try {
//       const network = this.formatNetwork(isTestnet);
//       const [subdomainName, zoneName] = DeeplinkUtils.formatDomainForUrl(domain);
//       const previousBidderInfo = previousBidder
//         ? `\n👤 Предыдущий ставщик: ${this.formatTonviewerLink(previousBidder, isTestnet)}`
//         : '';

//       const message = `
// 💰 <b>НОВАЯ СТАВКА НА АУКЦИОНЕ!</b>

// ${network}
// 🌐 Домен: <code>${domain}</code>
// 👤 Ставщик: ${this.formatTonviewerLink(bidder, isTestnet)}
// 💵 Сумма: ${amount} TON${previousBidderInfo}
// 🎯 Тип: Proxy аукцион

// ⏰ Время ставки: ${new Date().toLocaleString('ru-RU')}
//       `.trim();

//       const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(zoneName as string, subdomainName as string);
//       const inlineKeyboard = [[{ text: '💰 Сделать ставку', url: miniAppLink }]];
//       // const photoUrl = this.getNotificationImageUrl(domain, true);
//       const photoUrl = this.getNotificationImageUrl(domain, true) ?? undefined;

//       return await this.sendGroupNotification(message, inlineKeyboard, photoUrl);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке публичного уведомления о ставке:', error);
//       return false;
//     }
//   }

//   // --- SBT СУБДОМЕН СМИНЧЕН ---
//   async sendPublicSBTSubdomainMintedNotification(domain: string, address: string, owner: string, price: number, isTestnet: boolean = true): Promise<boolean> {
//     try {
//       const network = this.formatNetwork(isTestnet);

//       const message = `
// 🎫 <b>НОВЫЙ SBT СУБДОМЕН СМИНЧЕН!</b>

// ${network}
// 🌐 Домен: <code>${domain}</code>
// 📍 Адрес: ${this.formatTonviewerLink(address, isTestnet)}
// 👤 Владелец: ${this.formatTonviewerLink(owner, isTestnet)}
// 💰 Цена: ${price} TON
// 🔒 Тип: SBT (не для продажи)
// ⏰ Время минта: ${new Date().toLocaleString('ru-RU')}

// 🎊 Поздравляем нового владельца!
//       `.trim();

//       // const photoUrl = this.getNotificationImageUrl(domain, false);
//       const photoUrl = this.getNotificationImageUrl(domain, true) ?? undefined;

//       return await this.sendGroupNotification(message, undefined, photoUrl);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке публичного уведомления о SBT субдомене:', error);
//       return false;
//     }
//   }

//   // --- АУКЦИОН ЗАВЕРШЕН ---
//   async sendPublicAuctionEndedNotification(domain: string, winner: string, finalPrice: number, isTestnet: boolean = true): Promise<boolean> {
//     try {
//       const network = this.formatNetwork(isTestnet);

//       const message = `
// 🎉 <b>АУКЦИОН ЗАВЕРШЕН!</b>

// ${network}
// 🌐 Домен: <code>${domain}</code>
// 👑 Победитель: ${this.formatTonviewerLink(winner, isTestnet)}
// 🏆 Финальная цена: ${finalPrice} TON

// ⏰ Время завершения: ${new Date().toLocaleString('ru-RU')}

// Поздравляем победителя! 🎊
//       `.trim();

//       const miniAppLink = DeeplinkUtils.generateMarketLink();
//       const inlineKeyboard = [[{ text: '💰 Посмотреть в маркете', url: miniAppLink }]];
//       // const photoUrl = this.getNotificationImageUrl(domain, true);
//       const photoUrl = this.getNotificationImageUrl(domain, true) ?? undefined;

//       return await this.sendGroupNotification(message, inlineKeyboard, photoUrl);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке публичного уведомления о завершении аукциона:', error);
//       return false;
//     }
//   }

//   // --- НОВЫЙ ПОЛЬЗОВАТЕЛЬ ---
//   async sendPublicNewUserNotification(address: string, isTestnet: boolean = true): Promise<boolean> {
//     try {
//       const network = this.formatNetwork(isTestnet);

//       const message = `
// 👤 <b>НОВЫЙ ПОЛЬЗОВАТЕЛЬ ЗАРЕГИСТРИРОВАН!</b>

// ${network}
// 📍 Адрес: ${this.formatTonviewerLink(address, isTestnet)}

// ⏰ Время регистрации: ${new Date().toLocaleString('ru-RU')}
//       `.trim();

//       return await this.sendGroupNotification(message);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке публичного уведомления о пользователе:', error);
//       return false;
//     }
//   }

//   // ==================== СТАРЫЕ МЕТОДЫ (ВЛАДЕЛЕЦ + ГРУППА) ====================

//   async sendProxyZoneCreatedNotification(name: string, address: string, owner: string, price: number, isTestnet: boolean = true): Promise<void> {
//     if (!this.isBotAvailable()) return;

//     try {
//       const network = this.formatNetwork(isTestnet);
//       const message = `
// 🌐 <b>НОВАЯ PROXY ЗОНА СОЗДАНА!</b>

// ${network}
// 🏷️ Название: <code>${name}</code>
// 📍 Адрес: ${this.formatTonviewerLink(address, isTestnet)}
// 👤 Владелец: ${this.formatTonviewerLink(owner, isTestnet)}
// 💰 Цена: ${price} TON
// 🛡️ Тип: Proxy (для продажи)

// ⏰ Время создания: ${new Date().toLocaleString('ru-RU')}

// 💡 Теперь можно создавать субдомены в этой Proxy-зоне!
//       `.trim();

//       const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(name, '');
//       const inlineKeyboard = [[{ text: '🔗 Создать субдомен', url: miniAppLink }]];

//       await this.bot!.sendMessage(this.ownerId, message, {
//         parse_mode: 'HTML',
//         reply_markup: { inline_keyboard: inlineKeyboard }
//       });

//       await this.sendPublicProxyZoneCreatedNotification(name, address, owner, price, isTestnet);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке уведомления о Proxy зоне:', error);
//     }
//   }

//   async sendSBTZoneCreatedNotification(name: string, address: string, owner: string, price: number, bundleAddress: string, currentID: number, isTestnet: boolean = true): Promise<void> {
//     if (!this.isBotAvailable()) return;

//     try {
//       const network = this.formatNetwork(isTestnet);
//       const [subdomainName, zoneName] = DeeplinkUtils.formatDomainForUrl(name);

//       const message = `
// 🔒 <b>НОВАЯ SBT ЗОНА СОЗДАНА!</b>

// ${network}
// 🏷️ Название: <code>${name}</code>
// 📦 Адрес коллекции: ${this.formatTonviewerLink(bundleAddress, isTestnet)}
// 📍 Адрес домена: ${this.formatTonviewerLink(address, isTestnet)}
// 👤 Владелец: ${this.formatTonviewerLink(owner, isTestnet)}
// 💰 Цена: ${price} TON
// 🎫 Тип: SBT (не для продажи)

// Это <code>${currentID + 1}</code> по счету зона на этом домене.

// ⏰ Время создания: ${new Date().toLocaleString('ru-RU')}
//       `.trim();

//       const inlineKeyboard = [[{ text: '🔗 Создать субдомен', url: 'https://subdom.zone/#/add-subdomain' }]];

//       await this.bot!.sendMessage(this.ownerId, message, {
//         parse_mode: 'HTML',
//         reply_markup: { inline_keyboard: inlineKeyboard }
//       });

//       await this.sendPublicSBTZoneCreatedNotification(name, address, owner, price, bundleAddress, currentID, isTestnet);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке уведомления о SBT зоне:', error);
//     }
//   }

//   async sendAuctionStartedNotification(domain: string, address: string, price: number, isTestnet: boolean = true): Promise<void> {
//     if (!this.isBotAvailable()) return;

//     try {
//       const network = this.formatNetwork(isTestnet);
//       const [subdomainName, zoneName] = DeeplinkUtils.formatDomainForUrl(domain);

//       const message = `
// ⚡ <b>НОВЫЙ АУКЦИОН!</b>

// ${network}
// 🌐 Домен: <code>${domain}</code>
// 👤 Владелец: ${this.formatTonviewerLink(address, isTestnet)}
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
//       const [subdomainName, zoneName] = DeeplinkUtils.formatDomainForUrl(domain);
//       const previousBidderInfo = previousBidder
//         ? `\n👤 Предыдущий ставщик: ${this.formatTonviewerLink(previousBidder, isTestnet)}`
//         : '';

//       const message = `
// 💰 <b>НОВАЯ СТАВКА НА АУКЦИОНЕ!</b>

// ${network}
// 🌐 Домен: <code>${domain}</code>
// 👤 Ставщик: ${this.formatTonviewerLink(bidder, isTestnet)}
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
// 📍 Адрес: ${this.formatTonviewerLink(address, isTestnet)}
// 👤 Владелец: ${this.formatTonviewerLink(owner, isTestnet)}
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
// 👑 Победитель: ${this.formatTonviewerLink(winner, isTestnet)}
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
// 📍 Адрес: ${this.formatTonviewerLink(address, isTestnet)}

// ⏰ Время регистрации: ${new Date().toLocaleString('ru-RU')}
//       `.trim();

//       await this.bot!.sendMessage(this.ownerId, message, { parse_mode: 'HTML' });

//       await this.sendPublicNewUserNotification(address, isTestnet);
//     } catch (error) {
//       console.error('❌ Ошибка при отправке уведомления о пользователе:', error);
//     }
//   }

//   // ==================== МЕТОДЫ ДЛЯ РАБОТЫ С ЧАТАМИ ====================

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
// 👤 Адрес: ${this.formatTonviewerLink(address, isTestnet)}
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
// 👤 Адрес: ${this.formatTonviewerLink(address, isTestnet)}
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
// 👤 Адрес: ${this.formatTonviewerLink(address, isTestnet)}
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
// 👤 Адрес: ${this.formatTonviewerLink(address, isTestnet)}
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
// 👤 Адрес: ${this.formatTonviewerLink(address, isTestnet)}
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

//   // ==================== СТАТИСТИКА ====================

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

// // Создаем и экспортируем экземпляр бота
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
      type?: string;
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
  lang: string;
}

// declare module 'node-telegram-bot-api' {
//   interface TelegramBot {
//     getMe(): Promise<{ id: number; username: string }>;
//   }
// }

declare module 'node-telegram-bot-api' {
  interface TelegramBot {
    getMe(): Promise<{ id: number; username: string }>;
    setMyCommands(commands: Array<{ command: string; description: string }>, opts?: { language_code?: string }): Promise<boolean>;
    setChatMenuButton(opts: { menu_button: { type: 'web_app'; text: string; web_app: { url: string } } }): Promise<boolean>;
  }
}

// const API_PAYLOAD_URL = process.env.VITE_API_SC_PAYLOAD_URL || 'https://api.subdom.zone';

// ==================== ПЕРЕВОДЫ (i18n) ====================

const LANG = {
  ru: {
    // /start
    startTitle: '🤖 <b>Subdom Bot — TON DNS Subdomains</b>',
    startDesc: `Этот бот отправляет уведомления о:
• Новых Proxy-зонах и SBT-зонах
• Сминченных субдоменах
• Аукционах и ставках
• Новых пользователях
• Сообщениях от клиентов (для техподдержки)`,
    startCommands: `<b>📋 Доступные команды:</b>
/subscribe — подписаться на уведомления
/unsubscribe — отписаться
/status — статус подписки и системы`,
    startHowTo: '📌 <b>Как подписаться:</b>\nНажмите /subscribe или кнопку «✅ Подписаться» ниже',
    startWebApp: '<b>Веб-приложение:</b>',
    startSubStatus: '<b>Статус подписки:</b>',
    active: '✅ Активна',
    inactive: '❌ Не подписан',

    // Кнопки меню
    btnSubscribe: '✅ Подписаться',
    btnUnsubscribe: '❌ Отписаться',
    btnStatus: '📊 Статус',
    btnLang: '🇷🇺 RU',
    btnConnectChat: '🔌 Подключить к чату',
    btnOpenSubdom: '🔗 Открыть Subdom',

    // /subscribe
    subscribedAs: '✅ Вы подписаны на уведомления как',
    subWillReceive: 'Теперь вы будете получать:\n• Уведомления о новых зонах\n• Уведомления о субдоменах\n• Уведомления об аукционах и ставках\n• Уведомления о новых пользователях',
    unsubscribed: '❌ Вы отписались от уведомлений. Используйте /subscribe чтобы подписаться снова.',

    // /status
    statusTitle: '📊 <b>Статус системы</b>',
    statusBot: 'Бот',
    statusActive: '✅ Активен',
    statusOwner: 'Владелец',
    statusNotSet: 'не установлен',
    statusYourId: 'Ваш ID',
    statusSubscribed: 'Подписан',
    statusYes: '✅ Да',
    statusNo: '❌ Нет',
    statusAllSubs: 'Все активные подписки',
    statusTime: 'Время',

    // cmd_lang
    langChangedRu: '🇷🇺 Язык изменён на Русский',
    langChangedEn: '🇬🇧 Language switched to English',

    // cmd_connect_chat
    connectTitle: '🔌 <b>Как подключить бота к чату/каналу</b>',
    connectStep1: '1️⃣ <b>Добавьте бота в чат:</b>\n   • Откройте чат/канал → «Управление» → «Администраторы»\n   • Нажмите «Добавить администратора»\n   • Найдите @subdom',
    connectStep2: '2️⃣ <b>Выдайте права:</b>\n   • ✅ Отправка сообщений\n   • ✅ Закрепление сообщений (опционально)',
    connectStep3: '3️⃣ <b>Активируйте подписку:</b>\n   • В чате/канале напишите /subscribe\n   • Бот начнёт отправлять уведомления в этот чат',
    connectStep4: '4️⃣ <b>Проверьте:</b>\n   • Команда /status покажет все активные подписки',
    connectWarning: '⚠️ <b>Важно:</b> Бот должен быть администратором для отправки сообщений в чат/канал.',

    // Уведомления
    proxyZoneCreated: '🌐 <b>НОВАЯ PROXY ЗОНА СОЗДАНА!</b>',
    bundleDeployed: '📦 <b>Создание PROXY-зоны завершено!</b>',
    sbtZoneCreated: '🔒 <b>НОВАЯ SBT ЗОНА СОЗДАНА!</b>',
    sbtZoneDeactivated: '🔒 <b>SBT ЗОНА ПРЕКРАТИЛА АКТИВНОСТЬ!</b>',
    auctionStarted: '⚡ <b>НОВЫЙ АУКЦИОН!</b>',
    newBid: '💰 <b>НОВАЯ СТАВКА НА АУКЦИОНЕ!</b>',
    sbtSubdomainMinted: '🎫 <b>НОВЫЙ SBT СУБДОМЕН СМИНЧЕН!</b>',
    auctionEnded: '🎉 <b>АУКЦИОН ЗАВЕРШЕН!</b>',
    newUser: '👤 <b>НОВЫЙ ПОЛЬЗОВАТЕЛЬ ЗАРЕГИСТРИРОВАН!</b>',
    newMessage: '📨 <b>НОВОЕ СООБЩЕНИЕ ОТ КЛИЕНТА</b>',
    newChat: '🔔 <b>НОВЫЙ ЧАТ!</b>',
    paymentRecorded: '💰 <b>ОПЛАЧЕННАЯ ПОПЫТКА ДОБАВЛЕНА!</b>',
    paymentConsumed: '💸 <b>ОПЛАЧЕННАЯ ПОПЫТКА ИСПОЛЬЗОВАНА!</b>',
    paymentError: '❌ <b>ОШИБКА ПРИ ОПЛАТЕ ПОПЫТКИ!</b>',
    dnsRecordSet: '🔗 <b>DNS-ЗАПИСЬ ПРИВЯЗАНА!</b>',
    dnsRecordDeleted: '🔓 <b>DNS-ЗАПИСЬ ОТВЯЗАНА!</b>',

    // Поля уведомлений
    fieldName: '🏷️ Название',
    fieldDomain: '🌐 Домен',
    fieldRecordType: '📋 Тип записи',
    recordFormatAddress: 'Address',
    recordFormatAdnl: 'ADNL',
    recordFormatBagId: 'BagID',
    btnViewCatalog: '👀 Посмотреть',
    fieldCollectionAddress: '📦 Адрес коллекции',
    fieldDomainAddress: '📍 Адрес домена',
    fieldAddress: '📍 Адрес',
    fieldOwner: '👤 Владелец',
    fieldPrice: '💰 Цена',
    fieldType: '🛡️ Тип',
    fieldTypeProxy: 'Proxy (для продажи)',
    fieldTypeSBT: 'SBT (не для продажи)',
    fieldStatus: '🎫 Статус изменён на',
    fieldBidder: '👤 Ставщик',
    fieldPreviousBidder: '👤 Предыдущий ставщик',
    fieldAmount: '💵 Сумма',
    fieldAuctionType: '🎯 Тип',
    fieldAuctionTypeProxy: 'Proxy аукцион',
    fieldWinner: '👑 Победитель',
    fieldFinalPrice: '🏆 Финальная цена',
    fieldZoneType: '🏷️ Тип зоны',
    fieldLength: '📏 Длина',
    fieldError: '⚠️ Ошибка',
    fieldCreatedAt: '⏰ Время создания',
    fieldDeployedAt: '⏰ Время развертывания',
    fieldStartTime: '⏰ Время старта',
    fieldEndTime: '⏰ Завершится через',
    fieldBidTime: '⏰ Время ставки',
    fieldMintTime: '⏰ Время минта',
    fieldEndedAt: '⏰ Время завершения',
    fieldDeactivatedAt: '⏰ Время завершения работы',
    fieldRegisteredAt: '⏰ Время регистрации',
    fieldTime: '⏰ Время',

    // Подсказки
    hintProxyZone: '💡 Теперь можно создавать субдомены в этой Proxy-зоне!',
    hintAuctionEnds: '59 минут',
    hintHurryUp: '🎯 Успейте сделать ставку!',
    hintCongrats: '🎊 Поздравляем нового владельца!',
    hintCongratsWinner: 'Поздравляем победителя! 🎊',
    hintZoneNumber: 'по счету зона на этом домене.',
    hintPaymentProxy: 'Пользователь оплатил создание proxy-зоны длиной',
    hintPaymentSBT: 'Пользователь оплатил создание sbt-зоны длиной',
    hintPaymentUsed: 'Пользователь использовал оплаченную попытку для создания',
    hintPaymentCreated: 'Пользователь создал',

    // Кнопки уведомлений
    btnCreateSubdomain: '🔗 Создать субдомен',
    btnPlaceBid: '💰 Сделать ставку',
    btnViewMarket: '💰 Посмотреть в маркете',
    btnReply: '↩️ Ответить',

    // Техподдержка
    replyInstruction: '✍️ <b>ОТВЕТИТЬ КЛИЕНТУ</b>',
    replyDomain: '🌐 Домен',
    replyAddress: '👤 Адрес',
    replyNetwork: '🌐 Сеть',
    replyPrompt: '📝 <b>Напишите ответ ниже этим сообщением:</b>\n(Просто ответьте на это сообщение текстом)',
    replySuccess: '✅ <b>ОТВЕТ ОТПРАВЛЕН КЛИЕНТУ И СОХРАНЕН В БАЗУ</b>',
    replyText: '💬 Ваш ответ',
    replySaved: '⏰ Сохранено',
    replyTimeout: '⏰ Контекст ответа истек. Чтобы ответить клиенту, нажмите кнопку "Ответить" заново.',
    replyNotFound: '❌ Контекст сообщения устарел или не найден.',
    replyNoContext: '❌ Контекст ответа не найден. Используйте кнопку "Ответить" под уведомлением о сообщении.',
    replyNoText: '❌ Сообщение не содержит текста',
    replyDbError: '❌ Ошибка при сохранении ответа в базу данных',
    replyHelp: 'ℹ️ Чтобы ответить клиенту, сначала нажмите кнопку "Ответить" под уведомлением о сообщении.',

    // Тестовое уведомление
    testNotification: '🤖 <b>Бот поддержки Subdom (TON DNS Subdomains) запущен!</b>\n\nСтатус: <b>✅ Активен</b>',
  },
  en: {
    // /start
    startTitle: '🤖 <b>Subdom Bot — TON DNS Subdomains</b>',
    startDesc: `This bot sends notifications about:
• New Proxy zones and SBT zones
• Minted subdomains
• Auctions and bids
• New users
• Support messages from clients`,
    startCommands: `<b>📋 Commands:</b>
/subscribe — subscribe to notifications
/unsubscribe — unsubscribe
/status — subscription and system status`,
    startHowTo: '📌 <b>How to subscribe:</b>\nClick /subscribe or the «✅ Subscribe» button below',
    startWebApp: '<b>Web App:</b>',
    startSubStatus: '<b>Subscription:</b>',
    active: '✅ Active',
    inactive: '❌ Not subscribed',

    // Кнопки меню
    btnSubscribe: '✅ Subscribe',
    btnUnsubscribe: '❌ Unsubscribe',
    btnStatus: '📊 Status',
    btnLang: '🇬🇧 EN',
    btnConnectChat: '🔌 Connect to Chat',
    btnOpenSubdom: '🔗 Open Subdom',

    // /subscribe
    subscribedAs: '✅ You are subscribed to notifications as',
    subWillReceive: 'You will now receive:\n• New zone notifications\n• Subdomain notifications\n• Auction and bid notifications\n• New user notifications',
    unsubscribed: '❌ You have unsubscribed. Use /subscribe to subscribe again.',

    // /status
    statusTitle: '📊 <b>System Status</b>',
    statusBot: 'Bot',
    statusActive: '✅ Active',
    statusOwner: 'Owner',
    statusNotSet: 'not set',
    statusYourId: 'Your ID',
    statusSubscribed: 'Subscribed',
    statusYes: '✅ Yes',
    statusNo: '❌ No',
    statusAllSubs: 'All active subscriptions',
    statusTime: 'Time',

    // cmd_lang
    langChangedRu: '🇷🇺 Язык изменён на Русский',
    langChangedEn: '🇬🇧 Language switched to English',

    // cmd_connect_chat
    connectTitle: '🔌 <b>How to connect the bot to a chat/channel</b>',
    connectStep1: '1️⃣ <b>Add the bot:</b>\n   • Open chat/channel → «Manage» → «Administrators»\n   • Click «Add Administrator»\n   • Find @subdom',
    connectStep2: '2️⃣ <b>Grant permissions:</b>\n   • ✅ Send Messages\n   • ✅ Pin Messages (optional)',
    connectStep3: '3️⃣ <b>Activate subscription:</b>\n   • Send /subscribe in the chat/channel\n   • The bot will start sending notifications there',
    connectStep4: '4️⃣ <b>Verify:</b>\n   • /status will show all active subscriptions',
    connectWarning: '⚠️ <b>Important:</b> The bot must be an admin to send messages.',

    // Уведомления
    proxyZoneCreated: '🌐 <b>NEW PROXY ZONE CREATED!</b>',
    bundleDeployed: '📦 <b>Proxy Zone Deployment Complete!</b>',
    sbtZoneCreated: '🔒 <b>NEW SBT ZONE CREATED!</b>',
    sbtZoneDeactivated: '🔒 <b>SBT ZONE DEACTIVATED!</b>',
    auctionStarted: '⚡ <b>NEW AUCTION!</b>',
    newBid: '💰 <b>NEW BID ON AUCTION!</b>',
    sbtSubdomainMinted: '🎫 <b>NEW SBT SUBDOMAIN MINTED!</b>',
    auctionEnded: '🎉 <b>AUCTION ENDED!</b>',
    newUser: '👤 <b>NEW USER REGISTERED!</b>',
    newMessage: '📨 <b>NEW CLIENT MESSAGE</b>',
    newChat: '🔔 <b>NEW CHAT!</b>',
    paymentRecorded: '💰 <b>PAYMENT ATTEMPT ADDED!</b>',
    paymentConsumed: '💸 <b>PAYMENT ATTEMPT USED!</b>',
    paymentError: '❌ <b>PAYMENT ATTEMPT ERROR!</b>',
    dnsRecordSet: '🔗 <b>DNS RECORD LINKED!</b>',
    dnsRecordDeleted: '🔓 <b>DNS RECORD UNLINKED!</b>',

    // Поля уведомлений
    fieldName: '🏷️ Name',
    fieldDomain: '🌐 Domain',
    fieldRecordType: '📋 Record Type',
    recordFormatAddress: 'Address',
    recordFormatAdnl: 'ADNL',
    recordFormatBagId: 'BagID',
    btnViewCatalog: '👀 View',
    fieldCollectionAddress: '📦 Collection Address',
    fieldDomainAddress: '📍 Domain Address',
    fieldAddress: '📍 Address',
    fieldOwner: '👤 Owner',
    fieldPrice: '💰 Price',
    fieldType: '🛡️ Type',
    fieldTypeProxy: 'Proxy (for sale)',
    fieldTypeSBT: 'SBT (non-transferable)',
    fieldStatus: '🎫 Status changed to',
    fieldBidder: '👤 Bidder',
    fieldPreviousBidder: '👤 Previous Bidder',
    fieldAmount: '💵 Amount',
    fieldAuctionType: '🎯 Type',
    fieldAuctionTypeProxy: 'Proxy Auction',
    fieldWinner: '👑 Winner',
    fieldFinalPrice: '🏆 Final Price',
    fieldZoneType: '🏷️ Zone Type',
    fieldLength: '📏 Length',
    fieldError: '⚠️ Error',
    fieldCreatedAt: '⏰ Created',
    fieldDeployedAt: '⏰ Deployed',
    fieldStartTime: '⏰ Started',
    fieldEndTime: '⏰ Ends in',
    fieldBidTime: '⏰ Bid Time',
    fieldMintTime: '⏰ Minted',
    fieldEndedAt: '⏰ Ended',
    fieldDeactivatedAt: '⏰ Deactivated',
    fieldRegisteredAt: '⏰ Registered',
    fieldTime: '⏰ Time',

    // Подсказки
    hintProxyZone: '💡 You can now create subdomains in this Proxy zone!',
    hintAuctionEnds: '59 minutes',
    hintHurryUp: '🎯 Place your bid!',
    hintCongrats: '🎊 Congratulations to the new owner!',
    hintCongratsWinner: 'Congratulations to the winner! 🎊',
    hintZoneNumber: 'zone on this domain.',
    hintPaymentProxy: 'User paid for proxy zone creation, length',
    hintPaymentSBT: 'User paid for sbt zone creation, length',
    hintPaymentUsed: 'User used a paid attempt to create',
    hintPaymentCreated: 'User created',

    // Кнопки уведомлений
    btnCreateSubdomain: '🔗 Create Subdomain',
    btnPlaceBid: '💰 Place Bid',
    btnViewMarket: '💰 View in Market',
    btnReply: '↩️ Reply',

    // Техподдержка
    replyInstruction: '✍️ <b>REPLY TO CLIENT</b>',
    replyDomain: '🌐 Domain',
    replyAddress: '👤 Address',
    replyNetwork: '🌐 Network',
    replyPrompt: '📝 <b>Write your reply below:</b>\n(Just reply to this message with text)',
    replySuccess: '✅ <b>REPLY SENT AND SAVED</b>',
    replyText: '💬 Your reply',
    replySaved: '⏰ Saved',
    replyTimeout: '⏰ Reply context expired. Click "Reply" again under the notification.',
    replyNotFound: '❌ Message context expired or not found.',
    replyNoContext: '❌ Reply context not found. Use the "Reply" button under a message notification.',
    replyNoText: '❌ Message contains no text',
    replyDbError: '❌ Error saving reply to database',
    replyHelp: 'ℹ️ To reply to a client, first click the "Reply" button under a message notification.',

    // Тестовое уведомление
    testNotification: '🤖 <b>Subdom Support Bot (TON DNS Subdomains) started!</b>\n\nStatus: <b>✅ Active</b>',
  }
};

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

  // Telegram startapp допускает только [A-Za-z0-9_-], точка из ".ton" его ломает
  // (ссылка вообще не открывает мини-апп) — отрезаем TLD тут, обратно
  // добавляем в parseStartappParam на фронте (см. miniAppLinks.ts).
  private static stripTonTld(zoneName: string): string {
    return zoneName.replace(/\.ton$/i, '');
  }

  static generateAddSubdomainLink(zoneName: string, subdomainName?: string): string {
    const params: Record<string, string> = { zone: this.stripTonTld(zoneName) };
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
      zone: this.stripTonTld(zoneName),
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

const API_PAYLOAD_URL = process.env.VITE_API_SC_PAYLOAD_URL || 'https://api.subdom.zone';

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
      const hasLang = (db.prepare(`PRAGMA table_info('bot_subscriptions')`).all() as any[]).some((col: any) => col.name === 'lang');

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
            lang TEXT NOT NULL DEFAULT 'ru',
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(chatId, subscriptionType)
          );
        `);
        console.log('✅ Таблица bot_subscriptions создана');
      } else if (!hasLang) {
        db.exec(`ALTER TABLE bot_subscriptions ADD COLUMN lang TEXT NOT NULL DEFAULT 'ru'`);
        console.log('✅ Колонка lang добавлена в bot_subscriptions');
      }
    }
  }

  private loadSubscriptions(): void {
    const db = this.mainnetDb;
    const subs = db.prepare(`SELECT * FROM bot_subscriptions WHERE isActive = 1`).all() as BotSubscription[];
    this.subscriptions = subs;
    console.log(`📋 Загружено ${subs.length} активных подписок`);

    for (const s of subs) {
      if (s.subscriptionType === 'owner' && !this.ownerId) {
        this.ownerId = s.chatId;
      }
      if (s.subscriptionType === 'public' && !this.groupId) {
        this.groupId = s.chatId;
      }
    }
  }

  private async setupBotMenu(): Promise<void> {
  if (!this.bot) return;

  try {
    // --- Русские команды ---
    await this.bot.setMyCommands([
      { command: 'start', description: '🔄 Перезапустить бота / главное меню' },
      { command: 'subscribe', description: '✅ Подписаться на уведомления' },
      { command: 'unsubscribe', description: '❌ Отписаться от уведомлений' },
      { command: 'status', description: '📊 Статус подписки и системы' },
    ], { language_code: 'ru' });

    // --- Английские команды ---
    await this.bot.setMyCommands([
      { command: 'start', description: '🔄 Restart bot / main menu' },
      { command: 'subscribe', description: '✅ Subscribe to notifications' },
      { command: 'unsubscribe', description: '❌ Unsubscribe' },
      { command: 'status', description: '📊 Subscription & system status' },
    ], { language_code: 'en' });

    // --- Кнопка Web App ---
    await (this.bot as any).setChatMenuButton({
  text: '🔗 Открыть Subdom',
  web_app: { url: 'https://subdom.zone' },
});

    console.log('✅ Меню команд и кнопка приложения настроены');
  } catch (error) {
    console.error('❌ Ошибка настройки меню:', error);
  }
}

  private getLang(chatId: string): string {
    const sub = this.subscriptions.find(s => s.chatId === chatId);
    return sub?.lang || 'ru';
  }

  // private setLang(chatId: string, lang: string): void {
  //   const db = this.testnetDb;
  //   db.prepare(`UPDATE bot_subscriptions SET lang = ? WHERE chatId = ? AND isActive = 1`).run(lang, chatId);
  //   this.loadSubscriptions();
  // }

  private setLang(chatId: string, lang: string): void {
  const db = this.mainnetDb;
  const existing = db.prepare(`SELECT id FROM bot_subscriptions WHERE chatId = ?`).get(chatId);
  if (existing) {
    db.prepare(`UPDATE bot_subscriptions SET lang = ? WHERE chatId = ?`).run(lang, chatId);
  } else {
    db.prepare(`INSERT INTO bot_subscriptions (chatId, chatType, subscriptionType, isActive, lang) VALUES (?, 'private', 'public', 0, ?)`).run(chatId, lang);
  }
  this.loadSubscriptions();
}

  private t(chatId: string): typeof LANG.ru {
    const lang = this.getLang(chatId);
    return LANG[lang as 'ru' | 'en'] || LANG.ru;
  }

  private addSubscription(chatId: string, chatType: string, subscriptionType: string): void {
    const db = this.mainnetDb;
    db.prepare(`
      INSERT OR REPLACE INTO bot_subscriptions (chatId, chatType, subscriptionType, isActive, lang)
      VALUES (?, ?, ?, 1, 'ru')
    `).run(chatId, chatType, subscriptionType);

    this.loadSubscriptions();
  }

  private removeSubscription(chatId: string): void {
    const db = this.mainnetDb;
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
    return !!(this.bot && this.subscriptions.some(s => s.subscriptionType === 'public' && s.isActive));
  }

  private formatNetwork(isTestnet: boolean): string {
    return isTestnet ? '🔬 <b>Сеть:</b> Testnet' : '🌐 <b>Сеть:</b> Mainnet';
  }

  private getTonviewerUrl(isTestnet: boolean): string {
    return isTestnet ? 'https://testnet.tonviewer.com' : 'https://tonviewer.com';
  }

  private formatTonviewerLink(address: string, isTestnet: boolean): string {
    const base = this.getTonviewerUrl(isTestnet);
    return `<a href="${base}/${address}">${address.slice(0, 6)}...${address.slice(-4)}</a>`;
  }

  /** URL сгенерированной картинки зоны/субдомена (builder-api generator.py), либо null если имя не распознано. */
  private getNotificationImageUrl(name: string, isProxy: boolean): string | null {
    if (!name) return null;
    const parts = name.replace(/\.ton$/i, '').split('.');

    if (parts.length === 1) {
      // Зона: "pension" из "pension.ton"
      return isProxy
        ? `${API_PAYLOAD_URL}/api/v1/proxy/metadata/ton/${parts[0]}.png`
        : `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${parts[0]}.png`;
    }

    // Субдомен: sub.zone(.ton) — первая часть сабдомен, остальное — зона
    const subName = parts[0];
    const effectiveZone = parts.slice(1).join('.') || parts[0]!;

    return isProxy
      ? `${API_PAYLOAD_URL}/api/v1/subdomain/metadata/ton/${effectiveZone}/${subName}.png`
      : `${API_PAYLOAD_URL}/api/v1/sbt-subdomain/metadata/ton/${effectiveZone}/${subName}.png`;
  }

  /** Отправляет фото с подписью одному чату. Если фото не отправилось (или его нет) — fallback на текст. */
  private async sendPhotoWithCaption(
    chatId: string,
    photoUrl: string | null,
    caption: string,
    inlineKeyboard?: any
  ): Promise<void> {
    const options: any = {
      parse_mode: 'HTML',
      ...(inlineKeyboard ? { reply_markup: { inline_keyboard: inlineKeyboard } } : {}),
    };

    if (photoUrl) {
      try {
        await (this.bot! as any).sendPhoto(chatId, photoUrl, { caption, ...options });
        return;
      } catch (e) {
        console.warn(`⚠️ Не удалось отправить фото (${photoUrl}) в чат ${chatId}, fallback на текст`);
      }
    }

    await this.bot!.sendMessage(chatId, caption, options);
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

      this.setupBotMenu();

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
        `${LANG.ru.testNotification}\nВремя: ${new Date().toLocaleString('ru-RU')}\nБазы данных: ✅ Testnet, ✅ Mainnet\nПодписок: ${this.subscriptions.length}`,
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
      const chatIdStr = chatId.toString();
      const isSubscribed = this.subscriptions.some(s => s.chatId === chatIdStr && s.isActive);
      const $ = this.t(chatIdStr);

      const startMessage = `
${$.startTitle}

${$.startDesc}

${$.startCommands}

${$.startHowTo}

${$.startWebApp} ${DeeplinkUtils.generateHomeLink()}

${$.startSubStatus} ${isSubscribed ? $.active : $.inactive}
      `.trim();

      const inlineKeyboard = [
        [
          { text: $.btnOpenSubdom, url: DeeplinkUtils.generateHomeLink() }
        ],
        [
          { text: $.btnConnectChat, callback_data: 'cmd_connect_chat' }
        ],
        [
          { text: $.btnSubscribe, callback_data: 'cmd_subscribe' },
          { text: $.btnUnsubscribe, callback_data: 'cmd_unsubscribe' }
        ],
        [
          { text: $.btnStatus, callback_data: 'cmd_status' },
          { text: $.btnLang, callback_data: 'cmd_lang' }
        ],
      ];

      this.bot!.sendMessage(chatId, startMessage, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: inlineKeyboard }
      });
    });

    // /subscribe
    this.bot.onText(/\/subscribe/, (msg: TelegramMessage) => {
      const chatId = msg.chat.id.toString();
      const chatType = (msg.chat as any).type || 'private';
      const subType = chatId === this.ownerId ? 'owner' : 'public';
      this.addSubscription(chatId, chatType, subType);
      const $ = this.t(chatId);
      this.bot!.sendMessage(msg.chat.id, `${$.subscribedAs} <b>${subType}</b>.\n\n${$.subWillReceive}`, { parse_mode: 'HTML' });
    });

    // /unsubscribe
    this.bot.onText(/\/unsubscribe/, (msg: TelegramMessage) => {
      const chatId = msg.chat.id.toString();
      this.removeSubscription(chatId);
      const $ = this.t(chatId);
      this.bot!.sendMessage(msg.chat.id, $.unsubscribed);
    });

    // /status
    this.bot.onText(/\/status/, (msg: TelegramMessage) => {
      const chatId = msg.chat.id.toString();
      const subs = this.subscriptions.filter(s => s.chatId === chatId);
      const allSubs = this.subscriptions.map(s => `• <code>${s.chatId}</code> (${s.chatType}, ${s.subscriptionType}, ${s.lang})`).join('\n');
      const $ = this.t(chatId);

      this.bot!.sendMessage(
        msg.chat.id,
        `${$.statusTitle}\n\n${$.statusBot}: <b>${$.statusActive}</b>\n${$.statusOwner}: <code>${this.ownerId || $.statusNotSet}</code>\n${$.statusYourId}: <code>${chatId}</code>\n${$.statusSubscribed}: ${subs.length > 0 ? $.statusYes : $.statusNo}\n\n<b>${$.statusAllSubs} (${this.subscriptions.length}):</b>\n${allSubs || 'нет'}\n\n${$.statusTime}: ${new Date().toLocaleString('ru-RU')}`,
        { parse_mode: 'HTML' }
      );
    });

    // callback_query — обрабатываем кнопки меню
    this.bot.on('callback_query', async (callbackQuery: TelegramCallbackQuery) => {
      try {
        const data = callbackQuery.data;
        const chatId = callbackQuery.message?.chat.id;
        const messageId = callbackQuery.message?.message_id;

        if (!data || !chatId || !messageId) return;

        const chatIdStr = chatId.toString();
        const $ = this.t(chatIdStr);

        console.log(`📨 Callback получен: ${data}`);

        if (data === 'cmd_subscribe') {
          const chatType = callbackQuery.message?.chat.type || 'private';
          const subType = chatIdStr === this.ownerId ? 'owner' : 'public';
          this.addSubscription(chatIdStr, chatType, subType);
          await this.bot!.sendMessage(chatId, `${$.subscribedAs} <b>${subType}</b>.\n\n${$.subWillReceive}`, { parse_mode: 'HTML' });
        } else if (data === 'cmd_unsubscribe') {
          this.removeSubscription(chatIdStr);
          await this.bot!.sendMessage(chatId, $.unsubscribed);
        } else if (data === 'cmd_status') {
          const subs = this.subscriptions.filter(s => s.chatId === chatIdStr);
          const allSubs = this.subscriptions.map(s => `• <code>${s.chatId}</code> (${s.chatType}, ${s.subscriptionType}, ${s.lang})`).join('\n');
          await this.bot!.sendMessage(chatId, `${$.statusTitle}\n\n${$.statusYourId}: <code>${chatId}</code>\n${$.statusSubscribed}: ${subs.length > 0 ? $.statusYes : $.statusNo}\n\n<b>${$.statusAllSubs} (${this.subscriptions.length}):</b>\n${allSubs || 'нет'}\n\n${$.statusTime}: ${new Date().toLocaleString('ru-RU')}`, { parse_mode: 'HTML' });
        } else if (data === 'cmd_lang') {
          const currentLang = this.getLang(chatIdStr);
          const newLang = currentLang === 'ru' ? 'en' : 'ru';
          this.setLang(chatIdStr, newLang);
          const msg = newLang === 'ru' ? LANG.ru.langChangedRu : LANG.en.langChangedEn;
          await this.bot!.sendMessage(chatId, msg);
          await this.setupBotMenu();
        } else if (data === 'cmd_connect_chat') {
          const instructions = `
${$.connectTitle}

${$.connectStep1}

${$.connectStep2}

${$.connectStep3}

${$.connectStep4}

${$.connectWarning}
          `.trim();
          await this.bot!.sendMessage(chatId, instructions, { parse_mode: 'HTML' });
        } else if (data.startsWith('reply_')) {
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
        if (msg.text && msg.text.startsWith('/')) return;

        console.log(`📨 Получено сообщение в чате ${msg.chat.id}: ${msg.text?.substring(0, 50)}...`);

        const context = this.replyContext.get(msg.chat.id);

        if (context && msg.text) {
          console.log(`✅ Найден активный контекст! Обрабатываем как ответ техподдержки...`);
          await this.handleSupportReply(msg);
        } else if (msg.reply_to_message && msg.text) {
          console.log(`📨 Это ответ на сообщение ${msg.reply_to_message.message_id}`);
          await this.handleSupportReply(msg);
        } else {
          console.log(`❌ Нет активного контекста и не ответ на сообщение`);

          if (msg.chat.id.toString() === this.ownerId && msg.text) {
            console.log(`ℹ️ Сообщение от владельца без контекста: ${msg.text}`);
            if (this.bot) {
              await this.bot.sendMessage(msg.chat.id, LANG.ru.replyHelp);
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
      if (this.bot) {
        await this.bot.sendMessage(chatId, LANG.ru.replyNotFound, { parse_mode: 'HTML' });
      }
      return;
    }

    const { domain, userAddress, isTestnet } = context;
    const $ = this.t(chatId.toString());

    console.log(`💬 Обработка ответа для: ${domain} - ${userAddress} (${isTestnet ? 'testnet' : 'mainnet'})`);

    this.replyContext.set(chatId, { domain, userAddress, isTestnet });

    if (this.replyContextTimeouts.has(chatId)) {
      clearTimeout(this.replyContextTimeouts.get(chatId)!);
    }

    const timeout = setTimeout(() => {
      console.log(`⏰ Таймаут контекста для чата ${chatId}`);
      this.replyContext.delete(chatId);
      this.replyContextTimeouts.delete(chatId);
      if (this.bot) {
        this.bot.sendMessage(chatId, $.replyTimeout);
      }
    }, 10 * 60 * 1000);

    this.replyContextTimeouts.set(chatId, timeout);

    const instruction = `
${$.replyInstruction}

${$.replyDomain}: <code>${domain}</code>
${$.replyAddress}: <code>${userAddress}</code>
${$.replyNetwork}: ${isTestnet ? 'Testnet' : 'Mainnet'}

${$.replyPrompt}
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
      const $ = this.t(chatId.toString());

      if (!replyText) {
        if (this.bot) await this.bot.sendMessage(chatId, $.replyNoText);
        return;
      }

      const context = this.replyContext.get(chatId);
      if (!context) {
        if (this.bot) {
          await this.bot.sendMessage(chatId, $.replyNoContext);
        }
        return;
      }

      const { domain, userAddress, isTestnet } = context;

      const success = await this.saveOperatorReplyToDatabase(domain, userAddress, replyText, isTestnet);

      if (success) {
        if (this.bot) {
          await this.bot.sendMessage(chatId, `
${$.replySuccess}

${$.replyDomain}: <code>${domain}</code>
${$.replyAddress}: <code>${userAddress}</code>
${$.replyNetwork}: ${isTestnet ? 'Testnet' : 'Mainnet'}

${$.replyText}:
${replyText}

${$.replySaved}: ${new Date().toLocaleString('ru-RU')}
          `.trim(), { parse_mode: 'HTML' });
        }

        this.replyContext.delete(chatId);
        if (this.replyContextTimeouts.has(chatId)) {
          clearTimeout(this.replyContextTimeouts.get(chatId)!);
          this.replyContextTimeouts.delete(chatId);
        }
      } else {
        if (this.bot) await this.bot.sendMessage(chatId, $.replyDbError);
      }

    } catch (error) {
      console.error('❌ Ошибка при обработке ответа техподдержки:', error);
    }
  }

  // ==================== РАБОТА С БД (ЧАТЫ) ====================

  private async saveOperatorReplyToDatabase(
    domain: string, userAddress: string, replyText: string, isTestnet: boolean
  ): Promise<boolean> {
    try {
      const db = this.getDatabase(isTestnet);
      let chat = db.prepare('SELECT * FROM chats WHERE domain = ? AND userAddress = ?').get(domain, userAddress) as any;

      if (!chat) {
        const stmt = db.prepare(`INSERT INTO chats (domain, userAddress) VALUES (?, ?) RETURNING *`);
        chat = stmt.get(domain, userAddress);
      }

      const messageId = Math.random().toString(36).substring(2, 15);
      db.prepare('INSERT INTO messages (id, chatId, sender, text) VALUES (?, ?, ?, ?)').run(messageId, chat.id, 'operator', replyText);
      db.prepare('UPDATE chats SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(chat.id);
      return true;
    } catch (error) {
      console.error('❌ Ошибка при сохранении ответа оператора в БД:', error);
      return false;
    }
  }

  // ==================== УВЕДОМЛЕНИЯ ДЛЯ ВЛАДЕЛЬЦА ====================

  async sendNewMessageNotification(domain: string, userAddress: string, messageText: string, isTestnet: boolean = true): Promise<void> {
    if (!this.isBotAvailable()) return;

    try {
      const $ = LANG.ru;
      const network = this.formatNetwork(isTestnet);
      const messageId = this.generateMessageId(domain, userAddress);

      this.messageContexts.set(messageId, { domain, userAddress, isTestnet });

      if (this.messageContexts.size > 100) {
        const keys = Array.from(this.messageContexts.keys());
        for (let i = 0; i < 50; i++) {
          const key = keys[i];
          if (key) this.messageContexts.delete(key);
        }
      }

      const message = `
${$.newMessage}

${network}
${$.fieldDomain}: <code>${domain}</code>
${$.fieldAddress}: ${this.formatTonviewerLink(userAddress, isTestnet)}

💬 Сообщение:
${messageText.substring(0, 500)}${messageText.length > 500 ? '...' : ''}
      `.trim();

      const inlineKeyboard = [[{ text: $.btnReply, callback_data: `reply_${messageId}` }]];

      await this.bot!.sendMessage(this.ownerId, message, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: inlineKeyboard }
      });
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления в Telegram:', error);
    }
  }

  async sendNewChatNotification(domain: string, userAddress: string, isTestnet: boolean = true): Promise<void> {
    if (!this.isBotAvailable()) return;

    try {
      const $ = LANG.ru;
      const network = this.formatNetwork(isTestnet);
      const chatIdHash = this.generateMessageId(domain, userAddress);

      this.messageContexts.set(`chat_${chatIdHash}`, { domain, userAddress, isTestnet });

      const message = `
${$.newChat}

${network}
${$.fieldDomain}: <code>${domain}</code>
${$.fieldAddress}: ${this.formatTonviewerLink(userAddress, isTestnet)}

${$.fieldCreatedAt}: ${new Date().toLocaleString('ru-RU')}
      `.trim();

      const inlineKeyboard = [[{ text: $.btnReply, callback_data: `reply_${chatIdHash}` }]];

      await this.bot!.sendMessage(this.ownerId, message, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: inlineKeyboard }
      });
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления в Telegram:', error);
    }
  }

  // ==================== ОТПРАВКА В ГРУППУ (ВСЕМ PUBLIC-ПОДПИСЧИКАМ) ====================

  private async sendGroupNotification(
    getMessage: (lang: string) => string,
    inlineKeyboard?: any,
    photoUrl?: string | null
  ): Promise<boolean> {
    const publicSubs = this.subscriptions.filter(s => s.subscriptionType === 'public' && s.isActive);

    if (publicSubs.length === 0) {
      console.warn('⚠️ Нет активных public-подписок. Пропускаем отправку.');
      return false;
    }

    let sent = false;
    for (const sub of publicSubs) {
      try {
        const lang = sub.lang || 'ru';
        const message = getMessage(lang);
        if (photoUrl) {
          await this.sendPhotoWithCaption(sub.chatId, photoUrl, message, inlineKeyboard);
        } else {
          const options: any = { parse_mode: 'HTML' };
          if (inlineKeyboard) options.reply_markup = { inline_keyboard: inlineKeyboard };
          await this.bot!.sendMessage(sub.chatId, message, options);
        }
        sent = true;
      } catch (e) {
        console.error(`❌ Не удалось отправить в чат ${sub.chatId}`);
      }
    }
    return sent;
  }

  // ==================== PUBLIC УВЕДОМЛЕНИЯ ====================

  // --- PROXY ЗОНА ---
  async sendPublicProxyZoneCreatedNotification(name: string, address: string, owner: string, price: number, isTestnet: boolean = true): Promise<boolean> {
    try {
      const network = this.formatNetwork(isTestnet);
      const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(name, '');
      const inlineKeyboard = [[{ text: LANG.ru.btnCreateSubdomain, url: miniAppLink }]];

      return await this.sendGroupNotification((lang) => {
        const $ = LANG[lang as 'ru' | 'en'] || LANG.ru;
        return `
${$.proxyZoneCreated}

${network}
${$.fieldName}: *.<code>${name}</code>
${$.fieldDomainAddress}: ${this.formatTonviewerLink(address, isTestnet)}
${$.fieldOwner}: ${this.formatTonviewerLink(owner, isTestnet)}
${$.fieldPrice}: ${price} TON
${$.fieldType}: ${$.fieldTypeProxy}
${$.fieldCreatedAt}: ${new Date().toLocaleString('ru-RU')}

${$.hintProxyZone}
        `.trim();
      }, inlineKeyboard, this.getNotificationImageUrl(name, true));
    } catch (error) {
      console.error('❌ Ошибка при отправке публичного уведомления о Proxy зоне:', error);
      return false;
    }
  }

  // --- BUNDLE DEPLOYED ---
  async sendPublicBundleDeployedNotification(domain: string, address: string, bundleAddress: string, isTestnet: boolean = true): Promise<boolean> {
    try {
      const network = this.formatNetwork(isTestnet);
      const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(domain, '');
      const inlineKeyboard = [[{ text: LANG.ru.btnCreateSubdomain, url: miniAppLink }]];

      return await this.sendGroupNotification((lang) => {
        const $ = LANG[lang as 'ru' | 'en'] || LANG.ru;
        return `
${$.bundleDeployed}

${network}
${$.fieldDomain}: <code>${domain}</code>
${$.fieldCollectionAddress}: ${this.formatTonviewerLink(bundleAddress, isTestnet)}
${$.fieldOwner}: ${this.formatTonviewerLink(address, isTestnet)}

${$.fieldDeployedAt}: ${new Date().toLocaleString('ru-RU')}
${$.hintProxyZone}
        `.trim();
      }, inlineKeyboard);
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления о Bundle:', error);
      return false;
    }
  }

  // --- SBT ЗОНА ---
  async sendPublicSBTZoneCreatedNotification(name: string, address: string, owner: string, price: number, bundleAddress: string, currentID: number, isTestnet: boolean = true): Promise<boolean> {
    try {
      const network = this.formatNetwork(isTestnet);
      const [subdomainName, zoneName] = DeeplinkUtils.formatDomainForUrl(name);
      const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(zoneName as string, subdomainName as string);
      const inlineKeyboard = [[{ text: LANG.ru.btnCreateSubdomain, url: miniAppLink }]];

      return await this.sendGroupNotification((lang) => {
        const $ = LANG[lang as 'ru' | 'en'] || LANG.ru;
        return `
${$.sbtZoneCreated}

${network}
${$.fieldName}: <code>${name}</code>
${$.fieldCollectionAddress}: ${this.formatTonviewerLink(bundleAddress, isTestnet)}
${$.fieldDomainAddress}: ${this.formatTonviewerLink(address, isTestnet)}
${$.fieldOwner}: ${this.formatTonviewerLink(owner, isTestnet)}
${$.fieldPrice}: ${price} TON
${$.fieldType}: ${$.fieldTypeSBT}

${currentID + 1} ${$.hintZoneNumber}
        `.trim();
      }, inlineKeyboard, this.getNotificationImageUrl(name, false));
    } catch (error) {
      console.error('❌ Ошибка при отправке публичного уведомления о SBT зоне:', error);
      return false;
    }
  }

  // --- ZONE STATUS CHANGED (только владельцу) ---
  async sendZoneStatusChangedNotification(name: string, address: string, status: string, isTestnet: boolean = true): Promise<void> {
    if (!this.isBotAvailable()) return;

    try {
      const $ = LANG.ru;
      const network = this.formatNetwork(isTestnet);
      const message = `
${$.sbtZoneDeactivated}

${network}
${$.fieldName}: <code>${name}</code>
${$.fieldAddress}: ${this.formatTonviewerLink(address, isTestnet)}
${$.fieldStatus}: <code>${status}</code>

${$.fieldDeactivatedAt}: ${new Date().toLocaleString('ru-RU')}
      `.trim();

      await this.bot!.sendMessage(this.ownerId, message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления о SBT зоне:', error);
    }
  }

  // --- ПРИВЯЗКА DNS-ЗАПИСИ ---
  // Значение записи (адрес кошелька, ADNL, bagID) сознательно не публикуется —
  // это то же самое, что скрывается за самим доменом; уведомление сообщает
  // только сам факт привязки/отвязки и формат записи.
  async sendDnsRecordUpdatedNotification(domain: string, recordFormat: 'address' | 'adnl' | 'bagId', action: 'set' | 'delete', isTestnet: boolean = true): Promise<void> {
    if (!this.isBotAvailable()) return;

    try {
      const $ = LANG.ru;
      const network = this.formatNetwork(isTestnet);
      const formatLabel = recordFormat === 'adnl'
        ? $.recordFormatAdnl
        : recordFormat === 'bagId'
          ? $.recordFormatBagId
          : $.recordFormatAddress;

      const message = `
${action === 'set' ? $.dnsRecordSet : $.dnsRecordDeleted}

${network}
${$.fieldDomain}: <a href="tonsite://${domain}">${domain}</a>
${$.fieldRecordType}: ${formatLabel}

${$.fieldTime}: ${new Date().toLocaleString('ru-RU')}
      `.trim();

      const inlineKeyboard = [[{ text: $.btnViewCatalog, url: 'https://tonsitecatalog.ton' }]];

      await this.bot!.sendMessage(this.ownerId, message, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: inlineKeyboard }
      });
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления о DNS-записи:', error);
    }
  }

  // --- АУКЦИОН ---
  async sendPublicAuctionStartedNotification(domain: string, address: string, price: number, isTestnet: boolean = true): Promise<boolean> {
    try {
      const network = this.formatNetwork(isTestnet);
      const [subdomainName, zoneName] = DeeplinkUtils.formatDomainForUrl(domain);
      const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(zoneName as string, subdomainName as string);
      const inlineKeyboard = [[{ text: LANG.ru.btnPlaceBid, url: miniAppLink }]];

      return await this.sendGroupNotification((lang) => {
        const $ = LANG[lang as 'ru' | 'en'] || LANG.ru;
        return `
${$.auctionStarted}

${network}
${$.fieldDomain}: <code>${domain}</code>
${$.fieldAddress}: ${this.formatTonviewerLink(address, isTestnet)}
${$.fieldPrice}: ${price} TON
${$.fieldAuctionType}: ${$.fieldAuctionTypeProxy}

${$.fieldStartTime}: ${new Date().toLocaleString('ru-RU')}
${$.fieldEndTime}: ${$.hintAuctionEnds}

${$.hintHurryUp}
        `.trim();
      }, inlineKeyboard, this.getNotificationImageUrl(domain, true));
    } catch (error) {
      console.error('❌ Ошибка при отправке публичного уведомления об аукционе:', error);
      return false;
    }
  }

  // --- НОВАЯ СТАВКА ---
  async sendPublicNewBidNotification(domain: string, bidder: string, amount: number, previousBidder: string, isTestnet: boolean = true): Promise<boolean> {
    try {
      const network = this.formatNetwork(isTestnet);
      const [subdomainName, zoneName] = DeeplinkUtils.formatDomainForUrl(domain);
      const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(zoneName as string, subdomainName as string);
      const inlineKeyboard = [[{ text: LANG.ru.btnPlaceBid, url: miniAppLink }]];

      return await this.sendGroupNotification((lang) => {
        const $ = LANG[lang as 'ru' | 'en'] || LANG.ru;
        const previousBidderInfo = previousBidder
          ? `\n${$.fieldPreviousBidder}: ${this.formatTonviewerLink(previousBidder, isTestnet)}`
          : '';

        return `
${$.newBid}

${network}
${$.fieldDomain}: <code>${domain}</code>
${$.fieldBidder}: ${this.formatTonviewerLink(bidder, isTestnet)}
${$.fieldAmount}: ${amount} TON${previousBidderInfo}
${$.fieldAuctionType}: ${$.fieldAuctionTypeProxy}

${$.fieldBidTime}: ${new Date().toLocaleString('ru-RU')}
        `.trim();
      }, inlineKeyboard, this.getNotificationImageUrl(domain, true));
    } catch (error) {
      console.error('❌ Ошибка при отправке публичного уведомления о ставке:', error);
      return false;
    }
  }

  // --- SBT СУБДОМЕН СМИНЧЕН ---
  async sendPublicSBTSubdomainMintedNotification(domain: string, address: string, owner: string, price: number, isTestnet: boolean = true): Promise<boolean> {
    try {
      const network = this.formatNetwork(isTestnet);

      return await this.sendGroupNotification((lang) => {
        const $ = LANG[lang as 'ru' | 'en'] || LANG.ru;
        return `
${$.sbtSubdomainMinted}

${network}
${$.fieldDomain}: <code>${domain}</code>
${$.fieldAddress}: ${this.formatTonviewerLink(address, isTestnet)}
${$.fieldOwner}: ${this.formatTonviewerLink(owner, isTestnet)}
${$.fieldPrice}: ${price} TON
${$.fieldType}: ${$.fieldTypeSBT}
${$.fieldMintTime}: ${new Date().toLocaleString('ru-RU')}

${$.hintCongrats}
        `.trim();
      }, undefined, this.getNotificationImageUrl(domain, false));
    } catch (error) {
      console.error('❌ Ошибка при отправке публичного уведомления о SBT субдомене:', error);
      return false;
    }
  }

  // --- АУКЦИОН ЗАВЕРШЕН ---
  async sendPublicAuctionEndedNotification(domain: string, winner: string, finalPrice: number, isTestnet: boolean = true): Promise<boolean> {
    try {
      const network = this.formatNetwork(isTestnet);
      const miniAppLink = DeeplinkUtils.generateMarketLink();
      const inlineKeyboard = [[{ text: LANG.ru.btnViewMarket, url: miniAppLink }]];

      return await this.sendGroupNotification((lang) => {
        const $ = LANG[lang as 'ru' | 'en'] || LANG.ru;
        return `
${$.auctionEnded}

${network}
${$.fieldDomain}: <code>${domain}</code>
${$.fieldWinner}: ${this.formatTonviewerLink(winner, isTestnet)}
${$.fieldFinalPrice}: ${finalPrice} TON

${$.fieldEndedAt}: ${new Date().toLocaleString('ru-RU')}

${$.hintCongratsWinner}
        `.trim();
      }, inlineKeyboard, this.getNotificationImageUrl(domain, true));
    } catch (error) {
      console.error('❌ Ошибка при отправке публичного уведомления о завершении аукциона:', error);
      return false;
    }
  }

  // --- НОВЫЙ ПОЛЬЗОВАТЕЛЬ ---
  async sendPublicNewUserNotification(address: string, isTestnet: boolean = true): Promise<boolean> {
    try {
      const network = this.formatNetwork(isTestnet);

      return await this.sendGroupNotification((lang) => {
        const $ = LANG[lang as 'ru' | 'en'] || LANG.ru;
        return `
${$.newUser}

${network}
${$.fieldAddress}: ${this.formatTonviewerLink(address, isTestnet)}

${$.fieldRegisteredAt}: ${new Date().toLocaleString('ru-RU')}
        `.trim();
      });
    } catch (error) {
      console.error('❌ Ошибка при отправке публичного уведомления о пользователе:', error);
      return false;
    }
  }

  // ==================== СТАРЫЕ МЕТОДЫ (ВЛАДЕЛЕЦ + ГРУППА) ====================

  async sendProxyZoneCreatedNotification(name: string, address: string, owner: string, price: number, isTestnet: boolean = true): Promise<void> {
    if (!this.isBotAvailable()) return;

    try {
      const $ = LANG.ru;
      const network = this.formatNetwork(isTestnet);
      const message = `
${$.proxyZoneCreated}

${network}
${$.fieldName}: <code>${name}</code>
${$.fieldDomainAddress}: ${this.formatTonviewerLink(address, isTestnet)}
${$.fieldOwner}: ${this.formatTonviewerLink(owner, isTestnet)}
${$.fieldPrice}: ${price} TON
${$.fieldType}: ${$.fieldTypeProxy}

${$.fieldCreatedAt}: ${new Date().toLocaleString('ru-RU')}

${$.hintProxyZone}
      `.trim();

      const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(name, '');
      const inlineKeyboard = [[{ text: $.btnCreateSubdomain, url: miniAppLink }]];

      await this.sendPhotoWithCaption(
        this.ownerId,
        this.getNotificationImageUrl(name, true),
        message,
        inlineKeyboard
      );

      await this.sendPublicProxyZoneCreatedNotification(name, address, owner, price, isTestnet);
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления о Proxy зоне:', error);
    }
  }

  async sendSBTZoneCreatedNotification(name: string, address: string, owner: string, price: number, bundleAddress: string, currentID: number, isTestnet: boolean = true): Promise<void> {
    if (!this.isBotAvailable()) return;

    try {
      const $ = LANG.ru;
      const network = this.formatNetwork(isTestnet);
      const [subdomainName, zoneName] = DeeplinkUtils.formatDomainForUrl(name);

      const message = `
${$.sbtZoneCreated}

${network}
${$.fieldName}: <code>${name}</code>
${$.fieldCollectionAddress}: ${this.formatTonviewerLink(bundleAddress, isTestnet)}
${$.fieldDomainAddress}: ${this.formatTonviewerLink(address, isTestnet)}
${$.fieldOwner}: ${this.formatTonviewerLink(owner, isTestnet)}
${$.fieldPrice}: ${price} TON
${$.fieldType}: ${$.fieldTypeSBT}

${currentID + 1} ${$.hintZoneNumber}

${$.fieldCreatedAt}: ${new Date().toLocaleString('ru-RU')}
      `.trim();

      const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(zoneName as string, subdomainName as string);
      const inlineKeyboard = [[{ text: $.btnCreateSubdomain, url: miniAppLink }]];

      await this.sendPhotoWithCaption(
        this.ownerId,
        this.getNotificationImageUrl(name, false),
        message,
        inlineKeyboard
      );

      await this.sendPublicSBTZoneCreatedNotification(name, address, owner, price, bundleAddress, currentID, isTestnet);
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления о SBT зоне:', error);
    }
  }

  async sendAuctionStartedNotification(domain: string, address: string, price: number, isTestnet: boolean = true): Promise<void> {
    if (!this.isBotAvailable()) return;

    try {
      const $ = LANG.ru;
      const network = this.formatNetwork(isTestnet);
      const [subdomainName, zoneName] = DeeplinkUtils.formatDomainForUrl(domain);

      const message = `
${$.auctionStarted}

${network}
${$.fieldDomain}: <code>${domain}</code>
${$.fieldOwner}: ${this.formatTonviewerLink(address, isTestnet)}
${$.fieldPrice}: ${price} TON
${$.fieldAuctionType}: ${$.fieldAuctionTypeProxy}

${$.fieldStartTime}: ${new Date().toLocaleString('ru-RU')}
${$.fieldEndTime}: ${$.hintAuctionEnds}

${$.hintHurryUp}
      `.trim();

      const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(zoneName as string, subdomainName as string);
      const inlineKeyboard = [[{ text: $.btnPlaceBid, url: miniAppLink }]];

      await this.sendPhotoWithCaption(
        this.ownerId,
        this.getNotificationImageUrl(domain, true),
        message,
        inlineKeyboard
      );

      await this.sendPublicAuctionStartedNotification(domain, address, price, isTestnet);
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления о старте аукциона:', error);
    }
  }

  async sendNewBidNotification(domain: string, bidder: string, amount: number, previousBidder: string, isTestnet: boolean = true): Promise<void> {
    if (!this.isBotAvailable()) return;

    try {
      const $ = LANG.ru;
      const network = this.formatNetwork(isTestnet);
      const [subdomainName, zoneName] = DeeplinkUtils.formatDomainForUrl(domain);
      const previousBidderInfo = previousBidder
        ? `\n${$.fieldPreviousBidder}: ${this.formatTonviewerLink(previousBidder, isTestnet)}`
        : '';

      const message = `
${$.newBid}

${network}
${$.fieldDomain}: <code>${domain}</code>
${$.fieldBidder}: ${this.formatTonviewerLink(bidder, isTestnet)}
${$.fieldAmount}: ${amount} TON${previousBidderInfo}

${$.fieldBidTime}: ${new Date().toLocaleString('ru-RU')}
      `.trim();

      const miniAppLink = DeeplinkUtils.generateAddSubdomainLink(zoneName as string, subdomainName as string);
      const inlineKeyboard = [[{ text: $.btnPlaceBid, url: miniAppLink }]];

      await this.sendPhotoWithCaption(
        this.ownerId,
        this.getNotificationImageUrl(domain, true),
        message,
        inlineKeyboard
      );

      await this.sendPublicNewBidNotification(domain, bidder, amount, previousBidder, isTestnet);
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления о ставке:', error);
    }
  }

  async sendSBTSubdomainMintedNotification(domain: string, address: string, owner: string, price: number, isTestnet: boolean = true): Promise<void> {
    if (!this.isBotAvailable()) return;

    try {
      const $ = LANG.ru;
      const network = this.formatNetwork(isTestnet);

      const message = `
${$.sbtSubdomainMinted}

${network}
${$.fieldDomain}: <code>${domain}</code>
${$.fieldAddress}: ${this.formatTonviewerLink(address, isTestnet)}
${$.fieldOwner}: ${this.formatTonviewerLink(owner, isTestnet)}
${$.fieldPrice}: ${price} TON

${$.fieldMintTime}: ${new Date().toLocaleString('ru-RU')}
      `.trim();

      await this.sendPhotoWithCaption(
        this.ownerId,
        this.getNotificationImageUrl(domain, false),
        message
      );

      await this.sendPublicSBTSubdomainMintedNotification(domain, address, owner, price, isTestnet);
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления о SBT субдомене:', error);
    }
  }

  async sendAuctionEndedNotification(domain: string, winner: string, finalPrice: number, isTestnet: boolean = true): Promise<void> {
    if (!this.isBotAvailable()) return;

    try {
      const $ = LANG.ru;
      const network = this.formatNetwork(isTestnet);

      const message = `
${$.auctionEnded}

${network}
${$.fieldDomain}: <code>${domain}</code>
${$.fieldWinner}: ${this.formatTonviewerLink(winner, isTestnet)}
${$.fieldFinalPrice}: ${finalPrice} TON

${$.fieldEndedAt}: ${new Date().toLocaleString('ru-RU')}
      `.trim();

      const miniAppLink = DeeplinkUtils.generateMarketLink();
      const inlineKeyboard = [[{ text: $.btnViewMarket, url: miniAppLink }]];

      await this.sendPhotoWithCaption(
        this.ownerId,
        this.getNotificationImageUrl(domain, true),
        message,
        inlineKeyboard
      );

      await this.sendPublicAuctionEndedNotification(domain, winner, finalPrice, isTestnet);
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления о завершении аукциона:', error);
    }
  }

  async sendNewUserNotification(address: string, isTestnet: boolean = true): Promise<void> {
    if (!this.isBotAvailable()) return;

    try {
      const $ = LANG.ru;
      const network = this.formatNetwork(isTestnet);

      const message = `
${$.newUser}

${network}
${$.fieldAddress}: ${this.formatTonviewerLink(address, isTestnet)}

${$.fieldRegisteredAt}: ${new Date().toLocaleString('ru-RU')}
      `.trim();

      await this.bot!.sendMessage(this.ownerId, message, { parse_mode: 'HTML' });

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
      if (!chat) return [];
      return db.prepare('SELECT * FROM messages WHERE chatId = ? ORDER BY timestamp ASC').all(chat.id) as any[];
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
        const stmt = db.prepare(`INSERT INTO chats (domain, userAddress) VALUES (?, ?) RETURNING *`);
        chat = stmt.get(domain, userAddress);
      }

      const messageId = Math.random().toString(36).substring(2, 15);
      db.prepare('INSERT INTO messages (id, chatId, sender, text) VALUES (?, ?, ?, ?)')
        .run(messageId, chat.id, 'user', messageText);
      db.prepare('UPDATE chats SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(chat.id);

      return true;
    } catch (error) {
      console.error('❌ Ошибка при сохранении сообщения пользователя в БД:', error);
      return false;
    }
  }

  getActiveChats(isTestnet: boolean = true): any[] {
    try {
      const db = this.getDatabase(isTestnet);
      return db.prepare(`
        SELECT c.*,
               (SELECT COUNT(*) FROM messages m WHERE m.chatId = c.id) as messageCount,
               (SELECT MAX(timestamp) FROM messages m WHERE m.chatId = c.id) as lastMessageTime
        FROM chats c
        WHERE c.status = 'active'
        ORDER BY c.updatedAt DESC
      `).all() as any[];
    } catch (error) {
      console.error('❌ Ошибка при получении активных чатов:', error);
      return [];
    }
  }

  closeChat(domain: string, userAddress: string, isTestnet: boolean = true): boolean {
    try {
      const db = this.getDatabase(isTestnet);
      const result = db.prepare(
        'UPDATE chats SET status = "closed", updatedAt = CURRENT_TIMESTAMP WHERE domain = ? AND userAddress = ?'
      ).run(domain, userAddress);
      return result.changes > 0;
    } catch (error) {
      console.error('❌ Ошибка при закрытии чата:', error);
      return false;
    }
  }

  // ==================== УВЕДОМЛЕНИЯ О ПЛАТЕЖАХ ====================

  async sendPaymentRecordedNotification(address: string, zoneType: string, length: number, isTestnet: boolean = true): Promise<void> {
    if (!this.isBotAvailable()) return;

    try {
      const $ = LANG.ru;
      const network = this.formatNetwork(isTestnet);
      const zoneTypeText = zoneType === 'proxy' ? 'Proxy' : 'SBT';
      const formattedLength = length === 9 ? '9+' : String(length);

      const message = `
${$.paymentRecorded}

${network}
${$.fieldAddress}: ${this.formatTonviewerLink(address, isTestnet)}
${$.fieldZoneType}: ${zoneTypeText}
${$.fieldLength}: ${formattedLength} символов

${$.fieldTime}: ${new Date().toLocaleString('ru-RU')}

💡 ${zoneType === 'proxy' ? $.hintPaymentProxy : $.hintPaymentSBT} ${formattedLength} символов.
      `.trim();

      await this.bot!.sendMessage(this.ownerId, message, { parse_mode: 'HTML' });

      await this.sendPublicPaymentRecordedNotification(address, zoneType, length, isTestnet);
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления об оплаченной попытке:', error);
    }
  }

  async sendPublicPaymentRecordedNotification(address: string, zoneType: string, length: number, isTestnet: boolean = true): Promise<boolean> {
    try {
      const network = this.formatNetwork(isTestnet);

      return await this.sendGroupNotification((lang) => {
        const $ = LANG[lang as 'ru' | 'en'] || LANG.ru;
        const zoneTypeText = zoneType === 'proxy' ? 'Proxy' : 'SBT';
        const formattedLength = length === 9 ? '9+' : String(length);

        return `
${$.paymentRecorded}

${network}
${$.fieldAddress}: ${this.formatTonviewerLink(address, isTestnet)}
${$.fieldZoneType}: ${zoneTypeText}
${$.fieldLength}: ${formattedLength} символов

${$.fieldTime}: ${new Date().toLocaleString('ru-RU')}

🎯 ${zoneType === 'proxy' ? $.hintPaymentProxy : $.hintPaymentSBT}!
        `.trim();
      });
    } catch (error) {
      console.error('❌ Ошибка при отправке публичного уведомления об оплаченной попытке:', error);
      return false;
    }
  }

  async sendPaymentConsumedNotification(address: string, zoneType: string, length: number, isTestnet: boolean = true): Promise<void> {
    if (!this.isBotAvailable()) return;

    try {
      const $ = LANG.ru;
      const network = this.formatNetwork(isTestnet);
      const zoneTypeText = zoneType === 'proxy' ? 'Proxy' : 'SBT';
      const formattedLength = length === 9 ? '9+' : String(length);

      const message = `
${$.paymentConsumed}

${network}
${$.fieldAddress}: ${this.formatTonviewerLink(address, isTestnet)}
${$.fieldZoneType}: ${zoneTypeText}
${$.fieldLength}: ${formattedLength} символов

${$.fieldTime}: ${new Date().toLocaleString('ru-RU')}

✅ ${$.hintPaymentUsed} ${zoneTypeText.toLowerCase()}-зоны.
      `.trim();

      await this.bot!.sendMessage(this.ownerId, message, { parse_mode: 'HTML' });

      await this.sendPublicPaymentConsumedNotification(address, zoneType, length, isTestnet);
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления об использовании оплаченной попытки:', error);
    }
  }

  async sendPublicPaymentConsumedNotification(address: string, zoneType: string, length: number, isTestnet: boolean = true): Promise<boolean> {
    try {
      const network = this.formatNetwork(isTestnet);

      return await this.sendGroupNotification((lang) => {
        const $ = LANG[lang as 'ru' | 'en'] || LANG.ru;
        const zoneTypeText = zoneType === 'proxy' ? 'Proxy' : 'SBT';

        return `
${$.paymentConsumed}

${network}
${$.fieldAddress}: ${this.formatTonviewerLink(address, isTestnet)}
${$.fieldZoneType}: ${zoneTypeText}
${$.fieldLength}: ${length} символов

${$.fieldTime}: ${new Date().toLocaleString('ru-RU')}

✅ ${$.hintPaymentCreated} ${zoneTypeText.toLowerCase()}-зону используя оплаченную попытку!
        `.trim();
      });
    } catch (error) {
      console.error('❌ Ошибка при отправке публичного уведомления об использовании оплаченной попытки:', error);
      return false;
    }
  }

  async sendPaymentErrorNotification(address: string, zoneType: string, length: number, errorMessage: string, isTestnet: boolean = true): Promise<void> {
    if (!this.isBotAvailable()) return;

    try {
      const $ = LANG.ru;
      const network = this.formatNetwork(isTestnet);
      const zoneTypeText = zoneType === 'proxy' ? 'Proxy' : 'SBT';

      const message = `
${$.paymentError}

${network}
${$.fieldAddress}: ${this.formatTonviewerLink(address, isTestnet)}
${$.fieldZoneType}: ${zoneTypeText}
${$.fieldLength}: ${length} символов

${$.fieldError}: ${errorMessage}

${$.fieldTime}: ${new Date().toLocaleString('ru-RU')}
      `.trim();

      await this.bot!.sendMessage(this.ownerId, message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления об ошибке оплаты:', error);
    }
  }

  // ==================== СТАТИСТИКА ====================

  getChatStats(isTestnet: boolean = true): any {
    try {
      const db = this.getDatabase(isTestnet);
      return db.prepare(`
        SELECT
          COUNT(*) as totalChats,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeChats,
          SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closedChats,
          (SELECT COUNT(*) FROM messages) as totalMessages,
          (SELECT COUNT(*) FROM messages WHERE sender = 'user') as userMessages,
          (SELECT COUNT(*) FROM messages WHERE sender = 'operator') as operatorMessages
        FROM chats
      `).get() as any;
    } catch (error) {
      console.error('❌ Ошибка при получении статистики чатов:', error);
      return { totalChats: 0, activeChats: 0, closedChats: 0, totalMessages: 0, userMessages: 0, operatorMessages: 0 };
    }
  }

  // Этот класс держит СВОИ независимые коннекшны к тем же .db-файлам
  // (this.testnetDb/this.mainnetDb, отдельно от тех, что открывает
  // server-sqlite.ts) — их WAL тоже нужно сливать в основной файл на
  // остановке контейнера, иначе теряются записи чатов/подписок.
  checkpointAndClose(): void {
    try {
      this.testnetDb.pragma('wal_checkpoint(TRUNCATE)');
      this.mainnetDb.pragma('wal_checkpoint(TRUNCATE)');
      this.testnetDb.close();
      this.mainnetDb.close();
    } catch (error) {
      console.error('❌ Ошибка при чекпоинте/закрытии баз бота:', error);
    }
  }
}

// Создаем и экспортируем экземпляр бота
const telegramBotService = new TelegramBotService();
export default telegramBotService;
