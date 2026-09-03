// ActiveAuctions.tsx и ProfileWidget.tsx независимо друг от друга сканируют
// весь список proxy-субдоменов платформы (concurrency 10 каждый) каждые
// ~30с — burst от них легко выбивает 429 у toncenter-proxy ровно в момент,
// когда юзер открывает конкретный аукцион (например, по диплинку "Сделать
// ставку" из уведомления бота). Без ретрая getAuctionInfo/
// calculateProxyNFTAddress молча отдавали null на такой 429, и юзер видел
// дефолтное состояние "аукцион не найден" вместо реальных данных. Сами
// сканеры не трогаем (это отдельная, более крупная задача про их
// координацию) — просто даём одиночному чеку пережить короткий burst.
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries = 2,
  retryDelayMs = 600
): Promise<Response> {
  let response = await fetch(url, init);
  let attempt = 0;
  while (response.status === 429 && attempt < maxRetries) {
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs * (attempt + 1)));
    response = await fetch(url, init);
    attempt++;
  }
  return response;
}
