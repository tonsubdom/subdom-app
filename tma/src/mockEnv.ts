import {
  mockTelegramEnv,
  isTMA,
  parseInitData,
  LaunchParams, retrieveLaunchParams
} from '@telegram-apps/sdk-react';

// Раньше это работало только в dev (import.meta.env.DEV) — вне Telegram прод-сборка
// падала на EnvUnsupported ("too old client"). Юзер хочет, чтобы сайт открывался и в
// обычном браузере тоже — мокаем окружение всегда, не только в dev. Авторизация в
// проекте идёт по адресу кошелька (TonConnect), а не по Telegram-identity, так что
// фейковый Telegram-юзер ниже не даёт доступа ни к чему чувствительному сам по себе.
{
  await (async () => {
    if (await isTMA()) {
      return;
    }

    // Determine which launch params should be applied. We could already
    // apply them previously, or they may be specified on purpose using the
    // default launch parameters transmission method.
    let lp: LaunchParams | undefined;
    try {
      lp = retrieveLaunchParams();
    } catch (e) {
      const initDataRaw = new URLSearchParams([
        ['user', JSON.stringify({
          id: 99281932,
          first_name: 'Andrew',
          last_name: 'Rogue',
          username: 'rogue',
          language_code: 'en',
          is_premium: true,
          allows_write_to_pm: true,
        })],
        ['hash', '89d6079ad6762351f38c6dbbc41bb53048019256a9443988af7a48bcad16ba31'],
        ['auth_date', '1716922846'],
        ['start_param', 'debug'],
        ['chat_type', 'sender'],
        ['chat_instance', '8428209589180549439'],
        ['signature', '6fbdaab833d39f54518bd5c3eb3f511d035e68cb'],
      ]).toString();

      lp = {
        themeParams: {
          accentTextColor: '#007AFF',        // Яркий акцентный цвет (например, синий, как в Telegram)
          bgColor: '#FFFFFF',                // Основной фон (белый)
          buttonColor: '#007AFF',             // Цвет кнопок (синий)
          buttonTextColor: '#FFFFFF',         // Цвет текста на кнопках (белый)
          destructiveTextColor: '#FF3B30',    // Цвет опасных действий (красный)
          headerBgColor: '#F8F8F8',           // Фон заголовка (светло-серый)
          hintColor: '#8E8E93',               // Цвет подсказок (серый)
          linkColor: '#007AFF',               // Цвет ссылок (синий)
          secondaryBgColor: '#F2F2F7',        // Вторичный фон (светло-серый)
          sectionBgColor: '#FFFFFF',          // Фон секций (белый)
          sectionHeaderTextColor: '#007AFF',  // Цвет заголовков секций (синий)
          subtitleTextColor: '#8E8E93',       // Цвет подзаголовков (серый)
          textColor: '#000000',               // Основной текст (черный)
        },
        initData: parseInitData(initDataRaw),
        initDataRaw,
        version: '8',
        platform: 'tdesktop',
      }
    }

    mockTelegramEnv(lp);
    console.warn(
      '⚠️ Environment is not Telegram-based — mocked launch params applied so the app can run in a regular browser too (SEO/marketing access outside Telegram).',
    );
  })();
}
