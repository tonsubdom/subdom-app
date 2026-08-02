import { classNames, openLink } from '@telegram-apps/sdk-react';
import { type FC, type MouseEventHandler, useCallback } from 'react';
import { Link as RouterLink, type LinkProps } from 'react-router-dom';

import './Link.css';

export const Link: FC<LinkProps> = ({
  className,
  onClick: propsOnClick,
  to,
  ...rest
}) => {
  const onClick = useCallback<MouseEventHandler<HTMLAnchorElement>>((e) => {
    propsOnClick?.(e);

    let path: string;
    if (typeof to === 'string') {
      path = to;
    } else {
      const { search = '', pathname = '', hash = '' } = to;
      path = `${pathname}?${search}#${hash}`;
    }

    const targetUrl = new URL(path, window.location.toString());
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
    }
  }, [to, propsOnClick]);

  return (
    <RouterLink
      {...rest}
      to={to}
      onClick={onClick}
      className={classNames(className, 'link')}
    />
  );
};
