// tma/src/components/PromoRevealModal/PromoRevealModal.tsx
//
// Показывается ровно один раз — сразу после того, как юзер В ЭТОЙ СЕССИИ
// впервые подключил кошелёк и на бэкенде реально создалась новая строка в
// users (см. server-sqlite.ts POST /api/users, промо-акция "подарена
// бесплатная SBT-попытка случайной длины"). Состояние в UserContext
// (promoRevealLength) намеренно не персистится — при обычном заходе в уже
// зарегистрированный аккаунт модалка не всплывает снова.
//
// Визуал вынесен в LengthRevealCard — тот же компонент переиспользуется в
// PaymentAttemptsSection для покупки попытки (variant="purchased").

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { LengthRevealCard } from './LengthRevealCard';

export const PromoRevealModal: React.FC = () => {
  const { promoRevealLength, dismissPromoReveal } = useUser();
  const { currentTheme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();

  if (!promoRevealLength) return null;

  const goCreate = () => {
    dismissPromoReveal();
    navigate('/create-collection?promo=sbt');
  };

  return (
    <LengthRevealCard
      length={promoRevealLength}
      zoneType="sbt"
      variant="gift"
      isDark={currentTheme === 'dark'}
      t={t}
      onClose={dismissPromoReveal}
      onCta={goCreate}
    />
  );
};

export default PromoRevealModal;
