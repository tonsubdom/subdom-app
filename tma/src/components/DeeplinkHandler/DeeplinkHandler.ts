// src/components/DeeplinkHandler/DeeplinkHandler.tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { retrieveLaunchParams } from '@telegram-apps/sdk-react';
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

  useEffect(() => {
    const handleDeeplink = () => {
      // ВАЖНО: НЕ useLaunchParams() — это React.useMemo(retrieveLaunchParams, [])
      // внутри SDK (проверено по исходнику), значение вычисляется РОВНО ОДИН
      // РАЗ за жизнь этого компонента и никогда не обновляется. DeeplinkHandler
      // смонтирован единожды на всё приложение — если Telegram не делает
      // полную перезагрузку страницы при повторном открытии уже закешированного
      // мини-аппа (частый случай), новый startapp от второго клика по
      // уведомлению был физически невидим для этого кода: мы каждый раз читали
      // ЗАМОРОЖЕННОЕ значение с самого первого захода в этой WebView-сессии.
      // Отсюда и симптом "первая ссылка сработала, все следующие — на
      // главную". retrieveLaunchParams() вызывается тут заново при каждом
      // срабатывании handleDeeplink (см. слушатели visibilitychange/focus
      // ниже) — читает текущее состояние, а не кэш React.
      let startappParam: string | null = null;
      let retrieveError: string | null = null;
      try {
        startappParam = retrieveLaunchParams().startParam ?? null;
      } catch (error) {
        // retrieveLaunchParams() кидает, если приложение открыто вне
        // Telegram — не диплинк-сценарий, тихо остаёмся на месте.
        retrieveError = error instanceof Error ? error.message : String(error);
        console.log('ℹ️ Не удалось получить launch params (не Telegram-окружение?):', error);
      }
      if (retrieveError) return;
      if (!startappParam) return;
      try {
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
          // Для главной страницы — tutorial=1 (см. DeeplinkUtils.generateTutorialLink
          // на бэкенде) читает TutorialContext.tsx и сам поднимает вводную модалку.
          const queryParams = new URLSearchParams();
          if (params.tutorial) queryParams.set('tutorial', params.tutorial);
          const queryString = queryParams.toString();
          navigate(`/${queryString ? `?${queryString}` : ''}`);

        } else if (route === '/create-torrent') {
          // Кнопка "Поделиться" в уведомлении об оплате хранения торрента
          // (см. DeeplinkUtils.generateTorrentDownloadLink на бэкенде) —
          // сразу открывает вкладку "Загрузить" с вбитым bagID, читает
          // CreateTorrentPage.tsx. zone/subdomain — альтернативный вариант
          // (generateTorrentDownloadLinkForDomain), когда вместо реального
          // bagID бэкенд шлёт ИМЯ ДОМЕНА — startapp не пропускает точки,
          // поэтому домен дробился на zone/subdomain отдельными параметрами
          // (см. комментарий там же) — здесь, уже вне startapp-чарсета,
          // склеиваем обратно и кладём в тот же bagId (CreateTorrentPage
          // одинаково резолвит и реальный bagID, и доменное имя).
          // params.zone уже приходит с ".ton" на конце — MiniAppLinkGenerator.
          // parseStartappParam сам дописывает TLD обратно ДЛЯ ЛЮБОГО роута,
          // не только /add-subdomain (см. конец функции в miniAppLinks.ts).
          // Раньше тут дописывался ЕЩЁ один ".ton" поверх — получался
          // "author.ton.ton", домен не резолвился, а до вкладки "Загрузить"
          // юзер вообще не долетал (см. Log.md, живой баг-репорт).
          const queryParams = new URLSearchParams();
          if (params.bagId) {
            queryParams.set('bagId', params.bagId);
          } else if (params.zone) {
            const domain = params.subdomain
              ? `${params.subdomain}.${params.zone}`
              : params.zone;
            queryParams.set('bagId', domain);
          }
          // Единственная существующая ссылка на этот роут — кнопка
          // "Скачать торрент" (см. generateTorrentDownloadLink[ForDomain] на
          // бэкенде), туда всегда шлют tab=download. Ставим download по
          // умолчанию (а не только если params.tab распарсился) — если
          // подстановка bagId/domain из query по какой-то причине не
          // сработает, юзера всё равно должно донести хотя бы до вкладки
          // "Загрузить", а не бросить на / без объяснений.
          queryParams.set('tab', params.tab || 'download');
          const queryString = queryParams.toString();
          navigate(`/create-torrent${queryString ? `?${queryString}` : ''}`);

        } else if (startappParam.startsWith('create-torrent')) {
          // Фолбэк: роут распознан как create-torrent (первый токен startapp
          // совпадает), но что-то в params выше пошло не так — не даём
          // размену деталей увести на пустую главную, хотя бы вкладка
          // "Загрузить" откроется, просто без готовой подстановки.
          console.warn('⚠️ create-torrent роут распознан, но с проблемой в параметрах — фолбэк на вкладку Загрузить');
          navigate('/create-torrent?tab=download');

        } else {
          // Неизвестный роут - перенаправляем на главную
          console.warn(`⚠️ Неизвестный роут: ${route}, перенаправление на главную`);
          navigate('/');
        }
        
        console.log('✅ Deeplink успешно обработан с помощью MiniAppLinkGenerator');
        
      } catch (error) {
        console.error('❌ Ошибка при обработке deeplink:', error);
        if (startappParam && startappParam.startsWith('create-torrent')) {
          navigate('/create-torrent?tab=download');
        } else {
          navigate('/');
        }
      }
    };

    handleDeeplink();

    // Telegram может "оживить" уже открытый (не перезагруженный) мини-апп
    // вместо холодного старта при повторном клике по диплинку — единственный
    // надёжный сигнал с нашей стороны, что стоит перепроверить launch params
    // заново, это возврат вкладки/окна на передний план.
    const onVisible = () => {
      if (document.visibilityState === 'visible') handleDeeplink();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', handleDeeplink);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', handleDeeplink);
    };
  }, [navigate]);

  return null; // Этот компонент не рендерит ничего
};

export default DeeplinkHandler;