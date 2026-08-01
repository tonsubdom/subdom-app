// tma/src/pages/TonSiteCatalogPage/TonSiteCatalogPage.tsx
//
// Встроенный каталог tonsitecatalog.ton (продукт вадвека) прямо внутри
// subdom — тот же адрес, что уже используется как обычная ссылка в кнопке
// "Посмотреть" бота (см. sendDnsRecordUpdatedNotification, tgBot-sqlite.ts,
// там та же схема tonsite://).
//
// tonsite:// — кастомная схема, обычные браузеры не грузят её как iframe src
// вообще (не пытаются резолвить, фрейм остаётся пустым) — работает только
// как настоящая навигация в TON-осознанных клиентах. Кнопка-ссылка ниже —
// подстраховка на случай, если фрейм у юзера не отрисуется.

import React from 'react';
import { Page } from '@/components/Page';
import { useTheme } from '@/contexts/ThemeContext';

const TONSITE_URL = 'tonsite://tonsitecatalog.ton';

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
        <a
          href={TONSITE_URL}
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '12px 16px',
            marginBottom: '16px',
            borderRadius: '10px',
            background: isDark ? '#374151' : '#DBEAFE',
            color: isDark ? '#FFD700' : '#3B82F6',
            fontWeight: 600,
            fontSize: '14px',
            textDecoration: 'none',
          }}
        >
          Открыть {TONSITE_URL}
        </a>
        <iframe
          src={TONSITE_URL}
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
