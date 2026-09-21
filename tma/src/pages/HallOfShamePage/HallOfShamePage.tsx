// Экран внутри Mini App для публичного Hall of Shame (лог банов fail2ban) —
// доступен ТОЛЬКО через бот-диплинк (кнопка "Кибербезопасность" → /security_stats,
// см. DeeplinkUtils.generateHallOfShameLink на бэкенде), без карточки на
// IndexPage — юзер явно попросил не заводить отдельную публичную точку входа.
//
// Рендерит уже существующую статическую страницу (/security, генерируется
// scripts/generate-hall-of-shame.py на subdom-app) внутри iframe того же
// происхождения — не дублирует geo-lookup/агрегацию банов вторым источником
// правды, просто переиспользует готовый HTML и в браузере, и в самом
// приложении в зависимости от того, где открывают ссылку (см. Kanban subdom,
// 2026-09-12).
import React from 'react';

const HallOfShamePage: React.FC = () => {
  return (
    <iframe
      src="/security"
      title="Hall of Shame"
      style={{
        width: '100%',
        height: 'calc(100vh - 140px)',
        border: 'none',
        display: 'block',
      }}
    />
  );
};

export default HallOfShamePage;
