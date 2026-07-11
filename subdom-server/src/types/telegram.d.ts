// // types/telegram.d.ts
// declare module 'node-telegram-bot-api' {
//   interface TelegramBotOptions {
//     polling?: boolean;
//     webHook?: boolean;
//     onlyFirstMatch?: boolean;
//     request?: any;
//     baseApiUrl?: string;
//     filepath?: boolean;
//   }

//   interface SendMessageOptions {
//     parse_mode?: string;
//     disable_web_page_preview?: boolean;
//     disable_notification?: boolean;
//     reply_to_message_id?: number;
//     reply_markup?: any;
//   }

//   interface Message {
//     message_id: number;
//     from?: {
//       id: number;
//       is_bot: boolean;
//       first_name: string;
//       username?: string;
//       language_code?: string;
//     };
//     chat: {
//       id: number;
//       first_name?: string;
//       username?: string;
//       type: string;
//     };
//     date: number;
//     text?: string;
//     entities?: any[];
//   }

//   interface CallbackQuery {
//     id: string;
//     from: {
//       id: number;
//       is_bot: boolean;
//       first_name: string;
//       username?: string;
//       language_code?: string;
//     };
//     message?: Message;
//     chat_instance?: string;
//     data?: string;
//   }

//   class TelegramBot {
//     constructor(token: string, options?: TelegramBotOptions);
    
//     onText(regexp: RegExp, callback: (msg: Message, match: RegExpExecArray | null) => void): void;
//     on(event: 'callback_query', callback: (query: CallbackQuery) => void): void;
//     on(event: 'message', callback: (msg: Message) => void): void;
//     on(event: 'polling_error', callback: (error: Error) => void): void;
    
//     sendMessage(chatId: number | string, text: string, options?: SendMessageOptions): Promise<Message>;
//     answerCallbackQuery(callbackQueryId: string, options?: { text?: string; show_alert?: boolean }): Promise<boolean>;
//   }

//   export default TelegramBot;
// }

// types/telegram.d.ts
declare module 'node-telegram-bot-api' {
  interface PollingOptions {
    timeout?: number;
    interval?: number;
    autoStart?: boolean;
    params?: any;
  }

  interface TelegramBotOptions {
    polling?: boolean | PollingOptions;
    webHook?: boolean;
    onlyFirstMatch?: boolean;
    request?: any;
    baseApiUrl?: string;
    filepath?: boolean;
  }

  interface SendMessageOptions {
    parse_mode?: string;
    disable_web_page_preview?: boolean;
    disable_notification?: boolean;
    reply_to_message_id?: number;
    reply_markup?: any;
  }

  interface Message {
    message_id: number;
    from?: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
      language_code?: string;
    };
    chat: {
      id: number;
      first_name?: string;
      username?: string;
      type: string;
    };
    date: number;
    text?: string;
    entities?: any[];
  }

  interface CallbackQuery {
    id: string;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
      language_code?: string;
    };
    message?: Message;
    chat_instance?: string;
    data?: string;
  }

  class TelegramBot {
    constructor(token: string, options?: TelegramBotOptions);
    
    onText(regexp: RegExp, callback: (msg: Message, match: RegExpExecArray | null) => void): void;
    on(event: 'callback_query', callback: (query: CallbackQuery) => void): void;
    on(event: 'message', callback: (msg: Message) => void): void;
    on(event: 'polling_error', callback: (error: Error) => void): void;
    
    sendMessage(chatId: number | string, text: string, options?: SendMessageOptions): Promise<Message>;
    answerCallbackQuery(callbackQueryId: string, options?: { text?: string; show_alert?: boolean }): Promise<boolean>;
  }

  export default TelegramBot;
}
