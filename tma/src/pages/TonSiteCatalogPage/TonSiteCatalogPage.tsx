// tma/src/pages/TonSiteCatalogPage/TonSiteCatalogPage.tsx
//
// Встроенный каталог tonsitecatalog.ton (продукт вадвека) прямо внутри
// subdom — тот же адрес, что уже используется как обычная ссылка в кнопке
// "Посмотреть" бота (см. sendDnsRecordUpdatedNotification, tgBot-sqlite.ts).
// .ton не резолвится обычным браузерным DNS без TON-расширения/гейтвея —
// у части юзеров фрейм может не загрузиться, это ограничение самого адреса,
// не этой страницы.

import React from 'react';
import { Page } from '@/components/Page';
import { useTheme } from '@/contexts/ThemeContext';

const TonSiteCatalogPage: React.FC = () => {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';

  return (
    <Page back={true}>
      <div
        style={{
          maxWidth: '425px',
          margin: '0 auto',
          padding: '20px 16px 180px 16px',
        }}
      >
        <h1
          style={{
            fontSize: '22px',
            fontWeight: '700',
            color: isDark ? '#F9FAFB' : '#1F2937',
            margin: '0 0 16px 0',
          }}
        >
          TonSite Catalog
        </h1>
        <iframe
          src="https://tonsitecatalog.ton"
          title="TonSite Catalog"
          style={{
            width: '100%',
            height: '70vh',
            border: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
            borderRadius: '16px',
          }}
        />
      </div>
    </Page>
  );
};

export default TonSiteCatalogPage;
