

//с провайдером для выгрузки итемов ончейн

// src/components/App.tsx - обновленная версия с DeeplinkHandler
import React, { useEffect } from 'react';
import { useLaunchParams, miniApp, useSignal } from '@telegram-apps/sdk-react';
import { AppRoot } from "@telegram-apps/telegram-ui";
import { Navigate, Route, Routes, BrowserRouter, useLocation } from 'react-router-dom';

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

// До 2026-09 здесь была проверка на "похоже на сырые Telegram init-данные"
// (tgWebAppData=.../tgWebAppPlatform=...) — при HashRouter Telegram кладёт
// эти данные в hash, а HashRouter тоже читает роут из hash, так что на
// холодном старте они физически конфликтовали за один кусок URL (см.
// Log.md 2026-08-16). После миграции на BrowserRouter (см. Log.md
// 2026-09-02, ради многостраничной SEO-индексации) роутинг матчит только
// pathname — Telegram-данные остаются в hash, которого BrowserRouter не
// касается, так что этот путь сюда больше не может попасть. Проверка
// снята как мёртвый код; настоящие 404 уводятся на главную как раньше.
const NotFoundRedirect: React.FC = () => {
  const location = useLocation();
  useEffect(() => {
    console.warn(`⚠️ Неизвестный путь "${location.pathname}" — перенаправление на главную`);
  }, [location.pathname]);
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
                {/* BrowserRouter оборачивает весь контент AppRoot — Header использует роутерный
                    Link (react-router-dom), которому нужен Router-контекст, а раньше был
                    просто <a>. Заодно ChatWidget/ProfileWidget/Footer получают доступ к
                    router-хукам, если он им когда-нибудь понадобится.
                    До 2026-09 здесь был HashRouter — сменили на BrowserRouter ради
                    многостраничной SEO-индексации (/market, /faq и т.д. как реальные
                    серверные пути, не /#/market). nginx SPA-фолбэк (try_files ... /index.html)
                    уже поддерживает прямые заходы на вложенные пути без изменений. */}
                <BrowserRouter>
                  {/* TutorialProvider — внутри роутера (не снаружи, как
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
                </BrowserRouter>
              </AppRoot>
            </BlockchainItemsProvider>
          </UserProvider>
        </ThemeProvider>
      </LanguageProvider>
    </Provider>
  );
};
