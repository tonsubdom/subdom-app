// src/components/DeeplinkHandler/DeeplinkHandler.tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLaunchParams } from '@telegram-apps/sdk-react';
import { MiniAppLinkGenerator } from '@/utils/miniAppLinks';

/**
 * Компонент для обработки deeplink из Telegram мини-апп
 * Автоматически перенаправляет на соответствующий роут при открытии через deeplink
 */
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
          // Для маркета
          navigate('/market');
          
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