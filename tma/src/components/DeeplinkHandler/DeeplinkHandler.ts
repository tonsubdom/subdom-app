// src/components/DeeplinkHandler/DeeplinkHandler.tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLaunchParams } from '@telegram-apps/sdk-react';
import { MiniAppLinkGenerator } from '@/utils/miniAppLinks';

/**
 * Компонент для обработки deeplink из Telegram мини-апп
 * Автоматически перенаправляет на соответствующий роут при открытии через deeplink
 */
// Модульный (не компонентный) стейт: переживает ремонты DeeplinkHandler в
// рамках одной сессии вкладки. Без него любой ремонт компонента (например,
// после round-trip в кошелёк и обратно, когда Telegram WebView переинициа-
// лизирует страницу) видел тот же непустой startParam и заново дёргал
// navigate(), затирая то, куда пользователь только что перешёл сам —
// ощущалось как "застревание" на странице после перехода по deeplink.
let lastHandledStartParam: string | null = null;

const DeeplinkHandler: React.FC = () => {
  const navigate = useNavigate();
  const launchParams = useLaunchParams();

  useEffect(() => {
    const handleDeeplink = () => {
      try {
        // Получаем startapp параметр из launchParams
        const startappParam = launchParams.startParam;

        if (!startappParam) {
          console.log('ℹ️ Нет startapp параметра, остаемся на текущей странице');
          return;
        }

        if (startappParam === lastHandledStartParam) {
          console.log('ℹ️ Этот deeplink уже обработан в этой сессии, навигацию не повторяем');
          return;
        }
        lastHandledStartParam = startappParam;

        console.log(`🔗 Обработка deeplink: ${startappParam}`);
        
        // Используем MiniAppLinkGenerator для парсинга
        const { route, params } = MiniAppLinkGenerator.parseStartappParam(startappParam);
        
        console.log(`📍 Найден роут: ${route}`, params);
        
        // Навигация на соответствующий роут
        if (route === '/add-subdomain') {
          // Для страницы создания субдомена
          const queryParams = new URLSearchParams();
          if (params.zone) queryParams.set('zone', params.zone);
          if (params.subdomain) queryParams.set('subdomain', params.subdomain);
          
          const queryString = queryParams.toString();
          navigate(`/add-subdomain${queryString ? `?${queryString}` : ''}`);
          
        } else if (route === '/market') {
          // Для маркета — если ссылка сгенерирована для конкретного
          // завершённого аукциона (zone/subdomain), прокидываем их в query,
          // чтобы MarketPage сразу отфильтровал список до этого одного итема
          // вместо простого открытия общего списка.
          const queryParams = new URLSearchParams();
          if (params.zone) queryParams.set('zone', params.zone);
          if (params.subdomain) queryParams.set('subdomain', params.subdomain);

          const queryString = queryParams.toString();
          navigate(`/market${queryString ? `?${queryString}` : ''}`);

        } else if (route === '/') {
          // Для главной страницы
          navigate('/');
          
        } else {
          // Неизвестный роут - перенаправляем на главную
          console.warn(`⚠️ Неизвестный роут: ${route}, перенаправление на главную`);
          navigate('/');
        }
        
        console.log('✅ Deeplink успешно обработан с помощью MiniAppLinkGenerator');
        
      } catch (error) {
        console.error('❌ Ошибка при обработке deeplink:', error);
        navigate('/');
      }
    };

    handleDeeplink();
  }, [launchParams.startParam, navigate]);

  return null; // Этот компонент не рендерит ничего
};

export default DeeplinkHandler;