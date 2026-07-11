// src/utils/tonUtilsEnhanced.ts
// Улучшенные утилиты для работы с TON блокчейном

// import { Address, Cell } from 'ton-core';

// export interface BlockchainConfig {
//   network: 'mainnet' | 'testnet';
//   toncenterApiKey?: string;
//   tonapiToken?: string;
// }

// export interface TransactionCheckResult {
//   hash: string;
//   confirmed: boolean;
//   block?: number;
//   timestamp?: number;
//   error?: string;
//   messages?: Array<{
//     from: string;
//     to: string;
//     value: string;
//     success: boolean;
//   }>;
// }

// export class TonUtilsEnhanced {
//   private config: BlockchainConfig;

//   constructor(config: BlockchainConfig) {
//     this.config = config;
//   }

//   /**
//    * Проверка транзакции по hash с retry логикой
//    */
//   async checkTransactionWithRetry(
//     hash: string,
//     options: {
//       maxAttempts?: number;
//       delayBetweenAttempts?: number;
//       timeout?: number;
//     } = {}
//   ): Promise<TransactionCheckResult> {
//     const {
//       maxAttempts = 10,
//       delayBetweenAttempts = 3000,
//       timeout = 60000
//     } = options;

//     const startTime = Date.now();
//     let attempts = 0;

//     while (attempts < maxAttempts && Date.now() - startTime < timeout) {
//       attempts++;
      
//       try {
//         const result = await this.checkTransaction(hash);
        
//         if (result.confirmed) {
//           console.log(`✅ Транзакция ${hash} подтверждена с попытки ${attempts}`);
//           return result;
//         }
        
//         if (result.error && !result.error.includes('not found')) {
//           // Критическая ошибка, не продолжаем
//           return result;
//         }
        
//         console.log(`⏳ Транзакция ${hash} еще не подтверждена, попытка ${attempts}/${maxAttempts}`);
        
//         if (attempts < maxAttempts) {
//           await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
//         }
        
//       } catch (error) {
//         console.warn(`⚠️ Ошибка при проверке транзакции ${hash} (попытка ${attempts}):`, error);
        
//         if (attempts < maxAttempts) {
//           await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
//         }
//       }
//     }

//     return {
//       hash,
//       confirmed: false,
//       error: `Транзакция не подтверждена после ${attempts} попыток`
//     };
//   }

//   /**
//    * Проверка транзакции через несколько источников
//    */
//   private async checkTransaction(hash: string): Promise<TransactionCheckResult> {
//     // Пробуем несколько источников для надежности
//     const sources = [
//       this.checkViaTonApi.bind(this),
//       this.checkViaTonCenter.bind(this),
//       this.checkViaTonViewer.bind(this)
//     ];

//     for (const source of sources) {
//       try {
//         const result = await source(hash);
//         if (result.confirmed || result.error) {
//           return result;
//         }
//       } catch (error) {
//         // Пробуем следующий источник
//         continue;
//       }
//     }

//     return {
//       hash,
//       confirmed: false,
//       error: 'Транзакция не найдена'
//     };
//   }

//   /**
//    * Проверка через tonapi.io
//    */
//   private async checkViaTonApi(hash: string): Promise<TransactionCheckResult> {
//     const baseUrl = this.config.network === 'testnet' 
//       ? 'https://testnet.tonapi.io/v2' 
//       : 'https://tonapi.io/v2';
    
//     const url = `${baseUrl}/blockchain/transactions/${hash}`;
//     const headers: HeadersInit = {};
    
//     if (this.config.tonapiToken) {
//       headers['Authorization'] = `Bearer ${this.config.tonapiToken}`;
//     }

//     const response = await fetch(url, { headers });
    
//     if (!response.ok) {
//       if (response.status === 404) {
//         return { hash, confirmed: false, error: 'Transaction not found' };
//       }
//       throw new Error(`TON API error: ${response.status}`);
//     }

//     const data = await response.json();
    
//     return {
//       hash: data.hash,
//       confirmed: true,
//       block: data.block?.seqno,
//       timestamp: data.utime,
//       messages: data.out_msgs?.map((msg: any) => ({
//         from: msg.source,
//         to: msg.destination,
//         value: msg.value,
//         success: true
//       }))
//     };
//   }

//   /**
//    * Проверка через toncenter.com
//    */
//   private async checkViaTonCenter(hash: string): Promise<TransactionCheckResult> {
//     const baseUrl = this.config.network === 'testnet'
//       ? 'https://testnet.toncenter.com/api/v2'
//       : 'https://toncenter.com/api/v2';
    
//     const url = `${baseUrl}/getTransactions?hash=${hash}&limit=1`;
//     const headers: HeadersInit = {};
    
//     if (this.config.toncenterApiKey) {
//       headers['X-API-Key'] = this.config.toncenterApiKey;
//     }

//     const response = await fetch(url, { headers });
    
//     if (!response.ok) {
//       throw new Error(`TonCenter error: ${response.status}`);
//     }

//     const data = await response.json();
    
//     if (!data.ok || !data.result || data.result.length === 0) {
//       return { hash, confirmed: false, error: 'Transaction not found' };
//     }

//     const tx = data.result[0];
    
//     return {
//       hash: tx.hash,
//       confirmed: true,
//       block: tx.block,
//       timestamp: tx.utime,
//       messages: tx.out_msgs?.map((msg: any) => ({
//         from: msg.source,
//         to: msg.destination,
//         value: msg.value,
//         success: msg.success
//       }))
//     };
//   }

//   /**
//    * Проверка через tonviewer.com (fallback)
//    */
//   private async checkViaTonViewer(hash: string): Promise<TransactionCheckResult> {
//     const baseUrl = this.config.network === 'testnet'
//       ? 'https://testnet.tonviewer.com'
//       : 'https://tonviewer.com';
    
//     const url = `${baseUrl}/transaction/${hash}`;
    
//     // TonViewer не имеет публичного API, но мы можем проверить доступность страницы
//     const response = await fetch(url, { method: 'HEAD' });
    
//     if (response.ok) {
//       return {
//         hash,
//         confirmed: true,
//         error: 'Confirmed via TonViewer (page exists)'
//       };
//     }
    
//     return { hash, confirmed: false, error: 'Transaction not found in TonViewer' };
//   }

//   /**
//    * Проверка баланса адреса
//    */
//   async getBalance(address: string): Promise<string> {
//     const baseUrl = this.config.network === 'testnet'
//       ? 'https://testnet.toncenter.com/api/v2'
//       : 'https://toncenter.com/api/v2';
    
//     const url = `${baseUrl}/getAddressInformation?address=${address}`;
//     const headers: HeadersInit = {};
    
//     if (this.config.toncenterApiKey) {
//       headers['X-API-Key'] = this.config.toncenterApiKey;
//     }

//     const response = await fetch(url, { headers });
    
//     if (!response.ok) {
//       throw new Error(`Failed to get balance: ${response.status}`);
//     }

//     const data = await response.json();
    
//     if (!data.ok) {
//       throw new Error(data.error || 'Failed to get balance');
//     }

//     return data.result.balance;
//   }

//   /**
//    * Мониторинг изменения баланса (для подтверждения платежей)
//    */
//   async monitorBalanceChange(
//     address: string,
//     expectedChange: string,
//     timeout = 60000,
//     checkInterval = 3000
//   ): Promise<boolean> {
//     const startBalance = await this.getBalance(address);
//     const startTime = Date.now();
//     const expectedChangeNum = BigInt(expectedChange);

//     console.log(`👀 Мониторинг баланса ${address}, начальный баланс: ${startBalance}`);

//     while (Date.now() - startTime < timeout) {
//       await new Promise(resolve => setTimeout(resolve, checkInterval));
      
//       try {
//         const currentBalance = await this.getBalance(address);
//         const balanceChange = BigInt(currentBalance) - BigInt(startBalance);

//         console.log(`📊 Текущий баланс: ${currentBalance}, изменение: ${balanceChange}`);

//         if (balanceChange >= expectedChangeNum) {
//           console.log(`✅ Обнаружено ожидаемое изменение баланса: ${balanceChange}`);
//           return true;
//         }
//       } catch (error) {
//         console.warn('Ошибка при проверке баланса:', error);
//       }
//     }

//     console.log(`❌ Таймаут мониторинга баланса (${timeout}мс)`);
//     return false;
//   }

//   /**
//    * Пакетная проверка транзакций
//    */
//   async batchVerifyTransactions(
//     hashes: string[],
//     concurrency = 3
//   ): Promise<Map<string, TransactionCheckResult>> {
//     const results = new Map<string, TransactionCheckResult>();
    
//     // Разбиваем на группы для параллельной проверки
//     const groups = [];
//     for (let i = 0; i < hashes.length; i += concurrency) {
//       groups.push(hashes.slice(i, i + concurrency));
//     }

//     for (const group of groups) {
//       const promises = group.map(async (hash) => {
//         try {
//           const result = await this.checkTransactionWithRetry(hash, {
//             maxAttempts: 3,
//             timeout: 15000
//           });
//           return { hash, result };
//         } catch (error) {
//           return { 
//             hash, 
//             result: { 
//               hash, 
//               confirmed: false, 
//               error: error instanceof Error ? error.message : 'Unknown error' 
//             } 
//           };
//         }
//       });

//       const groupResults = await Promise.all(promises);
      
//       groupResults.forEach(({ hash, result }) => {
//         results.set(hash, result);
//       });

//       // Небольшая пауза между группами
//       if (groups.length > 1) {
//         await new Promise(resolve => setTimeout(resolve, 500));
//       }
//     }

//     return results;
//   }

//   /**
//    * Извлечение данных из BOC
//    */
//   static extractDataFromBoc(boc: string): {
//     hash: string;
//     cell: Cell;
//     isComplete: boolean;
//   } | null {
//     try {
//       const buffer = Buffer.from(boc, 'base64');
//       const cell = Cell.fromBoc(buffer)[0];
//       const hash = cell.hash().toString('hex');
      
//       return {
//         hash,
//         cell,
//         isComplete: cell.isExotic === 0
//       };
//     } catch (error) {
//       console.error('Ошибка парсинга BOC:', error);
//       return null;
//     }
//   }

//   /**
//    * Валидация адреса TON
//    */
//   static isValidAddress(address: string): boolean {
//     try {
//       Address.parse(address);
//       return true;
//     } catch {
//       return false;
//     }
//   }

//   /**
//    * Нормализация адреса
//    */
//   static normalizeAddress(address: string): string {
//     try {
//       const addr = Address.parse(address);
//       return addr.toString({ 
//         bounceable: true, 
//         testOnly: false,
//         urlSafe: true 
//       });
//     } catch {
//       return address;
//     }
//   }
// }

// // Экспорт синглтона для удобства
// let instance: TonUtilsEnhanced | null = null;

// export function getTonUtils(config?: BlockchainConfig): TonUtilsEnhanced {
//   if (!instance && config) {
//     instance = new TonUtilsEnhanced(config);
//   }
  
//   if (!instance) {
//     throw new Error('TonUtilsEnhanced не инициализирован. Вызовите с конфигом сначала.');
//   }
  
//   return instance;
// }

// // Хук для React
// export const useTonUtils = (network: 'mainnet' | 'testnet' = 'mainnet') => {
//   const config: BlockchainConfig = { network };
//   const utils = new TonUtilsEnhanced(config);

//   return {
//     checkTransaction: (hash: string) => utils.checkTransactionWithRetry(hash),
//     monitorBalance: (address: string, expectedChange: string) => 
//       utils.monitorBalanceChange(address, expectedChange),
//     getBalance: (address: string) => utils.getBalance(address),
//     batchVerify: (hashes: string[]) => utils.batchVerifyTransactions(hashes)
//   };
// };

// src/utils/tonUtilsEnhanced.ts
// Улучшенные утилиты для работы с TON блокчейном

import { Address, Cell } from 'ton-core';

export interface BlockchainConfig {
  network: 'mainnet' | 'testnet';
  toncenterApiKey?: string;
  tonapiToken?: string;
}

export interface TransactionCheckResult {
  hash: string;
  confirmed: boolean;
  block?: number;
  timestamp?: number;
  error?: string;
  messages?: Array<{
    from: string;
    to: string;
    value: string;
    success: boolean;
  }>;
}

export class TonUtilsEnhanced {
  private config: BlockchainConfig;

  constructor(config: BlockchainConfig) {
    this.config = config;
  }

  /**
   * Проверка транзакции по hash с retry логикой
   */
  async checkTransactionWithRetry(
    hash: string,
    options: {
      maxAttempts?: number;
      delayBetweenAttempts?: number;
      timeout?: number;
    } = {}
  ): Promise<TransactionCheckResult> {
    const {
      maxAttempts = 10,
      delayBetweenAttempts = 3000,
      timeout = 60000
    } = options;

    const startTime = Date.now();
    let attempts = 0;

    while (attempts < maxAttempts && Date.now() - startTime < timeout) {
      attempts++;
      
      try {
        const result = await this.checkTransaction(hash);
        
        if (result.confirmed) {
          console.log(`✅ Транзакция ${hash} подтверждена с попытки ${attempts}`);
          return result;
        }
        
        if (result.error && !result.error.includes('not found')) {
          // Критическая ошибка, не продолжаем
          return result;
        }
        
        console.log(`⏳ Транзакция ${hash} еще не подтверждена, попытка ${attempts}/${maxAttempts}`);
        
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
        }
        
      } catch (error) {
        console.warn(`⚠️ Ошибка при проверке транзакции ${hash} (попытка ${attempts}):`, error);
        
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
        }
      }
    }

    return {
      hash,
      confirmed: false,
      error: `Транзакция не подтверждена после ${attempts} попыток`
    };
  }

  /**
   * Проверка транзакции через несколько источников
   */
  private async checkTransaction(hash: string): Promise<TransactionCheckResult> {
    // Пробуем несколько источников для надежности
    const sources = [
      this.checkViaTonApi.bind(this),
      this.checkViaTonCenter.bind(this),
      this.checkViaTonViewer.bind(this)
    ];

    for (const source of sources) {
      try {
        const result = await source(hash);
        if (result.confirmed || result.error) {
          return result;
        }
      } catch (error) {
        // Пробуем следующий источник
        continue;
      }
    }

    return {
      hash,
      confirmed: false,
      error: 'Транзакция не найдена'
    };
  }

  /**
   * Проверка через tonapi.io
   */
  private async checkViaTonApi(hash: string): Promise<TransactionCheckResult> {
    const baseUrl = this.config.network === 'testnet' 
      ? 'https://testnet.tonapi.io/v2' 
      : 'https://tonapi.io/v2';
    
    const url = `${baseUrl}/blockchain/transactions/${hash}`;
    const headers: HeadersInit = {};
    
    if (this.config.tonapiToken) {
      headers['Authorization'] = `Bearer ${this.config.tonapiToken}`;
    }

    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      if (response.status === 404) {
        return { hash, confirmed: false, error: 'Transaction not found' };
      }
      throw new Error(`TON API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      hash: data.hash,
      confirmed: true,
      block: data.block?.seqno,
      timestamp: data.utime,
      messages: data.out_msgs?.map((msg: any) => ({
        from: msg.source,
        to: msg.destination,
        value: msg.value,
        success: true
      }))
    };
  }

  /**
   * Проверка через toncenter.com
   */
  private async checkViaTonCenter(hash: string): Promise<TransactionCheckResult> {
    const baseUrl = this.config.network === 'testnet'
      ? 'https://testnet.toncenter.com/api/v2'
      : 'https://toncenter.com/api/v2';
    
    const url = `${baseUrl}/getTransactions?hash=${hash}&limit=1`;
    const headers: HeadersInit = {};
    
    if (this.config.toncenterApiKey) {
      headers['X-API-Key'] = this.config.toncenterApiKey;
    }

    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`TonCenter error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.ok || !data.result || data.result.length === 0) {
      return { hash, confirmed: false, error: 'Transaction not found' };
    }

    const tx = data.result[0];
    
    return {
      hash: tx.hash,
      confirmed: true,
      block: tx.block,
      timestamp: tx.utime,
      messages: tx.out_msgs?.map((msg: any) => ({
        from: msg.source,
        to: msg.destination,
        value: msg.value,
        success: msg.success
      }))
    };
  }

  /**
   * Проверка через tonviewer.com (fallback)
   */
  private async checkViaTonViewer(hash: string): Promise<TransactionCheckResult> {
    const baseUrl = this.config.network === 'testnet'
      ? 'https://testnet.tonviewer.com'
      : 'https://tonviewer.com';
    
    const url = `${baseUrl}/transaction/${hash}`;
    
    // TonViewer не имеет публичного API, но мы можем проверить доступность страницы
    const response = await fetch(url, { method: 'HEAD' });
    
    if (response.ok) {
      return {
        hash,
        confirmed: true,
        error: 'Confirmed via TonViewer (page exists)'
      };
    }
    
    return { hash, confirmed: false, error: 'Transaction not found in TonViewer' };
  }

  /**
   * Проверка баланса адреса
   */
  async getBalance(address: string): Promise<string> {
    const baseUrl = this.config.network === 'testnet'
      ? 'https://testnet.toncenter.com/api/v2'
      : 'https://toncenter.com/api/v2';
    
    const url = `${baseUrl}/getAddressInformation?address=${address}`;
    const headers: HeadersInit = {};
    
    if (this.config.toncenterApiKey) {
      headers['X-API-Key'] = this.config.toncenterApiKey;
    }

    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`Failed to get balance: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(data.error || 'Failed to get balance');
    }

    return data.result.balance;
  }

  /**
   * Мониторинг изменения баланса (для подтверждения платежей)
   */
  async monitorBalanceChange(
    address: string,
    expectedChange: string,
    timeout = 60000,
    checkInterval = 3000
  ): Promise<boolean> {
    const startBalance = await this.getBalance(address);
    const startTime = Date.now();
    const expectedChangeNum = BigInt(expectedChange);

    console.log(`👀 Мониторинг баланса ${address}, начальный баланс: ${startBalance}`);

    while (Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      
      try {
        const currentBalance = await this.getBalance(address);
        const balanceChange = BigInt(currentBalance) - BigInt(startBalance);

        console.log(`📊 Текущий баланс: ${currentBalance}, изменение: ${balanceChange}`);

        if (balanceChange >= expectedChangeNum) {
          console.log(`✅ Обнаружено ожидаемое изменение баланса: ${balanceChange}`);
          return true;
        }
      } catch (error) {
        console.warn('Ошибка при проверке баланса:', error);
      }
    }

    console.log(`❌ Таймаут мониторинга баланса (${timeout}мс)`);
    return false;
  }

  /**
   * Пакетная проверка транзакций
   */
  async batchVerifyTransactions(
    hashes: string[],
    concurrency = 3
  ): Promise<Map<string, TransactionCheckResult>> {
    const results = new Map<string, TransactionCheckResult>();
    
    // Разбиваем на группы для параллельной проверки
    const groups = [];
    for (let i = 0; i < hashes.length; i += concurrency) {
      groups.push(hashes.slice(i, i + concurrency));
    }

    for (const group of groups) {
      const promises = group.map(async (hash) => {
        try {
          const result = await this.checkTransactionWithRetry(hash, {
            maxAttempts: 3,
            timeout: 15000
          });
          return { hash, result };
        } catch (error) {
          return { 
            hash, 
            result: { 
              hash, 
              confirmed: false, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            } 
          };
        }
      });

      const groupResults = await Promise.all(promises);
      
      groupResults.forEach(({ hash, result }) => {
        results.set(hash, result);
      });

      // Небольшая пауза между группами
      if (groups.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  /**
   * Извлечение данных из BOC
   */
  static extractDataFromBoc(boc: string): {
    hash: string;
    cell: Cell;
    isComplete: boolean;
  } | null {
    try {
      const buffer = Buffer.from(boc, 'base64');
      const cell = Cell.fromBoc(buffer)[0];
      const hash = cell.hash().toString('hex');
      
      // Исправлено: cell.isExotic возвращает boolean, а не number
      // Проверяем, что cell не является экзотическим (обычная ячейка)
      return {
        hash,
        cell,
        isComplete: !cell.isExotic // Обычная ячейка считается полной
      };
    } catch (error) {
      console.error('Ошибка парсинга BOC:', error);
      return null;
    }
  }

  /**
   * Валидация адреса TON
   */
  static isValidAddress(address: string): boolean {
    try {
      Address.parse(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Нормализация адреса
   */
  static normalizeAddress(address: string): string {
    try {
      const addr = Address.parse(address);
      return addr.toString({ 
        bounceable: true, 
        testOnly: false,
        urlSafe: true 
      });
    } catch {
      return address;
    }
  }
}

// Экспорт синглтона для удобства
let instance: TonUtilsEnhanced | null = null;

export function getTonUtils(config?: BlockchainConfig): TonUtilsEnhanced {
  if (!instance && config) {
    instance = new TonUtilsEnhanced(config);
  }
  
  if (!instance) {
    throw new Error('TonUtilsEnhanced не инициализирован. Вызовите с конфигом сначала.');
  }
  
  return instance;
}

// Хук для React
export const useTonUtils = (network: 'mainnet' | 'testnet' = 'mainnet') => {
  const config: BlockchainConfig = { network };
  const utils = new TonUtilsEnhanced(config);

  return {
    checkTransaction: (hash: string) => utils.checkTransactionWithRetry(hash),
    monitorBalance: (address: string, expectedChange: string) => 
      utils.monitorBalanceChange(address, expectedChange),
    getBalance: (address: string) => utils.getBalance(address),
    batchVerify: (hashes: string[]) => utils.batchVerifyTransactions(hashes)
  };
};