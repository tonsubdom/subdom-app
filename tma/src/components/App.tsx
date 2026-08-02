

//с провайдером для выгрузки итемов ончейн

// src/components/App.tsx - обновленная версия с DeeplinkHandler
import React from 'react';
import { useLaunchParams, miniApp, useSignal } from '@telegram-apps/sdk-react';
import { AppRoot } from "@telegram-apps/telegram-ui";
import { Navigate, Route, Routes, HashRouter } from 'react-router-dom';

import { routes } from '@/navigation/routes.tsx';
import DeeplinkHandler from '@/components/DeeplinkHandler/DeeplinkHandler'; // Импортируем обработчик

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
import { ThemeProvider } from '@/contexts/ThemeContext';
import { UserProvider } from '@/contexts/UserContext';

// Импортируем компоненты для альфа-тестирования
import AlphaTestModal from '@/components/AlphaTestModal';
import { useAlphaAccessModal } from '@/hooks/useAlphaAccess';

// Импортируем BlockchainItemsProvider
import { BlockchainItemsProvider } from '@/services/blockchainItems/blockchain-items-context.tsx';

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
                      <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                    <Footer/>
                  </div>

                  {/* Виджеты в углах экрана */}
                  <ChatWidget />
                  <ProfileWidget />
                  <SearchWidget />

                  {/* Модальное окно для альфа-тестирования */}
                  <AlphaTestModal
                    isOpen={modalOpen}
                    onClose={hideModal}
                    type={modalType}
                    testnetAddress={testnetAddress}
                  />
                </HashRouter>
              </AppRoot>
            </BlockchainItemsProvider>
          </UserProvider>
        </ThemeProvider>
      </LanguageProvider>
    </Provider>
  );
};
