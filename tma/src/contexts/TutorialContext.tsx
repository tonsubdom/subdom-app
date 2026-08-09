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

// Порядок пересмотрен: сначала домен → зона → субдомен (воронка, которую
// отслеживаем в Plausible), заполнение профиля/аватарки — после, не первым
// шагом. Массив должен 1-в-1 совпадать с TUTORIAL_STEPS на бэкенде
// (server-sqlite.ts) — порядок там менять синхронно.
export const TUTORIAL_STEPS = [
  'domain_answered', // блок 1 — есть ли домен?
  'zone_selected', 'subdomain_created', // блок 2 — создание зоны (промо-попытка) + субдомена
  'profile_saved', // блок 3 — профиль/аватарка
  'site_visited', 'torrent_created', // блок 4 — сайт + торрент
  'market_toured', 'catalog_focused', // блок 5 — маркет
  'profile_tabs_toured', // блок 6 — вкладки профиля
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
    // Сброс синхронно и БЕЗ условия на !walletAddress — раньше при переходе
    // с адреса A на адрес B прогресс A оставался в стейте до того, как
    // резолвится fetch для B (гонка), и любой клик/рендер в этом окне видел
    // чужой прогресс (например, "Пройти обучение" уводило в шаг с профиля
    // предыдущего аккаунта). См. Log.md 2026-08-09.
    setStarted(false);
    setCompletedSteps([]);
    setRewardGranted(false);
    setRewardLength(null);
    setActive(false);

    if (!walletAddress) return;

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
  // Порядок здесь обязан 1-в-1 совпадать с TUTORIAL_STEPS выше: сначала
  // домен → зона → субдомен (воронка Plausible), профиль — после.
  const resumeStep = useCallback(() => {
    if (!completedSteps.includes('domain_answered')) {
      navigate('/avatar-secret');
      return;
    }
    if (!completedSteps.includes('zone_selected')) {
      navigate('/create-collection');
      return;
    }
    if (!completedSteps.includes('subdomain_created')) {
      navigate('/add-subdomain');
      return;
    }
    if (!completedSteps.includes('profile_saved')) {
      window.dispatchEvent(new Event(OPEN_PROFILE_WIDGET_EVENT));
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
    // всегда "есть ли домен?" на AvatarSecretPage.
    navigate('/avatar-secret');
  }, [walletAddress, isTestnet, navigate]);

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
