

//с провайдером для выгрузки итемов ончейн

// src/components/App.tsx - обновленная версия с DeeplinkHandler
import React, { useEffect } from 'react';
import { useLaunchParams, miniApp, useSignal } from '@telegram-apps/sdk-react';
import { AppRoot } from "@telegram-apps/telegram-ui";
import { Navigate, Route, Routes, HashRouter, useLocation } from 'react-router-dom';

import { routes } from '@/navigation/routes.tsx';
import DeeplinkHandler from '@/components/DeeplinkHandler/DeeplinkHandler'; // Импортируем обработчик
import { RouteTitleSync } from '@/components/RouteTitleSync';

// import TgRedirector from "@/components/TgRedirector";
import Footer from "@/components/Footer/Footer";
import Header from "@/components/Header/Header";
import { Provider } from 'react-redux';
import { store } from '@/store/store';
import CircuitBackground from '@/components/CircuitBackground/CircuitBackground';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Импортируем виджеты
import ChatWidget from '@/components/ChatWidget/ChatWidget';
import ProfileWidget from '@/components/ProfileWidget/ProfileWidget';
import SearchWidget from '@/components/SearchWidget/SearchWidget';
import PromoRevealModal from '@/components/PromoRevealModal/PromoRevealModal';
import TutorialEntryWidget from '@/components/Tutorial/TutorialEntryWidget';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { UserProvider } from '@/contexts/UserContext';
import { TutorialProvider } from '@/contexts/TutorialContext';

// Импортируем компоненты для альфа-тестирования
import AlphaTestModal from '@/components/AlphaTestModal';
import { useAlphaAccessModal } from '@/hooks/useAlphaAccess';

// Импортируем BlockchainItemsProvider
import { BlockchainItemsProvider } from '@/services/blockchainItems/blockchain-items-context.tsx';

// SearchWidget/TutorialEntryWidget рендерились на КАЖДОЙ странице (z-index
// выше ProfileWidget/табов) — перекрывали аватар/кнопку TonConnect, когда
// открыт ProfileWidget, и названия табов на CreateCollectionPage/
// AddSubdomainPage. Юзер попросил показывать их только на IndexPage.
const IndexOnlyWidgets: React.FC = () => {
  const location = useLocation();
  if (location.pathname !== '/') return null;
  return (
    <>
      <SearchWidget />
      <TutorialEntryWidget />
    </>
  );
};

// Подтверждено 2026-08-16 (см. Log.md): на холодном старте через Telegram
// deeplink Telegram кладёт СЫРОЙ пакет init-данных (tgWebAppData=...&
// tgWebAppPlatform=...&...) прямо в hash — а у нас HashRouter тоже правит
// роутинг через "#". Они физически конфликтуют за один и тот же кусок URL:
// на самой первой отрисовке этот "путь" не совпадает ни с одним нашим
// роутом → матчит этот wildcard → его navigate('/') монтируется в ТОМ ЖЕ
// цикле эффектов, что и DeeplinkHandler, и срабатывает ПОСЛЕ него — затирая
// уже сделанный переход на реальный диплинк обратно на голую "/". Раньше
// голый <Navigate to="/" /> тут был безусловным. Если "путь" похож на
// сырые Telegram launch-данные — не вмешиваемся вообще, оставляем
// DeeplinkHandler единственным источником навигации (он и так корректно
// читает эти же данные через retrieveLaunchParams(), в обход роутера).
// Настоящие 404 (реально неизвестный путь без Telegram-мусора) всё ещё
// уводятся на главную как раньше.
const NotFoundRedirect: React.FC = () => {
  const location = useLocation();
  const looksLikeTelegramInitData =
    location.pathname.includes('tgWebAppData=') ||
    location.pathname.includes('tgWebAppPlatform=');
  useEffect(() => {
    if (!looksLikeTelegramInitData) {
      console.warn(`⚠️ Неизвестный путь "${location.pathname}" — перенаправление на главную`);
    }
  }, [looksLikeTelegramInitData, location.pathname]);
  if (looksLikeTelegramInitData) return null;
  return <Navigate to="/" />;
};

export const App: React.FC = () => {
  const lp = useLaunchParams();
  const isDark = useSignal(miniApp.isDark);

  // Используем хук для управления доступом и модалкой
  const { modalOpen, modalType, testnetAddress, hideModal } = useAlphaAccessModal();

  return (
    <Provider store={store}>
      <LanguageProvider>
        <ThemeProvider>
          <UserProvider>
            {/* Оборачиваем все в BlockchainItemsProvider */}
            <BlockchainItemsProvider>
              <CircuitBackground theme={isDark ? 'dark' : 'light'} />
              <AppRoot
                appearance={isDark ? 'dark' : 'light'}
                platform={['macos', 'ios', 'android', 'linux', 'windows', "tdesktop", "web"].includes(lp.platform) ? 'ios' : 'base'}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "100vh",
                  position: "relative"
                }}
              >
                {/* HashRouter оборачивает весь контент AppRoot — Header использует роутерный
                    Link (react-router-dom), которому нужен Router-контекст, а раньше был
                    просто <a>. Заодно ChatWidget/ProfileWidget/Footer получают доступ к
                    router-хукам, если он им когда-нибудь понадобится. */}
                <HashRouter>
                  {/* TutorialProvider — внутри HashRouter (не снаружи, как
                      остальные провайдеры): resumeStep() ходит по роутам
                      через useNavigate(), которому нужен контекст роутера. */}
                  <TutorialProvider>
                    <RouteTitleSync />
                    {/* Основной контент */}
                    <div style={{
                      position: "relative",
                      zIndex: 10,
                      flex: 1,
                      backgroundColor: 'transparent'
                    }}>
                      <Header/>
                      {/* Добавляем DeeplinkHandler для обработки deeplink */}
                      <DeeplinkHandler />

                      {/* <TgRedirector /> */}
                      <Routes>
                        {routes.map(({ path, Component }) => (
                          <Route key={path} path={path} element={<Component />} />
                        ))}
                        <Route path="*" element={<NotFoundRedirect />} />
                      </Routes>
                      <Footer/>
                    </div>

                    {/* Виджеты в углах экрана */}
                    <ChatWidget />
                    <ProfileWidget />
                    <IndexOnlyWidgets />
                    <PromoRevealModal />

                    {/* Модальное окно для альфа-тестирования */}
                    <AlphaTestModal
                      isOpen={modalOpen}
                      onClose={hideModal}
                      type={modalType}
                      testnetAddress={testnetAddress}
                    />
                  </TutorialProvider>
                </HashRouter>
              </AppRoot>
            </BlockchainItemsProvider>
          </UserProvider>
        </ThemeProvider>
      </LanguageProvider>
    </Provider>
  );
};
