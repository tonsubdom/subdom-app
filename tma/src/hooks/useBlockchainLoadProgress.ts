import { useEffect, useState } from 'react';
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
