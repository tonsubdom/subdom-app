// src/services/blockchainItems/loading-progress-bus.ts
//
// Лёгкий pub/sub вне Redux для прогресса первичной загрузки блокчейн-данных
// (UniversalBlockchainService.getAllAppData). Не тащим это через thunk/slice —
// прогресс чисто UI-эффемерный (не нужно ни кэшировать, ни персистить), а сервис
// уже и так гоняет чанкованные циклы с console.log на каждом пакете — здесь просто
// зеркалим те же чекпоинты наружу для лоадера.

export interface BlockchainLoadProgress {
  stage: 'idle' | 'collections' | 'items';
  done: number;
  /** total === 0 значит "неизвестно заранее" (пагинация) — показываем просто счётчик */
  total: number;
}

let current: BlockchainLoadProgress = { stage: 'idle', done: 0, total: 0 };
const listeners = new Set<(p: BlockchainLoadProgress) => void>();

export function reportBlockchainLoadProgress(
  stage: BlockchainLoadProgress['stage'],
  done: number,
  total: number
): void {
  current = { stage, done, total };
  listeners.forEach((listener) => listener(current));
}

export function getBlockchainLoadProgress(): BlockchainLoadProgress {
  return current;
}

export function subscribeBlockchainLoadProgress(
  listener: (p: BlockchainLoadProgress) => void
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
