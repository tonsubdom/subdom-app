// Маскирует обрывы на нестабильных прокси-цепочках (напр. VPN-клиенты вроде
// Happ на Android, где сам Telegram держится за счёт MTProto, а обычные
// HTTPS-запросы картинок с api.subdom.zone иногда рвутся на одном из узлов) —
// не чинит сеть, просто даёт запросу ещё пару шансов раньше, чем показать
// пустоту (сейчас `onError` во многих местах просто ставит `display:none`).
//
// Сделано как чистая DOM-утилита, не React-хук: вызывающие места вроде
// `renderZoneCard` в ProfileWidget.tsx — обычные функции внутри `.map()`,
// не отдельные компоненты, хуки там вызывать нельзя (нарушает Rules of
// Hooks при переменном числе карточек).
const RETRY_DELAYS_MS = [800, 1800, 3200];

export function handleImageErrorWithRetry(
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  originalSrc: string,
) {
  const img = event.currentTarget;
  const attempt = Number(img.dataset.retryAttempt || "0");

  if (attempt >= RETRY_DELAYS_MS.length) {
    img.style.display = "none";
    return;
  }

  img.dataset.retryAttempt = String(attempt + 1);
  window.setTimeout(() => {
    // Элемент может быть уже размонтирован (список перерендерился) —
    // isConnected защищает от бессмысленной установки src в оторванный узел.
    if (!img.isConnected) return;
    const separator = originalSrc.includes("?") ? "&" : "?";
    img.src = `${originalSrc}${separator}retry=${attempt + 1}`;
  }, RETRY_DELAYS_MS[attempt]);
}
