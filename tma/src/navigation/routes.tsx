//версия нужная после отмены защищеных роутов после альфатеста
// // /scr/navigation/routers.tsx
// import type { ComponentType, JSX } from 'react';

// import { IndexPage } from '@/pages/IndexPage/IndexPage';
// import {ManageDomainPage}  from '@/pages/ManageDomainPage/ManageDomainPage.tsx';
// import { AuctionPage } from '@/pages/AddSubdomainPage/AddSubdomainPage';
// //до сбт
// // import { CreateProxyPage } from '@/pages/CreateCollectionPage/CreateCollectionPage';
// import { CreateCollectionPage } from '@/pages/CreateCollectionPage/CreateCollectionPage';
// import MarketPage from '@/pages/MarketPage/MarketPage';

// export interface RouteType {
//   path: string;
//   Component: ComponentType;
//   title?: string;
//   icon?: JSX.Element;
// }

// export const routes: RouteType[] = [
//   { path: '/', Component: IndexPage },
//   { path: '/create-collection', Component: CreateCollectionPage },
//   { path: '/add-subdomain', Component: AuctionPage },
//   { path: '/manage', Component: ManageDomainPage },
//   { path: '/market', Component: MarketPage}
// ];

// src/navigation/routes.tsx
import type { ComponentType, JSX } from 'react';

import { IndexPage } from '@/pages/IndexPage/IndexPage';
import { ManageDomainPage } from '@/pages/ManageDomainPage/ManageDomainPage.tsx';
import { AuctionPage } from '@/pages/AddSubdomainPage/AddSubdomainPage';
import { CreateCollectionPage } from '@/pages/CreateCollectionPage/CreateCollectionPage';
import MarketPage from '@/pages/MarketPage/MarketPage';
import AvatarSecretPage from '@/pages/AvatarSecretPage/AvatarSecretPage';
import CreateTorrentPage from '@/pages/CreateTorrentPage/CreateTorrentPage';
import ProtectedRoute from '@/components/ProtectedRoute';
import ProtectedAdminPanel from '@/pages/AdminPanelPage';

export interface RouteType {
  path: string;
  Component: ComponentType;
  title?: string;
  icon?: JSX.Element;
  protected?: boolean; // Добавляем флаг защиты
}

// Базовые компоненты (без защиты)
const BaseIndexPage = () => <IndexPage />;
const BaseAdminPage = () => <ProtectedAdminPanel />;

// Защищенные компоненты
const ProtectedCreateCollectionPage = () => (
  <ProtectedRoute>
    <CreateCollectionPage />
  </ProtectedRoute>
);

const ProtectedAuctionPage = () => (
  <ProtectedRoute>
    <AuctionPage />
  </ProtectedRoute>
);

const ProtectedManageDomainPage = () => (
  <ProtectedRoute>
    <ManageDomainPage />
  </ProtectedRoute>
);

// Market и Блокчейн-Профиль сознательно БЕЗ ProtectedRoute — обе страницы
// read-only без кошелька (Market: список + переход на Getgems, AvatarSecretPage:
// резолв домена и чтение DNS-текст-записей, гейт на кошелёк уже стоит внутри
// самого handleSave). Открыты неподключенным юзерам, чтобы был смысл заходить
// и смотреть, не коннектясь заранее — см. Log.md 2026-08-09.
const ProtectedCreateTorrentPage = () => (
  <ProtectedRoute>
    <CreateTorrentPage />
  </ProtectedRoute>
);

export const routes: RouteType[] = [
  { 
    path: '/', 
    Component: BaseIndexPage,
    title: 'Главная'
  },
  { 
    path: '/create-collection', 
    Component: ProtectedCreateCollectionPage,
    title: 'Создать коллекцию',
    protected: true
  },
  { 
    path: '/add-subdomain', 
    Component: ProtectedAuctionPage,
    title: 'Добавить субдомен',
    protected: true
  },
  { 
    path: '/manage', 
    Component: ProtectedManageDomainPage,
    title: 'Управление',
    protected: true
  },
  {
    path: '/market',
    Component: MarketPage,
    title: 'Маркет'
  },
  {
    path: '/avatar-secret',
    Component: AvatarSecretPage,
    title: 'Блокчейн-Профиль'
  },
  {
    path: '/create-torrent',
    Component: ProtectedCreateTorrentPage,
    title: 'Создать торрент',
    protected: true
  },
  {
    path: 'admin',
    Component: BaseAdminPage,
    title: 'Отладка'
  },
];