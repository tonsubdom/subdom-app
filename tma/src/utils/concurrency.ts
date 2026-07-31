// src/utils/concurrency.ts
// Пул воркеров с ограниченной параллельностью для тонцентр-запросов:
// N воркеров разбирают общую очередь, каждый в моменте держит не больше
// одного запроса в полёте — это и есть "максимум для нашего ключа" без
// всплесков сверх известного лимита (см. Group 4 — план держит ~25 rps).

export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index], index);
    }
  };

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, worker));

  return results;
}
