
// src/services/transactionService.ts
// Сервис для надежной отправки транзакций с проверкой статуса и retry логикой

import { TonConnectUI } from '@tonconnect/ui-react';
import { Cell, Address } from 'ton-core';
import { trackTxFailed } from '@/utils/analytics';
import { NETWORK_CONFIGS } from '@/services/blockchainItems/toncenter-api-config';

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
  /** Название сценария для аналитики (funnel-событие tx_failed), напр. 'deploy_sbt_zone' */
  action?: string;
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
      network = 'mainnet',
      action = 'unknown'
    } = options;

    try {
      // 1. Отправка транзакции через TonConnect — один раз
      const sendResult = await tonConnectUI.sendTransaction(transaction);

      if (!sendResult?.boc) {
        trackTxFailed(action, 'no_boc_returned');
        return { success: false, error: 'Транзакция не вернула BOC' };
      }

      console.log('✅ Транзакция подписана, BOC получен');

      // 2. Извлекаем hash из BOC
      const txHash = this.extractHashFromBoc(sendResult.boc);
      if (!txHash) {
        return { success: false, error: 'Не удалось извлечь hash из BOC' };
      }

      console.log(`📝 Hash транзакции: ${txHash}`);

      // extractHashFromBoc даёт хеш ПОДПИСАННОГО external-сообщения — это
      // хеш транзакции КОШЕЛЬКА (recv_external, пересылка дальше), а не
      // хеш транзакции целевого контракта, который реально исполняет наш
      // вызов. Адрес назначения нужен, чтобы во waitForConfirmation
      // сделать второй хоп и проверить именно ЕГО результат (см. комментарий
      // там же) — иначе кошелёк "переслал успешно" ошибочно читается как
      // "контракт выполнил успешно", даже если тот же вызов бампнулся
      // (bounce) с ошибкой компиляции.
      const destinationAddress =
        transaction?.messages?.[0]?.address as string | undefined;

      // 3. Если требуется проверка в блокчейне — ждём (с внутренним поллингом,
      // без повторной отправки транзакции)
      if (verifyBlockchain) {
        const confirmed = await this.waitForConfirmation(txHash, network, timeout, destinationAddress);

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
        trackTxFailed(action, confirmed.error || 'not_confirmed_in_time');
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
      trackTxFailed(action, message);
      return { success: false, error: message };
    }
  }

  /**
   * Ожидание подтверждения транзакции в блокчейне
   */
  static async waitForConfirmation(
    hash: string,
    network: 'mainnet' | 'testnet',
    timeout: number,
    destinationAddress?: string
  ): Promise<{ success: boolean; error?: string; status?: TransactionStatus }> {
    const startTime = Date.now();
    const checkInterval = 3000; // Проверяем каждые 3 секунды

    console.log(`⏳ Ожидание подтверждения транзакции ${hash}...`);

    while (Date.now() - startTime < timeout) {
      try {
        const status = await this.getTransactionStatus(hash, network, destinationAddress);
        
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
   * Получение статуса транзакции.
   *
   * `hash` — это hash ВХОДЯЩЕГО внешнего сообщения (extractHashFromBoc), а
   * не hash итоговой транзакции — это два разных значения в TON. Раньше
   * здесь запрашивали tonapi/toncenter "по хешу транзакции" (эндпоинты
   * transactions/{hash}, getTransactions?hash=), передавая туда хеш
   * сообщения — запрос почти всегда не находил совпадение, и юзер видел
   * "транзакция не подтверждена в блокчейне", хотя платёж реально прошёл.
   * toncenter v3 `/transactionsByMessage` — единственный источник в
   * проекте (см. NETWORK_CONFIGS/TonCenterAPI, платный план 25 req/s,
   * используется во всех остальных ончейн-запросах приложения) — умеет
   * искать транзакцию именно по хешу входящего сообщения.
   *
   * ВАЖНО (хоп 2): транзакция, найденная по этому hash, — это транзакция
   * КОШЕЛЬКА (recv_external, обработка подписанного сообщения) — она почти
   * всегда успешна, кошелёк просто пересылает internal-сообщение дальше.
   * Её успех НЕ означает, что целевой контракт реально выполнил вызов —
   * если тот бампнулся (bounce) с ошибкой компиляции, кошелёк всё равно
   * отчитывается "успешно переслал". Раньше это читалось как успех всей
   * операции (реальный баг — юзер видел "✅ отправлено" на транзакции,
   * которая на самом деле откатилась на чейне с exit_code, см. случай со
   * storage-контрактом, TonScan: compute phase exit 9, action phase
   * aborted, bounce). Если передан destinationAddress — идём ВТОРЫМ хопом:
   * ищем в out_msgs транзакции кошелька исходящее сообщение на этот адрес,
   * и уже ЕГО транзакцию (реальное исполнение на целевом контракте)
   * проверяем на aborted/compute/action. Пока хоп 2 не нашёлся — статус
   * 'pending' (не 'failed' и не 'confirmed'), внешний поллинг просто ждёт
   * следующего цикла — так безопаснее: неопределённость не должна
   * маскироваться ни под успех, ни под ошибку.
   */
  static async getTransactionStatus(
    hash: string,
    network: 'mainnet' | 'testnet',
    destinationAddress?: string
  ): Promise<TransactionStatus> {
    const config = NETWORK_CONFIGS[network];

    const fetchTxByMsgHash = async (msgHash: string): Promise<any | null> => {
      const url = new URL(`${config.API_URL}/transactionsByMessage`);
      url.searchParams.set('msg_hash', msgHash);
      url.searchParams.set('direction', 'in');
      url.searchParams.set('limit', '1');
      if (config.API_KEY) url.searchParams.set('api_key', config.API_KEY);
      const response = await fetch(url.toString());
      if (!response.ok) return null;
      const data = await response.json();
      return data?.transactions?.[0] ?? null;
    };

    const isFailedTx = (tx: any): boolean =>
      !!tx.description?.aborted ||
      tx.description?.compute_ph?.success === false ||
      tx.description?.action?.success === false;

    const toStatus = (tx: any, status: TransactionStatus['status']): TransactionStatus => ({
      hash: tx.hash,
      status,
      block: tx.block_ref?.seqno,
      timestamp: tx.now,
      messages: (tx.out_msgs || []).map((msg: any) => ({
        source: msg.source,
        destination: msg.destination,
        value: msg.value,
        success: true,
      })),
    });

    try {
      const walletTx = await fetchTxByMsgHash(hash);
      if (!walletTx) {
        return { hash, status: 'not_found' };
      }
      if (isFailedTx(walletTx)) {
        return toStatus(walletTx, 'failed');
      }

      // Нет адреса назначения (не передали при вызове) — второй хоп сделать
      // нечем, остаёмся на прежнем поведении: успех кошелька = успех.
      if (!destinationAddress) {
        return toStatus(walletTx, 'confirmed');
      }

      let destRaw: string;
      try {
        destRaw = Address.parse(destinationAddress).toRawString().toLowerCase();
      } catch {
        // Не смогли распарсить адрес назначения — не наша забота ломать
        // проверку из-за этого, откатываемся на старое поведение.
        return toStatus(walletTx, 'confirmed');
      }

      const outMsg = (walletTx.out_msgs || []).find(
        (m: any) => (m.destination || '').toLowerCase() === destRaw
      );
      if (!outMsg) {
        return { hash, status: 'pending' }; // кошелёк отработал, исходящее сообщение ещё не видно — ждём
      }

      const destTx = await fetchTxByMsgHash(outMsg.hash);
      if (!destTx) {
        return { hash, status: 'pending' }; // хоп 2 ещё не проиндексировался — ждём следующего цикла
      }

      return toStatus(destTx, isFailedTx(destTx) ? 'failed' : 'confirmed');
    } catch (error) {
      console.warn('toncenter v3 недоступен:', error);
      return { hash, status: 'not_found' };
    }
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
   * Извлечение hash входящего сообщения из BOC, который TonConnect
   * возвращает после sendTransaction. base64, а не hex — так toncenter v3
   * (`/transactionsByMessage?msg_hash=...`) принимает msg_hash.
   */
  static extractHashFromBoc(boc: string): string | null {
    try {
      if (boc.length < 64) return null;

      const cell = Cell.fromBoc(Buffer.from(boc, 'base64'))[0];
      const hash = cell.hash().toString('base64');

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