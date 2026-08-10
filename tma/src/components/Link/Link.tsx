import { classNames, openLink } from '@telegram-apps/sdk-react';
import { type FC, type MouseEventHandler, useCallback } from 'react';
import { Link as RouterLink, type LinkProps } from 'react-router-dom';
import { isRealTelegramEnv } from '@/mockEnv';
import { tonsiteToGatewayUrl } from '@/utils/tonUtils';

import './Link.css';

export const Link: FC<LinkProps> = ({
  className,
  onClick: propsOnClick,
  to,
  // RR-специфичные пропсы — не валидны на обычном <a>, отфильтровываем
  // перед спредом в кастомно-схемной ветке ниже.
  reloadDocument,
  replace,
  state,
  preventScrollReset,
  relative,
  ...rest
}) => {
  let path: string;
  if (typeof to === 'string') {
    path = to;
  } else {
    const { search = '', pathname = '', hash = '' } = to;
    path = `${pathname}?${search}#${hash}`;
  }

  // Кастомная схема (tonsite:// и т.п.) — react-router's <Link to> её не
  // понимает: резолвит как внутренний путь приложения относительно текущего
  // роута и портит итоговый href, поэтому клик по карточке ничего не делал
  // (см. Log.md 2026-08-10). Определяем это уже на рендере, не только в
  // onClick, чтобы под кастомную схему рендерить настоящий <a href> — тот
  // же паттерн, что уже работает в ManageDomainPage/AvatarSecretPage/
  // LupaButton.
  let targetUrl: URL | null = null;
  try {
    targetUrl = new URL(path, window.location.toString());
  } catch {
    targetUrl = null;
  }
  const isCustomScheme = !!targetUrl
    && targetUrl.protocol !== 'http:'
    && targetUrl.protocol !== 'https:'
    && targetUrl.protocol !== window.location.protocol;

  const onClick = useCallback<MouseEventHandler<HTMLAnchorElement>>((e) => {
    propsOnClick?.(e);

    if (!targetUrl) return;
    const currentUrl = new URL(window.location.toString());
    const isExternal = targetUrl.protocol !== currentUrl.protocol
      || targetUrl.host !== currentUrl.host;

    // openLink() из Telegram SDK рассчитан на обычные http(s)-ссылки — для
    // кастомных схем вроде tonsite:// он на Android молча ничего не делает
    // (кнопка "не реагирует", подтверждено юзером вживую 2026-08-03). Для
    // них НЕ вызываем preventDefault — обычный клик по <a href="tonsite://...">
    // браузер/вебвью обрабатывает штатно, как и остальные tonsite-ссылки в
    // приложении (ManageDomainPage, AvatarSecretPage).
    if (isExternal && (targetUrl.protocol === 'http:' || targetUrl.protocol === 'https:')) {
      e.preventDefault();
      openLink(targetUrl.toString());
      return;
    }

    // tonsite:// вне Telegram (сайт открыт в обычном браузере, см. mockEnv.ts)
    // подменяем на гейтвей *.ton.run — браузер сам по себе кастомную схему
    // не понимает и просто ничего не сделает по клику.
    if (isExternal && targetUrl.protocol === 'tonsite:' && !isRealTelegramEnv) {
      e.preventDefault();
      window.open(tonsiteToGatewayUrl(targetUrl.toString()), '_blank', 'noopener,noreferrer');
    }
  }, [to, propsOnClick, targetUrl]);

  if (isCustomScheme) {
    return (
      <a
        {...rest}
        href={path}
        // _blank — открываем как отдельное приложение/окно, не пытаемся
        // навигировать в текущем вебвью Mini App (см. Log.md 2026-08-10).
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className={classNames(className, 'link')}
      />
    );
  }

  return (
    <RouterLink
      {...rest}
      to={to}
      reloadDocument={reloadDocument}
      replace={replace}
      state={state}
      preventScrollReset={preventScrollReset}
      relative={relative}
      onClick={onClick}
      className={classNames(className, 'link')}
    />
  );
};
