// src/contexts/TutorialContext.tsx
//
// Пошаговая обучалка (онбординг): 5 блоков — профиль, sbt-зона/субдомен,
// сайт+торрент, маркет, вкладки профиля. Прогресс живёт на бэкенде
// (tutorial_progress, server-sqlite.ts), не в localStorage — юзер может
// вылететь из приложения посреди блока, и при возврате тур должен
// продолжиться с того же места, а не начаться заново.
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useTonWallet } from '@tonconnect/ui-react';
import { apiService } from '@/services/api';

export const TUTORIAL_STEPS = [
  'profile_saved', 'domain_answered', // блок 1 — профиль
  'zone_selected', 'subdomain_created', // блок 2 — sbt-зона/субдомен
  'site_visited', 'torrent_created', // блок 3 — сайт + торрент
  'market_toured', 'catalog_focused', // блок 4 — маркет
  'profile_tabs_toured', // блок 5 — вкладки профиля
] as const;
export type TutorialStepId = typeof TUTORIAL_STEPS[number];

interface TutorialContextType {
  active: boolean;
  started: boolean;
  completedSteps: TutorialStepId[];
  rewardGranted: boolean;
  rewardLength: string | null;
  showIntroModal: boolean;
  // Точка входа и с виджета, и с промо-карточки: если тур уже начинали —
  // сразу продолжает с места остановки, без повторного вопроса "начать?".
  openEntry: () => void;
  closeIntroModal: () => void;
  startTutorial: () => Promise<void>;
  exitTutorial: () => void;
  recordStep: (step: TutorialStepId) => Promise<void>;
  isStepDone: (step: TutorialStepId) => boolean;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};

interface TutorialProviderProps {
  children: ReactNode;
}

export const TutorialProvider: React.FC<TutorialProviderProps> = ({ children }) => {
  const wallet = useTonWallet();
  const walletAddress = wallet?.account?.address || null;
  const isTestnet = wallet?.account?.chain === '-3';

  const [active, setActive] = useState(false);
  const [started, setStarted] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<TutorialStepId[]>([]);
  const [rewardGranted, setRewardGranted] = useState(false);
  const [rewardLength, setRewardLength] = useState<string | null>(null);
  const [showIntroModal, setShowIntroModal] = useState(false);

  useEffect(() => {
    if (!walletAddress) {
      setStarted(false);
      setCompletedSteps([]);
      setRewardGranted(false);
      setRewardLength(null);
      setActive(false);
      return;
    }

    apiService.setNetwork(isTestnet);
    apiService.getTutorialProgress(walletAddress).then((progress) => {
      setStarted(progress.started);
      setCompletedSteps(progress.completedSteps as TutorialStepId[]);
      setRewardGranted(progress.rewardGranted);
      setRewardLength(progress.rewardLength);
    });
  }, [walletAddress, isTestnet]);

  const openEntry = useCallback(() => {
    if (rewardGranted) return; // тур уже полностью пройден — виджет сам покажет короткое "уже пройдено"
    if (started) {
      setActive(true);
    } else {
      setShowIntroModal(true);
    }
  }, [started, rewardGranted]);

  const closeIntroModal = useCallback(() => setShowIntroModal(false), []);

  const startTutorial = useCallback(async () => {
    if (!walletAddress) return;
    apiService.setNetwork(isTestnet);
    await apiService.startTutorial(walletAddress);
    setStarted(true);
    setActive(true);
    setShowIntroModal(false);
  }, [walletAddress, isTestnet]);

  const exitTutorial = useCallback(() => {
    setActive(false);
    setShowIntroModal(false);
  }, []);

  const recordStep = useCallback(async (step: TutorialStepId) => {
    if (!walletAddress) return;
    apiService.setNetwork(isTestnet);
    const progress = await apiService.recordTutorialStep(walletAddress, step);
    setCompletedSteps(progress.completedSteps as TutorialStepId[]);
    setRewardGranted(progress.rewardGranted);
    setRewardLength(progress.rewardLength);
  }, [walletAddress, isTestnet]);

  const isStepDone = useCallback(
    (step: TutorialStepId) => completedSteps.includes(step),
    [completedSteps]
  );

  const value: TutorialContextType = {
    active,
    started,
    completedSteps,
    rewardGranted,
    rewardLength,
    showIntroModal,
    openEntry,
    closeIntroModal,
    startTutorial,
    exitTutorial,
    recordStep,
    isStepDone,
  };

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
};
