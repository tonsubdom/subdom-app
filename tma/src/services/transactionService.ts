
// src/services/transactionService.ts
// Сервис для надежной отправки транзакций с проверкой статуса и retry логикой

import { TonConnectUI } from '@tonconnect/ui-react';
import { Cell } from 'ton-core';

export interface TransactionOptions {
  /** Максимальное время ожидания подтверждения (мс) */
  timeout?: number;
  /** Количество попыток отправки */
  maxRetries?: number;
  /** Базовая задержка между попытками (мс) */
  baseDelay?: number;
  /** Проверять ли статус транзакции в блокчейне */
  verifyBlockchain?: boolean;
  /** Сеть (mainnet/testnet) */
  network?: 'mainnet' | 'testnet';
}

export interface TransactionResult {
  success: boolean;
  boc?: string;
  hash?: string;
  error?: string;
  retries?: number;
  confirmedInBlock?: boolean;
}

export interface TransactionStatus {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed' | 'not_found';
  block?: number;
  timestamp?: number;
  messages?: Array<{
    source: string;
    destination: string;
    value: string;
    success: boolean;
  }>;
}

export class TransactionService {
  private static readonly TONCENTER_API = {
    mainnet: 'https://toncenter.com/api/v2',
    testnet: 'https://testnet.toncenter.com/api/v2'
  };

  private static readonly TONAPI_IO = {
    mainnet: 'https://tonapi.io/v2',
    testnet: 'https://testnet.tonapi.io/v2'
  };

  /**
   * Отправка транзакции с проверкой статуса и retry логикой
   */
  static async sendTransaction(
    tonConnectUI: TonConnectUI,
    transaction: any,
    options: TransactionOptions = {}
  ): Promise<TransactionResult> {
    const {
      timeout = 60000, // 60 секунд
      maxRetries = 3,
      baseDelay = 2000,
      verifyBlockchain = true,
      network = 'mainnet'
    } = options;

    let lastError: string = '';
    let retryCount = 0;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      retryCount = attempt;
      console.log(`🔄 Попытка отправки транзакции ${attempt}/${maxRetries}`);

      try {
        // 1. Отправка транзакции через TonConnect
        const sendResult = await tonConnectUI.sendTransaction(transaction);
        
        if (!sendResult?.boc) {
          lastError = 'Транзакция не вернула BOC';
          continue;
        }

        console.log('✅ Транзакция подписана, BOC получен');

        // 2. Извлекаем hash из BOC
        const txHash = this.extractHashFromBoc(sendResult.boc);
        if (!txHash) {
          lastError = 'Не удалось извлечь hash из BOC';
          continue;
        }

        console.log(`📝 Hash транзакции: ${txHash}`);

        // 3. Если требуется проверка в блокчейне
        if (verifyBlockchain) {
          const confirmed = await this.waitForConfirmation(
            txHash,
            network,
            timeout
          );

          if (confirmed.success) {
            console.log('✅ Транзакция подтверждена в блокчейне');
            return {
              success: true,
              boc: sendResult.boc,
              hash: txHash,
              retries: attempt,
              confirmedInBlock: true
            };
          } else {
            lastError = confirmed.error || 'Транзакция не подтверждена в блокчейне';
            console.log(`❌ ${lastError}`);
          }
        } else {
          // Если проверка не требуется, считаем успешной
          return {
            success: true,
            boc: sendResult.boc,
            hash: txHash,
            retries: attempt,
            confirmedInBlock: false
          };
        }

        // 4. Экспоненциальная задержка перед следующей попыткой
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.log(`⏳ Ожидание ${delay}мс перед следующей попыткой...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (error: any) {
        lastError = this.normalizeError(error);
        console.error(`❌ Ошибка при отправке (попытка ${attempt}):`, lastError);

        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return {
      success: false,
      error: lastError || `Не удалось отправить транзакцию после ${maxRetries} попыток`,
      retries: retryCount
    };
  }

  /**
   * Ожидание подтверждения транзакции в блокчейне
   */
  static async waitForConfirmation(
    hash: string,
    network: 'mainnet' | 'testnet',
    timeout: number
  ): Promise<{ success: boolean; error?: string; status?: TransactionStatus }> {
    const startTime = Date.now();
    const checkInterval = 3000; // Проверяем каждые 3 секунды

    console.log(`⏳ Ожидание подтверждения транзакции ${hash}...`);

    while (Date.now() - startTime < timeout) {
      try {
        const status = await this.getTransactionStatus(hash, network);
        
        switch (status.status) {
          case 'confirmed':
            console.log(`✅ Транзакция включена в блок ${status.block}`);
            return { success: true, status };
          
          case 'failed':
            return { 
              success: false, 
              error: 'Транзакция завершилась ошибкой',
              status 
            };
          
          case 'not_found':
            // Транзакция еще не появилась, продолжаем ждать
            break;
          
          case 'pending':
            // В процессе, продолжаем ждать
            break;
        }

        // Ждем перед следующей проверкой
        await new Promise(resolve => setTimeout(resolve, checkInterval));

      } catch (error) {
        console.warn(`⚠️ Ошибка при проверке статуса: ${error}`);
        // Продолжаем попытки
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    }

    return {
      success: false,
      error: `Таймаут ожидания подтверждения (${timeout}мс)`
    };
  }

  /**
   * Получение статуса транзакции
   */
  static async getTransactionStatus(
    hash: string,
    network: 'mainnet' | 'testnet'
  ): Promise<TransactionStatus> {
    try {
      // Пробуем получить через tonapi.io (более надежный)
      const tonapiUrl = `${this.TONAPI_IO[network]}/blockchain/transactions/${hash}`;
      const tonapiResponse = await fetch(tonapiUrl);
      
      if (tonapiResponse.ok) {
        const data = await tonapiResponse.json();
        
        if (data.hash) {
          return {
            hash: data.hash,
            status: 'confirmed',
            block: data.block?.seqno,
            timestamp: data.utime,
            messages: data.out_msgs?.map((msg: any) => ({
              source: msg.source,
              destination: msg.destination,
              value: msg.value,
              success: true
            }))
          };
        }
      }
    } catch (error) {
      console.warn('tonapi.io недоступен, пробуем toncenter...');
    }

    // Fallback на toncenter
    try {
      const toncenterUrl = `${this.TONCENTER_API[network]}/getTransactions?hash=${hash}&limit=1`;
      const response = await fetch(toncenterUrl);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.ok && data.result && data.result.length > 0) {
          const tx = data.result[0];
          return {
            hash: tx.hash,
            status: 'confirmed',
            block: tx.block,
            timestamp: tx.utime,
            messages: tx.out_msgs?.map((msg: any) => ({
              source: msg.source,
              destination: msg.destination,
              value: msg.value,
              success: msg.success
            }))
          };
        }
      }
    } catch (error) {
      console.warn('toncenter недоступен');
    }

    // Если транзакция не найдена ни в одном источнике
    return {
      hash,
      status: 'not_found'
    };
  }

  /**
   * Проверка нескольких транзакций одновременно
   */
  static async verifyTransactions(
    hashes: string[],
    network: 'mainnet' | 'testnet',
    timeout = 30000
  ): Promise<Array<{ hash: string; confirmed: boolean; error?: string }>> {
    const results = await Promise.all(
      hashes.map(async (hash) => {
        try {
          const startTime = Date.now();
          
          while (Date.now() - startTime < timeout) {
            const status = await this.getTransactionStatus(hash, network);
            
            if (status.status === 'confirmed') {
              return { hash, confirmed: true };
            }
            
            if (status.status === 'failed') {
              return { hash, confirmed: false, error: 'Transaction failed' };
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          return { hash, confirmed: false, error: 'Timeout' };
        } catch (error) {
          return { 
            hash, 
            confirmed: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      })
    );

    return results;
  }

  /**
   * Извлечение hash из BOC
   */
  static extractHashFromBoc(boc: string): string | null {
    try {
      // Простая реализация - в реальном приложении используйте ton-core
      // или другую библиотеку для парсинга BOC
      if (boc.length < 64) return null;
      
      // Для демонстрации - возвращаем первые 64 символа
      // В продакшене используйте: 
      
      const cell = Cell.fromBoc(Buffer.from(boc, 'base64'))[0];
      const hash = cell.hash().toString('hex');
      
      // return boc.substring(0, 64);
      return hash;
    } catch (error) {
      console.error('Ошибка извлечения hash из BOC:', error);
      return null;
    }
  }

  /**
   * Нормализация ошибок
   */
  private static normalizeError(error: any): string {
    if (!error) return 'Unknown error';
    
    if (typeof error === 'string') return error;
    
    if (error.message) {
      const msg = error.message.toLowerCase();
      
      if (msg.includes('cancelled') || msg.includes('отменена')) {
        return 'Транзакция отменена пользователем';
      }
      
      if (msg.includes('timeout') || msg.includes('таймаут')) {
        return 'Таймаут ожидания транзакции';
      }
      
      if (msg.includes('insufficient') || msg.includes('недостаточно')) {
        return 'Недостаточно средств для транзакции';
      }
      
      if (msg.includes('rejected') || msg.includes('отклонена')) {
        return 'Транзакция отклонена кошельком';
      }
      
      return error.message;
    }
    
    return JSON.stringify(error);
  }

  /**
   * Упрощенная отправка с базовой проверкой
   */
  static async sendSimple(
    tonConnectUI: TonConnectUI,
    transaction: any,
    network: 'mainnet' | 'testnet' = 'mainnet'
  ): Promise<{ success: boolean; hash?: string; error?: string }> {
    return this.sendTransaction(tonConnectUI, transaction, {
      maxRetries: 2,
      timeout: 30000,
      network
    });
  }

  /**
   * Отправка с агрессивными retry (для критичных операций)
   */
  static async sendWithAggressiveRetry(
    tonConnectUI: TonConnectUI,
    transaction: any,
    network: 'mainnet' | 'testnet' = 'mainnet'
  ): Promise<TransactionResult> {
    return this.sendTransaction(tonConnectUI, transaction, {
      maxRetries: 5,
      timeout: 120000, // 2 минуты
      baseDelay: 3000,
      network
    });
  }
}

// Вспомогательные функции для интеграции с вашим кодом

/**
 * Хук для использования TransactionService в React компонентах
 */
export const useTransactionService = () => {
  const sendTransaction = async (
    tonConnectUI: TonConnectUI,
    transaction: any,
    options?: TransactionOptions
  ) => {
    return TransactionService.sendTransaction(tonConnectUI, transaction, options);
  };

  const verifyTransaction = async (
    hash: string,
    network: 'mainnet' | 'testnet'
  ) => {
    return TransactionService.getTransactionStatus(hash, network);
  };

  return {
    sendTransaction,
    verifyTransaction,
    sendSimple: TransactionService.sendSimple,
    sendWithAggressiveRetry: TransactionService.sendWithAggressiveRetry,
    waitForConfirmation: TransactionService.waitForConfirmation,
    extractHashFromBoc: TransactionService.extractHashFromBoc
  };
};