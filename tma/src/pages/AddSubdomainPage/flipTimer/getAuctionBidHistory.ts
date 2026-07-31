import { TonCenterAPI, TonCenterTransaction } from "@/services/blockchainItems/toncenter-api-config";

export interface AuctionBid {
  bidder: string;
  amount: number;
  timestamp: string;
}

/**
 * Восстанавливает историю ставок аукциона по хронологии транзакций айтема.
 * Контракт при перебитии ставки отправляет предыдущую ставку обратно её
 * отправителю, поэтому каждое входящее сообщение на адрес айтема (с заданным
 * in_msg.source) — это ставка. Полной истории ставок в самом get-методе
 * контракта нет (там только текущий макс-бид), поэтому берём её из onchain-истории.
 */
export async function getAuctionBidHistory(
  nftAddress: string,
  isTestnet: boolean = false,
  limit: number = 100
): Promise<AuctionBid[]> {
  try {
    const api = new TonCenterAPI(isTestnet);
    const { transactions } = await api.getAscendingTransactions(nftAddress, limit);

    const bids = (transactions || [])
      .filter((tx: TonCenterTransaction) => !!tx.in_msg?.source)
      .map((tx: TonCenterTransaction) => ({
        bidder: tx.in_msg!.source,
        amount: Number(tx.in_msg!.value),
        timestamp: new Date(tx.now * 1000).toISOString(),
      }));

    // Новая ставка — первый элемент массива (как ожидает calculateProgress в ActiveAuctions.tsx)
    return bids.reverse();
  } catch (error) {
    console.error("Error fetching auction bid history:", error);
    return [];
  }
}
