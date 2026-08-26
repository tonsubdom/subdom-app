// Структурированное логирование действий фронтенда (TG Mini App).
//
// Почему не через docker-логи (как предлагалось изначально): этот код
// выполняется в браузере/WebView пользователя, не в контейнере — grep по
// `docker compose logs` физически не увидит console.log из чужого браузера.
// Вместо этого: (1) пишем JSON в консоль — удобно при живой отладке через
// remote devtools/логи Telegram; (2) на реальной ошибке шлём relay-событие
// через apiService.notifyClientError (тот же паттерн, что notifyZoneCreated
// и остальные relay-уведомления), бэкенд форвардит админу в Telegram. Имя
// события = имя сценария (то же значение, что уже передаётся как `action` в
// TransactionService/analytics.ts) — единый человекочитаемый идентификатор
// без отдельного маппинга.

import { apiService } from '@/services/api';

export interface StructuredLogContext {
  [key: string]: unknown;
}

interface LogEventParams {
  event: string;
  status: 'success' | 'error';
  error?: string;
  context?: StructuredLogContext;
  isTestnet?: boolean;
}

export function logEvent({ event, status, error, context, isTestnet }: LogEventParams): void {
  const entry = {
    time: new Date().toISOString(),
    service: 'tg-mini-app',
    level: status === 'error' ? 'error' : 'info',
    event,
    status,
    ...(error ? { error } : {}),
    ...(context ? { context } : {}),
  };

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(entry));

  if (status === 'error') {
    if (typeof isTestnet === 'boolean') apiService.setNetwork(isTestnet);
    void apiService.notifyClientError({ event, error: error || 'unknown', context });
  }
}

// Оставлено для точек, которые сейчас не проходят через TransactionService
// (например payloadBuilder до его подключения к UI) — тот же формат события.
export function logSuccess(event: string, context?: StructuredLogContext): void {
  logEvent({ event, status: 'success', context });
}

export function logFailure(event: string, error: string, context?: StructuredLogContext, isTestnet?: boolean): void {
  logEvent({ event, status: 'error', error, context, isTestnet });
}
