// src/utils/urlParams.ts

/**
 * Утилиты для работы с URL параметрами аукционов.
 *
 * До 2026-09 роутинг шёл через HashRouter, и все функции здесь читали/писали
 * window.location.hash напрямую (формат "/#/add-subdomain?zone=..."). После
 * миграции на BrowserRouter (SEO — многостраничная индексация, см. Log.md
 * 2026-09-02) реальные параметры живут в normal query string
 * (window.location.search), а не в hash. Сигнатуры и имена экспортов
 * намеренно не менялись — только внутренняя реализация — чтобы не трогать
 * все вызовы в AddSubdomainPage.tsx/ProfileWidget.tsx/CreateCollectionPage.tsx.
 */

// Типы параметров для аукциона
export interface AuctionUrlParams {
  zone?: string;        // Название зоны (например: "minter.ton")
  subdomain?: string;   // Название субдомена (например: "test")
  // tab?: 'proxy' | 'sbt'; // Убираем, так как нужен только для proxy
}

/**
 * Получить параметры аукциона из URL
 */
export function getAuctionParamsFromUrl(): AuctionUrlParams {
  const params = new URLSearchParams(window.location.search);

  return {
    zone: params.get('zone') || undefined,
    subdomain: params.get('subdomain') || undefined,
    // tab: (params.get('tab') as 'proxy' | 'sbt') || undefined, // Убираем
  };
}

/**
 * Создать URL для аукциона с параметрами
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

  return queryString ? `/add-subdomain?${queryString}` : '/add-subdomain';
}

/**
 * Обновить URL с параметрами аукциона
 */
export function updateAuctionUrl(params: AuctionUrlParams): void {
  // Только для proxy таба - обновляем URL
  // Для SBT не обновляем URL, так как это приватные зоны
  const url = createAuctionUrl(params);
  window.history.pushState({}, '', url);
}

/**
 * Очистить параметры аукциона из URL
 */
export function clearAuctionUrl(): void {
  window.history.pushState({}, '', '/add-subdomain');
}

/**
 * Получить полный URL для аукциона
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
  const url = getFullAuctionUrl(params);
  const title = custom?.title || (params.subdomain
    ? `Аукцион субдомена ${params.subdomain}.${params.zone}`
    : `Зона ${params.zone} на TON`);
  const text = custom?.text || (params.subdomain
    ? `Посмотрите этот аукцион субдомена на TON!`
    : `Создавайте субдомены и участвуйте в аукционах на зоне ${params.zone}!`);

  return shareUrl(url, title, text, () => copyAuctionUrlToClipboard(params));
}

/**
 * Общее ядро "поделиться" — вынесено из shareAuction, чтобы страницы вне
 * аукциона/зоны (например CreateTorrentPage — шеринг bagID) могли
 * переиспользовать тот же 3-уровневый приоритет источников без
 * дублирования (см. комментарий у shareAuction выше). copyFallback — своя
 * логика копирования в буфер для конкретного URL (Web Share API недоступен
 * или упал).
 */
export async function shareUrl(
  url: string,
  title: string,
  text: string,
  copyFallback: () => Promise<boolean>
): Promise<boolean> {
  try {
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
      await navigator.share({ title, text, url });
      return true;
    } else {
      return await copyFallback();
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
  return window.location.pathname.includes('/add-subdomain');
}

/**
 * Получить текущий путь (без query-параметров)
 */
export function getCurrentHashPath(): string {
  return window.location.pathname;
}