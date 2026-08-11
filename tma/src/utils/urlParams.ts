// src/utils/urlParams.ts

/**
 * Утилиты для работы с URL параметрами аукционов (hash routing)
 */

// Типы параметров для аукциона
export interface AuctionUrlParams {
  zone?: string;        // Название зоны (например: "minter.ton")
  subdomain?: string;   // Название субдомена (например: "test")
  // tab?: 'proxy' | 'sbt'; // Убираем, так как нужен только для proxy
}

/**
 * Получить параметры аукциона из URL (hash routing)
 */
export function getAuctionParamsFromUrl(): AuctionUrlParams {
  // Для hash routing: /#/add-subdomain?zone=...&subdomain=...
  const hash = window.location.hash;
  
  if (!hash.includes('?')) {
    return {};
  }
  
  const queryString = hash.split('?')[1];
  const params = new URLSearchParams(queryString);
  
  return {
    zone: params.get('zone') || undefined,
    subdomain: params.get('subdomain') || undefined,
    // tab: (params.get('tab') as 'proxy' | 'sbt') || undefined, // Убираем
  };
}

/**
 * Создать URL для аукциона с параметрами (hash routing)
 */
export function createAuctionUrl(params: AuctionUrlParams): string {
  const searchParams = new URLSearchParams();
  
  if (params.zone) {
    searchParams.set('zone', params.zone);
  }
  
  if (params.subdomain) {
    searchParams.set('subdomain', params.subdomain);
  }
  
  // Не добавляем tab - только для proxy
  // if (params.tab) {
  //   searchParams.set('tab', params.tab);
  // }
  
  const queryString = searchParams.toString();
  
  // Hash routing формат: /#/add-subdomain?zone=...&subdomain=...
  return queryString ? `/#/add-subdomain?${queryString}` : '/#/add-subdomain';
}

/**
 * Обновить URL с параметрами аукциона (hash routing)
 */
export function updateAuctionUrl(params: AuctionUrlParams): void {
  // Только для proxy таба - обновляем URL
  // Для SBT не обновляем URL, так как это приватные зоны
  const url = createAuctionUrl(params);
  window.history.pushState({}, '', url);
}

/**
 * Очистить параметры аукциона из URL (hash routing)
 */
export function clearAuctionUrl(): void {
  window.history.pushState({}, '', '/#/add-subdomain');
}

/**
 * Получить полный URL для аукциона (hash routing)
 */
export function getFullAuctionUrl(params: AuctionUrlParams): string {
  const baseUrl = window.location.origin;
  const auctionUrl = createAuctionUrl(params);
  return `${baseUrl}${auctionUrl}`;
}

/**
 * Копировать URL аукциона в буфер обмена
 */
export async function copyAuctionUrlToClipboard(params: AuctionUrlParams): Promise<boolean> {
  try {
    const url = getFullAuctionUrl(params);
    await navigator.clipboard.writeText(url);
    return true;
  } catch (error) {
    console.error('Ошибка копирования URL:', error);
    return false;
  }
}

/**
 * Поделиться аукционом (или зоной целиком, если subdomain не задан).
 * custom позволяет переопределить title/text для мест, где шарится не
 * конкретный лот, а сама зона (например "Поделитесь аукционами на этой
 * зоне" в карточке зоны — там нет auction.subdomain).
 *
 * Приоритет источников:
 * 1. Telegram shareURL (t.me/share/url) — открывает нативный список чатов
 *    Telegram и ГАРАНТИРОВАННО предлагает Telegram как получателя. Обычный
 *    navigator.share() внутри Telegram-вебвью на части платформ либо
 *    недоступен, либо не включает сам Telegram в список приложений.
 * 2. Web Share API — вне Telegram (юзер открыл ссылку в обычном браузере).
 * 3. Копирование в буфер — если ничего из вышеперечисленного недоступно.
 */
export async function shareAuction(
  params: AuctionUrlParams,
  custom?: { title?: string; text?: string }
): Promise<boolean> {
  try {
    const url = getFullAuctionUrl(params);
    const title = custom?.title || (params.subdomain
      ? `Аукцион субдомена ${params.subdomain}.${params.zone}`
      : `Зона ${params.zone} на TON`);
    const text = custom?.text || (params.subdomain
      ? `Посмотрите этот аукцион субдомена на TON!`
      : `Создавайте субдомены и участвуйте в аукционах на зоне ${params.zone}!`);

    try {
      const { shareURL } = await import('@telegram-apps/sdk-react');
      if (shareURL.isAvailable()) {
        shareURL(url, `${title}\n${text}`);
        return true;
      }
    } catch {
      // Не внутри Telegram Mini App или SDK не инициализирован — идём дальше по цепочке.
    }

    if (navigator.share) {
      await navigator.share({
        title,
        text,
        url,
      });
      return true;
    } else {
      // Fallback: копирование в буфер
      return await copyAuctionUrlToClipboard(params);
    }
  } catch (error) {
    console.error('Ошибка при попытке поделиться:', error);
    return false;
  }
}

/**
 * Проверить, является ли текущая страница страницей аукциона
 */
export function isAuctionPage(): boolean {
  return window.location.hash.includes('/add-subdomain');
}

/**
 * Получить текущий hash путь
 */
export function getCurrentHashPath(): string {
  const hash = window.location.hash;
  return hash.split('?')[0]; // Без query параметров
}