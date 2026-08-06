import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { routes } from '@/navigation/routes.tsx';

// index.html уже задаёт keyword-насыщенный title/description для "/" (root
// document, единственный маршрут, который реально индексируется — HashRouter
// не даёт Google/соцсетям различать /#/market и /#/manage как отдельные URL,
// это отдельный больший вопрос миграции на BrowserRouter, не решаем здесь).
// До этого компонента document.title был одним и тем же на всех страницах —
// `routes[].title` существовал в navigation/routes.tsx, но нигде не читался.
export function RouteTitleSync() {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/') return;
    const route = routes.find((r) => r.path === location.pathname);
    if (route?.title) {
      document.title = `${route.title} | Subdom`;
    }
    return () => {
      document.title = 'Создать NFT субдомен .ton | Subdom';
    };
  }, [location.pathname]);

  return null;
}
