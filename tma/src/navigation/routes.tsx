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
import TonSiteCatalogPage from '@/pages/TonSiteCatalogPage/TonSiteCatalogPage';
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

const ProtectedMarketPage = () => (
  <ProtectedRoute>
    <MarketPage />
  </ProtectedRoute>
);

const ProtectedAvatarSecretPage = () => (
  <ProtectedRoute>
    <AvatarSecretPage />
  </ProtectedRoute>
);

const ProtectedTonSiteCatalogPage = () => (
  <ProtectedRoute>
    <TonSiteCatalogPage />
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
    Component: ProtectedMarketPage,
    title: 'Маркет',
    protected: true
  },
  {
    path: '/avatar-secret',
    Component: ProtectedAvatarSecretPage,
    title: 'Аватар / Секрет',
    protected: true
  },
  {
    path: '/tonsite-catalog',
    Component: ProtectedTonSiteCatalogPage,
    title: 'TonSite Catalog',
    protected: true
  },
  {
    path: 'admin',
    Component: BaseAdminPage,
    title: 'Отладка'
  },
];