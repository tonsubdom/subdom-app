
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
   * Отправка транзакции с проверкой статуса.
   *
   * tonConnectUI.sendTransaction() вызывается СТРОГО ОДИН РАЗ — раньше при
   * обрыве проверки подтверждения (таймаут/сетевая ошибка ПОСЛЕ того, как
   * платёж уже ушёл в кошелёк) внешний цикл повторно звал sendTransaction,
   * то есть заново слал юзеру запрос на подпись той же самой платёжной
   * транзакции. Юзер, не заметив, что это дубликат, мог по случайности
   * оплатить одно и то же 2-3 раза. Ожидание подтверждения (waitForConfirmation)
   * само по себе уже поллит статус нужное время — этого достаточно. Если
   * транзакция реально не дошла (юзер отменил в кошельке) — юзер увидит
   * ошибку и отправит заново сам, осознанно.
   */
  static async sendTransaction(
    tonConnectUI: TonConnectUI,
    transaction: any,
    options: TransactionOptions = {}
  ): Promise<TransactionResult> {
    const {
      timeout = 60000, // 60 секунд
      verifyBlockchain = true,
      network = 'mainnet'
    } = options;

    try {
      // 1. Отправка транзакции через TonConnect — один раз
      const sendResult = await tonConnectUI.sendTransaction(transaction);

      if (!sendResult?.boc) {
        return { success: false, error: 'Транзакция не вернула BOC' };
      }

      console.log('✅ Транзакция подписана, BOC получен');

      // 2. Извлекаем hash из BOC
      const txHash = this.extractHashFromBoc(sendResult.boc);
      if (!txHash) {
        return { success: false, error: 'Не удалось извлечь hash из BOC' };
      }

      console.log(`📝 Hash транзакции: ${txHash}`);

      // 3. Если требуется проверка в блокчейне — ждём (с внутренним поллингом,
      // без повторной отправки транзакции)
      if (verifyBlockchain) {
        const confirmed = await this.waitForConfirmation(txHash, network, timeout);

        if (confirmed.success) {
          console.log('✅ Транзакция подтверждена в блокчейне');
          return {
            success: true,
            boc: sendResult.boc,
            hash: txHash,
            confirmedInBlock: true
          };
        }

        // Транзакция ушла (hash есть), но подтверждение не поймали за
        // timeout — это не "не отправилось", это "неизвестно". Отдаём hash
        // вызывающему коду, чтобы UI мог показать "отправлено, не подтверждено"
        // вместо повторной отправки.
        return {
          success: false,
          boc: sendResult.boc,
          hash: txHash,
          error: confirmed.error || 'Транзакция не подтверждена в блокчейне',
          confirmedInBlock: false
        };
      }

      // Если проверка не требуется, считаем успешной
      return {
        success: true,
        boc: sendResult.boc,
        hash: txHash,
        confirmedInBlock: false
      };
    } catch (error: any) {
      const message = this.normalizeError(error);
      console.error('❌ Ошибка при отправке транзакции:', message);
      return { success: false, error: message };
    }
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
   * Упрощенная отправка с базовой проверкой (короткий таймаут подтверждения)
   */
  static async sendSimple(
    tonConnectUI: TonConnectUI,
    transaction: any,
    network: 'mainnet' | 'testnet' = 'mainnet'
  ): Promise<{ success: boolean; hash?: string; error?: string }> {
    return this.sendTransaction(tonConnectUI, transaction, {
      timeout: 30000,
      network
    });
  }

  /**
   * Отправка с увеличенным таймаутом ожидания подтверждения (для критичных
   * операций) — сама транзакция всё равно отправляется в кошелёк один раз.
   */
  static async sendWithAggressiveRetry(
    tonConnectUI: TonConnectUI,
    transaction: any,
    network: 'mainnet' | 'testnet' = 'mainnet'
  ): Promise<TransactionResult> {
    return this.sendTransaction(tonConnectUI, transaction, {
      timeout: 120000, // 2 минуты
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