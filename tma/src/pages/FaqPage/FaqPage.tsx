// tma/src/pages/FaqPage/FaqPage.tsx
//
// FAQ на основе черновика поста юзера ("Как сделать субдомен" и т.д., см.
// Log.md 2026-08-09). У черновика были готовы ответы только на первые 5 из
// 13 вопросов — остальные помечены "скоро появится", а не выдуманы, чтобы
// не публиковать недостоверную информацию.
import React, { useState } from 'react';
import { Page } from '@/components/Page';
import { useTheme } from '@/contexts/ThemeContext';

interface FaqEntry {
  question: string;
  answer?: string;
}

const FAQ_ENTRIES: FaqEntry[] = [
  {
    question: 'Как создать СУБДОМЕН .ton?',
    answer: 'Подпишитесь на канал @subdom_blog, чтобы не упустить инструкции, гайды, нововведения, анонсы апдейтов и promo-акции платформы.',
  },
  {
    question: 'Как сделать из ДОМЕНА субдоменную ЗОНУ и получать с неё доход 90% от каждого аукциона субдомена, оставаясь владельцем домена?',
    answer: 'Добавьте бот-уведомитель всех операций платформы, подпишитесь на уведомления (после этого заработает смена языка) и зайдите в приложение (зарегистрируйте аккаунт / откройте subdom).\n— Основная версия в Telegram: @subdom\n— Дополнительная версия в браузере: https://subdom.zone',
  },
  {
    question: 'Как на вашем домене или субдомене .ton создать БЛОКЧЕЙН-ПРОФИЛЬ со своим АВАТАРОМ, ОПИСАНИЕМ и КАТЕГОРИЕЙ, который определяет вашу цифровую идентичность для индексации роботом каталога тонсайтов и отображения в dApp?',
    answer: 'Войдя в приложение, откройте виджет профиля в левом нижнем углу страницы, зарегистрируйтесь, подключив TonConnect — получите бесплатную попытку создания субдоменной зоны на домене случайной длины, далее следуйте предложенным шагам.',
  },
  {
    question: 'Как создать сайт на субдомене .ton, юзернейме Telegram, прокси-обёртке, на NFT субдоменных коллекций .tonnel, .getgems, .gram, .vipx и др.?',
    answer: 'Кликните «Пройдите обучение» (создание зоны, создание субдомена, настройка блокчейн-профиля, создание сайта, создание торрента и т. д.) в subdom и получите ещё одну +1 SBT попытку создания зоны.',
  },
  {
    question: 'Как загрузить, создать ТОРРЕНТ на субдомене .ton и иных NFT со стандартом dnsresolve?',
    answer: 'Используйте API и SDK платформы в разработке и интеграции в свой проект:\n— Swagger UI-сайт с запросами и генератором payload смарт-контрактов для транзакций: api.subdom.zone/docs\n— SDK-библиотека для редактора кода: yarn add @subdom/sdk (или npm install @subdom/sdk)',
  },
  { question: 'Где посмотреть каталог доменов .ton с сайтами, торрентами, аватаром, описанием, категорией?' },
  { question: 'Как добавить бота-уведомителя @subdom в другой чат для привлечения трафика вокруг субдоменов?' },
  { question: 'Как установить и использовать SDK-библиотеку subdom в своих проектах другим билдерам, оставаясь в формате стандарта экосистемы subdom?' },
  { question: 'Как использовать Swagger-сайт subdom билдерам или AI-агентам?' },
  { question: 'Есть ли manifest для AI-агента у subdom для Remote Calling? Как его скормить для работы с функционалом subdom по запросам?' },
  { question: 'Какие итоги по аудиту экосистемы смарт-контрактов от Acton?' },
  { question: 'Какие продуктовые идеи можно оформить на своей зоне?' },
  { question: 'Кто ещё в экосистеме TON DNS и какой новый функционал планирует вводить @subdom?' },
];

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
                <div style={{ padding: '0 14px 14px 14px', fontSize: '13px', lineHeight: 1.6, color: colors.textSecondary, whiteSpace: 'pre-line' }}>
                  {entry.answer || 'Ответ скоро появится — следите за @subdom_blog.'}
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
