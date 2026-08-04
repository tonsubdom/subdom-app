// src/contexts/TutorialContext.tsx
//
// Пошаговая обучалка (онбординг): 5 блоков — профиль, sbt-зона/субдомен,
// сайт+торрент, маркет, вкладки профиля. Прогресс живёт на бэкенде
// (tutorial_progress, server-sqlite.ts), не в localStorage — юзер может
// вылететь из приложения посреди блока, и при возврате тур должен
// продолжиться с того же места, а не начаться заново.
//
// Смонтирован внутри HashRouter (см. App.tsx) — resumeStep() ходит по
// роутам через useNavigate(), которому нужен контекст роутера.
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTonWallet } from '@tonconnect/ui-react';
import { apiService } from '@/services/api';
import { OPEN_PROFILE_WIDGET_EVENT } from '@/components/SearchWidget/SearchWidget';

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
  showRewardReveal: boolean;
  // Точка входа и с виджета, и с промо-карточки: если тур уже начинали —
  // сразу продолжает с места остановки (resumeStep), без повторного вопроса
  // "начать?" и без немоты — клик всегда куда-то ведёт.
  openEntry: () => void;
  closeIntroModal: () => void;
  startTutorial: () => Promise<void>;
  exitTutorial: () => void;
  recordStep: (step: TutorialStepId) => Promise<void>;
  isStepDone: (step: TutorialStepId) => boolean;
  // Переходит на страницу/виджет, где живёт текущий незавершённый шаг —
  // и с виджета (повторный клик), и сразу после старта, и после каждой
  // подтверждённой на бэкенде записи шага.
  resumeStep: () => void;
  dismissRewardReveal: () => void;
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
  const navigate = useNavigate();

  const [active, setActive] = useState(false);
  const [started, setStarted] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<TutorialStepId[]>([]);
  const [rewardGranted, setRewardGranted] = useState(false);
  const [rewardLength, setRewardLength] = useState<string | null>(null);
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [showRewardReveal, setShowRewardReveal] = useState(false);

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

  const isStepDone = useCallback(
    (step: TutorialStepId) => completedSteps.includes(step),
    [completedSteps]
  );

  const completeTutorial = useCallback(async () => {
    if (!walletAddress) return;
    apiService.setNetwork(isTestnet);
    const result = await apiService.completeTutorial(walletAddress);
    if (result.rewardGranted) {
      setRewardGranted(true);
      setRewardLength(result.rewardLength || null);
      setShowRewardReveal(true);
    }
  }, [walletAddress, isTestnet]);

  // Единая точка "куда вести юзера дальше" — по первому незавершённому
  // шагу. Часть шагов живёт на конкретном роуте, часть — в виджете профиля
  // (открываем тем же событием, что и SearchWidget для пункта "Профиль").
  const resumeStep = useCallback(() => {
    if (!completedSteps.includes('profile_saved')) {
      window.dispatchEvent(new Event(OPEN_PROFILE_WIDGET_EVENT));
      return;
    }
    if (!completedSteps.includes('domain_answered')) {
      navigate('/avatar-secret');
      return;
    }
    if (!completedSteps.includes('zone_selected') || !completedSteps.includes('subdomain_created')) {
      navigate('/add-subdomain');
      return;
    }
    if (!completedSteps.includes('site_visited')) {
      // Карточка "Создать сайт" на IndexPage — подсвечивается и
      // обрабатывается там (см. IndexPage tutorialTargetId), юзер сам жмёт
      // настоящую кнопку на карточке, а не открывается ссылка отсюда напрямую.
      navigate('/');
      return;
    }
    if (!completedSteps.includes('torrent_created')) {
      navigate('/create-torrent');
      return;
    }
    if (!completedSteps.includes('market_toured')) {
      navigate('/market');
      return;
    }
    if (!completedSteps.includes('catalog_focused')) {
      // Карточка "TonSite Catalog" на IndexPage — тот же механизм.
      navigate('/');
      return;
    }
    if (!completedSteps.includes('profile_tabs_toured')) {
      window.dispatchEvent(new Event(OPEN_PROFILE_WIDGET_EVENT));
      return;
    }
    if (!rewardGranted) {
      completeTutorial();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedSteps, navigate, rewardGranted]);

  const openEntry = useCallback(() => {
    if (rewardGranted) return; // тур уже полностью пройден — виджет сам покажет короткое "уже пройдено"
    if (started) {
      setActive(true);
      resumeStep();
    } else {
      setShowIntroModal(true);
    }
  }, [started, rewardGranted, resumeStep]);

  const closeIntroModal = useCallback(() => setShowIntroModal(false), []);

  const startTutorial = useCallback(async () => {
    if (!walletAddress) return;
    apiService.setNetwork(isTestnet);
    await apiService.startTutorial(walletAddress);
    setStarted(true);
    setActive(true);
    setShowIntroModal(false);
    // Свежий старт — completedSteps ещё пуст, первый незавершённый шаг
    // всегда "профиль", открываем виджет напрямую.
    window.dispatchEvent(new Event(OPEN_PROFILE_WIDGET_EVENT));
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

  const dismissRewardReveal = useCallback(() => setShowRewardReveal(false), []);

  const value: TutorialContextType = {
    active,
    started,
    completedSteps,
    rewardGranted,
    rewardLength,
    showIntroModal,
    showRewardReveal,
    openEntry,
    closeIntroModal,
    startTutorial,
    exitTutorial,
    recordStep,
    isStepDone,
    resumeStep,
    dismissRewardReveal,
  };

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
};
