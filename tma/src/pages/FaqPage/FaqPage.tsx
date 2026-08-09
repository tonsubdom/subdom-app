// tma/src/pages/FaqPage/FaqPage.tsx
import React, { useState } from 'react';
import { Page } from '@/components/Page';
import { useTheme } from '@/contexts/ThemeContext';
import { openLink } from '@telegram-apps/sdk-react';

interface FaqLink {
  label: string;
  href: string;
}

interface FaqEntry {
  question: string;
  answer: string;
  links?: FaqLink[];
}

const FAQ_ENTRIES: FaqEntry[] = [
  {
    question: 'Как создать СУБДОМЕН .ton?',
    answer: 'Откройте subdom, подключите кошелёк через TonConnect и зайдите в раздел «Добавить субдомен» — выберите свободное имя на одной из готовых зон или найдите зону в Маркете. После оплаты (аукцион или фиксированная цена) субдомен зачеканится вам на кошелёк как NFT.',
    links: [
      { label: 'Открыть @subdom', href: 'https://t.me/subdom' },
      { label: 'subdom.zone', href: 'https://subdom.zone' },
    ],
  },
  {
    question: 'Как сделать из ДОМЕНА субдоменную ЗОНУ и получать с неё доход 90% от каждого аукциона субдомена, оставаясь владельцем домена?',
    answer: 'В разделе «Создать зону» укажите свой .ton домен — платформа развернёт SBT- или Proxy-коллекцию субдоменов, привязанную к этому домену, не забирая сам домен. С каждой продажи субдомена в вашей зоне 90% суммы автоматически уходит вам как владельцу зоны.',
  },
  {
    question: 'Как на вашем домене или субдомене .ton создать БЛОКЧЕЙН-ПРОФИЛЬ со своим АВАТАРОМ, ОПИСАНИЕМ и КАТЕГОРИЕЙ, который определяет вашу цифровую идентичность для индексации роботом каталога тонсайтов и отображения в dApp?',
    answer: 'Откройте карточку «Аватар / Секрет» (или виджет профиля в углу главной страницы), подключите кошелёк, выберите домен/субдомен, загрузите аватар, добавьте описание и категорию. Данные записываются прямо в DNS text-записи домена — их видит каталог tonsite и любой dApp без необходимости подключать кошелёк.',
  },
  {
    question: 'Как создать сайт на субдомене .ton, юзернейме Telegram, прокси-обёртке, на NFT субдоменных коллекций .tonnel, .getgems, .gram, .vipx и др.?',
    answer: 'Перейдите в карточку «Создать сайт» на главной или откройте TonSite Builder напрямую — конструктор работает поверх любого поддерживаемого DNS-ресолвера: субдомена, юзернейма Telegram, прокси-обёртки или NFT из перечисленных коллекций, — и выдаёт готовую ссылку на сайт.',
    links: [{ label: 'TonSite Builder bot', href: 'https://t.me/Ton_site_builder_bot' }],
  },
  {
    question: 'Как загрузить, создать ТОРРЕНТ на субдомене .ton и иных NFT со стандартом dnsresolve?',
    answer: 'В разделе «Создать торрент» загрузите файлы — платформа помещает их в TON Storage, получает bagID и привязывает его к DNS-записи вашего домена или субдомена по стандарту dnsresolve, чтобы контент можно было раздавать напрямую из TON Storage.',
  },
  {
    question: 'Где посмотреть каталог доменов .ton с сайтами, торрентами, аватаром, описанием, категорией?',
    answer: 'В TonSite Catalog — робот каталога регулярно сканирует DNS-записи доменов платформы subdom и собирает профили (аватар, описание, категория, сайт, торрент) в единый поисковый каталог tonsite.',
    links: [{ label: 'TonSite Catalog', href: 'tonsite://tonsitecatalog.ton' }],
  },
  {
    question: 'Как добавить бота-уведомителя @subdom в другой чат для привлечения трафика вокруг субдоменов?',
    answer: 'Добавьте @subdom как участника нужного чата или канала и выдайте ему право отправлять сообщения — бот будет публиковать уведомления о создании зон, продажах субдоменов и аукционах, привлекая внимание к активности вокруг субдоменов.',
    links: [{ label: 'Открыть @subdom', href: 'https://t.me/subdom' }],
  },
  {
    question: 'Как установить и использовать SDK-библиотеку subdom в своих проектах другим билдерам, оставаясь в формате стандарта экосистемы subdom?',
    answer: 'Установите пакет — он оборачивает вызовы Swagger API платформы и типовые TON-транзакции (создание зоны, покупка субдомена, чтение DNS-записей), позволяя интегрироваться со стандартом subdom из любого TypeScript/JavaScript-проекта.\nyarn add @subdom/sdk (или npm install @subdom/sdk)',
    links: [{ label: '@subdom/sdk на npm', href: 'https://www.npmjs.com/package/@subdom/sdk' }],
  },
  {
    question: 'Как использовать Swagger-сайт subdom билдерам или AI-агентам?',
    answer: 'На странице документации собраны все эндпоинты платформы с готовым генератором payload для смарт-контрактных транзакций — их можно вызывать напрямую или скормить OpenAPI-схему AI-агенту как список доступных функций.',
    links: [{ label: 'api.subdom.zone/docs', href: 'https://api.subdom.zone/docs' }],
  },
  {
    question: 'Есть ли manifest для AI-агента у subdom для Remote Calling? Как его скормить для работы с функционалом subdom по запросам?',
    answer: 'Отдельного manifest-файла для автообнаружения агентами пока нет — как обходной вариант агент может использовать OpenAPI-схему со страницы документации в качестве списка доступных функций. Полноценный manifest для Remote Calling — в планах, анонс появится в канале.',
    links: [{ label: 'api.subdom.zone/docs', href: 'https://api.subdom.zone/docs' }],
  },
  {
    question: 'Какие итоги по аудиту экосистемы смарт-контрактов от Acton?',
    answer: 'Итоги аудита ещё не опубликованы официально — как только разбор будет готов, он выйдет в канале, чтобы не публиковать неподтверждённые выводы раньше времени.',
    links: [{ label: '@subdom_blog', href: 'https://t.me/subdom_blog' }],
  },
  {
    question: 'Какие продуктовые идеи можно оформить на своей зоне?',
    answer: 'Зона — это, по сути, ваше собственное пространство имён внутри .ton: можно продавать субдомены как никнеймы для комьюнити, собрать под своим брендом каталог сайтов участников, запустить NFT-коллекцию под фандом, сделать зонт-маркетплейс поддоменов для проекта или каталог цифровых профилей через блокчейн-профиль на каждом субдомене.',
  },
  {
    question: 'Кто ещё в экосистеме TON DNS и какой новый функционал планирует вводить @subdom?',
    answer: 'Анонсы новых интеграций, партнёрских dapp-сервисов и функций платформы публикуются в канале первыми — там же можно следить за тем, кто ещё присоединяется к экосистеме TON DNS.',
    links: [{ label: '@subdom_blog', href: 'https://t.me/subdom_blog' }],
  },
];

const handleLink = (href: string) => {
  try {
    openLink(href);
  } catch {
    window.open(href, '_blank');
  }
};

export const FaqPage: React.FC = () => {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const colors = {
    background: isDark ? '#121212' : '#FFFFFF',
    text: isDark ? '#F9FAFB' : '#1F2937',
    textSecondary: isDark ? '#9CA3AF' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
    accent: isDark ? '#FFD700' : '#3B82F6',
    cardBg: isDark ? '#1F2937' : '#F9FAFB',
  };

  return (
    <Page>
      <div style={{ padding: '16px 16px 120px 16px', maxWidth: '520px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: colors.text, textAlign: 'center', margin: '0 0 4px 0' }}>
          FAQ
        </h1>
        <p style={{ fontSize: '13px', color: colors.textSecondary, textAlign: 'center', margin: '0 0 20px 0' }}>
          Частые вопросы про subdom
        </p>

        {FAQ_ENTRIES.map((entry, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              style={{
                background: colors.cardBg,
                border: `1px solid ${isOpen ? colors.accent : colors.border}`,
                borderRadius: '10px',
                marginBottom: '10px',
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : index)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  padding: '12px 14px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 600, color: colors.text }}>{entry.question}</span>
                <span style={{ fontSize: '16px', color: colors.accent, flexShrink: 0 }}>{isOpen ? '−' : '+'}</span>
              </button>
              {isOpen && (
                <div style={{ padding: '0 14px 14px 14px' }}>
                  <div style={{ fontSize: '13px', lineHeight: 1.6, color: colors.textSecondary, whiteSpace: 'pre-line' }}>
                    {entry.answer}
                  </div>
                  {entry.links && entry.links.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                      {entry.links.map((link) => (
                        <button
                          key={link.href}
                          onClick={() => handleLink(link.href)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: `1px solid ${colors.accent}`,
                            background: 'transparent',
                            color: colors.accent,
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {link.label} ↗
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Page>
  );
};

export default FaqPage;
