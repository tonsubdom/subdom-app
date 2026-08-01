import { Placeholder, AppRoot } from '@telegram-apps/telegram-ui';
import { retrieveLaunchParams, isColorDark, isRGB } from '@telegram-apps/sdk-react';
import { useMemo } from 'react';

export function EnvUnsupported() {
  const [platform, isDark] = useMemo(() => {
    let platform = 'base';
    let isDark = false;
    try {
      const lp = retrieveLaunchParams();
      const { bgColor } = lp.themeParams;
      platform = lp.platform;
      isDark = bgColor && isRGB(bgColor) ? isColorDark(bgColor) : false;
    } catch { /* empty */
    }

    return [platform, isDark];
  }, []);

  return (
    <AppRoot
      appearance={isDark ? 'dark' : 'light'}
      platform={['macos', 'ios'].includes(platform) ? 'ios' : 'base'}
    >
      <Placeholder
        header="Не удалось запустить приложение"
        description="Обновите Telegram до последней версии, либо откройте бота напрямую"
      >
        <a
          href="https://t.me/subdom"
          style={{
            display: 'inline-block',
            marginTop: 16,
            padding: '10px 24px',
            borderRadius: 8,
            background: '#3B82F6',
            color: '#FFFFFF',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Открыть в Telegram
        </a>
      </Placeholder>
    </AppRoot>
  );
}