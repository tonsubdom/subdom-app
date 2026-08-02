import { useEffect, useMemo, useState } from 'react';
import {
  BlockchainLoadProgress,
  getBlockchainLoadProgress,
  subscribeBlockchainLoadProgress,
} from '@/services/blockchainItems/loading-progress-bus';

export function useBlockchainLoadProgress(): BlockchainLoadProgress {
  const [progress, setProgress] = useState<BlockchainLoadProgress>(getBlockchainLoadProgress());

  useEffect(() => subscribeBlockchainLoadProgress(setProgress), []);

  return progress;
}

export interface BlockchainScanUi {
  percent: number | undefined;
  statusText: string | undefined;
}

/**
 * Общий для ManageDomainPage/ProfileWidget вид прогресса сканирования —
 * раньше был продублирован в обоих местах один в один и рисковал разъехаться
 * при правках (как и случилось: только тут посчитан ETA). Оценка оставшегося
 * времени — по факту уже прошедшего (elapsed / done * remaining), реальная
 * зависимость от текущей скорости запросов, а не фиктивная анимация.
 */
export function useBlockchainScanUi(): BlockchainScanUi {
  const progress = useBlockchainLoadProgress();

  return useMemo(() => {
    if (progress.stage === 'items' && progress.total > 0) {
      const { done, total, startedAt } = progress;
      const percent = Math.round((done / total) * 100);

      // До 2-3 обработанных коллекций оценка слишком шумная (одна медленная
      // коллекция сильно всё перекосит) — не показываем, пока не наберётся
      // более-менее стабильное среднее.
      let etaText = '';
      if (startedAt && done >= 3 && done < total) {
        const elapsedMs = Date.now() - startedAt;
        const msPerItem = elapsedMs / done;
        const remainingMs = msPerItem * (total - done);
        const remainingSec = Math.max(1, Math.round(remainingMs / 1000));
        etaText = ` — осталось ~${remainingSec} сек`;
      }

      return {
        percent,
        statusText: `Обработано ${done} из ${total} коллекций${etaText}`,
      };
    }
    if (progress.stage === 'collections') {
      return {
        percent: undefined,
        statusText: `Найдено коллекций: ${progress.done}`,
      };
    }
    return { percent: undefined, statusText: undefined };
  }, [progress]);
}
