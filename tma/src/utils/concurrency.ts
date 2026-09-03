// src/utils/concurrency.ts
// Пул воркеров с ограниченной параллельностью для тонцентр-запросов:
// N воркеров разбирают общую очередь, каждый в моменте держит не больше
// одного запроса в полёте — это и есть "максимум для нашего ключа" без
// всплесков сверх известного лимита (см. Group 4 — план держит ~25 rps).

export interface Semaphore {
  acquire(): Promise<() => void>;
}

// Несколько независимых mapWithConcurrency-сканов (ActiveAuctions,
// ProfileWidget — загрузка аукционов и подсчёт прибыли) бьют в один и тот же
// toncenter-ключ каждый своим пулом воркеров — если запускались одновременно,
// суммарный burst выходил за пределы ~25 rps плана и ловил 429 (см.
// toncenterScanSemaphore.ts). Общий семафор с фиксированным числом permits
// даёт всем вызывающим один и тот же лимит на всех разом — один сканер сам
// по себе получает весь лимит, несколько одновременных делят его по мере
// освобождения слотов, никто не резервирует лимит только под себя.
export function createSemaphore(permits: number): Semaphore {
  let available = permits;
  const queue: Array<() => void> = [];

  const release = () => {
    available++;
    const next = queue.shift();
    if (next) next();
  };

  return {
    acquire: () =>
      new Promise<() => void>((resolve) => {
        const grant = () => {
          available--;
          resolve(release);
        };
        if (available > 0) grant();
        else queue.push(grant);
      }),
  };
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
  onProgress?: (done: number, total: number) => void,
  semaphore?: Semaphore
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  let done = 0;

  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      const release = await semaphore?.acquire();
      try {
        results[index] = await fn(items[index], index);
      } finally {
        release?.();
      }
      done++;
      onProgress?.(done, items.length);
    }
  };

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, worker));

  return results;
}
